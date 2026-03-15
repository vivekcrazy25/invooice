import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  LayoutDashboard, FileText, Package,
  Users, Building2, DollarSign, BarChart3, Settings, LogOut, User,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';

const NAV = [
  { path: '/',          icon: LayoutDashboard, label: 'Dashboard',           perm: null              },
  { path: '/billing',   icon: FileText,        label: 'Billing & Invoice',   perm: 'access_billing'  },
  { path: '/inventory', icon: Package,         label: 'Inventory & Services',perm: 'access_inventory'},
  { path: '/vendors',   icon: Users,           label: 'Vendors & Purchases', perm: 'access_vendors'  },
  { path: '/banking',   icon: Building2,       label: 'Banking',             perm: 'access_banking'  },
  { path: '/expenses',  icon: DollarSign,      label: 'Expenses',            perm: 'access_expenses' },
  { path: '/reports',   icon: BarChart3,       label: 'Reports',             perm: 'access_reports'  },
  { path: '/settings',  icon: Settings,        label: 'Settings',            perm: 'access_settings' },
];

export default function Sidebar() {
  const navigate  = useNavigate();
  const { pathname } = useLocation();
  const { currentUser, logout, hasPermission } = useAuth();
  const [company, setCompany] = useState({});

  useEffect(() => {
    async function loadCompany() {
      try {
        const c = await window.db.settings.getCompanyProfile();
        setCompany(c || {});
      } catch (e) {
        console.error('Failed to load company profile', e);
      }
    }
    loadCompany();

    const handleCompanyUpdate = () => loadCompany();
    window.addEventListener('companyProfileUpdated', handleCompanyUpdate);
    return () => window.removeEventListener('companyProfileUpdated', handleCompanyUpdate);
  }, []);

  const isActive = (path) =>
    path === '/' ? pathname === '/' : pathname.startsWith(path);

  // Filter nav items by permission
  const visibleNav = NAV.filter(({ perm }) => !perm || hasPermission(perm));

  // Build initials for current user avatar
  const userInitials = (() => {
    if (!currentUser?.name) return '';
    const parts = currentUser.name.trim().split(' ');
    return parts.length >= 2
      ? (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
      : currentUser.name.slice(0, 2).toUpperCase();
  })();

  const handleLogout = () => {
    logout();
  };

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
          <p className="text-white font-bold text-sm leading-tight truncate">
            {company.company_name || 'Accounting'}
          </p>
          <p className="text-gray-400 text-xs leading-tight">Pro</p>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 py-3 overflow-y-auto overflow-x-hidden">
        {visibleNav.map(({ path, icon: Icon, label }) => {
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

      {/* User info + logout */}
      <div className="px-3 py-3 border-t border-white/10 flex-shrink-0">
        <div className="flex items-center gap-2.5 mb-2">
          <div className="w-7 h-7 rounded-full bg-white/20 flex items-center justify-center flex-shrink-0">
            {userInitials
              ? <span className="text-white text-[10px] font-bold">{userInitials}</span>
              : <User size={12} className="text-white"/>
            }
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-white text-xs font-semibold truncate">
              {currentUser?.name || currentUser?.email || 'User'}
            </p>
            <p className="text-gray-400 text-[10px] truncate">{currentUser?.role}</p>
          </div>
          <button
            onClick={handleLogout}
            title="Sign out"
            className="text-gray-400 hover:text-white transition-colors flex-shrink-0 p-1 rounded hover:bg-white/10"
          >
            <LogOut size={13}/>
          </button>
        </div>
        <p className="text-xs text-gray-600">Version 1.0.0</p>
      </div>
    </aside>
  );
}
