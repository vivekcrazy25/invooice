// Database Validation & CRUD Testing Script
// Run this from main.js for debugging: require('./database/validateDb').validateDatabase(db);

const { getDb } = require('./db');

function validateDatabase(db) {
  console.log('\n' + '='.repeat(60));
  console.log('🔍 DATABASE VALIDATION & DIAGNOSTIC REPORT');
  console.log('='.repeat(60) + '\n');

  try {
    // ============= CHECK 1: Database Connection =============
    console.log('✓ CHECK 1: Database Connection');
    console.log(`  → Database connected: ${db ? 'YES' : 'NO'}`);
    if (!db) {
      console.log('  ❌ ERROR: Database not initialized!');
      return false;
    }
    console.log('');

    // ============= CHECK 2: Table Existence =============
    console.log('✓ CHECK 2: Required Tables');
    const requiredTables = [
      'app_settings',
      'users',
      'invoices',
      'invoice_items',
      'customers',
      'products',
      'vendors',
      'purchase_orders',
    ];

    let allTablesExist = true;
    const tables = db.prepare(
      "SELECT name FROM sqlite_master WHERE type='table' ORDER BY name"
    ).all();
    const tableNames = tables.map(t => t.name);

    requiredTables.forEach(table => {
      const exists = tableNames.includes(table);
      console.log(`  ${exists ? '✓' : '❌'} ${table}`);
      if (!exists) allTablesExist = false;
    });
    console.log(`\n  Total tables: ${tableNames.length}`);
    console.log(`  Status: ${allTablesExist ? '✅ All required tables exist' : '❌ Missing tables!'}\n`);

    // ============= CHECK 3: Data Count in Key Tables =============
    console.log('✓ CHECK 3: Data Count in Key Tables');
    const tables_to_check = [
      { name: 'users',        label: 'Users' },
      { name: 'invoices',     label: 'Invoices' },
      { name: 'customers',    label: 'Customers' },
      { name: 'products',     label: 'Products' },
      { name: 'vendors',      label: 'Vendors' },
      { name: 'bank_accounts',label: 'Bank Accounts' },
    ];

    tables_to_check.forEach(({ name, label }) => {
      const result = db.prepare(`SELECT COUNT(*) as count FROM ${name}`).get();
      const count = result?.count || 0;
      const status = count > 0 ? '✓' : '⚠️';
      console.log(`  ${status} ${label}: ${count} record(s)`);
    });
    console.log('');

    // ============= CHECK 4: Setup Status =============
    console.log('✓ CHECK 4: Database Initialization Status');
    const setupStatus = db.prepare(
      "SELECT value FROM app_settings WHERE key='setup_complete'"
    ).get();
    console.log(`  Setup Complete Flag: ${setupStatus?.value === 'true' ? '✓ YES' : '❌ NO (needs seeding)'}`);
    console.log('');

    // ============= CHECK 5: Invoice Details =============
    console.log('✓ CHECK 5: Invoice Data Sample');
    const invoiceCheck = db.prepare(`
      SELECT i.id, i.invoice_no, i.customer_name, i.grand_total, i.status, 
             COUNT(ii.id) as item_count
      FROM invoices i
      LEFT JOIN invoice_items ii ON i.id = ii.invoice_id
      GROUP BY i.id
      ORDER BY i.created_at DESC
      LIMIT 3
    `).all();

    if (invoiceCheck.length === 0) {
      console.log('  ❌ NO INVOICES FOUND - This is why you see empty table!');
    } else {
      invoiceCheck.forEach(inv => {
        console.log(`  Invoice: ${inv.invoice_no}`);
        console.log(`    Customer: ${inv.customer_name}`);
        console.log(`    Amount: $${inv.grand_total}`);
        console.log(`    Status: ${inv.status}`);
        console.log(`    Items: ${inv.item_count}`);
      });
    }
    console.log('');

    // ============= CHECK 6: Foreign Key Constraints =============
    console.log('✓ CHECK 6: Foreign Key Constraints');
    const fkStatus = db.pragma('foreign_keys');
    console.log(`  Foreign Keys: ${fkStatus ? '✓ ENABLED' : '❌ DISABLED (should be ON!)'}`);
    console.log('');

    // ============= CHECK 7: Database File Info =============
    console.log('✓ CHECK 7: Database File Information');
    const pageCount = db.pragma('page_count');
    const pageSize = db.pragma('page_size');
    const size = (pageCount * pageSize) / 1024;
    console.log(`  Database Size: ${size.toFixed(2)} KB`);
    console.log(`  Page Size: ${pageSize} bytes`);
    console.log('');

    // ============= SUMMARY =============
    console.log('='.repeat(60));
    console.log('📊 SUMMARY & RECOMMENDATIONS');
    console.log('='.repeat(60) + '\n');

    const hasInvoices = invoiceCheck.length > 0;
    const hasUsers = db.prepare('SELECT COUNT(*) as c FROM users').get().c > 0;
    const hasProducts = db.prepare('SELECT COUNT(*) as c FROM products').get().c > 0;

    if (allTablesExist && hasInvoices && hasUsers && hasProducts) {
      console.log('✅ DATABASE IS HEALTHY');
      console.log('   All checks passed! CRUD operations should work.');
      return true;
    } else {
      console.log('⚠️  DATABASE ISSUES DETECTED:');
      if (!allTablesExist) console.log('   • Run migrations: db.prepare().run() for each table');
      if (!hasUsers) console.log('   • No users found - run seed for test data');
      if (!hasProducts) console.log('   • No products found - run seed for test data');
      if (!hasInvoices) console.log('   • ❌ NO INVOICES - This causes "Failed to load invoices" error');
      console.log('\n💡 Recommended Actions:');
      console.log('   1. Check electron/database/migrations.js is running');
      console.log('   2. Check electron/database/seed.js is generating sample data');
      console.log('   3. Check for errors in electron/main.js initialization');
      console.log('   4. Check browser DevTools (F12) for IPC communication errors');
      console.log('   5. Run: db.prepare("DELETE FROM app_settings WHERE key=...").run()');
      console.log('      to reset setup_complete flag and force re-seeding');
      return false;
    }
  } catch (error) {
    console.error('❌ VALIDATION ERROR:', error.message);
    console.error('Stack:', error.stack);
    return false;
  }
}

