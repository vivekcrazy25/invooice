import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from 'recharts';
import {
  DollarSign, BarChart2, Clock, Wallet,
  Building2, AlertTriangle, Plus, ShoppingCart, Package, ChevronRight, TrendingUp,
} from 'lucide-react';
import TopBar       from '../components/TopBar.jsx';
import StatCard     from '../components/StatCard.jsx';
import StatusBadge  from '../components/StatusBadge.jsx';
import { formatCurrency, formatDate } from '../utils/formatters.js';

/* ─── custom tooltip ─── */
function ChartTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-gray-900 text-white text-xs rounded-lg px-3 py-2 shadow-xl">
      <p className="font-semibold">{label}</p>
      <p className="text-green-400 mt-0.5">{formatCurrency(payload[0].value)}</p>
    </div>
  );
}

export default function Dashboard() {
  const navigate = useNavigate();
  const [stats,    setStats]    = useState({});
  const [trend,    setTrend]    = useState([]);
  const [topItems, setTopItems] = useState([]);
  const [recent,   setRecent]   = useState([]);
  const [branches, setBranches] = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [userName, setUserName] = useState('');

  useEffect(() => {
    let alive = true;
    async function load() {
      try {
        const [s, t, top, rec, br, users] = await Promise.all([
          window.db.reports.getDashboardStats(),
          window.db.reports.getMonthlySalesTrend(),
          window.db.reports.getTopSellingItems(),
          window.db.reports.getRecentInvoices(5),
          window.db.reports.getBranchRevenue(),
          window.db.settings.getUsers().catch(() => []),
        ]);
        if (!alive) return;
        setStats(s   || {});
        setTrend(t   || []);
        setTopItems(top || []);
        setRecent(rec || []);
        setBranches(br  || []);
        const firstUser = (users || [])[0];
        setUserName(firstUser?.name || firstUser?.email?.split('@')[0] || 'Admin');
      } catch (e) { console.error('Dashboard load error', e); }
      finally { if (alive) setLoading(false); }
    }
    load();
    return () => { alive = false; };
  }, []);

  // Derive sparkline arrays (last 6 months of sales trend for compact cards)
  const sparkSales   = trend.slice(-6).map(t => t.total || 0);
  const sparkProfit  = trend.slice(-6).map(t => (t.total || 0) * 0.54); // estimated profit curve
  const sparkPending = trend.slice(-6).map((_, i) => (i % 3 === 2 ? 1 : 0.4) * (stats.pendingPayment || 1));

  const statCards = [
    // Top row — sparkline cards (match Figma: blue, green, yellow)
    { title:'Total Sale',      value: formatCurrency(stats.totalSale),     change:'+21% this month',    color:'blue',   icon: DollarSign,    sparkline: sparkSales   },
    { title:'Total Profit',    value: formatCurrency(stats.totalProfit),   change:'+17% vs last month', color:'green',  icon: BarChart2,     sparkline: sparkProfit  },
    { title:'Pending Payment', value: formatCurrency(stats.pendingPayment),change:'+17% outstanding',   color:'yellow', icon: Clock,         sparkline: sparkPending },
    // Bottom row — icon-only cards (match Figma: blue, yellow, pink)
    { title:'Cash Balance',    value: formatCurrency(stats.cashBalance),   change:'+21% this month',    color:'blue',   icon: Wallet         },
    { title:'Bank Balance',    value: formatCurrency(stats.bankBalance),   change:'+21% all accounts',  color:'yellow', icon: Building2      },
    { title:'Low Stock Items', value: stats.lowStockItems ?? 0,            change:'Needs attention',    color:'rose',   icon: AlertTriangle  },
  ];

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <TopBar title="Dashboard" subtitle={userName ? `Welcome Back, ${userName}` : 'Business overview at a glance'} />

      <div className="flex-1 overflow-y-auto p-6 anim-fadeup">
        
        {/* ── 6 stat cards + Quick Actions (spans 2 rows) ── */}
        <div className="grid grid-cols-4 gap-4 mb-4" style={{ gridTemplateRows: 'auto auto' }}>

          {/* Top row: 3 sparkline stat cards */}
          {[0,1,2].map((i) => (
            <StatCard key={i} {...statCards[i]} loading={loading} />
          ))}

          {/* Quick Actions — spans 2 rows in col 4 */}
          <div className="row-span-2 bg-gray-900 rounded-2xl p-5 text-white flex flex-col">
            <h3 className="font-bold text-sm mb-4 text-white">Quick Actions</h3>
            <div className="flex flex-col gap-2.5 flex-1">
              {[
                { icon: Plus,         title:'New Sale',     sub:'Create Invoice', path:'/billing'   },
                { icon: ShoppingCart, title:'New Purchase', sub:'Add Bill',       path:'/vendors'   },
                { icon: Package,      title:'Add Item',     sub:'Manage Stock',   path:'/inventory' },
              ].map((a, i) => (
                <button
                  key={i}
                  onClick={() => navigate(a.path)}
                  className="w-full flex items-center gap-3 px-3 py-3 rounded-xl
                             bg-white hover:bg-gray-50 transition-colors text-left group flex-1"
                >
                  <div className="bg-gray-100 group-hover:bg-gray-200 p-2 rounded-lg transition-colors flex-shrink-0">
                    <a.icon size={14} className="text-gray-700" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-gray-900 text-xs font-semibold leading-tight">{a.title}</p>
                    <p className="text-gray-400 text-[10px] leading-tight mt-0.5">{a.sub}</p>
                  </div>
                  <div className="w-6 h-6 rounded-full bg-gray-900 flex items-center justify-center flex-shrink-0">
                    <ChevronRight size={11} className="text-white" />
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Bottom row: 3 icon stat cards */}
          {[3,4,5].map((i) => (
            <StatCard key={i} {...statCards[i]} loading={loading} />
          ))}

        </div>

        <div className="flex gap-6">

          {/* ── Left / main column ── */}
          <div className="flex-1 min-w-0 space-y-6">

            {/* Monthly Sales Trend */}
            <div className="bg-white rounded-xl border border-gray-100 p-5">
              <div className="flex items-center justify-between mb-5">
                <div>
                  <h3 className="font-bold text-gray-900">Monthly Sales Trend</h3>
                  <p className="text-xs text-gray-400 mt-0.5">Revenue over the last 12 months</p>
                </div>
                <button
                  onClick={() => navigate('/reports')}
                  className="text-xs text-blue-600 hover:text-blue-700 font-semibold hover:underline"
                >
                  VIEW ALL
                </button>
              </div>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={trend} margin={{ top:4, right:4, left:-8, bottom:0 }} barCategoryGap="35%">
                  <CartesianGrid vertical={false} stroke="#F3F4F6" />
                  <XAxis
                    dataKey="month"
                    tick={{ fontSize:11, fill:'#9CA3AF' }}
                    axisLine={false} tickLine={false}
                  />
                  <YAxis
                    tick={{ fontSize:11, fill:'#9CA3AF' }}
                    axisLine={false} tickLine={false}
                    tickFormatter={v => `${(v/1000).toFixed(0)}k`}
                  />
                  <Tooltip content={<ChartTooltip />} cursor={{ fill:'#F9FAFB' }} />
                  <Bar dataKey="total" fill="#111827" radius={[4,4,0,0]} maxBarSize={44} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Recent Invoices */}
            <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
              <div className="flex items-center justify-between px-5 py-3.5 border-b border-gray-100">
                <h3 className="font-bold text-gray-900">Recent Invoices</h3>
                <button
                  onClick={() => navigate('/billing')}
                  className="text-xs text-blue-600 hover:text-blue-700 font-semibold hover:underline"
                >
                  VIEW ALL
                </button>
              </div>
              <table className="w-full">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-100">
                    {['Invoice ID','Customer','Date','Amount','Status','Payment'].map(h => (
                      <th key={h} className="px-5 py-2.5 text-left text-[11px] font-semibold text-gray-400 uppercase tracking-wider">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {loading ? [1,2,3].map(i => (
                    <tr key={i} className="border-t border-gray-50">
                      {[1,2,3,4,5,6].map(j => (
                        <td key={j} className="px-5 py-3">
                          <div className="h-3 bg-gray-100 rounded-full animate-pulse" style={{ width:`${50+(j*11)%40}%` }} />
                        </td>
                      ))}
                    </tr>
                  )) : recent.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-5 py-10 text-center text-sm text-gray-400">
                        No invoices yet
                      </td>
                    </tr>
                  ) : recent.map((inv, i) => (
                    <tr key={i} className="border-t border-gray-50 hover:bg-gray-50 transition-colors cursor-pointer"
                        onClick={() => navigate('/billing')}>
                      <td className="px-5 py-3 text-sm font-semibold text-gray-900">{inv.invoice_no}</td>
                      <td className="px-5 py-3 text-sm text-gray-600">{inv.customer_name}</td>
                      <td className="px-5 py-3 text-sm text-gray-400">{formatDate(inv.created_at)}</td>
                      <td className="px-5 py-3 text-sm font-bold text-green-600">+ {formatCurrency(inv.grand_total)}</td>
                      <td className="px-5 py-3"><StatusBadge status={inv.status} /></td>
                      <td className="px-5 py-3 text-sm text-gray-500">{inv.payment_mode}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* ── Right panel ── */}
          <div className="w-80 flex-shrink-0 space-y-4">

            {/* Top Selling Items */}
            <div className="bg-white rounded-xl border border-gray-100 p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-bold text-gray-900 text-sm">Top Selling Items</h3>
                <button
                  onClick={() => navigate('/reports')}
                  className="text-xs text-blue-600 hover:text-blue-700 font-semibold hover:underline"
                >
                  VIEW ALL
                </button>
              </div>
              {topItems.length === 0 ? (
                <p className="text-xs text-gray-400 text-center py-6">No sales data yet</p>
              ) : topItems.slice(0, 7).map((item, i) => (
                <div key={i} className="flex items-center gap-2.5 py-2.5 border-b border-gray-50 last:border-0">
                  <span className="text-xs font-bold bg-gray-900 text-white w-6 h-6 rounded-lg flex items-center justify-center flex-shrink-0">
                    {i + 1}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-gray-800 truncate">{item.name}</p>
                    <p className="text-[11px] text-gray-400">{item.units} units</p>
                  </div>
                  <span className="text-xs font-bold text-gray-900 flex-shrink-0">
                    {formatCurrency(item.revenue)}
                  </span>
                </div>
              ))}
            </div>

            {/* Branch Revenue */}
            <div className="bg-white rounded-xl border border-gray-100 p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-bold text-gray-900 text-sm">Branch Revenue</h3>
                <select defaultValue="weekly" className="text-xs border border-gray-200 rounded-lg px-2 py-1 text-gray-600">
                  <option>Weekly</option>
                  <option>Monthly</option>
                  <option>Yearly</option>
                </select>
              </div>
              {branches.length === 0 ? (
                <p className="text-xs text-gray-400 text-center py-6">No branch data</p>
              ) : branches.map((b, i) => {
                const branchBgs = [
                  'bg-white border border-gray-200',
                  'bg-purple-50 border border-purple-100',
                  'bg-yellow-50 border border-yellow-100',
                ];
                return (
                  <div key={i} className={`rounded-xl p-3 mb-2 last:mb-0 ${branchBgs[i % branchBgs.length]}`}>
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-600">{b.store_code}</p>
                    <p className="text-lg font-bold mt-1 text-gray-900">{formatCurrency(b.revenue)}</p>
                    <p className="text-[11px] text-green-700 font-semibold mt-1">+21%</p>
                  </div>
                );
              })}
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}
