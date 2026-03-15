import React from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ToastProvider } from './components/ToastContext.jsx';
import { AuthProvider, useAuth } from './context/AuthContext.jsx';
import { NotificationProvider } from './context/NotificationContext.jsx';
import { ThemeProvider } from './context/ThemeContext.jsx';
import Sidebar            from './components/Sidebar.jsx';
import Login              from './screens/Login.jsx';

import Dashboard        from './screens/Dashboard.jsx';
import BillingInvoice   from './screens/BillingInvoice.jsx';
import Inventory        from './screens/Inventory.jsx';
import VendorsPurchases from './screens/VendorsPurchases.jsx';
import Banking          from './screens/Banking.jsx';
import Expenses         from './screens/Expenses.jsx';
import Reports          from './screens/Reports.jsx';
import Settings         from './screens/Settings.jsx';

/* ── Guard: redirect to dashboard if permission missing ── */
function RequirePermission({ permKey, children }) {
  const { hasPermission } = useAuth();
  if (!hasPermission(permKey)) return <Navigate to="/" replace />;
  return children;
}

function AppShell() {
  const { currentUser } = useAuth();

  if (!currentUser) {
    return <Login />;
  }

  return (
    <div className="flex h-screen overflow-hidden bg-gray-100">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <Routes>
          <Route path="/"          element={<Dashboard />} />
          <Route path="/billing"   element={
            <RequirePermission permKey="access_billing"><BillingInvoice /></RequirePermission>
          }/>
          <Route path="/inventory" element={
            <RequirePermission permKey="access_inventory"><Inventory /></RequirePermission>
          }/>
          <Route path="/vendors"   element={
            <RequirePermission permKey="access_vendors"><VendorsPurchases /></RequirePermission>
          }/>
          <Route path="/banking"   element={
            <RequirePermission permKey="access_banking"><Banking /></RequirePermission>
          }/>
          <Route path="/expenses"  element={
            <RequirePermission permKey="access_expenses"><Expenses /></RequirePermission>
          }/>
          <Route path="/reports"   element={
            <RequirePermission permKey="access_reports"><Reports /></RequirePermission>
          }/>
          <Route path="/settings"  element={
            <RequirePermission permKey="access_settings"><Settings /></RequirePermission>
          }/>
        </Routes>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <HashRouter>
      <AuthProvider>
        <ThemeProvider>
          <ToastProvider>
            <NotificationProvider>
              <AppShell />
            </NotificationProvider>
          </ToastProvider>
        </ThemeProvider>
      </AuthProvider>
    </HashRouter>
  );
}
