import { initializeApp } from "firebase/app";
import { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword } from "firebase/auth";
import { getFirestore, doc, setDoc } from "firebase/firestore";
import fs from 'fs';
import path from 'path';

// Parse .env file manually
const envPath = path.resolve(process.cwd(), '.env');
const envConfig = {};
if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf8');
    envContent.split('\n').forEach(line => {
        const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
        if (match) {
            let value = match[2] ? match[2].trim() : '';
            if (value.startsWith('"') && value.endsWith('"')) {
                value = value.substring(1, value.length - 1);
            } else if (value.startsWith("'") && value.endsWith("'")) {
                value = value.substring(1, value.length - 1);
            }
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
    measurementId: envConfig.VITE_FIREBASE_MEASUREMENT_ID
};

console.log("Using Firebase Project:", firebaseConfig.projectId);

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

const EMAIL = 'superadmin@gmail.com';
const PASSWORD = 'system@789';

async function syncSuperAdmin() {
    console.log("--- Super Admin Synchronization Script (using .env config) ---");
    
    let userRecord = null;

    try {
        console.log(`Checking Auth account for ${EMAIL}...`);
        const userCredential = await signInWithEmailAndPassword(auth, EMAIL, PASSWORD);
        userRecord = userCredential.user;
        console.log("Auth: Signed in successfully.");
    } catch (error) {
        if (error.code === 'auth/user-not-found' || error.code === 'auth/invalid-credential' || error.code === 'auth/cannot-find-user-entry-in-db') {
            console.log("Auth: Account not found or wrong password. Attempting to create...");
            try {
                const userCredential = await createUserWithEmailAndPassword(auth, EMAIL, PASSWORD);
                userRecord = userCredential.user;
                console.log("Auth: Account created successfully.");
            } catch (createError) {
                console.error("Auth Creation Error:", createError.code, "-", createError.message);
                if (createError.code === 'auth/configuration-not-found') {
                    console.error("\n[IMPORTANT] Email/Password Sign-in provider is NOT enabled in your Firebase Console.");
                    console.error("Please go to Firebase Console -> Authentication -> Sign-in method -> Enable 'Email/Password' and save.");
                }
                process.exit(1);
            }
        } else {
            console.error("Auth Error:", error.code, "-", error.message);
            if (error.code === 'auth/configuration-not-found') {
                console.error("\n[IMPORTANT] Email/Password Sign-in provider is NOT enabled in your Firebase Console.");
                console.error("Please go to Firebase Console -> Authentication -> Sign-in method -> Enable 'Email/Password' and save.");
            }
            process.exit(1);
        }
    }

    if (userRecord) {
        console.log(`Syncing Firestore document for UID: ${userRecord.uid}...`);
        try {
            await setDoc(doc(db, 'users', userRecord.uid), {
                uid: userRecord.uid,
                email: EMAIL,
                password: PASSWORD,
                role: 'superadmin',
                status: 'active',
                name: 'Master Control',
                station: 'Global HQ',
                createdAt: new Date().toISOString()
            });
            console.log("Firestore: Success! Super Admin document is now indexed correctly in Firestore.");
            process.exit(0);
        } catch (dbError) {
            console.error("Firestore Error:", dbError.message);
            process.exit(1);
        }
    }
}

syncSuperAdmin();
