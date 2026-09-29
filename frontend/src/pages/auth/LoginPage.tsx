import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Lock, User, ArrowRight, AlertCircle, ShieldCheck } from 'lucide-react';

export const LoginPage: React.FC = () => {
  const { login } = useAuth();
  const navigate = useNavigate();

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username || !password) {
      setError('Please provide both username and password.');
      return;
    }

    try {
      setIsLoading(true);
      setError(null);
      const user = await login(username.trim(), password);

      // Route immediately based on role
      if (user.role === 'DRIVER') {
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
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
        padding: '1.5rem',
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '440px',
          background: 'white',
          borderRadius: 'var(--radius-lg)',
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.3)',
          overflow: 'hidden',
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: '2.25rem 2rem 1.75rem',
            background: 'white',
            borderBottom: '1px solid var(--border)',
            textAlign: 'center',
          }}
        >
          <img 
            src="/app-icon.png" 
            alt="Zamzam Foods App Icon" 
            style={{
              height: '84px',
              width: '84px',
              objectFit: 'cover',
              borderRadius: '16px',
              marginBottom: '0.8rem',
              boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
            }}
          />
          <p style={{ fontSize: '0.88rem', color: 'var(--text-secondary)' }}>
            Enterprise Distribution Management System
          </p>
        </div>

        {/* Form */}
        <div style={{ padding: '2rem' }}>
          {error && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.6rem',
                padding: '0.75rem 1rem',
                borderRadius: 'var(--radius-md)',
                background: 'var(--danger-bg)',
                color: 'var(--danger)',
                fontSize: '0.85rem',
                fontWeight: 500,
                marginBottom: '1.25rem',
              }}
            >
              <AlertCircle size={18} />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label className="form-label" htmlFor="username">
                Username
              </label>
              <div style={{ position: 'relative' }}>
                <User
                  size={18}
                  style={{
                    position: 'absolute',
                    left: '0.85rem',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    color: 'var(--text-muted)',
                  }}
                />
                <input
                  id="username"
                  type="text"
                  className="form-input"
                  style={{ paddingLeft: '2.5rem' }}
                  placeholder="Enter username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  disabled={isLoading}
                  autoComplete="username"
                />
              </div>
            </div>

            <div className="form-group" style={{ marginBottom: '1.5rem' }}>
              <label className="form-label" htmlFor="password">
                Password
              </label>
              <div style={{ position: 'relative' }}>
                <Lock
                  size={18}
                  style={{
                    position: 'absolute',
                    left: '0.85rem',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    color: 'var(--text-muted)',
                  }}
                />
                <input
                  id="password"
                  type="password"
                  className="form-input"
                  style={{ paddingLeft: '2.5rem' }}
                  placeholder="Enter password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={isLoading}
                  autoComplete="current-password"
                />
              </div>
            </div>

            <button
              type="submit"
              className="btn btn-primary btn-full btn-lg"
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <div className="spinner" style={{ width: 18, height: 18, borderWidth: 2 }} />
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

          {/* Quick Demo Sign-in Credentials */}
          <div
            style={{
              marginTop: '1.25rem',
              padding: '0.85rem',
              background: '#f8fafc',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius-md)',
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: '0.6rem',
              }}
            >
              <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
                Demo Accounts (Click to Fill)
              </span>
              <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>
                Verified
              </span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.65rem' }}>
              <button
                type="button"
                onClick={() => {
                  setUsername('admin');
                  setPassword('admin');
                  setError(null);
                }}
                style={{
                  padding: '0.55rem 0.5rem',
                  fontSize: '0.78rem',
                  fontWeight: 600,
                  borderRadius: '6px',
                  border: '1px solid #cbd5e1',
                  background: 'white',
                  cursor: 'pointer',
                  color: '#0f172a',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '0.2rem',
                  transition: 'all 0.15s ease',
                }}
                title="Login as Admin (admin / admin)"
              >
                <span>👑 Admin</span>
                <span style={{ fontSize: '0.68rem', color: '#64748b', fontWeight: 400 }}>admin / admin</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setUsername('owner');
                  setPassword('admin123');
                  setError(null);
                }}
                style={{
                  padding: '0.55rem 0.5rem',
                  fontSize: '0.78rem',
                  fontWeight: 600,
                  borderRadius: '6px',
                  border: '1px solid #cbd5e1',
                  background: 'white',
                  cursor: 'pointer',
                  color: '#0f172a',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '0.2rem',
                  transition: 'all 0.15s ease',
                }}
                title="Login as Owner (owner / admin123)"
              >
                <span>👑 Owner</span>
                <span style={{ fontSize: '0.68rem', color: '#64748b', fontWeight: 400 }}>owner / admin123</span>
              </button>
            </div>
          </div>

          {/* Zentrix 24x7 Help Desk Support Footer */}
          <div
            style={{
              marginTop: '1.75rem',
              paddingTop: '1.25rem',
              borderTop: '1px solid var(--border)',
              textAlign: 'center',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.45rem', marginBottom: '0.45rem' }}>
              <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>Software by</span>
              <strong style={{ fontSize: '0.82rem', color: 'var(--text-primary)', letterSpacing: '0.04em' }}>ZENTRIX</strong>
              <span
                style={{
                  fontSize: '0.62rem',
                  fontWeight: 800,
                  backgroundColor: '#ecfdf5',
                  color: '#059669',
                  padding: '0.1rem 0.4rem',
                  borderRadius: '999px',
                  border: '1px solid #a7f3d0',
                }}
              >
                24x7 Help Desk
              </span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.85rem', flexWrap: 'wrap' }}>
              <a
                href="https://wa.me/917012587705?text=Hello%20Zentrix%20Support%2C%20I%20need%20assistance%20logging%20in"
                target="_blank"
                rel="noopener noreferrer"
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
                <span>💬 WhatsApp: 7012587705</span>
              </a>
              <span style={{ color: 'var(--border)' }}>|</span>
              <a
                href="tel:+917012587705"
                style={{
                  color: 'var(--text-primary)',
                  fontSize: '0.78rem',
                  fontWeight: 700,
                  textDecoration: 'none',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.25rem',
                }}
              >
                <span>📞 Call: 7012587705</span>
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
