# AccountingPro

A modern, offline-first desktop accounting application built with **React**, **Electron**, and **SQLite**. Designed for small businesses and retail shops to manage invoices, inventory, vendors, banking, expenses, and financial reports — all without an internet connection.

---

## Screenshots

> Add your screenshots here after building the app. Suggested: Dashboard, Billing, Reports.

---

## Features

### 📊 Dashboard
- At-a-glance KPI cards: Total Sales, Total Profit, Pending Payments, Cash Balance, Bank Balance, Low Stock Alerts
- Monthly Sales Trend bar chart
- Recent Invoices snapshot
- Top Selling Items & Branch Revenue summaries
- Quick Actions panel (New Sale, New Purchase, Add Item)

### 🧾 Billing & Invoices
- Create, view, edit, and delete invoices
- Product search with live inventory lookup
- Line items with per-row Qty, Rate, and Discount editing
- Multiple payment modes: Cash, Card, EFT, UPI, Split Payment
- Credit sale support (tracks pending balances)
- Return & Exchange management
- Completed invoices archive

### 📦 Inventory Management
- Product catalog with categories and stock status
- Real-time stock value tracking (at cost and sell price)
- Low Stock Alert counter
- Add/Edit products with barcode support
- Category management
- Search, filter by category, filter by stock status

### 🏪 Vendors & Purchases
- Vendor directory with full CRUD
- Purchase Orders with line-item detail
- Purchase Returns tracking
- Outstanding bills dashboard with one-click payment recording

### 🏦 Banking
- Multiple bank account management
- Credit and Debit transaction recording
- Running balance per account
- Monthly credit/debit summary cards

### 💸 Expenses
- Expense tracking with category tagging
- Expense distribution PieChart by category
- Monthly totals and top category insights
- Full Add/Edit/Delete workflow

### 📈 Reports (7 types)
- Sales Summary
- Purchase Summary
- Stock Report
- Profit & Loss Statement
- Balance Sheet
- Customer Outstanding
- Vendor Outstanding
- Date range filters
- Export to **Excel (.xlsx)** and **PDF**

### ⚙️ Settings
- Company profile (name, logo, address, tax info, currency)
- Chart of Accounts management
- User management with role-based access (Admin, Manager, Cashier)
- Password management with bcrypt hashing
- Backup & Security preferences

### 🗂️ Activity Logs
- In-app log viewer for monitoring application activity
- Filter by log level (INFO, WARN, ERROR, DEBUG)
- Download and clear log files

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend Framework | React 18 |
| Desktop Shell | Electron 28 |
| Build Tool | Vite 5 |
| Styling | Tailwind CSS 3 |
| Charts | Recharts 2 |
| Icons | Lucide React |
| Routing | React Router DOM 6 |
| Database | SQLite via better-sqlite3 |
| Excel Export | SheetJS (xlsx) |
| PDF Export | jsPDF + html2canvas |
| Password Hashing | bcryptjs |
| Packaging | electron-builder |

---

## Project Structure

```
AccountingPro/
├── electron/                   # Electron main process
│   ├── main.js                 # App entry, window creation, IPC setup
│   ├── preload.js              # Secure context bridge (window.db, window.electronAPI)
│   ├── logger.js               # File-based logger
│   └── database/
│       ├── db.js               # SQLite initialization
│       ├── migrations.js       # Schema migrations
│       ├── seed.js             # Sample data seeder
│       ├── validateDb.js       # DB validation utility
│       └── handlers/           # IPC handlers per module
│           ├── invoiceHandlers.js
│           ├── inventoryHandlers.js
│           ├── vendorHandlers.js
│           ├── bankingHandlers.js
│           ├── expenseHandlers.js
│           ├── reportHandlers.js
│           └── settingsHandlers.js
├── src/                        # React frontend
│   ├── main.jsx                # React entry point
│   ├── App.jsx                 # Router setup
│   ├── index.css               # Global styles
│   ├── screens/                # Page-level components
│   │   ├── Dashboard.jsx
│   │   ├── BillingInvoice.jsx
│   │   ├── Inventory.jsx
│   │   ├── VendorsPurchases.jsx
│   │   ├── Banking.jsx
│   │   ├── Expenses.jsx
│   │   ├── Reports.jsx
│   │   ├── Settings.jsx
│   │   └── Logs.jsx
│   └── components/             # Shared UI components
│       ├── Sidebar.jsx
│       ├── TopBar.jsx
│       ├── DataTable.jsx
│       ├── Modal.jsx
│       ├── StatCard.jsx
│       ├── FormInput.jsx
│       ├── FormSelect.jsx
│       ├── StatusBadge.jsx
│       ├── ConfirmDialog.jsx
│       └── ToastContext.jsx
├── assets/                     # App icons and installer resources
├── index.html                  # Vite HTML entry
├── vite.config.js
├── tailwind.config.js
├── postcss.config.js
├── electron-builder.yml        # Desktop build configuration
└── package.json
```

