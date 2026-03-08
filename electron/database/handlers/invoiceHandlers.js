const { getDb } = require('../db');

function nextInvoiceNo(db) {
  const year = new Date().getFullYear();
  const row  = db.prepare("SELECT value FROM app_settings WHERE key='invoice_seq'").get();
  const next = (parseInt(row?.value || '0') + 1);
  db.prepare("INSERT OR REPLACE INTO app_settings(key,value) VALUES('invoice_seq',?)").run(String(next));
  return `INV-${year}-${String(next).padStart(4,'0')}`;
}

function syncProductStatus(db, productId) {
  const p = db.prepare('SELECT current_stock,reorder_level FROM products WHERE id=?').get(productId);
  if (!p) return;
  const s = p.current_stock <= 0 ? 'Critical' : p.current_stock <= 5 ? 'Critical' : p.current_stock <= p.reorder_level ? 'Low' : 'Good';
  db.prepare("UPDATE products SET status=?,updated_at=datetime('now') WHERE id=?").run(s, productId);
}

function creditBank(db, inv) {
  const now    = new Date().toISOString();
  const addTxn = (accountId, amount, desc) => {
    const row  = db.prepare("SELECT value FROM app_settings WHERE key='txn_seq'").get();
    const next = (parseInt(row?.value || '0') + 1);
    db.prepare("INSERT OR REPLACE INTO app_settings(key,value) VALUES('txn_seq',?)").run(String(next));
    const bal  = db.prepare('SELECT current_balance FROM bank_accounts WHERE id=?').get(accountId);
    const newBal = (bal?.current_balance || 0) + amount;
    db.prepare(`INSERT INTO bank_transactions
      (txn_number,account_id,type,amount,description,transaction_date,balance_after,created_at)
      VALUES(?,?,'Credit',?,?,?,?,?)`
    ).run(`TXN-${String(26000+next)}`, accountId, amount, desc, now.split('T')[0], newBal, now);
    db.prepare("UPDATE bank_accounts SET current_balance=current_balance+? WHERE id=?").run(amount, accountId);
  };
  const cash = db.prepare("SELECT id FROM bank_accounts WHERE account_type='Cash' LIMIT 1").get();
  const bank = db.prepare("SELECT id FROM bank_accounts WHERE account_type!='Cash' AND is_active=1 LIMIT 1").get();
  if      (inv.payment_mode === 'Cash')                             cash && addTxn(cash.id, inv.grand_total, `Invoice ${inv.invoice_no}`);
  else if (['Card','EFT','UPI'].includes(inv.payment_mode))         bank && addTxn(bank.id, inv.grand_total, `Invoice ${inv.invoice_no}`);
  else if (inv.payment_mode === 'Split') {
    if (cash && inv.cash_amount > 0)   addTxn(cash.id, inv.cash_amount,   `Invoice ${inv.invoice_no} (cash)`);
    if (bank && inv.online_amount > 0) addTxn(bank.id, inv.online_amount, `Invoice ${inv.invoice_no} (online)`);
  }
}

