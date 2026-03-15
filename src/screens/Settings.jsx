import React, { useState, useEffect, useCallback } from 'react';
import {
  Building2, Users, Lock, Database,
  Plus, Edit2, Trash2, Eye, EyeOff, Save, Upload, Trash, Shield,
  TrendingUp, TrendingDown, Wallet, Search, Filter, Download, Info,
} from 'lucide-react';
import TopBar        from '../components/TopBar.jsx';
import DataTable     from '../components/DataTable.jsx';
import Modal         from '../components/Modal.jsx';
import ConfirmDialog from '../components/ConfirmDialog.jsx';
import FormInput     from '../components/FormInput.jsx';
import FormSelect    from '../components/FormSelect.jsx';
import { useToast }  from '../components/ToastContext.jsx';
import { useAuth, ALL_PERMISSIONS, PERMISSION_LABELS, ROLE_DEFAULTS } from '../context/AuthContext.jsx';
import { useTheme } from '../context/ThemeContext.jsx';

const TABS = [
  { key:'company', label:'Company Profile', icon: Building2  },
  { key:'accounts',label:'Accounts Chart',  icon: Database   },
  { key:'users',   label:'User Management', icon: Users      },
  { key:'backup',  label:'Backup & Security',  icon: Lock    },
];

const ROLES = ['Owner','Accountant','Billing Operator'];
const EMPTY_USER = { name:'', email:'', phone:'', role:'Accountant', password:'', branch_id:'' };
const ACC_TYPES  = ['Cash','Bank','Capital','Sales','Purchase','Expense','Asset','Liability','Equity','Revenue'];
const EMPTY_ACC  = { account_code:'', account_name:'', account_type:'', description:'', opening_balance: 0, as_of_date: '' };

const ACC_TYPE_COLORS = {
  Cash:      'bg-blue-50 text-blue-600',
  Bank:      'bg-blue-50 text-blue-600',
  Capital:   'bg-green-50 text-green-700',
  Sales:     'bg-amber-50 text-amber-600',
  Purchase:  'bg-orange-50 text-orange-600',
  Expense:   'bg-red-50 text-red-600',
  Asset:     'bg-emerald-50 text-emerald-700',
  Liability: 'bg-rose-50 text-rose-600',
  Equity:    'bg-indigo-50 text-indigo-600',
  Revenue:   'bg-teal-50 text-teal-600',
};

const AVATAR_PALETTE = [
  'bg-blue-100 text-blue-700',
  'bg-green-100 text-green-700',
  'bg-orange-100 text-orange-700',
  'bg-purple-100 text-purple-700',
  'bg-amber-100 text-amber-700',
  'bg-pink-100 text-pink-700',
  'bg-teal-100 text-teal-700',
  'bg-indigo-100 text-indigo-700',
];
const avatarColor = (name = '') => AVATAR_PALETTE[(name.charCodeAt(0) || 0) % AVATAR_PALETTE.length];

