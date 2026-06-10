import React, { useState, useEffect } from 'react';
import { db } from '../firebaseConfig';
import { collection, doc, setDoc, deleteDoc, updateDoc, onSnapshot, query, serverTimestamp } from 'firebase/firestore';
import { useMessaging } from '../context/MessagingContext';
import { QrCode, Plus, Trash2, Printer, Download, Eye, X, Edit, Users, RefreshCw } from 'lucide-react';
import QRCode from 'qrcode';

export default function TableManagement() {
    const { showToast, showConfirm } = useMessaging();
    const ownerId = sessionStorage.getItem('fb_user_owner_id') || sessionStorage.getItem('fb_user_uid');
    const branchId = sessionStorage.getItem('fb_user_branch_id') || 'main';
    const branchName = sessionStorage.getItem('fb_user_station') || 'Main Branch';

    const [tables, setTables] = useState([]);
    const [loading, setLoading] = useState(true);
    const [qrUrls, setQrUrls] = useState({});
    
    // Scan Base URL for local testing & domain customization
    const [qrBaseUrl, setQrBaseUrl] = useState(() => {
        return localStorage.getItem('qr_scan_base_url') || window.location.origin;
    });
    
    // Modals & Forms State
    const [showAddModal, setShowAddModal] = useState(false);
    const [editingTable, setEditingTable] = useState(null);
    const [formData, setFormData] = useState({ name: '', number: '', capacity: 4 });
    const [selectedTableQR, setSelectedTableQR] = useState(null);

    // Direct Firestore Reference
    const tablesColPath = `owners/${ownerId}/branches/${branchId}/tables`;

    useEffect(() => {
        if (!ownerId) return;
        const q = query(collection(db, tablesColPath));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const list = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setTables(list.sort((a, b) => (a.number || 0) - (b.number || 0)));
            setLoading(false);
        }, (err) => {
            console.error("Firestore tables error:", err);
            showToast("Failed to fetch tables list.", "error");
            setLoading(false);
        });

        return unsubscribe;
    }, [ownerId, branchId]);

    // Generate QR Data URL dynamically when tables list updates
    useEffect(() => {
        tables.forEach(async (table) => {
            if (!qrUrls[table.id]) {
                try {
                    // Embed custom base URL to support mobile Wi-Fi / production domain QR scanning
                    const targetUrl = table.qrUrl 
                        ? table.qrUrl.replace(window.location.origin, qrBaseUrl)
                        : `${qrBaseUrl}/#/menu/${ownerId}/${branchId}/${table.id}`;

                    const url = await QRCode.toDataURL(targetUrl, {
                        width: 400,
                        margin: 2,
                        color: {
                            dark: '#0f172a',
                            light: '#ffffff'
                        }
                    });
                    setQrUrls(prev => ({ ...prev, [table.id]: url }));
                } catch (err) {
                    console.error("QR Code generation error:", err);
                }
            }
        });
    }, [tables, ownerId, branchId, qrBaseUrl]);

    const handleOpenAdd = () => {
        const nextNumber = tables.length > 0 ? Math.max(...tables.map(t => t.number || 0)) + 1 : 1;
        setFormData({ name: `Table ${nextNumber}`, number: nextNumber, capacity: 4 });
        setEditingTable(null);
        setShowAddModal(true);
    };

    const handleOpenEdit = (table) => {
        setFormData({ name: table.name, number: table.number, capacity: table.capacity || 4 });
        setEditingTable(table);
        setShowAddModal(true);
    };

    const handleSaveTable = async (e) => {
        e.preventDefault();
        const { name, number, capacity } = formData;
        if (!name || !number) return showToast("Name and Number are required", "error");

        const tableId = editingTable ? editingTable.id : `T${number}`;
        const docRef = doc(db, tablesColPath, tableId);
        
        const qrUrl = `${qrBaseUrl}/#/menu/${ownerId}/${branchId}/${tableId}`;

        const payload = {
            id: tableId,
            name,
            number: parseInt(number),
            capacity: parseInt(capacity),
            status: editingTable ? editingTable.status : 'available',
            qrUrl,
            updatedAt: serverTimestamp()
        };

        if (!editingTable) {
            payload.createdAt = serverTimestamp();
        }

        try {
            await setDoc(docRef, payload, { merge: true });
            showToast(editingTable ? "Table updated successfully!" : "New table added successfully!", "success");
            setShowAddModal(false);
            // Invalidate cached QR code to trigger re-generation
            if (qrUrls[tableId]) {
                const updatedQrs = { ...qrUrls };
                delete updatedQrs[tableId];
                setQrUrls(updatedQrs);
            }
        } catch (err) {
            showToast("Failed to save table: " + err.message, "error");
        }
    };

    const handleDeleteTable = (table) => {
        showConfirm({
            title: "Delete Table",
            message: `Are you sure you want to delete ${table.name}? This will invalidate its QR code.`,
            onConfirm: async () => {
                try {
                    await deleteDoc(doc(db, tablesColPath, table.id));
                    showToast("Table deleted successfully.", "success");
                } catch (err) {
                    showToast("Failed to delete table.", "error");
                }
            }
        });
    };

    const handleToggleStatus = async (table) => {
        const newStatus = table.status === 'occupied' ? 'available' : 'occupied';
        try {
            await updateDoc(doc(db, tablesColPath, table.id), { status: newStatus });
            showToast(`${table.name} is now marked as ${newStatus}.`, "success");
        } catch (err) {
            showToast("Failed to update status.", "error");
        }
    };

    const handlePrintQR = (table, qrDataUrl) => {
        const win = window.open("", "_blank");
        win.document.write(`
            <html>
                <head>
                    <title>Print QR - ${table.name}</title>
                    <style>
                        body {
                            font-family: 'Inter', sans-serif;
                            display: flex;
                            flex-direction: column;
                            align-items: center;
                            justify-content: center;
                            height: 100vh;
                            margin: 0;
                            background-color: #ffffff;
                            color: #0f172a;
                        }
                        .container {
                            border: 3px solid #0f172a;
                            border-radius: 24px;
                            padding: 2.5rem;
                            text-align: center;
                            max-width: 320px;
                            box-shadow: 0 10px 25px rgba(0,0,0,0.05);
                        }
                        h1 {
                            font-size: 1.8rem;
                            margin: 0 0 0.5rem;
                            font-weight: 800;
                            letter-spacing: -0.5px;
                        }
                        p {
                            font-size: 0.9rem;
                            color: #64748b;
                            margin: 0 0 1.5rem;
                            font-weight: 500;
                        }
                        .qr-image {
                            width: 240px;
                            height: 240px;
                            margin-bottom: 1.5rem;
                        }
                        .footer-text {
                            font-size: 0.75rem;
                            color: #94a3b8;
                            text-transform: uppercase;
                            letter-spacing: 1px;
                            font-weight: 700;
                        }
                    </style>
                </head>
                <body>
                    <div class="container">
                        <h1>Scan to Order</h1>
                        <p>${branchName} &bull; ${table.name}</p>
                        <img class="qr-image" src="${qrDataUrl}" alt="QR Code" />
                        <div class="footer-text">Powered by FoodBill PRO</div>
                    </div>
                    <script>
                        window.onload = function() {
                            window.print();
                            setTimeout(function() { window.close(); }, 500);
                        };
                    </script>
                </body>
            </html>
        `);
        win.document.close();
    };

    const handleDownloadQR = (table, qrDataUrl) => {
        const link = document.createElement('a');
        link.href = qrDataUrl;
        link.download = `${branchName.replace(/\s+/g, '_')}_${table.name.replace(/\s+/g, '_')}_QR.png`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    if (loading) {
        return (
            <div className="page active" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
                <div style={{ color: '#64748b', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <RefreshCw className="animate-spin" size={20} />
                    <span>LOADING TABLE DATABASE...</span>
                </div>
            </div>
        );
    }

    return (
        <div className="page active" id="page-table-management" style={{ background: '#f8fafc', minHeight: '100vh', padding: '1rem' }}>
            {/* Header */}
            <div className="pg-header" style={{ marginBottom: '2.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
                <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
                        <span style={{ fontSize: '2rem' }}>🍽️</span>
                        <h1 style={{ margin: 0, fontFamily: "'Yeseva One', serif", fontSize: '2.2rem', color: '#0f172a' }}>
                            Table <span style={{ color: '#e85d04' }}>Management</span>
                        </h1>
                    </div>
                    <p style={{ color: '#64748b', fontSize: '1rem', fontWeight: 500, margin: 0 }}>
                        Configure dining tables and auto-generate Scan-to-Order QR codes for <strong>{branchName}</strong>.
                    </p>
                </div>
                <button 
                    onClick={handleOpenAdd}
                    className="btn btn-primary" 
                    style={{ 
                        padding: '0.8rem 1.6rem', 
                        borderRadius: '12px', 
                        background: '#e85d04', 
                        color: '#fff', 
                        border: 'none', 
                        fontWeight: 700, 
                        cursor: 'pointer',
                        display: 'flex', 
                        alignItems: 'center', 
                        gap: '0.5rem',
                        boxShadow: '0 4px 12px rgba(232, 93, 4, 0.2)'
                    }}
                >
                    <Plus size={18} /> Add Dining Table
                </button>
            </div>

            {/* Custom Scan Domain Configuration for Google Lens / Mobile Testing */}
            <div style={{ background: '#fff', padding: '1.25rem', borderRadius: '16px', border: '1px solid #e2e8f0', marginBottom: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.5rem', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
                <h3 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 800, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    🌐 QR Code Base URL Configuration
                </h3>
                <p style={{ margin: 0, fontSize: '0.8rem', color: '#64748b', fontWeight: 500 }}>
                    To scan QR codes with Google Lens/Camera on your physical mobile phone locally, change this from <strong>localhost</strong> to your computer's local Wi-Fi IP address (e.g., <code>http://192.168.1.5:5174</code>). Keep as default for production.
                </p>
                <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.25rem', flexWrap: 'wrap' }}>
                    <input 
                        type="text" 
                        value={qrBaseUrl}
                        onChange={(e) => {
                            const val = e.target.value;
                            setQrBaseUrl(val);
                            localStorage.setItem('qr_scan_base_url', val);
                            setQrUrls({}); // Force regeneration
                        }}
                        placeholder={`e.g. http://192.168.1.5:5174`}
                        style={{ flex: 1, minWidth: '240px', padding: '0.5rem 0.75rem', borderRadius: '8px', border: '1.5px solid #cbd5e1', fontSize: '0.85rem', outline: 'none' }}
                    />
                    <button 
                        onClick={() => {
                            setQrBaseUrl(window.location.origin);
                            localStorage.setItem('qr_scan_base_url', window.location.origin);
                            setQrUrls({}); // Reset
                            showToast("Reset base URL to window origin", "info");
                        }}
                        style={{ padding: '0.5rem 1rem', background: '#f1f5f9', border: 'none', borderRadius: '8px', color: '#475569', fontWeight: 700, fontSize: '0.8rem', cursor: 'pointer' }}
                    >
                        Use Default Origin
                    </button>
                </div>
            </div>

            {/* Stats */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1.5rem', marginBottom: '2.5rem' }}>
                <div style={{ background: '#fff', padding: '1.5rem', borderRadius: '20px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.02)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                        <div style={{ background: 'rgba(232, 93, 4, 0.1)', width: '48px', height: '48px', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContext: 'center', fontSize: '1.25rem', paddingLeft: '0.75rem', paddingTop: '0.75rem', boxSizing: 'border-box' }}>🍽️</div>
                        <div>
                            <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#0f172a', lineHeight: 1 }}>{tables.length}</div>
                            <div style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 700, marginTop: '0.2rem' }}>Total Tables</div>
                        </div>
                    </div>
                </div>
                <div style={{ background: '#fff', padding: '1.5rem', borderRadius: '20px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.02)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                        <div style={{ background: 'rgba(34, 197, 94, 0.1)', width: '48px', height: '48px', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContext: 'center', fontSize: '1.25rem', paddingLeft: '0.75rem', paddingTop: '0.75rem', boxSizing: 'border-box' }}>🟢</div>
                        <div>
                            <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#22c55e', lineHeight: 1 }}>{tables.filter(t => t.status !== 'occupied').length}</div>
                            <div style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 700, marginTop: '0.2rem' }}>Available</div>
                        </div>
                    </div>
                </div>
                <div style={{ background: '#fff', padding: '1.5rem', borderRadius: '20px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.02)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                        <div style={{ background: 'rgba(239, 68, 68, 0.1)', width: '48px', height: '48px', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContext: 'center', fontSize: '1.25rem', paddingLeft: '0.75rem', paddingTop: '0.75rem', boxSizing: 'border-box' }}>🔴</div>
                        <div>
                            <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#ef4444', lineHeight: 1 }}>{tables.filter(t => t.status === 'occupied').length}</div>
                            <div style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 700, marginTop: '0.2rem' }}>Occupied</div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Tables Grid */}
            {tables.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '5rem 2rem', background: '#fff', borderRadius: '24px', border: '1px solid #e2e8f0' }}>
                    <QrCode size={48} style={{ color: '#94a3b8', marginBottom: '1rem' }} />
                    <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#0f172a', marginBottom: '0.5rem' }}>No Tables Configured</h3>
                    <p style={{ color: '#64748b', fontSize: '0.9rem', marginBottom: '1.5rem' }}>Get started by adding your first dining table QR code.</p>
                    <button onClick={handleOpenAdd} style={{ padding: '0.6rem 1.2rem', background: '#e85d04', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: 700, cursor: 'pointer' }}>Add Table</button>
                </div>
            ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1.5rem' }}>
                    {tables.map(table => {
                        const qrDataUrl = qrUrls[table.id];
                        return (
                            <div 
                                key={table.id} 
                                style={{ 
                                    background: '#fff', 
                                    borderRadius: '24px', 
                                    padding: '1.5rem', 
                                    border: '1px solid #e2e8f0', 
                                    boxShadow: '0 4px 6px -1px rgba(0,0,0,0.01)',
                                    display: 'flex', 
                                    flexDirection: 'column', 
                                    gap: '1rem',
                                    position: 'relative'
                                }}
                            >
                                {/* Table Status & Header */}
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                    <div>
                                        <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#0f172a', margin: 0 }}>{table.name}</h3>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#64748b', fontSize: '0.8rem', marginTop: '0.2rem', fontWeight: 600 }}>
                                            <Users size={14} />
                                            <span>Cap: {table.capacity || 4} seats</span>
                                        </div>
                                    </div>
                                    <span 
                                        onClick={() => handleToggleStatus(table)}
                                        style={{ 
                                            fontSize: '0.7rem', 
                                            fontWeight: 800, 
                                            padding: '0.3rem 0.6rem', 
                                            borderRadius: '100px', 
                                            background: table.status === 'occupied' ? 'rgba(239, 68, 68, 0.1)' : 'rgba(34, 197, 94, 0.1)', 
                                            color: table.status === 'occupied' ? '#ef4444' : '#22c55e',
                                            cursor: 'pointer',
                                            textTransform: 'uppercase',
                                            border: '1px solid transparent'
                                        }}
                                    >
                                        {table.status || 'AVAILABLE'}
                                    </span>
                                </div>

                                {/* QR Code Thumbnail */}
                                <div style={{ background: '#f8fafc', borderRadius: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem', border: '1px dashed #e2e8f0', height: '140px' }}>
                                    {qrDataUrl ? (
                                        <div 
                                            onClick={() => setSelectedTableQR(table)}
                                            style={{ cursor: 'pointer', position: 'relative', display: 'flex', justifyContent: 'center' }}
                                            title="View QR Code"
                                        >
                                            <img src={qrDataUrl} alt="QR Thumbnail" style={{ width: '120px', height: '120px' }} />
                                            <div style={{ position: 'absolute', inset: 0, background: 'rgba(15, 23, 42, 0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '8px', opacity: 0, transition: 'opacity 0.2s', hover: { opacity: 1 } }}>
                                                <Eye size={20} color="#fff" />
                                            </div>
                                        </div>
                                    ) : (
                                        <div style={{ color: '#94a3b8', fontSize: '0.85rem', fontWeight: 600 }}>Generating QR...</div>
                                    )}
                                </div>

                                {/* Actions */}
                                <div style={{ display: 'flex', gap: '0.5rem', borderTop: '1px solid #f1f5f9', paddingTop: '1rem', marginTop: 'auto', flexWrap: 'wrap' }}>
                                    <a 
                                        href={table.qrUrl || `${qrBaseUrl}/#/menu/${ownerId}/${branchId}/${table.id}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        style={{ flex: '1 1 100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.3rem', padding: '0.5rem', background: 'rgba(232, 93, 4, 0.05)', border: '1px solid rgba(232, 93, 4, 0.15)', borderRadius: '8px', cursor: 'pointer', color: '#e85d04', fontWeight: 700, fontSize: '0.75rem', textDecoration: 'none', textAlign: 'center', marginBottom: '0.25rem' }}
                                    >
                                        🔗 Open Mobile Menu
                                    </a>
                                    <button 
                                        disabled={!qrDataUrl}
                                        onClick={() => handlePrintQR(table, qrDataUrl)}
                                        style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.3rem', padding: '0.5rem', background: '#f1f5f9', border: 'none', borderRadius: '8px', cursor: 'pointer', color: '#475569', fontWeight: 700, fontSize: '0.75rem' }}
                                    >
                                        <Printer size={14} /> Print
                                    </button>
                                    <button 
                                        disabled={!qrDataUrl}
                                        onClick={() => handleDownloadQR(table, qrDataUrl)}
                                        style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.3rem', padding: '0.5rem', background: '#f1f5f9', border: 'none', borderRadius: '8px', cursor: 'pointer', color: '#475569', fontWeight: 700, fontSize: '0.75rem' }}
                                    >
                                        <Download size={14} /> Save
                                    </button>
                                    <button 
                                        onClick={() => handleOpenEdit(table)}
                                        style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0.5rem 0.65rem', background: '#f1f5f9', border: 'none', borderRadius: '8px', cursor: 'pointer', color: '#475569' }}
                                    >
                                        <Edit size={14} />
                                    </button>
                                    <button 
                                        onClick={() => handleDeleteTable(table)}
                                        style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0.5rem 0.65rem', background: 'rgba(239, 68, 68, 0.05)', border: 'none', borderRadius: '8px', cursor: 'pointer', color: '#ef4444' }}
                                    >
                                        <Trash2 size={14} />
                                    </button>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Add/Edit Modal */}
            {showAddModal && (
                <div style={{ position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(15, 23, 42, 0.3)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
                    <div style={{ background: '#fff', width: '100%', maxWidth: '400px', borderRadius: '24px', border: '1px solid #e2e8f0', overflow: 'hidden', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)' }}>
                        <div style={{ padding: '1.5rem', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#0f172a', margin: 0 }}>
                                {editingTable ? 'Edit Table Settings' : 'Add Dining Table'}
                            </h2>
                            <button onClick={() => setShowAddModal(false)} style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer' }}>
                                <X size={20} />
                            </button>
                        </div>
                        <form onSubmit={handleSaveTable} style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                            <div>
                                <label style={{ fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase', color: '#64748b', display: 'block', marginBottom: '0.4rem' }}>Table Name</label>
                                <input 
                                    type="text" 
                                    required
                                    value={formData.name} 
                                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                                    style={{ width: '100%', padding: '0.75rem 1rem', borderRadius: '10px', border: '1.5px solid #e2e8f0', outline: 'none' }} 
                                    placeholder="e.g. Table 1"
                                />
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                <div>
                                    <label style={{ fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase', color: '#64748b', display: 'block', marginBottom: '0.4rem' }}>Table Number</label>
                                    <input 
                                        type="number" 
                                        required
                                        disabled={!!editingTable}
                                        value={formData.number} 
                                        onChange={e => setFormData({ ...formData, number: e.target.value })}
                                        style={{ width: '100%', padding: '0.75rem 1rem', borderRadius: '10px', border: '1.5px solid #e2e8f0', outline: 'none', background: editingTable ? '#f8fafc' : '#fff' }} 
                                        placeholder="1"
                                    />
                                </div>
                                <div>
                                    <label style={{ fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase', color: '#64748b', display: 'block', marginBottom: '0.4rem' }}>Seats Capacity</label>
                                    <input 
                                        type="number" 
                                        required
                                        value={formData.capacity} 
                                        onChange={e => setFormData({ ...formData, capacity: e.target.value })}
                                        style={{ width: '100%', padding: '0.75rem 1rem', borderRadius: '10px', border: '1.5px solid #e2e8f0', outline: 'none' }} 
                                        placeholder="4"
                                    />
                                </div>
                            </div>

                            <div style={{ display: 'flex', gap: '1rem', marginTop: '1.5rem' }}>
                                <button type="button" onClick={() => setShowAddModal(false)} style={{ flex: 1, padding: '0.75rem', border: '1.5px solid #e2e8f0', background: 'none', borderRadius: '12px', fontWeight: 700, cursor: 'pointer', color: '#64748b' }}>
                                    Cancel
                                </button>
                                <button type="submit" style={{ flex: 2, padding: '0.75rem', background: '#e85d04', color: '#fff', border: 'none', borderRadius: '12px', fontWeight: 700, cursor: 'pointer' }}>
                                    {editingTable ? 'Save Settings' : 'Create Table'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* QR Big Preview Modal */}
            {selectedTableQR && (
                <div style={{ position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(15, 23, 42, 0.4)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
                    <div style={{ background: '#fff', width: '100%', maxWidth: '360px', borderRadius: '28px', overflow: 'hidden', border: '1px solid #e2e8f0', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)', textAlign: 'center', padding: '2rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                            <span style={{ fontSize: '0.85rem', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '1px' }}>Dine-In QR Code</span>
                            <button onClick={() => setSelectedTableQR(null)} style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer' }}>
                                <X size={20} />
                            </button>
                        </div>
                        
                        <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#0f172a', margin: '0 0 0.25rem' }}>{selectedTableQR.name}</h2>
                        <p style={{ color: '#64748b', fontSize: '0.85rem', margin: '0 0 1.5rem', fontWeight: 600 }}>{branchName}</p>

                        <div style={{ background: '#f8fafc', borderRadius: '20px', padding: '1.5rem', border: '1px dashed #e2e8f0', display: 'flex', justifyContent: 'center', marginBottom: '1.5rem' }}>
                            <img src={qrUrls[selectedTableQR.id]} alt="Table QR Code" style={{ width: '220px', height: '220px' }} />
                        </div>

                        <div style={{ display: 'flex', gap: '1rem' }}>
                            <button 
                                onClick={() => handlePrintQR(selectedTableQR, qrUrls[selectedTableQR.id])}
                                style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem', padding: '0.75rem', background: '#0f172a', color: '#fff', border: 'none', borderRadius: '12px', cursor: 'pointer', fontWeight: 700, fontSize: '0.85rem' }}
                            >
                                <Printer size={16} /> Print QR
                            </button>
                            <button 
                                onClick={() => handleDownloadQR(selectedTableQR, qrUrls[selectedTableQR.id])}
                                style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem', padding: '0.75rem', background: '#f1f5f9', color: '#334155', border: 'none', borderRadius: '12px', cursor: 'pointer', fontWeight: 700, fontSize: '0.85rem' }}
                            >
                                <Download size={16} /> Download
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
