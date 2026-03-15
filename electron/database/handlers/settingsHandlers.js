const { getDb } = require('../db');
const bcrypt    = require('bcryptjs');

/* ── Permission keys used across the app ── */
const ALL_PERMISSIONS = [
  'access_billing',
  'access_inventory',
  'access_vendors',
  'access_banking',
  'access_expenses',
  'access_reports',
  'access_settings',
];

/* Default permissions per role (Owner always gets everything) */
const ROLE_DEFAULTS = {
  Owner:              Object.fromEntries(ALL_PERMISSIONS.map(p => [p, true])),
  Admin:              Object.fromEntries(ALL_PERMISSIONS.map(p => [p, true])),
  Accountant:         Object.fromEntries(ALL_PERMISSIONS.map(p => [p, p !== 'access_settings'])),
  Manager:            Object.fromEntries(ALL_PERMISSIONS.map(p => [p, p !== 'access_settings'])),
  'Billing Operator': { access_billing:true, access_inventory:true, access_vendors:false,
                        access_banking:false, access_expenses:false, access_reports:false, access_settings:false },
  Staff:              { access_billing:true, access_inventory:true, access_vendors:false,
                        access_banking:false, access_expenses:false, access_reports:false, access_settings:false },
};

function getPermissionsForUser(db, user) {
  const rows = db.prepare('SELECT permission, enabled FROM user_permissions WHERE user_id=?').all(user.id);
  if (rows.length === 0) {
    // No custom permissions set — use role defaults
    return ROLE_DEFAULTS[user.role] || ROLE_DEFAULTS['Staff'];
  }
  const perms = {};
  for (const row of rows) perms[row.permission] = row.enabled === 1;
  // Ensure all keys present (fallback to role default for any missing)
  const defaults = ROLE_DEFAULTS[user.role] || ROLE_DEFAULTS['Staff'];
  for (const p of ALL_PERMISSIONS) {
    if (!(p in perms)) perms[p] = defaults[p] ?? false;
  }
  return perms;
}

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
    db.prepare('SELECT id,name,email,phone,role,status,last_login,created_at FROM users ORDER BY created_at DESC').all()
  );

  ipcMain.handle('add-user', (_, d) => {
    const hash = bcrypt.hashSync(d.password, 10);
    const res  = db.prepare('INSERT INTO users(name,email,phone,password_hash,role,status) VALUES(?,?,?,?,?,?)').run(d.name, d.email, d.phone||'', hash, d.role||'Staff', 'Active');
    return { id: res.lastInsertRowid };
  });

  ipcMain.handle('update-user', (_, { id, data: d }) => {
    if (d.password && d.password.trim()) {
      const hash = bcrypt.hashSync(d.password, 10);
      db.prepare('UPDATE users SET name=?,email=?,phone=?,password_hash=?,role=?,status=? WHERE id=?').run(d.name, d.email, d.phone||'', hash, d.role, d.status||'Active', id);
    } else {
      db.prepare('UPDATE users SET name=?,email=?,phone=?,role=?,status=? WHERE id=?').run(d.name, d.email, d.phone||'', d.role, d.status||'Active', id);
    }
    return { success: true };
  });

  ipcMain.handle('toggle-user-status', (_, { id, status }) => {
    db.prepare('UPDATE users SET status=? WHERE id=?').run(status, id);
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
    const data = { account_code: '', description: '', opening_balance: 0, as_of_date: null, ...d };
    const res = db.prepare(`INSERT INTO chart_of_accounts
      (account_code,account_name,account_type,description,opening_balance,current_balance,created_at)
      VALUES(@account_code,@account_name,@account_type,@description,@opening_balance,@opening_balance,
        COALESCE(@as_of_date, datetime('now')))`
    ).run(data);
    return { id: res.lastInsertRowid };
  });

  ipcMain.handle('update-account', (_, { id, data: d }) => {
    db.prepare(`UPDATE chart_of_accounts SET
      account_code=@account_code, account_name=@account_name,
      account_type=@account_type, description=@description,
      opening_balance=@opening_balance, current_balance=@opening_balance
      WHERE id=@id`).run({ account_code:'', description:'', opening_balance:0, ...d, id });
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

  /* ── Authentication ── */
  ipcMain.handle('login-user', (_, { email, password }) => {
    const user = db.prepare('SELECT * FROM users WHERE email=? AND status=?').get(email, 'Active');
    if (!user) return { success: false, error: 'Invalid email or password' };
    const match = bcrypt.compareSync(password, user.password_hash);
    if (!match)  return { success: false, error: 'Invalid email or password' };
    // Update last_login
    db.prepare("UPDATE users SET last_login=datetime('now') WHERE id=?").run(user.id);
    const permissions = getPermissionsForUser(db, user);
    return {
      success: true,
      user: { id: user.id, name: user.name, email: user.email, role: user.role, permissions },
    };
  });

  ipcMain.handle('get-user-permissions', (_, userId) => {
    const user = db.prepare('SELECT * FROM users WHERE id=?').get(userId);
    if (!user) return {};
    return getPermissionsForUser(db, user);
  });

  ipcMain.handle('update-user-permissions', (_, { userId, permissions }) => {
    const insert = db.prepare(
      'INSERT OR REPLACE INTO user_permissions(user_id, permission, enabled) VALUES(?,?,?)'
    );
    const txn = db.transaction(() => {
      for (const [perm, enabled] of Object.entries(permissions)) {
        insert.run(userId, perm, enabled ? 1 : 0);
      }
    });
    txn();
    return { success: true };
  });

  /* ── Notifications ── */
  ipcMain.handle('get-notifications', () => {
    // Low / Critical stock products
    const lowStock = db.prepare(`
      SELECT id, name, sku, current_stock, reorder_level, status
      FROM   products
      WHERE  status IN ('Low','Critical')
      ORDER  BY current_stock ASC
      LIMIT  20
    `).all();

    // Draft invoices (created but on hold / not finalised)
    const draftInvoices = db.prepare(`
      SELECT id, invoice_no, customer_name, grand_total, created_at
      FROM   invoices
      WHERE  status = 'Draft'
      ORDER  BY created_at DESC
      LIMIT  20
    `).all();

    // Credit invoices (outstanding / not yet paid)
    const creditInvoices = db.prepare(`
      SELECT id, invoice_no, customer_name, grand_total, created_at
      FROM   invoices
      WHERE  status = 'Credit'
      ORDER  BY created_at DESC
      LIMIT  20
    `).all();

    return {
      lowStock,
      draftInvoices,
      creditInvoices,
      total: lowStock.length + draftInvoices.length + creditInvoices.length,
    };
  });

  /* ── Global search across products, invoices, vendors, customers ── */
  ipcMain.handle('global-search', (_, q) => {
    if (!q || q.trim().length < 1) return { products: [], invoices: [], vendors: [], customers: [] };
    const like = `%${q.trim()}%`;

    const products = db.prepare(`
      SELECT p.id, p.name, p.sku, p.barcode, p.selling_price, p.status,
             c.name AS category_name
      FROM   products p
      LEFT JOIN categories c ON p.category_id = c.id
      WHERE  p.name LIKE ? OR p.sku LIKE ? OR p.barcode LIKE ?
      ORDER  BY p.name
      LIMIT  6
    `).all(like, like, like);

    const invoices = db.prepare(`
      SELECT id, invoice_no, customer_name, grand_total, status, created_at
      FROM   invoices
      WHERE  invoice_no LIKE ? OR customer_name LIKE ?
      ORDER  BY created_at DESC
      LIMIT  5
    `).all(like, like);

    const vendors = db.prepare(`
      SELECT id, name, phone, email, contact_person
      FROM   vendors
      WHERE  name LIKE ? OR contact_person LIKE ? OR phone LIKE ?
      ORDER  BY name
      LIMIT  4
    `).all(like, like, like);

    const customers = db.prepare(`
      SELECT id, name, phone, email, outstanding_balance
      FROM   customers
      WHERE  name LIKE ? OR phone LIKE ? OR email LIKE ?
      ORDER  BY name
      LIMIT  4
    `).all(like, like, like);

    return { products, invoices, vendors, customers };
  });
}

module.exports = { registerSettingsHandlers, ALL_PERMISSIONS, ROLE_DEFAULTS };
