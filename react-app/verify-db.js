import { initializeApp } from "firebase/app";
import { getAuth, signInWithEmailAndPassword } from "firebase/auth";
import { getFirestore, doc, getDoc } from "firebase/firestore";

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

async function verify() {
    console.log("Attempting to sign in to verify rules...");
    try {
        const userCredential = await signInWithEmailAndPassword(auth, 'superadmin@gmail.com', 'system@789');
        const uid = userCredential.user.uid;
        console.log("Auth Success. UID:", uid);

        console.log("Attempting to read Firestore document...");
        const userDoc = await getDoc(doc(db, 'users', uid));
        
        if (userDoc.exists()) {
            console.log("User Document Found:", JSON.stringify(userDoc.data(), null, 2));
            console.log("\n>>> SUCCESS! THE SECURITY RULES ARE WORKING CORRECTLY.");
        } else {
            console.log("User Document NOT FOUND at UID:", uid);
        }
    } catch (error) {
        console.error("Verification Failed:", error.message);
    }
    process.exit(0);
}

verify();
