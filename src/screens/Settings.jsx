import React, { useState, useEffect, useCallback } from 'react';
import {
  Building2, Users, Lock, Database,
  Plus, Edit2, Trash2, Eye, EyeOff, Save, Upload, Trash,
} from 'lucide-react';
import TopBar        from '../components/TopBar.jsx';
import DataTable     from '../components/DataTable.jsx';
import Modal         from '../components/Modal.jsx';
import ConfirmDialog from '../components/ConfirmDialog.jsx';
import FormInput     from '../components/FormInput.jsx';
import FormSelect    from '../components/FormSelect.jsx';
import { useToast }  from '../components/ToastContext.jsx';

const TABS = [
  { key:'company', label:'Company Profile', icon: Building2  },
  { key:'accounts',label:'Accounts Management', icon: Database },
  { key:'users',   label:'User Management', icon: Users      },
  { key:'backup',  label:'Backup & Security',  icon: Lock    },
];

const ROLES = ['Admin','Manager','Staff'];
const EMPTY_USER = { name:'', email:'', role:'Staff', password:'', branch_id:'' };
const ACC_TYPES  = ['Asset','Liability','Equity','Revenue','Expense'];
const EMPTY_ACC  = { account_code:'', account_name:'', account_type:'Asset', description:'' };

export default function Settings() {
  const toast = useToast();
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

  /* ── coa ── */
  const [accounts,   setAccounts]  = useState([]);
  const [showCoa,    setShowCoa]   = useState(false);
  const [editCoa,    setEditCoa]   = useState(null);
  const [coaForm,    setCoaForm]   = useState(EMPTY_ACC);
  const [cErrors,    setCErrors]   = useState({});

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

  const userCols = [
    { header:'Name',   key:'name',   render:v=><span className="font-semibold text-gray-900">{v}</span> },
    { header:'Email',  key:'email' },
    { header:'Role',   key:'role',   render:v=><StatusBadge status={v}/> },
    { header:'Actions',render:(_,row)=>(
      <div className="flex items-center gap-1">
        <button onClick={()=>openEditUser(row)}
          className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-400 hover:text-gray-700">
          <Edit2 size={13}/>
        </button>
        <button onClick={()=>setDeleteUser(row.id)}
          className="p-1.5 hover:bg-red-50 rounded-lg text-gray-400 hover:text-red-500">
          <Trash2 size={13}/>
        </button>
      </div>
    )},
  ];

  const UsersTab = () => (
    <div className="space-y-4">
      <div className="flex justify-end">
        <button onClick={openAddUser}
          className="flex items-center gap-2 bg-gray-900 text-white px-4 py-2 rounded-xl text-sm font-medium hover:bg-gray-800 shadow-sm">
          <Plus size={15}/> Add User
        </button>
      </div>
      <DataTable columns={userCols} data={users} emptyMessage="No users found." />
    </div>
  );

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
    if (!coaForm.account_code.trim()) e.account_code = 'Account code is required';
    if (!coaForm.account_name.trim()) e.account_name = 'Account name is required';
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

  const coaCols = [
    { header:'Code',    key:'account_code', render:v=><span className="font-mono text-xs bg-gray-100 px-1.5 py-0.5 rounded">{v}</span> },
    { header:'Name',    key:'account_name', render:v=><span className="font-semibold text-gray-900">{v}</span> },
    { header:'Type',    key:'account_type', render:v=><StatusBadge status={v}/> },
    { header:'Desc',    key:'description',  render:v=>v||'—' },
    { header:'Actions', render:(_,row)=>(
      <button onClick={()=>openEditCoa(row)}
        className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-400 hover:text-gray-700">
        <Edit2 size={13}/>
      </button>
    )},
  ];

  const CoaTab = () => (
    <div className="space-y-4">
      <div className="flex justify-end">
        <button onClick={openAddCoa}
          className="flex items-center gap-2 bg-gray-900 text-white px-4 py-2 rounded-xl text-sm font-medium hover:bg-gray-800 shadow-sm">
          <Plus size={15}/> Add Account
        </button>
      </div>
      <DataTable columns={coaCols} data={accounts} emptyMessage="No accounts in chart of accounts." />
    </div>
  );

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
            <p className="text-xs text-gray-400 mt-0.5">Toggle dark appearance (restart required)</p>
          </div>
          <Toggle
            on={prefs.dark_mode === 'true'}
            onClick={() => setP('dark_mode', prefs.dark_mode === 'true' ? 'false' : 'true')}
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
      Admin:'bg-purple-100 text-purple-700', Manager:'bg-blue-100 text-blue-700',
      Staff:'bg-gray-100 text-gray-600', Asset:'bg-green-100 text-green-700',
      Liability:'bg-red-100 text-red-700', Equity:'bg-blue-100 text-blue-700',
      Revenue:'bg-teal-100 text-teal-700', Expense:'bg-orange-100 text-orange-700',
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
      <TopBar title="Settings" subtitle="Configure your application" />

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
            <FormInput label="Email" required type="email" value={userForm.email}
              onChange={e=>setUserForm(f=>({...f,email:e.target.value}))} error={uErrors.email} placeholder="user@company.com" />
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

      {/* CoA Modal */}
      {showCoa && (
        <Modal title={editCoa ? 'Edit Account' : 'Add Account'}
               onClose={() => { setShowCoa(false); setEditCoa(null); }} size="sm">
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <FormInput label="Account Code" required value={coaForm.account_code}
                onChange={e=>setCoaForm(f=>({...f,account_code:e.target.value}))}
                error={cErrors.account_code} placeholder="e.g. 1001" />
              <FormSelect label="Account Type" required value={coaForm.account_type}
                onChange={e=>setCoaForm(f=>({...f,account_type:e.target.value}))} options={ACC_TYPES} />
            </div>
            <FormInput label="Account Name" required value={coaForm.account_name}
              onChange={e=>setCoaForm(f=>({...f,account_name:e.target.value}))}
              error={cErrors.account_name} placeholder="e.g. Cash in Hand" />
            <FormInput label="Description" value={coaForm.description}
              onChange={e=>setCoaForm(f=>({...f,description:e.target.value}))} placeholder="Optional" />
            <div className="flex gap-3 pt-2 border-t border-gray-100">
              <button onClick={() => { setShowCoa(false); setEditCoa(null); }}
                className="px-4 py-2 text-sm border border-gray-200 rounded-xl font-medium hover:bg-gray-50">
                Cancel
              </button>
              <button onClick={saveCoa}
                className="ml-auto px-5 py-2 bg-gray-900 text-white rounded-xl text-sm font-semibold hover:bg-gray-800">
                {editCoa ? 'Update' : 'Add Account'}
              </button>
            </div>
          </div>
        </Modal>
      )}

      {deleteUser && (
        <ConfirmDialog title="Delete User"
          message="This will permanently remove the user account."
          confirmText="Delete User" onConfirm={handleDeleteUser} onCancel={() => setDeleteUser(null)} />
      )}
    </div>
  );
}
