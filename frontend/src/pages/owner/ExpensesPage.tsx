import React, { useEffect, useState } from 'react';
import { expenseService } from '../../services/expenseService';
import { routeService } from '../../services/routeService';
import { DriverExpense, DriverExpenseCategory, DriverExpenseSummary, Driver, Route } from '../../types';
import { formatCurrency, formatDate } from '../../utils/formatters';
import {
  Plus,
  X,
  AlertCircle,
  CheckCircle,
  Store,
  Fuel,
  Utensils,
  ParkingCircle,
  Wrench,
  Trash2,
  Receipt,
  Building,
  UserCheck,
} from 'lucide-react';

const CATEGORY_OPTIONS: { label: string; value: string }[] = [
  { label: 'All Expense Categories', value: '' },
  { label: '🏢 Shop / Store Expense', value: 'SHOP_EXPENSE' },
  { label: '🔧 Shop & Vehicle Maintenance', value: 'MAINTENANCE' },
  { label: '📦 Raw Materials / Packaging', value: 'RAW_MATERIAL' },
  { label: '⛽ Petrol / Fuel', value: 'PETROL_FUEL' },
  { label: '🍽️ Food / Meals / Refreshments', value: 'FOOD' },
  { label: '🅿️ Parking', value: 'PARKING' },
  { label: '🛣️ Toll Gate', value: 'TOLL' },
  { label: '💡 Electricity / Rent / Utilities', value: 'UTILITY' },
  { label: '💼 Daily Wages / Staff Allowance', value: 'SALARY_WAGES' },
  { label: '🚗 Vehicle Repair', value: 'VEHICLE_REPAIR' },
  { label: '📝 Other Miscellaneous', value: 'OTHER' },
];

