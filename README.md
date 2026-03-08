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

## Recommended IDE

> **Visual Studio Code** is the recommended editor for this project.

[![Open in VS Code](https://img.shields.io/badge/Open%20in-VS%20Code-007ACC?logo=visual-studio-code)](https://code.visualstudio.com/)

**Download VS Code:** https://code.visualstudio.com/

### Recommended VS Code Extensions

Install these extensions for the best development experience. In VS Code go to **Extensions** (`Ctrl+Shift+X` / `Cmd+Shift+X`) and search for each:

| Extension | Purpose |
|---|---|
| **ES7+ React/Redux/React-Native snippets** | React component snippets |
| **Tailwind CSS IntelliSense** | Autocomplete for Tailwind classes |
| **Prettier – Code formatter** | Auto-format JS/JSX files |
| **ESLint** | Catch JavaScript errors as you type |
| **SQLite Viewer** | View the SQLite database directly in VS Code |
| **Auto Rename Tag** | Auto-renames paired JSX tags |
| **GitLens** | Enhanced Git history and blame annotations |

You can also install all of them at once by opening the **Extensions** panel and searching `@recommended` — VS Code will pick them up from the `.vscode/extensions.json` if present.

---

## Getting Started

### Step 1 — Prerequisites

Before you begin, make sure the following tools are installed on your machine:

#### ✅ Node.js (v18 or later)
Download from: https://nodejs.org/

After installing, verify in your terminal:
```bash
node --version   # should print v18.x.x or higher
npm --version    # should print 9.x.x or higher
```

#### ✅ Git
Download from: https://git-scm.com/

After installing, verify:
```bash
git --version    # should print git version 2.x.x
```

#### ✅ Windows Only — Visual Studio Build Tools
Required for compiling `better-sqlite3` (the native database module).

Download: https://visualstudio.microsoft.com/visual-cpp-build-tools/

During install, select **"Desktop development with C++"** workload and click Install.

> **macOS users:** Run `xcode-select --install` in Terminal instead.
> **Linux users:** Run `sudo apt-get install build-essential` (Ubuntu/Debian) or equivalent.

---

### Step 2 — Pull the Project from GitHub

```bash
# Clone the repository to your local machine
git clone https://github.com/YOUR_USERNAME/AccountingPro.git

# Move into the project folder
cd AccountingPro
```

> Replace `YOUR_USERNAME` with the actual GitHub username or organization name.

If you want a **specific branch** instead of the default `main`:
```bash
git clone -b branch-name https://github.com/YOUR_USERNAME/AccountingPro.git
```

---

### Step 3 — Install Dependencies

```bash
npm install
```

This installs all packages listed in `package.json`. It will take 1–3 minutes on first run.

> ⚠️ If you see a node-gyp or binding error, your C++ build tools are missing — go back to Step 1 Prerequisites.

---

### Step 4 — Rebuild Native Modules

Because Electron uses its own version of Node.js, the native SQLite module must be recompiled for it:

```bash
npm run rebuild
```

> You must run this once after `npm install`, and again any time you update Electron or `better-sqlite3`.

---

### Step 5 — Run in Development Mode

```bash
npm run dev
```

This command starts two processes simultaneously:
- **Vite dev server** → serves the React frontend at `http://localhost:5173`
- **Electron** → waits for Vite to be ready, then opens the desktop window

The app window will open automatically. Any changes you make to files in `src/` will hot-reload instantly in the window.

---

### Building for Production

Once development is complete, build a distributable installer:

**Windows (.exe installer):**
```bash
npm run build
```
Output: `release/AccountingPro Setup 1.0.0.exe`

**macOS (.dmg):**
```bash
npm run build:mac
```
Output: `release/AccountingPro-1.0.0.dmg`

**Linux (.AppImage):**
```bash
npm run build:linux
```
Output: `release/AccountingPro-1.0.0.AppImage`

> The `release/` folder is excluded from Git — share the installer file directly with end users.

---

## Working with Git — Pull Latest Changes

If someone else has pushed updates to the repository and you want to get their latest changes, follow these steps:

### Pull from `main` branch

```bash
# 1. Make sure you're on the main branch
git checkout main

# 2. Fetch and merge the latest changes
git pull origin main

# 3. Reinstall packages if dependencies changed
npm install

# 4. Rebuild native modules if Electron version changed
npm run rebuild
```

### Pull from a specific feature branch

```bash
# 1. Fetch all remote branches
git fetch origin

# 2. Switch to the branch you want
git checkout branch-name

# 3. Pull the latest commits on that branch
git pull origin branch-name

# 4. Install/rebuild if needed
npm install && npm run rebuild
```

### Check which branch you're on

```bash
git branch           # lists local branches (* = current)
git branch -a        # lists all branches including remote
git status           # shows uncommitted changes
git log --oneline    # shows recent commit history
```

### Common Git Workflow for Contributors

```bash
# 1. Always start by pulling the latest main
git checkout main
git pull origin main

# 2. Create your own feature branch
git checkout -b feature/your-feature-name

# 3. Make your changes, then stage them
git add .

# 4. Commit with a clear message
git commit -m "feat: describe what you changed"

# 5. Push your branch to GitHub
git push origin feature/your-feature-name

# 6. Open a Pull Request on GitHub to merge into main
```

> **Tip:** Never commit directly to `main`. Always work on a separate branch and open a Pull Request so changes can be reviewed.

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