export default function Settings() {
  const toast = useToast();
  const { currentUser, hasPermission } = useAuth();
  const { dark, toggleDark } = useTheme();
  const isOwner = currentUser?.role === 'Owner' || currentUser?.role === 'Admin';
  const [tab, setTab] = useState('company');

  /* ── company ── */
  const [company,  setCompany]  = useState({});
  const [cSaving,  setCSaving]  = useState(false);

  /* ── users ── */
  const [users,      setUsers]      = useState([]);
  const [showUser,   setShowUser]   = useState(false);
  const [editUser,   setEditUser]   = useState(null);
  const [deleteUser, setDeleteUser] = useState(null);
  const [userForm,   setUserForm]   = useState(EMPTY_USER);
  const [uErrors,    setUErrors]    = useState({});
  const [showPwd,    setShowPwd]    = useState(false);
  const [userSearch, setUserSearch] = useState('');

  /* ── permissions ── */
  const [permUser,   setPermUser]   = useState(null);   // user being edited
  const [permMap,    setPermMap]    = useState({});      // { permKey: bool }
  const [showPerms,  setShowPerms]  = useState(false);
  const [permSaving, setPermSaving] = useState(false);

  /* ── coa ── */
  const [accounts,   setAccounts]  = useState([]);
  const [showCoa,    setShowCoa]   = useState(false);
  const [editCoa,    setEditCoa]   = useState(null);
  const [coaForm,    setCoaForm]   = useState(EMPTY_ACC);
  const [cErrors,    setCErrors]   = useState({});
  const [coaSearch,  setCoaSearch] = useState('');

  /* ── prefs ── */
  const [prefs,   setPrefs]   = useState({});
  const [pSaving, setPSaving] = useState(false);

  /* ── load ── */
  const load = useCallback(async () => {
    try {
      if (tab === 'company') {
        const c = await window.db.settings.getCompanyProfile();
        setCompany(c || {});
      } else if (tab === 'users') {
        const u = await window.db.settings.getUsers();
        setUsers(u || []);
      } else if (tab === 'accounts') {
        const a = await window.db.settings.getChartOfAccounts();
        setAccounts(a || []);
      } else if (tab === 'backup') {
        // Backup & Security tab - handle separately
      }
    } catch { toast('Failed to load settings', 'error'); }
  }, [tab]);

  useEffect(() => { load(); }, [load]);

  /* ═══════════════════════════
     COMPANY PROFILE
  ═══════════════════════════ */
  const setC = (k,v) => setCompany(c => ({ ...c, [k]: v }));

  const saveCompany = async () => {
    if (!company.company_name?.trim()) { toast('Company name is required', 'warning'); return; }
    console.log('Saving company profile:', company);
    console.log('Logo data length:', company.logo?.length || 'no logo');
    setCSaving(true);
    try {
      await window.db.settings.updateCompanyProfile(company);
      console.log('Company profile saved successfully');
      toast('Company profile saved');
      // Dispatch custom event to notify other components
      window.dispatchEvent(new CustomEvent('companyProfileUpdated'));
    } catch (error) {
      console.error('Error saving company profile:', error);
      toast('Failed to save company profile', 'error');
    }
    setCSaving(false);
  };

  const handleLogoUpload = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      console.log('Logo file selected:', file.name, file.size, 'bytes');
      const reader = new FileReader();
      reader.onload = (event) => {
        console.log('Logo converted to data URL, length:', event.target.result.length);
        setC('logo', event.target.result);
        console.log('Logo set in state');
      };
      reader.readAsDataURL(file);
    }
  };

  const removeLogo = () => {
    setC('logo', null);
  };

  const CompanyTab = () => (
    <div className="max-w-3xl space-y-6">
      {/* Company Logo Section */}
      <div className="bg-white rounded-2xl border border-gray-100 p-8">
        <h3 className="font-bold text-gray-900 text-lg mb-6">Company Logo</h3>
        <p className="text-sm text-gray-600 mb-6">Upload your company logo for invoices and reports. Recommended size: 512×512px (PNG, SVG or JPG).</p>
        
        <div className="flex items-start gap-6">
          {/* Logo Preview */}
          <div className="relative w-40 h-40 bg-gray-50 border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center">
            {company.logo ? (
              <img src={company.logo} alt="Company Logo" className="max-w-full max-h-full object-contain" />
            ) : (
              <div className="text-center">
                <div className="text-4xl text-gray-300 mb-2">🖼️</div>
                <p className="text-xs text-gray-400 font-medium">No Logo</p>
              </div>
            )}
          </div>

          {/* Upload Buttons */}
          <div className="flex flex-col gap-3">
            <label>
              <input
                type="file"
                accept="image/*"
                onChange={handleLogoUpload}
                className="hidden"
              />
              <button
                onClick={(e) => e.currentTarget.previousSibling.click()}
                className="flex items-center gap-2 bg-gray-900 text-white px-4 py-2.5 rounded-lg text-sm font-semibold
                           hover:bg-gray-800 transition-colors shadow-sm">
                <Upload size={14}/> Upload New Logo
              </button>
            </label>
            {company.logo && (
              <button
                onClick={removeLogo}
                className="flex items-center gap-2 bg-red-50 text-red-600 px-4 py-2.5 rounded-lg text-sm font-semibold
                           hover:bg-red-100 transition-colors">
                <Trash size={14}/> Remove
              </button>
            )}
          </div>
        </div>
      </div>

      {/* General Information Section */}
      <div className="bg-white rounded-2xl border border-gray-100 p-8">
        <h3 className="font-bold text-gray-900 text-lg mb-6">General Information</h3>
        
        <div className="space-y-5">
          {/* Company Name */}
          <div>
            <label className="text-sm font-semibold text-gray-700 block mb-2">Company Name</label>
            <input
              type="text"
              value={company.company_name || ''}
              onChange={(e) => setC('company_name', e.target.value)}
              placeholder="Acme Global Solutions Inc."
              className="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-300"
            />
          </div>

          {/* Mobile Number and Email */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-semibold text-gray-700 block mb-2">Mobile Number</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value="+1"
                  disabled
                  className="w-14 px-3 py-2.5 border border-gray-200 rounded-lg text-sm bg-gray-50 text-center"
                />
                <input
                  type="tel"
                  value={company.phone || ''}
                  onChange={(e) => setC('phone', e.target.value)}
                  placeholder="(212) 555-0198"
                  className="flex-1 px-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-300"
                />
              </div>
            </div>
            <div>
              <label className="text-sm font-semibold text-gray-700 block mb-2">Email Address</label>
              <input
                type="email"
                value={company.email || ''}
                onChange={(e) => setC('email', e.target.value)}
                placeholder="finance@acme-global.com"
                className="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-300"
              />
            </div>
          </div>

          {/* Address */}
          <div>
            <label className="text-sm font-semibold text-gray-700 block mb-2">Address</label>
            <textarea
              value={company.address || ''}
              onChange={(e) => setC('address', e.target.value)}
              placeholder="1234 Enterprise Way, Suite 500"
              rows={3}
              className="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm resize-none focus:outline-none focus:ring-2 focus:ring-gray-300"
            />
          </div>

          {/* City, State, Country */}
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="text-sm font-semibold text-gray-700 block mb-2">City</label>
              <input
                type="text"
                value={company.city || ''}
                onChange={(e) => setC('city', e.target.value)}
                placeholder="New York"
                className="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-300"
              />
            </div>
            <div>
              <label className="text-sm font-semibold text-gray-700 block mb-2">State</label>
              <input
                type="text"
                value={company.state || ''}
                onChange={(e) => setC('state', e.target.value)}
                placeholder="NY"
                className="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-300"
              />
            </div>
            <div>
              <label className="text-sm font-semibold text-gray-700 block mb-2">Country</label>
              <input
                type="text"
                value={company.country || ''}
                onChange={(e) => setC('country', e.target.value)}
                placeholder="United States"
                className="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-300"
              />
            </div>
          </div>

          {/* GST/Tax Number and Website */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-semibold text-gray-700 block mb-2">GST / Tax Number</label>
              <input
                type="text"
                value={company.gstin || ''}
                onChange={(e) => setC('gstin', e.target.value)}
                placeholder="Tax registration number"
                className="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-300"
              />
            </div>
            <div>
              <label className="text-sm font-semibold text-gray-700 block mb-2">Website</label>
              <input
                type="url"
                value={company.website || ''}
                onChange={(e) => setC('website', e.target.value)}
                placeholder="https://www.acme-global.com"
                className="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-300"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Invoice Settings */}
      <div className="bg-white rounded-2xl border border-gray-100 p-8">
        <h3 className="font-bold text-gray-900 text-lg mb-6">Invoice Settings</h3>
        
        <div className="space-y-5">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-semibold text-gray-700 block mb-2">Invoice Prefix</label>
              <input
                type="text"
                value={company.invoice_prefix || 'INV'}
                onChange={(e) => setC('invoice_prefix', e.target.value)}
                placeholder="INV"
                className="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-300"
              />
            </div>
            <div>
              <label className="text-sm font-semibold text-gray-700 block mb-2">Currency Symbol</label>
              <input
                type="text"
                value={company.currency || '$'}
                onChange={(e) => setC('currency', e.target.value)}
                placeholder="$"
                className="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-300"
              />
            </div>
          </div>

          <div>
            <label className="text-sm font-semibold text-gray-700 block mb-2">Invoice Footer / Terms</label>
            <textarea
              rows={3}
              value={company.invoice_footer || ''}
              onChange={(e) => setC('invoice_footer', e.target.value)}
              placeholder="Thank you for your business…"
              className="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm resize-none focus:outline-none focus:ring-2 focus:ring-gray-300"
            />
          </div>
        </div>
      </div>

      {/* Save Cancel Buttons */}
      <div className="flex justify-end gap-3">
        <button
          className="px-6 py-2.5 border border-gray-200 rounded-lg text-sm font-semibold text-gray-700
                     hover:bg-gray-50 transition-colors">
          Cancel
        </button>
        <button
          onClick={saveCompany}
          disabled={cSaving}
          className="flex items-center gap-2 bg-gray-900 text-white px-6 py-2.5 rounded-lg text-sm font-semibold
                     hover:bg-gray-800 transition-colors disabled:opacity-50">
          <Save size={14}/> {cSaving ? 'Saving…' : 'Save'}
        </button>
      </div>
    </div>
  );

  /* ═══════════════════════════
     USER MANAGEMENT
  ═══════════════════════════ */
  const openAddUser = () => {
    setEditUser(null);
    setUserForm(EMPTY_USER);
    setUErrors({});
    setShowPwd(false);
    setShowUser(true);
  };

  const openEditUser = (row) => {
    setEditUser(row);
    setUserForm({ ...row, password:'' });
    setUErrors({});
    setShowPwd(false);
    setShowUser(true);
  };

  const validateUser = () => {
    const e = {};
    if (!userForm.name.trim())   e.name  = 'Name is required';
    if (!userForm.email.trim())  e.email = 'Email is required';
    if (!editUser && !userForm.password.trim()) e.password = 'Password is required for new users';
    if (!editUser && userForm.password.length < 6) e.password = 'Minimum 6 characters';
    setUErrors(e);
    return Object.keys(e).length === 0;
  };

  const saveUser = async () => {
    if (!validateUser()) return;
    try {
      if (editUser) {
        await window.db.settings.updateUser(editUser.id, userForm);
        toast('User updated');
      } else {
        await window.db.settings.addUser(userForm);
        toast('User added');
      }
      setShowUser(false);
      load();
    } catch (err) { toast(err?.message || 'Failed to save user', 'error'); }
  };

  const handleDeleteUser = async () => {
    try {
      await window.db.settings.deleteUser(deleteUser);
      toast('User deleted');
      setDeleteUser(null);
      load();
    } catch { toast('Cannot delete the last admin', 'error'); setDeleteUser(null); }
  };

  /* ── permissions handlers ── */
  const openPerms = async (row) => {
    try {
      const perms = await window.db.settings.getUserPermissions(row.id);
      // Merge with role defaults for any missing keys
      const defaults = ROLE_DEFAULTS[row.role] || ROLE_DEFAULTS['Staff'];
      const merged = {};
      for (const p of ALL_PERMISSIONS) merged[p] = p in perms ? perms[p] : (defaults[p] ?? false);
      setPermUser(row);
      setPermMap(merged);
      setShowPerms(true);
    } catch {
      toast('Failed to load permissions', 'error');
    }
  };

  const savePerms = async () => {
    if (!permUser) return;
    setPermSaving(true);
    try {
      await window.db.settings.updateUserPermissions(permUser.id, permMap);
      toast(`Permissions updated for ${permUser.name}`);
      setShowPerms(false);
    } catch {
      toast('Failed to save permissions', 'error');
    }
    setPermSaving(false);
  };

  const toggleUserStatus = async (row) => {
    const newStatus = row.status === 'Active' ? 'Inactive' : 'Active';
    try {
      await window.db.settings.toggleUserStatus(row.id, newStatus);
      setUsers(u => u.map(x => x.id === row.id ? { ...x, status: newStatus } : x));
    } catch { toast('Failed to update status', 'error'); }
  };

  const ROLE_BADGE = {
    Owner:             'border border-blue-400 text-blue-600 bg-blue-50',
    Accountant:        'border border-gray-300 text-gray-600 bg-white',
    'Billing Operator':'border border-gray-300 text-gray-600 bg-white',
    Admin:             'border border-purple-400 text-purple-600 bg-purple-50',
    Staff:             'border border-gray-300 text-gray-500 bg-white',
  };

  const UsersTab = () => {
    const q = userSearch.toLowerCase();
    const visible = users.filter(u =>
      !q || u.name?.toLowerCase().includes(q) ||
            u.email?.toLowerCase().includes(q) ||
            u.role?.toLowerCase().includes(q)
    );
    return (
      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">

        {/* Toolbar */}
        <div className="flex items-center gap-3 px-5 py-4">
          <div className="relative flex-1 max-w-sm">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              value={userSearch}
              onChange={e => setUserSearch(e.target.value)}
              placeholder="Search users by name, email, or role..."
              className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-200 bg-gray-50"
            />
          </div>
          <button onClick={openAddUser}
            className="ml-auto flex items-center gap-2 bg-gray-900 text-white px-4 py-2.5 rounded-lg text-sm font-semibold hover:bg-gray-800">
            <Plus size={14}/> Add New User
          </button>
        </div>

        {/* Table */}
        <table className="w-full text-sm">
          <thead>
            <tr className="border-t border-b border-gray-100">
              <th className="px-5 py-2.5 text-left text-[11px] font-semibold text-gray-400 tracking-wider uppercase">User Name</th>
              <th className="px-4 py-2.5 text-left text-[11px] font-semibold text-gray-400 tracking-wider uppercase">Mobile Number</th>
              <th className="px-4 py-2.5 text-left text-[11px] font-semibold text-gray-400 tracking-wider uppercase">Role</th>
              <th className="px-4 py-2.5 text-left text-[11px] font-semibold text-gray-400 tracking-wider uppercase">Status</th>
              <th className="px-4 py-2.5 text-center text-[11px] font-semibold text-gray-400 tracking-wider uppercase">Actions</th>
            </tr>
          </thead>
          <tbody>
            {visible.length === 0 && (
              <tr><td colSpan={5} className="px-5 py-10 text-center text-gray-400">No users found.</td></tr>
            )}
            {visible.map(row => {
              const initials = (row.name || '?').split(' ').map(w=>w[0]).join('').slice(0,2).toUpperCase();
              const avatarCls = avatarColor(row.name || '');
              const isActive  = row.status === 'Active';
              const roleCls   = ROLE_BADGE[row.role] || ROLE_BADGE['Staff'];
              return (
                <tr key={row.id} className="border-t border-gray-50 hover:bg-gray-50/50 transition-colors">
                  {/* User Name */}
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-3">
                      <div className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${avatarCls}`}>
                        {initials}
                      </div>
                      <div>
                        <p className="font-semibold text-gray-900 text-sm">{row.name}</p>
                        <p className="text-xs text-gray-400">{row.email}</p>
                      </div>
                    </div>
                  </td>
                  {/* Mobile */}
                  <td className="px-4 py-3.5 text-gray-600 text-sm">
                    {row.phone || '—'}
                  </td>
                  {/* Role */}
                  <td className="px-4 py-3.5">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold tracking-wide uppercase ${roleCls}`}>
                      {row.role}
                    </span>
                  </td>
                  {/* Status toggle */}
                  <td className="px-4 py-3.5">
                    <div className="flex items-center gap-2.5">
                      <button
                        onClick={() => toggleUserStatus(row)}
                        className={`w-10 rounded-full flex items-center px-0.5 flex-shrink-0 transition-colors ${isActive ? 'bg-gray-900' : 'bg-gray-300'}`}
                        style={{ height: 22, minWidth: 40 }}
                      >
                        <div className={`w-4 h-4 bg-white rounded-full shadow-sm transition-transform ${isActive ? 'translate-x-5' : 'translate-x-0'}`} />
                      </button>
                      <span className={`text-sm font-medium ${isActive ? 'text-gray-700' : 'text-gray-400'}`}>
                        {isActive ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                  </td>
                  {/* Actions */}
                  <td className="px-4 py-3.5">
                    <div className="flex items-center justify-center gap-1">
                      {isOwner && row.role !== 'Owner' && row.role !== 'Admin' && (
                        <button onClick={() => openPerms(row)}
                          title="Manage permissions"
                          className="p-1.5 hover:bg-blue-50 rounded-lg text-gray-400 hover:text-blue-600 transition-colors">
                          <Shield size={13}/>
                        </button>
                      )}
                      <button onClick={() => openEditUser(row)}
                        className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-400 hover:text-gray-600 transition-colors">
                        <Edit2 size={13}/>
                      </button>
                      <button onClick={() => setDeleteUser(row.id)}
                        className="p-1.5 hover:bg-red-50 rounded-lg text-gray-400 hover:text-red-500 transition-colors">
                        <Trash2 size={13}/>
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    );
  };

  /* ═══════════════════════════
     CHART OF ACCOUNTS
  ═══════════════════════════ */
  const openAddCoa = () => {
    setEditCoa(null);
    setCoaForm(EMPTY_ACC);
    setCErrors({});
    setShowCoa(true);
  };

  const openEditCoa = (row) => {
    setEditCoa(row);
    setCoaForm({ ...row });
    setCErrors({});
    setShowCoa(true);
  };

  const validateCoa = () => {
    const e = {};
    if (!coaForm.account_name.trim()) e.account_name = 'Account name is required';
    if (!coaForm.account_type)        e.account_type = 'Account type is required';
    setCErrors(e);
    return Object.keys(e).length === 0;
  };

  const saveCoa = async () => {
    if (!validateCoa()) return;
    try {
      if (editCoa) {
        await window.db.settings.updateAccount(editCoa.id, coaForm);
        toast('Account updated');
      } else {
        await window.db.settings.addAccount(coaForm);
        toast('Account added');
      }
      setShowCoa(false);
      load();
    } catch (err) { toast(err?.message || 'Failed to save account', 'error'); }
  };

  /* ── CoA export ── */
  const exportCoa = () => {
    const rows = [['Account Name','Account Type','Opening Balance','Created Date']];
    accounts.forEach(a => rows.push([
      a.account_name, a.account_type,
      (a.opening_balance || 0).toFixed(2),
      a.created_at ? a.created_at.slice(0,10) : '—',
    ]));
    const csv = rows.map(r => r.map(c => `"${c}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type:'text/csv' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href = url; a.download = 'accounts.csv'; a.click();
    URL.revokeObjectURL(url);
  };

  const CoaTab = () => {
    /* stat cards */
    const totalAssets      = accounts.filter(a=>['Asset','Cash','Bank','Capital','Equity'].includes(a.account_type)).reduce((s,a)=>s+(a.opening_balance||0),0);
    const totalLiabilities = accounts.filter(a=>['Liability','Purchase'].includes(a.account_type)).reduce((s,a)=>s+(a.opening_balance||0),0);
    const netEquity        = totalAssets - totalLiabilities;

    const fmt = v => '$\u00a0' + Math.abs(v).toLocaleString('en-IN');

    const q = coaSearch.toLowerCase();
    const visible = accounts.filter(a =>
      !q || a.account_name?.toLowerCase().includes(q) || a.account_type?.toLowerCase().includes(q)
    );

    return (
      <div className="space-y-4">

        {/* Stat Cards */}
        <div className="grid grid-cols-3 gap-4">
          {/* Total Assets */}
          <div className="bg-white rounded-2xl border border-gray-100 p-5 flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-green-50 flex items-center justify-center flex-shrink-0">
              <TrendingUp size={18} className="text-green-600" />
            </div>
            <div>
              <p className="text-xs text-gray-400 font-medium mb-0.5">Total Assets</p>
              <p className="text-xl font-bold text-gray-900">{fmt(totalAssets)}</p>
            </div>
          </div>
          {/* Total Liabilities */}
          <div className="bg-white rounded-2xl border border-gray-100 p-5 flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-red-50 flex items-center justify-center flex-shrink-0">
              <TrendingDown size={18} className="text-red-500" />
            </div>
            <div>
              <p className="text-xs text-gray-400 font-medium mb-0.5">Total Liabilities</p>
              <p className="text-xl font-bold text-gray-900">{fmt(totalLiabilities)}</p>
            </div>
          </div>
          {/* Net Equity */}
          <div className="bg-white rounded-2xl border border-gray-100 p-5 flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center flex-shrink-0">
              <Wallet size={18} className="text-blue-600" />
            </div>
            <div>
              <p className="text-xs text-gray-400 font-medium mb-0.5">Net Equity</p>
              <p className="text-xl font-bold text-gray-900">{fmt(netEquity)}</p>
            </div>
          </div>
        </div>

        {/* Table Card */}
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">

          {/* Toolbar */}
          <div className="flex items-center gap-3 px-5 py-4 border-b border-gray-100">
            <div className="relative flex-1 max-w-sm">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                value={coaSearch}
                onChange={e => setCoaSearch(e.target.value)}
                placeholder="Search account name or type..."
                className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-200"
              />
            </div>
            <div className="flex items-center gap-2 ml-auto">
              <button className="flex items-center gap-1.5 px-3 py-2 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50 font-medium">
                <Filter size={13}/> Filter
              </button>
              <button onClick={exportCoa}
                className="flex items-center gap-1.5 px-3 py-2 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50 font-medium">
                <Download size={13}/> Export
              </button>
              <button onClick={openAddCoa}
                className="flex items-center gap-1.5 bg-gray-900 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-gray-800">
                <Plus size={13}/> Add Account
              </button>
            </div>
          </div>

          {/* Table */}
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-900 text-white">
                <th className="px-5 py-3 text-left text-xs font-semibold tracking-wide uppercase">Account Name</th>
                <th className="px-4 py-3 text-left text-xs font-semibold tracking-wide uppercase">Account Type</th>
                <th className="px-4 py-3 text-right text-xs font-semibold tracking-wide uppercase">Opening Balance</th>
                <th className="px-4 py-3 text-left text-xs font-semibold tracking-wide uppercase">Created Date</th>
                <th className="px-4 py-3 text-center text-xs font-semibold tracking-wide uppercase">Action</th>
              </tr>
            </thead>
            <tbody>
              {visible.length === 0 && (
                <tr><td colSpan={5} className="px-5 py-10 text-center text-gray-400 text-sm">No accounts found.</td></tr>
              )}
              {visible.map((row, i) => {
                const initials = (row.account_name || '?').charAt(0).toUpperCase();
                const avatarCls = avatarColor(row.account_name || '');
                const typeCls   = ACC_TYPE_COLORS[row.account_type] || 'bg-gray-100 text-gray-600';
                const date      = row.created_at ? new Date(row.created_at).toLocaleDateString('en-US',{month:'short',day:'2-digit',year:'numeric'}) : '—';
                return (
                  <tr key={row.id} className={`border-t border-gray-50 hover:bg-gray-50/60 transition-colors ${i%2===0?'':'bg-white'}`}>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold flex-shrink-0 ${avatarCls}`}>
                          {initials}
                        </div>
                        <span className="font-semibold text-gray-900">{row.account_name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3.5">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${typeCls}`}>
                        {row.account_type}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 text-right font-medium text-gray-800">
                      $ {(row.opening_balance || 0).toLocaleString('en-IN', { minimumFractionDigits:2, maximumFractionDigits:2 })}
                    </td>
                    <td className="px-4 py-3.5 text-gray-500">{date}</td>
                    <td className="px-4 py-3.5 text-center">
                      <button onClick={() => openEditCoa(row)}
                        className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-400 hover:text-gray-700 transition-colors">
                        <Edit2 size={14}/>
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {/* Important Note */}
          <div className="mx-5 my-4 flex items-start gap-3 bg-gray-50 border border-gray-200 rounded-xl p-4">
            <Info size={16} className="text-gray-500 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-gray-700 mb-0.5">Important Note</p>
              <p className="text-xs text-gray-500 leading-relaxed">
                Deleting an account is only possible if it has no transaction history. For existing accounts with records, consider making them "Inactive" instead from the settings panel.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  };

  /* ═══════════════════════════
     PREFERENCES
  ═══════════════════════════ */
  const setP = (k,v) => setPrefs(p => ({ ...p, [k]: v }));

  const savePrefs = async () => {
    setPSaving(true);
    try {
      await Promise.all(
        Object.entries(prefs).map(([k,v]) => window.db.settings.updateAppSetting(k, v))
      );
      toast('Preferences saved');
    } catch { toast('Failed to save preferences', 'error'); }
    setPSaving(false);
  };

  const PrefsTab = () => (
    <div className="max-w-xl space-y-4">
      <div className="bg-white rounded-2xl border border-gray-100 p-6 space-y-5">
        <h3 className="font-bold text-gray-900 border-b border-gray-100 pb-3">General</h3>

        <label className="flex items-center justify-between cursor-pointer group">
          <div>
            <p className="text-sm font-medium text-gray-800">Dark Mode</p>
            <p className="text-xs text-gray-400 mt-0.5">Toggle dark appearance instantly</p>
          </div>
          <Toggle
            on={dark}
            onClick={() => {
              toggleDark();
              setP('dark_mode', dark ? 'false' : 'true');
            }}
          />
        </label>

        <label className="flex items-center justify-between cursor-pointer">
          <div>
            <p className="text-sm font-medium text-gray-800">Auto Backup</p>
            <p className="text-xs text-gray-400 mt-0.5">Backup database on app close</p>
          </div>
          <Toggle
            on={prefs.auto_backup !== 'false'}
            onClick={() => setP('auto_backup', prefs.auto_backup === 'false' ? 'true' : 'false')}
          />
        </label>

        <label className="flex items-center justify-between cursor-pointer">
          <div>
            <p className="text-sm font-medium text-gray-800">Low Stock Alerts</p>
            <p className="text-xs text-gray-400 mt-0.5">Show notification for low stock items</p>
          </div>
          <Toggle
            on={prefs.low_stock_alert !== 'false'}
            onClick={() => setP('low_stock_alert', prefs.low_stock_alert === 'false' ? 'true' : 'false')}
          />
        </label>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 p-6 space-y-4">
        <h3 className="font-bold text-gray-900 border-b border-gray-100 pb-3">Database</h3>
        <div className="flex items-center gap-3">
          <button
            onClick={async () => {
              try {
                await window.db.app.backup();
                toast('Database backed up successfully');
              } catch { toast('Backup failed or was cancelled', 'warning'); }
            }}
            className="px-4 py-2 border border-gray-200 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Backup Database Now
          </button>
          <span className="text-xs text-gray-400">Saves a copy of accounting.db</span>
        </div>
      </div>

      <button onClick={savePrefs} disabled={pSaving}
        className="flex items-center gap-2 bg-gray-900 text-white px-5 py-2.5 rounded-xl text-sm font-semibold
                   hover:bg-gray-800 shadow-sm disabled:opacity-50">
        <Save size={14}/> {pSaving ? 'Saving…' : 'Save Preferences'}
      </button>
    </div>
  );

  /* ═══════════════════════════
     BACKUP & SECURITY
  ═══════════════════════════ */
  const BackupTab = () => (
    <div className="max-w-xl space-y-4">
      <div className="bg-white rounded-2xl border border-gray-100 p-6 space-y-5">
        <h3 className="font-bold text-gray-900 border-b border-gray-100 pb-3">Database Backup & Recovery</h3>
        
        <div className="space-y-4">
          <div>
            <p className="text-sm font-medium text-gray-800 mb-2">Backup Your Data</p>
            <p className="text-xs text-gray-600 mb-3">Create a backup copy of your entire database for safekeeping.</p>
            <button
              onClick={async () => {
                try {
                  await window.db.app.backup();
                  toast('Database backed up successfully');
                } catch { toast('Backup failed or was cancelled', 'warning'); }
              }}
              className="px-4 py-2 bg-gray-900 text-white rounded-lg text-sm font-semibold hover:bg-gray-800"
            >
              Create Backup
            </button>
          </div>

          <hr className="border-gray-100" />

          <div>
            <p className="text-sm font-medium text-gray-800 mb-2">Auto-Backup on Exit</p>
            <p className="text-xs text-gray-600 mb-3">Automatically backup database when closing the application.</p>
            <label className="flex items-center gap-3 cursor-pointer">
              <Toggle
                on={prefs.auto_backup !== 'false'}
                onClick={() => setP('auto_backup', prefs.auto_backup === 'false' ? 'true' : 'false')}
              />
              <span className="text-sm text-gray-700">{prefs.auto_backup !== 'false' ? 'Enabled' : 'Disabled'}</span>
            </label>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 p-6 space-y-5">
        <h3 className="font-bold text-gray-900 border-b border-gray-100 pb-3">Security & Privacy</h3>
        
        <div>
          <p className="text-sm font-medium text-gray-800 mb-2">Change Password</p>
          <p className="text-xs text-gray-600">Change your admin account password.</p>
          {/* Password change form can be added here if needed */}
        </div>
      </div>

      <button onClick={savePrefs} disabled={pSaving}
        className="flex items-center gap-2 bg-gray-900 text-white px-5 py-2.5 rounded-lg text-sm font-semibold
                   hover:bg-gray-800 disabled:opacity-50">
        <Save size={14}/> {pSaving ? 'Saving…' : 'Save Settings'}
      </button>
    </div>
  );

  /* ─── toggle component ─── */
  const Toggle = ({ on, onClick }) => (
    <button onClick={onClick}
      className={`w-10 h-5.5 rounded-full transition-colors flex items-center px-0.5 flex-shrink-0
        ${on ? 'bg-gray-900' : 'bg-gray-300'}`}
      style={{ height: 22, minWidth: 40 }}
    >
      <div className={`w-4 h-4 bg-white rounded-full shadow-sm transition-transform
        ${on ? 'translate-x-5' : 'translate-x-0'}`} />
    </button>
  );

  /* ─── StatusBadge inline (avoid import collision) ─── */
  const StatusBadge = ({ status }) => {
    const MAP = {
      Owner:'bg-purple-100 text-purple-700', Accountant:'bg-blue-100 text-blue-700',
      'Billing Operator':'bg-yellow-100 text-yellow-700',
      Asset:'bg-green-100 text-green-700', Liability:'bg-red-100 text-red-700',
      Equity:'bg-blue-100 text-blue-700', Revenue:'bg-teal-100 text-teal-700',
      Expense:'bg-orange-100 text-orange-700',
    };
    return (
      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold
                        leading-none whitespace-nowrap ${MAP[status]||'bg-gray-100 text-gray-500'}`}>
        {status||'—'}
      </span>
    );
  };

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <TopBar
        title={tab === 'accounts' ? 'Account Management' : tab === 'users' ? 'User Management' : 'Settings'}
        subtitle={
          tab === 'accounts' ? 'Manage your database security, automated schedules, and recovery points.' :
          tab === 'users'    ? 'Manage your database security, automated schedules, and recovery points.' :
          'Configure your application'
        }
      />

      <div className="flex flex-1 overflow-hidden">

        {/* sidebar */}
        <div className="w-52 flex-shrink-0 bg-white border-r border-gray-100 py-3 overflow-y-auto">
          {TABS.map(({ key, label, icon: Icon }) => (
            <button key={key} onClick={() => setTab(key)}
              className={`w-full flex items-center gap-2.5 px-4 py-2.5 text-left text-sm
                          transition-all border-l-2
                          ${tab===key
                            ? 'bg-gray-50 text-gray-900 font-semibold border-gray-900'
                            : 'text-gray-500 hover:text-gray-800 hover:bg-gray-50 border-transparent'}`}>
              <Icon size={14} className="flex-shrink-0" />
              {label}
            </button>
          ))}
        </div>

        {/* content */}
        <div className="flex-1 overflow-y-auto p-6 anim-fadeup">
          {tab === 'company' && <CompanyTab />}
          {tab === 'users'   && <UsersTab />}
          {tab === 'accounts' && <CoaTab />}
          {tab === 'backup'  && <BackupTab />}
        </div>
      </div>

      {/* User Modal */}
      {showUser && (
        <Modal title={editUser ? 'Edit User' : 'Add User'}
               onClose={() => { setShowUser(false); setEditUser(null); }} size="sm">
          <div className="space-y-4">
            <FormInput label="Full Name" required value={userForm.name}
              onChange={e=>setUserForm(f=>({...f,name:e.target.value}))} error={uErrors.name} placeholder="John Doe" />
            <div className="grid grid-cols-2 gap-4">
              <FormInput label="Email" required type="email" value={userForm.email}
                onChange={e=>setUserForm(f=>({...f,email:e.target.value}))} error={uErrors.email} placeholder="user@company.com" />
              <FormInput label="Mobile Number" type="tel" value={userForm.phone || ''}
                onChange={e=>setUserForm(f=>({...f,phone:e.target.value}))} placeholder="+1 (555) 123-4567" />
            </div>
            <FormSelect label="Role" value={userForm.role}
              onChange={e=>setUserForm(f=>({...f,role:e.target.value}))} options={ROLES} />
            <div className="relative">
              <FormInput
                label={editUser ? 'New Password (leave blank to keep)' : 'Password'} required={!editUser}
                type={showPwd ? 'text' : 'password'}
                value={userForm.password}
                onChange={e=>setUserForm(f=>({...f,password:e.target.value}))}
                error={uErrors.password} placeholder="Minimum 6 characters"
              />
              <button onClick={() => setShowPwd(p => !p)}
                className="absolute right-3 bottom-2 text-gray-400 hover:text-gray-600">
                {showPwd ? <EyeOff size={14}/> : <Eye size={14}/>}
              </button>
            </div>
            <div className="flex gap-3 pt-2 border-t border-gray-100">
              <button onClick={() => { setShowUser(false); setEditUser(null); }}
                className="px-4 py-2 text-sm border border-gray-200 rounded-xl font-medium hover:bg-gray-50">
                Cancel
              </button>
              <button onClick={saveUser}
                className="ml-auto px-5 py-2 bg-gray-900 text-white rounded-xl text-sm font-semibold hover:bg-gray-800">
                {editUser ? 'Update User' : 'Add User'}
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Permissions Modal */}
      {showPerms && permUser && (
        <Modal
          title={`Permissions — ${permUser.name}`}
          subtitle={`Role: ${permUser.role} · Toggle to enable or disable access`}
          onClose={() => setShowPerms(false)}
          size="sm"
        >
          <div className="space-y-3 mb-5">
            {ALL_PERMISSIONS.map(perm => (
              <label key={perm} className="flex items-center justify-between cursor-pointer group">
                <div>
                  <p className="text-sm font-medium text-gray-800">{PERMISSION_LABELS[perm]}</p>
                </div>
                <button
                  type="button"
                  onClick={() => setPermMap(m => ({ ...m, [perm]: !m[perm] }))}
                  className={`w-10 rounded-full transition-colors flex items-center px-0.5 flex-shrink-0
                    ${permMap[perm] ? 'bg-gray-900' : 'bg-gray-300'}`}
                  style={{ height: 22, minWidth: 40 }}
                >
                  <div className={`w-4 h-4 bg-white rounded-full shadow-sm transition-transform
                    ${permMap[perm] ? 'translate-x-5' : 'translate-x-0'}`} />
                </button>
              </label>
            ))}
          </div>
          <div className="flex gap-3 pt-3 border-t border-gray-100">
            <button onClick={() => setShowPerms(false)}
              className="px-4 py-2 text-sm border border-gray-200 rounded-xl font-medium hover:bg-gray-50">
              Cancel
            </button>
            <button onClick={savePerms} disabled={permSaving}
              className="ml-auto px-5 py-2 bg-gray-900 text-white rounded-xl text-sm font-semibold hover:bg-gray-800 disabled:opacity-50">
              {permSaving ? 'Saving…' : 'Save Permissions'}
            </button>
          </div>
        </Modal>
      )}

      {/* CoA Modal — Figma style */}
      {showCoa && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg mx-4 overflow-hidden">

            {/* Header */}
            <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-gray-100 flex items-center justify-center">
                  <Database size={17} className="text-gray-700" />
                </div>
                <h2 className="text-lg font-bold text-gray-900">
                  {editCoa ? 'Edit Account' : 'Add New Account'}
                </h2>
              </div>
              <button onClick={() => { setShowCoa(false); setEditCoa(null); }}
                className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-400 hover:text-gray-600 transition-colors">
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M12 4L4 12M4 4l8 8" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/></svg>
              </button>
            </div>

            {/* Body */}
            <div className="px-6 py-5 space-y-4">

              {/* Account Name */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Account Name</label>
                <input
                  value={coaForm.account_name}
                  onChange={e => setCoaForm(f => ({ ...f, account_name: e.target.value }))}
                  placeholder="e.g. HDFC Current Account"
                  className={`w-full px-4 py-2.5 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-200 ${cErrors.account_name ? 'border-red-400' : 'border-gray-200'}`}
                />
                {cErrors.account_name && <p className="mt-1 text-xs text-red-500">{cErrors.account_name}</p>}
              </div>

              {/* Account Type */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Account Type</label>
                <div className="relative">
                  <select
                    value={coaForm.account_type}
                    onChange={e => setCoaForm(f => ({ ...f, account_type: e.target.value }))}
                    className={`w-full px-4 py-2.5 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-200 appearance-none bg-white ${cErrors.account_type ? 'border-red-400' : 'border-gray-200'} ${!coaForm.account_type ? 'text-gray-400' : 'text-gray-900'}`}
                  >
                    <option value="" disabled>Select an account type</option>
                    {ACC_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                  <svg className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M4 6l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                </div>
                {cErrors.account_type && <p className="mt-1 text-xs text-red-500">{cErrors.account_type}</p>}
              </div>

              {/* Opening Balance + As of Date */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">Opening Balance</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm font-medium">₹</span>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={coaForm.opening_balance ?? 0}
                      onChange={e => setCoaForm(f => ({ ...f, opening_balance: parseFloat(e.target.value) || 0 }))}
                      placeholder="0.00"
                      className="w-full pl-7 pr-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-200"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">As of Date</label>
                  <input
                    type="date"
                    value={coaForm.as_of_date || ''}
                    onChange={e => setCoaForm(f => ({ ...f, as_of_date: e.target.value }))}
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-200 text-gray-700"
                  />
                </div>
              </div>

              {/* Info note */}
              <div className="flex items-start gap-2.5 bg-blue-50 border border-blue-100 rounded-xl px-4 py-3">
                <Info size={15} className="text-blue-500 flex-shrink-0 mt-0.5" />
                <p className="text-xs text-blue-700 leading-relaxed">
                  This opening balance will be recorded as the initial entry for this ledger account.
                </p>
              </div>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-100">
              <button onClick={() => { setShowCoa(false); setEditCoa(null); }}
                className="px-5 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50 rounded-xl border border-gray-200 transition-colors">
                Cancel
              </button>
              <button onClick={saveCoa}
                className="px-6 py-2.5 bg-gray-900 text-white rounded-xl text-sm font-semibold hover:bg-gray-800 transition-colors">
                {editCoa ? 'Update Account' : 'Save Account'}
              </button>
            </div>
          </div>
        </div>
      )}

      {deleteUser && (
        <ConfirmDialog title="Delete User"
          message="This will permanently remove the user account."
          confirmText="Delete User" onConfirm={handleDeleteUser} onCancel={() => setDeleteUser(null)} />
      )}
    </div>
  );
}
