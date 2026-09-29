import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { customerService } from '../../services/customerService';
import { routeService } from '../../services/routeService';
import { productService } from '../../services/productService';
import { Customer, Route, Product } from '../../types';
import { formatCurrency } from '../../utils/formatters';
import { Plus, Search, Store, AlertCircle, X, ChevronRight, Eye, Tag, ExternalLink, Copy, Check, Smartphone } from 'lucide-react';

export const CustomerShopsPage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [routes, setRoutes] = useState<Route[]>([]);
  const [selectedRoute, setSelectedRoute] = useState<string>('');
  const [search, setSearch] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Form State
  const [name, setName] = useState('');
  const [ownerName, setOwnerName] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [routeId, setRouteId] = useState('');
  const [notes, setNotes] = useState('');
  const [availableProducts, setAvailableProducts] = useState<Product[]>([]);
  const [productPrices, setProductPrices] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [custList, routeList, prodList] = await Promise.all([
        customerService.getCustomers(selectedRoute || undefined, search || undefined),
        routeService.getRoutes(),
        productService.getProducts(),
      ]);
      setCustomers(custList);
      setRoutes(routeList);
      setAvailableProducts(prodList);
      
      // Initialize product prices with default product unit_price
      const initialPrices: Record<string, string> = {};
      prodList.forEach((p) => {
        initialPrices[p.id] = p.unit_price;
      });
      setProductPrices(initialPrices);

      if (routeList.length > 0 && !routeId) {
        setRouteId(routeList[0].id);
      }
    } catch (err: unknown) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [selectedRoute, search]);

  const handleCreateCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !phone || !address || !routeId) {
      setFormError('Please fill in shop name, phone, address, and select a route.');
      return;
    }

    try {
      setIsSubmitting(true);
      setFormError(null);

      // Package customer product wholesale prices
      const product_prices = availableProducts
        .filter((p) => productPrices[p.id] !== undefined && productPrices[p.id].trim() !== '')
        .map((p) => ({
          product_id: p.id,
          price: productPrices[p.id].trim(),
        }));

      await customerService.createCustomer({
        name,
        owner_name: ownerName,
        phone,
        address,
        route: routeId,
        notes: notes || undefined,
        product_prices: product_prices.length > 0 ? product_prices : undefined,
      });

      setIsModalOpen(false);
      setName('');
      setOwnerName('');
      setPhone('');
      setAddress('');
      setNotes('');
      // Reset product prices to defaults
      const resetPrices: Record<string, string> = {};
      availableProducts.forEach((p) => {
        resetPrices[p.id] = p.unit_price;
      });
      setProductPrices(resetPrices);

      fetchData();
    } catch (err: unknown) {
      if (err instanceof Error) setFormError(err.message);
      else setFormError('Failed to create customer');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleViewCustomer = (customerId: string) => {
    const basePath = user?.role === 'MANAGER' ? '/manager' : '/owner';
    navigate(`${basePath}/customers/${customerId}`);
  };

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.75rem' }}>
        <div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--text-primary)' }}>
            Customer Shops Management
          </h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.88rem' }}>
            Directory of ~200 retail bakeries, tea stalls, and restaurants.
          </p>
        </div>
        <button className="btn btn-primary" onClick={() => setIsModalOpen(true)}>
          <Plus size={18} />
          <span>Add New Shop</span>
        </button>
      </div>

      {/* Customer Self-Order Upgrade Announcement Banner */}
      <div
        className="card"
        style={{
          padding: '0.85rem 1.25rem',
          marginBottom: '1.25rem',
          background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.08) 0%, rgba(59, 130, 246, 0.04) 100%)',
          border: '1px solid rgba(16, 185, 129, 0.35)',
          borderRadius: 'var(--radius-md)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '1rem',
          flexWrap: 'wrap',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div
            style={{
              width: '36px',
              height: '36px',
              borderRadius: '8px',
              background: '#10b981',
              color: '#ffffff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <Smartphone size={18} />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span style={{ fontWeight: 700, fontSize: '0.88rem', color: 'var(--text-primary)' }}>
                Customer Self-Order Upgrade Active
              </span>
              <span className="badge badge-success" style={{ fontSize: '0.7rem' }}>
                1-Click Confirmation • No OTP
              </span>
            </div>
            <p style={{ margin: 0, fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: '0.15rem' }}>
              Every customer shop has a dedicated mobile order link. Shops can order anytime with customer-specific pricing. Use the <strong>Self-Order</strong> buttons below to open or copy each shop's link.
            </p>
          </div>
        </div>
      </div>

      {/* Filter Bar */}
      <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
        <div style={{ position: 'relative', flex: 1, minWidth: '240px' }}>
          <Search size={18} style={{ position: 'absolute', left: '0.85rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          <input
            type="text"
            className="form-input"
            style={{ paddingLeft: '2.5rem' }}
            placeholder="Search by shop name, owner, or phone..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <select
          className="form-select"
          style={{ width: '260px' }}
          value={selectedRoute}
          onChange={(e) => setSelectedRoute(e.target.value)}
        >
          <option value="">All Delivery Routes ({routes.reduce((acc, r) => acc + (r.customer_count || 0), 0)} Shops)</option>
          {routes.map((r) => (
            <option key={r.id} value={r.id}>
              {r.name} ({r.code}) {r.customer_count !== undefined ? `• ${r.customer_count} Shops` : ''}
            </option>
          ))}
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
                <th>Shop Name</th>
                <th>Owner / Contact</th>
                <th>Route</th>
                <th>Address</th>
                <th>Current Balance</th>
                <th>Status</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {customers.length > 0 ? (
                customers.map((c) => (
                  <tr key={c.id}>
                    <td>
                      <div style={{ fontWeight: 600 }}>{c.name}</div>
                      <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>{c.phone}</div>
                    </td>
                    <td>{c.owner_name || '—'}</td>
                    <td>
                      <span className="badge badge-neutral">{c.route_details?.name || 'Assigned'}</span>
                    </td>
                    <td style={{ maxWidth: '200px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {c.address}
                    </td>
                    <td style={{ fontWeight: 700, color: c.is_credit_exceeded ? 'var(--danger)' : 'var(--text-primary)' }}>
                      {formatCurrency(c.current_balance)}
                    </td>
                    <td>
                      {c.is_credit_exceeded ? (
                        <span className="badge badge-danger">Credit Exceeded</span>
                      ) : (
                        <span className="badge badge-success">Good Standing</span>
                      )}
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <div style={{ display: 'flex', gap: '0.4rem', justifyContent: 'flex-end', alignItems: 'center' }}>
                        <button
                          className="btn btn-secondary btn-sm"
                          onClick={() => {
                            const url = `${window.location.origin}/customer/${c.id}`;
                            navigator.clipboard.writeText(url);
                            setCopiedId(c.id);
                            setTimeout(() => setCopiedId(null), 2000);
                          }}
                          title="Copy Customer Self-Order Link to share with shop"
                          style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}
                        >
                          {copiedId === c.id ? <Check size={13} color="#10b981" /> : <Copy size={13} />}
                          <span>{copiedId === c.id ? 'Copied' : 'Link'}</span>
                        </button>
                        <a
                          href={`/customer/${c.id}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="btn btn-secondary btn-sm"
                          title="Open Customer Self-Order Portal in new tab"
                          style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', color: '#10b981' }}
                        >
                          <ExternalLink size={13} />
                          <span>Self-Order</span>
                        </a>
                        <button
                          className="btn btn-secondary btn-sm"
                          onClick={() => handleViewCustomer(c.id)}
                          title="View Customer Profile & Wholesale Pricing"
                          style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}
                        >
                          <Eye size={13} />
                          <span>Profile & Pricing</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
                    No customer shops found matching the search criteria.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>

      {/* Add Customer Modal */}
      {isModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
              <h3 style={{ fontSize: '1.2rem', fontWeight: 700 }}>Add Customer Shop</h3>
              <button onClick={() => setIsModalOpen(false)} style={{ color: 'var(--text-muted)' }}>
                <X size={20} />
              </button>
            </div>

            {formError && (
              <div style={{ background: 'var(--danger-bg)', color: 'var(--danger)', padding: '0.75rem', borderRadius: 'var(--radius-md)', marginBottom: '1rem', fontSize: '0.85rem' }}>
                {formError}
              </div>
            )}

            <form onSubmit={handleCreateCustomer}>
              <div className="form-group">
                <label className="form-label">Shop Name *</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="e.g. Malabar Bakery"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Proprietor / Contact Person</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="e.g. Yousuf"
                  value={ownerName}
                  onChange={(e) => setOwnerName(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Phone Number *</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="e.g. 9847000000"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Delivery Route *</label>
                <select
                  className="form-select"
                  value={routeId}
                  onChange={(e) => setRouteId(e.target.value)}
                  required
                >
                  {routes.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.name} ({r.code})
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Location / Address *</label>
                <textarea
                  className="form-textarea"
                  rows={2}
                  placeholder="Street / landmark address"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  required
                />
              </div>

              {/* Wholesale Product Pricing Assignment */}
              {availableProducts.length > 0 && (
                <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 'var(--radius-md)', padding: '0.85rem', marginBottom: '1rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.4rem' }}>
                    <Tag size={16} color="var(--primary)" />
                    <span style={{ fontSize: '0.88rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                      Assign Product Wholesale Pricing (₹)
                    </span>
                  </div>
                  <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '0.75rem' }}>
                    Set customer-specific unit prices for this shop. Defaults to standard base wholesale prices.
                  </p>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '0.75rem' }}>
                    {availableProducts.map((p) => (
                      <div key={p.id} style={{ background: '#ffffff', padding: '0.65rem 0.75rem', borderRadius: 'var(--radius-sm)', border: '1px solid #cbd5e1' }}>
                        <div style={{ fontWeight: 600, fontSize: '0.82rem', color: 'var(--text-primary)' }}>
                          {p.name}
                        </div>
                        <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginBottom: '0.35rem' }}>
                          Standard: ₹{Number(p.unit_price).toFixed(2)}
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                          <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--primary)' }}>₹</span>
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            className="form-input"
                            style={{ padding: '0.3rem 0.5rem', fontSize: '0.88rem', fontWeight: 600 }}
                            value={productPrices[p.id] ?? p.unit_price}
                            onChange={(e) => setProductPrices({ ...productPrices, [p.id]: e.target.value })}
                            placeholder={p.unit_price}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="form-group">
                <label className="form-label">Notes / Preferences</label>
                <textarea
                  className="form-textarea"
                  rows={2}
                  placeholder="e.g. Early morning delivery preferred, payment on Saturdays"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                />
              </div>

              <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1.5rem' }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  style={{ flex: 1 }}
                  onClick={() => setIsModalOpen(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  style={{ flex: 1 }}
                  disabled={isSubmitting}
                >
                  {isSubmitting ? 'Saving...' : 'Create Customer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
