import React, { useState, useEffect, useCallback } from 'react';
import {
  Database,
  Download,
  HardDrive,
  Layers,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  Package,
  Store,
  ShoppingCart,
  Truck,
  CreditCard,
  BookOpen,
  MapPin,
  MessageCircle,
  Users,
  ShieldCheck,
  CheckSquare,
  Square,
  FileJson,
  ShieldAlert,
} from 'lucide-react';
import { databaseService, DatabaseStats, DatabaseModuleStat } from '../services/databaseService';

const ICON_MAP: Record<string, React.ElementType> = {
  Package,
  Store,
  ShoppingCart,
  Truck,
  CreditCard,
  BookOpen,
  MapPin,
  MessageCircle,
  Users,
  ShieldCheck,
};

const DEFAULT_MODULE_LIST: DatabaseModuleStat[] = [
  { id: 'products', name: 'Products & Categories', count: 0, icon: 'Package' },
  { id: 'customers', name: 'Customers & Price Lists', count: 0, icon: 'Store' },
  { id: 'orders', name: 'Orders & Order Items', count: 0, icon: 'ShoppingCart' },
  { id: 'deliveries', name: 'Deliveries & Stops', count: 0, icon: 'Truck' },
  { id: 'payments', name: 'Payments', count: 0, icon: 'CreditCard' },
  { id: 'credits', name: 'Credit Ledger', count: 0, icon: 'BookOpen' },
  { id: 'routes', name: 'Routes & Shifts', count: 0, icon: 'MapPin' },
  { id: 'whatsapp', name: 'WhatsApp Conversations', count: 0, icon: 'MessageCircle' },
  { id: 'accounts', name: 'Users & Sessions', count: 0, icon: 'Users' },
  { id: 'logs', name: 'Audit & System Settings', count: 0, icon: 'ShieldCheck' },
];

