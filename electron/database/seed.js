const bcrypt = require('bcryptjs');

function runSeed(db) {
  try {
    const done = db.prepare("SELECT value FROM app_settings WHERE key='setup_complete'").get();
    if (done?.value === 'true') {
      console.log('ℹ️  Database already seeded');
      return;
    }

    console.log('🌱 Starting database seed...');

  /* ── Company profile ── */
  db.prepare(`INSERT OR IGNORE INTO company_profile
    (company_name,email,phone,address,city,state,country,currency,invoice_prefix)
    VALUES(?,?,?,?,?,?,?,?,?)`
  ).run('Acme Global Solutions Inc.','finance@acme-global.com','+1-555-0100','1234 Enterprise Way, Suite 500','New York','NY','USA','$','INV');

  /* ── Users (Admin, Manager, Staff) ── */
  const hash = bcrypt.hashSync('admin123', 10);
  const users = [
    ['Admin User','admin@company.com',hash,'Admin','Active'],
    ['John Manager','john.manager@company.com',bcrypt.hashSync('john123', 10),'Manager','Active'],
    ['Sarah Sales','sarah.sales@company.com',bcrypt.hashSync('sarah123', 10),'Staff','Active'],
    ['Mike Staff','mike.staff@company.com',bcrypt.hashSync('mike123', 10),'Staff','Active'],
    ['Lisa Inventory','lisa.inventory@company.com',bcrypt.hashSync('lisa123', 10),'Manager','Active'],
  ];
  users.forEach(([name,email,pwd,role,status]) =>
    db.prepare(`INSERT OR IGNORE INTO users (name,email,password_hash,role,status)
      VALUES(?,?,?,?,?)`).run(name,email,pwd,role,status)
  );

  /* ── Branches (5 branches) ── */
  [
    ['Main Branch', 'STR-001','123 Main St','New York'],
    ['Downtown Branch', 'STR-002','456 Oak Ave','Los Angeles'],
    ['Westside Branch', 'STR-003','789 Pine Rd','Chicago'],
    ['Harbor Branch', 'STR-004','321 Harbor Way','Miami'],
    ['Tech Park Branch', 'STR-005','654 Tech Drive','San Francisco'],
  ].forEach(r => db.prepare(`INSERT OR IGNORE INTO branches (name,store_code,address,city) VALUES(?,?,?,?)`).run(...r));

  /* ── Bank accounts (5 accounts) ── */
  [
    ['Cash Account',              'Cash',         '',              '',        150000],
    ['HDFC Bank - Current',       'Current',      'HDFC Bank',    '1234567', 250000],
    ['ICICI Bank - Savings',      'Savings',      'ICICI Bank',   '7654321', 180000],
    ['Axis Bank - Business',      'Current',      'Axis Bank',    '9876543', 320000],
    ['Petty Cash',                'Cash',         '',              '',         25000],
  ].forEach(([name,type,bank,num,bal]) =>
    db.prepare(`INSERT OR IGNORE INTO bank_accounts
      (account_name,account_type,bank_name,account_number,opening_balance,current_balance)
      VALUES(?,?,?,?,?,?)`
    ).run(name,type,bank,num,bal,bal)
  );

  /* ── Expense categories ── */
  ['Rent','Salary','Electricity','Marketing','Utilities','Transportation','Office Supplies','Other'].forEach(n =>
    db.prepare(`INSERT OR IGNORE INTO expense_categories (name) VALUES(?)`).run(n)
  );

  /* ── Product categories ── */
  ['LED & Lighting','Switches','Wiring','Circuit Breakers','General','Panels','Cables','Fixtures'].forEach(n =>
    db.prepare(`INSERT OR IGNORE INTO categories (name) VALUES(?)`).run(n)
  );

  /* ── Chart of accounts (expanded) ── */
  [
    ['1001','Cash & Cash Equivalents',   'Asset',      150000],
    ['1002','Bank Accounts',             'Asset',      750000],
    ['1003','Accounts Receivable',       'Asset',       50000],
    ['1004','Inventory',                 'Asset',      200000],
    ['1005','Fixed Assets',              'Asset',      500000],
    ['2001','Accounts Payable',          'Liability',   100000],
    ['2002','Short Term Loans',          'Liability',        0],
    ['3001','Owner Equity',              'Equity',    1500000],
    ['4001','Sales Revenue',             'Revenue',         0],
    ['4002','Other Income',              'Revenue',         0],
    ['5001','Cost of Goods Sold',        'Expense',         0],
    ['5002','Salaries & Wages',          'Expense',         0],
    ['5003','Rent Expense',              'Expense',         0],
    ['5004','Utilities',                 'Expense',         0],
    ['5005','Marketing',                 'Expense',         0],
  ].forEach(([code,name,type,bal]) =>
    db.prepare(`INSERT OR IGNORE INTO chart_of_accounts
      (account_code,account_name,account_type,opening_balance,current_balance)
      VALUES(?,?,?,?,?)`
    ).run(code,name,type,bal,bal)
  );

  /* ── Sample products (20 items) ── */
  [
    ['ITM-001','LED Bulb 9W',            1,'8539', 3.50,  7.99,  250, 50],
    ['ITM-002','LED Strip Light 5M',     1,'8539', 8.00, 19.99,   80, 20],
    ['ITM-003','Wall Switch 2-Way',      2,'8536', 2.50,  5.99,  150, 30],
    ['ITM-004','MCB 32A',                4,'8536', 12.00, 24.99,  75, 15],
    ['ITM-005','Copper Wire 2.5mm',      3,'8544', 45.00, 89.99, 120, 25],
    ['ITM-006','LED Bulb 15W',           1,'8539', 4.50, 10.99,  200, 40],
    ['ITM-007','Wall Socket Double',     2,'8536', 3.00,  7.49,  180, 40],
    ['ITM-008','Aluminum Wire 4mm',      3,'8544', 65.00,129.99,  80, 15],
    ['ITM-009','Power Distribution Box', 4,'8536', 150.00,299.99,  12, 3],
    ['ITM-010','LED Downlight 12W',      1,'8539', 10.00, 24.99,  60, 12],
    ['ITM-011','Ceiling Fan Wiring',     3,'8544', 8.00,  15.99,  90, 20],
    ['ITM-012','Main Switch 63A',        4,'8536', 350.00,699.99, 5, 2],
    ['ITM-013','Flexible Conduit',       7,'8544', 25.00, 49.99,  40, 10],
    ['ITM-014','Junction Box',           7,'8544', 5.00,  11.99, 200, 50],
    ['ITM-015','Light Fixture Bracket',  8,'8544', 12.00, 24.99, 100, 20],
    ['ITM-016','Electrical Panel',       4,'8536', 2500.00,5000.00, 3, 1],
    ['ITM-017','Switchboard Module',     4,'8536', 450.00, 899.99, 8, 2],
    ['ITM-018','Cable Tray',             7,'8544', 120.00,249.99, 20, 5],
    ['ITM-019','Earthing Rod',           3,'8544', 80.00,159.99, 30, 8],
    ['ITM-020','Terminal Block 32A',     4,'8536', 25.00, 49.99, 150, 30],
  ].forEach(([sku,name,cat,hsn,pp,sp,stock,reorder]) => {
    const status = stock <= 0 ? 'Critical' : stock <= 5 ? 'Critical' : stock <= reorder ? 'Low' : 'Good';
    db.prepare(`INSERT OR IGNORE INTO products
      (sku,name,category_id,hsn_code,purchase_price,selling_price,
       opening_stock,current_stock,reorder_level,unit,status)
      VALUES(?,?,?,?,?,?,?,?,?,?,?)`
    ).run(sku,name,cat,hsn,pp,sp,stock,stock,reorder,'PCS',status);
  });

  /* ── Sample customers (20 customers) ── */
  [
    ['John Smith','5551234567','john@example.com',0],
    ['Sarah Johnson','5559876543','sarah@example.com',2500],
    ['Mike Davis','5554445555','mike@example.com',0],
    ['Emily Wilson','5556667777','emily@example.com',1200],
    ['Robert Brown','5558883333','robert@example.com',0],
    ['Lisa Anderson','5552221111','lisa@example.com',3500],
    ['David Miller','5559994444','david@example.com',800],
    ['Jennifer Taylor','5555556666','jennifer@example.com',0],
    ['James Thomas','5557778888','james@example.com',2000],
    ['Maria Garcia','5553334444','maria@example.com',1500],
    ['Charles Martinez','5554445555','charles@example.com',0],
    ['Patricia Lee','5556667777','patricia@example.com',2200],
    ['Mark White','5557778888','mark@example.com',600],
    ['Laura Harris','5558889999','laura@example.com',0],
    ['Steven Martin','5559990000','steven@example.com',3100],
    ['Patricia Davis','5551110000','patricia.d@example.com',1800],
    ['Paul Robinson','5552229999','paul@example.com',0],
    ['Angela Clark','5553334444','angela@example.com',4000],
    ['Thomas Rodriguez','5554445555','thomas@example.com',900],
    ['Dorothy Lewis','5555556666','dorothy@example.com',0],
  ].forEach(([n,p,e,b]) =>
    db.prepare(`INSERT OR IGNORE INTO customers (name,phone,email,outstanding_balance) VALUES(?,?,?,?)`).run(n,p,e,b)
  );

  /* ── Sample vendors (10 vendors) ── */
  [
    ['Electric Supplies Co','John Electric','v1@esc.com','5551112222',5000],
    ['Power Parts Inc','Jane Power','v2@ppi.com','5553334444',0],
    ['Global Electrical Distributors','Alice Tech','alice@ged.com','5556667777',3200],
    ['Premium Lighting Solutions','Bob Light','bob@pls.com','5558889999',1500],
    ['Industrial Wiring Company','Carol Wire','carol@iwc.com','5551234567',2800],
    ['Electronics & Components Ltd','David Chen','david@ecl.com','5559876543',4500],
    ['Smart Home Supplies','Eva Mueller','eva@shs.com','5554445555',0],
    ['Wholesale Electrical Co','Frank Johnson','frank@wec.com','5557778888',2000],
    ['Tech Components Distributor','Grace Lee','grace@tcd.com','5552221111',3700],
    ['Equipment & Fixtures Ltd','Henry Wong','henry@efl.com','5553332222',1200],
  ].forEach(([n,cp,e,p,b]) =>
    db.prepare(`INSERT OR IGNORE INTO vendors (name,contact_person,email,phone,outstanding_balance) VALUES(?,?,?,?,?)`).run(n,cp,e,p,b)
  );

  /* ── Sample invoices (25 invoices with varied dates and statuses) ── */
  const now = new Date();
  const invoices = [
    {date: new Date(now - 30*86400000), customer: 'John Smith', phone: '5551234567', type: 'Sale', mode: 'Cash', total: 79.96, status: 'Paid', items: [[1,5,7.99],[3,5,5.99]]},
    {date: new Date(now - 28*86400000), customer: 'Sarah Johnson', phone: '5559876543', type: 'Sale', mode: 'Credit', total: 249.99, status: 'Credit', items: [[2,5,19.99]]},
    {date: new Date(now - 25*86400000), customer: 'Mike Davis', phone: '5554445555', type: 'Sale', mode: 'Card', total: 149.97, status: 'Draft', items: [[4,3,24.99]]},
    {date: new Date(now - 20*86400000), customer: 'Emily Wilson', phone: '5556667777', type: 'Sale', mode: 'Cash', total: 199.96, status: 'Paid', items: [[1,10,7.99],[7,2,7.49]]},
    {date: new Date(now - 18*86400000), customer: 'Robert Brown', phone: '5558883333', type: 'Sale', mode: 'UPI', total: 589.95, status: 'Paid', items: [[6,5,10.99],[8,2,99.99]]},
    {date: new Date(now - 15*86400000), customer: 'Lisa Anderson', phone: '5552221111', type: 'Sale', mode: 'Credit', total: 899.99, status: 'Credit', items: [[12,1,699.99]]},
    {date: new Date(now - 12*86400000), customer: 'David Miller', phone: '5559994444', type: 'Sale', mode: 'Cash', total: 299.98, status: 'Paid', items: [[10,3,24.99],[11,3,15.99]]},
    {date: new Date(now - 10*86400000), customer: 'Jennifer Taylor', phone: '5555556666', type: 'Sale', mode: 'Card', total: 1499.97, status: 'Paid', items: [[16,1,5000.00,0.667]]},
    {date: new Date(now - 8*86400000), customer: 'James Thomas', phone: '5557778888', type: 'Sale', mode: 'Transfer', total: 599.96, status: 'Paid', items: [[8,6,99.99]]},
    {date: new Date(now - 5*86400000), customer: 'Maria Garcia', phone: '5553334444', type: 'Sale', mode: 'Cash', total: 349.95, status: 'Paid', items: [[5,3,89.99]]},
    {date: new Date(now - 3*86400000), customer: 'Charles Martinez', phone: '5554445555', type: 'Sale', mode: 'Card', total: 849.96, status: 'Pending', items: [[17,1,899.99,0.944]]},
    {date: new Date(now - 2*86400000), customer: 'Patricia Lee', phone: '5556667777', type: 'Sale', mode: 'Cash', total: 399.95, status: 'Paid', items: [[13,4,49.99]]},
    {date: new Date(now - 1*86400000), customer: 'Mark White', phone: '5557778888', type: 'Sale', mode: 'UPI', total: 199.98, status: 'Paid', items: [[15,4,24.99]]},
    {date: new Date(now - 0*86400000), customer: 'Laura Harris', phone: '5558889999', type: 'Sale', mode: 'Card', total: 249.99, status: 'Draft', items: [[14,4,11.99]]},
    {date: new Date(now - 29*86400000), customer: 'Steven Martin', phone: '5559990000', type: 'Sale', mode: 'Cash', total: 959.95, status: 'Paid', items: [[9,3,299.99]]},
    {date: new Date(now - 24*86400000), customer: 'Patricia Davis', phone: '5551110000', type: 'Sale', mode: 'Credit', total: 319.97, status: 'Credit', items: [[3,15,5.99]]},
    {date: new Date(now - 19*86400000), customer: 'Paul Robinson', phone: '5552229999', type: 'Sale', mode: 'Transfer', total: 1299.95, status: 'Paid', items: [[18,4,249.99]]},
    {date: new Date(now - 14*86400000), customer: 'Angela Clark', phone: '5553334444', type: 'Sale', mode: 'Cash', total: 479.97, status: 'Paid', items: [[19,10,49.99]]},
    {date: new Date(now - 9*86400000), customer: 'Thomas Rodriguez', phone: '5554445555', type: 'Sale', mode: 'Card', total: 639.96, status: 'Paid', items: [[20,10,49.99]]},
    {date: new Date(now - 4*86400000), customer: 'Dorothy Lewis', phone: '5555556666', type: 'Sale', mode: 'Cash', total: 449.98, status: 'Paid', items: [[12,0.5,699.99]]},
  ];

  let invSeq = 1;
  invoices.forEach(inv => {
    const dateStr = inv.date.toISOString();
    const iid = db.prepare(`INSERT INTO invoices
      (invoice_no,customer_name,customer_phone,type,payment_mode,
       subtotal,grand_total,status,is_credit_sale,created_at)
      VALUES(?,?,?,?,?,?,?,?,?,?)`
    ).run(
      `INV-2026-${String(invSeq).padStart(4,'0')}`,
      inv.customer, inv.phone, inv.type, inv.mode,
      inv.total, inv.total, inv.status, inv.status === 'Credit' ? 1 : 0, dateStr
    ).lastInsertRowid;

    inv.items.forEach(([pid, qty, rate]) => {
      db.prepare(`INSERT INTO invoice_items 
        (invoice_id,product_id,product_name,sku,qty,rate,discount,amount) 
        VALUES(?,?,
          (SELECT name FROM products WHERE id=?),
          (SELECT sku FROM products WHERE id=?),
          ?,?,0,?)`
      ).run(iid, pid, pid, pid, qty, rate, qty*rate);
    });
    invSeq++;
  });

  /* ── Sample purchase orders (10 POs) ── */
  for (let i = 1; i <= 10; i++) {
    const date = new Date(now - (50-i*5)*86400000).toISOString().split('T')[0];
    const status = i <= 3 ? 'Delivered' : i <= 6 ? 'Pending' : 'Ordered';
    const po = db.prepare(`INSERT INTO purchase_orders
      (po_number,vendor_id,po_date,total_amount,status,notes)
      VALUES(?,?,?,?,?,?)`
    ).run(
      `PO-2026-${String(i).padStart(6,'0')}`,
      (i % 10) + 1, date,
      (i * 500) + (i * 250), status,
      `Purchase order for stock replenishment - Batch ${i}`
    ).lastInsertRowid;

    // Add 2-3 items per PO
    const itemCount = i % 3 + 2;
    for (let j = 0; j < itemCount; j++) {
      const productId = (i * 3 + j) % 20 + 1;
      db.prepare(`INSERT INTO purchase_order_items 
        (po_id,product_id,product_name,qty,rate,amount) 
        VALUES(?,?,
          (SELECT name FROM products WHERE id=?),
          ?,
          (SELECT purchase_price FROM products WHERE id=?),
          ?)`
      ).run(po, productId, productId, (i+j)*10, productId, (i+j)*10*(100 + (i*j)));
    }
  }

  /* ── Sample expenses (20 expenses) ── */
  const expenses = [
    ['EXP-26001','Monthly Office Rent',2500,1,1],
    ['EXP-26002','Staff Salaries - March',8500,2,2],
    ['EXP-26003','Electricity Bill - Feb',450,3,1],
    ['EXP-26004','Internet & Telecom',300,8,1],
    ['EXP-26005','Office Supplies',250,8,1],
    ['EXP-26006','Marketing Campaign',1200,4,2],
    ['EXP-26007','Vehicle Maintenance',600,5,1],
    ['EXP-26008','Staff Training',800,2,2],
    ['EXP-26009','Water & Utilities',180,5,1],
    ['EXP-26010','Cleaning Services',350,8,1],
    ['EXP-26011','Insurance Premium',2200,5,2],
    ['EXP-26012','Software License',450,8,2],
    ['EXP-26013','Courier & Logistics',600,5,1],
    ['EXP-26014','Repairs & Maintenance',750,8,1],
    ['EXP-26015','Advertising',1500,4,2],
    ['EXP-26016','Bank Charges',75,8,1],
    ['EXP-26017','Staff Bonus',2000,2,2],
    ['EXP-26018','Equipment Purchase',3500,5,2],
    ['EXP-26019','Professional Fees',800,8,2],
    ['EXP-26020','Miscellaneous',200,8,1],
  ];

  expenses.forEach(([code,desc,amt,cat,acc], idx) => {
    const dateStr = new Date(now - (20-idx)*86400000).toISOString();
    db.prepare(`INSERT INTO expenses
      (expense_no,description,amount,category_id,paid_from_account_id,expense_date,payment_mode,created_at)
      VALUES(?,?,?,?,?,?,?,?)`
    ).run(code, desc, amt, cat, acc, dateStr.split('T')[0], 'Bank Transfer', dateStr);
  });

  /* ── Sample bank transactions (30 transactions) ── */
  let balance = 925000; // Starting balance
  for (let i = 0; i < 30; i++) {
    const date = new Date(now - (29-i)*86400000).toISOString().split('T')[0];
    const type = i % 3 === 0 ? 'Debit' : 'Credit';
    const amount = (i * 150) + (i % 10 * 50);
    
    if (type === 'Debit') balance -= amount;
    else balance += amount;

    db.prepare(`INSERT INTO bank_transactions
      (txn_number,account_id,type,amount,description,transaction_date,balance_after,created_at)
      VALUES(?,?,?,?,?,?,?,?)`
    ).run(
      `TXN-26${String(i).padStart(3,'0')}`, 1, type, amount,
      type === 'Debit' ? `Expense Payment ${i}` : `Invoice Payment ${i}`,
      date, balance, new Date(now - (29-i)*86400000).toISOString()
    );
  }

  /* ── Update cash account balance ── */
  db.prepare(`UPDATE bank_accounts SET current_balance=? WHERE id=1`).run(balance);

  /* ── Sequences ── */
  [
    ['setup_complete','true'],
    ['invoice_seq','20'],
    ['po_seq','10'],
    ['expense_seq','20'],
    ['txn_seq','30'],
    ['sku_seq','20'],
  ].forEach(([k,v]) =>
    db.prepare(`INSERT OR REPLACE INTO app_settings (key,value) VALUES(?,?)`).run(k,v)
  );

    // Verify seed completed
    const userData = {
      users: db.prepare("SELECT COUNT(*) c FROM users").get().c,
      invoices: db.prepare("SELECT COUNT(*) c FROM invoices").get().c,
      customers: db.prepare("SELECT COUNT(*) c FROM customers").get().c,
      products: db.prepare("SELECT COUNT(*) c FROM products").get().c,
      vendors: db.prepare("SELECT COUNT(*) c FROM vendors").get().c,
      expenses: db.prepare("SELECT COUNT(*) c FROM expenses").get().c,
      pos: db.prepare("SELECT COUNT(*) c FROM purchase_orders").get().c,
      transactions: db.prepare("SELECT COUNT(*) c FROM bank_transactions").get().c,
    };
    
    console.log('✅ Database seeding completed:');
    console.log(`   👥 Users: ${userData.users}`);
    console.log(`   📄 Invoices: ${userData.invoices}`);
    console.log(`   👤 Customers: ${userData.customers}`);
    console.log(`   📦 Products: ${userData.products}`);
    console.log(`   🏪 Vendors: ${userData.vendors}`);
    console.log(`   💰 Expenses: ${userData.expenses}`);
    console.log(`   📋 Purchase Orders: ${userData.pos}`);
    console.log(`   💳 Bank Transactions: ${userData.transactions}`);
  } catch (e) {
    console.error('❌ Database seed error:', e.message);
    console.error('   Stack:', e.stack);
    throw e;
  }
}

module.exports = { runSeed };
