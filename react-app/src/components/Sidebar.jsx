import React, { useMemo, useState, useEffect } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { Home, FileText, Receipt, Book, Package, ShoppingCart, Users, BarChart2, Briefcase, FileDigit, Landmark, ShieldAlert, FileClock, LogOut, ChevronLeft, ChevronRight } from 'lucide-react';
import { useFirestore } from '../hooks/useFirestore';
import { auth } from '../firebaseConfig';
import { signOut } from 'firebase/auth';
import { useDevice } from '../context/DeviceContext';

export default function Sidebar({ collapsed: propCollapsed }) {
    const navigate = useNavigate();
    const { isMobile, isTablet, isPortrait } = useDevice();
    const [localCollapsed, setLocalCollapsed] = useState(false);

    // Sync local state if prop changes, but prioritize tablet portrait rule
    useEffect(() => {
        if (propCollapsed !== undefined) {
            setLocalCollapsed(propCollapsed);
        }
    }, [propCollapsed]);

    // Force collapsed on tablet portrait
    const isActuallyCollapsed = (isTablet && isPortrait) ? true : localCollapsed;

    const { docs: customers } = useFirestore('customers');
    const getNavClass = ({ isActive }) => isActive ? "sb-item active" : "sb-item";
    const userRole = sessionStorage.getItem('fb_user_role');

    const { docs: invoices } = useFirestore('invoices');

    const storeDoc = useMemo(() => {
        return customers.find(c => c.isSystemProfile === true);
    }, [customers]);

    const todayCount = useMemo(() => {
        const today = new Date().toISOString().split('T')[0];
        const invs = Array.isArray(invoices) ? invoices : [];
        const count = invs.filter(inv => inv.date === today).length;
        return count > 99 ? '99+' : count;
    }, [invoices]);

    // HIDE ON MOBILE (BottomNav replaces it)
    if (isMobile) return null;

    const storeName = storeDoc?.profile?.businessName || 'My Food Store';
    const storeAddress = storeDoc?.profile?.address || 'Coimbatore, TN';
    const city = (storeAddress.includes(',') ? storeAddress.split(',').pop() : storeAddress).trim();

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

    return (
        <nav 
            className={`sidebar ${isActuallyCollapsed ? 'collapsed' : ''}`} 
            id="sidebar" 
            role="navigation"
            style={{ 
                width: isActuallyCollapsed ? '64px' : '240px',
                transition: 'width 0.3s ease',
                overflowX: 'hidden',
                overflowY: 'auto'
            }}
        >
            <div className="sb-store" title={isActuallyCollapsed ? storeName : ''}>
                <div className="sb-store-icon">
                    {storeDoc?.profile?.logo ? (
                        <img src={storeDoc.profile.logo} alt="Logo" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 'inherit' }} />
                    ) : '🏪'}
                </div>
                {!isActuallyCollapsed && (
                    <div>
                        <div className="sb-store-name">{storeName}</div>
                        <div className="sb-store-sub">{city}</div>
                    </div>
                )}
            </div>

            <div className="sb-section">
                <NavLink to={`/${userRole || 'admin'}-dashboard`} className={getNavClass} title={isActuallyCollapsed ? "Dashboard" : ""}>
                    <span className="si-icon"><Home size={16} /></span> {!isActuallyCollapsed && "Dashboard"}
                </NavLink>
            </div>

            <hr className="sb-divider" />

            <div className="sb-section">
                {!isActuallyCollapsed && <div className="sb-section-label">Sales & Billing</div>}
                <NavLink to="/billing" className={getNavClass} title={isActuallyCollapsed ? "Billing / POS" : ""}>
                    <span className="si-icon">⚡</span> {!isActuallyCollapsed && "Billing / POS"}
                </NavLink>
                <NavLink to="/invoices" className={getNavClass} title={isActuallyCollapsed ? "Invoices" : ""}>
                    <span className="si-icon">📄</span> {!isActuallyCollapsed && "Invoices"}
                    {todayCount > 0 && <span className="si-badge count">{todayCount}</span>}
                </NavLink>
                <NavLink to="/quotations" className={getNavClass} title={isActuallyCollapsed ? "Quotations" : ""}>
                    <span className="si-icon">💬</span> {!isActuallyCollapsed && "Quotations"}
                </NavLink>
                <NavLink to="/sales-orders" className={getNavClass} title={isActuallyCollapsed ? "Sales Orders" : ""}>
                    <span className="si-icon">📦</span> {!isActuallyCollapsed && "Sales Orders"}
                </NavLink>
                <NavLink to="/credit-notes" className={getNavClass} title={isActuallyCollapsed ? "Credit Notes" : ""}>
                    <span className="si-icon">↩️</span> {!isActuallyCollapsed && "Credit Notes"}
                </NavLink>
            </div>

            <hr className="sb-divider" />

            <div className="sb-section">
                {!isActuallyCollapsed && <div className="sb-section-label">Dine-In & QR Orders</div>}
                <NavLink to="/kitchen" className={getNavClass} title={isActuallyCollapsed ? "Kitchen Display" : ""}>
                    <span className="si-icon">👨‍🍳</span> {!isActuallyCollapsed && "Kitchen Display"}
                </NavLink>
                {(userRole === 'owner' || userRole === 'admin') && (
                    <NavLink to="/tables" className={getNavClass} title={isActuallyCollapsed ? "Table QR Codes" : ""}>
                        <span className="si-icon">🍽️</span> {!isActuallyCollapsed && "Table QR Codes"}
                    </NavLink>
                )}
            </div>

            <hr className="sb-divider" />

            <div className="sb-section">
                {!isActuallyCollapsed && <div className="sb-section-label">Inventory & Purchases</div>}
                <NavLink to="/inventory" className={getNavClass} title={isActuallyCollapsed ? "Stock & Inventory" : ""}>
                    <span className="si-icon">📦</span> {!isActuallyCollapsed && "Stock & Inventory"}
                </NavLink>
                <NavLink to="/purchases" className={getNavClass} title={isActuallyCollapsed ? "Purchases" : ""}>
                    <span className="si-icon">🛒</span> {!isActuallyCollapsed && "Purchases"}
                </NavLink>
                <NavLink to="/expenses" className={getNavClass} title={isActuallyCollapsed ? "Expenses" : ""}>
                    <span className="si-icon">💸</span> {!isActuallyCollapsed && "Expenses"}
                </NavLink>
            </div>

            {userRole !== 'staff' && (
                <>
                    <hr className="sb-divider" />
                    <div className="sb-section">
                        {!isActuallyCollapsed && <div className="sb-section-label">In-House Portal</div>}
                        {userRole === 'owner' ? (
                            <NavLink to="/inhouse-owner" className={getNavClass} title={isActuallyCollapsed ? "Shop Management" : ""}>
                                <span className="si-icon">🏪</span> {!isActuallyCollapsed && "Shop Management"}
                            </NavLink>
                        ) : userRole === 'admin' ? (
                            <NavLink to="/inhouse-admin" className={getNavClass} title={isActuallyCollapsed ? "In-House Shopping" : ""}>
                                <span className="si-icon">🛍️</span> {!isActuallyCollapsed && "In-House Shopping"}
                            </NavLink>
                        ) : null}
                    </div>
                </>
            )}

            {userRole !== 'staff' && (
                <>
                    <hr className="sb-divider" />

                    <div className="sb-section">
                        {!isActuallyCollapsed && <div className="sb-section-label">Management & Reports</div>}
                        {userRole === 'owner' && (
                            <NavLink to="/customers" className={getNavClass} title={isActuallyCollapsed ? "Clients" : ""}>
                                <span className="si-icon">👥</span> {!isActuallyCollapsed && "Clients"}
                            </NavLink>
                        )}
                        <NavLink to="/branch" className={getNavClass} title={isActuallyCollapsed ? (userRole === 'admin' ? 'Staff Login' : 'Branch Management') : ""}>
                            <span className="si-icon">🛡️</span> {!isActuallyCollapsed && (userRole === 'admin' ? 'Staff Login' : 'Branch Management')}
                        </NavLink>
                        <NavLink to="/reports" className={getNavClass} title={isActuallyCollapsed ? "Reports & Analytics" : ""}>
                            <span className="si-icon">📊</span> {!isActuallyCollapsed && "Reports & Analytics"}
                        </NavLink>
                        {userRole !== 'staff' && (
                            <NavLink to="/admin/coupons" className={getNavClass} title={isActuallyCollapsed ? "Coupon Codes" : ""}>
                                <span className="si-icon">🎟️</span> {!isActuallyCollapsed && "Coupon Codes"}
                            </NavLink>
                        )}
                        {userRole === 'owner' && (
                            <>
                                <NavLink to="/admin/coupon-reports" className={getNavClass} title={isActuallyCollapsed ? "Coupon Performance" : ""}>
                                    <span className="si-icon">📜</span> {!isActuallyCollapsed && "Coupon Performance"}
                                </NavLink>
                                <NavLink to="/franchise-report" className={getNavClass} title={isActuallyCollapsed ? "Franchise Sales Report" : ""}>
                                    <span className="si-icon">📈</span> {!isActuallyCollapsed && "Franchise Sales Report"}
                                </NavLink>
                            </>
                        )}
                    </div>
                </>
            )}

            <hr className="sb-divider" />

            <div className="sb-section">
                {!isActuallyCollapsed && <div className="sb-section-label">Communication</div>}
                <NavLink to="/chat" className={getNavClass} title={isActuallyCollapsed ? "Team Chat" : ""}>
                    <span className="si-icon">💬</span> {!isActuallyCollapsed && "Team Chat"}
                </NavLink>
            </div>

            <hr className="sb-divider" />
            <div className="sb-section" style={{ marginTop: 'auto', marginBottom: '1rem', display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                <div className="sb-item" onClick={handleLogout} style={{ cursor: 'pointer', color: '#ef4444' }} title={isActuallyCollapsed ? "Logout" : ""}>
                    <span className="si-icon"><LogOut size={16} /></span> {!isActuallyCollapsed && "Logout"}
                </div>
                
                {/* Toggle button for tablets/desktop (hidden on mobile via the return null above) */}
                {(!isTablet || !isPortrait) && (
                    <div 
                        className="sb-item toggle-item" 
                        onClick={() => setLocalCollapsed(!localCollapsed)} 
                        style={{ cursor: 'pointer', marginTop: '0.5rem', borderTop: '1px solid #f1f5f9', paddingTop: '0.5rem' }}
                    >
                        <span className="si-icon">
                            {isActuallyCollapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
                        </span> 
                        {!isActuallyCollapsed && "Collapse Sidebar"}
                    </div>
                )}
            </div>
        </nav>
    );
}
