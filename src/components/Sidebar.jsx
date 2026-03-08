import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  LayoutDashboard, FileText, Package,
  Users, Building2, DollarSign, BarChart3, Settings,
} from 'lucide-react';

const NAV = [
  { path: '/',          icon: LayoutDashboard, label: 'Dashboard' },
  { path: '/billing',   icon: FileText,        label: 'Billing & Invoice' },
  { path: '/inventory', icon: Package,         label: 'Inventory & Services' },
  { path: '/vendors',   icon: Users,           label: 'Vendors & Purchases' },
  { path: '/banking',   icon: Building2,       label: 'Banking' },
  { path: '/expenses',  icon: DollarSign,      label: 'Expenses' },
  { path: '/reports',   icon: BarChart3,       label: 'Reports' },
  { path: '/settings',  icon: Settings,        label: 'Settings' },
];

export default function Sidebar() {
  const navigate  = useNavigate();
  const { pathname } = useLocation();
  const [company, setCompany] = useState({});

  useEffect(() => {
    async function loadCompany() {
      try {
        const c = await window.db.settings.getCompanyProfile();
        console.log('Loaded company data in Sidebar:', c);
        console.log('Logo data length:', c?.logo?.length || 'no logo');
        setCompany(c || {});
      } catch (e) {
        console.error('Failed to load company profile', e);
      }
    }
    loadCompany();

    // Listen for company profile updates
    const handleCompanyUpdate = () => {
      console.log('Company profile update event received in Sidebar');
      loadCompany();
    };
    window.addEventListener('companyProfileUpdated', handleCompanyUpdate);

    return () => {
      window.removeEventListener('companyProfileUpdated', handleCompanyUpdate);
    };
  }, []);

  const isActive = (path) =>
    path === '/' ? pathname === '/' : pathname.startsWith(path);

  return (
    <aside
      className="flex flex-col h-full bg-gray-900 overflow-hidden"
      style={{ width: 192, minWidth: 192 }}
    >
      {/* Logo */}
      <div className="flex items-center gap-3 px-4 py-5 border-b border-white/10 flex-shrink-0">
        <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center flex-shrink-0 overflow-hidden">
          {company.logo ? (
            <img src={company.logo} alt="Company Logo" className="w-full h-full object-cover" />
          ) : (
            <span className="text-gray-900 font-black text-[11px] leading-none">AP</span>
          )}
        </div>
        <div className="min-w-0">
          <p className="text-white font-bold text-sm leading-tight">
            {company.company_name || 'Accounting'}
          </p>
          <p className="text-gray-400 text-xs leading-tight">
            {company.company_name ? 'Pro' : 'Pro'}
          </p>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 py-3 overflow-y-auto overflow-x-hidden">
        {NAV.map(({ path, icon: Icon, label }) => {
          const active = isActive(path);
          return (
            <button
              key={path}
              onClick={() => navigate(path)}
              className={`
                w-full flex items-center gap-3 px-4 py-2.5 text-left text-sm
                transition-all duration-150 border-l-2
                ${active
                  ? 'bg-white/10 text-white border-white'
                  : 'text-gray-400 hover:text-white hover:bg-white/5 border-transparent'}
              `}
            >
              <Icon size={16} className="flex-shrink-0" />
              <span className="truncate">{label}</span>
            </button>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="px-4 py-3 border-t border-white/10 flex-shrink-0">
        <p className="text-xs text-gray-500">Version 1.0.0</p>
      </div>
    </aside>
  );
}
