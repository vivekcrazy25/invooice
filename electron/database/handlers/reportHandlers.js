const { getDb } = require('../db');

function registerReportHandlers(ipcMain) {
  const db = getDb();

  ipcMain.handle('get-dashboard-stats', () => {
    const mo   = (() => { const n=new Date(); return `${n.getFullYear()}-${String(n.getMonth()+1).padStart(2,'0')}-01`; })();
    const sale = db.prepare("SELECT COALESCE(SUM(grand_total),0) s FROM invoices WHERE status IN ('Paid','Credit') AND DATE(created_at)>=?").get(mo).s;
    const cogs = db.prepare(`SELECT COALESCE(SUM(ii.qty*COALESCE(p.purchase_price,0)),0) s
      FROM invoices i JOIN invoice_items ii ON ii.invoice_id=i.id
      LEFT JOIN products p ON ii.product_id=p.id
      WHERE i.status IN ('Paid','Credit') AND DATE(i.created_at)>=?`).get(mo).s;
    const pend = db.prepare("SELECT COALESCE(SUM(outstanding_balance),0) s FROM customers").get().s;
    const accs = db.prepare('SELECT account_type,current_balance FROM bank_accounts WHERE is_active=1').all();
    const cash = accs.filter(a => a.account_type==='Cash').reduce((s,a) => s+a.current_balance, 0);
    const bank = accs.filter(a => a.account_type!=='Cash').reduce((s,a) => s+a.current_balance, 0);
    const low  = db.prepare("SELECT COUNT(*) c FROM products WHERE status IN ('Low','Critical')").get().c;
    return { totalSale:sale, totalProfit:sale-cogs, pendingPayment:pend, cashBalance:cash, bankBalance:bank, lowStockItems:low };
  });

  ipcMain.handle('get-monthly-sales-trend', () => {
    const rows = db.prepare(`SELECT strftime('%m',created_at) mo,COALESCE(SUM(grand_total),0) total
      FROM invoices WHERE status IN ('Paid','Credit') GROUP BY mo ORDER BY mo`).all();
    const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    return months.map((m,i) => ({ month:m, total: rows.find(r => parseInt(r.mo)===i+1)?.total||0 }));
  });

  ipcMain.handle('get-top-selling-items', () =>
    db.prepare(`SELECT ii.product_name name,SUM(ii.qty) units,SUM(ii.amount) revenue
      FROM invoice_items ii JOIN invoices i ON i.id=ii.invoice_id
      WHERE i.status IN ('Paid','Credit')
      GROUP BY ii.product_name ORDER BY revenue DESC LIMIT 7`).all()
  );

  ipcMain.handle('get-branch-revenue', () => {
    const branches = db.prepare('SELECT * FROM branches WHERE is_active=1').all();
    return branches.map(b => ({
      name: b.name, store_code: b.store_code,
      revenue: db.prepare("SELECT COALESCE(SUM(grand_total),0) s FROM invoices WHERE branch_id=? AND status IN ('Paid','Credit')").get(b.id)?.s || 0,
    }));
  });

  ipcMain.handle('get-sales-report', (_, f={}) => {
    let w=["i.status IN ('Paid','Credit','Draft')"], p=[];
    if (f.dateFrom) { w.push("DATE(i.created_at)>=?"); p.push(f.dateFrom); }
    if (f.dateTo)   { w.push("DATE(i.created_at)<=?"); p.push(f.dateTo); }
    const where = `WHERE ${w.join(' AND ')}`;
    const rows  = db.prepare(`SELECT i.*,
      (SELECT COUNT(*) FROM invoice_items WHERE invoice_id=i.id) item_count
      FROM invoices i ${where} ORDER BY i.created_at DESC`).all(p);
    const tot   = db.prepare(`SELECT COALESCE(SUM(grand_total),0) s,COUNT(*) c FROM invoices i ${where}`).get(p);
    const paid  = db.prepare(`SELECT COALESCE(SUM(grand_total),0) s FROM invoices i ${where} AND i.status='Paid'`).get(p);
    const cred  = db.prepare(`SELECT COALESCE(SUM(grand_total),0) s FROM invoices i ${where} AND i.status='Credit'`).get(p);
    const chart = db.prepare(`SELECT DATE(created_at) date,COALESCE(SUM(grand_total),0) total
      FROM invoices i ${where} AND i.status IN ('Paid','Credit') GROUP BY DATE(created_at) ORDER BY date`).all(p);
    return { rows, summary:{ totalSales:tot.s, totalInvoices:tot.c, paidAmount:paid.s, creditSales:cred.s }, chart };
  });

  ipcMain.handle('get-purchase-report', (_, f={}) => {
    let w=[], p=[];
    if (f.dateFrom) { w.push("DATE(po.po_date)>=?"); p.push(f.dateFrom); }
    if (f.dateTo)   { w.push("DATE(po.po_date)<=?"); p.push(f.dateTo); }
    const where = w.length ? `WHERE ${w.join(' AND ')}` : '';
    const rows  = db.prepare(`SELECT po.*,v.name vendor_name FROM purchase_orders po
      LEFT JOIN vendors v ON po.vendor_id=v.id ${where} ORDER BY po.created_at DESC`).all(p);
    const tot   = db.prepare(`SELECT COALESCE(SUM(total_amount),0) s,COUNT(*) c FROM purchase_orders po ${where}`).get(p);
    const rec   = db.prepare(`SELECT COUNT(*) c FROM purchase_orders po ${where} ${where?'AND':'WHERE'} po.status='Received'`).get(p);
    return { rows, summary:{ totalPurchases:tot.s, totalOrders:tot.c, receivedOrders:rec.c } };
  });

  ipcMain.handle('get-stock-report', () => {
    const rows    = db.prepare(`SELECT p.*,c.name category_name,
      p.current_stock*p.purchase_price stock_value
      FROM products p LEFT JOIN categories c ON p.category_id=c.id ORDER BY p.name`).all();
    const total   = rows.length;
    const low     = rows.filter(r => r.status==='Low').length;
    const critical= rows.filter(r => r.status==='Critical').length;
    const val     = rows.reduce((s,r) => s+r.stock_value, 0);
    return { rows, summary:{ total, low, critical, stockValue:val } };
  });

  ipcMain.handle('get-customer-outstanding', () => {
    const rows = db.prepare(`SELECT * FROM customers WHERE outstanding_balance > 0 ORDER BY outstanding_balance DESC`).all();
    const total = db.prepare("SELECT COALESCE(SUM(outstanding_balance),0) s FROM customers").get().s;
    return { rows, totalOutstanding: total };
  });

  ipcMain.handle('get-vendor-outstanding', () => {
    const rows = db.prepare(`SELECT * FROM vendors WHERE outstanding_balance > 0 ORDER BY outstanding_balance DESC`).all();
    const total = db.prepare("SELECT COALESCE(SUM(outstanding_balance),0) s FROM vendors").get().s;
    return { rows, totalOutstanding: total };
  });

  ipcMain.handle('get-profit-and-loss', (_, f={}) => {
    let w=["i.status IN ('Paid','Credit')"], p=[];
    if (f.dateFrom) { w.push("DATE(i.created_at)>=?"); p.push(f.dateFrom); }
    if (f.dateTo)   { w.push("DATE(i.created_at)<=?"); p.push(f.dateTo); }
    const where = `WHERE ${w.join(' AND ')}`;
    
    // Aggregate totals
    const revenue = db.prepare(`SELECT COALESCE(SUM(i.grand_total),0) s FROM invoices i ${where}`).get(p).s;
    const cogs    = db.prepare(`SELECT COALESCE(SUM(ii.qty*COALESCE(p.purchase_price,0)),0) s
      FROM invoices i JOIN invoice_items ii ON ii.invoice_id=i.id
      LEFT JOIN products p ON ii.product_id=p.id ${where}`).get(p).s;
    const expenses= db.prepare('SELECT COALESCE(SUM(amount),0) s FROM expenses').get().s;
    const expBreak= db.prepare(`SELECT ec.name,COALESCE(SUM(e.amount),0) total
      FROM expense_categories ec LEFT JOIN expenses e ON e.category_id=ec.id
      GROUP BY ec.id,ec.name HAVING total>0`).all();
    
    // Product-level profitability
    const productProfitability = db.prepare(`
      SELECT 
        ii.product_id,
        ii.product_name,
        COALESCE(p.purchase_price, 0) cost_price,
        COALESCE(AVG(ii.unit_price), 0) sales_price,
        COALESCE(SUM(ii.qty), 0) units_sold,
        COALESCE(SUM(ii.qty * ii.unit_price), 0) total_sales,
        COALESCE(SUM(ii.qty * COALESCE(p.purchase_price, 0)), 0) total_cost,
        COALESCE(SUM(ii.qty * ii.unit_price) - SUM(ii.qty * COALESCE(p.purchase_price, 0)), 0) total_profit
      FROM invoice_items ii
      LEFT JOIN invoices i ON ii.invoice_id = i.id
      LEFT JOIN products p ON ii.product_id = p.id
      ${where}
      GROUP BY ii.product_id, ii.product_name
      ORDER BY total_profit DESC
    `).all(p);
    
    const grossProfit = revenue - cogs;
    const netProfit   = grossProfit - expenses;
    const profitMargin = revenue > 0 ? ((netProfit / revenue) * 100) : 0;
    
    return { 
      revenue, 
      cogs, 
      grossProfit, 
      expenses, 
      netProfit, 
      profitMargin,
      expenseBreakdown: expBreak,
      productProfitability 
    };
  });

  ipcMain.handle('get-balance-sheet', () => {
    const accs  = db.prepare('SELECT account_type,current_balance FROM bank_accounts WHERE is_active=1').all();
    const cash  = accs.filter(a => a.account_type==='Cash').reduce((s,a) => s+a.current_balance, 0);
    const bank  = accs.filter(a => a.account_type!=='Cash').reduce((s,a) => s+a.current_balance, 0);
    const stock = db.prepare('SELECT COALESCE(SUM(current_stock*purchase_price),0) s FROM products').get().s;
    const recv  = db.prepare('SELECT COALESCE(SUM(outstanding_balance),0) s FROM customers').get().s;
    const paybl = db.prepare('SELECT COALESCE(SUM(outstanding_balance),0) s FROM vendors').get().s;
    const totalAssets = cash + bank + stock + recv;
    const assets = [
      { name:'Cash & Cash Equivalents',  value: cash  },
      { name:'Bank Balances',            value: bank  },
      { name:'Inventory Value',          value: stock },
      { name:'Accounts Receivable',      value: recv  },
    ];
    const liabilities = [
      { name:'Accounts Payable (Vendors)', value: paybl },
    ];
    return { assets, liabilities, totalAssets, totalLiabilities: paybl, equity: totalAssets - paybl };
  });
}

module.exports = { registerReportHandlers };
