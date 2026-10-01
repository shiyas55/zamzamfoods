import React, { useState, useEffect } from 'react';
import { useSettings } from '../../context/SettingsContext';
import { useAuth } from '../../context/AuthContext';
import {
  Settings as SettingsIcon,
  ShieldCheck,
  MessageCircle,
  ShoppingCart,
  FileText,
  Phone,
  Building,
  Mail,
  MapPin,
  CreditCard,
  Save,
  RotateCcw,
  CheckCircle2,
  AlertCircle,
  Hash,
  Wrench,
  AlertTriangle,
  Info,
  Check,
  Lock,
  Key,
  Clock,
  Sparkles,
  X,
  ShieldAlert,
  Calendar,
  Headphones,
} from 'lucide-react';
import { ZentrixSettingsSection, ZENTRIX_SUPPORT_CONFIG } from '../../components/ZentrixHelpDesk';
import { DatabaseStorageBackupSection } from '../../components/DatabaseStorageBackupSection';
import { WebsiteCacheVersionSection } from '../../components/WebsiteCacheVersionSection';

export const SettingsPage: React.FC = () => {
  const { settings, loading, updateSettings, refreshSettings } = useSettings();
  const { user } = useAuth();

  const isOwner = user?.role === 'OWNER';

  // Form state
  const [isWhatsappEnabled, setIsWhatsappEnabled] = useState(true);
  const [isSelfOrderEnabled, setIsSelfOrderEnabled] = useState(true);
  const [isMaintenanceMode, setIsMaintenanceMode] = useState(false);
  const [maintenanceMessage, setMaintenanceMessage] = useState('System is currently undergoing scheduled maintenance. Please check back shortly.');
  const [businessName, setBusinessName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [gstNumber, setGstNumber] = useState('');
  const [email, setEmail] = useState('');
  const [address, setAddress] = useState('');
  const [upiId, setUpiId] = useState('');
  const [invoiceNotes, setInvoiceNotes] = useState('');

  // WhatsApp Upgrade Plan & License Key state
  const [whatsappIsLocked, setWhatsappIsLocked] = useState(false);
  const [whatsappPlanName, setWhatsappPlanName] = useState('WhatsApp Enterprise Pro');
  const [whatsappPlanExpiresAt, setWhatsappPlanExpiresAt] = useState<string | null>(null);
  const [whatsappLicenseKey, setWhatsappLicenseKey] = useState('');

  // Upgrade Plan Modal state
  const [isUpgradeModalOpen, setIsUpgradeModalOpen] = useState(false);
  const [licenseKeyInput, setLicenseKeyInput] = useState('');
  const [keyError, setKeyError] = useState<string | null>(null);
  const [keySuccess, setKeySuccess] = useState<string | null>(null);
  const [activatingKey, setActivatingKey] = useState(false);

  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Sync settings when loaded
  useEffect(() => {
    if (settings) {
      setIsWhatsappEnabled(Boolean(settings.is_whatsapp_enabled));
      setIsSelfOrderEnabled(Boolean(settings.is_self_order_enabled));
      setIsMaintenanceMode(Boolean(settings.is_maintenance_mode));
      setMaintenanceMessage(settings.maintenance_message || 'System is currently undergoing scheduled maintenance. Please check back shortly.');
      setBusinessName(settings.business_name || '');
      setPhoneNumber(settings.phone_number || '');
      setGstNumber(settings.gst_number || '');
      setEmail(settings.email || '');
      setAddress(settings.address || '');
      setUpiId(settings.upi_id || '');
      setInvoiceNotes(settings.invoice_footer_notes || '');
      setWhatsappIsLocked(Boolean(settings.whatsapp_is_locked));
      setWhatsappPlanName(settings.whatsapp_plan_name || 'WhatsApp Enterprise Pro');
      setWhatsappPlanExpiresAt(settings.whatsapp_plan_expires_at || null);
      setWhatsappLicenseKey(settings.whatsapp_license_key || '');
    }
  }, [settings]);

  const handleReset = () => {
    if (settings) {
      setIsWhatsappEnabled(Boolean(settings.is_whatsapp_enabled));
      setIsSelfOrderEnabled(Boolean(settings.is_self_order_enabled));
      setIsMaintenanceMode(Boolean(settings.is_maintenance_mode));
      setMaintenanceMessage(settings.maintenance_message || 'System is currently undergoing scheduled maintenance. Please check back shortly.');
      setBusinessName(settings.business_name || '');
      setPhoneNumber(settings.phone_number || '');
      setGstNumber(settings.gst_number || '');
      setEmail(settings.email || '');
      setAddress(settings.address || '');
      setUpiId(settings.upi_id || '');
      setInvoiceNotes(settings.invoice_footer_notes || '');
      setWhatsappIsLocked(Boolean(settings.whatsapp_is_locked));
      setWhatsappPlanName(settings.whatsapp_plan_name || 'WhatsApp Enterprise Pro');
      setWhatsappPlanExpiresAt(settings.whatsapp_plan_expires_at || null);
      setWhatsappLicenseKey(settings.whatsapp_license_key || '');
      setFeedback(null);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isOwner) {
      setFeedback({
        type: 'error',
        message: 'Permission denied: Only Admin / Owner can modify business settings.',
      });
      return;
    }

    try {
      setSaving(true);
      setFeedback(null);
      await updateSettings({
        is_whatsapp_enabled: isWhatsappEnabled,
        is_self_order_enabled: isSelfOrderEnabled,
        is_maintenance_mode: isMaintenanceMode,
        maintenance_message: maintenanceMessage.trim(),
        whatsapp_is_locked: whatsappIsLocked,
        whatsapp_plan_name: whatsappPlanName,
        whatsapp_plan_expires_at: whatsappPlanExpiresAt,
        whatsapp_license_key: whatsappLicenseKey,
        business_name: businessName.trim(),
        phone_number: phoneNumber.trim(),
        gst_number: gstNumber.trim().toUpperCase(),
        email: email.trim(),
        address: address.trim(),
        upi_id: upiId.trim(),
        invoice_footer_notes: invoiceNotes.trim(),
      });
      setFeedback({
        type: 'success',
        message: 'System settings saved successfully! All updates are active across the platform.',
      });
      await refreshSettings();
    } catch (err: unknown) {
      console.error('Failed to update settings:', err);
      const errMsg =
        err instanceof Error ? err.message : 'Failed to save settings. Please ensure you are logged in as Owner/Admin.';
      setFeedback({ type: 'error', message: errMsg });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{ maxWidth: 1040, margin: '0 auto', padding: '0 0.5rem 4rem 0.5rem' }}>
      {/* Header Banner */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: '2rem',
        flexWrap: 'wrap',
        gap: '1rem',
        paddingBottom: '1.25rem',
        borderBottom: '1px solid var(--border)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
          <div style={{
            width: 46,
            height: 46,
            borderRadius: '12px',
            background: 'linear-gradient(135deg, #dc2626 0%, #991b1b 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#fef08a',
            boxShadow: '0 4px 12px rgba(220, 38, 38, 0.25)',
            flexShrink: 0,
          }}>
            <SettingsIcon size={26} />
          </div>
          <div>
            <h1 style={{ margin: 0, fontSize: '1.6rem', fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>
              Business Settings & System Controls
            </h1>
            <p style={{ margin: '0.2rem 0 0 0', fontSize: '0.88rem', color: 'var(--text-secondary)' }}>
              Configure company profile, GSTIN, WhatsApp integration, and maintenance mode controls
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span style={{
            background: isOwner ? 'rgba(16, 185, 129, 0.12)' : 'rgba(239, 68, 68, 0.12)',
            color: isOwner ? '#059669' : '#dc2626',
            border: `1.5px solid ${isOwner ? '#10b981' : '#ef4444'}`,
            padding: '0.4rem 0.9rem',
            fontSize: '0.8rem',
            fontWeight: 700,
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.45rem',
            borderRadius: '999px',
          }}>
            <ShieldCheck size={16} />
            {isOwner ? 'Admin Protected' : 'View Only (Admin Required)'}
          </span>
        </div>
      </div>

      {/* Floating Feedback Alert */}
      {feedback && (
        <div style={{
          marginBottom: '1.75rem',
          padding: '1rem 1.25rem',
          borderRadius: '12px',
          display: 'flex',
          alignItems: 'center',
          gap: '0.85rem',
          backgroundColor: feedback.type === 'success' ? '#f0fdf4' : '#fef2f2',
          border: `1.5px solid ${feedback.type === 'success' ? '#22c55e' : '#ef4444'}`,
          color: feedback.type === 'success' ? '#15803d' : '#b91c1c',
          boxShadow: '0 4px 12px rgba(0,0,0,0.05)',
        }}>
          {feedback.type === 'success' ? <CheckCircle2 size={22} color="#16a34a" /> : <AlertCircle size={22} color="#dc2626" />}
          <span style={{ fontSize: '0.94rem', fontWeight: 700 }}>{feedback.message}</span>
        </div>
      )}

      {loading && !settings ? (
        <div style={{ padding: '4rem 1rem', textAlign: 'center' }}>
          <div className="spinner" style={{ margin: '0 auto 1.25rem' }} />
          <p style={{ color: 'var(--text-secondary)', fontWeight: 600 }}>Loading system settings...</p>
        </div>
      ) : (
        <form onSubmit={handleSave}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>

            {/* SECTION 1: MASTER CONTROLS & TOGGLES */}
            <div style={{
              backgroundColor: 'var(--bg-card)',
              border: '1px solid var(--border)',
              borderRadius: '16px',
              padding: '1.75rem',
              boxShadow: 'var(--shadow-sm)',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', marginBottom: '0.35rem' }}>
                <div style={{
                  width: 32,
                  height: 32,
                  borderRadius: '8px',
                  backgroundColor: 'rgba(220, 38, 38, 0.1)',
                  color: '#dc2626',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}>
                  <ShieldCheck size={18} />
                </div>
                <h2 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                  Feature Controls & System Automation
                </h2>
              </div>
              <p style={{ margin: '0 0 1.5rem 0', fontSize: '0.86rem', color: 'var(--text-secondary)' }}>
                Master switches to govern system accessibility and messaging across apps. Changes take effect immediately.
              </p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>

                {/* 1. Maintenance Mode Toggle */}
                <div style={{
                  padding: '1.35rem',
                  borderRadius: '14px',
                  backgroundColor: isMaintenanceMode ? 'rgba(239, 68, 68, 0.06)' : 'var(--bg-main)',
                  border: `1.5px solid ${isMaintenanceMode ? '#ef4444' : 'var(--border)'}`,
                  transition: 'all 0.2s ease',
                }}>
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    flexWrap: 'wrap',
                    gap: '1rem',
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', maxWidth: '78%' }}>
                      <div style={{
                        width: 46,
                        height: 46,
                        borderRadius: '12px',
                        backgroundColor: isMaintenanceMode ? 'rgba(239, 68, 68, 0.18)' : 'rgba(148, 163, 184, 0.15)',
                        color: isMaintenanceMode ? '#dc2626' : '#64748b',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                      }}>
                        <Wrench size={24} />
                      </div>
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap' }}>
                          <span style={{ fontWeight: 800, fontSize: '1.02rem', color: isMaintenanceMode ? '#dc2626' : 'var(--text-primary)' }}>
                            System Under Maintenance Mode
                          </span>
                          <span style={{
                            fontSize: '0.72rem',
                            fontWeight: 800,
                            padding: '0.2rem 0.6rem',
                            borderRadius: '999px',
                            backgroundColor: isMaintenanceMode ? '#ef4444' : '#10b981',
                            color: '#ffffff',
                            letterSpacing: '0.04em',
                          }}>
                            {isMaintenanceMode ? 'MAINTENANCE ACTIVE' : 'LIVE / OPERATIONAL'}
                          </span>
                        </div>
                        <p style={{ margin: '0.3rem 0 0 0', fontSize: '0.84rem', color: 'var(--text-secondary)', lineHeight: 1.45 }}>
                          When enabled, all Manager, Driver, and Customer Self-Ordering apps are paused with a maintenance screen. Only Owner/Admin accounts have access.
                        </p>
                      </div>
                    </div>

                    <button
                      type="button"
                      disabled={!isOwner}
                      onClick={() => setIsMaintenanceMode(!isMaintenanceMode)}
                      aria-label="Toggle Maintenance Mode"
                      style={{
                        width: 58,
                        height: 32,
                        borderRadius: 16,
                        backgroundColor: isMaintenanceMode ? '#ef4444' : '#cbd5e1',
                        border: 'none',
                        cursor: isOwner ? 'pointer' : 'not-allowed',
                        position: 'relative',
                        transition: 'background-color 0.2s ease',
                        flexShrink: 0,
                        outline: 'none',
                      }}
                    >
                      <div style={{
                        width: 26,
                        height: 26,
                        borderRadius: '50%',
                        backgroundColor: '#ffffff',
                        position: 'absolute',
                        top: 3,
                        left: isMaintenanceMode ? 29 : 3,
                        transition: 'left 0.2s ease',
                        boxShadow: '0 2px 5px rgba(0,0,0,0.25)',
                      }} />
                    </button>
                  </div>

                  {/* Maintenance Notice Message Textarea */}
                  {isMaintenanceMode && (
                    <div style={{
                      marginTop: '1.25rem',
                      paddingTop: '1.1rem',
                      borderTop: '1px solid rgba(239, 68, 68, 0.25)',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '0.5rem',
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#b91c1c', fontSize: '0.86rem', fontWeight: 800 }}>
                        <AlertTriangle size={16} />
                        <span>Staff & Customer Maintenance Notice</span>
                      </div>
                      <textarea
                        disabled={!isOwner}
                        className="form-textarea"
                        rows={2}
                        value={maintenanceMessage}
                        onChange={(e) => setMaintenanceMessage(e.target.value)}
                        placeholder="e.g. System is currently undergoing scheduled maintenance. Please check back shortly."
                        style={{
                          width: '100%',
                          fontSize: '0.88rem',
                          borderColor: '#fca5a5',
                          backgroundColor: '#ffffff',
                          color: '#0f172a',
                          padding: '0.75rem',
                          borderRadius: '8px',
                        }}
                      />
                      <small style={{ color: '#b91c1c', fontSize: '0.76rem' }}>
                        This custom message is displayed on all customer links and staff dashboards during maintenance.
                      </small>
                    </div>
                  )}
                </div>

                {/* 2. WhatsApp Integration Toggle & Upgrade Plan Lock */}
                {(() => {
                  const isPlanExpired = whatsappPlanExpiresAt
                    ? new Date(whatsappPlanExpiresAt).getTime() < Date.now()
                    : false;
                  const isFeatureLocked = whatsappIsLocked || isPlanExpired;

                  const getTimeRemainingText = () => {
                    if (!whatsappPlanExpiresAt) {
                      return 'Lifetime License (Permanent Access)';
                    }
                    const ms = new Date(whatsappPlanExpiresAt).getTime() - Date.now();
                    if (ms <= 0) {
                      return `Expired on ${new Date(whatsappPlanExpiresAt).toLocaleDateString()}`;
                    }
                    const days = Math.floor(ms / (1000 * 60 * 60 * 24));
                    const hours = Math.floor((ms % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
                    if (days > 0) {
                      return `${days} Day${days === 1 ? '' : 's'} Remaining (Valid until ${new Date(whatsappPlanExpiresAt).toLocaleDateString()})`;
                    }
                    return `${hours} Hour${hours === 1 ? '' : 's'} Remaining (Expires Today)`;
                  };

                  const handleLockFeature = async () => {
                    if (!window.confirm('Are you sure you want to lock WhatsApp Quick Sharing & Messaging? WhatsApp features will be disabled until unlocked with an upgrade key.')) {
                      return;
                    }
                    try {
                      setSaving(true);
                      await updateSettings({
                        whatsapp_is_locked: true,
                        is_whatsapp_enabled: false,
                      });
                      setWhatsappIsLocked(true);
                      setIsWhatsappEnabled(false);
                      setFeedback({
                        type: 'success',
                        message: 'WhatsApp Quick Sharing is now locked. An upgrade key is required to re-enable it.',
                      });
                    } catch (err: any) {
                      setFeedback({ type: 'error', message: err.message || 'Failed to lock feature.' });
                    } finally {
                      setSaving(false);
                    }
                  };

                  return (
                    <div style={{
                      padding: '1.35rem',
                      borderRadius: '14px',
                      backgroundColor: 'var(--bg-main)',
                      border: isFeatureLocked ? '1.5px solid #fca5a5' : '1px solid var(--border)',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '1rem',
                      transition: 'all 0.2s ease',
                      boxShadow: isFeatureLocked ? '0 2px 10px rgba(239, 68, 68, 0.08)' : 'none',
                    }}>
                      {/* Top Header Row */}
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        flexWrap: 'wrap',
                        gap: '1rem',
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', maxWidth: '78%' }}>
                          <div style={{
                            width: 48,
                            height: 48,
                            borderRadius: '12px',
                            backgroundColor: isFeatureLocked
                              ? 'rgba(239, 68, 68, 0.12)'
                              : isWhatsappEnabled
                              ? 'rgba(34, 197, 94, 0.15)'
                              : 'rgba(148, 163, 175, 0.15)',
                            color: isFeatureLocked ? '#dc2626' : isWhatsappEnabled ? '#16a34a' : '#64748b',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            flexShrink: 0,
                            position: 'relative',
                          }}>
                            <MessageCircle size={24} />
                            {isFeatureLocked && (
                              <div style={{
                                position: 'absolute',
                                bottom: -3,
                                right: -3,
                                background: '#dc2626',
                                color: '#fff',
                                borderRadius: '50%',
                                width: 18,
                                height: 18,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
                              }}>
                                <Lock size={10} />
                              </div>
                            )}
                          </div>
                          <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap' }}>
                              <span style={{ fontWeight: 800, fontSize: '1.02rem', color: 'var(--text-primary)' }}>
                                WhatsApp Quick Sharing & Messaging
                              </span>

                              {/* Lock / Plan Badge */}
                              {isFeatureLocked ? (
                                <span style={{
                                  fontSize: '0.72rem',
                                  fontWeight: 800,
                                  padding: '0.2rem 0.6rem',
                                  borderRadius: '999px',
                                  backgroundColor: '#fee2e2',
                                  color: '#b91c1c',
                                  border: '1px solid #fca5a5',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '4px',
                                }}>
                                  <Lock size={11} />
                                  {isPlanExpired ? 'PLAN EXPIRED' : 'LOCKED - UPGRADE REQUIRED'}
                                </span>
                              ) : (
                                <span style={{
                                  fontSize: '0.72rem',
                                  fontWeight: 800,
                                  padding: '0.2rem 0.6rem',
                                  borderRadius: '999px',
                                  backgroundColor: '#ecfdf5',
                                  color: '#047857',
                                  border: '1px solid #a7f3d0',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '4px',
                                }}>
                                  <ShieldCheck size={12} />
                                  {whatsappPlanName.toUpperCase()}
                                </span>
                              )}

                              {/* Toggle Status Badge */}
                              <span style={{
                                fontSize: '0.72rem',
                                fontWeight: 800,
                                padding: '0.2rem 0.6rem',
                                borderRadius: '999px',
                                backgroundColor: (!isFeatureLocked && isWhatsappEnabled) ? '#16a34a' : '#94a3b8',
                                color: '#ffffff',
                                letterSpacing: '0.04em',
                              }}>
                                {!isFeatureLocked && isWhatsappEnabled ? 'ENABLED' : 'DISABLED'}
                              </span>
                            </div>
                            <p style={{ margin: '0.3rem 0 0 0', fontSize: '0.84rem', color: 'var(--text-secondary)', lineHeight: 1.45 }}>
                              When enabled, invoices, receipts, and order dispatches can be shared directly via WhatsApp. Requires an active plan key.
                            </p>
                          </div>
                        </div>

                        {/* Toggle Switch */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <button
                            type="button"
                            disabled={!isOwner}
                            onClick={() => {
                              if (isFeatureLocked) {
                                setIsUpgradeModalOpen(true);
                                return;
                              }
                              setIsWhatsappEnabled(!isWhatsappEnabled);
                            }}
                            aria-label="Toggle WhatsApp"
                            style={{
                              width: 58,
                              height: 32,
                              borderRadius: 16,
                              backgroundColor: (!isFeatureLocked && isWhatsappEnabled) ? '#16a34a' : '#cbd5e1',
                              border: 'none',
                              cursor: !isOwner ? 'not-allowed' : 'pointer',
                              position: 'relative',
                              transition: 'background-color 0.2s ease',
                              flexShrink: 0,
                              outline: 'none',
                              opacity: isFeatureLocked ? 0.65 : 1,
                            }}
                            title={isFeatureLocked ? 'Feature is locked. Click to enter upgrade key.' : 'Toggle WhatsApp integration'}
                          >
                            <div style={{
                              width: 26,
                              height: 26,
                              borderRadius: '50%',
                              backgroundColor: '#ffffff',
                              position: 'absolute',
                              top: 3,
                              left: (!isFeatureLocked && isWhatsappEnabled) ? 29 : 3,
                              transition: 'left 0.2s ease',
                              boxShadow: '0 2px 5px rgba(0,0,0,0.25)',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                            }}>
                              {isFeatureLocked && <Lock size={12} color="#dc2626" />}
                            </div>
                          </button>
                        </div>
                      </div>

                      {/* Plan Time & License Key Bar */}
                      <div style={{
                        marginTop: '0.25rem',
                        padding: '0.85rem 1rem',
                        borderRadius: '10px',
                        backgroundColor: isFeatureLocked ? 'rgba(254, 242, 242, 0.7)' : 'rgba(240, 253, 244, 0.7)',
                        border: isFeatureLocked ? '1px solid #fecaca' : '1px solid #bbf7d0',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        flexWrap: 'wrap',
                        gap: '0.75rem',
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem', flexWrap: 'wrap' }}>
                          <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.4rem',
                            fontSize: '0.84rem',
                            fontWeight: 700,
                            color: isFeatureLocked ? '#991b1b' : '#166534',
                          }}>
                            <Clock size={16} />
                            <span>Plan Time: {getTimeRemainingText()}</span>
                          </div>
                          {whatsappLicenseKey && (
                            <div style={{
                              fontSize: '0.75rem',
                              fontFamily: 'monospace',
                              background: 'rgba(0,0,0,0.06)',
                              padding: '0.15rem 0.5rem',
                              borderRadius: '5px',
                              color: 'var(--text-secondary)',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                            }}>
                              <Key size={12} />
                              <span>Key: {whatsappLicenseKey.slice(0, 6)}••••{whatsappLicenseKey.slice(-4)}</span>
                            </div>
                          )}
                        </div>

                        {/* Action Buttons: Upgrade Plan Key & Lock */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <button
                            type="button"
                            onClick={() => {
                              setIsUpgradeModalOpen(true);
                              setKeyError(null);
                            }}
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '0.35rem',
                              padding: '0.35rem 0.85rem',
                              fontSize: '0.8rem',
                              fontWeight: 700,
                              borderRadius: '7px',
                              background: isFeatureLocked ? '#dc2626' : '#059669',
                              color: '#ffffff',
                              border: 'none',
                              cursor: 'pointer',
                              boxShadow: '0 2px 6px rgba(0,0,0,0.15)',
                              transition: 'all 0.15s ease',
                            }}
                          >
                            <Key size={13} />
                            <span>{isFeatureLocked ? 'Upgrade Plan with Key' : 'Extend / Upgrade Plan'}</span>
                          </button>

                          {!isFeatureLocked && (
                            <button
                              type="button"
                              onClick={handleLockFeature}
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '0.35rem',
                                padding: '0.35rem 0.75rem',
                                fontSize: '0.78rem',
                                fontWeight: 600,
                                borderRadius: '7px',
                                background: 'transparent',
                                color: '#64748b',
                                border: '1px solid var(--border)',
                                cursor: 'pointer',
                              }}
                              title="Lock WhatsApp feature pending future upgrade key"
                            >
                              <Lock size={12} />
                              <span>Lock</span>
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })()}

                {/* 3. Customer Self-Ordering Toggle */}
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '1.35rem',
                  borderRadius: '14px',
                  backgroundColor: 'var(--bg-main)',
                  border: '1px solid var(--border)',
                  flexWrap: 'wrap',
                  gap: '1rem',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', maxWidth: '78%' }}>
                    <div style={{
                      width: 46,
                      height: 46,
                      borderRadius: '12px',
                      backgroundColor: isSelfOrderEnabled ? 'rgba(59, 130, 246, 0.15)' : 'rgba(148, 163, 175, 0.15)',
                      color: isSelfOrderEnabled ? '#2563eb' : '#64748b',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                    }}>
                      <ShoppingCart size={24} />
                    </div>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap' }}>
                        <span style={{ fontWeight: 800, fontSize: '1.02rem', color: 'var(--text-primary)' }}>
                          Customer Self-Ordering Portal
                        </span>
                        <span style={{
                          fontSize: '0.72rem',
                          fontWeight: 800,
                          padding: '0.2rem 0.6rem',
                          borderRadius: '999px',
                          backgroundColor: isSelfOrderEnabled ? '#2563eb' : '#94a3b8',
                          color: '#ffffff',
                          letterSpacing: '0.04em',
                        }}>
                          {isSelfOrderEnabled ? 'ORDERING ACTIVE' : 'ORDERING PAUSED'}
                        </span>
                      </div>
                      <p style={{ margin: '0.3rem 0 0 0', fontSize: '0.84rem', color: 'var(--text-secondary)', lineHeight: 1.45 }}>
                        Allows shops to submit orders using their digital catalog link. When turned off, visiting customers see a paused notice with your phone number.
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    disabled={!isOwner}
                    onClick={() => setIsSelfOrderEnabled(!isSelfOrderEnabled)}
                    aria-label="Toggle Self Ordering"
                    style={{
                      width: 58,
                      height: 32,
                      borderRadius: 16,
                      backgroundColor: isSelfOrderEnabled ? '#2563eb' : '#cbd5e1',
                      border: 'none',
                      cursor: isOwner ? 'pointer' : 'not-allowed',
                      position: 'relative',
                      transition: 'background-color 0.2s ease',
                      flexShrink: 0,
                      outline: 'none',
                    }}
                  >
                    <div style={{
                      width: 26,
                      height: 26,
                      borderRadius: '50%',
                      backgroundColor: '#ffffff',
                      position: 'absolute',
                      top: 3,
                      left: isSelfOrderEnabled ? 29 : 3,
                      transition: 'left 0.2s ease',
                      boxShadow: '0 2px 5px rgba(0,0,0,0.25)',
                    }} />
                  </button>
                </div>

              </div>
            </div>

            {/* SECTION 2: BUSINESS PROFILE & GST INFORMATION */}
            <div style={{
              backgroundColor: 'var(--bg-card)',
              border: '1px solid var(--border)',
              borderRadius: '16px',
              padding: '1.75rem',
              boxShadow: 'var(--shadow-sm)',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', marginBottom: '0.35rem' }}>
                <div style={{
                  width: 32,
                  height: 32,
                  borderRadius: '8px',
                  backgroundColor: 'rgba(220, 38, 38, 0.1)',
                  color: '#dc2626',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}>
                  <Building size={18} />
                </div>
                <h2 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                  Business Profile & GST Information
                </h2>
              </div>
              <p style={{ margin: '0 0 1.75rem 0', fontSize: '0.86rem', color: 'var(--text-secondary)' }}>
                Official business details printed on digital tax invoices, customer bills, and receipts.
              </p>

              {/* Form Input Grid */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(310px, 1fr))',
                gap: '1.5rem',
              }}>

                {/* GST Number (GSTIN) */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem' }}>
                  <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontWeight: 700, fontSize: '0.88rem', color: 'var(--text-primary)' }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                      <Hash size={16} color="#dc2626" />
                      GST Number (GSTIN)
                    </span>
                    <span style={{ fontSize: '0.7rem', padding: '0.15rem 0.5rem', borderRadius: '4px', backgroundColor: 'rgba(220, 38, 38, 0.1)', color: '#dc2626', fontWeight: 700 }}>
                      TAX INVOICE
                    </span>
                  </label>
                  <input
                    type="text"
                    disabled={!isOwner}
                    className="form-input"
                    placeholder="e.g. 32AAAAA0000A1Z5"
                    value={gstNumber}
                    onChange={(e) => setGstNumber(e.target.value.toUpperCase())}
                    maxLength={20}
                    style={{
                      width: '100%',
                      textTransform: 'uppercase',
                      letterSpacing: '0.06em',
                      fontWeight: 700,
                      fontFamily: 'monospace',
                    }}
                  />
                  <span style={{ color: 'var(--text-muted)', fontSize: '0.78rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                    <Info size={13} />
                    Printed in header of all sales invoices & B2B delivery slips.
                  </span>
                </div>

                {/* Official Phone Number */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', fontWeight: 700, fontSize: '0.88rem', color: 'var(--text-primary)' }}>
                    <Phone size={16} color="#dc2626" />
                    Official Phone Number
                  </label>
                  <input
                    type="text"
                    disabled={!isOwner}
                    className="form-input"
                    placeholder="e.g. +91 98470 12345"
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    maxLength={25}
                    style={{ width: '100%', fontWeight: 600 }}
                  />
                  <span style={{ color: 'var(--text-muted)', fontSize: '0.78rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                    <Info size={13} />
                    Main contact number shown to customers and drivers.
                  </span>
                </div>

                {/* Business Legal Name */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', fontWeight: 700, fontSize: '0.88rem', color: 'var(--text-primary)' }}>
                    <Building size={16} color="#dc2626" />
                    Business Legal Name
                  </label>
                  <input
                    type="text"
                    disabled={!isOwner}
                    className="form-input"
                    placeholder="e.g. Zamzam Foods Wholesale"
                    value={businessName}
                    onChange={(e) => setBusinessName(e.target.value)}
                    maxLength={150}
                    style={{ width: '100%', fontWeight: 600 }}
                  />
                  <span style={{ color: 'var(--text-muted)', fontSize: '0.78rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                    <Info size={13} />
                    Entity name displayed on bills and customer portals.
                  </span>
                </div>

                {/* Official Email */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', fontWeight: 700, fontSize: '0.88rem', color: 'var(--text-primary)' }}>
                    <Mail size={16} color="#dc2626" />
                    Official Email
                  </label>
                  <input
                    type="email"
                    disabled={!isOwner}
                    className="form-input"
                    placeholder="e.g. billing@zamzamfoods.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    maxLength={100}
                    style={{ width: '100%' }}
                  />
                  <span style={{ color: 'var(--text-muted)', fontSize: '0.78rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                    <Info size={13} />
                    Contact email for accounting and business queries.
                  </span>
                </div>

                {/* UPI ID / VPA */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', fontWeight: 700, fontSize: '0.88rem', color: 'var(--text-primary)' }}>
                    <CreditCard size={16} color="#dc2626" />
                    Business UPI ID / VPA
                  </label>
                  <input
                    type="text"
                    disabled={!isOwner}
                    className="form-input"
                    placeholder="e.g. zamzamfoods@okaxis"
                    value={upiId}
                    onChange={(e) => setUpiId(e.target.value)}
                    maxLength={100}
                    style={{ width: '100%', fontWeight: 600 }}
                  />
                  <span style={{ color: 'var(--text-muted)', fontSize: '0.78rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                    <Info size={13} />
                    Used for generating UPI QR codes for driver collections and customer invoices.
                  </span>
                </div>

                {/* Empty placeholder column for balance on wide screens */}
                <div style={{ display: 'none' }} />

                {/* Full Address */}
                <div style={{ gridColumn: '1 / -1', display: 'flex', flexDirection: 'column', gap: '0.45rem' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', fontWeight: 700, fontSize: '0.88rem', color: 'var(--text-primary)' }}>
                    <MapPin size={16} color="#dc2626" />
                    Business / Warehouse Address
                  </label>
                  <textarea
                    disabled={!isOwner}
                    className="form-textarea"
                    rows={2}
                    placeholder="e.g. Main Road, Pandikkad, Malappuram District, Kerala - 676521"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    style={{ width: '100%', minHeight: '84px' }}
                  />
                  <span style={{ color: 'var(--text-muted)', fontSize: '0.78rem' }}>
                    Physical location printed on delivery invoices and tax documents.
                  </span>
                </div>

                {/* Invoice Footer Notes */}
                <div style={{ gridColumn: '1 / -1', display: 'flex', flexDirection: 'column', gap: '0.45rem' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', fontWeight: 700, fontSize: '0.88rem', color: 'var(--text-primary)' }}>
                    <FileText size={16} color="#dc2626" />
                    Invoice Terms & Footer Remarks
                  </label>
                  <textarea
                    disabled={!isOwner}
                    className="form-textarea"
                    rows={2}
                    placeholder="e.g. Thank you for your business. Fresh Kubbus & Romali rotis delivered daily."
                    value={invoiceNotes}
                    onChange={(e) => setInvoiceNotes(e.target.value)}
                    style={{ width: '100%', minHeight: '84px' }}
                  />
                  <span style={{ color: 'var(--text-muted)', fontSize: '0.78rem' }}>
                    Custom note or return policy printed at the bottom of customer receipts.
                  </span>
                </div>

              </div>
            </div>

            {/* SECTION: DATABASE STORAGE LEVEL & BACKUP DISASTER RECOVERY */}
            <DatabaseStorageBackupSection />

            {/* SECTION: WEBSITE VERSION & CACHE PURGE TELEMETRY */}
            <WebsiteCacheVersionSection />

            {/* SECTION 3: ZENTRIX 24x7 HELP DESK & SOFTWARE SUPPORT */}
            <ZentrixSettingsSection />

            {/* STICKY BOTTOM ACTION BAR */}
            {isOwner && (
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '1.25rem 1.75rem',
                backgroundColor: 'var(--bg-card)',
                border: '1px solid var(--border)',
                borderRadius: '16px',
                position: 'sticky',
                bottom: '1rem',
                boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
                zIndex: 20,
                flexWrap: 'wrap',
                gap: '1rem',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-secondary)', fontSize: '0.86rem' }}>
                  <Check size={16} color="#16a34a" />
                  <span>All settings are validated and encrypted in master database</span>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <button
                    type="button"
                    onClick={handleReset}
                    disabled={saving}
                    className="btn btn-secondary"
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.45rem',
                      padding: '0.65rem 1.25rem',
                      fontWeight: 600,
                    }}
                  >
                    <RotateCcw size={16} />
                    Reset
                  </button>
                  <button
                    type="submit"
                    disabled={saving}
                    className="btn btn-primary"
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.5rem',
                      minWidth: 160,
                      justifyContent: 'center',
                      padding: '0.65rem 1.5rem',
                      fontWeight: 800,
                      fontSize: '0.94rem',
                    }}
                  >
                    {saving ? (
                      <>
                        <div className="spinner" style={{ width: 16, height: 16, borderWidth: 2 }} />
                        Saving...
                      </>
                    ) : (
                      <>
                        <Save size={18} />
                        Save Settings
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}
          </div>
        </form>
      )}

      {/* WhatsApp Upgrade Plan & License Key Modal */}
      {isUpgradeModalOpen && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.65)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            padding: '1rem',
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget && !activatingKey) {
              setIsUpgradeModalOpen(false);
              setKeyError(null);
            }
          }}
        >
          <div
            style={{
              backgroundColor: 'var(--bg-card, #ffffff)',
              borderRadius: '16px',
              border: '1px solid var(--border)',
              width: '100%',
              maxWidth: '520px',
              boxShadow: '0 20px 40px rgba(0, 0, 0, 0.25)',
              overflow: 'hidden',
              animation: 'modalSlideUp 0.25s ease-out',
            }}
          >
            {/* Modal Header */}
            <div
              style={{
                padding: '1.25rem 1.5rem',
                borderBottom: '1px solid var(--border)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                background: 'linear-gradient(135deg, rgba(5, 150, 105, 0.08) 0%, rgba(16, 185, 129, 0.02) 100%)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <div
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: '10px',
                    backgroundColor: '#ecfdf5',
                    color: '#059669',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    border: '1px solid #a7f3d0',
                  }}
                >
                  <Key size={20} />
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                    Upgrade WhatsApp Plan with Key
                  </h3>
                  <p style={{ margin: 0, fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                    Activate time-based license key to unlock messaging
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  if (!activatingKey) {
                    setIsUpgradeModalOpen(false);
                    setKeyError(null);
                  }
                }}
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  color: 'var(--text-muted)',
                  padding: '4px',
                  borderRadius: '6px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <X size={20} />
              </button>
            </div>

            {/* Modal Body */}
            <div style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              {/* Help Desk Context Card for License Activation */}
              <div
                style={{
                  padding: '0.85rem 1rem',
                  borderRadius: '10px',
                  backgroundColor: 'rgba(5, 150, 105, 0.08)',
                  border: '1.5px solid rgba(5, 150, 105, 0.25)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '0.75rem',
                  flexWrap: 'wrap',
                }}
              >
                <div style={{ flex: '1 1 230px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                    <Headphones size={16} color="#059669" />
                    <span style={{ fontSize: '0.82rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                      Get Official Plan Key • Zentrix Support
                    </span>
                    <span
                      style={{
                        fontSize: '0.62rem',
                        fontWeight: 800,
                        padding: '0.1rem 0.4rem',
                        borderRadius: '4px',
                        backgroundColor: '#dcfce7',
                        color: '#15803d',
                        border: '1px solid #86efac',
                      }}
                    >
                      24x7 Active
                    </span>
                  </div>
                  <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.76rem', color: 'var(--text-secondary)', lineHeight: 1.4 }}>
                    To obtain official keys, extend validity, or renew business licenses, contact <strong>Zentrix Help Desk</strong> at <strong style={{ color: '#059669', fontFamily: 'monospace' }}>7012587705</strong>.
                  </p>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap' }}>
                  <a
                    href="https://wa.me/917012587705?text=Hello%20Zentrix%2C%20I%20want%20to%20get%20an%20upgrade%20key%20for%20WhatsApp%20Messaging"
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      backgroundColor: '#059669',
                      color: '#ffffff',
                      textDecoration: 'none',
                      borderRadius: '6px',
                      padding: '0.38rem 0.65rem',
                      fontSize: '0.74rem',
                      fontWeight: 700,
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.3rem',
                    }}
                    title="Request Key on WhatsApp: 7012587705"
                  >
                    <MessageCircle size={13} />
                    <span>WhatsApp (7012587705)</span>
                  </a>

                  <a
                    href="tel:+917012587705"
                    style={{
                      backgroundColor: 'var(--bg-card)',
                      color: 'var(--text-primary)',
                      border: '1px solid var(--border)',
                      textDecoration: 'none',
                      borderRadius: '6px',
                      padding: '0.38rem 0.65rem',
                      fontSize: '0.74rem',
                      fontWeight: 700,
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.3rem',
                    }}
                    title="Call Help Desk: 7012587705"
                  >
                    <Phone size={13} />
                    <span>Call 7012587705</span>
                  </a>
                </div>
              </div>

              {/* Quick Plan Tiers with 7012587705 context */}
              <div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.45rem', flexWrap: 'wrap', gap: '0.35rem' }}>
                  <label style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-secondary)', margin: 0 }}>
                    Available Plan Keys (Click to Auto-fill)
                  </label>
                  <span style={{ fontSize: '0.72rem', color: '#059669', fontWeight: 700 }}>
                    Official Helpline: 7012587705
                  </span>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.6rem' }}>
                  {/* 30 Days */}
                  <button
                    type="button"
                    onClick={() => {
                      setLicenseKeyInput('ZAMZAM-WA-30D');
                      setKeyError(null);
                    }}
                    style={{
                      padding: '0.75rem 0.6rem',
                      borderRadius: '8px',
                      border: licenseKeyInput === 'ZAMZAM-WA-30D' ? '2px solid #059669' : '1px solid var(--border)',
                      backgroundColor: licenseKeyInput === 'ZAMZAM-WA-30D' ? '#ecfdf5' : 'var(--bg-main)',
                      textAlign: 'center',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    <div style={{ fontSize: '0.8rem', fontWeight: 800, color: '#047857' }}>30 Days</div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', marginTop: '2px' }}>Monthly Pro</div>
                    <code style={{ fontSize: '0.65rem', color: '#059669', display: 'block', marginTop: '4px', fontWeight: 700 }}>WA-30D</code>
                  </button>

                  {/* 365 Days */}
                  <button
                    type="button"
                    onClick={() => {
                      setLicenseKeyInput('ZAMZAM-WA-365D');
                      setKeyError(null);
                    }}
                    style={{
                      padding: '0.75rem 0.6rem',
                      borderRadius: '8px',
                      border: licenseKeyInput === 'ZAMZAM-WA-365D' ? '2px solid #059669' : '1px solid var(--border)',
                      backgroundColor: licenseKeyInput === 'ZAMZAM-WA-365D' ? '#ecfdf5' : 'var(--bg-main)',
                      textAlign: 'center',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    <div style={{ fontSize: '0.8rem', fontWeight: 800, color: '#047857' }}>365 Days</div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', marginTop: '2px' }}>Annual Pro</div>
                    <code style={{ fontSize: '0.65rem', color: '#059669', display: 'block', marginTop: '4px', fontWeight: 700 }}>WA-365D</code>
                  </button>
                </div>

                <div
                  style={{
                    fontSize: '0.72rem',
                    color: 'var(--text-secondary)',
                    marginTop: '0.45rem',
                    padding: '0.4rem 0.6rem',
                    borderRadius: '6px',
                    backgroundColor: 'var(--bg-main)',
                    border: '1px dashed var(--border)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    flexWrap: 'wrap',
                    gap: '0.35rem',
                  }}
                >
                  <span>
                    🔑 Keys are issued & verified by <strong>Zentrix Help Desk</strong>.
                  </span>
                  <a
                    href="https://wa.me/917012587705?text=Hello%20Zentrix%2C%20I%20need%20to%20verify%20my%20WhatsApp%20plan%20key"
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ color: '#059669', fontWeight: 700, textDecoration: 'none' }}
                  >
                    WhatsApp: 7012587705 →
                  </a>
                </div>
              </div>

              {/* License Key Input */}
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '0.4rem' }}>
                  License / Upgrade Key
                </label>
                <div style={{ position: 'relative' }}>
                  <input
                    type="text"
                    value={licenseKeyInput}
                    onChange={(e) => {
                      setLicenseKeyInput(e.target.value.toUpperCase());
                      setKeyError(null);
                    }}
                    placeholder="Enter key (e.g. ZAMZAM-WA-365D)"
                    className="form-control"
                    style={{
                      fontFamily: 'monospace',
                      fontWeight: 700,
                      letterSpacing: '0.08em',
                      fontSize: '0.94rem',
                      textTransform: 'uppercase',
                      padding: '0.75rem 1rem',
                      borderRadius: '8px',
                    }}
                  />
                  {licenseKeyInput && (
                    <button
                      type="button"
                      onClick={() => setLicenseKeyInput('')}
                      style={{
                        position: 'absolute',
                        right: '10px',
                        top: '50%',
                        transform: 'translateY(-50%)',
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        color: 'var(--text-muted)',
                      }}
                    >
                      <X size={16} />
                    </button>
                  )}
                </div>
                <small style={{ color: 'var(--text-secondary)', fontSize: '0.74rem', marginTop: '0.35rem', display: 'block' }}>
                  Accepted format: Official Zentrix upgrade key or custom key from Help Desk (7012587705).
                </small>
              </div>

              {/* Error & Success Alerts */}
              {keyError && (
                <div style={{
                  padding: '0.75rem 1rem',
                  borderRadius: '8px',
                  backgroundColor: '#fee2e2',
                  border: '1px solid #fca5a5',
                  color: '#991b1b',
                  fontSize: '0.82rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                }}>
                  <AlertCircle size={16} />
                  <span>{keyError}</span>
                </div>
              )}

              {keySuccess && (
                <div style={{
                  padding: '0.75rem 1rem',
                  borderRadius: '8px',
                  backgroundColor: '#ecfdf5',
                  border: '1px solid #a7f3d0',
                  color: '#065f46',
                  fontSize: '0.82rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                }}>
                  <CheckCircle2 size={16} />
                  <span>{keySuccess}</span>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div
              style={{
                padding: '1rem 1.5rem',
                borderTop: '1px solid var(--border)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'flex-end',
                gap: '0.75rem',
                backgroundColor: 'var(--bg-main)',
              }}
            >
              <button
                type="button"
                onClick={() => {
                  setIsUpgradeModalOpen(false);
                  setKeyError(null);
                }}
                disabled={activatingKey}
                className="btn btn-secondary btn-sm"
                style={{ padding: '0.55rem 1rem' }}
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={async () => {
                  setKeyError(null);
                  setKeySuccess(null);
                  const k = licenseKeyInput.trim().toUpperCase();
                  if (!k) {
                    setKeyError('Please enter an upgrade license key.');
                    return;
                  }

                  let planName = 'WhatsApp Enterprise Pro';
                  let days = 365;
                  let isLifetime = false;

                  if (k.includes('LIFETIME') || k === 'ZAMZAM-LIFETIME' || k === 'WA-LIFETIME') {
                    planName = 'Enterprise Lifetime License';
                    isLifetime = true;
                  } else if (k.includes('365D') || k.includes('1Y') || k.includes('ANNUAL') || k === 'ZAMZAM-WA-PRO-2026') {
                    planName = '1-Year Enterprise Annual Pass';
                    days = 365;
                  } else if (k.includes('90D') || k.includes('QUARTER')) {
                    planName = '90-Day Business Quarterly Pass';
                    days = 90;
                  } else if (k.includes('30D') || k.includes('MONTH') || k === 'ZAMZAM-WA-TRIAL') {
                    planName = '30-Day Pro Monthly Pass';
                    days = 30;
                  } else if ((k.startsWith('WA-') || k.startsWith('ZAMZAM-')) && k.length >= 8) {
                    planName = 'Pro Business License (1 Year)';
                    days = 365;
                  } else if (k === 'ADMIN-UNLOCK' || k === 'ZAMZAM2026') {
                    planName = 'Master Administrator Plan';
                    days = 365;
                  } else {
                    setKeyError('Invalid activation key format. Use a valid key such as ZAMZAM-WA-30D, ZAMZAM-WA-365D, or ZAMZAM-WA-LIFETIME.');
                    return;
                  }

                  try {
                    setActivatingKey(true);
                    const newExpiry = isLifetime
                      ? null
                      : new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString();

                    await updateSettings({
                      whatsapp_is_locked: false,
                      whatsapp_plan_name: planName,
                      whatsapp_plan_expires_at: newExpiry,
                      whatsapp_license_key: k,
                      is_whatsapp_enabled: true,
                    });

                    setWhatsappIsLocked(false);
                    setWhatsappPlanName(planName);
                    setWhatsappPlanExpiresAt(newExpiry);
                    setWhatsappLicenseKey(k);
                    setIsWhatsappEnabled(true);

                    setKeySuccess(`Successfully activated ${planName}! WhatsApp features are unlocked.`);
                    setTimeout(() => {
                      setIsUpgradeModalOpen(false);
                      setLicenseKeyInput('');
                      setKeySuccess(null);
                    }, 1400);
                  } catch (err: any) {
                    setKeyError(err.message || 'Failed to activate key on server.');
                  } finally {
                    setActivatingKey(false);
                  }
                }}
                disabled={activatingKey || !licenseKeyInput.trim()}
                className="btn btn-primary btn-sm"
                style={{
                  padding: '0.55rem 1.35rem',
                  backgroundColor: '#059669',
                  borderColor: '#059669',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                  fontWeight: 700,
                }}
              >
                {activatingKey ? (
                  <>
                    <div className="spinner" style={{ width: 14, height: 14, borderWidth: 2 }} />
                    Activating...
                  </>
                ) : (
                  <>
                    <Key size={14} />
                    Activate Plan
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
