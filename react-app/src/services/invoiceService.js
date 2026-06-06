import { db } from '../firebaseConfig';
import { 
    collection, 
    query, 
    where, 
    orderBy, 
    limit, 
    startAfter, 
    getDocs,
    doc,
    deleteDoc,
    updateDoc,
    getDoc,
    collectionGroup,
    writeBatch
} from 'firebase/firestore';

// Standardized path: owners/{ownerId}/invoices
const getInvoicesPath = (ownerId) => `owners/${ownerId}/invoices`;

/**
 * Invoice Service
 * Handles all Firestore operations for the invoices collection with multi-tenant isolation.
 * Optimized for companies/{companyId}/invoices structure.
 */
export const invoiceService = {
    /**
     * Fetch paginated invoices with server-side filtering.
     * @param {Object} filters - Filter criteria (status, branch_id, type, filterDate, etc)
     * @param {Object} options - Pagination and sorting options
     */
    async getInvoices(filters = {}, options = {}) {
        const { 
            companyId, 
            status, 
            branch_id, 
            branchId, // For compatibility
            type, 
            filterDate,
            startDate,
            endDate,
            lastDoc 
        } = filters;

        // Standardize on snake_case branch_id as requested for the index
        const actualBranchId = branch_id || branchId;
        
        const { 
            pageSize = 30, 
            sortField = options.sortField || 'date', 
            sortOrder = options.sortOrder || 'desc' 
        } = options;

        const currentOwnerId = sessionStorage.getItem('fb_user_owner_id') || companyId;
        if (!currentOwnerId) throw new Error("Missing ownerId/companyId for invoice query.");

        // New structure: always scoped to the owner's subcollection
        const baseRef = collection(db, getInvoicesPath(currentOwnerId));
        let constraints = [baseRef];

        // Branch filtering (now a field filter, not a path component)
        if (actualBranchId && actualBranchId !== 'All') {
            constraints.push(where('branch_id', '==', actualBranchId));
        }

        // Date selection / Range filtering
        if (filterDate) {
            constraints.push(where('date', '==', filterDate));
        } else {
            if (startDate) constraints.push(where('date', '>=', startDate));
            if (endDate) constraints.push(where('date', '<=', endDate));
        }

        // Feature-specific filters
        if (status && status !== 'All') constraints.push(where('status', '==', status));
        if (type && type !== 'All') constraints.push(where('type', '==', type));
        if (filters.invoiceId) constraints.push(where('id', '==', filters.invoiceId));

        // Sorting & Pagination (Always orderBy date DESC to match index)
        constraints.push(orderBy(sortField, sortOrder));
        constraints.push(limit(pageSize));
        if (lastDoc) constraints.push(startAfter(lastDoc));

        try {
            const q = query(...constraints);
            const snapshot = await getDocs(q);
            
            const docs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            const lastVisible = snapshot.docs.length > 0 ? snapshot.docs[snapshot.docs.length - 1] : null;

            return {
                docs,
                lastDoc: lastVisible,
                hasMore: docs.length === pageSize,
                isOptimized: true
            };
        } catch (error) {
            console.error("Firestore Invoice Fetch Error:", error);

            // ── SMART FALLBACK FOR MISSING INDEX ──────────────────────
            // If index is missing, we fetch all documents and filter/sort in memory.
            // This prevents the 'Optimization Required' crash while the index is being built.
            if (error.code === 'failed-precondition' || error.message.includes('index')) {
                console.warn("[invoiceService] Using client-side fallback due to missing index.");
                
                // Fetch using a minimal query (just the owner/company context)
                const fallbackSnapshot = await getDocs(baseRef);
                let allDocs = fallbackSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

                // 1. Filter manually
                if (actualBranchId && actualBranchId !== 'All') allDocs = allDocs.filter(d => d.branch_id === actualBranchId);
                if (status && status !== 'All') allDocs = allDocs.filter(d => d.status === status);
                if (type && type !== 'All') allDocs = allDocs.filter(d => d.type === type);
                if (filterDate) allDocs = allDocs.filter(d => d.date === filterDate);
                else {
                    if (startDate) allDocs = allDocs.filter(d => d.date >= startDate);
                    if (endDate) allDocs = allDocs.filter(d => d.date <= endDate);
                }

                // 2. Sort manually
                allDocs.sort((a, b) => {
                    const valA = a[sortField] || '';
                    const valB = b[sortField] || '';
                    return sortOrder === 'desc' 
                        ? (valB > valA ? 1 : -1) 
                        : (valA > valB ? 1 : -1);
                });

                // 3. Paginate manually
                const paginatedDocs = allDocs.slice(0, pageSize);

                return {
                    docs: paginatedDocs,
                    lastDoc: null, // Pagination disabled in fallback mode for simplicity
                    hasMore: false,
                    isOptimized: false,
                    indexLink: error.message.match(/https?:\/\/[^\s]+/)?.[0] || null
                };
            }
            
            throw error;
        }
    },

    /**
     * Deletes a single invoice.
     */
    async deleteInvoice(ownerId, id) {
        const currentOwnerId = ownerId || sessionStorage.getItem('fb_user_owner_id');
        if (!currentOwnerId) throw new Error("Missing ownerId for deletion.");
        const docRef = doc(db, getInvoicesPath(currentOwnerId), id);
        return await deleteDoc(docRef);
    },

    /**
     * Performs bulk deletion of invoices.
     */
    async bulkDelete(ownerId, ids) {
        const currentOwnerId = ownerId || sessionStorage.getItem('fb_user_owner_id');
        if (!currentOwnerId) throw new Error("Missing ownerId for bulk deletion.");
        const batch = writeBatch(db);
        ids.forEach(id => {
            const docRef = doc(db, getInvoicesPath(currentOwnerId), id);
            batch.delete(docRef);
        });
        return await batch.commit();
    },

    /**
     * Updates an invoice's status or details.
     */
    async updateInvoice(ownerId, id, data) {
        const currentOwnerId = ownerId || sessionStorage.getItem('fb_user_owner_id');
        if (!currentOwnerId) throw new Error("Missing ownerId for update.");
        const docRef = doc(db, getInvoicesPath(currentOwnerId), id);
        return await updateDoc(docRef, data);
    }
};
