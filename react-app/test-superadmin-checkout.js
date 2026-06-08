import { initializeApp } from "firebase/app";
import { getAuth, signInWithEmailAndPassword } from "firebase/auth";
import { getFirestore, doc, setDoc } from "firebase/firestore";
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

const SUPERADMIN_UID = 'HXzJZHD4DcNjjRnv2pnx0F8M7aT2';

async function runTest() {
    try {
        console.log("Signing in as superadmin@gmail.com...");
        const userCredential = await signInWithEmailAndPassword(auth, 'superadmin@gmail.com', 'system@789');
        console.log("Authentication successful. UID:", userCredential.user.uid);

        // Try to write Invoice
        console.log("\n1. Writing test invoice for superadmin path...");
        const invoiceRef = doc(db, `owners/${SUPERADMIN_UID}/invoices`, "TEST-INV-SA");
        await setDoc(invoiceRef, {
            cust: 'Walk-in Client',
            amount: 21,
            status: 'Paid',
            createdAt: new Date().toISOString()
        });
        console.log("Invoice write success.");

        // Try to write Sales Order
        console.log("\n2. Writing test sales order for superadmin path...");
        const salesOrderRef = doc(db, `owners/${SUPERADMIN_UID}/salesOrders`, "TEST-SO-SA");
        await setDoc(salesOrderRef, {
            cust: 'Walk-in Client',
            amount: 21,
            status: 'Invoiced',
            createdAt: new Date().toISOString()
        });
        console.log("Sales Order write success.");

    } catch (err) {
        console.error("\n>>> TEST FAILED with error:");
        console.error(err);
    }
    process.exit(0);
}

runTest();
