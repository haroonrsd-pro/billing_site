import ExcelJS from 'exceljs';
import { collection, getDocs } from 'firebase/firestore';
import { db, getTenantPath } from '../firebaseConfig';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';
import { Capacitor } from '@capacitor/core';

/**
 * Internal helper to handle the actual file saving/downloading
 */
const saveWorkbook = async (workbook, fileName) => {
    try {
        const buffer = await workbook.xlsx.writeBuffer();
        
        if (Capacitor.isNativePlatform()) {
            // MOBILE / TAB EMULATOR LOGIC
            // Convert buffer to base64 more reliably
            const bytes = new Uint8Array(buffer);
            let binary = '';
            for (let i = 0; i < bytes.byteLength; i++) {
                binary += String.fromCharCode(bytes[i]);
            }
            const base64Data = btoa(binary);

            const fileResult = await Filesystem.writeFile({
                path: fileName,
                data: base64Data,
                directory: Directory.Cache,
            });

            await Share.share({
                title: fileName,
                text: 'Exporting data to Excel',
                url: fileResult.uri,
                dialogTitle: 'Share Excel File',
            });
        } else {
            // WEB APPLICATION LOGIC
            const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
            const url = window.URL.createObjectURL(blob);
            const anchor = document.createElement('a');
            anchor.href = url;
            anchor.download = fileName;
            anchor.click();
            window.URL.revokeObjectURL(url);
        }
    } catch (err) {
        console.error(`Failed to save workbook ${fileName}:`, err);
    }
};

/**
 * Generates and downloads an Excel file containing the provided invoices.
 * @param {Array} invoices - List of invoice objects from Firestore
 */
export const downloadInvoicesExcel = async (invoices) => {
    try {
        const workbook = new ExcelJS.Workbook();
        const sheet = workbook.addWorksheet('Invoices');

        // Define columns
        sheet.columns = [
            { header: 'Invoice Number', key: 'id', width: 20 },
            { header: 'Date', key: 'date', width: 15 },
            { header: 'Customer Name', key: 'cust', width: 25 },
            { header: 'Items', key: 'items', width: 40 },
            { header: 'Quantity', key: 'qty', width: 10 },
            { header: 'Price', key: 'price', width: 15 },
            { header: 'Total Amount', key: 'total', width: 15 }
        ];

        // Add rows
        invoices.forEach(inv => {
            let itemsString = '';
            let totalQty = 0;
            
            if (Array.isArray(inv.items)) {
                itemsString = inv.items.map(i => `${i.name} (${i.qty})`).join(', ');
                totalQty = inv.items.reduce((acc, curr) => acc + (Number(curr.qty) || 0), 0);
            } else {
                itemsString = String(inv.items || '');
                totalQty = 1;
            }

            sheet.addRow({
                id: inv.id || '',
                date: inv.date || '',
                cust: inv.cust || '',
                items: itemsString,
                qty: totalQty,
                price: Number(inv.amount || 0),
                total: Number(inv.amount || 0)
            });
        });

        await saveWorkbook(workbook, 'invoices.xlsx');
    } catch (err) {
        console.error('Failed to generate Excel with exceljs:', err);
    }
};

/**
 * Fetches the latest invoices from DB and generates the Excel file.
 * @param {string} companyId - Mandatory company ID
 * @param {string} branchId - Optional branch ID filter
 */
export const syncInvoicesExcel = async (companyId, branchId = 'All') => {
    try {
        if (!companyId) throw new Error("Missing companyId for Excel export");

        const { query, where, orderBy } = await import('firebase/firestore');
        const path = getTenantPath('invoices');
        const colRef = collection(db, path);
        
        let constraints = [colRef];
        
        // Multi-tenant isolation
        constraints.push(where('companyId', '==', companyId));

        // Branch filtering
        if (branchId && branchId !== 'All') {
            constraints.push(where('branch_id', '==', branchId));
        }

        // Default sort for the Excel dump
        constraints.push(orderBy('date', 'desc'));

        const q = query(...constraints);
        const querySnapshot = await getDocs(q);
        
        let allInvoices = querySnapshot.docs.map(doc => ({ 
            id: doc.id, 
            ...doc.data({ serverTimestamps: 'estimate' }) 
        }));
        
        await downloadInvoicesExcel(allInvoices);
    } catch (err) {
        console.error("Error creating excel from DB", err);
        throw err;
    }
};

/**
 * Universal Excel Generator
 * @param {Array} data - The rows to export
 * @param {Array} columns - Column definitions {header, key, width}
 * @param {string} fileName - Name of the downloaded file
 * @param {string} sheetName - Name of the worksheet
 */
const generateExcel = async (data, columns, fileName, sheetName) => {
    try {
        const workbook = new ExcelJS.Workbook();
        const sheet = workbook.addWorksheet(sheetName);
        sheet.columns = columns;

        data.forEach(row => {
            sheet.addRow(row);
        });

        await saveWorkbook(workbook, fileName);
    } catch (err) {
        console.error(`Failed to generate Excel for ${fileName}:`, err);
    }
};

