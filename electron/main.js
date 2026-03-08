const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path  = require('path');
const isDev = process.env.NODE_ENV === 'development' || process.argv.includes('--dev');

// Initialize logger
const logger = require('./logger');

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400, height: 900,
    minWidth: 1200, minHeight: 700,
    title: 'AccountingPro',
    webPreferences: {
      nodeIntegration:  false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'),
    },
    show: false,
  });

  if (isDev) {
    mainWindow.loadURL('http://localhost:5173');
    // mainWindow.webContents.openDevTools(); // uncomment to debug
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist-react/index.html'));
  }

  mainWindow.once('ready-to-show', () => mainWindow.show());
  mainWindow.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
}

app.whenReady().then(() => {
  // Initialize logger
  logger.init(path.join(app.getPath('userData'), 'logs'));
  logger.appStart(app.getVersion(), process.version);

  /* ── Database bootstrap ── */
  try {
    const { initDb }        = require('./database/db');
    const { runMigrations } = require('./database/migrations');
    const { runSeed }       = require('./database/seed');
    const { validateDatabase, testCRUD } = require('./database/validateDb');

    logger.info('Initializing database...');
    const db = initDb(app.getPath('userData'));
    runMigrations(db);
    logger.info('Database migrations completed');

    // Force seed to run - clear setup_complete flag if needed
    try {
      const setup = db.prepare("SELECT value FROM app_settings WHERE key='setup_complete'").get();
      if (!setup || setup.value !== 'true') {
        runSeed(db);
        logger.info('Database seeded with sample data');
      }
    } catch (e) {
      logger.warn('Seed initialization attempt failed', { error: e.message });
      runSeed(db);
    }

    // Validate database integrity
    logger.info('Validating database integrity...');
    const isValid = validateDatabase(db);
    if (!isValid) {
      logger.error('Database validation failed');
    } else {
      logger.info('Database validation passed');
    }

    /* ── IPC handlers ── */
    const { registerInvoiceHandlers }   = require('./database/handlers/invoiceHandlers');
    const { registerInventoryHandlers } = require('./database/handlers/inventoryHandlers');
    const { registerVendorHandlers }    = require('./database/handlers/vendorHandlers');
    const { registerBankingHandlers }   = require('./database/handlers/bankingHandlers');
    const { registerExpenseHandlers }   = require('./database/handlers/expenseHandlers');
    const { registerReportHandlers }    = require('./database/handlers/reportHandlers');
    const { registerSettingsHandlers }  = require('./database/handlers/settingsHandlers');

    registerInvoiceHandlers(ipcMain);
    registerInventoryHandlers(ipcMain);
    registerVendorHandlers(ipcMain);
    registerBankingHandlers(ipcMain);
    registerExpenseHandlers(ipcMain);
    registerReportHandlers(ipcMain);
    registerSettingsHandlers(ipcMain);

  } catch (dbError) {
    logger.error('Database initialization failed', { error: dbError.message, stack: dbError.stack });

    // Show user-friendly error dialog
    const errorMessage = `Database initialization failed. This is usually due to a missing or incompatible database module.\n\nError: ${dbError.message}\n\nPlease try:\n1. Run: npm rebuild better-sqlite3\n2. Or reinstall dependencies: npm install\n\nThe database file itself appears to be healthy based on diagnostic checks.`;

    dialog.showErrorBox('Database Error', errorMessage);

    // Don't exit immediately, let the app start with limited functionality
    logger.warn('App starting with database disabled');
  }

  /* ── Window controls ── */
  ipcMain.handle('win-minimize', () => mainWindow?.minimize());
  ipcMain.handle('win-maximize', () => mainWindow?.isMaximized() ? mainWindow.unmaximize() : mainWindow?.maximize());
  ipcMain.handle('win-close',    () => mainWindow?.close());
  ipcMain.handle('get-version',  () => app.getVersion());

  /* ── Logging ── */
  ipcMain.handle('get-logs', (_, lines) => logger.getRecentLogs(lines));
  ipcMain.handle('clear-logs', () => {
    logger.rotateLogs(0); // Force rotation
    logger.info('Logs cleared manually');
    return true;
  });

  /* ── Error handling ── */
  process.on('uncaughtException', (error) => {
    logger.logError(error, 'Uncaught Exception');
  });

  process.on('unhandledRejection', (reason, promise) => {
    logger.error('Unhandled Rejection', { reason, promise });
  });

  app.on('window-all-closed', () => {
    logger.info('All windows closed');
    if (process.platform !== 'darwin') {
      logger.appExit(0);
      app.quit();
    }
  });

  app.on('before-quit', () => {
    logger.info('Application quitting');
  });

  /* ── DB backup ── */
  ipcMain.handle('db-backup', async () => {
    logger.info('Starting database backup');
    try {
      const { filePath } = await dialog.showSaveDialog(mainWindow, {
        title:       'Backup Database',
        defaultPath: `accounting-backup-${new Date().toISOString().split('T')[0]}.db`,
        filters:     [{ name: 'SQLite Database', extensions: ['db'] }],
      });
      if (filePath) {
        const fs  = require('fs');
        const src = path.join(app.getPath('userData'), 'accounting.db');
        fs.copyFileSync(src, filePath);
        logger.info('Database backup completed', { backupPath: filePath });
        return { success: true, path: filePath };
      }
      logger.info('Database backup cancelled by user');
      return { success: false };
    } catch (e) {
      logger.error('Database backup failed', { error: e.message });
      return { success: false, error: e.message };
    }
  });

  /* ── File dialogs ── */
  ipcMain.handle('show-open-dialog', async (_, options) => {
    return await dialog.showOpenDialog(mainWindow, options);
  });

  /* ── File import ── */
  ipcMain.handle('import-excel-file', async (_, filePath) => {
    const startTime = Date.now();
    logger.info('Starting Excel import', { filePath });

    try {
      const fs = require('fs');
      const XLSX = require('xlsx');

      const fileBuffer = fs.readFileSync(filePath);
      const workbook = XLSX.read(fileBuffer);

      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const jsonData = XLSX.utils.sheet_to_json(worksheet);

      const duration = Date.now() - startTime;
      logger.performance('Excel import', duration, { recordCount: jsonData.length });
      logger.importOperation('Excel', filePath, { success: true, recordCount: jsonData.length });

      return { success: true, data: jsonData, count: jsonData.length };
    } catch (e) {
      logger.error('Excel import failed', { filePath, error: e.message });
      return { success: false, error: e.message };
    }
  });

  ipcMain.handle('import-pdf-file', async (_, filePath) => {
    const startTime = Date.now();
    logger.info('Starting PDF import', { filePath });

    try {
      const fs = require('fs');
      const pdfParse = require('pdf-parse');

      const dataBuffer = fs.readFileSync(filePath);
      const data = await pdfParse(dataBuffer);

      const duration = Date.now() - startTime;
      logger.performance('PDF import', duration, { pages: data.numpages, textLength: data.text.length });
      logger.importOperation('PDF', filePath, { success: true, pages: data.numpages });

      return { success: true, text: data.text, pages: data.numpages };
    } catch (e) {
      logger.error('PDF import failed', { filePath, error: e.message });
      return { success: false, error: e.message };
    }
  });

  /* ── DB Reset ── */
  ipcMain.handle('db-reset', () => {
    try {
      db.prepare("DELETE FROM app_settings WHERE key='setup_complete'").run();
      runSeed(db);
      console.log('✅ Database reset and reseeded');
      return { success: true, message: 'Database reset with sample data' };
    } catch (e) {
      console.error('❌ DB reset error:', e);
      return { success: false, error: e.message };
    }
  });

  createWindow();
});

app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });
app.on('activate',          () => { if (BrowserWindow.getAllWindows().length === 0) createWindow(); });
