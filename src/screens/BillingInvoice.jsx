import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Plus, Search, RefreshCw, MoreVertical,
  Edit2, Trash2, Printer, Eye,
  QrCode, Trash, ChevronDown, FileText, ScanLine,
} from 'lucide-react';
import TopBar              from '../components/TopBar.jsx';
import DataTable           from '../components/DataTable.jsx';
import StatusBadge         from '../components/StatusBadge.jsx';
import Modal               from '../components/Modal.jsx';
import ConfirmDialog       from '../components/ConfirmDialog.jsx';
import FormInput           from '../components/FormInput.jsx';
import FormSelect          from '../components/FormSelect.jsx';
import { useToast }        from '../components/ToastContext.jsx';
import BarcodeScannerModal from '../components/BarcodeScannerModal.jsx';
import { useBarcodeGun }   from '../hooks/useBarcodeGun.js';
import { formatCurrency, formatDate, today } from '../utils/formatters.js';

/* ─────────────────────────────────────────
   CONSTANTS
───────────────────────────────────────── */
const TABS = ['Invoices', 'Refund & Exchange', 'Completed'];

const EMPTY_FORM = {
  customer_name: '', customer_phone: '', type: 'Sale',
  payment_mode: 'Cash', cash_amount: '', online_amount: '',
  notes: '', status: 'Draft', is_credit_sale: 0,
  items: [],
};

