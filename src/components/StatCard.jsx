import React from 'react';
import { TrendingUp } from 'lucide-react';

/* ─── Card background colors (soft pastels matching Figma) ─── */
const CARD_BG = {
  blue:   'bg-blue-50',
  indigo: 'bg-indigo-50',
  purple: 'bg-purple-50',
  green:  'bg-green-50',
  yellow: 'bg-amber-50',
  pink:   'bg-pink-50',
  rose:   'bg-rose-50',
  red:    'bg-red-50',
  teal:   'bg-teal-50',
};

/* ─── Icon container background (one shade darker than card) ─── */
const ICON_BG = {
  blue:   'bg-blue-100',
  indigo: 'bg-indigo-100',
  purple: 'bg-purple-100',
  green:  'bg-green-100',
  yellow: 'bg-amber-100',
  pink:   'bg-pink-100',
  rose:   'bg-rose-100',
  red:    'bg-red-100',
  teal:   'bg-teal-100',
};

/* ─── Icon color ─── */
const ICON_TEXT = {
  blue:   'text-blue-600',
  indigo: 'text-indigo-600',
  purple: 'text-purple-600',
  green:  'text-green-600',
  yellow: 'text-amber-600',
  pink:   'text-pink-600',
  rose:   'text-rose-600',
  red:    'text-red-600',
  teal:   'text-teal-600',
};

/* ─── Sparkline stroke color ─── */
const STROKE = {
  blue:   '#3B82F6',
  indigo: '#6366F1',
  purple: '#8B5CF6',
  green:  '#10B981',
  yellow: '#F59E0B',
  pink:   '#EC4899',
  rose:   '#F43F5E',
  red:    '#EF4444',
  teal:   '#14B8A6',
};

/* ─── Full-width Sparkline SVG (Figma style) ─── */
function Sparkline({ data, color }) {
  if (!data || data.length < 2) return null;

  const W = 200, H = 48;
  const max   = Math.max(...data);
  const min   = Math.min(...data);
  const range = max - min || 1;

  const pts = data.map((v, i) => {
    const x = (i / (data.length - 1)) * W;
    const y = H - 6 - ((v - min) / range) * (H - 12);
    return [x, y];
  });

  const polyline = pts.map(p => p.join(',')).join(' ');

  // Build filled area path
  const areaPath = [
    `M ${pts[0][0]},${H}`,
    ...pts.map(p => `L ${p[0]},${p[1]}`),
    `L ${pts[pts.length - 1][0]},${H}`,
    'Z',
  ].join(' ');

  const stroke = STROKE[color] || '#6B7280';
  const gradId = `spk-${color}`;

  return (
    <svg
      width="100%"
      height={H}
      viewBox={`0 0 ${W} ${H}`}
      preserveAspectRatio="none"
      className="block"
    >
      <defs>
        <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"   stopColor={stroke} stopOpacity="0.3" />
          <stop offset="100%" stopColor={stroke} stopOpacity="0.03" />
        </linearGradient>
      </defs>
      {/* Area fill */}
      <path d={areaPath} fill={`url(#${gradId})`} />
      {/* Line */}
      <polyline
        points={polyline}
        fill="none"
        stroke={stroke}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Terminal dot */}
      <circle
        cx={pts[pts.length - 1][0]}
        cy={pts[pts.length - 1][1]}
        r="3.5"
        fill={stroke}
      />
    </svg>
  );
}

/* ─── Skeleton loader ─── */
function Skeleton() {
  return (
    <div className="animate-pulse space-y-2">
      <div className="h-3 bg-gray-200 rounded-full w-1/2" />
      <div className="h-7 bg-gray-200 rounded-full w-3/4" />
      <div className="h-2.5 bg-gray-200 rounded-full w-1/3" />
    </div>
  );
}

/* ═══════════════════════════════════════
   StatCard — matches Figma exactly
═══════════════════════════════════════ */
export default function StatCard({
  title,
  value,
  change,
  icon: Icon,
  color = 'blue',
  loading = false,
  sparkline,
  compact = false,  // kept for backward compat but ignored
}) {
  const cardBg   = CARD_BG[color]   || CARD_BG.blue;
  const iconBg   = ICON_BG[color]   || ICON_BG.blue;
  const iconText = ICON_TEXT[color] || ICON_TEXT.blue;

  return (
    <div className={`${cardBg} rounded-2xl overflow-hidden flex flex-col h-full`}
         style={{ minHeight: 148 }}>

      {/* ── Top section: title + icon bubble ── */}
      <div className="flex items-start justify-between px-5 pt-5 pb-2">
        <p className="text-xs font-semibold text-gray-500 leading-snug max-w-[70%]">
          {title}
        </p>
        {Icon && (
          <div className={`${iconBg} p-2.5 rounded-xl flex-shrink-0`}>
            <Icon size={18} className={iconText} />
          </div>
        )}
      </div>

      {/* ── Value ── */}
      <div className="px-5">
        {loading ? (
          <Skeleton />
        ) : (
          <p className="text-[28px] font-extrabold text-gray-900 leading-none tracking-tight">
            {value}
          </p>
        )}
      </div>

      {/* ── Change badge ── */}
      {!loading && change && (
        <div className="flex items-center gap-1 px-5 mt-2">
          <TrendingUp size={11} className="text-green-500 flex-shrink-0" />
          <span className="text-[11px] font-semibold text-green-600">{change}</span>
        </div>
      )}

      {/* ── Sparkline (full-width, flush to bottom) ── */}
      {sparkline && !loading && (
        <div className="mt-auto pt-3">
          <Sparkline data={sparkline} color={color} />
        </div>
      )}

      {/* ── Bottom spacer when no sparkline ── */}
      {!sparkline && <div className="pb-5" />}
    </div>
  );
}
