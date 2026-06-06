import React, { useState, useMemo, useEffect } from 'react';
import { useFirestore } from '../hooks/useFirestore';
import { useMessaging } from '../context/MessagingContext';
import { useDevice } from '../context/DeviceContext';
import { 
    Plus, 
    Trash2, 
    Minus, 
    Search, 
    Package, 
    ArrowLeft, 
    X,
    Filter,
    ChevronRight
} from 'lucide-react';

export default function Inventory() {
    const { showToast, showConfirm } = useMessaging();
    const { docs: menuItems, loading, addDocument, deleteDocument, updateDocument } = useFirestore('products');
    const { isMobile } = useDevice();

    // Filters
    const [searchTerm, setSearchTerm] = useState('');
    const [filterStatus, setFilterStatus] = useState('all'); // all, in, low, out
    const [showAddModal, setShowAddModal] = useState(false);
    
    // Force top-scrolling when mobile modal opens
    useEffect(() => {
        if (isMobile && showAddModal) {
            window.scrollTo(0, 0);
            document.documentElement.scrollTop = 0;
            document.body.scrollTop = 0;
        }
    }, [isMobile, showAddModal]);

    // Add Product Form State
    const [newProduct, setNewProduct] = useState({
        name: '', cat: 'rice', type: 'veg', price: '', cost: '', stock: '', unit: 'plate', low: 5, desc: '', img: ''
    });

    const userRole = (sessionStorage.getItem('fb_user_role') || '').toLowerCase();
    const userBranch = sessionStorage.getItem('fb_user_station') || 'Main Branch';
    const userBranchId = sessionStorage.getItem('fb_user_branch_id') || 'main';

    // Derived Stats
    const stats = useMemo(() => {
        const accessibleItems = userRole === 'owner' ? menuItems : menuItems.filter(it => (it.branch_id === userBranchId) || (!it.branch_id && it.branch === userBranch));
        let total = accessibleItems.length;
        let inStock = 0;
        let lowStock = 0;
        let outStock = 0;

        accessibleItems.forEach(it => {
            if (it.stock <= 0) {
                outStock++;
            } else if (it.stock <= it.low) {
                lowStock++;
                inStock++; // counts as in stock but low
            } else {
                inStock++;
            }
        });

        return { total, inStock, lowStock, outStock };
    }, [menuItems, userRole, userBranch, userBranchId]);

    // Filtered Items - respect branch for Admin/Staff
    const filteredItems = useMemo(() => {
        return menuItems.filter(it => {
            const matchBranch = userRole === 'owner' || (it.branch_id === userBranchId) || (!it.branch_id && (it.branch || 'Main Branch') === userBranch);
            const matchSearch = it.name.toLowerCase().includes(searchTerm.toLowerCase());
            let matchStatus = true;
            if (filterStatus === 'in') matchStatus = it.stock > 0;
            if (filterStatus === 'low') matchStatus = it.stock > 0 && it.stock <= it.low;
            if (filterStatus === 'out') matchStatus = it.stock <= 0;
            return matchBranch && matchSearch && matchStatus;
        });
    }, [menuItems, searchTerm, filterStatus, userRole, userBranch, userBranchId]);

    // Handlers
    const handleAddProduct = async () => {
        if (!newProduct.name || !newProduct.price || newProduct.stock === '') {
            showToast('Please fill required fields: Name, Sell Price, Stock Qty', 'error');
            return;
        }

        const product = {
            name: newProduct.name,
            cat: newProduct.cat,
            type: newProduct.type,
            price: parseFloat(newProduct.price) || 0,
            cost: parseFloat(newProduct.cost) || 0,
            stock: parseInt(newProduct.stock, 10) || 0,
            unit: newProduct.unit,
            low: parseInt(newProduct.low, 10) || 5,
            desc: newProduct.desc,
            img: newProduct.img || '',
            branch: userBranch,
            branch_id: userBranchId
        };

        try {
            await addDocument(product);
            setNewProduct({
                name: '', cat: 'rice', type: 'veg', price: '', cost: '', stock: '', unit: 'plate', low: 5, desc: '', img: ''
            });
            showToast('Product added successfully!', 'success');
            if (isMobile) setShowAddModal(false);
        } catch (error) {
            showToast('Error adding product: ' + error.message, 'error');
        }
    };

    const handleDeleteProduct = (id) => {
        showConfirm({
            title: 'Delete Product',
            message: 'Are you sure you want to delete this product?',
            onConfirm: () => deleteDocument(id)
        });
    };

    const quickStockAdjust = (id, delta) => {
        const item = menuItems.find(m => m.id === id);
        if (item) {
            const currentStock = parseInt(item.stock, 10) || 0;
            updateDocument(id, { stock: Math.max(0, currentStock + delta) });
        }
    };

    const handleDeleteOutOfStock = async () => {
        const outOfStockItems = menuItems.filter(it => {
            const matchBranch = userRole === 'owner' || (it.branch_id === userBranchId) || (!it.branch_id && (it.branch || 'Main Branch') === userBranch);
            return matchBranch && it.stock <= 0;
        });

        if (outOfStockItems.length === 0) {
            showToast('No out-of-stock products to delete in your branch.', 'info');
            return;
        }

        const msg = userRole === 'owner' 
            ? `Delete ${outOfStockItems.length} out-of-stock product(s) across ALL branches?`
            : `Delete ${outOfStockItems.length} out-of-stock product(s) from YOUR branch?`;

        showConfirm({
            title: 'Delete Out of Stock',
            message: msg,
            onConfirm: async () => {
                try {
                    for (const item of outOfStockItems) {
                        await deleteDocument(item.id);
                    }
                    showToast(`${outOfStockItems.length} out-of-stock product(s) deleted.`, 'success');
                } catch (err) {
                    showToast('Error deleting: ' + err.message, 'error');
                }
            }
        });
    };

    const ProductForm = () => {
        const labelStyle = { display: 'block', fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase', color: '#64748b', marginBottom: '8px', letterSpacing: '0.05em' };
        const inputStyle = { width: '100%', padding: '0.8rem', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '0.95rem', color: '#334155', boxSizing: 'border-box', outline: 'none', background: '#fff', transition: 'border-color 0.2s' };
        
        return (
        <div className="inv-form-scroll-container" style={{ background: '#f8fafc', padding: '1.5rem', borderRadius: '16px', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <div>
                <label style={labelStyle}>Product / Food Name *</label>
                <input
                    type="text"
                    placeholder="e.g. Chicken Biryani"
                    value={newProduct.name}
                    onChange={(e) => setNewProduct({ ...newProduct, name: e.target.value })}
                    style={inputStyle}
                />
            </div>

            <div>
                <label style={labelStyle}>Category</label>
                <select
                    value={newProduct.cat}
                    onChange={(e) => setNewProduct({ ...newProduct, cat: e.target.value })}
                    style={inputStyle}
                >
                    <option value="rice">🍚 Rice & Biryani</option>
                    <option value="starters">🢡 Starters</option>
                    <option value="breads">🫓 Breads</option>
                    <option value="curries">🍛 Curries</option>
                    <option value="drinks">🥤 Drinks</option>
                    <option value="desserts">🍮 Desserts</option>
                    <option value="snacks">🍿 Snacks</option>
                    <option value="combos">🥡 Combos</option>
                </select>
            </div>
            
            <div>
                <label style={labelStyle}>Veg / Non-Veg</label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                    <button
                        onClick={() => setNewProduct({ ...newProduct, type: 'veg' })}
                        style={{
                            background: newProduct.type === 'veg' ? '#dcfce7' : '#ffffff',
                            border: newProduct.type === 'veg' ? '1px solid #86efac' : '1px solid #e2e8f0',
                            color: newProduct.type === 'veg' ? '#166534' : '#475569',
                            borderRadius: '8px', padding: '0.8rem', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', cursor: 'pointer', transition: 'all 0.2s'
                        }}
                    >
                        <span style={{ fontSize: '12px' }}>🟢</span> Veg
                    </button>
                    <button
                        onClick={() => setNewProduct({ ...newProduct, type: 'nveg' })}
                        style={{
                            background: newProduct.type === 'nveg' ? '#fee2e2' : '#ffffff',
                            border: newProduct.type === 'nveg' ? '1px solid #fca5a5' : '1px solid #e2e8f0',
                            color: newProduct.type === 'nveg' ? '#991b1b' : '#475569',
                            borderRadius: '8px', padding: '0.8rem', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', cursor: 'pointer', transition: 'all 0.2s'
                        }}
                    >
                        <span style={{ fontSize: '12px' }}>🔴</span> Non-Veg
                    </button>
                </div>
            </div>

            <div>
                <label style={labelStyle}>Sell Price ₹ *</label>
                <input
                    type="number"
                    placeholder="0.00" min="0" step="0.01"
                    value={newProduct.price}
                    onChange={(e) => setNewProduct({ ...newProduct, price: e.target.value })}
                    style={inputStyle}
                />
            </div>
            <div>
                <label style={labelStyle}>Cost Price ₹</label>
                <input
                    type="number"
                    placeholder="0.00" min="0"
                    value={newProduct.cost}
                    onChange={(e) => setNewProduct({ ...newProduct, cost: e.target.value })}
                    style={inputStyle}
                />
            </div>
            <div>
                <label style={labelStyle}>Stock Qty *</label>
                <input
                    type="number"
                    placeholder="0" min="0"
                    value={newProduct.stock}
                    onChange={(e) => setNewProduct({ ...newProduct, stock: e.target.value })}
                    style={inputStyle}
                />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                    <label style={labelStyle}>Unit</label>
                    <select
                        value={newProduct.unit}
                        onChange={(e) => setNewProduct({ ...newProduct, unit: e.target.value })}
                        style={inputStyle}
                    >
                        <option value="plate">Plate</option>
                        <option value="piece">Piece</option>
                        <option value="bowl">Bowl</option>
                        <option value="glass">Glass</option>
                        <option value="pack">Pack</option>
                        <option value="kg">Kg</option>
                    </select>
                </div>
                <div>
                    <label style={labelStyle}>Low Stock Alert</label>
                    <input
                        type="number"
                        placeholder="5" min="0"
                        value={newProduct.low}
                        onChange={(e) => setNewProduct({ ...newProduct, low: e.target.value })}
                        style={inputStyle}
                    />
                </div>
            </div>

            <div>
                <label style={labelStyle}>Description</label>
                <input
                    type="text"
                    placeholder="Short description…"
                    value={newProduct.desc}
                    onChange={(e) => setNewProduct({ ...newProduct, desc: e.target.value })}
                    style={inputStyle}
                />
            </div>

            <div>
                <label style={labelStyle}>Product Image</label>
                <div
                    className="img-upload-box"
                    onClick={() => document.getElementById('product-img-input').click()}
                    style={{ background: '#fff', border: '1.5px dashed #cbd5e1', borderRadius: '12px', padding: '1.5rem', textAlign: 'center', cursor: 'pointer', transition: 'border 0.2s', position: 'relative' }}
                >
                    {newProduct.img ? (
                        <>
                            <img src={newProduct.img} alt="Preview" style={{ width: '100%', height: '120px', objectFit: 'contain' }} />
                            <button
                                style={{ position: 'absolute', top: '8px', right: '8px', background: 'rgba(0,0,0,0.5)', color: 'white', border: 'none', borderRadius: '50%', width: '28px', height: '28px', cursor: 'pointer' }}
                                onClick={(e) => { e.stopPropagation(); setNewProduct({ ...newProduct, img: '' }); }}
                            >✕</button>
                        </>
                    ) : (
                        <>
                            <span style={{ fontSize: '2rem', opacity: 0.4 }}>📷</span>
                            <div style={{ fontSize: '0.8rem', color: 'var(--muted)', marginTop: '8px', fontWeight: 700 }}>Click to upload product image</div>
                        </>
                    )}
                    <input
                        id="product-img-input"
                        type="file"
                        accept="image/*"
                        style={{ display: 'none' }}
                        onChange={(e) => {
                            const file = e.target.files[0];
                            if (file) {
                                if (file.size > 5000000) {
                                    window.alert('Image too large. Please use an image under 5MB.');
                                    return;
                                }
                                const img = new Image();
                                const url = URL.createObjectURL(file);
                                img.onload = () => {
                                    const canvas = document.createElement('canvas');
                                    const MAX = 400; 
                                    let w = img.width, h = img.height;
                                    if (w > h) { if (w > MAX) { h = h * MAX / w; w = MAX; } }
                                    else { if (h > MAX) { w = w * MAX / h; h = MAX; } }
                                    canvas.width = w;
                                    canvas.height = h;
                                    const ctx = canvas.getContext('2d');
                                    ctx.drawImage(img, 0, 0, w, h);
                                    const compressed = canvas.toDataURL('image/jpeg', 0.82);
                                    setNewProduct(prev => ({ ...prev, img: compressed }));
                                    URL.revokeObjectURL(url);
                                };
                                img.src = url;
                            }
                            e.target.value = '';
                        }}
                    />
                </div>
            </div>
            <div style={{ paddingTop: '1rem', marginTop: '1rem' }}>
                <button className="btn btn-primary" style={{ width: '100%', padding: '0.8rem', fontSize: '1rem', borderRadius: '8px', fontWeight: 800, background: 'var(--accent)' }} onClick={handleAddProduct}>
                    ＋ Add to Inventory
                </button>
            </div>
        </div>
    )};

    return (
        <div className="page active" id="page-inventory">
            <div className="inv-layout-2" style={{ 
                display: (isMobile && showAddModal) ? 'none' : 'flex',
                flexDirection: isMobile ? 'column' : 'row', 
                marginTop: isMobile ? '1cm' : '0.8cm' 
            }}>
                {!isMobile && (
                    <div className="inv-add-panel">
                        <div style={{ fontFamily: "'Yeseva One', serif", fontSize: '1.15rem', marginBottom: '1.2rem', display: 'flex', alignItems: 'center', gap: '.5rem' }}>
                            ＋ Add Product
                        </div>
                        {ProductForm()}
                    </div>
                )}

                <div className="inv-table-area">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '.85rem', marginBottom: '1.25rem', flexWrap: 'wrap' }}>
                        <div style={{ fontFamily: "'Yeseva One', serif", fontSize: '1.3rem' }}>📦 Inventory</div>
                        <input
                            type="text"
                            placeholder="🔍 Search…"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            style={{ background: 'var(--panel)', border: '1.5px solid var(--border)', color: 'var(--ink)', padding: '.5rem .9rem', borderRadius: '100px', fontFamily: "'Nunito', sans-serif", fontSize: '.82rem', flex: 1, minWidth: '150px', outline: 'none' }}
                        />

                        <div style={{ display: 'flex', gap: '.4rem', flexWrap: 'wrap' }}>
                            <button className={`btn btn-ghost btn-sm ${filterStatus === 'all' ? 'active' : ''}`} onClick={() => setFilterStatus('all')}>All</button>
                            <button className={`btn btn-ghost btn-sm ${filterStatus === 'in' ? 'active' : ''}`} onClick={() => setFilterStatus('in')}>✅ In</button>
                            <button className={`btn btn-ghost btn-sm ${filterStatus === 'low' ? 'active' : ''}`} onClick={() => setFilterStatus('low')}>⚠️ Low</button>
                            <button className={`btn btn-ghost btn-sm ${filterStatus === 'out' ? 'active' : ''}`} onClick={() => setFilterStatus('out')}>❌ Out</button>
                            {stats.outStock > 0 && (
                                <button
                                    className="btn btn-danger btn-sm"
                                    onClick={handleDeleteOutOfStock}
                                    style={{ marginLeft: '0.5rem' }}
                                >
                                    🗑 {isMobile ? '' : 'Delete Out of Stock '} ({stats.outStock})
                                </button>
                            )}
                        </div>
                    </div>

                    <div className="stats-grid" style={{ gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(4, 1fr)' }}>
                        <div className="stat-card">
                            <div className="sc-icon" style={{ background: 'var(--blue-bg)' }}>📦</div>
                            <div>
                                <div className="sc-val" style={{ color: 'var(--blue)' }}>{loading ? '...' : stats.total}</div>
                                <div className="sc-lbl">Total Items</div>
                            </div>
                        </div>
                        <div className="stat-card">
                            <div className="sc-icon" style={{ background: 'var(--green-bg)' }}>✅</div>
                            <div>
                                <div className="sc-val" style={{ color: 'var(--green)' }}>{loading ? '...' : stats.inStock}</div>
                                <div className="sc-lbl">In Stock</div>
                            </div>
                        </div>
                        <div className="stat-card">
                            <div className="sc-icon" style={{ background: 'var(--yellow-bg)' }}>⚠️</div>
                            <div>
                                <div className="sc-val" style={{ color: 'var(--yellow)' }}>{loading ? '...' : stats.lowStock}</div>
                                <div className="sc-lbl">Low Stock</div>
                            </div>
                        </div>
                        <div className="stat-card">
                            <div className="sc-icon" style={{ background: 'var(--red-bg)' }}>❌</div>
                            <div>
                                <div className="sc-val" style={{ color: 'var(--red)' }}>{loading ? '...' : stats.outStock}</div>
                                <div className="sc-lbl">Out of Stock</div>
                            </div>
                        </div>
                    </div>

                    <div className="table-card" style={{ background: isMobile ? 'transparent' : 'white', boxShadow: isMobile ? 'none' : 'var(--shadow-sm)', border: isMobile ? 'none' : '1px solid var(--border)' }}>
                        {isMobile ? (
                            <div className="adaptive-grid">
                                {loading ? (
                                    <div style={{ textAlign: 'center', padding: '2rem' }}>Loading inventory...</div>
                                ) : filteredItems.length === 0 ? (
                                    <div className="empty-state">
                                        <div className="es-icon" style={{ fontSize: '2rem' }}>📦</div>
                                        <div className="es-sub">No products found.</div>
                                    </div>
                                ) : (
                                    filteredItems.map(m => {
                                        let statusObj = { cls: 'st-active', txt: 'In Stock' };
                                        if (m.stock <= 0) statusObj = { cls: 'st-inactive', txt: 'Out of Stock' };
                                        else if (m.stock <= m.low) statusObj = { cls: 'st-pending', txt: 'Low Stock' };

                                        return (
                                            <div key={m.id} className="inv-card-mobile" style={{ 
                                                background: 'white', 
                                                borderRadius: '16px', 
                                                padding: '1rem', 
                                                border: '1px solid var(--border)',
                                                display: 'flex',
                                                flexDirection: 'column',
                                                gap: '0.75rem'
                                            }}>
                                                <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                                                    {m.img ? (
                                                        <img src={m.img} alt={m.name} style={{ width: '44px', height: '44px', borderRadius: '10px', objectFit: 'cover' }} />
                                                    ) : (
                                                        <div style={{ width: '44px', height: '44px', borderRadius: '10px', background: 'var(--panel)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px' }}>
                                                            {m.type === 'veg' ? '🟢' : '🔴'}
                                                        </div>
                                                    )}
                                                    <div style={{ flex: 1 }}>
                                                        <div style={{ fontWeight: 800, fontSize: '0.95rem', color: 'var(--ink)' }}>{m.name}</div>
                                                        <span style={{ fontSize: '0.7rem', textTransform: 'uppercase', color: 'var(--muted)', background: '#f1f5f9', padding: '2px 6px', borderRadius: '4px' }}>{m.cat}</span>
                                                    </div>
                                                    <button className="btn-vibe-danger" onClick={() => handleDeleteProduct(m.id)} style={{ padding: '8px', borderRadius: '10px', height: '40px', width: '40px' }}>
                                                        <Trash2 size={16} />
                                                    </button>
                                                </div>

                                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#f8fafc', padding: '8px 12px', borderRadius: '12px' }}>
                                                    <div style={{ fontWeight: 700 }}>₹{m.price}</div>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                                        <span style={{ fontWeight: 800, color: m.stock <= m.low ? 'var(--red)' : '#0f172a' }}>{m.stock} <small style={{ fontWeight: 400, opacity: 0.6 }}>{m.unit}</small></span>
                                                        <div style={{ display: 'flex', gap: '4px' }}>
                                                            <button className="stepper-btn" onClick={() => quickStockAdjust(m.id, -1)} style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'white' }}><Minus size={14} /></button>
                                                            <button className="stepper-btn" onClick={() => quickStockAdjust(m.id, 1)} style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'white' }}><Plus size={14} /></button>
                                                        </div>
                                                    </div>
                                                </div>

                                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                    <span className={`status-badge ${statusObj.cls}`} style={{ fontSize: '0.75rem' }}>{statusObj.txt}</span>
                                                    <span style={{ fontSize: '0.75rem', color: 'var(--muted)' }}>Alert at: {m.low}</span>
                                                </div>
                                            </div>
                                        );
                                    })
                                )}
                            </div>
                        ) : (
                            <table className="data-table adaptive-table">
                                <thead>
                                    <tr>
                                        <th>Product</th>
                                        <th>Category</th>
                                        <th>Type</th>
                                        <th>Sell ₹</th>
                                        <th>Stock</th>
                                        <th>Status</th>
                                        <th>Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {loading ? (
                                        <tr><td colSpan="7" style={{ textAlign: 'center' }}>Loading inventory...</td></tr>
                                    ) : filteredItems.length === 0 ? (
                                        <tr>
                                            <td colSpan="7">
                                                <div className="empty-state">
                                                    <div className="es-icon" style={{ fontSize: '2rem' }}>📦</div>
                                                    <div className="es-sub">No products found.</div>
                                                </div>
                                            </td>
                                        </tr>
                                    ) : (
                                        filteredItems.map(m => {
                                            let statusObj = { cls: 'st-active', txt: 'In Stock' };
                                            if (m.stock <= 0) statusObj = { cls: 'st-inactive', txt: 'Out of Stock' };
                                            else if (m.stock <= m.low) statusObj = { cls: 'st-pending', txt: 'Low Stock' };

                                            return (
                                                <tr key={m.id}>
                                                    <td data-label="Product">
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: '.5rem' }}>
                                                            {m.img ? (
                                                                <img src={m.img} alt={m.name} style={{ width: '32px', height: '32px', borderRadius: '6px', objectFit: 'cover' }} />
                                                            ) : (
                                                                <div style={{ width: '32px', height: '32px', borderRadius: '6px', background: 'var(--panel)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px', border: '1px solid var(--border)' }}>
                                                                    {m.type === 'veg' ? '🟢' : '🔴'}
                                                                </div>
                                                            )}
                                                            <div style={{ fontWeight: 600, color: 'var(--ink)' }}>{m.name}</div>
                                                        </div>
                                                    </td>
                                                    <td data-label="Category">
                                                        <span style={{ fontSize: '.75rem', textTransform: 'uppercase', letterSpacing: '.05em', background: 'var(--panel)', padding: '2px 8px', borderRadius: '100px' }}>
                                                            {m.cat}
                                                        </span>
                                                    </td>
                                                    <td data-label="Type">
                                                        <span style={{ color: m.type === 'veg' ? 'var(--green)' : 'var(--red)', fontSize: '.8rem', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                            {m.type === 'veg' ? '🟢 Veg' : '🔴 Non-Veg'}
                                                        </span>
                                                    </td>
                                                    <td data-label="Sell Price" style={{ fontWeight: 700, fontFamily: "'Nunito', sans-serif" }}>₹{m.price}</td>
                                                    <td data-label="Stock">
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                            <span style={{ fontWeight: 700, color: m.stock <= m.low ? 'var(--red)' : 'inherit', minWidth: '30px' }}>
                                                                {m.stock}
                                                            </span>
                                                            <div style={{ display: 'flex', border: '1px solid var(--border)', borderRadius: '4px', overflow: 'hidden' }}>
                                                                <button
                                                                    style={{ padding: '0 6px', background: 'var(--panel)', border: 'none', cursor: 'pointer', borderRight: '1px solid var(--border)' }}
                                                                    onClick={() => quickStockAdjust(m.id, -1)}
                                                                >−</button>
                                                                <button
                                                                    style={{ padding: '0 6px', background: 'var(--panel)', border: 'none', cursor: 'pointer' }}
                                                                    onClick={() => quickStockAdjust(m.id, 1)}
                                                                >+</button>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td data-label="Status"><span className={`status-badge ${statusObj.cls}`}>{statusObj.txt}</span></td>
                                                    <td data-label="Actions">
                                                        <button
                                                            className="btn btn-ghost btn-sm"
                                                            style={{ color: 'var(--red)', padding: '.3rem .6rem' }}
                                                            onClick={() => handleDeleteProduct(m.id)}
                                                        >
                                                            <Trash2 size={16} />
                                                        </button>
                                                    </td>
                                                </tr>
                                            );
                                        })
                                    )}
                                </tbody>
                            </table>
                        )}
                    </div>
                </div>
            </div>

            {/* Mobile FAB */}
            {isMobile && !showAddModal && (
                <button 
                    onClick={() => {
                        window.scrollTo(0, 0);
                        setShowAddModal(true);
                    }}
                    style={{
                        position: 'fixed',
                        bottom: '80px',
                        right: '20px',
                        width: '56px',
                        height: '56px',
                        borderRadius: '28px',
                        background: 'var(--pos-gradient, var(--accent))',
                        color: 'white',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        boxShadow: '0 4px 15px rgba(232, 93, 4, 0.4)',
                        border: 'none',
                        zIndex: 900
                    }}
                >
                    <Plus size={24} strokeWidth={3} />
                </button>
            )}

            {/* Mobile Add Product Modal */}
            {isMobile && showAddModal && (
                <div className="mobile-modal-overlay" style={{
                    position: 'fixed',
                    inset: 0,
                    background: 'white',
                    zIndex: 2000,
                    display: 'flex',
                    flexDirection: 'column',
                    animation: 'slideInUp 0.3s ease-out'
                }}>
                    <div style={{ 
                        padding: '1rem', 
                        display: 'flex', 
                        alignItems: 'center', 
                        gap: '1rem',
                        borderBottom: '1px solid var(--border)'
                    }}>
                        <button onClick={() => setShowAddModal(false)} style={{ background: 'transparent', border: 'none' }}>
                            <ArrowLeft size={24} />
                        </button>
                        <span style={{ fontFamily: "'Yeseva One', serif", fontSize: '1.25rem' }}>Add New Product</span>
                    </div>
                    <div className="mobile-modal-content" style={{ padding: '1rem' }}>
                        {ProductForm()}
                    </div>
                </div>
            )}
        </div>
    );
}
