import React, { useState, useEffect, useCallback } from 'react';
import {
  Plus, Search, RefreshCw, MoreVertical,
  Edit2, Trash2, DollarSign, TrendingUp, Tag, Calendar,
} from 'lucide-react';
import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';
import TopBar        from '../components/TopBar.jsx';
import DataTable     from '../components/DataTable.jsx';
import StatCard      from '../components/StatCard.jsx';
import Modal         from '../components/Modal.jsx';
import ConfirmDialog from '../components/ConfirmDialog.jsx';
import FormInput     from '../components/FormInput.jsx';
import FormSelect    from '../components/FormSelect.jsx';
import { useToast }  from '../components/ToastContext.jsx';
import { formatCurrency, formatDate, today } from '../utils/formatters.js';

const PIE_COLORS = ['#111827','#6B7280','#9CA3AF','#D1D5DB','#F3F4F6','#374151'];
const EMPTY = { category_id:'', amount:'', description:'', expense_date: today(), payment_mode:'Cash', reference:'', notes:'' };

function PieTooltip({ active, payload }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-gray-900 text-white text-xs rounded-lg px-3 py-2 shadow-xl">
      <p className="font-semibold">{payload[0].name}</p>
      <p className="text-gray-300 mt-0.5">{formatCurrency(payload[0].value)}</p>
    </div>
  );
}

