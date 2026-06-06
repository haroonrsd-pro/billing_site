import { initializeApp } from "firebase/app";
import { getAuth, signInWithEmailAndPassword } from "firebase/auth";
import { getFirestore, doc, getDoc, collection, query, where, getDocs } from "firebase/firestore";

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

const TARGET_EMAIL = 'savi42@gmail.com';
const TARGET_PASS = 'savi@42';

async function diagnose() {
    console.log(`--- Diagnosing User: ${TARGET_EMAIL} ---`);
    try {
        // 1. Check Auth
        console.log("Checking Firebase Auth...");
        const userCredential = await signInWithEmailAndPassword(auth, TARGET_EMAIL, TARGET_PASS);
        const uid = userCredential.user.uid;
        console.log("Auth Success. UID:", uid);

        // 2. Check Firestore by UID
        console.log(`Checking Firestore for doc at /users/${uid}...`);
        const uidDoc = await getDoc(doc(db, 'users', uid));
        if (uidDoc.exists()) {
            console.log("UID Doc Found:", JSON.stringify(uidDoc.data(), null, 2));
        } else {
            console.log("UID Doc NOT FOUND.");
        }

        // 3. Search for legacy documents by email
        console.log(`Searching for legacy docs with email: ${TARGET_EMAIL}...`);
        const usersRef = collection(db, 'users');
        const q = query(usersRef, where("email", "==", TARGET_EMAIL));
        const querySnapshot = await getDocs(q);
        
        if (!querySnapshot.empty) {
            querySnapshot.forEach((d) => {
                console.log(`Found Legacy Doc [ID: ${d.id}]:`, JSON.stringify(d.data(), null, 2));
            });
        } else {
            console.log("No legacy documents found with this email.");
        }

    } catch (error) {
        console.error("Diagnosis Failed:", error.message);
    }
    process.exit(0);
}

diagnose();
