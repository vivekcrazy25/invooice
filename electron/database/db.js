const path = require('path');
let db;

function initDb(userDataPath) {
  const Database = require('better-sqlite3');
  const dbPath = path.join(userDataPath, 'accounting.db');
  db = new Database(dbPath);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');
  return db;
}

function getDb() {
  if (!db) throw new Error('Database not initialized');
  return db;
}

module.exports = { initDb, getDb };
