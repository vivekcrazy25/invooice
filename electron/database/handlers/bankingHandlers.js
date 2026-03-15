const { getDb } = require('../db');

function nextTxnCode(db) {
  const row  = db.prepare("SELECT value FROM app_settings WHERE key='txn_seq'").get();
  const next = (parseInt(row?.value||'0')+1);
  db.prepare("INSERT OR REPLACE INTO app_settings(key,value) VALUES('txn_seq',?)").run(String(next));
  return `TXN-${String(26000+next)}`;
}

function registerBankingHandlers(ipcMain) {
  const db = getDb();

  ipcMain.handle('get-bank-accounts', () =>
    db.prepare('SELECT * FROM bank_accounts WHERE is_active=1 ORDER BY account_name').all()
  );
  ipcMain.handle('get-account-by-id', (_, id) => db.prepare('SELECT * FROM bank_accounts WHERE id=?').get(id));

  ipcMain.handle('add-bank-account', (_, d) => {
    const res = db.prepare(`INSERT INTO bank_accounts
      (account_name,account_type,bank_name,account_number,ifsc,opening_balance,current_balance)
      VALUES(@account_name,@account_type,@bank_name,@account_number,@ifsc,@opening_balance,@opening_balance)`
    ).run({ bank_name:'', account_number:'', ifsc:'', opening_balance:0, account_type:'Current', ...d });
    return { id: res.lastInsertRowid };
  });

  ipcMain.handle('update-bank-account', (_, { id, data: d }) => {
    db.prepare("UPDATE bank_accounts SET account_name=@account_name,account_type=@account_type,bank_name=@bank_name,account_number=@account_number,ifsc=@ifsc WHERE id=@id").run({ ...d, id });
    return { success: true };
  });

  ipcMain.handle('get-transactions', (_, f={}) => {
    let w=[], p=[];
    if (f.accountId)              { w.push("bt.account_id=?");         p.push(f.accountId); }
    if (f.type && f.type!=='All') { w.push("bt.type=?");               p.push(f.type); }
    if (f.dateFrom)               { w.push("DATE(bt.transaction_date)>=?"); p.push(f.dateFrom); }
    if (f.dateTo)                 { w.push("DATE(bt.transaction_date)<=?"); p.push(f.dateTo); }
    if (f.search)                 { w.push("bt.description LIKE ?");   p.push(`%${f.search}%`); }
    const where = w.length ? `WHERE ${w.join(' AND ')}` : '';
    return db.prepare(`SELECT bt.*,ba.account_name FROM bank_transactions bt
      LEFT JOIN bank_accounts ba ON bt.account_id=ba.id
      ${where} ORDER BY bt.created_at DESC LIMIT 300`).all(p);
  });

  ipcMain.handle('add-transaction', (_, d) => {
    const code   = nextTxnCode(db);
    const now    = new Date().toISOString();
    const acc    = db.prepare('SELECT current_balance FROM bank_accounts WHERE id=?').get(d.account_id);
    const newBal = d.type === 'Credit'
      ? (acc?.current_balance || 0) + parseFloat(d.amount)
      : Math.max(0, (acc?.current_balance || 0) - parseFloat(d.amount));
    const res = db.prepare(`INSERT INTO bank_transactions
      (txn_number,account_id,type,amount,description,reference,transaction_date,balance_after,created_at)
      VALUES(?,?,?,?,?,?,?,?,?)`
    ).run(code, d.account_id, d.type, d.amount, d.description, d.reference||'', d.transaction_date||now.split('T')[0], newBal, now);
    db.prepare("UPDATE bank_accounts SET current_balance=? WHERE id=?").run(newBal, d.account_id);
    return { id: res.lastInsertRowid, txn_number: code };
  });

  ipcMain.handle('delete-transaction', (_, id) => {
    const t = db.prepare('SELECT * FROM bank_transactions WHERE id=?').get(id);
    if (t) {
      if (t.type === 'Credit')
        db.prepare("UPDATE bank_accounts SET current_balance=MAX(0,current_balance-?) WHERE id=?").run(t.amount, t.account_id);
      else
        db.prepare("UPDATE bank_accounts SET current_balance=current_balance+? WHERE id=?").run(t.amount, t.account_id);
      db.prepare('DELETE FROM bank_transactions WHERE id=?').run(id);
    }
    return { success: true };
  });

  ipcMain.handle('get-banking-stats', () => {
    const accs      = db.prepare('SELECT * FROM bank_accounts WHERE is_active=1').all();
    const total     = accs.reduce((s,a) => s + a.current_balance, 0);
    const mo        = (() => { const n=new Date(); return `${n.getFullYear()}-${String(n.getMonth()+1).padStart(2,'0')}-01`; })();
    const credit    = db.prepare("SELECT COALESCE(SUM(amount),0) s FROM bank_transactions WHERE type='Credit' AND DATE(transaction_date)>=?").get(mo).s;
    const debit     = db.prepare("SELECT COALESCE(SUM(amount),0) s FROM bank_transactions WHERE type='Debit'  AND DATE(transaction_date)>=?").get(mo).s;
    return { totalBalance: total, monthCredit: credit, monthDebit: debit, accounts: accs };
  });
}

module.exports = { registerBankingHandlers };
