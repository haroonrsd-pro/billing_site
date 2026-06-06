import React, { useState } from 'react';
import { useNavigate, NavLink } from 'react-router-dom';
import { auth, db } from '../firebaseConfig';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc, serverTimestamp, collection } from 'firebase/firestore';
import { useMessaging } from '../context/MessagingContext';
import { Shield, Building, User, Mail, Lock, ArrowRight, Eye, EyeOff } from 'lucide-react';

export default function Register() {
    const [formData, setFormData] = useState({
        name: '',
        companyName: '',
        email: '',
        phone: '',
        password: '',
        confirmPassword: ''
    });
    const [loading, setLoading] = useState(false);
    const [errorMsg, setErrorMsg] = useState('');
    const [showPass, setShowPass] = useState(false);
    
    const navigate = useNavigate();
    const { showToast } = useMessaging();

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleRegister = async (e) => {
        e.preventDefault();
        setErrorMsg('');

        const { name, email, password, confirmPassword, companyName, phone } = formData;

        if (!name || !email || !password || !companyName || !phone) {
            setErrorMsg("All fields are required.");
            return;
        }

        if (password !== confirmPassword) {
            setErrorMsg("Passwords do not match.");
            return;
        }

        if (password.length < 6) {
            setErrorMsg("Password must be at least 6 characters.");
            return;
        }

        setLoading(true);
        try {
            // Generate a secure random token for backend-less link validation
            const secureToken = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);

            // 1. Create a registration request in Firestore
            await setDoc(doc(collection(db, 'registration_requests')), {
                name: name,
                companyName: companyName,
                email: email,
                phone: phone,
                password: password, 
                status: 'pending',
                secureToken: secureToken,
                createdAt: serverTimestamp()
            });

            showToast('Request submitted! Approval link has been dispatched to Master Admin (superadmin@gmail.com).', 'success');
            
            // Clear form
            setFormData({
                name: '',
                companyName: '',
                email: '',
                phone: '',
                password: '',
                confirmPassword: ''
            });

            // Navigate back to login with a special message
            setTimeout(() => navigate('/role-select'), 3000);
            
        } catch (err) {
            console.error(err);
            setErrorMsg("Submission failed: " + err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={{
            position: 'fixed', inset: 0, zIndex: 9999, 
            background: 'linear-gradient(180deg, #000000 0%, #1a0f0a 100%)',
            display: 'flex', flexDirection: 'column', alignItems: 'center', 
            justifyContent: 'center', overflowY: 'auto', padding: '2rem',
            paddingTop: '3cm',
            fontFamily: "'Nunito', sans-serif"
        }}>
            {/* Background decorative elements */}
            <div style={{
                position: 'absolute', inset: 0,
                background: 'radial-gradient(circle at 10% 10%, rgba(232, 93, 4, 0.12) 0%, transparent 50%), radial-gradient(circle at 90% 90%, rgba(244, 140, 6, 0.08) 0%, transparent 50%)',
                zIndex: 0
            }} />

            <div style={{ position: 'relative', zIndex: 2, display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%', maxWidth: '440px' }}>
                <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: '1.5rem' }}>
                        <div style={{
                            width: '64px', height: '64px', background: 'rgba(255,255,255,0.05)',
                            borderRadius: '20px', display: 'flex', alignItems: 'center',
                            justifyContent: 'center', marginBottom: '1rem', overflow: 'hidden',
                            border: '1px solid rgba(255,255,255,0.1)'
                        }}>
                             <Shield size={32} color="#e85d04" />
                        </div>
                        <div style={{ color: 'rgba(255, 255, 255, 0.4)', fontSize: '.7rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '3px', marginBottom: '0.5rem' }}>
                            Advanced System Protocol
                        </div>
                        <h1 style={{ fontFamily: "'Yeseva One', serif", fontSize: '2.5rem', color: '#fff', marginBottom: '.2rem', letterSpacing: '-1px' }}>
                            Business <span style={{ color: '#e85d04' }}>Registration</span>
                        </h1>
                    </div>
                    <p style={{ color: 'rgba(255, 255, 255, 0.5)', fontSize: '0.9rem', fontWeight: 500 }}>
                        Launch your multi-tenant billing environment
                    </p>
                </div>

                <div style={{ 
                    background: 'rgba(35, 25, 18, 0.95)', 
                    backdropFilter: 'blur(20px)',
                    borderRadius: '35px', 
                    width: '100%', 
                    padding: '2.5rem',
                    boxShadow: '0 40px 80px rgba(0,0,0,0.6)',
                    border: '1px solid rgba(255, 255, 255, 0.05)'
                }}>
                    {errorMsg && <div style={{ background: 'rgba(220, 38, 38, 0.1)', color: '#ef4444', padding: '1rem', borderRadius: '16px', marginBottom: '1.5rem', fontSize: '0.85rem', textAlign: 'center', border: '1px solid rgba(220, 38, 38, 0.2)' }}>{errorMsg}</div>}
                    
                    <form onSubmit={handleRegister} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                        <div>
                            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'rgba(255,255,255,0.6)', fontSize: '0.72rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '0.7rem' }}>
                                <User size={14} /> Full Name
                            </label>
                            <input 
                                name="name"
                                type="text" 
                                required 
                                value={formData.name}
                                onChange={handleChange}
                                placeholder="Your full name"
                                style={{ width: '100%', padding: '1.1rem', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '18px', color: '#fff', outline: 'none', transition: 'all 0.3s', fontSize: '0.95rem' }}
                                onFocus={(e) => { e.target.style.borderColor = '#e85d04'; e.target.style.background = 'rgba(255,255,255,0.05)'; }}
                                onBlur={(e) => { e.target.style.borderColor = 'rgba(255,255,255,0.08)'; e.target.style.background = 'rgba(255,255,255,0.03)'; }}
                            />
                        </div>

                        <div>
                            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'rgba(255,255,255,0.6)', fontSize: '0.72rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '0.7rem' }}>
                                <Building size={14} /> Company Name
                            </label>
                            <input 
                                name="companyName"
                                type="text" 
                                required 
                                value={formData.companyName}
                                onChange={handleChange}
                                placeholder="E.g. Acme Corp"
                                style={{ width: '100%', padding: '1.1rem', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '18px', color: '#fff', outline: 'none', transition: 'all 0.3s', fontSize: '0.95rem' }}
                                onFocus={(e) => { e.target.style.borderColor = '#e85d04'; e.target.style.background = 'rgba(255,255,255,0.05)'; }}
                                onBlur={(e) => { e.target.style.borderColor = 'rgba(255,255,255,0.08)'; e.target.style.background = 'rgba(255,255,255,0.03)'; }}
                            />
                        </div>

                        <div>
                            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'rgba(255,255,255,0.6)', fontSize: '0.72rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '0.7rem' }}>
                                <Mail size={14} /> Phone Number
                            </label>
                            <input 
                                name="phone"
                                type="tel" 
                                required 
                                value={formData.phone}
                                onChange={handleChange}
                                placeholder="+91 0000000000"
                                style={{ width: '100%', padding: '1.1rem', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '18px', color: '#fff', outline: 'none', transition: 'all 0.3s', fontSize: '0.95rem' }}
                                onFocus={(e) => { e.target.style.borderColor = '#e85d04'; e.target.style.background = 'rgba(255,255,255,0.05)'; }}
                                onBlur={(e) => { e.target.style.borderColor = 'rgba(255,255,255,0.08)'; e.target.style.background = 'rgba(255,255,255,0.03)'; }}
                            />
                        </div>

                        <div>
                            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'rgba(255,255,255,0.6)', fontSize: '0.72rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '0.7rem' }}>
                                <Mail size={14} /> Login ID / Email
                            </label>
                            <input 
                                name="email"
                                type="text" 
                                required 
                                value={formData.email}
                                onChange={handleChange}
                                placeholder="Username or email"
                                style={{ width: '100%', padding: '1.1rem', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '18px', color: '#fff', outline: 'none', transition: 'all 0.3s', fontSize: '0.95rem' }}
                                onFocus={(e) => { e.target.style.borderColor = '#e85d04'; e.target.style.background = 'rgba(255,255,255,0.05)'; }}
                                onBlur={(e) => { e.target.style.borderColor = 'rgba(255,255,255,0.08)'; e.target.style.background = 'rgba(255,255,255,0.03)'; }}
                            />
                        </div>

                        <div style={{ position: 'relative' }}>
                            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'rgba(255,255,255,0.6)', fontSize: '0.72rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '0.7rem' }}>
                                <Lock size={14} /> Security Password
                            </label>
                            <input 
                                name="password"
                                type={showPass ? "text" : "password"} 
                                required 
                                value={formData.password}
                                onChange={handleChange}
                                placeholder="••••••••"
                                style={{ width: '100%', padding: '1.1rem 3.5rem 1.1rem 1.1rem', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '18px', color: '#fff', outline: 'none', transition: 'all 0.3s', fontSize: '0.95rem' }}
                                onFocus={(e) => { e.target.style.borderColor = '#e85d04'; e.target.style.background = 'rgba(255,255,255,0.05)'; }}
                                onBlur={(e) => { e.target.style.borderColor = 'rgba(255,255,255,0.08)'; e.target.style.background = 'rgba(255,255,255,0.03)'; }}
                            />
                            <div 
                                onClick={() => setShowPass(!showPass)}
                                style={{ position: 'absolute', right: '1.2rem', top: '2.8rem', cursor: 'pointer', opacity: 0.5 }}
                            >
                                {showPass ? <EyeOff size={20} /> : <Eye size={20} />}
                            </div>
                        </div>

                        <div>
                            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'rgba(255,255,255,0.6)', fontSize: '0.72rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '0.7rem' }}>
                                <Shield size={14} /> Confirm Security Plan
                            </label>
                            <input 
                                name="confirmPassword"
                                type="password" 
                                required 
                                value={formData.confirmPassword}
                                onChange={handleChange}
                                placeholder="Confirm password"
                                style={{ width: '100%', padding: '1.1rem', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '18px', color: '#fff', outline: 'none', transition: 'all 0.3s', fontSize: '0.95rem' }}
                                onFocus={(e) => { e.target.style.borderColor = '#e85d04'; e.target.style.background = 'rgba(255,255,255,0.05)'; }}
                                onBlur={(e) => { e.target.style.borderColor = 'rgba(255,255,255,0.08)'; e.target.style.background = 'rgba(255,255,255,0.03)'; }}
                            />
                        </div>

                        <button 
                            type="submit" 
                            disabled={loading}
                            style={{ 
                                width: '100%', 
                                background: loading ? 'rgba(232, 93, 4, 0.4)' : 'linear-gradient(90deg, #ff7b00, #e85d04)', 
                                border: 'none', 
                                borderRadius: '100px', 
                                padding: '1.3rem', 
                                color: '#fff', 
                                fontSize: '1rem', 
                                fontWeight: 800, 
                                cursor: loading ? 'not-allowed' : 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '0.8rem',
                                marginTop: '1.5rem',
                                transition: 'all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
                                boxShadow: loading ? 'none' : '0 15px 35px rgba(232, 93, 4, 0.4)',
                                letterSpacing: '1px'
                            }}
                            onMouseEnter={(e) => !loading && (e.target.style.transform = 'translateY(-5px) scale(1.02)')}
                            onMouseLeave={(e) => !loading && (e.target.style.transform = 'translateY(0) scale(1)')}
                        >
                            {loading ? (
                                <>
                                    <div className="spinner" style={{ width: '20px', height: '20px', border: '3px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin 0.6s linear infinite' }} />
                                    ENROLLING SYSTEM...
                                </>
                            ) : (
                                <>DEPLOY ENVIRONMENT <ArrowRight size={22} /></>
                            )}
                        </button>
                    </form>

                    <div style={{ textAlign: 'center', marginTop: '2.5rem' }}>
                        <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: '0.85rem' }}>
                            Authorized access only. Already registered? <NavLink to="/role-select" style={{ color: '#e85d04', fontWeight: 800, textDecoration: 'none', marginLeft: '5px' }}>Return to Login</NavLink>
                        </p>
                    </div>
                </div>
            </div>

            <style>{`
                @keyframes spin { to { transform: rotate(360deg); } }
                @font-face {
                    font-family: 'Yeseva One';
                    src: url('https://fonts.googleapis.com/css2?family=Yeseva+One&display=swap');
                }
            `}</style>
        </div>
    );
}
