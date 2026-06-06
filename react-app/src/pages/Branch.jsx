import React, { useState, useMemo } from 'react';
import { useFirestore } from '../hooks/useFirestore';
import { useMessaging } from '../context/MessagingContext';
import { syncBranchesExcel } from '../utils/excelService';
import { auth, provisioningAuth, db } from '../firebaseConfig';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { Eye, EyeOff } from 'lucide-react';

// Tamil Nadu districts/cities for branch locations
const TN_CITIES = [
    'Chennai', 'Coimbatore', 'Madurai', 'Tiruchirappalli', 'Salem',
    'Tirunelveli', 'Erode', 'Vellore', 'Thoothukudi', 'Dindigul',
    'Thanjavur', 'Ranipet', 'Sivaganga', 'Karur', 'Namakkal',
    'Tiruppur', 'Cuddalore', 'Kanchipuram', 'Hosur', 'Nagercoil'
];

export default function Branch() {
    const { showToast, showConfirm } = useMessaging();
    const userRole = sessionStorage.getItem('fb_user_role') || 'staff';
    const currentStation = sessionStorage.getItem('fb_user_station') || 'Main Branch';
    const currentBranchId = sessionStorage.getItem('fb_user_branch_id') || 'main';
    const currentCompanyId = sessionStorage.getItem('fb_user_company_id');
    const currentOwnerId = sessionStorage.getItem('fb_user_owner_id');
    
    // Branch state (for Owner)
    const { docs: branches, addDocument: addBranch, deleteDocument: deleteBranch, loading: branchLoading } = useFirestore('branches');
    const [showBranchModal, setShowBranchModal] = useState(false);

    // Staff state (for Admin)
    const { docs: allUsers, addDocument: addUser, updateDocument: updateUser, deleteDocument: deleteUser, loading: staffLoading } = useFirestore('users');
    const [showStaffModal, setShowStaffModal] = useState(false);
    const [editingStaff, setEditingStaff] = useState(null);
    const [showStaffPassword, setShowStaffPassword] = useState(false);

    const staffMembers = useMemo(() => {
        return allUsers.filter(u => u.role === 'staff' && ((u.branch_id === currentBranchId) || (!u.branch_id && u.station === currentStation)));
    }, [allUsers, currentStation, currentBranchId]);

    // New Staff Form
    const [newStaff, setNewStaff] = useState({ name: '', phone: '', email: '', username: '', password: '', station: currentStation, branch_id: currentBranchId, status: 'active', role: 'staff', adminUID: sessionStorage.getItem('fb_user_uid') || '', approved: true });

    // New Branch Form
    const [newBranch, setNewBranch] = useState({
        name: '', city: '', district: '', state: 'Tamil Nadu', address: '', phone: '', manager: '', status: 'active',
        ownerName: '', ownerPhone: '', ownerEmail: ''
    });

    const handleAddStaff = async () => {
        const username = newStaff.username.trim();
        const password = newStaff.password.trim();
        const name = newStaff.name.trim();

        if (!name || !username || !password) return showToast('Name, Email, and Password are required', 'error');
        if (password.length < 6) return showToast('Password must be at least 6 characters', 'error');
        if (!username.includes('@')) return showToast('Login must be a valid email (e.g. name@company.com)', 'error');
        
        try {
            if (editingStaff) {
                await updateUser(editingStaff.id, { ...newStaff, name, username });
                showToast('Staff profile updated.', 'success');
            } else {
                showToast('Registering security credentials...', 'info');
                // 1. Create in Firebase Auth using Provisioning instance (so Owner isn't logged out)
                const userCredential = await createUserWithEmailAndPassword(provisioningAuth, username, password);
                const uid = userCredential.user.uid;

                // 2. Save to Firestore 'users' collection with matched UID
                await addUser({ 
                    ...newStaff, 
                    name,
                    username,
                    password: password, // Store for reference, though auth handles it
                    id: uid, 
                    ownerId: currentOwnerId,
                    companyId: currentCompanyId,
                    approved: true
                });
                showToast(`Staff account for ${name} is ready!`, 'success');
            }
            setShowStaffModal(false);
            setEditingStaff(null);
            setNewStaff({ name: '', phone: '', email: '', username: '', password: '', station: currentStation, branch_id: currentBranchId, status: 'active', role: 'staff', adminUID: sessionStorage.getItem('fb_user_uid') || '', approved: true });
        } catch (err) { 
            console.error("Staff Creation Error:", err);
            let msg = err.message;
            if (err.code === 'auth/email-already-in-use') msg = "This email is already registered.";
            if (err.code === 'auth/invalid-email') msg = "Invalid email format.";
            showToast(msg, 'error'); 
        }
    };

    const handleDeleteStaff = async (id) => {
        showConfirm({
            title: 'Remove Account',
            message: 'Are you sure you want to remove this login access permanently?',
            onConfirm: async () => {
                try {
                    await deleteUser(id);
                    showToast('Access removed.', 'success');
                } catch (err) {
                    showToast(err.message, 'error');
                }
            }
        });
    };

    const handleAddBranch = async () => {
        if (!newBranch.name || !newBranch.city) return showToast('Branch Name and City are required', 'error');
        try {
            await addBranch(newBranch);
            setShowBranchModal(false);
            setNewBranch({
                name: '', city: '', district: '', state: 'Tamil Nadu', address: '', phone: '', manager: '', status: 'active',
                ownerName: '', ownerPhone: '', ownerEmail: ''
            });
            showToast('Branch added successfully!', 'success');
        } catch (err) { showToast(err.message, 'error'); }
    };

    const handleDeleteBranch = async (id) => {
        showConfirm({
            title: 'Remove Branch',
            message: 'Are you sure you want to remove this franchise branch? This action cannot be undone.',
            onConfirm: async () => {
                try {
                    await deleteBranch(id);
                    showToast('Branch removed successfully.', 'success');
                } catch (err) {
                    showToast(err.message, 'error');
                }
            }
        });
    };

    // Admin management state (for Owner)
    const [showAdminModal, setShowAdminModal] = useState(false);
    const [newAdmin, setNewAdmin] = useState({ name: '', phone: '', email: '', username: '', password: '', station: '', branch_id: '', status: 'active', role: 'admin', approved: true });
    const [ownerViewTab, setOwnerViewTab] = useState('branches'); // 'branches' or 'admins'

    const filteredAdmins = useMemo(() => {
        return allUsers.filter(a => a.role === 'admin');
    }, [allUsers]);

    const handleAddAdmin = async () => {
        const username = newAdmin.username.trim();
        const password = newAdmin.password.trim();
        const name = newAdmin.name.trim();

        if (!name || !username || !password || !newAdmin.station) return showToast('Name, Login Email, and Station are required', 'error');
        if (password.length < 6) return showToast('Password must be at least 6 characters', 'error');
        if (!username.includes('@')) return showToast('Login must be an email (e.g. admin@qmex.com)', 'error');
        
        try {
            showToast('Syncing with security gate...', 'info');
            // 1. Create in Firebase Auth using Provisioning instance
            const userCredential = await createUserWithEmailAndPassword(provisioningAuth, username, password);
            const uid = userCredential.user.uid;

            // 2. Save profile doc with 'approved: true' so they can login immediately
            await addUser({ 
                ...newAdmin, 
                name,
                username,
                id: uid,
                ownerId: currentOwnerId,
                companyId: currentCompanyId,
                approved: true
            });

            setShowAdminModal(false);
            setNewAdmin({ name: '', phone: '', email: '', username: '', password: '', station: '', branch_id: '', status: 'active', role: 'admin', approved: true });
            showToast(`Administrator ${name} created successfully!`, 'success');
        } catch (err) { 
            console.error("Admin Creation Error:", err);
            let msg = err.message;
            if (err.code === 'auth/email-already-in-use') msg = "This admin email already exists.";
            if (err.code === 'auth/invalid-email') msg = "Invalid email format.";
            showToast(msg, 'error'); 
        }
    };

    if (branchLoading || staffLoading) {
        return (
            <div className="page active" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
                <div style={{ color: '#64748b', fontWeight: 600 }}>LOADING DATA...</div>
            </div>
        );
    }

    // --- RENDER FOR OWNER (BRANCH MANAGEMENT) ---
    if (userRole === 'owner') {
        return (
            <div className="page active" id="page-branch-management" style={{ background: '#ffffff', minHeight: '100vh' }}>
                <div className="pg-header" style={{ marginBottom: '2.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div style={{ animation: 'riseIn 0.6s ease' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
                            <span style={{ fontSize: '2rem' }}>💎</span>
                            <h1 style={{ margin: 0, fontFamily: "'Yeseva One', serif", fontSize: '2.2rem', color: 'var(--ink)' }}>
                                Branch <span style={{ color: 'var(--accent)' }}>Management</span>
                            </h1>
                        </div>
                        <p style={{ color: 'var(--muted)', fontSize: '1rem', fontWeight: 500, margin: 0, opacity: 0.8 }}>
                            Securely manage your franchise locations and branch details.
                        </p>
                    </div>
                    <div className="pg-actions" style={{ display: 'flex', gap: '1rem' }}>
                        <div style={{ display: 'flex', background: '#f1f5f9', padding: '4px', borderRadius: '12px', marginRight: '1rem' }}>
                            <button onClick={() => setOwnerViewTab('branches')} style={{ padding: '0.6rem 1.2rem', borderRadius: '10px', border: 'none', background: ownerViewTab === 'branches' ? 'white' : 'transparent', fontWeight: 700, cursor: 'pointer', boxShadow: ownerViewTab === 'branches' ? '0 2px 4px rgba(0,0,0,0.05)' : 'none' }}>Branches</button>
                            <button onClick={() => setOwnerViewTab('admins')} style={{ padding: '0.6rem 1.2rem', borderRadius: '10px', border: 'none', background: ownerViewTab === 'admins' ? 'white' : 'transparent', fontWeight: 700, cursor: 'pointer', boxShadow: ownerViewTab === 'admins' ? '0 2px 4px rgba(0,0,0,0.05)' : 'none' }}>Administrators</button>
                        </div>
                        <button 
                            className="btn" 
                            onClick={() => syncBranchesExcel()}
                            style={{ background: '#10b981', color: 'white', padding: '0.8rem 1.6rem', borderRadius: '12px', fontWeight: 700, border: 'none', boxShadow: '0 4px 12px rgba(16, 185, 129, 0.25)', cursor: 'pointer' }}
                        >
                            📊 Export
                        </button>
                        {ownerViewTab === 'branches' ? (
                            <button className="btn btn-primary" onClick={() => setShowBranchModal(true)} style={{ padding: '0.8rem 1.5rem', borderRadius: '12px', background: 'var(--accent)' }}>
                                🏪 Add New Branch
                            </button>
                        ) : (
                            <button className="btn btn-primary" onClick={() => setShowAdminModal(true)} style={{ padding: '0.8rem 1.5rem', borderRadius: '12px', background: '#6366f1' }}>
                                🛡️ Add New Admin
                            </button>
                        )}
                    </div>
                </div>

                {/* Branch Stats Grid */}
                <div className="stats-grid" style={{ gap: '1.5rem', marginBottom: '2.5rem' }}>
                    {[
                        { label: 'Total Branches', val: branches.length, icon: '🏪', color: 'var(--purple)', bg: 'var(--purple-bg)' },
                        { label: 'Active Locations', val: branches.filter(b => b.status === 'active').length, icon: '📍', color: 'var(--green)', bg: 'var(--green-bg)' }
                    ].map((s, i) => (
                        <div key={i} className="stat-card glass shadow-premium" style={{ padding: '1.5rem', borderRadius: '20px', border: '1px solid var(--glass-border)' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '1.2rem' }}>
                                <div className="sc-icon" style={{ background: s.bg, width: '56px', height: '56px', borderRadius: '16px', fontSize: '1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{s.icon}</div>
                                <div>
                                    <div className="sc-val" style={{ color: s.color, fontSize: '1.8rem', fontWeight: 800, lineHeight: 1 }}>{s.val}</div>
                                    <div className="sc-lbl" style={{ fontSize: '0.85rem', color: 'var(--muted)', fontWeight: 700, marginTop: '0.2rem' }}>{s.label}</div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>

                {ownerViewTab === 'branches' ? (
                    <div className="table-card glass shadow-premium" style={{ borderRadius: '24px', overflow: 'hidden' }}>
                        <div className="tc-header" style={{ padding: '1.8rem 2rem', borderBottom: '1px solid var(--border)' }}>
                            <span className="tc-title" style={{ fontSize: '1.25rem', fontWeight: 800 }}>🏪 Franchise Branches</span>
                        </div>
                        <table className="data-table" style={{ width: '100%' }}>
                            <thead>
                                <tr style={{ background: 'rgba(241, 245, 249, 0.5)' }}>
                                    <th>Branch Name</th>
                                    <th>City</th>
                                    <th>District</th>
                                    <th>State</th>
                                    <th>Manager</th>
                                    <th>Status</th>
                                    <th style={{ textAlign: 'right' }}>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {branches.map(br => (
                                    <tr key={br.id} style={{ borderBottom: '1px solid var(--border)' }}>
                                        <td style={{ padding: '1.2rem 2rem', fontWeight: 800 }}>{br.name}</td>
                                        <td>{br.city}</td>
                                        <td>{br.district || '—'}</td>
                                        <td>{br.state || '—'}</td>
                                        <td>{br.manager}</td>
                                        <td><span style={{ padding: '0.3rem 0.8rem', background: br.status === 'active' ? '#ecfdf5' : '#fef2f2', color: br.status === 'active' ? '#059669' : '#ef4444', borderRadius: '8px', fontSize: '0.75rem', fontWeight: 800 }}>{br.status}</span></td>
                                        <td style={{ textAlign: 'right', padding: '1.2rem 2rem' }}>
                                            <button className="btn btn-ghost" style={{ color: 'var(--red)' }} onClick={() => handleDeleteBranch(br.id)}>🗑</button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                ) : (
                    <div className="table-card glass shadow-premium" style={{ borderRadius: '24px', overflow: 'hidden' }}>
                        <div className="tc-header" style={{ padding: '1.8rem 2rem', borderBottom: '1px solid var(--border)' }}>
                            <span className="tc-title" style={{ fontSize: '1.25rem', fontWeight: 800 }}>🛡️ Branch Administrators</span>
                        </div>
                        <table className="data-table" style={{ width: '100%' }}>
                            <thead>
                                <tr style={{ background: 'rgba(241, 245, 249, 0.5)' }}>
                                    <th>Admin Name</th>
                                    <th>Station / Branch</th>
                                    <th>Username</th>
                                    <th>Email</th>
                                    <th>Status</th>
                                    <th style={{ textAlign: 'right' }}>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredAdmins.map(adm => (
                                    <tr key={adm.id} style={{ borderBottom: '1px solid var(--border)' }}>
                                        <td style={{ padding: '1.2rem 2rem', fontWeight: 800 }}>{adm.name}</td>
                                        <td>{adm.station}</td>
                                        <td style={{ color: 'var(--accent)', fontWeight: 700 }}>{adm.username}</td>
                                        <td>{adm.email || '—'}</td>
                                        <td><span style={{ padding: '0.3rem 0.8rem', background: adm.status === 'active' ? '#ecfdf5' : '#fef2f2', color: adm.status === 'active' ? '#059669' : '#ef4444', borderRadius: '8px', fontSize: '0.75rem', fontWeight: 800 }}>{adm.status}</span></td>
                                        <td style={{ textAlign: 'right', padding: '1.2rem 2rem' }}>
                                            <button className="btn btn-ghost" style={{ color: 'var(--red)' }} onClick={() => handleDeleteStaff(adm.id)}>🗑</button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}

                {/* Branch Modal */}
                {showBranchModal && (
                    <div style={{ position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(15, 23, 42, 0.4)', backdropFilter: 'blur(10px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1.5rem' }}>
                        <div className="glass-heavy shadow-premium" style={{ width: '100%', maxWidth: '500px', borderRadius: '32px', padding: '2.5rem', maxHeight: '90vh', overflowY: 'auto' }}>
                            <h2 style={{ margin: '0 0 1.5rem', fontFamily: "'Yeseva One', serif", fontSize: '1.6rem' }}>Add <span style={{ color: 'var(--accent)' }}>New Branch</span></h2>
                            
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                                <div>
                                    <label style={{ fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase', color: '#64748b', display: 'block', marginBottom: '0.5rem' }}>Branch Name</label>
                                    <input type="text" value={newBranch.name} onChange={e => setNewBranch({ ...newBranch, name: e.target.value })} style={{ width: '100%', padding: '0.8rem 1rem', borderRadius: '12px', border: '1.5px solid #e2e8f0' }} placeholder="e.g. Madurai South" />
                                </div>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                    <div>
                                        <label style={{ fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase', color: '#64748b', display: 'block', marginBottom: '0.5rem' }}>City</label>
                                        <select value={newBranch.city} onChange={e => setNewBranch({ ...newBranch, city: e.target.value })} style={{ width: '100%', padding: '0.8rem 1rem', borderRadius: '12px', border: '1.5px solid #e2e8f0' }}>
                                            <option value="">Select City</option>
                                            {TN_CITIES.map(c => <option key={c} value={c}>{c}</option>)}
                                        </select>
                                    </div>
                                    <div>
                                        <label style={{ fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase', color: '#64748b', display: 'block', marginBottom: '0.5rem' }}>Manager</label>
                                        <input type="text" value={newBranch.manager} onChange={e => setNewBranch({ ...newBranch, manager: e.target.value })} style={{ width: '100%', padding: '0.8rem 1rem', borderRadius: '12px', border: '1.5px solid #e2e8f0' }} placeholder="Manager Name" />
                                    </div>
                                </div>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                    <div>
                                        <label style={{ fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase', color: '#64748b', display: 'block', marginBottom: '0.5rem' }}>District</label>
                                        <input type="text" value={newBranch.district} onChange={e => setNewBranch({ ...newBranch, district: e.target.value })} style={{ width: '100%', padding: '0.8rem 1rem', borderRadius: '12px', border: '1.5px solid #e2e8f0' }} placeholder="District" />
                                    </div>
                                    <div>
                                        <label style={{ fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase', color: '#64748b', display: 'block', marginBottom: '0.5rem' }}>State</label>
                                        <input type="text" value={newBranch.state} onChange={e => setNewBranch({ ...newBranch, state: e.target.value })} style={{ width: '100%', padding: '0.8rem 1rem', borderRadius: '12px', border: '1.5px solid #e2e8f0' }} placeholder="State" />
                                    </div>
                                </div>
                                <div>
                                    <label style={{ fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase', color: '#64748b', display: 'block', marginBottom: '0.5rem' }}>Branch Address</label>
                                    <textarea value={newBranch.address} onChange={e => setNewBranch({ ...newBranch, address: e.target.value })} style={{ width: '100%', padding: '0.8rem 1rem', borderRadius: '12px', border: '1.5px solid #e2e8f0', minHeight: '80px', resize: 'vertical' }} placeholder="Full address..."></textarea>
                                </div>
                            </div>

                            <div style={{ display: 'flex', gap: '1rem', marginTop: '2.5rem' }}>
                                <button className="btn btn-outline" onClick={() => setShowBranchModal(false)} style={{ flex: 1, padding: '0.8rem', borderRadius: '12px' }}>Cancel</button>
                                <button className="btn btn-primary" onClick={handleAddBranch} style={{ flex: 2, padding: '0.8rem', borderRadius: '12px', background: 'var(--accent)' }}>Create Branch</button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Admin Modal */}
                {showAdminModal && (
                    <div style={{ position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(15, 23, 42, 0.4)', backdropFilter: 'blur(10px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1.5rem' }}>
                        <div className="glass-heavy shadow-premium" style={{ width: '100%', maxWidth: '500px', borderRadius: '32px', padding: '2.5rem', maxHeight: '90vh', overflowY: 'auto' }}>
                            <h2 style={{ margin: '0 0 1.5rem', fontFamily: "'Yeseva One', serif", fontSize: '1.6rem' }}>Add <span style={{ color: '#6366f1' }}>New Administrator</span></h2>
                            
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                                <div>
                                    <label style={{ fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase', color: '#64748b', display: 'block', marginBottom: '0.5rem' }}>Admin Name</label>
                                    <input type="text" value={newAdmin.name} onChange={e => setNewAdmin({ ...newAdmin, name: e.target.value })} style={{ width: '100%', padding: '0.8rem 1rem', borderRadius: '12px', border: '1.5px solid #e2e8f0' }} placeholder="e.g. David Miller" />
                                </div>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                    <div>
                                        <label style={{ fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase', color: '#64748b', display: 'block', marginBottom: '0.5rem' }}>Username</label>
                                        <input type="text" value={newAdmin.username} onChange={e => setNewAdmin({ ...newAdmin, username: e.target.value })} style={{ width: '100%', padding: '0.8rem 1rem', borderRadius: '12px', border: '1.5px solid #e2e8f0' }} placeholder="david_adm" />
                                    </div>
                                    <div>
                                        <label style={{ fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase', color: '#64748b', display: 'block', marginBottom: '0.5rem' }}>Password</label>
                                        <input type="password" value={newAdmin.password} onChange={e => setNewAdmin({ ...newAdmin, password: e.target.value })} style={{ width: '100%', padding: '0.8rem 1rem', borderRadius: '12px', border: '1.5px solid #e2e8f0' }} placeholder="••••••••" />
                                    </div>
                                </div>
                                <div>
                                    <label style={{ fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase', color: '#64748b', display: 'block', marginBottom: '0.5rem' }}>Station (Branch Name)</label>
                                    <select value={newAdmin.station} onChange={e => {
                                        const br = branches.find(b => b.name === e.target.value);
                                        setNewAdmin({ ...newAdmin, station: e.target.value, branch_id: br ? br.id : '' });
                                    }} style={{ width: '100%', padding: '0.8rem 1rem', borderRadius: '12px', border: '1.5px solid #e2e8f0' }}>
                                        <option value="">Select Branch</option>
                                        <option value="Main HQ">Main HQ</option>
                                        {branches.map(b => <option key={b.id} value={b.name}>{b.name}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label style={{ fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase', color: '#64748b', display: 'block', marginBottom: '0.5rem' }}>Email (Optional)</label>
                                    <input type="email" value={newAdmin.email} onChange={e => setNewAdmin({ ...newAdmin, email: e.target.value })} style={{ width: '100%', padding: '0.8rem 1rem', borderRadius: '12px', border: '1.5px solid #e2e8f0' }} placeholder="admin@example.com" />
                                </div>
                            </div>

                            <div style={{ display: 'flex', gap: '1rem', marginTop: '2.5rem' }}>
                                <button className="btn btn-outline" onClick={() => setShowAdminModal(false)} style={{ flex: 1, padding: '0.8rem', borderRadius: '12px' }}>Cancel</button>
                                <button className="btn btn-primary" onClick={handleAddAdmin} style={{ flex: 2, padding: '0.8rem', borderRadius: '12px', background: '#6366f1' }}>Create Admin</button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        );
    }

    // --- RENDER FOR ADMIN (STAFF LOGIN MANAGEMENT) ---
    return (
        <div className="page active" id="page-branch-management" style={{ background: '#ffffff', minHeight: '100vh' }}>
            <div className="pg-header" style={{ marginBottom: '2.5rem' }}>
                <div style={{ animation: 'riseIn 0.6s ease' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
                        <span style={{ fontSize: '2rem' }}>🛡️</span>
                        <h1 style={{ margin: 0, fontFamily: "'Yeseva One', serif", fontSize: '2.2rem', color: 'var(--ink)' }}>
                            Staff <span style={{ color: 'var(--accent)' }}>Login Access</span>
                        </h1>
                    </div>
                    <p style={{ color: 'var(--muted)', fontSize: '1rem', fontWeight: 500, margin: 0, opacity: 0.8 }}>
                        Manage 4-digit PIN access for staff members at <strong>{currentStation}</strong>.
                    </p>
                </div>
                <div className="pg-actions">
                    <button className="btn btn-primary" onClick={() => { setEditingStaff(null); setNewStaff({ name: '', phone: '', email: '', username: '', password: '', station: currentStation, branch_id: currentBranchId, status: 'active', role: 'staff', adminUID: sessionStorage.getItem('fb_user_uid') || '' }); setShowStaffModal(true); }} style={{ padding: '0.8rem 1.5rem', borderRadius: '12px', background: 'var(--accent)', boxShadow: '0 10px 15px -3px rgba(79, 70, 229, 0.2)' }}>
                        👤 Add Staff Account
                    </button>
                </div>
            </div>

            <div className="table-card glass shadow-premium" style={{ borderRadius: '24px', overflow: 'hidden' }}>
                <div className="tc-header" style={{ padding: '1.8rem 2rem', borderBottom: '1px solid var(--border)' }}>
                    <span className="tc-title" style={{ fontSize: '1.25rem', fontWeight: 800 }}>👥 Station Staff List</span>
                </div>
                <table className="data-table" style={{ width: '100%' }}>
                    <thead>
                        <tr style={{ background: 'rgba(241, 245, 249, 0.5)' }}>
                            <th style={{ padding: '1.2rem 2rem' }}>Staff Name</th>
                            <th>Station</th>
                            <th>Username</th>
                            <th>Phone</th>
                            <th>Status</th>
                            <th style={{ textAlign: 'right', padding: '1.2rem 2rem' }}>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {staffMembers.length === 0 ? (
                            <tr><td colSpan="6" style={{ padding: '3rem', textAlign: 'center', color: '#94a3b8' }}>No staff logins created for this station.</td></tr>
                        ) : (
                            staffMembers.map(st => (
                                <tr key={st.id} style={{ borderBottom: '1px solid var(--border)' }}>
                                    <td style={{ padding: '1.2rem 2rem', fontWeight: 800 }}>{st.name}</td>
                                    <td style={{ fontWeight: 600, color: '#64748b' }}>{st.station}</td>
                                    <td style={{ fontWeight: 600, color: 'var(--accent)' }}>{st.username || '—'}</td>
                                    <td style={{ fontWeight: 600, color: '#64748b' }}>{st.phone || '—'}</td>
                                    <td>
                                        <span style={{ padding: '0.3rem 0.8rem', background: st.status === 'active' ? '#ecfdf5' : '#fef2f2', color: st.status === 'active' ? '#059669' : '#ef4444', borderRadius: '8px', fontSize: '0.75rem', fontWeight: 800 }}>{st.status.toUpperCase()}</span>
                                    </td>
                                    <td style={{ textAlign: 'right', padding: '1.2rem 2rem' }}>
                                        <button className="btn btn-ghost" style={{ marginRight: '0.5rem', color: 'var(--accent)' }} onClick={() => { setEditingStaff(st); setNewStaff(st); setShowStaffModal(true); }}>✎</button>
                                        <button className="btn btn-ghost" style={{ color: 'var(--red)' }} onClick={() => handleDeleteStaff(st.id)}>🗑</button>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {/* Staff Modal */}
            {showStaffModal && (
                <div style={{ position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(15, 23, 42, 0.4)', backdropFilter: 'blur(10px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1.5rem' }}>
                    <div className="glass-heavy shadow-premium" style={{ width: '100%', maxWidth: '450px', borderRadius: '32px', padding: '2.5rem' }}>
                        <h2 style={{ margin: '0 0 1.5rem', fontFamily: "'Yeseva One', serif", fontSize: '1.6rem' }}>{editingStaff ? 'Edit' : 'Create'} <span style={{ color: 'var(--accent)' }}>Staff Login</span></h2>
                        
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                            <div>
                                <label style={{ fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase', color: '#64748b', display: 'block', marginBottom: '0.5rem' }}>Full Name</label>
                                <input type="text" value={newStaff.name} onChange={e => setNewStaff({ ...newStaff, name: e.target.value })} style={{ width: '100%', padding: '0.8rem 1rem', borderRadius: '12px', border: '1.5px solid #e2e8f0', outline: 'none' }} placeholder="e.g. Rahul Sharma" />
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                <div>
                                    <label style={{ fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase', color: '#64748b', display: 'block', marginBottom: '0.5rem' }}>Phone No.</label>
                                    <input type="text" value={newStaff.phone} onChange={e => setNewStaff({ ...newStaff, phone: e.target.value })} style={{ width: '100%', padding: '0.8rem 1rem', borderRadius: '12px', border: '1.5px solid #e2e8f0', outline: 'none' }} placeholder="+91 0000000000" />
                                </div>
                                <div>
                                    <label style={{ fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase', color: '#64748b', display: 'block', marginBottom: '0.5rem' }}>Email ID</label>
                                    <input type="email" value={newStaff.email} onChange={e => setNewStaff({ ...newStaff, email: e.target.value })} style={{ width: '100%', padding: '0.8rem 1rem', borderRadius: '12px', border: '1.5px solid #e2e8f0', outline: 'none' }} placeholder="create email" />
                                </div>
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                <div>
                                    <label style={{ fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase', color: '#64748b', display: 'block', marginBottom: '0.5rem' }}>Username</label>
                                    <input 
                                        type="text" 
                                        autoComplete="off"
                                        value={newStaff.username} 
                                        onChange={e => setNewStaff({ ...newStaff, username: e.target.value })} 
                                        style={{ width: '100%', padding: '0.8rem 1rem', borderRadius: '12px', border: '1.5px solid #e2e8f0', outline: 'none' }} 
                                        placeholder="username" 
                                    />
                                </div>
                                <div>
                                    <label style={{ fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase', color: '#64748b', display: 'block', marginBottom: '0.5rem' }}>Password</label>
                                    <div style={{ position: 'relative' }}>
                                        <input 
                                            type={showStaffPassword ? "text" : "password"} 
                                            autoComplete="new-password"
                                            value={newStaff.password} 
                                            onChange={e => setNewStaff({ ...newStaff, password: e.target.value })} 
                                            style={{ width: '100%', padding: '0.8rem 1rem', paddingRight: '3rem', borderRadius: '12px', border: '1.5px solid #e2e8f0', outline: 'none' }} 
                                            placeholder="********" 
                                        />
                                        <button 
                                            type="button"
                                            onClick={() => setShowStaffPassword(!showStaffPassword)}
                                            style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
                                        >
                                            {showStaffPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                        </button>
                                    </div>
                                </div>
                            </div>
                            <div>
                                <label style={{ fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase', color: '#64748b', display: 'block', marginBottom: '0.5rem' }}>Station (Auto-assigned)</label>
                                <input type="text" readOnly value={currentStation} style={{ width: '100%', padding: '0.8rem 1rem', borderRadius: '12px', border: '1.5px solid #e2e8f0', background: '#f8fafc', color: '#94a3b8' }} />
                            </div>
                            <div>
                                <label style={{ fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase', color: '#64748b', display: 'block', marginBottom: '0.5rem' }}>Status</label>
                                <select value={newStaff.status} onChange={e => setNewStaff({ ...newStaff, status: e.target.value })} style={{ width: '100%', padding: '0.8rem 1rem', borderRadius: '12px', border: '1.5px solid #e2e8f0' }}>
                                    <option value="active">Active</option>
                                    <option value="inactive">Inactive</option>
                                </select>
                            </div>
                        </div>

                        <div style={{ display: 'flex', gap: '1rem', marginTop: '2rem' }}>
                            <button className="btn btn-outline" onClick={() => setShowStaffModal(false)} style={{ flex: 1, padding: '0.8rem', borderRadius: '12px' }}>Cancel</button>
                            <button className="btn btn-primary" onClick={handleAddStaff} style={{ flex: 2, padding: '0.8rem', borderRadius: '12px', background: 'var(--accent)' }}>{editingStaff ? 'Update Account' : 'Create Account'}</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
