import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { useFirestore } from '../hooks/useFirestore';
import { useDevice } from '../context/DeviceContext';
import { useMessaging } from '../context/MessagingContext';
import { StandardTemplate, ElegantTemplate, ThermalTemplate } from '../components/InvoiceTemplates';
import PrintWrapper from '../components/PrintWrapper';
import { db } from '../firebaseConfig';
import {
    ArrowLeft,
    Search,
    ShoppingCart,
    Trash2,
    Printer,
    Plus,
    Minus,
    CreditCard,
    Banknote,
    Clock,
    Receipt,
    User,
    Store,
    Tag,
    X
} from 'lucide-react';
import { useCoupon } from '../hooks/useCoupon';
import { Printer as NativePrinter } from '@capgo/capacitor-printer';
import { Capacitor } from '@capacitor/core';
import CouponSection from '../components/billing/CouponSection';
import '../invoices.css';
import './premium_pos.css';

// AI Gallery — 17 high-quality AI-generated food images with keyword tags for auto-matching
const AI_GALLERY = [
    { name: 'Biryani', src: '/food-images/chicken_biryani.png', tags: ['biryani', 'chicken biryani', 'mutton biryani', 'dum biryani', 'hyderabadi'] },
    { name: 'Veg Rice', src: '/food-images/veg_biryani.png', tags: ['veg biryani', 'veg rice', 'pulao', 'vegetable rice', 'jeera rice'] },
    { name: 'Paneer', src: '/food-images/paneer_masala.png', tags: ['paneer', 'paneer masala', 'paneer butter', 'shahi paneer', 'kadai paneer', 'palak paneer'] },
    { name: 'Naan', src: '/food-images/butter_naan.png', tags: ['naan', 'butter naan', 'garlic naan', 'cheese naan', 'tandoori roti', 'roti', 'bread'] },
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

// Auto-match: finds the best AI image for a product name based on keyword tags
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

// Helper: Safely gets item image URL or returns null
const getItemImage = (item) => item.img || findBestMatch(item.name) || null;

// Hardcoded initial menu items ported from the original script.js
const initialMenuItems = [
    // Waffles / Pancakes
    { id: 1,  name: 'Belgian Waffle',       cat: 'waffles',    type: 'veg', price: 149, cost: 60, stock: 50, unit: 'plate', low: 5 },
    { id: 2,  name: 'Nutella Waffle',        cat: 'waffles',    type: 'veg', price: 179, cost: 70, stock: 50, unit: 'plate', low: 5 },
    { id: 3,  name: 'Honey + Butter Waffle', cat: 'waffles',    type: 'veg', price: 139, cost: 55, stock: 50, unit: 'plate', low: 5 },
    { id: 4,  name: 'Choco Pancake',         cat: 'waffles',    type: 'veg', price: 129, cost: 50, stock: 50, unit: 'plate', low: 5 },
    // Chocolates
    { id: 5,  name: 'Belgian Choco Milk',    cat: 'chocolates', type: 'veg', price: 199, cost: 90, stock: 40, unit: 'cup',   low: 5 },
    { id: 6,  name: 'Belgian Choco Dark',    cat: 'chocolates', type: 'veg', price: 199, cost: 90, stock: 40, unit: 'cup',   low: 5 },
    { id: 7,  name: 'Choco Eclairs',         cat: 'chocolates', type: 'veg', price: 149, cost: 60, stock: 30, unit: 'piece', low: 5 },
    { id: 8,  name: 'Cookies & Cream',       cat: 'chocolates', type: 'veg', price: 179, cost: 70, stock: 30, unit: 'cup',   low: 5 },
    { id: 9,  name: 'Crunchy Biscoff',       cat: 'chocolates', type: 'veg', price: 189, cost: 80, stock: 30, unit: 'cup',   low: 5 },
    { id: 10, name: 'Crunchy Ferrero',       cat: 'chocolates', type: 'veg', price: 219, cost: 95, stock: 30, unit: 'cup',   low: 5 },
    { id: 11, name: 'Crunchy KitKat',        cat: 'chocolates', type: 'veg', price: 209, cost: 90, stock: 30, unit: 'cup',   low: 5 },
    { id: 12, name: 'Nutty Nutella',         cat: 'chocolates', type: 'veg', price: 189, cost: 80, stock: 30, unit: 'cup',   low: 5 },
    { id: 13, name: 'Dark & White Choco',    cat: 'chocolates', type: 'veg', price: 199, cost: 85, stock: 30, unit: 'cup',   low: 5 },
    { id: 14, name: 'Overloaded Chocolate',  cat: 'chocolates', type: 'veg', price: 229, cost: 100,stock: 25, unit: 'cup',   low: 5 },
    { id: 15, name: 'Creamy Snickers',       cat: 'chocolates', type: 'veg', price: 219, cost: 95, stock: 25, unit: 'cup',   low: 5 },
    { id: 16, name: 'Loaded Almonds',        cat: 'chocolates', type: 'veg', price: 209, cost: 90, stock: 25, unit: 'cup',   low: 5 },
    // Coffee
    { id: 17, name: 'Classic Espresso',      cat: 'coffee',     type: 'veg', price: 99,  cost: 30, stock: 60, unit: 'cup',   low: 10 },
    { id: 18, name: 'Cold Coffee',           cat: 'coffee',     type: 'veg', price: 129, cost: 45, stock: 60, unit: 'cup',   low: 10 },
    { id: 19, name: 'Mocha Latte',           cat: 'coffee',     type: 'veg', price: 149, cost: 55, stock: 60, unit: 'cup',   low: 10 },
    // Ice Cream
    { id: 20, name: 'Vanilla Scoops',        cat: 'icecream',   type: 'veg', price: 79,  cost: 25, stock: 80, unit: 'scoop', low: 10 },
    { id: 21, name: 'Choco Fudge Ice Cream', cat: 'icecream',   type: 'veg', price: 99,  cost: 35, stock: 80, unit: 'scoop', low: 10 },
    // Milkshakes
    { id: 22, name: 'Choco Milkshake',       cat: 'milkshakes', type: 'veg', price: 149, cost: 55, stock: 50, unit: 'glass', low: 5 },
    { id: 23, name: 'Oreo Milkshake',        cat: 'milkshakes', type: 'veg', price: 159, cost: 60, stock: 50, unit: 'glass', low: 5 },
    { id: 24, name: 'Strawberry Shake',      cat: 'milkshakes', type: 'veg', price: 149, cost: 55, stock: 50, unit: 'glass', low: 5 },
    // Special Combos
    { id: 25, name: 'Waffle + Shake Combo',  cat: 'combos',     type: 'veg', price: 279, cost: 120,stock: 20, unit: 'set',   low: 5 },
    { id: 26, name: 'Choco + Coffee Combo',  cat: 'combos',     type: 'veg', price: 299, cost: 130,stock: 20, unit: 'set',   low: 5 },
    // Add-ons
    { id: 27, name: 'Extra Choco Sauce',     cat: 'addons',     type: 'veg', price: 29,  cost: 8,  stock: 100,unit: 'portion',low: 10 },
    { id: 28, name: 'Extra Nuts',            cat: 'addons',     type: 'veg', price: 39,  cost: 12, stock: 100,unit: 'portion',low: 10 },
    { id: 29, name: 'Whipped Cream',         cat: 'addons',     type: 'veg', price: 29,  cost: 8,  stock: 100,unit: 'portion',low: 10 },
    // Beverages
    { id: 30, name: 'Mineral Water',         cat: 'beverages',  type: 'veg', price: 20,  cost: 8,  stock: 100,unit: 'bottle', low: 20 },
    { id: 31, name: 'Fresh Lime Soda',       cat: 'beverages',  type: 'veg', price: 59,  cost: 18, stock: 80, unit: 'glass',  low: 10 },
];

// Default seed categories for empty/loading databases
const defaultSeedCategories = [
    { id: 'rice', name: 'Rice & Biryani', icon: '🍛', status: 'active', order: 1, subcategories: [] },
    { id: 'breads', name: 'Breads', icon: '🫓', status: 'active', order: 2, subcategories: [] },
    { id: 'curries', name: 'Curries', icon: '🍲', status: 'active', order: 3, subcategories: [] },
    { id: 'starters', name: 'Starters', icon: '🍗', status: 'active', order: 4, subcategories: [] },
    { id: 'waffles', name: 'Waffles & Pancakes', icon: '🧇', status: 'active', order: 5, subcategories: [
        { id: 'sub_1', name: 'Chocolate Series', order: 1 },
        { id: 'sub_2', name: 'Nutella Series', order: 2 },
        { id: 'sub_3', name: 'Premium Series', order: 3 }
    ] },
    { id: 'chocolates', name: 'Chocolates', icon: '🍫', status: 'active', order: 6, subcategories: [] },
    { id: 'coffee', name: 'Coffee', icon: '☕', status: 'active', order: 7, subcategories: [
        { id: 'sub_4', name: 'Hot Coffee', order: 1 },
        { id: 'sub_5', name: 'Cold Coffee', order: 2 }
    ] },
    { id: 'icecream', name: 'Ice Cream', icon: '🍨', status: 'active', order: 8, subcategories: [] },
    { id: 'milkshakes', name: 'Milkshakes', icon: '🥤', status: 'active', order: 9, subcategories: [
        { id: 'sub_6', name: 'Chocolate Shakes', order: 1 },
        { id: 'sub_7', name: 'Fruit Shakes', order: 2 }
    ] },
    { id: 'combos', name: 'Special Combos', icon: '🎁', status: 'active', order: 10, subcategories: [] },
    { id: 'drinks', name: 'Drinks', icon: '🥛', status: 'active', order: 11, subcategories: [] },
    { id: 'desserts', name: 'Desserts', icon: '🍰', status: 'active', order: 12, subcategories: [] },
    { id: 'snacks', name: 'Snacks', icon: '🥟', status: 'active', order: 13, subcategories: [] },
    { id: 'beverages', name: 'Beverages', icon: '🧃', status: 'active', order: 14, subcategories: [] },
    { id: 'addons', name: 'Add-ons', icon: '✨', status: 'active', order: 15, subcategories: [] }
];

export default function Billing() {
    const { showToast, showConfirm } = useMessaging();
    const { addDocument } = useFirestore('invoices');
    const { addDocument: addCreditNote } = useFirestore('credit_notes');
    const { addDocument: addSalesOrder } = useFirestore('salesOrders');
    const { docs: firestoreProducts, updateDocument: updateProduct } = useFirestore('products');
    const { docs: customers } = useFirestore('customers');
    const { updateDocument: updateCoupon } = useFirestore('coupons');
    const { docs: categories } = useFirestore('categories');

    const { isMobile, isTablet, isDesktop, isTouchDevice } = useDevice();
    const [cartExpanded, setCartExpanded] = useState(false);
    const [quickOrderMode, setQuickOrderMode] = useState(true); // default ON for tablet

    const [isMobileOrTablet, setIsMobileOrTablet] = useState(window.innerWidth < 1024);

    useEffect(() => {
        const handleResize = () => {
            setIsMobileOrTablet(window.innerWidth < 1024);
        };
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    // POS Data State — use Firestore products if available, else fallback to hardcoded
    const userStation = sessionStorage.getItem('fb_user_station') || 'Main Branch';
    const userRole = (sessionStorage.getItem('fb_user_role') || '').toLowerCase();
    const userBranchId = sessionStorage.getItem('fb_user_branch_id') || 'main';
    
    // Auto-filter products by branch and sort by creation date (desc)
    const menuItems = useMemo(() => {
        const source = (firestoreProducts && Array.isArray(firestoreProducts) && firestoreProducts.length > 0) 
            ? firestoreProducts 
            : initialMenuItems;
        
        const filtered = userRole === 'owner' 
            ? source 
            : source.filter(p => p && ((!p.branch_id && !p.branch) || (p.branch_id === userBranchId) || (!p.branch_id && (p.branch === userStation))));
            
        return [...filtered].sort((a, b) => {
            const dateA = new Date(a?.createdAt || 0);
            const dateB = new Date(b?.createdAt || 0);
            return dateB - dateA;
        });
    }, [firestoreProducts, userStation, userRole, userBranchId]);

    const [cart, setCart] = useState([]);

    // UI Filter State
    const [currentCat, setCurrentCat] = useState('all');
    const [currentSubCat, setCurrentSubCat] = useState('all');
    const [searchTerm, setSearchTerm] = useState('');

    const activeCategories = useMemo(() => {
        const sourceCats = (categories && Array.isArray(categories) && categories.length > 0)
            ? categories
            : defaultSeedCategories;
        const sorted = [...sourceCats]
            .filter(c => c.status === 'active')
            .sort((a, b) => (a.order || 0) - (b.order || 0));
        return [{ id: 'all', name: 'All Items', icon: '🍽️', subcategories: [] }, ...sorted];
    }, [categories]);

    const selectedCategoryObj = useMemo(() => {
        return activeCategories.find(c => c.id === currentCat);
    }, [activeCategories, currentCat]);

    // Reset subcategory when category changes
    useEffect(() => {
        setCurrentSubCat('all');
    }, [currentCat]);

    // Cart Adjustment State - Dynamically synced with system settings
    const [taxPct, setTaxPct] = useState(5);
    const [discPct] = useState(0);

    const storeDoc = useMemo(() => {
        return customers.find(c => c.isSystemProfile === true);
    }, [customers]);

    // Sync tax rate from store settings
    useEffect(() => {
        if (storeDoc?.legal?.taxRate) {
            const rate = parseFloat(storeDoc.legal.taxRate);
            if (!isNaN(rate)) {
                setTaxPct(rate);
            }
        }
    }, [storeDoc]);

    // Print Modal State
    const [showPrintModal, setShowPrintModal] = useState(false);
    const [selectedDesign, setSelectedDesign] = useState('Standard'); // Standard, Elegant, Thermal
    const getLocalDate = () => {
        const d = new Date();
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    };
    const [invoiceDate, setInvoiceDate] = useState(getLocalDate());
    const [invType] = useState('Standard');
    const [paymentMethod, setPaymentMethod] = useState('Cash');

    // Franchise Session Info (Using existing userRole and userStation from above)
    const [selectedBranchName, setSelectedBranchName] = useState(userStation);
    const [selectedBranchId, setSelectedBranchId] = useState(userBranchId);
    const { docs: branches } = useFirestore('branches');

    // New Coupon System
    const { 
        couponCode, 
        setCouponCode, 
        appliedCoupon, 
        couponError, 
        couponDiscount, 
        applyCoupon, 
        removeCoupon,
        runAutoApplyCoupon
    } = useCoupon();

    // Print Reference & Snapshot State
    const printRef = useRef(null);
    const [printSnapshot, setPrintSnapshot] = useState(null);
    const [isPrinting, setIsPrinting] = useState(false);

    // Derived States
    const filteredMenu = useMemo(() => {
        return menuItems.filter(it => {
            if (!it) return false;
            if (parseInt(it.stock, 10) <= 0) return false; // Hide out of stock items
            const matchCat = currentCat === 'all' || it.categoryId === currentCat || it.cat === currentCat;
            const matchSubCat = currentSubCat === 'all' || it.subcategoryId === currentSubCat;
            const name = String(it.name || '').toLowerCase();
            const search = String(searchTerm || '').toLowerCase();
            const matchSearch = name.includes(search);
            return matchCat && matchSubCat && matchSearch;
        });
    }, [menuItems, currentCat, currentSubCat, searchTerm]);


    // Dynamic and unique invoice number based on store settings
    const invoiceNo = useMemo(() => {
        const prefix = storeDoc?.billing?.invoicePrefix || 'INV';
        const timestamp = Date.now();
        const random = Math.floor(Math.random() * 900) + 100;
        return `${prefix}-${timestamp}-${random}`;
    }, [storeDoc]);

    const { subtotal, taxAmount, discAmount, grandTotal } = useMemo(() => {
        const sub = cart.reduce((sum, item) => sum + (item.price * item.qty), 0);
        
        // System wide percentage discount
        const systemDisc = sub * (discPct / 100);
        
        // Apply coupon discount if any
        const totalDisc = systemDisc + couponDiscount;
        
        const taxableAmount = Math.max(0, sub - totalDisc);
        const tax = taxableAmount * (taxPct / 100);
        const grand = taxableAmount + tax;
        
        return { subtotal: sub, taxAmount: tax, discAmount: totalDisc, grandTotal: grand };
    }, [cart, taxPct, discPct, couponDiscount]);

    const cartCount = cart.reduce((sum, item) => sum + item.qty, 0);

    // Cart Handlers
    const addToCart = (item) => {
        if (item.stock <= 0) {
            showToast('Out of stock!', 'error');
            return;
        }

        setCart(prevCart => {
            const existing = prevCart.find(c => c.id === item.id);
            if (existing) {
                if (existing.qty >= item.stock) {
                    showToast('No more stock!', 'info');
                    return prevCart;
                }
                const newCart = prevCart.map(c => c.id === item.id ? { ...c, qty: c.qty + 1 } : c);
                if (!isMobileOrTablet) {
                    if (isMobile || isTablet) setCartExpanded(true);
                }
                return newCart;
            } else {
                if (!isMobileOrTablet) {
                    if (isMobile || isTablet) setCartExpanded(true);
                }
                return [...prevCart, { ...item, qty: 1 }];
            }
        });
    };

    const updateCartQty = (id, delta) => {
        setCart(prevCart => {
            const updated = prevCart.map(c => {
                if (c.id === id) {
                    const itemData = menuItems.find(m => m.id === id);
                    if (delta > 0 && c.qty >= itemData.stock) {
                        showToast('No more stock!', 'info');
                        return c;
                    }
                    return { ...c, qty: c.qty + delta };
                }
                return c;
            }).filter(c => c.qty > 0);
            
            // Auto-revalidate coupon if subtotal changes (Requirement Part 5)
            if (appliedCoupon) {
                const sub = updated.reduce((sum, item) => sum + (item.price * item.qty), 0);
                if (sub < appliedCoupon.minOrderValue) {
                    removeCoupon();
                    showToast(`Coupon removed: Minimum order ₹${appliedCoupon.minOrderValue} required`, 'info');
                }
            }
            return updated;
        });
    };

    // Auto-Apply Logic: Triggered when subtotal changes
    useEffect(() => {
        if (subtotal >= 0 && typeof runAutoApplyCoupon === 'function') {
            runAutoApplyCoupon(subtotal);
        }
    }, [subtotal, runAutoApplyCoupon]);

    const clearCart = () => {
        showConfirm({
            title: 'Clear Cart',
            message: 'Are you sure you want to clear the current order?',
            onConfirm: () => setCart([])
        });
    };

    const printBill = () => {
        if (cart.length === 0) return showToast('Cart is empty!', 'info');
        
        // Capture a frozen snapshot of the current transaction
        const snapshot = {
            cart: [...cart],
            customer: { name: 'Walk-in Client', phone: '', tableNo: '' },
            subtotal,
            taxAmount,
            discAmount,
            grandTotal,
            invoiceNo,
            date: invoiceDate,
            invType,
            storeProfile: storeDoc,
            couponCode: appliedCoupon?.code,
            paymentMethod,
            branch: selectedBranchName,
            branchId: selectedBranchId,
            appliedCoupon: appliedCoupon ? { ...appliedCoupon } : null
        };
        
        setPrintSnapshot(snapshot);
        
        if (Capacitor.isNativePlatform()) {
            // Trigger print directly for APK to avoid redundant modal step
            setTimeout(() => {
                handleConfirmPrint(snapshot);
            }, 500);
        } else {
            setShowPrintModal(true);
        }
    };

    /**
     * commitTransaction - Moves all database writes to post-print.
     * Guaranteed production safety and consistency.
     */
    const commitTransaction = useCallback(async (snapshot) => {
        if (!snapshot || isPrinting) return;
        setIsPrinting(true);
        
        try {
            console.log("System: Committing Transaction to Firestore...");
            
            // 1. Save Invoice
            await addDocument({
                id: snapshot.invoiceNo,
                cust: snapshot.customer.name,
                phone: snapshot.customer.phone,
                tableNo: snapshot.customer.tableNo,
                branch: snapshot.branch,
                branch_id: snapshot.branchId,
                type: snapshot.invType,
                design: selectedDesign,
                paymentMethod: snapshot.paymentMethod,
                items: snapshot.cart.map(i => ({ id: i.id, name: i.name, qty: i.qty, price: i.price })),
                amount: snapshot.grandTotal,
                tax: snapshot.taxAmount,
                discount: snapshot.discAmount,
                coupon: snapshot.appliedCoupon ? {
                    id: snapshot.appliedCoupon.id,
                    code: snapshot.appliedCoupon.code,
                    discount: couponDiscount
                } : null,
                status: 'Paid',
                date: snapshot.date,
                createdAt: new Date().toISOString()
            });

            // 2. Update Coupon Usage
            if (snapshot.appliedCoupon) {
                const { increment } = await import('firebase/firestore');
                await updateCoupon(snapshot.appliedCoupon.id, {
                    usedCount: increment(1)
                });
            }

            // 3. Online Payments
            if (snapshot.paymentMethod === 'Online') {
                await addCreditNote({
                    id: `CN-${Math.floor(Math.random() * 900000) + 100000}`,
                    invoiceRef: snapshot.invoiceNo,
                    customer: snapshot.customer.name,
                    branch: snapshot.branch,
                    branch_id: snapshot.branchId,
                    originalAmount: snapshot.grandTotal,
                    amount: snapshot.grandTotal,
                    reason: 'Online Payment - POS',
                    date: getLocalDate(),
                    createdAt: new Date().toISOString()
                });
            }

            // 4. Sales Order
            await addSalesOrder({
                id: `SO-${snapshot.invoiceNo.replace('INV-', '')}`,
                cust: snapshot.customer.name,
                branch: snapshot.branch,
                branch_id: snapshot.branchId,
                date: getLocalDate(),
                items: snapshot.cart.map(i => `${i.name} (${i.qty})`).join(', '),
                itemsCount: snapshot.cart.reduce((s, i) => s + i.qty, 0),
                amount: snapshot.grandTotal,
                paymentMethod: snapshot.paymentMethod,
                invoiceRef: snapshot.invoiceNo,
                type: snapshot.invType,
                status: 'Invoiced',
                createdAt: new Date().toISOString()
            });

            // 5. Inventory Deductions
            for (const item of snapshot.cart) {
                const productData = firestoreProducts.find(p => p.id === item.id);
                if (productData) {
                    const currentStock = parseInt(productData.stock, 10) || 0;
                    const newStock = Math.max(0, currentStock - item.qty);
                    await updateProduct(item.id, { stock: newStock });
                }
            }

            showToast("Order successfully completed!", "success");
            
            // Cleanup
            setCart([]);
            removeCoupon();
            setShowPrintModal(false);
            setPrintSnapshot(null);

        } catch (err) {
            console.error("Firestore Commit Error:", err);
            showToast("Critical Error: Database update failed. Contact Admin.", "error");
        } finally {
            setIsPrinting(false);
        }
    }, [addDocument, updateCoupon, addCreditNote, addSalesOrder, updateProduct, firestoreProducts, selectedDesign, couponDiscount, showToast, removeCoupon]);

    /**
     * handleConfirmPrint - Triggers the native print dialog and commits the transaction.
     */
    const handleConfirmPrint = async (passedSnapshot = null) => {
        // Guard: If passedSnapshot is a React Event object, ignore it and use the state printSnapshot.
        const theSnapshot = (passedSnapshot && typeof passedSnapshot === 'object' && 'invoiceNo' in passedSnapshot)
            ? passedSnapshot
            : printSnapshot;
        if (!theSnapshot) return showToast("No snapshot available.", "error");

        if (Capacitor.isNativePlatform()) {
            try {
                const printElement = document.getElementById('print-wrapper');
                if (printElement) {
                    // Extract all styles to bundle with HTML
                    const styles = Array.from(document.querySelectorAll('style, link[rel="stylesheet"]'))
                        .map(el => el.outerHTML)
                        .join('\n');
                    
                    const fullHtml = `
                        <!DOCTYPE html>
                        <html>
                        <head>
                            <meta charset="utf-8">
                            <meta name="viewport" content="width=device-width, initial-scale=1.0">
                            <title>Invoice - ${theSnapshot.invoiceNo}</title>
                            ${styles}
                            <style>
                                @page { margin: 0; }
                                * { 
                                    -webkit-print-color-adjust: exact !important;
                                    print-color-adjust: exact !important;
                                    color-adjust: exact !important;
                                }
                                body { 
                                    background: white !important; 
                                    margin: 0 !important; 
                                    padding: 0 !important; 
                                    width: 100% !important;
                                    color: #000 !important;
                                    font-smoothing: antialiased !important;
                                    -webkit-font-smoothing: antialiased !important;
                                }
                                #print-wrapper { 
                                    visibility: visible !important; 
                                    display: block !important; 
                                    width: 100% !important;
                                    margin: 0 !important;
                                    padding: 0 !important;
                                }
                                .invoice-preview { 
                                    box-shadow: none !important; 
                                    border: none !important;
                                    margin: 0 auto !important;
                                    max-width: 100% !important;
                                    color: #000 !important;
                                }
                                /* Clear View: Force all text to be crisp black */
                                .invoice-preview *, h1, h2, h3, p, span, td, th {
                                    color: #000 !important;
                                    text-shadow: none !important;
                                }
                                /* Fix for thermal printers alignment */
                                .invoice-preview.thermal {
                                    width: 100% !important;
                                    max-width: 80mm !important;
                                    margin: 0 !important;
                                }
                                /* Enhanced Table Clarity */
                                table { border-collapse: collapse !important; }
                                th, td { border-color: #000 !important; }
                            </style>
                        </head>
                        <body>
                            <div id="print-wrapper">
                                ${printElement.innerHTML}
                            </div>
                        </body>
                        </html>
                    `;

                    await NativePrinter.printHtml({
                        html: fullHtml,
                        name: `Invoice-${theSnapshot.invoiceNo}`
                    });
                    
                    // On mobile, we DO NOT commit immediately because it clears the cart/state.
                    // We show a message and wait a bit to simulate the browser's blocking behavior.
                    showToast('Printing started... Please wait.', 'info');
                    
                    setTimeout(() => {
                        commitTransaction(theSnapshot);
                    }, 3000); 
                } else {
                    showToast('Nothing to print!', 'error');
                }
            } catch (err) {
                console.error('Native print error:', err);
                showToast('Native printing failed.', 'error');
            }
        } else {
            // 500ms delay to ensure the DOM has painted the snapshot data in the PrintWrapper
            setTimeout(() => {
                window.print();
                // Commit transaction after print dialog is handled
                commitTransaction(theSnapshot);
            }, 500);
        }
    };

    // Remove old PrintSection component definition as it's now in PrintWrapper.jsx

    if (isDesktop) {
        return (
            <div className="page active" id="page-billing" style={{ background: 'var(--premium-bg)', height: 'calc(100vh - var(--topbar-h) - 3.5rem)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

                <div className="premium-pos-container" style={{ flex: 1, display: 'grid', gridTemplateColumns: '1fr 400px', gap: '1.5rem', height: '100%', minHeight: 0, overflow: 'hidden' }}>
                    <div className="pos-menu-section" style={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0, overflow: 'hidden' }}>
                        {/* Premium Header */}
                        <div className="premium-pos-header" style={{ marginBottom: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div>
                                <h1 style={{ fontSize: '2rem', fontWeight: '900', color: 'var(--premium-text-main)' }}>Menu</h1>
                                <p style={{ color: 'var(--premium-text-muted)', fontWeight: '600' }}>Choose from our wide variety of dishes</p>
                            </div>
                            <div className="premium-search" style={{ position: 'relative', width: '300px' }}>
                                <Search style={{ position: 'absolute', left: '15px', top: '50%', transform: 'translateY(-50%)', color: 'var(--premium-text-muted)' }} size={20} />
                                <input 
                                    type="text" 
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    placeholder="Search food..." 
                                    style={{ 
                                        width: '100%', 
                                        padding: '12px 12px 12px 45px', 
                                        borderRadius: '100px', 
                                        border: '1.5px solid var(--premium-border)',
                                        outline: 'none',
                                        fontSize: '1rem',
                                        fontWeight: '600'
                                    }}
                                />
                            </div>
                        </div>

                        {/* Premium Category Strip */}
                        <div className="premium-cat-strip" style={{ marginBottom: selectedCategoryObj?.subcategories?.length > 0 ? '0.75rem' : '2rem' }}>
                            {activeCategories.map(cat => (
                                <button
                                    key={cat.id}
                                    className={`premium-cat-pill ${currentCat === cat.id ? 'active' : ''}`}
                                    onClick={() => setCurrentCat(cat.id)}
                                >
                                    <span style={{ fontSize: '1.2rem' }}>{cat.icon}</span> {cat.name}
                                </button>
                            ))}
                        </div>

                        {/* Premium Subcategory Strip */}
                        {selectedCategoryObj?.subcategories?.length > 0 && (
                            <div className="premium-subcat-strip">
                                <button
                                    className={`premium-subcat-pill ${currentSubCat === 'all' ? 'active' : ''}`}
                                    onClick={() => setCurrentSubCat('all')}
                                >
                                    All
                                </button>
                                {[...selectedCategoryObj.subcategories]
                                    .sort((a, b) => (a.order || 0) - (b.order || 0))
                                    .map(sub => (
                                        <button
                                            key={sub.id}
                                            className={`premium-subcat-pill ${currentSubCat === sub.id ? 'active' : ''}`}
                                            onClick={() => setCurrentSubCat(sub.id)}
                                        >
                                            {sub.name}
                                        </button>
                                    ))
                                }
                            </div>
                        )}

                        <div className="pos-menu-scroll">
                            <div className="premium-food-grid adaptive-grid">
                                {filteredMenu.map(it => {
                                    const inCartItem = cart.find(c => c.id === it.id);
                                    const inQty = inCartItem ? inCartItem.qty : 0;
                                    return (
                                        <div key={it.id} className="premium-food-card">
                                            <div className="pfc-img-wrapper">
                                                <div className={`pfc-badge ${it.type}`}>
                                                    <span style={{ fontSize: '0.6rem' }}>●</span> {it.type === 'veg' ? 'VEG' : 'N-VEG'}
                                                </div>
                                                {getItemImage(it) ? (
                                                    <img src={getItemImage(it)} className="pfc-img" alt={it.name} />
                                                ) : (
                                                    <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '3rem' }}>🥘</div>
                                                )}
                                            </div>
                                            <div className="pfc-content">
                                                <div className="pfc-name">{it.name}</div>
                                                <div className="pfc-footer">
                                                    <div className="pfc-price">₹{Number(it.price || 0).toFixed(2)}</div>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                        {it.stock > 0 && <span className="pfc-stock">✓{it.stock}</span>}
                                                        {inQty > 0 ? (
                                                            <div className="pfc-stepper">
                                                                <button className="pfc-step-btn" onClick={() => updateCartQty(it.id, -1)}><Minus size={14} /></button>
                                                                <span className="pfc-qty">{inQty}</span>
                                                                <button className="pfc-step-btn" onClick={() => updateCartQty(it.id, 1)}><Plus size={14} /></button>
                                                            </div>
                                                        ) : (
                                                            <button className="pfc-add-btn" onClick={() => addToCart(it)}>
                                                                <Plus size={24} />
                                                            </button>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </div>

                    {/* Premium Cart Sidebar */}
                    <div className="premium-cart-sidebar">
                        <div className="pcs-header">
                            <div className="pcs-title-wrap">
                                <div className="pcs-icon-bg">
                                    <ShoppingCart size={24} />
                                </div>
                                <h2 className="pcs-title">Order Details</h2>
                            </div>
                            <div className="pcs-payment-tabs">
                                <button 
                                    className={`pcs-pay-tab ${paymentMethod === 'Cash' ? 'active' : ''}`}
                                    onClick={() => setPaymentMethod('Cash')}
                                >
                                    <Banknote size={18} /> Cash
                                </button>
                                <button 
                                    className={`pcs-pay-tab ${paymentMethod === 'Online' ? 'active' : ''}`}
                                    onClick={() => setPaymentMethod('Online')}
                                >
                                    <CreditCard size={18} /> Online
                                </button>
                            </div>
                        </div>
                        <div className="pcs-body" style={{ overflowY: 'auto' }}>
                            {cart.length === 0 ? (
                                <div className="pcs-empty">
                                    <div style={{ fontSize: '5rem', marginBottom: '1rem' }}>🛒</div>
                                    <div className="pcs-empty-text">Cart is empty</div>
                                </div>
                            ) : (
                                <div className="pcs-items-list" style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                    {cart.map(c => (
                                        <div key={c.id} className="pcs-item">
                                            <div className="pcs-item-info">
                                                <div className="pcs-item-name">{c.name}</div>
                                                <div className="pcs-item-price">₹{c.price.toFixed(2)}</div>
                                            </div>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                                <div className="pcs-stepper">
                                                    <button className="pcs-step-btn" onClick={() => updateCartQty(c.id, -1)}><Minus size={12} /></button>
                                                    <span className="pcs-qty">{c.qty}</span>
                                                    <button className="pcs-step-btn" onClick={() => updateCartQty(c.id, 1)}><Plus size={12} /></button>
                                                </div>
                                                <div style={{ fontWeight: '900', color: '#1e293b', width: '70px', textAlign: 'right', fontSize: '1.05rem' }}>
                                                    ₹{(c.price * c.qty).toFixed(2)}
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        <div className="pcs-footer">
                            {/* New Coupon Component */}
                            <div className="mb-4">
                                <CouponSection 
                                    couponCode={couponCode}
                                    setCouponCode={setCouponCode}
                                    appliedCoupon={appliedCoupon}
                                    couponError={couponError}
                                    applyCoupon={applyCoupon}
                                    removeCoupon={removeCoupon}
                                    subtotal={subtotal}
                                />
                            </div>

                            <div className="pcs-total-line">
                                <span className="pcs-total-label">Total Amount</span>
                                <span className="pcs-total-amount">₹{grandTotal.toFixed(2)}</span>
                            </div>
                            <div className="pcs-actions" style={{ paddingBottom: '10px' }}>
                                <button className="pcs-confirm-btn" onClick={printBill} style={{ height: '56px', padding: '0 1.5rem', borderRadius: '100px', fontWeight: '900', textTransform: 'uppercase', boxShadow: '0 8px 24px rgba(79, 70, 229, 0.3)' }}>
                                    <Printer size={20} /> CONFIRM & PRINT
                                </button>
                                <button className="pcs-clear-btn" onClick={clearCart} style={{ borderRadius: '20px' }}>
                                    <Trash2 size={24} />
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Print Modal for Premium View */}
                {showPrintModal && (
                    <div className="invoice-modal-overlay">
                        <div className="invoice-modal-content">
                            <div className="invoice-modal-header">
                                <div className="invoice-design-picker">
                                    {['Standard', 'Elegant', 'Thermal'].map(d => (
                                        <button
                                            key={d}
                                            className={`design-btn ${selectedDesign === d ? 'active' : ''}`}
                                            onClick={() => setSelectedDesign(d)}
                                        >
                                            {d}
                                        </button>
                                    ))}
                                </div>
                                <button className="btn btn-ghost" onClick={() => setShowPrintModal(false)} style={{ fontSize: '1.5rem' }}>✕</button>
                            </div>
                            <div className="invoice-modal-body" id="printable-area">
                                {selectedDesign === 'Standard' && printSnapshot && (
                                    <StandardTemplate
                                        cart={printSnapshot.cart}
                                        customer={printSnapshot.customer}
                                        subtotal={printSnapshot.subtotal}
                                        taxAmount={printSnapshot.taxAmount}
                                        discAmount={printSnapshot.discAmount}
                                        grandTotal={printSnapshot.grandTotal}
                                        invoiceNo={printSnapshot.invoiceNo}
                                        date={printSnapshot.date}
                                        invType={printSnapshot.invType}
                                        storeProfile={printSnapshot.storeProfile}
                                        couponCode={printSnapshot.couponCode}
                                    />
                                )}
                                {selectedDesign === 'Elegant' && printSnapshot && (
                                    <ElegantTemplate
                                        cart={printSnapshot.cart}
                                        customer={printSnapshot.customer}
                                        subtotal={printSnapshot.subtotal}
                                        taxAmount={printSnapshot.taxAmount}
                                        discAmount={printSnapshot.discAmount}
                                        grandTotal={printSnapshot.grandTotal}
                                        invoiceNo={printSnapshot.invoiceNo}
                                        date={printSnapshot.date}
                                        invType={printSnapshot.invType}
                                        storeProfile={printSnapshot.storeProfile}
                                        couponCode={printSnapshot.couponCode}
                                    />
                                )}
                                {selectedDesign === 'Thermal' && printSnapshot && (
                                    <ThermalTemplate
                                        cart={printSnapshot.cart}
                                        customer={printSnapshot.customer}
                                        subtotal={printSnapshot.subtotal}
                                        taxAmount={printSnapshot.taxAmount}
                                        discAmount={printSnapshot.discAmount}
                                        grandTotal={printSnapshot.grandTotal}
                                        invoiceNo={printSnapshot.invoiceNo}
                                        date={printSnapshot.date}
                                        invType={printSnapshot.invType}
                                        storeProfile={printSnapshot.storeProfile}
                                        couponCode={printSnapshot.couponCode}
                                    />
                                )}
                            </div>
                            <div className="invoice-modal-footer">
                                <button className="btn btn-outline" onClick={() => setShowPrintModal(false)}>Cancel</button>
                                <button className="btn btn-primary" onClick={() => handleConfirmPrint()}>Confirm & Print</button>
                            </div>
                        </div>
                    </div>
                )}
                <PrintWrapper ref={printRef} snapshot={printSnapshot} selectedDesign={selectedDesign} />
            </div>
        );
    }

    return (
        <div
            className="page active"
            id="page-billing"
            style={{
                background: '#f8fafc',
                ...(isTablet && quickOrderMode ? {
                    display: 'flex',
                    flexDirection: 'column',
                    flex: 1,
                    minHeight: 0,
                    overflow: 'hidden',
                    padding: 0
                } : {})
            }}
        >

            {/* Header Section */}
            <div className="pos-header-premium" style={{ marginTop: isMobile ? '0.5cm' : '0' }}>
                <div className="pos-header-left">
                    <div className="menu-icon-bg" style={{ background: 'var(--accent-light)', color: 'var(--accent)' }}>
                        <ShoppingCart size={24} />
                    </div>
                    <h1 className="pos-header-title">Order Products</h1>
                    <button className="btn btn-primary btn-sm" onClick={() => { setCart([]); showToast('New order started!', 'info'); }}>
                        <Plus size={16} /> Order New Product
                    </button>
                    <div className="branch-indicator" style={{ marginLeft: '1rem' }}>
                        {(userRole === 'admin' || userRole === 'owner') ? (
                            <div className="branch-select-wrap">
                                <Store size={14} className="branch-icon" />
                                <select
                                    value={selectedBranchId}
                                    onChange={e => {
                                        const bId = e.target.value;
                                        setSelectedBranchId(bId);
                                        if (bId === 'main') {
                                            setSelectedBranchName('Main Branch');
                                        } else {
                                            const br = branches.find(b => b.id === bId);
                                            if (br) setSelectedBranchName(`${br.name} — ${br.city}`);
                                        }
                                    }}
                                    className="branch-minimal-select"
                                >
                                    <option value="main">Main Branch</option>
                                    {branches.map(br => (
                                        <option key={br.id} value={br.id}>{br.name}</option>
                                    ))}
                                </select>
                            </div>
                        ) : (
                            <span className="branch-badge">
                                <Store size={12} /> {selectedBranchName}
                            </span>
                        )}
                    </div>
                </div>

                <div className="pos-header-right">
                    {/* Mode Toggle — tablet only */}
                    {isTablet && (
                        <div className="qo-mode-toggle" style={{ marginRight: '0.5rem' }}>
                            <button
                                className={`qo-mode-btn ${quickOrderMode ? 'active' : ''}`}
                                onClick={() => setQuickOrderMode(true)}
                            >⚡ Quick Order</button>
                            <button
                                className={`qo-mode-btn ${!quickOrderMode ? 'active' : ''}`}
                                onClick={() => setQuickOrderMode(false)}
                            >🖼 Menu Grid</button>
                        </div>
                    )}
                    {!isMobile && !quickOrderMode && (
                        <div className="search-bar-premium" style={{ width: '300px' }}>
                            <Search size={18} className="search-icon" />
                            <input
                                type="text"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                placeholder="Find products..."
                            />
                        </div>
                    )}
                    <div className="pos-invoice-info">
                        <span className="pos-inv-no"># {invoiceNo}</span>
                        <input
                            type="date"
                            value={invoiceDate}
                            onChange={(e) => setInvoiceDate(e.target.value)}
                            className="pos-inv-date"
                            style={{ border: 'none', background: 'transparent', textAlign: 'right', outline: 'none' }}
                        />
                    </div>
                </div>
            </div>

            {/* ══════════════════════════════════════════════
                 QUICK ORDER MODE — Tablet Split-Panel
                 Renders when: isTablet && quickOrderMode
            ══════════════════════════════════════════════ */}
            {isTablet && quickOrderMode && (
                <div className="qo-container" style={{ flex: 1, height: 'auto', minHeight: 0 }}>

                    {/* ── LEFT: Menu Panel ── */}
                    <div className="qo-menu-panel">

                        {/* Search bar — top */}
                        <div className="qo-search-bar">
                            <Search size={16} color="#94a3b8" />
                            <input
                                className="qo-search-input"
                                type="text"
                                value={searchTerm}
                                onChange={e => setSearchTerm(e.target.value)}
                                placeholder="Search products by name..."
                            />
                        </div>

                        {/* Category tabs */}
                        <div className="qo-cat-strip" style={{ borderBottom: selectedCategoryObj?.subcategories?.length > 0 ? 'none' : '1px solid #e2e8f0' }}>
                            {activeCategories.map(cat => (
                                <button
                                    key={cat.id}
                                    className={`qo-cat-pill ${currentCat === cat.id ? 'active' : ''}`}
                                    onClick={() => setCurrentCat(cat.id)}
                                >
                                    <span>{cat.icon}</span>{cat.name}
                                </button>
                            ))}
                        </div>

                        {/* Tablet Subcategory strip */}
                        {selectedCategoryObj?.subcategories?.length > 0 && (
                            <div className="qo-subcat-strip">
                                <button
                                    className={`qo-subcat-pill ${currentSubCat === 'all' ? 'active' : ''}`}
                                    onClick={() => setCurrentSubCat('all')}
                                >
                                    All
                                </button>
                                {[...selectedCategoryObj.subcategories]
                                    .sort((a, b) => (a.order || 0) - (b.order || 0))
                                    .map(sub => (
                                        <button
                                            key={sub.id}
                                            className={`qo-subcat-pill ${currentSubCat === sub.id ? 'active' : ''}`}
                                            onClick={() => setCurrentSubCat(sub.id)}
                                        >
                                            {sub.name}
                                        </button>
                                    ))
                                }
                            </div>
                        )}

                        {/* Item list — 2 columns, text only */}
                        <div className="qo-item-list">
                            {filteredMenu.length === 0 ? (
                                <div style={{ gridColumn: '1/-1', display: 'flex', alignItems: 'center', justifyContent: 'center', height: '200px', color: '#94a3b8', fontWeight: 600, flexDirection: 'column', gap: '8px' }}>
                                    <span style={{ fontSize: '2rem' }}>🥘</span>
                                    No items found
                                </div>
                            ) : filteredMenu.map(it => {
                                const cartItem = cart.find(c => c.id === it.id);
                                const inQty   = cartItem ? cartItem.qty : 0;
                                return (
                                    <div
                                        key={it.id}
                                        className={`qo-item-row ${inQty > 0 ? 'in-cart' : ''}`}
                                        onClick={() => { if (inQty === 0) addToCart(it); }}
                                    >
                                        {/* Veg/Non-veg dot */}
                                        <span className={`qo-veg-dot ${it.type === 'veg' ? 'veg' : 'nveg'}`} />

                                        {/* Name */}
                                        <span className="qo-item-name" title={it.name}>{it.name}</span>

                                        {/* Price */}
                                        <span className="qo-item-price">₹{Number(it.price || 0).toFixed(0)}</span>

                                        {/* Action: stepper if in cart, else + button */}
                                        {inQty > 0 ? (
                                            <div className="qo-mini-stepper" onClick={e => e.stopPropagation()}>
                                                <button className="qo-mini-btn" onClick={() => updateCartQty(it.id, -1)}><Minus size={10} /></button>
                                                <span className="qo-mini-qty">{inQty}</span>
                                                <button className="qo-mini-btn" onClick={() => updateCartQty(it.id, 1)}><Plus size={10} /></button>
                                            </div>
                                        ) : (
                                            <button
                                                className="qo-add-btn"
                                                onClick={e => { e.stopPropagation(); addToCart(it); }}
                                            ><Plus size={14} /></button>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* ── RIGHT: Order Panel ── */}
                    <div className="qo-order-panel">

                        {/* Header row */}
                        <div className="qo-order-header">
                            <div className="qo-order-title">
                                <ShoppingCart size={18} />
                                Order
                                {cartCount > 0 && <span className="qo-order-count">{cartCount}</span>}
                            </div>
                            <button
                                style={{ background: '#fee2e2', border: 'none', color: '#ef4444', borderRadius: '8px', padding: '6px 10px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', fontWeight: 700, fontSize: '0.75rem' }}
                                onClick={clearCart}
                                title="Clear order"
                            >
                                <Trash2 size={14} /> Clear
                            </button>
                        </div>

                        {/* Payment method toggle */}
                        <div className="qo-pay-toggle">
                            <button className={`qo-pay-btn ${paymentMethod === 'Cash' ? 'active' : ''}`} onClick={() => setPaymentMethod('Cash')}>
                                <Banknote size={13} /> Cash
                            </button>
                            <button className={`qo-pay-btn ${paymentMethod === 'Online' ? 'active' : ''}`} onClick={() => setPaymentMethod('Online')}>
                                <CreditCard size={13} /> Online
                            </button>
                        </div>

                        {/* Order items list */}
                        <div className="qo-order-body">
                            {cart.length === 0 ? (
                                <div className="qo-empty">
                                    <ShoppingCart size={36} strokeWidth={1.5} />
                                    <span>No items added yet</span>
                                    <span style={{ fontSize: '0.75rem' }}>Tap a product to add</span>
                                </div>
                            ) : cart.map(c => (
                                <div key={c.id} className="qo-order-row">
                                    <span className="qo-order-row-name" title={c.name}>{c.name}</span>
                                    <div className="qo-order-stepper">
                                        <button className="qo-order-step-btn" onClick={() => updateCartQty(c.id, -1)}><Minus size={11} /></button>
                                        <span className="qo-order-qty">{c.qty}</span>
                                        <button className="qo-order-step-btn" onClick={() => updateCartQty(c.id, 1)}><Plus size={11} /></button>
                                    </div>
                                    <span className="qo-order-total">₹{(c.price * c.qty).toFixed(0)}</span>
                                </div>
                            ))}
                        </div>

                        {/* Summary + Print */}
                        <div className="qo-order-footer">
                            <div className="qo-summary-row">
                                <span>Subtotal</span>
                                <span>₹{subtotal.toFixed(2)}</span>
                            </div>
                            {discAmount > 0 && (
                                <div className="qo-summary-row" style={{ color: '#10b981' }}>
                                    <span>Discount</span>
                                    <span>-₹{discAmount.toFixed(2)}</span>
                                </div>
                            )}
                            <div className="qo-summary-row">
                                <span>Tax ({taxPct}%)</span>
                                <span>₹{taxAmount.toFixed(2)}</span>
                            </div>
                            <div className="qo-grand-row">
                                <span className="qo-grand-label">Grand Total</span>
                                <span className="qo-grand-amount">₹{grandTotal.toFixed(2)}</span>
                            </div>
                            <button
                                className="qo-print-btn"
                                onClick={printBill}
                                disabled={cart.length === 0}
                                style={{ opacity: cart.length === 0 ? 0.5 : 1, cursor: cart.length === 0 ? 'not-allowed' : 'pointer' }}
                            >
                                <Printer size={18} /> CONFIRM &amp; PRINT
                            </button>
                            <button className="qo-clear-link" onClick={clearCart}>Clear Order</button>
                        </div>
                    </div>

                    {/* Reuse existing print modal */}
                    {showPrintModal && (
                        <div className="invoice-modal-overlay">
                            <div className="invoice-modal-content">
                                <div className="invoice-modal-header">
                                    <div className="invoice-design-picker">
                                        {['Standard', 'Elegant', 'Thermal'].map(d => (
                                            <button key={d} className={`design-btn ${selectedDesign === d ? 'active' : ''}`} onClick={() => setSelectedDesign(d)}>{d}</button>
                                        ))}
                                    </div>
                                    <button className="btn btn-ghost" onClick={() => setShowPrintModal(false)} style={{ fontSize: '1.5rem' }}>✕</button>
                                </div>
                                <div className="invoice-modal-body" id="printable-area">
                                    {selectedDesign === 'Standard' && printSnapshot && <StandardTemplate cart={printSnapshot.cart} customer={printSnapshot.customer} subtotal={printSnapshot.subtotal} taxAmount={printSnapshot.taxAmount} discAmount={printSnapshot.discAmount} grandTotal={printSnapshot.grandTotal} invoiceNo={printSnapshot.invoiceNo} date={printSnapshot.date} invType={printSnapshot.invType} storeProfile={printSnapshot.storeProfile} couponCode={printSnapshot.couponCode} />}
                                    {selectedDesign === 'Elegant' && printSnapshot && <ElegantTemplate cart={printSnapshot.cart} customer={printSnapshot.customer} subtotal={printSnapshot.subtotal} taxAmount={printSnapshot.taxAmount} discAmount={printSnapshot.discAmount} grandTotal={printSnapshot.grandTotal} invoiceNo={printSnapshot.invoiceNo} date={printSnapshot.date} invType={printSnapshot.invType} storeProfile={printSnapshot.storeProfile} couponCode={printSnapshot.couponCode} />}
                                    {selectedDesign === 'Thermal' && printSnapshot && <ThermalTemplate cart={printSnapshot.cart} customer={printSnapshot.customer} subtotal={printSnapshot.subtotal} taxAmount={printSnapshot.taxAmount} discAmount={printSnapshot.discAmount} grandTotal={printSnapshot.grandTotal} invoiceNo={printSnapshot.invoiceNo} date={printSnapshot.date} invType={printSnapshot.invType} storeProfile={printSnapshot.storeProfile} couponCode={printSnapshot.couponCode} />}
                                </div>
                                <div className="invoice-modal-footer">
                                    <button className="btn btn-outline" onClick={() => setShowPrintModal(false)}>Cancel</button>
                                    <button className="btn btn-primary" onClick={() => handleConfirmPrint()}>Confirm &amp; Print</button>
                                </div>
                            </div>
                        </div>
                    )}
                    <PrintWrapper ref={printRef} snapshot={printSnapshot} selectedDesign={selectedDesign} />
                </div>
            )}

            {/* ══ EXISTING MENU GRID (shown when NOT in Quick Order mode) ══ */}
            {(!isTablet || !quickOrderMode) && (
            <>
            <div className="billing-grid">
                {/* Product List Area */}
                <div className="pos-menu-section">
                    {isMobile && (
                        <div className="search-bar-premium mobile-search" style={{ marginBottom: '1rem', width: '100%', borderRadius: '12px' }}>
                            <Search size={18} className="search-icon" />
                            <input
                                type="text"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                placeholder="Find products..."
                                style={{ width: '100%' }}
                            />
                        </div>
                    )}
                    <div className="cat-strip" id="cat-strip" style={{ 
                        marginBottom: selectedCategoryObj?.subcategories?.length > 0 ? '0.5rem' : '1.5rem', 
                        padding: '0.5rem 0',
                        overflowX: isMobile ? 'auto' : 'visible',
                        display: 'flex',
                        gap: isMobile ? '8px' : '0.5rem',
                        WebkitOverflowScrolling: 'touch',
                        scrollbarWidth: 'none',
                        msOverflowStyle: 'none'
                    }}>
                        {activeCategories.map(cat => (
                            <button
                                key={cat.id}
                                className={`cat-pill ${currentCat === cat.id ? 'active' : ''}`}
                                onClick={() => setCurrentCat(cat.id)}
                                style={{
                                    fontSize: isMobile ? '0.78rem' : 'inherit',
                                    padding: isMobile ? '6px 12px' : 'inherit',
                                    flexShrink: 0
                                }}
                            >
                                <span className="cat-icon">{cat.icon}</span> {cat.name}
                            </button>
                        ))}
                    </div>

                    {/* Mobile / General Subcategory strip */}
                    {selectedCategoryObj?.subcategories?.length > 0 && (
                        <div className="subcat-strip" style={{
                            marginBottom: '1rem',
                            padding: '0.2rem 0',
                            overflowX: 'auto',
                            display: 'flex',
                            gap: '8px',
                            WebkitOverflowScrolling: 'touch',
                            scrollbarWidth: 'none',
                            msOverflowStyle: 'none'
                        }}>
                            <button
                                className={`subcat-pill ${currentSubCat === 'all' ? 'active' : ''}`}
                                onClick={() => setCurrentSubCat('all')}
                                style={{
                                    fontSize: isMobile ? '0.75rem' : '0.85rem',
                                    padding: isMobile ? '4px 10px' : '6px 12px',
                                    flexShrink: 0
                                }}
                            >
                                All
                            </button>
                            {[...selectedCategoryObj.subcategories]
                                .sort((a, b) => (a.order || 0) - (b.order || 0))
                                .map(sub => (
                                    <button
                                        key={sub.id}
                                        className={`subcat-pill ${currentSubCat === sub.id ? 'active' : ''}`}
                                        onClick={() => setCurrentSubCat(sub.id)}
                                        style={{
                                            fontSize: isMobile ? '0.75rem' : '0.85rem',
                                            padding: isMobile ? '4px 10px' : '6px 12px',
                                            flexShrink: 0
                                        }}
                                    >
                                        {sub.name}
                                    </button>
                                ))
                            }
                        </div>
                    )}

                    <div className="food-grid adaptive-grid" id="food-grid">
                        {filteredMenu.length === 0 ? (
                            <div className="empty-state" style={{ gridColumn: '1 / -1', padding: '5rem 1rem', background: 'white', borderRadius: '24px', border: '1px dashed var(--border)' }}>
                                <div className="es-icon" style={{ fontSize: '3rem', opacity: 0.5 }}>🥘</div>
                                <h3 style={{ marginTop: '1rem', color: 'var(--muted)' }}>Product list is empty</h3>
                                <p style={{ fontSize: '0.9rem', color: 'var(--muted2)' }}>Try changing your search or category filter</p>
                            </div>
                        ) : (
                            filteredMenu.map(it => {
                                const inCartItem = cart.find(c => c.id === it.id);
                                const inQty = inCartItem ? inCartItem.qty : 0;

                                return (
                                    <div
                                        key={it.id}
                                        className={`food-card-v2 ${inQty > 0 ? 'in-cart' : ''} ${it.stock <= 0 ? 'oos' : ''}`}
                                    >
                                        <div className="fc2-img-container">
                                            <div className="fc2-type-badge" style={{ background: it.type === 'veg' ? '#10b981' : '#ef4444' }}></div>
                                            {getItemImage(it) ? (
                                                <img 
                                                    src={getItemImage(it)} 
                                                    className="fc2-img" 
                                                    alt={it.name}
                                                    onError={(e) => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'flex'; }}
                                                />
                                            ) : null}
                                            <div className="fc2-ph" style={{ display: getItemImage(it) ? 'none' : 'flex' }}>
                                                <span className="fc2-ph-icon">🥘</span>
                                            </div>
                                        </div>

                                        <div className="fc2-content">
                                            <div className="fc2-name">{it.name}</div>
                                            
                                            <div className="fc2-footer">
                                                <div className="fc2-price">₹{Number(it.price || 0).toFixed(2)}</div>
                                                
                                                <div className="fc2-stock-wrap">
                                                    {it.stock > 0 && (
                                                        <span className="fc2-stock-tag">
                                                            <span className="check">✓</span>{it.stock}
                                                        </span>
                                                    )}
                                                </div>

                                                <div className="fc2-action">
                                                    {inQty > 0 ? (
                                                        <div className="fc2-stepper-mini">
                                                            <button className="fc2-mini-btn" onClick={(e) => { e.stopPropagation(); updateCartQty(it.id, -1); }}><Minus size={12} /></button>
                                                            <span className="fc2-mini-qty">{inQty}</span>
                                                            <button className="fc2-mini-btn" onClick={(e) => { e.stopPropagation(); updateCartQty(it.id, 1); }}><Plus size={12} /></button>
                                                        </div>
                                                    ) : (
                                                        <button className="fc2-add-btn" onClick={(e) => { e.stopPropagation(); addToCart(it); }}>
                                                            <Plus size={18} />
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })
                        )}
                    </div>
                </div>

                {/* Right Panel Cart (Desktop/Tablet) */}
                {!isMobile && (
                    <div className="pos-cart-panel premium-cart" style={{ width: isTablet ? '300px' : '360px' }}>
                    <div className="cart-header-premium" style={{ borderBottom: '1px solid var(--border)', paddingBottom: '1rem' }}>
                        <div className="cart-icon-title">
                            <div className="cart-icon-circle" style={{ background: 'var(--accent-light)', color: 'var(--accent)' }}>
                                <ShoppingCart size={20} />
                                {cartCount > 0 && <span className="cart-badge-dot">{cartCount}</span>}
                            </div>
                            <span className="premium-cart-title" style={{ fontSize: '1.2rem' }}>Order Details</span>
                        </div>
                        <div className="payment-toggle-modern" style={{ marginTop: '1rem' }}>
                            <button
                                onClick={() => setPaymentMethod('Cash')}
                                className={`pay-btn ${paymentMethod === 'Cash' ? 'active' : ''}`}
                            >
                                <Banknote size={14} /> Cash
                            </button>
                            <button
                                onClick={() => setPaymentMethod('Online')}
                                className={`pay-btn ${paymentMethod === 'Online' ? 'active' : ''}`}
                            >
                                <CreditCard size={14} /> Online
                            </button>
                        </div>
                    </div>

                    <div className="cart-body-premium" id="cart-body" style={{ overflowY: 'auto' }}>
                        {cart.length === 0 ? (
                            <div className="cart-empty-premium" style={{ opacity: 0.6 }}>
                                <div className="empty-cart-illustration">🛒</div>
                                <h3>Cart is empty</h3>
                            </div>
                        ) : (
                            <div className="cart-items-list">
                                {cart.map(c => (
                                    <div key={c.id} className="cart-item-modern">
                                        <div className="item-main-info">
                                            <div className="item-name-bold">{c.name}</div>
                                            <div className="item-price-detail">₹{c.price.toFixed(2)}</div>
                                        </div>
                                        <div className="item-actions-row">
                                            <div className="qty-stepper-modern">
                                                <button className="stepper-btn" onClick={() => updateCartQty(c.id, -1)}><Minus size={12} /></button>
                                                <span className="qty-display">{c.qty}</span>
                                                <button className="stepper-btn" onClick={() => updateCartQty(c.id, 1)}><Plus size={12} /></button>
                                            </div>
                                            <div className="item-total-price">₹{(c.price * c.qty).toFixed(2)}</div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                        <div className="cart-footer-premium">
                            {/* Auto-Coupon Display Desktop (Manual input removed, only show applied state) */}
                            {appliedCoupon && (
                                <div className="coupon-entry-premium" style={{ marginBottom: '1rem', padding: '0.5rem', background: '#f8fafc', borderRadius: '16px', border: '1px solid #edf2f7' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#ecfdf5', padding: '10px 14px', borderRadius: '12px', border: '1px solid #10b98150' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                            <div style={{ width: '24px', height: '24px', borderRadius: '6px', background: '#10b981', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white' }}>
                                                <Tag size={14} />
                                            </div>
                                            <span style={{ fontSize: '0.8rem', fontWeight: '900', color: '#065f46', letterSpacing: '0.05em' }}>{appliedCoupon.code}</span>
                                        </div>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                            <span style={{ fontSize: '0.9rem', fontWeight: '900', color: '#10b981' }}>-₹{couponDiscount.toFixed(2)}</span>
                                            <button onClick={removeCoupon} style={{ background: '#fee2e2', border: 'none', color: '#ef4444', borderRadius: '6px', width: '24px', height: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}><X size={14} /></button>
                                        </div>
                                    </div>
                                </div>
                            )}

                            <div className="billing-summary-premium" style={{ marginBottom: '1rem', borderBottom: '1.5px dashed var(--premium-border)', paddingBottom: '1rem' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem', fontSize: '0.85rem', fontWeight: 700, color: '#64748b' }}>
                                    <span>Subtotal</span>
                                    <span>₹{subtotal.toFixed(2)}</span>
                                </div>
                                {discAmount > 0 && (
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem', fontSize: '0.85rem', fontWeight: 800, color: '#10b981' }}>
                                        <span>Discount {appliedCoupon ? `(${appliedCoupon.code})` : ''}</span>
                                        <span>-₹{discAmount.toFixed(2)}</span>
                                    </div>
                                )}
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.8rem', fontSize: '0.85rem', fontWeight: 700, color: '#64748b' }}>
                                    <span>Tax ({taxPct}%)</span>
                                    <span>₹{taxAmount.toFixed(2)}</span>
                                </div>
                                <div className="summary-line total" style={{ padding: '0.5rem 0', borderTop: '1px solid #f1f5f9' }}>
                                    <span style={{ fontSize: '1rem', fontWeight: '900' }}>To Pay</span>
                                    <span className="total-amount" style={{ color: 'var(--accent)', fontSize: '1.5rem', fontWeight: '900' }}>₹{grandTotal.toFixed(2)}</span>
                                </div>
                            </div>
                            <div className="cart-action-buttons" style={{ display: 'grid', gridTemplateColumns: '1fr 60px', gap: '0.5rem', paddingBottom: '10px' }}>
                                <button className="btn-vibe-primary bill-submit-btn" onClick={printBill} style={{ background: 'var(--pos-gradient)', borderRadius: '100px', height: '56px', padding: '0 1.5rem', fontWeight: '900', textTransform: 'uppercase', boxShadow: '0 8px 24px rgba(79, 70, 229, 0.3)' }}>
                                    <Printer size={18} /> CONFIRM & PRINT
                                </button>
                                <button className="btn-vibe-danger cart-clear-btn" onClick={clearCart} style={{ borderRadius: '20px' }}>
                                    <Trash2 size={18} />
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
            </>
            )}

            {/* Mobile Sticky Cart Bar */}
            {isMobileOrTablet && cartCount > 0 && !cartExpanded && (
                <div className="pos-swiggy-cart-bar" onClick={() => setCartExpanded(true)}>
                    <div className="scb-left">
                        <span className="scb-items">{cartCount} ITEM{cartCount > 1 ? 'S' : ''}</span>
                        <span className="scb-divider">|</span>
                        <span className="scb-price">₹{grandTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                    </div>
                    <div className="scb-right">
                        <span>View Bill ({cartCount})</span>
                        <ShoppingCart size={18} />
                    </div>
                </div>
            )}

            {/* Mobile Expanded Cart View (Order Details Page) */}
            {isMobileOrTablet && cartExpanded && (
                <div className="pos-cart expanded-mobile" style={{ 
                    position: 'fixed', 
                    inset: 0, 
                    zIndex: 10000, 
                    background: '#f8fafc',
                    display: 'flex',
                    flexDirection: 'column',
                    animation: 'slideInRight 0.3s ease-out'
                }}>
                    <div className="cart-header-premium" style={{ 
                        padding: '1.2rem 1.5rem', 
                        background: 'white',
                        boxShadow: '0 2px 10px rgba(0,0,0,0.05)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '1rem'
                    }}>
                        <button className="cart-back-btn" onClick={() => setCartExpanded(false)} style={{
                            background: '#f1f5f9',
                            border: 'none',
                            padding: '10px',
                            borderRadius: '12px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                        }}>
                            <ArrowLeft size={20} />
                        </button>
                        <span className="premium-cart-title" style={{ fontSize: '1.25rem', fontWeight: '800' }}>Order Details</span>
                    </div>

                    <div className="cart-body-premium" style={{ 
                        flex: 1, 
                        overflowY: 'auto', 
                        padding: '1rem',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '1rem'
                    }}>
                        {cart.length === 0 ? (
                            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', opacity: 0.5 }}>
                                <ShoppingCart size={64} strokeWidth={1.5} />
                                <p style={{ marginTop: '1rem', fontWeight: '600' }}>Your cart is empty</p>
                            </div>
                        ) : (
                            cart.map(c => (
                                <div key={c.id} className="cart-item-modern-v2" style={{ 
                                    background: 'white', 
                                    padding: '1rem', 
                                    borderRadius: '20px',
                                    border: '1px solid #edf2f7',
                                    display: 'flex',
                                    gap: '1rem',
                                    alignItems: 'center'
                                }}>
                                    <div style={{ width: '60px', height: '60px', borderRadius: '12px', overflow: 'hidden', background: '#f8fafc', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid #edf2f7' }}>
                                        {getItemImage(c) ? (
                                            <img src={getItemImage(c)} alt={c.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                        ) : (
                                            <span style={{ fontSize: '1.5rem' }}>🥘</span>
                                        )}
                                    </div>
                                    <div style={{ flex: 1 }}>
                                        <div style={{ fontWeight: '700', fontSize: '0.95rem', marginBottom: '2px' }}>{c.name}</div>
                                        <div style={{ fontWeight: '800', color: 'var(--accent)', fontSize: '0.9rem' }}>₹{c.price.toFixed(2)}</div>
                                    </div>
                                    <div className="qty-stepper-modern" style={{ background: '#f1f5f9', borderRadius: '12px', padding: '4px' }}>
                                        <button className="stepper-btn" onClick={() => updateCartQty(c.id, -1)} style={{ width: '30px', height: '30px' }}><Minus size={14} /></button>
                                        <span className="qty-display" style={{ width: '30px', fontWeight: '800' }}>{c.qty}</span>
                                        <button className="stepper-btn" onClick={() => updateCartQty(c.id, 1)} style={{ width: '30px', height: '30px' }}><Plus size={14} /></button>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>

                    <div className="cart-footer-premium" style={{ 
                        padding: '1.5rem', 
                        background: 'white', 
                        borderTop: '1px solid #edf2f7',
                        borderTopLeftRadius: '24px',
                        borderTopRightRadius: '24px'
                    }}>
                        {/* Restored Full Coupon Module for Mobile Bulk Codes */}
                        <CouponSection 
                            couponCode={couponCode}
                            setCouponCode={setCouponCode}
                            appliedCoupon={appliedCoupon}
                            couponError={couponError}
                            applyCoupon={applyCoupon}
                            removeCoupon={removeCoupon}
                            subtotal={subtotal}
                        />

                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1.2rem', alignItems: 'center' }}>
                            <span style={{ fontWeight: '700', color: '#64748b' }}>Total Amount</span>
                            <span style={{ fontWeight: '900', fontSize: '1.5rem', color: 'var(--ink)' }}>₹{grandTotal.toFixed(2)}</span>
                        </div>
                        <div style={{ marginBottom: '1rem' }}>
                            <div style={{ fontSize: '0.85rem', fontWeight: '700', color: '#64748b', marginBottom: '0.6rem' }}>Select Print Design</div>
                            <div style={{ display: 'flex', gap: '0.5rem' }}>
                                {['Standard', 'Elegant', 'Thermal'].map(d => (
                                    <button
                                        key={d}
                                        className={`design-btn ${selectedDesign === d ? 'active' : ''}`}
                                        onClick={() => setSelectedDesign(d)}
                                        style={{ 
                                            flex: 1, 
                                            padding: '8px', 
                                            fontSize: '0.75rem', 
                                            borderRadius: '10px',
                                            border: selectedDesign === d ? '1.5px solid #4f46e5' : '1.5px solid #e2e8f0',
                                            background: selectedDesign === d ? '#f5f3ff' : 'white',
                                            color: selectedDesign === d ? '#4f46e5' : '#64748b',
                                            fontWeight: '700'
                                        }}
                                    >
                                        {d}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 60px', gap: '0.75rem' }}>
                            <button className="btn-vibe-primary" onClick={printBill} style={{ 
                                padding: '1.1rem', 
                                background: 'linear-gradient(to right, #4f46e5, #4338ca)', 
                                color: 'white', 
                                borderRadius: '100px', 
                                fontSize: '1rem',
                                fontWeight: '900',
                                border: 'none',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '8px',
                                textTransform: 'uppercase',
                                boxShadow: '0 8px 24px rgba(79, 70, 229, 0.3)'
                            }}>
                                <Printer size={20} /> CONFIRM & PRINT
                            </button>
                            <button className="btn-vibe-danger" onClick={clearCart} style={{ 
                                borderRadius: '20px', 
                                background: '#fee2e2', 
                                color: '#ef4444', 
                                border: 'none',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center'
                            }}>
                                <Trash2 size={24} />
                            </button>
                        </div>
                    </div>
                    <style>{`
                        @keyframes slideInRight {
                            from { transform: translateX(100%); }
                            to { transform: translateX(0); }
                        }
                    `}</style>
                </div>
            )}


            {/* Print Preview Modal */}
            {showPrintModal && (
                <div className="invoice-modal-overlay">
                    <div className="invoice-modal-content">
                        <div className="invoice-modal-header">
                            <div className="invoice-design-picker">
                                {['Standard', 'Elegant', 'Thermal'].map(d => (
                                    <button
                                        key={d}
                                        className={`design-btn ${selectedDesign === d ? 'active' : ''}`}
                                        onClick={() => setSelectedDesign(d)}
                                    >
                                        {d}
                                    </button>
                                ))}
                            </div>
                            <button className="btn btn-ghost" onClick={() => setShowPrintModal(false)} style={{ fontSize: '1.5rem' }}>✕</button>
                        </div>
                        <div className="invoice-modal-body" id="printable-area">
                            {selectedDesign === 'Standard' && printSnapshot && (
                                <StandardTemplate
                                    cart={printSnapshot.cart}
                                    customer={printSnapshot.customer}
                                    subtotal={printSnapshot.subtotal}
                                    taxAmount={printSnapshot.taxAmount}
                                    discAmount={printSnapshot.discAmount}
                                    grandTotal={printSnapshot.grandTotal}
                                    invoiceNo={printSnapshot.invoiceNo}
                                    date={printSnapshot.date}
                                    invType={printSnapshot.invType}
                                    storeProfile={printSnapshot.storeProfile}
                                    couponCode={printSnapshot.couponCode}
                                />
                            )}
                            {selectedDesign === 'Elegant' && printSnapshot && (
                                <ElegantTemplate
                                    cart={printSnapshot.cart}
                                    customer={printSnapshot.customer}
                                    subtotal={printSnapshot.subtotal}
                                    taxAmount={printSnapshot.taxAmount}
                                    discAmount={printSnapshot.discAmount}
                                    grandTotal={printSnapshot.grandTotal}
                                    invoiceNo={printSnapshot.invoiceNo}
                                    date={printSnapshot.date}
                                    invType={printSnapshot.invType}
                                    storeProfile={printSnapshot.storeProfile}
                                    couponCode={printSnapshot.couponCode}
                                />
                            )}
                            {selectedDesign === 'Thermal' && printSnapshot && (
                                <ThermalTemplate
                                    cart={printSnapshot.cart}
                                    customer={printSnapshot.customer}
                                    subtotal={printSnapshot.subtotal}
                                    taxAmount={printSnapshot.taxAmount}
                                    discAmount={printSnapshot.discAmount}
                                    grandTotal={printSnapshot.grandTotal}
                                    invoiceNo={printSnapshot.invoiceNo}
                                    date={printSnapshot.date}
                                    invType={printSnapshot.invType}
                                    storeProfile={printSnapshot.storeProfile}
                                    couponCode={printSnapshot.couponCode}
                                />
                            )}
                        </div>
                        <div className="invoice-modal-footer">
                            <button className="btn btn-outline" onClick={() => setShowPrintModal(false)}>Cancel</button>
                            <button className="btn btn-primary" onClick={() => handleConfirmPrint()}>Confirm & Print</button>
                        </div>
                    </div>
                </div>
            )}
            <PrintWrapper ref={printRef} snapshot={printSnapshot} selectedDesign={selectedDesign} />
        </div>
    );
}
