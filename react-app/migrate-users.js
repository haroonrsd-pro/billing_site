/**
 * SaaS Migration Utility: Unified Users & Boolean Approval
 * 
 * Instructions: 
 * 1. Open your application in the browser.
 * 2. Open Developer Tools (F12) -> Console.
 * 3. Paste the following script and press Enter.
 */

(async () => {
    console.log("🚀 Starting Migration: owners -> users...");
    
    // Attempt to get db from window if available, or just use the SDK if imported
    // Since we are in the app context, we can usually find the db instance.
    // Otherwise, we might need to initialize it.
    
    const { getDocs, collection, doc, setDoc, deleteDoc, updateDoc, getFirestore } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js');
    const { getApp } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js');
    
    try {
        const app = getApp();
        const db = getFirestore(app);
        
        // 1. Migrate Owners
        const ownersSnap = await getDocs(collection(db, 'owners'));
        console.log(`Found ${ownersSnap.size} owners to migrate.`);
        
        for (const ownerDoc of ownersSnap.docs) {
            const data = ownerDoc.data();
            const uid = ownerDoc.id; // Document ID should be the UID
            
            const newUserDoc = {
                ...data,
                uid: uid,
                approved: data.status === 'approved' || data.approved === true,
            };
            delete newUserDoc.status; // Remove legacy field
            
            console.log(`Migrating Owner: ${data.email || uid} (Approved: ${newUserDoc.approved})`);
            await setDoc(doc(db, 'users', uid), newUserDoc);
            
            // Note: We don't delete from 'owners' yet for safety, 
            // but the app will now ignore the collection.
        }
        
        // 2. Update existing Users
        const usersSnap = await getDocs(collection(db, 'users'));
        console.log(`Checking ${usersSnap.size} existing users for field updates...`);
        
        for (const userDoc of usersSnap.docs) {
            const data = userDoc.data();
            if (data.status) {
                console.log(`Updating User: ${data.email || userDoc.id}`);
                await updateDoc(doc(db, 'users', userDoc.id), {
                    approved: data.status === 'approved' || data.role === 'superadmin' || data.approved === true,
                    // status: delete // Not supported directly in updateDoc without FieldValue
                });
            } else if (data.role === 'superadmin') {
                await updateDoc(doc(db, 'users', userDoc.id), { approved: true });
            }
        }
        
        console.log("✅ Migration Successful!");
    } catch (err) {
        console.error("❌ Migration Failed:", err);
    }
})();
