import { initializeApp } from "firebase/app";
import { getFirestore, doc, setDoc } from "firebase/firestore";

const firebaseConfig = {
    apiKey: "AIzaSyBclxMutggsRJ6BrG1214fnlhKHrtMI1uM",
    authDomain: "billing-software-8234d.firebaseapp.com",
    projectId: "billing-software-8234d",
    storageBucket: "billing-software-8234d.firebasestorage.app",
    messagingSenderId: "661399359115",
    appId: "1:661399359115:web:3f5bf026e00abdf49f4e8e"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function seed() {
    console.log("Seeding superadmin user with new password...");
    try {
        await setDoc(doc(db, 'users', 'super-admin-0'), {
            name: 'Master Control',
            email: 'superadmin@gmail.com',
            password: 'system@789',
            role: 'super_admin',
            status: 'active',
            station: 'Global HQ',
            createdAt: new Date().toISOString()
        });
        console.log("Success! Superadmin Firestore document updated.");
        process.exit(0);
    } catch (error) {
        console.error("Error seeding database:", error);
        process.exit(1);
    }
}

seed();
