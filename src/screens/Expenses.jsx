import React, { useState, useEffect, useCallback } from 'react';
import {
  Plus, Search, MoreVertical,
  Edit2, Trash2, DollarSign, Tag, Lightbulb,
} from 'lucide-react';
import TopBar        from '../components/TopBar.jsx';
import DataTable     from '../components/DataTable.jsx';
import StatCard      from '../components/StatCard.jsx';
import Modal         from '../components/Modal.jsx';
import ConfirmDialog from '../components/ConfirmDialog.jsx';
import FormInput     from '../components/FormInput.jsx';
import FormSelect    from '../components/FormSelect.jsx';
import { useToast }  from '../components/ToastContext.jsx';
import { formatCurrency, formatDate, today } from '../utils/formatters.js';

const EMPTY = { category_id:'', amount:'', description:'', expense_date: today(), payment_mode:'Cash', reference:'', notes:'' };

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
    { header:'Expense ID',  key:'expense_no',    render:v=><span className="font-semibold text-gray-900">{v}</span> },
    { header:'Date',        key:'expense_date',  render:v=>formatDate(v), sortable:true },
    { header:'Category',    key:'category_name', render:v=><span className="text-gray-700">{v||'—'}</span>, sortable:true },
    { header:'Description', key:'description',   render:v=><span className="text-gray-600">{v}</span> },
    { header:'Amount',      key:'amount',        render:v=><span className="font-bold text-red-500">{formatCurrency(v)}</span>, sortable:true },
    { header:'Actions',     render:(_,row)=>actionCell(row) },
  ];

  const catOptions = categories.map(c => ({ value: c.id, label: c.name }));
  const thisMonth  = stats.thisMonth || 0;
  const lastMonth  = stats.lastMonth || 0;
  const change     = lastMonth > 0 ? ((thisMonth - lastMonth) / lastMonth * 100).toFixed(1) : 0;

  // Top 3 categories for dynamic stat cards
  const CAT_COLORS = ['pink', 'yellow', 'green'];
  const topCats    = (stats.byCategory || []).slice(0, 3);

  // Insight: find the category with the biggest change vs last period
  const topCat = topCats[0];
  const insightText = topCat
    ? `${topCat.name} is your largest expense this period at ${formatCurrency(topCat.total)}.`
    : 'Add expenses to see insights here.';

  return (
    <div className="flex flex-col h-full overflow-hidden" onClick={() => setMenuOpen(null)}>
      <TopBar title="Expenses" subtitle="Track and manage business expenses" />

      <div className="flex-1 overflow-y-auto p-6 space-y-4 anim-fadeup">

        {/* ── 4 stat cards ── */}
        <div className="grid grid-cols-4 gap-4">
          <StatCard title="Total Expenses (This Month)" value={formatCurrency(thisMonth)} icon={DollarSign} color="blue" loading={loading} />
          {topCats.map((c, i) => (
            <StatCard key={c.name} title={c.name} value={formatCurrency(c.total)} icon={Tag} color={CAT_COLORS[i]} loading={loading} />
          ))}
          {Array.from({ length: 3 - topCats.length }).map((_, i) => (
            <div key={`ph-${i}`} className="bg-gray-50 rounded-2xl border border-dashed border-gray-200 flex items-center justify-center" style={{minHeight:120}}>
              <p className="text-xs text-gray-300 font-medium">No data</p>
            </div>
          ))}
        </div>

        {/* ── Two-column main area ── */}
        <div className="flex gap-4 flex-1 min-h-0">

          {/* ── LEFT: Recent Expenses table ── */}
          <div className="flex-1 min-w-0 bg-white rounded-2xl border border-gray-100 overflow-hidden flex flex-col">
            {/* card header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-50">
              <div>
                <h3 className="font-bold text-gray-900">Recent Expenses</h3>
                <p className="text-xs text-gray-400 mt-0.5">Latest expense entries</p>
              </div>
              <div className="flex items-center gap-2">
                {/* inline search */}
                <div className="relative">
                  <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"/>
                  <input
                    className="pl-8 pr-3 py-1.5 text-xs bg-gray-50 border border-gray-200 rounded-lg w-44
                               focus:outline-none focus:ring-2 focus:ring-gray-200"
                    placeholder="Search expenses…"
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                  />
                </div>
                <button onClick={openAdd}
                  className="flex items-center gap-1.5 bg-gray-900 text-white px-3 py-1.5 rounded-xl text-xs font-semibold hover:bg-gray-800">
                  <Plus size={13}/> Add Expense
                </button>
              </div>
            </div>

            {/* table */}
            <div className="flex-1 overflow-y-auto">
              <DataTable columns={columns} data={expenses} loading={loading} emptyMessage="No expenses recorded yet." />
            </div>
          </div>

          {/* ── RIGHT: Expense By Category + Insight ── */}
          <div className="w-80 flex-shrink-0 bg-white rounded-2xl border border-gray-100 p-5 flex flex-col gap-4">
            <div>
              <h3 className="font-bold text-gray-900">Expense By Category</h3>
              <p className="text-xs text-gray-400 mt-0.5">Latest expense entries</p>
            </div>

            {/* progress bars */}
            <div className="space-y-4 flex-1">
              {(stats.byCategory || []).slice(0, 6).map((c, i) => {
                const pct = stats.total > 0 ? Math.round(c.total / stats.total * 100) : 0;
                return (
                  <div key={i}>
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-sm font-medium text-gray-700">{c.name}</span>
                      <span className="text-sm font-bold text-gray-800">{pct}%</span>
                    </div>
                    <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gray-900 rounded-full transition-all duration-500"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
              {(stats.byCategory || []).length === 0 && (
                <p className="text-xs text-gray-400 text-center py-6">No expense data yet</p>
              )}
            </div>

            {/* Insight card */}
            <div className="flex items-start gap-3 bg-gray-50 rounded-xl p-4 border border-gray-100 mt-auto">
              <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center flex-shrink-0">
                <Lightbulb size={14} className="text-gray-600" />
              </div>
              <div>
                <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">Insight</p>
                <p className="text-xs text-gray-700 leading-relaxed">{insightText}</p>
              </div>
            </div>
          </div>

        </div>
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
