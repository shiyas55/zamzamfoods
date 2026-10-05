import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useSettings } from '../context/SettingsContext';
import { ProtectedRoute } from './ProtectedRoute';

// Layouts
import { OwnerLayout } from '../layouts/OwnerLayout';
import { ManagerLayout } from '../layouts/ManagerLayout';
import { DriverLayout } from '../layouts/DriverLayout';

// Auth Pages (Lazy)
const LoginPage = React.lazy(() => import('../pages/auth/LoginPage').then(m => ({ default: m.LoginPage })));

// Owner Pages (Lazy)
const OwnerDashboard = React.lazy(() => import('../pages/owner/OwnerDashboard').then(m => ({ default: m.OwnerDashboard })));
const CustomerShopsPage = React.lazy(() => import('../pages/owner/CustomerShopsPage').then(m => ({ default: m.CustomerShopsPage })));
const CustomerDetailPage = React.lazy(() => import('../pages/owner/CustomerDetailPage').then(m => ({ default: m.CustomerDetailPage })));
const ProductsPage = React.lazy(() => import('../pages/owner/ProductsPage').then(m => ({ default: m.ProductsPage })));
const RoutesPage = React.lazy(() => import('../pages/owner/RoutesPage').then(m => ({ default: m.RoutesPage })));
const DriversPage = React.lazy(() => import('../pages/owner/DriversPage').then(m => ({ default: m.DriversPage })));
const OrdersPage = React.lazy(() => import('../pages/owner/OrdersPage').then(m => ({ default: m.OrdersPage })));
const DeliveriesPage = React.lazy(() => import('../pages/owner/DeliveriesPage').then(m => ({ default: m.DeliveriesPage })));
const ExpensesPage = React.lazy(() => import('../pages/owner/ExpensesPage').then(m => ({ default: m.ExpensesPage })));
const PaymentsPage = React.lazy(() => import('../pages/owner/PaymentsPage').then(m => ({ default: m.PaymentsPage })));
const CreditLedgerPage = React.lazy(() => import('../pages/owner/CreditLedgerPage').then(m => ({ default: m.CreditLedgerPage })));
const ReportsPage = React.lazy(() => import('../pages/owner/ReportsPage').then(m => ({ default: m.ReportsPage })));
const StaffUsersPage = React.lazy(() => import('../pages/owner/StaffUsersPage').then(m => ({ default: m.StaffUsersPage })));
const DriverPerformancePage = React.lazy(() => import('../pages/owner/DriverPerformancePage').then(m => ({ default: m.DriverPerformancePage })));
const ActivityHistoryPage = React.lazy(() => import('../pages/owner/ActivityHistoryPage').then(m => ({ default: m.ActivityHistoryPage })));
const SettingsPage = React.lazy(() => import('../pages/owner/SettingsPage').then(m => ({ default: m.SettingsPage })));
const ShopDocumentsPage = React.lazy(() => import('../pages/owner/ShopDocumentsPage').then(m => ({ default: m.ShopDocumentsPage })));

// Manager Pages (Lazy)
const ManagerDashboard = React.lazy(() => import('../pages/manager/ManagerDashboard').then(m => ({ default: m.ManagerDashboard })));
const CreateOrderPage = React.lazy(() => import('../pages/manager/CreateOrderPage').then(m => ({ default: m.CreateOrderPage })));
const DailyClosingPage = React.lazy(() => import('../pages/manager/DailyClosingPage').then(m => ({ default: m.DailyClosingPage })));

// Customer Pages (Lazy)
const CustomerOrderPage = React.lazy(() => import('../pages/customer/CustomerOrderPage').then(m => ({ default: m.CustomerOrderPage })));

// Driver Pages (Lazy)
const DriverDashboard = React.lazy(() => import('../pages/driver/DriverDashboard').then(m => ({ default: m.DriverDashboard })));
const DriverCollectPaymentPage = React.lazy(() => import('../pages/driver/DriverCollectPaymentPage').then(m => ({ default: m.DriverCollectPaymentPage })));
const DriverExpensesPage = React.lazy(() => import('../pages/driver/DriverExpensesPage').then(m => ({ default: m.DriverExpensesPage })));
const DriverSummaryPage = React.lazy(() => import('../pages/driver/DriverSummaryPage').then(m => ({ default: m.DriverSummaryPage })));
const DriverProfilePage = React.lazy(() => import('../pages/driver/DriverProfilePage').then(m => ({ default: m.DriverProfilePage })));

const PageLoadingFallback: React.FC = () => (
  <div style={{ display: 'flex', minHeight: '60vh', alignItems: 'center', justifyContent: 'center' }}>
    <div className="spinner" />
  </div>
);