---

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) v18 or later
- npm v9 or later
- On Windows: [Visual Studio Build Tools](https://visualstudio.microsoft.com/visual-cpp-build-tools/) (required for `better-sqlite3` native compilation)

### Installation

```bash
# 1. Clone the repository
git clone https://github.com/YOUR_USERNAME/AccountingPro.git
cd AccountingPro

# 2. Install dependencies
npm install

# 3. Rebuild native modules for Electron
npm run rebuild
```

### Development

```bash
npm run dev
```

This starts the Vite dev server and Electron simultaneously. The app loads at `http://localhost:5173`.

### Building for Production

**Windows:**
```bash
npm run build
```
Output: `release/AccountingPro Setup 1.0.0.exe`

**macOS:**
```bash
npm run build:mac
```
Output: `release/AccountingPro-1.0.0.dmg`

**Linux:**
```bash
npm run build:linux
```
Output: `release/AccountingPro-1.0.0.AppImage`

---

## Architecture

### IPC Communication (Electron ↔ React)

The app uses Electron's `contextBridge` for secure communication between the main process and renderer:

- **`window.db`** — All database operations (CRUD for invoices, inventory, vendors, banking, expenses, reports, settings)
- **`window.electronAPI`** — Native Electron features (log reading, file backup, dialog boxes)

All database calls are handled by dedicated handler files in `electron/database/handlers/`, keeping the main process clean.

### Database

SQLite database is stored in the user's app data directory (`app.getPath('userData')`). It is initialized with:
- **Migrations** (`migrations.js`) — Schema creation and version upgrades
- **Seed data** (`seed.js`) — Sample data for first-run experience
- **Validation** (`validateDb.js`) — Structural integrity checks on startup

---

## Available Scripts

| Command | Description |
|---|---|
| `npm run dev` | Start dev mode (Vite + Electron) |
| `npm run build` | Build for Windows (.exe installer) |
| `npm run build:mac` | Build for macOS (.dmg) |
| `npm run build:linux` | Build for Linux (.AppImage) |
| `npm run rebuild` | Rebuild native modules (better-sqlite3) for Electron |

---

## Contributing

Contributions are welcome! Please follow these steps:

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/your-feature-name`
3. Commit your changes: `git commit -m "Add your feature"`
4. Push to the branch: `git push origin feature/your-feature-name`
5. Open a Pull Request

### Code Style
- React functional components with hooks
- Tailwind CSS utility classes for all styling
- Keep shared UI logic in `src/components/`
- Add new database handlers in `electron/database/handlers/`

---

## Known Limitations / Roadmap

- [ ] Barcode / QR scanner integration for product lookup
- [ ] Invoice print / receipt layout
- [ ] Stock adjustment history log
- [ ] Vendor account ledger (running balance statement)
- [ ] Bank reconciliation (match transactions to bank statements)
- [ ] Inter-account transfers in Banking
- [ ] Branch / Store management UI
- [ ] Email / WhatsApp sharing of invoices and purchase orders
- [ ] Multi-currency support

---

## License

[MIT](LICENSE)

---

## Author

Built with ❤️ using React + Electron.

> For issues or feature requests, please open a [GitHub Issue](https://github.com/YOUR_USERNAME/AccountingPro/issues).