function registerInvoiceHandlers(ipcMain) {
  const db = getDb();

  ipcMain.handle('get-invoices', (_, f={}) => {
    try {
      let w=[], p=[];
      if (f.status && f.status!=='All')  { w.push("i.status=?");                   p.push(f.status); }
      if (f.search)                      { w.push("(i.invoice_no LIKE ? OR i.customer_name LIKE ?)"); p.push(`%${f.search}%`,`%${f.search}%`); }
      if (f.dateFrom)                    { w.push("DATE(i.created_at)>=?");         p.push(f.dateFrom); }
      if (f.dateTo)                      { w.push("DATE(i.created_at)<=?");         p.push(f.dateTo); }
      const where = w.length ? `WHERE ${w.join(' AND ')}` : '';
      const lim = f.limit || 200, off = ((f.page||1)-1)*lim;
      const rows  = db.prepare(`SELECT i.*,u.name as seller_name FROM invoices i LEFT JOIN users u ON i.seller_id=u.id ${where} ORDER BY i.created_at DESC LIMIT ? OFFSET ?`).all([...p,lim,off]);
      const total = db.prepare(`SELECT COUNT(*) as c FROM invoices i ${where}`).get(p).c;
      return { rows, total };
    } catch (e) {
      console.error('❌ get-invoices error:', e);
      throw e;
    }
  });

  ipcMain.handle('get-invoice-by-id', (_, id) => {
    const inv = db.prepare('SELECT * FROM invoices WHERE id=?').get(id);
    if (!inv) return null;
    inv.items = db.prepare('SELECT * FROM invoice_items WHERE invoice_id=?').all(id);
    return inv;
  });

  ipcMain.handle('create-invoice', (_, data) => {
    const { items=[], ...inv } = data;
    if (!inv.invoice_no) inv.invoice_no = nextInvoiceNo(db);
    const now = new Date().toISOString();
    const res = db.prepare(`INSERT INTO invoices
      (invoice_no,customer_id,customer_name,customer_phone,seller_id,branch_id,
       type,payment_mode,cash_amount,online_amount,subtotal,discount,tax,
       grand_total,status,is_credit_sale,notes,created_at,updated_at)
      VALUES(@invoice_no,@customer_id,@customer_name,@customer_phone,@seller_id,@branch_id,
       @type,@payment_mode,@cash_amount,@online_amount,@subtotal,@discount,@tax,
       @grand_total,@status,@is_credit_sale,@notes,@created_at,@updated_at)`
    ).run({
      ...inv,
      cash_amount:   inv.cash_amount   || 0,
      online_amount: inv.online_amount || 0,
      subtotal:      inv.subtotal      || 0,
      discount:      inv.discount      || 0,
      tax:           inv.tax           || 0,
      grand_total:   inv.grand_total   || 0,
      is_credit_sale:inv.is_credit_sale|| 0,
      customer_id:   inv.customer_id   || null,
      seller_id:     inv.seller_id     || null,
      branch_id:     inv.branch_id     || null,
      created_at: now, updated_at: now,
    });
    const id = res.lastInsertRowid;
    for (const item of items) {
      db.prepare(`INSERT INTO invoice_items (invoice_id,product_id,product_name,sku,qty,rate,discount,amount)
        VALUES(?,?,?,?,?,?,?,?)`
      ).run(id, item.product_id||null, item.product_name, item.sku||'', item.qty, item.rate, item.discount||0, item.amount);
      if (inv.status === 'Paid' && item.product_id) {
        db.prepare("UPDATE products SET current_stock=MAX(0,current_stock-?),updated_at=datetime('now') WHERE id=?").run(item.qty, item.product_id);
        syncProductStatus(db, item.product_id);
      }
    }
    if (inv.status === 'Paid' && !inv.is_credit_sale) creditBank(db, { ...inv, invoice_no: inv.invoice_no });
    if (inv.is_credit_sale && inv.customer_id)
      db.prepare("UPDATE customers SET outstanding_balance=outstanding_balance+? WHERE id=?").run(inv.grand_total, inv.customer_id);
    return { id, invoice_no: inv.invoice_no };
  });

  ipcMain.handle('update-invoice', (_, { id, data }) => {
    const { items, ...inv } = data;
    const now = new Date().toISOString();
    db.prepare(`UPDATE invoices SET
      customer_name=@customer_name, customer_phone=@customer_phone,
      type=@type, payment_mode=@payment_mode,
      cash_amount=@cash_amount, online_amount=@online_amount,
      subtotal=@subtotal, grand_total=@grand_total,
      status=@status, notes=@notes, updated_at=@now
      WHERE id=@id`
    ).run({ ...inv, now, id });
    if (items) {
      db.prepare("DELETE FROM invoice_items WHERE invoice_id=?").run(id);
      for (const item of items)
        db.prepare(`INSERT INTO invoice_items (invoice_id,product_id,product_name,sku,qty,rate,discount,amount) VALUES(?,?,?,?,?,?,?,?)`)
          .run(id, item.product_id||null, item.product_name, item.sku||'', item.qty, item.rate, item.discount||0, item.amount);
    }
    return { success: true };
  });

  ipcMain.handle('delete-invoice', (_, id) => {
    const inv = db.prepare('SELECT * FROM invoices WHERE id=?').get(id);
    if (!inv) return { success: false };
    if (inv.status === 'Paid') {
      const now   = new Date().toISOString();
      const items = db.prepare('SELECT * FROM invoice_items WHERE invoice_id=?').all(id);
      for (const item of items)
        if (item.product_id) {
          db.prepare("UPDATE products SET current_stock=current_stock+?,updated_at=? WHERE id=?").run(item.qty, now, item.product_id);
          syncProductStatus(db, item.product_id);
        }
    }
    db.prepare("DELETE FROM invoices WHERE id=?").run(id);
    return { success: true };
  });

  ipcMain.handle('get-invoice-stats', () => {
    const t  = db.prepare("SELECT COUNT(*) c,COALESCE(SUM(grand_total),0) s FROM invoices WHERE status!='Draft'").get();
    const pd = db.prepare("SELECT COUNT(*) c FROM invoices WHERE status='Paid'").get();
    const dr = db.prepare("SELECT COUNT(*) c FROM invoices WHERE status='Draft'").get();
    const cr = db.prepare("SELECT COUNT(*) c FROM invoices WHERE status='Credit'").get();
    return { total: t.c, totalAmount: t.s, paid: pd.c, draft: dr.c, credit: cr.c };
  });

  ipcMain.handle('get-recent-invoices', (_, lim=10) =>
    db.prepare('SELECT * FROM invoices ORDER BY created_at DESC LIMIT ?').all(lim)
  );

  ipcMain.handle('search-invoices', (_, q) =>
    db.prepare("SELECT * FROM invoices WHERE invoice_no LIKE ? OR customer_name LIKE ? ORDER BY created_at DESC LIMIT 20").all(`%${q}%`,`%${q}%`)
  );
}

module.exports = { registerInvoiceHandlers };
