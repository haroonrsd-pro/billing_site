import { initializeApp, deleteApp } from "firebase/app";
import { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut } from "firebase/auth";
import { getFirestore, doc, setDoc, deleteDoc, serverTimestamp } from "firebase/firestore";

const firebaseConfig = {
    apiKey: "AIzaSyBclxMutggsRJ6BrG1214fnlhKHrtMI1uM",
    authDomain: "billing-software-8234d.firebaseapp.com",
    projectId: "billing-software-8234d",
    storageBucket: "billing-software-8234d.firebasestorage.app",
    messagingSenderId: "661399359115",
    appId: "1:661399359115:web:3f5bf026e00abdf49f4e8e"
};

// Main App instance for Super Admin operations
const mainApp = initializeApp(firebaseConfig);
const mainAuth = getAuth(mainApp);
const mainDb = getFirestore(mainApp);

async function repair() {
    try {
        console.log("Signing in as Super Admin...");
        await signInWithEmailAndPassword(mainAuth, 'superadmin@gmail.com', 'system@789');
        console.log("Super Admin Auth Success.");

        console.log("Starting repair for sathiya10@gmail.com...");

        // 1. Delete the incorrect dummy document (using Super Admin session)
        console.log("Checking for dummy document owner_s51uid4ta...");
        await deleteDoc(doc(mainDb, 'users', 'owner_s51uid4ta'));
        console.log("Dummy document deleted (if existed).");

        // 2. Initialize secondary app to create and manage the target user's Auth session
        // This prevents the main app's Super Admin session from being logged out.
        console.log("Initializing secondary app for target user provisioning...");
        const secondaryApp = initializeApp(firebaseConfig, "Secondary");
        const secondaryAuth = getAuth(secondaryApp);

        let realUid;
        try {
            console.log("Creating Auth account for sathiya10@gmail.com...");
            const userCred = await createUserWithEmailAndPassword(secondaryAuth, 'sathiya10@gmail.com', 'sathiya@10');
            realUid = userCred.user.uid;
            console.log("New Auth Account Created. REAL UID:", realUid);
        } catch (authError) {
            if (authError.code === 'auth/email-already-in-use') {
                console.log("User already in Auth. Signing in on secondary session to get UID...");
                const userCred = await signInWithEmailAndPassword(secondaryAuth, 'sathiya10@gmail.com', 'sathiya@10');
                realUid = userCred.user.uid;
                console.log("Existing REAL UID Found:", realUid);
            } else {
                throw authError;
            }
        }

        // 3. Create correctly indexed Firestore document (using Super Admin session)
        console.log("Creating correctly indexed Firestore document at users/" + realUid);
        await setDoc(doc(mainDb, 'users', realUid), {
            uid: realUid,
            name: "sathiya",
            email: "sathiya10@gmail.com",
            phone: "956625863",
            password: "sathiya@10",
            role: "owner",
            companyId: "comp_a3q861equ",
            status: "active",
            isApproved: true,
            createdAt: serverTimestamp()
        });

        // 4. Cleanup
        await deleteApp(secondaryApp);
        console.log("\n>>> REPAIR SUCCESSFUL! sathiya10@gmail.com can now log in.");
    } catch (error) {
        console.error("Repair Failed:", error.message);
    }
    process.exit(0);
}

repair();
