import React, { useState, useMemo } from 'react';
import { useFirestore } from '../hooks/useFirestore';
import { useMessaging } from '../context/MessagingContext';
import { syncPurchasesExcel } from '../utils/excelService';

export default function Purchases() {
    const { showToast } = useMessaging();
    const { docs: allPurchases, loading, error, addDocument } = useFirestore('purchases');
    const [showAddForm, setShowAddForm] = useState(false);

    const userRole = sessionStorage.getItem('fb_user_role') || 'admin';
    const userBranch = sessionStorage.getItem('fb_user_station') || 'Main Branch';
    const userBranchId = sessionStorage.getItem('fb_user_branch_id') || 'main';

    const purchases = useMemo(() => {
        if (userRole === 'owner') return allPurchases;
        return allPurchases.filter(p => (p.branch_id === userBranchId) || (!p.branch_id && p.branch === userBranch));
    }, [allPurchases, userRole, userBranch, userBranchId]);

    // Add Form State
    const [newPurchase, setNewPurchase] = useState({
        vendor: '',
        billNo: '',
        date: '',
        amount: '',
        status: 'Paid'
    });

    // Derived Stats
    const stats = useMemo(() => {
        let totalAmt = 0;
        const uniqueVendors = new Set();

        purchases.forEach(p => {
            totalAmt += p.amount;
            uniqueVendors.add(p.vendor);
        });

        return {
            totalAmount: totalAmt,
            vendorCount: uniqueVendors.size
        };
    }, [purchases]);

    const handleAddPurchase = async () => {
        if (!newPurchase.vendor || !newPurchase.date || newPurchase.amount === '') {
            showToast('Please fill required fields: Vendor Name, Date, Amount', 'error');
            return;
        }

        const purchase = {
            vendor: newPurchase.vendor,
            billNo: newPurchase.billNo,
            date: newPurchase.date,
            amount: parseFloat(newPurchase.amount) || 0,
            status: newPurchase.status,
            branch: userBranch,
            branch_id: userBranchId
        };

        try {
            await addDocument(purchase);
            setShowAddForm(false);
            setNewPurchase({ vendor: '', billNo: '', date: '', amount: '', status: 'Paid' });
            showToast('Purchase added successfully!', 'success');
        } catch (err) {
            showToast(`Error adding purchase: ${err.message}`, 'error');
        }
    };

    if (loading) {
        return <div className="page active" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>Loading Purchases...</div>;
    }

    if (error) {
        return <div className="page active" style={{ color: 'red', padding: '2rem' }}>Error loading purchases: {error}</div>;
    }

    return (
        <div className="page active" id="page-purchases">
            <div className="pg-header">
                <div>
                    <div className="pg-title">🛒 Purchases</div>
                    <div className="pg-sub">Track raw material and vendor bills</div>
                </div>
                <div className="pg-actions" style={{ display: 'flex', gap: '1rem' }}>
                    <button 
                        className="btn" 
                        onClick={() => syncPurchasesExcel()}
                        style={{ background: '#10b981', color: 'white', padding: '0.8rem 1.6rem', borderRadius: '12px', fontWeight: 700, border: 'none', boxShadow: '0 4px 12px rgba(16, 185, 129, 0.25)', cursor: 'pointer' }}
                    >
                        📊 Export to Excel
                    </button>
                    <button className="btn btn-primary" onClick={() => setShowAddForm(true)}>
                        + Add Purchase
                    </button>
                </div>
            </div>

            {/* Add Purchase Form */}
            {showAddForm && (
                <div className="form-card" style={{ marginBottom: '1.25rem' }}>
                    <h3>🛒 Record New Purchase</h3>
                    <div className="f-row3">
                        <div className="f-group">
                            <label>Vendor Name *</label>
                            <input
                                type="text"
                                placeholder="Vendor name"
                                value={newPurchase.vendor}
                                onChange={e => setNewPurchase({ ...newPurchase, vendor: e.target.value })}
                            />
                        </div>
                        <div className="f-group">
                            <label>Bill Number</label>
                            <input
                                type="text"
                                placeholder="e.g. BILL-001"
                                value={newPurchase.billNo}
                                onChange={e => setNewPurchase({ ...newPurchase, billNo: e.target.value })}
                            />
                        </div>
                        <div className="f-group">
                            <label>Date *</label>
                            <input
                                type="date"
                                value={newPurchase.date}
                                onChange={e => setNewPurchase({ ...newPurchase, date: e.target.value })}
                            />
                        </div>
                    </div>
                    <div className="f-row2">
                        <div className="f-group">
                            <label>Total Amount ₹ *</label>
                            <input
                                type="number"
                                placeholder="0.00"
                                value={newPurchase.amount}
                                onChange={e => setNewPurchase({ ...newPurchase, amount: e.target.value })}
                            />
                        </div>
                        <div className="f-group">
                            <label>Status</label>
                            <select
                                value={newPurchase.status}
                                onChange={e => setNewPurchase({ ...newPurchase, status: e.target.value })}
                            >
                                <option value="Paid">Paid</option>
                                <option value="Pending">Pending</option>
                            </select>
                        </div>
                    </div>
                    <div style={{ display: 'flex', gap: '.6rem', justifyContent: 'flex-end', marginTop: '1rem' }}>
                        <button className="btn btn-outline btn-sm" onClick={() => setShowAddForm(false)}>Cancel</button>
                        <button className="btn btn-primary btn-sm" onClick={handleAddPurchase}>Record Purchase</button>
                    </div>
                </div>
            )}

            {/* Stats Grid */}
            <div className="stats-grid">
                <div className="stat-card">
                    <div className="sc-icon" style={{ background: '#fff0e6' }}>🛒</div>
                    <div>
                        <div className="sc-val" style={{ color: 'var(--accent)' }}>₹{stats.totalAmount.toLocaleString()}</div>
                        <div className="sc-lbl">Total Purchases</div>
                    </div>
                </div>
                <div className="stat-card">
                    <div className="sc-icon" style={{ background: '#edf7f2' }}>🤝</div>
                    <div>
                        <div className="sc-val" style={{ color: 'var(--green)' }}>{stats.vendorCount}</div>
                        <div className="sc-lbl">Active Vendors</div>
                    </div>
                </div>
            </div>

            {/* Data Table */}
            <div className="table-card">
                <div className="tc-header">
                    <span className="tc-title">Recent Purchases</span>
                </div>
                <table className="data-table">
                    <thead>
                        <tr>
                            <th>Inv #</th>
                            <th>Vendor</th>
                            <th>Date</th>
                            <th>Amount</th>
                            <th>Status</th>
                        </tr>
                    </thead>
                    <tbody>
                        {purchases.length === 0 ? (
                            <tr>
                                <td colSpan="5">
                                    <div className="empty-state">
                                        <div className="es-sub">No purchase records found.</div>
                                    </div>
                                </td>
                            </tr>
                        ) : (
                            purchases.filter(p => {
                                const userRole = sessionStorage.getItem('fb_user_role');
                                const userBranch = sessionStorage.getItem('fb_user_station') || 'Main Branch';
                                return userRole === 'owner' || (p.branch || 'Main Branch') === userBranch;
                            }).map(p => (
                                <tr key={p.id}>
                                    <td>{p.billNo || '-'}</td>
                                    <td style={{ fontWeight: 600 }}>{p.vendor}</td>
                                    <td>{p.date}</td>
                                    <td style={{ fontWeight: 700 }}>₹{p.amount.toLocaleString()}</td>
                                    <td>
                                        <span className={`status-badge ${p.status.toLowerCase()}`}>
                                            {p.status}
                                        </span>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
