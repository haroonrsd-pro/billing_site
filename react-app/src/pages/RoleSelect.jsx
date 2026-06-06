import React, { useState, useMemo } from 'react';
import { useNavigate, NavLink } from 'react-router-dom';
import { db, auth, getTenantPath } from '../firebaseConfig';
import { signInWithEmailAndPassword, signOut } from 'firebase/auth';
import { useFirestore } from '../hooks/useFirestore';
import { collection, query, where, getDocs, addDoc, serverTimestamp, doc, getDoc } from 'firebase/firestore';
import { User, Lock, Shield, ArrowRight, Activity, Eye, EyeOff } from 'lucide-react';

export default function RoleSelect() {
    const navigate = useNavigate();
    const [activeModal, setActiveModal] = useState(null);
    const [mobileTab, setMobileTab] = useState('owner');
    const [isMobile, setIsMobile] = useState(typeof window !== 'undefined' ? window.innerWidth <= 768 : false);
    const [errorMsg, setErrorMsg] = useState('');
    const [ownerVerifying, setOwnerVerifying] = useState(false);
    const [adminVerifying, setAdminVerifying] = useState(false);
    const [staffVerifying, setStaffVerifying] = useState(false);
    const [superVerifying, setSuperVerifying] = useState(false);
    const { docs: customers } = useFirestore('customers');

    React.useEffect(() => {
        console.log("System: Login Protocol v2.5 Active");
    }, []);

    React.useEffect(() => {
        const handleResize = () => setIsMobile(window.innerWidth <= 768);
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    const storeProfile = useMemo(() => {
        return customers.find(c => c.isSystemProfile === true);
    }, [customers]);

    // Form inputs
    const [ownerUser, setOwnerUser] = useState('');
    const [ownerPass, setOwnerPass] = useState('');

    const [adminId, setAdminId] = useState('');
    const [adminKey, setAdminKey] = useState('');

    const [staffName, setStaffName] = useState('');
    const [staffPin, setStaffPin] = useState('');
    
    // Super Admin inputs
    const [superUser, setSuperUser] = useState('');
    const [superPass, setSuperPass] = useState('');
    const [showSuperPass, setShowSuperPass] = useState(false);
    
    // Visibility toggles
    const [showOwnerPass, setShowOwnerPass] = useState(false);
    const [showAdminKey, setShowAdminKey] = useState(false);
    const [showStaffPin, setShowStaffPin] = useState(false);



    const logActivity = async (userData, role, action) => {
        try {
            let device = 'Web Browser';
            try {
                const ua = navigator.userAgent;
                if (ua.includes('Windows')) device = 'Windows PC';
                else if (ua.includes('Android')) device = 'Android Device';
                else if (ua.includes('iPhone') || ua.includes('iPad')) device = 'iOS Device';
                else if (ua.includes('Macintosh')) device = 'Mac';
            } catch (uaErr) {
                console.warn("UA parsing failed");
            }

            const ownerId = sessionStorage.getItem('fb_user_owner_id') || userData?.id || 'system';
            const logPath = `owners/${ownerId}/audit_logs`;

            await addDoc(collection(db, logPath), {
                userId: userData?.id || 'master',
                userName: userData?.name || 'Master Owner',
                userRole: role,
                action: action,
                type: 'login',
                branch: userData?.station || userData?.branch || 'System',
                timestamp: serverTimestamp(),
                device: device
            });
        } catch (e) {
            console.error("System: Activity logging failed.", e);
        }
    };

    const handleLogin = async (role) => {
        let isValid = false;
        let loggedUser = null;
        setErrorMsg('');
        
        if (role === 'owner') setOwnerVerifying(true);
        else if (role === 'admin') setAdminVerifying(true);
        else if (role === 'staff') setStaffVerifying(true);
        else if (role === 'superadmin') setSuperVerifying(true);

        try {
            let email = '';
            let password = '';
            let dashboardPath = '';

            // Map inputs based on role
            if (role === 'owner') {
                email = ownerUser.trim();
                password = ownerPass.trim();
                dashboardPath = '/owner-dashboard';
            } else if (role === 'admin') {
                email = adminId.trim();
                password = adminKey.trim();
                dashboardPath = '/admin-dashboard';
            } else if (role === 'staff') {
                email = staffName.trim();
                password = staffPin.trim();
                dashboardPath = '/staff-dashboard';
            } else if (role === 'superadmin') {
                email = superUser.trim(); // Use typed input instead of hardcoded gmail
                password = superPass.trim();
                dashboardPath = '/super-admin-dashboard';
            }

// Diagnostic check removed to prevent pre-auth permission errors.

            // Step 1: Firebase Authentication
            const userCredential = await signInWithEmailAndPassword(auth, email, password);
            const authUser = userCredential.user;
            console.log(`[Diagnostic] Auth Success. UID: ${authUser.uid}`);

            // Step 2: Fetch Unified Firestore User Profile
            const userDoc = await getDoc(doc(db, 'users', authUser.uid));
            let data = userDoc.exists() ? userDoc.data() : null;

            // MANDATORY DEBUGGING LOGS (Requested)
            console.log("---------------- AUTH DEBUG ----------------");
            console.log("UID:", authUser.uid);
            console.log("User Data Found:", data);
            console.log("Approved Value:", data?.approved);
            console.log("--------------------------------------------");

            if (!data) {
                setErrorMsg('Authorization profile not found. Access restricted.');
                await signOut(auth);
                if (role === 'owner') setOwnerVerifying(false);
                else if (role === 'admin') setAdminVerifying(false);
                else if (role === 'staff') setStaffVerifying(false);
                else if (role === 'superadmin') setSuperVerifying(false);
                return;
            }

            // Step 3: Role and Boolean Approval Validation
            const isSuper = role === 'superadmin' || data.role === 'superadmin' || data.role === 'super_admin';
            
            if (data.role !== role && !isSuper) {
                setErrorMsg(`This account is not authorized for the ${role} portal.`);
                await signOut(auth);
                if (role === 'owner') setOwnerVerifying(false);
                else if (role === 'admin') setAdminVerifying(false);
                else if (role === 'staff') setStaffVerifying(false);
                else if (role === 'superadmin') setSuperVerifying(false);
                return;
            }

            // Standardize: Check boolean 'approved' field
            const isApproved = data.approved === true || isSuper;

            if (!isApproved) {
                setErrorMsg('Access denied. Awaiting Super Admin activation.');
                await signOut(auth);
                if (role === 'owner') setOwnerVerifying(false);
                else if (role === 'admin') setAdminVerifying(false);
                else if (role === 'staff') setStaffVerifying(false);
                else if (role === 'superadmin') setSuperVerifying(false);
                return;
            }

            // Success: Set session and navigate
            loggedUser = { id: authUser.uid, ...data };
            isValid = true;

            sessionStorage.setItem('fb_user_uid', authUser.uid);
            sessionStorage.setItem('fb_user_role', role);
            sessionStorage.setItem('fb_user_name', data.name || 'User');
            sessionStorage.setItem('fb_user_station', data.station || (role === 'superadmin' ? 'Global HQ' : 'Main Branch'));
            
            // Set owner/tenant ID context
            // In the unified system, the ownerId IS the UID for owners, or stored in child docs.
            const ownerId = data.role === 'owner' ? authUser.uid : (data.ownerId || authUser.uid);
            sessionStorage.setItem('fb_user_owner_id', ownerId);
            sessionStorage.setItem('fb_user_company_id', data.companyId || ownerId);
            sessionStorage.setItem('fb_user_branch_id', loggedUser.branch_id || 'main');
            
            if (role === 'admin' || role === 'staff') {
                sessionStorage.setItem('fb_user_admin_uid', loggedUser.adminUID || loggedUser.id);
            }
            if (role === 'staff') {
                sessionStorage.setItem('fb_user_restrictions', JSON.stringify(loggedUser.restrictions || []));
            }

            await logActivity(loggedUser, role, `${role} Login - Session Established`);
            navigate(dashboardPath);

        } catch (authErr) {
            console.error(`${role} Login Error:`, authErr);
            if (authErr.code === 'auth/invalid-credential' || authErr.code === 'auth/wrong-password' || authErr.code === 'auth/user-not-found') {
                setErrorMsg(role === 'staff' ? 'Invalid Staff PIN or Credentials' : 'Invalid Credentials');
            } else if (authErr.code === 'permission-denied') {
                setErrorMsg('Access denied. Security protocol violation.');
            } else {
                setErrorMsg('System Error: ' + (authErr.message || "Please check connection"));
            }
        } finally {
            if (role === 'owner') setOwnerVerifying(false);
            else if (role === 'admin') setAdminVerifying(false);
            else if (role === 'staff') setStaffVerifying(false);
            else if (role === 'superadmin') setSuperVerifying(false);
        }
    };

    if (isMobile) {
        return (
            <div style={{
                position: 'fixed', inset: 0, zIndex: 9999, 
                background: 'linear-gradient(180deg, #3d0a00 0%, #170400 100%)',
                display: 'flex', flexDirection: 'column', alignItems: 'center', 
                overflowY: 'auto', padding: '1rem', paddingBottom: '3rem'
            }}>
                <style>
                    {`
                        input:-webkit-autofill,
                        input:-webkit-autofill:hover, 
                        input:-webkit-autofill:focus, 
                        input:-webkit-autofill:active {
                            transition: background-color 5000s ease-in-out 0s;
                            -webkit-text-fill-color: #fff !important;
                        }
                    `}
                </style>
                {/* Background decorative elements */}
                <div style={{
                    position: 'absolute', inset: 0,
                    background: 'radial-gradient(circle at 50% 10%, rgba(232, 93, 4, 0.4) 0%, transparent 60%)',
                    zIndex: 0
                }} />

                <div style={{ position: 'relative', zIndex: 2, display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%', maxWidth: '400px', marginTop: '3rem' }}>
                    
                    {/* App Logo & Name */}
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: '2rem' }}>
                        <div style={{
                            marginTop: '1cm',
                            width: '80px', height: '80px', background: '#5c3a21',
                            borderRadius: '24px', display: 'flex', alignItems: 'center',
                            justifyContent: 'center', marginBottom: '1rem', overflow: 'hidden',
                            boxShadow: '0 8px 32px rgba(0,0,0,0.3)'
                        }}>
                            {storeProfile?.profile?.logo ? (
                                <img src={storeProfile.profile.logo} alt="Logo" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                            ) : (
                                <span style={{ fontSize: '2.5rem' }}>🏪</span>
                            )}
                        </div>
                        <div style={{ fontFamily: 'Yeseva One, serif', fontSize: '2.8rem', color: '#fff', lineHeight: 1, letterSpacing: '-1px', textAlign: 'center' }}>
                            {storeProfile?.profile?.businessName ? (
                                storeProfile.profile.businessName.split(' ').map((word, i) => (
                                    <div key={i}>{word}</div>
                                ))
                            ) : (
                                <>Food<br /><em style={{ color: '#e85d04', fontStyle: 'normal' }}>Bill</em></>
                            )}
                        </div>
                        <div style={{ color: 'rgba(255, 255, 255, 0.6)', fontSize: '.7rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '4px', marginTop: '1rem' }}>
                            Elite Business Intelligence
                        </div>
                    </div>

                    {/* Main Login Card */}
                    <div style={{ 
                        background: 'rgba(25, 18, 15, 0.95)', 
                        backdropFilter: 'blur(20px)',
                        borderRadius: '24px', 
                        width: '100%', 
                        padding: '1.5rem',
                        boxShadow: '0 20px 40px rgba(0,0,0,0.5)',
                        border: '1px solid rgba(255, 90, 0, 0.1)'
                    }}>
                        
                        {/* Custom Tab Switcher */}
                        <div style={{ 
                            background: '#140c08', 
                            borderRadius: '30px', 
                            display: 'flex', 
                            padding: '4px',
                            marginBottom: '2rem'
                        }}>
                            {(mobileTab === 'superadmin' ? ['superadmin'] : ['owner', 'admin', 'staff']).map((tab) => (
                                <div 
                                    key={tab}
                                    onClick={() => { setMobileTab(tab); setErrorMsg(''); }}
                                    style={{
                                        flex: 1,
                                        textAlign: 'center',
                                        padding: '0.6rem 0',
                                        borderRadius: '26px',
                                        fontSize: tab === 'superadmin' ? '0.65rem' : '0.75rem',
                                        fontWeight: 800,
                                        letterSpacing: '1px',
                                        textTransform: 'uppercase',
                                        cursor: 'pointer',
                                        transition: 'all 0.3s ease',
                                        background: mobileTab === tab ? (tab === 'superadmin' ? '#e85d04' : '#e85d04') : 'transparent',
                                        color: mobileTab === tab ? '#fff' : 'rgba(255, 255, 255, 0.4)',
                                    }}
                                >
                                    {tab === 'superadmin' ? 'SYS PROTOCOL' : tab}
                                </div>
                            ))}
                        </div>

                        {/* Active Tab Content */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                            
                            {/* Header row */}
                            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                <div style={{ 
                                    width: '46px', height: '46px', 
                                    background: mobileTab === 'superadmin' ? 'rgba(232, 93, 4, 0.2)' : 'rgba(232, 93, 4, 0.15)', 
                                    borderRadius: '14px', 
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    fontSize: '1.5rem',
                                    border: `1px solid ${mobileTab === 'superadmin' ? 'rgba(232, 93, 4, 0.6)' : 'rgba(232, 93, 4, 0.3)'}`
                                }}>
                                    {mobileTab === 'owner' ? (
                                        storeProfile?.profile?.logo ? <img src={storeProfile.profile.logo} alt="L" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '12px' }} /> : '👑'
                                    ) : mobileTab === 'admin' ? (
                                        '🛡️'
                                    ) : mobileTab === 'superadmin' ? (
                                        '🔐'
                                    ) : (
                                        '👨‍🍳'
                                    )}
                                </div>
                                <div>
                                    <div style={{ fontSize: '1.4rem', fontWeight: '700', color: '#fff', display: 'flex', gap: '6px' }}>
                                        {mobileTab === 'owner' ? 'Owner' : mobileTab === 'admin' ? 'Admin' : mobileTab === 'superadmin' ? 'Super' : 'Staff'}
                                        <span style={{ color: mobileTab === 'superadmin' ? '#e85d04' : 'rgba(255,255,255,0.4)', fontWeight: mobileTab === 'superadmin' ? '700' : '400' }}>
                                            {mobileTab === 'superadmin' ? 'Admin' : mobileTab === 'owner' ? 'Gate' : 'Portal'}
                                        </span>
                                    </div>
                                </div>
                            </div>
                            
                            {errorMsg && (
                                <div style={{ background: 'rgba(220, 38, 38, 0.1)', color: '#ef4444', fontSize: '.75rem', padding: '.6rem', borderRadius: '8px', textAlign: 'center' }}>
                                    {errorMsg}
                                </div>
                            )}

                            {/* Forms */}
                            {mobileTab === 'owner' && (
                                <>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                                        <label style={{ fontSize: '0.7rem', fontWeight: 800, color: 'rgba(255,255,255,0.6)', letterSpacing: '1px', textTransform: 'uppercase' }}>Owner Email Address</label>
                                        <div style={{ position: 'relative' }}>
                                            <User size={18} color="rgba(255,255,255,0.4)" style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)' }} />
                                            <input autoComplete="off" type="email" value={ownerUser} onChange={(e) => setOwnerUser(e.target.value)} placeholder="owner id" 
                                                style={{ width: '100%', background: '#1c1512', border: '1px solid #36251e', borderRadius: '16px', padding: '1rem 1rem 1rem 3rem', color: '#fff', outline: 'none', fontSize: '0.95rem' }} 
                                            />
                                        </div>
                                    </div>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                                        <label style={{ fontSize: '0.7rem', fontWeight: 800, color: 'rgba(255,255,255,0.6)', letterSpacing: '1px', textTransform: 'uppercase' }}>Master Passcode</label>
                                        <div style={{ position: 'relative' }}>
                                            <Lock size={18} color="rgba(255,255,255,0.4)" style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)' }} />
                                            <input autoComplete="new-password" type={showOwnerPass ? "text" : "password"} value={ownerPass} onChange={(e) => setOwnerPass(e.target.value)} placeholder="password" 
                                                style={{ width: '100%', background: '#1c1512', border: '1px solid #36251e', borderRadius: '16px', padding: '1rem 3.5rem 1rem 3rem', color: '#fff', outline: 'none', fontSize: showOwnerPass ? '0.95rem' : '1.2rem', letterSpacing: showOwnerPass ? 'normal' : '4px' }} 
                                            />
                                            <div 
                                                onClick={() => setShowOwnerPass(!showOwnerPass)}
                                                style={{ position: 'absolute', right: '1rem', top: '50%', transform: 'translateY(-50%)', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
                                            >
                                                {showOwnerPass ? <EyeOff size={18} color="#e85d04" /> : <Eye size={18} color="rgba(255,255,255,0.4)" />}
                                            </div>
                                        </div>
                                    </div>
                                    
                                    {/* Action Buttons */}
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginTop: '1rem' }}>
                                        <button 
                                            onClick={() => handleLogin('owner')} 
                                            disabled={ownerVerifying}
                                            style={{ 
                                                width: '100%', 
                                                background: ownerVerifying ? 'rgba(232, 93, 4, 0.5)' : 'linear-gradient(90deg, #ff7b00, #e85d04)', 
                                                border: 'none', borderRadius: '16px', 
                                                padding: '1.2rem', color: '#fff', fontSize: '0.9rem', fontWeight: 800, letterSpacing: '1px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem',
                                                boxShadow: ownerVerifying ? 'none' : '0 10px 20px rgba(232, 93, 4, 0.3)', cursor: ownerVerifying ? 'not-allowed' : 'pointer'
                                            }}
                                        >
                                            {ownerVerifying ? (
                                                <>
                                                    <div className="tiny-spinner" style={{ width: '16px', height: '16px', border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin 0.6s linear infinite' }} />
                                                    VERIFYING...
                                                </>
                                            ) : (
                                                <>
                                                    <Shield size={18} />
                                                    AUTHORIZE ACCESS
                                                </>
                                            )}
                                        </button>
                                        <div style={{ textAlign: 'center', marginTop: '1rem' }}>
                                            <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.8rem' }}>
                                                New business? <NavLink to="/register" style={{ color: '#e85d04', fontWeight: 800, textDecoration: 'none' }}>Register here</NavLink>
                                            </p>
                                        </div>
                                    </div>
                                </>
                            )}

                            {mobileTab === 'admin' && (
                                <>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                                        <label style={{ fontSize: '0.7rem', fontWeight: 800, color: 'rgba(255,255,255,0.6)', letterSpacing: '1px', textTransform: 'uppercase' }}>Admin ID</label>
                                        <div style={{ position: 'relative' }}>
                                            <User size={18} color="rgba(255,255,255,0.4)" style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)' }} />
                                            <input autoComplete="off" type="text" value={adminId} onChange={(e) => setAdminId(e.target.value)} placeholder="Identity required..." 
                                                style={{ width: '100%', background: '#1c1512', border: '1px solid #36251e', borderRadius: '16px', padding: '1rem 1rem 1rem 3rem', color: '#fff', outline: 'none', fontSize: '0.95rem' }} 
                                            />
                                        </div>
                                    </div>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                                        <label style={{ fontSize: '0.7rem', fontWeight: 800, color: 'rgba(255,255,255,0.6)', letterSpacing: '1px', textTransform: 'uppercase' }}>Security Key</label>
                                        <div style={{ position: 'relative' }}>
                                            <Lock size={18} color="rgba(255,255,255,0.4)" style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)' }} />
                                            <input autoComplete="new-password" type={showAdminKey ? "text" : "password"} value={adminKey} onChange={(e) => setAdminKey(e.target.value)} placeholder="••••••••" 
                                                style={{ width: '100%', background: '#1c1512', border: '1px solid #36251e', borderRadius: '16px', padding: '1rem 3.5rem 1rem 3rem', color: '#fff', outline: 'none', fontSize: showAdminKey ? '0.95rem' : '1.2rem', letterSpacing: showAdminKey ? 'normal' : '4px' }} 
                                            />
                                            <div 
                                                onClick={() => setShowAdminKey(!showAdminKey)}
                                                style={{ position: 'absolute', right: '1rem', top: '50%', transform: 'translateY(-50%)', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
                                            >
                                                {showAdminKey ? <EyeOff size={18} color="#3b82f6" /> : <Eye size={18} color="rgba(255,255,255,0.4)" />}
                                            </div>
                                        </div>
                                    </div>
                                    
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginTop: '1rem' }}>
                                        <button 
                                            onClick={() => handleLogin('admin')} 
                                            disabled={adminVerifying}
                                            style={{ 
                                                width: '100%', 
                                                background: adminVerifying ? 'rgba(59, 130, 246, 0.5)' : 'linear-gradient(90deg, #3b82f6, #2563eb)', 
                                                border: 'none', borderRadius: '16px', 
                                                padding: '1.2rem', color: '#fff', fontSize: '0.9rem', fontWeight: 800, letterSpacing: '1px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem',
                                                boxShadow: adminVerifying ? 'none' : '0 10px 20px rgba(37, 99, 235, 0.3)', cursor: adminVerifying ? 'not-allowed' : 'pointer'
                                            }}
                                        >
                                            {adminVerifying ? (
                                                <>
                                                    <div className="tiny-spinner" style={{ width: '16px', height: '16px', border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin 0.6s linear infinite' }} />
                                                    VERIFYING...
                                                </>
                                            ) : (
                                                <>
                                                    <Shield size={18} />
                                                    UNLOCK TERMINAL
                                                </>
                                            )}
                                        </button>
                                    </div>
                                </>
                            )}

                            {mobileTab === 'staff' && (
                                <>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                                        <label style={{ fontSize: '0.7rem', fontWeight: 800, color: 'rgba(255,255,255,0.6)', letterSpacing: '1px', textTransform: 'uppercase' }}>Staff Username</label>
                                        <div style={{ position: 'relative' }}>
                                            <User size={18} color="rgba(255,255,255,0.4)" style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)' }} />
                                            <input autoComplete="off" type="text" value={staffName} onChange={(e) => setStaffName(e.target.value)} placeholder="Identity required..." 
                                                style={{ width: '100%', background: '#1c1512', border: '1px solid #36251e', borderRadius: '16px', padding: '1rem 1rem 1rem 3rem', color: '#fff', outline: 'none', fontSize: '0.95rem' }} 
                                            />
                                        </div>
                                    </div>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                                        <label style={{ fontSize: '0.7rem', fontWeight: 800, color: 'rgba(255,255,255,0.6)', letterSpacing: '1px', textTransform: 'uppercase' }}>Access PIN</label>
                                        <div style={{ position: 'relative' }}>
                                            <Lock size={18} color="rgba(255,255,255,0.4)" style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)' }} />
                                            <input autoComplete="new-password" type={showStaffPin ? "text" : "password"} value={staffPin} onChange={(e) => setStaffPin(e.target.value)} placeholder="••••••••" 
                                                style={{ width: '100%', background: '#1c1512', border: '1px solid #36251e', borderRadius: '16px', padding: '1rem 3.5rem 1rem 3rem', color: '#fff', outline: 'none', fontSize: showStaffPin ? '0.95rem' : '1.2rem', letterSpacing: showStaffPin ? 'normal' : '4px' }} 
                                            />
                                            <div 
                                                onClick={() => setShowStaffPin(!showStaffPin)}
                                                style={{ position: 'absolute', right: '1rem', top: '50%', transform: 'translateY(-50%)', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
                                            >
                                                {showStaffPin ? <EyeOff size={18} color="#10b981" /> : <Eye size={18} color="rgba(255,255,255,0.4)" />}
                                            </div>
                                        </div>
                                    </div>
                                    
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginTop: '1rem' }}>
                                        <button 
                                            onClick={() => handleLogin('staff')} 
                                            disabled={staffVerifying}
                                            style={{ 
                                                width: '100%', 
                                                background: staffVerifying ? 'rgba(16, 185, 129, 0.5)' : 'linear-gradient(90deg, #10b981, #059669)', 
                                                border: 'none', borderRadius: '16px', 
                                                padding: '1.2rem', color: '#fff', fontSize: '0.9rem', fontWeight: 800, letterSpacing: '1px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem',
                                                boxShadow: staffVerifying ? 'none' : '0 10px 20px rgba(16, 185, 129, 0.3)', cursor: staffVerifying ? 'not-allowed' : 'pointer'
                                            }}
                                        >
                                            {staffVerifying ? (
                                                <>
                                                    <div className="tiny-spinner" style={{ width: '16px', height: '16px', border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin 0.6s linear infinite' }} />
                                                    VERIFYING...
                                                </>
                                            ) : (
                                                <>
                                                    <Activity size={18} />
                                                    START SHIFT
                                                </>
                                            )}
                                        </button>
                                    </div>
                                </>
                            )}
                            {mobileTab === 'superadmin' && (
                                <>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                                        <label style={{ fontSize: '0.7rem', fontWeight: 800, color: 'rgba(255,255,255,0.6)', letterSpacing: '1px', textTransform: 'uppercase' }}>Username / Email</label>
                                        <div style={{ position: 'relative' }}>
                                            <User size={18} color="rgba(255,255,255,0.4)" style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)' }} />
                                            <input autoComplete="off" type="text" value={superUser} onChange={(e) => setSuperUser(e.target.value)} placeholder="System user..." 
                                                style={{ width: '100%', background: '#1c1512', border: '1px solid #36251e', borderRadius: '16px', padding: '1rem 1rem 1rem 3rem', color: '#fff', outline: 'none', fontSize: '0.95rem' }} 
                                            />
                                        </div>
                                    </div>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                                        <label style={{ fontSize: '0.7rem', fontWeight: 800, color: 'rgba(255,255,255,0.6)', letterSpacing: '1px', textTransform: 'uppercase' }}>System Passphrase</label>
                                        <div style={{ position: 'relative' }}>
                                            <Lock size={18} color="rgba(255,255,255,0.4)" style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)' }} />
                                            <input autoComplete="new-password" type={showSuperPass ? "text" : "password"} value={superPass} onChange={(e) => setSuperPass(e.target.value)} placeholder="••••••••" 
                                                style={{ width: '100%', background: '#1c1512', border: '1px solid #36251e', borderRadius: '16px', padding: '1rem 3.5rem 1rem 3rem', color: '#fff', outline: 'none', fontSize: showSuperPass ? '0.95rem' : '1.2rem', letterSpacing: showSuperPass ? 'normal' : '4px' }} 
                                            />
                                            <div 
                                                onClick={() => setShowSuperPass(!showSuperPass)}
                                                style={{ position: 'absolute', right: '1rem', top: '50%', transform: 'translateY(-50%)', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
                                            >
                                                {showSuperPass ? <EyeOff size={18} color="#e85d04" /> : <Eye size={18} color="rgba(255,255,255,0.4)" />}
                                            </div>
                                        </div>
                                    </div>
                                    
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginTop: '1rem' }}>
                                        <button 
                                            onClick={() => handleLogin('superadmin')} 
                                            disabled={superVerifying}
                                            style={{ 
                                                width: '100%', 
                                                background: superVerifying ? 'rgba(232, 93, 4, 0.5)' : 'linear-gradient(90deg, #ff7b00, #e85d04)', 
                                                border: 'none', borderRadius: '16px', 
                                                padding: '1.2rem', color: '#fff', fontSize: '0.9rem', fontWeight: 800, letterSpacing: '1px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem',
                                                boxShadow: superVerifying ? 'none' : '0 10px 20px rgba(232, 93, 4, 0.4)', cursor: superVerifying ? 'not-allowed' : 'pointer'
                                            }}
                                        >
                                            {superVerifying ? (
                                                <>
                                                    <div className="tiny-spinner" style={{ width: '16px', height: '16px', border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin 0.6s linear infinite' }} />
                                                    VERIFYING...
                                                </>
                                            ) : (
                                                <>
                                                    <Shield size={18} />
                                                    AUTHORIZE MASTER
                                                </>
                                            )}
                                        </button>
                                        <div style={{ textAlign: 'center' }}>
                                            <span 
                                                onClick={() => { setMobileTab('owner'); setErrorMsg(''); }}
                                                style={{ color: 'rgba(255,255,255,0.3)', fontSize: '0.75rem', cursor: 'pointer', textDecoration: 'underline' }}
                                            >
                                                ← Back to Login
                                            </span>
                                        </div>
                                    </div>
                                </>
                            )}
                        </div>
                    </div>

                    {/* Hidden Super Admin Access — only shown on normal tabs */}
                    {mobileTab !== 'superadmin' && (
                        <div 
                            style={{ marginTop: '2rem', opacity: 0.45, transition: '0.3s', textAlign: 'center' }}
                            onTouchStart={(e) => e.currentTarget.style.opacity = 1}
                            onTouchEnd={(e) => e.currentTarget.style.opacity = 0.45}
                        >
                            <button 
                                onClick={() => { setMobileTab('superadmin'); setErrorMsg(''); }}
                                style={{ background: 'transparent', border: '1px solid rgba(255,255,255,0.2)', padding: '0.5rem 1rem', borderRadius: '100px', color: '#fff', fontSize: '0.65rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '2px', cursor: 'pointer' }}
                            >
                                System Protocol Access
                            </button>
                        </div>
                    )}
                </div>
            </div>
        );
    }

    return (
        <div style={{
            position: 'fixed', inset: 0, zIndex: 9999, background: 'linear-gradient(180deg, #3d0a00 0%, #170400 100%)',
            display: 'flex', overflowY: 'auto', padding: '2rem'
        }}>
            <style>
                {`
                    input:-webkit-autofill,
                    input:-webkit-autofill:hover, 
                    input:-webkit-autofill:focus, 
                    input:-webkit-autofill:active {
                        transition: background-color 5000s ease-in-out 0s;
                        -webkit-text-fill-color: #fff !important;
                    }
                `}
            </style>
            {/* Background elements removed */}

            <div style={{ position: 'relative', zIndex: 2, display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%', maxWidth: '1200px', margin: 'auto' }}>
                <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: '1.5rem' }}>
                        <div style={{
                            marginTop: '1cm',
                            width: '80px', height: '80px', background: '#5c3a21',
                            borderRadius: '24px', display: 'flex', alignItems: 'center',
                            justifyContent: 'center', marginBottom: '1rem', overflow: 'hidden',
                            border: '1px solid rgba(255,255,255,0.1)'
                        }}>
                            {storeProfile?.profile?.logo ? (
                                <img src={storeProfile.profile.logo} alt="Logo" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                            ) : (
                                <span style={{ fontSize: '2.5rem' }}>🏪</span>
                            )}
                        </div>
                        <div style={{ fontFamily: 'Yeseva One, serif', fontSize: '2.8rem', color: '#fff', marginBottom: '.2rem', letterSpacing: '-1px' }}>
                            {storeProfile?.profile?.businessName || (
                                <>Food<em style={{ color: '#e85d04', fontStyle: 'normal' }}>Bill</em><sub style={{ fontSize: '0.4em' }}>PRO</sub></>
                            )}
                        </div>
                    </div>
                    <div style={{ color: 'rgba(255, 255, 255, 0.3)', fontSize: '.75rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '2px' }}>
                        Elite Business Intelligence
                    </div>
                </div>

                <div className="android-scroll-container" style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', alignItems: 'stretch', gap: '2rem' }}>

                    {/* Secure Login Card (Owner) */}
                    <div className="android-card" style={{ flex: '1', minWidth: '300px', maxWidth: '380px' }}>
                        <div className="android-card-title">Secure Login</div>
                        <div className="android-card-desc" style={{ marginBottom: '1.5rem' }}>
                            Master access to all financial reports, system settings, and business intelligence.
                        </div>
                        <div className="android-card-icon" style={{ marginBottom: '1rem', width: '48px', height: '48px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            {storeProfile?.profile?.logo ? (
                                <img src={storeProfile.profile.logo} alt="Logo" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '12px' }} />
                            ) : '👑'}
                        </div>

                        <div style={{ width: '100%', textAlign: 'left', marginTop: 'auto' }}>
                            {errorMsg && activeModal === 'owner' && (
                                <div style={{ background: 'rgba(220, 38, 38, 0.1)', color: '#ef4444', fontSize: '.75rem', padding: '.6rem', borderRadius: '8px', textAlign: 'center', marginBottom: '1rem' }}>{errorMsg}</div>
                            )}
                            <div style={{ marginBottom: '1rem' }}>
                                <input autoComplete="off" type="email" value={ownerUser} onChange={(e) => setOwnerUser(e.target.value)} placeholder="owner id" style={{ width: '100%', background: 'rgba(255, 255, 255, 0.05)', border: '1px solid rgba(255, 255, 255, 0.1)', borderRadius: '12px', padding: '1rem', color: '#fff', outline: 'none', fontSize: '0.9rem' }} onFocus={() => setActiveModal('owner')} />
                            </div>
                             <div style={{ marginBottom: '1.5rem', position: 'relative' }}>
                                 <input autoComplete="new-password" type={showOwnerPass ? "text" : "password"} value={ownerPass} onChange={(e) => setOwnerPass(e.target.value)} placeholder="password" style={{ width: '100%', background: 'rgba(255, 255, 255, 0.05)', border: '1px solid rgba(255, 255, 255, 0.1)', borderRadius: '12px', padding: '1rem 3rem 1rem 1rem', color: '#fff', outline: 'none', fontSize: '0.9rem' }} onFocus={() => setActiveModal('owner')} />
                                 <div 
                                    onClick={() => setShowOwnerPass(!showOwnerPass)}
                                    style={{ position: 'absolute', right: '1rem', top: '50%', transform: 'translateY(-50%)', cursor: 'pointer' }}
                                 >
                                    {showOwnerPass ? <EyeOff size={16} color="#e85d04" /> : <Eye size={16} color="rgba(255,255,255,0.2)" />}
                                 </div>
                             </div>
                            <button 
                                className={`android-btn android-btn-orange ${ownerVerifying ? 'disabled' : ''}`} 
                                onClick={() => handleLogin('owner')} 
                                disabled={ownerVerifying}
                                style={{ 
                                    width: '100%', 
                                    cursor: ownerVerifying ? 'not-allowed' : 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: '0.5rem'
                                }}
                            >
                                {ownerVerifying ? 'VERIFYING...' : 'AUTHORIZE ACCESS'}
                            </button>
                            <div style={{ textAlign: 'center', marginTop: '1.25rem' }}>
                                <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.85rem' }}>
                                    New business? <NavLink to="/register" style={{ color: '#e85d04', fontWeight: 800, textDecoration: 'none' }}>Register Business</NavLink>
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Administrator Card */}
                    <div className="android-card" style={{ flex: '1', minWidth: '300px', maxWidth: '380px' }}>
                        <div className="android-card-title">Administrator</div>
                        <div className="android-card-desc" style={{ marginBottom: '1.5rem' }}>
                            Manage staff, inventory, and daily operations with supervisory privileges.
                        </div>
                        <div className="android-card-icon" style={{ marginBottom: '1rem', fontSize: '3rem', width: '48px', height: '48px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            🛡️
                        </div>

                        <div style={{ width: '100%', textAlign: 'left', marginTop: 'auto' }}>
                            {errorMsg && activeModal === 'admin' && (
                                <div style={{ background: 'rgba(220, 38, 38, 0.1)', color: '#ef4444', fontSize: '.75rem', padding: '.6rem', borderRadius: '8px', textAlign: 'center', marginBottom: '1rem' }}>{errorMsg}</div>
                            )}
                            <div style={{ marginBottom: '1rem' }}>
                                <input autoComplete="off" type="text" value={adminId} onChange={(e) => setAdminId(e.target.value)} placeholder="Admin ID" style={{ width: '100%', background: 'rgba(255, 255, 255, 0.05)', border: '1px solid rgba(255, 255, 255, 0.1)', borderRadius: '12px', padding: '1rem', color: '#fff', outline: 'none', fontSize: '0.9rem' }} onFocus={() => setActiveModal('admin')} />
                            </div>
                             <div style={{ marginBottom: '1.5rem', position: 'relative' }}>
                                 <input autoComplete="new-password" type={showAdminKey ? "text" : "password"} value={adminKey} onChange={(e) => setAdminKey(e.target.value)} placeholder="Security Key" style={{ width: '100%', background: 'rgba(255, 255, 255, 0.05)', border: '1px solid rgba(255, 255, 255, 0.1)', borderRadius: '12px', padding: '1rem 3rem 1rem 1rem', color: '#fff', outline: 'none', fontSize: '0.9rem' }} onFocus={() => setActiveModal('admin')} />
                                 <div 
                                    onClick={() => setShowAdminKey(!showAdminKey)}
                                    style={{ position: 'absolute', right: '1rem', top: '50%', transform: 'translateY(-50%)', cursor: 'pointer' }}
                                 >
                                    {showAdminKey ? <EyeOff size={16} color="#3b82f6" /> : <Eye size={16} color="rgba(255,255,255,0.2)" />}
                                 </div>
                             </div>
                            <button 
                                className={`android-btn android-btn-blue ${adminVerifying ? 'disabled' : ''}`} 
                                onClick={() => handleLogin('admin')} 
                                disabled={adminVerifying}
                                style={{ 
                                    width: '100%', 
                                    cursor: adminVerifying ? 'not-allowed' : 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: '0.5rem'
                                }}
                            >
                                {adminVerifying ? 'VERIFYING...' : 'UNLOCK TERMINAL'}
                            </button>
                        </div>
                    </div>

                    {/* Staff Card */}
                    <div className="android-card" style={{ flex: '1', minWidth: '300px', maxWidth: '380px' }}>
                        <div className="android-card-title">Staff</div>
                        <div className="android-card-desc" style={{ marginBottom: '1.5rem' }}>
                            Quick access for billing, order processing, and table management tools.
                        </div>
                        <div className="android-card-icon" style={{ marginBottom: '1rem' }}>👨‍🍳</div>

                        <div style={{ width: '100%', textAlign: 'left', marginTop: 'auto' }}>
                            {errorMsg && activeModal === 'staff' && (
                                <div style={{ background: 'rgba(220, 38, 38, 0.1)', color: '#ef4444', fontSize: '.75rem', padding: '.6rem', borderRadius: '8px', textAlign: 'center', marginBottom: '1rem' }}>{errorMsg}</div>
                            )}
                            <div style={{ marginBottom: '1rem' }}>
                                <input autoComplete="off" type="text" value={staffName} onChange={(e) => setStaffName(e.target.value)} placeholder="Staff Username" style={{ width: '100%', background: 'rgba(255, 255, 255, 0.05)', border: '1px solid rgba(255, 255, 255, 0.1)', borderRadius: '12px', padding: '1rem', color: '#fff', outline: 'none', fontSize: '0.9rem' }} onFocus={() => setActiveModal('staff')} />
                            </div>
                             <div style={{ marginBottom: '1.5rem', position: 'relative' }}>
                                 <input autoComplete="new-password" type={showStaffPin ? "text" : "password"} value={staffPin} onChange={(e) => setStaffPin(e.target.value)} placeholder="Password" style={{ width: '100%', background: 'rgba(255, 255, 255, 0.05)', border: '1px solid rgba(255, 255, 255, 0.1)', borderRadius: '12px', padding: '1rem 3rem 1rem 1rem', color: '#fff', outline: 'none', fontSize: '0.9rem' }} onFocus={() => setActiveModal('staff')} />
                                 <div 
                                    onClick={() => setShowStaffPin(!showStaffPin)}
                                    style={{ position: 'absolute', right: '1rem', top: '50%', transform: 'translateY(-50%)', cursor: 'pointer' }}
                                 >
                                    {showStaffPin ? <EyeOff size={16} color="#10b981" /> : <Eye size={16} color="rgba(255,255,255,0.2)" />}
                                 </div>
                             </div>
                            <button 
                                className={`android-btn android-btn-green ${staffVerifying ? 'disabled' : ''}`} 
                                onClick={() => handleLogin('staff')} 
                                disabled={staffVerifying}
                                style={{ 
                                    width: '100%', 
                                    cursor: staffVerifying ? 'not-allowed' : 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: '0.5rem'
                                }}
                            >
                                {staffVerifying ? 'VERIFYING...' : 'START SHIFT'}
                            </button>
                        </div>
                    </div>

                </div>

                {/* Discrete Super Admin Portal */}
                <div style={{ marginTop: '4rem', opacity: 0.45, transition: '0.3s', cursor: 'pointer' }} onMouseEnter={(e) => e.currentTarget.style.opacity = 1} onMouseLeave={(e) => e.currentTarget.style.opacity = 0.45}>
                    <button 
                        onClick={() => setActiveModal('superadmin')}
                        style={{ background: 'transparent', border: '1px solid rgba(255,255,255,0.2)', padding: '0.5rem 1rem', borderRadius: '100px', color: '#fff', fontSize: '0.7rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '2px' }}
                    >
                        System Protocol Access
                    </button>
                </div>

                {/* Super Admin Modal */}
                {activeModal === 'superadmin' && (
                    <div style={{ position: 'fixed', inset: 0, zIndex: 10000, background: 'rgba(0,0,0,0.95)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
                        <div style={{ background: '#111', width: '100%', maxWidth: '400px', padding: '2.5rem', borderRadius: '24px', border: '1px solid rgba(232, 93, 4, 0.3)', boxShadow: '0 0 50px rgba(232, 93, 4, 0.1)' }}>
                            <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
                                <Shield size={48} color="#e85d04" style={{ marginBottom: '1rem' }} />
                                <h3 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#fff' }}>Super <span style={{ color: '#e85d04' }}>Admin</span> Login</h3>
                                <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.8rem' }}>Master environment control & authorization.</p>
                            </div>

                            {errorMsg && activeModal === 'superadmin' && (
                                <div style={{ background: 'rgba(220, 38, 38, 0.1)', color: '#ef4444', padding: '0.8rem', borderRadius: '12px', marginBottom: '1.5rem', textAlign: 'center', fontSize: '0.8rem' }}>{errorMsg}</div>
                            )}

                            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                                <input autoComplete="off" type="text" value={superUser} onChange={(e) => setSuperUser(e.target.value)} placeholder="Username / Email" style={{ width: '100%', background: '#1a1a1a', border: '1px solid #333', borderRadius: '12px', padding: '1rem', color: '#fff', outline: 'none' }} />
                                <div style={{ position: 'relative' }}>
                                    <input autoComplete="new-password" type={showSuperPass ? "text" : "password"} value={superPass} onChange={(e) => setSuperPass(e.target.value)} placeholder="System Passphrase" style={{ width: '100%', background: '#1a1a1a', border: '1px solid #333', borderRadius: '12px', padding: '1rem 3rem 1rem 1rem', color: '#fff', outline: 'none' }} />
                                    <div onClick={() => setShowSuperPass(!showSuperPass)} style={{ position: 'absolute', right: '1rem', top: '50%', transform: 'translateY(-50%)', cursor: 'pointer' }}>
                                        {showSuperPass ? <EyeOff size={18} color="#e85d04" /> : <Eye size={18} color="#444" />}
                                    </div>
                                </div>
                                <button 
                                    className={`android-btn android-btn-orange ${superVerifying ? 'disabled' : ''}`} 
                                    onClick={() => handleLogin('superadmin')} 
                                    disabled={superVerifying}
                                    style={{ 
                                        width: '100%', 
                                        margin: 0,
                                        cursor: superVerifying ? 'not-allowed' : 'pointer'
                                    }}
                                >
                                    {superVerifying ? 'VERIFYING...' : 'AUTHORIZE MASTER'}
                                </button>
                                <div style={{ display: 'flex', justifyContent: 'center', gap: '1rem', marginTop: '0.5rem' }}>
                                    <button 
                                        onClick={() => { sessionStorage.clear(); window.location.reload(); }}
                                        style={{ background: 'transparent', border: 'none', color: '#e85d04', fontSize: '0.7rem', fontWeight: 800, cursor: 'pointer', textDecoration: 'underline' }}
                                    >
                                        RESET APP SESSION
                                    </button>
                                    <button 
                                        onClick={() => { setActiveModal(null); setErrorMsg(''); }}
                                        style={{ background: 'transparent', border: 'none', color: 'rgba(255,255,255,0.4)', fontSize: '0.7rem', cursor: 'pointer' }}
                                    >
                                        Cancel Request
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Removed internal Modals entirely */}
        </div>
    );
}
