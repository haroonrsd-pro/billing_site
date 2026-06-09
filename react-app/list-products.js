import { initializeApp } from "firebase/app";
import { getAuth, signInWithEmailAndPassword } from "firebase/auth";
import { getFirestore, collection, getDocs } from "firebase/firestore";
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

async function checkProducts() {
    try {
        console.log("Signing in as Super Admin...");
        await signInWithEmailAndPassword(auth, 'superadmin@gmail.com', 'system@789');
        console.log("Authentication successful.");

        console.log("\nFetching products from owners/" + OWNER_UID + "/products...");
        const snap = await getDocs(collection(db, `owners/${OWNER_UID}/products`));
        snap.forEach(d => {
            console.log(`Product: id=${d.id} =>`, JSON.stringify(d.data(), null, 2));
        });

    } catch (err) {
        console.error("Error:", err);
    }
    process.exit(0);
}

checkProducts();
