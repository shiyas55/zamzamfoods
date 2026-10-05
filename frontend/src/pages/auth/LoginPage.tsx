import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useSettings } from '../../context/SettingsContext';
import { Lock, User, ArrowRight, AlertCircle, Eye, EyeOff } from 'lucide-react';
import { getDynamicStoreInfo } from '../../utils/whatsappUtils';

export const LoginPage: React.FC = () => {
  const store = getDynamicStoreInfo();
  const { login, logout } = useAuth();
  const { isDriverModuleEnabled } = useSettings();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (searchParams.get('error') === 'driver_disabled') {
      setError('The Delivery Driver portal is currently turned OFF in System Settings. Please contact the administrator.');
    }
  }, [searchParams]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password) {
      setError('Please provide both username and password.');
      return;
    }

    try {
      setIsLoading(true);
      setError(null);
      const user = await login(username.trim(), password);

      // Route immediately based on role
      if (user.role === 'DRIVER') {
        if (!isDriverModuleEnabled) {
          setError('The Delivery Driver portal is currently turned OFF in System Settings.');
          await logout();
          return;
        }
        navigate('/driver');
      } else if (user.role === 'MANAGER') {
        navigate('/manager');
      } else {
        navigate('/owner');
      }
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('Login failed. Please verify credentials.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="login-wrapper">
      <style>{`
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          20%, 60% { transform: translateX(-4px); }
          40%, 80% { transform: translateX(4px); }
        }
        @keyframes spin {
          to { transform: rotate(360deg); }
        }

        .login-wrapper {
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          background: #f1f5f9;
          position: relative;
          padding: 1.5rem;
          box-sizing: border-box;
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
        }

        .login-card {
          width: 100%;
          max-width: 390px;
          background: #ffffff;
          border-radius: 8px;
          border: 1px solid #cbd5e1;
          box-shadow: var(--shadow-sm);
          overflow: hidden;
          position: relative;
          z-index: 10;
          box-sizing: border-box;
        }

        .login-header {
          padding: 1.75rem 1.5rem 1.25rem;
          background: #ffffff;
          border-bottom: 1px solid #e2e8f0;
          text-align: center;
        }

        .login-logo {
          height: 64px;
          width: 64px;
          object-fit: cover;
          border-radius: 6px;
          margin-bottom: 0.5rem;
          display: inline-block;
        }

        .animated-input-group {
          margin-bottom: 1.1rem;
          text-align: left;
        }
        .animated-input-group label {
          display: block;
          font-size: 0.82rem;
          font-weight: 700;
          color: #334155;
          margin-bottom: 0.4rem;
        }

        .input-wrapper {
          position: relative;
          width: 100%;
          height: 40px;
          display: flex;
          align-items: center;
          box-sizing: border-box;
        }

        .input-icon-left {
          position: absolute;
          left: 12px;
          top: 50%;
          transform: translateY(-50%);
          color: #94a3b8;
          pointer-events: none;
          display: flex;
          align-items: center;
          justify-content: center;
          width: 18px;
          height: 18px;
          z-index: 5;
        }

        .animated-input {
          width: 100%;
          height: 100%;
          padding: 0 40px 0 38px;
          border: 1px solid #cbd5e1;
          border-radius: 4px;
          font-size: 0.9rem;
          color: #0f172a;
          background: #ffffff;
          outline: none;
          box-sizing: border-box;
          line-height: normal;
        }
        .animated-input::placeholder {
          color: #94a3b8;
          font-size: 0.88rem;
        }
        .animated-input:focus {
          border-color: #b91c1c;
          box-shadow: 0 0 0 2px rgba(185, 28, 28, 0.15);
        }
        .input-wrapper:focus-within .input-icon-left {
          color: #b91c1c;
        }

        .password-toggle-btn {
          position: absolute;
          right: 8px;
          top: 50%;
          transform: translateY(-50%);
          background: transparent;
          border: none;
          color: #94a3b8;
          cursor: pointer;
          width: 28px;
          height: 28px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 4px;
          z-index: 5;
          padding: 0;
        }
        .password-toggle-btn:hover {
          color: #b91c1c;
        }

        .animated-submit-btn {
          width: 100%;
          height: 40px;
          background: #b91c1c;
          color: white;
          border: none;
          border-radius: 4px;
          font-size: 0.92rem;
          font-weight: 700;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.5rem;
          box-shadow: var(--shadow-sm);
          transition: background 0.15s ease;
          margin-top: 0.25rem;
        }
        .animated-submit-btn:hover:not(:disabled) {
          background: #991b1b;
        }
        .animated-submit-btn:disabled {
          opacity: 0.65;
          cursor: not-allowed;
        }

        .error-banner {
          display: flex;
          align-items: center;
          gap: 0.6rem;
          padding: 0.65rem 0.8rem;
          border-radius: 4px;
          background: #fef2f2;
          border: 1px solid #fecaca;
          color: #b91c1c;
          font-size: 0.82rem;
          font-weight: 600;
          margin-bottom: 1.1rem;
          animation: shake 0.4s ease-in-out;
        }

        .status-badge-pulse {
          display: inline-block;
        }

        .support-link {
          transition: opacity 0.15s ease;
        }
        .support-link:hover {
          opacity: 0.8;
        }
      `}</style>

      {/* Main Login Card */}
      <div className="login-card">
        {/* Header */}
        <div className="login-header">
          <img 
            src="/app-icon.png" 
            alt="Zamzam Foods App Icon" 
            className="login-logo"
          />
          <h1
            style={{
              fontSize: '1.25rem',
              fontWeight: 700,
              color: '#0f172a',
              margin: '0 0 0.35rem 0',
              letterSpacing: '-0.02em',
            }}
          >
            Zamzam Foods
          </h1>
          <p style={{ fontSize: '0.84rem', color: '#64748b', margin: 0 }}>
            Enterprise Distribution Management System
          </p>
        </div>

        {/* Form Body */}
        <div style={{ padding: '1.75rem 2rem 2rem' }}>
          {error && (
            <div className="error-banner">
              <AlertCircle size={18} style={{ flexShrink: 0 }} />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div className="animated-input-group">
              <label htmlFor="username">Username</label>
              <div className="input-wrapper" style={{ position: 'relative', width: '100%', height: '48px', display: 'flex', alignItems: 'center' }}>
                <div className="input-icon-left" style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none', zIndex: 5, color: '#94a3b8' }}>
                  <User size={18} />
                </div>
                <input
                  id="username"
                  type="text"
                  className="animated-input"
                  style={{ width: '100%', height: '100%', paddingLeft: '42px', paddingRight: '44px', boxSizing: 'border-box' }}
                  placeholder="Enter username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  disabled={isLoading}
                  autoComplete="username"
                  autoFocus
                />
              </div>
            </div>

            <div className="animated-input-group" style={{ marginBottom: '1.5rem' }}>
              <label htmlFor="password">Password</label>
              <div className="input-wrapper" style={{ position: 'relative', width: '100%', height: '48px', display: 'flex', alignItems: 'center' }}>
                <div className="input-icon-left" style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none', zIndex: 5, color: '#94a3b8' }}>
                  <Lock size={18} />
                </div>
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  className="animated-input"
                  style={{ width: '100%', height: '100%', paddingLeft: '42px', paddingRight: '44px', boxSizing: 'border-box' }}
                  placeholder="Enter password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={isLoading}
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  className="password-toggle-btn"
                  style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', zIndex: 5, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'transparent', border: 'none', cursor: 'pointer', color: '#94a3b8' }}
                  onClick={() => setShowPassword(!showPassword)}
                  tabIndex={-1}
                  title={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              className="animated-submit-btn"
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <div
                    style={{
                      width: 18,
                      height: 18,
                      border: '2px solid rgba(255,255,255,0.35)',
                      borderTopColor: '#ffffff',
                      borderRadius: '50%',
                      animation: 'spin 0.8s linear infinite',
                    }}
                  />
                  <span>Signing In...</span>
                </>
              ) : (
                <>
                  <span>Sign In</span>
                  <ArrowRight size={18} />
                </>
              )}
            </button>
          </form>

          {/* Zentrix 24x7 Help Desk Support Footer */}
          <div
            style={{
              marginTop: '1.75rem',
              paddingTop: '1.25rem',
              borderTop: '1px solid #f1f5f9',
              textAlign: 'center',
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.45rem',
                marginBottom: '0.5rem',
              }}
            >
              <span style={{ fontSize: '0.72rem', color: '#64748b' }}>Software by</span>
              <strong style={{ fontSize: '0.82rem', color: '#0f172a', letterSpacing: '0.04em' }}>
                ZENTRIX
              </strong>
              <span
                className="status-badge-pulse"
                style={{
                  fontSize: '0.62rem',
                  fontWeight: 800,
                  backgroundColor: '#ecfdf5',
                  color: '#059669',
                  padding: '0.12rem 0.45rem',
                  borderRadius: '999px',
                  border: '1px solid #a7f3d0',
                }}
              >
                24x7 Help Desk
              </span>
            </div>

            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.85rem',
                flexWrap: 'wrap',
              }}
            >
              <a
                href={`https://wa.me/${store.businessPhone.replace(/[^0-9]/g, '') || '917012587705'}?text=Hello%20Support%2C%20I%20need%20assistance%20logging%20in`}
                target="_blank"
                rel="noopener noreferrer"
                className="support-link"
                style={{
                  color: '#059669',
                  fontSize: '0.78rem',
                  fontWeight: 700,
                  textDecoration: 'none',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.25rem',
                }}
              >
                <span>💬 WhatsApp: {store.businessPhone}</span>
              </a>
              <span style={{ color: '#cbd5e1' }}>|</span>
              <a
                href={`tel:${store.businessPhone.replace(/[^0-9+]/g, '') || '+917012587705'}`}
                className="support-link"
                style={{
                  color: '#334155',
                  fontSize: '0.78rem',
                  fontWeight: 700,
                  textDecoration: 'none',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.25rem',
                }}
              >
                <span>📞 Call: {store.businessPhone}</span>
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
