const { getDb } = require('../db');
const bcrypt    = require('bcryptjs');

function registerSettingsHandlers(ipcMain) {
  const db = getDb();

  ipcMain.handle('get-company-profile', () => db.prepare('SELECT * FROM company_profile LIMIT 1').get());

  ipcMain.handle('update-company-profile', (_, d) => {
    const ex = db.prepare('SELECT id FROM company_profile LIMIT 1').get();
    if (ex) {
      db.prepare(`UPDATE company_profile SET
        company_name=@company_name, gstin=@gstin, email=@email, phone=@phone,
        address=@address, city=@city, state=@state, country=@country,
        website=@website, currency=@currency,
        invoice_prefix=@invoice_prefix, invoice_footer=@invoice_footer, logo=@logo
        WHERE id=@id`
      ).run({ company_name:'',gstin:'',email:'',phone:'',address:'',city:'',state:'',
              country:'',website:'',currency:'$',invoice_prefix:'INV',invoice_footer:'',logo:'', ...d, id:ex.id });
    } else {
      db.prepare(`INSERT INTO company_profile
        (company_name,gstin,email,phone,address,city,state,country,website,currency,invoice_prefix,invoice_footer,logo)
        VALUES(@company_name,@gstin,@email,@phone,@address,@city,@state,@country,@website,@currency,@invoice_prefix,@invoice_footer,@logo)`
      ).run({ company_name:'',gstin:'',email:'',phone:'',address:'',city:'',state:'',
              country:'',website:'',currency:'$',invoice_prefix:'INV',invoice_footer:'',logo:'', ...d });
    }
    return { success: true };
  });

  ipcMain.handle('get-users', () =>
    db.prepare('SELECT id,name,email,role,status,last_login,created_at FROM users ORDER BY created_at DESC').all()
  );

  ipcMain.handle('add-user', (_, d) => {
    const hash = bcrypt.hashSync(d.password, 10);
    const res  = db.prepare('INSERT INTO users(name,email,password_hash,role,status) VALUES(?,?,?,?,?)').run(d.name, d.email, hash, d.role||'Staff', 'Active');
    return { id: res.lastInsertRowid };
  });

  ipcMain.handle('update-user', (_, { id, data: d }) => {
    if (d.password && d.password.trim()) {
      const hash = bcrypt.hashSync(d.password, 10);
      db.prepare('UPDATE users SET name=?,email=?,password_hash=?,role=?,status=? WHERE id=?').run(d.name, d.email, hash, d.role, d.status||'Active', id);
    } else {
      db.prepare('UPDATE users SET name=?,email=?,role=?,status=? WHERE id=?').run(d.name, d.email, d.role, d.status||'Active', id);
    }
    return { success: true };
  });

  ipcMain.handle('delete-user', (_, id) => {
    const admin = db.prepare("SELECT COUNT(*) c FROM users WHERE role='Admin'").get().c;
    const me    = db.prepare("SELECT role FROM users WHERE id=?").get(id);
    if (admin <= 1 && me?.role === 'Admin') return { success: false, error: 'Cannot delete the last admin.' };
    db.prepare('DELETE FROM users WHERE id=?').run(id);
    return { success: true };
  });

  ipcMain.handle('get-chart-of-accounts', () =>
    db.prepare('SELECT * FROM chart_of_accounts WHERE is_active=1 ORDER BY account_code').all()
  );

  ipcMain.handle('add-account', (_, d) => {
    const res = db.prepare(`INSERT INTO chart_of_accounts
      (account_code,account_name,account_type,description,opening_balance,current_balance)
      VALUES(@account_code,@account_name,@account_type,@description,@opening_balance,@opening_balance)`
    ).run({ account_code:'', description:'', opening_balance:0, ...d });
    return { id: res.lastInsertRowid };
  });

  ipcMain.handle('update-account', (_, { id, data: d }) => {
    db.prepare('UPDATE chart_of_accounts SET account_code=@account_code,account_name=@account_name,account_type=@account_type,description=@description WHERE id=@id').run({ ...d, id });
    return { success: true };
  });

  ipcMain.handle('get-app-settings', () => {
    const rows = db.prepare('SELECT * FROM app_settings').all();
    return rows;
  });

  ipcMain.handle('update-app-setting', (_, { key, value }) => {
    db.prepare('INSERT OR REPLACE INTO app_settings(key,value) VALUES(?,?)').run(key, value);
    return { success: true };
  });
}

module.exports = { registerSettingsHandlers };
