const { getDb } = require('../db');

function nextSKU(db) {
  const row  = db.prepare("SELECT value FROM app_settings WHERE key='sku_seq'").get();
  const next = (parseInt(row?.value||'0')+1);
  db.prepare("INSERT OR REPLACE INTO app_settings(key,value) VALUES('sku_seq',?)").run(String(next));
  return `ITM-${String(next).padStart(3,'0')}`;
}
function calcStatus(stock, reorder) {
  return stock<=0 ? 'Critical' : stock<=5 ? 'Critical' : stock<=reorder ? 'Low' : 'Good';
}

function registerInventoryHandlers(ipcMain) {
  const db = getDb();

  ipcMain.handle('get-products', (_, f={}) => {
    let w=[], p=[];
    if (f.category && f.category!=='All') { w.push("p.category_id=?"); p.push(f.category); }
    if (f.status   && f.status!=='All')   { w.push("p.status=?");      p.push(f.status); }
    if (f.search)  { w.push("(p.name LIKE ? OR p.sku LIKE ?)"); p.push(`%${f.search}%`,`%${f.search}%`); }
    const where = w.length ? `WHERE ${w.join(' AND ')}` : '';
    return db.prepare(`SELECT p.*,c.name category_name FROM products p LEFT JOIN categories c ON p.category_id=c.id ${where} ORDER BY p.created_at DESC`).all(p);
  });

  ipcMain.handle('get-product-by-id',      (_, id)  => db.prepare('SELECT p.*,c.name category_name FROM products p LEFT JOIN categories c ON p.category_id=c.id WHERE p.id=?').get(id));
  ipcMain.handle('get-product-by-barcode',  (_, bc)  => db.prepare('SELECT p.*,c.name category_name FROM products p LEFT JOIN categories c ON p.category_id=c.id WHERE p.barcode=?').get(bc));
  ipcMain.handle('get-product-by-sku',      (_, sku) => db.prepare('SELECT p.*,c.name category_name FROM products p LEFT JOIN categories c ON p.category_id=c.id WHERE p.sku=?').get(sku));

  ipcMain.handle('add-product', (_, d) => {
    const sku   = d.sku || nextSKU(db);
    const stock = parseInt(d.opening_stock)||0;
    const reorder = parseInt(d.reorder_level)||10;
    const now   = new Date().toISOString();
    const res   = db.prepare(`INSERT INTO products
      (sku,name,category_id,hsn_code,purchase_price,selling_price,opening_stock,current_stock,reorder_level,unit,barcode,status,created_at,updated_at)
      VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?)`
    ).run(sku,d.name,d.category_id||null,d.hsn_code||'',d.purchase_price,d.selling_price,stock,stock,reorder,d.unit||'PCS',d.barcode||'',calcStatus(stock,reorder),now,now);
    return { id: res.lastInsertRowid, sku };
  });

  ipcMain.handle('update-product', (_, {id,data:d}) => {
    const stock  = parseInt(d.current_stock??d.opening_stock)||0;
    const reorder = parseInt(d.reorder_level)||10;
    const now    = new Date().toISOString();
    db.prepare(`UPDATE products SET name=?,category_id=?,hsn_code=?,purchase_price=?,selling_price=?,current_stock=?,reorder_level=?,unit=?,barcode=?,status=?,updated_at=? WHERE id=?`
    ).run(d.name,d.category_id||null,d.hsn_code||'',d.purchase_price,d.selling_price,stock,reorder,d.unit||'PCS',d.barcode||'',calcStatus(stock,reorder),now,id);
    return { success:true };
  });

  ipcMain.handle('delete-product', (_, id) => {
    const used = db.prepare('SELECT COUNT(*) c FROM invoice_items WHERE product_id=?').get(id);
    if (used.c>0) return { success:false, error:'Product has invoice history and cannot be deleted.' };
    db.prepare('DELETE FROM products WHERE id=?').run(id);
    return { success:true };
  });

  ipcMain.handle('get-inventory-stats', () => {
    const total     = db.prepare('SELECT COUNT(*) c FROM products').get();
    const low       = db.prepare("SELECT COUNT(*) c FROM products WHERE status='Low'").get();
    const critical  = db.prepare("SELECT COUNT(*) c FROM products WHERE status='Critical'").get();
    const costVal   = db.prepare('SELECT COALESCE(SUM(current_stock*purchase_price),0) v FROM products').get();
    const sellVal   = db.prepare('SELECT COALESCE(SUM(current_stock*selling_price),0) v FROM products').get();
    return { total:total.c, lowStock:low.c, critical:critical.c, stockCost:costVal.v, stockSell:sellVal.v };
  });

  ipcMain.handle('adjust-stock', (_, {productId,qty,reason}) => {
    const now = new Date().toISOString();
    db.prepare('UPDATE products SET current_stock=MAX(0,current_stock+?),updated_at=? WHERE id=?').run(qty,now,productId);
    const p = db.prepare('SELECT current_stock,reorder_level FROM products WHERE id=?').get(productId);
    db.prepare('UPDATE products SET status=? WHERE id=?').run(calcStatus(p.current_stock,p.reorder_level),productId);
    return { success:true };
  });

  ipcMain.handle('get-categories',  ()      => db.prepare('SELECT * FROM categories ORDER BY name').all());
  ipcMain.handle('add-category',    (_, {name,description}) => {
    const res = db.prepare('INSERT INTO categories(name,description) VALUES(?,?)').run(name,description||'');
    return { id: res.lastInsertRowid };
  });
  ipcMain.handle('search-products', (_, q)  =>
    db.prepare("SELECT p.*,c.name category_name FROM products p LEFT JOIN categories c ON p.category_id=c.id WHERE p.name LIKE ? OR p.sku LIKE ? ORDER BY p.name LIMIT 20").all(`%${q}%`,`%${q}%`)
  );
}

module.exports = { registerInventoryHandlers };
