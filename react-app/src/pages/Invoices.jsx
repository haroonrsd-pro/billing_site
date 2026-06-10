import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useFirestore } from '../hooks/useFirestore';
import { useMessaging } from '../context/MessagingContext';
import { syncInvoicesExcel } from '../utils/excelService';
import { invoiceService } from '../services/invoiceService';

/**
 * Premium Loading Skeleton for Invoices Table
 */
const InvoiceSkeleton = () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', padding: '1rem' }}>
        {[...Array(5)].map((_, i) => (
            <div key={i} className="skeleton-row" style={{ 
                height: '60px', 
                background: 'linear-gradient(90deg, #f1f5f9 25%, #f8fafc 50%, #f1f5f9 75%)',
                backgroundSize: '200% 100%',
                animation: 'skeleton-pulse 1.5s infinite',
                borderRadius: '16px'
            }} />
        ))}
        <style>{`
            @keyframes skeleton-pulse {
                0% { background-position: 200% 0; }
                100% { background-position: -200% 0; }
            }
        `}</style>
    </div>
);

export default function Invoices() {
    const navigate = useNavigate();
    const { showToast, showConfirm } = useMessaging();
    const { docs: branches } = useFirestore('branches');
    
    // UI State
    const [invoices, setInvoices] = useState([]);
    const [loading, setLoading] = useState(true);
    const [loadingMore, setLoadingMore] = useState(false);
    const [hasMore, setHasMore] = useState(true);
    const [lastDoc, setLastDoc] = useState(null);
    const [error, setError] = useState(null);
    const [optimizationMetadata, setOptimizationMetadata] = useState({ isOptimized: true, indexLink: null });
    
    // Filter State
    const [searchTerm, setSearchTerm] = useState('');
    const [filterType, setFilterType] = useState('All');
    const [filterBranch, setFilterBranch] = useState('All');
    const [filterStatus, setFilterStatus] = useState('All');
    const [filterDate, setFilterDate] = useState('');
    const [selectedInvoices, setSelectedInvoices] = useState(new Set());
    const [viewingInvoice, setViewingInvoice] = useState(null);

    const userRole = sessionStorage.getItem('fb_user_role');
    const userCompanyId = sessionStorage.getItem('fb_user_company_id');
    const userBranchId = sessionStorage.getItem('fb_user_branch_id') || 'main';
    const isOwner = userRole === 'owner';

    /**
     * Fetch Invoices from Service (Server-side)
     */
    const fetchInvoices = useCallback(async (isLoadMore = false) => {
        if (isLoadMore) setLoadingMore(true);
        else setLoading(true);
        setError(null);

        try {
            const filters = {
                companyId: userCompanyId,
                status: filterStatus,
                branch_id: !isOwner ? userBranchId : (filterBranch !== 'All' ? (branches || []).find(b => `${b.name} — ${b.city}` === filterBranch)?.id : 'All'),
                type: filterType,
                filterDate: filterDate,
                lastDoc: isLoadMore ? lastDoc : null
            };

            const result = await invoiceService.getInvoices(filters, { pageSize: 30 });
            
            setOptimizationMetadata({ 
                isOptimized: result.isOptimized, 
                indexLink: result.indexLink 
            });

            if (isLoadMore) {
                setInvoices(prev => [...prev, ...result.docs]);
            } else {
                setInvoices(result.docs);
            }
            
            setLastDoc(result.lastDoc);
            setHasMore(result.hasMore);
        } catch (err) {
            console.error("Failed to load invoices:", err);
            setError(err.message);
            showToast(`Error: ${err.message}`, 'error');
        } finally {
            setLoading(false);
            setLoadingMore(false);
        }
    }, [userCompanyId, filterStatus, filterBranch, filterType, filterDate, isOwner, userBranchId, branches, showToast]); // Removed lastDoc to prevent loops

    // Initial load and filter change
    useEffect(() => {
        fetchInvoices();
    }, [filterStatus, filterBranch, filterType, filterDate]);

    // Search logic (Safe guards added)
    const filteredInvoices = useMemo(() => {
        if (!Array.isArray(invoices)) return [];
        if (!searchTerm) return invoices;
        const lowerSearch = (searchTerm || '').toLowerCase();
        return invoices.filter(inv => 
            (inv.id || '').toLowerCase().includes(lowerSearch) ||
            (inv.cust || '').toLowerCase().includes(lowerSearch) ||
            (inv.customerName || '').toLowerCase().includes(lowerSearch)
        );
    }, [invoices, searchTerm]);

    const handleLoadMore = () => {
        if (hasMore && !loadingMore) {
            fetchInvoices(true);
        }
    };

    const handleDeleteInvoice = async (id) => {
        showConfirm({
            title: 'Delete Invoice',
            message: `Are you sure you want to delete invoice ${id}?`,
            onConfirm: async () => {
                try {
                    await invoiceService.deleteInvoice(userCompanyId, id);
                    setInvoices(prev => prev.filter(inv => inv.id !== id));
                    showToast('Invoice deleted successfully', 'success');
                } catch (err) {
                    showToast(`Error deleting invoice: ${err.message}`, 'error');
                }
            }
        });
    };

    const handleBulkDelete = async () => {
        if (selectedInvoices.size === 0) return;
        showConfirm({
            title: 'Bulk Delete Invoices',
            message: `Are you sure you want to delete ${selectedInvoices.size} selected invoices?`,
            onConfirm: async () => {
                try {
                    const ids = Array.from(selectedInvoices);
                    await invoiceService.bulkDelete(userCompanyId, ids);

                    setInvoices(prev => prev.filter(inv => !selectedInvoices.has(inv.id)));
                    setSelectedInvoices(new Set());
                    showToast('Selected invoices deleted successfully', 'success');
                } catch (err) {
                    showToast(`Error deleting invoices: ${err.message}`, 'error');
                }
            }
        });
    };

    const toggleSelectAll = (e) => {
        if (e.target.checked) {
            setSelectedInvoices(new Set(filteredInvoices.map(inv => inv.id)));
        } else {
            setSelectedInvoices(new Set());
        }
    };

    const toggleSelectOne = (id) => {
        const newSet = new Set(selectedInvoices);
        if (newSet.has(id)) {
            newSet.delete(id);
        } else {
            newSet.add(id);
        }
        setSelectedInvoices(newSet);
    };

    return (
        <div className="page active" id="page-invoices" style={{ background: '#f8fafc', minHeight: '100vh', padding: '2rem' }}>
            <div className="pg-header" style={{ marginBottom: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                    <div className="pg-title" style={{ fontFamily: "'Yeseva One', serif", fontSize: '2.4rem', color: '#0f172a', marginBottom: '0.5rem' }}>Invoices History</div>
                    <div className="pg-sub" style={{ color: '#64748b', fontSize: '1rem' }}>Manage and track your sales history effortlessly</div>
                </div>
                <div className="pg-actions" style={{ display: 'flex', gap: '1rem' }}>
                    {selectedInvoices.size > 0 && (
                        <button
                            className="btn"
                            onClick={handleBulkDelete}
                            style={{ background: '#ef4444', color: 'white', padding: '0.8rem 1.6rem', borderRadius: '12px', fontWeight: 700, border: 'none', boxShadow: '0 4px 12px rgba(239, 68, 68, 0.25)', cursor: 'pointer' }}
                        >
                            🗑️ Delete Selected ({selectedInvoices.size})
                        </button>
                    )}
                    <button
                        className="btn"
                        onClick={() => {
                            const actualBranchId = !isOwner ? userBranchId : (filterBranch !== 'All' ? (branches || []).find(b => `${b.name} — ${b.city}` === filterBranch)?.id : 'All');
                            syncInvoicesExcel(userCompanyId, actualBranchId);
                        }}
                        style={{ background: '#10b981', color: 'white', padding: '0.8rem 1.6rem', borderRadius: '12px', fontWeight: 700, border: 'none', boxShadow: '0 4px 12px rgba(16, 185, 129, 0.25)', cursor: 'pointer' }}
                    >
                        📊 Export to Excel
                    </button>
                    <button
                        className="btn"
                        onClick={() => navigate('/billing')}
                        style={{ background: '#4f46e5', color: 'white', padding: '0.8rem 1.6rem', borderRadius: '12px', fontWeight: 700, border: 'none', boxShadow: '0 4px 12px rgba(79, 70, 229, 0.25)', cursor: 'pointer' }}
                    >
                        + Create New Invoice
                    </button>
                </div>
            </div>

            {/* Error Message with UI Action */}
            {error && (
                <div style={{ 
                    background: '#fef2f2', border: '1px solid #fee2e2', color: '#b91c1c', 
                    padding: '1.5rem', borderRadius: '20px', marginBottom: '2rem',
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    animation: 'slideIn 0.4s ease'
                }}>
                    <div>
                        <div style={{ fontWeight: 800 }}>⚠️ Optimization Required</div>
                        <div style={{ fontSize: '0.9rem' }}>{error.replace(/https?:\/\/[^\s]+/, '')}</div>
                    </div>
                    {error.match(/https?:\/\/[^\s]+/) && (
                        <button 
                            onClick={() => window.open(error.match(/https?:\/\/[^\s]+/)[0], '_blank')}
                            style={{ background: '#b91c1c', color: 'white', border: 'none', padding: '0.5rem 1rem', borderRadius: '10px', fontWeight: 700, cursor: 'pointer', fontSize: '0.8rem' }}
                        >
                            🛠️ Build Index (Click Here)
                        </button>
                    )}
                </div>
            )}

            {/* Filter Section Card */}
            <div className="glass shadow-premium" style={{ 
                borderRadius: '32px', padding: '2.5rem', 
                background: 'rgba(255, 255, 255, 0.9)', 
                border: '1px solid rgba(255, 255, 255, 0.4)', 
                marginBottom: '2.5rem'
            }}>
                {/* Search Bar */}
                <div style={{ position: 'relative', marginBottom: '2.5rem' }}>
                    <span style={{ position: 'absolute', left: '1.8rem', top: '50%', transform: 'translateY(-50%)', fontSize: '1.4rem', color: '#94a3b8' }}>🔍</span>
                    <input
                        type="text"
                        placeholder="Search by Invoice ID or Client name..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        style={{ 
                            width: '100%', padding: '1.4rem 1.4rem 1.4rem 4.5rem', 
                            borderRadius: '24px', border: '1.5px solid #e2e8f0', 
                            background: '#f8fafc', fontSize: '1.1rem', outline: 'none'
                        }}
                    />
                </div>

                {/* Filter Controls Row */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1.5rem' }}>
                        <div style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap' }}>
                            {['All', 'Standard', 'GST', 'Proforma', 'Supply'].map(t => (
                                <button
                                    key={t}
                                    onClick={() => setFilterType(t)}
                                    style={{
                                        padding: '0.8rem 1.8rem', borderRadius: '16px', fontWeight: 800, fontSize: '0.85rem', cursor: 'pointer',
                                        background: filterType === t ? '#4f46e5' : 'white',
                                        color: filterType === t ? 'white' : '#64748b',
                                        border: '1px solid',
                                        borderColor: filterType === t ? '#4f46e5' : '#e2e8f0'
                                    }}
                                >
                                    {t === 'Supply' ? 'Bill of Supply' : t}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div style={{ 
                        display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem',
                        background: '#f1f5f9', padding: '0.6rem', borderRadius: '24px'
                    }}>
                        {isOwner && (
                            <div style={{ background: 'white', padding: '0.6rem 1.2rem', borderRadius: '18px', border: '1px solid #e2e8f0' }}>
                                <span style={{ fontSize: '0.65rem', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase' }}>BRANCH</span>
                                <select 
                                    value={filterBranch} onChange={e => setFilterBranch(e.target.value)}
                                    style={{ background: 'none', border: 'none', fontSize: '0.9rem', fontWeight: 700, color: '#0f172a', outline: 'none', cursor: 'pointer', width: '100%' }}
                                >
                                    <option value="All">All Locations</option>
                                    {(branches || []).map(b => (
                                        <option key={b.id || Math.random()} value={`${b.name || ''} — ${b.city || ''}`}>
                                            {b.name || 'Unnamed Branch'}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        )}
                        <div style={{ background: 'white', padding: '0.6rem 1.2rem', borderRadius: '18px', border: '1px solid #e2e8f0' }}>
                            <span style={{ fontSize: '0.65rem', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase' }}>STATUS</span>
                            <select 
                                value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
                                style={{ background: 'none', border: 'none', fontSize: '0.9rem', fontWeight: 700, color: '#0f172a', outline: 'none', cursor: 'pointer', width: '100%' }}
                            >
                                <option value="All">All Statuses</option>
                                <option value="Paid">Paid</option>
                                <option value="Pending">Pending</option>
                                <option value="Overdue">Overdue</option>
                            </select>
                        </div>
                        <div style={{ background: 'white', padding: '0.6rem 1.2rem', borderRadius: '18px', border: '1px solid #e2e8f0' }}>
                            <span style={{ fontSize: '0.65rem', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase' }}>DATE</span>
                            <input 
                                type="date" value={filterDate} onChange={e => setFilterDate(e.target.value)}
                                style={{ background: 'none', border: 'none', fontSize: '0.9rem', fontWeight: 700, color: '#0f172a', outline: 'none', cursor: 'pointer', width: '100%' }} 
                            />
                        </div>
                    </div>
                </div>
            </div>

            {/* Invoices Table */}
            <div className="table-card shadow-premium" style={{ background: 'white', borderRadius: '32px', overflow: 'hidden', border: '1px solid #f1f5f9' }}>
                <div className="table-responsive-wrapper">
                    <table className="data-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <thead>
                            <tr style={{ background: '#f8fafc', borderBottom: '2px solid #f1f5f9' }}>
                                <th style={{ padding: '1.5rem 1.2rem', textAlign: 'center', width: '50px' }}>
                                    <input 
                                        type="checkbox" 
                                        checked={filteredInvoices.length > 0 && selectedInvoices.size === filteredInvoices.length}
                                        onChange={toggleSelectAll}
                                        style={{ transform: 'scale(1.2)', cursor: 'pointer' }}
                                    />
                                </th>
                                <th style={{ padding: '1.5rem 1.2rem', textAlign: 'left', fontSize: '0.75rem', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase' }}>Invoice #</th>
                                <th style={{ padding: '1.5rem 1.2rem', textAlign: 'left', fontSize: '0.75rem', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase' }}>Client</th>
                                <th style={{ padding: '1.5rem 1.2rem', textAlign: 'left', fontSize: '0.75rem', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase' }}>Branch</th>
                                <th style={{ padding: '1.5rem 1.2rem', textAlign: 'left', fontSize: '0.75rem', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase' }}>Date</th>
                                <th style={{ padding: '1.5rem 1.2rem', textAlign: 'left', fontSize: '0.75rem', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase' }}>Amount</th>
                                <th style={{ padding: '1.5rem 1.2rem', textAlign: 'left', fontSize: '0.75rem', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase' }}>Status</th>
                                <th style={{ padding: '1.5rem 1.2rem', textAlign: 'center', fontSize: '0.75rem', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase' }}>Action</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr><td colSpan="8"><InvoiceSkeleton /></td></tr>
                            ) : filteredInvoices.length === 0 ? (
                                <tr>
                                    <td colSpan="8" style={{ padding: '4rem', textAlign: 'center' }}>
                                        <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>📄</div>
                                        <div style={{ fontWeight: 700, color: '#0f172a' }}>No invoices found</div>
                                        <div style={{ color: '#64748b', fontSize: '0.9rem' }}>Try adjusting your filters or search term</div>
                                    </td>
                                </tr>
                            ) : (
                                filteredInvoices.map((inv) => (
                                    <tr key={inv.id} className="table-row-hover" style={{ borderTop: '1px solid #f1f5f9' }}>
                                        <td style={{ padding: '1.4rem 1.2rem', textAlign: 'center' }}>
                                            <input 
                                                type="checkbox"
                                                checked={selectedInvoices.has(inv.id)}
                                                onChange={() => toggleSelectOne(inv.id)}
                                                style={{ transform: 'scale(1.2)', cursor: 'pointer' }}
                                            />
                                        </td>
                                        <td style={{ padding: '1.4rem 1.2rem', fontWeight: 800, color: '#4f46e5', fontSize: '0.95rem' }}>
                                            #{(inv.id || 'N/A').slice(-6).toUpperCase()}
                                        </td>
                                        <td style={{ padding: '1.4rem 1.2rem' }}>
                                            <div style={{ fontWeight: 700, color: '#0f172a', fontSize: '1rem' }}>{inv.cust || inv.customerName}</div>
                                            <div style={{ fontSize: '0.75rem', color: '#94a3b8', fontWeight: 600 }}>{inv.type || 'Standard Invoice'}</div>
                                        </td>
                                        <td style={{ padding: '1.4rem 1.2rem' }}>
                                            <span style={{ padding: '0.4rem 0.8rem', background: '#f1f5f9', color: '#475569', borderRadius: '10px', fontSize: '0.72rem', fontWeight: 800 }}>
                                                {inv.branch || 'Main'}
                                            </span>
                                        </td>
                                        <td style={{ padding: '1.4rem 1.2rem', fontSize: '0.9rem', color: '#64748b', fontWeight: 600 }}>{inv.date}</td>
                                        <td style={{ padding: '1.4rem 1.2rem', fontWeight: 800, color: '#0f172a', fontSize: '1.1rem' }}>₹{(Number(inv.amount) || 0).toLocaleString()}</td>
                                        <td style={{ padding: '1.4rem 1.2rem' }}>
                                            <span style={{
                                                padding: '0.5rem 1rem', borderRadius: '12px', fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase',
                                                background: inv.status === 'Paid' ? '#ecfdf5' : inv.status === 'Pending' ? '#fffbeb' : '#fef2f2',
                                                color: inv.status === 'Paid' ? '#10b981' : inv.status === 'Pending' ? '#f59e0b' : '#ef4444',
                                                display: 'inline-flex', alignItems: 'center', gap: '0.4rem'
                                            }}>
                                                <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'currentColor' }} />
                                                {inv.status}
                                            </span>
                                        </td>
                                        <td style={{ padding: '1.4rem 1.2rem' }}>
                                            <div style={{ display: 'flex', gap: '0.6rem', justifyContent: 'center' }}>
                                                <button onClick={() => setViewingInvoice(inv)} style={{ background: '#f8fafc', border: '1.5px solid #e2e8f0', borderRadius: '12px', width: '36px', height: '36px', cursor: 'pointer' }} title="View">👁️</button>
                                                <button onClick={() => navigate('/credit-notes', { state: { sourceInvoice: inv } })} style={{ background: '#f8fafc', border: '1.5px solid #e2e8f0', borderRadius: '12px', width: '36px', height: '36px', cursor: 'pointer' }} title="Credit Note">↩️</button>
                                                <button onClick={() => handleDeleteInvoice(inv.id)} style={{ background: '#fef2f2', border: '1.5px solid #fee2e2', color: '#ef4444', borderRadius: '12px', width: '36px', height: '36px', cursor: 'pointer' }} title="Delete">🗑️</button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                {hasMore && !loading && (
                    <div style={{ padding: '2rem', textAlign: 'center', borderTop: '1px solid #f1f5f9' }}>
                        <button 
                            onClick={handleLoadMore}
                            disabled={loadingMore}
                            style={{ 
                                padding: '0.8rem 2rem', borderRadius: '14px', background: '#f1f5f9', 
                                color: '#475569', fontWeight: 700, border: 'none', cursor: 'pointer'
                            }}
                        >
                            {loadingMore ? 'Loading...' : 'Load More Invoices'}
                        </button>
                    </div>
                )}
            </div>

            {/* View Invoice Modal (Keep existing logic simplified) */}
            {viewingInvoice && (
                <div style={{ position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(15, 23, 42, 0.4)', backdropFilter: 'blur(12px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1.5rem' }}>
                    <div style={{ background: 'white', padding: '2.5rem', borderRadius: '32px', width: '100%', maxWidth: '550px', maxHeight: '90vh', overflowY: 'auto' }}>
                         <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2rem' }}>
                            <h3 style={{ margin: 0, fontSize: '1.8rem', fontFamily: "'Yeseva One', serif" }}>Invoice Details</h3>
                            <button onClick={() => setViewingInvoice(null)} style={{ border: 'none', background: '#f1f5f9', borderRadius: '10px', width: '32px', height: '32px', cursor: 'pointer' }}>✕</button>
                         </div>
                         <div style={{ display: 'grid', gap: '1.5rem' }}>
                             <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #f1f5f9', paddingBottom: '1rem' }}>
                                 <span style={{ fontWeight: 700, color: '#64748b' }}>Invoice ID</span>
                                 <span style={{ fontWeight: 800 }}>#{(viewingInvoice.id || 'N/A').slice(-8).toUpperCase()}</span>
                             </div>
                             <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #f1f5f9', paddingBottom: '1rem' }}>
                                 <span style={{ fontWeight: 700, color: '#64748b' }}>Client</span>
                                 <span style={{ fontWeight: 800 }}>{viewingInvoice.cust || viewingInvoice.customerName}</span>
                             </div>
                             <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #f1f5f9', paddingBottom: '1rem' }}>
                                 <span style={{ fontWeight: 700, color: '#64748b' }}>Date</span>
                                 <span style={{ fontWeight: 800 }}>{viewingInvoice.date}</span>
                             </div>
                             <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #f1f5f9', paddingBottom: '1rem' }}>
                                 <span style={{ fontWeight: 700, color: '#64748b' }}>Total Amount</span>
                                 <span style={{ fontWeight: 800, fontSize: '1.4rem', color: '#4f46e5' }}>₹{(Number(viewingInvoice.amount) || 0).toLocaleString()}</span>
                             </div>
                         </div>
                         <button onClick={() => setViewingInvoice(null)} style={{ width: '100%', marginTop: '2rem', padding: '1rem', background: '#4f46e5', color: 'white', borderRadius: '16px', border: 'none', fontWeight: 700, cursor: 'pointer' }}>Close Details</button>
                    </div>
                </div>
            )}
        </div>
    );
}
