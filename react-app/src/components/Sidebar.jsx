import React, { useMemo } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { Home, FileText, Receipt, Book, Package, ShoppingCart, Users, BarChart2, Briefcase, FileDigit, Landmark, ShieldAlert, FileClock, LogOut, ChevronLeft, ChevronRight, Menu } from 'lucide-react';
import { useFirestore } from '../hooks/useFirestore';
import { auth } from '../firebaseConfig';
import { signOut } from 'firebase/auth';
import { useDevice } from '../context/DeviceContext';

export default function Sidebar({ collapsed: propCollapsed, onToggle, style }) {
export default function Sidebar({ collapsed: propCollapsed, onToggleSidebar }) {
    const navigate = useNavigate();
    const { isMobile, isTablet, isPortrait } = useDevice();

    // Use parent prop directly to allow toggling on tablet views
    const isActuallyCollapsed = propCollapsed ?? false;
    // Sync local state if prop changes, but prioritize tablet portrait rule
    useEffect(() => {
        if (propCollapsed !== undefined) {
            setLocalCollapsed(propCollapsed);
        }
    }, [propCollapsed]);

    // Always respect the prop — don't hardcode portrait override
    const isActuallyCollapsed = localCollapsed;

    const handleToggle = () => {
        if (onToggleSidebar) {
            onToggleSidebar();
        } else {
            setLocalCollapsed(!localCollapsed);
        }
    };

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

    // HIDE ON MOBILE & TABLET (BottomNav replaces it)
    if (isMobile || isTablet) return null;

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

    const isDrawerMode = isTablet;

    return (
        <nav 
            className={`sidebar ${isActuallyCollapsed ? 'collapsed' : ''} ${isDrawerMode ? 'sidebar-drawer' : ''}`} 
            id="sidebar" 
            role="navigation"
            style={style}
        >
            {isTablet && (
                <div className="sb-toggle-wrapper" style={{ display: 'flex', justifyContent: isActuallyCollapsed ? 'center' : 'flex-start', padding: '1rem 1.4rem', borderBottom: isActuallyCollapsed ? 'none' : '1px solid var(--border)' }}>
                    <button 
                        onClick={handleToggle} 
                        className="sidebar-toggle"
                        style={{ 
                            background: 'none', 
                            border: 'none', 
                            cursor: 'pointer', 
                            color: 'var(--ink)', 
                            display: 'flex', 
                            alignItems: 'center', 
                            justifyContent: 'center',
                            padding: '0.3rem',
                            borderRadius: '8px'
                        }}
                    >
                        <Menu size={20} />
                    </button>
                </div>
            )}

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
                
                {/* Toggle button — calls parent's onToggle, hidden on tablet portrait */}
                {(!isTablet || !isPortrait) && onToggle && (
                    <div 
                        className="sb-item toggle-item" 
                        onClick={onToggle}
                        onClick={handleToggle} 
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
