import React, { useState, useMemo } from 'react';
import { useFirestore } from '../hooks/useFirestore';
import { useMessaging } from '../context/MessagingContext';

export default function Quotations() {
    const { showToast } = useMessaging();
    const { docs: quotations, loading, addDocument, deleteDocument } = useFirestore('quotations');
    const { docs: products } = useFirestore('products');
    const [showModal, setShowModal] = useState(false);

    // Form State
    const [newQuote, setNewQuote] = useState({
        customerName: '',
        customerPhone: '',
        items: [{ name: '', price: 0, qty: 1, total: 0 }],
        taxPct: 5,
        discPct: 0,
        status: 'Draft'
    });

    const userRole = sessionStorage.getItem('fb_user_role');
    const userBranch = sessionStorage.getItem('fb_user_station') || 'Main Branch';
    const userBranchId = sessionStorage.getItem('fb_user_branch_id') || 'main';

    const accessibleQuotations = useMemo(() => {
        if (userRole === 'owner') return quotations;
        return quotations.filter(q => (q.branch_id === userBranchId) || (!q.branch_id && q.branch === userBranch));
    }, [quotations, userRole, userBranch, userBranchId]);

    const calculateTotals = (quote) => {
        const subtotal = quote.items.reduce((sum, item) => sum + (item.price * item.qty), 0);
        const discAmount = subtotal * (quote.discPct / 100);
        const taxAmount = (subtotal - discAmount) * (quote.taxPct / 100);
        const grandTotal = subtotal - discAmount + taxAmount;
        return { subtotal, discAmount, taxAmount, grandTotal };
    };

    const handleAddItem = () => {
        setNewQuote({
            ...newQuote,
            items: [...newQuote.items, { name: '', price: 0, qty: 1, total: 0 }]
        });
    };

    const handleRemoveItem = (index) => {
        const items = [...newQuote.items];
        items.splice(index, 1);
        setNewQuote({ ...newQuote, items });
    };

    const handleItemChange = (index, field, value) => {
        const items = [...newQuote.items];
        const item = { ...items[index], [field]: value };

        if (field === 'price' || field === 'qty') {
            item.total = (Number(item.price) || 0) * (Number(item.qty) || 0);
        }

        items[index] = item;
        setNewQuote({ ...newQuote, items });
    };

    const handleProductSelect = (index, productId) => {
        const product = products.find(p => p.id === productId);
        if (product) {
            handleItemChange(index, 'name', product.name);
            handleItemChange(index, 'price', product.price);
        }
    };

    const handleAddQuote = async () => {
        if (!newQuote.customerName) return showToast('Please enter Client Name', 'error');
        if (newQuote.items.some(it => !it.name || it.price <= 0)) return showToast('Please fill item details correctly', 'error');

        try {
            const { subtotal, discAmount, taxAmount, grandTotal } = calculateTotals(newQuote);
            await addDocument({
                ...newQuote,
                subtotal,
                discAmount,
                taxAmount,
                grandTotal,
                date: new Date().toISOString(),
                branch: userBranch,
                branch_id: userBranchId
            });
            setShowModal(false);
            setNewQuote({ customerName: '', customerPhone: '', items: [{ name: '', price: 0, qty: 1, total: 0 }], taxPct: 5, discPct: 0, status: 'Draft' });
            showToast('Quotation saved successfully!', 'success');
        } catch (error) {
            showToast('Error saving quotation: ' + error.message, 'error');
        }
    };

    const handleDelete = async (id) => {
        try {
            await deleteDocument(id);
            showToast('Quotation deleted successfully', 'success');
        } catch (error) {
            showToast('Error deleting quotation: ' + error.message, 'error');
        }
    };

    /**
     * Exports all visible quotations to an Excel-compatible CSV file.
     * Pure JS — no external library required.
     */
    const exportToExcel = () => {
        if (accessibleQuotations.length === 0) {
            showToast('No quotations to export', 'error');
            return;
        }

        const rows = accessibleQuotations.map(q => ({
            'Client Name':   q.customerName || '',
            'Phone':         q.customerPhone || '',
            'Date':          q.date ? new Date(q.date).toLocaleDateString() : '',
            'Items Count':   q.items?.length || 0,
            'Items Detail':  q.items?.map(i => `${i.name}(x${i.qty})`).join(' | ') || '',
            'Subtotal (Rs)': q.subtotal?.toFixed(2) || '0.00',
            'Discount (Rs)': q.discAmount?.toFixed(2) || '0.00',
            'Tax (Rs)':      q.taxAmount?.toFixed(2) || '0.00',
            'Grand Total (Rs)': q.grandTotal?.toFixed(2) || '0.00',
            'Status':        q.status || 'Draft',
            'Branch':        q.branch || '',
        }));

        const escapeCell = (val) => {
            const str = String(val);
            return str.includes(',') || str.includes('"') || str.includes('\n')
                ? `"${str.replace(/"/g, '""')}"`
                : str;
        };

        const header = Object.keys(rows[0]).map(escapeCell).join(',');
        const body   = rows.map(row => Object.values(row).map(escapeCell).join(',')).join('\n');
        const csvContent = header + '\n' + body;

        const blob = new Blob([csvContent], { type: 'application/vnd.ms-excel;charset=utf-8;' });
        const url  = URL.createObjectURL(blob);
        const a    = document.createElement('a');
        a.href     = url;
        a.download = `Quotations_${new Date().toISOString().split('T')[0]}.xls`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        showToast(`Exported ${rows.length} quotation(s) to Excel!`, 'success');
    };

    const totals = calculateTotals(newQuote);

    return (
        <div className="page active" id="page-quotations">
            <div className="pg-header">
                <div>
                    <div className="pg-title">💬 Quotations</div>
                    <div className="pg-sub">Estimate price for customers</div>
                </div>
                <div className="pg-actions" style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                    <button
                        onClick={exportToExcel}
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            background: 'linear-gradient(135deg, #22c55e, #16a34a)',
                            color: 'white',
                            fontWeight: 800,
                            borderRadius: '12px',
                            padding: '0.6rem 1.25rem',
                            border: 'none',
                            cursor: 'pointer',
                            fontSize: '0.9rem',
                            boxShadow: '0 4px 12px rgba(34,197,94,0.35)',
                            transition: '0.2s',
                            letterSpacing: '0.01em'
                        }}
                        onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-1px)'}
                        onMouseLeave={e => e.currentTarget.style.transform = 'translateY(0)'}
                    >
                        <img src="https://img.icons8.com/color/20/microsoft-excel-2019--v1.png" alt="Excel" style={{ width: '20px', height: '20px' }} />
                        Export to Excel
                    </button>
                    <button className="btn btn-primary" onClick={() => setShowModal(true)}>+ New Quote</button>
                </div>
            </div>

            <div className="table-card">
                <div className="tc-header">
                    <span className="tc-title">All Quotations</span>
                </div>
                <table className="data-table">
                    <thead>
                        <tr>
                            <th>Client</th>
                            <th>Date</th>
                            <th>Items</th>
                            <th>Total</th>
                            <th>Status</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading ? (
                            <tr><td colSpan="6" style={{ textAlign: 'center' }}>Loading...</td></tr>
                        ) : accessibleQuotations.length === 0 ? (
                            <tr>
                                <td colSpan="6">
                                    <div className="empty-state">
                                        <div className="es-sub">No quotations created.</div>
                                    </div>
                                </td>
                            </tr>
                        ) : (
                            accessibleQuotations.map(q => (
                                <tr key={q.id}>
                                    <td>
                                        <div style={{ fontWeight: 600 }}>{q.customerName}</div>
                                        <div style={{ fontSize: '0.75rem', opacity: 0.7 }}>{q.customerPhone}</div>
                                    </td>
                                    <td>{new Date(q.date).toLocaleDateString()}</td>
                                    <td>{q.items.length} items</td>
                                    <td style={{ fontWeight: 700 }}>₹{q.grandTotal?.toFixed(2)}</td>
                                    <td>
                                        <span className={`status-badge ${q.status === 'Draft' ? 'st-pending' : 'st-active'}`}>
                                            {q.status}
                                        </span>
                                    </td>
                                    <td>
                                        <button
                                            className="btn btn-ghost btn-danger btn-sm"
                                            title="Delete Quotation"
                                            onClick={() => handleDelete(q.id)}
                                        >
                                            🗑
                                        </button>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {/* New Quote Modal */}
            {showModal && (
                <div className="modal-overlay" style={{
                    position: 'fixed', top: 0, left: 0, width: '100%', height: '100%',
                    background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000
                }}>
                    <div className="modal-content" style={{
                        background: 'var(--bg)', padding: '2rem', borderRadius: '12px', width: '90%', maxWidth: '800px',
                        maxHeight: '90vh', overflowY: 'auto', border: '1px solid var(--border)', boxShadow: '0 20px 40px rgba(0,0,0,0.2)'
                    }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
                            <h2 style={{ fontFamily: "'Yeseva One', serif" }}>Create New Quotation</h2>
                            <button className="btn btn-ghost" onClick={() => setShowModal(false)}>✕</button>
                        </div>

                        <div className="f-row2" style={{ marginBottom: '1.5rem' }}>
                            <div className="f-group">
                                <label>Client Name *</label>
                                <input type="text" value={newQuote.customerName} onChange={e => setNewQuote({ ...newQuote, customerName: e.target.value })} />
                            </div>
                            <div className="f-group">
                                <label>Phone Number</label>
                                <input type="text" value={newQuote.customerPhone} onChange={e => setNewQuote({ ...newQuote, customerPhone: e.target.value })} />
                            </div>
                        </div>

                        <div style={{ marginBottom: '1.5rem' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                                <label style={{ fontWeight: 600 }}>Items</label>
                                <button className="btn btn-sm" onClick={handleAddItem}>+ Add Item</button>
                            </div>
                            {newQuote.items.map((item, idx) => (
                                <div key={idx} style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr 0.8fr 0.8fr 1fr 40px', gap: '10px', marginBottom: '8px', alignItems: 'center' }}>
                                    <select
                                        style={{ fontSize: '0.8rem' }}
                                        onChange={(e) => handleProductSelect(idx, e.target.value)}
                                        defaultValue=""
                                    >
                                        <option value="" disabled>Select Product</option>
                                        {products.map(p => (
                                            <option key={p.id} value={p.id}>{p.name}</option>
                                        ))}
                                    </select>
                                    <input placeholder="Item name" value={item.name} onChange={e => handleItemChange(idx, 'name', e.target.value)} />
                                    <input type="number" placeholder="Price" value={item.price} onChange={e => handleItemChange(idx, 'price', e.target.value)} />
                                    <input type="number" placeholder="Qty" value={item.qty} onChange={e => handleItemChange(idx, 'qty', e.target.value)} />
                                    <div style={{ background: 'var(--panel)', padding: '8px', borderRadius: '4px', fontSize: '0.8rem', textAlign: 'right', border: '1px solid var(--border)' }}>₹{item.total.toFixed(2)}</div>
                                    <button className="btn btn-ghost" style={{ color: 'var(--red)', padding: 0, border: 'none' }} onClick={() => handleRemoveItem(idx)}>✕</button>
                                </div>
                            ))}
                        </div>

                        <div className="f-row2" style={{ marginBottom: '1.5rem' }}>
                            <div className="f-group">
                                <label>Tax (%)</label>
                                <input type="number" value={newQuote.taxPct} onChange={e => setNewQuote({ ...newQuote, taxPct: Number(e.target.value) })} />
                            </div>
                            <div className="f-group">
                                <label>Discount (%)</label>
                                <input type="number" value={newQuote.discPct} onChange={e => setNewQuote({ ...newQuote, discPct: Number(e.target.value) })} />
                            </div>
                        </div>

                        <div style={{ background: 'var(--panel)', padding: '1rem', borderRadius: '8px', marginBottom: '1.5rem', border: '1px solid var(--border)' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                                <span>Subtotal:</span>
                                <span>₹{totals.subtotal.toFixed(2)}</span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem', color: 'var(--red)' }}>
                                <span>Discount ({newQuote.discPct}%):</span>
                                <span>-₹{totals.discAmount.toFixed(2)}</span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                                <span>Tax ({newQuote.taxPct}%):</span>
                                <span>₹{totals.taxAmount.toFixed(2)}</span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 800, fontSize: '1.2rem', marginTop: '0.5rem', borderTop: '1px solid var(--border)', paddingTop: '0.5rem' }}>
                                <span>Grand Total:</span>
                                <span>₹{totals.grandTotal.toFixed(2)}</span>
                            </div>
                        </div>

                        <button className="btn btn-primary" style={{ width: '100%' }} onClick={handleAddQuote}>Save Quotation</button>
                    </div>
                </div>
            )}
        </div>
    );
}
