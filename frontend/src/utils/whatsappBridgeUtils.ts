/**
 * Zamzam Foods - WhatsApp Web Bridge Utilities
 * Interacts with the local WhatsApp background service (port 3005)
 * to send PDF or Image invoices directly to customer chats.
 */

import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';

const BRIDGE_URL = 'http://localhost:3005';

export interface BridgeStatus {
  connected: boolean;
  hasQr: boolean;
  info?: {
    phone?: string;
    name?: string;
  } | null;
}

/**
 * Check if the local WhatsApp Bridge service is running and connected.
 */
export async function checkWhatsAppBridgeStatus(): Promise<BridgeStatus> {
  try {
    const res = await fetch(`${BRIDGE_URL}/status`, {
      method: 'GET',
      headers: { 'Accept': 'application/json' },
      signal: AbortSignal.timeout(2000), // Quick timeout
    });
    if (!res.ok) {
      return { connected: false, hasQr: false };
    }
    const data = await res.json();
    return {
      connected: Boolean(data.connected),
      hasQr: Boolean(data.hasQr),
      info: data.info || null,
    };
  } catch {
    return { connected: false, hasQr: false };
  }
}

export interface SendInvoiceFileOptions {
  phone: string;
  element: HTMLElement;
  orderNumber: string;
  format?: 'PDF' | 'IMAGE';
  caption?: string;
}

/**
 * Captures the HTML invoice element and sends it as a PDF or Image
 * via the local WhatsApp Bridge.
 */
export async function sendInvoiceFileViaBridge({
  phone,
  element,
  orderNumber,
  format = 'PDF',
  caption,
}: SendInvoiceFileOptions): Promise<{ success: boolean; messageId?: string; error?: string }> {
  try {
    // 1. Check bridge status first
    const status = await checkWhatsAppBridgeStatus();
    if (!status.connected) {
      return {
        success: false,
        error: status.hasQr
          ? 'WhatsApp is not linked on your laptop yet. Please scan the QR code first.'
          : 'WhatsApp service is not running on your laptop. Start whatsapp-bridge to send files.',
      };
    }

    // 2. Render element into a high-resolution canvas
    const width = element.offsetWidth || 760;
    const height = element.offsetHeight || 900;

    const canvas = await html2canvas(element, {
      scale: 2, // High DPI for crisp text
      useCORS: true,
      logging: false,
      backgroundColor: '#ffffff',
      width: width,
      height: height,
      x: 0,
      y: 0,
      scrollX: 0,
      scrollY: 0,
      windowWidth: 1200,
      windowHeight: Math.max(height + 200, 1200),
      onclone: (clonedDoc, clonedElement) => {
        // 1. Inject global reset in cloned iframe to completely defeat html2canvas kerning/overlapping bugs
        try {
          const style = clonedDoc.createElement('style');
          style.innerHTML = `
            * {
              letter-spacing: 0px !important;
              word-spacing: normal !important;
              font-kerning: none !important;
              font-variant-ligatures: none !important;
              text-rendering: geometricPrecision !important;
            }
            body, div, span, p, td, th, h1, h2, h3, h4, strong, b, em, table {
              font-family: Arial, "Helvetica Neue", Helvetica, sans-serif !important;
              letter-spacing: 0px !important;
            }
          `;
          clonedDoc.head.appendChild(style);
        } catch (e) {
          console.warn('Could not inject cloned style:', e);
        }

        // Ensure cloned element is visible and completely opaque in html2canvas iframe
        clonedElement.style.position = 'static';
        clonedElement.style.left = '0px';
        clonedElement.style.top = '0px';
        clonedElement.style.margin = '0px';
        clonedElement.style.opacity = '1';
        clonedElement.style.visibility = 'visible';
        clonedElement.style.display = 'block';
        clonedElement.style.letterSpacing = '0px';
        clonedElement.style.wordSpacing = 'normal';
        clonedElement.style.fontFamily = 'Arial, "Helvetica Neue", Helvetica, sans-serif';

        // 2. Remove letter-spacing from all elements to avoid html2canvas character splitting
        const allChildren = clonedElement.querySelectorAll('*');
        allChildren.forEach((child: any) => {
          if (child.style) {
            child.style.letterSpacing = '0px';
            child.style.fontKerning = 'none';
            child.style.fontVariantLigatures = 'none';
            if (!child.style.fontFamily || child.style.fontFamily.includes('system-ui') || child.style.fontFamily.includes('-apple-system')) {
              child.style.fontFamily = 'Arial, "Helvetica Neue", Helvetica, sans-serif';
            }
          }
        });
      },
    });

    let base64Data: string;
    let filename: string;
    let mimetype: string;

    if (format === 'IMAGE') {
      base64Data = canvas.toDataURL('image/jpeg', 0.95);
      filename = `Invoice_${orderNumber}.jpg`;
      mimetype = 'image/jpeg';
    } else {
      // PDF generation using jsPDF
      const imgWidth = 210; // A4 mm
      const pageHeight = 297;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      
      const pdf = new jsPDF({
        orientation: imgHeight > pageHeight ? 'portrait' : 'portrait',
        unit: 'mm',
        format: 'a4',
      });

      const imgData = canvas.toDataURL('image/jpeg', 0.95);
      pdf.addImage(imgData, 'JPEG', 0, 0, imgWidth, Math.min(imgHeight, pageHeight));
      
      base64Data = pdf.output('datauristring');
      filename = `Bill_${orderNumber}.pdf`;
      mimetype = 'application/pdf';
    }

    // 3. Post to local bridge
    const response = await fetch(`${BRIDGE_URL}/send-file`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        phone,
        base64: base64Data,
        filename,
        mimetype,
        caption: caption || `📄 Zamzam Foods Invoice #${orderNumber}`,
      }),
    });

    const result = await response.json();
    if (!response.ok || !result.success) {
      return {
        success: false,
        error: result.error || 'Failed to send file via WhatsApp Bridge.',
      };
    }

    return {
      success: true,
      messageId: result.messageId,
    };
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : 'Unknown error during WhatsApp file sending.';
    return { success: false, error: errorMsg };
  }
}

/**
 * Send a plain text message via the local WhatsApp Bridge.
 */
export async function sendWhatsAppTextMessageViaBridge({
  phone,
  message,
}: {
  phone: string;
  message: string;
}): Promise<{ success: boolean; messageId?: string; error?: string }> {
  try {
    const status = await checkWhatsAppBridgeStatus();
    if (!status.connected) {
      return {
        success: false,
        error: status.hasQr
          ? 'WhatsApp is not linked on your laptop yet. Please scan the QR code first.'
          : 'WhatsApp service is not running on your laptop. Start whatsapp-bridge to send messages.',
      };
    }

    const response = await fetch(`${BRIDGE_URL}/send-text`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        phone,
        message,
      }),
    });

    const result = await response.json();
    if (!response.ok || !result.success) {
      return {
        success: false,
        error: result.error || 'Failed to send WhatsApp message.',
      };
    }

    return {
      success: true,
      messageId: result.messageId,
    };
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : 'Unknown error during WhatsApp text sending.';
    return { success: false, error: errorMsg };
  }
}

