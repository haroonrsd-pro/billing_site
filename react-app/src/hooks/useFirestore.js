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

    const tenantCollections = ['credit_notes', 'salesOrders', 'expenses', 'products', 'customers', 'branches', 'categories'];

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
        let unsubscribe = null;
        let active = true;

        // If no limit is provided, keep the original real-time onSnapshot behavior
        if (!queryLimit) {
            const q = buildQuery();
            unsubscribe = onSnapshot(q, (snapshot) => {
                if (!active) return;
                const documents = [];
                snapshot.forEach((doc) => {
                    documents.push({ id: doc.id, ...doc.data({ serverTimestamps: 'estimate' }) });
                });
                setDocs(documents);
                setLoading(false);
                setHasMore(false);
            }, async (err) => {
                if (!active) return;
                // Client-side fallback for missing index
                if (err.code === 'failed-precondition' || err.message.includes('index')) {
                    console.warn(`[useFirestore] Falling back to client-side filtering for collection "${collectionName}" due to missing index.`);
                    try {
                        const path = getFinalPath();
                        const fallbackRef = collection(db, path);
                        
                        const unsubFallback = onSnapshot(fallbackRef, (snapshot) => {
                            if (!active) return;
                            let documents = [];
                            snapshot.forEach((doc) => {
                                documents.push({ id: doc.id, ...doc.data({ serverTimestamps: 'estimate' }) });
                            });
                            
                            // 1. Filter manually
                            const currentCompanyId = sessionStorage.getItem('fb_user_company_id');
                            const role = sessionStorage.getItem('fb_user_role');
                            const ownerId = sessionStorage.getItem('fb_user_owner_id') || sessionStorage.getItem('fb_user_uid');
                            
                            if (currentCompanyId && role !== 'superadmin' && tenantCollections.includes(collectionName)) {
                                documents = documents.filter(d => d.companyId === currentCompanyId);
                            }
                            
                            if (collectionName === 'users' && role !== 'superadmin' && ownerId) {
                                documents = documents.filter(d => d.ownerId === ownerId);
                            }
                            
                            // 2. Sort manually
                            if (queryOrderBy) {
                                const [field, order] = queryOrderBy;
                                documents.sort((a, b) => {
                                    const valA = a[field] || '';
                                    const valB = b[field] || '';
                                    return order === 'desc'
                                        ? (valB > valA ? 1 : -1)
                                        : (valA > valB ? 1 : -1);
                                });
                            }
                            
                            setDocs(documents);
                            setLoading(false);
                            setHasMore(false);
                        }, (fallbackErr) => {
                            if (!active) return;
                            console.error("Fallback onSnapshot failed:", fallbackErr);
                            setError(fallbackErr.message);
                            setLoading(false);
                        });
                        
                        unsubscribe = unsubFallback;
                    } catch (fallbackErr) {
                        console.error("Error setting up fallback onSnapshot:", fallbackErr);
                        setError(err.message);
                        setLoading(false);
                    }
                } else {
                    console.error(err);
                    setError(err.message);
                    setLoading(false);
                }
            });

            return () => {
                active = false;
                if (unsubscribe) unsubscribe();
            };
        }

        // For paginated lists, we use getDocs to manage the cursor manually
        const fetchFirstBatch = async () => {
            try {
                const q = buildQuery();
                const snapshot = await getDocs(q);
                if (!active) return;
                
                const documents = [];
                snapshot.forEach((doc) => {
                    documents.push({ id: doc.id, ...doc.data({ serverTimestamps: 'estimate' }) });
                });

                setDocs(documents);
                setLastDoc(snapshot.docs[snapshot.docs.length - 1]);
                setHasMore(snapshot.docs.length === queryLimit);
                setLoading(false);
            } catch (err) {
                if (!active) return;
                // Client-side fallback for missing index
                if (err.code === 'failed-precondition' || err.message.includes('index')) {
                    console.warn(`[useFirestore] Falling back to client-side filtering for paginated collection "${collectionName}" due to missing index.`);
                    try {
                        const path = getFinalPath();
                        const fallbackRef = collection(db, path);
                        const snapshot = await getDocs(fallbackRef);
                        if (!active) return;
                        
                        let documents = [];
                        snapshot.forEach((doc) => {
                            documents.push({ id: doc.id, ...doc.data({ serverTimestamps: 'estimate' }) });
                        });
                        
                        // 1. Filter manually
                        const currentCompanyId = sessionStorage.getItem('fb_user_company_id');
                        const role = sessionStorage.getItem('fb_user_role');
                        const ownerId = sessionStorage.getItem('fb_user_owner_id') || sessionStorage.getItem('fb_user_uid');
                        
                        if (currentCompanyId && role !== 'superadmin' && tenantCollections.includes(collectionName)) {
                            documents = documents.filter(d => d.companyId === currentCompanyId);
                        }
                        
                        if (collectionName === 'users' && role !== 'superadmin' && ownerId) {
                            documents = documents.filter(d => d.ownerId === ownerId);
                        }
                        
                        // 2. Sort manually
                        if (queryOrderBy) {
                            const [field, order] = queryOrderBy;
                            documents.sort((a, b) => {
                                const valA = a[field] || '';
                                const valB = b[field] || '';
                                return order === 'desc'
                                    ? (valB > valA ? 1 : -1)
                                    : (valA > valB ? 1 : -1);
                            });
                        }
                        
                        // 3. Paginate manually
                        const paginatedDocs = queryLimit ? documents.slice(0, queryLimit) : documents;
                        
                        setDocs(paginatedDocs);
                        setLastDoc(null); // Pagination disabled in fallback mode
                        setHasMore(false);
                        setLoading(false);
                    } catch (fallbackErr) {
                        console.error(fallbackErr);
                        setError(err.message);
                        setLoading(false);
                    }
                } else {
                    console.error(err);
                    setError(err.message);
                    setLoading(false);
                }
            }
        };

        fetchFirstBatch();
        return () => {
            active = false;
        };
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
