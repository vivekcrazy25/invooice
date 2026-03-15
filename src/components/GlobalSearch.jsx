import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Search, Package, FileText, Users, Building2,
  X, ArrowRight, ChevronRight, Loader2,
} from 'lucide-react';

/* ─── helpers ──────────────────────────────────────────────── */
function currency(v) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(v ?? 0);
}
function highlight(text = '', query = '') {
  if (!query.trim()) return text;
  const idx = text.toLowerCase().indexOf(query.toLowerCase());
  if (idx === -1) return text;
  return (
    <>
      {text.slice(0, idx)}
      <mark className="bg-yellow-100 text-yellow-900 rounded px-0.5 font-semibold">{text.slice(idx, idx + query.length)}</mark>
      {text.slice(idx + query.length)}
    </>
  );
}

/* ─── status badge colours ──────────────────────────────────── */
const STATUS_COLOR = {
  Paid:     'bg-green-100  text-green-700',
  Draft:    'bg-gray-100   text-gray-600',
  Credit:   'bg-orange-100 text-orange-700',
  Partial:  'bg-blue-100   text-blue-700',
  Void:     'bg-red-100    text-red-600',
  Active:   'bg-green-100  text-green-700',
  Inactive: 'bg-gray-100   text-gray-500',
  Low:      'bg-yellow-100 text-yellow-700',
  Critical: 'bg-red-100    text-red-600',
};

/* ─── hint chips shown when search box is empty ─────────────── */
const HINTS = [
  { icon: Package,   label: 'Products',  example: 'e.g. rice, SKU-001' },
  { icon: FileText,  label: 'Invoices',  example: 'e.g. INV-0023'      },
  { icon: Users,     label: 'Customers', example: 'e.g. John Smith'    },
  { icon: Building2, label: 'Vendors',   example: 'e.g. ABC Traders'   },
];

/* ─── flatten results into a navigable flat list ─────────────── */
function flattenResults({ products = [], invoices = [], vendors = [], customers = [] }) {
  return [
    ...products.map(p  => ({ type: 'product',  data: p  })),
    ...invoices.map(i  => ({ type: 'invoice',  data: i  })),
    ...customers.map(c => ({ type: 'customer', data: c  })),
    ...vendors.map(v   => ({ type: 'vendor',   data: v  })),
  ];
}

/* ─── navigation targets per type ───────────────────────────── */
function routeFor(type) {
  return { product: '/inventory', invoice: '/billing', customer: '/billing', vendor: '/vendors' }[type] || '/';
}

