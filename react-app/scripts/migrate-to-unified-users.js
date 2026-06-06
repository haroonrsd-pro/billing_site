import { initializeApp } from "firebase/app";
import { getAuth, signInWithEmailAndPassword } from "firebase/auth";
import { 
    getFirestore, 
    collection, 
    getDocs, 
    doc, 
    setDoc, 
    deleteDoc, 
    serverTimestamp 
} from "firebase/firestore";

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

const ADMIN_EMAIL = 'superadmin@gmail.com';
const ADMIN_PASS = 'system@789';

async function migrate() {
    console.log("Authenticating as Super Admin...");
    try {
        await signInWithEmailAndPassword(auth, ADMIN_EMAIL, ADMIN_PASS);
        console.log("Authentication successful.");

        console.log("Starting Migration: owners -> users");
        const ownersRef = collection(db, 'owners');
        const querySnapshot = await getDocs(ownersRef);
        
        console.log(`Found ${querySnapshot.size} total owners.`);

        for (const ownerDoc of querySnapshot.docs) {
            const data = ownerDoc.data();
            const ownerId = ownerDoc.id;

            console.log(`Migrating owner: ${ownerId} (${data.name || 'No Name'})`);

            // Map data to the new unified structure
            const userData = {
                name: data.name || '',
                email: data.email || '',
                role: 'owner', // explicitly set role to owner
                approved: data.status === 'approved', // unified status flag
                createdAt: data.createdAt || serverTimestamp(),
                updatedAt: serverTimestamp(),
                // Keep any other relevant business profile data if necessary
                businessName: data.businessName || data.name || '',
                phoneNumber: data.phoneNumber || ''
            };

            // 1. Create/Update the user document
            await setDoc(doc(db, 'users', ownerId), userData, { merge: true });
            console.log(`  - Created user doc for ${ownerId}`);

            // 2. Delete the legacy root owner document (preserving subcollections)
            await deleteDoc(doc(db, 'owners', ownerId));
            console.log(`  - Deleted root owner doc ${ownerId}`);
        }

        console.log("Migration completed successfully!");
        process.exit(0);
    } catch (error) {
        console.error("Migration failed:", error);
        process.exit(1);
    }
}

migrate();
