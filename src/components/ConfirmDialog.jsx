import React from 'react';
import { AlertTriangle } from 'lucide-react';

export default function ConfirmDialog({
  title   = 'Are you sure?',
  message = 'This action cannot be undone.',
  confirmText = 'Delete',
  cancelText  = 'Cancel',
  danger  = true,
  onConfirm, onCancel,
}) {
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onCancel} />
      <div className="relative bg-white rounded-2xl shadow-2xl max-w-sm w-full p-6 anim-modal">
        <div className={`w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4
          ${danger ? 'bg-red-100' : 'bg-yellow-100'}`}>
          <AlertTriangle size={22} className={danger ? 'text-red-600' : 'text-yellow-600'} />
        </div>
        <h3 className="text-center font-bold text-gray-900 text-base mb-2">{title}</h3>
        <p className="text-center text-sm text-gray-500 mb-6 leading-relaxed">{message}</p>
        <div className="flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 px-4 py-2.5 border border-gray-200 rounded-xl text-sm font-medium
                       text-gray-700 hover:bg-gray-50 transition-colors"
          >
            {cancelText}
          </button>
          <button
            onClick={onConfirm}
            className={`flex-1 px-4 py-2.5 rounded-xl text-sm font-medium text-white transition-colors
              ${danger ? 'bg-red-600 hover:bg-red-700' : 'bg-yellow-500 hover:bg-yellow-600'}`}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}
