const { getDb } = require('../db');

function nextPO(db) {
  const year = new Date().getFullYear();
  const row  = db.prepare("SELECT value FROM app_settings WHERE key='po_seq'").get();
  const next = (parseInt(row?.value||'0')+1);
  db.prepare("INSERT OR REPLACE INTO app_settings(key,value) VALUES('po_seq',?)").run(String(next));
  return `PO-${year}-${String(next).padStart(6,'0')}`;
}

function registerVendorHandlers(ipcMain) {
  const db = getDb();

  /* ── Vendors ── */
  ipcMain.handle('get-vendors', (_, f={}) => {
    try {
      let w=[], p=[];
      if (f.status && f.status!=='All') { w.push("status=?"); p.push(f.status); }
      if (f.search) { w.push("(name LIKE ? OR contact_person LIKE ?)"); p.push(`%${f.search}%`,`%${f.search}%`); }
      const where = w.length ? `WHERE ${w.join(' AND ')}` : '';
      const result = db.prepare(`SELECT * FROM vendors ${where} ORDER BY name`).all(p);
      return result;
    } catch (e) {
      console.error('❌ get-vendors error:', e);
      throw e;
    }
  });

  ipcMain.handle('get-vendor-by-id', (_, id) => db.prepare('SELECT * FROM vendors WHERE id=?').get(id));

  ipcMain.handle('add-vendor', (_, d) => {
    const res = db.prepare(`INSERT INTO vendors
      (name,contact_person,email,phone,address,gstin,opening_balance,status)
      VALUES(@name,@contact_person,@email,@phone,@address,@gstin,@opening_balance,@status)`
    ).run({
      name:'', contact_person:'', email:'', phone:'',
      address:'', gstin:'', opening_balance:0, status:'Active', ...d
    });
    return { id: res.lastInsertRowid };
  });

  ipcMain.handle('update-vendor', (_, { id, data: d }) => {
    db.prepare(`UPDATE vendors SET
      name=@name, contact_person=@contact_person, email=@email, phone=@phone,
      address=@address, gstin=@gstin, status=@status WHERE id=@id`
    ).run({ ...d, id });
    return { success: true };
  });

  ipcMain.handle('delete-vendor', (_, id) => {
    if (db.prepare('SELECT COUNT(*) c FROM purchase_orders WHERE vendor_id=?').get(id).c > 0)
      return { success: false, error: 'Vendor has purchase history.' };
    db.prepare('DELETE FROM vendors WHERE id=?').run(id);
    return { success: true };
  });

  /* ── Purchase Orders ── */
  ipcMain.handle('get-purchase-orders', (_, f={}) => {
    let w=[], p=[];
    if (f.vendorId) { w.push("po.vendor_id=?"); p.push(f.vendorId); }
    if (f.status && f.status!=='All') { w.push("po.status=?"); p.push(f.status); }
    if (f.search)  { w.push("(po.po_number LIKE ? OR v.name LIKE ?)"); p.push(`%${f.search}%`,`%${f.search}%`); }
    const where = w.length ? `WHERE ${w.join(' AND ')}` : '';
    return db.prepare(`SELECT po.*,v.name vendor_name
      FROM purchase_orders po LEFT JOIN vendors v ON po.vendor_id=v.id
      ${where} ORDER BY po.created_at DESC`).all(p);
  });

  ipcMain.handle('get-purchase-order-by-id', (_, id) => {
    const po = db.prepare('SELECT po.*,v.name vendor_name FROM purchase_orders po LEFT JOIN vendors v ON po.vendor_id=v.id WHERE po.id=?').get(id);
    if (!po) return null;
    po.items = db.prepare('SELECT * FROM purchase_order_items WHERE po_id=?').all(id);
    return po;
  });

  ipcMain.handle('create-purchase-order', (_, data) => {
    const { items=[], ...po } = data;
    po.po_number = nextPO(db);
    const now = new Date().toISOString();
    const res = db.prepare(`INSERT INTO purchase_orders
      (po_number,vendor_id,po_date,expected_date,total_amount,status,notes,created_at)
      VALUES(@po_number,@vendor_id,@po_date,@expected_date,@total_amount,@status,@notes,@created_at)`
    ).run({
      po_date: now.split('T')[0], expected_date: '', total_amount: 0,
      status: 'Pending', notes: '', ...po, created_at: now
    });
    const poId = res.lastInsertRowid;
    for (const item of items) {
      db.prepare(`INSERT INTO purchase_order_items (po_id,product_id,product_name,qty,rate,amount)
        VALUES(?,?,?,?,?,?)`
      ).run(poId, item.product_id||null, item.product_name||'', item.qty, item.rate||0, item.amount||0);
      if (po.status === 'Received' && item.product_id) {
        db.prepare("UPDATE products SET current_stock=current_stock+?,updated_at=datetime('now') WHERE id=?").run(item.qty, item.product_id);
        const p = db.prepare('SELECT current_stock,reorder_level FROM products WHERE id=?').get(item.product_id);
        db.prepare("UPDATE products SET status=? WHERE id=?").run(
          p.current_stock<=0?'Critical':p.current_stock<=5?'Critical':p.current_stock<=p.reorder_level?'Low':'Good',
          item.product_id
        );
      }
    }
    if (po.vendor_id)
      db.prepare("UPDATE vendors SET outstanding_balance=outstanding_balance+? WHERE id=?").run(po.total_amount||0, po.vendor_id);
    return { id: poId, po_number: po.po_number };
  });

  ipcMain.handle('update-purchase-order', (_, { id, data: d }) => {
    db.prepare("UPDATE purchase_orders SET vendor_id=@vendor_id,po_date=@po_date,expected_date=@expected_date,status=@status,notes=@notes WHERE id=@id").run({ ...d, id });
    return { success: true };
  });

  /* ── Purchase Returns ── */
  ipcMain.handle('get-purchase-returns', (_, f={}) => {
    let w=[], p=[];
    if (f.search) { w.push("(pr.return_number LIKE ? OR v.name LIKE ?)"); p.push(`%${f.search}%`,`%${f.search}%`); }
    const where = w.length ? `WHERE ${w.join(' AND ')}` : '';
    return db.prepare(`SELECT pr.*,v.name vendor_name
      FROM purchase_returns pr LEFT JOIN vendors v ON pr.vendor_id=v.id
      ${where} ORDER BY pr.created_at DESC`).all(p);
  });

  ipcMain.handle('create-purchase-return', (_, data) => {
    const { items=[], ...ret } = data;
    const now = new Date().toISOString();
    const res = db.prepare(`INSERT INTO purchase_returns
      (return_number,po_id,vendor_id,reason,total_amount,status,return_date,created_at)
      VALUES(?,@po_id,@vendor_id,@reason,@total_amount,'Completed',@return_date,@created_at)`
    ).run(`RET-${Date.now()}`, { po_id:null,vendor_id:null,reason:'',total_amount:0, return_date:now.split('T')[0],...ret, created_at:now });
    const retId = res.lastInsertRowid;
    for (const item of items) {
      db.prepare(`INSERT INTO purchase_return_items (return_id,product_id,product_name,qty,rate,amount) VALUES(?,?,?,?,?,?)`)
        .run(retId, item.product_id||null, item.product_name||'', item.qty||0, item.rate||0, item.amount||0);
      if (item.product_id && item.qty > 0)
        db.prepare("UPDATE products SET current_stock=MAX(0,current_stock-?),updated_at=datetime('now') WHERE id=?").run(item.qty, item.product_id);
    }
    return { id: retId };
  });

  /* ── Vendor Payments / Pay Bills ── */
  ipcMain.handle('get-vendor-payments', (_, f={}) => {
    let w=[], p=[];
    if (f.vendorId) { w.push("vp.vendor_id=?"); p.push(f.vendorId); }
    const where = w.length ? `WHERE ${w.join(' AND ')}` : '';
    return db.prepare(`SELECT vp.*,v.name vendor_name FROM vendor_payments vp
      LEFT JOIN vendors v ON vp.vendor_id=v.id ${where} ORDER BY vp.payment_date DESC`).all(p);
  });

  ipcMain.handle('get-pay-bills', (_, f={}) => {
    const { search = '', status = '' } = f;
    const rows = db.prepare(`
      SELECT
        po.id,
        po.po_number,
        v.id   AS vendor_id,
        v.name AS vendor_name,
        po.total_amount,
        po.expected_date            AS due_date,
        po.created_at,
        COALESCE(SUM(vp.amount), 0) AS paid_amount,
        po.total_amount - COALESCE(SUM(vp.amount), 0) AS pending_amount,
        MAX(vp.payment_date)        AS last_payment_date,
        CASE
          WHEN COALESCE(SUM(vp.amount), 0) <= 0                  THEN 'Pending'
          WHEN COALESCE(SUM(vp.amount), 0) >= po.total_amount     THEN 'Paid'
          ELSE 'Partial'
        END AS payment_status
      FROM   purchase_orders po
      JOIN   vendors v ON po.vendor_id = v.id
      LEFT JOIN vendor_payments vp ON vp.po_id = po.id
      WHERE  po.total_amount > 0
      GROUP  BY po.id
      ORDER  BY po.created_at DESC
    `).all();

    return rows.filter(r => {
      const matchSearch = !search ||
        r.po_number?.toLowerCase().includes(search.toLowerCase()) ||
        r.vendor_name?.toLowerCase().includes(search.toLowerCase());
      const matchStatus = !status || status === 'All' || r.payment_status === status;
      return matchSearch && matchStatus;
    });
  });

  ipcMain.handle('create-vendor-payment', (_, d) => {
    const res = db.prepare(`INSERT INTO vendor_payments
      (vendor_id,po_id,amount,payment_mode,payment_date,reference,notes,status)
      VALUES(@vendor_id,@po_id,@amount,@payment_mode,@payment_date,@reference,@notes,'Paid')`
    ).run({ po_id:null, reference:'', notes:'', payment_date: new Date().toISOString().split('T')[0], ...d });
    if (d.vendor_id)
      db.prepare("UPDATE vendors SET outstanding_balance=MAX(0,outstanding_balance-?) WHERE id=?").run(d.amount, d.vendor_id);
    return { id: res.lastInsertRowid };
  });
}

module.exports = { registerVendorHandlers };