export const AppRoutes: React.FC = () => {
  const { user, isAuthenticated, isLoading, status } = useAuth();
  const { isDriverModuleEnabled } = useSettings();

  if (isLoading || status === 'INITIALIZING') {
    return (
      <div style={{ display: 'flex', minHeight: '100vh', alignItems: 'center', justifyContent: 'center' }}>
        <div className="spinner" />
      </div>
    );
  }

  // Root redirect helper
  const getHomeRedirect = () => {
    if (status === 'UNAUTHENTICATED' || !isAuthenticated || !user) return <Navigate to="/login" replace />;
    if (user.role === 'DRIVER') {
      if (!isDriverModuleEnabled) return <Navigate to="/login?error=driver_disabled" replace />;
      return <Navigate to="/driver" replace />;
    }
    if (user.role === 'MANAGER') return <Navigate to="/manager" replace />;
    return <Navigate to="/owner" replace />;
  };

  return (
    <React.Suspense fallback={<PageLoadingFallback />}>
      <Routes>
        {/* Public Routes */}
        <Route path="/login" element={isAuthenticated ? getHomeRedirect() : <LoginPage />} />
        <Route path="/customer/:customerId" element={<CustomerOrderPage />} />
        <Route path="/" element={getHomeRedirect()} />

        {/* 1. OWNER / ADMIN INTERFACE */}
        <Route
          path="/owner"
          element={
            <ProtectedRoute allowedRoles={['OWNER']}>
              <OwnerLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<OwnerDashboard />} />
          <Route path="driver-performance" element={<DriverPerformancePage />} />
          <Route path="customers" element={<CustomerShopsPage />} />
          <Route path="customers/:id" element={<CustomerDetailPage />} />
          <Route path="shop-documents" element={<ShopDocumentsPage />} />
          <Route path="products" element={<ProductsPage />} />
          <Route path="routes" element={<RoutesPage />} />
          <Route path="drivers" element={<DriversPage />} />
          <Route path="create-order" element={<CreateOrderPage />} />
          <Route path="orders" element={<OrdersPage />} />
          <Route path="deliveries" element={<DeliveriesPage />} />
          <Route path="expenses" element={<ExpensesPage />} />
          <Route path="payments" element={<PaymentsPage />} />
          <Route path="credit" element={<CreditLedgerPage />} />
          <Route path="reports" element={<ReportsPage />} />
          <Route path="daily-closing" element={<DailyClosingPage />} />
          <Route path="activity-history" element={<ActivityHistoryPage />} />
          <Route path="attendance" element={<StaffUsersPage defaultTab="attendance" />} />
          <Route path="users" element={<StaffUsersPage />} />
          <Route path="settings" element={<SettingsPage />} />
        </Route>

        {/* 2. MANAGER INTERFACE */}
        <Route
          path="/manager"
          element={
            <ProtectedRoute allowedRoles={['MANAGER', 'OWNER']}>
              <ManagerLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<ManagerDashboard />} />
          <Route path="driver-performance" element={<DriverPerformancePage />} />
          <Route path="create-order" element={<CreateOrderPage />} />
          <Route path="orders" element={<OrdersPage />} />
          <Route path="customers" element={<CustomerShopsPage />} />
          <Route path="customers/:id" element={<CustomerDetailPage />} />
          <Route path="shop-documents" element={<ShopDocumentsPage />} />
          <Route path="deliveries" element={<DeliveriesPage />} />
          <Route path="expenses" element={<ExpensesPage />} />
          <Route path="payments" element={<PaymentsPage />} />
          <Route path="credit" element={<CreditLedgerPage />} />
          <Route path="drivers" element={<DriversPage />} />
          <Route path="daily-closing" element={<DailyClosingPage />} />
          <Route path="attendance" element={<StaffUsersPage defaultTab="attendance" />} />
          <Route path="users" element={<StaffUsersPage />} />
          <Route path="settings" element={<SettingsPage />} />
        </Route>

        {/* 3. DRIVER MOBILE INTERFACE (PWA) */}
        <Route
          path="/driver"
          element={
            isDriverModuleEnabled ? (
              <ProtectedRoute allowedRoles={['DRIVER']}>
                <DriverLayout />
              </ProtectedRoute>
            ) : (
              <Navigate to="/login?error=driver_disabled" replace />
            )
          }
        >
          <Route index element={<DriverDashboard />} />
          <Route path="collect" element={<DriverCollectPaymentPage />} />
          <Route path="expenses" element={<DriverExpensesPage />} />
          <Route path="summary" element={<DriverSummaryPage />} />
          <Route path="profile" element={<DriverProfilePage />} />
        </Route>

        {/* Catch-all redirect */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </React.Suspense>
  );
};


