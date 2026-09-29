import React, { useEffect, useState } from 'react';
import { orderService } from '../../services/orderService';
import { routeService } from '../../services/routeService';
import { Order, Route } from '../../types';
import { formatCurrency, formatDate } from '../../utils/formatters';
import { ShoppingCart, Search, Eye, FileText, MessageSquare, Edit } from 'lucide-react';
import { InvoiceModal } from '../../components/InvoiceModal';
import { EditOrderModal } from '../../components/EditOrderModal';
import { openWhatsApp, generateInvoiceMessage } from '../../utils/whatsappUtils';
import { useSettings } from '../../context/SettingsContext';

export const OrdersPage: React.FC = () => {
  const { isWhatsAppEnabled } = useSettings();
  const [orders, setOrders] = useState<Order[]>([]);
  const [routes, setRoutes] = useState<Route[]>([]);
  const [selectedRoute, setSelectedRoute] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');
  const [selectedSource, setSelectedSource] = useState('');
  const [loading, setLoading] = useState(true);
  const [activeOrder, setActiveOrder] = useState<Order | null>(null);
  const [invoiceOrder, setInvoiceOrder] = useState<Order | null>(null);
  const [editingOrder, setEditingOrder] = useState<Order | null>(null);


  const fetchOrders = async () => {
    try {
      setLoading(true);
      const [orderList, routeList] = await Promise.all([
        orderService.getOrders({
          route: selectedRoute || undefined,
          status: selectedStatus || undefined,
        }),
        routeService.getRoutes(),
      ]);
      setOrders(orderList);
      setRoutes(routeList);
    } catch (err: unknown) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, [selectedRoute, selectedStatus]);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'DELIVERED':
        return <span className="badge badge-success">Delivered</span>;
      case 'OUT_FOR_DELIVERY':
      case 'DELIVERY_CREATED':
        return <span className="badge badge-warning">Out for Delivery</span>;
      case 'SUBMITTED':
        return <span className="badge badge-info">Submitted</span>;
      case 'CONFIRMED':
        return <span className="badge badge-info">Confirmed</span>;
      case 'LOCKED':
        return <span className="badge badge-primary">Locked</span>;
      case 'CANCELLED':
        return <span className="badge badge-danger">Cancelled</span>;
      default:
        return <span className="badge badge-neutral">{status}</span>;
    }
  };

  return (
    <div>
      <div style={{ marginBottom: '1.75rem' }}>
        <h2 style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--text-primary)' }}>
          Sales Orders & Dispatches
        </h2>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.88rem' }}>
          Batch orders for Kubbus and Romali rotis across delivery routes.
        </p>
      </div>

      {/* Filter Bar */}
      <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
        <select
          className="form-select"
          style={{ width: '200px' }}
          value={selectedRoute}
          onChange={(e) => setSelectedRoute(e.target.value)}
        >
          <option value="">All Delivery Routes</option>
          {routes.map((r) => (
            <option key={r.id} value={r.id}>
              {r.name}
            </option>
          ))}
        </select>

        <select
          className="form-select"
          style={{ width: '180px' }}
          value={selectedStatus}
          onChange={(e) => setSelectedStatus(e.target.value)}
        >
          <option value="">All Statuses</option>
          <option value="DRAFT">Draft</option>
          <option value="PENDING">Pending</option>
          <option value="SUBMITTED">Submitted</option>
          <option value="LOCKED">Locked</option>
          <option value="CONFIRMED">Confirmed</option>
          <option value="DELIVERY_CREATED">Delivery Created</option>
          <option value="DELIVERED">Delivered</option>
          <option value="CANCELLED">Cancelled</option>
        </select>

        <select
          className="form-select"
          style={{ width: '210px' }}
          value={selectedSource}
          onChange={(e) => setSelectedSource(e.target.value)}
        >
          <option value="">All Order Sources</option>
          <option value="CUSTOMER_LINK">📱 Customer Self-Order (Online)</option>
          <option value="MANAGER">Manager Sheet Entry</option>
          <option value="OWNER">Owner Entry</option>
        </select>
      </div>

      {/* Table */}
      <div className="table-container">
        {loading ? (
          <div style={{ padding: '3rem', textAlign: 'center' }}>
            <div className="spinner" style={{ margin: '0 auto' }} />
          </div>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Order #</th>
                <th>Date</th>
                <th>Customer Shop</th>
                <th>Route</th>
                <th>Assigned Driver</th>
                <th>Total Amount</th>
                <th>Source</th>
                <th>Entered By</th>
                <th>Status</th>
                <th>Items</th>
              </tr>
            </thead>
            <tbody>
              {orders.filter((o) => !selectedSource || o.source === selectedSource).length > 0 ? (
                orders.filter((o) => !selectedSource || o.source === selectedSource).map((o) => (
                  <tr key={o.id}>
                    <td style={{ fontWeight: 600 }}>{o.order_number}</td>
                    <td>{formatDate(o.order_date)}</td>
                    <td>
                      <div style={{ fontWeight: 600 }}>{o.customer_details?.name || 'Customer'}</div>
                    </td>
                    <td>
                      <span className="badge badge-neutral">{o.route_details?.name}</span>
                    </td>
                    <td>{o.driver_name || 'Unassigned'}</td>
                    <td style={{ fontWeight: 700, color: 'var(--primary)' }}>
                      {formatCurrency(o.total_amount)}
                    </td>
                    <td>
                      <span
                        style={{
                          fontSize: '0.74rem',
                          padding: '0.2rem 0.5rem',
                          background: o.source === 'CUSTOMER_LINK' ? '#ecfdf5' : '#f3f4f6',
                          color: o.source === 'CUSTOMER_LINK' ? '#047857' : '#374151',
                          border: o.source === 'CUSTOMER_LINK' ? '1px solid #a7f3d0' : '1px solid #e5e7eb',
                          borderRadius: '4px',
                          fontWeight: 700,
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '0.25rem',
                        }}
                      >
                        {o.source === 'CUSTOMER_LINK' ? '📱 Self-Order' : (o.source || 'MANAGER')}
                      </span>
                    </td>
                    <td>
                      <div style={{ fontSize: '0.8rem' }}>
                        {o.entered_by_name || 'System'}
                      </div>
                      <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                        {o.entered_by_role || 'MANAGER'}
                      </div>
                    </td>
                    <td>{getStatusBadge(o.status)}</td>
                    <td>
                      <div style={{ display: 'flex', gap: '0.35rem', alignItems: 'center' }}>
                        <button
                          className="btn btn-secondary"
                          style={{ padding: '0.3rem 0.55rem', fontSize: '0.78rem' }}
                          onClick={() => setActiveOrder(o)}
                          title="View order details"
                        >
                          <Eye size={13} />
                          <span>View</span>
                        </button>
                        {o.status !== 'DELIVERED' && o.status !== 'CANCELLED' && (
                          <button
                            className="btn btn-secondary"
                            style={{ padding: '0.3rem 0.55rem', fontSize: '0.78rem', color: '#b45309', borderColor: '#fde68a' }}
                            onClick={() => setEditingOrder(o)}
                            title="Edit order items or driver"
                          >
                            <Edit size={13} />
                            <span>Edit</span>
                          </button>
                        )}
                        <button
                          className="btn btn-secondary"
                          style={{ padding: '0.3rem 0.55rem', fontSize: '0.78rem', color: 'var(--primary)' }}
                          onClick={() => setInvoiceOrder(o)}
                          title="View and print tax invoice"
                        >
                          <FileText size={13} />
                          <span>Invoice</span>
                        </button>

                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={8} style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
                    No orders found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>

      {/* Order Items Modal */}
      {activeOrder && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h3 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: '0.5rem' }}>
              Order #{activeOrder.order_number}
            </h3>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '1.25rem' }}>
              Customer: <strong>{activeOrder.customer_details?.name}</strong> | Route: {activeOrder.route_details?.name}
            </p>

            <table className="data-table" style={{ marginBottom: '1.25rem' }}>
              <thead>
                <tr>
                  <th>Product</th>
                  <th>Quantity</th>
                  <th>Price</th>
                  <th>Subtotal</th>
                </tr>
              </thead>
              <tbody>
                {activeOrder.items.map((item) => (
                  <tr key={item.id}>
                    <td>{item.product_details?.name}</td>
                    <td>{item.quantity} packs</td>
                    <td>{formatCurrency(item.unit_price)}</td>
                    <td style={{ fontWeight: 600 }}>{formatCurrency(item.subtotal)}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.75rem', background: '#f8fafc', borderRadius: 'var(--radius-md)', marginBottom: '1.25rem' }}>
              <span style={{ fontWeight: 600 }}>Total Order Value:</span>
              <span style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--primary)' }}>
                {formatCurrency(activeOrder.total_amount)}
              </span>
            </div>

            <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.75rem' }}>
              {isWhatsAppEnabled && (
                <button
                  className="btn btn-secondary"
                  style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem', color: '#059669' }}
                  onClick={() => {
                    const items = (activeOrder.items || []).map((it) => ({
                      name: it.product_details?.name || 'Product',
                      quantity: it.quantity,
                      unitPrice: it.unit_price,
                      subtotal: it.subtotal || (Number(it.unit_price) * it.quantity).toFixed(2),
                    }));
                    const msg = generateInvoiceMessage({
                      customerName: activeOrder.customer_details?.name || 'Customer',
                      orderNumber: activeOrder.order_number,
                      date: activeOrder.order_date,
                      items,
                      totalAmount: activeOrder.total_amount,
                    });
                    openWhatsApp(activeOrder.customer_details?.phone, msg);
                  }}
                >
                  <MessageSquare size={15} />
                  <span>Share WhatsApp</span>
                </button>
              )}

              <button
                className="btn btn-primary"
                style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem' }}
                onClick={() => {
                  setInvoiceOrder(activeOrder);
                  setActiveOrder(null);
                }}
              >
                <FileText size={15} />
                <span>Print Invoice</span>
              </button>
            </div>

            <button className="btn btn-secondary btn-full" onClick={() => setActiveOrder(null)}>
              Close
            </button>
          </div>
        </div>
      )}

      {/* Invoice Modal */}
      {invoiceOrder && (
        <InvoiceModal
          order={invoiceOrder}
          customer={invoiceOrder.customer_details}
          onClose={() => setInvoiceOrder(null)}
        />
      )}

      {/* Edit Order Modal */}
      {editingOrder && (
        <EditOrderModal
          order={editingOrder}
          onClose={() => setEditingOrder(null)}
          onSuccess={() => {
            setEditingOrder(null);
            fetchOrders();
          }}
        />
      )}
    </div>
  );
};

