import { initializeApp } from "firebase/app";
import { getAuth, createUserWithEmailAndPassword } from "firebase/auth";

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

async function createAuthUser() {
    console.log("Creating superadmin user in Firebase Authentication...");
    try {
        await createUserWithEmailAndPassword(auth, 'superadmin@gmail.com', 'system@789');
        console.log("Success! Superadmin developer account created in Firebase Auth.");
        process.exit(0);
    } catch (error) {
        if (error.code === 'auth/email-already-in-use') {
            console.log("User already exists in Firebase Auth.");
            process.exit(0);
        }
        console.error("Error creating Auth user:", error);
        process.exit(1);
    }
}

createAuthUser();
