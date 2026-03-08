function runMigrations(db) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS app_settings (
      key TEXT PRIMARY KEY, value TEXT
    );
    CREATE TABLE IF NOT EXISTS company_profile (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      company_name TEXT, gstin TEXT, email TEXT, phone TEXT,
      address TEXT, city TEXT, state TEXT, country TEXT,
      website TEXT, currency TEXT DEFAULT '$',
      invoice_prefix TEXT DEFAULT 'INV',
      invoice_footer TEXT, logo TEXT
    );
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL, email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL, role TEXT DEFAULT 'Staff',
      status TEXT DEFAULT 'Active', last_login TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS branches (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL, store_code TEXT,
      address TEXT, city TEXT, phone TEXT,
      is_active INTEGER DEFAULT 1,
      created_at TEXT DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS categories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL, description TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS products (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      sku TEXT UNIQUE, name TEXT NOT NULL,
      category_id INTEGER REFERENCES categories(id),
      hsn_code TEXT, purchase_price REAL DEFAULT 0,
      selling_price REAL DEFAULT 0, opening_stock INTEGER DEFAULT 0,
      current_stock INTEGER DEFAULT 0, reorder_level INTEGER DEFAULT 10,
      unit TEXT DEFAULT 'PCS', barcode TEXT,
      status TEXT DEFAULT 'Good',
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS customers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL, phone TEXT, email TEXT, address TEXT,
      outstanding_balance REAL DEFAULT 0, credit_limit REAL DEFAULT 0,
      status TEXT DEFAULT 'Active',
      created_at TEXT DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS invoices (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      invoice_no TEXT UNIQUE,
      customer_id INTEGER REFERENCES customers(id),
      customer_name TEXT, customer_phone TEXT,
      seller_id INTEGER REFERENCES users(id),
      branch_id INTEGER REFERENCES branches(id),
      type TEXT DEFAULT 'Sale',
      payment_mode TEXT DEFAULT 'Cash',
      cash_amount REAL DEFAULT 0, online_amount REAL DEFAULT 0,
      subtotal REAL DEFAULT 0, discount REAL DEFAULT 0,
      tax REAL DEFAULT 0, grand_total REAL DEFAULT 0,
      status TEXT DEFAULT 'Draft',
      is_credit_sale INTEGER DEFAULT 0, notes TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS invoice_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      invoice_id INTEGER NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
      product_id INTEGER REFERENCES products(id),
      product_name TEXT, sku TEXT,
      qty INTEGER DEFAULT 1,
      rate REAL DEFAULT 0, discount REAL DEFAULT 0, amount REAL DEFAULT 0
    );
    CREATE TABLE IF NOT EXISTS vendors (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL, contact_person TEXT,
      email TEXT, phone TEXT, address TEXT, gstin TEXT,
      outstanding_balance REAL DEFAULT 0,
      opening_balance REAL DEFAULT 0,
      status TEXT DEFAULT 'Active',
      created_at TEXT DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS purchase_orders (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      po_number TEXT UNIQUE,
      vendor_id INTEGER REFERENCES vendors(id),
      po_date TEXT, expected_date TEXT,
      subtotal REAL DEFAULT 0, tax REAL DEFAULT 0,
      total_amount REAL DEFAULT 0,
      status TEXT DEFAULT 'Pending', notes TEXT,
      created_by INTEGER REFERENCES users(id),
      created_at TEXT DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS purchase_order_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      po_id INTEGER NOT NULL REFERENCES purchase_orders(id) ON DELETE CASCADE,
      product_id INTEGER REFERENCES products(id),
      product_name TEXT, qty INTEGER DEFAULT 1,
      rate REAL DEFAULT 0, amount REAL DEFAULT 0
    );
    CREATE TABLE IF NOT EXISTS purchase_returns (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      return_number TEXT,
      po_id INTEGER REFERENCES purchase_orders(id),
      vendor_id INTEGER REFERENCES vendors(id),
      reason TEXT, total_amount REAL DEFAULT 0,
      status TEXT DEFAULT 'Completed',
      return_date TEXT DEFAULT (date('now')),
      created_at TEXT DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS purchase_return_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      return_id INTEGER NOT NULL REFERENCES purchase_returns(id) ON DELETE CASCADE,
      product_id INTEGER REFERENCES products(id),
      product_name TEXT, qty INTEGER DEFAULT 0,
      rate REAL DEFAULT 0, amount REAL DEFAULT 0
    );
    CREATE TABLE IF NOT EXISTS vendor_payments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      vendor_id INTEGER REFERENCES vendors(id),
      po_id INTEGER REFERENCES purchase_orders(id),
      amount REAL DEFAULT 0,
      payment_mode TEXT DEFAULT 'Cash',
      payment_date TEXT, reference TEXT, notes TEXT,
      status TEXT DEFAULT 'Paid',
      created_at TEXT DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS bank_accounts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      account_name TEXT NOT NULL,
      account_type TEXT DEFAULT 'Current',
      bank_name TEXT, account_number TEXT, ifsc TEXT,
      opening_balance REAL DEFAULT 0,
      current_balance REAL DEFAULT 0,
      is_active INTEGER DEFAULT 1,
      created_at TEXT DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS bank_transactions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      txn_number TEXT UNIQUE,
      account_id INTEGER NOT NULL REFERENCES bank_accounts(id),
      type TEXT NOT NULL, amount REAL DEFAULT 0,
      description TEXT, reference TEXT,
      transaction_date TEXT,
      balance_after REAL DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS expense_categories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL, description TEXT
    );
    CREATE TABLE IF NOT EXISTS expenses (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      expense_no TEXT UNIQUE,
      category_id INTEGER REFERENCES expense_categories(id),
      description TEXT NOT NULL, amount REAL DEFAULT 0,
      payment_mode TEXT DEFAULT 'Cash',
      reference TEXT, notes TEXT,
      expense_date TEXT,
      paid_from_account_id INTEGER REFERENCES bank_accounts(id),
      created_at TEXT DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS chart_of_accounts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      account_code TEXT, account_name TEXT NOT NULL,
      account_type TEXT, description TEXT,
      opening_balance REAL DEFAULT 0,
      current_balance REAL DEFAULT 0,
      is_active INTEGER DEFAULT 1,
      created_at TEXT DEFAULT (datetime('now'))
    );
  `);

  // Add logo column to company_profile if it doesn't exist
  try {
    db.exec(`ALTER TABLE company_profile ADD COLUMN logo TEXT;`);
  } catch (e) {
    // Column might already exist, ignore error
  }
}

module.exports = { runMigrations };
