import React, { useState, useEffect } from 'react';
import { useDevice } from '../context/DeviceContext';
import { db } from '../firebaseConfig';
import { 
    collection, 
    addDoc, 
    getDocs, 
    updateDoc, 
    deleteDoc, 
    doc, 
    query, 
    where,
    orderBy,
    Timestamp 
} from 'firebase/firestore';
import { getTenantPath } from '../firebaseConfig';
import { 
    Tag, 
    Plus, 
    Trash2, 
    Edit, 
    Search, 
    ChevronRight, 
    Clock, 
    CheckCircle, 
    XCircle,
    Percent,
    IndianRupee,
    Calendar,
    Users,
    AlertCircle,
    X,
    TrendingUp,
    LayoutDashboard
} from 'lucide-react';
import toast from 'react-hot-toast';
import BulkCouponForm from '../components/coupon/BulkCouponForm';
import BulkCouponList from '../components/coupon/BulkCouponList';

export default function CouponManagement() {
    const { isMobile } = useDevice();
    const [activeTab, setActiveTab] = useState('single');
    const [coupons, setCoupons] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [editingCoupon, setEditingCoupon] = useState(null);
    const [adminList, setAdminList] = useState([]);

    // Form State
    const [formData, setFormData] = useState({
        code: '',
        discountType: 'percentage',
        discountValue: '',
        minOrderValue: '',
        startDate: '',
        expiryDate: '',
        usageLimit: '',
        isActive: true,
        assignedToAdminUID: ''
    });

    const userRole = sessionStorage.getItem('fb_user_role');
    const currentUserUID = sessionStorage.getItem('fb_user_uid');
    const isOwnerOrAdmin = userRole === 'owner' || userRole === 'admin';

    useEffect(() => {
        if (!isOwnerOrAdmin) {
            const path = userRole ? `#/${userRole}-dashboard` : '#/role-select';
            window.location.hash = path;
            return;
        }
        fetchCoupons();
        if (userRole === 'owner') {
            getDocs(query(collection(db, 'users'), where('ownerId', '==', currentUserUID)))
                .then(snap => {
                    const validUsers = snap.docs.filter(d => d.data().role === 'admin' || d.data().role === 'branch');
                    setAdminList(validUsers.map(d => ({
                        uid: d.id,
                        name: d.data().name || d.data().username || 'Admin',
                        branch: d.data().branch || d.data().station || ''
                    })));
                })
                .catch((err) => { console.error("Error fetching admin list: ", err); });
        }
    }, [isOwnerOrAdmin, userRole, currentUserUID]);

    const fetchCoupons = async () => {
        setLoading(true);
        try {
            const q = query(collection(db, getTenantPath('coupons')), orderBy('isActive', 'desc'));
            const querySnapshot = await getDocs(q);
            const list = querySnapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data(),
                startDate: doc.data().startDate?.toDate().toISOString().split('T')[0] || '',
                expiryDate: doc.data().expiryDate?.toDate().toISOString().split('T')[0] || ''
            }));
            
            // Filter by assignment if current user is an admin (Owners see all)
            const filteredList = userRole === 'owner' 
                ? list 
                : list.filter(c => !c.assignedToAdminUID || c.assignedToAdminUID === currentUserUID);
                
            setCoupons(filteredList.filter(c => !c.isBulk));
        } catch (error) {
            console.error("Error fetching coupons:", error);
            toast.error("Failed to load coupons");
        } finally {
            setLoading(false);
        }
    };

    const handleInputChange = (e) => {
        const { name, value, type, checked } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : value
        }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        // Validation
        if (!formData.code || !formData.discountValue || !formData.expiryDate || !formData.startDate) {
            toast.error("Please fill all required fields");
            return;
        }

        // [ENHANCEMENT] Prevent Owner from creating a coupon without explicitly assigning it to an Admin
        if (userRole === 'owner' && !formData.assignedToAdminUID) {
            toast.error("Please assign this coupon to a specific Admin/Branch");
            return;
        }

        const couponCode = formData.code.toUpperCase().trim();
        
        try {
            const assignedUID = userRole === 'owner' ? formData.assignedToAdminUID : currentUserUID;

            const couponData = {
                code: couponCode,
                discountType: formData.discountType,
                discountValue: Number(formData.discountValue),
                minOrderValue: Number(formData.minOrderValue || 0),
                startDate: Timestamp.fromDate(new Date(formData.startDate)),
                expiryDate: Timestamp.fromDate(new Date(formData.expiryDate)),
                usageLimit: Number(formData.usageLimit || 9999),
                usedCount: editingCoupon ? editingCoupon.usedCount : 0,
                isActive: formData.isActive,
                createdAt: editingCoupon ? editingCoupon.createdAt : Timestamp.now(),

                // Audit metadata
                createdByRole: userRole,
                createdByUID: currentUserUID,

                assignedToAdminUID: assignedUID,
                assignedAdminName: userRole === 'owner' && assignedUID
                    ? (adminList.find(a => a.uid === assignedUID)?.name || '')
                    : (sessionStorage.getItem('fb_user_name') || ''),
                assignedBranch: userRole === 'owner' && assignedUID
                    ? (adminList.find(a => a.uid === assignedUID)?.branch || '')
                    : (sessionStorage.getItem('fb_user_station') || '')
            };

            if (editingCoupon) {
                await updateDoc(doc(db, getTenantPath('coupons'), editingCoupon.id), couponData);
                toast.success("Coupon updated successfully");
            } else {
                // Check for duplicate code
                const q = query(collection(db, getTenantPath('coupons')), where('code', '==', couponCode));
                const existing = await getDocs(q);
                if (!existing.empty) {
                    toast.error("Coupon code already exists");
                    return;
                }
                await addDoc(collection(db, getTenantPath('coupons')), couponData);
                toast.success("Coupon created successfully");
            }

            setFormData({
                code: '',
                discountType: 'percentage',
                discountValue: '',
                minOrderValue: '',
                startDate: '',
                expiryDate: '',
                usageLimit: '',
                isActive: true,
                assignedToAdminUID: ''
            });
            setShowForm(false);
            setEditingCoupon(null);
            fetchCoupons();
        } catch (error) {
            console.error("Error saving coupon:", error);
            toast.error("Failed to save coupon");
        }
    };

    const handleToggleActive = async (coupon) => {
        try {
            await updateDoc(doc(db, getTenantPath('coupons'), coupon.id), {
                isActive: !coupon.isActive
            });
            toast.success(`Coupon ${!coupon.isActive ? 'activated' : 'deactivated'}`);
            fetchCoupons();
        } catch (error) {
            toast.error("Update failed");
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm("Are you sure you want to delete this coupon?")) return;
        try {
            await deleteDoc(doc(db, getTenantPath('coupons'), id));
            toast.success("Coupon deleted");
            fetchCoupons();
        } catch (error) {
            toast.error("Delete failed");
        }
    };

    const editCoupon = (coupon) => {
        setEditingCoupon(coupon);
        setFormData({
            code: coupon.code,
            discountType: coupon.discountType,
            discountValue: coupon.discountValue,
            minOrderValue: coupon.minOrderValue,
            startDate: coupon.startDate,
            expiryDate: coupon.expiryDate,
            usageLimit: coupon.usageLimit,
            isActive: coupon.isActive,
            assignedToAdminUID: coupon.assignedToAdminUID || ''
        });
        setShowForm(true);
    };

    const cardStyle = {
        background: 'white',
        borderRadius: '24px',
        padding: '2rem',
        border: '1px solid #e2e8f0',
        boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)',
        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
    };

    const labelStyle = {
        fontSize: '0.75rem',
        fontWeight: 800,
        textTransform: 'uppercase',
        color: '#64748b',
        letterSpacing: '0.05em',
        marginBottom: '0.5rem',
        display: 'block'
    };

    const inputStyle = {
        width: '100%',
        padding: '0.75rem 1rem',
        borderRadius: '12px',
        border: '1.5px solid #e2e8f0',
        outline: 'none',
        fontSize: '0.9rem',
        fontWeight: '500',
        transition: 'all 0.2s',
        color: '#1e293b'
    };

    if (!isOwnerOrAdmin) return null;

    return (
        <div style={{ padding: isMobile ? '1rem' : '2rem', paddingTop: isMobile ? 'calc(1rem + 38px)' : '2rem', minHeight: '100vh', background: '#f8fafc', fontFamily: "'Inter', sans-serif", paddingBottom: isMobile ? '80px' : '2rem' }}>
            
            {/* Header Section */}
            <div style={{ marginBottom: isMobile ? '1.5rem' : '2.5rem', display: 'flex', flexDirection: isMobile ? 'column' : 'row', justifyContent: 'space-between', alignItems: isMobile ? 'flex-start' : 'center', gap: isMobile ? '1rem' : '0' }}>
                <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: isMobile ? '0.75rem' : '1rem', marginBottom: '0.5rem' }}>
                        <div style={{ width: isMobile ? '40px' : '48px', height: isMobile ? '40px' : '48px', borderRadius: '14px', background: '#f5f3ff', color: '#6366f1', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <Tag size={isMobile ? 20 : 24} />
                        </div>
                        <h1 style={{ margin: 0, fontFamily: "'Yeseva One', serif", fontSize: isMobile ? '1.8rem' : '2.4rem', color: '#1e293b' }}>
                            Coupon <span style={{ color: '#6366f1' }}>Management</span>
                        </h1>
                    </div>
                    <p style={{ color: '#64748b', fontSize: isMobile ? '0.85rem' : '1rem', fontWeight: 500, margin: 0 }}>
                        Create and monitor promotional offers for all franchise branches.
                    </p>
                </div>
                
                {activeTab === 'single' && (
                    <button 
                        onClick={() => { setShowForm(!showForm); setEditingCoupon(null); }}
                        style={{ 
                            background: showForm ? '#f1f5f9' : 'linear-gradient(135deg, #6366f1, #4f46e5)',
                            color: showForm ? '#1e293b' : 'white',
                            padding: isMobile ? '0.65rem 1rem' : '0.75rem 1.5rem',
                            borderRadius: '14px',
                            border: 'none',
                            fontWeight: 800,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '0.5rem',
                            width: isMobile ? '100%' : 'auto',
                            cursor: 'pointer',
                            boxShadow: showForm ? 'none' : '0 10px 15px -3px rgba(99, 102, 241, 0.3)',
                            transition: '0.3s'
                        }}
                    >
                        {showForm ? <X size={isMobile ? 18 : 20} /> : <Plus size={isMobile ? 18 : 20} />}
                        {showForm ? 'Close Editor' : 'Create New Coupon'}
                    </button>
                )}
            </div>

            {/* TAB NAVIGATION */}
            <div style={{ display: 'flex', overflowX: 'auto', overflowY: 'hidden', gap: '0.75rem', marginBottom: '1.5rem', paddingBottom: '0.5rem', whiteSpace: 'nowrap', WebkitOverflowScrolling: 'touch', msOverflowStyle: 'none', scrollbarWidth: 'none' }}>
                <button 
                    onClick={() => setActiveTab('single')} 
                    style={{ padding: '0.6rem 1.25rem', fontSize: '0.875rem', fontWeight: 800, borderRadius: '12px', cursor: 'pointer', transition: '0.2s', border: activeTab === 'single' ? 'none' : '1px solid #e2e8f0', background: activeTab === 'single' ? 'linear-gradient(135deg, #6366f1, #4f46e5)' : 'white', color: activeTab === 'single' ? 'white' : '#64748b', boxShadow: activeTab === 'single' ? '0 4px 6px -1px rgba(99, 102, 241, 0.2)' : '0 1px 2px rgba(0,0,0,0.05)' }}
                >Single Coupons</button>
                <button 
                    onClick={() => setActiveTab('bulkList')} 
                    style={{ padding: '0.6rem 1.25rem', fontSize: '0.875rem', fontWeight: 800, borderRadius: '12px', cursor: 'pointer', transition: '0.2s', border: activeTab === 'bulkList' ? 'none' : '1px solid #e2e8f0', background: activeTab === 'bulkList' ? 'linear-gradient(135deg, #6366f1, #4f46e5)' : 'white', color: activeTab === 'bulkList' ? 'white' : '#64748b', boxShadow: activeTab === 'bulkList' ? '0 4px 6px -1px rgba(99, 102, 241, 0.2)' : '0 1px 2px rgba(0,0,0,0.05)' }}
                >Bulk Batches</button>
                <button 
                    onClick={() => setActiveTab('bulkForm')} 
                    style={{ padding: '0.6rem 1.25rem', fontSize: '0.875rem', fontWeight: 800, borderRadius: '12px', cursor: 'pointer', transition: '0.2s', border: activeTab === 'bulkForm' ? 'none' : '1px solid #e2e8f0', background: activeTab === 'bulkForm' ? 'linear-gradient(135deg, #6366f1, #4f46e5)' : 'white', color: activeTab === 'bulkForm' ? 'white' : '#64748b', boxShadow: activeTab === 'bulkForm' ? '0 4px 6px -1px rgba(99, 102, 241, 0.2)' : '0 1px 2px rgba(0,0,0,0.05)' }}
                >Bulk Generator</button>
            </div>

            {activeTab === 'bulkForm' && (
                <BulkCouponForm onSuccess={() => setActiveTab('bulkList')} />
            )}

            {activeTab === 'bulkList' && (
                <BulkCouponList />
            )}

            {activeTab === 'single' && (
                <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : (showForm ? '1fr 380px' : '1fr'), gap: isMobile ? '1rem' : '2rem', alignItems: 'start' }}>
                
                {/* Coupon List Container */}
                <div style={{ ...cardStyle, padding: isMobile ? '1.25rem' : '2rem', display: (isMobile && showForm) ? 'none' : 'block' }}>
                    <div style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', justifyContent: 'space-between', alignItems: isMobile ? 'flex-start' : 'center', gap: isMobile ? '1rem' : '0', marginBottom: '1.5rem' }}>
                        <h2 style={{ fontSize: isMobile ? '1.1rem' : '1.25rem', fontWeight: 900, color: '#1e293b', margin: 0 }}>Active Campaigns</h2>
                        <div style={{ position: 'relative', width: isMobile ? '100%' : 'auto' }}>
                            <Search size={18} color="#94a3b8" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
                            <input 
                                type="text" 
                                placeholder="Search coupon code..." 
                                style={{ ...inputStyle, paddingLeft: '2.5rem', width: isMobile ? '100%' : '250px', background: '#f8fafc', boxSizing: 'border-box' }}
                            />
                        </div>
                    </div>

                    {loading ? (
                        <div style={{ textAlign: 'center', padding: '4rem' }}>
                            <div className="animate-spin" style={{ width: '40px', height: '40px', border: '4px solid #f1f5f9', borderTopColor: '#6366f1', borderRadius: '50%', margin: '0 auto' }}></div>
                            <p style={{ marginTop: '1rem', color: '#64748b', fontWeight: 600 }}>Syncing rewards...</p>
                        </div>
                    ) : coupons.length === 0 ? (
                        <div style={{ textAlign: 'center', padding: '5rem', background: '#f8fafc', borderRadius: '20px' }}>
                            <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🎟️</div>
                            <h3 style={{ fontWeight: 800, color: '#1e293b' }}>No coupons found</h3>
                            <p style={{ color: '#64748b' }}>Start your first promotional campaign today.</p>
                        </div>
                    ) : isMobile ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                            {coupons.map(coupon => (
                                <div key={coupon.id} style={{ background: '#fff', padding: '1.25rem', borderRadius: '16px', border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', gap: '1rem', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                            <div style={{ width: '40px', height: '40px', background: coupon.isActive ? '#ecfdf5' : '#f1f5f9', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: coupon.isActive ? '#10b981' : '#94a3b8' }}>
                                                <Tag size={20} />
                                            </div>
                                            <div>
                                                <div style={{ fontWeight: 900, color: '#1e293b', fontSize: '1rem' }}>{coupon.code}</div>
                                                <div style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: 600 }}>Exp: {coupon.expiryDate}</div>
                                            </div>
                                        </div>
                                        <div style={{ background: coupon.discountType === 'percentage' ? '#eef2ff' : '#f5f3ff', color: coupon.discountType === 'percentage' ? '#6366f1' : '#8b5cf6', padding: '4px 10px', borderRadius: '8px', fontWeight: 900, fontSize: '0.8rem' }}>
                                            {coupon.discountType === 'percentage' ? `${coupon.discountValue}% OFF` : `₹${coupon.discountValue} FLAT`}
                                        </div>
                                    </div>
                                    
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', background: '#f8fafc', padding: '0.75rem', borderRadius: '12px', gap: '0.5rem' }}>
                                        <div>
                                            <div style={{ fontSize: '0.65rem', color: '#64748b', fontWeight: 800 }}>MIN ORDER</div>
                                            <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#1e293b' }}>₹{coupon.minOrderValue}</div>
                                        </div>
                                        <div>
                                            <div style={{ fontSize: '0.65rem', color: '#64748b', fontWeight: 800 }}>REDEMPTIONS</div>
                                            <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#1e293b' }}>{coupon.usedCount} / {coupon.usageLimit}</div>
                                        </div>
                                    </div>
                                    
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '0.25rem' }}>
                                        <button onClick={() => handleToggleActive(coupon)} style={{ background: coupon.isActive ? '#d1fae5' : '#fee2e2', color: coupon.isActive ? '#059669' : '#ef4444', border: 'none', padding: '6px 14px', borderRadius: '100px', fontSize: '0.7rem', fontWeight: 800, cursor: 'pointer' }}>
                                            {coupon.isActive ? 'ACTIVE' : 'INACTIVE'}
                                        </button>
                                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                                            <button onClick={() => editCoupon(coupon)} style={{ padding: '6px 10px', color: '#6366f1', background: '#eef2ff', border: 'none', borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Edit size={16} /></button>
                                            <button onClick={() => handleDelete(coupon.id)} style={{ padding: '6px 10px', color: '#ef4444', background: '#fef2f2', border: 'none', borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Trash2 size={16} /></button>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div style={{ overflowX: 'auto' }}>
                            <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: '0 0.75rem', tableLayout: 'fixed' }}>
                                <colgroup>
                                    <col style={{ width: '35%' }} />
                                    <col style={{ width: '15%' }} />
                                    <col style={{ width: '25%' }} />
                                    <col style={{ width: '12%' }} />
                                    <col style={{ width: '13%' }} />
                                </colgroup>
                                <thead>
                                    <tr>
                                        <th style={{ ...labelStyle, display: 'table-cell', textAlign: 'left', padding: '0 1rem 0.75rem 1rem' }}>Details</th>
                                        <th style={{ ...labelStyle, display: 'table-cell', textAlign: 'center', padding: '0 0 0.75rem 0' }}>Discount</th>
                                        <th style={{ ...labelStyle, display: 'table-cell', textAlign: 'center', padding: '0 0 0.75rem 0' }}>Usage Logic</th>
                                        <th style={{ ...labelStyle, display: 'table-cell', textAlign: 'center', padding: '0 0 0.75rem 0' }}>Status</th>
                                        <th style={{ ...labelStyle, display: 'table-cell', textAlign: 'right', padding: '0 1rem 0.75rem 0' }}>Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {coupons.map(coupon => (
                                        <tr key={coupon.id} style={{ background: '#fff', transition: '0.2s' }}>
                                            <td style={{ padding: '1rem', borderTopLeftRadius: '16px', borderBottomLeftRadius: '16px', border: '1px solid #f1f5f9', borderRight: 'none' }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                                    <div style={{ width: '40px', height: '40px', background: coupon.isActive ? '#ecfdf5' : '#f1f5f9', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: coupon.isActive ? '#10b981' : '#94a3b8' }}>
                                                        <Tag size={20} />
                                                    </div>
                                                    <div>
                                                        <div style={{ fontWeight: 900, color: '#1e293b', fontSize: '1rem' }}>{coupon.code}</div>
                                                        <div style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 600 }}>Expires: {coupon.expiryDate}</div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td style={{ textAlign: 'center', borderTop: '1px solid #f1f5f9', borderBottom: '1px solid #f1f5f9' }}>
                                                <div style={{ 
                                                    background: coupon.discountType === 'percentage' ? '#eef2ff' : '#f5f3ff',
                                                    color: coupon.discountType === 'percentage' ? '#6366f1' : '#8b5cf6',
                                                    display: 'inline-block',
                                                    padding: '4px 12px',
                                                    borderRadius: '8px',
                                                    fontWeight: 900,
                                                    fontSize: '0.9rem'
                                                }}>
                                                    {coupon.discountType === 'percentage' ? `${coupon.discountValue}% OFF` : `₹${coupon.discountValue} FLAT`}
                                                </div>
                                            </td>
                                            <td style={{ textAlign: 'center', borderTop: '1px solid #f1f5f9', borderBottom: '1px solid #f1f5f9' }}>
                                                <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#1e293b' }}>
                                                    Min Order: ₹{coupon.minOrderValue}
                                                </div>
                                                <div style={{ width: '100px', height: '6px', background: '#f1f5f9', borderRadius: '10px', margin: '6px auto 0' }}>
                                                    <div style={{ 
                                                        width: `${Math.min(100, (coupon.usedCount / coupon.usageLimit) * 100)}%`,
                                                        height: '100%',
                                                        background: '#6366f1',
                                                        borderRadius: '10px'
                                                    }} />
                                                </div>
                                                <div style={{ fontSize: '0.65rem', color: '#64748b', marginTop: '4px' }}>
                                                    {coupon.usedCount} / {coupon.usageLimit} Redemptions
                                                </div>
                                            </td>
                                            <td style={{ textAlign: 'center', borderTop: '1px solid #f1f5f9', borderBottom: '1px solid #f1f5f9' }}>
                                                <button 
                                                    onClick={() => handleToggleActive(coupon)}
                                                    style={{ 
                                                        background: coupon.isActive ? '#d1fae5' : '#fee2e2',
                                                        color: coupon.isActive ? '#059669' : '#ef4444',
                                                        border: 'none',
                                                        padding: '4px 12px',
                                                        borderRadius: '100px',
                                                        fontSize: '0.75rem',
                                                        fontWeight: 800,
                                                        cursor: 'pointer'
                                                    }}
                                                >
                                                    {coupon.isActive ? 'ACTIVE' : 'INACTIVE'}
                                                </button>
                                            </td>
                                            <td style={{ padding: '1rem', textAlign: 'right', borderTopRightRadius: '16px', borderBottomRightRadius: '16px', border: '1px solid #f1f5f9', borderLeft: 'none' }}>
                                                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
                                                    <button onClick={() => editCoupon(coupon)} style={{ padding: '8px', color: '#6366f1', background: '#f5f3ff', border: 'none', borderRadius: '8px', cursor: 'pointer' }}><Edit size={16} /></button>
                                                    <button onClick={() => handleDelete(coupon.id)} style={{ padding: '8px', color: '#ef4444', background: '#fef2f2', border: 'none', borderRadius: '8px', cursor: 'pointer' }}><Trash2 size={16} /></button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>

                {/* Form Editor Sidebar */}
                {showForm && (
                    <div style={{ ...cardStyle, animation: 'slideRight 0.3s ease' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                            <h3 style={{ fontSize: '1.2rem', fontWeight: 900, color: '#1e293b', margin: 0 }}>
                                {editingCoupon ? 'Edit Coupon' : 'New Coupon'}
                            </h3>
                            <div style={{ fontSize: '0.7rem', fontWeight: 800, color: '#6366f1', background: '#f5f3ff', padding: '4px 8px', borderRadius: '6px' }}>
                                PREMIUM
                            </div>
                        </div>

                        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
                            <div>
                                <label style={labelStyle}>Promotion Code</label>
                                <div style={{ position: 'relative' }}>
                                    <input 
                                        name="code" 
                                        value={formData.code} 
                                        onChange={handleInputChange} 
                                        placeholder="e.g. SUMMER50" 
                                        style={inputStyle}
                                    />
                                    <Tag size={16} color="#94a3b8" style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)' }} />
                                </div>
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                <div>
                                    <label style={labelStyle}>Discount Type</label>
                                    <select name="discountType" value={formData.discountType} onChange={handleInputChange} style={inputStyle}>
                                        <option value="percentage">Percentage (%)</option>
                                        <option value="flat">Flat Amount (₹)</option>
                                    </select>
                                </div>
                                <div>
                                    <label style={labelStyle}>Value</label>
                                    <input name="discountValue" type="number" value={formData.discountValue} onChange={handleInputChange} placeholder="10" style={inputStyle} />
                                </div>
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                <div>
                                    <label style={labelStyle}>Min. Order (₹)</label>
                                    <input name="minOrderValue" type="number" value={formData.minOrderValue} onChange={handleInputChange} placeholder="500" style={inputStyle} />
                                </div>
                                <div>
                                    <label style={labelStyle}>Usage Limit</label>
                                    <input name="usageLimit" type="number" value={formData.usageLimit} onChange={handleInputChange} placeholder="100" style={inputStyle} />
                                </div>
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                <div>
                                    <label style={labelStyle}>Start Date</label>
                                    <input name="startDate" type="date" value={formData.startDate} onChange={handleInputChange} style={inputStyle} />
                                </div>
                                <div>
                                    <label style={labelStyle}>Expiry Date</label>
                                    <input name="expiryDate" type="date" value={formData.expiryDate} onChange={handleInputChange} style={inputStyle} />
                                </div>
                            </div>

                            {/* Owner-only: Assign to Admin/Branch */}
                            {userRole === 'owner' && (
                                <div style={{ background: '#f0f9ff', border: '1.5px solid #bae6fd', borderRadius: '14px', padding: '1rem' }}>
                                    <label style={{ fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase', color: '#0369a1', letterSpacing: '0.05em', display: 'table-cell', marginBottom: '0.6rem' }}>
                                        🎯 Assign to Admin / Branch <span style={{ color: '#ef4444' }}>*</span>
                                    </label>
                                    <select
                                        name="assignedToAdminUID"
                                        value={formData.assignedToAdminUID}
                                        onChange={handleInputChange}
                                        required
                                        style={{ ...inputStyle, marginTop: '0.5rem', background: 'white', borderColor: '#bae6fd' }}
                                    >
                                        <option value="" disabled>Select Admin / Branch...</option>
                                        {adminList.map(admin => (
                                            <option key={admin.uid} value={admin.uid}>
                                                {admin.name}{admin.branch ? ` — ${admin.branch}` : ''}
                                            </option>
                                        ))}
                                    </select>
                                    <p style={{ margin: '0.5rem 0 0', fontSize: '0.72rem', color: '#0369a1', fontWeight: 600 }}>
                                        {formData.assignedToAdminUID
                                            ? `✅ Only "${adminList.find(a => a.uid === formData.assignedToAdminUID)?.name || ''}" can apply this coupon.`
                                            : '⚠️ You must assign this coupon to a specific admin.'}
                                    </p>
                                </div>
                            )}

                            <div style={{ background: '#f8fafc', padding: '1rem', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <CheckCircle size={18} color="#10b981" />
                                    <span style={{ fontSize: '0.85rem', fontWeight: 800, color: '#1e293b' }}>Active Status</span>
                                </div>
                                <label style={{ position: 'relative', display: 'inline-block', width: '44px', height: '24px' }}>
                                    <input 
                                        type="checkbox" 
                                        name="isActive" 
                                        checked={formData.isActive} 
                                        onChange={handleInputChange}
                                        style={{ opacity: 0, width: 0, height: 0 }}
                                    />
                                    <span style={{ 
                                        position: 'absolute', cursor: 'pointer', inset: 0, 
                                        background: formData.isActive ? '#6366f1' : '#cbd5e1', 
                                        borderRadius: '34px', transition: '0.4s' 
                                    }}>
                                        <span style={{ 
                                            position: 'absolute', height: '18px', width: '18px', left: formData.isActive ? '22px' : '4px', bottom: '3px',
                                            background: 'white', borderRadius: '50%', transition: '0.4s'
                                        }} />
                                    </span>
                                </label>
                            </div>

                            <button 
                                type="submit" 
                                style={{ 
                                    background: '#1e293b',
                                    color: 'white',
                                    padding: '1rem',
                                    borderRadius: '14px',
                                    border: 'none',
                                    fontWeight: 900,
                                    fontSize: '1rem',
                                    cursor: 'pointer',
                                    marginTop: '1rem',
                                    transition: '0.2s',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: '0.5rem'
                                }}
                            >
                                {editingCoupon ? <CheckCircle size={20} /> : <Plus size={20} />}
                                {editingCoupon ? 'Update Campaign' : 'Launch Campaign'}
                            </button>
                        </form>
                    </div>
                )}
                    </div>
            )}

            <style>{`
                @keyframes slideRight {
                    from { transform: translateX(50px); opacity: 0; }
                    to { transform: translateX(0); opacity: 1; }
                }
                .animate-spin {
                    animation: spin 1s linear infinite;
                }
                @keyframes spin {
                    from { transform: rotate(0deg); }
                    to { transform: rotate(360deg); }
                }
            `}</style>
        </div>
    );
}
