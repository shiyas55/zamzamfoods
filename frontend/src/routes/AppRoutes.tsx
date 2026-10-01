import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { ProtectedRoute } from './ProtectedRoute';

// Layouts
import { OwnerLayout } from '../layouts/OwnerLayout';
import { ManagerLayout } from '../layouts/ManagerLayout';
import { DriverLayout } from '../layouts/DriverLayout';

// Auth Pages
import { LoginPage } from '../pages/auth/LoginPage';

// Owner Pages
import { OwnerDashboard } from '../pages/owner/OwnerDashboard';
import { CustomerShopsPage } from '../pages/owner/CustomerShopsPage';
import { CustomerDetailPage } from '../pages/owner/CustomerDetailPage';
import { ProductsPage } from '../pages/owner/ProductsPage';
import { RoutesPage } from '../pages/owner/RoutesPage';
import { DriversPage } from '../pages/owner/DriversPage';
import { OrdersPage } from '../pages/owner/OrdersPage';
import { DeliveriesPage } from '../pages/owner/DeliveriesPage';
import { ExpensesPage } from '../pages/owner/ExpensesPage';
import { PaymentsPage } from '../pages/owner/PaymentsPage';
import { CreditLedgerPage } from '../pages/owner/CreditLedgerPage';
import { ReportsPage } from '../pages/owner/ReportsPage';
import { StaffUsersPage } from '../pages/owner/StaffUsersPage';
import { DriverPerformancePage } from '../pages/owner/DriverPerformancePage';
import { ActivityHistoryPage } from '../pages/owner/ActivityHistoryPage';
import { SettingsPage } from '../pages/owner/SettingsPage';

// Manager Pages
import { ManagerDashboard } from '../pages/manager/ManagerDashboard';
import { CreateOrderPage } from '../pages/manager/CreateOrderPage';
import { DailyClosingPage } from '../pages/manager/DailyClosingPage';

// Customer Pages
import { CustomerOrderPage } from '../pages/customer/CustomerOrderPage';


// Driver Pages
import { DriverDashboard } from '../pages/driver/DriverDashboard';
import { DriverCollectPaymentPage } from '../pages/driver/DriverCollectPaymentPage';
import { DriverExpensesPage } from '../pages/driver/DriverExpensesPage';
import { DriverSummaryPage } from '../pages/driver/DriverSummaryPage';
import { DriverProfilePage } from '../pages/driver/DriverProfilePage';

export const AppRoutes: React.FC = () => {
  const { user, isAuthenticated, isLoading, status } = useAuth();

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
    if (user.role === 'DRIVER') return <Navigate to="/driver" replace />;
    if (user.role === 'MANAGER') return <Navigate to="/manager" replace />;
    return <Navigate to="/owner" replace />;
  };

  return (
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
        <Route path="deliveries" element={<DeliveriesPage />} />
        <Route path="expenses" element={<ExpensesPage />} />
        <Route path="payments" element={<PaymentsPage />} />
        <Route path="credit" element={<CreditLedgerPage />} />
        <Route path="drivers" element={<DriversPage />} />
        <Route path="daily-closing" element={<DailyClosingPage />} />
        <Route path="users" element={<StaffUsersPage />} />
        <Route path="settings" element={<SettingsPage />} />
      </Route>


      {/* 3. DRIVER MOBILE INTERFACE (PWA) */}
      <Route
        path="/driver"
        element={
          <ProtectedRoute allowedRoles={['DRIVER']}>
            <DriverLayout />
          </ProtectedRoute>
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
  );
};