export default function Expenses() {
  const toast = useToast();

  const [expenses,   setExpenses]   = useState([]);
  const [categories, setCategories] = useState([]);
  const [stats,      setStats]      = useState({ total:0, byCategory:[] });
  const [loading,    setLoading]    = useState(true);
  const [search,     setSearch]     = useState('');
  const [catFilter,  setCatFilter]  = useState('All');
  const [menuOpen,   setMenuOpen]   = useState(null);

  /* modals */
  const [showModal, setShowModal] = useState(false);
  const [editItem,  setEditItem]  = useState(null);
  const [deleteId,  setDeleteId]  = useState(null);

  /* form */
  const [form,   setForm]   = useState(EMPTY);
  const [errors, setErrors] = useState({});

  /* ── load ── */
  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [e, c, s] = await Promise.all([
        window.db.expenses.getAll({
          search,
          category: catFilter === 'All' ? '' : catFilter,
        }),
        window.db.expenses.getCategories(),
        window.db.expenses.getStats(),
      ]);
      setExpenses(e   || []);
      setCategories(c || []);
      setStats(s      || { total:0, byCategory:[] });
    } catch { toast('Failed to load expenses', 'error'); }
    setLoading(false);
  }, [search, catFilter]);

  useEffect(() => { load(); }, [load]);

  /* ── helpers ── */
  const setField = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const openAdd = () => {
    setEditItem(null);
    setForm(EMPTY);
    setErrors({});
    setShowModal(true);
    setMenuOpen(null);
  };

  const openEdit = (row) => {
    setEditItem(row);
    setForm({ ...row });
    setErrors({});
    setShowModal(true);
    setMenuOpen(null);
  };

  const validate = () => {
    const e = {};
    if (!form.category_id)                      e.category_id = 'Category is required';
    if (!form.amount || +form.amount <= 0)       e.amount      = 'Valid amount required';
    if (!form.description.trim())               e.description = 'Description is required';
    if (!form.expense_date)                     e.expense_date= 'Date is required';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSave = async () => {
    if (!validate()) return;
    try {
      if (editItem) {
        await window.db.expenses.update(editItem.id, form);
        toast('Expense updated');
      } else {
        const res = await window.db.expenses.add(form);
        toast(`Expense ${res.expense_no} recorded`);
      }
      setShowModal(false);
      setEditItem(null);
      load();
    } catch (err) { toast(err?.message || 'Failed to save expense', 'error'); }
  };

  const handleDelete = async () => {
    try {
      await window.db.expenses.delete(deleteId);
      toast('Expense deleted');
      setDeleteId(null);
      load();
    } catch { toast('Failed to delete expense', 'error'); }
  };

  /* ── action menu ── */
  const actionCell = (row) => (
    <div className="relative" onClick={e => e.stopPropagation()}>
      <button onClick={() => setMenuOpen(menuOpen === row.id ? null : row.id)}
        className="p-1.5 hover:bg-gray-100 rounded-lg">
        <MoreVertical size={14} className="text-gray-500" />
      </button>
      {menuOpen === row.id && (
        <div className="absolute right-0 top-8 bg-white border border-gray-100 rounded-xl shadow-xl z-20 py-1 min-w-[130px]">
          <button onClick={() => openEdit(row)}
            className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50">
            <Edit2 size={13} className="text-gray-400" /> Edit
          </button>
          <div className="my-1 border-t border-gray-100" />
          <button onClick={() => { setMenuOpen(null); setDeleteId(row.id); }}
            className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-red-600 hover:bg-red-50">
            <Trash2 size={13} /> Delete
          </button>
        </div>
      )}
    </div>
  );

  const columns = [
    { header:'S.No',        render:(_,__,i)=><span className="text-gray-400">{i+1}</span> },
    { header:'Expense No.', key:'expense_no',     render:v=><span className="font-mono text-xs bg-gray-100 px-1.5 py-0.5 rounded">{v}</span> },
    { header:'Category',    key:'category_name',  render:v=>(
        <span className="px-2 py-0.5 bg-gray-100 rounded-full text-xs font-medium text-gray-600">{v||'—'}</span>
      ), sortable:true },
    { header:'Description', key:'description',    render:v=><span className="text-gray-900">{v}</span> },
    { header:'Amount',      key:'amount',         render:v=><span className="font-bold text-red-600">-{formatCurrency(v)}</span>, sortable:true },
    { header:'Date',        key:'expense_date',   render:v=>formatDate(v), sortable:true },
    { header:'Payment Mode',key:'payment_mode' },
    { header:'Reference',   key:'reference',      render:v=>v||'—' },
    { header:'Actions',     render:(_,row)=>actionCell(row) },
  ];

  const catOptions = categories.map(c => ({ value: c.id, label: c.name }));
  const pieData    = (stats.byCategory || []).map(c => ({ name: c.name, value: c.total }));
  const thisMonth  = stats.thisMonth || 0;
  const lastMonth  = stats.lastMonth || 0;
  const change     = lastMonth > 0 ? ((thisMonth - lastMonth) / lastMonth * 100).toFixed(1) : 0;

  return (
    <div className="flex flex-col h-full overflow-hidden" onClick={() => setMenuOpen(null)}>
      <TopBar title="Expenses" subtitle="Track and categorise all business expenses" />

      <div className="flex-1 overflow-y-auto p-6 space-y-5 anim-fadeup">

        {/* top row: stats + chart */}
        <div className="flex gap-4">
          <div className="flex-1 grid grid-cols-3 gap-4 content-start">
            <StatCard title="Total Expenses"    value={formatCurrency(stats.total)}    icon={DollarSign} color="red"    loading={loading} />
            <StatCard title="This Month"        value={formatCurrency(thisMonth)}      icon={Calendar}   color="pink"   loading={loading} />
            <StatCard title="Last Month"        value={formatCurrency(lastMonth)}      icon={TrendingUp} color="purple" loading={loading} />
            {/* category breakdown list */}
            <div className="col-span-3 bg-white rounded-xl border border-gray-100 p-4">
              <h3 className="font-bold text-gray-900 text-sm mb-3">Top Categories</h3>
              <div className="space-y-2">
                {(stats.byCategory || []).slice(0, 5).map((c, i) => {
                  const pct = stats.total > 0 ? (c.total / stats.total * 100) : 0;
                  return (
                    <div key={i}>
                      <div className="flex items-center justify-between text-xs mb-1">
                        <span className="font-medium text-gray-700">{c.name}</span>
                        <span className="text-gray-500 font-semibold">{formatCurrency(c.total)}</span>
                      </div>
                      <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                        <div className="h-full bg-gray-900 rounded-full transition-all"
                          style={{ width: `${pct.toFixed(1)}%` }} />
                      </div>
                    </div>
                  );
                })}
                {(stats.byCategory || []).length === 0 && (
                  <p className="text-xs text-gray-400 text-center py-4">No expense data yet</p>
                )}
              </div>
            </div>
          </div>

          {/* pie chart */}
          <div className="w-64 bg-white rounded-xl border border-gray-100 p-4 flex flex-col items-center justify-center">
            <h3 className="font-bold text-gray-900 text-sm mb-3 self-start">By Category</h3>
            {pieData.length > 0 ? (
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie data={pieData} cx="50%" cy="50%" innerRadius={45} outerRadius={75}
                       dataKey="value" paddingAngle={3}>
                    {pieData.map((_, i) => (
                      <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip content={<PieTooltip />} />
                  <Legend iconType="circle" iconSize={8}
                    formatter={(v) => <span style={{ fontSize: 11, color:'#6B7280' }}>{v}</span>} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-sm text-gray-400 py-8">No data yet</p>
            )}
          </div>
        </div>

        {/* filter row + add btn */}
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"/>
            <input className="pl-9 pr-3 py-2 text-sm bg-white border border-gray-200 rounded-xl w-56
                              focus:outline-none focus:ring-2 focus:ring-gray-200"
              placeholder="Search expenses…" value={search} onChange={e=>setSearch(e.target.value)}/>
          </div>
          <select value={catFilter} onChange={e=>setCatFilter(e.target.value)}
            className="px-3 py-2 text-sm bg-white border border-gray-200 rounded-xl focus:outline-none">
            <option value="All">All Categories</option>
            {categories.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          <button onClick={load} className="p-2 bg-white border border-gray-200 rounded-xl hover:bg-gray-50">
            <RefreshCw size={14} className="text-gray-500"/>
          </button>
          <button onClick={openAdd}
            className="ml-auto flex items-center gap-2 bg-gray-900 text-white px-4 py-2 rounded-xl text-sm font-medium hover:bg-gray-800 shadow-sm">
            <Plus size={15}/> Add Expense
          </button>
        </div>

        <DataTable columns={columns} data={expenses} loading={loading} emptyMessage="No expenses recorded yet." />
      </div>

      {/* ── Add/Edit Modal ── */}
      {showModal && (
        <Modal title={editItem ? 'Edit Expense' : 'Add Expense'}
               subtitle={editItem ? `Ref: ${editItem.expense_no}` : 'Record a business expense'}
               onClose={() => { setShowModal(false); setEditItem(null); }} size="md">
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <FormSelect label="Category" required value={form.category_id}
                onChange={e=>setField('category_id',e.target.value)}
                options={catOptions} placeholder="Select category" error={errors.category_id}/>
              <FormInput label="Date" type="date" required value={form.expense_date}
                onChange={e=>setField('expense_date',e.target.value)} error={errors.expense_date}/>
            </div>
            <FormInput label="Description" required value={form.description}
              onChange={e=>setField('description',e.target.value)}
              error={errors.description} placeholder="What was this expense for?"/>
            <div className="grid grid-cols-2 gap-4">
              <FormInput label="Amount" required prefix="$" type="number" min="0" step="0.01"
                value={form.amount} onChange={e=>setField('amount',e.target.value)}
                error={errors.amount} placeholder="0.00"/>
              <FormSelect label="Payment Mode" value={form.payment_mode}
                onChange={e=>setField('payment_mode',e.target.value)}
                options={['Cash','Bank Transfer','Card','Cheque','UPI']}/>
            </div>
            <FormInput label="Reference / Bill No." value={form.reference}
              onChange={e=>setField('reference',e.target.value)} placeholder="Optional reference"/>
            <div>
              <label className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider block mb-1.5">Notes</label>
              <textarea rows={2} value={form.notes} onChange={e=>setField('notes',e.target.value)}
                placeholder="Additional notes…"
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl resize-none
                           focus:outline-none focus:ring-2 focus:ring-gray-200"/>
            </div>
            <div className="flex gap-3 pt-2 border-t border-gray-100">
              <button onClick={() => { setShowModal(false); setEditItem(null); }}
                className="px-4 py-2 text-sm border border-gray-200 rounded-xl font-medium text-gray-700 hover:bg-gray-50">
                Cancel
              </button>
              <button onClick={handleSave}
                className="ml-auto px-5 py-2 bg-gray-900 text-white rounded-xl text-sm font-semibold hover:bg-gray-800 shadow-sm">
                {editItem ? 'Update Expense' : 'Save Expense'}
              </button>
            </div>
          </div>
        </Modal>
      )}

      {deleteId && (
        <ConfirmDialog title="Delete Expense"
          message="This will permanently delete the expense and restore the bank balance."
          confirmText="Delete Expense" onConfirm={handleDelete} onCancel={() => setDeleteId(null)}/>
      )}
    </div>
  );
}
