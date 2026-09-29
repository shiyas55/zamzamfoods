import React, { useEffect, useState } from 'react';
import { expenseService } from '../../services/expenseService';
import { routeService } from '../../services/routeService';
import { DriverExpense, DriverExpenseCategory, DriverExpenseSummary, Driver, Route } from '../../types';
import { formatCurrency, formatDate } from '../../utils/formatters';
import { Plus, X, AlertCircle, CheckCircle, Store, Fuel, Utensils, ParkingCircle, Landmark, Wrench, FileText, Calendar, Filter } from 'lucide-react';

const CATEGORY_OPTIONS: { label: string; value: string }[] = [
  { label: 'All Expense Categories', value: '' },
  { label: 'Shop Expense', value: 'SHOP_EXPENSE' },
  { label: 'Petrol / Fuel', value: 'PETROL' },
  { label: 'Food / Meals', value: 'FOOD' },
  { label: 'Parking', value: 'PARKING' },
  { label: 'Toll Gate', value: 'TOLL' },
  { label: 'Vehicle Maintenance', value: 'MAINTENANCE' },
  { label: 'Other', value: 'OTHER' },
];

const FORM_CATEGORIES: { label: string; value: DriverExpenseCategory }[] = [
  { label: 'Shop Expense / Allowance', value: 'SHOP_EXPENSE' },
  { label: 'Petrol / Fuel', value: 'PETROL' },
  { label: 'Food / Meals', value: 'FOOD' },
  { label: 'Parking', value: 'PARKING' },
  { label: 'Toll Gate', value: 'TOLL' },
  { label: 'Vehicle Maintenance', value: 'MAINTENANCE' },
  { label: 'Other', value: 'OTHER' },
];

