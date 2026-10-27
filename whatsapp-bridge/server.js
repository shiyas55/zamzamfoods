const express = require('express');
const cors = require('cors');
const qrcodeTerminal = require('qrcode-terminal');
const QRCode = require('qrcode');
const { Client, LocalAuth, MessageMedia } = require('whatsapp-web.js');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || process.env.WHATSAPP_PORT || 3005;

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

let client = null;
let clientReady = false;
let latestQrText = null;
let latestQrImage = null;
let clientInfo = null;
let stepStatus = 'Initializing Chromium browser...';
let lastError = null;
let isStarting = false;
let reinitTimeout = null;

// Incoming order queue (Holds overnight orders for local PC sync)
let incomingOrdersQueue = [];

function getBrowserExecutablePath() {
  if (process.env.PUPPETEER_EXECUTABLE_PATH) {
    return process.env.PUPPETEER_EXECUTABLE_PATH;
  }
  const possiblePaths = [
    // Linux / Docker / Render
    '/usr/bin/chromium',
    '/usr/bin/chromium-browser',
    '/usr/bin/google-chrome',
    '/usr/bin/google-chrome-stable',
    // macOS
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    '/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge',
    '/Applications/Brave Browser.app/Contents/MacOS/Brave Browser',
    // Windows Standard
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
    'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
  ];

  if (process.env.LOCALAPPDATA) {
    possiblePaths.push(path.join(process.env.LOCALAPPDATA, 'Google', 'Chrome', 'Application', 'chrome.exe'));
    possiblePaths.push(path.join(process.env.LOCALAPPDATA, 'Microsoft', 'Edge', 'Application', 'msedge.exe'));
  }
  if (process.env.PROGRAMFILES) {
    possiblePaths.push(path.join(process.env.PROGRAMFILES, 'Google', 'Chrome', 'Application', 'chrome.exe'));
    possiblePaths.push(path.join(process.env.PROGRAMFILES, 'Microsoft', 'Edge', 'Application', 'msedge.exe'));
  }
  if (process.env['PROGRAMFILES(X86)']) {
    possiblePaths.push(path.join(process.env['PROGRAMFILES(X86)'], 'Google', 'Chrome', 'Application', 'chrome.exe'));
    possiblePaths.push(path.join(process.env['PROGRAMFILES(X86)'], 'Microsoft', 'Edge', 'Application', 'msedge.exe'));
  }

  for (const p of possiblePaths) {
    try {
      if (fs.existsSync(p)) {
        console.log(`Using system browser at: ${p}`);
        return p;
      }
    } catch (_) {}
  }
  return undefined;
}

function getPuppeteerArgs() {
  const args = [
    '--no-sandbox',
    '--disable-setuid-sandbox',
    '--disable-dev-shm-usage',
    '--disable-accelerated-2d-canvas',
    '--no-first-run',
    '--no-zygote',
    '--disable-gpu',
    '--disable-extensions',
  ];
  const executablePath = getBrowserExecutablePath();
  const config = {
    headless: true,
    protocolTimeout: 120000,
    args,
  };
  if (executablePath) {
    config.executablePath = executablePath;
  }
  return config;
}

