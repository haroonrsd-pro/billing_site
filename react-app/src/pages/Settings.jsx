import React, { useState, useEffect, useMemo } from 'react';
import { useFirestore } from '../hooks/useFirestore';
import { storage } from '../firebaseConfig';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import './settings.css';

export default function Settings() {
    const { docs: customers, addDocument, updateDocument, loading } = useFirestore('customers');
    const [saving, setSaving] = useState(false);
    const [uploadingLogo, setUploadingLogo] = useState(false);
    const [notify, setNotify] = useState(null);

    // Form States
    const [profile, setProfile] = useState({
        businessName: 'My Food Store',
        phone: '+91 98765 43210',
        email: 'store@email.com',
        address: 'Coimbatore, Tamil Nadu',
        logo: null
    });

    const [legal, setLegal] = useState({
        gstin: '33XXXXXX',
        fssai: 'FSSAI License #',
        taxRate: '5'
    });

    const [billing, setBilling] = useState({
        invoicePrefix: 'INV-',
        currency: '₹',
        dateFormat: 'DD/MM/YYYY',
        footerNote: 'Thank you for dining with us!'
    });
    const [credentials, setCredentials] = useState({
        email: '',
        password: ''
    });

    // Find the store profile document in the customers collection
    const storeDoc = useMemo(() => {
        return customers.find(c => c.isSystemProfile === true);
    }, [customers]);

    // Load data from Firestore when it arrives
    useEffect(() => {
        if (storeDoc) {
            if (storeDoc.profile) setProfile(prev => ({ ...prev, ...storeDoc.profile }));
            if (storeDoc.legal) setLegal(prev => ({ ...prev, ...storeDoc.legal }));
            if (storeDoc.billing) setBilling(prev => ({ ...prev, ...storeDoc.billing }));
            if (storeDoc.credentials) setCredentials(prev => ({ ...prev, ...storeDoc.credentials }));
        }
    }, [storeDoc]);

    const handleLogoUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) {
            console.warn("System: No file selected");
            return;
        }

        console.log("System: Logo file selected", { name: file.name, size: file.size, type: file.type });

        // 1. Immediate Local Preview (Base64)
        const reader = new FileReader();
        reader.onload = (event) => {
            console.log("System: Local preview generated successfully");
            setProfile(prev => ({ ...prev, logo: event.target.result }));
        };
        reader.onerror = (err) => console.error("System: FileReader Error", err);
        reader.readAsDataURL(file);

        // 2. Validation
        if (file.size > 2 * 1024 * 1024) {
            console.warn("System: File exceeds 2MB limit");
            setNotify({ type: 'error', message: 'Logo must be under 2MB' });
            return;
        }

        // 3. Firebase Upload
        setUploadingLogo(true);
        setNotify(null);
        
        try {
            if (!storage) throw new Error("Firebase Storage is not initialized.");

            const fileName = `${Date.now()}_${file.name.replace(/\s+/g, '_')}`;
            const storageRef = ref(storage, `logos/${fileName}`);
            
            console.log("System: Commencing Firebase Storage upload...", `logos/${fileName}`);
            const snapshot = await uploadBytes(storageRef, file);
            
            console.log("System: Upload complete. Fetching public URL...");
            const downloadURL = await getDownloadURL(snapshot.ref);
            
            console.log("System: Final Logo URL:", downloadURL);
            setProfile(prev => ({ ...prev, logo: downloadURL }));
            setNotify({ type: 'success', message: 'Logo uploaded and sync complete!' });
            
            setTimeout(() => setNotify(null), 3000);
        } catch (err) {
            console.error("System: Upload Protocol Failed", err);
            let userMsg = err.message;
            if (err.message.includes('permission-denied') || err.code === 'storage/unauthorized') {
                userMsg = "Permission Denied: Ensure Storage is enabled in Firebase Console.";
            } else if (err.code === 'storage/unknown') {
                userMsg = "Unknown Storage Error. Check your internet or Firebase Config.";
            }
            setNotify({ type: 'error', message: `Upload error: ${userMsg}` });
        } finally {
            setUploadingLogo(false);
        }
    };

    const handleSave = async () => {
        console.log("System: Saving complete configuration...");
        setSaving(true);
        setNotify(null);
        try {
            // Ensure we have a valid ownerId before saving
            const ownerId = sessionStorage.getItem('fb_user_owner_id') || sessionStorage.getItem('fb_user_uid');
            if (!ownerId) {
                throw new Error("User context lost. Please re-login.");
            }

            const dataToSave = {
                profile,
                legal,
                billing,
                credentials,
                isSystemProfile: true,
                ownerId, // Link to the current owner
                name: profile.businessName || 'System Profile',
                type: 'system',
                updatedAt: new Date().toISOString()
            };

            if (storeDoc?.id) {
                console.log("System: Updating existing document", storeDoc.id);
                await updateDocument(storeDoc.id, dataToSave);
            } else {
                console.log("System: Creating new system profile document");
                await addDocument(dataToSave);
            }

            setNotify({ type: 'success', message: 'All settings saved to cloud registry!' });
            setTimeout(() => setNotify(null), 4000);
        } catch (err) {
            console.error("System: Save Operation Failed", err);
            setNotify({ type: 'error', message: `Save error: ${err.message}` });
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <div className="page active" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
                <div style={{ color: 'var(--muted)', fontFamily: "var(--font-hud)", letterSpacing: '2px', animation: 'pulse 1.5s infinite both' }}>INITIALIZING SYSTEM PROTOCOLS...</div>
            </div>
        );
    }

    return (
        <div className="page active settings-container">
            {/* Notification Toast */}
            {notify && (
                <div className="notification" style={{ background: notify.type === 'success' ? '#10b981' : '#ef4444' }}>
                    {notify.type === 'success' ? '✅' : '❌'} {notify.message}
                </div>
            )}

            <div className="settings-grid">
                {/* Left Column */}
                <div className="settings-left">
                    {/* Store Profile Card */}
                    <div className="settings-card">
                        <div className="section-header">
                            <div className="section-icon">
                                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                    <path d="M3 9L12 2L21 9V20C21 20.5304 20.7893 21.0391 20.4142 21.4142C20.0391 21.7893 19.5304 22 19 22H5C4.46957 22 3.96086 21.7893 3.58579 21.4142C3.21071 21.0391 3 20.5304 3 20V9Z" stroke="#4F46E5" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                    <path d="M9 22V12H15V22" stroke="#4F46E5" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                </svg>
                            </div>
                            <div className="section-info">
                                <h2>Store Profile</h2>
                                <p>Public business identity details</p>
                            </div>
                        </div>

                        <div className="form-group">
                            <label>Store Name</label>
                            <input
                                type="text"
                                className="settings-input"
                                value={profile.businessName}
                                onChange={e => setProfile({ ...profile, businessName: e.target.value })}
                                placeholder="My Food Store"
                            />
                        </div>

                        <div className="form-group">
                            <label>Company Logo</label>
                            <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'center' }}>
                                <div style={{
                                    width: '80px', height: '80px', background: 'rgba(255,255,255,0.05)',
                                    borderRadius: '20px', display: 'flex', alignItems: 'center',
                                    justifyContent: 'center', overflow: 'hidden', border: '2px dashed var(--border)',
                                    transition: 'all 0.3s ease'
                                }}>
                                    {uploadingLogo ? (
                                        <div className="spinner" style={{ width: '24px', height: '24px' }}></div>
                                    ) : profile.logo ? (
                                        <img src={profile.logo} alt="Logo Preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                    ) : (
                                        <span style={{ fontSize: '2rem' }}>🏪</span>
                                    )}
                                </div>
                                <div style={{ flex: 1 }}>
                                    <label 
                                        htmlFor="logo-upload" 
                                        className="settings-input" 
                                        style={{ 
                                            display: 'inline-flex', 
                                            alignItems: 'center', 
                                            gap: '8px', 
                                            cursor: 'pointer',
                                            background: 'var(--panel)',
                                            padding: '0.8rem 1.2rem',
                                            borderRadius: '12px',
                                            fontWeight: 600,
                                            border: '1px solid var(--border)'
                                        }}
                                    >
                                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                                            <polyline points="17 8 12 3 7 8" />
                                            <line x1="12" y1="3" x2="12" y2="15" />
                                        </svg>
                                        Upload Brand Logo
                                    </label>
                                    <input 
                                        id="logo-upload"
                                        type="file" 
                                        accept="image/*"
                                        style={{ display: 'none' }}
                                        onChange={handleLogoUpload}
                                        disabled={uploadingLogo}
                                    />
                                    <p style={{ fontSize: '0.75rem', color: 'var(--muted)', marginTop: '8px' }}>
                                        Recommended: Square PNG or JPG. Max 2MB.
                                    </p>
                                </div>
                                {profile.logo && (
                                    <button 
                                        onClick={() => setProfile({ ...profile, logo: null })}
                                        style={{ 
                                            background: 'rgba(239, 68, 68, 0.1)', 
                                            color: '#ef4444', 
                                            border: 'none', 
                                            padding: '8px', 
                                            borderRadius: '8px',
                                            cursor: 'pointer' 
                                        }}
                                        title="Remove Logo"
                                    >
                                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                            <polyline points="3 6 5 6 21 6"></polyline>
                                            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                                        </svg>
                                    </button>
                                )}
                            </div>
                        </div>

                        <div className="form-row">
                            <div className="form-group">
                                <label>Phone Number</label>
                                <input
                                    type="text"
                                    className="settings-input"
                                    value={profile.phone}
                                    onChange={e => setProfile({ ...profile, phone: e.target.value })}
                                    placeholder="+91 98765 43210"
                                />
                            </div>
                            <div className="form-group">
                                <label>Email Address</label>
                                <input
                                    type="email"
                                    className="settings-input"
                                    value={profile.email}
                                    onChange={e => setProfile({ ...profile, email: e.target.value })}
                                    placeholder="store@email.com"
                                />
                            </div>
                        </div>

                        <div className="form-group">
                            <label>Physical Address</label>
                            <textarea
                                className="settings-textarea"
                                rows="3"
                                value={profile.address}
                                onChange={e => setProfile({ ...profile, address: e.target.value })}
                                placeholder="Coimbatore, Tamil Nadu"
                            ></textarea>
                        </div>
                    </div>

                    {/* Media Card */}
                    <div className="settings-card" style={{ position: 'relative' }}>
                        <span className="premium-badge">Premium</span>
                        <div className="form-group">
                            <label>Store Media & Gallery</label>
                            <div className="upload-area">
                                <span className="upload-icon">📸</span>
                                <div className="upload-text">
                                    <span>Click to upload photos</span> or drag and drop
                                </div>
                                <span className="upload-hint">JPEG, PNG, JPG (max 5MB)</span>
                            </div>
                        </div>

                        <div className="media-gallery">
                            <div className="media-item">EXT.</div>
                            <div className="media-item">INT.</div>
                            <button className="add-media-btn">+</button>
                        </div>
                    </div>
                </div>

                {/* Right Column */}
                <div className="settings-right">
                    {/* Legal & Tax Card */}
                    <div className="settings-card">
                        <div className="section-header">
                            <div className="section-icon" style={{ background: '#FFF7ED' }}>
                                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                    <path d="M16 16L19 19L22 16" stroke="#F59E0B" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                    <path d="M4 12V3H20V12" stroke="#F59E0B" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                    <path d="M22 12C22 17.5228 17.5228 22 12 22C6.47715 22 2 17.5228 2 12C2 6.47715 6.47715 2 12 2C13.5997 2 15.1166 2.37356 16.4609 3.03711" stroke="#F59E0B" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                </svg>
                            </div>
                            <div className="section-info">
                                <h2>Legal & Tax</h2>
                                <p>GST, FSSAI & tax setup</p>
                            </div>
                        </div>

                        <div className="form-row">
                            <div className="form-group">
                                <label>GSTIN Number</label>
                                <input
                                    type="text"
                                    className="settings-input"
                                    value={legal.gstin}
                                    onChange={e => setLegal({ ...legal, gstin: e.target.value })}
                                    placeholder="33XXXXXX"
                                />
                            </div>
                            <div className="form-group">
                                <label>FSSAI License</label>
                                <input
                                    type="text"
                                    className="settings-input"
                                    value={legal.fssai}
                                    onChange={e => setLegal({ ...legal, fssai: e.target.value })}
                                    placeholder="FSSAI License #"
                                />
                            </div>
                        </div>

                        <div className="form-group">
                            <label>Default Global Tax Rate</label>
                            <div className="tax-input-wrapper">
                                <span className="tax-prefix">%</span>
                                <input
                                    type="text"
                                    className="settings-input"
                                    value={legal.taxRate}
                                    onChange={e => setLegal({ ...legal, taxRate: e.target.value })}
                                    placeholder="5"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Billing Preferences Card */}
                    <div className="settings-card">
                        <div className="section-header">
                            <div className="section-icon" style={{ background: '#F0FDF4' }}>
                                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                    <path d="M3 5H11" stroke="#10B981" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                    <path d="M3 10H11" stroke="#10B981" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                    <path d="M3 15H8" stroke="#10B981" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                    <path d="M14 3V7C14 7.53043 14.2107 8.03914 14.5858 8.41421C14.9609 8.78929 15.4696 9 16 9H20" stroke="#10B981" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                    <path d="M14 3H20V21H14C12.8954 21 12 20.1046 12 19V5C12 3.89543 12.8954 3 14 3Z" stroke="#10B981" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                </svg>
                            </div>
                            <div className="section-info">
                                <h2>Billing Preferences</h2>
                                <p>Invoice formatting</p>
                            </div>
                        </div>

                        <div className="form-row">
                            <div className="form-group">
                                <label>Invoice Prefix</label>
                                <input
                                    type="text"
                                    className="settings-input"
                                    value={billing.invoicePrefix}
                                    onChange={e => setBilling({ ...billing, invoicePrefix: e.target.value })}
                                    placeholder="INV-"
                                />
                            </div>
                            <div className="form-group">
                                <label>Currency</label>
                                <input
                                    type="text"
                                    className="settings-input"
                                    value={billing.currency}
                                    onChange={e => setBilling({ ...billing, currency: e.target.value })}
                                    placeholder="₹"
                                />
                            </div>
                        </div>

                        <div className="form-group">
                            <label>Format Date</label>
                            <select
                                className="settings-select"
                                value={billing.dateFormat}
                                onChange={e => setBilling({ ...billing, dateFormat: e.target.value })}
                            >
                                <option value="DD/MM/YYYY">DD/MM/YYYY</option>
                                <option value="MM/DD/YYYY">MM/DD/YYYY</option>
                                <option value="YYYY-MM-DD">YYYY-MM-DD</option>
                            </select>
                        </div>

                        <div className="form-group">
                            <label>Invoice Footer Note</label>
                            <textarea
                                className="settings-textarea"
                                rows="3"
                                value={billing.footerNote}
                                onChange={e => setBilling({ ...billing, footerNote: e.target.value })}
                                placeholder="Thank you for dining with us!"
                            ></textarea>
                        </div>
                    </div>

                    {/* Login Credentials Card */}
                    <div className="settings-card">
                        <div className="section-header">
                            <div className="section-icon" style={{ background: '#F8FAFC' }}>
                                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                    <path d="M12 11C14.2091 11 16 9.20914 16 7C16 4.79086 14.2091 3 12 3C9.79086 3 8 4.79086 8 7C8 9.20914 9.79086 11 12 11Z" stroke="#64748b" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                    <path d="M6 21V19C6 17.9391 6.42143 16.9217 7.17157 16.1716C7.92172 15.4214 8.93913 15 10 15H14C15.0609 15 16.0783 15.4214 16.8284 16.1716C17.5786 16.9217 18 17.9391 18 19V21" stroke="#64748b" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                </svg>
                            </div>
                            <div className="section-info">
                                <h2>Login Credentials</h2>
                                <p>Owner access settings</p>
                            </div>
                        </div>
                        <div className="form-group">
                            <label>Login Email</label>
                            <input
                                type="email"
                                className="settings-input"
                                value={credentials.email}
                                onChange={e => setCredentials({ ...credentials, email: e.target.value })}
                                placeholder="owner@email.com"
                            />
                        </div>
                        <div className="form-group">
                            <label>Login Password</label>
                            <input
                                type="password"
                                className="settings-input"
                                value={credentials.password}
                                onChange={e => setCredentials({ ...credentials, password: e.target.value })}
                                placeholder="••••••••"
                            />
                        </div>
                    </div>
                </div>
            </div>

            {/* Save Button */}
            <div className="save-action-bar">
                <button className="save-btn" onClick={handleSave} disabled={saving}>
                    {saving ? (
                        <>
                            <span className="spinner"></span>
                            Saving Settings...
                        </>
                    ) : (
                        <>
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <path d="M19 21H5C4.46957 21 3.96086 20.7893 3.58579 20.4142C3.21071 20.0391 3 19.5304 3 19V5C3 4.46957 3.21071 3.96086 3.58579 3.58579C3.96086 3.21071 4.46957 3 5 3H16L21 8V19C21 19.5304 20.7893 21.0391 20.4142 21.4142C20.0391 21.7893 19.5304 22 19 21Z" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                <path d="M17 21V13H7V21" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                <path d="M7 3V8H15" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                            Save Configuration
                        </>
                    )}
                </button>
            </div>
        </div>
    );
}
