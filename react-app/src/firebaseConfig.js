import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore"; // Using simple getFirestore for maximum compatibility
import { getStorage } from "firebase/storage";

export const firebaseConfig = {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
    storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
    appId: import.meta.env.VITE_FIREBASE_APP_ID,
    measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const storage = getStorage(app);

// Simple Firestore instance - avoid complex tab manager imports that crash during boot
export const db = getFirestore(app);

// Secondary Auth instance for provisioning background users
const provisioningApp = initializeApp(firebaseConfig, "PROVISIONING");
export const provisioningAuth = getAuth(provisioningApp);

/**
 * Utility to generate multi-tenant Firestore paths.
 * Standardizes access to owners/{ownerId}/{subcollection}
 */
export const getTenantPath = (collectionName) => {
    const ownerId = sessionStorage.getItem('fb_user_owner_id') || sessionStorage.getItem('fb_user_uid');
    
    // System collections that are NOT tenant-specific
    const systemCollections = ['registration_requests', 'users', 'owners'];
    
    if (systemCollections.includes(collectionName)) {
        return collectionName;
    }

    if (!ownerId) {
        console.warn(`[getTenantPath] Accessing ${collectionName} without an active ownerId context.`);
        return collectionName;
    }

    return `owners/${ownerId}/${collectionName}`;
};

export default app;
