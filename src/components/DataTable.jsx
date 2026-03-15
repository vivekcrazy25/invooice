import React, { useState } from 'react';
import { ChevronUp, ChevronDown } from 'lucide-react';

export default function DataTable({
  columns = [], data = [],
  loading = false,
  emptyMessage = 'No records found',
  onRowClick,
  rowClassName,
  compact = false,
}) {
  const [sortKey, setSortKey] = useState(null);
  const [sortDir, setSortDir] = useState('asc');

  const handleSort = (key) => {
    if (!key) return;
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortKey(key); setSortDir('asc'); }
  };

  let rows = [...data];
  if (sortKey) {
    rows.sort((a, b) => {
      const va = a[sortKey], vb = b[sortKey];
      if (va == null && vb == null) return 0;
      if (va == null) return 1;
      if (vb == null) return -1;
      const cmp = String(va).localeCompare(String(vb), undefined, { numeric: true });
      return sortDir === 'asc' ? cmp : -cmp;
    });
  }

  const py = compact ? 'py-2' : 'py-3';

  if (loading) return (
    <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
      <table className="w-full">
        <thead>
          <tr className="bg-gray-900">
            {columns.map((c, i) => (
              <th key={i} className="px-4 py-3 text-left text-[11px] font-semibold text-gray-400 uppercase tracking-wider whitespace-nowrap">
                {c.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {[1, 2, 3, 4, 5].map(i => (
            <tr key={i} className="border-t border-gray-50">
              {columns.map((_, j) => (
                <td key={j} className="px-4 py-3">
                  <div className="h-3.5 bg-gray-100 rounded-full animate-pulse" style={{ width: `${55 + (j * 13) % 40}%` }} />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );

  return (
    <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="bg-gray-900">
              {columns.map((col, i) => (
                <th
                  key={i}
                  onClick={() => col.sortable && handleSort(col.key)}
                  className={`px-4 py-3 text-left text-[11px] font-semibold text-gray-400
                              uppercase tracking-wider whitespace-nowrap
                              ${col.sortable ? 'cursor-pointer hover:text-white select-none' : ''}`}
                >
                  <div className="flex items-center gap-1">
                    {col.header}
                    {col.sortable && sortKey === col.key && (
                      sortDir === 'asc'
                        ? <ChevronUp  size={11} className="text-white" />
                        : <ChevronDown size={11} className="text-white" />
                    )}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="px-4 py-14 text-center">
                  <p className="text-sm text-gray-400">{emptyMessage}</p>
                </td>
              </tr>
            ) : rows.map((row, ri) => (
              <tr
                key={row.id ?? ri}
                onClick={() => onRowClick?.(row)}
                className={`border-t border-gray-50 transition-colors ${onRowClick ? 'cursor-pointer' : ''} ${rowClassName?.(row) ?? ''}`}
              >
                {columns.map((col, ci) => (
                  <td key={ci} className={`px-4 ${py} text-sm text-gray-700 whitespace-nowrap`}>
                    {col.render
                      ? col.render(row[col.key], row, ri)
                      : (row[col.key] ?? '—')}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
