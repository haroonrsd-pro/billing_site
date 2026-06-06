# QMEX Billing App

QMEX is a premium, feature-rich Billing and Point of Sale (POS) ecosystem designed to handle modern retail operations. It is built as a cross-platform solution supporting Web, Desktop (Electron), and Mobile (Capacitor/Android) runtimes, backed by Firebase for real-time synchronization and cloud services.

---

## 🚀 Key Features

- **⚡ Professional POS/Billing Engine**: Fast checkout interface, barcode/item search, customizable item grids, instant invoicing, and flexible discounts.
- **👥 Multi-Role Dashboards**: Role-Based Access Control (RBAC) customized for:
  - **Super Admin**: Complete control over system configuration, global branches, and global reports.
  - **Owner**: Franchise/branch oversight, financial reports, and owner analytics.
  - **Admin**: Staff oversight, product catalog management, and local configuration.
  - **Staff**: POS entry, invoice creation, and checkout.
- **📦 Inventory & Stock Management**: Real-time stock counts, product categories, low-stock warnings, and barcode tracking.
- **🏢 Multi-Branch Architecture**: Manage multiple physical outlets with independent operations, localized staff, and centralized reporting.
- **📈 Advanced Reporting & Analytics**: Real-time sales charts, expense tracking, franchise breakdowns, and printable PDF/Excel summaries.
- **🏷️ Coupon & Promotion Engine**: Create, validate, and track promotional coupons.
- **📄 Document Generation**:
  - Direct ticket printing (via local printers and mobile Bluetooth/network printers).
  - Export transactions to high-quality PDF invoices.
  - Export business reports to Microsoft Excel formats.
- **💬 Staff Chat & Collaboration**: Internal communication tool for quick updates across shifts and branches.

---

## 🛠️ Tech Stack

- **Frontend Core**: [React](https://react.dev/) 19 & [Vite](https://vite.dev/) (Fast refresh build tooling)
- **Styling**: [Tailwind CSS](https://tailwindcss.com/) & [Lucide React](https://lucide.dev/) (Icon library)
- **Database & Auth**: [Firebase](https://firebase.google.com/) (Auth, Firestore, Cloud Functions)
- **Desktop App**: [Electron](https://www.electronjs.org/) (Package for Windows, macOS, Linux)
- **Mobile App**: [Capacitor](https://capacitorjs.com/) (Native Android bridge wrapper)
- **Caching**: [IndexedDB (idb)](https://github.com/jakearchibald/idb) for offline-first support
- **Analytics & Exports**: [Chart.js](https://www.chartjs.org/), [Recharts](https://recharts.org/), [jsPDF](https://github.com/parallax/jsPDF), [ExcelJS](https://github.com/exceljs/exceljs)

---

## 📂 Project Structure

```
├── billing app/           # Legacy/IntelliJ configurations
└── react-app/             # Core React app (Web, Electron, Capacitor)
    ├── android/           # Capacitor Android Native project
    ├── electron/          # Electron main and preload entry points
    ├── public/            # Static public assets
    ├── src/               # React Source code
    │   ├── components/    # Reusable UI components
    │   ├── context/       # React Context Providers (Auth, Cart, etc.)
    │   ├── pages/         # Page components & views (POS, Dashboards, Reports)
    │   ├── services/      # External integrations (Firebase, print drivers)
    │   └── utils/         # Helper functions, formatters, and mathematical utilities
    ├── package.json       # Script and dependencies setup
    └── vite.config.js     # Bundler configuration
```

---

## ⚙️ Setup & Installation

### Prerequisites
- [Node.js](https://nodejs.org/) (v18 or higher recommended)
- [NPM](https://www.npmjs.com/) (v9 or higher) or Yarn

### Installation Steps

1. Clone the repository and navigate to the project directory:
   ```bash
   cd react-app
   ```

2. Install the application dependencies:
   ```bash
   npm install
   ```

3. Configure environment variables. Duplicate the `.env.example` file to `.env`:
   ```bash
   cp .env.example .env
   ```
   Open the `.env` file and insert your **Firebase Configuration API keys**.

---

## 💻 Running the Application

All developer actions are run from the `react-app/` directory.

### 🌐 Web Mode

Start the development server:
```bash
npm run dev
```

Build the web application for production:
```bash
npm run build
```

---

### 🖥️ Desktop Mode (Electron)

Launch the app in an Electron window during development:
```bash
npm run electron:dev
```

Build a production desktop binary (packaged for Windows by default):
```bash
npm run electron:build
```

---

### 📱 Mobile Mode (Capacitor Android)

To run the app inside an Android Emulator or connected physical device:

1. Build the web files and sync them to Android:
   ```bash
   npm run cap:build
   ```

2. Alternatively, run the Android debug process:
   ```bash
   npm run android
   ```

3. Open Android Studio to debug and build signing releases:
   ```bash
   npx cap open android
   ```

---

## 📄 License

This repository is distributed under the [MIT License](file:///Volumes/Qmex%20/billing%20app%20fin/LICENSE). See the [LICENSE](file:///Volumes/Qmex%20/billing%20app%20fin/LICENSE) file for more details.
