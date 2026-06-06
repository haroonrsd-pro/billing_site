import React, { useState, useEffect } from 'react';
import { db, getTenantPath } from '../../firebaseConfig';
import { 
    collection, 
    writeBatch,
    query, 
    where,
    orderBy,
    getDocs,
    doc
} from 'firebase/firestore';
import { 
    ChevronDown,
    ChevronRight,
    Download,
    Trash2,
    ToggleLeft,
    ToggleRight,
    Copy,
    Tag,
    Clock
} from 'lucide-react';
import toast from 'react-hot-toast';
import { exportToCSV } from '../../utils/exportCSV';

export default function BulkCouponList() {
    const [batches, setBatches] = useState({});
    const [loading, setLoading] = useState(true);
    const [expandedBatches, setExpandedBatches] = useState({});

    const userRole = sessionStorage.getItem('fb_user_role');
    const currentUserUID = sessionStorage.getItem('fb_user_uid');
    const isOwnerOrAdmin = userRole === 'owner' || userRole === 'admin';

    useEffect(() => {
        if (isOwnerOrAdmin) {
            fetchBulkCoupons();
        }
    }, [isOwnerOrAdmin]);

    const fetchBulkCoupons = async () => {
        setLoading(true);
        try {
            const q = query(
                collection(db, getTenantPath('coupons')), 
                where('isBulk', '==', true)
            );
            const snapshot = await getDocs(q);
            
            let docs = snapshot.docs.map(d => ({
                id: d.id,
                ...d.data(),
                expiryDate: d.data().expiryDate?.toDate(),
                startDate: d.data().startDate?.toDate()
            }));

            // Filter by assignment if current user is an admin (Owners see all)
            if (userRole !== 'owner') {
                docs = docs.filter(doc => !doc.assignedToAdminUID || doc.assignedToAdminUID === currentUserUID);
            }

            // Sort locally by descending createdAt to bypass composite index requirement
            docs.sort((a, b) => {
                const timeA = a.createdAt?.toMillis ? a.createdAt.toMillis() : 0;
                const timeB = b.createdAt?.toMillis ? b.createdAt.toMillis() : 0;
                return timeB - timeA;
            });

            const grouped = {};
            docs.forEach(doc => {
                const batchId = doc.batchId || 'Uncategorized';
                if (!grouped[batchId]) {
                    grouped[batchId] = {
                        batchId,
                        codes: [],
                        total: 0,
                        used: 0,
                        remaining: 0,
                        prefix: '',
                        discountType: doc.discountType,
                        discountValue: doc.discountValue,
                        expiryDate: doc.expiryDate,
                        allActive: true
                    };
                }
                grouped[batchId].codes.push(doc);
                grouped[batchId].total++;
                if (doc.usedCount >= 1) grouped[batchId].used++;
                else grouped[batchId].remaining++;
                
                if (!doc.isActive) grouped[batchId].allActive = false;
                
                if (!grouped[batchId].prefix) {
                    const match = doc.code.match(/^[A-Z]+/);
                    grouped[batchId].prefix = match ? match[0] : 'MIXED';
                }
            });

            setBatches(grouped);
        } catch (error) {
            console.error("Fetch Bulk Coupons Error:", error);
            toast.error("Failed to fetch bulk coupons");
        } finally {
            setLoading(false);
        }
    };

    const toggleBatchExpand = (batchId) => {
        setExpandedBatches(prev => ({ ...prev, [batchId]: !prev[batchId] }));
    };

    const handleBatchToggleActive = async (batchId, currentStatus) => {
        if (!window.confirm(`Turn ${currentStatus ? 'Off' : 'On'} all codes in this batch?`)) return;
        
        try {
            const batchObj = batches[batchId];
            let batch = writeBatch(db);
            const couponsCol = collection(db, getTenantPath('coupons'));
            let ops = 0;

            for (const code of batchObj.codes) {
                batch.update(doc(couponsCol, code.id), { isActive: !currentStatus });
                ops++;
                if (ops === 500) {
                    await batch.commit();
                    batch = writeBatch(db);
                    ops = 0;
                }
            }
            if (ops > 0) await batch.commit();
            
            toast.success(`Batch ${!currentStatus ? 'activated' : 'deactivated'}!`);
            fetchBulkCoupons();
        } catch (err) {
            console.error("Batch update failed:", err);
            toast.error("Failed to update batch");
        }
    };

    const handleBatchDelete = async (batchId) => {
        if (!window.confirm("WARNING: This will permanently block and delete all coupons in this batch. Continue?")) return;
        
        try {
            const batchObj = batches[batchId];
            let batch = writeBatch(db);
            const couponsCol = collection(db, getTenantPath('coupons'));
            let ops = 0;

            for (const code of batchObj.codes) {
                batch.delete(doc(couponsCol, code.id));
                ops++;
                if (ops === 500) {
                    await batch.commit();
                    batch = writeBatch(db);
                    ops = 0;
                }
            }
            if (ops > 0) await batch.commit();
            
            toast.success("Batch deleted successfully!");
            fetchBulkCoupons();
        } catch (err) {
            console.error("Batch delete failed:", err);
            toast.error("Failed to delete batch");
        }
    };

    const handleExportCSV = (batchId) => {
        const batchObj = batches[batchId];
        const rows = batchObj.codes.map(c => {
            const statusLabel = c.usedCount >= 1 ? 'Used' : 
                                (new Date() > c.expiryDate ? 'Expired' : 
                                (c.isActive ? 'Active' : 'Inactive'));
            
            return {
                Code: c.code,
                DiscountType: c.discountType,
                DiscountValue: c.discountValue,
                MinOrderValue: c.minOrderValue,
                ExpiryDate: c.expiryDate ? c.expiryDate.toISOString().split('T')[0] : '',
                Status: statusLabel
            };
        });
        
        exportToCSV(rows, `BulkCoupons_${batchId}.csv`);
        toast.success("CSV Exported successfully!");
    };

    const toggleCodeActive = async (codeDoc) => {
        try {
            let batch = writeBatch(db);
            batch.update(doc(collection(db, getTenantPath('coupons')), codeDoc.id), { isActive: !codeDoc.isActive });
            await batch.commit();
            toast.success(`${codeDoc.code} ${!codeDoc.isActive ? 'activated' : 'deactivated'}`);
            fetchBulkCoupons();
        } catch (err) {
            toast.error("Update failed");
        }
    };

    const copyToClipboard = (text) => {
        navigator.clipboard.writeText(text);
        toast.success("Code copied!");
    };

    if (!isOwnerOrAdmin) return null;

    if (loading) {
        return <div style={{ padding: '2rem', textAlign: 'center', color: '#64748b', fontWeight: 600 }}>Loading massive batches...</div>;
    }

    const batchEntries = Object.values(batches);

    if (batchEntries.length === 0) {
        return (
            <div style={{ background: 'white', padding: '3rem', borderRadius: '24px', border: '1px solid #e2e8f0', textAlign: 'center' }}>
                <Tag size={48} style={{ margin: '0 auto 1rem', color: '#cbd5e1' }} />
                <h3 style={{ fontSize: '1.25rem', fontWeight: 900, color: '#1e293b', margin: 0 }}>No Bulk Campaigns Found</h3>
                <p style={{ color: '#64748b', marginTop: '0.5rem' }}>Generate your first bulk coupon batch!</p>
            </div>
        );
    }

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {batchEntries.map((batch) => (
                <div key={batch.batchId} style={{ background: 'white', borderRadius: '24px', border: '1px solid #e2e8f0', overflow: 'hidden', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.02)' }}>
                    
                    {/* BATCH ROW HEADER */}
                    <div 
                        style={{ padding: '1.5rem', display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', cursor: 'pointer', background: expandedBatches[batch.batchId] ? '#f8fafc' : 'white', borderBottom: expandedBatches[batch.batchId] ? '1px solid #e2e8f0' : 'none', transition: '0.2s' }}
                        onClick={() => toggleBatchExpand(batch.batchId)}
                    >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                            <div style={{ color: '#94a3b8' }}>
                                {expandedBatches[batch.batchId] ? <ChevronDown size={24} /> : <ChevronRight size={24} />}
                            </div>
                            <div>
                                <h3 style={{ fontSize: '1.1rem', fontWeight: 900, color: '#1e293b', margin: '0 0 0.25rem 0', letterSpacing: '-0.02em' }}>{batch.batchId}</h3>
                                <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '0.75rem', fontSize: '0.75rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase' }}>
                                    <span style={{ background: '#eef2ff', padding: '2px 8px', borderRadius: '6px', color: '#6366f1' }}>PREFIX: {batch.prefix}</span>
                                    <span>{batch.discountType === 'percentage' ? `${batch.discountValue}% OFF` : `₹${batch.discountValue} FLAT`}</span>
                                    <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><Clock size={12}/> Exp: {batch.expiryDate ? batch.expiryDate.toISOString().split('T')[0] : 'N/A'}</span>
                                </div>
                            </div>
                        </div>

                        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '1.5rem' }}>
                            {/* Stats */}
                            <div style={{ display: 'flex', gap: '1rem', background: '#f1f5f9', padding: '0.5rem', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                                <div style={{ textAlign: 'center', padding: '0 0.5rem', borderRight: '1px solid #cbd5e1' }}>
                                    <div style={{ fontSize: '0.7rem', fontWeight: 800, color: '#94a3b8' }}>TOTAL</div>
                                    <div style={{ fontSize: '1rem', fontWeight: 900, color: '#475569' }}>{batch.total}</div>
                                </div>
                                <div style={{ textAlign: 'center', padding: '0 0.5rem', borderRight: '1px solid #cbd5e1' }}>
                                    <div style={{ fontSize: '0.7rem', fontWeight: 800, color: '#94a3b8' }}>USED</div>
                                    <div style={{ fontSize: '1rem', fontWeight: 900, color: '#10b981' }}>{batch.used}</div>
                                </div>
                                <div style={{ textAlign: 'center', padding: '0 0.5rem' }}>
                                    <div style={{ fontSize: '0.7rem', fontWeight: 800, color: '#94a3b8' }}>REMAIN</div>
                                    <div style={{ fontSize: '1rem', fontWeight: 900, color: '#6366f1' }}>{batch.remaining}</div>
                                </div>
                            </div>

                            {/* Batch Actions */}
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }} onClick={(e) => e.stopPropagation()}>
                                <button 
                                    onClick={() => handleBatchToggleActive(batch.batchId, batch.allActive)} 
                                    style={{ padding: '0.6rem 1rem', borderRadius: '10px', fontSize: '0.8rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', border: 'none', background: batch.allActive ? '#f1f5f9' : '#ecfdf5', color: batch.allActive ? '#64748b' : '#059669', transition: '0.2s' }} 
                                    title={batch.allActive ? "Deactivate All" : "Activate All"}
                                >
                                    {batch.allActive ? <ToggleRight size={20} color="#10b981" /> : <ToggleLeft size={20} />}
                                    TOGGLE
                                </button>
                                <button onClick={() => handleExportCSV(batch.batchId)} style={{ padding: '0.6rem', borderRadius: '10px', cursor: 'pointer', border: 'none', background: '#eef2ff', color: '#6366f1', display: 'flex', alignItems: 'center', justifyContent: 'center' }} title="Export CSV">
                                    <Download size={20} />
                                </button>
                                <button onClick={() => handleBatchDelete(batch.batchId)} style={{ padding: '0.6rem', borderRadius: '10px', cursor: 'pointer', border: 'none', background: '#fef2f2', color: '#ef4444', display: 'flex', alignItems: 'center', justifyContent: 'center' }} title="Delete Entire Batch">
                                    <Trash2 size={20} />
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* EXPANDED INDIVIDUAL CODES */}
                    {expandedBatches[batch.batchId] && (
                        <div style={{ background: '#f8fafc', padding: '1.5rem' }}>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '0.75rem' }}>
                                {batch.codes.map((c) => {
                                    const isUsed = c.usedCount >= 1;
                                    const isExpired = new Date() > c.expiryDate;
                                    
                                    let statusBg = "white";
                                    let statusBorder = "1px solid #e2e8f0";
                                    let statusDot = "#10b981";
                                    let statusText = "Active";

                                    if (isUsed) {
                                        statusBg = "#fffbeb";
                                        statusBorder = "1px solid #fde68a";
                                        statusDot = "#f59e0b";
                                        statusText = "Redeemed";
                                    } else if (isExpired) {
                                        statusBg = "#f1f5f9";
                                        statusBorder = "1px solid #cbd5e1";
                                        statusDot = "#64748b";
                                        statusText = "Expired";
                                    } else if (!c.isActive) {
                                        statusBg = "#fef2f2";
                                        statusBorder = "1px solid #fecaca";
                                        statusDot = "#ef4444";
                                        statusText = "Inactive";
                                    }

                                    return (
                                        <div key={c.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.75rem 1rem', borderRadius: '14px', background: statusBg, border: statusBorder, boxShadow: '0 2px 4px -1px rgba(0,0,0,0.02)' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', overflow: 'hidden' }}>
                                                <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: statusDot, flexShrink: 0 }} />
                                                <div style={{ overflow: 'hidden' }}>
                                                    <div style={{ fontWeight: 900, color: '#1e293b', fontSize: '0.9rem', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>{c.code}</div>
                                                    <div style={{ fontSize: '0.65rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase' }}>{statusText}</div>
                                                </div>
                                            </div>
                                            
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexShrink: 0 }}>
                                                <button 
                                                    onClick={() => toggleCodeActive(c)} 
                                                    disabled={isUsed || isExpired} 
                                                    style={{ padding: '0.4rem', border: 'none', background: 'transparent', cursor: (isUsed || isExpired) ? 'not-allowed' : 'pointer', opacity: (isUsed || isExpired) ? 0.3 : 1, display: 'flex', alignItems: 'center', color: '#64748b' }}
                                                >
                                                    {c.isActive ? <ToggleRight size={20} color="#10b981"/> : <ToggleLeft size={20} />}
                                                </button>
                                                <button onClick={() => copyToClipboard(c.code)} style={{ padding: '0.4rem', border: 'none', background: 'transparent', cursor: 'pointer', display: 'flex', alignItems: 'center', color: '#94a3b8' }}>
                                                    <Copy size={18} />
                                                </button>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}
                </div>
            ))}
        </div>
    );
}
