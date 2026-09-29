import React, { useState } from 'react';
import {
  Headphones,
  Phone,
  MessageCircle,
  Clock,
  Sparkles,
  X,
  Copy,
  Check,
  ShieldCheck,
  ExternalLink,
} from 'lucide-react';

export const ZENTRIX_SUPPORT_CONFIG = {
  brandName: 'Zentrix',
  tagline: 'Software & Technology Solutions',
  phone: '7012587705',
  formattedPhone: '+91 7012587705',
  callUrl: 'tel:+917012587705',
  whatsappUrl:
    'https://wa.me/917012587705?text=Hello%20Zentrix%20Support%2C%20I%20need%20assistance%20with%20Zamzam%20Foods%20System',
  availability: '24x7 Active Help Desk',
};

/**
 * Zentrix Sidebar Support Card
 * Embedded in Owner and Manager sidebars above user profile.
 */
export const ZentrixSidebarCard: React.FC<{ isCollapsed?: boolean }> = ({ isCollapsed }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(ZENTRIX_SUPPORT_CONFIG.phone);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (isCollapsed) {
    return (
      <a
        href={ZENTRIX_SUPPORT_CONFIG.whatsappUrl}
        target="_blank"
        rel="noopener noreferrer"
        title="24x7 Help Desk by Zentrix (7012587705)"
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '0.5rem 0.2rem',
          margin: '0.4rem 0.2rem',
          borderRadius: '10px',
          background: 'rgba(16, 185, 129, 0.12)',
          border: '1px solid rgba(16, 185, 129, 0.3)',
          color: '#34d399',
          textDecoration: 'none',
          transition: 'all 0.15s ease',
        }}
      >
        <Headphones size={18} />
        <span style={{ fontSize: '0.58rem', fontWeight: 800, marginTop: '2px', color: '#6ee7b7' }}>24x7</span>
      </a>
    );
  }

  return (
    <div
      style={{
        margin: '0.5rem 0.75rem',
        padding: '0.65rem 0.75rem',
        borderRadius: '10px',
        background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.14) 0%, rgba(6, 95, 70, 0.25) 100%)',
        border: '1px solid rgba(16, 185, 129, 0.35)',
        boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.35rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
          <div
            style={{
              width: 22,
              height: 22,
              borderRadius: '6px',
              background: '#059669',
              color: '#ffffff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Headphones size={12} />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
              <span style={{ color: '#ffffff', fontSize: '0.74rem', fontWeight: 800, letterSpacing: '0.04em' }}>
                ZENTRIX
              </span>
              <span
                style={{
                  fontSize: '0.58rem',
                  background: 'rgba(34, 197, 94, 0.2)',
                  color: '#4ade80',
                  padding: '0.05rem 0.3rem',
                  borderRadius: '4px',
                  fontWeight: 800,
                  border: '1px solid rgba(74, 222, 128, 0.3)',
                }}
              >
                24x7
              </span>
            </div>
          </div>
        </div>
        <button
          type="button"
          onClick={handleCopy}
          title="Copy 7012587705"
          style={{
            background: 'none',
            border: 'none',
            color: copied ? '#4ade80' : '#94a3b8',
            cursor: 'pointer',
            padding: '2px',
            display: 'flex',
            alignItems: 'center',
          }}
        >
          {copied ? <Check size={13} /> : <Copy size={13} />}
        </button>
      </div>

      <div style={{ fontSize: '0.68rem', color: '#cbd5e1', marginBottom: '0.45rem', lineHeight: 1.25 }}>
        Help Desk: <strong style={{ color: '#ffffff', fontFamily: 'monospace' }}>7012587705</strong>
      </div>

      {/* Action Buttons: WhatsApp & Call */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.35rem' }}>
        <a
          href={ZENTRIX_SUPPORT_CONFIG.whatsappUrl}
          target="_blank"
          rel="noopener noreferrer"
          style={{
            background: '#059669',
            color: '#ffffff',
            textDecoration: 'none',
            borderRadius: '6px',
            padding: '0.28rem 0.3rem',
            fontSize: '0.68rem',
            fontWeight: 700,
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '0.25rem',
            transition: 'background 0.12s ease',
          }}
          title="Chat on WhatsApp: 7012587705"
        >
          <MessageCircle size={11} />
          <span>WhatsApp</span>
        </a>

        <a
          href={ZENTRIX_SUPPORT_CONFIG.callUrl}
          style={{
            background: 'rgba(255,255,255,0.12)',
            color: '#ffffff',
            textDecoration: 'none',
            borderRadius: '6px',
            padding: '0.28rem 0.3rem',
            fontSize: '0.68rem',
            fontWeight: 700,
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '0.25rem',
            border: '1px solid rgba(255,255,255,0.2)',
            transition: 'background 0.12s ease',
          }}
          title="Call 24x7 Help Desk: 7012587705"
        >
          <Phone size={11} />
          <span>Call</span>
        </a>
      </div>
    </div>
  );
};

/**
 * Floating 24x7 Zentrix Help Desk Widget
 * Available in the bottom right corner with click-to-open drawer modal.
 */
export const ZentrixHelpDeskWidget: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [isDismissed, setIsDismissed] = useState<boolean>(() => {
    return localStorage.getItem('zentrix_helpdesk_floating_hidden') === 'true';
  });

  const handleCopy = () => {
    navigator.clipboard.writeText(ZENTRIX_SUPPORT_CONFIG.phone);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDismiss = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsDismissed(true);
    localStorage.setItem('zentrix_helpdesk_floating_hidden', 'true');
  };

  if (isDismissed) {
    return null;
  }

  return (
    <>
      {/* Floating Trigger: Small circular dot icon (36px) with dismiss button */}
      <div
        style={{
          position: 'fixed',
          bottom: '1rem',
          right: '1rem',
          zIndex: 9990,
          display: 'flex',
          alignItems: 'center',
          gap: '4px',
        }}
      >
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          style={{
            width: 36,
            height: 36,
            borderRadius: '50%',
            background: 'linear-gradient(135deg, #059669 0%, #047857 100%)',
            color: '#ffffff',
            border: 'none',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            boxShadow: '0 2px 10px rgba(5, 150, 105, 0.4)',
            transition: 'transform 0.15s ease, box-shadow 0.15s ease',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'scale(1.08)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'scale(1)';
          }}
          title="Zentrix 24x7 Help Desk (7012587705) - Click to contact"
        >
          <Headphones size={17} />
        </button>

        {/* Quick dismiss/hide button */}
        <button
          type="button"
          onClick={handleDismiss}
          title="Hide floating help button"
          style={{
            width: 18,
            height: 18,
            borderRadius: '50%',
            backgroundColor: 'rgba(15, 23, 42, 0.5)',
            color: '#cbd5e1',
            border: 'none',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 0,
            fontSize: '10px',
            lineHeight: 1,
            transition: 'all 0.15s ease',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = 'rgba(239, 68, 68, 0.85)';
            e.currentTarget.style.color = '#ffffff';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = 'rgba(15, 23, 42, 0.5)';
            e.currentTarget.style.color = '#cbd5e1';
          }}
        >
          <X size={11} />
        </button>
      </div>

      {/* Help Desk Modal Dialog */}
      {isOpen && (
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
            if (e.target === e.currentTarget) setIsOpen(false);
          }}
        >
          <div
            style={{
              backgroundColor: 'var(--bg-card, #ffffff)',
              borderRadius: '16px',
              border: '1px solid var(--border)',
              width: '100%',
              maxWidth: '460px',
              boxShadow: '0 20px 40px rgba(0, 0, 0, 0.25)',
              overflow: 'hidden',
              animation: 'modalSlideUp 0.2s ease-out',
            }}
          >
            {/* Header */}
            <div
              style={{
                padding: '1.25rem 1.5rem',
                borderBottom: '1px solid var(--border)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                background: 'linear-gradient(135deg, rgba(5, 150, 105, 0.1) 0%, rgba(16, 185, 129, 0.03) 100%)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <div
                  style={{
                    width: 44,
                    height: 44,
                    borderRadius: '12px',
                    backgroundColor: '#ecfdf5',
                    color: '#059669',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    border: '1.5px solid #a7f3d0',
                  }}
                >
                  <Headphones size={22} />
                </div>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                    <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                      ZENTRIX
                    </h3>
                    <span
                      style={{
                        fontSize: '0.66rem',
                        background: '#dcfce7',
                        color: '#15803d',
                        padding: '0.12rem 0.45rem',
                        borderRadius: '999px',
                        fontWeight: 800,
                        border: '1px solid #86efac',
                      }}
                    >
                      24x7 Help Desk
                    </span>
                  </div>
                  <p style={{ margin: 0, fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                    Official Software & Technical Support
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsOpen(false)}
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

            {/* Body */}
            <div style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              {/* Phone display */}
              <div
                style={{
                  padding: '1rem',
                  borderRadius: '12px',
                  backgroundColor: 'var(--bg-main)',
                  border: '1px solid var(--border)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}
              >
                <div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', fontWeight: 600, textTransform: 'uppercase' }}>
                    Helpline & WhatsApp Number
                  </div>
                  <div style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-primary)', fontFamily: 'monospace' }}>
                    {ZENTRIX_SUPPORT_CONFIG.formattedPhone}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleCopy}
                  className="btn btn-secondary btn-sm"
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', padding: '0.35rem 0.65rem' }}
                >
                  {copied ? (
                    <>
                      <Check size={14} color="#059669" />
                      <span style={{ color: '#059669' }}>Copied</span>
                    </>
                  ) : (
                    <>
                      <Copy size={14} />
                      <span>Copy</span>
                    </>
                  )}
                </button>
              </div>

              {/* Action Buttons */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <a
                  href={ZENTRIX_SUPPORT_CONFIG.whatsappUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    backgroundColor: '#059669',
                    color: '#ffffff',
                    textDecoration: 'none',
                    borderRadius: '10px',
                    padding: '0.75rem',
                    textAlign: 'center',
                    fontWeight: 700,
                    fontSize: '0.88rem',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.45rem',
                    boxShadow: '0 2px 8px rgba(5, 150, 105, 0.3)',
                    transition: 'all 0.15s ease',
                  }}
                >
                  <MessageCircle size={18} />
                  <span>WhatsApp Chat</span>
                </a>

                <a
                  href={ZENTRIX_SUPPORT_CONFIG.callUrl}
                  style={{
                    backgroundColor: '#0f172a',
                    color: '#ffffff',
                    textDecoration: 'none',
                    borderRadius: '10px',
                    padding: '0.75rem',
                    textAlign: 'center',
                    fontWeight: 700,
                    fontSize: '0.88rem',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.45rem',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
                    transition: 'all 0.15s ease',
                  }}
                >
                  <Phone size={18} />
                  <span>Call Directly</span>
                </a>
              </div>

              {/* Services List */}
              <div
                style={{
                  padding: '0.85rem',
                  borderRadius: '10px',
                  backgroundColor: 'rgba(5, 150, 105, 0.05)',
                  border: '1px solid rgba(5, 150, 105, 0.15)',
                  fontSize: '0.78rem',
                  color: 'var(--text-secondary)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.35rem',
                }}
              >
                <div style={{ fontWeight: 700, color: 'var(--text-primary)', marginBottom: '0.2rem' }}>
                  ⚡ Available Assistance (24x7):
                </div>
                <div>• Wholesale Billing & Order Entry troubleshooting</div>
                <div>• WhatsApp API setup, connection & plan upgrades</div>
                <div>• Thermal printer & Bluetooth hardware integration</div>
                <div>• Driver dispatch, routes & payment reconciliations</div>
              </div>
            </div>

            {/* Footer */}
            <div
              style={{
                padding: '0.85rem 1.5rem',
                borderTop: '1px solid var(--border)',
                backgroundColor: 'var(--bg-main)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                fontSize: '0.72rem',
                color: 'var(--text-muted)',
              }}
            >
              <span>Software made by <strong>Zentrix</strong></span>
              <span style={{ color: '#059669', fontWeight: 600 }}>● Response time &lt; 5 mins</span>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

/**
 * Zentrix Help Desk Card for Settings Page
 */
export const ZentrixSettingsSection: React.FC = () => {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(ZENTRIX_SUPPORT_CONFIG.phone);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div
      style={{
        backgroundColor: 'var(--bg-card)',
        border: '1.5px solid rgba(5, 150, 105, 0.3)',
        borderRadius: '16px',
        padding: '1.75rem',
        boxShadow: 'var(--shadow-sm)',
        background: 'linear-gradient(135deg, var(--bg-card) 0%, rgba(5, 150, 105, 0.03) 100%)',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem', marginBottom: '1rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
          <div
            style={{
              width: 48,
              height: 48,
              borderRadius: '12px',
              backgroundColor: '#ecfdf5',
              color: '#059669',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              border: '1.5px solid #a7f3d0',
            }}
          >
            <Headphones size={24} />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
              <h2 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                Zentrix 24x7 Help Desk & Tech Support
              </h2>
              <span
                style={{
                  fontSize: '0.72rem',
                  fontWeight: 800,
                  padding: '0.2rem 0.6rem',
                  borderRadius: '999px',
                  backgroundColor: '#dcfce7',
                  color: '#15803d',
                  border: '1px solid #86efac',
                }}
              >
                ACTIVE 24x7
              </span>
            </div>
            <p style={{ margin: '0.2rem 0 0 0', fontSize: '0.84rem', color: 'var(--text-secondary)' }}>
              Official software maker: <strong>Zentrix</strong>. Direct technical support via WhatsApp and Call.
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
          <a
            href={ZENTRIX_SUPPORT_CONFIG.whatsappUrl}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              backgroundColor: '#059669',
              color: '#ffffff',
              textDecoration: 'none',
              borderRadius: '8px',
              padding: '0.55rem 1rem',
              fontWeight: 700,
              fontSize: '0.84rem',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.45rem',
              boxShadow: '0 2px 6px rgba(5, 150, 105, 0.25)',
            }}
          >
            <MessageCircle size={16} />
            <span>WhatsApp (7012587705)</span>
          </a>

          <a
            href={ZENTRIX_SUPPORT_CONFIG.callUrl}
            style={{
              backgroundColor: '#0f172a',
              color: '#ffffff',
              textDecoration: 'none',
              borderRadius: '8px',
              padding: '0.55rem 1rem',
              fontWeight: 700,
              fontSize: '0.84rem',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.45rem',
            }}
          >
            <Phone size={16} />
            <span>Call 24x7</span>
          </a>
        </div>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
          gap: '1rem',
          padding: '1rem',
          borderRadius: '12px',
          backgroundColor: 'var(--bg-main)',
          border: '1px solid var(--border)',
        }}
      >
        <div>
          <div style={{ fontSize: '0.74rem', color: 'var(--text-secondary)', textTransform: 'uppercase', fontWeight: 700 }}>
            Software Maker & Brand
          </div>
          <div style={{ fontSize: '1.05rem', fontWeight: 800, color: 'var(--text-primary)', marginTop: '2px' }}>
            Zentrix Technologies
          </div>
        </div>

        <div>
          <div style={{ fontSize: '0.74rem', color: 'var(--text-secondary)', textTransform: 'uppercase', fontWeight: 700 }}>
            Help Desk Phone / WhatsApp
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '2px' }}>
            <span style={{ fontSize: '1.05rem', fontWeight: 800, color: '#059669', fontFamily: 'monospace' }}>
              {ZENTRIX_SUPPORT_CONFIG.formattedPhone}
            </span>
            <button
              type="button"
              onClick={handleCopy}
              title="Copy phone"
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                color: copied ? '#059669' : 'var(--text-muted)',
                padding: '2px',
              }}
            >
              {copied ? <Check size={14} /> : <Copy size={14} />}
            </button>
          </div>
        </div>

        <div>
          <div style={{ fontSize: '0.74rem', color: 'var(--text-secondary)', textTransform: 'uppercase', fontWeight: 700 }}>
            Service Availability
          </div>
          <div style={{ fontSize: '0.92rem', fontWeight: 700, color: 'var(--text-primary)', marginTop: '2px', display: 'flex', alignItems: 'center', gap: '4px' }}>
            <Clock size={14} color="#059669" />
            <span>24 Hours / 7 Days a Week</span>
          </div>
        </div>
      </div>
    </div>
  );
};
