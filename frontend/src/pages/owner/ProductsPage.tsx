import React, { useEffect, useState } from 'react';
import { productService } from '../../services/productService';
import { Product } from '../../types';
import { formatCurrency } from '../../utils/formatters';
import { Package, Edit2, Plus, X } from 'lucide-react';

export const ProductsPage: React.FC = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  // Edit Modal State
  const [editProduct, setEditProduct] = useState<Product | null>(null);
  const [newPrice, setNewPrice] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);

  // Add Product Modal State
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [description, setDescription] = useState('');
  const [unitPrice, setUnitPrice] = useState('');
  const [packetSize, setPacketSize] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchProducts = async () => {
    try {
      setLoading(true);
      const data = await productService.getProducts();
      setProducts(data);
    } catch (err: unknown) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  const handleOpenEdit = (p: Product) => {
    setEditProduct(p);
    setNewPrice(p.unit_price);
  };

  const handleUpdatePrice = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editProduct || !newPrice) return;

    try {
      setIsUpdating(true);
      await productService.updateProductPrice(editProduct.id, newPrice);
      setEditProduct(null);
      fetchProducts();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Failed to update price');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleCreateProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !code || !unitPrice) {
      setError('Please provide product name, code, and price.');
      return;
    }

    try {
      setIsSubmitting(true);
      setError(null);
      await productService.createProduct({
        name,
        code,
        description,
        unit_price: unitPrice,
        packet_size: packetSize,
      });
      setIsAddModalOpen(false);
      setName('');
      setCode('');
      setDescription('');
      setUnitPrice('');
      setPacketSize('');
      fetchProducts();
    } catch (err: unknown) {
      if (err instanceof Error) setError(err.message);
      else setError('Failed to create product');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.75rem' }}>
        <div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--text-primary)' }}>
            Product Catalog
          </h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.88rem' }}>
            Manufactured bakery products, batch packaging, and unit pricing.
          </p>
        </div>
        <button className="btn btn-primary" onClick={() => setIsAddModalOpen(true)}>
          <Plus size={18} />
          <span>Add New Product</span>
        </button>
      </div>

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '3rem' }}>
          <div className="spinner" />
        </div>
      ) : (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
            gap: '1.5rem',
          }}
        >
          {products.map((p) => (
            <div
              key={p.id}
              style={{
                background: 'white',
                borderRadius: 'var(--radius-lg)',
                border: '1px solid var(--border)',
                padding: '1.5rem',
                boxShadow: 'var(--shadow-sm)',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
              }}
            >
              <div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
                  <span className="badge badge-info">{p.code}</span>
                  <span className="badge badge-success">Active</span>
                </div>
                <h3 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '0.35rem' }}>
                  {p.name}
                </h3>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: '1rem' }}>
                  {p.description || 'Standard freshly baked distribution package'}
                </p>
                <div style={{ padding: '0.75rem', background: '#f8fafc', borderRadius: 'var(--radius-md)', marginBottom: '1rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem', marginBottom: '0.25rem' }}>
                    <span style={{ color: 'var(--text-muted)' }}>Package Size:</span>
                    <span style={{ fontWeight: 600 }}>{p.packet_size || 'Standard'}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.95rem' }}>
                    <span style={{ color: 'var(--text-muted)' }}>Selling Price:</span>
                    <span style={{ fontWeight: 700, color: 'var(--primary)' }}>{formatCurrency(p.unit_price)}</span>
                  </div>
                </div>
              </div>

              <button
                className="btn btn-secondary btn-full"
                onClick={() => handleOpenEdit(p)}
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem' }}
              >
                <Edit2 size={16} />
                <span>Adjust Price</span>
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Edit Price Modal */}
      {editProduct && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '400px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
              <h3 style={{ fontSize: '1.15rem', fontWeight: 700 }}>Adjust Price: {editProduct.name}</h3>
              <button onClick={() => setEditProduct(null)}>
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleUpdatePrice}>
              <div className="form-group">
                <label className="form-label">New Unit Price (₹)</label>
                <input
                  type="number"
                  step="0.50"
                  className="form-input"
                  value={newPrice}
                  onChange={(e) => setNewPrice(e.target.value)}
                  required
                />
              </div>

              <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1.5rem' }}>
                <button type="button" className="btn btn-secondary" style={{ flex: 1 }} onClick={() => setEditProduct(null)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" style={{ flex: 1 }} disabled={isUpdating}>
                  {isUpdating ? 'Saving...' : 'Update Price'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Product Modal */}
      {isAddModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
              <h3 style={{ fontSize: '1.2rem', fontWeight: 700 }}>Add New Product</h3>
              <button onClick={() => setIsAddModalOpen(false)}>
                <X size={20} />
              </button>
            </div>

            {error && (
              <div style={{ background: 'var(--danger-bg)', color: 'var(--danger)', padding: '0.75rem', borderRadius: 'var(--radius-md)', marginBottom: '1rem', fontSize: '0.85rem' }}>
                {error}
              </div>
            )}

            <form onSubmit={handleCreateProduct}>
              <div className="form-group">
                <label className="form-label">Product Name *</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="e.g. Garlic Kubbus"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Code / SKU *</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="e.g. GKUB"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Unit Price (₹) *</label>
                <input
                  type="number"
                  step="0.50"
                  className="form-input"
                  placeholder="e.g. 40.00"
                  value={unitPrice}
                  onChange={(e) => setUnitPrice(e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Package Size</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="e.g. 10 pcs / pack"
                  value={packetSize}
                  onChange={(e) => setPacketSize(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Description</label>
                <textarea
                  className="form-textarea"
                  rows={2}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
              </div>

              <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1.5rem' }}>
                <button type="button" className="btn btn-secondary" style={{ flex: 1 }} onClick={() => setIsAddModalOpen(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" style={{ flex: 1 }} disabled={isSubmitting}>
                  {isSubmitting ? 'Creating...' : 'Create Product'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