function testCRUD(db) {
  console.log('\n' + '='.repeat(60));
  console.log('🧪 TESTING CRUD OPERATIONS');
  console.log('='.repeat(60) + '\n');

  try {
    // Test CREATE
    console.log('1️⃣ Testing CREATE (Insert)...');
    const insertRes = db.prepare(`
      INSERT INTO invoices (invoice_no, customer_name, customer_phone, 
                           payment_mode, grand_total, status, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      `TEST-${Date.now()}`,
      'Test Customer',
      '9999999999',
      'Cash',
      999.99,
      'Draft',
      new Date().toISOString(),
      new Date().toISOString()
    );
    const testId = insertRes.lastInsertRowid;
    console.log(`  ✓ Created invoice ID: ${testId}\n`);

    // Test READ
    console.log('2️⃣ Testing READ (Select)...');
    const readRes = db.prepare('SELECT * FROM invoices WHERE id=?').get(testId);
    if (readRes) {
      console.log(`  ✓ Retrieved invoice: ${readRes.invoice_no}\n`);
    } else {
      console.log(`  ❌ Could not read back inserted record\n`);
    }

    // Test UPDATE
    console.log('3️⃣ Testing UPDATE...');
    const updateRes = db.prepare(`
      UPDATE invoices SET customer_name=?, updated_at=? WHERE id=?
    `).run('Updated Test Customer', new Date().toISOString(), testId);
    console.log(`  ✓ Updated ${updateRes.changes} record(s)\n`);

    // Test DELETE
    console.log('4️⃣ Testing DELETE...');
    const deleteRes = db.prepare('DELETE FROM invoices WHERE id=?').run(testId);
    console.log(`  ✓ Deleted ${deleteRes.changes} record(s)\n`);

    console.log('✅ ALL CRUD OPERATIONS SUCCESSFUL!\n');
    return true;
  } catch (error) {
    console.error('❌ CRUD TEST FAILED:', error.message);
    console.error('Stack:', error.stack);
    return false;
  }
}

function resetDatabase(db) {
  console.log('\n⚠️  RESETTING DATABASE...');
  try {
    db.prepare("DELETE FROM app_settings WHERE key='setup_complete'").run();
    console.log('✓ Reset complete flag - seeding will run on next start');
    return true;
  } catch (error) {
    console.error('❌ Reset failed:', error.message);
    return false;
  }
}

module.exports = {
  validateDatabase,
  testCRUD,
  resetDatabase
};
