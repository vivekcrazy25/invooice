import React from 'react';

const MAP = {
  /* Invoice */
  Paid:       'bg-green-100  text-green-700',
  Draft:      'bg-gray-100   text-gray-500',
  Credit:     'bg-blue-100   text-blue-700',
  Return:     'bg-red-50     text-red-600  border border-red-200',
  Exchange:   'bg-indigo-50  text-indigo-600 border border-indigo-200',
  Exchanged:  'bg-indigo-100 text-indigo-700',
  /* Stock */
  Good:       'bg-green-100  text-green-700',
  Low:        'bg-orange-100 text-orange-700',
  Critical:   'bg-red-100    text-red-700',
  /* Vendor / PO */
  Active:     'bg-green-100  text-green-700',
  Inactive:   'bg-gray-100   text-gray-500',
  Pending:    'bg-yellow-100 text-yellow-700',
  Received:   'bg-green-100  text-green-700',
  Partial:    'bg-blue-100   text-blue-700',
  Cancelled:  'bg-red-100    text-red-700',
  Completed:  'bg-green-100  text-green-700',
  /* Bank */
  'Credit':   'bg-green-100  text-green-700',
  'Debit':    'bg-red-100    text-red-700',
  /* Users */
  Admin:      'bg-purple-100 text-purple-700',
  Staff:      'bg-gray-100   text-gray-600',
  Manager:    'bg-blue-100   text-blue-700',
};

export default function StatusBadge({ status }) {
  const cls = MAP[status] || 'bg-gray-100 text-gray-500';
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold leading-none whitespace-nowrap ${cls}`}>
      {status || '—'}
    </span>
  );
}
