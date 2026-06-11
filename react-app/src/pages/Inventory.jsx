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
    ChevronRight,
    Edit2,
    ChevronDown,
    Folder,
    ChevronUp
} from 'lucide-react';

export default function Inventory() {
    const { showToast, showConfirm } = useMessaging();
    const { docs: menuItems, loading, addDocument, deleteDocument, updateDocument } = useFirestore('products');
    const { docs: categories, loading: categoriesLoading, addDocument: addCategory, updateDocument: updateCategory, deleteDocument: deleteCategory } = useFirestore('categories');
    const { isMobile } = useDevice();

    // Tab State
    const [activeTab, setActiveTab] = useState('products'); // 'products' or 'categories'

    // Category Form State
    const [catForm, setCatForm] = useState({ id: null, name: '', icon: '🧇', status: 'active' });

    // Expanded Category Nodes in Tree View
    const [expandedCategories, setExpandedCategories] = useState({});

    // Auto-Seeding custom categories from defaults if missing
    useEffect(() => {
        if (!categoriesLoading && categories) {
            const defaultCats = [
                { id: 'rice', name: 'Rice & Biryani', icon: '🍛', status: 'active', order: 1, subcategories: [] },
                { id: 'breads', name: 'Breads', icon: '🫓', status: 'active', order: 2, subcategories: [] },
                { id: 'curries', name: 'Curries', icon: '🍲', status: 'active', order: 3, subcategories: [] },
                { id: 'starters', name: 'Starters', icon: '🍗', status: 'active', order: 4, subcategories: [] },
                {
                    id: 'waffles', name: 'Waffles & Pancakes', icon: '🧇', status: 'active', order: 5, subcategories: [
                        { id: 'sub_1', name: 'Chocolate Series', order: 1 },
                        { id: 'sub_2', name: 'Nutella Series', order: 2 },
                        { id: 'sub_3', name: 'Premium Series', order: 3 }
                    ]
                },
                {
                    id: 'coffee', name: 'Coffee', icon: '☕', status: 'active', order: 6, subcategories: [
                        { id: 'sub_4', name: 'Hot Coffee', order: 1 },
                        { id: 'sub_5', name: 'Cold Coffee', order: 2 }
                    ]
                },
                {
                    id: 'milkshakes', name: 'Milkshakes', icon: '🥤', status: 'active', order: 7, subcategories: [
                        { id: 'sub_6', name: 'Chocolate Shakes', order: 1 },
                        { id: 'sub_7', name: 'Fruit Shakes', order: 2 }
                    ]
                },
                { id: 'icecream', name: 'Ice Cream', icon: '🍨', status: 'active', order: 8, subcategories: [] },
                { id: 'drinks', name: 'Drinks', icon: '🥛', status: 'active', order: 9, subcategories: [] },
                { id: 'desserts', name: 'Desserts', icon: '🍰', status: 'active', order: 10, subcategories: [] },
                { id: 'snacks', name: 'Snacks', icon: '🥟', status: 'active', order: 11, subcategories: [] },
                { id: 'beverages', name: 'Beverages', icon: '🧃', status: 'active', order: 12, subcategories: [] },
                { id: 'addons', name: 'Add-ons', icon: '✨', status: 'active', order: 13, subcategories: [] }
            ];

            const seed = async () => {
                try {
                    for (const cat of defaultCats) {
                        const exists = categories.some(c => c.id === cat.id || c.name.toLowerCase() === cat.name.toLowerCase());
                        if (!exists) {
                            await addCategory(cat);
                        }
                    }
                } catch (e) {
                    console.error("Auto seeding categories failed", e);
                }
            };

            const isMissingAny = defaultCats.some(cat => !categories.some(c => c.id === cat.id || c.name.toLowerCase() === cat.name.toLowerCase()));
            if (categories.length === 0 || isMissingAny) {
                seed();
            }
        }
    }, [categoriesLoading, categories, addCategory]);

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
        name: '', cat: '', categoryId: '', subcategoryId: '', type: 'veg', price: '', cost: '', stock: '', unit: 'plate', low: 5, desc: '', img: ''
    });
    const [isCreatingNewCategory, setIsCreatingNewCategory] = useState(false);
    const [newCategoryName, setNewCategoryName] = useState('');
    const [newCategoryIcon, setNewCategoryIcon] = useState('🍛');

    // Edit Product State
    const [editingProductId, setEditingProductId] = useState(null);

    const startEdit = (item) => {
        setEditingProductId(item.id);
        setNewProduct({
            name: item.name || '',
            cat: item.cat || '',
            categoryId: item.categoryId || '',
            subcategoryId: item.subcategoryId || '',
            type: item.type || 'veg',
            price: item.price !== undefined ? String(item.price) : '',
            cost: item.cost !== undefined ? String(item.cost) : '',
            stock: item.stock !== undefined ? String(item.stock) : '',
            unit: item.unit || 'plate',
            low: item.low !== undefined ? String(item.low) : '5',
            desc: item.desc || '',
            img: item.img || ''
        });
        if (isMobile) {
            setShowAddModal(true);
        }
    };

    const clearForm = () => {
        setEditingProductId(null);
        setNewProduct({
            name: '', cat: '', categoryId: '', subcategoryId: '', type: 'veg', price: '', cost: '', stock: '', unit: 'plate', low: 5, desc: '', img: ''
        });
        setIsCreatingNewCategory(false);
        setNewCategoryName('');
        setNewCategoryIcon('🍛');
    };


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

    // Category & Subcategory Management Handlers
    const toggleCatExpand = (catId) => {
        setExpandedCategories(prev => ({
            ...prev,
            [catId]: !prev[catId]
        }));
    };

    const handleMoveCategory = async (cat, direction) => {
        const sortedCats = [...categories].sort((a, b) => (a.order || 0) - (b.order || 0));
        const index = sortedCats.findIndex(c => c.id === cat.id);
        if (index === -1) return;

        let newIndex = direction === 'up' ? index - 1 : index + 1;
        if (newIndex < 0 || newIndex >= sortedCats.length) return; // out of bounds

        const otherCat = sortedCats[newIndex];
        const tempOrder = cat.order || 0;
        await updateCategory(cat.id, { order: otherCat.order || 0 });
        await updateCategory(otherCat.id, { tempOrder });
    };

    const handleQuickAddCategory = async () => {
        const catName = window.prompt("Enter new category name:");
        if (!catName || !catName.trim()) return;

        const emoji = window.prompt("Enter an emoji/icon for this category (optional):", "🍛") || "🍛";

        const payload = {
            name: catName.trim(),
            icon: emoji,
            status: 'active',
            order: categories.length > 0 ? Math.max(...categories.map(c => c.order || 0)) + 1 : 1,
            subcategories: []
        };

        try {
            const newId = await addCategory(payload);
            showToast(`Category "${catName}" created!`, 'success');
            setNewProduct(prev => ({ ...prev, categoryId: newId, subcategoryId: '' }));
        } catch (err) {
            showToast('Failed to add category: ' + err.message, 'error');
        }
    };

    const handleAddSubcategory = async (catId, name) => {
        if (!name.trim()) return;
        const cat = categories.find(c => c.id === catId);
        if (!cat) return;

        const subList = cat.subcategories || [];
        const nextOrder = subList.length > 0 ? Math.max(...subList.map(s => s.order || 0)) + 1 : 1;
        const newSub = {
            id: 'sub_' + Date.now(),
            name: name.trim(),
            order: nextOrder
        };

        await updateCategory(catId, {
            subcategories: [...subList, newSub]
        });
        showToast('Subcategory added!', 'success');
    };

    const handleEditSubcategory = async (catId, subId, newName) => {
        if (!newName.trim()) return;
        const cat = categories.find(c => c.id === catId);
        if (!cat) return;

        const subList = (cat.subcategories || []).map(sub => {
            if (sub.id === subId) {
                return { ...sub, name: newName.trim() };
            }
            return sub;
        });

        await updateCategory(catId, { subcategories: subList });
        showToast('Subcategory renamed!', 'success');
    };

    const handleDeleteSubcategory = async (catId, subId) => {
        const cat = categories.find(c => c.id === catId);
        if (!cat) return;

        const subList = (cat.subcategories || []).filter(sub => sub.id !== subId);
        await updateCategory(catId, { subcategories: subList });
        showToast('Subcategory deleted.', 'info');
    };

    const handleMoveSubcategory = async (catId, subId, direction) => {
        const cat = categories.find(c => c.id === catId);
        if (!cat) return;

        const subList = [...(cat.subcategories || [])].sort((a, b) => (a.order || 0) - (b.order || 0));
        const index = subList.findIndex(s => s.id === subId);
        if (index === -1) return;

        let newIndex = direction === 'up' ? index - 1 : index + 1;
        if (newIndex < 0 || newIndex >= subList.length) return;

        const tempOrder = subList[index].order || 0;
        subList[index].order = subList[newIndex].order || 0;
        subList[newIndex].order = tempOrder;

        await updateCategory(catId, { subcategories: subList });
    };

    const CategoryForm = () => {
        const labelStyle = { display: 'block', fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase', color: '#64748b', marginBottom: '8px', letterSpacing: '0.05em' };
        const inputStyle = { width: '100%', padding: '0.8rem', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '0.95rem', color: '#334155', boxSizing: 'border-box', outline: 'none', background: '#fff', transition: 'border-color 0.2s' };

        const handleSaveCategory = async () => {
            if (!catForm.name.trim()) {
                showToast('Category name is required', 'error');
                return;
            }

            const payload = {
                name: catForm.name.trim(),
                icon: catForm.icon || '📁',
                status: catForm.status
            };

            try {
                if (catForm.id) {
                    await updateCategory(catForm.id, payload);
                    showToast('Category updated!', 'success');
                } else {
                    const nextOrder = categories.length > 0 ? Math.max(...categories.map(c => c.order || 0)) + 1 : 1;
                    await addCategory({
                        ...payload,
                        order: nextOrder,
                        subcategories: []
                    });
                    showToast('Category created!', 'success');
                }
                setCatForm({ id: null, name: '', icon: '🧇', status: 'active' });
            } catch (err) {
                showToast('Error saving: ' + err.message, 'error');
            }
        };

        return (
            <div style={{ background: '#f8fafc', padding: '1.5rem', borderRadius: '16px', display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
                <div>
                    <label style={labelStyle}>Category Name *</label>
                    <input
                        type="text"
                        placeholder="e.g. Waffles & Pancakes"
                        value={catForm.name}
                        onChange={e => setCatForm({ ...catForm, name: e.target.value })}
                        style={inputStyle}
                    />
                </div>
                <div>
                    <label style={labelStyle}>Category Icon / Emoji *</label>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: '0.4rem', marginBottom: '0.5rem' }}>
                        {['🧇', '☕', '🥤', '🍨', '🧃', '✨', '🍫', '🥞', '🍩', '🍰', '🍪', '🍨'].map(emoji => (
                            <button
                                key={emoji}
                                onClick={() => setCatForm({ ...catForm, icon: emoji })}
                                style={{
                                    fontSize: '1.25rem',
                                    padding: '6px',
                                    background: catForm.icon === emoji ? 'var(--accent-light)' : 'white',
                                    border: catForm.icon === emoji ? '1.5px solid var(--accent)' : '1px solid var(--border)',
                                    borderRadius: '8px',
                                    cursor: 'pointer',
                                    transition: 'all 0.15s'
                                }}
                            >
                                {emoji}
                            </button>
                        ))}
                    </div>
                    <input
                        type="text"
                        placeholder="Or type custom emoji"
                        value={catForm.icon}
                        onChange={e => setCatForm({ ...catForm, icon: e.target.value })}
                        style={{ ...inputStyle, width: '100%' }}
                    />
                </div>
                <div>
                    <label style={labelStyle}>Status</label>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                        <button
                            onClick={() => setCatForm({ ...catForm, status: 'active' })}
                            style={{
                                background: catForm.status === 'active' ? '#dcfce7' : '#ffffff',
                                border: catForm.status === 'active' ? '1px solid #86efac' : '1px solid #e2e8f0',
                                color: catForm.status === 'active' ? '#166534' : '#475569',
                                borderRadius: '8px', padding: '0.8rem', fontWeight: 700, cursor: 'pointer', transition: 'all 0.2s', fontSize: '0.85rem'
                            }}
                        >
                            🟢 Active
                        </button>
                        <button
                            onClick={() => setCatForm({ ...catForm, status: 'disabled' })}
                            style={{
                                background: catForm.status === 'disabled' ? '#fee2e2' : '#ffffff',
                                border: catForm.status === 'disabled' ? '1px solid #fca5a5' : '1px solid #e2e8f0',
                                color: catForm.status === 'disabled' ? '#991b1b' : '#475569',
                                borderRadius: '8px', padding: '0.8rem', fontWeight: 700, cursor: 'pointer', transition: 'all 0.2s', fontSize: '0.85rem'
                            }}
                        >
                            🔴 Disabled
                        </button>
                    </div>
                </div>
                <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
                    <button
                        className="btn btn-primary"
                        onClick={handleSaveCategory}
                        style={{ flex: 1, padding: '0.8rem', fontSize: '0.95rem', borderRadius: '8px', fontWeight: 800, background: 'var(--accent)', border: 'none', color: '#fff', cursor: 'pointer' }}
                    >
                        {catForm.id ? 'Save Changes' : '＋ Create Category'}
                    </button>
                    {catForm.id && (
                        <button
                            className="btn btn-ghost"
                            onClick={() => setCatForm({ id: null, name: '', icon: '🧇', status: 'active' })}
                            style={{ padding: '0.8rem', fontSize: '0.95rem', borderRadius: '8px', fontWeight: 800, border: '1px solid var(--border)', background: 'transparent', cursor: 'pointer' }}
                        >
                            Cancel
                        </button>
                    )}
                </div>
            </div>
        );
    };

    const CategoryTreeView = () => {
        const sortedCats = [...categories].sort((a, b) => (a.order || 0) - (b.order || 0));

        return (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {categoriesLoading ? (
                    <div style={{ textAlign: 'center', padding: '2rem' }}>Loading categories...</div>
                ) : sortedCats.length === 0 ? (
                    <div className="empty-state">
                        <div className="es-icon" style={{ fontSize: '2rem' }}>📁</div>
                        <div className="es-sub">No categories found. Auto-seeding categories...</div>
                    </div>
                ) : (
                    sortedCats.map((cat, idx) => {
                        const isExpanded = expandedCategories[cat.id];
                        const subcategories = cat.subcategories || [];
                        const sortedSubs = [...subcategories].sort((a, b) => (a.order || 0) - (b.order || 0));

                        return (
                            <div key={cat.id} style={{ border: '1px solid var(--border)', borderRadius: '12px', background: 'white', overflow: 'hidden' }}>
                                {/* Category Header Row */}
                                <div style={{ display: 'flex', alignItems: 'center', padding: '0.85rem 1.25rem', gap: '0.75rem', background: '#f8fafc', borderBottom: isExpanded ? '1px solid var(--border)' : 'none' }}>

                                    {/* Expand/Collapse Chevron */}
                                    <button
                                        onClick={() => toggleCatExpand(cat.id)}
                                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted)', display: 'flex', alignItems: 'center', padding: '4px' }}
                                    >
                                        {isExpanded ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
                                    </button>

                                    {/* Icon & Name */}
                                    <span style={{ fontSize: '1.25rem' }}>{cat.icon || '📁'}</span>
                                    <span style={{ fontWeight: 800, color: 'var(--ink)', flex: 1, fontSize: '0.95rem' }}>
                                        {cat.name}
                                        <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--muted)', marginLeft: '8px' }}>
                                            ({subcategories.length} subcategories)
                                        </span>
                                    </span>

                                    {/* Status Pill */}
                                    <span style={{
                                        fontSize: '0.7rem',
                                        fontWeight: 800,
                                        padding: '2px 8px',
                                        borderRadius: '100px',
                                        background: cat.status === 'active' ? '#dcfce7' : '#fee2e2',
                                        color: cat.status === 'active' ? '#15803d' : '#b91c1c'
                                    }}>
                                        {cat.status === 'active' ? 'Active' : 'Disabled'}
                                    </span>

                                    {/* Order Sorting Buttons */}
                                    <div style={{ display: 'flex', gap: '2px' }}>
                                        <button
                                            disabled={idx === 0}
                                            onClick={() => handleMoveCategory(cat, 'up')}
                                            style={{ padding: '6px', borderRadius: '6px', border: '1px solid var(--border)', background: 'white', color: idx === 0 ? '#cbd5e1' : 'var(--ink)', cursor: idx === 0 ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center' }}
                                        >
                                            <ChevronUp size={14} />
                                        </button>
                                        <button
                                            disabled={idx === sortedCats.length - 1}
                                            onClick={() => handleMoveCategory(cat, 'down')}
                                            style={{ padding: '6px', borderRadius: '6px', border: '1px solid var(--border)', background: 'white', color: idx === sortedCats.length - 1 ? '#cbd5e1' : 'var(--ink)', cursor: idx === sortedCats.length - 1 ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center' }}
                                        >
                                            <ChevronDown size={14} />
                                        </button>
                                    </div>

                                    {/* Action Buttons */}
                                    <div style={{ display: 'flex', gap: '4px', borderLeft: '1px solid #e2e8f0', paddingLeft: '8px' }}>
                                        <button
                                            title="Add Subcategory"
                                            onClick={() => {
                                                setExpandedCategories(prev => ({ ...prev, [cat.id]: true }));
                                                const subName = window.prompt(`Add new subcategory under "${cat.name}":`);
                                                if (subName) handleAddSubcategory(cat.id, subName);
                                            }}
                                            style={{ padding: '6px', borderRadius: '6px', border: 'none', background: 'var(--accent-light)', color: 'var(--accent)', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
                                        >
                                            <Plus size={14} strokeWidth={3} />
                                        </button>
                                        <button
                                            title="Edit Category"
                                            onClick={() => setCatForm({ id: cat.id, name: cat.name, icon: cat.icon || '📁', status: cat.status })}
                                            style={{ padding: '6px', borderRadius: '6px', border: '1px solid var(--border)', background: 'white', color: 'var(--ink)', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
                                        >
                                            <Edit2 size={14} />
                                        </button>
                                        <button
                                            title="Delete Category"
                                            onClick={() => {
                                                showConfirm({
                                                    title: 'Delete Category',
                                                    message: `Are you sure you want to delete "${cat.name}"? This cannot be undone.`,
                                                    onConfirm: () => deleteCategory(cat.id)
                                                });
                                            }}
                                            style={{ padding: '6px', borderRadius: '6px', border: 'none', background: '#fee2e2', color: '#ef4444', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
                                        >
                                            <Trash2 size={14} />
                                        </button>
                                    </div>
                                </div>

                                {/* Collapsible Subcategories list */}
                                {isExpanded && (
                                    <div style={{ padding: '0.75rem 1.25rem 1rem 2.5rem', display: 'flex', flexDirection: 'column', gap: '0.5rem', background: '#fff' }}>
                                        {sortedSubs.length === 0 ? (
                                            <div style={{ fontSize: '0.8rem', color: 'var(--muted)', fontStyle: 'italic', padding: '4px 0' }}>
                                                No subcategories. Click the ＋ button in the header row to add one.
                                            </div>
                                        ) : (
                                            sortedSubs.map((sub, sIdx) => (
                                                <div key={sub.id} style={{ display: 'flex', alignItems: 'center', padding: '8px 12px', background: '#f8fafc', borderRadius: '8px', border: '1px solid var(--border)', gap: '0.5rem' }}>
                                                    <span style={{ color: 'var(--muted)', fontSize: '0.75rem', fontWeight: 800 }}>├─</span>
                                                    <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--ink)', flex: 1 }}>{sub.name}</span>

                                                    {/* Subcategory sorting buttons */}
                                                    <div style={{ display: 'flex', gap: '2px' }}>
                                                        <button
                                                            disabled={sIdx === 0}
                                                            onClick={() => handleMoveSubcategory(cat.id, sub.id, 'up')}
                                                            style={{ padding: '4px', borderRadius: '4px', border: '1px solid var(--border)', background: 'white', color: sIdx === 0 ? '#cbd5e1' : 'var(--ink)', cursor: sIdx === 0 ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center' }}
                                                        >
                                                            <ChevronUp size={12} />
                                                        </button>
                                                        <button
                                                            disabled={sIdx === sortedSubs.length - 1}
                                                            onClick={() => handleMoveSubcategory(cat.id, sub.id, 'down')}
                                                            style={{ padding: '4px', borderRadius: '4px', border: '1px solid var(--border)', background: 'white', color: sIdx === sortedSubs.length - 1 ? '#cbd5e1' : 'var(--ink)', cursor: sIdx === sortedSubs.length - 1 ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center' }}
                                                        >
                                                            <ChevronDown size={12} />
                                                        </button>
                                                    </div>

                                                    {/* Subcategory actions */}
                                                    <div style={{ display: 'flex', gap: '4px', borderLeft: '1px solid #e2e8f0', paddingLeft: '8px' }}>
                                                        <button
                                                            title="Rename Subcategory"
                                                            onClick={() => {
                                                                const newName = window.prompt(`Rename subcategory "${sub.name}" to:`, sub.name);
                                                                if (newName) handleEditSubcategory(cat.id, sub.id, newName);
                                                            }}
                                                            style={{ padding: '4px', borderRadius: '4px', border: '1px solid var(--border)', background: 'white', color: 'var(--ink)', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
                                                        >
                                                            <Edit2 size={12} />
                                                        </button>
                                                        <button
                                                            title="Delete Subcategory"
                                                            onClick={() => {
                                                                showConfirm({
                                                                    title: 'Delete Subcategory',
                                                                    message: `Delete subcategory "${sub.name}"? products assigned to it will become flat items under this category.`,
                                                                    onConfirm: () => handleDeleteSubcategory(cat.id, sub.id)
                                                                });
                                                            }}
                                                            style={{ padding: '4px', borderRadius: '4px', border: 'none', background: '#fee2e2', color: '#ef4444', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
                                                        >
                                                            <Trash2 size={12} />
                                                        </button>
                                                    </div>
                                                </div>
                                            ))
                                        )}
                                    </div>
                                )}
                            </div>
                        );
                    })
                )}
            </div>
        );
    };

    // Handlers
    const handleAddProduct = async () => {
        const hasCategory = isCreatingNewCategory ? !!newCategoryName.trim() : !!newProduct.categoryId;
        if (!newProduct.name || !newProduct.price || newProduct.stock === '' || !hasCategory) {
            showToast('Please fill required fields: Name, Category, Sell Price, Stock Qty', 'error');
            return;
        }

        let finalCategoryId = newProduct.categoryId;
        let finalCatName = '';

        if (isCreatingNewCategory) {
            const payload = {
                name: newCategoryName.trim(),
                icon: newCategoryIcon || '🍛',
                status: 'active',
                order: categories.length > 0 ? Math.max(...categories.map(c => c.order || 0)) + 1 : 1,
                subcategories: []
            };
            try {
                finalCategoryId = await addCategory(payload);
                finalCatName = newCategoryName.trim();
            } catch (err) {
                showToast('Failed to create new category: ' + err.message, 'error');
                return;
            }
        } else {
            const selectedCatDoc = categories.find(c => c.id === newProduct.categoryId);
            finalCatName = selectedCatDoc ? selectedCatDoc.name : '';
        }

        const product = {
            name: newProduct.name,
            cat: finalCatName.toLowerCase(),
            categoryId: finalCategoryId,
            subcategoryId: isCreatingNewCategory ? '' : (newProduct.subcategoryId || ''),
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
                name: '', cat: '', categoryId: '', subcategoryId: '', type: 'veg', price: '', cost: '', stock: '', unit: 'plate', low: 5, desc: '', img: ''
            });
            setIsCreatingNewCategory(false);
            setNewCategoryName('');
            setNewCategoryIcon('🍛');
            showToast('Product added successfully!', 'success');
            if (isMobile) setShowAddModal(false);
        } catch (error) {
            showToast('Error adding product: ' + error.message, 'error');
        }
    };

    const handleUpdateProduct = async () => {
        const hasCategory = isCreatingNewCategory ? !!newCategoryName.trim() : !!newProduct.categoryId;
        if (!newProduct.name || !newProduct.price || newProduct.stock === '' || !hasCategory) {
            showToast('Please fill required fields: Name, Category, Sell Price, Stock Qty', 'error');
            return;
        }

        let finalCategoryId = newProduct.categoryId;
        let finalCatName = '';

        if (isCreatingNewCategory) {
            const payload = {
                name: newCategoryName.trim(),
                icon: newCategoryIcon || '🍛',
                status: 'active',
                order: categories.length > 0 ? Math.max(...categories.map(c => c.order || 0)) + 1 : 1,
                subcategories: []
            };
            try {
                finalCategoryId = await addCategory(payload);
                finalCatName = newCategoryName.trim();
            } catch (err) {
                showToast('Failed to create new category: ' + err.message, 'error');
                return;
            }
        } else {
            const selectedCatDoc = categories.find(c => c.id === newProduct.categoryId);
            finalCatName = selectedCatDoc ? selectedCatDoc.name : '';
        }

        const product = {
            name: newProduct.name,
            cat: finalCatName.toLowerCase(),
            categoryId: finalCategoryId,
            subcategoryId: isCreatingNewCategory ? '' : (newProduct.subcategoryId || ''),
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
            await updateDocument(editingProductId, product);
            clearForm();
            showToast('Product updated successfully!', 'success');
            if (isMobile) setShowAddModal(false);
        } catch (error) {
            showToast('Error updating product: ' + error.message, 'error');
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
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                                <label style={{ ...labelStyle, marginBottom: 0 }}>Category *</label>
                                <button
                                    type="button"
                                    onClick={() => {
                                        setIsCreatingNewCategory(!isCreatingNewCategory);
                                        setNewCategoryName('');
                                    }}
                                    style={{
                                        background: 'none',
                                        border: 'none',
                                        color: 'var(--accent)',
                                        fontSize: '0.75rem',
                                        fontWeight: 800,
                                        cursor: 'pointer',
                                        padding: '2px 6px',
                                        borderRadius: '4px',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '4px'
                                    }}
                                >
                                    {isCreatingNewCategory ? '📂 Select Existing' : '＋ Add New Category'}
                                </button>
                            </div>

                            {isCreatingNewCategory ? (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', background: '#ffffff', border: '1px solid #e2e8f0', padding: '1rem', borderRadius: '12px' }}>
                                    <div>
                                        <label style={{ ...labelStyle, fontSize: '0.7rem', color: '#64748b', marginBottom: '4px' }}>New Category Name *</label>
                                        <input
                                            type="text"
                                            placeholder="e.g. Biryani Specials"
                                            value={newCategoryName}
                                            onChange={(e) => setNewCategoryName(e.target.value)}
                                            style={inputStyle}
                                            required
                                        />
                                    </div>
                                    <div>
                                        <label style={{ ...labelStyle, fontSize: '0.7rem', color: '#64748b', marginBottom: '4px' }}>Category Icon / Emoji</label>
                                        <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap', marginBottom: '0.5rem' }}>
                                            {['🍛', '🫓', '🍲', '🍗', ' waffle: 🧇', '☕', '🥤', '🍨', '🍰'].map(emoji => {
                                                const actualEmoji = emoji.includes(' ') ? emoji.split(' ')[1] : emoji;
                                                return (
                                                    <button
                                                        key={actualEmoji}
                                                        type="button"
                                                        onClick={() => setNewCategoryIcon(actualEmoji)}
                                                        style={{
                                                            fontSize: '1.1rem',
                                                            padding: '4px 8px',
                                                            background: newCategoryIcon === actualEmoji ? 'var(--accent-light)' : 'white',
                                                            border: newCategoryIcon === actualEmoji ? '1.5px solid var(--accent)' : '1px solid var(--border)',
                                                            borderRadius: '6px',
                                                            cursor: 'pointer',
                                                            transition: 'all 0.15s'
                                                        }}
                                                    >
                                                        {actualEmoji}
                                                    </button>
                                                );
                                            })}
                                        </div>
                                        <input
                                            type="text"
                                            placeholder="Or enter custom emoji"
                                            value={newCategoryIcon}
                                            onChange={(e) => setNewCategoryIcon(e.target.value)}
                                            style={{ ...inputStyle, padding: '0.6rem' }}
                                        />
                                    </div>
                                </div>
                            ) : (
                                <select
                                    value={newProduct.categoryId}
                                    onChange={(e) => {
                                        const cid = e.target.value;
                                        if (cid === 'ADD_NEW') {
                                            setIsCreatingNewCategory(true);
                                            setNewProduct({ ...newProduct, categoryId: '', subcategoryId: '' });
                                        } else {
                                            setNewProduct({ ...newProduct, categoryId: cid, subcategoryId: '' });
                                        }
                                    }}
                                    style={inputStyle}
                                    required
                                >
                                    <option value="">Select Category</option>
                                    {categories.map(c => (
                                        <option key={c.id} value={c.id}>
                                            {c.icon} {c.name} {c.status === 'disabled' ? '(Disabled)' : ''}
                                        </option>
                                    ))}
                                    <option value="ADD_NEW" style={{ fontWeight: 'bold', color: 'var(--accent)' }}>➕ Add New Category...</option>
                                </select>
                            )}
                        </div>

                        {newProduct.categoryId && (
                            <div>
                                <label style={labelStyle}>Subcategory</label>
                                <select
                                    value={newProduct.subcategoryId}
                                    onChange={(e) => setNewProduct({ ...newProduct, subcategoryId: e.target.value })}
                                    style={inputStyle}
                                >
                                    <option value="">No Subcategory (Flat Item)</option>
                                    {(() => {
                                        const selectedCat = categories.find(c => c.id === newProduct.categoryId);
                                        const subs = selectedCat?.subcategories || [];
                                        const sortedSubs = [...subs].sort((a, b) => (a.order || 0) - (b.order || 0));
                                        return sortedSubs.map(s => (
                                            <option key={s.id} value={s.id}>{s.name}</option>
                                        ));
                                    })()}
                                </select>
                            </div>
                        )}

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
                        <div style={{ paddingTop: '1rem', marginTop: '1rem', display: 'flex', gap: '0.5rem' }}>
                            {editingProductId ? (
                                <>
                                    <button className="btn btn-primary" style={{ flex: 1, padding: '0.8rem', fontSize: '1rem', borderRadius: '8px', fontWeight: 800, background: 'var(--accent)' }} onClick={handleUpdateProduct}>
                                        Save Changes
                                    </button>
                                    <button className="btn btn-ghost" style={{ padding: '0.8rem', fontSize: '1rem', borderRadius: '8px', fontWeight: 800, border: '1px solid var(--border)' }} onClick={clearForm}>
                                        Cancel
                                    </button>
                                </>
                            ) : (
                                <button className="btn btn-primary" style={{ width: '100%', padding: '0.8rem', fontSize: '1rem', borderRadius: '8px', fontWeight: 800, background: 'var(--accent)' }} onClick={handleAddProduct}>
                                    ＋ Add to Inventory
                                </button>
                            )}
                        </div>
                    </div>
                )
            };

            return(
        <div className = "page active" id = "page-inventory" >
                    {/* Material 3 Tab Bar */ }
                    < div style = {{
                        display: 'flex',
                        gap: '1rem',
                        borderBottom: '1px solid var(--border)',
                        marginBottom: '1rem',
                        paddingBottom: '2px',
                        marginTop: isMobile ? '1.2cm' : '0.5cm'
                    }}>
                        <button 
                    onClick={() => setActiveTab('products')}
                    style={{
                        background: 'none',
                        border: 'none',
                        borderBottom: activeTab === 'products' ? '3px solid var(--accent)' : '3px solid transparent',
                        color: activeTab === 'products' ? 'var(--accent)' : 'var(--muted)',
                        padding: '0.8rem 1.2rem',
                        fontSize: '0.95rem',
                        fontWeight: 800,
                        cursor: 'pointer',
                        transition: 'all 0.15s'
                    }}
                >
                    📦 Products
                </button>
                <button 
                    onClick={() => setActiveTab('categories')}
                    style={{
                        background: 'none',
                        border: 'none',
                        borderBottom: activeTab === 'categories' ? '3px solid var(--accent)' : '3px solid transparent',
                        color: activeTab === 'categories' ? 'var(--accent)' : 'var(--muted)',
                        padding: '0.8rem 1.2rem',
                        fontSize: '0.95rem',
                        fontWeight: 800,
                        cursor: 'pointer',
                        transition: 'all 0.15s'
                    }}
                >
                    📁 Categories & Tree
                </button>
            </div >

    { activeTab === 'products' ? (
    <div className="inv-layout-2" style={{
        display: (isMobile && showAddModal) ? 'none' : 'flex',
        flexDirection: isMobile ? 'column' : 'row',
        marginTop: '0.5cm'
    }}>
        {!isMobile && (
            <div className="inv-add-panel">
                <div style={{ fontFamily: "'Yeseva One', serif", fontSize: '1.15rem', marginBottom: '1.2rem', display: 'flex', alignItems: 'center', gap: '.5rem' }}>
                    {editingProductId ? '📝 Edit Product' : '＋ Add Product'}
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
                                                {(() => {
                                                    const catDoc = categories.find(c => c.id === m.categoryId);
                                                    const subObj = catDoc?.subcategories?.find(s => s.id === m.subcategoryId);
                                                    return (
                                                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginTop: '2px' }}>
                                                            <span style={{ fontSize: '0.65rem', fontWeight: 850, color: 'var(--muted)', background: '#f1f5f9', padding: '2px 6px', borderRadius: '4px' }}>
                                                                {catDoc ? `${catDoc.icon} ${catDoc.name}` : (m.cat || 'Uncategorized')}
                                                            </span>
                                                            {subObj && (
                                                                <span style={{ fontSize: '0.65rem', fontWeight: 850, color: 'var(--accent)', background: 'var(--accent-light)', padding: '2px 6px', borderRadius: '4px' }}>
                                                                    {subObj.name}
                                                                </span>
                                                            )}
                                                        </div>
                                                    );
                                                })()}
                                            </div>
                                            <div style={{ display: 'flex', gap: '4px' }}>
                                                <button className="btn btn-ghost" onClick={() => startEdit(m)} style={{ padding: '8px', borderRadius: '10px', height: '40px', width: '40px', color: 'var(--accent)', border: '1px solid var(--border)' }}>
                                                    <Edit2 size={16} />
                                                </button>
                                                <button className="btn-vibe-danger" onClick={() => handleDeleteProduct(m.id)} style={{ padding: '8px', borderRadius: '10px', height: '40px', width: '40px' }}>
                                                    <Trash2 size={16} />
                                                </button>
                                            </div>
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
                                    {(() => {
                                        const catDoc = categories.find(c => c.id === m.categoryId);
                                        const subObj = catDoc?.subcategories?.find(s => s.id === m.subcategoryId);
                                        return (
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                                                <span style={{ fontSize: '.75rem', fontWeight: 800, color: 'var(--ink)' }}>
                                                    {catDoc ? `${catDoc.icon} ${catDoc.name}` : (m.cat || 'Uncategorized')}
                                                </span>
                                                {subObj && (
                                                    <span style={{ fontSize: '.65rem', color: 'var(--muted)' }}>
                                                        └─ {subObj.name}
                                                    </span>
                                                )}
                                            </div>
                                        );
                                    })()}
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
                                    <div style={{ display: 'flex', gap: '0.25rem' }}>
                                        <button
                                            className="btn btn-ghost btn-sm"
                                            style={{ color: 'var(--accent)', padding: '.3rem .6rem' }}
                                            onClick={() => startEdit(m)}
                                        >
                                            <Edit2 size={16} />
                                        </button>
                                        <button
                                            className="btn btn-ghost btn-sm"
                                            style={{ color: 'var(--red)', padding: '.3rem .6rem' }}
                                            onClick={() => handleDeleteProduct(m.id)}
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        );
                    })
                )}
            </tbody>
        </table>
                            )}
    </div>
                    </div >
                </div >
            ) : (
    <div className="inv-layout-2" style={{
        display: 'flex',
        flexDirection: isMobile ? 'column' : 'row',
        gap: '1.5rem',
        marginTop: '0.5cm'
    }}>
        <div className="inv-add-panel" style={{ width: isMobile ? '100%' : '320px', flexShrink: 0 }}>
            <div style={{ fontFamily: "'Yeseva One', serif", fontSize: '1.15rem', marginBottom: '1.2rem' }}>
                {catForm.id ? '📝 Edit Category' : '＋ Add Category'}
            </div>
            {CategoryForm()}
        </div>
        <div className="inv-table-area" style={{ flex: 1 }}>
            <div style={{ fontFamily: "'Yeseva One', serif", fontSize: '1.3rem', marginBottom: '1.25rem' }}>
                📁 Category Tree
            </div>
            {CategoryTreeView()}
        </div>
    </div>
)}

{/* Mobile FAB */ }
{
    isMobile && !showAddModal && activeTab === 'products' && (
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
    )
}

{/* Mobile Add Product Modal */ }
{
    isMobile && showAddModal && activeTab === 'products' && (
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
                <button onClick={() => { setShowAddModal(false); clearForm(); }} style={{ background: 'transparent', border: 'none' }}>
                    <ArrowLeft size={24} />
                </button>
                <span style={{ fontFamily: "'Yeseva One', serif", fontSize: '1.25rem' }}>
                    {editingProductId ? 'Edit Product' : 'Add New Product'}
                </span>
            </div>
            <div className="mobile-modal-content" style={{ padding: '1rem' }}>
                {ProductForm()}
            </div>
        </div>
    )
}
        </div >
    );
}
