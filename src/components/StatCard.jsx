import React from 'react';

const BG = {
  blue:   'bg-blue-100',
  purple: 'bg-purple-100',
  pink:   'bg-pink-100',
  yellow: 'bg-yellow-100',
  green:  'bg-green-100',
  red:    'bg-red-100',
  indigo: 'bg-indigo-100',
};

const TEXT = {
  blue:   'text-blue-700',
  purple: 'text-purple-700',
  pink:   'text-pink-700',
  yellow: 'text-yellow-700',
  green:  'text-green-700',
  red:    'text-red-700',
  indigo: 'text-indigo-700',
};

const ICON_BG = {
  blue:   'bg-blue-200',
  purple: 'bg-purple-200',
  pink:   'bg-pink-200',
  yellow: 'bg-yellow-200',
  green:  'bg-green-200',
  red:    'bg-red-200',
  indigo: 'bg-indigo-200',
};

export default function StatCard({ title, value, change, icon: Icon, color = 'blue', loading, compact = false }) {
  if (compact) {
    return (
      <div className={`${BG[color] || BG.blue} rounded-xl p-3.5 text-gray-900 relative overflow-hidden`}>
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <p className={`${TEXT[color] || TEXT.blue} text-[10px] font-bold uppercase tracking-widest mb-0.5`}>{title}</p>
            <p className="text-xl font-bold leading-none text-gray-900 mb-1">
              {loading ? <span className="opacity-50 text-sm">Loading…</span> : value}
            </p>
            {change && (
              <p className="text-green-700 text-[11px] font-semibold">{change}</p>
            )}
          </div>
          {Icon && (
            <div className={`${ICON_BG[color] || ICON_BG.blue} p-2 rounded-lg flex-shrink-0`}>
              <Icon size={18} className={TEXT[color] || TEXT.blue} />
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className={`${BG[color] || BG.blue} rounded-xl p-4 text-gray-900 relative overflow-hidden`}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className={`${TEXT[color] || TEXT.blue} text-[10px] font-bold uppercase tracking-widest mb-1`}>{title}</p>
          <p className="text-2xl font-bold leading-none text-gray-900 mb-2">
            {loading ? <span className="opacity-50 text-lg">Loading…</span> : value}
          </p>
          {change && (
            <p className="text-green-700 text-xs font-medium">{change}</p>
          )}
        </div>
        {Icon && (
          <div className={`${ICON_BG[color] || ICON_BG.blue} p-3 rounded-lg flex-shrink-0`}>
            <Icon size={22} className={TEXT[color] || TEXT.blue} />
          </div>
        )}
      </div>
      {/* subtle glow */}
      <div className="absolute -bottom-4 -right-4 w-20 h-20 bg-gray-100/50 rounded-full" />
    </div>
  );
}