/**
 * Sync and Export Credit Notes
 */
export const syncCreditNotesExcel = async () => {
    try {
        const querySnapshot = await getDocs(collection(db, getTenantPath('credit_notes')));
        const data = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data({ serverTimestamps: 'estimate' }) }));
        data.sort((a,b) => new Date(b.date || b.createdAt || 0) - new Date(a.date || a.createdAt || 0));

        const columns = [
            { header: 'CN #', key: 'id', width: 20 },
            { header: 'Invoice Ref', key: 'invoiceRef', width: 20 },
            { header: 'Customer', key: 'customer', width: 25 },
            { header: 'Date', key: 'date', width: 15 },
            { header: 'Amount', key: 'amount', width: 15 },
            { header: 'Reason', key: 'reason', width: 40 }
        ];

        await generateExcel(data, columns, 'credit-notes.xlsx', 'Credit Notes');
    } catch (err) {
        console.error("Error exporting Credit Notes", err);
    }
};

/**
 * Sync and Export Expenses
 */
export const syncExpensesExcel = async () => {
    try {
        const querySnapshot = await getDocs(collection(db, getTenantPath('expenses')));
        const data = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data({ serverTimestamps: 'estimate' }) }));
        data.sort((a,b) => new Date(b.date || b.createdAt || 0) - new Date(a.date || a.createdAt || 0));

        const columns = [
            { header: 'Expense ID', key: 'id', width: 20 },
            { header: 'Date', key: 'date', width: 15 },
            { header: 'Category', key: 'category', width: 20 },
            { header: 'Amount', key: 'amount', width: 15 },
            { header: 'Description', key: 'desc', width: 40 },
            { header: 'Status', key: 'status', width: 15 }
        ];

        await generateExcel(data, columns, 'expenses.xlsx', 'Expenses');
    } catch (err) {
        console.error("Error exporting Expenses", err);
    }
};

/**
 * Sync and Export Purchases
 */
export const syncPurchasesExcel = async () => {
    try {
        const querySnapshot = await getDocs(collection(db, getTenantPath('purchases')));
        const data = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data({ serverTimestamps: 'estimate' }) }));
        data.sort((a,b) => new Date(b.date || b.createdAt || 0) - new Date(a.date || a.createdAt || 0));

        const columns = [
            { header: 'Purchase ID', key: 'id', width: 20 },
            { header: 'Date', key: 'date', width: 15 },
            { header: 'Supplier', key: 'supplier', width: 25 },
            { header: 'Total Amount', key: 'totalAmount', width: 15 },
            { header: 'Status', key: 'status', width: 15 }
        ];

        await generateExcel(data, columns, 'purchases.xlsx', 'Purchases');
    } catch (err) {
        console.error("Error exporting Purchases", err);
    }
};

/**
 * Sync and Export Sales Orders
 */
export const syncSalesOrdersExcel = async () => {
    try {
        const querySnapshot = await getDocs(collection(db, getTenantPath('sales_orders')));
        const data = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data({ serverTimestamps: 'estimate' }) }));
        data.sort((a,b) => new Date(b.date || b.createdAt || 0) - new Date(a.date || a.createdAt || 0));

        const columns = [
            { header: 'Order ID', key: 'id', width: 20 },
            { header: 'Date', key: 'date', width: 15 },
            { header: 'Customer', key: 'custName', width: 25 },
            { header: 'Amount', key: 'total', width: 15 },
            { header: 'Status', key: 'status', width: 15 }
        ];

        await generateExcel(data, columns, 'sales-orders.xlsx', 'Sales Orders');
    } catch (err) {
        console.error("Error exporting Sales Orders", err);
    }
};

/**
 * Sync and Export Clients Manifest
 * Exports TWO sheets:
 *   Sheet 1 — All Clients (from 'customers' collection)
 *   Sheet 2 — Admins & Staff (from 'users' collection, role admin/staff)
 */
