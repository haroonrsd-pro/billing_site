import React, { useMemo, useState, useRef, useEffect } from 'react';
import { 
    Bell, 
    Settings, 
    Search, 
    Send, 
    X, 
    Menu, 
    Home, 
    FileText, 
    Receipt, 
    Package, 
    ShoppingCart, 
    Users, 
    BarChart2, 
    ShieldAlert, 
    LogOut,
    ChevronRight,
    LayoutDashboard
} from 'lucide-react';
import { useNavigate, NavLink, useLocation } from 'react-router-dom';
import { useFirestore } from '../hooks/useFirestore';
import { useDevice } from '../context/DeviceContext';
import { auth } from '../firebaseConfig';
import { signOut } from 'firebase/auth';



export default function Topbar({ onToggleSidebar, variant = 'full' }) {
    const navigate = useNavigate();
    const location = useLocation();
    const { isMobile, isTablet, isDesktop, isPortrait } = useDevice();
    const { docs: customers } = useFirestore('customers');
    const { docs: messages, addDocument } = useFirestore('messages');

    const [isDrawerOpen, setIsDrawerOpen] = useState(false);
    const [showChatPopup, setShowChatPopup] = useState(false);
    const [newMessage, setNewMessage] = useState('');
    const [searchQuery, setSearchQuery] = useState('');
    
    const messagesEndRef = useRef(null);
    const popupRef = useRef(null);

    const storeDoc = useMemo(() => {
        return customers.find(c => c.isSystemProfile === true);
    }, [customers]);

    const storeName = storeDoc?.profile?.businessName || 'FoodBill PRO';
    const userRole = (sessionStorage.getItem('fb_user_role') || 'admin').toLowerCase();

    // Chat Logic
    const sortedMessages = useMemo(() => {
        const msgs = Array.isArray(messages) ? messages : [];
        return [...msgs].sort((a, b) => new Date(a.createdAt || a.timestamp || 0) - new Date(b.createdAt || b.timestamp || 0));
    }, [messages]);

    const unreadCount = useMemo(() => {
        const lastVisit = parseInt(sessionStorage.getItem('lastChatVisit') || '0', 10);
        const msgs = Array.isArray(messages) ? messages : [];
        return msgs.filter(msg => {
            const msgTime = new Date(msg.createdAt || msg.timestamp || 0).getTime();
            return msgTime > lastVisit && msg.senderRole !== userRole;
        }).length;
    }, [messages, userRole]);

    const toggleChat = () => {
        const newShowState = !showChatPopup;
        setShowChatPopup(newShowState);
        if (newShowState) {
            sessionStorage.setItem('lastChatVisit', Date.now().toString());
        }
    };

    useEffect(() => {
        if (showChatPopup) {
            messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
            sessionStorage.setItem('lastChatVisit', Date.now().toString());
        }
    }, [messages, showChatPopup]);

    useEffect(() => {
        function handleClickOutside(event) {
            if (popupRef.current && !popupRef.current.contains(event.target)) {
                setShowChatPopup(false);
            }
        }
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleSendMessage = async (e) => {
        e.preventDefault();
        if (!newMessage.trim()) return;
        try {
            await addDocument({
                text: newMessage,
                senderRole: userRole,
                timestamp: new Date().toISOString()
            });
            setNewMessage('');
        } catch (err) {
            console.error("Failed to send message", err);
        }
    };

    const handleLogout = async () => {
        try {
            await signOut(auth);
        } catch (error) {
            console.error('Firebase sign out error:', error);
        } finally {
            sessionStorage.clear();
            navigate('/role-select');
        }
    };

    // Page Title Logic
    const getPageTitle = () => {
        const path = location.pathname;
        if (path.includes('dashboard')) return 'Dashboard';
        if (path.includes('billing')) return 'Billing';
        if (path.includes('inventory')) return 'Inventory';
        if (path.includes('invoices')) return 'Invoices';
        if (path.includes('reports')) return 'Reports';
        if (path.includes('settings')) return 'Settings';
        if (path.includes('customers')) return 'Customers';
        if (path.includes('purchases')) return 'Purchases';
        if (path.includes('expenses')) return 'Expenses';
        return 'FoodBill PRO';
    };

    // Nav Items Helper for Mobile Drawer
    const NavItems = () => (
        <div className="mobile-drawer-nav">
            <NavLink to={`/${userRole}-dashboard`} className="md-item" onClick={() => setIsDrawerOpen(false)}>
                <Home size={20} /> Dashboard
            </NavLink>

            <div style={{ padding: '1rem 1.5rem 0.5rem', fontSize: '0.65rem', color: 'rgba(255,255,255,0.4)', fontWeight: 800, letterSpacing: '1px', textTransform: 'uppercase' }}>Sales & Billing</div>
            <NavLink to="/billing" className="md-item" onClick={() => setIsDrawerOpen(false)}>
                <span style={{ fontSize: '18px', width: '20px', textAlign: 'center', display: 'inline-block' }}>⚡</span> Billing / POS
            </NavLink>
            <NavLink to="/invoices" className="md-item" onClick={() => setIsDrawerOpen(false)}>
                <span style={{ fontSize: '18px', width: '20px', textAlign: 'center', display: 'inline-block' }}>📄</span> Invoices
            </NavLink>
            <NavLink to="/quotations" className="md-item" onClick={() => setIsDrawerOpen(false)}>
                <span style={{ fontSize: '18px', width: '20px', textAlign: 'center', display: 'inline-block' }}>💬</span> Quotations
            </NavLink>
            <NavLink to="/sales-orders" className="md-item" onClick={() => setIsDrawerOpen(false)}>
                <span style={{ fontSize: '18px', width: '20px', textAlign: 'center', display: 'inline-block' }}>📦</span> Sales Orders
            </NavLink>
            <NavLink to="/credit-notes" className="md-item" onClick={() => setIsDrawerOpen(false)}>
                <span style={{ fontSize: '18px', width: '20px', textAlign: 'center', display: 'inline-block' }}>↩️</span> Credit Notes
            </NavLink>

            <div style={{ padding: '1rem 1.5rem 0.5rem', fontSize: '0.65rem', color: 'rgba(255,255,255,0.4)', fontWeight: 800, letterSpacing: '1px', textTransform: 'uppercase' }}>Inventory & Purchases</div>
            <NavLink to="/inventory" className="md-item" onClick={() => setIsDrawerOpen(false)}>
                <span style={{ fontSize: '18px', width: '20px', textAlign: 'center', display: 'inline-block' }}>📦</span> Stock & Inventory
            </NavLink>
            <NavLink to="/purchases" className="md-item" onClick={() => setIsDrawerOpen(false)}>
                <span style={{ fontSize: '18px', width: '20px', textAlign: 'center', display: 'inline-block' }}>🛒</span> Purchases
            </NavLink>
            <NavLink to="/expenses" className="md-item" onClick={() => setIsDrawerOpen(false)}>
                <span style={{ fontSize: '18px', width: '20px', textAlign: 'center', display: 'inline-block' }}>💸</span> Expenses
            </NavLink>

            {userRole !== 'staff' && (
                <>
                    <div style={{ padding: '1rem 1.5rem 0.5rem', fontSize: '0.65rem', color: 'rgba(255,255,255,0.4)', fontWeight: 800, letterSpacing: '1px', textTransform: 'uppercase' }}>In-House Portal</div>
                    {userRole === 'owner' ? (
                        <NavLink to="/inhouse-owner" className="md-item" onClick={() => setIsDrawerOpen(false)}>
                            <span style={{ fontSize: '18px', width: '20px', textAlign: 'center', display: 'inline-block' }}>🏪</span> Shop Management
                        </NavLink>
                    ) : (
                        <NavLink to="/inhouse-admin" className="md-item" onClick={() => setIsDrawerOpen(false)}>
                            <span style={{ fontSize: '18px', width: '20px', textAlign: 'center', display: 'inline-block' }}>🛍️</span> In-House Shopping
                        </NavLink>
                    )}

                    <div style={{ padding: '1rem 1.5rem 0.5rem', fontSize: '0.65rem', color: 'rgba(255,255,255,0.4)', fontWeight: 800, letterSpacing: '1px', textTransform: 'uppercase' }}>Management & Reports</div>
                    {userRole === 'owner' && (
                        <NavLink to="/customers" className="md-item" onClick={() => setIsDrawerOpen(false)}>
                            <span style={{ fontSize: '18px', width: '20px', textAlign: 'center', display: 'inline-block' }}>👥</span> Clients
                        </NavLink>
                    )}
                    <NavLink to="/branch" className="md-item" onClick={() => setIsDrawerOpen(false)}>
                        <span style={{ fontSize: '18px', width: '20px', textAlign: 'center', display: 'inline-block' }}>🛡️</span> {userRole === 'admin' ? 'Staff Login' : 'Branch Management'}
                    </NavLink>
                    <NavLink to="/reports" className="md-item" onClick={() => setIsDrawerOpen(false)}>
                        <span style={{ fontSize: '18px', width: '20px', textAlign: 'center', display: 'inline-block' }}>📊</span> Reports & Analytics
                    </NavLink>
                    {userRole !== 'staff' && (
                        <NavLink to="/admin/coupons" className="md-item" onClick={() => setIsDrawerOpen(false)}>
                            <span style={{ fontSize: '18px', width: '20px', textAlign: 'center', display: 'inline-block' }}>🎟️</span> Coupon Codes
                        </NavLink>
                    )}
                    {userRole === 'owner' && (
                        <>
                            <NavLink to="/admin/coupon-reports" className="md-item" onClick={() => setIsDrawerOpen(false)}>
                                <span style={{ fontSize: '18px', width: '20px', textAlign: 'center', display: 'inline-block' }}>📜</span> Coupon Performance
                            </NavLink>
                            <NavLink to="/franchise-report" className="md-item" onClick={() => setIsDrawerOpen(false)}>
                                <span style={{ fontSize: '18px', width: '20px', textAlign: 'center', display: 'inline-block' }}>📈</span> Franchise Sales Report
                            </NavLink>
                        </>
                    )}
                </>
            )}

            <div style={{ padding: '1rem 1.5rem 0.5rem', fontSize: '0.65rem', color: 'rgba(255,255,255,0.4)', fontWeight: 800, letterSpacing: '1px', textTransform: 'uppercase' }}>Communication</div>
            <NavLink to="/chat" className="md-item" onClick={() => setIsDrawerOpen(false)}>
                <span style={{ fontSize: '18px', width: '20px', textAlign: 'center', display: 'inline-block' }}>💬</span> Team Chat
            </NavLink>
            {userRole === 'owner' && (
                <NavLink to="/settings" className="md-item" onClick={() => setIsDrawerOpen(false)}>
                    <Settings size={20} style={{ marginLeft: '2px', marginRight: '4px' }} /> Settings
                </NavLink>
            )}
            
            <div className="md-divider" style={{ margin: '1rem 0' }} />
            <button className="md-item logout" onClick={handleLogout} style={{ color: '#f87171' }}>
                <LogOut size={20} style={{ marginLeft: '2px', marginRight: '4px' }} /> Logout
            </button>
        </div>
    );

    // MOBILE & TABLET RENDER
    if (isMobile || isTablet) {
        return (
            <>
                <header className="topbar mobile-topbar" style={{ height: '56px', background: 'white', boxShadow: '0 2px 10px rgba(0,0,0,0.05)', padding: '0 1rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div className="topbar-left">
                        <button className="tb-icon-btn" onClick={(e) => { e.stopPropagation(); setIsDrawerOpen(true); }}>
                            <Menu size={24} color="#0f172a" />
                        </button>
                    </div>
                    
                    <div className="topbar-center" style={{ flex: 1, textAlign: 'center', overflow: 'hidden' }}>
                        <span style={{ 
                            fontFamily: "'Yeseva One', serif", 
                            fontSize: '1.1rem', 
                            color: '#0f172a',
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            display: 'block',
                            maxWidth: '60vw',
                            margin: '0 auto'
                        }}>
                            {getPageTitle()}
                        </span>
                    </div>

                    <div className="topbar-right">
                        <div className="tb-avatar" style={{ width: '32px', height: '32px', fontSize: '0.85rem' }}>
                            {userRole.charAt(0).toUpperCase()}
                        </div>
                    </div>
                </header>

                {/* Mobile/Tablet Drawer Overlay */}
                {isDrawerOpen && (
                    <div className="mobile-drawer-overlay" onClick={(e) => { if (e.target === e.currentTarget) setIsDrawerOpen(false); }} style={{
                        position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 10000,
                        backdropFilter: 'blur(4px)', animation: 'fadeIn 0.2s ease-out'
                    }}>
                        <div className="mobile-drawer" onClick={e => e.stopPropagation()} style={{
                            width: '280px', height: '100%', background: '#0f172a', color: 'white',
                            display: 'flex', flexDirection: 'column', animation: 'slideInLeft 0.3s ease-out',
                            boxShadow: '10px 0 30px rgba(0,0,0,0.2)'
                        }}>
                            <div className="md-header" style={{ padding: '1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                    {storeDoc?.profile?.logo ? (
                                        <img src={storeDoc.profile.logo} alt="Logo" style={{ width: '32px', height: '32px', borderRadius: '8px' }} />
                                    ) : '🏪'}
                                    <span style={{ fontWeight: 800, fontSize: '1.1rem' }}>FoodBill PRO</span>
                                </div>
                                <button onClick={() => setIsDrawerOpen(false)} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.6)' }}>
                                    <X size={24} />
                                </button>
                            </div>
                            <div style={{ flex: 1, overflowY: 'auto', padding: '1rem 0' }}>
                                <NavItems />
                            </div>
                            <div className="md-footer" style={{ padding: '1.5rem', borderTop: '1px solid rgba(255,255,255,0.1)', background: 'rgba(0,0,0,0.2)' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                    <div className="tb-avatar" style={{ width: '40px', height: '40px', background: 'var(--pos-gradient)' }}>
                                        {userRole.charAt(0).toUpperCase()}
                                    </div>
                                    <div>
                                        <div style={{ fontWeight: 700, fontSize: '0.9rem', color: 'white', textTransform: 'capitalize' }}>{userRole}</div>
                                        <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.5)' }}>FoodBill Team</div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </>
        );
    }

    // DESKTOP RENDER (Default)
    return (
        <header className="topbar">
            <div className="topbar-left">
                {onToggleSidebar && (
                    <button className="sidebar-toggle" onClick={onToggleSidebar} title="Toggle Menu">
                        <Menu size={20} />
                    </button>
                )}
                <div className="logo" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    {storeDoc?.profile?.logo && (
                        <img 
                            src={storeDoc.profile.logo} 
                            alt="Store Logo" 
                            style={{ width: '32px', height: '32px', objectFit: 'cover', borderRadius: '8px' }} 
                        />
                    )}
                    {storeName}
                </div>
            </div>
            <div className="topbar-search">
                <input 
                    type="text" 
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyDown={(e) => {
                        if (e.key === 'Enter' && searchQuery.trim()) {
                            navigate('/invoices?search=' + encodeURIComponent(searchQuery.trim()));
                            setSearchQuery('');
                        }
                    }}
                    placeholder="Search invoices, products, customers…" 
                />
                <span style={{ fontSize: '.85rem', color: 'rgba(255,255,255,.4)' }}><Search size={14} /></span>
            </div>
            <div className="topbar-right">
                <div style={{ position: 'relative' }} ref={popupRef}>
                    <button className="tb-icon-btn" title="Chat & Notifications" onClick={toggleChat}>
                        <Bell size={18} />
                        {unreadCount > 0 && <span className="tb-badge" id="notif-badge">{unreadCount}</span>}
                    </button>

                    {/* Chat Popup */}
                    {showChatPopup && (
                        <div style={{
                            position: 'absolute', top: '120%', right: '0', width: '350px', height: '400px',
                            background: '#fff', borderRadius: '12px', boxShadow: '0 10px 25px rgba(0,0,0,0.1)',
                            border: '1px solid var(--border)', zIndex: 1000, display: 'flex', flexDirection: 'column',
                            overflow: 'hidden'
                        }}>
                            <div style={{ padding: '1rem', background: 'var(--panel)', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <div style={{ fontWeight: 800, color: 'var(--ink)' }}>💬 Team Chat</div>
                                <button onClick={() => setShowChatPopup(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted)' }}><X size={16} /></button>
                            </div>
                            <div style={{ flex: 1, overflowY: 'auto', padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.8rem', background: '#f8fafc' }}>
                                {sortedMessages.length === 0 ? (
                                    <div style={{ textAlign: 'center', color: 'var(--muted)', marginTop: '2rem', fontSize: '0.85rem' }}>No messages yet</div>
                                ) : (
                                    sortedMessages.map((msg) => {
                                        const isMine = msg.senderRole === userRole;
                                        return (
                                            <div key={msg.id} style={{ display: 'flex', flexDirection: 'column', alignItems: isMine ? 'flex-end' : 'flex-start' }}>
                                                <div style={{ fontSize: '0.65rem', fontWeight: 700, color: 'var(--muted)', marginBottom: '0.1rem', textTransform: 'capitalize' }}>{msg.senderRole}</div>
                                                <div style={{ background: isMine ? '#6366f1' : '#fff', color: isMine ? '#fff' : 'var(--ink)', padding: '0.6rem 0.8rem', borderRadius: isMine ? '12px 12px 0 12px' : '12px 12px 12px 0', fontSize: '0.85rem', border: isMine ? 'none' : '1px solid var(--border)', boxShadow: '0 2px 4px rgba(0,0,0,0.02)', maxWidth: '85%' }}>
                                                    {msg.text}
                                                </div>
                                            </div>
                                        );
                                    })
                                )}
                                <div ref={messagesEndRef} />
                            </div>
                            <form onSubmit={handleSendMessage} style={{ padding: '0.8rem', background: '#fff', borderTop: '1px solid var(--border)', display: 'flex', gap: '0.5rem' }}>
                                <input type="text" value={newMessage} onChange={(e) => setNewMessage(e.target.value)} placeholder="Type a message..." style={{ flex: 1, padding: '0.6rem', borderRadius: '8px', border: '1px solid var(--border)', outline: 'none', fontSize: '0.85rem' }} />
                                <button type="submit" style={{ background: '#6366f1', color: '#fff', border: 'none', borderRadius: '8px', padding: '0 0.8rem', cursor: 'pointer', display: 'flex', alignItems: 'center' }}><Send size={14} /></button>
                            </form>
                        </div>
                    )}
                </div>
                {userRole === 'owner' && (
                    <button className="tb-icon-btn" title="Settings" onClick={() => navigate('/settings')}>
                        <Settings size={18} />
                    </button>
                )}
                <div className="tb-user">
                    <div className="tb-avatar" id="tb-avatar-txt">{userRole.charAt(0).toUpperCase()}</div>
                    <div>
                        <div className="tb-uname" id="tb-role-label" style={{ textTransform: 'capitalize' }}>{userRole}</div>
                    </div>
                </div>
            </div>
        </header>
    );
}
