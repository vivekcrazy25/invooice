import React, { useState, useEffect, useCallback } from 'react';
import {
  Plus, Search, RefreshCw, MoreVertical,
  Edit2, Trash2, Package, AlertTriangle,
  TrendingDown, TrendingUp, QrCode, ScanLine,
} from 'lucide-react';
import TopBar              from '../components/TopBar.jsx';
import DataTable           from '../components/DataTable.jsx';
import StatusBadge         from '../components/StatusBadge.jsx';
import StatCard            from '../components/StatCard.jsx';
import Modal               from '../components/Modal.jsx';
import ConfirmDialog       from '../components/ConfirmDialog.jsx';
import FormInput           from '../components/FormInput.jsx';
import FormSelect          from '../components/FormSelect.jsx';
import { useToast }        from '../components/ToastContext.jsx';
import BarcodeScannerModal from '../components/BarcodeScannerModal.jsx';
import BulkImportModal    from '../components/BulkImportModal.jsx';
import { useBarcodeGun }   from '../hooks/useBarcodeGun.js';
import { formatCurrency }  from '../utils/formatters.js';

const UNITS = ['PCS','KG','MTR','BOX','SET','ROLL','LTR','PKT','PAIR'];

const EMPTY = {
  name:'', category_id:'', hsn_code:'', unit:'PCS',
  purchase_price:'', selling_price:'', opening_stock:'0',
  reorder_level:'10', barcode:'',
};

function calcStatus(stock, reorder) {
  const s = parseInt(stock) || 0;
  const r = parseInt(reorder) || 10;
  return s <= 0 ? 'Critical' : s <= 5 ? 'Critical' : s <= r ? 'Low' : 'Good';
}

