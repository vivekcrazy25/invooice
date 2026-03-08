import React from 'react';
import { HashRouter, Routes, Route } from 'react-router-dom';
import { ToastProvider } from './components/ToastContext.jsx';
import Sidebar            from './components/Sidebar.jsx';

import Dashboard        from './screens/Dashboard.jsx';
import BillingInvoice   from './screens/BillingInvoice.jsx';
import Inventory        from './screens/Inventory.jsx';
import VendorsPurchases from './screens/VendorsPurchases.jsx';
import Banking          from './screens/Banking.jsx';
import Expenses         from './screens/Expenses.jsx';
import Reports          from './screens/Reports.jsx';
import Settings         from './screens/Settings.jsx';

export default function App() {
  return (
    <HashRouter>
      <ToastProvider>
        <div className="flex h-screen overflow-hidden bg-gray-100">
          <Sidebar />
          <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
            <Routes>
              <Route path="/"          element={<Dashboard />} />
              <Route path="/billing"   element={<BillingInvoice />} />
              <Route path="/inventory" element={<Inventory />} />
              <Route path="/vendors"   element={<VendorsPurchases />} />
              <Route path="/banking"   element={<Banking />} />
              <Route path="/expenses"  element={<Expenses />} />
              <Route path="/reports"   element={<Reports />} />
              <Route path="/settings"  element={<Settings />} />
            </Routes>
          </div>
        </div>
      </ToastProvider>
    </HashRouter>
  );
}
