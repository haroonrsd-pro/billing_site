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

    // Sorting State
    const [sortField, setSortField] = useState('date');
    const [sortOrder, setSortOrder] = useState('desc');

    const userRole = sessionStorage.getItem('fb_user_role');
    const userCompanyId = sessionStorage.getItem('fb_user_company_id');
    const userBranchId = sessionStorage.getItem('fb_user_branch_id') || 'main';
    const isOwner = userRole === 'owner';

    const handleSort = (field) => {
        setSortOrder(prev => (sortField === field && prev === 'asc') ? 'desc' : 'asc');
        setSortField(field);
    };

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
    }, [userCompanyId, filterStatus, filterBranch, filterType, filterDate, isOwner, userBranchId, branches, showToast]);

    // Initial load and filter change
    useEffect(() => {
        fetchInvoices();
    }, [filterStatus, filterBranch, filterType, filterDate]);

    // Search and sorting logic
    const filteredInvoices = useMemo(() => {
        if (!Array.isArray(invoices)) return [];
        let result = [...invoices];
        
        if (searchTerm) {
            const lowerSearch = (searchTerm || '').toLowerCase();
            result = result.filter(inv => 
                (inv.id || '').toLowerCase().includes(lowerSearch) ||
                (inv.cust || '').toLowerCase().includes(lowerSearch) ||
                (inv.customerName || '').toLowerCase().includes(lowerSearch)
            );
        }

        result.sort((a, b) => {
            let valA = a[sortField];
            let valB = b[sortField];

            if (sortField === 'amount') {
                valA = Number(valA) || 0;
                valB = Number(valB) || 0;
            } else {
                valA = (valA || '').toString().toLowerCase();
                valB = (valB || '').toString().toLowerCase();
            }

            if (valA < valB) return sortOrder === 'asc' ? -1 : 1;
            if (valA > valB) return sortOrder === 'asc' ? 1 : -1;
            return 0;
        });

        return result;
    }, [invoices, searchTerm, sortField, sortOrder]);

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

    const handlePrintInvoice = (inv) => {
        const printWindow = window.open('', '_blank');
        printWindow.document.write(`
            <html>
            <head>
                <title>Invoice #${inv.id.slice(-6).toUpperCase()}</title>
                <style>
                    body { font-family: system-ui, sans-serif; padding: 40px; color: #1e293b; }
                    .header { display: flex; justify-content: space-between; border-bottom: 2px solid #e2e8f0; padding-bottom: 20px; }
                    .details { margin: 30px 0; line-height: 1.6; }
                    .details h2 { color: #4f46e5; margin-bottom: 5px; }
                    .table { width: 100%; border-collapse: collapse; margin-top: 30px; }
                    .table th, .table td { border: 1px solid #e2e8f0; padding: 12px; text-align: left; }
                    .table th { background-color: #f8fafc; font-weight: 700; }
                </style>
            </head>
            <body>
                <div class="header">
                    <div>
                        <h1 style="margin: 0; color: #4f46e5;">FoodBill PRO</h1>
                        <p style="margin: 4px 0 0 0; color: #64748b;">Invoice Record</p>
                    </div>
                    <div style="text-align: right;">
                        <h3 style="margin: 0;">#${inv.id.toUpperCase()}</h3>
                        <p style="margin: 4px 0 0 0; color: #64748b;">Date: ${inv.date}</p>
                    </div>
                </div>
                <div class="details">
                    <h2>Customer Info</h2>
                    <div><strong>Name:</strong> ${inv.cust || inv.customerName || 'Walk-in Client'}</div>
                    <div><strong>Branch:</strong> ${inv.branch || 'Main'}</div>
                    <div><strong>Type:</strong> ${inv.type || 'Standard Invoice'}</div>
                    <div style="margin-top: 20px; font-size: 1.25rem;">
                        <strong>Total Amount:</strong> <span style="color: #10b981; font-weight: 800;">₹${Number(inv.amount).toLocaleString()}</span>
                    </div>
                    <div><strong>Status:</strong> <span style="text-transform: uppercase; font-weight: 700; color: ${inv.status === 'Paid' ? '#10b981' : '#f59e0b'}">${inv.status}</span></div>
                </div>
                <script>
                    window.onload = function() { window.print(); window.close(); }
                </script>
            </body>
            </html>
        `);
        printWindow.document.close();
    };

    const getSortIndicator = (field) => {
        if (sortField !== field) return null;
        return sortOrder === 'asc' ? ' ▲' : ' ▼';
    };

    return (
        <div className="page active" id="page-invoices" style={{ background: '#f8fafc', minHeight: 'calc(100vh - var(--topbar-h))', padding: '1.5rem', boxSizing: 'border-box' }}>
            <div className="pg-header" style={{ marginBottom: '1.25rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                    <div className="pg-title" style={{ fontFamily: "'Yeseva One', serif", fontSize: '2rem', color: '#0f172a', marginBottom: '0.25rem' }}>Invoices History</div>
                    <div className="pg-sub" style={{ color: '#64748b', fontSize: '0.875rem' }}>Manage and track your sales history effortlessly</div>
                </div>
                <div className="pg-actions" style={{ display: 'flex', gap: '0.75rem' }}>
                    {selectedInvoices.size > 0 && (
                        <button
                            className="btn"
                            onClick={handleBulkDelete}
                            style={{ background: '#ef4444', color: 'white', padding: '0.5rem 1.25rem', borderRadius: '8px', fontWeight: 700, fontSize: '0.85rem', border: 'none', boxShadow: '0 4px 12px rgba(239, 68, 68, 0.25)', cursor: 'pointer' }}
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
                        style={{ background: '#10b981', color: 'white', padding: '0.5rem 1.25rem', borderRadius: '8px', fontWeight: 700, fontSize: '0.85rem', border: 'none', boxShadow: '0 4px 12px rgba(16, 185, 129, 0.25)', cursor: 'pointer' }}
                    >
                        📊 Export to Excel
                    </button>
                    <button
                        className="btn"
                        onClick={() => navigate('/billing')}
                        style={{ background: '#4f46e5', color: 'white', padding: '0.5rem 1.25rem', borderRadius: '8px', fontWeight: 700, fontSize: '0.85rem', border: 'none', boxShadow: '0 4px 12px rgba(79, 70, 229, 0.25)', cursor: 'pointer' }}
                    >
                        + Create New Invoice
                    </button>
                </div>
            </div>

            {/* Error Message with UI Action */}
            {error && (
                <div style={{ 
                    background: '#fef2f2', border: '1px solid #fee2e2', color: '#b91c1c', 
                    padding: '1rem', borderRadius: '12px', marginBottom: '1.25rem',
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    fontSize: '0.9rem'
                }}>
                    <div>
                        <div style={{ fontWeight: 800 }}>⚠️ Optimization Required</div>
                        <div style={{ fontSize: '0.85rem' }}>{error.replace(/https?:\/\/[^\s]+/, '')}</div>
                    </div>
                    {error.match(/https?:\/\/[^\s]+/) && (
                        <button 
                            onClick={() => window.open(error.match(/https?:\/\/[^\s]+/)[0], '_blank')}
                            style={{ background: '#b91c1c', color: 'white', border: 'none', padding: '0.4rem 0.8rem', borderRadius: '6px', fontWeight: 700, cursor: 'pointer', fontSize: '0.75rem' }}
                        >
                            🛠️ Build Index (Click Here)
                        </button>
                    )}
                </div>
            )}

            {/* Performance Warning (Fallback Mode) */}
            {!optimizationMetadata.isOptimized && (
                <div style={{ 
                    background: '#fffbeb', border: '1px solid #fef3c7', color: '#92400e', 
                    padding: '0.75rem 1.25rem', borderRadius: '12px', marginBottom: '1.25rem',
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    fontSize: '0.85rem'
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <span>⚡</span>
                        <div>
                            <div style={{ fontWeight: 800 }}>Running in Fallback Mode</div>
                            <div style={{ fontSize: '0.8rem' }}>This filter combo is unoptimized. Create an index to improve speed.</div>
                        </div>
                    </div>
                    {optimizationMetadata.indexLink && (
                        <button 
                            onClick={() => window.open(optimizationMetadata.indexLink, '_blank')}
                            style={{ background: '#f59e0b', color: 'white', border: 'none', padding: '0.4rem 0.8rem', borderRadius: '6px', fontWeight: 700, cursor: 'pointer', fontSize: '0.75rem' }}
                        >
                            Create Index
                        </button>
                    )}
                </div>
            )}

            {/* Filters Row */}
            {/* Filter Section Card */}
            <div className="glass shadow-premium" style={{ 
                borderRadius: '16px', padding: '1rem', 
                background: '#ffffff', 
                border: '1px solid #e2e8f0', 
                marginBottom: '1.25rem',
                display: 'flex',
                gap: '1rem',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap'
            }}>
                {/* Left side: Search & Type Chips */}
                <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap', flex: 1, minWidth: '280px' }}>
                    {/* Compact Search */}
                    <div style={{ position: 'relative', flex: 1, maxWidth: '280px' }}>
                        <span style={{ position: 'absolute', left: '0.8rem', top: '50%', transform: 'translateY(-50%)', fontSize: '1rem', color: '#94a3b8' }}>🔍</span>
                        <input
                            type="text"
                            placeholder="Search by ID or customer..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            style={{ 
                                width: '100%', padding: '0.5rem 0.5rem 0.5rem 2.2rem', 
                                borderRadius: '8px', border: '1px solid #cbd5e1', 
                                background: '#f8fafc', fontSize: '0.875rem', outline: 'none'
                            }}
                        />
                    </div>

                    {/* Chips */}
                    <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap' }}>
                        {['All', 'Standard', 'GST', 'Proforma', 'Supply'].map(t => (
                            <button
                                key={t}
                                onClick={() => setFilterType(t)}
                                style={{
                                    padding: '0.4rem 0.9rem', borderRadius: '6px', fontWeight: 700, fontSize: '0.78rem', cursor: 'pointer',
                                    background: filterType === t ? '#4f46e5' : '#f1f5f9',
                                    color: filterType === t ? 'white' : '#475569',
                                    border: 'none',
                                    transition: 'all 0.15s'
                                }}
                            >
                                {t === 'Supply' ? 'Bill of Supply' : t}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Right side: Dropdown Selects & Date picker */}
                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
                    {isOwner && (
                        <select 
                            value={filterBranch} onChange={e => setFilterBranch(e.target.value)}
                            style={{ background: 'white', border: '1px solid #cbd5e1', borderRadius: '8px', padding: '0.45rem 0.75rem', fontSize: '0.82rem', fontWeight: 700, color: '#334155', outline: 'none', cursor: 'pointer' }}
                        >
                            <option value="All">All Branches</option>
                            {(branches || []).map(b => (
                                <option key={b.id || Math.random()} value={`${b.name || ''} — ${b.city || ''}`}>
                                    {b.name || 'Unnamed Branch'}
                                </option>
                            ))}
                        </select>
                    )}

                    <select 
                        value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
                        style={{ background: 'white', border: '1px solid #cbd5e1', borderRadius: '8px', padding: '0.45rem 0.75rem', fontSize: '0.82rem', fontWeight: 700, color: '#334155', outline: 'none', cursor: 'pointer' }}
                    >
                        <option value="All">All Statuses</option>
                        <option value="Paid">Paid</option>
                        <option value="Pending">Pending</option>
                        <option value="Overdue">Overdue</option>
                    </select>

                    <input 
                        type="date" value={filterDate} onChange={e => setFilterDate(e.target.value)}
                        style={{ background: 'white', border: '1px solid #cbd5e1', borderRadius: '8px', padding: '0.4rem 0.75rem', fontSize: '0.82rem', fontWeight: 700, color: '#334155', outline: 'none', cursor: 'pointer' }} 
                    />
                </div>
            </div>

            {/* Invoices Table */}
            <div className="table-card shadow-premium" style={{ background: 'white', borderRadius: '16px', overflow: 'hidden', border: '1px solid #f1f5f9' }}>
                <div className="table-responsive-wrapper" style={{ maxHeight: 'calc(100vh - 280px)', overflowY: 'auto' }}>
                    <table className="data-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <thead>
                            <tr style={{ background: '#f8fafc', borderBottom: '2px solid #f1f5f9', position: 'sticky', top: 0, zIndex: 10 }}>
                                <th style={{ padding: '0.75rem 1rem', textAlign: 'center', width: '40px' }}>
                                    <input 
                                        type="checkbox" 
                                        checked={filteredInvoices.length > 0 && selectedInvoices.size === filteredInvoices.length}
                                        onChange={toggleSelectAll}
                                        style={{ transform: 'scale(1.1)', cursor: 'pointer' }}
                                    />
                                </th>
                                <th onClick={() => handleSort('id')} style={{ padding: '0.75rem 1rem', textAlign: 'left', fontSize: '0.72rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', cursor: 'pointer', userSelect: 'none' }}>
                                    Invoice No{getSortIndicator('id')}
                                </th>
                                <th onClick={() => handleSort('cust')} style={{ padding: '0.75rem 1rem', textAlign: 'left', fontSize: '0.72rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', cursor: 'pointer', userSelect: 'none' }}>
                                    Client{getSortIndicator('cust')}
                                </th>
                                <th onClick={() => handleSort('branch')} style={{ padding: '0.75rem 1rem', textAlign: 'left', fontSize: '0.72rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', cursor: 'pointer', userSelect: 'none' }}>
                                    Branch{getSortIndicator('branch')}
                                </th>
                                <th onClick={() => handleSort('date')} style={{ padding: '0.75rem 1rem', textAlign: 'left', fontSize: '0.72rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', cursor: 'pointer', userSelect: 'none' }}>
                                    Date{getSortIndicator('date')}
                                </th>
                                <th onClick={() => handleSort('amount')} style={{ padding: '0.75rem 1rem', textAlign: 'left', fontSize: '0.72rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', cursor: 'pointer', userSelect: 'none' }}>
                                    Amount{getSortIndicator('amount')}
                                </th>
                                <th onClick={() => handleSort('status')} style={{ padding: '0.75rem 1rem', textAlign: 'left', fontSize: '0.72rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', cursor: 'pointer', userSelect: 'none' }}>
                                    Payment Status{getSortIndicator('status')}
                                </th>
                                <th style={{ padding: '0.75rem 1rem', textAlign: 'center', fontSize: '0.72rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase' }}>Action</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr><td colSpan="8"><InvoiceSkeleton /></td></tr>
                            ) : filteredInvoices.length === 0 ? (
                                <tr>
                                    <td colSpan="8" style={{ padding: '3rem', textAlign: 'center' }}>
                                        <div style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>📄</div>
                                        <div style={{ fontWeight: 700, color: '#0f172a' }}>No invoices found</div>
                                        <div style={{ color: '#64748b', fontSize: '0.85rem' }}>Try adjusting your filters or search term</div>
                                    </td>
                                </tr>
                            ) : (
                                filteredInvoices.map((inv, idx) => (
                                    <tr key={inv.id} className="table-row-hover" style={{ 
                                        borderTop: '1px solid #f1f5f9', 
                                        backgroundColor: idx % 2 === 0 ? '#ffffff' : '#f8fafc',
                                        transition: 'background-color 0.15s'
                                    }}>
                                        <td style={{ padding: '0.6rem 1rem', textAlign: 'center' }}>
                                            <input 
                                                type="checkbox"
                                                checked={selectedInvoices.has(inv.id)}
                                                onChange={() => toggleSelectOne(inv.id)}
                                                style={{ transform: 'scale(1.1)', cursor: 'pointer' }}
                                            />
                                        </td>
                                        <td style={{ padding: '0.6rem 1rem', fontWeight: 800, color: '#4f46e5', fontSize: '0.85rem' }}>
                                            #{(inv.id || 'N/A').slice(-6).toUpperCase()}
                                        </td>
                                        <td style={{ padding: '0.6rem 1rem' }}>
                                            <div style={{ fontWeight: 700, color: '#0f172a', fontSize: '0.88rem' }}>{inv.cust || inv.customerName}</div>
                                            <div style={{ fontSize: '0.7rem', color: '#94a3b8', fontWeight: 600 }}>{inv.type || 'Standard Invoice'}</div>
                                        </td>
                                        <td style={{ padding: '0.6rem 1rem' }}>
                                            <span style={{ padding: '0.25rem 0.5rem', background: '#f1f5f9', color: '#475569', borderRadius: '6px', fontSize: '0.68rem', fontWeight: 800 }}>
                                                {inv.branch || 'Main'}
                                            </span>
                                        </td>
                                        <td style={{ padding: '0.6rem 1rem', fontSize: '0.82rem', color: '#64748b', fontWeight: 600 }}>{inv.date}</td>
                                        <td style={{ padding: '0.6rem 1rem', fontWeight: 800, color: '#0f172a', fontSize: '0.92rem' }}>₹{(Number(inv.amount) || 0).toLocaleString()}</td>
                                        <td style={{ padding: '0.6rem 1rem' }}>
                                            <span style={{
                                                padding: '0.3rem 0.6rem', borderRadius: '8px', fontSize: '0.7rem', fontWeight: 800, textTransform: 'uppercase',
                                                background: inv.status === 'Paid' ? '#ecfdf5' : inv.status === 'Pending' ? '#fffbeb' : '#fef2f2',
                                                color: inv.status === 'Paid' ? '#10b981' : inv.status === 'Pending' ? '#f59e0b' : '#ef4444',
                                                display: 'inline-flex', alignItems: 'center', gap: '0.3rem'
                                            }}>
                                                <div style={{ width: '4px', height: '4px', borderRadius: '50%', background: 'currentColor' }} />
                                                {inv.status}
                                            </span>
                                        </td>
                                        <td style={{ padding: '0.6rem 1rem' }}>
                                            <div style={{ display: 'flex', gap: '0.35rem', justifyContent: 'center' }}>
                                                <button onClick={() => setViewingInvoice(inv)} style={{ background: '#f8fafc', border: '1px solid #cbd5e1', borderRadius: '8px', width: '28px', height: '28px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.85rem' }} title="View Details">👁️</button>
                                                <button onClick={() => navigate('/credit-notes', { state: { sourceInvoice: inv } })} style={{ background: '#f8fafc', border: '1px solid #cbd5e1', borderRadius: '8px', width: '28px', height: '28px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.85rem' }} title="Issue Credit Note">↩️</button>
                                                <button onClick={() => handlePrintInvoice(inv)} style={{ background: '#f8fafc', border: '1px solid #cbd5e1', borderRadius: '8px', width: '28px', height: '28px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.85rem' }} title="Print Invoice">🖨️</button>
                                                <button onClick={() => handleDeleteInvoice(inv.id)} style={{ background: '#fef2f2', border: '1px solid #fee2e2', color: '#ef4444', borderRadius: '8px', width: '28px', height: '28px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.85rem' }} title="Delete Invoice">🗑️</button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                {hasMore && !loading && (
                    <div style={{ padding: '1rem', textAlign: 'center', borderTop: '1px solid #f1f5f9' }}>
                        <button 
                            onClick={handleLoadMore}
                            disabled={loadingMore}
                            style={{ 
                                padding: '0.5rem 1.5rem', borderRadius: '8px', background: '#f1f5f9', 
                                color: '#475569', fontWeight: 700, border: 'none', cursor: 'pointer', fontSize: '0.8rem'
                            }}
                        >
                            {loadingMore ? 'Loading...' : 'Load More Invoices'}
                        </button>
                    </div>
                )}
            </div>

            {/* View Invoice Modal */}
            {viewingInvoice && (
                <div style={{ position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(15, 23, 42, 0.4)', backdropFilter: 'blur(12px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1.5rem' }}>
                    <div style={{ background: 'white', padding: '2rem', borderRadius: '24px', width: '100%', maxWidth: '480px', maxHeight: '90vh', overflowY: 'auto' }}>
                         <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
                            <h3 style={{ margin: 0, fontSize: '1.5rem', fontFamily: "'Yeseva One', serif" }}>Invoice Details</h3>
                            <button onClick={() => setViewingInvoice(null)} style={{ border: 'none', background: '#f1f5f9', borderRadius: '8px', width: '28px', height: '28px', cursor: 'pointer' }}>✕</button>
                         </div>
                         <div style={{ display: 'grid', gap: '1rem' }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #f1f5f9', paddingBottom: '0.75rem' }}>
                                  <span style={{ fontWeight: 700, color: '#64748b', fontSize: '0.88rem' }}>Invoice ID</span>
                                  <span style={{ fontWeight: 800, fontSize: '0.88rem' }}>#{(viewingInvoice.id || 'N/A').toUpperCase()}</span>
                              </div>
                              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #f1f5f9', paddingBottom: '0.75rem' }}>
                                  <span style={{ fontWeight: 700, color: '#64748b', fontSize: '0.88rem' }}>Client</span>
                                  <span style={{ fontWeight: 800, fontSize: '0.88rem' }}>{viewingInvoice.cust || viewingInvoice.customerName}</span>
                              </div>
                              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #f1f5f9', paddingBottom: '0.75rem' }}>
                                  <span style={{ fontWeight: 700, color: '#64748b', fontSize: '0.88rem' }}>Date</span>
                                  <span style={{ fontWeight: 800, fontSize: '0.88rem' }}>{viewingInvoice.date}</span>
                              </div>
                              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #f1f5f9', paddingBottom: '0.75rem' }}>
                                  <span style={{ fontWeight: 700, color: '#64748b', fontSize: '0.88rem' }}>Total Amount</span>
                                  <span style={{ fontWeight: 800, fontSize: '1.2rem', color: '#4f46e5' }}>₹{(Number(viewingInvoice.amount) || 0).toLocaleString()}</span>
                              </div>
                              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #f1f5f9', paddingBottom: '0.75rem' }}>
                                  <span style={{ fontWeight: 700, color: '#64748b', fontSize: '0.88rem' }}>Payment Status</span>
                                  <span style={{ fontWeight: 800, fontSize: '0.88rem', color: viewingInvoice.status === 'Paid' ? '#10b981' : '#f59e0b' }}>{viewingInvoice.status}</span>
                              </div>
                         </div>
                         <button onClick={() => setViewingInvoice(null)} style={{ width: '100%', marginTop: '1.5rem', padding: '0.75rem', background: '#4f46e5', color: 'white', borderRadius: '12px', border: 'none', fontWeight: 700, cursor: 'pointer', fontSize: '0.9rem' }}>Close Details</button>
                    </div>
                </div>
            )}
        </div>
    );
}
