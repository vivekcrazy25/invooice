import React, { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Bell, X, AlertTriangle, Package, FileText,
  CreditCard, ChevronRight, RefreshCw, CheckCircle,
} from 'lucide-react';
import { useNotifications } from '../context/NotificationContext.jsx';
import { formatCurrency }   from '../utils/formatters.js';

/* ─── Small section header ─── */
function SectionHeader({ icon: Icon, label, count, color }) {
  return (
    <div className={`flex items-center gap-2 px-4 py-2 border-b border-gray-50`}>
      <div className={`w-6 h-6 rounded-lg flex items-center justify-center flex-shrink-0 ${color}`}>
        <Icon size={13} className="text-white" />
      </div>
      <span className="text-xs font-bold text-gray-700 flex-1">{label}</span>
      <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
        count > 0 ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-400'
      }`}>
        {count}
      </span>
    </div>
  );
}

/* ─── Empty section row ─── */
function EmptyRow({ label }) {
  return (
    <div className="flex items-center gap-2 px-4 py-3">
      <CheckCircle size={13} className="text-green-500 flex-shrink-0" />
      <p className="text-xs text-gray-400">{label}</p>
    </div>
  );
}

/* ─── NotificationPanel ─── */
export default function NotificationPanel({ onClose }) {
  const navigate = useNavigate();
  const panelRef = useRef(null);
  const { lowStock, draftInvoices, creditInvoices, total, loading, refresh } = useNotifications();

  /* Close on outside click */
  useEffect(() => {
    function handleClick(e) {
      if (panelRef.current && !panelRef.current.contains(e.target)) onClose();
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [onClose]);

  const go = (path) => { navigate(path); onClose(); };

  return (
    <div
      ref={panelRef}
      className="absolute right-0 top-full mt-2 w-80 bg-white rounded-2xl shadow-2xl
                 border border-gray-100 z-50 overflow-hidden flex flex-col"
      style={{ maxHeight: 520 }}
    >
      {/* ── Header ── */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
        <div className="flex items-center gap-2">
          <Bell size={15} className="text-gray-700" />
          <h3 className="text-sm font-bold text-gray-900">Notifications</h3>
          {total > 0 && (
            <span className="text-[10px] font-bold bg-red-500 text-white px-1.5 py-0.5 rounded-full leading-none">
              {total > 99 ? '99+' : total}
            </span>
          )}
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={refresh}
            title="Refresh"
            className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
          >
            <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
          </button>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
          >
            <X size={13} />
          </button>
        </div>
      </div>

      {/* ── Scrollable body ── */}
      <div className="overflow-y-auto flex-1">

        {/* ════ LOW STOCK ════ */}
        <SectionHeader
          icon={Package}
          label="Low / Critical Stock"
          count={lowStock.length}
          color="bg-orange-500"
        />

        {lowStock.length === 0 ? (
          <EmptyRow label="All stock levels are healthy" />
        ) : (
          <>
            {lowStock.slice(0, 5).map(p => (
              <button
                key={p.id}
                onClick={() => go('/inventory')}
                className="w-full flex items-start gap-3 px-4 py-2.5 hover:bg-gray-50
                           transition-colors text-left border-b border-gray-50 last:border-0"
              >
                <div className={`mt-0.5 w-1.5 h-1.5 rounded-full flex-shrink-0 ${
                  p.status === 'Critical' ? 'bg-red-500' : 'bg-orange-400'
                }`} />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-gray-800 truncate">{p.name}</p>
                  <p className="text-[11px] text-gray-400 mt-0.5">
                    <span className={`font-bold ${p.status === 'Critical' ? 'text-red-600' : 'text-orange-600'}`}>
                      {p.current_stock} left
                    </span>
                    {' '}· Reorder at {p.reorder_level}
                  </p>
                </div>
                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full flex-shrink-0 ${
                  p.status === 'Critical'
                    ? 'bg-red-100 text-red-700'
                    : 'bg-orange-100 text-orange-700'
                }`}>
                  {p.status}
                </span>
              </button>
            ))}
            {lowStock.length > 5 && (
              <button
                onClick={() => go('/inventory')}
                className="w-full flex items-center justify-center gap-1 py-2 text-xs
                           text-orange-600 hover:text-orange-700 font-semibold hover:bg-orange-50 transition-colors"
              >
                View {lowStock.length - 5} more <ChevronRight size={11}/>
              </button>
            )}
          </>
        )}

        {/* ════ DRAFT / ON HOLD INVOICES ════ */}
        <SectionHeader
          icon={FileText}
          label="Invoices On Hold"
          count={draftInvoices.length}
          color="bg-gray-500"
        />

        {draftInvoices.length === 0 ? (
          <EmptyRow label="No invoices on hold" />
        ) : (
          <>
            {draftInvoices.slice(0, 4).map(inv => (
              <button
                key={inv.id}
                onClick={() => go('/billing')}
                className="w-full flex items-start gap-3 px-4 py-2.5 hover:bg-gray-50
                           transition-colors text-left border-b border-gray-50 last:border-0"
              >
                <div className="mt-0.5 w-1.5 h-1.5 rounded-full flex-shrink-0 bg-gray-400" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <p className="text-xs font-bold text-gray-800 flex-shrink-0">{inv.invoice_no}</p>
                    <p className="text-[11px] text-gray-400 truncate">· {inv.customer_name}</p>
                  </div>
                  <p className="text-[11px] text-gray-400 mt-0.5">
                    {formatCurrency(inv.grand_total)} · Saved as Draft
                  </p>
                </div>
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-gray-100 text-gray-600 flex-shrink-0">
                  Draft
                </span>
              </button>
            ))}
            {draftInvoices.length > 4 && (
              <button
                onClick={() => go('/billing')}
                className="w-full flex items-center justify-center gap-1 py-2 text-xs
                           text-gray-500 hover:text-gray-700 font-semibold hover:bg-gray-50 transition-colors"
              >
                View {draftInvoices.length - 4} more <ChevronRight size={11}/>
              </button>
            )}
          </>
        )}

        {/* ════ CREDIT / OUTSTANDING INVOICES ════ */}
        <SectionHeader
          icon={CreditCard}
          label="Outstanding Credit Bills"
          count={creditInvoices.length}
          color="bg-blue-500"
        />

        {creditInvoices.length === 0 ? (
          <EmptyRow label="No outstanding credit bills" />
        ) : (
          <>
            {creditInvoices.slice(0, 4).map(inv => (
              <button
                key={inv.id}
                onClick={() => go('/billing')}
                className="w-full flex items-start gap-3 px-4 py-2.5 hover:bg-gray-50
                           transition-colors text-left border-b border-gray-50 last:border-0"
              >
                <div className="mt-0.5 w-1.5 h-1.5 rounded-full flex-shrink-0 bg-blue-400" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <p className="text-xs font-bold text-gray-800 flex-shrink-0">{inv.invoice_no}</p>
                    <p className="text-[11px] text-gray-400 truncate">· {inv.customer_name}</p>
                  </div>
                  <p className="text-[11px] text-blue-600 font-semibold mt-0.5">
                    {formatCurrency(inv.grand_total)} outstanding
                  </p>
                </div>
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-blue-100 text-blue-700 flex-shrink-0">
                  Credit
                </span>
              </button>
            ))}
            {creditInvoices.length > 4 && (
              <button
                onClick={() => go('/billing')}
                className="w-full flex items-center justify-center gap-1 py-2 text-xs
                           text-blue-500 hover:text-blue-700 font-semibold hover:bg-blue-50 transition-colors"
              >
                View {creditInvoices.length - 4} more <ChevronRight size={11}/>
              </button>
            )}
          </>
        )}
      </div>

      {/* ── Footer ── */}
      <div className="px-4 py-2.5 border-t border-gray-100 bg-gray-50 flex items-center justify-between">
        {total === 0 ? (
          <p className="text-xs text-gray-400 flex items-center gap-1.5">
            <CheckCircle size={12} className="text-green-500"/> Everything looks good
          </p>
        ) : (
          <p className="text-xs text-gray-500">
            <span className="font-bold text-gray-900">{total}</span> alert{total !== 1 ? 's' : ''} need attention
          </p>
        )}
        <button
          onClick={() => go('/inventory')}
          className="text-xs text-gray-400 hover:text-gray-700 font-medium"
        >
          View inventory →
        </button>
      </div>
    </div>
  );
}
