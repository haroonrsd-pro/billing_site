import { initializeApp } from "firebase/app";
import { getAuth, signInWithEmailAndPassword } from "firebase/auth";
import { getFirestore, collection, getDocs, doc, updateDoc } from "firebase/firestore";

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

async function synchronize() {
    console.log("--- Starting User Synchronization Protocol ---");
    try {
        // 1. Sign in as Super Admin to get permissions (if rules require it)
        console.log("Authenticating Super Admin...");
        await signInWithEmailAndPassword(auth, 'superadmin@gmail.com', 'system@789');
        console.log("Auth Success.");

        // 2. Fetch all users
        console.log("Fetching user directory...");
        const usersRef = collection(db, 'users');
        const snapshot = await getDocs(usersRef);
        
        console.log(`Found ${snapshot.size} users. Analyzing approval states...`);
        
        let updateCount = 0;
        const promises = snapshot.docs.map(async (userDoc) => {
            const data = userDoc.data();
            const userId = userDoc.id;
            
            // Logic: If they are active/approved/superadmin, ensure isApproved is true
            const shouldBeApproved = 
                data.role === 'superadmin' || 
                data.status === 'active' || 
                data.status === 'approved' || 
                data.approved === true;
            
            if (shouldBeApproved && data.isApproved !== true) {
                console.log(`[FIX] User ${data.email || userId}: Missing isApproved flag. Synchronizing...`);
                await updateDoc(doc(db, 'users', userId), {
                    isApproved: true,
                    syncAt: new Date().toISOString()
                });
                updateCount++;
            }
        });

        await Promise.all(promises);
        console.log(`\n>>> SYNC COMPLETE. Updated ${updateCount} users.`);
        
    } catch (error) {
        console.error("Synchronization Failed:", error.message);
    }
    process.exit(0);
}

synchronize();
