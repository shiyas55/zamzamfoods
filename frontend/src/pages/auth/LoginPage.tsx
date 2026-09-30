import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Lock, User, ArrowRight, AlertCircle } from 'lucide-react';

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
    <div className="login-wrapper">
      <style>{`
        @keyframes floatOrb1 {
          0%, 100% { transform: translate(0px, 0px) scale(1); }
          50% { transform: translate(40px, -30px) scale(1.15); }
        }
        @keyframes floatOrb2 {
          0%, 100% { transform: translate(0px, 0px) scale(1); }
          50% { transform: translate(-35px, 35px) scale(1.2); }
        }
        @keyframes floatOrb3 {
          0%, 100% { transform: translate(0px, 0px) scale(1); }
          50% { transform: translate(25px, 40px) scale(0.9); }
        }
        @keyframes cardFadeIn {
          0% {
            opacity: 0;
            transform: translateY(28px) scale(0.96);
          }
          100% {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }
        @keyframes logoPulse {
          0%, 100% { transform: scale(1); filter: drop-shadow(0 4px 12px rgba(220, 38, 38, 0.2)); }
          50% { transform: scale(1.04); filter: drop-shadow(0 8px 24px rgba(220, 38, 38, 0.35)); }
        }
        @keyframes shimmer {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(200%); }
        }
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          20%, 60% { transform: translateX(-6px); }
          40%, 80% { transform: translateX(6px); }
        }
        @keyframes badgeGlow {
          0%, 100% { box-shadow: 0 0 0 0 rgba(16, 185, 129, 0.4); }
          50% { box-shadow: 0 0 0 6px rgba(16, 185, 129, 0); }
        }

        .login-wrapper {
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          background: #090d16;
          position: relative;
          overflow: hidden;
          padding: 1.5rem;
          font-family: inherit;
        }

        .ambient-orb {
          position: absolute;
          border-radius: 50%;
          filter: blur(90px);
          pointer-events: none;
          opacity: 0.6;
        }
        .orb-1 {
          width: 380px;
          height: 380px;
          background: radial-gradient(circle, #dc2626 0%, transparent 70%);
          top: -10%;
          left: 15%;
          animation: floatOrb1 12s ease-in-out infinite;
        }
        .orb-2 {
          width: 420px;
          height: 420px;
          background: radial-gradient(circle, #b91c1c 0%, transparent 70%);
          bottom: -15%;
          right: 10%;
          animation: floatOrb2 15s ease-in-out infinite;
        }
        .orb-3 {
          width: 300px;
          height: 300px;
          background: radial-gradient(circle, #f59e0b 0%, transparent 70%);
          top: 40%;
          left: 60%;
          opacity: 0.35;
          animation: floatOrb3 10s ease-in-out infinite;
        }

        .login-card {
          width: 100%;
          maxWidth: 440px;
          background: rgba(255, 255, 255, 0.98);
          border-radius: 20px;
          box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(255, 255, 255, 0.1);
          overflow: hidden;
          position: relative;
          z-index: 10;
          animation: cardFadeIn 0.7s cubic-bezier(0.16, 1, 0.3, 1) forwards;
          backdrop-filter: blur(12px);
        }

        .login-logo {
          height: 86px;
          width: 86px;
          object-fit: cover;
          border-radius: 18px;
          margin-bottom: 0.85rem;
          animation: logoPulse 4s ease-in-out infinite;
          transition: transform 0.3s ease;
        }
        .login-logo:hover {
          transform: scale(1.08) rotate(2deg);
        }

        .animated-input-group {
          position: relative;
          margin-bottom: 1.25rem;
        }
        .animated-input-group label {
          display: block;
          font-size: 0.85rem;
          font-weight: 600;
          color: #334155;
          margin-bottom: 0.4rem;
        }
        .animated-input {
          width: 100%;
          padding: 0.75rem 1rem 0.75rem 2.6rem;
          border: 1.5px solid #e2e8f0;
          border-radius: 10px;
          font-size: 0.95rem;
          color: #0f172a;
          background: #f8fafc;
          transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
          outline: none;
          box-sizing: border-box;
        }
        .animated-input:focus {
          border-color: #dc2626;
          background: #ffffff;
          box-shadow: 0 0 0 3.5px rgba(220, 38, 38, 0.12);
          transform: translateY(-1px);
        }
        .input-icon {
          position: absolute;
          left: 0.9rem;
          top: 2.25rem;
          color: #94a3b8;
          transition: color 0.25s ease, transform 0.25s ease;
          pointer-events: none;
        }
        .animated-input:focus + .input-icon,
        .animated-input-group:focus-within .input-icon {
          color: #dc2626;
          transform: scale(1.1);
        }

        .animated-submit-btn {
          width: 100%;
          padding: 0.85rem 1.25rem;
          background: linear-gradient(135deg, #e11d48 0%, #dc2626 50%, #b91c1c 100%);
          color: white;
          border: none;
          border-radius: 10px;
          font-size: 0.95rem;
          font-weight: 600;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.5rem;
          position: relative;
          overflow: hidden;
          box-shadow: 0 4px 14px rgba(220, 38, 38, 0.35);
          transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
        }
        .animated-submit-btn:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 0 6px 20px rgba(220, 38, 38, 0.45);
        }
        .animated-submit-btn:active:not(:disabled) {
          transform: translateY(0);
        }
        .animated-submit-btn:disabled {
          opacity: 0.7;
          cursor: not-allowed;
        }
        .animated-submit-btn::after {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          width: 50%;
          height: 100%;
          background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.25), transparent);
          transform: translateX(-100%);
        }
        .animated-submit-btn:hover::after {
          animation: shimmer 1.2s infinite;
        }

        .error-banner {
          display: flex;
          align-items: center;
          gap: 0.6rem;
          padding: 0.8rem 1rem;
          border-radius: 10px;
          background: #fef2f2;
          border: 1px solid #fecaca;
          color: #dc2626;
          font-size: 0.85rem;
          font-weight: 500;
          margin-bottom: 1.25rem;
          animation: shake 0.5s ease-in-out;
        }

        .status-badge-pulse {
          animation: badgeGlow 2s infinite;
        }

        .support-link {
          transition: transform 0.2s ease, opacity 0.2s ease;
        }
        .support-link:hover {
          transform: translateY(-1px);
          opacity: 0.85;
        }
      `}</style>

      {/* Floating Animated Ambient Glow Orbs */}
      <div className="ambient-orb orb-1" />
      <div className="ambient-orb orb-2" />
      <div className="ambient-orb orb-3" />

      {/* Main Login Card */}
      <div className="login-card">
        {/* Header */}
        <div
          style={{
            padding: '2.25rem 2rem 1.6rem',
            background: 'white',
            borderBottom: '1px solid #f1f5f9',
            textAlign: 'center',
          }}
        >
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
          <p style={{ fontSize: '0.86rem', color: '#64748b', margin: 0 }}>
            Enterprise Distribution Management System
          </p>
        </div>

        {/* Form */}
        <div style={{ padding: '2rem' }}>
          {error && (
            <div className="error-banner">
              <AlertCircle size={18} style={{ flexShrink: 0 }} />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div className="animated-input-group">
              <label htmlFor="username">Username</label>
              <div style={{ position: 'relative' }}>
                <input
                  id="username"
                  type="text"
                  className="animated-input"
                  placeholder="Enter username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  disabled={isLoading}
                  autoComplete="username"
                />
                <User size={18} className="input-icon" />
              </div>
            </div>

            <div className="animated-input-group" style={{ marginBottom: '1.6rem' }}>
              <label htmlFor="password">Password</label>
              <div style={{ position: 'relative' }}>
                <input
                  id="password"
                  type="password"
                  className="animated-input"
                  placeholder="Enter password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={isLoading}
                  autoComplete="current-password"
                />
                <Lock size={18} className="input-icon" />
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
                      border: '2px solid rgba(255,255,255,0.3)',
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
              marginTop: '1.8rem',
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
                href="https://wa.me/917012587705?text=Hello%20Zentrix%20Support%2C%20I%20need%20assistance%20logging%20in"
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
                <span>💬 WhatsApp: 7012587705</span>
              </a>
              <span style={{ color: '#cbd5e1' }}>|</span>
              <a
                href="tel:+917012587705"
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
                <span>📞 Call: 7012587705</span>
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
