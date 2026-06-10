import React, { useState, useEffect } from 'react';
import { db } from '../firebaseConfig';
import { collection, query, getDocs, deleteDoc, doc, updateDoc, orderBy, addDoc, Timestamp, where } from 'firebase/firestore';
import { getTenantPath } from '../firebaseConfig';
import { Plus, Trash2, Pause, Play, Ticket, Calendar, TrendingUp, Filter, Search, X, Tag, Settings, Activity, Info, BarChart } from 'lucide-react';
import toast from 'react-hot-toast';

const AdminCoupons = () => {
    const [coupons, setCoupons] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterStatus, setFilterStatus] = useState('all');

    const [actionLoading, setActionLoading] = useState(false);

    const [formData, setFormData] = useState({
        code: '',
        discountType: 'percentage',
        discountValue: 0,
        minOrderAmount: 0,
        startDate: new Date().toISOString().split('T')[0],
        endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        maxUses: 100,
        maxUsesPerCustomer: 1,
        applicableFranchiseIds: 'all'
    });

    const fetchCoupons = async () => {
        const companyId = sessionStorage.getItem('fb_user_company_id');
        if (!companyId) return;

        setIsLoading(true);
        try {
            // Path is now strictly isolated: owners/{ownerId}/coupons
            const q = query(
                collection(db, getTenantPath('coupons')), 
                orderBy('createdAt', 'desc')
            );
            const snapshot = await getDocs(q);
            const fetched = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            
            // Get session data for filtering
            const userRole = sessionStorage.getItem('fb_user_role');
            const currentUserUID = sessionStorage.getItem('fb_user_uid');

            // Apply restriction filter: Owners see all, Admins see public or assigned to them
            const filteredList = userRole === 'owner' 
                ? fetched 
                : fetched.filter(c => !c.assignedToAdminUID || c.assignedToAdminUID === currentUserUID);

            setCoupons(filteredList);
        } catch (err) {
            toast.error('Failed to fetch coupons');
            console.error(err);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchCoupons();
    }, []);

    const handleGenerateCode = () => {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
        let code = '';
        for (let i = 0; i < 6; i++) {
            code += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        setFormData({ ...formData, code: `FRAN-${code}` });
    };

    const handleToggleStatus = async (coupon) => {
        const newStatus = !coupon.isActive;
        try {
            await updateDoc(doc(db, getTenantPath('coupons'), coupon.id), { 
                isActive: newStatus,
                status: newStatus ? 'active' : 'paused' 
            });
            toast.success(`Coupon ${newStatus ? 'activated' : 'paused'}!`);
            fetchCoupons();
        } catch (err) {
            toast.error('Failed to update status');
        }
    };

    const handleDelete = async (id) => {
        if (window.confirm('Delete this coupon? This cannot be undone.')) {
            try {
                await deleteDoc(doc(db, getTenantPath('coupons'), id));
                toast.success('Coupon deleted from database.');
                fetchCoupons();
            } catch (err) {
                toast.error('Failed to delete coupon');
            }
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!formData.code) {
             toast.error("Please enter or generate a code!");
             return;
        }

        setActionLoading(true);
        try {
            await addDoc(collection(db, getTenantPath('coupons')), {
                code: formData.code,
                discountType: formData.discountType,
                discountValue: Number(formData.discountValue),
                minOrderValue: Number(formData.minOrderAmount),
                startDate: Timestamp.fromDate(new Date(formData.startDate)),
                expiryDate: Timestamp.fromDate(new Date(formData.endDate)),
                usageLimit: Number(formData.maxUses),
                usedCount: 0,
                isActive: true, // Auto-active
                status: 'active', // For legacy support in UI
                createdAt: Timestamp.now(),
                ownerId: sessionStorage.getItem('fb_user_owner_id') || sessionStorage.getItem('fb_user_uid'),
                assignedToAdminUID: sessionStorage.getItem('fb_user_uid'),
                assignedAdminName: sessionStorage.getItem('fb_user_name'),
                assignedBranch: sessionStorage.getItem('fb_user_station')
            });

            toast.success('Coupon deployed successfully!');
            setIsModalOpen(false);
            fetchCoupons();
            setFormData({
                code: '',
                discountType: 'percentage',
                discountValue: 0,
                minOrderAmount: 0,
                startDate: new Date().toISOString().split('T')[0],
                endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
                maxUses: 100,
                maxUsesPerCustomer: 1,
                applicableFranchiseIds: 'all'
            });
        } catch (err) {
            console.error(err);
            toast.error('Failed to create coupon');
        } finally {
            setActionLoading(false);
        }
    };

    const filteredCoupons = coupons.filter(c => {
        const matchesSearch = c.code.toLowerCase().includes(searchTerm.toLowerCase());
        // Adjusting filter to use isActive
        const isActiveStatus = coupon => coupon.isActive || coupon.status === 'active';
        const matchesFilter = filterStatus === 'all' || 
                              (filterStatus === 'active' && isActiveStatus(c)) || 
                              (filterStatus === 'paused' && !isActiveStatus(c));
        return matchesSearch && matchesFilter;
    });

    // Premium Theme Constants (matching App Theme)
    const theme = {
        background: 'var(--bg)',
        panel: 'var(--panel)',
        border: 'var(--border)',
        ink: 'var(--ink)',
        muted: 'var(--muted)',
        accent: 'var(--accent)',
        accent2: 'var(--accent2)',
        green: 'var(--green)',
        red: 'var(--red)',
        glass: 'var(--glass-bg)',
        borderRadius: '24px',
        shadow: '0 4px 12px rgba(0,0,0,0.05)',
        fontHeading: "'Yeseva One', serif",
        fontMono: "'JetBrains Mono', monospace"
    };

    return (
        <div style={{ backgroundColor: theme.background, minHeight: '100vh', padding: '2rem', fontFamily: 'Nunito, sans-serif', color: theme.ink }}>
            
            {/* Header */}
            <div style={{ maxWidth: '1400px', margin: '0 auto 2.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1.5rem' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
                    <div style={{
                      width: "48px", height: "48px", borderRadius: "14px",
                      background: "linear-gradient(135deg, var(--accent), var(--accent2))",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      fontSize: "20px", fontWeight: "900", color: "white",
                      boxShadow: "0 6px 16px rgba(79, 70, 229, 0.3)",
                    }}><Ticket size={24} /></div>
                    <span style={{ fontSize: "12px", color: theme.accent, letterSpacing: "3px", fontWeight: "900", textTransform: "uppercase" }}>PROMOTIONS SYSTEM</span>
                  </div>
                  <h1 style={{ margin: 0, fontFamily: theme.fontHeading, fontSize: '2.8rem', color: theme.ink, letterSpacing: '-1px' }}>
                    Campaign <span style={{ color: theme.accent }}>Control</span>
                  </h1>
                </div>
                <button 
                    onClick={() => setIsModalOpen(true)}
                    style={{ 
                        background: 'linear-gradient(135deg, var(--accent), var(--accent2))', 
                        color: 'white', border: 'none', padding: '16px 32px', borderRadius: '16px',
                        fontWeight: 900, fontSize: '0.9rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '10px',
                        boxShadow: '0 8px 20px rgba(79, 70, 229, 0.25)', transition: 'all 0.3s ease'
                    }}
                >
                    <Plus size={20} /> GENERATE NEW COUPON
                </button>
            </div>

            <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
                
                {/* Search & Stats Banner */}
                <div style={{ 
                    background: 'white', borderRadius: theme.borderRadius, padding: '1.5rem', border: `1px solid ${theme.border}`,
                    boxShadow: theme.shadow, display: 'flex', flexWrap: 'wrap', gap: '1.5rem', alignItems: 'center', marginBottom: '2rem'
                }}>
                    <div style={{ flex: 1, minWidth: '300px', position: 'relative' }}>
                        <Search size={20} style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: theme.muted }} />
                        <input 
                            type="text" 
                            placeholder="Find code (e.g. SAVE1000)..." 
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            style={{ 
                                width: '100%', padding: '14px 14px 14px 3.2rem', borderRadius: '14px', border: '1px solid #f1f5f9',
                                background: '#f8fafc', outline: 'none', fontWeight: 700, fontSize: '0.95rem', color: theme.ink
                            }}
                        />
                    </div>
                    <div style={{ display: 'flex', background: '#f1f5f9', padding: '4px', borderRadius: '12px', gap: '4px' }}>
                        {['all', 'active', 'paused'].map(s => (
                            <button 
                                key={s}
                                onClick={() => setFilterStatus(s)}
                                style={{ 
                                    padding: '10px 20px', borderRadius: '10px', border: 'none', cursor: 'pointer',
                                    background: filterStatus === s ? 'white' : 'transparent',
                                    color: filterStatus === s ? theme.accent : theme.muted,
                                    fontSize: '0.75rem', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '1px',
                                    boxShadow: filterStatus === s ? '0 2px 8px rgba(0,0,0,0.05)' : 'none', transition: 'all 0.2s'
                                }}
                            >
                                {s}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Table Logic */}
                <div style={{ 
                    background: 'white', borderRadius: theme.borderRadius, border: `1px solid ${theme.border}`,
                    boxShadow: theme.shadow, overflow: 'hidden'
                }}>
                    <div style={{ padding: '1.5rem 2rem', borderBottom: `1px solid ${theme.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <h3 style={{ fontSize: '1rem', fontWeight: 900, color: theme.ink, margin: 0 }}>ACTIVE PROMOTIONS ARCHIVE</h3>
                        <span style={{ fontSize: '0.75rem', fontWeight: 800, color: theme.muted }}>{filteredCoupons.length} CODES FOUND</span>
                    </div>
                    <div style={{ overflowX: 'auto' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                            <thead>
                                <tr style={{ background: '#f8fafc' }}>
                                    <th style={{ padding: '1rem 2rem', textAlign: 'left', fontSize: '0.65rem', fontWeight: 900, color: theme.muted, textTransform: 'uppercase', letterSpacing: '1.5px' }}>COUPON IDENTITY</th>
                                    <th style={{ padding: '1rem 2rem', textAlign: 'left', fontSize: '0.65rem', fontWeight: 900, color: theme.muted, textTransform: 'uppercase', letterSpacing: '1.5px' }}>BENEFIT TERMS</th>
                                    <th style={{ padding: '1rem 2rem', textAlign: 'left', fontSize: '0.65rem', fontWeight: 900, color: theme.muted, textTransform: 'uppercase', letterSpacing: '1.5px' }}>UTILIZATION</th>
                                    <th style={{ padding: '1rem 2rem', textAlign: 'left', fontSize: '0.65rem', fontWeight: 900, color: theme.muted, textTransform: 'uppercase', letterSpacing: '1.5px' }}>EXPIRATION</th>
                                    <th style={{ padding: '1rem 2rem', textAlign: 'right', fontSize: '0.65rem', fontWeight: 900, color: theme.muted, textTransform: 'uppercase', letterSpacing: '1.5px' }}>ACTIONS</th>
                                </tr>
                            </thead>
                            <tbody>
                                {isLoading ? (
                                    <tr><td colSpan={5} style={{ textAlign: 'center', padding: '4rem', fontWeight: 700, color: theme.muted }}>Synchronizing Catalog...</td></tr>
                                ) : filteredCoupons.length > 0 ? (
                                    filteredCoupons.map((coupon) => (
                                        <tr key={coupon.id} style={{ borderBottom: `1px solid ${theme.border}`, transition: 'background 0.2s' }}>
                                            <td style={{ padding: '1.5rem 2rem' }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                                                    <div style={{ 
                                                        width: '44px', height: '44px', borderRadius: '12px',
                                                        background: (coupon.isActive || coupon.status === 'active') ? 'var(--green-bg)' : 'var(--red-bg)',
                                                        color: (coupon.isActive || coupon.status === 'active') ? theme.green : theme.red,
                                                        display: 'flex', alignItems: 'center', justifyContent: 'center'
                                                    }}><Tag size={20} /></div>
                                                    <div>
                                                        <div style={{ fontWeight: 900, fontSize: '1.1rem', color: theme.ink, letterSpacing: '1px' }}>{coupon.code}</div>
                                                        <span style={{ 
                                                            fontSize: '0.6rem', fontWeight: 900, textTransform: 'uppercase', 
                                                            color: 'white', background: (coupon.isActive || coupon.status === 'active') ? theme.green : theme.red,
                                                            padding: '2px 8px', borderRadius: '4px'
                                                        }}>{(coupon.isActive || coupon.status === 'active') ? 'active' : 'paused'}</span>
                                                    </div>
                                                </div>
                                            </td>
                                            <td style={{ padding: '1.5rem 2rem' }}>
                                                <div style={{ fontSize: '1.1rem', fontWeight: 900, color: theme.accent, fontFamily: theme.fontMono }}>
                                                    {coupon.discountType === 'percentage' ? `${coupon.discountValue}%` : `₹${coupon.discountValue}`} OFF
                                                </div>
                                                <div style={{ fontSize: '0.7rem', fontWeight: 700, color: theme.muted }}>MIN ORDER: ₹{coupon.minOrderAmount}</div>
                                            </td>
                                            <td style={{ padding: '1.5rem 2rem' }}>
                                                <div style={{ width: '150px' }}>
                                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                                                        <span style={{ fontSize: '0.7rem', fontWeight: 900, color: theme.ink }}>{coupon.usedCount || 0} / {coupon.usageLimit || 0}</span>
                                                        <span style={{ fontSize: '0.7rem', fontWeight: 900, color: theme.accent }}>{coupon.usageLimit ? Math.floor(((coupon.usedCount || 0) / coupon.usageLimit) * 100) : 0}%</span>
                                                    </div>
                                                    <div style={{ height: '6px', background: '#f1f5f9', borderRadius: '10px', overflow: 'hidden' }}>
                                                        <div style={{ height: '100%', width: `${coupon.usageLimit ? Math.min(100, ((coupon.usedCount || 0) / coupon.usageLimit) * 100) : 0}%`, background: theme.accent, borderRadius: '10px' }} />
                                                    </div>
                                                </div>
                                            </td>
                                            <td style={{ padding: '1.5rem 2rem' }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.85rem', fontWeight: 700 }}>
                                                    <Calendar size={16} color={theme.muted} />
                                                    {new Date(coupon.endDate.seconds ? coupon.endDate.seconds * 1000 : coupon.endDate).toLocaleDateString('en-IN')}
                                                </div>
                                            </td>
                                            <td style={{ padding: '1.5rem 2rem', textAlign: 'right' }}>
                                                <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                                                    <button 
                                                        onClick={() => handleToggleStatus(coupon)}
                                                        style={{ 
                                                            width: '38px', height: '38px', borderRadius: '10px', border: '1px solid #f1f5f9', cursor: 'pointer',
                                                            background: (coupon.isActive || coupon.status === 'active') ? '#fff7ed' : '#f0fdf4',
                                                            color: (coupon.isActive || coupon.status === 'active') ? '#ea580c' : theme.green,
                                                            display: 'flex', alignItems: 'center', justifyContent: 'center'
                                                        }}
                                                    >
                                                        {(coupon.isActive || coupon.status === 'active') ? <Pause size={18} /> : <Play size={18} />}
                                                    </button>
                                                    <button 
                                                        onClick={() => handleDelete(coupon.id)}
                                                        style={{ 
                                                            width: '38px', height: '38px', borderRadius: '10px', border: '1px solid #fecdd3', cursor: 'pointer',
                                                            background: '#fff1f2', color: theme.red, display: 'flex', alignItems: 'center', justifyContent: 'center'
                                                        }}
                                                    >
                                                        <Trash2 size={18} />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr><td colSpan={5} style={{ textAlign: 'center', padding: '6rem', color: theme.muted, fontStyle: 'italic', fontWeight: 600 }}>No promotional codes found.</td></tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            {/* Creation Modal (Styled as Role Modal) */}
            {isModalOpen && (
                <div style={{ fixed: 'inset-0', position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 10000, background: 'rgba(10, 7, 5, 0.7)', backdropFilter: 'blur(10px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1.5rem' }}>
                    <div style={{ 
                        width: '100%', maxWidth: '650px', background: 'white', borderRadius: '40px', padding: '3rem', position: 'relative',
                        boxShadow: '0 50px 100px rgba(0, 0, 0, 0.4)', border: '1px solid rgba(0,0,0,0.05)'
                    }}>
                        <button onClick={() => setIsModalOpen(false)} style={{ position: 'absolute', top: '2rem', right: '2rem', background: 'none', border: 'none', color: theme.muted, cursor: 'pointer', fontSize: '1.5rem' }}>✕</button>
                        
                        <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
                            <div style={{ fontSize: '3.5rem', marginBottom: '1rem' }}>🎁</div>
                            <h2 style={{ fontFamily: theme.fontHeading, fontSize: '2rem', color: theme.ink, margin: 0 }}>Create Promotion</h2>
                            <p style={{ color: theme.muted, fontSize: '0.9rem', fontWeight: 600 }}>Configure the new promotional framework</p>
                        </div>

                        <form onSubmit={handleSubmit} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
                            <div style={{ gridColumn: '1 / -1' }}>
                                <label style={{ display: 'block', fontSize: '0.7rem', fontWeight: 900, color: theme.muted, marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '1px' }}>COUPON IDENTIFICATION</label>
                                <div style={{ display: 'flex', gap: '10px' }}>
                                    <input 
                                        style={{ flex: 1, padding: '1rem', border: `1.5px solid ${theme.border}`, borderRadius: '16px', fontWeight: 900, fontSize: '1.1rem', color: theme.accent, letterSpacing: '1.5px', textTransform: 'uppercase', outline: 'none' }}
                                        value={formData.code} 
                                        onChange={(e) => setFormData({...formData, code: e.target.value.toUpperCase()})}
                                        required
                                    />
                                    <button 
                                        type="button" 
                                        onClick={handleGenerateCode}
                                        style={{ padding: '0 1.5rem', background: theme.ink, color: 'white', border: 'none', borderRadius: '16px', fontWeight: 900, fontSize: '0.75rem', cursor: 'pointer' }}
                                    >GENERATE</button>
                                </div>
                            </div>

                            <div>
                                <label style={{ display: 'block', fontSize: '0.7rem', fontWeight: 900, color: theme.muted, marginBottom: '0.5rem', textTransform: 'uppercase' }}>BENEFIT TYPE</label>
                                <select 
                                    style={{ width: '100%', padding: '1rem', border: `1.5px solid ${theme.border}`, borderRadius: '16px', fontWeight: 700, outline: 'none' }}
                                    value={formData.discountType}
                                    onChange={(e) => setFormData({...formData, discountType: e.target.value})}
                                >
                                    <option value="percentage">PERCENTAGE (%)</option>
                                    <option value="flat">CASH REDUCTION (₹)</option>
                                </select>
                            </div>

                            <div>
                                <label style={{ display: 'block', fontSize: '0.7rem', fontWeight: 900, color: theme.muted, marginBottom: '0.5rem', textTransform: 'uppercase' }}>MAGNITUDE</label>
                                <input 
                                    type="number" 
                                    style={{ width: '100%', padding: '1rem', border: `1.5px solid ${theme.border}`, borderRadius: '16px', fontWeight: 900, fontSize: '1.1rem', outline: 'none' }}
                                    value={formData.discountValue}
                                    onChange={(e) => setFormData({...formData, discountValue: Number(e.target.value)})}
                                />
                            </div>

                            <div>
                                <label style={{ display: 'block', fontSize: '0.7rem', fontWeight: 900, color: theme.muted, marginBottom: '0.5rem', textTransform: 'uppercase' }}>MIN PURCHASE (₹)</label>
                                <input 
                                    type="number" 
                                    style={{ width: '100%', padding: '1rem', border: `1.5px solid ${theme.border}`, borderRadius: '16px', fontWeight: 700, outline: 'none' }}
                                    value={formData.minOrderAmount}
                                    onChange={(e) => setFormData({...formData, minOrderAmount: Number(e.target.value)})}
                                />
                            </div>

                            <div>
                                <label style={{ display: 'block', fontSize: '0.7rem', fontWeight: 900, color: theme.muted, marginBottom: '0.5rem', textTransform: 'uppercase' }}>EXPIRATION DATE</label>
                                <input 
                                    type="date" 
                                    style={{ width: '100%', padding: '1rem', border: `1.5px solid ${theme.border}`, borderRadius: '16px', fontWeight: 700, outline: 'none' }}
                                    value={formData.endDate}
                                    onChange={(e) => setFormData({...formData, endDate: e.target.value})}
                                />
                            </div>

                            <button 
                                type="submit" 
                                disabled={actionLoading}
                                style={{ 
                                    gridColumn: '1 / -1', marginTop: '1rem', padding: '1.25rem', borderRadius: '20px', border: 'none',
                                    background: 'linear-gradient(135deg, var(--accent), var(--accent2))', color: 'white',
                                    fontWeight: 900, fontSize: '1rem', cursor: 'pointer', boxShadow: '0 10px 20px rgba(79, 70, 229, 0.25)'
                                }}
                            >
                                {actionLoading ? 'DEPLOYING CAMPAIGN...' : 'COMMISSION PROMOTION'}
                            </button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AdminCoupons;
