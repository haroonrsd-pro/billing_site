import React, { useState, useEffect } from 'react';
import { db, getTenantPath } from '../../firebaseConfig';
import { 
    collection, 
    writeBatch,
    query, 
    where,
    getDocs,
    Timestamp,
    doc
} from 'firebase/firestore';
import { 
    Tag, 
    Play, 
    AlertCircle,
    Calendar,
    IndianRupee,
    Hash,
    Layers,
    Type
} from 'lucide-react';
import toast from 'react-hot-toast';

export default function BulkCouponForm({ onSuccess }) {
    const [loading, setLoading] = useState(false);
    const [previewCodes, setPreviewCodes] = useState([]);
    
    const [formData, setFormData] = useState({
        prefix: '',
        codeType: 'random',
        startNumber: 1,
        randomLength: 5,
        count: 10,
        discountType: 'percentage',
        discountValue: '',
        minOrderValue: '',
        startDate: '',
        expiryDate: '',
        batchId: ''
    });

    const userRole = sessionStorage.getItem('fb_user_role');
    const isOwnerOrAdmin = userRole === 'owner' || userRole === 'admin';

    useEffect(() => {
        // Generate Live Preview
        if (!formData.prefix) {
            setPreviewCodes([]);
            return;
        }

        const codes = [];
        const start = parseInt(formData.startNumber) || 1;
        const count = parseInt(formData.count) || 1;
        const limitTypeSafe = Math.min(count, 500);

        const rLen = parseInt(formData.randomLength) || 5;

        for (let i = 0; i < limitTypeSafe; i++) {
            if (formData.codeType === 'sequential') {
                codes.push(`${formData.prefix.toUpperCase()}${start + i}`);
            } else {
                // Generate a dummy random string for preview
                const dummyRandom = Math.random().toString(36).substring(2, 2 + rLen).toUpperCase().padEnd(rLen, 'X');
                codes.push(`${formData.prefix.toUpperCase()}-${dummyRandom}`);
            }
        }

        if (codes.length > 10) {
            const first5 = codes.slice(0, 5);
            const last5 = codes.slice(-5);
            setPreviewCodes([...first5, '...', ...last5]);
        } else {
            setPreviewCodes(codes);
        }
    }, [formData.prefix, formData.startNumber, formData.count, formData.codeType, formData.randomLength]);

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        
        if (name === 'prefix') {
            const upperVal = value.toUpperCase().replace(/[^A-Z0-9]/g, '');
            setFormData(prev => ({ ...prev, [name]: upperVal }));
        } else {
            setFormData(prev => ({ ...prev, [name]: value }));
        }
    };

    const handleGenerate = async (e) => {
        e.preventDefault();
        if (!isOwnerOrAdmin) return;

        // Validation
        if (!formData.prefix || !formData.discountValue || !formData.expiryDate || !formData.startDate) {
            toast.error("Please fill all required fields");
            return;
        }

        const count = parseInt(formData.count);
        if (count < 1 || count > 500) {
            toast.error("Count must be between 1 and 500");
            return;
        }

        setLoading(true);
        try {
            const codes = [];
            
            if (formData.codeType === 'sequential') {
                const start = parseInt(formData.startNumber) || 1;
                for (let i = 0; i < count; i++) {
                    codes.push(`${formData.prefix}${start + i}`);
                }
            } else {
                const rLen = parseInt(formData.randomLength) || 5;
                const maxCombos = Math.pow(36, rLen);
                
                // Prevent infinite loop if asking for more codes than mathematically possible with short string
                if (count > maxCombos / 2 && rLen < 4) {
                     toast.error("Random characters length is too short to safely generate that many unique codes. Please increase it.");
                     setLoading(false);
                     return;
                }
                
                const generated = new Set();
                while (generated.size < count) {
                    const rnd = Math.random().toString(36).substring(2, 2 + rLen).toUpperCase().padEnd(rLen, 'X');
                    generated.add(`${formData.prefix}-${rnd}`);
                }
                codes.push(...Array.from(generated));
            }

            // Efficiently fetch all coupons that share this prefix using a prefix scan!
            const prefixQuery = query(
                collection(db, getTenantPath('coupons')), 
                where('code', '>=', formData.prefix.toUpperCase()),
                where('code', '<=', formData.prefix.toUpperCase() + '\uf8ff')
            );
            const snap = await getDocs(prefixQuery);
            const existingCodes = new Set();
            snap.forEach((doc) => existingCodes.add(doc.data().code));

            const duplicateFound = codes.filter(c => existingCodes.has(c));

            if (duplicateFound.length > 0) {
                toast.error(`Codes already exist: ${duplicateFound.slice(0, 3).join(', ')}${duplicateFound.length > 3 ? '...' : ''}. Try a higher Start Number!`);
                setLoading(false);
                return;
            }

            const batchIdString = formData.batchId.trim() || `${formData.prefix}_batch_${Date.now()}`;
            const userUid = sessionStorage.getItem('fb_user_uid') || 'admin';
            
            let batch = writeBatch(db);
            const couponsCol = collection(db, getTenantPath('coupons'));

            let operationCounter = 0;

            for (let i = 0; i < codes.length; i++) {
                const docRef = doc(couponsCol);
                const couponData = {
                    code: codes[i],
                    discountType: formData.discountType,
                    discountValue: Number(formData.discountValue),
                    minOrderValue: Number(formData.minOrderValue || 0),
                    startDate: Timestamp.fromDate(new Date(formData.startDate)),
                    expiryDate: Timestamp.fromDate(new Date(formData.expiryDate)),
                    usageLimit: 1,      
                    usedCount: 0,
                    isActive: true,
                    createdBy: userUid,
                    createdAt: Timestamp.now(),
                    isBulk: true,
                    batchId: batchIdString
                };

                batch.set(docRef, couponData);
                operationCounter++;

                if (operationCounter === 500) {
                    await batch.commit();
                    batch = writeBatch(db);
                    operationCounter = 0;
                }
            }

            if (operationCounter > 0) {
                await batch.commit();
            }

            toast.success(`${count} coupon codes generated successfully!`);
            
            setFormData({
                prefix: '',
                codeType: 'random',
                startNumber: 1,
                randomLength: 5,
                count: 10,
                discountType: 'percentage',
                discountValue: '',
                minOrderValue: '',
                startDate: '',
                expiryDate: '',
                batchId: ''
            });
            
            if (onSuccess) onSuccess();

        } catch (error) {
            console.error("Bulk Generation Error:", error);
            const errMsg = error.message || error.toString() || "Unknown mistake";
            toast.error(`Error: ${errMsg}. Check Developer Console.`);
        } finally {
            setLoading(false);
        }
    };

    const cardStyle = {
        background: 'white',
        borderRadius: '24px',
        padding: '2rem',
        border: '1px solid #e2e8f0',
        boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)',
        width: '100%',
        boxSizing: 'border-box'
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
        padding: '0.75rem 1rem 0.75rem 2.5rem',
        borderRadius: '12px',
        border: '1.5px solid #e2e8f0',
        outline: 'none',
        fontSize: '0.9rem',
        fontWeight: '500',
        color: '#1e293b',
        boxSizing: 'border-box',
        transition: '0.2s'
    };

    const iconStyle = {
        position: 'absolute',
        left: '12px',
        top: '50%',
        transform: 'translateY(-50%)',
        color: '#94a3b8'
    };

    const gridStyle = {
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
        gap: '1.5rem',
        marginBottom: '1.5rem'
    };

    if (!isOwnerOrAdmin) return null;

    return (
        <form onSubmit={handleGenerate} style={cardStyle}>
            
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '2rem' }}>
                <div style={{ width: '48px', height: '48px', borderRadius: '14px', background: '#f5f3ff', color: '#6366f1', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Layers size={24} />
                </div>
                <div>
                    <h2 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 900, color: '#1e293b' }}>Bulk Generator</h2>
                    <p style={{ margin: 0, color: '#64748b', fontSize: '0.9rem', fontWeight: 500 }}>Create massive batches of single-use coupon codes.</p>
                </div>
            </div>

            <div style={gridStyle}>
                <div>
                    <label style={labelStyle}>Code Prefix</label>
                    <div style={{ position: 'relative' }}>
                        <Type size={18} style={iconStyle} />
                        <input 
                            type="text" 
                            name="prefix"
                            value={formData.prefix}
                            onChange={handleInputChange}
                            placeholder="e.g. FESTIVAL" 
                            style={inputStyle}
                            required
                        />
                    </div>
                </div>
                <div>
                    <label style={labelStyle}>Generation Format</label>
                    <div style={{ display: 'flex', background: '#f1f5f9', padding: '4px', borderRadius: '12px', width: '100%', boxSizing: 'border-box' }}>
                        <div 
                            onClick={() => setFormData({...formData, codeType: 'random'})}
                            style={{ flex: 1, padding: '0.45rem', textAlign: 'center', background: formData.codeType === 'random' ? '#fff' : 'transparent', color: formData.codeType === 'random' ? '#6366f1' : '#64748b', borderRadius: '8px', fontSize: '0.8rem', fontWeight: 800, cursor: 'pointer', boxShadow: formData.codeType === 'random' ? '0 1px 2px rgba(0,0,0,0.05)' : 'none', transition: '0.2s', whiteSpace: 'nowrap' }}
                        >
                            Random
                        </div>
                        <div 
                            onClick={() => setFormData({...formData, codeType: 'sequential'})}
                            style={{ flex: 1, padding: '0.45rem', textAlign: 'center', background: formData.codeType === 'sequential' ? '#fff' : 'transparent', color: formData.codeType === 'sequential' ? '#6366f1' : '#64748b', borderRadius: '8px', fontSize: '0.8rem', fontWeight: 800, cursor: 'pointer', boxShadow: formData.codeType === 'sequential' ? '0 1px 2px rgba(0,0,0,0.05)' : 'none', transition: '0.2s', whiteSpace: 'nowrap' }}
                        >
                            Sequential
                        </div>
                    </div>
                </div>
                {formData.codeType === 'sequential' ? (
                    <div>
                        <label style={labelStyle}>Start Number</label>
                        <div style={{ position: 'relative' }}>
                            <Hash size={18} style={iconStyle} />
                            <input 
                                type="number" 
                                name="startNumber"
                                value={formData.startNumber}
                                onChange={handleInputChange}
                                min="1"
                                style={inputStyle}
                                required
                            />
                        </div>
                    </div>
                ) : (
                    <div>
                        <label style={labelStyle}>Random Characters Length</label>
                        <div style={{ position: 'relative' }}>
                            <Hash size={18} style={iconStyle} />
                            <input 
                                type="number" 
                                name="randomLength"
                                value={formData.randomLength}
                                onChange={handleInputChange}
                                min="2"
                                max="10"
                                style={inputStyle}
                                required
                            />
                        </div>
                    </div>
                )}
                <div>
                    <label style={labelStyle}>Quantity to Generate</label>
                    <div style={{ position: 'relative' }}>
                        <Layers size={18} style={iconStyle} />
                        <input 
                            type="number" 
                            name="count"
                            value={formData.count}
                            onChange={handleInputChange}
                            min="1"
                            max="500"
                            style={inputStyle}
                            required
                        />
                    </div>
                    <span style={{ fontSize: '0.7rem', color: '#94a3b8', fontWeight: 600 }}>Max 500 codes per batch run</span>
                </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '1.5rem', paddingBottom: '1.5rem', borderBottom: '1px solid #f1f5f9' }}>
                <div>
                    <label style={labelStyle}>Discount Type</label>
                    <div style={{ display: 'flex', background: '#f1f5f9', padding: '4px', borderRadius: '14px', width: '100%', boxSizing: 'border-box' }}>
                        <div 
                            onClick={() => setFormData({...formData, discountType: 'percentage'})}
                            style={{ flex: 1, padding: '0.6rem', textAlign: 'center', background: formData.discountType === 'percentage' ? '#fff' : 'transparent', color: formData.discountType === 'percentage' ? '#6366f1' : '#64748b', borderRadius: '10px', fontSize: '0.85rem', fontWeight: 800, cursor: 'pointer', boxShadow: formData.discountType === 'percentage' ? '0 2px 4px rgba(0,0,0,0.05)' : 'none', transition: '0.2s' }}
                        >
                            % Percentage
                        </div>
                        <div 
                            onClick={() => setFormData({...formData, discountType: 'flat'})}
                            style={{ flex: 1, padding: '0.6rem', textAlign: 'center', background: formData.discountType === 'flat' ? '#fff' : 'transparent', color: formData.discountType === 'flat' ? '#6366f1' : '#64748b', borderRadius: '10px', fontSize: '0.85rem', fontWeight: 800, cursor: 'pointer', boxShadow: formData.discountType === 'flat' ? '0 2px 4px rgba(0,0,0,0.05)' : 'none', transition: '0.2s' }}
                        >
                            ₹ Flat Amount
                        </div>
                    </div>
                </div>
                <div>
                    <label style={labelStyle}>Discount Value {formData.discountType === 'percentage' ? '(%)' : '(₹)'}</label>
                    <div style={{ position: 'relative' }}>
                        <Tag size={18} style={iconStyle} />
                        <input type="number" name="discountValue" value={formData.discountValue} onChange={handleInputChange} style={inputStyle} required />
                    </div>
                </div>
            </div>

            <div style={gridStyle}>
                <div>
                    <label style={labelStyle}>Min Order Value (₹)</label>
                    <div style={{ position: 'relative' }}>
                        <IndianRupee size={18} style={iconStyle} />
                        <input type="number" name="minOrderValue" value={formData.minOrderValue} onChange={handleInputChange} style={inputStyle} />
                    </div>
                </div>
                <div>
                    <label style={labelStyle}>Start Date</label>
                    <div style={{ position: 'relative' }}>
                        <Calendar size={18} style={iconStyle} />
                        <input type="date" name="startDate" value={formData.startDate} onChange={handleInputChange} style={inputStyle} required />
                    </div>
                </div>
                <div>
                    <label style={labelStyle}>Expiry Date</label>
                    <div style={{ position: 'relative' }}>
                        <Calendar size={18} style={iconStyle} />
                        <input type="date" name="expiryDate" value={formData.expiryDate} onChange={handleInputChange} style={inputStyle} required />
                    </div>
                </div>
            </div>

            <div style={{ marginBottom: '2rem' }}>
                <label style={labelStyle}>Batch Label / Name (Optional)</label>
                <div style={{ position: 'relative' }}>
                    <Tag size={18} style={iconStyle} />
                    <input type="text" name="batchId" value={formData.batchId} onChange={handleInputChange} placeholder="e.g. VIP Member Rewards 2025" style={inputStyle} />
                </div>
            </div>

            {/* PREVIEW BOX */}
            {previewCodes.length > 0 && (
                <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '16px', padding: '1.5rem', marginBottom: '2rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
                        <AlertCircle size={16} color="#6366f1" />
                        <span style={{ fontSize: '0.8rem', fontWeight: 800, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Live Code Preview</span>
                    </div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                        {previewCodes.map((c, i) => (
                            <span key={i} style={{ padding: '4px 12px', fontSize: '0.8rem', fontWeight: 800, borderRadius: '100px', background: c === '...' ? 'transparent' : 'white', border: c === '...' ? 'none' : '1px solid #cbd5e1', color: c === '...' ? '#94a3b8' : '#334155', boxShadow: c === '...' ? 'none' : '0 1px 2px rgba(0,0,0,0.05)' }}>
                                {c}
                            </span>
                        ))}
                    </div>
                </div>
            )}

            <button 
                type="submit" 
                disabled={loading || !formData.prefix}
                style={{ 
                    width: '100%',
                    background: loading || !formData.prefix ? '#94a3b8' : 'linear-gradient(135deg, #6366f1, #4f46e5)',
                    color: 'white',
                    padding: '1.25rem',
                    borderRadius: '16px',
                    border: 'none',
                    fontWeight: 900,
                    fontSize: '1.1rem',
                    cursor: loading || !formData.prefix ? 'not-allowed' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.75rem',
                    boxShadow: loading || !formData.prefix ? 'none' : '0 10px 15px -3px rgba(99, 102, 241, 0.3)',
                    transition: '0.3s'
                }}
            >
                {loading ? (
                    <span>⏳ Generating...</span>
                ) : (
                    <>
                        <Play size={22} fill="currentColor" />
                        Generate {formData.count || 0} Codes
                    </>
                )}
            </button>
        </form>
    );
}
