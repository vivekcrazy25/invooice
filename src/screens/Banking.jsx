import React, { useState, useEffect, useCallback } from 'react';
import {
  Plus, Search, RefreshCw, MoreVertical,
  Edit2, Trash2, Building2, TrendingUp, TrendingDown, Coins,
} from 'lucide-react';
import TopBar        from '../components/TopBar.jsx';
import DataTable     from '../components/DataTable.jsx';
import StatusBadge   from '../components/StatusBadge.jsx';
import StatCard      from '../components/StatCard.jsx';
import Modal         from '../components/Modal.jsx';
import ConfirmDialog from '../components/ConfirmDialog.jsx';
import FormInput     from '../components/FormInput.jsx';
import FormSelect    from '../components/FormSelect.jsx';
import { useToast }  from '../components/ToastContext.jsx';
import { formatCurrency, formatDate, today } from '../utils/formatters.js';

const TABS = ['Accounts', 'Transactions'];
const EMPTY_ACC = { account_name:'', account_type:'Current', bank_name:'', account_number:'', ifsc:'', opening_balance:'0' };
const EMPTY_TXN = { account_id:'', type:'Credit', amount:'', description:'', reference:'', transaction_date: today() };
const ACC_TYPES = ['Current','Savings','Cash','Credit Card','Wallet'];

