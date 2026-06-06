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

async function getUid() {
    try {
        console.log("Attempting to sign in as sathiya10@gmail.com...");
        const userCred = await signInWithEmailAndPassword(auth, 'sathiya10@gmail.com', 'sathiya@10');
        console.log("SUCCESS! Actual Auth UID:", userCred.user.uid);
    } catch (error) {
        console.error("Auth Failed:", error.message);
    }
    process.exit(0);
}

getUid();
