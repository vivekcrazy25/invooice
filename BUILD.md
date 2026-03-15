# AccountingPro — Build Instructions

## Prerequisites
- Node.js 18+ (https://nodejs.org)
- Git
- **Windows**: Visual Studio 2022 Build Tools with "Desktop development with C++" workload
  - Install from: https://visualstudio.microsoft.com/downloads/#build-tools-for-visual-studio-2022
  - Make sure **MSVC v143** and **Windows 11 SDK** are checked during install

## Setup

### Step 1 — Delete old install if any
If you ran `npm install` before, clean it first:
```bash
rmdir /s /q node_modules
del package-lock.json
```

### Step 2 — Install dependencies
```bash
npm install
```

### Step 3 — Rebuild better-sqlite3 for Electron
```bash
npm run rebuild
```

If rebuild still fails, try this manual approach:
```bash
cd node_modules/better-sqlite3
npx node-gyp rebuild --target=28.3.3 --arch=x64 --dist-url=https://electronjs.org/headers
cd ../..
```

---

## Development

```bash
npm run dev
```
Opens the app at localhost:5173 with hot reload.

---

## Production Build

### Windows installer (.exe)
```bash
npm run build
```
Output: `release\AccountingPro Setup 1.0.0.exe`

### macOS DMG
```bash
npm run build:mac
```

### Linux AppImage
```bash
npm run build:linux
```

---

## Troubleshooting

### Error: `C++20 or later required`
This means `better-sqlite3` and Electron versions are mismatched.

**Fix**: Make sure you have exactly these versions in package.json:
```json
"electron": "^28.3.3",
"better-sqlite3": "^9.6.0",
"electron-rebuild": "^3.2.9"
```
Then run:
```bash
rmdir /s /q node_modules
del package-lock.json
npm install
npm run rebuild
```

### Error: `node-gyp failed` / MSBuild not found
Install Visual Studio Build Tools 2022:
1. Download from https://visualstudio.microsoft.com/downloads/#build-tools-for-visual-studio-2022
2. Run installer → select **"Desktop development with C++"**
3. Make sure these are checked:
   - MSVC v143 - VS 2022 C++ x64/x86 build tools
   - Windows 11 SDK (10.0.22621 or newer)
4. Restart your terminal and retry

### Security audit warnings (tar, tough-cookie)
These are in `electron-rebuild`'s own dependencies and do **not** affect your app at runtime.
They are dev-only tools. You can safely ignore them or run:
```bash
npm audit fix
```
Do **NOT** run `npm audit fix --force` as it will downgrade electron-rebuild to a breaking version (1.4.0).

---

## Project Structure

```
AccountingPro/
├── electron/
│   ├── main.js              # Electron entry, IPC setup
│   ├── preload.js           # Context bridge (window.db.*)
│   └── database/
│       ├── db.js            # SQLite connection
│       ├── migrations.js    # Schema (19 tables)
│       ├── seed.js          # Sample data (runs once)
│       └── handlers/
│           ├── invoiceHandlers.js
│           ├── inventoryHandlers.js
│           ├── vendorHandlers.js
│           ├── bankingHandlers.js
│           ├── expenseHandlers.js
│           ├── reportHandlers.js
│           └── settingsHandlers.js
├── src/
│   ├── App.jsx              # Router + layout
│   ├── main.jsx
│   ├── index.css
│   ├── components/          # 10 shared components
│   ├── screens/             # 8 screens
│   └── utils/               # formatters, validation
├── package.json
├── vite.config.js
├── tailwind.config.js
└── electron-builder.yml
```

## Default Login
- **Email**: admin@company.com
- **Password**: admin123

## Database Location
- Windows: `%APPDATA%\AccountingPro\accounting.db`
- macOS:   `~/Library/Application Support/AccountingPro/accounting.db`
- Linux:   `~/.config/AccountingPro/accounting.db`