export default function Inventory() {
  const toast = useToast();

  /* list state */
  const [products,   setProducts]   = useState([]);
  const [categories, setCategories] = useState([]);
  const [stats,      setStats]      = useState({});
  const [loading,    setLoading]    = useState(true);

  /* filters */
  const [search,    setSearch]    = useState('');
  const [catFilter, setCatFilter] = useState('All');
  const [stFilter,  setStFilter]  = useState('All');

  /* modal state */
  const [showModal,   setShowModal]   = useState(false);
  const [showCatModal,setShowCatModal]= useState(false);
  const [editItem,    setEditItem]    = useState(null);
  const [deleteId,    setDeleteId]    = useState(null);
  const [menuOpen,    setMenuOpen]    = useState(null);

  /* barcode scanner */
  const [showScanner,    setShowScanner]    = useState(false);
  const [highlightedId,  setHighlightedId]  = useState(null);

  /* bulk import */
  const [showBulkImport, setShowBulkImport] = useState(false);

  const handleBarcodeScan = useCallback(async (code) => {
    setShowScanner(false);
    try {
      let product = await window.db.inventory.getByBarcode(code);
      if (!product) product = await window.db.inventory.getBySku(code);
      if (product) {
        // Set search to product name so it shows in the list
        setSearch(product.name);
        setHighlightedId(product.id);
        toast(`Found: ${product.name}`, 'success');
        setTimeout(() => setHighlightedId(null), 3000);
      } else {
        // Pre-fill barcode field in add modal
        setEditItem(null);
        setForm({ ...EMPTY, barcode: code });
        setErrors({});
        setShowModal(true);
        toast(`No product for barcode "${code}". Add it now.`, 'warning');
      }
    } catch {
      toast('Barcode lookup failed', 'error');
    }
  }, []); // eslint-disable-line

  /* Barcode gun listener */
  useBarcodeGun({ onScan: handleBarcodeScan, enabled: !showModal && !showScanner && !showCatModal });

  /* form */
  const [form,       setForm]   = useState(EMPTY);
  const [errors,     setErrors] = useState({});
  const [catName,    setCatName]= useState('');

  /* ── load ── */
  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [p, c, s] = await Promise.all([
        window.db.inventory.getAll({
          search,
          category: catFilter === 'All' ? '' : catFilter,
          status:   stFilter  === 'All' ? '' : stFilter,
        }),
        window.db.inventory.getCategories(),
        window.db.inventory.getStats(),
      ]);
      setProducts(p   || []);
      setCategories(c || []);
      setStats(s      || {});
    } catch { toast('Failed to load inventory', 'error'); }
    setLoading(false);
  }, [search, catFilter, stFilter]);

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
    setForm({
      name:           row.name,
      category_id:    row.category_id ?? '',
      hsn_code:       row.hsn_code    ?? '',
      unit:           row.unit        ?? 'PCS',
      purchase_price: row.purchase_price,
      selling_price:  row.selling_price,
      opening_stock:  row.opening_stock,
      reorder_level:  row.reorder_level,
      current_stock:  row.current_stock,
      barcode:        row.barcode ?? '',
    });
    setErrors({});
    setShowModal(true);
    setMenuOpen(null);
  };

  /* ── validate ── */
  const validate = () => {
    const e = {};
    if (!form.name.trim())                          e.name = 'Product name is required';
    if (!form.category_id)                          e.category_id = 'Category is required';
    if (form.unit === '')                           e.unit = 'Unit is required';
    if (!form.purchase_price || isNaN(form.purchase_price) || +form.purchase_price < 0)
                                                    e.purchase_price = 'Valid purchase price required';
    if (!form.selling_price  || isNaN(form.selling_price)  || +form.selling_price < 0)
                                                    e.selling_price  = 'Valid selling price required';
    if (+form.selling_price < +form.purchase_price) e.selling_price = 'Selling price should be ≥ purchase price';
    if (isNaN(form.reorder_level) || +form.reorder_level < 0)
                                                    e.reorder_level = 'Valid reorder level required';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  /* ── save ── */
  const handleSave = async () => {
    if (!validate()) return;
    try {
      if (editItem) {
        await window.db.inventory.update(editItem.id, form);
        toast('Product updated');
      } else {
        const res = await window.db.inventory.add(form);
        toast(`Product ${res.sku} added`);
      }
      setShowModal(false);
      setEditItem(null);
      load();
    } catch (err) {
      toast(err?.message || 'Failed to save product', 'error');
    }
  };

  /* ── delete ── */
  const handleDelete = async () => {
    try {
      const res = await window.db.inventory.delete(deleteId);
      if (!res.success) toast(res.error || 'Cannot delete product', 'error');
      else              toast('Product deleted');
      setDeleteId(null);
      load();
    } catch { toast('Failed to delete', 'error'); }
  };

  /* ── add category ── */
  const handleAddCategory = async () => {
    if (!catName.trim()) return;
    try {
      await window.db.inventory.addCategory(catName.trim(), '');
      toast(`Category "${catName}" added`);
      setCatName('');
      setShowCatModal(false);
      load();
    } catch { toast('Failed to add category', 'error'); }
  };

  /* ── stock colour ── */
  const stockCell = (v, row) => {
    const cls =
      row.status === 'Critical' ? 'text-red-600 font-bold' :
      row.status === 'Low'      ? 'text-orange-500 font-bold' :
                                  'text-green-600 font-bold';
    return <span className={cls}>{v}</span>;
  };

  /* ── action menu ── */
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
                        shadow-xl z-20 py-1 min-w-[130px]">
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
    { header:'S.No',           render:(_,__,i) => <span className="text-gray-400">{i+1}</span> },
    { header:'SKU',            key:'sku',            render:v=><span className="font-mono text-xs text-gray-600 bg-gray-100 px-1.5 py-0.5 rounded">{v}</span> },
    { header:'Product Name',   key:'name',           render:v=><span className="font-semibold text-gray-900">{v}</span>, sortable:true },
    { header:'Category',       key:'category_name',  render:v=>v||'—' },
    { header:'HSN',            key:'hsn_code',       render:v=>v||'—' },
    { header:'Purchase Price', key:'purchase_price', render:v=>formatCurrency(v), sortable:true },
    { header:'Selling Price',  key:'selling_price',  render:v=>formatCurrency(v), sortable:true },
    { header:'Stock',          key:'current_stock',  render:stockCell, sortable:true },
    { header:'Status',         key:'status',         render:v=><StatusBadge status={v}/> },
    { header:'Actions',        render:(_,row)=>actionCell(row) },
  ];

  const catOptions = categories.map(c => ({ value: c.id, label: c.name }));

  return (
    <div className="flex flex-col h-full overflow-hidden" onClick={() => setMenuOpen(null)}>
      <TopBar title="Inventory & Services" subtitle="Manage products, stock and categories" />

      <div className="flex-1 overflow-y-auto p-6 space-y-5 anim-fadeup">

        {/* stat cards */}
        <div className="grid grid-cols-4 gap-4">
          <StatCard title="Total Items"         value={stats.total     ?? 0}                      icon={Package}       color="blue"   loading={loading} />
          <StatCard title="Low Stock Alert"     value={(stats.lowStock ?? 0)+(stats.critical??0)} icon={AlertTriangle} color="pink"   loading={loading} />
          <StatCard title="Stock Value (Cost)"  value={formatCurrency(stats.stockCost)}           icon={TrendingDown}  color="yellow" loading={loading} />
          <StatCard title="Stock Value (Sell)"  value={formatCurrency(stats.stockSell)}           icon={TrendingUp}    color="green"  loading={loading} />
        </div>

        {/* filter row */}
        <div className="flex items-center gap-3 flex-wrap">
          <div className="relative">
            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
            <input
              className="pl-9 pr-3 py-2 text-sm bg-white border border-gray-200 rounded-xl w-56
                         focus:outline-none focus:ring-2 focus:ring-gray-200"
              placeholder="Search products…"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
          {/* Barcode scan button */}
          <button
            onClick={() => setShowScanner(true)}
            title="Scan barcode to find product"
            className="flex items-center gap-1.5 px-3 py-2 bg-white border border-gray-200 rounded-xl
                       text-sm text-gray-600 hover:bg-gray-50 hover:text-gray-900 transition-colors font-medium"
          >
            <ScanLine size={14}/> Scan Barcode
          </button>

          <select value={catFilter} onChange={e=>setCatFilter(e.target.value)}
            className="px-3 py-2 text-sm bg-white border border-gray-200 rounded-xl focus:outline-none">
            <option value="All">All Categories</option>
            {categories.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}
          </select>

          <select value={stFilter} onChange={e=>setStFilter(e.target.value)}
            className="px-3 py-2 text-sm bg-white border border-gray-200 rounded-xl focus:outline-none">
            <option value="All">All Status</option>
            <option value="Good">Good</option>
            <option value="Low">Low</option>
            <option value="Critical">Critical</option>
          </select>

          <button onClick={load}
            className="p-2 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors">
            <RefreshCw size={14} className="text-gray-500" />
          </button>

          <div className="ml-auto flex items-center gap-2">
            <button onClick={() => setShowCatModal(true)}
              className="px-3 py-2 text-sm border border-gray-200 bg-white rounded-xl font-medium
                         text-gray-700 hover:bg-gray-50 transition-colors">
              + Category
            </button>
            <button
              onClick={() => setShowBulkImport(true)}
              title="Import multiple products from Excel"
              className="flex items-center gap-1.5 px-3 py-2 text-sm border border-green-200 bg-green-50
                         text-green-700 rounded-xl font-medium hover:bg-green-100 transition-colors"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                <polyline points="17 8 12 3 7 8"/>
                <line x1="12" y1="3" x2="12" y2="15"/>
              </svg>
              Import Excel
            </button>
            <button onClick={openAdd}
              className="flex items-center gap-2 bg-gray-900 text-white px-4 py-2 rounded-xl
                         text-sm font-medium hover:bg-gray-800 transition-colors shadow-sm">
              <Plus size={15}/> Add Item
            </button>
          </div>
        </div>

        <DataTable
          columns={columns}
          data={products}
          loading={loading}
          emptyMessage="No products found."
          rowClassName={(row) => row.id === highlightedId ? 'bg-green-50 ring-1 ring-inset ring-green-200' : ''}
        />
      </div>

      {/* ── Add / Edit Product Modal ── */}
      {showModal && (
        <Modal
          title={editItem ? 'Edit Product' : 'Add New Product'}
          subtitle={editItem ? `SKU: ${editItem.sku}` : 'Fill in the product details'}
          onClose={() => { setShowModal(false); setEditItem(null); }}
          size="lg"
        >
          <div className="space-y-4">
            <FormInput
              label="Item Name" required
              value={form.name}
              onChange={e=>setField('name',e.target.value)}
              error={errors.name}
              placeholder="e.g. LED Bulb 9W"
            />

            <div className="grid grid-cols-2 gap-4">
              <FormSelect
                label="Category" required
                value={form.category_id}
                onChange={e=>setField('category_id',e.target.value)}
                options={catOptions}
                placeholder="Select category"
                error={errors.category_id}
              />
              <FormSelect
                label="Unit" required
                value={form.unit}
                onChange={e=>setField('unit',e.target.value)}
                options={UNITS}
                error={errors.unit}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormInput
                label="HSN Code"
                value={form.hsn_code}
                onChange={e=>setField('hsn_code',e.target.value)}
                placeholder="e.g. 8539"
              />
              <FormInput
                label="Purchase Price" required prefix="$"
                type="number" min="0" step="0.01"
                value={form.purchase_price}
                onChange={e=>setField('purchase_price',e.target.value)}
                error={errors.purchase_price}
                placeholder="0.00"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormInput
                label="Selling Price" required prefix="$"
                type="number" min="0" step="0.01"
                value={form.selling_price}
                onChange={e=>setField('selling_price',e.target.value)}
                error={errors.selling_price}
                placeholder="0.00"
              />
              <FormInput
                label="Reorder Level"
                type="number" min="0"
                value={form.reorder_level}
                onChange={e=>setField('reorder_level',e.target.value)}
                error={errors.reorder_level}
                placeholder="10"
              />
            </div>

            <FormInput
              label={editItem ? 'Current Stock' : 'Opening Stock'}
              type="number" min="0"
              value={editItem ? form.current_stock : form.opening_stock}
              onChange={e=>setField(editItem ? 'current_stock':'opening_stock', e.target.value)}
              placeholder="0"
            />

            {/* Barcode upload area */}
            <div className="border-2 border-dashed border-gray-200 rounded-xl p-5 text-center">
              <div className="w-10 h-10 bg-gray-100 rounded-xl flex items-center justify-center mx-auto mb-2">
                <QrCode size={20} className="text-gray-400" />
              </div>
              <p className="text-sm font-medium text-gray-600">Upload Barcode</p>
              <p className="text-xs text-gray-400 mt-0.5 mb-3">
                Scan your product barcode to upload
              </p>
              <input
                type="text"
                value={form.barcode}
                onChange={e=>setField('barcode',e.target.value)}
                className="w-full text-center text-sm border border-gray-200 rounded-xl px-3 py-1.5
                           focus:outline-none focus:ring-2 focus:ring-gray-200"
                placeholder="Or type barcode manually"
              />
            </div>

            {/* live status preview */}
            <div className="flex items-center gap-2 text-xs text-gray-500 bg-gray-50 rounded-xl px-4 py-2">
              <span>Stock status preview:</span>
              <StatusBadge status={calcStatus(
                editItem ? form.current_stock : form.opening_stock,
                form.reorder_level
              )} />
            </div>

            <div className="flex gap-3 pt-2 border-t border-gray-100">
              <button onClick={() => { setShowModal(false); setEditItem(null); }}
                className="px-4 py-2 text-sm border border-gray-200 rounded-xl font-medium text-gray-700 hover:bg-gray-50">
                Cancel
              </button>
              <button onClick={handleSave}
                className="ml-auto px-5 py-2 bg-gray-900 text-white rounded-xl text-sm font-semibold hover:bg-gray-800 shadow-sm">
                {editItem ? 'Update Product' : 'Save Product'}
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* ── Add Category Modal ── */}
      {showCatModal && (
        <Modal title="Add Category" onClose={() => setShowCatModal(false)} size="sm">
          <div className="space-y-4">
            <FormInput
              label="Category Name" required
              value={catName}
              onChange={e=>setCatName(e.target.value)}
              placeholder="e.g. LED & Lighting"
            />
            <div className="flex gap-3 pt-2 border-t border-gray-100">
              <button onClick={() => setShowCatModal(false)}
                className="px-4 py-2 text-sm border border-gray-200 rounded-xl font-medium hover:bg-gray-50">
                Cancel
              </button>
              <button onClick={handleAddCategory}
                className="ml-auto px-5 py-2 bg-gray-900 text-white rounded-xl text-sm font-semibold hover:bg-gray-800">
                Save Category
              </button>
            </div>
          </div>
        </Modal>
      )}

      {deleteId && (
        <ConfirmDialog
          title="Delete Product"
          message="This will permanently delete the product. Products with invoice history cannot be deleted."
          confirmText="Delete Product"
          onConfirm={handleDelete}
          onCancel={() => setDeleteId(null)}
        />
      )}

      {/* Barcode Scanner Modal */}
      {showScanner && (
        <BarcodeScannerModal
          title="Scan Product Barcode"
          onScan={handleBarcodeScan}
          onClose={() => setShowScanner(false)}
        />
      )}

      {/* Bulk Import Modal */}
      {showBulkImport && (
        <BulkImportModal
          categories={categories}
          onClose={() => setShowBulkImport(false)}
          onSuccess={() => { load(); toast('Products imported successfully!', 'success'); }}
        />
      )}
    </div>
  );
}
