import React, { createContext, useContext, useState, useCallback } from 'react';
import { CheckCircle, XCircle, AlertTriangle, Info, X } from 'lucide-react';

const Ctx = createContext(null);

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const toast = useCallback((message, type = 'success') => {
    const id = Date.now() + Math.random();
    setToasts(t => [...t, { id, message, type }]);
    setTimeout(() => setToasts(t => t.filter(x => x.id !== id)), 3500);
  }, []);

  const remove = useCallback((id) => setToasts(t => t.filter(x => x.id !== id)), []);

  return (
    <Ctx.Provider value={toast}>
      {children}
      <div className="fixed top-4 right-4 z-[9999] flex flex-col gap-2 pointer-events-none" style={{ minWidth: 280 }}>
        {toasts.map(t => <Toast key={t.id} t={t} onRemove={remove} />)}
      </div>
    </Ctx.Provider>
  );
}

const META = {
  success: { icon: CheckCircle, bg: 'bg-white', border: 'border-green-200', icon_cls: 'text-green-500', text: 'text-gray-800' },
  error:   { icon: XCircle,     bg: 'bg-white', border: 'border-red-200',   icon_cls: 'text-red-500',   text: 'text-gray-800' },
  warning: { icon: AlertTriangle,bg:'bg-white', border: 'border-yellow-200',icon_cls: 'text-yellow-500',text: 'text-gray-800' },
  info:    { icon: Info,         bg: 'bg-white', border: 'border-blue-200',  icon_cls: 'text-blue-500',  text: 'text-gray-800' },
};

function Toast({ t, onRemove }) {
  const m = META[t.type] || META.info;
  const Icon = m.icon;
  return (
    <div className={`pointer-events-auto flex items-start gap-3 px-4 py-3 rounded-xl border shadow-lg anim-toast ${m.bg} ${m.border}`}>
      <Icon size={17} className={`${m.icon_cls} mt-0.5 flex-shrink-0`} />
      <span className={`text-sm font-medium flex-1 leading-snug ${m.text}`}>{t.message}</span>
      <button onClick={() => onRemove(t.id)} className="text-gray-300 hover:text-gray-500 mt-0.5 flex-shrink-0">
        <X size={14} />
      </button>
    </div>
  );
}

export const useToast = () => useContext(Ctx);
