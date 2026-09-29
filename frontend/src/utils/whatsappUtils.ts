/**
 * Zamzam Foods - Professional WhatsApp Business Sharing Utilities
 * Formats clean, customer-facing operational text without internal IDs or technical details.
 */
import { BRAND_CONFIG } from '../config/brandConfig';

export const BUSINESS_NAME = BRAND_CONFIG.fullName;
export const BUSINESS_PHONE = BRAND_CONFIG.phone;

export function cleanPhoneNumber(phone?: string): string {
  if (!phone) return '';
  const digits = phone.replace(/[^0-9]/g, '');
  if (digits.length === 10) {
    return `91${digits}`; // Default to India country code if 10 digits
  }
  return digits;
}

export function isWhatsAppActive(): boolean {
  try {
    const raw = localStorage.getItem('zamzam_system_settings');
    if (raw) {
      const data = JSON.parse(raw);
      if (data.is_whatsapp_enabled === false) return false;
    }
  } catch {}
  return true;
}

export function openWhatsApp(phone: string | undefined, message: string) {
  if (!isWhatsAppActive()) {
    console.warn('WhatsApp messaging is disabled by system administrator.');
    return;
  }
  const cleanPhone = cleanPhoneNumber(phone);
  const encodedText = encodeURIComponent(message);
  const url = cleanPhone ? `https://wa.me/${cleanPhone}?text=${encodedText}` : `https://wa.me/?text=${encodedText}`;
  window.open(url, '_blank', 'noopener,noreferrer');
}

export interface InvoiceShareData {
  customerName: string;
  orderNumber: string;
  date: string;
  items: Array<{ name: string; quantity: number; unitPrice: string; subtotal: string }>;
  totalAmount: string;
  gstAmount?: string;
  paidAmount?: string;
  outstandingBalance?: string;
}

export function generateInvoiceMessage(data: InvoiceShareData): string {
  const itemLines = data.items
    .map((it) => `• ${it.name} x ${it.quantity} @ ₹${Number(it.unitPrice).toFixed(2)} = ₹${Number(it.subtotal).toFixed(2)}`)
    .join('\n');

  const paid = Number(data.paidAmount || '0.00');
  const outstanding = Number(data.outstandingBalance || '0.00');

  let text = `*${BUSINESS_NAME}*\n`;
  text += `--------------------------------\n`;
  text += `Hello *${data.customerName}*,\n\n`;
  text += `Here is your order summary:\n`;
  text += `Invoice / Order: *#${data.orderNumber}*\n`;
  text += `Date: ${data.date}\n\n`;
  text += `*Products:*\n${itemLines}\n\n`;
  text += `*Order Total:* ₹${Number(data.totalAmount).toFixed(2)}\n`;
  if (data.gstAmount && Number(data.gstAmount) > 0) {
    text += `*(Includes 5% GST: ₹${Number(data.gstAmount).toFixed(2)})*\n`;
  }
  if (paid > 0) {
    text += `*Paid Amount:* ₹${paid.toFixed(2)}\n`;
  }
  if (outstanding > 0) {
    text += `*Current Outstanding:* ₹${outstanding.toFixed(2)}\n`;
  }
  text += `--------------------------------\n`;
  text += `Thank you for choosing *${BUSINESS_NAME}*! For inquiries call ${BUSINESS_PHONE}.`;

  return text;
}

export interface PaymentShareData {
  customerName: string;
  paymentNumber: string;
  amount: string;
  paymentMethod: string;
  date: string;
  remainingBalance?: string;
}

export function generatePaymentReceiptMessage(data: PaymentShareData): string {
  const methodLabel = data.paymentMethod === 'GPAY_UPI' ? 'GPay / UPI' : 'Cash';
  const remaining = Number(data.remainingBalance || '0.00');

  let text = `*${BUSINESS_NAME} - Payment Receipt*\n`;
  text += `--------------------------------\n`;
  text += `Hello *${data.customerName}*,\n\n`;
  text += `We have successfully received your payment:\n\n`;
  text += `Receipt No: *#${data.paymentNumber}*\n`;
  text += `Amount Received: *₹${Number(data.amount).toFixed(2)}*\n`;
  text += `Payment Mode: *${methodLabel}*\n`;
  text += `Date: ${data.date}\n`;
  if (remaining > 0) {
    text += `Remaining Outstanding: *₹${remaining.toFixed(2)}*\n`;
  } else {
    text += `Account Status: *All Clear (₹0.00)*\n`;
  }
  text += `--------------------------------\n`;
  text += `Thank you for your timely payment!\n*${BUSINESS_NAME}*`;

  return text;
}

export interface BalanceShareData {
  customerName: string;
  outstandingBalance: string;
  creditLimit?: string;
  date: string;
}

export function generateBalanceReminderMessage(data: BalanceShareData): string {
  let text = `*${BUSINESS_NAME} - Account Statement*\n`;
  text += `--------------------------------\n`;
  text += `Hello *${data.customerName}*,\n\n`;
  text += `Your current outstanding account balance is *₹${Number(data.outstandingBalance).toFixed(2)}* as of ${data.date}.\n\n`;
  text += `Please arrange for settlement at your earliest convenience.\n`;
  text += `--------------------------------\n`;
  text += `Thank you,\n*${BUSINESS_NAME}*`;

  return text;
}

export interface DeliverySummaryShareData {
  customerName: string;
  orderNumber: string;
  driverName?: string;
  status: string;
  totalAmount: string;
  date: string;
}

export function generateDeliverySummaryMessage(data: DeliverySummaryShareData): string {
  let text = `*${BUSINESS_NAME} - Delivery Update*\n`;
  text += `--------------------------------\n`;
  text += `Hello *${data.customerName}*,\n\n`;
  text += `Your Order *#${data.orderNumber}* has been *${data.status}* on ${data.date}.\n`;
  if (data.driverName) {
    text += `Delivery Person: ${data.driverName}\n`;
  }
  text += `Order Total: ₹${Number(data.totalAmount).toFixed(2)}\n\n`;
  text += `Thank you for your business!\n*${BUSINESS_NAME}*`;

  return text;
}
