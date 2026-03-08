const { contextBridge, ipcRenderer } = require('electron');

const invoke = (channel, ...args) => ipcRenderer.invoke(channel, ...args);

contextBridge.exposeInMainWorld('electronAPI', {
  showOpenDialog: (options) => invoke('show-open-dialog', options),
  importExcelFile: (filePath) => invoke('import-excel-file', filePath),
  importPDFFile: (filePath) => invoke('import-pdf-file', filePath),
  getLogs: (lines) => invoke('get-logs', lines),
  clearLogs: () => invoke('clear-logs'),
});

contextBridge.exposeInMainWorld('db', {
  app: {
    getVersion: ()           => invoke('get-version'),
    minimize:   ()           => invoke('win-minimize'),
    maximize:   ()           => invoke('win-maximize'),
    close:      ()           => invoke('win-close'),
    backup:     ()           => invoke('db-backup'),
    resetDb:    ()           => invoke('db-reset'),
  },

  invoices: {
    getAll:    (filters)     => invoke('get-invoices', filters),
    getById:   (id)          => invoke('get-invoice-by-id', id),
    create:    (data)        => invoke('create-invoice', data),
    update:    (id, data)    => invoke('update-invoice', { id, data }),
    delete:    (id)          => invoke('delete-invoice', id),
    getStats:  ()            => invoke('get-invoice-stats'),
    getRecent: (lim)         => invoke('get-recent-invoices', lim),
    search:    (q)           => invoke('search-invoices', q),
  },

  inventory: {
    getAll:       (filters)  => invoke('get-products', filters),
    getById:      (id)       => invoke('get-product-by-id', id),
    getByBarcode: (bc)       => invoke('get-product-by-barcode', bc),
    getBySku:     (sku)      => invoke('get-product-by-sku', sku),
    add:          (data)     => invoke('add-product', data),
    update:       (id, data) => invoke('update-product', { id, data }),
    delete:       (id)       => invoke('delete-product', id),
    getStats:     ()         => invoke('get-inventory-stats'),
    adjustStock:  (d)        => invoke('adjust-stock', d),
    getCategories:()         => invoke('get-categories'),
    addCategory:  (name, desc) => invoke('add-category', { name, description: desc }),
    search:       (q)        => invoke('search-products', q),
  },

  vendors: {
    getAll:               (filters) => invoke('get-vendors', filters),
    getById:              (id)      => invoke('get-vendor-by-id', id),
    add:                  (data)    => invoke('add-vendor', data),
    update:               (id, data)=> invoke('update-vendor', { id, data }),
    delete:               (id)      => invoke('delete-vendor', id),
    getPurchaseOrders:    (filters) => invoke('get-purchase-orders', filters),
    getPurchaseOrderById: (id)      => invoke('get-purchase-order-by-id', id),
    createPurchaseOrder:  (data)    => invoke('create-purchase-order', data),
    updatePurchaseOrder:  (id, data)=> invoke('update-purchase-order', { id, data }),
    getPurchaseReturns:   (filters) => invoke('get-purchase-returns', filters),
    createPurchaseReturn: (data)    => invoke('create-purchase-return', data),
    getPayBills:          (filters) => invoke('get-pay-bills', filters),
    getVendorPayments:    (filters) => invoke('get-vendor-payments', filters),
    createVendorPayment:  (data)    => invoke('create-vendor-payment', data),
  },

  banking: {
    getAccounts:     ()           => invoke('get-bank-accounts'),
    getAccountById:  (id)         => invoke('get-account-by-id', id),
    addAccount:      (data)       => invoke('add-bank-account', data),
    updateAccount:   (id, data)   => invoke('update-bank-account', { id, data }),
    getTransactions: (filters)    => invoke('get-transactions', filters),
    addTransaction:  (data)       => invoke('add-transaction', data),
    deleteTransaction:(id)        => invoke('delete-transaction', id),
    getStats:        ()           => invoke('get-banking-stats'),
  },

  expenses: {
    getAll:       (filters)       => invoke('get-expenses', filters),
    add:          (data)          => invoke('add-expense', data),
    update:       (id, data)      => invoke('update-expense', { id, data }),
    delete:       (id)            => invoke('delete-expense', id),
    getStats:     ()              => invoke('get-expense-stats'),
    getCategories:()              => invoke('get-expense-categories'),
  },

  reports: {
    getDashboardStats:       ()   => invoke('get-dashboard-stats'),
    getMonthlySalesTrend:    ()   => invoke('get-monthly-sales-trend'),
    getTopSellingItems:      ()   => invoke('get-top-selling-items'),
    getRecentInvoices:       (n)  => invoke('get-recent-invoices', n),
    getBranchRevenue:        ()   => invoke('get-branch-revenue'),
    getSalesReport:          (f)  => invoke('get-sales-report', f),
    getPurchaseReport:       (f)  => invoke('get-purchase-report', f),
    getStockReport:          ()   => invoke('get-stock-report'),
    getCustomerOutstanding:  ()   => invoke('get-customer-outstanding'),
    getVendorOutstanding:    ()   => invoke('get-vendor-outstanding'),
    getProfitAndLoss:        (f)  => invoke('get-profit-and-loss', f),
    getBalanceSheet:         ()   => invoke('get-balance-sheet'),
  },

  settings: {
    getCompanyProfile:   ()           => invoke('get-company-profile'),
    updateCompanyProfile:(data)       => invoke('update-company-profile', data),
    getUsers:            ()           => invoke('get-users'),
    addUser:             (data)       => invoke('add-user', data),
    updateUser:          (id, data)   => invoke('update-user', { id, data }),
    deleteUser:          (id)         => invoke('delete-user', id),
    getChartOfAccounts:  ()           => invoke('get-chart-of-accounts'),
    addAccount:          (data)       => invoke('add-account', data),
    updateAccount:       (id, data)   => invoke('update-account', { id, data }),
    getAppSettings:      ()           => invoke('get-app-settings'),
    updateAppSetting:    (key, value) => invoke('update-app-setting', { key, value }),
  },
});
