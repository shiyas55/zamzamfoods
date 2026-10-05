import React, { useState, useEffect } from 'react';
import { NavLink, Outlet, useNavigate, useLocation, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { useSettings } from '../context/SettingsContext';
import { BRAND_CONFIG } from '../config/brandConfig';
import {
  LayoutDashboard, Store, Package, MapPin, Truck, ShoppingCart, Send,
  CreditCard, BookOpen, BarChart3, Users, LogOut, Receipt, Sun, Moon,
  History, Activity, Lock, ChevronLeft, ChevronRight,
  PanelLeftClose, PanelLeftOpen, Menu, X, PlusCircle, MessageCircle, Settings,
  Wrench, AlertTriangle, Headphones, FolderArchive,
} from 'lucide-react';
import { ZentrixSidebarCard, ZentrixHelpDeskWidget } from '../components/ZentrixHelpDesk';

export const OwnerLayout: React.FC = () => {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();

  // Collapsed icon-only state (desktop) with localStorage persistence
  const [isCollapsed, setIsCollapsed] = useState<boolean>(() => {
    return localStorage.getItem('owner_sidebar_collapsed') === 'true';
  });

  // Mobile drawer open state
  const [mobileOpen, setMobileOpen] = useState(false);

  // Close mobile drawer on route change
  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

  // Close mobile drawer on resize to desktop
  useEffect(() => {
    const mq = window.matchMedia('(min-width: 768px)');
    const handler = (e: MediaQueryListEvent) => { if (e.matches) setMobileOpen(false); };
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  const toggleSidebar = () => {
    setIsCollapsed(prev => {
      const next = !prev;
      localStorage.setItem('owner_sidebar_collapsed', String(next));
      return next;
    });
  };

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const { isWhatsAppEnabled, isMaintenanceMode, isDriverModuleEnabled } = useSettings();

  const navItems = [
    { to: '/owner',                    label: 'Dashboard',          icon: LayoutDashboard, end: true },
    { to: '/owner/daily-closing',      label: 'Daily Closing',      icon: Lock            },
    ...(isDriverModuleEnabled ? [{ to: '/owner/driver-performance', label: 'Staff Driver Performance', icon: Activity }] : []),
    { to: '/owner/customers',          label: 'Customer Shops',     icon: Store           },
    { to: '/owner/shop-documents',     label: 'Shop Documents',     icon: FolderArchive   },
    { to: '/owner/products',           label: 'Products',           icon: Package         },
    { to: '/owner/routes',             label: 'Delivery Routes',    icon: MapPin          },
    ...(isDriverModuleEnabled ? [{ to: '/owner/drivers',            label: 'Staff Drivers',      icon: Truck           }] : []),
    { to: '/owner/create-order',                 label: 'Create Order',       icon: PlusCircle      },
    ...(isWhatsAppEnabled ? [{ to: '/owner/create-order?view=whatsapp',   label: '💬 WhatsApp',       icon: MessageCircle   }] : []),
    { to: '/owner/orders',             label: 'Sales Orders',       icon: ShoppingCart    },
    ...(isDriverModuleEnabled ? [{ to: '/owner/deliveries',         label: 'Deliveries',         icon: Send            }] : []),
    { to: '/owner/expenses',           label: 'Expenses',           icon: Receipt         },
    { to: '/owner/payments',           label: 'Payments',           icon: CreditCard      },
    { to: '/owner/credit',             label: 'Credit Ledger',      icon: BookOpen        },
    { to: '/owner/reports',            label: 'Financial Reports',  icon: BarChart3       },
    { to: '/owner/activity-history',   label: 'Activity History',   icon: History         },
    { to: '/owner/users',              label: 'Staff & Roles',      icon: Users           },
    { to: '/owner/settings',           label: 'Settings',           icon: Settings        },
  ];

  const sidebarWidth = isCollapsed ? '72px' : '260px';

  const SidebarContent = (
    <>
      {/* Brand Header */}
      <div
        style={{
          padding: isCollapsed ? '1rem 0.5rem' : '1.25rem 1rem',
          borderBottom: '1px solid #381212',
          display: 'flex',
          alignItems: 'center',
          justifyContent: isCollapsed ? 'center' : 'space-between',
          flexShrink: 0,
        }}
      >
        {isCollapsed ? (
          <button
            type="button"
            onClick={toggleSidebar}
            title="Expand Sidebar"
            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}
          >
            <div style={{ width: 38, height: 38, borderRadius: '8px', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 2px 5px rgba(0,0,0,0.3)' }}>
              <img src="/app-icon.png" alt="Z" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            </div>
            <ChevronRight size={14} style={{ color: '#fbbf24' }} />
          </button>
        ) : (
          <>
            <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', alignItems: 'flex-start', justifyContent: 'center' }}>
              <img src="/banner.png" alt="Zamzam Foods" style={{ height: '42px', objectFit: 'contain', marginBottom: '0.35rem', marginLeft: '-4px' }} />
              <span style={{ fontSize: '0.78rem', color: '#fef08a', fontWeight: 700, whiteSpace: 'nowrap', letterSpacing: '0.03em' }}>
                Owner Dashboard
              </span>
            </div>
            <button
              type="button"
              onClick={toggleSidebar}
              className="sidebar-desktop-toggle"
              title="Collapse to Icons"
              style={{ background: 'none', border: 'none', color: '#fca5a5', cursor: 'pointer', padding: '6px', borderRadius: '6px', display: 'flex', alignItems: 'center', flexShrink: 0 }}
              onMouseEnter={e => (e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.1)')}
              onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'transparent')}
            >
              <ChevronLeft size={18} />
            </button>
          </>
        )}
      </div>

      {/* Navigation */}
      <nav style={{ flex: 1, padding: isCollapsed ? '0.75rem 0.4rem' : '0.75rem', overflowY: 'auto', overflowX: 'hidden' }}>
        <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
          {navItems.map((item) => {
            const Icon = item.icon;
            const [targetPath, targetQuery] = item.to.split('?');
            const isItemActive = (() => {
              if (location.pathname !== targetPath) return false;
              if (targetQuery) {
                return location.search === `?${targetQuery}`;
              }
              return !location.search || location.search === '';
            })();

            return (
              <li key={item.to} style={{ marginBottom: '0.2rem' }}>
                <NavLink
                  to={item.to}
                  end={item.end}
                  title={isCollapsed ? item.label : undefined}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: isCollapsed ? 'center' : 'flex-start',
                    gap: isCollapsed ? 0 : '0.7rem',
                    padding: isCollapsed ? '0.6rem 0' : '0.6rem 0.85rem',
                    borderRadius: 'var(--radius-md)',
                    fontSize: '0.86rem',
                    fontWeight: 600,
                    color: isItemActive ? 'var(--sidebar-text-active)' : 'var(--sidebar-text)',
                    backgroundColor: isItemActive ? 'var(--sidebar-hover)' : 'transparent',
                    borderLeft: isCollapsed ? 'none' : isItemActive ? '3px solid var(--brand-yellow)' : '3px solid transparent',
                    boxShadow: isCollapsed && isItemActive ? '0 0 0 2px var(--brand-yellow)' : undefined,
                    transition: 'all 0.13s ease',
                    whiteSpace: 'nowrap',
                    minHeight: '40px',
                  }}
                >
                  <Icon size={isCollapsed ? 20 : 18} style={{ flexShrink: 0 }} />
                  {!isCollapsed && <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.label}</span>}
                </NavLink>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Zentrix 24x7 Help Desk Card */}
      <ZentrixSidebarCard isCollapsed={isCollapsed} />

      {/* User Card */}
      <div style={{ padding: isCollapsed ? '0.75rem 0.4rem' : '0.85rem', borderTop: '1px solid #381212', background: 'rgba(0,0,0,0.3)', flexShrink: 0 }}>
        {isCollapsed ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem' }}>
            <div title={user?.first_name || user?.username} style={{ width: 32, height: 32, borderRadius: '50%', background: '#7f1d1d', color: '#fbbf24', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: '0.8rem', border: '1px solid #fbbf24' }}>
              {(user?.first_name || user?.username || 'O')[0].toUpperCase()}
            </div>
            <button type="button" onClick={handleLogout} title="Sign Out" style={{ color: '#fca5a5', padding: '0.35rem', background: 'none', border: 'none', cursor: 'pointer' }}>
              <LogOut size={16} />
            </button>
          </div>
        ) : (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem' }}>
            <div style={{ minWidth: 0 }}>
              <p style={{ color: 'white', fontSize: '0.84rem', fontWeight: 600, margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {user?.first_name || user?.username}
              </p>
              <span className="badge" style={{ background: '#5c1a0a', color: '#fbbf24', fontSize: '0.63rem', padding: '0.08rem 0.4rem', border: '1px solid #b45309', marginTop: '0.2rem' }}>
                OWNER
              </span>
            </div>
            <button type="button" onClick={handleLogout} title="Sign Out" style={{ color: '#fca5a5', padding: '0.4rem', background: 'none', border: 'none', cursor: 'pointer', flexShrink: 0 }}
              onMouseEnter={e => (e.currentTarget.style.color = '#ef4444')}
              onMouseLeave={e => (e.currentTarget.style.color = '#fca5a5')}
            >
              <LogOut size={18} />
            </button>
          </div>
        )}
      </div>
    </>
  );

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--bg-main)' }}>

      {/* Mobile Overlay */}
      {mobileOpen && (
        <div
          className="sidebar-overlay open"
          onClick={() => setMobileOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Sidebar */}
      <aside
        className={`manager-sidebar${mobileOpen ? ' mobile-open' : ''}`}
        style={{ width: sidebarWidth }}
        aria-label="Navigation"
      >
        {SidebarContent}
      </aside>

      {/* Main Content */}
      <div
        className="manager-main-area"
        style={{ marginLeft: sidebarWidth, flex: 1, display: 'flex', flexDirection: 'column', minHeight: '100vh' }}
      >
        {/* Top Bar */}
        <header className="manager-topbar">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', minWidth: 0 }}>
            {/* Hamburger for mobile */}
            <button
              type="button"
              className="sidebar-hamburger"
              onClick={() => setMobileOpen(true)}
              aria-label="Open navigation menu"
            >
              <Menu size={20} />
            </button>

            {/* Desktop collapse toggle */}
            <button
              type="button"
              onClick={toggleSidebar}
              className="btn btn-secondary btn-sm sidebar-desktop-toggle"
              title={isCollapsed ? 'Expand Sidebar' : 'Collapse Sidebar to Icons'}
              style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0.35rem 0.65rem', height: '34px', flexShrink: 0 }}
            >
              {isCollapsed ? <PanelLeftOpen size={16} /> : <PanelLeftClose size={16} />}
              <span className="sidebar-toggle-label" style={{ fontSize: '0.78rem', fontWeight: 700 }}>
                {isCollapsed ? 'Expand' : 'Icon Only'}
              </span>
            </button>

            <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              Business Intelligence & Operations
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexShrink: 0 }}>
            <button
              onClick={toggleTheme}
              className="btn btn-secondary btn-sm"
              title={`Switch to ${theme === 'light' ? 'Dark' : 'Light'} Mode`}
              style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', height: '34px', padding: '0.4rem 0.75rem' }}
            >
              {theme === 'light' ? <Moon size={15} /> : <Sun size={15} />}
              <span className="sidebar-toggle-label">{theme === 'light' ? 'Dark' : 'Light'}</span>
            </button>
            <span className="badge" style={{ background: '#5c1a0a', color: '#fbbf24', border: '1px solid #b45309', fontSize: '0.72rem' }}>
              OWNER
            </span>
          </div>
        </header>

        {/* Maintenance Mode Alert Banner for Owner */}
        {isMaintenanceMode && (
          <div style={{
            backgroundColor: '#dc2626',
            color: '#ffffff',
            padding: '0.65rem 1.25rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '0.75rem',
            fontSize: '0.86rem',
            fontWeight: 700,
            boxShadow: '0 2px 8px rgba(220, 38, 38, 0.25)',
            borderBottom: '2px solid #b91c1c',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
              <Wrench size={18} style={{ color: '#fef08a' }} />
              <span>
                ⚠️ MAINTENANCE MODE IS ACTIVE: Staff operations and online ordering are paused. Only Owners have access.
              </span>
            </div>
            <Link
              to="/owner/settings"
              style={{
                color: '#fef08a',
                textDecoration: 'underline',
                fontSize: '0.82rem',
                fontWeight: 800,
              }}
            >
              Turn Off in Settings &rarr;
            </Link>
          </div>
        )}

        {/* Page Content */}
        <main className="manager-page-content">
          <Outlet />
        </main>
      </div>

      {/* Zentrix 24x7 Help Desk Floating Widget */}
      <ZentrixHelpDeskWidget />
    </div>
  );
};