const FORM_CATEGORIES: { label: string; value: DriverExpenseCategory }[] = [
  { label: '🏢 Shop / Store Expense', value: 'SHOP_EXPENSE' },
  { label: '🔧 Shop & Equipment Maintenance', value: 'MAINTENANCE' },
  { label: '📦 Raw Materials / Packaging', value: 'RAW_MATERIAL' },
  { label: '⛽ Petrol / Fuel', value: 'PETROL_FUEL' },
  { label: '🍽️ Food / Meals / Refreshments', value: 'FOOD' },
  { label: '🅿️ Parking', value: 'PARKING' },
  { label: '🛣️ Toll Gate', value: 'TOLL' },
  { label: '💡 Electricity / Rent / Utilities', value: 'UTILITY' },
  { label: '💼 Daily Wages / Staff Allowance', value: 'SALARY_WAGES' },
  { label: '🚗 Vehicle Repair', value: 'VEHICLE_REPAIR' },
  { label: '📝 Other Miscellaneous', value: 'OTHER' },
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

  const handleDelete = async (id: string, name: string) => {
    if (!window.confirm(`Are you sure you want to delete this expense of ${name}?`)) {
      return;
    }
    try {
      await expenseService.deleteExpense(id);
      setSuccessMsg('Expense deleted successfully!');
      setTimeout(() => setSuccessMsg(null), 4000);
      await fetchData();
    } catch (err) {
      console.error('Failed to delete expense:', err);
      alert('Failed to delete expense. Please try again.');
    }
  };

  const getCategoryBadgeClass = (category: string) => {
    switch (category) {
      case 'SHOP_EXPENSE':
        return 'badge-primary';
      case 'MAINTENANCE':
        return 'badge-warning';
      case 'RAW_MATERIAL':
        return 'badge-info';
      case 'PETROL_FUEL':
      case 'PETROL':
        return 'badge-warning';
      case 'UTILITY':
        return 'badge-purple';
      case 'SALARY_WAGES':
        return 'badge-success';
      default:
        return 'badge-neutral';
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
            Expenses Management
          </h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.88rem' }}>
            Record and manage all shop expenses, equipment maintenance, raw materials, fuel, and driver allowances.
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
          <div
            style={{
              fontSize: '0.8rem',
              marginTop: '0.4rem',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.25rem',
              maxHeight: '80px',
              overflowY: 'auto',
            }}
          >
            {summary?.category_breakdown &&
            Object.entries(summary.category_breakdown).some(([_, val]) => parseFloat(val || '0') > 0) ? (
              Object.entries(summary.category_breakdown)
                .filter(([_, val]) => parseFloat(val || '0') > 0)
                .map(([cat, val]) => {
                  const item = FORM_CATEGORIES.find((c) => c.value === cat);
                  const label = item ? item.label.replace(/^[^\s]+\s/, '') : cat;
                  return (
                    <div key={cat} style={{ display: 'flex', justifyContent: 'space-between', gap: '0.5rem' }}>
                      <span style={{ color: 'var(--text-secondary)' }}>{label}:</span>
                      <strong>{formatCurrency(val)}</strong>
                    </div>
                  );
                })
            ) : (
              <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>No expenses recorded this month</span>
            )}
          </div>
        </div>
      </div>

      {/* Filter Bar */}
      <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
        <select
          className="form-select"
          style={{ minWidth: '220px' }}
          value={selectedDriver}
          onChange={(e) => setSelectedDriver(e.target.value)}
        >
          <option value="">All Sources (Shop & Drivers)</option>
          <option value="SHOP_ONLY">🏢 Shop / General Only (No Driver)</option>
          <optgroup label="Filter by Driver:">
            {drivers.map((d) => (
              <option key={d.id} value={d.id}>
                🚗 {d.driver_name} ({d.assigned_route_details?.name || 'No Route'})
              </option>
            ))}
          </optgroup>
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
          style={{ minWidth: '220px' }}
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
                <th>Expense Source</th>
                <th>Route / Location</th>
                <th>Category</th>
                <th>Logged By</th>
                <th>Amount (₹)</th>
                <th>Date</th>
                <th>Notes / Bill Ref</th>
                <th style={{ textAlign: 'center' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {expenses.length > 0 ? (
                expenses.map((exp) => (
                  <tr key={exp.id}>
                    <td>
                      {exp.driver ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontWeight: 700 }}>
                          <span>🚗</span>
                          <span>{exp.driver_name}</span>
                        </div>
                      ) : (
                        <span className="badge badge-primary" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}>
                          <Building size={13} />
                          Shop / Store Expense
                        </span>
                      )}
                    </td>
                    <td>
                      <span className="badge badge-neutral">
                        {exp.route_name || 'Shop / Direct'}
                      </span>
                    </td>
                    <td>
                      <span className={`badge ${getCategoryBadgeClass(exp.category)}`}>
                        {exp.custom_category || exp.category_display || exp.category}
                      </span>
                    </td>
                    <td style={{ fontSize: '0.84rem', color: 'var(--text-secondary)' }}>
                      {exp.created_by_name ? (
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}>
                          <UserCheck size={14} style={{ color: 'var(--primary)' }} />
                          {exp.created_by_name}
                        </span>
                      ) : (
                        '—'
                      )}
                    </td>
                    <td style={{ fontWeight: 800, color: '#dc2626', fontSize: '1rem', whiteSpace: 'nowrap' }}>
                      {formatCurrency(exp.amount)}
                    </td>
                    <td style={{ whiteSpace: 'nowrap' }}>{formatDate(exp.date)}</td>
                    <td style={{ maxWidth: '240px', color: 'var(--text-secondary)' }}>
                      <div>{exp.notes || '—'}</div>
                      {exp.receipt_reference && (
                        <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                          Ref: {exp.receipt_reference}
                        </div>
                      )}
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <button
                        onClick={() => handleDelete(exp.id, `${formatCurrency(exp.amount)} (${exp.category_display || exp.category})`)}
                        className="btn btn-secondary btn-sm"
                        style={{
                          padding: '4px 8px',
                          color: '#dc2626',
                          borderColor: '#fca5a5',
                          background: '#fff',
                        }}
                        title="Delete expense"
                      >
                        <Trash2 size={14} />
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={8} style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
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
              maxWidth: '540px',
              padding: '1.75rem',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.2), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
              borderRadius: '12px',
              backgroundColor: 'var(--card-bg, #ffffff)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                <Receipt size={22} style={{ color: 'var(--primary, #dc2626)' }} />
                <div>
                  <h3 style={{ fontSize: '1.2rem', fontWeight: 800, margin: 0 }}>
                    Record Business / Shop Expense
                  </h3>
                  <p style={{ margin: 0, fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                    Added by Owner or Manager with full audit logging
                  </p>
                </div>
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
                    Expense Source / Driver
                  </label>
                  <select
                    className="form-select"
                    style={{ width: '100%' }}
                    value={formData.driver}
                    onChange={(e) => setFormData({ ...formData, driver: e.target.value })}
                  >
                    <option value="">🏢 Shop / General Expense</option>
                    <optgroup label="Or assign to a Driver:">
                      {drivers.map((d) => (
                        <option key={d.id} value={d.id}>
                          🚗 {d.driver_name} ({d.assigned_route_details?.name || 'No Route'})
                        </option>
                      ))}
                    </optgroup>
                  </select>
                </div>
              </div>

              {formData.category === 'OTHER' && (
                <div style={{ marginBottom: '1rem' }}>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, marginBottom: '0.35rem' }}>
                    Custom Category Name *
                  </label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="e.g. Packing materials, Ice blocks, Bakery maintenance..."
                    style={{ width: '100%' }}
                    value={formData.custom_category}
                    onChange={(e) => setFormData({ ...formData, custom_category: e.target.value })}
                    required
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
                  placeholder="e.g. Shop Bill #104, Petrol receipt, Electric bill #..."
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
                  placeholder="e.g. Shop maintenance repairs, packaging covers, tea refreshments..."
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