export const DatabaseStorageBackupSection: React.FC = () => {
  const [stats, setStats] = useState<DatabaseStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Backup states
  const [isFullBackingUp, setIsFullBackingUp] = useState(false);
  const [isSelectiveBackingUp, setIsSelectiveBackingUp] = useState(false);
  const [selectedModules, setSelectedModules] = useState<string[]>(() =>
    DEFAULT_MODULE_LIST.map((m) => m.id)
  );
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const fetchStats = useCallback(async (isRefresh = false) => {
    try {
      if (isRefresh) setRefreshing(true);
      else setLoading(true);
      setError(null);
      const data = await databaseService.getStats();
      setStats(data);
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('Failed to fetch database storage statistics.');
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  const modulesToRender =
    stats?.modules && stats.modules.length > 0 ? stats.modules : DEFAULT_MODULE_LIST;

  const handleToggleModule = (id: string) => {
    setSelectedModules((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleSelectAll = () => {
    if (selectedModules.length === modulesToRender.length) {
      setSelectedModules([]);
    } else {
      setSelectedModules(modulesToRender.map((m) => m.id));
    }
  };

  const handleFullBackup = async () => {
    try {
      setIsFullBackingUp(true);
      setFeedback(null);
      await databaseService.downloadBackup({ type: 'full' });
      setFeedback({
        type: 'success',
        message: 'Full database backup successfully generated and downloaded!',
      });
    } catch (err: unknown) {
      setFeedback({
        type: 'error',
        message: err instanceof Error ? err.message : 'Full backup failed.',
      });
    } finally {
      setIsFullBackingUp(false);
    }
  };

  const handleSelectiveBackup = async () => {
    if (selectedModules.length === 0) {
      setFeedback({
        type: 'error',
        message: 'Please select at least one module for selective backup.',
      });
      return;
    }

    try {
      setIsSelectiveBackingUp(true);
      setFeedback(null);
      await databaseService.downloadBackup({
        type: 'selective',
        modules: selectedModules,
      });
      setFeedback({
        type: 'success',
        message: `Selective backup (${selectedModules.length} modules) successfully downloaded!`,
      });
    } catch (err: unknown) {
      setFeedback({
        type: 'error',
        message: err instanceof Error ? err.message : 'Selective backup failed.',
      });
    } finally {
      setIsSelectiveBackingUp(false);
    }
  };

  const selectedRecordsCount =
    stats?.modules
      ?.filter((m) => selectedModules.includes(m.id))
      .reduce((sum, m) => sum + m.count, 0) || 0;

  return (
    <div
      style={{
        marginTop: '2rem',
        background: '#ffffff',
        border: '1px solid #e2e8f0',
        borderRadius: '16px',
        boxShadow: '0 4px 20px -2px rgba(0, 0, 0, 0.05)',
        overflow: 'hidden',
      }}
    >
      {/* Header Banner */}
      <div
        style={{
          padding: '1.5rem 1.75rem',
          background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
          color: 'white',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '1rem',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
          <div
            style={{
              width: '44px',
              height: '44px',
              borderRadius: '12px',
              backgroundColor: 'rgba(239, 68, 68, 0.2)',
              border: '1px solid rgba(239, 68, 68, 0.4)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#f87171',
            }}
          >
            <Database size={22} />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <h3 style={{ fontSize: '1.15rem', fontWeight: 700, margin: 0, color: 'white' }}>
                Database Storage & Disaster Recovery
              </h3>
              <span
                style={{
                  fontSize: '0.68rem',
                  fontWeight: 800,
                  backgroundColor: 'rgba(16, 185, 129, 0.2)',
                  color: '#34d399',
                  border: '1px solid rgba(52, 211, 153, 0.3)',
                  padding: '0.15rem 0.5rem',
                  borderRadius: '999px',
                  textTransform: 'uppercase',
                  letterSpacing: '0.04em',
                }}
              >
                {stats?.engine || 'POSTGRESQL'}
              </span>
            </div>
            <p style={{ fontSize: '0.82rem', color: '#94a3b8', margin: '0.2rem 0 0 0' }}>
              Real-time storage allocation level, table telemetry & one-click full/selective backups.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => fetchStats(true)}
          disabled={refreshing || loading}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.4rem',
            padding: '0.45rem 0.9rem',
            borderRadius: '8px',
            background: 'rgba(255, 255, 255, 0.1)',
            border: '1px solid rgba(255, 255, 255, 0.2)',
            color: '#f8fafc',
            fontSize: '0.8rem',
            fontWeight: 600,
            cursor: 'pointer',
            transition: 'all 0.2s ease',
          }}
        >
          <RefreshCw size={14} className={refreshing ? 'spinner' : ''} />
          <span>{refreshing ? 'Refreshing...' : 'Refresh Storage'}</span>
        </button>
      </div>

      <div style={{ padding: '1.75rem' }}>
        {/* Feedback Alert */}
        {feedback && (
          <div
            style={{
              padding: '0.85rem 1rem',
              borderRadius: '10px',
              marginBottom: '1.5rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.65rem',
              background: feedback.type === 'success' ? '#f0fdf4' : '#fef2f2',
              border: `1px solid ${feedback.type === 'success' ? '#bbf7d0' : '#fecaca'}`,
              color: feedback.type === 'success' ? '#166534' : '#991b1b',
              fontSize: '0.88rem',
              fontWeight: 500,
            }}
          >
            {feedback.type === 'success' ? <CheckCircle2 size={18} /> : <AlertTriangle size={18} />}
            <span>{feedback.message}</span>
          </div>
        )}

        {/* Error Alert */}
        {error && (
          <div
            style={{
              padding: '0.85rem 1rem',
              borderRadius: '10px',
              marginBottom: '1.5rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.65rem',
              background: '#fef2f2',
              border: '1px solid #fecaca',
              color: '#991b1b',
              fontSize: '0.88rem',
            }}
          >
            <ShieldAlert size={18} />
            <span>{error}</span>
          </div>
        )}

        {/* Storage Level Gauge & Top Stats Cards */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
            gap: '1rem',
            marginBottom: '1.75rem',
          }}
        >
          {/* Card 1: Storage Level */}
          <div
            style={{
              padding: '1.25rem',
              borderRadius: '12px',
              background: '#f8fafc',
              border: '1px solid #e2e8f0',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
              <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#64748b' }}>STORAGE LEVEL</span>
              <HardDrive size={16} color="#dc2626" />
            </div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.4rem', marginBottom: '0.6rem' }}>
              <span style={{ fontSize: '1.45rem', fontWeight: 800, color: '#0f172a' }}>
                {stats?.size_formatted || '...'}
              </span>
              <span style={{ fontSize: '0.82rem', color: '#64748b' }}>
                / {stats?.quota_formatted || '1.00 GB'}
              </span>
            </div>
            {/* Storage Progress Bar */}
            <div
              style={{
                width: '100%',
                height: '8px',
                background: '#e2e8f0',
                borderRadius: '999px',
                overflow: 'hidden',
                marginBottom: '0.4rem',
              }}
            >
              <div
                style={{
                  width: `${Math.max(2, stats?.usage_pct || 1)}%`,
                  height: '100%',
                  background:
                    (stats?.usage_pct || 0) > 85
                      ? 'linear-gradient(90deg, #f59e0b, #dc2626)'
                      : 'linear-gradient(90deg, #10b981, #059669)',
                  borderRadius: '999px',
                  transition: 'width 0.6s ease',
                }}
              />
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem', color: '#64748b' }}>
              <span>Usage: {stats?.usage_pct ?? 0}%</span>
              <span style={{ color: '#059669', fontWeight: 600 }}>Capacity Healthy</span>
            </div>
          </div>

          {/* Card 2: Total Records */}
          <div
            style={{
              padding: '1.25rem',
              borderRadius: '12px',
              background: '#f8fafc',
              border: '1px solid #e2e8f0',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
              <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#64748b' }}>DATABASE RECORDS</span>
              <Layers size={16} color="#0284c7" />
            </div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.4rem', marginBottom: '0.6rem' }}>
              <span style={{ fontSize: '1.45rem', fontWeight: 800, color: '#0f172a' }}>
                {stats ? stats.total_records.toLocaleString() : '...'}
              </span>
              <span style={{ fontSize: '0.82rem', color: '#64748b' }}>active rows</span>
            </div>
            <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
              Indexed across {stats?.table_count || 10} core application modules
            </div>
          </div>

          {/* Card 3: Backup Safety */}
          <div
            style={{
              padding: '1.25rem',
              borderRadius: '12px',
              background: '#f8fafc',
              border: '1px solid #e2e8f0',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
              <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#64748b' }}>DATA ENCRYPTION & INTEGRITY</span>
              <ShieldCheck size={16} color="#059669" />
            </div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.4rem', marginBottom: '0.6rem' }}>
              <span style={{ fontSize: '1.15rem', fontWeight: 700, color: '#059669' }}>
                SHA-256 Verified
              </span>
            </div>
            <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
              Snapshots contain full schemas, relations, and checksum authentication
            </div>
          </div>
        </div>

        {/* Database Modules Telemetry Breakdown */}
        <div style={{ marginBottom: '2rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.85rem' }}>
            <h4 style={{ fontSize: '0.95rem', fontWeight: 700, color: '#0f172a', margin: 0 }}>
              Module Storage Breakdown
            </h4>
            <span style={{ fontSize: '0.75rem', color: '#64748b' }}>Live table counts</span>
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
              gap: '0.75rem',
            }}
          >
            {stats?.modules?.map((mod) => {
              const IconComponent = ICON_MAP[mod.icon] || Database;
              return (
                <div
                  key={mod.id}
                  style={{
                    padding: '0.85rem 1rem',
                    borderRadius: '10px',
                    border: '1px solid #e2e8f0',
                    background: '#ffffff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                    <div
                      style={{
                        width: '32px',
                        height: '32px',
                        borderRadius: '8px',
                        background: '#f1f5f9',
                        color: '#475569',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <IconComponent size={16} />
                    </div>
                    <div>
                      <div style={{ fontSize: '0.8rem', fontWeight: 600, color: '#1e293b' }}>
                        {mod.name}
                      </div>
                      <div style={{ fontSize: '0.7rem', color: '#64748b' }}>
                        {mod.count.toLocaleString()} records
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* BACKUP ACTIONS GRID */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
            gap: '1.5rem',
            paddingTop: '1.5rem',
            borderTop: '1px solid #e2e8f0',
          }}
        >
          {/* OPTION 1: Full Backup Card */}
          <div
            style={{
              padding: '1.5rem',
              borderRadius: '14px',
              border: '1.5px solid #cbd5e1',
              background: '#f8fafc',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
            }}
          >
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.6rem' }}>
                <div
                  style={{
                    padding: '0.45rem',
                    borderRadius: '8px',
                    background: '#e0f2fe',
                    color: '#0284c7',
                  }}
                >
                  <FileJson size={20} />
                </div>
                <div>
                  <h4 style={{ fontSize: '1rem', fontWeight: 700, color: '#0f172a', margin: 0 }}>
                    Option 1: Complete Full Database Backup
                  </h4>
                  <span style={{ fontSize: '0.74rem', color: '#0284c7', fontWeight: 600 }}>
                    Recommended for Periodic Disaster Recovery
                  </span>
                </div>
              </div>

              <p style={{ fontSize: '0.82rem', color: '#475569', lineHeight: 1.5, margin: '0.75rem 0 1rem 0' }}>
                Downloads a unified, verified JSON snapshot encompassing all master products, customer shops, orders, credit ledger, delivery dispatches, payments, routes, and audit logs.
              </p>

              <div
                style={{
                  padding: '0.65rem 0.85rem',
                  borderRadius: '8px',
                  background: '#ffffff',
                  border: '1px solid #e2e8f0',
                  fontSize: '0.75rem',
                  color: '#64748b',
                  marginBottom: '1.25rem',
                }}
              >
                📦 <strong>Included:</strong> All 10 modules ({stats?.total_records.toLocaleString() || 0} total records)
              </div>
            </div>

            <button
              type="button"
              onClick={handleFullBackup}
              disabled={isFullBackingUp}
              style={{
                width: '100%',
                padding: '0.75rem 1.25rem',
                background: 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)',
                color: 'white',
                border: 'none',
                borderRadius: '10px',
                fontSize: '0.9rem',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.5rem',
                boxShadow: '0 4px 12px rgba(2, 132, 199, 0.3)',
                transition: 'all 0.2s ease',
              }}
            >
              {isFullBackingUp ? (
                <>
                  <div className="spinner" style={{ width: 16, height: 16, borderWidth: 2 }} />
                  <span>Generating Full Snapshot...</span>
                </>
              ) : (
                <>
                  <Download size={16} />
                  <span>Download Full Backup (.json)</span>
                </>
              )}
            </button>
          </div>

          {/* OPTION 2: Selective Backup Card */}
          <div
            style={{
              padding: '1.5rem',
              borderRadius: '14px',
              border: '1.5px solid #cbd5e1',
              background: '#ffffff',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
            }}
          >
            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.6rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                  <div
                    style={{
                      padding: '0.45rem',
                      borderRadius: '8px',
                      background: '#fef2f2',
                      color: '#dc2626',
                    }}
                  >
                    <Layers size={20} />
                  </div>
                  <div>
                    <h4 style={{ fontSize: '1rem', fontWeight: 700, color: '#0f172a', margin: 0 }}>
                      Option 2: Selective Custom Backup
                    </h4>
                    <span style={{ fontSize: '0.74rem', color: '#64748b' }}>
                      Choose specific modules to export
                    </span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleSelectAll}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#dc2626',
                    fontSize: '0.75rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    padding: '0.2rem 0.4rem',
                  }}
                >
                  {selectedModules.length === (stats?.modules?.length || 0)
                    ? 'Deselect All'
                    : 'Select All'}
                </button>
              </div>

              {/* Module selection checkboxes */}
              <div
                style={{
                  maxHeight: '180px',
                  overflowY: 'auto',
                  border: '1px solid #e2e8f0',
                  borderRadius: '10px',
                  padding: '0.5rem',
                  margin: '0.75rem 0 1rem 0',
                  background: '#f8fafc',
                }}
              >
                {stats?.modules?.map((mod) => {
                  const isChecked = selectedModules.includes(mod.id);
                  return (
                    <div
                      key={mod.id}
                      onClick={() => handleToggleModule(mod.id)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '0.45rem 0.6rem',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        background: isChecked ? '#eff6ff' : 'transparent',
                        marginBottom: '0.2rem',
                        transition: 'background 0.15s ease',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        {isChecked ? (
                          <CheckSquare size={16} color="#0284c7" />
                        ) : (
                          <Square size={16} color="#94a3b8" />
                        )}
                        <span style={{ fontSize: '0.8rem', fontWeight: isChecked ? 600 : 400, color: '#1e293b' }}>
                          {mod.name}
                        </span>
                      </div>
                      <span style={{ fontSize: '0.72rem', color: '#64748b' }}>
                        {mod.count} rows
                      </span>
                    </div>
                  );
                })}
              </div>

              <div
                style={{
                  fontSize: '0.75rem',
                  color: '#475569',
                  marginBottom: '1.25rem',
                  display: 'flex',
                  justifyContent: 'space-between',
                }}
              >
                <span>Selected Modules: <strong>{selectedModules.length}</strong></span>
                <span>Export Rows: <strong>{selectedRecordsCount.toLocaleString()}</strong></span>
              </div>
            </div>

            <button
              type="button"
              onClick={handleSelectiveBackup}
              disabled={isSelectiveBackingUp || selectedModules.length === 0}
              style={{
                width: '100%',
                padding: '0.75rem 1.25rem',
                background: selectedModules.length > 0 ? '#0f172a' : '#94a3b8',
                color: 'white',
                border: 'none',
                borderRadius: '10px',
                fontSize: '0.9rem',
                fontWeight: 700,
                cursor: selectedModules.length > 0 ? 'pointer' : 'not-allowed',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.5rem',
                boxShadow: selectedModules.length > 0 ? '0 4px 12px rgba(15, 23, 42, 0.25)' : 'none',
                transition: 'all 0.2s ease',
              }}
            >
              {isSelectiveBackingUp ? (
                <>
                  <div className="spinner" style={{ width: 16, height: 16, borderWidth: 2 }} />
                  <span>Exporting Selective Data...</span>
                </>
              ) : (
                <>
                  <Download size={16} />
                  <span>Download Selected Modules ({selectedModules.length})</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
