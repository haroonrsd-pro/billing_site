import { initializeApp } from "firebase/app";
import { getAuth, signInWithEmailAndPassword } from "firebase/auth";
import { getFirestore, doc, setDoc, updateDoc } from "firebase/firestore";
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

const OWNER_UID = 'uJhGPQCTVEYVR9AH5wLDK3BWfsq2';
const PRODUCT_ID = 'xTlPL1APTMTWarGNBLDA'; // chapatti ID

async function runTest() {
    try {
        console.log("Signing in as selvam26@gmail.com...");
        const userCredential = await signInWithEmailAndPassword(auth, 'selvam26@gmail.com', 'selvam@26');
        console.log("Authentication successful. UID:", userCredential.user.uid);

        const companyId = OWNER_UID;

        // 1. Try to write Invoice
        console.log("\n1. Writing test invoice...");
        const invoiceRef = doc(db, `owners/${OWNER_UID}/invoices`, "TEST-INV-9999");
        await setDoc(invoiceRef, {
            cust: 'Walk-in Client',
            phone: '',
            tableNo: '',
            branch: 'Main Branch',
            branch_id: 'main',
            type: 'Standard',
            design: 'Standard',
            paymentMethod: 'Cash',
            items: [{ id: PRODUCT_ID, name: 'chappatti', qty: 1, price: 20 }],
            amount: 21,
            tax: 1,
            discount: 0,
            status: 'Paid',
            date: '2026-06-08',
            createdAt: new Date().toISOString(),
            companyId: companyId
        });
        console.log("Invoice write success.");

        // 2. Try to write Sales Order
        console.log("\n2. Writing test sales order...");
        const salesOrderRef = doc(db, `owners/${OWNER_UID}/salesOrders`, "TEST-SO-9999");
        await setDoc(salesOrderRef, {
            cust: 'Walk-in Client',
            branch: 'Main Branch',
            branch_id: 'main',
            date: '2026-06-08',
            items: 'chappatti (1)',
            itemsCount: 1,
            amount: 21,
            paymentMethod: 'Cash',
            invoiceRef: 'TEST-INV-9999',
            type: 'Standard',
            status: 'Invoiced',
            createdAt: new Date().toISOString(),
            companyId: companyId
        });
        console.log("Sales Order write success.");

        // 3. Try to update Product stock
        console.log("\n3. Updating product stock...");
        const productRef = doc(db, `owners/${OWNER_UID}/products`, PRODUCT_ID);
        await updateDoc(productRef, {
            stock: 45
        });
        console.log("Product stock update success.");

        console.log("\n>>> ALL TESTS PASSED SUCCESSFULLY! No database errors encountered.");

    } catch (err) {
        console.error("\n>>> TEST FAILED with error:");
        console.error(err);
    }
    process.exit(0);
}

runTest();
