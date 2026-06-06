import { initializeApp } from "firebase/app";
import { getAuth, signInWithEmailAndPassword } from "firebase/auth";

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

async function checkAuth() {
    try {
        console.log("Checking credentials: superadmin@gmail.com / system@789");
        await signInWithEmailAndPassword(auth, 'superadmin@gmail.com', 'system@789');
        console.log("AUTH SUCCESSFUL");
    } catch (e) {
        console.log("AUTH FAILED:", e.code, e.message);
    }
    process.exit(0);
}

checkAuth();
