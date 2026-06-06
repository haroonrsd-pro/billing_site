import React, { useState, useEffect } from 'react';
import { db, auth, provisioningAuth } from '../firebaseConfig';
import { collection, query, onSnapshot, doc, updateDoc, setDoc, serverTimestamp, getDoc, where, getDocs, deleteDoc } from 'firebase/firestore';
import { getAuth, createUserWithEmailAndPassword, signOut, fetchSignInMethodsForEmail } from 'firebase/auth'; 
import { initializeApp, deleteApp, getApps } from 'firebase/app';
import { Shield, Users, CheckCircle, XCircle, X, LogOut, LayoutDashboard, Building2, Bell, Loader2, ChevronLeft, ChevronRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useMessaging } from '../context/MessagingContext';

const SuperAdminDashboard = () => {
    const [requests, setRequests] = useState([]);
    const [owners, setOwners] = useState([]);
    const [activeTab, setActiveTab] = useState('requests');
    const [isLoading, setIsLoading] = useState(true);
    const [selectedOwner, setSelectedOwner] = useState(null);
    const [ownerStats, setOwnerStats] = useState({ adminCount: 0, staffCount: 0, total: 0, invoiceCount: 0, productCount: 0 });
    const [isStatsLoading, setIsStatsLoading] = useState(false);
    const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
    const [processingId, setProcessingId] = useState(null); 
    
    const navigate = useNavigate();
    const { showToast } = useMessaging();

    useEffect(() => {
        const handleResize = () => setIsMobile(window.innerWidth <= 768);
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    useEffect(() => {
        const role = sessionStorage.getItem('fb_user_role');
        if (role !== 'superadmin') {
            navigate('/role-select');
            return;
        }

        const q = query(collection(db, 'registration_requests'));
        const unsubRequests = onSnapshot(q, (snapshot) => {
            const reqData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setRequests(reqData.sort((a, b) => b.createdAt?.seconds - a.createdAt?.seconds));
            setIsLoading(false);
        });

        const qOwners = query(collection(db, 'users'), where('role', '==', 'owner'));
        const unsubOwners = onSnapshot(qOwners, (snapshot) => {
            const ownerData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setOwners(ownerData);
        });

        return () => {
            unsubRequests();
            unsubOwners();
        };
    }, []);

    const handleApprove = async (req) => {
        if (processingId) return; 
        setProcessingId(req.id);

        try {
            const requestRef = doc(db, 'registration_requests', req.id);
            const freshSnap = await getDoc(requestRef);
            if (!freshSnap.exists()) {
                throw new Error("Registration request no longer exists.");
            }
            if (freshSnap.data().status !== 'pending') {
                throw new Error(`This request has already been ${freshSnap.data().status.toUpperCase()}.`);
            }
            
            const cleanRequest = {
                name: req.name || 'Incomplete Profile',
                email: req.email || 'no-email@system.internal',
                phone: req.phone || 'N/A',
                password: req.password || 'no-password-set',
                companyName: req.companyName || 'Unnamed Business'
            };

            showToast(`Provisioning account for ${cleanRequest.companyName}...`, 'info');
            
            let userUid;
            try {
                const methods = await fetchSignInMethodsForEmail(provisioningAuth, cleanRequest.email);
                
                if (methods.length > 0) {
                    const ownerQ = query(collection(db, 'owners'), where('email', '==', cleanRequest.email));
                    const ownerSnap = await getDocs(ownerQ);
                    
                    if (!ownerSnap.empty) {
                        userUid = ownerSnap.docs[0].id;
                    } else {
                        userUid = req.id; 
                    }
                } else {
                    const userCredential = await createUserWithEmailAndPassword(provisioningAuth, cleanRequest.email, cleanRequest.password);
                    userUid = userCredential.user.uid;
                    await provisioningAuth.signOut();
                }
            } catch (authError) {
                console.error("Auth Provisioning Block Error:", authError);
                throw new Error("Authentication synchronization failed: " + authError.message);
            }

            const ownerId = userUid;
            const userData = {
                uid: ownerId,
                name: cleanRequest.name,
                email: cleanRequest.email,
                businessName: cleanRequest.companyName,
                role: 'owner',
                approved: true,
                status: 'approved',
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp()
            };
            
            await setDoc(doc(db, 'users', ownerId), userData);

            // 4. Update Registration Request
            await updateDoc(doc(db, 'registration_requests', req.id), {
                status: 'approved',
                ownerId: ownerId,
                approvedAt: serverTimestamp()
            });

            console.log("System: Approval complete. Owner ID:", ownerId);
            showToast(`${cleanRequest.companyName} authorized. Initializing portal transition...`, 'success');
            
            // Stay on the dashboard as previously requested
            console.log("System: Approval complete. Continuing Super Admin session.");
            
        } catch (error) {
            console.error("System: Approval Logic Failure:", error);
            showToast('Deployment Failed: ' + error.message, 'error');
        } finally {
            setProcessingId(null);
        }
    };

    const handleReject = async (reqId, ownerEmail) => {
        if (processingId) return;
        setProcessingId(reqId);
        try {
            await updateDoc(doc(db, 'registration_requests', reqId), {
                status: 'rejected',
                rejectedAt: serverTimestamp()
            });
            showToast('Request status updated to Rejected.', 'success');
        } catch (error) {
            showToast('Rejection failed.', 'error');
        } finally {
            setProcessingId(null);
        }
    };

    const handleToggleStatus = async (owner) => {
        const isCurrentlyApproved = owner.approved === true;
        const newApprovedStatus = !isCurrentlyApproved;
        const statusLabel = newApprovedStatus ? 'APPROVED' : 'SUSPENDED';

        try {
            showToast(`Transitioning ${owner.businessName || owner.name} to ${statusLabel} status...`, 'info');
            await updateDoc(doc(db, 'users', owner.id), {
                approved: newApprovedStatus,
                status: newApprovedStatus ? 'approved' : 'suspended',
                updatedAt: serverTimestamp()
            });
            showToast(`${owner.businessName || owner.name} is now ${statusLabel}.`, 'success');
        } catch (error) {
            showToast('Protocol update failed: ' + error.message, 'error');
        }
    };

    const fetchOwnerStats = async (owner) => {
        setSelectedOwner(owner);
        setIsStatsLoading(true);
        try {
            // Fetch deep metrics for the tenant
            const adminsSnap = await getDocs(query(collection(db, 'users'), where('companyId', '==', owner.id), where('role', '==', 'admin')));
            const staffSnap = await getDocs(query(collection(db, 'users'), where('companyId', '==', owner.id), where('role', '==', 'staff')));
            const invoicesSnap = await getDocs(collection(db, `owners/${owner.id}/invoices`));
            const productsSnap = await getDocs(collection(db, `owners/${owner.id}/products`));
            
            setOwnerStats({ 
                adminCount: adminsSnap.size,
                staffCount: staffSnap.size,
                total: adminsSnap.size + staffSnap.size + 1,
                invoiceCount: invoicesSnap.size,
                productCount: productsSnap.size,
                status: owner.status
            });
        } catch (error) {
            console.error("Error fetching stats:", error);
            showToast("Failed to load owner metrics.", "error");
        } finally {
            setIsStatsLoading(false);
        }
    };

    const handleDeleteOwner = async (owner) => {
        if (!window.confirm(`CRITICAL ACTION: Are you sure you want to permanently delete ${owner.businessName || owner.name}?`)) {
            return;
        }

        try {
            showToast(`Initiating wipe protocol for ${owner.businessName || owner.name}...`, 'info');
            await deleteDoc(doc(db, 'users', owner.id));
            try {
                await deleteDoc(doc(db, 'owners', owner.id));
            } catch (ignore) {}
            showToast(`${owner.businessName || owner.name} has been purged.`, 'success');
        } catch (error) {
            showToast('Protocol failure: ' + error.message, 'error');
        }
    };

    const handleLogout = () => {
        auth.signOut();
        sessionStorage.clear();
        navigate('/role-select');
    };

    return (
        <div style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', minHeight: '100vh', background: '#0a0b10', color: '#fff', fontFamily: 'Inter, sans-serif' }}>

            {isMobile && (
                <div style={{ background: '#111218', borderBottom: '1px solid rgba(255,255,255,0.05)', padding: '1rem 1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'sticky', top: 0, zIndex: 100 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <Shield size={24} color="#e85d04" />
                        <span style={{ fontSize: '1rem', fontWeight: 800, letterSpacing: '1px' }}>SUPER <span style={{ color: '#e85d04' }}>ADMIN</span></span>
                    </div>
                    <button onClick={handleLogout} style={{ background: 'rgba(239, 68, 68, 0.1)', border: 'none', borderRadius: '8px', padding: '0.5rem 0.75rem', color: '#ef4444', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.4rem', fontWeight: 700, fontSize: '0.8rem' }}>
                        <LogOut size={16} /> Sign Out
                    </button>
                </div>
            )}

            {!isMobile && (
                <div style={{ width: '280px', background: '#111218', borderRight: '1px solid rgba(255,255,255,0.05)', padding: '2rem 1.5rem', display: 'flex', flexDirection: 'column' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '3rem' }}>
                        <Shield size={32} color="#e85d04" />
                        <span style={{ fontSize: '1.25rem', fontWeight: 800, letterSpacing: '1px' }}>SUPER <span style={{ color: '#e85d04' }}>ADMIN</span></span>
                    </div>

                    <nav style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', flex: 1 }}>
                        <button 
                            onClick={() => setActiveTab('requests')}
                            style={{ 
                                display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '1rem', borderRadius: '12px', border: 'none',
                                background: activeTab === 'requests' ? 'rgba(232, 93, 4, 0.1)' : 'transparent',
                                color: activeTab === 'requests' ? '#e85d04' : 'rgba(255,255,255,0.5)',
                                cursor: 'pointer', transition: '0.3s', fontWeight: 700, textAlign: 'left'
                            }}
                        >
                            <Bell size={20} /> Registration Requests
                        </button>
                        <button 
                            onClick={() => setActiveTab('owners')}
                            style={{ 
                                display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '1rem', borderRadius: '12px', border: 'none',
                                background: activeTab === 'owners' ? 'rgba(232, 93, 4, 0.1)' : 'transparent',
                                color: activeTab === 'owners' ? '#e85d04' : 'rgba(255,255,255,0.5)',
                                cursor: 'pointer', transition: '0.3s', fontWeight: 700, textAlign: 'left'
                            }}
                        >
                            <Building2 size={20} /> Active Companies
                        </button>
                    </nav>

                    <button 
                        onClick={handleLogout}
                        style={{ 
                            display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '1rem', borderRadius: '12px', border: 'none',
                            background: 'rgba(239, 68, 68, 0.05)', color: '#ef4444',
                            cursor: 'pointer', transition: '0.3s', fontWeight: 700, marginTop: 'auto'
                        }}
                    >
                        <LogOut size={20} /> System Sign Out
                    </button>
                </div>
            )}

            <div style={{ flex: 1, padding: isMobile ? '1.5rem 1rem 6rem 1rem' : '3rem', overflowY: 'auto' }}>
                <header style={{ marginBottom: isMobile ? '1.5rem' : '3rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                        <h1 style={{ fontSize: isMobile ? '1.4rem' : '2rem', fontWeight: 800, marginBottom: '0.3rem' }}>
                            {activeTab === 'requests' ? 'Registration Requests' : 'Manage Business Owners'}
                        </h1>
                        <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.85rem' }}>
                            {activeTab === 'requests' ? 'Review and approve new business onboardings.' : 'Full overview of all active multi-tenant units.'}
                        </p>
                    </div>
                </header>

                {activeTab === 'requests' && (
                    <div style={{ 
                        background: '#111218', 
                        borderRadius: '24px', 
                        border: '1px solid rgba(255,255,255,0.05)', 
                        overflow: 'hidden' 
                    }}>
                        {/* Unified Table Header - Pill Style Row */}
                        <div style={{ 
                            background: 'rgba(255,255,255,0.02)', 
                            padding: '1.25rem 2rem', 
                            display: 'flex', 
                            alignItems: 'center', 
                            borderBottom: '1px solid rgba(255,255,255,0.05)'
                        }}>
                             <div style={{ flex: 1, display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem', fontWeight: 800, color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: '2px' }}>
                                <span>Owner</span>
                                <span>Business</span>
                                <span>Date</span>
                                <span>Status</span>
                                <span>Actions</span>
                             </div>
                        </div>

                        {/* Table Body */}
                        <div style={{ minHeight: '300px', display: 'flex', flexDirection: 'column', justifyContent: requests.filter(r => r.status === 'pending').length === 0 ? 'center' : 'flex-start' }}>
                            {requests.filter(r => r.status === 'pending').length === 0 ? (
                                <div style={{ color: 'rgba(255,255,255,0.2)', fontSize: '0.9rem', fontWeight: 500, textAlign: 'center' }}>
                                    No pending registration requests found.
                                </div>
                            ) : (
                                <div style={{ width: '100%' }}>
                                    {requests.filter(r => r.status === 'pending').map((req) => (
                                        <div key={req.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1.5rem 2.5rem', borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                                            <div style={{ flex: 1 }}>
                                                <div style={{ fontWeight: 700, color: '#fff', fontSize: '0.95rem' }}>{req.name}</div>
                                                <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.4)', marginTop: '0.2rem' }}>{req.email}</div>
                                            </div>
                                            <div style={{ flex: 1, fontWeight: 600, color: '#fff', textAlign: 'center' }}>{req.companyName}</div>
                                            <div style={{ flex: 1, color: 'rgba(255,255,255,0.4)', fontSize: '0.85rem', textAlign: 'center' }}>
                                                {req.createdAt?.toDate().toLocaleDateString() || 'N/A'}
                                            </div>
                                            <div style={{ flex: 1, textAlign: 'center' }}>
                                                <span style={{ padding: '0.4rem 0.8rem', borderRadius: '100px', background: 'rgba(232, 93, 4, 0.1)', color: '#e85d04', fontSize: '0.7rem', fontWeight: 800, border: '1px solid rgba(232, 93, 4, 0.1)' }}>PENDING</span>
                                            </div>
                                            <div style={{ flex: 1, display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
                                                <button 
                                                    disabled={processingId === req.id}
                                                    onClick={() => handleApprove(req)}
                                                    style={{ background: '#10b981', border: 'none', borderRadius: '10px', padding: '0.6rem 1.25rem', color: '#fff', fontWeight: 700, cursor: 'pointer', fontSize: '0.85rem' }}
                                                >
                                                    {processingId === req.id ? '...' : 'Approve'}
                                                </button>
                                                <button 
                                                    disabled={processingId === req.id}
                                                    onClick={() => handleReject(req.id, req.email)}
                                                    style={{ background: 'rgba(239, 68, 68, 0.1)', border: 'none', borderRadius: '10px', padding: '0.6rem 1.25rem', color: '#ef4444', fontWeight: 700, cursor: 'pointer', fontSize: '0.85rem' }}
                                                >
                                                    Reject
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {activeTab === 'owners' && (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1.5rem' }}>
                        {owners.map(owner => (
                            <div key={owner.id} style={{ background: '#111218', borderRadius: '24px', padding: '2rem', border: '1px solid rgba(255,255,255,0.05)', position: 'relative', transition: 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1), border-color 0.3s' }} className="owner-card">
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem' }}>
                                    <div style={{ width: '48px', height: '48px', background: 'rgba(232, 93, 4, 0.1)', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                        <Building2 size={24} color="#e85d04" />
                                    </div>
                                    <span 
                                        onClick={() => handleToggleStatus(owner)}
                                        style={{ 
                                            fontSize: '0.7rem', fontWeight: 900, padding: '0.3rem 0.6rem', borderRadius: '100px', 
                                            background: owner.status === 'approved' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)', 
                                            color: owner.status === 'approved' ? '#10b981' : '#ef4444',
                                            cursor: 'pointer', border: '1px solid transparent', transition: '0.3s'
                                        }}
                                    >
                                        {owner.status?.toUpperCase() || 'APPROVED'}
                                    </span>
                                </div>
                                <h3 style={{ fontSize: '1.25rem', fontWeight: 800, marginBottom: '0.5rem', color: '#fff' }}>{owner.businessName || owner.name}</h3>
                                <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.85rem', marginBottom: '1.5rem' }}>{owner.email}</p>
                                
                                <div style={{ borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '1.25rem' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                                        <span style={{ fontSize: '0.65rem', padding: '0.4rem 0.8rem', background: 'rgba(255,255,255,0.05)', borderRadius: '10px', color: 'var(--muted)', fontFamily: 'monospace', textTransform: 'uppercase', letterSpacing: '1px' }}>
                                            SYSID: {owner.id.slice(-6).toUpperCase()}
                                        </span>
                                    </div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.5rem' }}>
                                        <button 
                                            onClick={() => fetchOwnerStats(owner)}
                                            style={{ flex: 1, background: 'rgba(255,255,255,0.05)', border: 'none', color: '#fff', fontWeight: 800, fontSize: '0.7rem', cursor: 'pointer', padding: '0.75rem', borderRadius: '10px', transition: '0.2s', letterSpacing: '0.5px' }}
                                        >
                                            ANALYTICS
                                        </button>
                                        <button 
                                            onClick={() => handleDeleteOwner(owner)}
                                            style={{ background: 'rgba(239, 68, 68, 0.05)', border: 'none', color: '#ef4444', fontWeight: 800, fontSize: '0.7rem', cursor: 'pointer', padding: '0.75rem', borderRadius: '10px', transition: '0.2s' }}
                                        >
                                            DELETE
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {selectedOwner && (
                    <div style={{ position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(0,0,0,0.9)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
                        <div style={{ background: '#111218', width: '100%', maxWidth: '500px', borderRadius: '32px', border: '1px solid rgba(255,255,255,0.05)', overflow: 'hidden', boxShadow: '0 50px 100px rgba(0,0,0,0.8)' }}>
                            <div style={{ padding: '2.5rem', borderBottom: '1px solid rgba(255,255,255,0.05)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <div>
                                    <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#fff' }}>{selectedOwner.businessName || selectedOwner.name}</h2>
                                    <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.8rem' }}>Tenant Resource Analytics</p>
                                </div>
                                <button onClick={() => setSelectedOwner(null)} style={{ background: 'rgba(255,255,255,0.05)', border: 'none', width: '40px', height: '40px', borderRadius: '12px', color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    <X size={20} />
                                </button>
                            </div>

                            <div style={{ padding: '2.5rem' }}>
                                {isStatsLoading ? (
                                    <div style={{ textAlign: 'center', padding: '3rem' }}>
                                        <div style={{ width: '40px', height: '40px', border: '3px solid rgba(255,255,255,0.1)', borderTopColor: '#e85d04', borderRadius: '50%', animation: 'spin 1s linear infinite', margin: '0 auto' }} />
                                        <p style={{ marginTop: '1.5rem', color: 'rgba(255,255,255,0.4)' }}>Interrogating Database...</p>
                                    </div>
                                ) : (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
                                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                            <div style={{ background: 'rgba(255,255,255,0.03)', padding: '2rem', borderRadius: '24px', border: '1px solid rgba(255,255,255,0.05)', textAlign: 'center' }}>
                                                <div style={{ fontSize: '0.7rem', fontWeight: 800, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', marginBottom: '0.5rem' }}>Total Staff</div>
                                                <div style={{ fontSize: '2.5rem', fontWeight: 900, color: '#fff' }}>{ownerStats.total}</div>
                                            </div>
                                            <div style={{ background: 'rgba(16, 185, 129, 0.05)', padding: '2rem', borderRadius: '24px', border: '1px solid rgba(16, 185, 129, 0.1)', textAlign: 'center' }}>
                                                <div style={{ fontSize: '0.7rem', fontWeight: 800, color: '#10b981', textTransform: 'uppercase', marginBottom: '0.5rem' }}>Data Health</div>
                                                <div style={{ fontSize: '2.5rem', fontWeight: 900, color: '#10b981' }}>{ownerStats.total > 0 ? '100%' : '0%'}</div>
                                            </div>
                                        </div>

                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255,255,255,0.02)', padding: '1rem 1.5rem', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.03)' }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                                    <div style={{ width: '8px', height: '8px', background: '#3b82f6', borderRadius: '50%' }} />
                                                    <span style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.6)' }}>Administrators</span>
                                                </div>
                                                <span style={{ fontWeight: 800, color: '#fff' }}>{ownerStats.adminCount}</span>
                                            </div>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255,255,255,0.02)', padding: '1rem 1.5rem', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.03)' }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                                    <div style={{ width: '8px', height: '8px', background: '#10b981', borderRadius: '50%' }} />
                                                    <span style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.6)' }}>Staff Members</span>
                                                </div>
                                                <span style={{ fontWeight: 800, color: '#fff' }}>{ownerStats.staffCount}</span>
                                            </div>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255,255,255,0.02)', padding: '1rem 1.5rem', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.03)' }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                                    <div style={{ width: '8px', height: '8px', background: '#e85d04', borderRadius: '50%' }} />
                                                    <span style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.6)' }}>Sales Invoices</span>
                                                </div>
                                                <span style={{ fontWeight: 800, color: '#fff' }}>{ownerStats.invoiceCount}</span>
                                            </div>
                                        </div>
                                        <button 
                                            onClick={() => setSelectedOwner(null)}
                                            style={{ marginTop: '1rem', width: '100%', padding: '1.25rem', background: '#e85d04', border: 'none', borderRadius: '16px', color: '#fff', fontWeight: 900, cursor: 'pointer', letterSpacing: '1px' }}
                                        >
                                            CLOSE REPORT
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {isMobile && (
                <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 200, background: '#111218', borderTop: '1px solid rgba(255,255,255,0.07)', display: 'flex', padding: '0.5rem' }}>
                    <button onClick={() => setActiveTab('requests')} style={{ flex: 1, padding: '0.75rem', border: 'none', background: 'transparent', color: activeTab === 'requests' ? '#e85d04' : '#64748b' }}>Requests</button>
                    <button onClick={() => setActiveTab('owners')} style={{ flex: 1, padding: '0.75rem', border: 'none', background: 'transparent', color: activeTab === 'owners' ? '#e85d04' : '#64748b' }}>Businesses</button>
                </div>
            )}
        </div>
    );
};

export default SuperAdminDashboard;
