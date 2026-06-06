import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { db, auth, provisioningAuth } from '../firebaseConfig';
import { doc, getDoc, updateDoc, setDoc, serverTimestamp, collection, query, where, getDocs } from 'firebase/firestore';
import { Shield, CheckCircle, XCircle, Loader2, AlertTriangle, ArrowLeft } from 'lucide-react';
import { useMessaging } from '../context/MessagingContext';
import { firebaseConfig } from '../firebaseConfig';
import { initializeApp, deleteApp, getApps } from 'firebase/app';
import { getAuth, createUserWithEmailAndPassword, signOut, fetchSignInMethodsForEmail } from 'firebase/auth';

export default function AdminAction({ type }) {
    const [searchParams] = useSearchParams();
    const requestId = searchParams.get('requestId');
    const token = searchParams.get('token');
    const navigate = useNavigate();
    const { showToast } = useMessaging();

    const [status, setStatus] = useState('verifying'); // verifying, success, error
    const [error, setError] = useState('');
    const [details, setDetails] = useState(null);

    useEffect(() => {
        let isMounted = true;
        const processAction = async () => {
            if (!isMounted) return;
            if (!requestId || !token) {
                setStatus('error');
                setError('Invalid link parameters. Required credentials missing.');
                return;
            }

            try {
                // 1. Fetch Request
                const requestRef = doc(db, 'registration_requests', requestId);
                const requestSnap = await getDoc(requestRef);

                if (!requestSnap.exists()) {
                    setStatus('error');
                    setError('Registration request not found. It may have expired or been deleted.');
                    return;
                }

                const requestData = requestSnap.data();
                setDetails(requestData);

                // 2. Validate Token & Status
                if (requestData.secureToken !== token) {
                    setStatus('error');
                    setError('Authentication failure. Secure token does not match the request data.');
                    return;
                }

                if (requestData.status !== 'pending') {
                    setStatus('error');
                    setError(`This request has already been ${requestData.status.toUpperCase()}. No further action is required.`);
                    return;
                }

                // 3. Execute Action
                if (type === 'approve') {
                    // Step A: Provision Auth (Using PRIMARY instance)
                    // WARNING: This signs out the Super Admin immediately.
                    let userUid = '';
                    try {
                        console.log("System: Checking provisioning authentication state...");
                        const methods = await fetchSignInMethodsForEmail(provisioningAuth, requestData.email);

                        if (methods.length > 0) {
                            console.log("System: Syncing with existing Auth entry...");
                            const ownerQ = query(collection(db, 'owners'), where('email', '==', requestData.email));
                            const ownerSnap = await getDocs(ownerQ);

                            if (!ownerSnap.empty) {
                                userUid = ownerSnap.docs[0].id;
                                console.log("System: Protocol synchronized. UID:", userUid);
                            } else {
                                throw new Error("Security conflict: Authentication exists but Business record is missing.");
                            }
                        } else {
                            console.log("System: Provisioning new Auth entry...");
                            const userCredential = await createUserWithEmailAndPassword(provisioningAuth, requestData.email, requestData.password);
                            userUid = userCredential.user.uid;
                            console.log("System: Auth created in secondary instance. Session persistent.");
                        }
                    } catch (authError) {
                        throw authError;
                    }

                    // Step B: Create Tenant Root (Owners Collection)
                    const ownerId = userUid;
                    await setDoc(doc(db, 'owners', ownerId), {
                        uid: ownerId,
                        name: requestData.name || requestData.ownerName,
                        email: requestData.email,
                        role: 'owner',
                        businessName: requestData.companyName,
                        status: 'approved',
                        createdAt: serverTimestamp()
                    });

                    // Step C: Update Registration Request
                    await updateDoc(requestRef, {
                        status: 'approved',
                        ownerId: ownerId,
                        approvedAt: serverTimestamp()
                    });

                } else if (type === 'reject') {
                    await updateDoc(requestRef, {
                        status: 'rejected',
                        rejectedAt: serverTimestamp()
                    });

                    setStatus('success');
                    showToast(`${requestData.companyName} request has been rejected.`, 'info');
                }

            } catch (err) {
                console.error(err);
                setStatus('error');
                setError('A critical system error occurred during provisioning: ' + err.message);
            }
        };

        processAction();
        return () => { isMounted = false; };
    }, [requestId, token, type]);

    const containerStyle = {
        minHeight: '100vh',
        background: '#0a0b10',
        color: '#fff',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '2rem',
        fontFamily: "'Inter', sans-serif"
    };

    const cardStyle = {
        width: '100%',
        maxWidth: '480px',
        background: '#111218',
        borderRadius: '32px',
        padding: '3rem',
        border: '1px solid rgba(255,255,255,0.05)',
        textAlign: 'center',
        boxShadow: '0 40px 80px rgba(0,0,0,0.5)'
    };

    return (
        <div style={containerStyle}>
            <div style={cardStyle}>
                <div style={{ marginBottom: '2rem', display: 'flex', justifyContent: 'center' }}>
                    <div style={{
                        width: '80px', height: '80px', borderRadius: '24px',
                        background: 'rgba(255,255,255,0.03)', display: 'flex',
                        alignItems: 'center', justifyContent: 'center',
                        border: '1px solid rgba(255,255,255,0.08)'
                    }}>
                        <Shield size={40} color="#e85d04" />
                    </div>
                </div>

                {status === 'verifying' && (
                    <div style={{ opacity: 0.8 }}>
                        <Loader2 size={48} className="animate-spin" style={{ margin: '0 auto 1.5rem', color: '#e85d04' }} />
                        <h2 style={{ fontSize: '1.5rem', fontWeight: 800, marginBottom: '0.5rem' }}>Verifying Security Hash...</h2>
                        <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.9rem' }}>Authenticating request ID and provisioning authorization.</p>
                    </div>
                )}

                {status === 'success' && (
                    <div>
                        <CheckCircle size={56} color="#10b981" style={{ marginBottom: '1.5rem' }} />
                        <h2 style={{ fontSize: '1.75rem', fontWeight: 800, marginBottom: '0.75rem', color: '#fff' }}>Protocol Executed</h2>
                        <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '1rem', lineHeight: '1.6', marginBottom: '2rem' }}>
                            The request for <strong>{details?.companyName}</strong> has been successfully
                            <span style={{ color: type === 'approve' ? '#10b981' : '#ef4444', fontWeight: 800, padding: '0 5px' }}>
                                {type.toUpperCase()}D
                            </span>.
                            The system is fully synchronized.
                        </p>
                        <button
                            onClick={() => navigate('/role-select')}
                            style={{ width: '100%', padding: '1rem', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', color: '#fff', fontWeight: 700, cursor: 'pointer' }}
                        >
                            Return to Command Center
                        </button>
                    </div>
                )}

                {status === 'error' && (
                    <div>
                        <AlertTriangle size={56} color="#ef4444" style={{ marginBottom: '1.5rem' }} />
                        <h2 style={{ fontSize: '1.5rem', fontWeight: 800, marginBottom: '0.75rem', color: '#ef4444' }}>Authorization Denied</h2>
                        <div style={{ background: 'rgba(239, 68, 68, 0.05)', padding: '1.25rem', borderRadius: '16px', border: '1px solid rgba(239, 68, 68, 0.1)', color: '#ef4444', fontSize: '0.9rem', marginBottom: '2rem', textAlign: 'left' }}>
                            {error}
                        </div>
                        <button
                            onClick={() => navigate('/role-select')}
                            style={{ width: '100%', padding: '1rem', background: '#e85d04', border: 'none', borderRadius: '12px', color: '#fff', fontWeight: 700, cursor: 'pointer' }}
                        >
                            Contact Security Support
                        </button>
                    </div>
                )}
            </div>

            <p style={{ marginTop: '2rem', color: 'rgba(255,255,255,0.2)', fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '2px' }}>
                Master Control Environment | superadmin@gmail.com
            </p>

            <style>{`
                @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
                .animate-spin { animation: spin 1s linear infinite; }
            `}</style>
        </div>
    );
}
