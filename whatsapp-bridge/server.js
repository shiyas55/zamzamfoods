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

let clientReady = false;
let latestQrText = null;
let latestQrImage = null;
let clientInfo = null;
let stepStatus = 'Initializing Chromium browser...';
let lastError = null;

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
    // Windows
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
    'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
  ];

  for (const p of possiblePaths) {
    if (fs.existsSync(p)) {
      console.log(`Using system browser at: ${p}`);
      return p;
    }
  }
  return undefined;
}

// Determine Chrome path for Mac / Windows / Linux fallback if needed
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
    args,
  };
  if (executablePath) {
    config.executablePath = executablePath;
  }
  return config;
}

// Initialize WhatsApp Web Client
const client = new Client({
  authStrategy: new LocalAuth({
    dataPath: path.join(__dirname, '.wwebjs_auth'),
  }),
  webVersionCache: {
    type: 'remote',
    remotePath: 'https://raw.githubusercontent.com/wppconnect-team/wa-version/main/html/2.3000.1018956976-alpha.html',
  },
  puppeteer: {
    ...getPuppeteerArgs(),
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  },
});

client.on('loading_screen', (percent, message) => {
  stepStatus = `Loading WhatsApp Web: ${percent}% (${message || 'syncing'})`;
  console.log(`⏳ ${stepStatus}`);
});

client.on('qr', async (qr) => {
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

client.on('ready', () => {
  clientReady = true;
  latestQrText = null;
  latestQrImage = null;
  clientInfo = client.info;
  stepStatus = 'Connected & Active';

  console.log('\n======================================================');
  console.log('✅ ZAMZAM FOODS WHATSAPP BRIDGE IS CONNECTED & READY!');
  console.log(`Connected Number: ${client.info?.wid?.user || 'Active'}`);
  console.log(`Push Name: ${client.info?.pushname || 'Zamzam'}`);
  console.log('======================================================\n');
});

client.on('authenticated', () => {
  stepStatus = 'Authenticated. Finalizing session...';
  console.log('🔐 WhatsApp Session authenticated successfully.');
});

client.on('auth_failure', (msg) => {
  lastError = `Authentication failure: ${msg}`;
  stepStatus = 'Auth Failed';
  console.error('❌ WhatsApp Authentication failure:', msg);
  clientReady = false;
});

client.on('disconnected', (reason) => {
  stepStatus = `Disconnected: ${reason}`;
  console.warn('⚠️ WhatsApp client disconnected:', reason);
  clientReady = false;
  latestQrText = null;
  latestQrImage = null;
  clientInfo = null;
  console.log('🔄 Re-initializing WhatsApp client...');
  client.initialize().catch((e) => {
    lastError = e.message || String(e);
    console.error('Failed to reinitialize:', e);
  });
});

// Incoming message listener (Receives 24/7 orders and queues for local PC)
client.on('message', async (msg) => {
  try {
    const sender = msg.from; // e.g. 919847012345@c.us
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

    // Store in memory queue for local PC pickup
    incomingOrdersQueue.unshift(orderData);
    if (incomingOrdersQueue.length > 500) incomingOrdersQueue.pop();

    // Auto-reply if message looks like an order template
    const lower = text.toLowerCase();
    if (lower.includes('order') || lower.includes('porotta') || lower.includes('chapathi') || text.includes('1.')) {
      await msg.reply('✅ *Zamzam Foods Order Received!*\nThank you. Your daily order is recorded and is being prepared for dispatch.');
    }
  } catch (err) {
    console.error('Error in message listener:', err);
  }
});

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
            .box { background: #1e293b; padding: 2.5rem; border-radius: 16px; border: 1px solid #334155; }
            h2 { color: #22c55e; margin-top: 0; }
          </style>
        </head>
        <body>
          <div class="box">
            <h2>✅ WhatsApp Connected</h2>
            <p>Your WhatsApp session is active and ready to send bills automatically.</p>
            <p><strong>Connected Number:</strong> ${client.info?.wid?.user || 'Active'}</p>
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
          </style>
        </head>
        <body>
          <div class="box">
            <div class="spinner"></div>
            <h2 style="margin: 0;">⏳ Generating QR Code...</h2>
            <div class="status-badge">${stepStatus}</div>
            <p style="color: #94a3b8; font-size: 0.9rem;">Starting Chromium browser & loading WhatsApp Web.<br/>This page will auto-refresh every 3s.</p>
            ${lastError ? `<p style="color: #f87171; font-size: 0.8rem; background: #450a0a; padding: 8px; border-radius: 8px;">⚠️ ${lastError}</p>` : ''}
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
        <meta http-equiv="refresh" content="15">
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <style>
          body { font-family: system-ui, sans-serif; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; background: #0f172a; color: #fff; text-align: center; }
          .box { background: #1e293b; padding: 2rem; border-radius: 16px; border: 1px solid #334155; max-width: 380px; }
          img { background: #fff; padding: 12px; border-radius: 12px; margin: 1rem 0; width: 260px; height: 260px; }
          p { color: #94a3b8; font-size: 0.9rem; line-height: 1.4; }
          ol { text-align: left; font-size: 0.85rem; color: #cbd5e1; padding-left: 1.2rem; }
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
        </div>
      </body>
    </html>
  `);
}

// 0. Root & QR routes (Both return 200 OK)
app.get('/', renderQrPage);
app.get('/qr', renderQrPage);

// 0. UptimeRobot Health Check (Keeps Render service awake 24/7)
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

    if (!clientReady) {
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

    // Clean base64 string if it contains data URL prefix
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
      sendMediaAsDocument: resolvedMime.includes('pdf'), // Send PDFs as documents
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
      console.warn('🔄 Detached frame or stale browser detected. Auto-reloading client...');
      clientReady = false;
      client.initialize().catch((e) => console.error('Auto-reinit error:', e));
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

    if (!clientReady) {
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
      console.warn('🔄 Detached frame or stale browser detected. Auto-reloading client...');
      clientReady = false;
      client.initialize().catch((e) => console.error('Auto-reinit error:', e));
    }
    res.status(500).json({ success: false, error: errMsg });
  }
});

// Start Express server and initialize WhatsApp client
app.listen(PORT, () => {
  console.log(`\n======================================================`);
  console.log(`🚀 Zamzam WhatsApp Bridge running at: http://localhost:${PORT}`);
  console.log(`📱 QR Code Web Page: http://localhost:${PORT}/qr`);
  console.log(`🔍 Status Check: http://localhost:${PORT}/status`);
  console.log(`======================================================\n`);

  console.log('⏳ Starting WhatsApp Web browser session...');
  client.initialize().catch((err) => {
    lastError = err.message || String(err);
    stepStatus = `Init Error: ${lastError}`;
    console.error('❌ Error initializing WhatsApp client:', err);
  });
});