/* ─────────────────────────────────────────
   MAIN COMPONENT
───────────────────────────────────────── */
export default function BillingInvoice() {
  const toast = useToast();

  /* tabs & list state */
  const [tab,      setTab]      = useState(0);
  const [invoices, setInvoices] = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [search,   setSearch]   = useState('');

  /* modal visibility */
  const [showChoice,  setShowChoice]  = useState(false);
  const [showForm,    setShowForm]    = useState(false);
  const [showView,    setShowView]    = useState(false);
  const [deleteId,    setDeleteId]    = useState(null);
  const [menuOpen,    setMenuOpen]    = useState(null);

  /* form state */
  const [form,       setForm]       = useState(EMPTY_FORM);
  const [editInvoice,setEditInvoice] = useState(null);
  const [viewInvoice,setViewInvoice] = useState(null);
  const [errors,     setErrors]     = useState({});

  /* product search */
  const [prodSearch,  setProdSearch]  = useState('');
  const [prodResults, setProdResults] = useState([]);
  const [prodLoading, setProdLoading] = useState(false);
  const searchRef = useRef(null);

  /* barcode scanner */
  const [showScanner, setShowScanner] = useState(false);

  /* Handle barcode from either gun or webcam */
  const handleBarcode = useCallback(async (code) => {
    setShowScanner(false);
    try {
      const product = await window.db.inventory.getByBarcode(code);
      if (product) {
        addProduct(product);
        toast(`Added: ${product.name}`, 'success');
      } else {
        // Try SKU lookup as fallback
        const bySku = await window.db.inventory.getBySku(code);
        if (bySku) {
          addProduct(bySku);
          toast(`Added: ${bySku.name}`, 'success');
        } else {
          toast(`No product found for barcode: ${code}`, 'warning');
        }
      }
    } catch {
      toast('Barcode lookup failed', 'error');
    }
  }, []); // eslint-disable-line

  /* Barcode gun listener — active only when the invoice form is open */
  useBarcodeGun({ onScan: handleBarcode, enabled: showForm && !showScanner });

  /* ── fetch invoices ── */
  const fetchInvoices = useCallback(async () => {
    setLoading(true);
    try {
      const res = await window.db.invoices.getAll({ search });
      let rows = res?.rows || [];

      if (tab === 0) rows = rows.filter(r => !['Return','Exchange'].includes(r.type));
      if (tab === 1) rows = rows.filter(r =>  ['Return','Exchange'].includes(r.type));
      if (tab === 2) rows = rows.filter(r =>  ['Paid','Exchanged'].includes(r.status) && !['Return','Exchange'].includes(r.type));

      setInvoices(rows);
    } catch (e) {
      toast('Failed to load invoices', 'error');
    }
    setLoading(false);
  }, [tab, search]);

  useEffect(() => { fetchInvoices(); }, [fetchInvoices]);

  /* ── product search debounce ── */
  useEffect(() => {
    if (!prodSearch.trim()) { setProdResults([]); return; }
    setProdLoading(true);
    const t = setTimeout(async () => {
      try {
        const res = await window.db.inventory.search(prodSearch);
        setProdResults(res || []);
      } catch { setProdResults([]); }
      setProdLoading(false);
    }, 280);
    return () => clearTimeout(t);
  }, [prodSearch]);

  /* ── form helpers ── */
  const setField = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const openNew = () => {
    setEditInvoice(null);
    setForm(EMPTY_FORM);
    setErrors({});
    setProdSearch('');
    setProdResults([]);
    setShowChoice(false);
    setShowForm(true);
  };

  const openEdit = async (id) => {
    try {
      const inv = await window.db.invoices.getById(id);
      if (!inv) return;
      setEditInvoice(inv);
      setForm({ ...inv, items: inv.items || [], cash_amount: inv.cash_amount || '', online_amount: inv.online_amount || '' });
      setErrors({});
      setProdSearch('');
      setProdResults([]);
      setMenuOpen(null);
      setShowForm(true);
    } catch { toast('Failed to load invoice', 'error'); }
  };

  const openView = async (id) => {
    try {
      const inv = await window.db.invoices.getById(id);
      setViewInvoice(inv);
      setShowView(true);
      setMenuOpen(null);
    } catch { toast('Failed to load invoice', 'error'); }
  };

  /* ── add product to items ── */
  const addProduct = (p) => {
    setForm(f => ({
      ...f,
      items: [
        ...f.items,
        {
          product_id:   p.id,
          product_name: p.name,
          sku:          p.sku,
          qty:          1,
          rate:         p.selling_price,
          discount:     0,
          amount:       p.selling_price,
        },
      ],
    }));
    setProdSearch('');
    setProdResults([]);
    searchRef.current?.focus();
  };

  /* ── update line item ── */
  const updateItem = (idx, field, raw) => {
    setForm(f => {
      const items = f.items.map((item, i) => {
        if (i !== idx) return item;
        const updated = { ...item, [field]: raw };
        const qty  = field === 'qty'  ? (parseFloat(raw) || 0) : (parseFloat(item.qty)  || 0);
        const rate = field === 'rate' ? (parseFloat(raw) || 0) : (parseFloat(item.rate) || 0);
        const disc = field === 'discount' ? (parseFloat(raw) || 0) : (parseFloat(item.discount) || 0);
        updated.amount = (qty * rate) - disc;
        return updated;
      });
      return { ...f, items };
    });
  };

  const removeItem = (idx) =>
    setForm(f => ({ ...f, items: f.items.filter((_, i) => i !== idx) }));

  /* ── totals ── */
  const subtotal   = form.items.reduce((s, i) => s + (parseFloat(i.amount) || 0), 0);
  const grandTotal = subtotal;

  /* ── validation ── */
  const validate = () => {
    const e = {};
    if (!form.customer_name.trim())   e.customer_name = 'Customer name is required';
    if (form.items.length === 0)      e.items = 'Add at least one product';
    if (form.payment_mode === 'Cash' && form.status === 'Paid') {
      if (!form.cash_amount || parseFloat(form.cash_amount) <= 0)
        e.cash_amount = 'Cash amount required for paid invoices';
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  /* ── save ── */
  const handleSave = async (status) => {
    if (!validate()) return;
    try {
      const payload = {
        ...form,
        status,
        subtotal,
        grand_total:   grandTotal,
        cash_amount:   parseFloat(form.cash_amount)   || 0,
        online_amount: parseFloat(form.online_amount) || 0,
      };

      if (editInvoice) {
        await window.db.invoices.update(editInvoice.id, payload);
        toast('Invoice updated successfully');
      } else {
        const res = await window.db.invoices.create(payload);
        toast(`Invoice ${res.invoice_no} created`);
      }

      setShowForm(false);
      setEditInvoice(null);
      fetchInvoices();
    } catch (err) {
      toast(err?.message || 'Failed to save invoice', 'error');
    }
  };

  /* ── delete ── */
  const handleDelete = async () => {
    try {
      await window.db.invoices.delete(deleteId);
      toast('Invoice deleted');
      setDeleteId(null);
      fetchInvoices();
    } catch { toast('Failed to delete invoice', 'error'); }
  };

  /* ─────────────────────────────────────────
     TABLE COLUMNS
  ───────────────────────────────────────── */
  const actionCell = (row) => (
    <div className="relative" onClick={e => e.stopPropagation()}>
      <button
        onClick={() => setMenuOpen(menuOpen === row.id ? null : row.id)}
        className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors"
      >
        <MoreVertical size={14} className="text-gray-500" />
      </button>
      {menuOpen === row.id && (
        <div className="absolute right-0 top-8 bg-white border border-gray-100 rounded-xl
                        shadow-xl z-20 py-1 min-w-[140px]">
          <button onClick={() => openView(row.id)}
            className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50">
            <Eye size={13} className="text-gray-400" /> View
          </button>
          <button onClick={() => openEdit(row.id)}
            className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50">
            <Edit2 size={13} className="text-gray-400" /> Edit
          </button>
          <button onClick={() => { setMenuOpen(null); window.print(); }}
            className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50">
            <Printer size={13} className="text-gray-400" /> Print
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

  const invoiceCols = [
    { header: 'S.No',         render: (_, __, i) => <span className="text-gray-400">{i + 1}</span> },
    { header: 'Invoice No.',  key: 'invoice_no',    render: v => <span className="font-semibold text-gray-900">{v}</span> },
    { header: 'Customer Name',key: 'customer_name', sortable: true },
    { header: 'Phone No.',    key: 'customer_phone',render: v => v || '—' },
    { header: 'Total Amount', key: 'grand_total',   render: v => <span className="font-semibold">{formatCurrency(v)}</span> },
    { header: 'Created By',   key: 'seller_name',   render: v => v || 'Admin' },
    { header: 'Created Date', key: 'created_at',    render: v => formatDate(v), sortable: true },
    { header: 'Payment Type', key: 'payment_mode' },
    { header: 'Status',       key: 'status',        render: v => <StatusBadge status={v} /> },
    { header: 'Action',       render: (_, row) => actionCell(row) },
  ];

  const returnCols = [
    { header: 'S.No',             render: (_, __, i) => <span className="text-gray-400">{i + 1}</span> },
    { header: 'Invoice No.',      key: 'invoice_no',    render: v => <span className="font-semibold">{v}</span> },
    { header: 'Customer Name',    key: 'customer_name' },
    { header: 'Type',             key: 'type',          render: v => <StatusBadge status={v} /> },
    { header: 'Return Amount (−)',key: 'grand_total',   render: v => <span className="text-red-500 font-semibold">-{formatCurrency(v)}</span> },
    { header: 'Net Amount',       key: 'grand_total',   render: v => <span className="text-green-600 font-semibold">{formatCurrency(v)}</span> },
    { header: 'Created By',       key: 'seller_name',   render: v => v || 'Admin' },
    { header: 'Date',             key: 'created_at',    render: v => formatDate(v) },
    { header: 'Status',           key: 'status',        render: v => <StatusBadge status={v} /> },
    { header: 'Action',           render: (_, row) => actionCell(row) },
  ];

  /* ─────────────────────────────────────────
     RENDER
  ───────────────────────────────────────── */
  return (
    <div className="flex flex-col h-full overflow-hidden" onClick={() => setMenuOpen(null)}>
      <TopBar title="Billing & Invoice" subtitle="Manage sales, returns and exchanges" />

      <div className="flex-1 overflow-y-auto p-6 space-y-4 anim-fadeup">

        {/* ── Tab row ── */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 bg-white rounded-xl p-1.5 border border-gray-100 shadow-sm w-fit">
            {TABS.map((t, i) => (
              <button
                key={i}
                onClick={() => setTab(i)}
                className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all
                  ${tab === i ? 'bg-gray-900 text-white shadow-sm' : 'text-gray-500 hover:text-gray-800 hover:bg-gray-100'}`}
              >
                {t}
              </button>
            ))}
          </div>

          <button
            onClick={() => setShowChoice(true)}
            className="flex items-center gap-2 bg-gray-900 text-white px-4 py-2 rounded-xl
                       text-sm font-medium hover:bg-gray-800 transition-colors shadow-sm"
          >
            <Plus size={15} /> Create Invoice
          </button>
        </div>

        {/* ── Filter row ── */}
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
            <input
              className="pl-9 pr-3 py-2 text-sm bg-white border border-gray-200 rounded-xl w-64
                         focus:outline-none focus:ring-2 focus:ring-gray-200 focus:border-gray-300"
              placeholder="Search invoice, customer…"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
          <button
            onClick={fetchInvoices}
            className="p-2 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors"
            title="Refresh"
          >
            <RefreshCw size={14} className="text-gray-500" />
          </button>
        </div>

        {/* ── Table ── */}
        <DataTable
          columns={tab === 1 ? returnCols : invoiceCols}
          data={invoices}
          loading={loading}
          emptyMessage={tab === 0 ? 'No invoices found. Create one to get started.' : 'No records found.'}
        />
      </div>

      {/* ═══════════════════════════════════
          CHOICE MODAL
      ═══════════════════════════════════ */}
      {showChoice && (
        <Modal
          title="Create Invoice"
          subtitle="How would you like to start?"
          onClose={() => setShowChoice(false)}
          size="sm"
        >
          <div className="grid grid-cols-2 gap-4 pt-1">
            {/* Resume draft */}
            <div className="border-2 border-dashed border-yellow-300 rounded-2xl p-5 text-center
                            hover:border-yellow-400 hover:bg-yellow-50 transition-colors cursor-pointer group">
              <div className="w-11 h-11 bg-yellow-100 rounded-xl flex items-center justify-center mx-auto mb-3
                              group-hover:bg-yellow-200 transition-colors">
                <Edit2 size={20} className="text-yellow-600" />
              </div>
              <h3 className="font-bold text-gray-900 text-sm mb-1">Edit Draft</h3>
              <p className="text-xs text-gray-400 mb-4 leading-relaxed">Resume an existing draft invoice</p>
              <button
                onClick={() => setShowChoice(false)}
                className="w-full py-2 border-2 border-yellow-400 text-yellow-700 rounded-xl text-xs
                           font-semibold hover:bg-yellow-50 transition-colors"
              >
                Resume Draft
              </button>
            </div>

            {/* Create new */}
            <div className="border-2 border-gray-900 rounded-2xl p-5 text-center
                            hover:bg-gray-900 transition-colors cursor-pointer group">
              <div className="w-11 h-11 bg-gray-900 group-hover:bg-gray-700 rounded-xl flex items-center
                              justify-center mx-auto mb-3 transition-colors">
                <Plus size={20} className="text-white" />
              </div>
              <h3 className="font-bold text-gray-900 group-hover:text-white text-sm mb-1 transition-colors">Create New</h3>
              <p className="text-xs text-gray-400 group-hover:text-gray-300 mb-4 leading-relaxed transition-colors">
                Start a brand new invoice
              </p>
              <button
                onClick={openNew}
                className="w-full py-2 bg-gray-900 group-hover:bg-gray-700 text-white rounded-xl text-xs
                           font-semibold transition-colors"
              >
                Start Fresh
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* ═══════════════════════════════════
          INVOICE FORM MODAL
      ═══════════════════════════════════ */}
      {showForm && (
        <InvoiceForm
          form={form}
          setField={setField}
          setForm={setForm}
          editInvoice={editInvoice}
          errors={errors}
          prodSearch={prodSearch}
          setProdSearch={setProdSearch}
          prodResults={prodResults}
          prodLoading={prodLoading}
          searchRef={searchRef}
          addProduct={addProduct}
          updateItem={updateItem}
          removeItem={removeItem}
          subtotal={subtotal}
          grandTotal={grandTotal}
          onSave={handleSave}
          onOpenScanner={() => setShowScanner(true)}
          onClose={() => { setShowForm(false); setEditInvoice(null); }}
        />
      )}

      {/* ═══════════════════════════════════
          BARCODE SCANNER MODAL
      ═══════════════════════════════════ */}
      {showScanner && (
        <BarcodeScannerModal
          title="Scan Product Barcode"
          onScan={handleBarcode}
          onClose={() => setShowScanner(false)}
        />
      )}

      {/* ═══════════════════════════════════
          VIEW INVOICE MODAL
      ═══════════════════════════════════ */}
      {showView && viewInvoice && (
        <ViewInvoice invoice={viewInvoice} onClose={() => setShowView(false)} />
      )}

      {/* ═══════════════════════════════════
          CONFIRM DELETE
      ═══════════════════════════════════ */}
      {deleteId && (
        <ConfirmDialog
          title="Delete Invoice"
          message="This will permanently delete the invoice. If it was paid, stock levels will be restored."
          confirmText="Delete Invoice"
          onConfirm={handleDelete}
          onCancel={() => setDeleteId(null)}
        />
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════
   INVOICE FORM  (extracted for readability)
═══════════════════════════════════════════ */
function InvoiceForm({
  form, setField, setForm, editInvoice, errors,
  prodSearch, setProdSearch, prodResults, prodLoading,
  searchRef, addProduct,
  updateItem, removeItem,
  subtotal, grandTotal,
  onSave, onClose, onOpenScanner,
}) {
  const PAYMENT_MODES = ['Cash', 'Card', 'EFT', 'UPI', 'Split'];

  return (
    <Modal
      title={editInvoice ? `Edit — ${editInvoice.invoice_no}` : 'New Invoice'}
      subtitle={editInvoice ? 'Update invoice details' : 'Fill in the details below'}
      onClose={onClose}
      size="2xl"
    >
      <div className="space-y-6">

        {/* ── Customer Row ── */}
        <div className="grid grid-cols-3 gap-4">
          <FormInput
            label="Customer Name" required
            value={form.customer_name}
            onChange={e => setField('customer_name', e.target.value)}
            error={errors.customer_name}
            placeholder="Enter customer name"
          />
          <FormInput
            label="Phone Number"
            value={form.customer_phone}
            onChange={e => setField('customer_phone', e.target.value)}
            placeholder="Enter phone number"
          />
          <FormSelect
            label="Invoice Type"
            value={form.type}
            onChange={e => setField('type', e.target.value)}
            options={['Sale','Return','Exchange'].map(v => ({ value: v, label: v }))}
          />
        </div>

        {/* ── Product Search ── */}
        <div>
          <label className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider block mb-1.5">
            Add Products
          </label>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <QrCode size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
              {prodLoading && (
                <div className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 border-2 border-gray-300 border-t-gray-600 rounded-full animate-spin" />
              )}
              <input
                ref={searchRef}
                className="w-full pl-9 pr-10 py-2 text-sm bg-white border border-gray-200 rounded-xl
                           focus:outline-none focus:ring-2 focus:ring-gray-200 focus:border-gray-400"
                placeholder="Search by name, SKU, or scan barcode…"
                value={prodSearch}
                onChange={e => setProdSearch(e.target.value)}
              />
            </div>
            {/* Webcam scanner button */}
            <button
              type="button"
              onClick={onOpenScanner}
              title="Open barcode scanner (webcam)"
              className="flex items-center gap-1.5 px-3 py-2 bg-gray-900 text-white rounded-xl
                         text-xs font-semibold hover:bg-gray-700 transition-colors flex-shrink-0"
            >
              <ScanLine size={14}/> Scan
            </button>
          </div>

          {/* Search dropdown */}
          {prodResults.length > 0 && (
            <div className="mt-1 bg-white border border-gray-200 rounded-xl shadow-xl
                            max-h-52 overflow-y-auto z-30 relative">
              {prodResults.map(p => (
                <button
                  key={p.id}
                  onClick={() => addProduct(p)}
                  className="w-full flex items-center justify-between px-4 py-2.5 hover:bg-gray-50
                             transition-colors border-b border-gray-50 last:border-0 text-left"
                >
                  <div>
                    <span className="text-sm font-medium text-gray-900">{p.name}</span>
                    <span className="text-xs text-gray-400 ml-2">{p.sku}</span>
                    <span className={`text-xs ml-2 ${p.current_stock <= 5 ? 'text-red-500' : 'text-gray-400'}`}>
                      Stock: {p.current_stock}
                    </span>
                  </div>
                  <span className="text-sm font-bold text-gray-900 ml-4 flex-shrink-0">
                    {formatCurrency(p.selling_price)}
                  </span>
                </button>
              ))}
            </div>
          )}

          {errors.items && (
            <p className="text-[11px] text-red-500 mt-1">{errors.items}</p>
          )}
        </div>

        {/* ── Line Items Table ── */}
        {form.items.length > 0 && (
          <div className="border border-gray-200 rounded-xl overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-900">
                  {['#','Code','Item Details','QTY','Rate ($)','Discount','Amount',''].map((h, i) => (
                    <th key={i} className="px-3 py-2.5 text-left text-[11px] font-semibold text-gray-400 uppercase tracking-wider">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {form.items.map((item, idx) => (
                  <tr key={idx} className="border-t border-gray-100">
                    <td className="px-3 py-2.5 text-sm text-gray-400">{idx + 1}</td>
                    <td className="px-3 py-2.5 text-xs font-mono text-gray-500">{item.sku || '—'}</td>
                    <td className="px-3 py-2.5">
                      <p className="text-sm font-medium text-gray-900">{item.product_name}</p>
                    </td>
                    <td className="px-3 py-2.5">
                      <input
                        type="number" min="1" max="9999"
                        value={item.qty}
                        onChange={e => updateItem(idx, 'qty', e.target.value)}
                        className="w-16 px-2 py-1 text-sm border border-gray-200 rounded-lg
                                   focus:outline-none focus:ring-1 focus:ring-gray-300 text-center"
                      />
                    </td>
                    <td className="px-3 py-2.5">
                      <input
                        type="number" min="0" step="0.01"
                        value={item.rate}
                        onChange={e => updateItem(idx, 'rate', e.target.value)}
                        className="w-24 px-2 py-1 text-sm border border-gray-200 rounded-lg
                                   focus:outline-none focus:ring-1 focus:ring-gray-300"
                      />
                    </td>
                    <td className="px-3 py-2.5">
                      <input
                        type="number" min="0" step="0.01"
                        value={item.discount}
                        onChange={e => updateItem(idx, 'discount', e.target.value)}
                        className="w-20 px-2 py-1 text-sm border border-gray-200 rounded-lg
                                   focus:outline-none focus:ring-1 focus:ring-gray-300"
                      />
                    </td>
                    <td className="px-3 py-2.5 text-sm font-semibold text-gray-900">
                      {formatCurrency(item.amount)}
                    </td>
                    <td className="px-3 py-2.5">
                      <button
                        onClick={() => removeItem(idx)}
                        className="p-1 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      >
                        <Trash size={14} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* ── Payment + Totals ── */}
        <div className="grid grid-cols-2 gap-6">

          {/* Left — payment details */}
          <div className="space-y-4">
            <div>
              <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-2">
                Payment Mode
              </p>
              <div className="flex gap-2 flex-wrap">
                {['Cash','Card','EFT','UPI','Split'].map(mode => (
                  <button
                    key={mode}
                    onClick={() => setField('payment_mode', mode)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all
                      ${form.payment_mode === mode
                        ? 'bg-gray-900 text-white border-gray-900 shadow-sm'
                        : 'bg-white text-gray-600 border-gray-200 hover:border-gray-400'}`}
                  >
                    {mode}
                  </button>
                ))}
              </div>
            </div>

            {(form.payment_mode === 'Cash' || form.payment_mode === 'Split') && (
              <FormInput
                label="Cash Amount" prefix="$" type="number" min="0" step="0.01"
                value={form.cash_amount}
                onChange={e => setField('cash_amount', e.target.value)}
                error={errors.cash_amount}
                placeholder="0.00"
              />
            )}

            {form.payment_mode === 'Split' && (
              <FormInput
                label="Online / Other Amount" prefix="$" type="number" min="0" step="0.01"
                value={form.online_amount}
                onChange={e => setField('online_amount', e.target.value)}
                placeholder="0.00"
              />
            )}

            <div>
              <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
                Internal Notes
              </p>
              <textarea
                rows={3}
                value={form.notes}
                onChange={e => setField('notes', e.target.value)}
                placeholder="Add any notes…"
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl resize-none
                           focus:outline-none focus:ring-2 focus:ring-gray-200 focus:border-gray-400"
              />
            </div>
          </div>

          {/* Right — totals */}
          <div className="bg-gray-50 rounded-2xl p-5 space-y-3 border border-gray-100">
            <div className="flex justify-between text-sm text-gray-600">
              <span>Subtotal</span>
              <span className="font-medium">{formatCurrency(subtotal)}</span>
            </div>
            <div className="flex justify-between text-sm text-gray-600">
              <span>Discount</span>
              <span>$0.00</span>
            </div>
            <div className="flex justify-between text-sm text-gray-600">
              <span>Tax</span>
              <span>$0.00</span>
            </div>
            <div className="border-t border-gray-200 pt-3 flex justify-between items-end">
              <span className="font-bold text-gray-900">Grand Total</span>
              <span className="text-3xl font-black text-gray-900">{formatCurrency(grandTotal)}</span>
            </div>
            <p className="text-[11px] text-gray-400">Includes tax where applicable</p>

            {/* Credit sale toggle */}
            <label className="flex items-center gap-2.5 cursor-pointer pt-2 border-t border-gray-200">
              <div
                onClick={() => setField('is_credit_sale', form.is_credit_sale ? 0 : 1)}
                className={`w-9 h-5 rounded-full transition-colors flex-shrink-0 flex items-center px-0.5
                  ${form.is_credit_sale ? 'bg-blue-600' : 'bg-gray-300'}`}
              >
                <div className={`w-4 h-4 bg-white rounded-full shadow-sm transition-transform
                  ${form.is_credit_sale ? 'translate-x-4' : 'translate-x-0'}`} />
              </div>
              <span className="text-xs font-medium text-gray-600">Credit Sale</span>
              {form.is_credit_sale ? (
                <span className="text-[11px] text-blue-600 font-medium ml-auto">Outstanding balance updated</span>
              ) : null}
            </label>
          </div>
        </div>

        {/* ── Footer Buttons ── */}
        <div className="flex items-center gap-3 pt-1 border-t border-gray-100">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm border border-gray-200 rounded-xl font-medium
                       text-gray-700 hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={() => onSave('Draft')}
            className="px-4 py-2 text-sm border border-gray-200 rounded-xl font-medium
                       text-gray-700 hover:bg-gray-50 transition-colors"
          >
            Save Draft
          </button>
          <div className="ml-auto flex items-center gap-2">
            <button
              onClick={() => onSave('Paid')}
              className="flex items-center gap-2 px-5 py-2 bg-gray-900 text-white rounded-xl
                         text-sm font-semibold hover:bg-gray-800 transition-colors shadow-sm"
            >
              <Printer size={14} /> Save & Print
            </button>
          </div>
        </div>

      </div>
    </Modal>
  );
}

/* ═══════════════════════════════════════════
   VIEW INVOICE  (read-only detail)
═══════════════════════════════════════════ */
function ViewInvoice({ invoice, onClose }) {
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
  }, []);

  return (
    <Modal title={`Invoice — ${invoice.invoice_no}`} onClose={onClose} size="lg">
      <div className="space-y-5 invoice-view">

        {/* Company Header */}
        <div className="flex items-start justify-between border-b border-gray-200 pb-4">
          <div className="flex items-center gap-4">
            {company.logo && (
              <img src={company.logo} alt="Company Logo" className="w-12 h-12 object-contain" />
            )}
            <div>
              <h2 className="text-lg font-bold text-gray-900">{company.company_name || 'Company Name'}</h2>
              <p className="text-sm text-gray-600">{company.address || ''}</p>
              <p className="text-sm text-gray-600">
                {company.phone && `Phone: ${company.phone}`} 
                {company.email && ` | Email: ${company.email}`}
              </p>
            </div>
          </div>
          <div className="text-right">
            <h3 className="text-lg font-bold text-gray-900">INVOICE</h3>
            <p className="text-sm text-gray-600">#{invoice.invoice_no}</p>
            <p className="text-sm text-gray-600">{formatDate(invoice.created_at)}</p>
          </div>
        </div>

        {/* Customer info */}
        <div className="bg-gray-50 rounded-xl p-4">
          <h4 className="font-semibold text-gray-900 mb-2">Bill To:</h4>
          <p className="text-sm font-semibold text-gray-900">{invoice.customer_name}</p>
          <p className="text-sm text-gray-600">{invoice.customer_phone || '—'}</p>
        </div>

        {/* Items */}
        {invoice.items?.length > 0 && (
          <div className="border border-gray-200 rounded-xl overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-900">
                  {['Item','Qty','Rate','Amount'].map(h => (
                    <th key={h} className="px-4 py-2.5 text-left text-[11px] font-semibold text-gray-400 uppercase">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {invoice.items.map((item, i) => (
                  <tr key={i} className="border-t border-gray-100">
                    <td className="px-4 py-2.5 text-sm font-medium text-gray-900">{item.product_name}</td>
                    <td className="px-4 py-2.5 text-sm text-gray-600">{item.qty}</td>
                    <td className="px-4 py-2.5 text-sm text-gray-600">{formatCurrency(item.rate)}</td>
                    <td className="px-4 py-2.5 text-sm font-semibold text-gray-900">{formatCurrency(item.amount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Totals */}
        <div className="bg-gray-50 rounded-xl p-4 space-y-2">
          <div className="flex justify-between text-sm text-gray-600">
            <span>Subtotal</span><span>{formatCurrency(invoice.subtotal)}</span>
          </div>
          <div className="flex justify-between text-sm font-bold text-gray-900 pt-2 border-t border-gray-200">
            <span>Grand Total</span><span>{formatCurrency(invoice.grand_total)}</span>
          </div>
          <div className="flex justify-between text-xs text-gray-500 pt-1">
            <span>Payment Mode</span><span>{invoice.payment_mode}</span>
          </div>
        </div>

        {invoice.notes && (
          <div className="bg-yellow-50 rounded-xl px-4 py-3 border border-yellow-100">
            <p className="text-xs font-semibold text-yellow-700 mb-1">Notes</p>
            <p className="text-sm text-yellow-800">{invoice.notes}</p>
          </div>
        )}

        <div className="flex justify-end gap-3 pt-1 border-t border-gray-100">
          <button
            onClick={() => window.print()}
            className="flex items-center gap-2 px-4 py-2 border border-gray-200 rounded-xl
                       text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            <Printer size={14} /> Print
          </button>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-900 text-white rounded-xl text-sm font-medium hover:bg-gray-800"
          >
            Close
          </button>
        </div>
      </div>
    </Modal>
  );
}
