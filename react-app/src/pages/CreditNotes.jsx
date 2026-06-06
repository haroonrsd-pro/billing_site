import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useFirestore } from '../hooks/useFirestore';
import { useMessaging } from '../context/MessagingContext';
import { syncCreditNotesExcel } from '../utils/excelService';

export default function CreditNotes() {
    const { showToast } = useMessaging();
    const location = useLocation();
    const { docs: creditNotes, loading, addDocument } = useFirestore('credit_notes');

    const [showModal, setShowModal] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Form State
    const [invoiceRef, setInvoiceRef] = useState('');
    const [customer, setCustomer] = useState('');
    const [originalAmount, setOriginalAmount] = useState('');
    const [creditAmount, setCreditAmount] = useState('');
    const [reason, setReason] = useState('');

    useEffect(() => {
        // If we navigated here from an invoice with state
        if (location.state && location.state.sourceInvoice) {
            const inv = location.state.sourceInvoice;
            setInvoiceRef(inv.id);
            setCustomer(inv.cust);
            setOriginalAmount(inv.amount);
            setShowModal(true);

            // Clear router state so refreshing doesn't re-trigger it
            window.history.replaceState({}, document.title);
        }
    }, [location]);

    const handleCreateCreditNote = async (e) => {
        e.preventDefault();
        setIsSubmitting(true);

        try {
            const cnData = {
                id: `CN-${Math.floor(Math.random() * 900000) + 100000}`, // Generate random CN ID
                invoiceRef,
                customer,
                originalAmount: Number(originalAmount),
                amount: Number(creditAmount),
                reason,
                date: new Date().toISOString().split('T')[0],
                timestamp: new Date(),
                branch: sessionStorage.getItem('fb_user_station') || 'Main Branch',
                branch_id: sessionStorage.getItem('fb_user_branch_id') || 'main'
            };

            await addDocument(cnData);

            // Close modal and reset form
            setShowModal(false);
            setInvoiceRef('');
            setCustomer('');
            setOriginalAmount('');
            setCreditAmount('');
            setReason('');
            showToast('Credit note issued successfully!', 'success');
        } catch (error) {
            console.error("Error creating credit note: ", error);
            showToast("Failed to create credit note. Please try again.", "error");
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="page active" id="page-credit-notes">
            <div className="pg-header">
                <div>
                    <div className="pg-title">↩️ Credit Notes</div>
                    <div className="pg-sub">Issue refunds or credit to customers</div>
                </div>
                <div className="pg-actions" style={{ display: 'flex', gap: '1rem' }}>
                    <button 
                        className="btn" 
                        onClick={() => syncCreditNotesExcel()}
                        style={{ background: '#10b981', color: 'white', padding: '0.8rem 1.6rem', borderRadius: '12px', fontWeight: 700, border: 'none', boxShadow: '0 4px 12px rgba(16, 185, 129, 0.25)', cursor: 'pointer' }}
                    >
                        📊 Export to Excel
                    </button>
                    <button className="btn btn-primary" onClick={() => setShowModal(true)}>+ New Credit Note</button>
                </div>
            </div>

            <div className="table-card">
                <div className="tc-header">
                    <span className="tc-title">Credit Note History</span>
                </div>
                <table className="data-table">
                    <thead>
                        <tr>
                            <th>CN #</th>
                            <th>Invoice Ref</th>
                            <th>Client</th>
                            <th>Date</th>
                            <th>Credit Amount</th>
                            <th>Reason</th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading && (
                            <tr><td colSpan="6" style={{ textAlign: 'center', padding: '1.5rem', color: '#f1f5f9' }}>Loading credit notes...</td></tr>
                        )}
                        {!loading && creditNotes.length === 0 ? (
                            <tr>
                                <td colSpan="6">
                                    <div className="empty-state">
                                        <div className="es-sub">No credit notes issued.</div>
                                    </div>
                                </td>
                            </tr>
                        ) : (
                            !loading && creditNotes.filter(cn => {
                                const userRole = sessionStorage.getItem('fb_user_role');
                                const userBranch = sessionStorage.getItem('fb_user_station') || 'Main Branch';
                                const userBranchId = sessionStorage.getItem('fb_user_branch_id') || 'main';
                                return userRole === 'owner' || (cn.branch_id === userBranchId) || (!cn.branch_id && cn.branch === userBranch);
                            }).map(cn => (
                                <tr key={cn.id}>
                                    <td style={{ fontWeight: 700, color: 'var(--accent)' }}>{cn.id}</td>
                                    <td>{cn.invoiceRef}</td>
                                    <td>{cn.customer}</td>
                                    <td>{cn.date}</td>
                                    <td style={{ fontWeight: 700, color: 'var(--red)' }}>-₹{cn.amount?.toLocaleString()}</td>
                                    <td style={{ color: '#f1f5f9' }}>{cn.reason}</td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {/* Modal for New Credit Note */}
            {showModal && (
                <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(10, 7, 5, 0.8)', backdropFilter: 'blur(5px)', zIndex: 9999, display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '1rem' }}>
                    <div style={{ background: '#1c140e', borderRadius: '24px', width: '100%', maxWidth: '500px', border: '1px solid rgba(255, 255, 255, 0.05)', boxShadow: '0 25px 50px rgba(0,0,0,0.5)', overflow: 'hidden' }}>

                        <div style={{ padding: '1.5rem 2rem', borderBottom: '1px solid rgba(255, 255, 255, 0.05)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255, 255, 255, 0.02)' }}>
                            <div>
                                <h3 style={{ margin: 0, color: '#fff', fontSize: '1.25rem', fontFamily: 'Yeseva One, serif' }}>Issue Credit Note</h3>
                                <p style={{ margin: 0, color: '#f1f5f9', opacity: 0.8, fontSize: '0.85rem', marginTop: '4px' }}>Process refund or adjustment</p>
                            </div>
                            <button onClick={() => setShowModal(false)} style={{ background: 'none', border: 'none', color: '#f1f5f9', fontSize: '1.5rem', cursor: 'pointer' }}>✕</button>
                        </div>

                        <form onSubmit={handleCreateCreditNote} style={{ padding: '2rem' }}>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.5rem' }}>
                                <div>
                                    <label style={{ display: 'block', marginBottom: '0.5rem', color: '#f1f5f9', fontSize: '0.85rem' }}>Invoice Reference</label>
                                    <input
                                        type="text"
                                        value={invoiceRef}
                                        onChange={(e) => setInvoiceRef(e.target.value)}
                                        required
                                        style={{ width: '100%', padding: '0.75rem 1rem', background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', color: '#fff' }}
                                        placeholder="INV-XXXXX"
                                    />
                                </div>
                                <div>
                                    <label style={{ display: 'block', marginBottom: '0.5rem', color: '#f1f5f9', fontSize: '0.85rem' }}>Original Amount (₹)</label>
                                    <input
                                        type="number"
                                        value={originalAmount}
                                        onChange={(e) => setOriginalAmount(e.target.value)}
                                        style={{ width: '100%', padding: '0.75rem 1rem', background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', color: '#fff' }}
                                        placeholder="0.00"
                                    />
                                </div>
                            </div>

                            <div style={{ marginBottom: '1.5rem' }}>
                                <label style={{ display: 'block', marginBottom: '0.5rem', color: '#f1f5f9', fontSize: '0.85rem' }}>Client Name</label>
                                <input
                                    type="text"
                                    value={customer}
                                    onChange={(e) => setCustomer(e.target.value)}
                                    required
                                    style={{ width: '100%', padding: '0.75rem 1rem', background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', color: '#fff' }}
                                    placeholder="Enter customer name"
                                />
                            </div>

                            <div style={{ marginBottom: '1.5rem' }}>
                                <label style={{ display: 'block', marginBottom: '0.5rem', color: '#f1f5f9', fontSize: '0.85rem' }}>Credit Amount (₹)</label>
                                <input
                                    type="number"
                                    value={creditAmount}
                                    onChange={(e) => setCreditAmount(e.target.value)}
                                    required
                                    style={{ width: '100%', padding: '0.75rem 1rem', background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)', borderRadius: '12px', color: 'var(--red)', fontWeight: 'bold' }}
                                    placeholder="0.00"
                                />
                            </div>

                            <div style={{ marginBottom: '2rem' }}>
                                <label style={{ display: 'block', marginBottom: '0.5rem', color: '#f1f5f9', fontSize: '0.85rem' }}>Reason for Credit</label>
                                <textarea
                                    value={reason}
                                    onChange={(e) => setReason(e.target.value)}
                                    required
                                    rows="3"
                                    style={{ width: '100%', padding: '0.75rem 1rem', background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', color: '#fff', resize: 'vertical' }}
                                    placeholder="e.g. Return of items, overcharge, discount applied after billing"
                                ></textarea>
                            </div>

                            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
                                <button type="button" onClick={() => setShowModal(false)} className="btn" style={{ background: 'transparent', border: '1px solid rgba(255,255,255,0.1)', color: '#fff' }}>Cancel</button>
                                <button type="submit" disabled={isSubmitting} className="btn" style={{ background: 'var(--red)', color: '#fff', border: 'none', fontWeight: 600 }}>
                                    {isSubmitting ? 'Processing...' : 'Issue Credit Note'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
