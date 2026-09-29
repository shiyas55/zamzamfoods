import React, { useRef, useState } from 'react';
import { Order, Customer } from '../types';
import { openWhatsApp, generateInvoiceMessage, BUSINESS_NAME, BUSINESS_PHONE } from '../utils/whatsappUtils';
import { BRAND_CONFIG } from '../config/brandConfig';
import { useSettings } from '../context/SettingsContext';

interface InvoiceModalProps {
  order: Order;
  customer?: Customer | null;
  onClose: () => void;
}

export const InvoiceModal: React.FC<InvoiceModalProps> = ({ order, customer, onClose }) => {
  const invoiceRef = useRef<HTMLDivElement>(null);
  const [applyGst, setApplyGst] = useState(false);
  const { isWhatsAppEnabled, gstNumber, businessPhone, businessName, settings } = useSettings();

  const cust = customer || order.customer_details;
  const subtotal = Number(order.total_amount || 0);
  const gstAmount = applyGst ? subtotal * 0.05 : 0;
  const finalTotal = subtotal + gstAmount;
  const prevCredit = cust?.current_balance ? Number(cust.current_balance) : 0;

  const handlePrint = () => {
    window.print();
  };

  const handleWhatsAppShare = () => {
    const custName = customer?.name || order.customer_details?.name || 'Valued Customer';
    const custPhone = customer?.phone || order.customer_details?.phone;
    const items = order.items.map((it) => ({
      name: it.product_details?.name || 'Product',
      quantity: it.quantity,
      unitPrice: it.unit_price,
      subtotal: it.subtotal,
    }));

    const msg = generateInvoiceMessage({
      customerName: custName,
      orderNumber: order.order_number,
      date: order.order_date,
      items,
      totalAmount: finalTotal.toFixed(2),
      gstAmount: applyGst ? gstAmount.toFixed(2) : undefined,
      outstandingBalance: customer?.current_balance,
    });

    openWhatsApp(custPhone, msg);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/70 backdrop-blur-sm flex justify-center items-center p-2 sm:p-4 print:p-0 print:bg-white print:static print:inset-auto">
      {/* Container */}
      <div className="relative w-full max-w-3xl bg-white text-slate-800 rounded-xl shadow-2xl overflow-hidden print:shadow-none print:w-full print:max-w-none print:rounded-none">
        
        {/* Actions Bar (Hidden during print) */}
        <div className="bg-slate-900 text-white px-4 py-3 flex flex-wrap items-center justify-between gap-2 border-b border-slate-700 print:hidden">
          <div className="flex items-center gap-2">
            <span className="font-bold text-amber-400">INVOICE #{order.order_number}</span>
            <span className="text-xs px-2 py-0.5 rounded bg-red-900/60 text-red-200 border border-red-700 uppercase font-mono">
              {order.status}
            </span>
          </div>

          <div className="flex items-center gap-4">
            <label className="flex items-center gap-1.5 text-xs font-semibold cursor-pointer">
              <input 
                type="checkbox" 
                checked={applyGst} 
                onChange={(e) => setApplyGst(e.target.checked)}
                className="w-3.5 h-3.5 accent-amber-500"
              />
              Include GST (5%)
            </label>
            <div className="flex items-center gap-2">
              {isWhatsAppEnabled && (
                <button
                  onClick={handleWhatsAppShare}
                  type="button"
                  className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-xs font-semibold flex items-center gap-1.5 shadow transition-colors"
                >
                  <span>💬</span> Share WhatsApp
                </button>
              )}
            <button
              onClick={handlePrint}
              type="button"
              className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded text-xs font-semibold flex items-center gap-1.5 shadow transition-colors"
            >
              <span>🖨️</span> Print / PDF
            </button>
            <button
              onClick={onClose}
              type="button"
              className="p-1.5 text-slate-400 hover:text-white rounded text-lg leading-none"
              title="Close"
            >
              ✕
            </button>
          </div>
          </div>
        </div>

        {/* Printable Paper Area */}
        <div ref={invoiceRef} className="p-6 sm:p-8 bg-white font-sans text-slate-800 printable-content">
          
          {/* Header with Zamzam Signboard Branding: Red + Dark Red + Yellow */}
          <div className="border-b-4 border-red-700 pb-5 mb-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div>
                <div className="inline-block bg-gradient-to-r from-red-800 to-red-600 text-amber-300 font-black text-2xl tracking-wider px-3 py-1 rounded shadow-sm">
                  {businessName || 'ZAMZAM FOODS'}
                </div>
                <div className="text-xs font-semibold text-red-800 mt-1 uppercase tracking-wide">
                  Wholesale Bakery & Bread Distribution
                </div>
                <div className="text-xs text-slate-500 mt-0.5">
                  {BRAND_CONFIG.routes.join(' • ')} Routes | Ph: {businessPhone || BUSINESS_PHONE}
                </div>
                {gstNumber && (
                  <div className="text-xs font-bold text-slate-700 mt-0.5 font-mono">
                    GSTIN: <span className="text-red-700">{gstNumber}</span>
                  </div>
                )}
              </div>

              <div className="sm:text-right">
                <div className="text-xl font-bold text-slate-800 uppercase tracking-tight">TAX INVOICE</div>
                <div className="text-xs font-semibold text-slate-600 mt-0.5">
                  Invoice No: <span className="font-mono text-red-700 font-bold">INV-{order.order_number}</span>
                </div>
                <div className="text-xs text-slate-500">Date: {order.order_date}</div>
                {order.route_details && (
                  <div className="text-xs text-slate-500">Route: {order.route_details.name}</div>
                )}
              </div>
            </div>
          </div>

          {/* Customer & Order Metadata */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6 p-3 bg-red-50/50 rounded-lg border border-red-100 text-xs">
            <div>
              <span className="font-bold text-red-900 uppercase block mb-1">Billed To (Customer):</span>
              <div className="font-bold text-sm text-slate-800">{cust?.name || 'Customer'}</div>
              {cust?.owner_name && <div className="text-slate-600">Attn: {cust.owner_name}</div>}
              {cust?.phone && <div className="text-slate-600">Ph: {cust.phone}</div>}
              {cust?.address && <div className="text-slate-600">{cust.address}</div>}
            </div>

            <div className="sm:text-right">
              <span className="font-bold text-red-900 uppercase block mb-1">Dispatch Details:</span>
              <div>Order Ref: <span className="font-mono font-medium">#{order.order_number}</span></div>
              <div>Delivery Status: <span className="font-semibold text-red-700">{order.status}</span></div>
              {order.driver_name && <div>Assigned Driver: {order.driver_name}</div>}
              <div>Created On: {new Date(order.created_at).toLocaleDateString()}</div>
            </div>
          </div>

          {/* Products Table */}
          <div className="overflow-x-auto mb-6">
            <table className="w-full text-left border-collapse text-xs sm:text-sm">
              <thead>
                <tr className="bg-red-800 text-white font-semibold uppercase text-[11px] tracking-wider">
                  <th className="py-2 px-3 rounded-l">#</th>
                  <th className="py-2 px-3">Item Description</th>
                  <th className="py-2 px-3 text-right">Quantity</th>
                  <th className="py-2 px-3 text-right">Unit Rate (₹)</th>
                  <th className="py-2 px-3 text-right rounded-r">Total (₹)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {order.items.map((item, idx) => (
                  <tr key={item.id} className={idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/70'}>
                    <td className="py-2.5 px-3 text-slate-400 font-mono">{idx + 1}</td>
                    <td className="py-2.5 px-3">
                      <div className="font-bold text-slate-800">{item.product_details?.name || 'Product'}</div>
                      {item.product_details?.packet_size && (
                        <div className="text-[11px] text-slate-400">Pack: {item.product_details.packet_size}</div>
                      )}
                    </td>
                    <td className="py-2.5 px-3 text-right font-medium text-slate-700">{item.quantity}</td>
                    <td className="py-2.5 px-3 text-right font-mono text-slate-600">₹{Number(item.unit_price).toFixed(2)}</td>
                    <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-800">₹{Number(item.subtotal).toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Financial Breakdown Section */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 items-start pt-3 border-t border-slate-200">
            {/* Payment & Terms Note */}
            <div className="text-xs text-slate-500 space-y-2">
              <div className="p-3 bg-amber-50 rounded border border-amber-200 text-amber-900">
                <div className="font-bold text-[11px] uppercase mb-0.5">Accepted Payment Modes:</div>
                <div>Cash or UPI / GPay to Zamzam Foods authorized distribution driver.</div>
              </div>
              <p className="text-[11px] italic">
                * Note: Outstanding balance reflects the verified credit ledger as recorded in the wholesale distribution portal.
              </p>
            </div>

            {/* Totals Summary */}
            <div className="bg-slate-50 p-4 rounded-lg border border-slate-200 space-y-2 text-xs sm:text-sm">
              <div className="flex justify-between text-slate-600">
                <span>Invoice Subtotal:</span>
                <span className="font-mono font-medium">₹{subtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>Tax / GST:</span>
                {applyGst ? (
                  <span className="font-mono text-slate-700">₹{gstAmount.toFixed(2)} (5%)</span>
                ) : (
                  <span className="font-mono text-slate-400">₹0.00 (Exempt)</span>
                )}
              </div>
              
              <div className="border-t border-slate-300 pt-2 flex justify-between font-bold text-base text-red-900">
                <span>Current Order Total:</span>
                <span className="font-mono">₹{finalTotal.toFixed(2)}</span>
              </div>

              {/* Outstanding Credit Separation */}
              <div className="border-t border-slate-200 pt-2 mt-2 space-y-1">
                <div className="flex justify-between text-slate-600 text-xs">
                  <span>Previous Customer Balance:</span>
                  <span className="font-mono">₹{prevCredit.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-slate-900 font-bold text-sm bg-red-100/60 p-1.5 rounded">
                  <span>Total Account Outstanding:</span>
                  <span className="font-mono text-red-800">
                    ₹{(subtotal + prevCredit).toFixed(2)}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Terms & Footer Notes */}
          {settings?.invoice_footer_notes && (
            <div className="mt-4 p-2.5 rounded bg-slate-50 border border-slate-200 text-xs text-slate-600 italic">
              {settings.invoice_footer_notes}
            </div>
          )}

          {/* Footer Signatures */}
          <div className="mt-6 pt-6 border-t border-slate-200 grid grid-cols-2 text-center text-xs text-slate-500">
            <div>
              <div className="h-10"></div>
              <div className="border-t border-dashed border-slate-300 pt-1 font-medium">
                Customer Signature & Seal
              </div>
            </div>
            <div>
              <div className="h-10"></div>
              <div className="border-t border-dashed border-slate-300 pt-1 font-medium text-red-900">
                For Zamzam Foods (Authorized Signatory)
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};
