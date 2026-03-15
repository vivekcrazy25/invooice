/**
 * BulkImportModal — Excel bulk import for Inventory
 *
 * Flow:
 *  1. User picks an .xlsx / .csv file
 *  2. File is parsed via electronAPI.importExcelFile (returns raw JSON rows)
 *  3. Auto-detect column mapping (fuzzy match against known field names)
 *  4. User can override each mapping with a dropdown
 *  5. Preview first 5 rows in a table
 *  6. Click "Import" → calls window.db.inventory.bulkAdd
 *  7. Show result summary (inserted / skipped / errors)
 */

import React, { useState, useRef } from 'react';
import {
  Upload, FileSpreadsheet, CheckCircle2, AlertCircle,
  ChevronDown, X, RefreshCw, ArrowRight,
} from 'lucide-react';

/* ── Field definitions ── */
const FIELDS = [
  { key: 'name',           label: 'Product Name', required: true  },
  { key: 'sku',            label: 'SKU',           required: false },
  { key: 'hsn_code',       label: 'HSN Code',      required: false },
  { key: 'purchase_price', label: 'Purchase Price', required: false },
  { key: 'selling_price',  label: 'Selling Price',  required: false },
  { key: 'opening_stock',  label: 'Opening Stock',  required: false },
  { key: 'reorder_level',  label: 'Reorder Level',  required: false },
  { key: 'unit',           label: 'Unit',           required: false },
  { key: 'barcode',        label: 'Barcode',        required: false },
  { key: 'category_name',  label: 'Category',       required: false },
];

/* Alias list for auto-detection */
const ALIASES = {
  name:           ['name','product name','item name','item','product','description','desc'],
  sku:            ['sku','item code','code','product code','part no','part number'],
  hsn_code:       ['hsn','hsn code','hsn/sac','tariff'],
  purchase_price: ['purchase price','cost price','cp','buy price','purchase','cost'],
  selling_price:  ['selling price','mrp','sale price','sp','price','unit price','rate'],
  opening_stock:  ['opening stock','qty','quantity','stock','opening qty','opening','initial stock'],
  reorder_level:  ['reorder','reorder level','reorder qty','min stock','minimum stock'],
  unit:           ['unit','uom','unit of measure','unit of measurement'],
  barcode:        ['barcode','bar code','upc','ean','qr'],
  category_name:  ['category','cat','group','product group','type'],
};

function autoDetect(headers) {
  const mapping = {};
  headers.forEach(h => {
    const norm = String(h).toLowerCase().trim();
    for (const [field, aliases] of Object.entries(ALIASES)) {
      if (aliases.includes(norm) && !Object.values(mapping).includes(field)) {
        mapping[h] = field;
        break;
      }
    }
  });
  return mapping;
}

/* ── Step labels ── */
const STEPS = ['Upload File', 'Map Columns', 'Preview & Import'];

