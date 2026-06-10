import React, { useState, useEffect, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { db } from '../firebaseConfig';
import { collection, doc, setDoc, getDoc, getDocs, query, onSnapshot, serverTimestamp, updateDoc } from 'firebase/firestore';
import { useMessaging } from '../context/MessagingContext';
import { Search, ShoppingCart, Plus, Minus, Check, Clock, Utensils, Bell, Receipt, RefreshCw, ChevronRight } from 'lucide-react';

// AI Gallery fallback logic matching POS
const AI_GALLERY = [
    { name: 'Biryani', src: '/food-images/chicken_biryani.png', tags: ['biryani', 'chicken biryani', 'mutton biryani', 'dum biryani', 'hyderabadi'] },
    { name: 'Veg Rice', src: '/food-images/veg_biryani.png', tags: ['veg biryani', 'veg rice', 'pulao', 'vegetable rice', 'jeera rice'] },
    { name: 'Paneer', src: '/food-images/paneer_masala.png', tags: ['paneer', 'paneer masala', 'paneer butter', 'shahi paneer', 'kadai paneer', 'palak paneer'] },
    { name: 'Naan', src: '/food-images/butter_naan.png', tags: ['naan', 'butter naan', 'garlic naan', 'cheese naan', 'tandoori roti', 'bread'] },
    { name: 'Chappathi', src: '/food-images/chappathi.png', tags: ['chappathi', 'chapathi', 'chapati', 'roti', 'phulka', 'pulka'] },
    { name: 'Chicken 65', src: '/food-images/chicken_65.png', tags: ['chicken 65', 'chicken fry', 'chicken starter', 'fried chicken', 'wings'] },
    { name: 'Lassi', src: '/food-images/mango_lassi.png', tags: ['lassi', 'mango lassi', 'sweet lassi', 'buttermilk', 'chaas', 'milkshake', 'smoothie'] },
    { name: 'Dessert', src: '/food-images/gulab_jamun.png', tags: ['gulab jamun', 'dessert', 'sweet', 'rasgulla', 'jalebi', 'halwa', 'kheer'] },
    { name: 'Samosa', src: '/food-images/samosa.png', tags: ['samosa', 'snack', 'puff', 'spring roll', 'cutlet', 'pakora', 'bajji', 'vada'] },
    { name: 'Tandoori', src: '/food-images/tandoori_chicken.png', tags: ['tandoori', 'tandoori chicken', 'tikka', 'kebab', 'grill', 'roast', 'seekh'] },
    { name: 'Dosa', src: '/food-images/dosa.png', tags: ['dosa', 'masala dosa', 'paper dosa', 'rava dosa', 'uttapam', 'crepe'] },
    { name: 'Idli', src: '/food-images/idli.png', tags: ['idli', 'idly', 'mini idli', 'steamed', 'breakfast'] },
    { name: 'Fried Rice', src: '/food-images/fried_rice.png', tags: ['fried rice', 'noodles', 'hakka', 'schezwan', 'manchurian', 'chinese', 'indo chinese'] },
    { name: 'Butter Chicken', src: '/food-images/butter_chicken.png', tags: ['butter chicken', 'murgh', 'makhani', 'chicken curry', 'chicken gravy'] },
    { name: 'Raita', src: '/food-images/raita.png', tags: ['raita', 'yogurt', 'curd', 'dip', 'side', 'accompaniment'] },
    { name: 'Pav Bhaji', src: '/food-images/pav_bhaji.png', tags: ['pav bhaji', 'pav', 'bhaji', 'mumbai', 'street food'] },
    { name: 'Chole', src: '/food-images/chole_bhature.png', tags: ['chole', 'bhature', 'chana', 'chickpea', 'punjabi', 'rajma'] },
    { name: 'Fish Curry', src: '/food-images/fish_curry.png', tags: ['fish', 'fish curry', 'prawn', 'shrimp', 'seafood', 'fish fry'] },
];

function findBestMatch(productName) {
    if (!productName || productName.trim().length < 2) return null;
    const lower = productName.toLowerCase().trim();
    let bestMatch = null;
    let bestScore = 0;

    for (const item of AI_GALLERY) {
        for (const tag of item.tags) {
            if (lower === tag) return item.src;
            if (lower.includes(tag)) {
                const score = tag.length;
                if (score > bestScore) { bestScore = score; bestMatch = item.src; }
            } else if (tag.includes(lower)) {
                const score = lower.length * 0.8;
                if (score > bestScore) { bestScore = score; bestMatch = item.src; }
            }
        }
    }
    return bestMatch;
}

const getItemImage = (item) => item.img || findBestMatch(item.name) || null;

export default function CustomerMenu() {
    const { ownerId: pathOwnerId, branchId: pathBranchId, tableId: pathTableId } = useParams();
    
    // Support both path params and query parameters (for custom URL structures)
    const [queryParams] = useState(() => {
        const search = window.location.search || (window.location.hash.includes('?') ? window.location.hash.split('?')[1] : '');
        return new URLSearchParams(search);
    });
    
    const ownerId = pathOwnerId || queryParams.get('ownerId');
    const branchId = pathBranchId || queryParams.get('branchId');
    const tableId = pathTableId || queryParams.get('table') || queryParams.get('tableId');
    
    const { showToast } = useMessaging();

    // Data State
    const [branchName, setBranchName] = useState('Restaurant Branch');
    const [tableName, setTableName] = useState(`Table ${tableId || ''}`);
    const [menuItems, setMenuItems] = useState([]);
    const [categories, setCategories] = useState([]);
    const [loading, setLoading] = useState(true);
    const [tableValid, setTableValid] = useState(true);

    // UI State
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedCategory, setSelectedCategory] = useState('all');
    const [vegFilter, setVegFilter] = useState('all'); // 'all', 'veg', 'nveg'
    const [cart, setCart] = useState({});
    const [showCartOverlay, setShowCartOverlay] = useState(false);
    const [customerNote, setCustomerNote] = useState('');
    
    // Order tracking
    const [activeOrderId, setActiveOrderId] = useState(() => localStorage.getItem(`active_order_${tableId}`) || null);
    const [activeOrder, setActiveOrder] = useState(null);

    // Paths
    const productsPath = `owners/${ownerId}/products`;
    const tablesPath = `owners/${ownerId}/branches/${branchId}/tables/${tableId}`;
    const branchPath = `owners/${ownerId}/branches/${branchId}`;
    const ordersPath = `owners/${ownerId}/branches/${branchId}/orders`;

    // 1. Fetch table and branch details, validate access, and listen to products in real-time
    useEffect(() => {
        if (!ownerId || !branchId || !tableId) return;

        let unsubscribeProducts = () => {};

        const setupData = async () => {
            try {
                // Read branch details
                const branchSnap = await getDoc(doc(db, branchPath));
                const currentBranchName = branchSnap.exists() ? branchSnap.data().name : '';
                if (branchSnap.exists()) {
                    setBranchName(currentBranchName);
                }

                // Read table details
                const tableSnap = await getDoc(doc(db, tablesPath));
                if (tableSnap.exists()) {
                    setTableName(tableSnap.data().name);
                } else {
                    setTableValid(false);
                    setLoading(false);
                    return;
                }

                // Real-time listener for Menu Items
                unsubscribeProducts = onSnapshot(collection(db, productsPath), (snapshot) => {
                    let itemsList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

                    // Filter items by branch context (exact match or global items)
                    itemsList = itemsList.filter(item => 
                        item && (
                            (!item.branch_id && !item.branch) || 
                            (item.branch_id === branchId) || 
                            (!item.branch_id && item.branch === currentBranchName)
                        )
                    );

                    setMenuItems(itemsList);

                    // Extract Categories
                    const cats = ['all', ...new Set(itemsList.map(item => item.cat).filter(Boolean))];
                    setCategories(cats);
                    setLoading(false);
                }, (err) => {
                    console.error("Products real-time load failure:", err);
                    setLoading(false);
                });

            } catch (err) {
                console.error("Load public customer menu failure:", err);
                setTableValid(false);
                setLoading(false);
            }
        };

        setupData();

        return () => {
            unsubscribeProducts();
        };
    }, [ownerId, branchId, tableId]);

    // 2. Real-time listener for active order status
    useEffect(() => {
        if (!activeOrderId) {
            setActiveOrder(null);
            return;
        }

        const unsubscribe = onSnapshot(doc(db, ordersPath, activeOrderId), (snapshot) => {
            if (snapshot.exists()) {
                const data = snapshot.data();
                setActiveOrder({ id: snapshot.id, ...data });
                // If the order has been completed or cancelled, release active status
                if (data.status === 'completed' || data.status === 'cancelled') {
                    localStorage.removeItem(`active_order_${tableId}`);
                    setActiveOrderId(null);
                }
            } else {
                setActiveOrder(null);
                setActiveOrderId(null);
                localStorage.removeItem(`active_order_${tableId}`);
            }
        });

        return unsubscribe;
    }, [activeOrderId]);

    // Filtering items
    const filteredItems = useMemo(() => {
        return menuItems.filter(item => {
            const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase());
            const matchesCategory = selectedCategory === 'all' || item.cat === selectedCategory;
            const matchesVeg = vegFilter === 'all' || 
                (vegFilter === 'veg' && item.type === 'veg') || 
                (vegFilter === 'nveg' && item.type === 'nveg');
            return matchesSearch && matchesCategory && matchesVeg;
        });
    }, [menuItems, searchQuery, selectedCategory, vegFilter]);

    // Cart Handlers
    const addToCart = (item) => {
        setCart(prev => ({
            ...prev,
            [item.id]: {
                ...item,
                qty: (prev[item.id]?.qty || 0) + 1
            }
        }));
    };

    const removeFromCart = (itemId) => {
        setCart(prev => {
            const newCart = { ...prev };
            if (!newCart[itemId]) return prev;
            if (newCart[itemId].qty <= 1) {
                delete newCart[itemId];
            } else {
                newCart[itemId].qty -= 1;
            }
            return newCart;
        });
    };

    const cartTotal = useMemo(() => {
        return Object.values(cart).reduce((sum, item) => sum + (item.price * item.qty), 0);
    }, [cart]);

    const cartCount = useMemo(() => {
        return Object.values(cart).reduce((sum, item) => sum + item.qty, 0);
    }, [cart]);

    const handlePlaceOrder = async () => {
        if (Object.keys(cart).length === 0) return;

        const orderItems = Object.values(cart).map(item => ({
            productId: item.id,
            name: item.name,
            qty: item.qty,
            price: item.price,
            type: item.type || 'veg',
            cat: item.cat || ''
        }));

        const newOrderDoc = doc(collection(db, ordersPath));
        const orderId = newOrderDoc.id;

        const payload = {
            id: orderId,
            tableId,
            tableName,
            items: orderItems,
            status: 'new',
            subtotal: cartTotal,
            total: cartTotal,
            tax: 0,
            discount: 0,
            customerNote,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };

        try {
            // Deduct stock for each cart item in real-time
            for (const item of Object.values(cart)) {
                const productRef = doc(db, productsPath, item.id);
                const productSnap = await getDoc(productRef);
                if (productSnap.exists()) {
                    const currentStock = parseInt(productSnap.data().stock, 10) || 0;
                    const newStock = Math.max(0, currentStock - item.qty);
                    await updateDoc(productRef, { stock: newStock });
                }
            }

            await setDoc(newOrderDoc, payload);
            // Lock table status to occupied
            await updateDoc(doc(db, tablesPath), { status: 'occupied' });
            
            showToast("Order placed successfully! Kitchen notified. 🍳", "success");
            localStorage.setItem(`active_order_${tableId}`, orderId);
            setActiveOrderId(orderId);
            setCart({});
            setCustomerNote('');
            setShowCartOverlay(false);
        } catch (err) {
            showToast("Failed to place order: " + err.message, "error");
        }
    };

    const handleCallServer = async () => {
        if (!activeOrderId) {
            showToast("You need an active order to call the server.", "error");
            return;
        }
        try {
            await updateDoc(doc(db, ordersPath, activeOrderId), {
                callServer: true,
                callServerTime: new Date().toISOString()
            });
            showToast("Server has been called! They will arrive shortly. 🔔", "success");
        } catch (err) {
            showToast("Request failed: " + err.message, "error");
        }
    };

    const handleRequestBill = async () => {
        if (!activeOrderId) {
            showToast("You need an active order to request the bill.", "error");
            return;
        }
        try {
            await updateDoc(doc(db, ordersPath, activeOrderId), {
                requestBill: true,
                requestBillTime: new Date().toISOString()
            });
            showToast("Bill request sent! Waiter is bringing the check. 🧾", "success");
        } catch (err) {
            showToast("Request failed: " + err.message, "error");
        }
    };

    if (loading) {
        return (
            <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', height: '100vh', background: '#090a0f', color: '#fff' }}>
                <RefreshCw className="animate-spin" size={36} color="#e85d04" style={{ marginBottom: '1rem' }} />
                <div style={{ fontSize: '1.1rem', fontWeight: 600, color: 'rgba(255,255,255,0.7)' }}>Loading Menu...</div>
            </div>
        );
    }

    if (!tableValid) {
        return (
            <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', height: '100vh', background: '#090a0f', color: '#fff', padding: '2rem', textAlign: 'center' }}>
                <div style={{ fontSize: '4rem', marginBottom: '1.5rem' }}>⚠️</div>
                <h1 style={{ fontFamily: 'Yeseva One, serif', fontSize: '1.8rem', marginBottom: '1rem' }}>Invalid Table Link</h1>
                <p style={{ color: 'rgba(255,255,255,0.5)', maxWidth: '320px', lineHeight: 1.5 }}>The scanned QR code is either outdated or incorrect. Please ask the restaurant staff for assistance.</p>
            </div>
        );
    }

    return (
        <div style={{ background: '#090a0f', color: '#fff', minHeight: '100vh', fontFamily: 'Inter, sans-serif', paddingBottom: '90px', display: 'flex', flexDirection: 'column' }}>
            
            {/* Header banner */}
            <header style={{ background: 'linear-gradient(180deg, rgba(232, 93, 4, 0.15) 0%, transparent 100%)', padding: '2rem 1.5rem 1.5rem 1.5rem', borderBottom: '1px solid rgba(255,255,255,0.05)', position: 'relative' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                        <h1 style={{ fontSize: '1.6rem', fontWeight: 800, margin: 0, letterSpacing: '-0.5px' }}>{branchName}</h1>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', background: '#e85d04', color: '#fff', padding: '0.25rem 0.75rem', borderRadius: '100px', fontSize: '0.8rem', fontWeight: 800, marginTop: '0.5rem' }}>
                            <Utensils size={14} /> {tableName}
                        </span>
                    </div>
                </div>
            </header>

            {/* Live Order Tracker */}
            {activeOrder && (
                <div style={{ background: '#11121a', margin: '1rem 1.5rem', borderRadius: '20px', padding: '1.25rem', border: '1px solid rgba(232, 93, 4, 0.2)', display: 'flex', flexDirection: 'column', gap: '1rem', boxShadow: '0 10px 25px rgba(0,0,0,0.3)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <Clock size={16} color="#e85d04" />
                            <span style={{ fontSize: '0.85rem', fontWeight: 800, textTransform: 'uppercase', color: '#e85d04' }}>Active Order Status</span>
                        </div>
                        <span style={{ 
                            fontSize: '0.75rem', 
                            fontWeight: 900, 
                            padding: '0.25rem 0.6rem', 
                            borderRadius: '100px', 
                            textTransform: 'uppercase',
                            background: 
                                activeOrder.status === 'new' ? 'rgba(239, 68, 68, 0.1)' : 
                                activeOrder.status === 'preparing' ? 'rgba(244, 140, 6, 0.1)' : 
                                activeOrder.status === 'ready' ? 'rgba(34, 197, 94, 0.1)' : 'rgba(59, 130, 246, 0.1)',
                            color: 
                                activeOrder.status === 'new' ? '#ef4444' : 
                                activeOrder.status === 'preparing' ? '#f48c06' : 
                                activeOrder.status === 'ready' ? '#22c55e' : '#3b82f6'
                        }}>
                            {activeOrder.status === 'new' && 'Placed'}
                            {activeOrder.status === 'preparing' && 'Preparing'}
                            {activeOrder.status === 'ready' && 'Ready to Serve'}
                            {activeOrder.status === 'served' && 'Served'}
                        </span>
                    </div>

                    {/* Simple Progress Bar */}
                    <div style={{ display: 'flex', alignItems: 'center', width: '100%', gap: '0.5rem', padding: '0 0.5rem' }}>
                        <div style={{ flex: 1, height: '4px', borderRadius: '4px', background: '#22c55e' }} />
                        <div style={{ flex: 1, height: '4px', borderRadius: '4px', background: ['preparing', 'ready', 'served'].includes(activeOrder.status) ? '#e85d04' : 'rgba(255,255,255,0.1)' }} />
                        <div style={{ flex: 1, height: '4px', borderRadius: '4px', background: ['ready', 'served'].includes(activeOrder.status) ? '#22c55e' : 'rgba(255,255,255,0.1)' }} />
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: 'rgba(255,255,255,0.4)', fontWeight: 600 }}>
                        <span>Sent to Kitchen</span>
                        <span>Cooking</span>
                        <span>Delivered</span>
                    </div>

                    {/* Quick waiter requests */}
                    {['new', 'preparing', 'ready', 'served'].includes(activeOrder.status) && (
                        <div style={{ display: 'flex', gap: '0.5rem', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '0.75rem' }}>
                            <button 
                                onClick={handleCallServer} 
                                style={{ flex: 1, background: 'rgba(255,255,255,0.05)', border: 'none', borderRadius: '10px', padding: '0.6rem', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem', fontSize: '0.8rem', fontWeight: 700, cursor: 'pointer' }}
                            >
                                <Bell size={14} color="#e85d04" /> Call Server
                            </button>
                            <button 
                                onClick={handleRequestBill} 
                                style={{ flex: 1, background: 'rgba(255,255,255,0.05)', border: 'none', borderRadius: '10px', padding: '0.6rem', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem', fontSize: '0.8rem', fontWeight: 700, cursor: 'pointer' }}
                            >
                                <Receipt size={14} color="#e85d04" /> Request Bill
                            </button>
                        </div>
                    )}
                </div>
            )}

            {/* Menu controls: Search & Veg Filter */}
            <div style={{ padding: '0 1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem', marginTop: '1rem' }}>
                {/* Search */}
                <div style={{ position: 'relative' }}>
                    <Search size={18} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'rgba(255,255,255,0.3)' }} />
                    <input 
                        type="text" 
                        placeholder="Search delicious food..." 
                        value={searchQuery}
                        onChange={e => setSearchQuery(e.target.value)}
                        style={{ width: '100%', padding: '0.85rem 1rem 0.85rem 2.8rem', background: '#11121a', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '14px', color: '#fff', fontSize: '0.9rem', outline: 'none' }}
                    />
                </div>

                {/* Diet Filter Chips */}
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <button 
                        onClick={() => setVegFilter('all')}
                        style={{ background: vegFilter === 'all' ? '#e85d04' : 'rgba(255,255,255,0.03)', border: 'none', borderRadius: '10px', padding: '0.5rem 1rem', fontSize: '0.8rem', fontWeight: 700, color: '#fff', cursor: 'pointer' }}
                    >
                        All
                    </button>
                    <button 
                        onClick={() => setVegFilter('veg')}
                        style={{ background: vegFilter === 'veg' ? '#22c55e' : 'rgba(255,255,255,0.03)', border: 'none', borderRadius: '10px', padding: '0.5rem 1rem', fontSize: '0.8rem', fontWeight: 700, color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.3rem' }}
                    >
                        <span style={{ width: '8px', height: '8px', background: '#22c55e', borderRadius: '50%' }} /> Veg
                    </button>
                    <button 
                        onClick={() => setVegFilter('nveg')}
                        style={{ background: vegFilter === 'nveg' ? '#ef4444' : 'rgba(255,255,255,0.03)', border: 'none', borderRadius: '10px', padding: '0.5rem 1rem', fontSize: '0.8rem', fontWeight: 700, color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.3rem' }}
                    >
                        <span style={{ width: '8px', height: '8px', background: '#ef4444', borderRadius: '50%' }} /> Non-Veg
                    </button>
                </div>
            </div>

            {/* Category tabs */}
            <div style={{ display: 'flex', overflowX: 'auto', padding: '1rem 1.5rem', gap: '0.5rem', scrollbarWidth: 'none' }}>
                {categories.map(cat => (
                    <button 
                        key={cat}
                        onClick={() => setSelectedCategory(cat)}
                        style={{ 
                            background: selectedCategory === cat ? 'rgba(232, 93, 4, 0.1)' : 'transparent', 
                            color: selectedCategory === cat ? '#e85d04' : 'rgba(255,255,255,0.4)', 
                            border: 'none', 
                            borderRadius: '10px', 
                            padding: '0.5rem 1rem', 
                            fontWeight: 700, 
                            fontSize: '0.85rem', 
                            whiteSpace: 'nowrap',
                            textTransform: 'capitalize',
                            cursor: 'pointer'
                        }}
                    >
                        {cat}
                    </button>
                ))}
            </div>

            {/* Menu Items Grid */}
            <main style={{ flex: 1, padding: '0 1.5rem' }}>
                {filteredItems.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '4rem 2rem', color: 'rgba(255,255,255,0.3)' }}>
                        <Utensils size={36} style={{ marginBottom: '1rem', opacity: 0.3 }} />
                        <div>No items match your filters.</div>
                    </div>
                ) : (
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '1rem' }}>
                        {filteredItems.map(item => {
                            const cartQty = cart[item.id]?.qty || 0;
                            const imageSrc = getItemImage(item);
                            return (
                                <div 
                                    key={item.id} 
                                    style={{ 
                                        background: '#11121a', 
                                        borderRadius: '20px', 
                                        padding: '1rem', 
                                        border: '1px solid rgba(255,255,255,0.03)',
                                        display: 'flex', 
                                        gap: '1rem', 
                                        alignItems: 'center' 
                                    }}
                                >
                                    {/* Food Image */}
                                    <div style={{ width: '80px', height: '80px', background: 'rgba(255,255,255,0.02)', borderRadius: '16px', overflow: 'hidden', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                        {imageSrc ? (
                                            <img src={imageSrc} alt={item.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                        ) : '🍲'}
                                    </div>

                                    {/* Details */}
                                    <div style={{ flex: 1 }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                                            <span style={{ width: '6px', height: '6px', background: item.type === 'veg' ? '#22c55e' : '#ef4444', borderRadius: '50%' }} />
                                            <h3 style={{ fontSize: '0.95rem', fontWeight: 700, margin: 0 }}>{item.name}</h3>
                                        </div>
                                        <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: '0.75rem', textTransform: 'capitalize', margin: '0.2rem 0 0.5rem' }}>{item.cat}</p>
                                        <div style={{ fontWeight: 800, color: '#e85d04', fontSize: '1.1rem' }}>₹{item.price}</div>
                                    </div>

                                    {/* Add / Stepper Actions */}
                                    <div style={{ flexShrink: 0 }}>
                                        {cartQty > 0 ? (
                                            <div style={{ display: 'flex', alignItems: 'center', background: '#e85d04', borderRadius: '10px', padding: '0.25rem 0.5rem', gap: '0.75rem' }}>
                                                <button onClick={() => removeFromCart(item.id)} style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer', padding: '0.2rem' }}><Minus size={14} /></button>
                                                <span style={{ fontWeight: 800, fontSize: '0.9rem' }}>{cartQty}</span>
                                                <button onClick={() => addToCart(item)} style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer', padding: '0.2rem' }}><Plus size={14} /></button>
                                            </div>
                                        ) : (
                                            <button 
                                                onClick={() => addToCart(item)}
                                                style={{ background: 'rgba(232, 93, 4, 0.1)', color: '#e85d04', border: '1px solid rgba(232, 93, 4, 0.2)', padding: '0.5rem 1rem', borderRadius: '10px', fontSize: '0.8rem', fontWeight: 800, cursor: 'pointer' }}
                                            >
                                                ADD
                                            </button>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </main>

            {/* Bottom floating cart bar */}
            {cartCount > 0 && (
                <div style={{ position: 'fixed', bottom: '1.5rem', left: '1.5rem', right: '1.5rem', zIndex: 100, background: '#e85d04', padding: '1rem 1.25rem', borderRadius: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', boxShadow: '0 15px 30px rgba(232, 93, 4, 0.3)', cursor: 'pointer' }} onClick={() => setShowCartOverlay(true)}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <div style={{ background: 'rgba(255,255,255,0.2)', padding: '0.4rem', borderRadius: '10px', display: 'flex', alignItems: 'center' }}>
                            <ShoppingCart size={18} />
                        </div>
                        <div>
                            <div style={{ fontSize: '0.85rem', fontWeight: 800 }}>{cartCount} {cartCount === 1 ? 'item' : 'items'} in Cart</div>
                            <div style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.7)', fontWeight: 600 }}>Tap to view checkout options</div>
                        </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', fontWeight: 800, fontSize: '1.1rem' }}>
                        ₹{cartTotal} <ChevronRight size={18} />
                    </div>
                </div>
            )}

            {/* Cart Modal Overlay */}
            {showCartOverlay && (
                <div style={{ position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(9, 10, 15, 0.8)', backdropFilter: 'blur(10px)', display: 'flex', alignItems: 'flex-end' }}>
                    <div style={{ background: '#11121a', width: '100%', borderTopLeftRadius: '30px', borderTopRightRadius: '30px', padding: '2rem 1.5rem', maxHeight: '85vh', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '1.5rem', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                        
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <h2 style={{ fontSize: '1.25rem', fontWeight: 800, margin: 0 }}>Review Your Order</h2>
                            <button onClick={() => setShowCartOverlay(false)} style={{ background: 'rgba(255,255,255,0.05)', border: 'none', borderRadius: '50%', width: '32px', height: '32px', color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✕</button>
                        </div>

                        {/* Cart Items list */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                            {Object.values(cart).map(item => (
                                <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <div>
                                        <div style={{ fontSize: '0.9rem', fontWeight: 700 }}>{item.name}</div>
                                        <div style={{ fontSize: '0.8rem', color: '#e85d04', fontWeight: 800 }}>₹{item.price}</div>
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'center', background: 'rgba(255,255,255,0.05)', borderRadius: '10px', padding: '0.25rem 0.5rem', gap: '0.75rem' }}>
                                        <button onClick={() => removeFromCart(item.id)} style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer' }}><Minus size={12} /></button>
                                        <span style={{ fontWeight: 800, fontSize: '0.85rem' }}>{item.qty}</span>
                                        <button onClick={() => addToCart(item)} style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer' }}><Plus size={12} /></button>
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Customer note */}
                        <div>
                            <label style={{ fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase', color: 'rgba(255,255,255,0.4)', display: 'block', marginBottom: '0.5rem' }}>Cooking Instructions</label>
                            <input 
                                type="text"
                                placeholder="E.g. Make it spicy, no onions, extra ice..."
                                value={customerNote}
                                onChange={e => setCustomerNote(e.target.value)}
                                style={{ width: '100%', padding: '0.85rem 1rem', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '12px', color: '#fff', fontSize: '0.85rem', outline: 'none' }}
                            />
                        </div>

                        {/* Order Summary */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '1.25rem' }}>
                            <span style={{ fontSize: '1rem', fontWeight: 700, color: 'rgba(255,255,255,0.5)' }}>Total Amount</span>
                            <span style={{ fontSize: '1.4rem', fontWeight: 900, color: '#e85d04' }}>₹{cartTotal}</span>
                        </div>

                        {/* Checkout button */}
                        <button 
                            onClick={handlePlaceOrder}
                            style={{ width: '100%', background: '#e85d04', color: '#fff', border: 'none', borderRadius: '100px', padding: '1.1rem', fontWeight: 800, fontSize: '1rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', boxShadow: '0 10px 25px rgba(232, 93, 4, 0.2)' }}
                        >
                            <Check size={18} /> Confirm & Place Order
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
