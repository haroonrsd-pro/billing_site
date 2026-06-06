import { initializeApp } from "firebase/app";
import { getAuth, signInWithEmailAndPassword } from "firebase/auth";
import { getFirestore, collection, query, where, getDocs } from "firebase/firestore";

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

async function check() {
    try {
        console.log("Signing in as Super Admin...");
        await signInWithEmailAndPassword(auth, 'superadmin@gmail.com', 'system@789');
        
        console.log("Searching for registration request for sathiya10@gmail.com...");
        const regQ = query(collection(db, 'registration_requests'), where('email', '==', 'sathiya10@gmail.com'));
        const regSnapshot = await getDocs(regQ);
        
        if (regSnapshot.empty) {
            console.log("No registration request found for sathiya10@gmail.com");
        } else {
            console.log("Registration request found:");
            regSnapshot.forEach(doc => console.log(JSON.stringify(doc.data(), null, 2)));
        }

        console.log("\nSearching for user document for sathiya10@gmail.com...");
        const userQ = query(collection(db, 'users'), where('email', '==', 'sathiya10@gmail.com'));
        const userSnapshot = await getDocs(userQ);

        if (userSnapshot.empty) {
            console.log("No user document found for sathiya10@gmail.com");
        } else {
            console.log("User document found:");
            userSnapshot.forEach(doc => console.log(JSON.stringify(doc.data(), null, 2)));
        }

    } catch (error) {
        console.error("Check Failed:", error.message);
    }
    process.exit(0);
}

check();