export const syncCustomersExcel = async () => {
    try {
        const workbook = new ExcelJS.Workbook();
        const customersPath = getTenantPath('customers');

        // ── SHEET 1: CLIENTS ─────────────────────────────────────────────
        const customersSnap = await getDocs(collection(db, customersPath));
        const clients = customersSnap.docs
            .map(doc => ({ id: doc.id, ...doc.data({ serverTimestamps: 'estimate' }) }))
            .filter(c => !c.isSystemProfile);

        const clientSheet = workbook.addWorksheet('Clients');
        clientSheet.columns = [
            { header: 'Name',           key: 'name',         width: 28 },
            { header: 'Phone',          key: 'phone',        width: 18 },
            { header: 'Email',          key: 'email',        width: 28 },
            { header: 'Type',           key: 'type',         width: 16 },
            { header: 'Branch',         key: 'branch',       width: 22 },
            { header: 'GST Number',     key: 'gst',          width: 20 },
            { header: 'Franchise Fee',  key: 'franchiseFee', width: 16 },
            { header: 'Address',        key: 'address',      width: 36 },
            { header: 'Created At',     key: 'createdAt',    width: 20 },
        ];

        // Style header row
        clientSheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
        clientSheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF4F46E5' } };

        clients.forEach(c => {
            clientSheet.addRow({
                name:         c.name         || '',
                phone:        c.phone        || '',
                email:        c.email        || '',
                type:         (c.type || 'regular').toUpperCase(),
                branch:       c.branch       || '',
                gst:          c.gst          || '',
                franchiseFee: c.franchiseFee || '',
                address:      c.address      || '',
                createdAt:    c.createdAt
                    ? (c.createdAt.toDate ? c.createdAt.toDate().toLocaleDateString() : new Date(c.createdAt).toLocaleDateString())
                    : '',
            });
        });

        // ── SHEET 2: ADMINS & STAFF ───────────────────────────────────────
        // Admins and staff are now in the owners/{ownerId}/admins and staff subcollections.
        // For legacy support we will check the 'users' root but they should be in the tenant subcollection.
        const usersSnap = await getDocs(collection(db, getTenantPath('users')));
        const staff = usersSnap.docs
            .map(doc => ({ id: doc.id, ...doc.data({ serverTimestamps: 'estimate' }) }))
            .filter(u => u.role === 'admin' || u.role === 'staff');

        const staffSheet = workbook.addWorksheet('Admins & Staff');
        staffSheet.columns = [
            { header: 'Full Name',   key: 'name',     width: 28 },
            { header: 'Username',    key: 'username',  width: 20 },
            { header: 'Role',        key: 'role',      width: 14 },
            { header: 'Branch',      key: 'branch',    width: 22 },
            { header: 'Station',     key: 'station',   width: 22 },
            { header: 'City',        key: 'city',      width: 18 },
            { header: 'District',    key: 'district',  width: 18 },
            { header: 'State',       key: 'state',     width: 18 },
            { header: 'Status',      key: 'status',    width: 14 },
            { header: 'Access',      key: 'access',    width: 20 },
            { header: 'Created At',  key: 'createdAt', width: 20 },
        ];

        // Style header row
        staffSheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
        staffSheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E293B' } };

        staff.forEach(u => {
            staffSheet.addRow({
                name:      u.name      || '',
                username:  u.username  || '',
                role:      (u.role || '').toUpperCase(),
                branch:    u.branch    || u.station || '',
                station:   u.station   || '',
                city:      u.city      || '',
                district:  u.district  || '',
                state:     u.state     || '',
                status:    (u.status || 'active').toUpperCase(),
                access:    u.access    || 'Full Access',
                createdAt: u.createdAt
                    ? (u.createdAt.toDate ? u.createdAt.toDate().toLocaleDateString() : new Date(u.createdAt).toLocaleDateString())
                    : '',
            });
        });

        const today = new Date().toISOString().split('T')[0];
        await saveWorkbook(workbook, `Clients_Manifest_${today}.xlsx`);
    } catch (err) {
        console.error('Error exporting Clients Manifest:', err);
    }
};

/**
 * Sync and Export Branches
 */
export const syncBranchesExcel = async () => {
    try {
        const querySnapshot = await getDocs(collection(db, getTenantPath('branches')));
        const data = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data({ serverTimestamps: 'estimate' }) }));

        const columns = [
            { header: 'Branch ID', key: 'id', width: 20 },
            { header: 'Name', key: 'name', width: 25 },
            { header: 'City', key: 'city', width: 20 },
            { header: 'Manager', key: 'manager', width: 25 },
            { header: 'Status', key: 'status', width: 15 }
        ];

        await generateExcel(data, columns, 'branches.xlsx', 'Branches');
    } catch (err) {
        console.error("Error exporting Branches", err);
    }
};

/**
 * Export Franchise Report Data
 * @param {Array} reportData - Aggregated data from component
 */
export const downloadFranchiseReportExcel = async (reportData) => {
    const columns = [
        { header: 'Product Name', key: 'name', width: 30 },
        { header: 'Category', key: 'category', width: 20 },
        { header: 'Unit Price', key: 'price', width: 15 },
        { header: 'Quantity Sold', key: 'qty', width: 15 },
        { header: 'Total Revenue', key: 'revenue', width: 20 }
    ];

    await generateExcel(reportData, columns, 'franchise-report.xlsx', 'Sales Analytics');
};

/**
 * Export Business Intelligence Report
 * @param {Array} chartData - Monthly revenue and profit data
 */
export const downloadBusinessReportExcel = async (chartData) => {
    const columns = [
        { header: 'Month', key: 'name', width: 15 },
        { header: 'Revenue', key: 'Revenue', width: 20 },
        { header: 'Profit', key: 'Profit', width: 20 }
    ];

    await generateExcel(chartData, columns, 'business-report.xlsx', 'Monthly Performance');
};