export default function Banking() {
  const toast = useToast();

  const [tab,      setTab]      = useState(0);
  const [accounts, setAccounts] = useState([]);
  const [txns,     setTxns]     = useState([]);
  const [stats,    setStats]    = useState({});
  const [loading,  setLoading]  = useState(true);
  const [search,   setSearch]   = useState('');
  const [accFilter,setAccFilter]= useState('All');
  const [menuOpen, setMenuOpen] = useState(null);

  /* modals */
  const [showAccModal, setShowAccModal] = useState(false);
  const [showTxnModal, setShowTxnModal] = useState(false);
  const [editAcc,      setEditAcc]      = useState(null);
  const [deleteId,     setDeleteId]     = useState(null);
  const [deleteTxnId,  setDeleteTxnId]  = useState(null);

  /* forms */
  const [accForm, setAccForm] = useState(EMPTY_ACC);
  const [txnForm, setTxnForm] = useState(EMPTY_TXN);
  const [aErrors, setAErrors] = useState({});
  const [tErrors, setTErrors] = useState({});

  /* ── load ── */
  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [accs, s] = await Promise.all([
        window.db.banking.getAccounts(),
        window.db.banking.getStats(),
      ]);
      setAccounts(accs || []);
      setStats(s   || {});
      if (tab === 1) {
        const t = await window.db.banking.getTransactions({
          accountId: accFilter === 'All' ? '' : accFilter,
          search,
        });
        setTxns(t || []);
      }
    } catch { toast('Failed to load banking data', 'error'); }
    setLoading(false);
  }, [tab, search, accFilter]);

  useEffect(() => { load(); }, [load]);

  /* ── account helpers ── */
  const openAddAcc = () => {
    setEditAcc(null);
    setAccForm(EMPTY_ACC);
    setAErrors({});
    setShowAccModal(true);
    setMenuOpen(null);
  };

  const openEditAcc = (row) => {
    setEditAcc(row);
    setAccForm({ ...row });
    setAErrors({});
    setShowAccModal(true);
    setMenuOpen(null);
  };

  const validateAcc = () => {
    const e = {};
    if (!accForm.account_name.trim()) e.account_name = 'Account name is required';
    if (!accForm.account_type)        e.account_type = 'Account type is required';
    setAErrors(e);
    return Object.keys(e).length === 0;
  };

  const saveAcc = async () => {
    if (!validateAcc()) return;
    try {
      if (editAcc) {
        await window.db.banking.updateAccount(editAcc.id, accForm);
        toast('Account updated');
      } else {
        await window.db.banking.addAccount(accForm);
        toast('Account added');
      }
      setShowAccModal(false);
      setEditAcc(null);
      load();
    } catch (err) { toast(err?.message || 'Failed to save account', 'error'); }
  };

  /* ── transaction helpers ── */
  const openAddTxn = () => {
    setTxnForm(EMPTY_TXN);
    setTErrors({});
    setShowTxnModal(true);
  };

  const validateTxn = () => {
    const e = {};
    if (!txnForm.account_id)                           e.account_id  = 'Select an account';
    if (!txnForm.amount || +txnForm.amount <= 0)       e.amount      = 'Valid amount required';
    if (!txnForm.description.trim())                   e.description = 'Description is required';
    setTErrors(e);
    return Object.keys(e).length === 0;
  };

  const saveTxn = async () => {
    if (!validateTxn()) return;
    try {
      await window.db.banking.addTransaction(txnForm);
      toast('Transaction recorded');
      setShowTxnModal(false);
      load();
    } catch (err) { toast(err?.message || 'Failed to add transaction', 'error'); }
  };

  const deleteTxn = async () => {
    try {
      await window.db.banking.deleteTransaction(deleteTxnId);
      toast('Transaction deleted');
      setDeleteTxnId(null);
      load();
    } catch { toast('Failed to delete transaction', 'error'); }
  };

  /* ── action menus ── */
  const accAction = (row) => (
    <div className="relative" onClick={e => e.stopPropagation()}>
      <button onClick={() => setMenuOpen(menuOpen === row.id ? null : row.id)}
        className="p-1.5 hover:bg-gray-100 rounded-lg">
        <MoreVertical size={14} className="text-gray-500" />
      </button>
      {menuOpen === row.id && (
        <div className="absolute right-0 top-8 bg-white border border-gray-100 rounded-xl shadow-xl z-20 py-1 min-w-[130px]">
          <button onClick={() => openEditAcc(row)}
            className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50">
            <Edit2 size={13} className="text-gray-400" /> Edit
          </button>
        </div>
      )}
    </div>
  );

  const txnAction = (row) => (
    <div className="relative" onClick={e => e.stopPropagation()}>
      <button onClick={() => setMenuOpen(menuOpen === row.id ? null : row.id)}
        className="p-1.5 hover:bg-gray-100 rounded-lg">
        <MoreVertical size={14} className="text-gray-500" />
      </button>
      {menuOpen === row.id && (
        <div className="absolute right-0 top-8 bg-white border border-gray-100 rounded-xl shadow-xl z-20 py-1 min-w-[130px]">
          <button onClick={() => { setMenuOpen(null); setDeleteTxnId(row.id); }}
            className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-red-600 hover:bg-red-50">
            <Trash2 size={13} /> Delete
          </button>
        </div>
      )}
    </div>
  );

  /* ── columns ── */
  const accCols = [
    { header:'S.No',          render:(_,__,i)=><span className="text-gray-400">{i+1}</span> },
    { header:'Account Name',  key:'account_name',  render:v=><span className="font-semibold text-gray-900">{v}</span>, sortable:true },
    { header:'Type',          key:'account_type',  render:v=><StatusBadge status={v}/> },
    { header:'Bank / Source', key:'bank_name',     render:v=>v||'—' },
    { header:'Acc Number',    key:'account_number',render:v=>v ? `••••${String(v).slice(-4)}` : '—' },
    { header:'Current Balance',key:'current_balance',render:v=>(
        <span className={`font-bold text-lg ${+v<0?'text-red-600':'text-green-600'}`}>{formatCurrency(v)}</span>
      ), sortable:true },
    { header:'Actions',       render:(_,row)=>accAction(row) },
  ];

  const txnCols = [
    { header:'S.No',        render:(_,__,i)=><span className="text-gray-400">{i+1}</span> },
    { header:'Txn No.',     key:'txn_number',        render:v=><span className="font-mono text-xs bg-gray-100 px-1.5 py-0.5 rounded">{v}</span> },
    { header:'Account',     key:'account_name' },
    { header:'Date',        key:'transaction_date',  render:v=>formatDate(v), sortable:true },
    { header:'Type',        key:'type',              render:v=>(
        <span className={`text-xs font-bold ${v==='Credit'?'text-green-600':'text-red-600'}`}>{v}</span>
      ) },
    { header:'Amount',      key:'amount',            render:(v,row)=>(
        <span className={`font-semibold ${row.type==='Credit'?'text-green-600':'text-red-600'}`}>
          {row.type==='Credit'?'+':'-'}{formatCurrency(v)}
        </span>
      ), sortable:true },
    { header:'Description', key:'description' },
    { header:'Reference',   key:'reference',         render:v=>v||'—' },
    { header:'Balance',     key:'balance_after',     render:v=><span className="font-medium">{formatCurrency(v)}</span> },
    { header:'Actions',     render:(_,row)=>txnAction(row) },
  ];

  const accOpts = accounts.map(a => ({ value: a.id, label: `${a.account_name} (${formatCurrency(a.current_balance)})` }));

  return (
    <div className="flex flex-col h-full overflow-hidden" onClick={() => setMenuOpen(null)}>
      <TopBar title="Banking" subtitle="Manage bank accounts and transactions" />

      <div className="flex-1 overflow-y-auto p-6 space-y-5 anim-fadeup">

        {/* stat cards */}
        <div className="grid grid-cols-3 gap-4">
          <StatCard title="Total Balance"       value={formatCurrency(stats.totalBalance)}   icon={Building2}  color="blue"   loading={loading} />
          <StatCard title="Total Credit (Month)"value={formatCurrency(stats.monthCredit)}    icon={TrendingUp}  color="green"  loading={loading} />
          <StatCard title="Total Debit (Month)" value={formatCurrency(stats.monthDebit)}     icon={TrendingDown}color="red"    loading={loading} />
        </div>

        {/* tabs */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 bg-white rounded-xl p-1.5 border border-gray-100 shadow-sm w-fit">
            {TABS.map((t,i)=>(
              <button key={i} onClick={()=>setTab(i)}
                className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all
                  ${tab===i?'bg-gray-900 text-white shadow-sm':'text-gray-500 hover:text-gray-800 hover:bg-gray-100'}`}>
                {t}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2">
            {tab===1&&(
              <select value={accFilter} onChange={e=>setAccFilter(e.target.value)}
                className="px-3 py-2 text-sm bg-white border border-gray-200 rounded-xl focus:outline-none">
                <option value="All">All Accounts</option>
                {accounts.map(a=><option key={a.id} value={a.id}>{a.account_name}</option>)}
              </select>
            )}
            {tab===0&&(
              <button onClick={openAddAcc}
                className="flex items-center gap-2 bg-gray-900 text-white px-4 py-2 rounded-xl text-sm font-medium hover:bg-gray-800 shadow-sm">
                <Plus size={15}/> Add Account
              </button>
            )}
            {tab===1&&(
              <button onClick={openAddTxn}
                className="flex items-center gap-2 bg-gray-900 text-white px-4 py-2 rounded-xl text-sm font-medium hover:bg-gray-800 shadow-sm">
                <Plus size={15}/> Add Transaction
              </button>
            )}
          </div>
        </div>

        {/* filter row for transactions */}
        {tab===1&&(
          <div className="flex items-center gap-3">
            <div className="relative">
              <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"/>
              <input className="pl-9 pr-3 py-2 text-sm bg-white border border-gray-200 rounded-xl w-56
                                focus:outline-none focus:ring-2 focus:ring-gray-200"
                placeholder="Search transactions…" value={search} onChange={e=>setSearch(e.target.value)}/>
            </div>
            <button onClick={load} className="p-2 bg-white border border-gray-200 rounded-xl hover:bg-gray-50">
              <RefreshCw size={14} className="text-gray-500"/>
            </button>
          </div>
        )}

        {tab===0&&<DataTable columns={accCols}  data={accounts} loading={loading} emptyMessage="No accounts found."/>}
        {tab===1&&<DataTable columns={txnCols}  data={txns}     loading={loading} emptyMessage="No transactions found."/>}
      </div>

      {/* ── Account Modal ── */}
      {showAccModal&&(
        <Modal title={editAcc?'Edit Account':'Add Bank Account'}
               onClose={()=>{setShowAccModal(false);setEditAcc(null);}} size="md">
          <div className="space-y-4">
            <FormInput label="Account Name" required value={accForm.account_name}
              onChange={e=>setAccForm(f=>({...f,account_name:e.target.value}))} error={aErrors.account_name}
              placeholder="e.g. Main Current Account"/>
            <div className="grid grid-cols-2 gap-4">
              <FormSelect label="Account Type" required value={accForm.account_type}
                onChange={e=>setAccForm(f=>({...f,account_type:e.target.value}))}
                options={ACC_TYPES} error={aErrors.account_type}/>
              <FormInput label="Bank Name" value={accForm.bank_name}
                onChange={e=>setAccForm(f=>({...f,bank_name:e.target.value}))} placeholder="e.g. HDFC Bank"/>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <FormInput label="Account Number" value={accForm.account_number}
                onChange={e=>setAccForm(f=>({...f,account_number:e.target.value}))} placeholder="Account number"/>
              <FormInput label="IFSC / Routing" value={accForm.ifsc}
                onChange={e=>setAccForm(f=>({...f,ifsc:e.target.value}))} placeholder="IFSC code"/>
            </div>
            <FormInput label="Opening Balance" prefix="$" type="number" value={accForm.opening_balance}
              onChange={e=>setAccForm(f=>({...f,opening_balance:e.target.value}))} placeholder="0.00"
              hint="Current balance will be calculated from this opening balance"/>
            <div className="flex gap-3 pt-2 border-t border-gray-100">
              <button onClick={()=>{setShowAccModal(false);setEditAcc(null);}}
                className="px-4 py-2 text-sm border border-gray-200 rounded-xl font-medium text-gray-700 hover:bg-gray-50">
                Cancel
              </button>
              <button onClick={saveAcc}
                className="ml-auto px-5 py-2 bg-gray-900 text-white rounded-xl text-sm font-semibold hover:bg-gray-800 shadow-sm">
                {editAcc?'Update Account':'Save Account'}
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* ── Transaction Modal ── */}
      {showTxnModal&&(
        <Modal title="Add Transaction" onClose={()=>setShowTxnModal(false)} size="sm">
          <div className="space-y-4">
            <FormSelect label="Account" required value={txnForm.account_id}
              onChange={e=>setTxnForm(f=>({...f,account_id:e.target.value}))}
              options={accOpts} placeholder="Select account" error={tErrors.account_id}/>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider block mb-1.5">Type</label>
                <div className="flex gap-2">
                  {['Credit','Debit'].map(t=>(
                    <button key={t} onClick={()=>setTxnForm(f=>({...f,type:t}))}
                      className={`flex-1 py-2 rounded-xl text-sm font-semibold border transition-all
                        ${txnForm.type===t
                          ? t==='Credit' ? 'bg-green-600 text-white border-green-600'
                                         : 'bg-red-600 text-white border-red-600'
                          : 'bg-white text-gray-600 border-gray-200 hover:border-gray-400'}`}>
                      {t}
                    </button>
                  ))}
                </div>
              </div>
              <FormInput label="Amount" required prefix="$" type="number" min="0" step="0.01"
                value={txnForm.amount} onChange={e=>setTxnForm(f=>({...f,amount:e.target.value}))}
                error={tErrors.amount} placeholder="0.00"/>
            </div>
            <FormInput label="Transaction Date" type="date" value={txnForm.transaction_date}
              onChange={e=>setTxnForm(f=>({...f,transaction_date:e.target.value}))}/>
            <FormInput label="Description" required value={txnForm.description}
              onChange={e=>setTxnForm(f=>({...f,description:e.target.value}))}
              error={tErrors.description} placeholder="e.g. Salary payment"/>
            <FormInput label="Reference" value={txnForm.reference}
              onChange={e=>setTxnForm(f=>({...f,reference:e.target.value}))} placeholder="Optional ref number"/>
            <div className="flex gap-3 pt-2 border-t border-gray-100">
              <button onClick={()=>setShowTxnModal(false)}
                className="px-4 py-2 text-sm border border-gray-200 rounded-xl font-medium text-gray-700 hover:bg-gray-50">
                Cancel
              </button>
              <button onClick={saveTxn}
                className="ml-auto px-5 py-2 bg-gray-900 text-white rounded-xl text-sm font-semibold hover:bg-gray-800 shadow-sm">
                Add Transaction
              </button>
            </div>
          </div>
        </Modal>
      )}

      {deleteTxnId&&(
        <ConfirmDialog title="Delete Transaction"
          message="This will permanently delete the transaction and reverse the account balance."
          confirmText="Delete" onConfirm={deleteTxn} onCancel={()=>setDeleteTxnId(null)}/>
      )}
    </div>
  );
}
