import { initializeApp } from "firebase/app";
import { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword } from "firebase/auth";
import { getFirestore, doc, setDoc, serverTimestamp } from "firebase/firestore";

const firebaseConfig = {
    apiKey: "AIzaSyBclxMutggsRJ6BrG1214fnlhKHrtMI1uM",
    authDomain: "billing-software-8234d.firebaseapp.com",
    projectId: "billing-software-8234d",
    storageBucket: "billing-software-8234d.firebasestorage.app",
    messagingSenderId: "661399359115",
    appId: "1:661399359115:web:3f5bf026e00abdf49f4e8e"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

const EMAIL = 'superadmin@gmail.com';
const PASSWORD = 'system@789'; // Using the secure version with @

async function syncSuperAdmin() {
    console.log("--- Super Admin Synchronization Script ---");
    
    let userRecord = null;

    // Step 1: Ensure user exists in Firebase Auth
    try {
        console.log(`Checking Auth account for ${EMAIL}...`);
        const userCredential = await signInWithEmailAndPassword(auth, EMAIL, PASSWORD);
        userRecord = userCredential.user;
        console.log("Auth: Signed in successfully.");
    } catch (error) {
        if (error.code === 'auth/user-not-found' || error.code === 'auth/invalid-credential') {
            console.log("Auth: Account not found or wrong password. Attempting to create/recreate...");
            try {
                const userCredential = await createUserWithEmailAndPassword(auth, EMAIL, PASSWORD);
                userRecord = userCredential.user;
                console.log("Auth: Account created successfully.");
            } catch (createError) {
                console.error("Auth Error:", createError.message);
                process.exit(1);
            }
        } else {
            console.error("Auth Error:", error.message);
            process.exit(1);
        }
    }

    // Step 2: Synchronize Firestore Document ID with Auth UID
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
                createdAt: serverTimestamp()
            });
            console.log("Firestore: Success! Super Admin document is now indexed correctly by UID.");
            console.log("\n>>> YOU CAN NOW LOGIN AT: https://billing-software-8234d.web.app");
            process.exit(0);
        } catch (dbError) {
            console.error("Firestore Error:", dbError.message);
            process.exit(1);
        }
    }
}

syncSuperAdmin();
