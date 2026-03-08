import React, { useState, useEffect, useCallback } from 'react';
import {
  Plus, Search, RefreshCw, MoreVertical,
  Edit2, Trash2, Eye, Users, ShoppingCart, RotateCcw, CreditCard,
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

const TABS = ['Vendors', 'Purchase Orders', 'Purchase Returns', 'Pay Bills'];

const EMPTY_VENDOR = { name:'', contact_person:'', phone:'', email:'', address:'', gstin:'', opening_balance:'0', status:'Active' };
const EMPTY_PO     = { vendor_id:'', po_date: today(), expected_date:'', notes:'', items:[] };
const EMPTY_PMT    = { vendor_id:'', amount:'', payment_mode:'Cash', reference:'', notes:'', payment_date: today() };

export default function VendorsPurchases() {
  const toast = useToast();

  const [tab,      setTab]      = useState(0);
  const [vendors,  setVendors]  = useState([]);
  const [orders,   setOrders]   = useState([]);
  const [returns,  setReturns]  = useState([]);
  const [bills,    setBills]    = useState([]);
  const [payments, setPayments] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [search,   setSearch]   = useState('');
  const [menuOpen, setMenuOpen] = useState(null);

  /* modals */
  const [showVendor, setShowVendor]   = useState(false);
  const [showPO,     setShowPO]       = useState(false);
  const [showPay,    setShowPay]      = useState(false);
  const [deleteId,   setDeleteId]     = useState(null);
  const [editVendor, setEditVendor]   = useState(null);
  const [viewOrder,  setViewOrder]    = useState(null);

  /* forms */
  const [vendorForm, setVendorForm] = useState(EMPTY_VENDOR);
  const [poForm,     setPoForm]     = useState(EMPTY_PO);
  const [pmtForm,    setPmtForm]    = useState(EMPTY_PMT);
  const [vErrors,    setVErrors]    = useState({});
  const [poErrors,   setPoErrors]   = useState({});

  /* ── load ── */
  const load = useCallback(async () => {
    setLoading(true);
    try {
      if (tab === 0) {
        const v = await window.db.vendors.getAll({ search });
        setVendors(v || []);
      } else if (tab === 1) {
        const [o, v] = await Promise.all([
          window.db.vendors.getPurchaseOrders({ search }),
          window.db.vendors.getAll({}),
        ]);
        setOrders(o || []);
        setVendors(v || []);
      } else if (tab === 2) {
        const r = await window.db.vendors.getPurchaseReturns({ search });
        setReturns(r || []);
      } else if (tab === 3) {
        const [b, pmt, v] = await Promise.all([
          window.db.vendors.getPayBills({}),
          window.db.vendors.getVendorPayments({}),
          window.db.vendors.getAll({}),
        ]);
        setBills(b   || []);
        setPayments(pmt || []);
        setVendors(v || []);
      }
    } catch { toast('Failed to load data', 'error'); }
    setLoading(false);
  }, [tab, search]);

  useEffect(() => { load(); }, [load]);

  /* load products for PO form */
  useEffect(() => {
    window.db.inventory.getAll({}).then(p => setProducts(p || [])).catch(() => {});
  }, []);

  /* ── vendor helpers ── */
  const openAddVendor = () => {
    setEditVendor(null);
    setVendorForm(EMPTY_VENDOR);
    setVErrors({});
    setShowVendor(true);
    setMenuOpen(null);
  };

  const openEditVendor = (row) => {
    setEditVendor(row);
    setVendorForm({ ...row });
    setVErrors({});
    setShowVendor(true);
    setMenuOpen(null);
  };

  const validateVendor = () => {
    const e = {};
    if (!vendorForm.name.trim())  e.name  = 'Vendor name is required';
    if (!vendorForm.phone.trim()) e.phone = 'Phone is required';
    setVErrors(e);
    return Object.keys(e).length === 0;
  };

  const saveVendor = async () => {
    if (!validateVendor()) return;
    try {
      if (editVendor) {
        await window.db.vendors.update(editVendor.id, vendorForm);
        toast('Vendor updated');
      } else {
        await window.db.vendors.add(vendorForm);
        toast('Vendor added');
      }
      setShowVendor(false);
      load();
    } catch (err) { toast(err?.message || 'Failed to save vendor', 'error'); }
  };

  const deleteVendor = async () => {
    try {
      await window.db.vendors.delete(deleteId);
      toast('Vendor deleted');
      setDeleteId(null);
      load();
    } catch { toast('Cannot delete vendor with purchase history', 'error'); setDeleteId(null); }
  };

  /* ── PO helpers ── */
  const openAddPO = () => {
    setPoForm({ ...EMPTY_PO, items: [] });
    setPoErrors({});
    setShowPO(true);
    setMenuOpen(null);
  };

  const addPOItem = () =>
    setPoForm(f => ({
      ...f,
      items: [...f.items, { product_id:'', product_name:'', qty:1, rate:0, amount:0 }],
    }));

  const updatePOItem = (idx, field, val) =>
    setPoForm(f => ({
      ...f,
      items: f.items.map((item, i) => {
        if (i !== idx) return item;
        const u = { ...item, [field]: val };
        const qty  = field === 'qty'  ? +val : +item.qty;
        const rate = field === 'rate' ? +val : +item.rate;
        u.amount = qty * rate;
        /* auto-fill name when product chosen */
        if (field === 'product_id') {
          const p = products.find(x => String(x.id) === String(val));
          if (p) { u.product_name = p.name; u.rate = p.purchase_price; u.amount = qty * p.purchase_price; }
        }
        return u;
      }),
    }));

  const removePOItem = (idx) =>
    setPoForm(f => ({ ...f, items: f.items.filter((_, i) => i !== idx) }));

  const validatePO = () => {
    const e = {};
    if (!poForm.vendor_id)      e.vendor_id = 'Select a vendor';
    if (poForm.items.length ===0) e.items   = 'Add at least one item';
    setPoErrors(e);
    return Object.keys(e).length === 0;
  };

  const savePO = async () => {
    if (!validatePO()) return;
    try {
      const poTotal = poForm.items.reduce((s, i) => s + (+i.amount || 0), 0);
      await window.db.vendors.createPurchaseOrder({ ...poForm, total_amount: poTotal });
      toast('Purchase order created');
      setShowPO(false);
      load();
    } catch (err) { toast(err?.message || 'Failed to create PO', 'error'); }
  };

  const updatePOStatus = async (id, status) => {
    try {
      await window.db.vendors.updatePurchaseOrder(id, { status });
      toast(`PO marked as ${status}`);
      load();
    } catch { toast('Failed to update status', 'error'); }
  };

  /* ── Payment helpers ── */
  const openPay = (vendorId) => {
    setPmtForm({ ...EMPTY_PMT, vendor_id: vendorId });
    setShowPay(true);
  };

  const savePmt = async () => {
    if (!pmtForm.vendor_id || !pmtForm.amount || +pmtForm.amount <= 0) {
      toast('Select vendor and enter valid amount', 'warning');
      return;
    }
    try {
      await window.db.vendors.createVendorPayment(pmtForm);
      toast(`Payment of ${formatCurrency(pmtForm.amount)} recorded`);
      setShowPay(false);
      load();
    } catch (err) { toast(err?.message || 'Failed to record payment', 'error'); }
  };

  /* ── Action menus ── */
  const vendorAction = (row) => (
    <div className="relative" onClick={e => e.stopPropagation()}>
      <button onClick={() => setMenuOpen(menuOpen === row.id ? null : row.id)}
        className="p-1.5 hover:bg-gray-100 rounded-lg">
        <MoreVertical size={14} className="text-gray-500" />
      </button>
      {menuOpen === row.id && (
        <div className="absolute right-0 top-8 bg-white border border-gray-100 rounded-xl shadow-xl z-20 py-1 min-w-[140px]">
          <button onClick={() => openEditVendor(row)}
            className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50">
            <Edit2 size={13} className="text-gray-400" /> Edit
          </button>
          <button onClick={() => { setMenuOpen(null); openPay(row.id); }}
            className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50">
            <CreditCard size={13} className="text-gray-400" /> Pay Bill
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

  const poAction = (row) => (
    <div className="relative flex items-center gap-1" onClick={e => e.stopPropagation()}>
      <button onClick={() => setViewOrder(row)}
        className="p-1.5 hover:bg-gray-100 rounded-lg" title="View">
        <Eye size={14} className="text-gray-500" />
      </button>
      {row.status === 'Pending' && (
        <button onClick={() => updatePOStatus(row.id, 'Received')}
          className="px-2 py-1 text-xs bg-green-100 text-green-700 rounded-lg hover:bg-green-200 font-medium">
          Mark Received
        </button>
      )}
    </div>
  );

  /* ── Columns ── */
  const vendorCols = [
    { header:'S.No',       render:(_,__,i)=><span className="text-gray-400">{i+1}</span> },
    { header:'Vendor Name',key:'name',             render:v=><span className="font-semibold text-gray-900">{v}</span>, sortable:true },
    { header:'Contact',    key:'contact_person',   render:v=>v||'—' },
    { header:'Phone',      key:'phone' },
    { header:'Email',      key:'email',            render:v=>v||'—' },
    { header:'Outstanding',key:'outstanding_balance', render:v=><span className={`font-semibold ${+v>0?'text-red-500':'text-green-600'}`}>{formatCurrency(v)}</span>, sortable:true },
    { header:'Status',     key:'status',           render:v=><StatusBadge status={v}/> },
    { header:'Actions',    render:(_,row)=>vendorAction(row) },
  ];

  const poCols = [
    { header:'S.No',        render:(_,__,i)=><span className="text-gray-400">{i+1}</span> },
    { header:'PO Number',   key:'po_number',       render:v=><span className="font-semibold text-gray-900">{v}</span> },
    { header:'Vendor',      key:'vendor_name',     sortable:true },
    { header:'PO Date',     key:'po_date',         render:v=>formatDate(v) },
    { header:'Expected',    key:'expected_date',   render:v=>formatDate(v) },
    { header:'Total',       key:'total_amount',    render:v=><span className="font-semibold">{formatCurrency(v)}</span> },
    { header:'Status',      key:'status',          render:v=><StatusBadge status={v}/> },
    { header:'Actions',     render:(_,row)=>poAction(row) },
  ];

  const returnCols = [
    { header:'S.No',        render:(_,__,i)=><span className="text-gray-400">{i+1}</span> },
    { header:'Return No.',  key:'return_number',   render:v=><span className="font-semibold">{v}</span> },
    { header:'PO Ref',      key:'po_number',       render:v=>v||'—' },
    { header:'Vendor',      key:'vendor_name' },
    { header:'Return Date', key:'return_date',     render:v=>formatDate(v) },
    { header:'Amount',      key:'total_amount',    render:v=><span className="text-red-500 font-semibold">-{formatCurrency(v)}</span> },
    { header:'Reason',      key:'reason',          render:v=>v||'—' },
  ];

  const pmtCols = [
    { header:'S.No',        render:(_,__,i)=><span className="text-gray-400">{i+1}</span> },
    { header:'Vendor',      key:'vendor_name',     sortable:true },
    { header:'Date',        key:'payment_date',    render:v=>formatDate(v) },
    { header:'Amount',      key:'amount',          render:v=><span className="font-semibold text-gray-900">{formatCurrency(v)}</span> },
    { header:'Mode',        key:'payment_mode' },
    { header:'Reference',   key:'reference',       render:v=>v||'—' },
    { header:'Notes',       key:'notes',           render:v=>v||'—' },
  ];

  const vendorOpts = vendors.map(v => ({ value: v.id, label: v.name }));
  const productOpts = products.map(p => ({ value: p.id, label: `${p.name} (${p.sku})` }));

  const poTotal = poForm.items.reduce((s, i) => s + (+i.amount || 0), 0);

  return (
    <div className="flex flex-col h-full overflow-hidden" onClick={() => setMenuOpen(null)}>
      <TopBar title="Vendors & Purchases" subtitle="Manage vendors, purchase orders and payments" />

      <div className="flex-1 overflow-y-auto p-6 space-y-4 anim-fadeup">

        {/* tabs + action */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 bg-white rounded-xl p-1.5 border border-gray-100 shadow-sm w-fit">
            {TABS.map((t, i) => (
              <button key={i} onClick={() => setTab(i)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all
                  ${tab===i ? 'bg-gray-900 text-white shadow-sm' : 'text-gray-500 hover:text-gray-800 hover:bg-gray-100'}`}>
                {t}
              </button>
            ))}
          </div>

          {tab === 0 && (
            <button onClick={openAddVendor}
              className="flex items-center gap-2 bg-gray-900 text-white px-4 py-2 rounded-xl text-sm font-medium hover:bg-gray-800 shadow-sm">
              <Plus size={15}/> Add Vendor
            </button>
          )}
          {tab === 1 && (
            <button onClick={openAddPO}
              className="flex items-center gap-2 bg-gray-900 text-white px-4 py-2 rounded-xl text-sm font-medium hover:bg-gray-800 shadow-sm">
              <Plus size={15}/> New Purchase Order
            </button>
          )}
          {tab === 3 && (
            <button onClick={() => { setPmtForm(EMPTY_PMT); setShowPay(true); }}
              className="flex items-center gap-2 bg-gray-900 text-white px-4 py-2 rounded-xl text-sm font-medium hover:bg-gray-800 shadow-sm">
              <Plus size={15}/> Record Payment
            </button>
          )}
        </div>

        {/* search row */}
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
            <input className="pl-9 pr-3 py-2 text-sm bg-white border border-gray-200 rounded-xl w-56
                              focus:outline-none focus:ring-2 focus:ring-gray-200"
              placeholder="Search…" value={search} onChange={e=>setSearch(e.target.value)} />
          </div>
          <button onClick={load} className="p-2 bg-white border border-gray-200 rounded-xl hover:bg-gray-50">
            <RefreshCw size={14} className="text-gray-500" />
          </button>
        </div>

        {/* tables */}
        {tab === 0 && <DataTable columns={vendorCols} data={vendors}  loading={loading} emptyMessage="No vendors found." />}
        {tab === 1 && <DataTable columns={poCols}     data={orders}   loading={loading} emptyMessage="No purchase orders found." />}
        {tab === 2 && <DataTable columns={returnCols} data={returns}  loading={loading} emptyMessage="No returns found." />}
        {tab === 3 && (
          <div className="space-y-4">
            {/* outstanding bills */}
            {bills.length > 0 && (
              <div>
                <h3 className="text-sm font-semibold text-gray-500 mb-2">Outstanding Bills</h3>
                <div className="grid grid-cols-3 gap-3">
                  {bills.map(b => (
                    <div key={b.id} className="bg-white border border-orange-100 rounded-xl p-4">
                      <p className="font-semibold text-gray-900 text-sm">{b.name}</p>
                      <p className="text-2xl font-black text-red-600 mt-1">{formatCurrency(b.outstanding_balance)}</p>
                      <button onClick={() => openPay(b.id)}
                        className="mt-3 w-full px-3 py-1.5 bg-gray-900 text-white rounded-xl text-xs font-semibold hover:bg-gray-800">
                        Pay Now
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
            <h3 className="text-sm font-semibold text-gray-500">Payment History</h3>
            <DataTable columns={pmtCols} data={payments} loading={loading} emptyMessage="No payments recorded." />
          </div>
        )}
      </div>

      {/* ── Vendor Modal ── */}
      {showVendor && (
        <Modal title={editVendor ? 'Edit Vendor' : 'Add Vendor'}
               onClose={() => { setShowVendor(false); setEditVendor(null); }} size="md">
          <div className="space-y-4">
            <FormInput label="Vendor Name" required value={vendorForm.name}
              onChange={e=>setVendorForm(f=>({...f,name:e.target.value}))} error={vErrors.name} placeholder="Company name" />
            <div className="grid grid-cols-2 gap-4">
              <FormInput label="Contact Person" value={vendorForm.contact_person}
                onChange={e=>setVendorForm(f=>({...f,contact_person:e.target.value}))} placeholder="Primary contact" />
              <FormInput label="Phone" required value={vendorForm.phone}
                onChange={e=>setVendorForm(f=>({...f,phone:e.target.value}))} error={vErrors.phone} placeholder="Phone number" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <FormInput label="Email" value={vendorForm.email}
                onChange={e=>setVendorForm(f=>({...f,email:e.target.value}))} placeholder="email@domain.com" />
              <FormInput label="GSTIN / Tax ID" value={vendorForm.gstin}
                onChange={e=>setVendorForm(f=>({...f,gstin:e.target.value}))} placeholder="Tax number" />
            </div>
            <FormInput label="Address" value={vendorForm.address}
              onChange={e=>setVendorForm(f=>({...f,address:e.target.value}))} placeholder="Full address" />
            <div className="grid grid-cols-2 gap-4">
              <FormInput label="Opening Balance" prefix="$" type="number" value={vendorForm.opening_balance}
                onChange={e=>setVendorForm(f=>({...f,opening_balance:e.target.value}))} placeholder="0.00" />
              <FormSelect label="Status" value={vendorForm.status}
                onChange={e=>setVendorForm(f=>({...f,status:e.target.value}))}
                options={['Active','Inactive']} />
            </div>
            <div className="flex gap-3 pt-2 border-t border-gray-100">
              <button onClick={() => { setShowVendor(false); setEditVendor(null); }}
                className="px-4 py-2 text-sm border border-gray-200 rounded-xl font-medium text-gray-700 hover:bg-gray-50">
                Cancel
              </button>
              <button onClick={saveVendor}
                className="ml-auto px-5 py-2 bg-gray-900 text-white rounded-xl text-sm font-semibold hover:bg-gray-800 shadow-sm">
                {editVendor ? 'Update Vendor' : 'Save Vendor'}
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* ── PO Modal ── */}
      {showPO && (
        <Modal title="New Purchase Order" onClose={() => setShowPO(false)} size="xl">
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-4">
              <FormSelect label="Vendor" required value={poForm.vendor_id}
                onChange={e=>setPoForm(f=>({...f,vendor_id:e.target.value}))}
                options={vendorOpts} placeholder="Select vendor" error={poErrors.vendor_id} />
              <FormInput label="PO Date" type="date" value={poForm.po_date}
                onChange={e=>setPoForm(f=>({...f,po_date:e.target.value}))} />
              <FormInput label="Expected Delivery" type="date" value={poForm.expected_date}
                onChange={e=>setPoForm(f=>({...f,expected_date:e.target.value}))} />
            </div>

            {/* PO line items */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Items</label>
                <button onClick={addPOItem}
                  className="text-xs text-blue-600 font-semibold hover:text-blue-700">+ Add Item</button>
              </div>
              {poErrors.items && <p className="text-[11px] text-red-500 mb-1">{poErrors.items}</p>}
              {poForm.items.length > 0 ? (
                <div className="border border-gray-200 rounded-xl overflow-hidden">
                  <table className="w-full">
                    <thead>
                      <tr className="bg-gray-900">
                        {['Product','Qty','Rate','Amount',''].map(h=>(
                          <th key={h} className="px-3 py-2.5 text-left text-[11px] font-semibold text-gray-400 uppercase">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {poForm.items.map((item,idx)=>(
                        <tr key={idx} className="border-t border-gray-100">
                          <td className="px-3 py-2">
                            <select value={item.product_id}
                              onChange={e=>updatePOItem(idx,'product_id',e.target.value)}
                              className="w-full text-sm border border-gray-200 rounded-lg px-2 py-1.5 focus:outline-none">
                              <option value="">Select product</option>
                              {products.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}
                            </select>
                          </td>
                          <td className="px-3 py-2">
                            <input type="number" min="1" value={item.qty}
                              onChange={e=>updatePOItem(idx,'qty',e.target.value)}
                              className="w-16 text-center text-sm border border-gray-200 rounded-lg px-2 py-1.5 focus:outline-none" />
                          </td>
                          <td className="px-3 py-2">
                            <input type="number" min="0" step="0.01" value={item.rate}
                              onChange={e=>updatePOItem(idx,'rate',e.target.value)}
                              className="w-24 text-sm border border-gray-200 rounded-lg px-2 py-1.5 focus:outline-none" />
                          </td>
                          <td className="px-3 py-2 text-sm font-semibold text-gray-900">{formatCurrency(item.amount)}</td>
                          <td className="px-3 py-2">
                            <button onClick={()=>removePOItem(idx)}
                              className="text-red-400 hover:text-red-600 text-xs font-medium">✕</button>
                          </td>
                        </tr>
                      ))}
                      <tr className="border-t border-gray-200 bg-gray-50">
                        <td colSpan={3} className="px-3 py-2 text-right text-sm font-bold text-gray-700">Total</td>
                        <td className="px-3 py-2 text-sm font-black text-gray-900">{formatCurrency(poTotal)}</td>
                        <td/>
                      </tr>
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="border-2 border-dashed border-gray-200 rounded-xl py-8 text-center">
                  <p className="text-sm text-gray-400">No items added yet</p>
                  <button onClick={addPOItem}
                    className="mt-2 text-xs text-blue-600 font-semibold hover:underline">+ Add first item</button>
                </div>
              )}
            </div>

            <FormInput label="Notes" value={poForm.notes}
              onChange={e=>setPoForm(f=>({...f,notes:e.target.value}))} placeholder="Optional notes" />

            <div className="flex gap-3 pt-2 border-t border-gray-100">
              <button onClick={() => setShowPO(false)}
                className="px-4 py-2 text-sm border border-gray-200 rounded-xl font-medium text-gray-700 hover:bg-gray-50">
                Cancel
              </button>
              <button onClick={savePO}
                className="ml-auto px-5 py-2 bg-gray-900 text-white rounded-xl text-sm font-semibold hover:bg-gray-800 shadow-sm">
                Create Purchase Order
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* ── Pay Modal ── */}
      {showPay && (
        <Modal title="Record Vendor Payment" onClose={() => setShowPay(false)} size="sm">
          <div className="space-y-4">
            <FormSelect label="Vendor" required value={pmtForm.vendor_id}
              onChange={e=>setPmtForm(f=>({...f,vendor_id:e.target.value}))}
              options={vendorOpts} placeholder="Select vendor" />
            <div className="grid grid-cols-2 gap-4">
              <FormInput label="Payment Date" type="date" value={pmtForm.payment_date}
                onChange={e=>setPmtForm(f=>({...f,payment_date:e.target.value}))} />
              <FormInput label="Amount" required prefix="$" type="number" min="0" step="0.01"
                value={pmtForm.amount} onChange={e=>setPmtForm(f=>({...f,amount:e.target.value}))} placeholder="0.00" />
            </div>
            <FormSelect label="Payment Mode" value={pmtForm.payment_mode}
              onChange={e=>setPmtForm(f=>({...f,payment_mode:e.target.value}))}
              options={['Cash','Bank Transfer','Cheque','UPI','Card']} />
            <FormInput label="Reference / Cheque No." value={pmtForm.reference}
              onChange={e=>setPmtForm(f=>({...f,reference:e.target.value}))} placeholder="Optional" />
            <FormInput label="Notes" value={pmtForm.notes}
              onChange={e=>setPmtForm(f=>({...f,notes:e.target.value}))} placeholder="Optional" />
            <div className="flex gap-3 pt-2 border-t border-gray-100">
              <button onClick={() => setShowPay(false)}
                className="px-4 py-2 text-sm border border-gray-200 rounded-xl font-medium text-gray-700 hover:bg-gray-50">
                Cancel
              </button>
              <button onClick={savePmt}
                className="ml-auto px-5 py-2 bg-gray-900 text-white rounded-xl text-sm font-semibold hover:bg-gray-800 shadow-sm">
                Record Payment
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* ── View PO Modal ── */}
      {viewOrder && (
        <Modal title={`Purchase Order — ${viewOrder.po_number}`}
               onClose={() => setViewOrder(null)} size="md">
          <div className="space-y-4">
            <div className="flex justify-between">
              <div>
                <p className="text-sm font-semibold text-gray-900">{viewOrder.vendor_name}</p>
                <p className="text-xs text-gray-400 mt-0.5">PO Date: {formatDate(viewOrder.po_date)}</p>
              </div>
              <StatusBadge status={viewOrder.status} />
            </div>
            {viewOrder.items?.length > 0 ? (
              <div className="border border-gray-200 rounded-xl overflow-hidden">
                <table className="w-full">
                  <thead>
                    <tr className="bg-gray-900">
                      {['Item','Qty','Rate','Amount'].map(h=>(
                        <th key={h} className="px-4 py-2.5 text-left text-[11px] font-semibold text-gray-400 uppercase">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {viewOrder.items.map((item,i)=>(
                      <tr key={i} className="border-t border-gray-100">
                        <td className="px-4 py-2.5 text-sm font-medium text-gray-900">{item.product_name}</td>
                        <td className="px-4 py-2.5 text-sm text-gray-600">{item.qty}</td>
                        <td className="px-4 py-2.5 text-sm text-gray-600">{formatCurrency(item.rate)}</td>
                        <td className="px-4 py-2.5 text-sm font-semibold">{formatCurrency(item.amount)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : <p className="text-sm text-gray-400 text-center py-4">No items loaded</p>}
            <div className="flex justify-between items-center bg-gray-50 rounded-xl px-4 py-3">
              <span className="font-bold text-gray-900">Total Amount</span>
              <span className="text-xl font-black text-gray-900">{formatCurrency(viewOrder.total_amount)}</span>
            </div>
            <div className="flex justify-end gap-3 pt-1 border-t border-gray-100">
              <button onClick={() => setViewOrder(null)}
                className="px-4 py-2 bg-gray-900 text-white rounded-xl text-sm font-medium hover:bg-gray-800">
                Close
              </button>
            </div>
          </div>
        </Modal>
      )}

      {deleteId && (
        <ConfirmDialog title="Delete Vendor"
          message="This will permanently delete the vendor record."
          confirmText="Delete Vendor"
          onConfirm={deleteVendor}
          onCancel={() => setDeleteId(null)} />
      )}
    </div>
  );
}
