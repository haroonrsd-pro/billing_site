import { initializeApp } from "firebase/app";
import { getAuth, signInWithEmailAndPassword } from "firebase/auth";
import { getFirestore, collection, addDoc, doc, setDoc, getDocs, deleteDoc } from "firebase/firestore";
import fs from 'fs';
import path from 'path';

// Parse .env
const envPath = path.resolve(process.cwd(), '.env');
const envConfig = {};
if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf8');
    envContent.split('\n').forEach(line => {
        const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
        if (match) {
            let value = match[2] ? match[2].trim() : '';
            if (value.startsWith('"') && value.endsWith('"')) value = value.substring(1, value.length - 1);
            envConfig[match[1]] = value;
        }
    });
}

const firebaseConfig = {
    apiKey: envConfig.VITE_FIREBASE_API_KEY,
    authDomain: envConfig.VITE_FIREBASE_AUTH_DOMAIN,
    projectId: envConfig.VITE_FIREBASE_PROJECT_ID,
    storageBucket: envConfig.VITE_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: envConfig.VITE_FIREBASE_MESSAGING_SENDER_ID,
    appId: envConfig.VITE_FIREBASE_APP_ID,
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

const BRANCH_NAME = 'Main Branch';
const BRANCH_ID = 'main';

async function clearCollection(pathStr) {
    const colRef = collection(db, pathStr);
    const snap = await getDocs(colRef);
    for (const d of snap.docs) {
        await deleteDoc(doc(db, pathStr, d.id));
    }
}

async function seedOwner(ownerUid, businessName, email) {
    console.log(`\n==============================================`);
    console.log(`Seeding data for Owner ID: ${ownerUid} (${businessName})`);
    console.log(`==============================================`);

    const collections = [
        'branches',
        'products',
        'customers',
        'expenses',
        'purchases',
        'salesOrders',
        'quotations',
        'credit_notes',
        'coupons',
        'invoices'
    ];

    for (const col of collections) {
        const pathStr = `owners/${ownerUid}/${col}`;
        console.log(`Clearing existing documents in: ${pathStr}`);
        await clearCollection(pathStr);
    }

    console.log("\n--- Seeding Branches ---");
    const branchPath = `owners/${ownerUid}/branches`;
    const defaultBranch = {
        id: BRANCH_ID,
        name: BRANCH_NAME,
        location: 'Main Block, Ground Floor',
        status: 'active',
        companyId: ownerUid,
        createdAt: new Date().toISOString()
    };
    await setDoc(doc(db, branchPath, BRANCH_ID), defaultBranch);
    console.log("Branch seeded successfully.");

    console.log("\n--- Seeding Products (Food Items) ---");
    const productsPath = `owners/${ownerUid}/products`;
    const products = [
        { name: 'Chicken Biryani', cat: 'rice', type: 'nveg', price: 180, cost: 90, stock: 50, unit: 'plate', low: 5, img: '', branch: BRANCH_NAME, branch_id: BRANCH_ID },
        { name: 'Veg Biryani', cat: 'rice', type: 'veg', price: 130, cost: 60, stock: 40, unit: 'plate', low: 5, img: '', branch: BRANCH_NAME, branch_id: BRANCH_ID },
        { name: 'Paneer Butter Masala', cat: 'curries', type: 'veg', price: 160, cost: 70, stock: 30, unit: 'bowl', low: 5, img: '', branch: BRANCH_NAME, branch_id: BRANCH_ID },
        { name: 'Butter Naan', cat: 'breads', type: 'veg', price: 30, cost: 10, stock: 100, unit: 'piece', low: 10, img: '', branch: BRANCH_NAME, branch_id: BRANCH_ID },
        { name: 'Chicken 65', cat: 'starters', type: 'nveg', price: 200, cost: 100, stock: 25, unit: 'plate', low: 5, img: '', branch: BRANCH_NAME, branch_id: BRANCH_ID },
        { name: 'Mango Lassi', cat: 'drinks', type: 'veg', price: 60, cost: 20, stock: 60, unit: 'glass', low: 10, img: '', branch: BRANCH_NAME, branch_id: BRANCH_ID },
        { name: 'Gulab Jamun', cat: 'desserts', type: 'veg', price: 50, cost: 15, stock: 80, unit: 'piece', low: 10, img: '', branch: BRANCH_NAME, branch_id: BRANCH_ID },
        { name: 'Samosa', cat: 'snacks', type: 'veg', price: 20, cost: 8, stock: 3, unit: 'piece', low: 5, img: '', branch: BRANCH_NAME, branch_id: BRANCH_ID },
        { name: 'chappatti', cat: 'breads', type: 'veg', price: 20, cost: 10, stock: 50, unit: 'piece', low: 5, img: '', branch: BRANCH_NAME, branch_id: BRANCH_ID }
    ];
    for (const p of products) {
        await addDoc(collection(db, productsPath), {
            ...p,
            companyId: ownerUid,
            createdAt: new Date().toISOString()
        });
    }
    console.log(`${products.length} products seeded successfully.`);

    console.log("\n--- Seeding Customers / Store Profile ---");
    const customersPath = `owners/${ownerUid}/customers`;
    // System Profile
    await addDoc(collection(db, customersPath), {
        isSystemProfile: true,
        profile: {
            businessName: businessName,
            logo: '',
            phone: '9879789123',
            email: email,
            address: 'Main Block, Ground Floor'
        },
        legal: {
            taxRate: '5',
            gstNo: 'GST-SW-2026'
        },
        billing: {
            invoicePrefix: 'SW'
        },
        companyId: ownerUid,
        createdAt: new Date().toISOString()
    });
    // Regular Customers
    const customers = [
        { name: 'Ramesh Kumar', phone: '9876543210', email: 'ramesh@gmail.com', address: 'Chennai', balance: 0 },
        { name: 'Suresh Raina', phone: '9988776655', email: 'suresh@gmail.com', address: 'Bangalore', balance: 120 }
    ];
    for (const c of customers) {
        await addDoc(collection(db, customersPath), {
            ...c,
            companyId: ownerUid,
            createdAt: new Date().toISOString()
        });
    }
    console.log("Customers and Store Profile seeded successfully.");

    console.log("\n--- Seeding Expenses ---");
    const expensesPath = `owners/${ownerUid}/expenses`;
    const expenses = [
        { cat: 'Utilities', amount: 4500, desc: 'Electricity Bill May 2026', date: '2026-06-01', branch: BRANCH_NAME, branch_id: BRANCH_ID },
        { cat: 'Salary', amount: 25000, desc: 'Staff Salary May 2026', date: '2026-06-05', branch: BRANCH_NAME, branch_id: BRANCH_ID }
    ];
    for (const e of expenses) {
        await addDoc(collection(db, expensesPath), {
            ...e,
            companyId: ownerUid,
            createdAt: new Date().toISOString()
        });
    }
    console.log("Expenses seeded successfully.");

    console.log("\n--- Seeding Purchases ---");
    const purchasesPath = `owners/${ownerUid}/purchases`;
    const purchases = [
        { vendor: 'Metro Cash & Carry', billNo: 'MET-4829', date: '2026-06-02', amount: 8500, status: 'Paid', branch: BRANCH_NAME, branch_id: BRANCH_ID },
        { vendor: 'Venkateshwara Veg', billNo: 'VEN-1029', date: '2026-06-06', amount: 2400, status: 'Pending', branch: BRANCH_NAME, branch_id: BRANCH_ID }
    ];
    for (const p of purchases) {
        await addDoc(collection(db, purchasesPath), {
            ...p,
            companyId: ownerUid,
            createdAt: new Date().toISOString()
        });
    }
    console.log("Purchases seeded successfully.");

    console.log("\n--- Seeding Sales Orders ---");
    const salesOrdersPath = `owners/${ownerUid}/salesOrders`;
    const salesOrders = [
        { cust: 'Walk-in Client', branch: BRANCH_NAME, branch_id: BRANCH_ID, date: '2026-06-07', items: 'Chicken Biryani (x2), Mango Lassi (x1)', itemsCount: 3, amount: 420, paymentMethod: 'Cash', invoiceRef: 'SW-1780896000-123', type: 'Standard', status: 'Invoiced' }
    ];
    for (const so of salesOrders) {
        await addDoc(collection(db, salesOrdersPath), {
            ...so,
            companyId: ownerUid,
            createdAt: new Date().toISOString()
        });
    }
    console.log("Sales Orders seeded successfully.");

    console.log("\n--- Seeding Quotations ---");
    const quotationsPath = `owners/${ownerUid}/quotations`;
    const quotations = [
        {
            customerName: 'Catering Event',
            customerPhone: '9840123456',
            items: [
                { name: 'Chicken Biryani', price: 170, qty: 50, total: 8500 },
                { name: 'Gulab Jamun', price: 40, qty: 50, total: 2000 }
            ],
            taxPct: 5,
            discPct: 10,
            subtotal: 10500,
            discAmount: 1050,
            taxAmount: 472.5,
            grandTotal: 9922.5,
            status: 'Draft',
            date: new Date().toISOString(),
            branch: BRANCH_NAME,
            branch_id: BRANCH_ID
        }
    ];
    for (const q of quotations) {
        await addDoc(collection(db, quotationsPath), {
            ...q,
            companyId: ownerUid,
            createdAt: new Date().toISOString()
        });
    }
    console.log("Quotations seeded successfully.");

    console.log("\n--- Seeding Credit Notes ---");
    const creditNotesPath = `owners/${ownerUid}/credit_notes`;
    const creditNotes = [
        { invoiceRef: 'SW-1780896000-123', customer: 'Walk-in Client', branch: BRANCH_NAME, branch_id: BRANCH_ID, originalAmount: 420, amount: 420, reason: 'Online Payment - POS', date: '2026-06-07' }
    ];
    for (const cn of creditNotes) {
        await addDoc(collection(db, creditNotesPath), {
            ...cn,
            companyId: ownerUid,
            createdAt: new Date().toISOString()
        });
    }
    console.log("Credit Notes seeded successfully.");

    console.log("\n--- Seeding Coupons ---");
    const couponsPath = `owners/${ownerUid}/coupons`;
    const coupons = [
        { code: 'WELCOME50', discountType: 'flat', discountValue: 50, minOrderValue: 200, usedCount: 0, usageLimit: 100, isActive: true, companyId: ownerUid, assignedToAdminUID: '', createdByRole: 'owner', createdByUID: ownerUid }
    ];
    for (const cp of coupons) {
        await addDoc(collection(db, couponsPath), {
            ...cp,
            createdAt: new Date().toISOString()
        });
    }
    console.log("Coupons seeded successfully.");

    console.log("\n--- Seeding Invoices ---");
    const invoicesPath = `owners/${ownerUid}/invoices`;
    const invoices = [
        {
            cust: 'Walk-in Client',
            phone: '',
            tableNo: '',
            branch: BRANCH_NAME,
            branch_id: BRANCH_ID,
            type: 'Standard',
            design: 'Standard',
            paymentMethod: 'Cash',
            items: [
                { name: 'Chicken Biryani', qty: 2, price: 180 },
                { name: 'Mango Lassi', qty: 1, price: 60 }
            ],
            amount: 420,
            tax: 20,
            discount: 0,
            status: 'Paid',
            date: '2026-06-07'
        }
    ];
    for (const inv of invoices) {
        await setDoc(doc(db, invoicesPath, 'SW-1780896000-123'), {
            ...inv,
            companyId: ownerUid,
            createdAt: new Date().toISOString()
        });
    }
    console.log("Invoices seeded successfully.");
}

async function seedAll() {
    try {
        console.log("Signing in as Super Admin...");
        await signInWithEmailAndPassword(auth, 'superadmin@gmail.com', 'system@789');
        console.log("Authentication successful.");

        // Seed both the Owner account and the Superadmin account's path context
        await seedOwner('uJhGPQCTVEYVR9AH5wLDK3BWfsq2', 'Suger Wheal', 'selvam26@gmail.com');
        await seedOwner('HXzJZHD4DcNjjRnv2pnx0F8M7aT2', 'System Master Profile', 'superadmin@gmail.com');

        console.log("\n>>> SUCCESS! All modules have been fully initialized with Firestore data for all accounts.");
    } catch (err) {
        console.error("Error Seeding:", err);
    }
    process.exit(0);
}

seedAll();