function createClient() {
  const newClient = new Client({
    authStrategy: new LocalAuth({
      dataPath: path.join(__dirname, '.wwebjs_auth'),
    }),
    authTimeoutMs: 60000,
    qrMaxRetries: 0,
    puppeteer: getPuppeteerArgs(),
  });

  newClient.on('loading_screen', (percent, message) => {
    stepStatus = `Loading WhatsApp Web: ${percent}% (${message || 'syncing'})`;
    console.log(`⏳ ${stepStatus}`);
  });

  newClient.on('qr', async (qr) => {
    latestQrText = qr;
    clientReady = false;
    clientInfo = null;
    stepStatus = 'QR Code Ready for Scanning';

    try {
      latestQrImage = await QRCode.toDataURL(qr);
    } catch (err) {
      console.error('Failed to generate QR data URL:', err);
    }

    console.log('\n======================================================');
    console.log('📱 SCAN THIS QR CODE IN WHATSAPP TO CONNECT:');
    console.log('(WhatsApp > Linked Devices > Link a Device)');
    console.log('Or open in your browser: http://localhost:' + PORT + '/qr');
    console.log('======================================================\n');
    qrcodeTerminal.generate(qr, { small: true });
  });

  newClient.on('ready', () => {
    clientReady = true;
    latestQrText = null;
    latestQrImage = null;
    clientInfo = newClient.info;
    stepStatus = 'Connected & Active';

    console.log('\n======================================================');
    console.log('✅ ZAMZAM FOODS WHATSAPP BRIDGE IS CONNECTED & READY!');
    console.log(`Connected Number: ${newClient.info?.wid?.user || 'Active'}`);
    console.log(`Push Name: ${newClient.info?.pushname || 'Zamzam'}`);
    console.log('======================================================\n');
  });

  newClient.on('authenticated', () => {
    stepStatus = 'Authenticated. Finalizing session...';
    console.log('🔐 WhatsApp Session authenticated successfully.');
  });

  newClient.on('auth_failure', (msg) => {
    lastError = `Authentication failure: ${msg}`;
    stepStatus = 'Auth Failed';
    console.error('❌ WhatsApp Authentication failure:', msg);
    clientReady = false;
  });

  newClient.on('disconnected', async (reason) => {
    stepStatus = `Disconnected: ${reason}`;
    console.warn('⚠️ WhatsApp client disconnected:', reason);
    clientReady = false;
    latestQrText = null;
    latestQrImage = null;
    clientInfo = null;

    if (reason === 'LOGOUT') {
      console.log('🧹 Session logged out from WhatsApp. Resetting session directory...');
      const authDir = path.join(__dirname, '.wwebjs_auth');
      try {
        if (fs.existsSync(authDir)) {
          fs.rmSync(authDir, { recursive: true, force: true });
        }
      } catch (rmErr) {
        console.warn('Could not remove auth directory:', rmErr.message);
      }
    }

    if (!reinitTimeout) {
      console.log('🔄 Re-initializing WhatsApp client in 3 seconds...');
      reinitTimeout = setTimeout(() => {
        reinitTimeout = null;
        startClient().catch((err) => console.error('Re-init error:', err));
      }, 3000);
    }
  });

  newClient.on('message', async (msg) => {
    try {
      const sender = msg.from;
      const text = msg.body || '';
      console.log(`📩 Incoming WhatsApp from ${sender}: ${text}`);

      const cleanPhone = sender.replace(/\D/g, '');
      const orderData = {
        id: Date.now().toString(),
        sender,
        phone: cleanPhone,
        message: text,
        timestamp: new Date().toISOString(),
        receivedAt: new Date().toLocaleTimeString('en-IN'),
      };

      incomingOrdersQueue.unshift(orderData);
      if (incomingOrdersQueue.length > 500) incomingOrdersQueue.pop();

      const lower = text.toLowerCase();
      if (lower.includes('order') || lower.includes('porotta') || lower.includes('chapathi') || text.includes('1.')) {
        await msg.reply('✅ *Zamzam Foods Order Received!*\nThank you. Your daily order is recorded and is being prepared for dispatch.');
      }
    } catch (err) {
      console.error('Error in message listener:', err);
    }
  });

  return newClient;
}

function clearStaleBrowserLocks() {
  const sessionDir = path.join(__dirname, '.wwebjs_auth', 'session');
  if (fs.existsSync(sessionDir)) {
    const lockFiles = ['SingletonLock', 'SingletonSocket', 'SingletonCookie', 'lockfile'];
    for (const lf of lockFiles) {
      const lockPath = path.join(sessionDir, lf);
      try {
        if (fs.existsSync(lockPath)) {
          fs.rmSync(lockPath, { force: true });
          console.log(`🔓 Removed stale Chromium lock: ${lf}`);
        } else {
          // Check for dangling symlinks
          fs.unlinkSync(lockPath);
          console.log(`🔓 Removed dangling lock symlink: ${lf}`);
        }
      } catch (_) {}
    }
  }
}

async function startClient() {
  if (isStarting) {
    console.log('⏳ Client is already initializing, skipping concurrent startClient call.');
    return;
  }
  isStarting = true;

  if (client) {
    try {
      await client.destroy();
    } catch (_) {}
    client = null;
  }
  clearStaleBrowserLocks();
  client = createClient();
  stepStatus = 'Starting Chromium & loading WhatsApp Web...';
  console.log('⏳ Starting WhatsApp Web browser session...');

  try {
    await client.initialize();
  } catch (err) {
    lastError = err.message || String(err);
    stepStatus = `Init Error: ${lastError}`;
    console.error('❌ Error initializing WhatsApp client:', err);
  } finally {
    isStarting = false;
  }
}

