const { getDb } = require('../db');

function nextExpCode(db) {
  const row  = db.prepare("SELECT value FROM app_settings WHERE key='expense_seq'").get();
  const next = (parseInt(row?.value||'0')+1);
  db.prepare("INSERT OR REPLACE INTO app_settings(key,value) VALUES('expense_seq',?)").run(String(next));
  return `EXP-${String(26000+next)}`;
}

function registerExpenseHandlers(ipcMain) {
  const db = getDb();

  ipcMain.handle('get-expenses', (_, f={}) => {
    let w=[], p=[];
    if (f.category && f.category!=='All') { w.push("e.category_id=?");              p.push(f.category); }
    if (f.dateFrom) { w.push("DATE(e.expense_date)>=?");  p.push(f.dateFrom); }
    if (f.dateTo)   { w.push("DATE(e.expense_date)<=?");  p.push(f.dateTo); }
    if (f.search)   { w.push("e.description LIKE ?");     p.push(`%${f.search}%`); }
    const where = w.length ? `WHERE ${w.join(' AND ')}` : '';
    return db.prepare(`SELECT e.*,ec.name category_name,ba.account_name
      FROM expenses e
      LEFT JOIN expense_categories ec ON e.category_id=ec.id
      LEFT JOIN bank_accounts ba ON e.paid_from_account_id=ba.id
      ${where} ORDER BY e.created_at DESC`).all(p);
  });

  ipcMain.handle('add-expense', (_, d) => {
    const code = nextExpCode(db);
    const now  = new Date().toISOString();
    const res  = db.prepare(`INSERT INTO expenses
      (expense_no,category_id,description,amount,payment_mode,reference,notes,
       expense_date,paid_from_account_id,created_at)
      VALUES(?,?,?,?,?,?,?,?,?,?)`
    ).run(code, d.category_id, d.description, d.amount,
          d.payment_mode||'Cash', d.reference||'', d.notes||'',
          d.expense_date, d.paid_from_account_id||null, now);
    if (d.paid_from_account_id)
      db.prepare("UPDATE bank_accounts SET current_balance=MAX(0,current_balance-?) WHERE id=?").run(d.amount, d.paid_from_account_id);
    return { id: res.lastInsertRowid, expense_no: code };
  });

  ipcMain.handle('update-expense', (_, { id, data: d }) => {
    db.prepare(`UPDATE expenses SET
      category_id=@category_id, description=@description, amount=@amount,
      payment_mode=@payment_mode, reference=@reference, notes=@notes,
      expense_date=@expense_date WHERE id=@id`
    ).run({ ...d, id });
    return { success: true };
  });

  ipcMain.handle('delete-expense', (_, id) => {
    const e = db.prepare('SELECT * FROM expenses WHERE id=?').get(id);
    if (e?.paid_from_account_id)
      db.prepare("UPDATE bank_accounts SET current_balance=current_balance+? WHERE id=?").run(e.amount, e.paid_from_account_id);
    db.prepare('DELETE FROM expenses WHERE id=?').run(id);
    return { success: true };
  });

  ipcMain.handle('get-expense-stats', () => {
    const total    = db.prepare('SELECT COALESCE(SUM(amount),0) s FROM expenses').get().s;
    const byCat    = db.prepare(`SELECT ec.name,COALESCE(SUM(e.amount),0) total
      FROM expense_categories ec LEFT JOIN expenses e ON e.category_id=ec.id
      GROUP BY ec.id,ec.name ORDER BY total DESC`).all();
    const mo       = (() => { const n=new Date(); return `${n.getFullYear()}-${String(n.getMonth()+1).padStart(2,'0')}-01`; })();
    const prevMo   = (() => { const n=new Date(); n.setMonth(n.getMonth()-1); return `${n.getFullYear()}-${String(n.getMonth()+1).padStart(2,'0')}-01`; })();
    const thisMonth= db.prepare("SELECT COALESCE(SUM(amount),0) s FROM expenses WHERE DATE(expense_date)>=?").get(mo).s;
    const lastMonth= db.prepare("SELECT COALESCE(SUM(amount),0) s FROM expenses WHERE DATE(expense_date)>=? AND DATE(expense_date)<?").get(prevMo, mo).s;
    return { total, byCategory: byCat, thisMonth, lastMonth };
  });

  ipcMain.handle('get-expense-categories', () =>
    db.prepare('SELECT * FROM expense_categories ORDER BY name').all()
  );
}

module.exports = { registerExpenseHandlers };
