import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { ShoppingCart, Package, Receipt, BarChart2, Users, Store, ChefHat } from 'lucide-react';

/**
 * BottomNav Component
 * Mobile-only fixed bottom navigation bar for FoodBill PRO.
 */
const BottomNav = () => {
  const location = useLocation();
  const navigate = useNavigate();

  const userRole = sessionStorage.getItem('fb_user_role');

  const navItems = [
    { label: 'Billing', icon: ShoppingCart, path: '/billing' },
    { label: 'Invoices', icon: Receipt, path: '/invoices' },
  ];

  if (userRole === 'staff') {
    navItems.push({ label: 'Kitchen', icon: ChefHat, path: '/kitchen' });
    navItems.push({ label: 'Stock', icon: Package, path: '/inventory' });
  } else {
    navItems.push({ label: 'Stock', icon: Package, path: '/inventory' });
    navItems.push({ label: 'Reports', icon: BarChart2, path: '/reports' });
    navItems.push({ label: 'Customers', icon: Users, path: '/customers' });
  }

  if (userRole === 'owner') {
      navItems.push({ label: 'Hub', icon: Store, path: '/inhouse-owner' });
  } else if (userRole === 'admin') {
      navItems.push({ label: 'Shop', icon: Store, path: '/inhouse-admin' });
  }

  const styles = {
    nav: {
      position: 'fixed',
      bottom: 0,
      left: 0,
      right: 0,
      height: '64px',
      backgroundColor: '#ffffff',
      borderTop: '1px solid #e2e8f0',
      display: 'flex',
      justifyContent: 'space-around',
      alignItems: 'center',
      zIndex: 1000,
      paddingBottom: 'env(safe-area-inset-bottom)',
      boxSizing: 'border-box',
    },
    tab: {
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      flex: 1,
      height: '100%',
      cursor: 'pointer',
      textDecoration: 'none',
      position: 'relative',
      transition: 'all 0.2s ease',
    },
    icon: (isActive) => ({
      color: isActive ? '#e85d04' : '#94a3b8',
      marginBottom: '4px',
    }),
    label: (isActive) => ({
      fontSize: '10px',
      fontWeight: isActive ? '700' : '400',
      color: isActive ? '#e85d04' : '#94a3b8',
      textAlign: 'center',
    }),
    indicator: {
      position: 'absolute',
      top: 0,
      width: '40%',
      height: '3px',
      backgroundColor: '#e85d04',
      borderRadius: '0 0 4px 4px',
    }
  };

  return (
    <nav 
      role="navigation" 
      aria-label="Mobile navigation" 
      style={styles.nav}
      className="bottom-nav"
    >
      {navItems.map((item) => {
        const isActive = location.pathname === item.path;
        const Icon = item.icon;

        return (
          <div
            key={item.path}
            onClick={() => navigate(item.path)}
            style={styles.tab}
          >
            {isActive && <div style={styles.indicator} />}
            <Icon size={22} style={styles.icon(isActive)} />
            <span style={styles.label(isActive)}>{item.label}</span>
          </div>
        );
      })}
    </nav>
  );
};

export default BottomNav;