// Helper: Format phone number into WhatsApp chatId
function formatChatId(phone) {
  if (!phone) return null;
  let digits = String(phone).replace(/\D/g, '');
  if (digits.length === 10) {
    digits = `91${digits}`; // Default to India 91 for 10-digit numbers
  }
  return `${digits}@c.us`;
}

// API Routes

// QR and Dashboard Web Page renderer (Always returns HTTP 200 OK)
function renderQrPage(req, res) {
  if (req.headers.accept && req.headers.accept.includes('application/json')) {
    return res.status(200).json({
      status: 'ok',
      connected: clientReady,
      hasQr: Boolean(latestQrImage),
      stepStatus,
    });
  }

  if (clientReady) {
    return res.status(200).send(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Zamzam WhatsApp Bridge</title>
          <meta name="viewport" content="width=device-width, initial-scale=1">
          <style>
            body { font-family: system-ui, sans-serif; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; background: #0f172a; color: #fff; text-align: center; }
            .box { background: #1e293b; padding: 2.5rem; border-radius: 16px; border: 1px solid #334155; max-width: 420px; }
            h2 { color: #22c55e; margin-top: 0; }
            .btn { display: inline-block; margin-top: 1.25rem; padding: 8px 18px; background: #334155; color: #cbd5e1; text-decoration: none; border-radius: 8px; font-size: 0.85rem; font-weight: 600; }
            .btn:hover { background: #475569; }
          </style>
        </head>
        <body>
          <div class="box">
            <h2>✅ WhatsApp Connected</h2>
            <p>Your WhatsApp session is active and ready to send bills automatically.</p>
            <p><strong>Connected Number:</strong> ${client?.info?.wid?.user || clientInfo?.wid?.user || 'Active'}</p>
            <div>
              <a href="/reset?force=true" class="btn" onclick="return confirm('Disconnect and scan a new QR code?')">🔄 Disconnect & Scan New Phone</a>
            </div>
          </div>
        </body>
      </html>
    `);
  }

  if (!latestQrImage) {
    return res.status(200).send(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Zamzam WhatsApp Bridge</title>
          <meta http-equiv="refresh" content="3">
          <meta name="viewport" content="width=device-width, initial-scale=1">
          <style>
            body { font-family: system-ui, sans-serif; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; background: #0f172a; color: #fff; text-align: center; }
            .box { background: #1e293b; padding: 2.5rem; border-radius: 16px; border: 1px solid #334155; max-width: 420px; }
            .status-badge { display: inline-block; padding: 6px 14px; background: #334155; border-radius: 999px; font-size: 0.85rem; color: #38bdf8; margin: 10px 0; font-family: monospace; }
            .spinner { width: 36px; height: 36px; border: 3px solid #334155; border-top-color: #38bdf8; border-radius: 50%; animation: spin 1s linear infinite; margin: 0 auto 1rem; }
            @keyframes spin { to { transform: rotate(360deg); } }
            .btn-reset { display: inline-block; margin-top: 1.25rem; padding: 9px 18px; background: #e11d48; color: #fff; text-decoration: none; border-radius: 8px; font-size: 0.85rem; font-weight: bold; }
            .btn-reset:hover { background: #be123c; }
          </style>
        </head>
        <body>
          <div class="box">
            <div class="spinner"></div>
            <h2 style="margin: 0;">⏳ Generating QR Code...</h2>
            <div class="status-badge">${stepStatus}</div>
            <p style="color: #94a3b8; font-size: 0.9rem;">Starting Chromium browser & connecting to WhatsApp Web.<br/>This page will auto-refresh every 3s.</p>
            ${lastError ? `<p style="color: #f87171; font-size: 0.8rem; background: #450a0a; padding: 8px; border-radius: 8px;">⚠️ ${lastError}</p>` : ''}
            <div>
              <a href="/reset?force=true" class="btn-reset">⚡ Reset Session & Force Fresh QR</a>
            </div>
          </div>
        </body>
      </html>
    `);
  }

  res.status(200).send(`
    <!DOCTYPE html>
    <html>
      <head>
        <title>Zamzam WhatsApp Bridge - Scan QR</title>
        <meta http-equiv="refresh" content="20">
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <style>
          body { font-family: system-ui, sans-serif; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; background: #0f172a; color: #fff; text-align: center; }
          .box { background: #1e293b; padding: 2rem; border-radius: 16px; border: 1px solid #334155; max-width: 380px; }
          img { background: #fff; padding: 12px; border-radius: 12px; margin: 1rem 0; width: 260px; height: 260px; }
          p { color: #94a3b8; font-size: 0.9rem; line-height: 1.4; }
          ol { text-align: left; font-size: 0.85rem; color: #cbd5e1; padding-left: 1.2rem; }
          .refresh-link { display: inline-block; margin-top: 10px; color: #38bdf8; font-size: 0.82rem; text-decoration: none; }
          .refresh-link:hover { text-decoration: underline; }
        </style>
      </head>
      <body>
        <div class="box">
          <h2 style="margin: 0 0 0.5rem 0;">📱 Link WhatsApp</h2>
          <p>Scan this QR code using your WhatsApp to enable automatic bill sending:</p>
          <img src="${latestQrImage}" alt="WhatsApp QR Code" />
          <ol>
            <li>Open WhatsApp on your phone</li>
            <li>Tap <b>Linked Devices</b></li>
            <li>Tap <b>Link a Device</b> and point camera here</li>
          </ol>
          <div>
            <a href="/reset" class="refresh-link">🔄 QR expired or not working? Click to generate fresh QR</a>
          </div>
        </div>
      </body>
    </html>
  `);
}

// 0. Root & QR routes (Both return 200 OK)
app.get('/', renderQrPage);
app.get('/qr', renderQrPage);

// Reset / Re-link endpoint (Destroys stale session & forces fresh QR generation)
app.all('/reset', async (req, res) => {
  console.log('🔄 User requested WhatsApp session reset...');
  clientReady = false;
  latestQrImage = null;
  latestQrText = null;
  clientInfo = null;
  stepStatus = 'Resetting WhatsApp session and clearing locks...';

  const force = req.query.force === 'true' || req.body?.force === true;

  if (client) {
    try {
      await client.destroy();
    } catch (e) {
      console.warn('Error during client destroy:', e.message);
    }
    client = null;
  }

  if (force) {
    const authDir = path.join(__dirname, '.wwebjs_auth');
    try {
      if (fs.existsSync(authDir)) {
        fs.rmSync(authDir, { recursive: true, force: true });
        console.log('🧹 Cleaned .wwebjs_auth session directory.');
      }
    } catch (rmErr) {
      console.warn('Could not remove auth directory:', rmErr.message);
    }
  }

  await startClient();

  if (req.headers.accept && req.headers.accept.includes('application/json')) {
    return res.json({ success: true, message: 'WhatsApp session reset. Generating fresh QR code...' });
  }
  res.redirect('/qr');
});

// UptimeRobot Health Check
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    connected: clientReady,
    uptimeSeconds: Math.floor(process.uptime()),
    pendingOrdersCount: incomingOrdersQueue.length,
    timestamp: new Date().toISOString(),
  });
});

// 1. Status Check
app.get('/status', (req, res) => {
  res.json({
    connected: clientReady,
    hasQr: Boolean(latestQrImage),
    stepStatus,
    lastError,
    pendingOrdersCount: incomingOrdersQueue.length,
    info: clientInfo
      ? {
          phone: clientInfo.wid?.user,
          name: clientInfo.pushname,
        }
      : null,
  });
});

// 1b. Order Queue Sync for Local PC
app.get('/api/orders/pending', (req, res) => {
  res.json({
    count: incomingOrdersQueue.length,
    orders: incomingOrdersQueue,
  });
});

app.post('/api/orders/clear', (req, res) => {
  const count = incomingOrdersQueue.length;
  incomingOrdersQueue = [];
  res.json({ success: true, cleared: count });
});

// 3. Send File (PDF or Image)
app.post('/send-file', async (req, res) => {
  try {
    const { phone, base64, filename, mimetype, caption } = req.body;

    if (!clientReady || !client) {
      return res.status(503).json({
        success: false,
        error: 'WhatsApp Bridge is not connected yet. Please scan the QR code at /qr first.',
      });
    }

    if (!phone) {
      return res.status(400).json({ success: false, error: 'Phone number is required.' });
    }

    if (!base64) {
      return res.status(400).json({ success: false, error: 'File base64 data is required.' });
    }

    const chatId = formatChatId(phone);
    if (!chatId) {
      return res.status(400).json({ success: false, error: 'Invalid phone number.' });
    }

    let cleanBase64 = base64;
    let resolvedMime = mimetype || 'application/pdf';

    if (base64.startsWith('data:')) {
      const parts = base64.split(';base64,');
      resolvedMime = parts[0].replace('data:', '');
      cleanBase64 = parts[1];
    }

    const media = new MessageMedia(
      resolvedMime,
      cleanBase64,
      filename || (resolvedMime.includes('image') ? 'Invoice.jpg' : 'Invoice.pdf')
    );

    console.log(`📤 Sending file to ${chatId} (${filename || 'Invoice'})...`);

    const sentMessage = await client.sendMessage(chatId, media, {
      caption: caption || '',
      sendMediaAsDocument: resolvedMime.includes('pdf'),
    });

    const msgId = sentMessage?.id?._serialized || sentMessage?.id?.id || 'sent_' + Date.now();
    console.log(`✅ File sent successfully to ${chatId}! Message ID: ${msgId}`);

    res.json({
      success: true,
      messageId: msgId,
      phone: chatId,
    });
  } catch (error) {
    console.error('❌ Error sending WhatsApp file:', error);
    const errMsg = error.message || String(error);
    if (errMsg.includes('detached Frame') || errMsg.includes('Session closed') || errMsg.includes('Execution context was destroyed')) {
      console.warn('🔄 Detached frame detected. Auto-reloading client...');
      clientReady = false;
      startClient().catch((e) => console.error('Auto-reinit error:', e));
    }
    res.status(500).json({
      success: false,
      error: errMsg || 'Failed to send WhatsApp message.',
    });
  }
});

// 4. Send Plain Text Message
app.post('/send-text', async (req, res) => {
  try {
    const { phone, message } = req.body;

    if (!clientReady || !client) {
      return res.status(503).json({
        success: false,
        error: 'WhatsApp Bridge is not connected yet.',
      });
    }

    const chatId = formatChatId(phone);
    if (!chatId || !message) {
      return res.status(400).json({ success: false, error: 'Phone and message are required.' });
    }

    const sentMessage = await client.sendMessage(chatId, message);
    const msgId = sentMessage?.id?._serialized || sentMessage?.id?.id || 'sent_' + Date.now();
    res.json({ success: true, messageId: msgId });
  } catch (error) {
    console.error('❌ Error sending WhatsApp text:', error);
    const errMsg = error.message || String(error);
    if (errMsg.includes('detached Frame') || errMsg.includes('Session closed') || errMsg.includes('Execution context was destroyed')) {
      console.warn('🔄 Detached frame detected. Auto-reloading client...');
      clientReady = false;
      startClient().catch((e) => console.error('Auto-reinit error:', e));
    }
    res.status(500).json({ success: false, error: errMsg });
  }
});

// Handle process errors to prevent bridge crashing on browser target close
process.on('uncaughtException', (err) => {
  const errMsg = err?.message || String(err);
  console.warn('⚠️ Process uncaughtException caught:', errMsg);
  if (errMsg.includes('Target closed') || errMsg.includes('Session closed') || errMsg.includes('Protocol error')) {
    if (!reinitTimeout) {
      reinitTimeout = setTimeout(() => {
        reinitTimeout = null;
        startClient().catch((e) => console.error('Auto-restart error:', e));
      }, 4000);
    }
  }
});

process.on('unhandledRejection', (reason) => {
  console.warn('⚠️ Process unhandledRejection caught:', reason?.message || reason);
});

// Start Express server and initialize WhatsApp client
app.listen(PORT, '0.0.0.0', () => {
  console.log(`\n======================================================`);
  console.log(`🚀 Zamzam WhatsApp Bridge running at: http://localhost:${PORT}`);
  console.log(`📱 QR Code Web Page: http://localhost:${PORT}/qr`);
  console.log(`🔍 Status Check: http://localhost:${PORT}/status`);
  console.log(`======================================================\n`);

  startClient().catch((err) => console.error('Initial startClient error:', err));
});