export default function BulkImportModal({ categories = [], onClose, onSuccess }) {
  const [step,        setStep]        = useState(0);
  const [fileName,    setFileName]    = useState('');
  const [rawRows,     setRawRows]     = useState([]);    // parsed Excel rows
  const [headers,     setHeaders]     = useState([]);    // Excel column headers
  const [mapping,     setMapping]     = useState({});    // { excelHeader: fieldKey | '' }
  const [importing,   setImporting]   = useState(false);
  const [result,      setResult]      = useState(null);  // { inserted, skipped, errors }
  const [pickErr,     setPickErr]     = useState('');

  /* ── Step 1: pick file ── */
  const pickFile = async () => {
    setPickErr('');
    try {
      const res = await window.electronAPI.showOpenDialog({
        title: 'Select Excel File',
        filters: [{ name: 'Spreadsheets', extensions: ['xlsx', 'xls', 'csv'] }],
        properties: ['openFile'],
      });
      if (res.canceled || !res.filePaths?.length) return;
      const filePath = res.filePaths[0];
      setFileName(filePath.split(/[\\/]/).pop());

      const parsed = await window.electronAPI.importExcelFile(filePath);
      if (!parsed.success) { setPickErr(parsed.error || 'Failed to read file'); return; }
      if (!parsed.data?.length) { setPickErr('File is empty or has no data rows'); return; }

      const hdrs = Object.keys(parsed.data[0]);
      const det  = autoDetect(hdrs);

      setRawRows(parsed.data);
      setHeaders(hdrs);
      setMapping(det);
      setStep(1);
    } catch (e) {
      setPickErr(e?.message || 'Error reading file');
    }
  };

  /* ── Step 2 → Step 3 ── */
  const hasName = Object.values(mapping).includes('name');

  /* ── Step 3: import ── */
  const doImport = async () => {
    setImporting(true);
    try {
      // Build product objects from mapping
      const catMap = {};
      categories.forEach(c => { catMap[c.name.toLowerCase()] = c.id; });

      const products = rawRows.map(row => {
        const p = {};
        for (const [hdr, field] of Object.entries(mapping)) {
          if (field) p[field] = row[hdr];
        }
        // Resolve category name → id
        if (p.category_name) {
          p.category_id = catMap[String(p.category_name).toLowerCase()] || null;
          delete p.category_name;
        }
        return p;
      }).filter(p => p.name); // skip rows without name

      const res = await window.db.inventory.bulkAdd(products);
      setResult(res);
      setStep(2);
    } catch (e) {
      setResult({ success: false, error: e?.message });
      setStep(2);
    }
    setImporting(false);
  };

  /* ── UI helpers ── */
  const previewRows = rawRows.slice(0, 6);
  const mappedFields = new Set(Object.values(mapping).filter(Boolean));

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl flex flex-col max-h-[90vh] anim-modal">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-green-50 rounded-xl flex items-center justify-center">
              <FileSpreadsheet size={18} className="text-green-600" />
            </div>
            <div>
              <p className="font-bold text-gray-900 text-sm">Bulk Import Products</p>
              <p className="text-xs text-gray-400">Import multiple products from an Excel or CSV file</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors">
            <X size={16} className="text-gray-500" />
          </button>
        </div>

        {/* Step indicator */}
        <div className="flex items-center gap-0 px-6 py-3 border-b border-gray-100 bg-gray-50">
          {STEPS.map((s, i) => (
            <React.Fragment key={i}>
              <div className={`flex items-center gap-1.5 text-xs font-medium
                ${i === step ? 'text-gray-900' : i < step ? 'text-green-600' : 'text-gray-400'}`}>
                <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold
                  ${i === step ? 'bg-gray-900 text-white' : i < step ? 'bg-green-500 text-white' : 'bg-gray-200 text-gray-400'}`}>
                  {i < step ? '✓' : i + 1}
                </span>
                {s}
              </div>
              {i < STEPS.length - 1 && (
                <ArrowRight size={12} className="mx-3 text-gray-300 flex-shrink-0" />
              )}
            </React.Fragment>
          ))}
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6">

          {/* ── STEP 0: Upload ── */}
          {step === 0 && (
            <div className="space-y-4">
              <div
                onClick={pickFile}
                className="border-2 border-dashed border-gray-200 rounded-2xl p-10 text-center
                           cursor-pointer hover:border-gray-400 hover:bg-gray-50 transition-all group"
              >
                <div className="w-14 h-14 bg-green-50 rounded-2xl flex items-center justify-center mx-auto mb-4
                                group-hover:bg-green-100 transition-colors">
                  <Upload size={24} className="text-green-500" />
                </div>
                <p className="font-semibold text-gray-800 text-sm">Click to select Excel or CSV file</p>
                <p className="text-xs text-gray-400 mt-1">.xlsx, .xls, .csv — first sheet will be imported</p>
              </div>

              {pickErr && (
                <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 rounded-xl px-4 py-3">
                  <AlertCircle size={15} /> {pickErr}
                </div>
              )}

              {/* Template hint */}
              <div className="bg-blue-50 rounded-xl px-4 py-3 text-xs text-blue-700 space-y-1">
                <p className="font-semibold">📋 Recommended column names (auto-detected):</p>
                <p className="text-blue-600">
                  Product Name, SKU, Category, HSN Code, Purchase Price, Selling Price,
                  Opening Stock, Reorder Level, Unit, Barcode
                </p>
              </div>
            </div>
          )}

          {/* ── STEP 1: Map Columns ── */}
          {step === 1 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-gray-800">
                    Map Excel columns → Product fields
                  </p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {rawRows.length} rows found in <span className="font-medium">{fileName}</span>
                  </p>
                </div>
                <button
                  onClick={() => { setStep(0); setRawRows([]); setHeaders([]); }}
                  className="text-xs text-gray-500 hover:text-gray-800 flex items-center gap-1"
                >
                  <RefreshCw size={11} /> Change file
                </button>
              </div>

              <div className="rounded-xl border border-gray-200 overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-900 text-white text-xs">
                      <th className="text-left px-4 py-3 font-semibold">Excel Column</th>
                      <th className="text-left px-4 py-3 font-semibold">Maps to Field</th>
                      <th className="text-left px-4 py-3 font-semibold text-gray-400">Sample Value</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {headers.map(hdr => (
                      <tr key={hdr} className="hover:bg-gray-50">
                        <td className="px-4 py-2.5 font-medium text-gray-700">{hdr}</td>
                        <td className="px-4 py-2.5">
                          <div className="relative">
                            <select
                              value={mapping[hdr] || ''}
                              onChange={e => setMapping(m => ({ ...m, [hdr]: e.target.value }))}
                              className="w-full pl-3 pr-8 py-1.5 text-sm border border-gray-200 rounded-lg
                                         focus:outline-none focus:ring-2 focus:ring-gray-200 bg-white appearance-none"
                            >
                              <option value="">— Skip this column —</option>
                              {FIELDS.map(f => (
                                <option key={f.key} value={f.key}
                                  disabled={mappedFields.has(f.key) && mapping[hdr] !== f.key}>
                                  {f.label}{f.required ? ' *' : ''}
                                </option>
                              ))}
                            </select>
                            <ChevronDown size={12} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                          </div>
                        </td>
                        <td className="px-4 py-2.5 text-gray-400 text-xs font-mono truncate max-w-[140px]">
                          {String(rawRows[0]?.[hdr] ?? '—')}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {!hasName && (
                <div className="flex items-center gap-2 text-sm text-amber-700 bg-amber-50 rounded-xl px-4 py-3">
                  <AlertCircle size={15} className="flex-shrink-0" />
                  Please map at least one column to <strong>Product Name</strong> to continue.
                </div>
              )}
            </div>
          )}

          {/* ── STEP 2: Result ── */}
          {step === 2 && result && (
            <div className="space-y-4">
              {result.success === false ? (
                <div className="flex items-center gap-3 bg-red-50 rounded-xl px-5 py-4">
                  <AlertCircle size={20} className="text-red-500 flex-shrink-0" />
                  <div>
                    <p className="font-semibold text-red-700 text-sm">Import failed</p>
                    <p className="text-xs text-red-500 mt-0.5">{result.error}</p>
                  </div>
                </div>
              ) : (
                <>
                  <div className="flex items-center gap-3 bg-green-50 rounded-xl px-5 py-4">
                    <CheckCircle2 size={20} className="text-green-500 flex-shrink-0" />
                    <div>
                      <p className="font-semibold text-green-800 text-sm">Import complete!</p>
                      <p className="text-xs text-green-600 mt-0.5">
                        {result.inserted} product{result.inserted !== 1 ? 's' : ''} added
                        {result.skipped > 0 ? `, ${result.skipped} skipped` : ''}
                      </p>
                    </div>
                  </div>

                  {result.errors?.length > 0 && (
                    <div className="rounded-xl border border-red-100 overflow-hidden">
                      <div className="bg-red-50 px-4 py-2 text-xs font-semibold text-red-700">
                        Skipped rows ({result.errors.length})
                      </div>
                      <div className="divide-y divide-red-50 max-h-40 overflow-y-auto">
                        {result.errors.map((e, i) => (
                          <div key={i} className="flex items-start gap-3 px-4 py-2.5">
                            <AlertCircle size={13} className="text-red-400 mt-0.5 flex-shrink-0" />
                            <div>
                              <p className="text-xs font-medium text-gray-700">{e.name}</p>
                              <p className="text-xs text-gray-400">{e.error}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-gray-100 bg-gray-50 rounded-b-2xl">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm border border-gray-200 bg-white rounded-xl font-medium text-gray-700 hover:bg-gray-50 transition-colors"
          >
            {step === 2 ? 'Close' : 'Cancel'}
          </button>

          {step === 1 && (
            <button
              onClick={doImport}
              disabled={!hasName || importing}
              className={`flex items-center gap-2 px-5 py-2 rounded-xl text-sm font-semibold text-white transition-colors shadow-sm
                ${hasName && !importing ? 'bg-green-600 hover:bg-green-700' : 'bg-gray-300 cursor-not-allowed'}`}
            >
              {importing
                ? <><RefreshCw size={14} className="animate-spin" /> Importing…</>
                : <><Upload size={14} /> Import {rawRows.length} Rows</>
              }
            </button>
          )}

          {step === 2 && result?.success && (
            <button
              onClick={() => { onSuccess?.(); onClose(); }}
              className="flex items-center gap-2 px-5 py-2 bg-gray-900 text-white rounded-xl text-sm font-semibold hover:bg-gray-800 transition-colors shadow-sm"
            >
              <CheckCircle2 size={14} /> Done
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
