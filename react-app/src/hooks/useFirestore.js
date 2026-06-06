import { useState, useEffect, useCallback } from 'react';
import { db } from '../firebaseConfig';
import {
    collection,
    collectionGroup,
    onSnapshot,
    addDoc,
    deleteDoc,
    doc,
    updateDoc,
    query,
    where,
    limit as firestoreLimit,
    orderBy as firestoreOrderBy,
    startAfter,
    getDocs
} from 'firebase/firestore';

export function useFirestore(collectionName, options = {}) {
    const [docs, setDocs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [loadingMore, setLoadingMore] = useState(false);
    const [error, setError] = useState(null);
    const [lastDoc, setLastDoc] = useState(null);
    const [hasMore, setHasMore] = useState(true);

    const { limit: queryLimit, orderBy: queryOrderBy } = options;

    const tenantCollections = ['credit_notes', 'salesOrders', 'expenses', 'products', 'customers', 'branches'];

    const buildQuery = useCallback((isLoadMore = false) => {
        const currentCompanyId = sessionStorage.getItem('fb_user_company_id');
        const role = sessionStorage.getItem('fb_user_role');
        const ownerId = sessionStorage.getItem('fb_user_owner_id') || sessionStorage.getItem('fb_user_uid');
        
        // Use the common path generator for consistency
        const path = getFinalPath();

        let constraints = [];
        const colRef = collection(db, path);

        // Add index optimization constraints if companyId is available
        // Scoped to specific currentCompanyId for multi-tenancy
        // ONLY apply branch-level filtering to collections that require it (e.g., Inventory)
        if (currentCompanyId && role !== 'superadmin' && tenantCollections.includes(collectionName)) {
             constraints.push(where('companyId', '==', currentCompanyId));
        }

        // Root Users collection MUST be filtered by ownerId for non-superadmins
        // to comply with Firestore security rules and prevent "Permission Denied" errors.
        if (collectionName === 'users' && role !== 'superadmin' && ownerId) {
            constraints.push(where('ownerId', '==', ownerId));
        }

        if (queryOrderBy) {
            constraints.push(firestoreOrderBy(...queryOrderBy));
        }

        if (queryLimit) {
            constraints.push(firestoreLimit(queryLimit));
        }

        if (isLoadMore && lastDoc) {
            constraints.push(startAfter(lastDoc));
        }

        return query(colRef, ...constraints);
    }, [collectionName, queryLimit, queryOrderBy, lastDoc]);

    useEffect(() => {
        setLoading(true);
        setError(null);

        // If no limit is provided, keep the original real-time onSnapshot behavior
        if (!queryLimit) {
            const q = buildQuery();
            const unsubscribe = onSnapshot(q, (snapshot) => {
                const documents = [];
                snapshot.forEach((doc) => {
                    documents.push({ id: doc.id, ...doc.data({ serverTimestamps: 'estimate' }) });
                });
                setDocs(documents);
                setLoading(false);
                setHasMore(false);
            }, (err) => {
                console.error(err);
                setError(err.message);
                setLoading(false);
            });

            return () => unsubscribe();
        }

        // For paginated lists, we use getDocs to manage the cursor manually
        const fetchFirstBatch = async () => {
            try {
                const q = buildQuery();
                const snapshot = await getDocs(q);
                
                const documents = [];
                snapshot.forEach((doc) => {
                    documents.push({ id: doc.id, ...doc.data({ serverTimestamps: 'estimate' }) });
                });

                setDocs(documents);
                setLastDoc(snapshot.docs[snapshot.docs.length - 1]);
                setHasMore(snapshot.docs.length === queryLimit);
                setLoading(false);
            } catch (err) {
                console.error(err);
                setError(err.message);
                setLoading(false);
            }
        };

        fetchFirstBatch();
    }, [collectionName, queryLimit, JSON.stringify(queryOrderBy)]); // Re-run on collection or query config change

    const loadMore = async () => {
        if (loadingMore || !hasMore || !lastDoc) return;

        setLoadingMore(true);
        try {
            const q = buildQuery(true);
            const snapshot = await getDocs(q);
            
            const documents = [];
            snapshot.forEach((doc) => {
                documents.push({ id: doc.id, ...doc.data({ serverTimestamps: 'estimate' }) });
            });

            if (documents.length > 0) {
                setDocs(prev => [...prev, ...documents]);
                setLastDoc(snapshot.docs[snapshot.docs.length - 1]);
                setHasMore(snapshot.docs.length === queryLimit);
            } else {
                setHasMore(false);
            }
        } catch (err) {
            console.error(err);
            setError(err.message);
        } finally {
            setLoadingMore(false);
        }
    };

    const getFinalPath = () => {
        // Retrieve ownerId from shared state or sessionStorage
        // This is the root tenant ID for the currently logged-in business context
        const ownerId = sessionStorage.getItem('fb_user_owner_id') || sessionStorage.getItem('fb_user_uid');
        
        // System-wide collections that are NOT tenant-specific
        const systemCollections = ['registration_requests', 'users', 'owners'];
        
        if (systemCollections.includes(collectionName)) {
            return collectionName;
        }

        if (ownerId) {
            // Strict Multi-Tenant Pattern: owners/{ownerId}/{subcollection}
            return `owners/${ownerId}/${collectionName}`;
        }
        
        return collectionName;
    };

    const addDocument = async (docData) => {
        try {
            const currentCompanyId = sessionStorage.getItem('fb_user_company_id');
            const path = getFinalPath();
            
            const payload = {
                ...docData,
                createdAt: docData.createdAt || new Date().toISOString(),
                companyId: docData.companyId || currentCompanyId
            };

            if (docData.id) {
                const { setDoc } = await import('firebase/firestore');
                const docRef = doc(db, path, docData.id);
                await setDoc(docRef, payload);
                return docData.id;
            } else {
                const docRef = await addDoc(collection(db, path), payload);
                return docRef.id;
            }
        } catch (err) {
            console.error("Error adding document: ", err);
            throw err;
        }
    };

    const updateDocument = async (id, docData) => {
        try {
            const path = getFinalPath();
            const docRef = doc(db, path, id);
            await updateDoc(docRef, docData);
        } catch (err) {
            console.error("Error updating document: ", err);
            throw err;
        }
    };

    const deleteDocument = async (id) => {
        try {
            const path = getFinalPath();
            const docRef = doc(db, path, id);
            await deleteDoc(docRef);
        } catch (err) {
            console.error("Error deleting document: ", err);
            throw err;
        }
    };

    return { docs, loading, loadingMore, hasMore, error, loadMore, addDocument, updateDocument, deleteDocument };
}