export const ExpensesPage: React.FC = () => {
  const [expenses, setExpenses] = useState<DriverExpense[]>([]);
  const [summary, setSummary] = useState<DriverExpenseSummary | null>(null);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [routes, setRoutes] = useState<Route[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [selectedDriver, setSelectedDriver] = useState('');
  const [selectedRoute, setSelectedRoute] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedDate, setSelectedDate] = useState('');

  // Add Expense Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    category: 'SHOP_EXPENSE' as DriverExpenseCategory,
    custom_category: '',
    driver: '',
    amount: '',
    date: new Date().toISOString().split('T')[0],
    notes: '',
    receipt_reference: '',
  });
  const [formSubmitting, setFormSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [expList, sumData, driverList, routeList] = await Promise.all([
        expenseService.getExpenses({
          driver: selectedDriver || undefined,
          route: selectedRoute || undefined,
          category: selectedCategory || undefined,
          date: selectedDate || undefined,
        }),
        expenseService.getExpenseSummary(selectedDriver || undefined),
        routeService.getDrivers(),
        routeService.getRoutes(),
      ]);
      setExpenses(expList);
      setSummary(sumData);
      setDrivers(driverList);
      setRoutes(routeList);
    } catch (err: unknown) {
      console.error('Failed to load expenses data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [selectedDriver, selectedRoute, selectedCategory, selectedDate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.amount || parseFloat(formData.amount) <= 0) {
      setFormError('Please enter a valid expense amount greater than zero.');
      return;
    }

    try {
      setFormSubmitting(true);
      setFormError(null);

      await expenseService.createExpense({
        category: formData.category,
        custom_category: formData.custom_category.trim() || undefined,
        driver: formData.driver || null,
        amount: formData.amount,
        date: formData.date || undefined,
        notes: formData.notes.trim() || undefined,
        receipt_reference: formData.receipt_reference.trim() || undefined,
      });

      setIsModalOpen(false);
      setFormData({
        category: 'SHOP_EXPENSE',
        custom_category: '',
        driver: '',
        amount: '',
        date: new Date().toISOString().split('T')[0],
        notes: '',
        receipt_reference: '',
      });
      setSuccessMsg('Expense recorded successfully!');
      setTimeout(() => setSuccessMsg(null), 4000);
      await fetchData();
    } catch (err: any) {
      const msg =
        err.response?.data?.detail ||
        err.response?.data?.amount?.[0] ||
        err.response?.data?.driver?.[0] ||
        'Failed to record expense. Please verify the inputs.';
      setFormError(msg);
    } finally {
      setFormSubmitting(false);
    }
  };

  return (
    <div>
      {/* Toast Alert */}
      {successMsg && (
        <div
          style={{
            position: 'fixed',
            top: '20px',
            right: '20px',
            zIndex: 9999,
            backgroundColor: '#059669',
            color: '#fff',
            padding: '12px 20px',
            borderRadius: '8px',
            boxShadow: '0 4px 14px rgba(0,0,0,0.2)',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            fontWeight: 600,
          }}
        >
          <CheckCircle size={18} />
          {successMsg}
        </div>
      )}

      {/* Page Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '1.5rem',
          flexWrap: 'wrap',
          gap: '1rem',
        }}
      >
        <div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-primary)' }}>
            Business & Route Expenses
          </h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.88rem' }}>
            Record shop expenses, audit fuel, food, toll, and vehicle maintenance costs.
          </p>
        </div>
        <button
          className="btn btn-primary"
          onClick={() => {
            setFormError(null);
            setIsModalOpen(true);
          }}
          style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', fontWeight: 700 }}
        >
          <Plus size={18} />
          Record Expense
        </button>
      </div>

      {/* Summary KPI Cards */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '1rem',
          marginBottom: '1.5rem',
        }}
      >
        <div className="card" style={{ padding: '1.25rem', borderLeft: '4px solid #dc2626' }}>
          <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>
            Today's Total Expenses
          </span>
          <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#dc2626', marginTop: '0.25rem' }}>
            {formatCurrency(summary?.today_total || '0.00')}
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
            Recorded today
          </div>
        </div>

        <div className="card" style={{ padding: '1.25rem', borderLeft: '4px solid #f59e0b' }}>
          <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>
            This Week's Expenses
          </span>
          <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#b45309', marginTop: '0.25rem' }}>
            {formatCurrency(summary?.week_total || '0.00')}
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
            Rolling 7-day total
          </div>
        </div>

        <div className="card" style={{ padding: '1.25rem', borderLeft: '4px solid #dc2626' }}>
          <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>
            This Month's Expenses
          </span>
          <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#dc2626', marginTop: '0.25rem' }}>
            {formatCurrency(summary?.month_total || '0.00')}
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
            Current calendar month
          </div>
        </div>

        <div className="card" style={{ padding: '1.25rem', borderLeft: '4px solid #10b981' }}>
          <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>
            Category Breakdown (Month)
          </span>
          <div style={{ fontSize: '0.8rem', marginTop: '0.4rem', display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>Shop / Other:</span>
              <strong>
                {formatCurrency(
                  (
                    parseFloat(summary?.category_breakdown?.SHOP_EXPENSE || '0') +
                    parseFloat(summary?.category_breakdown?.OTHER || '0')
                  ).toFixed(2)
                )}
              </strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>Petrol / Fuel:</span>
              <strong>{formatCurrency(summary?.category_breakdown?.PETROL || '0')}</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>Food & Tolls:</span>
              <strong>
                {formatCurrency(
                  (
                    parseFloat(summary?.category_breakdown?.FOOD || '0') +
                    parseFloat(summary?.category_breakdown?.TOLL || '0') +
                    parseFloat(summary?.category_breakdown?.PARKING || '0') +
                    parseFloat(summary?.category_breakdown?.MAINTENANCE || '0')
                  ).toFixed(2)
                )}
              </strong>
            </div>
          </div>
        </div>
      </div>

      {/* Filter Bar */}
      <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
        <select
          className="form-select"
          style={{ minWidth: '180px' }}
          value={selectedDriver}
          onChange={(e) => setSelectedDriver(e.target.value)}
        >
          <option value="">All Drivers / Direct</option>
          {drivers.map((d) => (
            <option key={d.id} value={d.id}>
              {d.driver_name} ({d.assigned_route_details?.name || 'No Route'})
            </option>
          ))}
        </select>

        <select
          className="form-select"
          style={{ minWidth: '180px' }}
          value={selectedRoute}
          onChange={(e) => setSelectedRoute(e.target.value)}
        >
          <option value="">All Routes</option>
          {routes.map((r) => (
            <option key={r.id} value={r.id}>
              {r.name} ({r.code})
            </option>
          ))}
        </select>

        <select
          className="form-select"
          style={{ minWidth: '180px' }}
          value={selectedCategory}
          onChange={(e) => setSelectedCategory(e.target.value)}
        >
          {CATEGORY_OPTIONS.map((c) => (
            <option key={c.value} value={c.value}>
              {c.label}
            </option>
          ))}
        </select>

        <input
          type="date"
          className="form-input"
          style={{ minWidth: '160px' }}
          value={selectedDate}
          onChange={(e) => setSelectedDate(e.target.value)}
        />

        {(selectedDriver || selectedRoute || selectedCategory || selectedDate) && (
          <button
            className="btn btn-secondary"
            onClick={() => {
              setSelectedDriver('');
              setSelectedRoute('');
              setSelectedCategory('');
              setSelectedDate('');
            }}
          >
            Clear Filters
          </button>
        )}
      </div>

      {/* Expense Audit Table */}
      <div className="table-container">
        {loading ? (
          <div style={{ padding: '3rem', textAlign: 'center' }}>
            <div className="spinner" style={{ margin: '0 auto' }} />
          </div>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Driver / Expense Source</th>
                <th>Route</th>
                <th>Category</th>
                <th>Amount (₹)</th>
                <th>Date</th>
                <th>Notes / Remarks</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {expenses.length > 0 ? (
                expenses.map((exp) => (
                  <tr key={exp.id}>
                    <td>
                      <div style={{ fontWeight: 700 }}>
                        {exp.driver_name || 'General / Shop Expense'}
                      </div>
                    </td>
                    <td>
                      <span className="badge badge-neutral">
                        {exp.route_name || 'General'}
                      </span>
                    </td>
                    <td>
                      <span
                        className={`badge ${
                          exp.category === 'SHOP_EXPENSE'
                            ? 'badge-primary'
                            : exp.category === 'PETROL'
                            ? 'badge-warning'
                            : 'badge-neutral'
                        }`}
                      >
                        {exp.category_display || exp.category}
                      </span>
                    </td>
                    <td style={{ fontWeight: 800, color: '#dc2626', fontSize: '1rem' }}>
                      {formatCurrency(exp.amount)}
                    </td>
                    <td>{formatDate(exp.date)}</td>
                    <td style={{ maxWidth: '240px', color: 'var(--text-secondary)' }}>
                      {exp.notes || exp.receipt_reference || '—'}
                    </td>
                    <td>
                      <span className="badge badge-success">
                        {exp.status || 'APPROVED'}
                      </span>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
                    No expenses found matching current filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>

      {/* Record Expense Modal */}
      {isModalOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1050,
            padding: '1rem',
          }}
        >
          <div
            className="card"
            style={{
              width: '100%',
              maxWidth: '520px',
              padding: '1.75rem',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.2), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
              borderRadius: '12px',
              backgroundColor: 'var(--card-bg, #ffffff)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                <Store size={22} style={{ color: 'var(--primary, #dc2626)' }} />
                <h3 style={{ fontSize: '1.2rem', fontWeight: 800, margin: 0 }}>
                  Record Business / Route Expense
                </h3>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  color: 'var(--text-muted)',
                  padding: '4px',
                }}
              >
                <X size={20} />
              </button>
            </div>

            {formError && (
              <div
                style={{
                  padding: '0.75rem 1rem',
                  backgroundColor: '#fee2e2',
                  color: '#991b1b',
                  borderRadius: '6px',
                  marginBottom: '1rem',
                  fontSize: '0.85rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                }}
              >
                <AlertCircle size={16} />
                {formError}
              </div>
            )}

            <form onSubmit={handleSubmit}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, marginBottom: '0.35rem' }}>
                    Expense Category *
                  </label>
                  <select
                    className="form-select"
                    style={{ width: '100%' }}
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value as DriverExpenseCategory })}
                    required
                  >
                    {FORM_CATEGORIES.map((c) => (
                      <option key={c.value} value={c.value}>
                        {c.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, marginBottom: '0.35rem' }}>
                    Driver / Route (Optional)
                  </label>
                  <select
                    className="form-select"
                    style={{ width: '100%' }}
                    value={formData.driver}
                    onChange={(e) => setFormData({ ...formData, driver: e.target.value })}
                  >
                    <option value="">General / Shop Expense</option>
                    {drivers.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.driver_name} ({d.assigned_route_details?.name || 'No Route'})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {formData.category === 'OTHER' && (
                <div style={{ marginBottom: '1rem' }}>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, marginBottom: '0.35rem' }}>
                    Custom Category Name
                  </label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="e.g. Packing material, Ice block..."
                    style={{ width: '100%' }}
                    value={formData.custom_category}
                    onChange={(e) => setFormData({ ...formData, custom_category: e.target.value })}
                  />
                </div>
              )}

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, marginBottom: '0.35rem' }}>
                    Amount (₹) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    className="form-input"
                    placeholder="0.00"
                    style={{ width: '100%', fontWeight: 700 }}
                    value={formData.amount}
                    onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                    required
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, marginBottom: '0.35rem' }}>
                    Date *
                  </label>
                  <input
                    type="date"
                    className="form-input"
                    style={{ width: '100%' }}
                    value={formData.date}
                    onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, marginBottom: '0.35rem' }}>
                  Receipt / Bill Reference (Optional)
                </label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="e.g. Petrol pump bill #4092, Shop receipt"
                  style={{ width: '100%' }}
                  value={formData.receipt_reference}
                  onChange={(e) => setFormData({ ...formData, receipt_reference: e.target.value })}
                />
              </div>

              <div style={{ marginBottom: '1.5rem' }}>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, marginBottom: '0.35rem' }}>
                  Notes / Remarks
                </label>
                <textarea
                  className="form-input"
                  rows={2}
                  placeholder="e.g. Shop maintenance, delivery allowance, tea expense..."
                  style={{ width: '100%', resize: 'vertical' }}
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setIsModalOpen(false)}
                  disabled={formSubmitting}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={formSubmitting}
                  style={{ fontWeight: 700 }}
                >
                  {formSubmitting ? 'Saving...' : 'Save Expense'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
