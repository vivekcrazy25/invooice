import React, { useEffect } from 'react';
import { X } from 'lucide-react';

const SIZES = { sm:'max-w-md', md:'max-w-lg', lg:'max-w-2xl', xl:'max-w-4xl', '2xl':'max-w-6xl' };

export default function Modal({ title, subtitle, onClose, size = 'md', children, noPad = false }) {
  useEffect(() => {
    const fn = (e) => { if (e.key === 'Escape') onClose?.(); };
    window.addEventListener('keydown', fn);
    return () => window.removeEventListener('keydown', fn);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose?.(); }}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px]" onClick={onClose} />

      {/* Dialog */}
      <div className={`relative bg-white rounded-2xl shadow-2xl w-full ${SIZES[size]||SIZES.md} anim-modal flex flex-col`}
           style={{ maxHeight: '92vh' }}>
        {/* Header */}
        <div className="flex items-start justify-between px-6 py-4 border-b border-gray-100 flex-shrink-0">
          <div>
            <h2 className="text-base font-bold text-gray-900">{title}</h2>
            {subtitle && <p className="text-sm text-gray-500 mt-0.5">{subtitle}</p>}
          </div>
          <button
            onClick={onClose}
            className="p-1 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors ml-3"
          >
            <X size={17} />
          </button>
        </div>

        {/* Body */}
        <div className={`overflow-y-auto flex-1 ${noPad ? '' : 'px-6 py-5'}`}>
          {children}
        </div>
      </div>
    </div>
  );
}
