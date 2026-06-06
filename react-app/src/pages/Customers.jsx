import React, { useState, useMemo } from 'react';
import { useFirestore } from '../hooks/useFirestore';
import { useMessaging } from '../context/MessagingContext';
import { syncCustomersExcel } from '../utils/excelService';
import { auth, provisioningAuth, db } from '../firebaseConfig';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';
import { Eye, EyeOff } from 'lucide-react';

const TN_CITIES = [
    'Chennai', 'Coimbatore', 'Madurai', 'Tiruchirappalli', 'Salem',
    'Tirunelveli', 'Erode', 'Vellore', 'Thoothukudi', 'Dindigul',
    'Thanjavur', 'Ranipet', 'Sivaganga', 'Karur', 'Namakkal',
    'Tiruppur', 'Cuddalore', 'Kanchipuram', 'Hosur', 'Nagercoil'
];

const TN_DISTRICTS = [
    'Ariyalur', 'Chengalpattu', 'Chennai', 'Coimbatore', 'Cuddalore',
    'Dharmapuri', 'Dindigul', 'Erode', 'Kallakurichi', 'Kanchipuram',
    'Kanniyakumari', 'Karur', 'Krishnagiri', 'Madurai', 'Mayiladuthurai',
    'Nagapattinam', 'Namakkal', 'Nilgiris', 'Perambalur', 'Pudukkottai',
    'Ramanathapuram', 'Ranipet', 'Salem', 'Sivaganga', 'Tenkasi',
    'Thanjavur', 'Theni', 'Thoothukudi', 'Tiruchirappalli', 'Tirunelveli',
    'Tirupathur', 'Tiruppur', 'Tiruvallur', 'Tiruvannamalai', 'Tiruvarur',
    'Vellore', 'Viluppuram', 'Virudhunagar'
];

