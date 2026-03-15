import React, { useState, useCallback, useEffect } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  CartesianGrid, LineChart, Line,
} from 'recharts';
import {
  FileText, TrendingUp, Package, DollarSign,
  Users, Building2, BarChart3, Download, Printer, RefreshCw,
  FileSpreadsheet, File
} from 'lucide-react';
import TopBar       from '../components/TopBar.jsx';
import DataTable    from '../components/DataTable.jsx';
import StatusBadge  from '../components/StatusBadge.jsx';
import { useToast } from '../components/ToastContext.jsx';
import { formatCurrency, formatDate, today } from '../utils/formatters.js';
import logger from '../utils/logger.js';

/* ─── helpers ─── */
const TABS = [
  { key:'sales',       label:'Sales Report',        icon: TrendingUp  },
  { key:'purchase',    label:'Purchase Report',      icon: Building2   },
  { key:'stock',       label:'Stock Report',         icon: Package     },
  { key:'customer_os', label:'Customer Outstanding', icon: Users       },
  { key:'vendor_os',   label:'Vendor Outstanding',   icon: DollarSign  },
  { key:'pl',          label:'Profit & Loss',        icon: BarChart3   },
  { key:'balance',     label:'Balance Sheet',        icon: FileText    },
];

function dateMonthStart() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-01`;
}

function ChartTip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-gray-900 text-white text-xs rounded-lg px-3 py-2 shadow-xl">
      <p className="font-semibold mb-0.5">{label}</p>
      {payload.map((p, i) => (
        <p key={i} style={{ color: p.color }} className="mt-0.5">
          {p.name}: {formatCurrency(p.value)}
        </p>
      ))}
    </div>
  );
}

export default function Reports() {
  const toast = useToast();

  const [tab,      setTab]      = useState('sales');
  const [loading,  setLoading]  = useState(false);
  const [data,     setData]     = useState(null);
  const [dateFrom, setDateFrom] = useState(dateMonthStart());
  const [dateTo,   setDateTo]   = useState(today());

  /* ── fetch ── */
  const fetchReport = useCallback(async (t = tab) => {
    const startTime = Date.now();
    logger.info('Fetching report', { reportType: t, dateFrom, dateTo });

    setLoading(true);
    setData(null);
    try {
      let res;
      const range = { dateFrom, dateTo };
      if      (t === 'sales')       res = await window.db.reports.getSalesReport(range);
      else if (t === 'purchase')    res = await window.db.reports.getPurchaseReport(range);
      else if (t === 'stock')       res = await window.db.reports.getStockReport();
      else if (t === 'pl')          res = await window.db.reports.getProfitAndLoss(range);
      else if (t === 'balance')     res = await window.db.reports.getBalanceSheet();
      else if (t === 'customer_os') res = await window.db.reports.getCustomerOutstanding();
      else if (t === 'vendor_os')   res = await window.db.reports.getVendorOutstanding();

      const duration = Date.now() - startTime;
      logger.performance(`Report fetch: ${t}`, duration, { dateFrom, dateTo });
      logger.apiCall(`reports.get${t.charAt(0).toUpperCase() + t.slice(1)}Report`, 'GET', range, { success: true });

      setData(res);
    } catch (e) {
      logger.logError(e, { operation: 'fetchReport', reportType: t, dateFrom, dateTo });
      logger.apiCall(`reports.get${t.charAt(0).toUpperCase() + t.slice(1)}Report`, 'GET', { dateFrom, dateTo }, { success: false, error: e.message });

      toast('Failed to load report', 'error');
      console.error(e);
    }
    setLoading(false);
  }, [tab, dateFrom, dateTo]);

  const switchTab = (key) => {
    logger.navigation('Reports', { fromTab: tab, toTab: key });
    setTab(key);
    setData(null);
    // Automatically generate report when switching tabs
    fetchReport(key);
  };

  // Auto-load the default report on component mount
  useEffect(() => {
    fetchReport('sales');
  }, []); // Empty dependency array to run only on mount

  /* ── print ── */
  const handlePrint = () => window.print();

  /* ── export handlers ── */
  const handleExportExcel = async () => {
    const startTime = Date.now();
    logger.info('Starting Excel export from Reports screen', { tab, dateFrom, dateTo });

    try {
      if (!data) {
        toast('No data to export. Please generate the report first.', 'warning');
        return;
      }

      const XLSX = await import('xlsx');
      let exportData = [];

      // Prepare data based on current tab
      switch (tab) {
        case 'sales':
          exportData = [
            { 'Sales Report': '' },
            { From: dateFrom, To: dateTo, Generated: today() },
            {},
            { 'Summary': '' },
            { 'Total Sales': data.summary?.totalSales || 0 },
            { 'Total Invoices': data.summary?.totalInvoices || 0 },
            { 'Paid Amount': data.summary?.paidAmount || 0 },
            { 'Credit Sales': data.summary?.creditSales || 0 },
            {},
            { 'Invoice Details': '' },
            ...data.rows.map(row => ({
              'Invoice Number': row.invoice_number,
              'Customer': row.customer_name,
              'Date': row.invoice_date,
              'Total': row.total_amount,
              'Paid': row.paid_amount,
              'Balance': row.balance,
              'Status': row.status
            }))
          ];
          break;

        case 'purchase':
          exportData = [
            { 'Purchase Report': '' },
            { From: dateFrom, To: dateTo, Generated: today() },
            {},
            { 'Summary': '' },
            { 'Total Purchases': data.summary?.totalPurchases || 0 },
            { 'Total Orders': data.summary?.totalOrders || 0 },
            { 'Received Orders': data.summary?.receivedOrders || 0 },
            {},
            { 'Purchase Order Details': '' },
            ...data.rows.map(row => ({
              'PO Number': row.po_number,
              'Vendor': row.vendor_name,
              'PO Date': row.po_date,
              'Total': row.total_amount,
              'Status': row.status
            }))
          ];
          break;

        case 'stock':
          exportData = [
            { 'Stock Report': '' },
            { Generated: today() },
            {},
            { 'Summary': '' },
            { 'Total SKUs': data.summary?.total || 0 },
            { 'Low Stock': data.summary?.low || 0 },
            { 'Critical Stock': data.summary?.critical || 0 },
            { 'Stock Value': data.summary?.stockValue || 0 },
            {},
            { 'Product Details': '' },
            ...data.rows.map(row => ({
              'SKU': row.sku,
              'Product': row.name,
              'Category': row.category_name,
              'Current Stock': row.current_stock,
              'Reorder Level': row.reorder_level,
              'Purchase Price': row.purchase_price,
              'Selling Price': row.selling_price,
              'Stock Value': row.stock_value,
              'Status': row.status
            }))
          ];
          break;

        case 'customer_os':
        case 'vendor_os':
          const isCustomer = tab === 'customer_os';
          exportData = [
            { [`${isCustomer ? 'Customer' : 'Vendor'} Outstanding Report`]: '' },
            { Generated: today() },
            {},
            { 'Total Outstanding': data.totalOutstanding || 0 },
            {},
            { 'Details': '' },
            ...data.rows.map(row => ({
              [isCustomer ? 'Customer' : 'Vendor']: row.name,
              'Phone': row.phone,
              'Email': row.email,
              'Outstanding Balance': row.outstanding_balance
            }))
          ];
          break;

        default:
          toast('Export not available for this report type', 'warning');
          return;
      }

      const ws = XLSX.utils.json_to_sheet(exportData);
      const wb = XLSX.utils.book_new();
      const sheetName = tab.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase());
      XLSX.utils.book_append_sheet(wb, ws, sheetName);
      const fileName = `${sheetName.replace(' ', '')}_${dateFrom || 'current'}_${dateTo || 'report'}.xlsx`;
      XLSX.writeFile(wb, fileName);

      const duration = Date.now() - startTime;
      logger.performance('Excel export', duration, { recordCount: exportData.length, tab });
      logger.userAction('EXPORT_EXCEL', null, { fileName, tab, dateFrom, dateTo, recordCount: exportData.length });

      toast('Report exported to Excel successfully', 'success');
    } catch (e) {
      logger.logError(e, { operation: 'Excel export', tab, dateFrom, dateTo });
      toast('Failed to export Excel: ' + e.message, 'error');
    }
  };

  const handleExportPDF = async () => {
    const startTime = Date.now();
    logger.info('Starting PDF export from Reports screen', { tab, dateFrom, dateTo });

    try {
      if (!data) {
        toast('No data to export. Please generate the report first.', 'warning');
        return;
      }

      const { jsPDF } = await import('jspdf');
      const html2canvas = (await import('html2canvas')).default;

      // Create a temporary div with the report content
      const tempDiv = document.createElement('div');
      tempDiv.style.position = 'absolute';
      tempDiv.style.left = '-9999px';
      tempDiv.style.top = '-9999px';
      tempDiv.style.width = '800px';
      tempDiv.style.background = 'white';
      tempDiv.style.padding = '20px';
      tempDiv.style.fontFamily = 'Arial, sans-serif';

      // Add report title and date
      const activeTab = TABS.find(t => t.key === tab);
      tempDiv.innerHTML = `
        <h1 style="color: #111827; margin-bottom: 10px;">${activeTab?.label}</h1>
        <p style="color: #6B7280; margin-bottom: 20px;">
          ${dateFrom && dateTo ? `From ${formatDate(dateFrom)} to ${formatDate(dateTo)}` : 'Current snapshot'}
        </p>
        <p style="color: #6B7280; margin-bottom: 30px;">Generated on ${today()}</p>
      `;

      document.body.appendChild(tempDiv);

      const canvas = await html2canvas(tempDiv, { scale: 2, useCORS: true });
      const pdf = new jsPDF('p', 'mm', 'a4');
      const imgWidth = 210;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      pdf.addImage(canvas.toDataURL('image/png'), 'PNG', 0, 0, imgWidth, imgHeight);

      const fileName = `${tab.replace('_', '')}_${dateFrom || 'current'}_${dateTo || 'report'}.pdf`;
      pdf.save(fileName);

      document.body.removeChild(tempDiv);

      const duration = Date.now() - startTime;
      logger.performance('PDF export', duration, { tab, canvasWidth: canvas.width, canvasHeight: canvas.height });
      logger.userAction('EXPORT_PDF', null, { fileName, tab, dateFrom, dateTo });

      toast('Report exported to PDF successfully', 'success');
    } catch (e) {
      logger.logError(e, { operation: 'PDF export', tab, dateFrom, dateTo });
      toast('Failed to export PDF: ' + e.message, 'error');
    }
  };

  /* ═════════════════════════════════════
     SALES REPORT
  ═════════════════════════════════════ */
  const SalesReport = () => {
    if (!data) return <EmptyState onFetch={() => fetchReport('sales')} />;
    const { summary = {}, rows = [], chart = [] } = data;
    const cols = [
      { header:'Invoice No.',  key:'invoice_no',    render:v=><span className="font-semibold text-gray-900">{v}</span> },
      { header:'Customer',     key:'customer_name' },
      { header:'Date',         key:'created_at',    render:v=>formatDate(v) },
      { header:'Items',        key:'item_count',    render:v=>v??'—' },
      { header:'Subtotal',     key:'subtotal',      render:v=>formatCurrency(v) },
      { header:'Grand Total',  key:'grand_total',   render:v=><span className="font-bold">{formatCurrency(v)}</span> },
      { header:'Payment',      key:'payment_mode' },
      { header:'Status',       key:'status',        render:v=><StatusBadge status={v}/> },
    ];
    return (
      <div className="space-y-5">
        <div className="grid grid-cols-4 gap-4">
          {[
            { label:'Total Sales',    value: formatCurrency(summary.totalSales),    color:'bg-blue-600'   },
            { label:'Total Invoices', value: summary.totalInvoices ?? 0,            color:'bg-purple-600' },
            { label:'Paid Amount',    value: formatCurrency(summary.paidAmount),    color:'bg-green-600'  },
            { label:'Credit Sales',   value: formatCurrency(summary.creditSales),   color:'bg-yellow-500' },
          ].map((c,i) => (
            <div key={i} className={`${c.color} text-white rounded-xl p-4`}>
              <p className="text-white/70 text-[11px] font-semibold uppercase tracking-wider">{c.label}</p>
              <p className="text-2xl font-black mt-1">{c.value}</p>
            </div>
          ))}
        </div>
        {chart.length > 0 && (
          <div className="bg-white rounded-xl border border-gray-100 p-5">
            <h3 className="font-bold text-gray-900 mb-4">Daily Sales Trend</h3>
            <ResponsiveContainer width="100%" height={180}>
              <LineChart data={chart} margin={{ top:4, right:4, left:-8, bottom:0 }}>
                <CartesianGrid vertical={false} stroke="#F3F4F6" />
                <XAxis dataKey="date" tick={{ fontSize:10, fill:'#9CA3AF' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize:10, fill:'#9CA3AF' }} axisLine={false} tickLine={false} tickFormatter={v=>`${(v/1000).toFixed(0)}k`} />
                <Tooltip content={<ChartTip />} />
                <Line type="monotone" dataKey="total" stroke="#111827" strokeWidth={2} dot={false} name="Sales" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
        <DataTable columns={cols} data={rows} loading={loading} emptyMessage="No sales in this period." compact />
      </div>
    );
  };

  /* ═════════════════════════════════════
     PURCHASE REPORT
  ═════════════════════════════════════ */
  const PurchaseReport = () => {
    if (!data) return <EmptyState onFetch={() => fetchReport('purchase')} />;
    const { summary = {}, rows = [] } = data;
    const cols = [
      { header:'PO Number',  key:'po_number',    render:v=><span className="font-semibold">{v}</span> },
      { header:'Vendor',     key:'vendor_name' },
      { header:'PO Date',    key:'po_date',      render:v=>formatDate(v) },
      { header:'Total',      key:'total_amount', render:v=><span className="font-bold">{formatCurrency(v)}</span> },
      { header:'Status',     key:'status',       render:v=><StatusBadge status={v}/> },
    ];
    return (
      <div className="space-y-5">
        <div className="grid grid-cols-3 gap-4">
          {[
            { label:'Total Purchases', value: formatCurrency(summary.totalPurchases), color:'bg-blue-600'   },
            { label:'Total Orders',    value: summary.totalOrders ?? 0,               color:'bg-purple-600' },
            { label:'Received Orders', value: summary.receivedOrders ?? 0,            color:'bg-green-600'  },
          ].map((c,i) => (
            <div key={i} className={`${c.color} text-white rounded-xl p-4`}>
              <p className="text-white/70 text-[11px] font-semibold uppercase tracking-wider">{c.label}</p>
              <p className="text-2xl font-black mt-1">{c.value}</p>
            </div>
          ))}
        </div>
        <DataTable columns={cols} data={rows} loading={loading} emptyMessage="No purchases in this period." compact />
      </div>
    );
  };

  /* ═════════════════════════════════════
     STOCK REPORT
  ═════════════════════════════════════ */
  const StockReport = () => {
    if (!data) return <EmptyState onFetch={() => fetchReport('stock')} label="No date filter needed" />;
    const { rows = [], summary = {} } = data;
    const cols = [
      { header:'SKU',           key:'sku',            render:v=><span className="font-mono text-xs bg-gray-100 px-1.5 py-0.5 rounded">{v}</span> },
      { header:'Product',       key:'name',           render:v=><span className="font-semibold text-gray-900">{v}</span>, sortable:true },
      { header:'Category',      key:'category_name',  render:v=>v||'—' },
      { header:'Current Stock', key:'current_stock',  render:(v,row)=>(
          <span className={`font-bold ${row.status==='Critical'?'text-red-600':row.status==='Low'?'text-orange-500':'text-green-600'}`}>{v}</span>
        ), sortable:true },
      { header:'Reorder Level', key:'reorder_level' },
      { header:'Purchase Price',key:'purchase_price', render:v=>formatCurrency(v) },
      { header:'Selling Price', key:'selling_price',  render:v=>formatCurrency(v) },
      { header:'Stock Value',   key:'stock_value',    render:v=><span className="font-semibold">{formatCurrency(v)}</span>, sortable:true },
      { header:'Status',        key:'status',         render:v=><StatusBadge status={v}/> },
    ];
    return (
      <div className="space-y-5">
        <div className="grid grid-cols-4 gap-4">
          {[
            { label:'Total SKUs',     value: summary.total    ?? 0,               color:'bg-gray-900'   },
            { label:'Low Stock',      value: summary.low      ?? 0,               color:'bg-orange-500' },
            { label:'Critical Stock', value: summary.critical ?? 0,               color:'bg-red-600'    },
            { label:'Stock Value',    value: formatCurrency(summary.stockValue),  color:'bg-blue-600'   },
          ].map((c,i) => (
            <div key={i} className={`${c.color} text-white rounded-xl p-4`}>
              <p className="text-white/70 text-[11px] font-semibold uppercase tracking-wider">{c.label}</p>
              <p className="text-2xl font-black mt-1">{c.value}</p>
            </div>
          ))}
        </div>
        <DataTable columns={cols} data={rows} loading={loading} emptyMessage="No products found." compact />
      </div>
    );
  };

  /* ═════════════════════════════════════
     PROFIT & LOSS
  ═════════════════════════════════════ */
  const PLReport = () => {
    if (!data) return <EmptyState onFetch={() => fetchReport('pl')} />;
    const { revenue=0, cogs=0, grossProfit=0, expenses=0, netProfit=0, profitMargin=0, productProfitability=[], expenseBreakdown=[] } = data;
    
    /* Export handlers */
    const handleExportExcel = async () => {
      const startTime = Date.now();
      logger.info('Starting Excel export from P&L report', { dateFrom, dateTo });

      try {
        const XLSX = await import('xlsx');
        const exportData = [
          { 'Profit & Loss Report': '' },
          { From: dateFrom, To: dateTo, Generated: today() },
          {},
          { Item: 'Total Revenue', Value: revenue },
          { Item: 'Total Cost (COGS)', Value: cogs },
          { Item: 'Gross Profit', Value: grossProfit },
          { Item: 'Expenses', Value: expenses },
          { Item: 'Net Profit / Loss', Value: netProfit },
          { Item: 'Profit Margin %', Value: profitMargin.toFixed(2) },
          {},
          { 'Product Profitability': '' },
          ...productProfitability.map((p,i) => ({
            '#': i+1,
            Product: p.product_name,
            'Units Sold': p.units_sold,
            'Cost Price': p.cost_price,
            'Sales Price': p.sales_price,
            'Total Profit': p.total_profit.toFixed(2),
            'Margin %': p.units_sold > 0 ? ((p.total_profit / (p.units_sold * p.sales_price)) * 100).toFixed(2) : 0,
          }))
        ];

        const ws = XLSX.utils.json_to_sheet(exportData);
        ws['!cols'] = [{ wch: 12 }, { wch: 20 }, { wch: 12 }, { wch: 12 }, { wch: 12 }, { wch: 12 }, { wch: 12 }];
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'P&L');
        const fileName = `ProfitLoss_${dateFrom}_${dateTo}.xlsx`;
        XLSX.writeFile(wb, fileName);

        const duration = Date.now() - startTime;
        logger.performance('Excel export', duration, { recordCount: exportData.length });
        logger.userAction('EXPORT_EXCEL', null, { fileName, dateFrom, dateTo, recordCount: exportData.length });

        toast('Report exported to Excel', 'success');
      } catch (e) {
        logger.logError(e, { operation: 'Excel export', dateFrom, dateTo });
        toast('Failed to export Excel: ' + e.message, 'error');
      }
    };

    const handleExportPDF = async () => {
      const startTime = Date.now();
      logger.info('Starting PDF export from P&L report', { dateFrom, dateTo });

      try {
        const { jsPDF } = await import('jspdf');
        const html2canvas = (await import('html2canvas')).default;
        const element = document.querySelector('[data-pl-export]');
        if (!element) {
          logger.warn('PDF export failed: export content not found');
          toast('Export content not found', 'error');
          return;
        }

        const canvas = await html2canvas(element, { scale: 2, useCORS: true });
        const pdf = new jsPDF('p', 'mm', 'a4');
        const imgWidth = 210;
        const imgHeight = (canvas.height * imgWidth) / canvas.width;
        pdf.addImage(canvas.toDataURL('image/png'), 'PNG', 0, 0, imgWidth, imgHeight);
        const fileName = `ProfitLoss_${dateFrom}_${dateTo}.pdf`;
        pdf.save(fileName);

        const duration = Date.now() - startTime;
        logger.performance('PDF export', duration, { canvasWidth: canvas.width, canvasHeight: canvas.height });
        logger.userAction('EXPORT_PDF', null, { fileName, dateFrom, dateTo });

        toast('Report exported to PDF', 'success');
      } catch (e) {
        logger.logError(e, { operation: 'PDF export', dateFrom, dateTo });
        toast('Failed to export PDF: ' + e.message, 'error');
      }
    };
    
    const cols = [
      { header:'#',           key:'index',          render:(v,i)=>i+1 },
      { header:'Product',     key:'product_name' },
      { header:'Units Sold',  key:'units_sold',     render:v=>v?.toFixed(0) },
      { header:'Cost Price',  key:'cost_price',     render:v=>formatCurrency(v) },
      { header:'Sales Price', key:'sales_price',    render:v=>formatCurrency(v) },
      { header:'Total Profit',key:'total_profit',   render:v=><span className="font-bold text-green-600">{formatCurrency(v)}</span> },
      { header:'Margin %',    key:'margin_percent', render:(v,r)=>{
        const margin = r.units_sold > 0 ? ((r.total_profit / (r.units_sold * r.sales_price)) * 100) : 0;
        return <span className="text-green-600 font-semibold">{margin.toFixed(2)}%</span>;
      }, sortable:true },
    ];
    
    return (
      <div className="space-y-5" data-pl-export>
        {/* Stat Cards */}
        <div className="grid grid-cols-4 gap-4">
          <div className="bg-blue-600 text-white rounded-xl p-4">
            <p className="text-white/70 text-[11px] font-semibold uppercase tracking-wider">Total Revenue</p>
            <p className="text-2xl font-black mt-1">{formatCurrency(revenue)}</p>
          </div>
          <div className="bg-pink-600 text-white rounded-xl p-4">
            <p className="text-white/70 text-[11px] font-semibold uppercase tracking-wider">Total Cost</p>
            <p className="text-2xl font-black mt-1">{formatCurrency(cogs)}</p>
          </div>
          <div className="bg-yellow-500 text-white rounded-xl p-4">
            <p className="text-white/70 text-[11px] font-semibold uppercase tracking-wider">Gross Profit</p>
            <p className="text-2xl font-black mt-1">{formatCurrency(grossProfit)}</p>
          </div>
          <div className="bg-green-600 text-white rounded-xl p-4">
            <p className="text-white/70 text-[11px] font-semibold uppercase tracking-wider">Profit Margin %</p>
            <p className="text-2xl font-black mt-1">{profitMargin.toFixed(2)}%</p>
          </div>
        </div>
        
        {/* Export Buttons */}
        <div className="flex gap-2 justify-end">
          <button onClick={handleExportExcel}
            className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-xl text-sm font-semibold hover:bg-green-700 transition">
            <Download size={14} /> Export Excel
          </button>
          <button onClick={handleExportPDF}
            className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-xl text-sm font-semibold hover:bg-red-700 transition">
            <Download size={14} /> Export PDF
          </button>
        </div>
        
        {/* Profitability Table */}
        {productProfitability.length > 0 && (
          <div className="bg-white rounded-xl border border-gray-100">
            <div className="px-5 py-4 border-b border-gray-100">
              <h3 className="font-bold text-gray-900 text-sm">Product Profitability Details</h3>
            </div>
            <DataTable columns={cols} data={productProfitability} loading={loading} emptyMessage="No product data available." compact />
          </div>
        )}
        
        {/* Expense Breakdown Chart */}
        {expenseBreakdown.length > 0 && (
          <div className="bg-white rounded-2xl border border-gray-100 p-5">
            <h3 className="font-bold text-gray-900 mb-4 text-sm">Expense Breakdown</h3>
            <ResponsiveContainer width="100%" height={160}>
              <BarChart data={expenseBreakdown} margin={{ top:4, right:4, left:-8, bottom:0 }} barCategoryGap="40%">
                <CartesianGrid vertical={false} stroke="#F3F4F6" />
                <XAxis dataKey="name" tick={{ fontSize:10, fill:'#9CA3AF' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize:10, fill:'#9CA3AF' }} axisLine={false} tickLine={false} tickFormatter={v=>`${(v/1000).toFixed(0)}k`} />
                <Tooltip content={<ChartTip />} />
                <Bar dataKey="total" fill="#111827" radius={[4,4,0,0]} maxBarSize={48} name="Expenses" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
    );
  };

  /* ═════════════════════════════════════
     BALANCE SHEET
  ═════════════════════════════════════ */
  const BalanceSheet = () => {
    if (!data) return <EmptyState onFetch={() => fetchReport('balance')} label="No date filter needed" />;
    const { assets=[], liabilities=[], equity=0, totalAssets=0, totalLiabilities=0 } = data;
    const Section = ({ title, rows, total, color }) => (
      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
        <div className={`${color} text-white px-5 py-3`}>
          <h3 className="font-bold text-sm">{title}</h3>
        </div>
        {rows.map((r, i) => (
          <div key={i} className="flex justify-between px-5 py-3 border-b border-gray-50 last:border-0">
            <span className="text-sm text-gray-600">{r.name}</span>
            <span className="text-sm font-semibold text-gray-900">{formatCurrency(r.value)}</span>
          </div>
        ))}
        <div className="flex justify-between px-5 py-3.5 bg-gray-50 border-t border-gray-100">
          <span className="font-bold text-gray-900">Total {title}</span>
          <span className="font-black text-gray-900">{formatCurrency(total)}</span>
        </div>
      </div>
    );
    return (
      <div className="max-w-2xl space-y-4">
        <Section title="Assets"      rows={assets}      total={totalAssets}      color="bg-gray-900" />
        <Section title="Liabilities" rows={liabilities} total={totalLiabilities} color="bg-red-600"  />
        <div className="bg-green-50 border border-green-100 rounded-2xl px-5 py-4 flex justify-between items-center">
          <span className="font-bold text-gray-900">Equity (Assets − Liabilities)</span>
          <span className={`text-2xl font-black ${equity>=0?'text-green-600':'text-red-600'}`}>
            {formatCurrency(equity)}
          </span>
        </div>
      </div>
    );
  };

  /* ═════════════════════════════════════
     OUTSTANDING (shared layout)
  ═════════════════════════════════════ */
  const OutstandingReport = ({ type }) => {
    if (!data) return <EmptyState onFetch={() => fetchReport(type)} label="No date filter needed" />;
    const { rows=[], totalOutstanding=0 } = data;
    const isCustomer = type === 'customer_os';
    const cols = [
      { header:'S.No',       render:(_,__,i)=><span className="text-gray-400">{i+1}</span> },
      { header: isCustomer ? 'Customer' : 'Vendor', key:'name', render:v=><span className="font-semibold text-gray-900">{v}</span>, sortable:true },
      { header:'Phone',      key:'phone',       render:v=>v||'—' },
      { header:'Email',      key:'email',       render:v=>v||'—' },
      { header:'Outstanding',key:'outstanding_balance', render:v=>(
          <span className={`font-bold text-lg ${+v>0?'text-red-500':'text-green-600'}`}>{formatCurrency(v)}</span>
        ), sortable:true },
    ];
    return (
      <div className="space-y-5">
        <div className="bg-red-600 text-white rounded-xl p-5 max-w-xs">
          <p className="text-white/70 text-[11px] font-semibold uppercase tracking-wider">
            Total Outstanding
          </p>
          <p className="text-3xl font-black mt-1">{formatCurrency(totalOutstanding)}</p>
        </div>
        <DataTable columns={cols} data={rows} loading={loading}
          emptyMessage={`No ${isCustomer?'customer':'vendor'} outstanding balances.`} compact />
      </div>
    );
  };

  /* ─── empty / prompt state ─── */
  const EmptyState = ({ onFetch, label }) => (
    <div className="bg-white rounded-2xl border border-gray-100 py-14 text-center">
      <div className="w-12 h-12 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-3">
        <BarChart3 size={22} className="text-gray-400" />
      </div>
      <p className="text-sm font-semibold text-gray-600 mb-1">Report not loaded</p>
      <p className="text-xs text-gray-400 mb-4">
        {label || 'Set a date range and click Generate Report'}
      </p>
      <button onClick={onFetch}
        className="px-5 py-2 bg-gray-900 text-white rounded-xl text-sm font-semibold hover:bg-gray-800">
        Generate Report
      </button>
    </div>
  );

  const showDateRange = !['stock','balance','customer_os','vendor_os'].includes(tab);
  const activeTab = TABS.find(t => t.key === tab);

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <TopBar title="Reports" subtitle="Generate and analyze business reports" />

      {/* ── Horizontal tab bar ── */}
      <div className="bg-white border-b border-gray-100 px-6 flex-shrink-0">
        <div className="flex items-center gap-1 overflow-x-auto scrollbar-hide" style={{ scrollbarWidth: 'none' }}>
          {TABS.map(({ key, label }) => (
            <button key={key} onClick={() => switchTab(key)}
              className={`flex-shrink-0 px-4 py-3 text-sm font-medium transition-all border-b-2 whitespace-nowrap
                          ${tab === key
                            ? 'text-gray-900 border-gray-900 font-semibold'
                            : 'text-gray-500 border-transparent hover:text-gray-700 hover:border-gray-300'}`}>
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* ── Main content ── */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4 anim-fadeup">

          {/* header row */}
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-bold text-gray-900">{activeTab?.label}</h2>
              <p className="text-xs text-gray-400 mt-0.5">
                {showDateRange ? `${formatDate(dateFrom)} – ${formatDate(dateTo)}` : 'Current snapshot'}
              </p>
            </div>
            <div className="flex items-center gap-2">
              {showDateRange && (
                <>
                  <input type="date" value={dateFrom} onChange={e=>setDateFrom(e.target.value)}
                    className="px-3 py-1.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-gray-200" />
                  <span className="text-gray-400 text-sm">to</span>
                  <input type="date" value={dateTo} onChange={e=>setDateTo(e.target.value)}
                    className="px-3 py-1.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-gray-200" />
                </>
              )}
              <button onClick={handleExportExcel}
                className="flex items-center gap-2 px-3 py-1.5 bg-green-600 text-white rounded-xl text-sm font-medium hover:bg-green-700">
                <Download size={13} /> Export Excel
              </button>
              <button onClick={handleExportPDF}
                className="flex items-center gap-2 px-3 py-1.5 bg-red-600 text-white rounded-xl text-sm font-medium hover:bg-red-700">
                <Download size={13} /> Export PDF
              </button>
              <button onClick={() => fetchReport(tab)}
                className="flex items-center gap-2 px-4 py-1.5 bg-gray-900 text-white rounded-xl text-sm font-medium hover:bg-gray-800">
                <RefreshCw size={13} /> Generate
              </button>
              <button onClick={handlePrint}
                className="p-2 border border-gray-200 rounded-xl hover:bg-gray-50 text-gray-500">
                <Printer size={15} />
              </button>
            </div>
          </div>

          {/* loading skeleton */}
          {loading ? (
            <div className="space-y-3">
              {[1,2,3,4].map(i=>(
                <div key={i} className="h-12 bg-gray-100 rounded-xl animate-pulse" style={{opacity: 1-i*0.15}} />
              ))}
            </div>
          ) : (
            <>
              {tab === 'sales'       && <SalesReport />}
              {tab === 'purchase'    && <PurchaseReport />}
              {tab === 'stock'       && <StockReport />}
              {tab === 'pl'          && <PLReport />}
              {tab === 'balance'     && <BalanceSheet />}
              {tab === 'customer_os' && <OutstandingReport type="customer_os" />}
              {tab === 'vendor_os'   && <OutstandingReport type="vendor_os" />}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