export default function GlobalSearch() {
  const navigate = useNavigate();
  const [query,   setQuery]   = useState('');
  const [results, setResults] = useState(null);   // null = not searched yet
  const [loading, setLoading] = useState(false);
  const [open,    setOpen]    = useState(false);
  const [cursor,  setCursor]  = useState(-1);      // keyboard-nav index

  const inputRef     = useRef(null);
  const dropdownRef  = useRef(null);
  const debounceRef  = useRef(null);

  const flat = results ? flattenResults(results) : [];
  const hasResults = flat.length > 0;

  /* ── debounced search ──────────────────────────────────────── */
  const doSearch = useCallback(async (q) => {
    if (!q.trim()) { setResults(null); setLoading(false); return; }
    setLoading(true);
    try {
      const res = await window.db.settings.globalSearch(q);
      setResults(res);
    } catch (e) {
      console.error('globalSearch error', e);
      setResults({ products: [], invoices: [], vendors: [], customers: [] });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    clearTimeout(debounceRef.current);
    if (query.trim().length === 0) { setResults(null); setCursor(-1); return; }
    debounceRef.current = setTimeout(() => doSearch(query), 280);
    return () => clearTimeout(debounceRef.current);
  }, [query, doSearch]);

  /* ── close on outside click ────────────────────────────────── */
  useEffect(() => {
    const handler = (e) => {
      if (
        dropdownRef.current && !dropdownRef.current.contains(e.target) &&
        inputRef.current    && !inputRef.current.contains(e.target)
      ) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  /* ── keyboard navigation ───────────────────────────────────── */
  const handleKey = (e) => {
    if (!open) return;
    if (e.key === 'Escape') { setOpen(false); inputRef.current?.blur(); return; }
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setCursor(c => Math.min(c + 1, flat.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setCursor(c => Math.max(c - 1, -1));
    } else if (e.key === 'Enter' && cursor >= 0 && flat[cursor]) {
      e.preventDefault();
      selectItem(flat[cursor]);
    }
  };

  /* ── navigate to item ──────────────────────────────────────── */
  const selectItem = ({ type, data }) => {
    navigate(routeFor(type));
    setOpen(false);
    setQuery('');
    setResults(null);
    setCursor(-1);
  };

  /* ── clear ─────────────────────────────────────────────────── */
  const clear = () => {
    setQuery('');
    setResults(null);
    setCursor(-1);
    inputRef.current?.focus();
  };

  /* ── total count across groups ─────────────────────────────── */
  const total = results
    ? (results.products?.length ?? 0) + (results.invoices?.length ?? 0)
      + (results.vendors?.length ?? 0) + (results.customers?.length ?? 0)
    : 0;

  /* ─── render ─────────────────────────────────────────────────── */
  return (
    <div className="relative" style={{ width: 260 }}>
      {/* ── Input ── */}
      <div className="relative flex items-center">
        {loading
          ? <Loader2 size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 animate-spin pointer-events-none" />
          : <Search   size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
        }
        <input
          ref={inputRef}
          value={query}
          onChange={e => { setQuery(e.target.value); setOpen(true); setCursor(-1); }}
          onFocus={() => setOpen(true)}
          onKeyDown={handleKey}
          className="pl-8 pr-7 py-1.5 text-sm bg-gray-50 border border-gray-200 rounded-lg w-full
                     focus:outline-none focus:ring-2 focus:ring-indigo-200 focus:border-indigo-300
                     transition-all placeholder:text-gray-400"
          placeholder="Search products, invoices…"
        />
        {query && (
          <button
            onMouseDown={e => { e.preventDefault(); clear(); }}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
          >
            <X size={12} />
          </button>
        )}
      </div>

      {/* ── Dropdown ── */}
      {open && (
        <div
          ref={dropdownRef}
          className="absolute right-0 mt-1.5 bg-white rounded-xl shadow-2xl border border-gray-100
                     overflow-hidden z-50 flex flex-col"
          style={{ width: 360, maxHeight: 480 }}
        >
          {/* ── Empty state: hint chips ── */}
          {!query && !results && (
            <div className="p-4">
              <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-3">
                What can I search?
              </p>
              <div className="grid grid-cols-2 gap-2">
                {HINTS.map(({ icon: Icon, label, example }) => (
                  <div
                    key={label}
                    className="flex items-start gap-2 p-2.5 rounded-lg bg-gray-50 hover:bg-indigo-50
                               border border-gray-100 hover:border-indigo-200 cursor-default transition-colors"
                    onMouseDown={() => { inputRef.current?.focus(); }}
                  >
                    <div className="w-6 h-6 rounded-md bg-white shadow-sm flex items-center justify-center flex-shrink-0 mt-0.5">
                      <Icon size={12} className="text-indigo-500" />
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-gray-700">{label}</p>
                      <p className="text-[10px] text-gray-400">{example}</p>
                    </div>
                  </div>
                ))}
              </div>
              <p className="text-[10px] text-gray-400 mt-3 text-center">
                Type to search • ↑↓ navigate • Enter to open • Esc to close
              </p>
            </div>
          )}

          {/* ── Loading ── */}
          {loading && query && (
            <div className="flex items-center gap-2 px-4 py-5 text-sm text-gray-500">
              <Loader2 size={14} className="animate-spin text-indigo-500" />
              Searching…
            </div>
          )}

          {/* ── No results ── */}
          {!loading && results && !hasResults && (
            <div className="px-4 py-5 text-center">
              <Search size={28} className="mx-auto text-gray-200 mb-2" />
              <p className="text-sm font-medium text-gray-500">No results for "{query}"</p>
              <p className="text-xs text-gray-400 mt-0.5">Try a product name, SKU, invoice number, or customer</p>
            </div>
          )}

          {/* ── Results ── */}
          {!loading && hasResults && (
            <div className="overflow-y-auto" style={{ maxHeight: 430 }}>
              {/* count bar */}
              <div className="sticky top-0 bg-white border-b border-gray-50 px-3 py-1.5 flex items-center justify-between">
                <span className="text-[10px] text-gray-400 font-medium">
                  {total} result{total !== 1 ? 's' : ''} for <span className="text-gray-600 font-semibold">"{query}"</span>
                </span>
                <ChevronRight size={11} className="text-gray-300" />
              </div>

              {/* Products */}
              {results.products?.length > 0 && (
                <Section icon={Package} label="Products" color="bg-indigo-50 text-indigo-600">
                  {results.products.map((p, i) => {
                    const globalIdx = flat.findIndex(f => f.type === 'product' && f.data.id === p.id);
                    return (
                      <ResultRow
                        key={p.id}
                        active={cursor === globalIdx}
                        onMouseEnter={() => setCursor(globalIdx)}
                        onClick={() => selectItem({ type: 'product', data: p })}
                      >
                        <div className="flex items-center gap-2.5 flex-1 min-w-0">
                          <div className="w-7 h-7 rounded-lg bg-indigo-50 flex items-center justify-center flex-shrink-0">
                            <Package size={13} className="text-indigo-500" />
                          </div>
                          <div className="min-w-0">
                            <p className="text-xs font-semibold text-gray-800 truncate">
                              {highlight(p.name, query)}
                            </p>
                            <p className="text-[10px] text-gray-400">
                              {p.sku && <span className="mr-1.5">{highlight(p.sku, query)}</span>}
                              {p.category_name && <span className="text-gray-300">• {p.category_name}</span>}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-1.5 flex-shrink-0">
                          {p.status && (
                            <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${STATUS_COLOR[p.status] ?? 'bg-gray-100 text-gray-600'}`}>
                              {p.status}
                            </span>
                          )}
                          {p.selling_price != null && (
                            <span className="text-[10px] font-semibold text-gray-700">{currency(p.selling_price)}</span>
                          )}
                          <ArrowRight size={11} className="text-gray-300" />
                        </div>
                      </ResultRow>
                    );
                  })}
                </Section>
              )}

              {/* Invoices */}
              {results.invoices?.length > 0 && (
                <Section icon={FileText} label="Invoices" color="bg-green-50 text-green-600">
                  {results.invoices.map((inv) => {
                    const globalIdx = flat.findIndex(f => f.type === 'invoice' && f.data.id === inv.id);
                    return (
                      <ResultRow
                        key={inv.id}
                        active={cursor === globalIdx}
                        onMouseEnter={() => setCursor(globalIdx)}
                        onClick={() => selectItem({ type: 'invoice', data: inv })}
                      >
                        <div className="flex items-center gap-2.5 flex-1 min-w-0">
                          <div className="w-7 h-7 rounded-lg bg-green-50 flex items-center justify-center flex-shrink-0">
                            <FileText size={13} className="text-green-500" />
                          </div>
                          <div className="min-w-0">
                            <p className="text-xs font-semibold text-gray-800 truncate">
                              {highlight(inv.invoice_no, query)}
                            </p>
                            <p className="text-[10px] text-gray-400 truncate">
                              {highlight(inv.customer_name, query)}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-1.5 flex-shrink-0">
                          {inv.status && (
                            <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${STATUS_COLOR[inv.status] ?? 'bg-gray-100 text-gray-600'}`}>
                              {inv.status}
                            </span>
                          )}
                          <span className="text-[10px] font-semibold text-gray-700">{currency(inv.grand_total)}</span>
                          <ArrowRight size={11} className="text-gray-300" />
                        </div>
                      </ResultRow>
                    );
                  })}
                </Section>
              )}

              {/* Customers */}
              {results.customers?.length > 0 && (
                <Section icon={Users} label="Customers" color="bg-blue-50 text-blue-600">
                  {results.customers.map((c) => {
                    const globalIdx = flat.findIndex(f => f.type === 'customer' && f.data.id === c.id);
                    return (
                      <ResultRow
                        key={c.id}
                        active={cursor === globalIdx}
                        onMouseEnter={() => setCursor(globalIdx)}
                        onClick={() => selectItem({ type: 'customer', data: c })}
                      >
                        <div className="flex items-center gap-2.5 flex-1 min-w-0">
                          <div className="w-7 h-7 rounded-lg bg-blue-50 flex items-center justify-center flex-shrink-0">
                            <Users size={13} className="text-blue-500" />
                          </div>
                          <div className="min-w-0">
                            <p className="text-xs font-semibold text-gray-800 truncate">
                              {highlight(c.name, query)}
                            </p>
                            <p className="text-[10px] text-gray-400 truncate">
                              {c.phone && <span className="mr-1.5">{highlight(c.phone, query)}</span>}
                              {c.email && <span className="text-gray-300">{highlight(c.email, query)}</span>}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-1.5 flex-shrink-0">
                          {c.outstanding_balance > 0 && (
                            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-orange-100 text-orange-700">
                              {currency(c.outstanding_balance)} due
                            </span>
                          )}
                          <ArrowRight size={11} className="text-gray-300" />
                        </div>
                      </ResultRow>
                    );
                  })}
                </Section>
              )}

              {/* Vendors */}
              {results.vendors?.length > 0 && (
                <Section icon={Building2} label="Vendors" color="bg-amber-50 text-amber-600">
                  {results.vendors.map((v) => {
                    const globalIdx = flat.findIndex(f => f.type === 'vendor' && f.data.id === v.id);
                    return (
                      <ResultRow
                        key={v.id}
                        active={cursor === globalIdx}
                        onMouseEnter={() => setCursor(globalIdx)}
                        onClick={() => selectItem({ type: 'vendor', data: v })}
                      >
                        <div className="flex items-center gap-2.5 flex-1 min-w-0">
                          <div className="w-7 h-7 rounded-lg bg-amber-50 flex items-center justify-center flex-shrink-0">
                            <Building2 size={13} className="text-amber-500" />
                          </div>
                          <div className="min-w-0">
                            <p className="text-xs font-semibold text-gray-800 truncate">
                              {highlight(v.name, query)}
                            </p>
                            <p className="text-[10px] text-gray-400 truncate">
                              {v.contact_person && <span className="mr-1">{highlight(v.contact_person, query)}</span>}
                              {v.phone && <span className="text-gray-400">{highlight(v.phone, query)}</span>}
                            </p>
                          </div>
                        </div>
                        <ArrowRight size={11} className="text-gray-300 flex-shrink-0" />
                      </ResultRow>
                    );
                  })}
                </Section>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/* ─── sub-components ──────────────────────────────────────────── */
function Section({ icon: Icon, label, color, children }) {
  return (
    <div>
      <div className={`flex items-center gap-1.5 px-3 py-1.5 border-b border-gray-50`}>
        <div className={`w-4 h-4 rounded flex items-center justify-center ${color}`}>
          <Icon size={9} />
        </div>
        <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">{label}</span>
      </div>
      <div className="py-0.5">{children}</div>
    </div>
  );
}

function ResultRow({ active, onMouseEnter, onClick, children }) {
  return (
    <button
      type="button"
      onMouseEnter={onMouseEnter}
      onMouseDown={e => e.preventDefault()}   // don't blur input
      onClick={onClick}
      className={`w-full flex items-center gap-2 px-3 py-2 text-left transition-colors
        ${active ? 'bg-indigo-50' : 'hover:bg-gray-50'}`}
    >
      {children}
    </button>
  );
}