export default function Customers() {
    const { showToast, showConfirm } = useMessaging();
    const { 
        docs: customers, 
        loading, 
        loadingMore,
        hasMore,
        loadMore,
        addDocument, 
        deleteDocument 
    } = useFirestore('customers', { limit: 50, orderBy: ['createdAt', 'desc'] });
    const { docs: branches, addDocument: addBranch, updateDocument: updateBranch } = useFirestore('branches');
    const { docs: invoicesData } = useFirestore('invoices');
    const { docs: users, addDocument: addUser, updateDocument: updateUser, deleteDocument: deleteUser } = useFirestore('users');
    const [searchTerm, setSearchTerm] = useState('');
    const [filterType, setFilterType] = useState('all');
    const [showModal, setShowModal] = useState(false);
    const [showAdminModal, setShowAdminModal] = useState(false);
    const [editingAdmin, setEditingAdmin] = useState(null);
    const [viewingUser, setViewingUser] = useState(null);
    const [isProcessing, setIsProcessing] = useState(false);
    const [showPassword, setShowPassword] = useState(false);

    // Role detection
    const userRole = sessionStorage.getItem('fb_user_role') || 'staff';
    const isOwner = userRole === 'owner';

    // Form State
    const [newCustomer, setNewCustomer] = useState({
        name: '', phone: '', email: '', address: '', gst: '',
        branch: '', type: 'regular', franchiseFee: ''
    });

    const [newAdmin, setNewAdmin] = useState({
        name: '', username: '', password: '', branch: '', station: '', role: 'admin', status: 'active',
        address: '', district: '', state: 'Tamil Nadu', city: '', pincode: '', country: 'India'
    });

    // Derived stats from invoices for per-customer revenue
    const customerRevenue = useMemo(() => {
        const map = {};
        invoicesData.forEach(inv => {
            const name = inv.customerName || inv.customer || 'Walk-in Client';
            if (!map[name]) map[name] = { total: 0, orders: 0, products: new Set() };

            const amt = Number(inv.amount) || 0;
            map[name].total += amt;
            map[name].orders += 1;

            if (inv.items) {
                const itemNames = String(inv.items).split(',').map(s => s.split('(')[0].trim());
                itemNames.forEach(it => map[name].products.add(it));
            }
        });
        return map;
    }, [invoicesData]);

    const userBranch = sessionStorage.getItem('fb_user_station') || 'Main Branch';
    const userBranchId = sessionStorage.getItem('fb_user_branch_id') || 'main';
    const isOwnerRole = userRole === 'owner';

    const accessibleCustomers = useMemo(() => {
        let list = customers.map(c => ({ ...c, isUser: false }));
        const filtered = isOwnerRole ? list : list.filter(item => (item.branch_id === userBranchId) || (!item.branch_id && item.branch === userBranch));
        return [...filtered].sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
    }, [customers, isOwnerRole, userBranch, userBranchId]);

    const currentOwnerId = sessionStorage.getItem('fb_user_owner_id') || sessionStorage.getItem('fb_user_uid');

    const accessibleUsers = useMemo(() => {
        // The list is already pre-filtered by ownerId in the useFirestore hook.
        // We just need to filter by local branch/station if the user is not an owner.
        let list = users.map(u => ({ ...u, type: 'admin', isUser: true }));

        if (!isOwnerRole) {
            list = list.filter(u => (u.branch_id === userBranchId) || (!u.branch_id && u.station === userBranch));
        }
        
        return [...list].sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
    }, [users, isOwnerRole, userBranch, userBranchId]);

    const filteredCustomers = useMemo(() => {
        let list = [];
        if (filterType === 'admins') {
            list = accessibleUsers;
        } else {
            list = accessibleCustomers;
            if (filterType === 'all') {
                list = [...list, ...accessibleUsers];
            } else {
                list = list.filter(c => c.type === filterType);
            }
        }

        return list.filter(c => {
            const matchesSearch = (c.name?.toLowerCase().includes(searchTerm.toLowerCase())) ||
                (c.phone?.includes(searchTerm)) ||
                (c.username?.toLowerCase().includes(searchTerm.toLowerCase())) ||
                (c.profile?.businessName?.toLowerCase().includes(searchTerm.toLowerCase()));
            return matchesSearch;
        });
    }, [accessibleCustomers, accessibleUsers, filterType, searchTerm]);

    const handleAddCustomer = async () => {
        if (!newCustomer.name) return showToast('Name is required', 'error');
        try {
            const userBranch = sessionStorage.getItem('fb_user_station') || 'Main Branch';
            await addDocument({ 
                ...newCustomer, 
                createdAt: new Date(), 
                branch: newCustomer.branch || userBranch,
                branch_id: userBranchId
            });
            setShowModal(false);
            setNewCustomer({ name: '', phone: '', email: '', address: '', gst: '', branch: '', type: 'regular', franchiseFee: '' });
        } catch (err) {
            showToast(err.message, 'error');
        }
    };

    const handleAddAdmin = async () => {
        const username = newAdmin.username.trim();
        const password = newAdmin.password.trim();
        const name = newAdmin.name.trim();

        if (isProcessing) return;
        if (!name || !username || !password || !newAdmin.branch) {
            return showToast('Please fill Name, Login Email, Password and Branch.', 'error');
        }

        if (!username.includes('@')) {
            return showToast('Login Username must be a valid email (e.g. name@system.com)', 'error');
        }

        if (password.length < 6) {
            return showToast('Password must be at least 6 characters.', 'error');
        }

        setIsProcessing(true);
        console.log("[Customers] Starting Admin Creation for", username);

        try {
            showToast('Opening security gate...', 'info');

            // 1. Provision Auth Account
            let uid;
            try {
                const userCredential = await createUserWithEmailAndPassword(provisioningAuth, username, password);
                uid = userCredential.user.uid;
                console.log("[Customers] Auth provisioned successfully. UID:", uid);
                await provisioningAuth.signOut(); // Clean up session
            } catch (authErr) {
                console.error("[Customers] Auth Registration Error:", authErr);
                if (authErr.code === 'auth/email-already-in-use') {
                    showToast('This email is already registered as a login.', 'error');
                    setIsProcessing(false);
                    return;
                }
                throw authErr;
            }
                
            // 2. Automatically update/create Branch details in the 'branches' collection
            console.log("[Customers] Updating branch record...");
            const existingBranch = branches.find(b => b.name === newAdmin.branch);
            let targetBranchId = existingBranch?.id;

            const branchData = {
                name: newAdmin.branch,
                city: newAdmin.city || '',
                district: newAdmin.district || '',
                state: newAdmin.state || 'Tamil Nadu',
                address: newAdmin.address || '',
                manager: name,
                status: 'active',
                updatedAt: new Date()
            };

            if (existingBranch) {
                await updateBranch(existingBranch.id, branchData);
            } else {
                targetBranchId = await addBranch(branchData);
                console.log("[Customers] New branch created with ID:", targetBranchId);
            }

            // 3. Create the Admin User profile in Firestore using the hook
            console.log("[Customers] Creating Firestore profile...");
            const ownerId = sessionStorage.getItem('fb_user_owner_id') || sessionStorage.getItem('fb_user_uid');
            const companyId = sessionStorage.getItem('fb_user_company_id');
            
            const userData = {
                ...newAdmin,
                uid: uid,
                id: uid, // Force ID to match Auth UID
                ownerId: ownerId,
                companyId: companyId,
                username: username,
                password: password,
                station: newAdmin.branch,
                branch_id: targetBranchId,
                createdAt: new Date(),
                access: 'Full Access',
                approved: true,
                status: 'active'
            };

            await addUser(userData);
            
            showToast('Administrator Created & Authorized!', 'success');
            setShowAdminModal(false);
            setNewAdmin({ 
                name: '', username: '', password: '', branch: '', station: '', role: 'admin', status: 'active',
                address: '', district: '', state: 'Tamil Nadu', city: '', pincode: '', country: 'India'
            });

        } catch (err) {
            console.error("[Customers] Critical Failure:", err);
            showToast(`Bug detected: ${err.message}`, 'error');
        } finally {
            setIsProcessing(false);
        }
    };

    const handleExportExcel = async () => {
        const totalRows = [...accessibleCustomers, ...accessibleUsers];
        if (totalRows.length === 0) {
            showToast('No data to export', 'error');
            return;
        }

        try {
            const { default: ExcelJS } = await import('exceljs');
            const workbook = new ExcelJS.Workbook();

            // ── SHEET 1: CLIENTS ──────────────────────────────────
            const clientSheet = workbook.addWorksheet('Clients');
            clientSheet.columns = [
                { header: 'Name',          key: 'name',         width: 28 },
                { header: 'Phone',         key: 'phone',        width: 18 },
                { header: 'Email',         key: 'email',        width: 28 },
                { header: 'Type',          key: 'type',         width: 16 },
                { header: 'Branch',        key: 'branch',       width: 22 },
                { header: 'GST Number',    key: 'gst',          width: 20 },
                { header: 'Franchise Fee', key: 'franchiseFee', width: 16 },
                { header: 'Address',       key: 'address',      width: 36 },
            ];
            clientSheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
            clientSheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF4F46E5' } };

            accessibleCustomers
                .filter(c => !c.isSystemProfile)
                .forEach(c => {
                    clientSheet.addRow({
                        name:         c.name         || '',
                        phone:        c.phone        || '',
                        email:        c.email        || '',
                        type:         (c.type || 'regular').toUpperCase(),
                        branch:       c.branch       || '',
                        gst:          c.gst          || '',
                        franchiseFee: c.franchiseFee || '',
                        address:      c.address      || '',
                    });
                });

            // ── SHEET 2: ADMINS & STAFF ───────────────────────────
            const staffSheet = workbook.addWorksheet('Admins & Staff');
            staffSheet.columns = [
                { header: 'Full Name', key: 'name',     width: 28 },
                { header: 'Username',  key: 'username',  width: 20 },
                { header: 'Role',      key: 'role',      width: 14 },
                { header: 'Branch',    key: 'branch',    width: 22 },
                { header: 'Station',   key: 'station',   width: 22 },
                { header: 'City',      key: 'city',      width: 18 },
                { header: 'District',  key: 'district',  width: 18 },
                { header: 'State',     key: 'state',     width: 18 },
                { header: 'Status',    key: 'status',    width: 14 },
                { header: 'Access',    key: 'access',    width: 20 },
            ];
            staffSheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
            staffSheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E293B' } };

            accessibleUsers.forEach(u => {
                staffSheet.addRow({
                    name:     u.name     || '',
                    username: u.username || '',
                    role:     (u.role || '').toUpperCase(),
                    branch:   u.branch   || u.station || '',
                    station:  u.station  || '',
                    city:     u.city     || '',
                    district: u.district || '',
                    state:    u.state    || '',
                    status:   (u.status  || 'active').toUpperCase(),
                    access:   u.access   || 'Full Access',
                });
            });

            const buffer = await workbook.xlsx.writeBuffer();
            const blob   = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
            const url    = URL.createObjectURL(blob);
            const a      = document.createElement('a');
            a.href       = url;
            a.download   = `Clients_Manifest_${new Date().toISOString().split('T')[0]}.xlsx`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);

            showToast(`Exported ${accessibleCustomers.filter(c=>!c.isSystemProfile).length} clients + ${accessibleUsers.length} staff to Excel!`, 'success');
        } catch (err) {
            console.error('Export failed:', err);
            showToast('Export failed: ' + err.message, 'error');
        }
    };

    if (loading) {
        return (
            <div className="page active" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
                <div style={{ color: 'var(--muted)', fontFamily: "var(--font-hud)", letterSpacing: '2px', animation: 'pulse 1.5s infinite' }}>ANALYZING CLIENT DATA...</div>
            </div>
        );
    }

    return (
        <div className="page active" id="page-customers" style={{ background: '#ffffff', minHeight: '100vh', padding: '2rem' }}>
            {/* Header Area */}
            <div className="pg-header" style={{ marginBottom: '2.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div style={{ animation: 'riseIn 0.6s ease' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
                        <span style={{ fontSize: '2.2rem' }}>👤</span>
                        <h1 style={{ margin: 0, fontFamily: "'Yeseva One', serif", fontSize: '2.4rem', color: 'var(--ink)' }}>
                            Clients <span style={{ color: 'var(--accent)' }}>Manifest</span>
                        </h1>
                    </div>
                    <p style={{ color: 'var(--muted)', fontSize: '1.05rem', fontWeight: 500, margin: 0, opacity: 0.8 }}>
                        Oversee your growing directory of franchise partners and valued patrons.
                    </p>
                </div>
                <div className="pg-actions" style={{ animation: 'riseIn 0.6s ease 0.1s both', display: 'flex', gap: '1rem' }}>
                    <button 
                        className="btn" 
                        onClick={handleExportExcel}
                        style={{ background: 'linear-gradient(135deg, #22c55e, #16a34a)', color: 'white', padding: '0.8rem 1.6rem', borderRadius: '12px', fontWeight: 700, border: 'none', boxShadow: '0 4px 12px rgba(34,197,94,0.3)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}
                    >
                        <img src="https://img.icons8.com/color/20/microsoft-excel-2019--v1.png" alt="Excel" style={{ width: '18px', height: '18px' }} />
                        Export to Excel
                    </button>
                    <button className="btn btn-primary" onClick={() => setShowModal(true)} style={{
                        padding: '0.9rem 1.8rem',
                        borderRadius: '16px',
                        fontSize: '1rem',
                        fontWeight: 700,
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.6rem',
                        background: 'var(--accent)',
                        color: 'white',
                        border: 'none'
                    }}>
                        <span style={{ fontSize: '1.4rem' }}>➕</span> Add Client
                    </button>
                    {isOwner && (
                        <button className="btn btn-outline" onClick={() => setShowAdminModal(true)} style={{
                            padding: '0.9rem 1.8rem',
                            borderRadius: '16px',
                            fontSize: '1rem',
                            fontWeight: 700,
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.6rem',
                            border: '2px solid var(--accent)',
                            color: 'var(--accent)',
                            background: 'white'
                        }}>
                            <span style={{ fontSize: '1.4rem' }}>➕</span> Create Admin Login
                        </button>
                    )}
                </div>
            </div>

            {/* Premium Stats Grid */}
            <div className="stats-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1.5rem', marginBottom: '3rem' }}>
                {[
                    { label: 'Total Clients', val: accessibleCustomers.length, icon: '👥', color: 'var(--blue)', bg: 'var(--blue-bg)' },
                    { label: 'Franchise Buyers', val: accessibleCustomers.filter(c => c.type === 'franchise').length, icon: '🏢', color: 'var(--accent)', bg: 'var(--accent-light)' },
                    { label: 'Regular Patrons', val: accessibleCustomers.filter(c => c.type === 'regular').length, icon: '🌟', color: 'var(--green)', bg: 'var(--green-bg)' },
                    { label: 'Rent Accounts', val: accessibleCustomers.filter(c => c.type === 'rent').length, icon: '🔑', color: 'var(--purple)', bg: 'var(--purple-bg)' }
                ].map((s, i) => (
                    <div key={i} className="stat-card glass shadow-premium" style={{
                        padding: '1.8rem',
                        borderRadius: '24px',
                        border: '1px solid var(--glass-border)',
                        background: 'rgba(255, 255, 255, 0.6)',
                        animation: `riseIn 0.5s ease ${0.2 + i * 0.1}s both`
                    }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
                            <div style={{
                                background: s.bg,
                                width: '60px',
                                height: '60px',
                                borderRadius: '18px',
                                fontSize: '1.8rem',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center'
                            }}>{s.icon}</div>
                            <div>
                                <div style={{ color: s.color, fontSize: '2rem', fontWeight: 800, lineHeight: 1 }}>{s.val}</div>
                                <div style={{ fontSize: '0.9rem', color: 'var(--muted)', fontWeight: 700, marginTop: '0.3rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{s.label}</div>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Filter & Search Bar */}
            <div className="glass shadow-premium" style={{
                padding: '1.5rem 2rem',
                borderRadius: '24px',
                marginBottom: '1.5rem',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: '1.5rem',
                border: '1px solid var(--glass-border)',
                background: 'rgba(255, 255, 255, 0.4)',
                animation: 'riseIn 0.6s ease 0.4s both'
            }}>
                <div className="hide-scrollbar" style={{ display: 'flex', gap: '0.8rem', overflowX: 'auto', width: '100%', paddingBottom: '0.5rem', WebkitOverflowScrolling: 'touch' }}>
                    {['all', 'franchise', 'admins', 'rent', 'regular'].map(t => (
                        <button
                            key={t}
                            onClick={() => setFilterType(t)}
                            style={{
                                padding: '0.6rem 1.4rem',
                                borderRadius: '12px',
                                border: 'none',
                                background: filterType === t ? (t === 'admins' ? '#1e293b' : 'var(--accent)') : 'transparent',
                                color: filterType === t ? 'white' : 'var(--muted)',
                                fontWeight: 800,
                                fontSize: '0.85rem',
                                textTransform: 'uppercase',
                                letterSpacing: '0.05em',
                                cursor: 'pointer',
                                transition: 'all 0.3s ease',
                                boxShadow: filterType === t ? '0 5px 15px rgba(79, 70, 229, 0.2)' : 'none',
                                whiteSpace: 'nowrap',
                                flexShrink: 0
                            }}
                        >
                            {t}
                        </button>
                    ))}
                </div>
                <div style={{ position: 'relative', flex: 1, maxWidth: '400px' }}>
                    <input
                        type="text"
                        placeholder="Search name or phone number..."
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                        style={{
                            width: '100%',
                            background: '#f8fafc',
                            border: '1.5px solid #e2e8f0',
                            padding: '0.8rem 1rem 0.8rem 3rem',
                            borderRadius: '14px',
                            color: 'var(--ink)',
                            fontSize: '0.95rem',
                            outline: 'none',
                            transition: 'all 0.3s'
                        }}
                    />
                    <span style={{ position: 'absolute', left: '1.2rem', top: '50%', transform: 'translateY(-50%)', fontSize: '1.1rem', opacity: 0.5 }}>🔍</span>
                </div>
            </div>

            {/* Customers Table Card */}
            <div className="table-card glass shadow-premium" style={{
                borderRadius: '28px',
                overflow: 'hidden',
                border: '1px solid var(--glass-border)',
                animation: 'riseIn 0.7s ease 0.5s both',
                background: 'rgba(255, 255, 255, 0.7)'
            }}>
                <div style={{ overflowX: 'auto' }}>
                    <table className="data-table" style={{ width: '100%', borderCollapse: 'separate', borderSpacing: 0 }}>
                        <thead>
                            <tr style={{ background: 'rgba(248, 250, 252, 0.8)' }}>
                                <th style={{ padding: '1.5rem 2rem', textAlign: 'left', fontSize: '0.85rem', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 800 }}>Client Detail</th>
                                <th style={{ padding: '1.4rem 1rem', textAlign: 'left', fontSize: '0.85rem', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 800 }}>Classification</th>
                                <th style={{ padding: '1.4rem 1rem', textAlign: 'left', fontSize: '0.85rem', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 800 }}>Assigned Branch</th>
                                <th style={{ padding: '1.4rem 1rem', textAlign: 'left', fontSize: '0.85rem', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 800 }}>Purchases</th>
                                <th style={{ padding: '1.4rem 1rem', textAlign: 'right', fontSize: '0.85rem', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 800 }}>Volume</th>
                                <th style={{ padding: '1.4rem 1rem', textAlign: 'right', fontSize: '0.85rem', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 800 }}>Investment</th>
                                <th style={{ padding: '1.4rem 2rem', textAlign: 'center', fontSize: '0.85rem', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 800 }}>Action</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredCustomers.length === 0 ? (
                                <tr>
                                    <td colSpan="7" style={{ padding: '6rem 2rem', textAlign: 'center' }}>
                                        <div style={{ opacity: 0.6 }}>
                                            <div style={{ fontSize: '3.5rem', marginBottom: '1rem' }}>📭</div>
                                            <div style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--muted)' }}>No client profiles found matching your search.</div>
                                        </div>
                                    </td>
                                </tr>
                            ) : (
                                filteredCustomers.map((c, idx) => {
                                    const rev = customerRevenue[c.name] || { total: 0, orders: 0, products: new Set() };
                                    const isAdmin = c.type === 'admin';
                                    return (
                                        <tr key={c.id} style={{ borderBottom: '1px solid #f1f5f9', transition: 'background 0.3s' }}>
                                            <td style={{ padding: '1.4rem 2rem' }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                                    <div style={{
                                                        width: '44px', height: '44px', borderRadius: '12px',
                                                        background: isAdmin ? '#1e293b' : (idx % 2 === 0 ? 'var(--accent-light)' : 'var(--blue-bg)'),
                                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                        fontWeight: 800, color: isAdmin ? 'white' : (idx % 2 === 0 ? 'var(--accent)' : 'var(--blue)'), fontSize: '1.1rem'
                                                    }}>{isAdmin ? '🛡️' : c.name.charAt(0)}</div>
                                                    <div>
                                                        <div style={{ fontWeight: 800, color: 'var(--ink)', fontSize: '1rem' }}>{c.isSystemProfile ? (c.profile?.businessName || c.name) : c.name}</div>
                                                        <div style={{ fontSize: '0.8rem', color: 'var(--muted)', fontWeight: 600 }}>{isAdmin ? `@${c.username}` : (c.isSystemProfile ? (c.profile?.phone || 'System Device') : (c.phone || c.email || 'No contact info'))}</div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td style={{ padding: '1.4rem 1rem' }}>
                                                <span style={{
                                                    padding: '0.4rem 0.9rem',
                                                    background: isAdmin ? '#1e293b' : (c.isSystemProfile ? 'var(--blue-bg)' : (c.type === 'franchise' ? 'var(--purple-bg)' : '#f1f5f9')),
                                                    color: isAdmin ? 'white' : (c.isSystemProfile ? 'var(--blue)' : (c.type === 'franchise' ? 'var(--purple)' : 'var(--ink)')),
                                                    borderRadius: '10px', fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase',
                                                    border: c.isSystemProfile ? '1px solid var(--blue)' : 'none',
                                                    display: 'inline-block',
                                                    whiteSpace: 'nowrap'
                                                }}>
                                                    {isAdmin ? (c.role === 'staff' ? `STAFF (${users.find(u => u.role === 'admin' && (u.station === c.station || u.branch_id === c.branch_id))?.name || c.station})` : 'ADMINISTRATOR') : (c.isSystemProfile ? 'SYSTEM PROFILE' : c.type)}
                                                </span>
                                            </td>
                                            <td style={{ padding: '1.4rem 1rem' }}>
                                                <div style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--ink)' }}>{c.branch || '—'}</div>
                                            </td>
                                            <td style={{ padding: '1.4rem 1rem' }}>
                                                <div style={{ fontSize: '0.8rem', maxWidth: '180px', color: 'var(--muted)', fontWeight: 500, lineHeight: 1.4 }}>
                                                    {isAdmin ? 'Full System Access' : (Array.from(rev.products).slice(0, 3).join(', ') || 'None')}
                                                    {!isAdmin && rev.products.size > 3 && ` +${rev.products.size - 3} more`}
                                                </div>
                                            </td>
                                            <td style={{ padding: '1.4rem 1rem', textAlign: 'right', fontWeight: 700, fontSize: '0.95rem' }}>{isAdmin ? '—' : rev.orders}</td>
                                            <td style={{ padding: '1.4rem 1rem', textAlign: 'right', fontWeight: 800, color: 'var(--accent)', fontSize: '1rem' }}>
                                                {isAdmin ? '—' : `₹${rev.total.toLocaleString()}`}
                                            </td>
                                            <td style={{ padding: '1.4rem 2rem', textAlign: 'center' }}>
                                                <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center' }}>
                                                    {isAdmin ? (
                                                        <>
                                                            <button
                                                                onClick={() => setViewingUser(c)}
                                                                style={{
                                                                    background: '#e0e7ff', border: 'none', color: '#4f46e5',
                                                                    padding: '0.6rem', borderRadius: '10px', cursor: 'pointer',
                                                                    transition: 'transform 0.2s'
                                                                }}
                                                            >
                                                                👁️
                                                            </button>
                                                            <button
                                                                onClick={() => setEditingAdmin(c)}
                                                                style={{
                                                                    background: '#f1f5f9', border: 'none', color: '#1e293b',
                                                                    padding: '0.6rem', borderRadius: '10px', cursor: 'pointer',
                                                                    transition: 'transform 0.2s'
                                                                }}
                                                            >
                                                                ✏️
                                                            </button>
                                                            <button
                                                                onClick={() => {
                                                                    showConfirm({
                                                                        title: 'Delete Admin',
                                                                        message: 'Are you sure you want to delete this Admin account?',
                                                                        onConfirm: () => deleteUser(c.id)
                                                                    });
                                                                }}
                                                                style={{
                                                                    background: 'var(--red-bg)', border: 'none', color: 'var(--red)',
                                                                    padding: '0.6rem', borderRadius: '10px', cursor: 'pointer',
                                                                    transition: 'transform 0.2s'
                                                                }}
                                                            >
                                                                🗑
                                                            </button>
                                                        </>
                                                    ) : (
                                                        <button
                                                            onClick={() => {
                                                                showConfirm({
                                                                    title: 'Remove Client',
                                                                    message: 'Are you sure you want to permanently remove this client profile?',
                                                                    onConfirm: () => deleteDocument(c.id)
                                                                });
                                                            }}
                                                            style={{
                                                                background: 'var(--red-bg)', border: 'none', color: 'var(--red)',
                                                                padding: '0.6rem', borderRadius: '10px', cursor: 'pointer',
                                                                transition: 'transform 0.2s'
                                                            }}
                                                            onMouseOver={e => e.currentTarget.style.transform = 'scale(1.1)'}
                                                            onMouseOut={e => e.currentTarget.style.transform = 'scale(1)'}
                                                        >
                                                            🗑
                                                        </button>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Premium Add Modal */}
            {showModal && (
                <div style={{
                    position: 'fixed', inset: 0, zIndex: 1000,
                    background: 'rgba(15, 23, 42, 0.5)',
                    backdropFilter: 'blur(12px)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1.5rem'
                }}>
                    <div className="glass shadow-premium" style={{
                        width: '100%', maxWidth: '600px',
                        padding: '3rem', borderRadius: '32px',
                        background: 'rgba(255, 255, 255, 0.95)',
                        border: '1px solid rgba(255, 255, 255, 0.4)',
                        animation: 'riseIn 0.5s cubic-bezier(0.19, 1, 0.22, 1)',
                        maxHeight: '90vh',
                        overflowY: 'auto',
                        scrollbarWidth: 'thin',
                        scrollbarColor: 'var(--accent) transparent'
                    }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '2.5rem' }}>
                            <div>
                                <h2 style={{ margin: 0, fontFamily: "'Yeseva One', serif", fontSize: '2rem' }}>New Client <span style={{ color: 'var(--accent)' }}>Registration</span></h2>
                                <p style={{ margin: '0.5rem 0 0', fontSize: '0.9rem', color: 'var(--muted)', fontWeight: 600 }}>Enter details to expand your business network.</p>
                            </div>
                            <button onClick={() => setShowModal(false)} style={{ background: 'none', border: 'none', color: 'var(--muted)', fontSize: '1.8rem', cursor: 'pointer', opacity: 0.5 }}>✕</button>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
                            <div style={{ gridColumn: 'span 2' }}>
                                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 800, marginBottom: '0.6rem', textTransform: 'uppercase', color: 'var(--muted)', letterSpacing: '0.05em' }}>Full Name *</label>
                                <input
                                    style={{
                                        width: '100%', padding: '0.9rem 1.2rem', borderRadius: '14px',
                                        border: '1.5px solid #e2e8f0', background: '#f8fafc',
                                        fontSize: '1rem', outline: 'none'
                                    }}
                                    placeholder="e.g. Aditiya Sharma"
                                    value={newCustomer.name} onChange={e => setNewCustomer({ ...newCustomer, name: e.target.value })}
                                />
                            </div>
                            <div>
                                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 800, marginBottom: '0.6rem', textTransform: 'uppercase', color: 'var(--muted)', letterSpacing: '0.05em' }}>Relation Type</label>
                                <select
                                    style={{
                                        width: '100%', padding: '0.9rem 1.2rem', borderRadius: '14px',
                                        border: '1.5px solid #e2e8f0', background: '#f8fafc',
                                        fontSize: '1rem', outline: 'none'
                                    }}
                                    value={newCustomer.type} onChange={e => setNewCustomer({ ...newCustomer, type: e.target.value })}
                                >
                                    <option value="regular">Regular Patron</option>
                                    <option value="franchise">Franchise Buyer</option>
                                    <option value="rent">Rent Client</option>
                                </select>
                            </div>
                            <div>
                                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 800, marginBottom: '0.6rem', textTransform: 'uppercase', color: 'var(--muted)', letterSpacing: '0.05em' }}>Assigned Branch</label>
                                <select
                                    style={{
                                        width: '100%', padding: '0.9rem 1.2rem', borderRadius: '14px',
                                        border: '1.5px solid #e2e8f0', background: '#f8fafc',
                                        fontSize: '1rem', outline: 'none'
                                    }}
                                    value={newCustomer.branch} onChange={e => setNewCustomer({ ...newCustomer, branch: e.target.value })}
                                >
                                    <option value="">Select Branch</option>
                                    {branches.map(br => (
                                        <option key={br.id} value={`${br.name} — ${br.city}`}>{br.name} — {br.city}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 800, marginBottom: '0.6rem', textTransform: 'uppercase', color: 'var(--muted)', letterSpacing: '0.05em' }}>📞 Phone Number</label>
                                <input
                                    style={{
                                        width: '100%', padding: '0.9rem 1.2rem', borderRadius: '14px',
                                        border: '1.5px solid #e2e8f0', background: '#f8fafc',
                                        fontSize: '1rem', outline: 'none'
                                    }}
                                    placeholder="e.g. 9876543210"
                                    value={newCustomer.phone} onChange={e => setNewCustomer({ ...newCustomer, phone: e.target.value })}
                                />
                            </div>
                            <div>
                                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 800, marginBottom: '0.6rem', textTransform: 'uppercase', color: 'var(--muted)', letterSpacing: '0.05em' }}>💰 Franchise Fee (₹)</label>
                                <input
                                    type="number"
                                    style={{
                                        width: '100%', padding: '0.9rem 1.2rem', borderRadius: '14px',
                                        border: '1.5px solid #e2e8f0', background: '#f8fafc',
                                        fontSize: '1rem', outline: 'none'
                                    }}
                                    placeholder="e.g. 50000"
                                    value={newCustomer.franchiseFee} onChange={e => setNewCustomer({ ...newCustomer, franchiseFee: e.target.value })}
                                />
                            </div>
                        </div>
                        <div style={{ display: 'flex', gap: '1rem', marginTop: '3rem' }}>
                            <button className="btn btn-outline" style={{ flex: 1, padding: '1rem', borderRadius: '16px' }} onClick={() => setShowModal(false)}>Discard</button>
                            <button className="btn btn-primary" style={{ flex: 1, padding: '1rem', borderRadius: '16px', fontWeight: 700 }} onClick={handleAddCustomer}>Complete Registration</button>
                        </div>
                    </div>
                </div>
            )}
            {/* Admin Creation Modal */}
            {showAdminModal && (
                <div style={{
                    position: 'fixed', inset: 0, zIndex: 1000,
                    background: 'rgba(15, 23, 42, 0.5)',
                    backdropFilter: 'blur(12px)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1.5rem'
                }}>
                    <div className="glass shadow-premium" style={{
                        width: '100%', maxWidth: '550px',
                        padding: '3rem', borderRadius: '32px',
                        background: 'rgba(255, 255, 255, 0.95)',
                        border: '1px solid rgba(255, 255, 255, 0.4)',
                        animation: 'riseIn 0.5s cubic-bezier(0.19, 1, 0.22, 1)',
                        maxHeight: '90vh',
                        overflowY: 'auto',
                        paddingBottom: '150px'
                    }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '2.5rem' }}>
                            <div>
                                <h2 style={{ margin: 0, fontFamily: "'Yeseva One', serif", fontSize: '2rem' }}>Create Admin <span style={{ color: 'var(--accent)' }}>Login</span></h2>
                                <p style={{ margin: '0.5rem 0 0', fontSize: '0.9rem', color: 'var(--muted)', fontWeight: 600 }}>Assign administrative access to a specific branch.</p>
                            </div>
                            <button onClick={() => setShowAdminModal(false)} style={{ background: 'none', border: 'none', color: 'var(--muted)', fontSize: '1.8rem', cursor: 'pointer', opacity: 0.5 }}>✕</button>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
                            <div style={{ gridColumn: 'span 2' }}>
                                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 800, marginBottom: '0.6rem', textTransform: 'uppercase', color: 'var(--muted)', letterSpacing: '0.05em' }}>Admin Full Name *</label>
                                <input
                                    style={{
                                        width: '100%', padding: '0.9rem 1.2rem', borderRadius: '14px',
                                        border: '1.5px solid #e2e8f0', background: '#f8fafc',
                                        fontSize: '1rem', outline: 'none'
                                    }}
                                    placeholder="e.g. Rahul Kumar"
                                    value={newAdmin.name} onChange={e => setNewAdmin({ ...newAdmin, name: e.target.value })}
                                />
                            </div>
                            <div style={{ gridColumn: 'span 2' }}>
                                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 800, marginBottom: '0.6rem', textTransform: 'uppercase', color: 'var(--muted)', letterSpacing: '0.05em' }}>Assigned Branch *</label>
                                <input
                                    list="branch-options"
                                    style={{
                                        width: '100%', padding: '0.9rem 1.2rem', borderRadius: '14px',
                                        border: '1.5px solid #e2e8f0', background: '#f8fafc',
                                        fontSize: '1rem', outline: 'none'
                                    }}
                                    placeholder="Enter or select branch name"
                                    value={newAdmin.branch} 
                                    onChange={e => setNewAdmin({ ...newAdmin, branch: e.target.value })}
                                />
                                <datalist id="branch-options">
                                    {branches.map(br => (
                                        <option key={br.id} value={br.name}>{br.city}</option>
                                    ))}
                                </datalist>
                            </div>
                            <div>
                                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 800, marginBottom: '0.6rem', textTransform: 'uppercase', color: 'var(--muted)', letterSpacing: '0.05em' }}>🔐 Username *</label>
                                <input
                                    autoComplete="off"
                                    placeholder="username"
                                    style={{
                                        width: '100%', padding: '0.9rem 1.2rem', borderRadius: '14px',
                                        border: '1.5px solid #e2e8f0', background: '#f8fafc',
                                        fontSize: '1rem', outline: 'none'
                                    }}
                                    value={newAdmin.username} onChange={e => setNewAdmin({ ...newAdmin, username: e.target.value })}
                                />
                            </div>
                            <div>
                                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 800, marginBottom: '0.6rem', textTransform: 'uppercase', color: 'var(--muted)', letterSpacing: '0.05em' }}>🔑 Password *</label>
                                <div style={{ position: 'relative' }}>
                                    <input
                                        type={showPassword ? "text" : "password"}
                                        autoComplete="new-password"
                                        placeholder="********"
                                        style={{
                                            width: '100%', padding: '0.9rem 3.5rem 0.9rem 1.2rem', borderRadius: '14px',
                                            border: '1.5px solid #e2e8f0', background: '#f8fafc',
                                            fontSize: '1rem', outline: 'none'
                                        }}
                                        value={newAdmin.password} onChange={e => setNewAdmin({ ...newAdmin, password: e.target.value })}
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
                                        style={{
                                            position: 'absolute', right: '1rem', top: '50%', transform: 'translateY(-50%)',
                                            background: 'none', border: 'none', color: 'var(--muted)', cursor: 'pointer',
                                            display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: 0.6
                                        }}
                                    >
                                        {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                                    </button>
                                </div>
                            </div>

                            {/* EXTRA BRANCH FIELDS */}
                            <div style={{ gridColumn: 'span 2' }}>
                                <hr style={{ border: 'none', borderTop: '1px solid #e2e8f0', margin: '1rem 0' }} />
                                <h4 style={{ margin: '0 0 1rem', fontSize: '0.9rem', color: 'var(--accent)' }}>Branch Detail Information</h4>
                            </div>


                            <div>
                                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 800, marginBottom: '0.6rem', textTransform: 'uppercase', color: 'var(--muted)', letterSpacing: '0.05em' }}>🏙️ Place</label>
                                <input
                                    style={{ width: '100%', padding: '0.9rem 1.2rem', borderRadius: '14px', border: '1.5px solid #e2e8f0', background: '#f8fafc', fontSize: '1rem', outline: 'none' }}
                                    placeholder="e.g. Adyar or Anna Nagar"
                                    value={newAdmin.city} onChange={e => setNewAdmin({ ...newAdmin, city: e.target.value })}
                                />
                            </div>
                            <div>
                                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 800, marginBottom: '0.6rem', textTransform: 'uppercase', color: 'var(--muted)', letterSpacing: '0.05em' }}>🌍 Country</label>
                                <select
                                    style={{ width: '100%', padding: '0.9rem 1.2rem', borderRadius: '14px', border: '1.5px solid #e2e8f0', background: '#f8fafc', fontSize: '1rem', outline: 'none' }}
                                    value={newAdmin.country} onChange={e => setNewAdmin({ ...newAdmin, country: e.target.value })}
                                >
                                    <option value="India">India</option>
                                    <option value="USA">USA</option>
                                    <option value="UK">UK</option>
                                    <option value="UAE">UAE</option>
                                    <option value="Singapore">Singapore</option>
                                </select>
                            </div>
                            <div>
                                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 800, marginBottom: '0.6rem', textTransform: 'uppercase', color: 'var(--muted)', letterSpacing: '0.05em' }}>📍 District</label>
                                <select
                                    style={{ width: '100%', padding: '0.9rem 1.2rem', borderRadius: '14px', border: '1.5px solid #e2e8f0', background: '#f8fafc' }}
                                    value={newAdmin.district} onChange={e => setNewAdmin({ ...newAdmin, district: e.target.value })}
                                >
                                    <option value="">Select District</option>
                                    {TN_DISTRICTS.map(d => <option key={d} value={d}>{d}</option>)}
                                </select>
                            </div>
                            <div>
                                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 800, marginBottom: '0.6rem', textTransform: 'uppercase', color: 'var(--muted)', letterSpacing: '0.05em' }}>🚩 State</label>
                                <input
                                    style={{ width: '100%', padding: '0.9rem 1.2rem', borderRadius: '14px', border: '1.5px solid #e2e8f0', background: '#f8fafc', fontSize: '1rem', outline: 'none' }}
                                    placeholder="State Name"
                                    value={newAdmin.state} onChange={e => setNewAdmin({ ...newAdmin, state: e.target.value })}
                                />
                            </div>
                            <div>
                                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 800, marginBottom: '0.6rem', textTransform: 'uppercase', color: 'var(--muted)', letterSpacing: '0.05em' }}>📮 Pincode</label>
                                <input
                                    type="number"
                                    style={{ width: '100%', padding: '0.9rem 1.2rem', borderRadius: '14px', border: '1.5px solid #e2e8f0', background: '#f8fafc', fontSize: '1rem', outline: 'none' }}
                                    placeholder="6-digit PIN"
                                    value={newAdmin.pincode} onChange={e => setNewAdmin({ ...newAdmin, pincode: e.target.value })}
                                />
                            </div>
                            <div style={{ gridColumn: 'span 2' }}>
                                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 800, marginBottom: '0.6rem', textTransform: 'uppercase', color: 'var(--muted)', letterSpacing: '0.05em' }}>🏠 Branch Address</label>
                                <textarea
                                    style={{ width: '100%', padding: '0.9rem 1.2rem', borderRadius: '14px', border: '1.5px solid #e2e8f0', background: '#f8fafc', minHeight: '80px', resize: 'vertical' }}
                                    placeholder="Full Branch Address..."
                                    value={newAdmin.address} onChange={e => setNewAdmin({ ...newAdmin, address: e.target.value })}
                                />
                            </div>
                        </div>
                        <div style={{ display: 'flex', gap: '1rem', marginTop: '3rem' }}>
                            <button className="btn btn-outline" style={{ flex: 1, padding: '1rem', borderRadius: '16px' }} onClick={() => setShowAdminModal(false)}>Discard</button>
                            <button className="btn btn-primary" disabled={isProcessing} style={{ flex: 1, padding: '1rem', borderRadius: '16px', fontWeight: 700, opacity: isProcessing ? 0.7 : 1 }} onClick={handleAddAdmin}>
                                {isProcessing ? 'Synchronizing...' : 'Generate Credentials'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
            {/* Edit Admin Modal */}
            {editingAdmin && (
                <div style={{
                    position: 'fixed', inset: 0, zIndex: 1000,
                    background: 'rgba(15, 23, 42, 0.5)',
                    backdropFilter: 'blur(12px)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1.5rem'
                }}>
                    <div className="glass shadow-premium" style={{
                        width: '100%', maxWidth: '550px',
                        padding: '3rem', borderRadius: '32px',
                        background: 'rgba(255, 255, 255, 0.95)',
                        border: '1px solid rgba(255, 255, 255, 0.4)',
                        animation: 'riseIn 0.5s cubic-bezier(0.19, 1, 0.22, 1)',
                        maxHeight: '90vh',
                        overflowY: 'auto',
                        paddingBottom: '150px'
                    }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '2.5rem' }}>
                            <div>
                                <h2 style={{ margin: 0, fontFamily: "'Yeseva One', serif", fontSize: '2rem' }}>Update Admin <span style={{ color: 'var(--accent)' }}>Login</span></h2>
                                <p style={{ margin: '0.5rem 0 0', fontSize: '0.9rem', color: 'var(--muted)', fontWeight: 600 }}>Modify administrative credentials for {editingAdmin.name}.</p>
                            </div>
                            <button onClick={() => setEditingAdmin(null)} style={{ background: 'none', border: 'none', color: 'var(--muted)', fontSize: '1.8rem', cursor: 'pointer', opacity: 0.5 }}>✕</button>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
                            <div style={{ gridColumn: 'span 2' }}>
                                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 800, marginBottom: '0.6rem', textTransform: 'uppercase', color: 'var(--muted)', letterSpacing: '0.05em' }}>Admin Full Name *</label>
                                <input
                                    style={{
                                        width: '100%', padding: '0.9rem 1.2rem', borderRadius: '14px',
                                        border: '1.5px solid #e2e8f0', background: '#f8fafc',
                                        fontSize: '1rem', outline: 'none'
                                    }}
                                    value={editingAdmin.name} onChange={e => setEditingAdmin({ ...editingAdmin, name: e.target.value })}
                                />
                            </div>
                            <div style={{ gridColumn: 'span 2' }}>
                                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 800, marginBottom: '0.6rem', textTransform: 'uppercase', color: 'var(--muted)', letterSpacing: '0.05em' }}>Assigned Branch *</label>
                                <select
                                    style={{
                                        width: '100%', padding: '0.9rem 1.2rem', borderRadius: '14px',
                                        border: '1.5px solid #e2e8f0', background: '#f8fafc',
                                        fontSize: '1rem', outline: 'none'
                                    }}
                                    value={editingAdmin.branch} onChange={e => setEditingAdmin({ ...editingAdmin, branch: e.target.value })}
                                >
                                    {branches.map(br => (
                                        <option key={br.id} value={`${br.name} — ${br.city}`}>{br.name} — {br.city}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 800, marginBottom: '0.6rem', textTransform: 'uppercase', color: 'var(--muted)', letterSpacing: '0.05em' }}>🔐 Username *</label>
                                <input
                                    style={{
                                        width: '100%', padding: '0.9rem 1.2rem', borderRadius: '14px',
                                        border: '1.5px solid #e2e8f0', background: '#f8fafc',
                                        fontSize: '1rem', outline: 'none'
                                    }}
                                    value={editingAdmin.username} onChange={e => setEditingAdmin({ ...editingAdmin, username: e.target.value })}
                                />
                            </div>
                            <div>
                                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 800, marginBottom: '0.6rem', textTransform: 'uppercase', color: 'var(--muted)', letterSpacing: '0.05em' }}>🔑 Password *</label>
                                <div style={{ position: 'relative' }}>
                                    <input
                                        type={showPassword ? "text" : "password"}
                                        placeholder="********"
                                        style={{
                                            width: '100%', padding: '0.9rem 3.5rem 0.9rem 1.2rem', borderRadius: '14px',
                                            border: '1.5px solid #e2e8f0', background: '#f8fafc',
                                            fontSize: '1rem', outline: 'none'
                                        }}
                                        value={editingAdmin.password} onChange={e => setEditingAdmin({ ...editingAdmin, password: e.target.value })}
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
                                        style={{
                                            position: 'absolute', right: '1rem', top: '50%', transform: 'translateY(-50%)',
                                            background: 'none', border: 'none', color: 'var(--muted)', cursor: 'pointer',
                                            display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: 0.6
                                        }}
                                    >
                                        {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                                    </button>
                                </div>
                            </div>
                        </div>
                        <div style={{ display: 'flex', gap: '1rem', marginTop: '3rem' }}>
                            <button className="btn btn-outline" style={{ flex: 1, padding: '1rem', borderRadius: '16px' }} onClick={() => setEditingAdmin(null)}>Cancel</button>
                            <button className="btn btn-primary" disabled={isProcessing} style={{ flex: 1, padding: '1rem', borderRadius: '16px', fontWeight: 700, opacity: isProcessing ? 0.7 : 1 }} onClick={async () => {
                                if (isProcessing) return;
                                setIsProcessing(true);
                                try {
                                    const { id, ...data } = editingAdmin;
                                    console.log("[Customers] Updating Admin:", id);
                                    
                                    showToast('Verifying security gate...', 'info');
                                    
                                    try {
                                        await createUserWithEmailAndPassword(provisioningAuth, data.username, data.password);
                                        console.log("[Customers] New auth record created for update.");
                                        await provisioningAuth.signOut();
                                    } catch (e) {
                                        console.log("[Customers] Auth record state:", e.code || e.message);
                                    }

                                    await updateUser(id, { ...data, approved: true });
                                    setEditingAdmin(null);
                                    showToast('Admin Profile Synchronized!', 'success');
                                } catch (err) {
                                    console.error("[Customers] Update error:", err);
                                    showToast('Bug: ' + err.message, 'error');
                                } finally {
                                    setIsProcessing(false);
                                }
                            }}>{isProcessing ? 'Processing...' : 'Save Changes'}</button>
                        </div>
                    </div>
                </div>
            )}
            {/* View Admin/Staff Modal */}
            {viewingUser && (
                <div style={{
                    position: 'fixed', inset: 0, zIndex: 10000,
                    background: 'rgba(15, 23, 42, 0.5)',
                    backdropFilter: 'blur(12px)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1.5rem'
                }}>
                    <div className="glass shadow-premium" style={{
                        width: '100%', maxWidth: '500px',
                        padding: '3rem', borderRadius: '32px',
                        background: 'rgba(255, 255, 255, 0.95)',
                        border: '1px solid rgba(255, 255, 255, 0.4)',
                        animation: 'riseIn 0.5s cubic-bezier(0.19, 1, 0.22, 1)',
                        maxHeight: '90vh',
                        overflowY: 'auto'
                    }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '2.5rem' }}>
                            <div>
                                <h2 style={{ margin: 0, fontFamily: "'Yeseva One', serif", fontSize: '2rem' }}>User <span style={{ color: 'var(--accent)' }}>Details</span></h2>
                                <p style={{ margin: '0.5rem 0 0', fontSize: '0.9rem', color: 'var(--muted)', fontWeight: 600 }}>Viewing information for {viewingUser.name}.</p>
                            </div>
                            <button onClick={() => setViewingUser(null)} style={{ background: 'none', border: 'none', color: 'var(--muted)', fontSize: '1.8rem', cursor: 'pointer', opacity: 0.5 }}>✕</button>
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                            <div style={{ background: '#f8fafc', padding: '1rem', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                                <div style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--muted)', textTransform: 'uppercase' }}>Full Name</div>
                                <div style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--ink)' }}>{viewingUser.name || '—'}</div>
                            </div>
                            <div style={{ background: '#f8fafc', padding: '1rem', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                                <div style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--muted)', textTransform: 'uppercase' }}>Username</div>
                                <div style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--accent)' }}>{viewingUser.username || '—'}</div>
                            </div>
                            <div style={{ background: '#f8fafc', padding: '1rem', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                                <div style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--muted)', textTransform: 'uppercase' }}>Role Classification</div>
                                <div style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--ink)', textTransform: 'uppercase' }}>{viewingUser.role || '—'}</div>
                            </div>
                            <div style={{ background: '#f8fafc', padding: '1rem', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                                <div style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--muted)', textTransform: 'uppercase' }}>Assigned Station / Branch</div>
                                <div style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--ink)' }}>{viewingUser.station || viewingUser.branch || viewingUser.branch_id || '—'}</div>
                            </div>
                            <div style={{ background: '#f8fafc', padding: '1rem', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                                <div style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--muted)', textTransform: 'uppercase' }}>Phone Contact</div>
                                <div style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--ink)' }}>{viewingUser.phone || '—'}</div>
                            </div>
                            {viewingUser.city && (
                                <div style={{ background: '#f8fafc', padding: '1rem', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                                    <div style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--muted)', textTransform: 'uppercase' }}>Location Details</div>
                                    <div style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--ink)' }}>{viewingUser.city}, {viewingUser.district || viewingUser.state || ''}</div>
                                </div>
                            )}
                            <div style={{ background: '#f8fafc', padding: '1rem', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                                <div style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--muted)', textTransform: 'uppercase' }}>Password</div>
                                <div style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--ink)' }}>{viewingUser.password || '—'}</div>
                            </div>
                            <div style={{ background: '#f8fafc', padding: '1rem', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                                <div style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--muted)', textTransform: 'uppercase' }}>Account Status</div>
                                <div style={{ fontSize: '1.1rem', fontWeight: 700, color: viewingUser.status === 'active' ? '#10b981' : 'var(--red)', textTransform: 'uppercase' }}>{viewingUser.status || 'active'}</div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
