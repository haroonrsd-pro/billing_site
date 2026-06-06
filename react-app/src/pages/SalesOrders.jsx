import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useFirestore } from '../hooks/useFirestore';
import { useMessaging } from '../context/MessagingContext';
import { Printer } from '@capgo/capacitor-printer';
import { Capacitor } from '@capacitor/core';

export default function SalesOrders() {
    const navigate = useNavigate();
    const { showToast, showConfirm } = useMessaging();
    const { docs: salesOrders, loading, error, deleteDocument } = useFirestore('salesOrders');
    const [searchTerm, setSearchTerm] = useState('');
    const [filterStatus, setFilterStatus] = useState('All'); // All, Draft, Confirmed, Invoiced, Cancelled
    const [viewingOrder, setViewingOrder] = useState(null);

    const userRole = sessionStorage.getItem('fb_user_role');
    const userBranch = sessionStorage.getItem('fb_user_station') || 'Main Branch';
    const userBranchId = sessionStorage.getItem('fb_user_branch_id') || 'main';

    // Derived Stats
    const stats = useMemo(() => {
        let draft = 0;
        let confirmed = 0;
        let invoiced = 0;
        let totalAmt = 0;

        const accessibleOrders = userRole === 'owner' ? salesOrders : salesOrders.filter(so => (so.branch_id === userBranchId) || (!so.branch_id && so.branch === userBranch));

        accessibleOrders.forEach(so => {
            if (so.status === 'Draft') draft++;
            if (so.status === 'Confirmed') confirmed++;
            if (so.status === 'Invoiced') invoiced++;
            totalAmt += so.amount || 0;
        });

        return { draft, confirmed, invoiced, totalAmt };
    }, [salesOrders, userRole, userBranch, userBranchId]);

    // Filtered Items
    const filteredOrders = useMemo(() => {
        return salesOrders.filter(so => {
            // Branch access logic: Owner sees all, others see only their branch
            const matchBranchAccess = userRole === 'owner' || (so.branch_id === userBranchId) || (!so.branch_id && (so.branch || 'Main Branch') === userBranch);
            if (!matchBranchAccess) return false;

            // Search filter
            const matchSearch =
                (so.id && so.id.toLowerCase().includes(searchTerm.toLowerCase())) ||
                (so.cust && so.cust.toLowerCase().includes(searchTerm.toLowerCase()));

            // Status filter
            const matchStatus = filterStatus === 'All' || so.status === filterStatus;

            return matchSearch && matchStatus;
        });
    }, [salesOrders, searchTerm, filterStatus, userRole, userBranch, userBranchId]);

    const handleDelete = async (id) => {
        showConfirm({
            title: 'Delete Sales Order',
            message: `Are you sure you want to delete sales order ${id}?`,
            onConfirm: async () => {
                try {
                    await deleteDocument(id);
                    showToast('Sales order deleted successfully', 'success');
                } catch (err) {
                    showToast(`Error deleting sales order: ${err.message}`, 'error');
                }
            }
        });
    };

    const handleExportExcel = async () => {
        const allOrders = userRole === 'owner' ? salesOrders : filteredOrders;
        if (allOrders.length === 0) {
            showToast('No sales orders to export', 'error');
            return;
        }
        try {
            const { default: ExcelJS } = await import('exceljs');
            const workbook = new ExcelJS.Workbook();
            const sheet = workbook.addWorksheet('Sales Orders');

            sheet.columns = [
                { header: 'SO #',        key: 'soNum',      width: 14 },
                { header: 'Client',      key: 'cust',       width: 28 },
                { header: 'Date',        key: 'date',       width: 16 },
                { header: 'Items Count', key: 'itemsCount', width: 14 },
                { header: 'Items',       key: 'items',      width: 40 },
                { header: 'Amount (Rs)', key: 'amount',     width: 15 },
                { header: 'Status',      key: 'status',     width: 14 },
                { header: 'Branch',      key: 'branch',     width: 20 },
            ];

            // Style header row
            sheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
            sheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF4F46E5' } };

            allOrders.forEach(so => {
                sheet.addRow({
                    soNum:      so.id ? (so.id || '').toString().slice(-6).toUpperCase() : '',
                    cust:       so.cust || 'Walk-in Client',
                    date:       so.date || (so.createdAt ? new Date(so.createdAt).toLocaleDateString() : ''),
                    itemsCount: so.itemsCount || 0,
                    items:      so.items || '',
                    amount:     Number(so.amount || 0).toFixed(2),
                    status:     so.status || 'Draft',
                    branch:     so.branch || '',
                });
            });

            const buffer = await workbook.xlsx.writeBuffer();
            const blob   = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
            const url    = URL.createObjectURL(blob);
            const a      = document.createElement('a');
            a.href       = url;
            a.download   = `Sales_Orders_${new Date().toISOString().split('T')[0]}.xlsx`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);

            showToast(`Exported ${allOrders.length} sales order(s) to Excel!`, 'success');
        } catch (err) {
            console.error('Export failed:', err);
            showToast('Export failed: ' + err.message, 'error');
        }
    };

    if (loading) {
        return <div className="page active" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>Loading Sales Orders...</div>;
    }

    if (error) {
        return <div className="page active" style={{ color: 'red', padding: '2rem' }}>Error loading sales orders: {error}</div>;
    }

    return (
        <div className="page active" id="page-sales-orders">
            <div className="pg-header">
                <div>
                    <div className="pg-title">📦 Sales Orders</div>
                    <div className="pg-sub">Track customer orders before invoicing</div>
                </div>
                <div className="pg-actions" style={{ display: 'flex', gap: '1rem' }}>
                    <button
                        className="btn"
                        onClick={handleExportExcel}
                        style={{ background: 'linear-gradient(135deg, #22c55e, #16a34a)', color: 'white', padding: '0.8rem 1.6rem', borderRadius: '12px', fontWeight: 700, border: 'none', boxShadow: '0 4px 12px rgba(34,197,94,0.3)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}
                    >
                        <img src="https://img.icons8.com/color/20/microsoft-excel-2019--v1.png" alt="Excel" style={{ width: '18px', height: '18px' }} />
                        Export to Excel
                    </button>
                    <button className="btn btn-primary" onClick={() => navigate('/billing')}>+ New Order</button>
                </div>
            </div>

            {/* Stats Grid */}
            <div className="stats-grid">
                <div className="stat-card">
                    <div className="sc-icon" style={{ background: '#eef2ff' }}>📝</div>
                    <div>
                        <div className="sc-val" style={{ color: 'var(--blue)' }}>{stats.draft}</div>
                        <div className="sc-lbl">Draft</div>
                    </div>
                </div>
                <div className="stat-card">
                    <div className="sc-icon" style={{ background: '#fef8ec' }}>⚙️</div>
                    <div>
                        <div className="sc-val" style={{ color: 'var(--yellow)' }}>{stats.confirmed}</div>
                        <div className="sc-lbl">Confirmed</div>
                    </div>
                </div>
                <div className="stat-card">
                    <div className="sc-icon" style={{ background: '#edf7f2' }}>✅</div>
                    <div>
                        <div className="sc-val" style={{ color: 'var(--green)' }}>{stats.invoiced}</div>
                        <div className="sc-lbl">Invoiced</div>
                    </div>
                </div>
                <div className="stat-card">
                    <div className="sc-icon" style={{ background: '#fff0e6' }}>💰</div>
                    <div>
                        <div className="sc-val" style={{ color: 'var(--accent)' }}>₹{stats.totalAmt.toLocaleString()}</div>
                        <div className="sc-lbl">Total Value</div>
                    </div>
                </div>
            </div>

            {/* Data Table */}
            <div className="table-card">
                <div className="tc-header" style={{ flexDirection: 'column', alignItems: 'flex-start', gap: '1rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center' }}>
                        <span className="tc-title">All Sales Orders</span>
                        <input
                            type="text"
                            placeholder="Search customer or SO#…"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            style={{
                                background: 'var(--bg)', border: '1.5px solid var(--border)', padding: '.38rem .75rem',
                                borderRadius: '8px', fontFamily: "'Nunito', sans-serif", fontSize: '.82rem', outline: 'none'
                            }}
                        />
                    </div>
                    <div className="cat-strip" style={{ margin: 0, padding: 0, background: 'none', border: 'none' }}>
                        {['All', 'Draft', 'Confirmed', 'Invoiced', 'Cancelled'].map(status => (
                            <button
                                key={status}
                                className={`cat-pill ${filterStatus === status ? 'active' : ''}`}
                                onClick={() => setFilterStatus(status)}
                            >
                                {status}
                            </button>
                        ))}
                    </div>
                </div>

                <table className="data-table">
                    <thead>
                        <tr>
                            <th>SO #</th>
                            <th>Client</th>
                            <th>Date</th>
                            <th>Items</th>
                            <th>Amount</th>
                            <th>Status</th>
                            <th>Action</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredOrders.length === 0 ? (
                            <tr>
                                <td colSpan="7">
                                    <div className="empty-state">
                                        <div className="es-sub">No sales orders found.</div>
                                    </div>
                                </td>
                            </tr>
                        ) : (
                            filteredOrders.map(so => (
                                <tr key={so.id}>
                                    <td style={{ fontWeight: 700, color: 'var(--accent)' }}>{(so.id || 'N/A').toString().slice(-6).toUpperCase()}</td>
                                    <td>{so.cust || 'Unknown Client'}</td>
                                    <td>{so.date || new Date(so.createdAt).toLocaleDateString()}</td>
                                    <td>{so.itemsCount || 0} items</td>
                                    <td style={{ fontWeight: 700 }}>₹{(so.amount || 0).toLocaleString()}</td>
                                    <td>
                                        <span className={`status-badge ${so.status ? so.status.toLowerCase() : 'draft'}`}>
                                            {so.status || 'Draft'}
                                        </span>
                                    </td>
                                    <td>
                                        <div style={{ display: 'flex', gap: '8px' }}>
                                            <button className="btn btn-ghost btn-sm" title="View" onClick={() => setViewingOrder(so)}>👁</button>
                                            <button
                                                className="btn btn-ghost btn-sm"
                                                title="Convert to Invoice"
                                                disabled={so.status === 'Invoiced' || so.status === 'Cancelled'}
                                                onClick={() => {/* Conversion logic */ }}
                                            >
                                                📄
                                            </button>
                                            <button
                                                className="btn btn-ghost btn-sm"
                                                style={{ color: 'var(--red)' }}
                                                title="Delete"
                                                onClick={() => handleDelete(so.id)}
                                            >
                                                🗑
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {/* View Order Modal */}
            {viewingOrder && (
                <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '1rem' }}>
                    <div style={{ background: 'white', padding: '2rem', borderRadius: '24px', width: '100%', maxWidth: '500px', boxShadow: '0 20px 40px rgba(0,0,0,0.2)', maxHeight: '90vh', overflowY: 'auto' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                            <h3 style={{ margin: 0, fontSize: '1.6rem', fontFamily: "'Yeseva One', serif", color: '#0f172a' }}>Sales Order Details</h3>
                            <button
                                onClick={() => setViewingOrder(null)}
                                style={{ background: '#f1f5f9', border: 'none', borderRadius: '50%', width: '36px', height: '36px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem', cursor: 'pointer', color: '#64748b' }}
                            >✕</button>
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '0.8rem', borderBottom: '1px dashed #e2e8f0' }}>
                                <span style={{ color: '#64748b', fontWeight: 600, fontSize: '0.95rem' }}>Order Number</span>
                                <span style={{ fontWeight: 800, color: '#4f46e5', fontSize: '1rem' }}>{(viewingOrder.id || '').toString().slice(-6).toUpperCase() || 'N/A'}</span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                <span style={{ color: '#64748b', fontWeight: 600, fontSize: '0.95rem' }}>Date</span>
                                <span style={{ fontWeight: 700, color: '#0f172a' }}>{viewingOrder.date || (viewingOrder.createdAt ? new Date(viewingOrder.createdAt).toLocaleDateString() : '')}</span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                <span style={{ color: '#64748b', fontWeight: 600, fontSize: '0.95rem' }}>Client</span>
                                <span style={{ fontWeight: 700, color: '#0f172a' }}>{viewingOrder.cust || 'Unknown Client'}</span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                <span style={{ color: '#64748b', fontWeight: 600, fontSize: '0.95rem' }}>Status</span>
                                <span style={{
                                    padding: '0.3rem 0.8rem',
                                    borderRadius: '8px',
                                    fontSize: '0.8rem',
                                    fontWeight: 700,
                                    background: viewingOrder.status === 'Invoiced' ? '#ecfdf5' : viewingOrder.status === 'Confirmed' ? '#fffbeb' : '#fef2f2',
                                    color: viewingOrder.status === 'Invoiced' ? '#10b981' : viewingOrder.status === 'Confirmed' ? '#f59e0b' : '#ef4444'
                                }}>
                                    {viewingOrder.status || 'Draft'}
                                </span>
                            </div>

                            <div style={{ marginTop: '0.5rem' }}>
                                <span style={{ color: '#64748b', fontWeight: 600, display: 'block', marginBottom: '0.8rem', fontSize: '0.95rem' }}>Items</span>
                                <div style={{ background: '#f8fafc', padding: '1.2rem', borderRadius: '12px', fontSize: '0.95rem', lineHeight: '1.6', color: '#334155', border: '1px solid #e2e8f0' }}>
                                    {viewingOrder.items || 'No items listed'}
                                </div>
                            </div>

                            <div style={{ background: '#f8fafc', padding: '1.2rem', borderRadius: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.5rem', border: '1px solid #e2e8f0' }}>
                                <div>
                                    <div style={{ color: '#64748b', fontWeight: 600, fontSize: '0.8rem', textTransform: 'uppercase', marginBottom: '0.3rem' }}>Total Amount</div>
                                    <div style={{ fontSize: '0.85rem', color: '#94a3b8', fontWeight: 500 }}>Inc. Taxes</div>
                                </div>
                                <span style={{ fontWeight: 800, color: '#4f46e5', fontSize: '1.8rem' }}>₹{(viewingOrder.amount || 0).toLocaleString()}</span>
                            </div>
                        </div>

                        <div style={{ display: 'flex', gap: '1rem', marginTop: '2rem' }}>
                            <button
                                onClick={() => setViewingOrder(null)}
                                style={{ flex: 1, padding: '1rem', borderRadius: '14px', background: '#f1f5f9', border: 'none', color: '#475569', fontWeight: 700, cursor: 'pointer', transition: 'all 0.2s', fontSize: '1rem' }}
                            >
                                Close
                            </button>
                            <button
                                onClick={async () => {
                                    if (Capacitor.isNativePlatform()) {
                                        try {
                                            await Printer.printHtml({
                                                html: document.body.innerHTML,
                                                name: `SalesOrder-${viewingOrder.id}`
                                            });
                                        } catch (err) {
                                            console.error('Native print error:', err);
                                            showToast('Native printing failed.', 'error');
                                        }
                                    } else {
                                        showToast('Printing specific sales order is currently not fully implemented. Going to regular print.', 'info');
                                        window.print();
                                    }
                                }}
                                style={{ flex: 1, padding: '1rem', borderRadius: '14px', background: '#4f46e5', border: 'none', color: 'white', fontWeight: 700, cursor: 'pointer', boxShadow: '0 4px 12px rgba(79, 70, 229, 0.25)', transition: 'all 0.2s', fontSize: '1rem' }}
                            >
                                Print Document
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
