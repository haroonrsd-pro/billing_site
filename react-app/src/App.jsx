import React, { useState, useEffect } from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { auth } from './firebaseConfig';
import { onAuthStateChanged } from 'firebase/auth';
import Register from './pages/Register';
import RoleSelect from './pages/RoleSelect';
import { MessagingProvider } from './context/MessagingContext';
import { Toaster } from 'react-hot-toast';

import AdminDashboard from './pages/AdminDashboard';
import OwnerDashboard from './pages/OwnerDashboard';
import StaffDashboard from './pages/StaffDashboard';
import Inventory from './pages/Inventory';
import Billing from './pages/Billing';
import Invoices from './pages/Invoices';
import Purchases from './pages/Purchases';
import Expenses from './pages/Expenses';
import Customers from './pages/Customers';
import Quotations from './pages/Quotations';
import SalesOrders from './pages/SalesOrders';
import CreditNotes from './pages/CreditNotes';
import Settings from './pages/Settings';
import Reports from './pages/Reports';
import Branch from './pages/Branch';
import Chat from './pages/Chat';
import FranchiseReport from './pages/FranchiseReport';
import AdaptiveLayout from './components/AdaptiveLayout';
import OfflineBanner from './components/OfflineBanner';
import InhouseOwner from './pages/InhouseOwner';
import InhouseAdmin from './pages/InhouseAdmin';
import AdminCoupons from './pages/AdminCoupons';
import AdminReports from './pages/AdminReports';
import CouponManagement from './pages/CouponManagement';
import SuperAdminDashboard from './pages/SuperAdminDashboard';
import InitDB from './pages/InitDB';
import AdminAction from './pages/AdminAction';
import TableManagement from './pages/TableManagement';
import CustomerMenu from './pages/CustomerMenu';
import KitchenDisplay from './pages/KitchenDisplay';
import './styles/PremiumMobile.css';

// Helper component to protect routes requiring a role
const RoleProtectedRoute = ({ children, requiredRole = null }) => {
  const hasRole = sessionStorage.getItem('fb_user_role');

  if (!hasRole) {
    return <Navigate to="/role-select" replace />;
  }

  // If requiredRole is an array, check if hasRole is in it
  if (Array.isArray(requiredRole)) {
    if (!requiredRole.includes(hasRole)) {
      return <Navigate to={`/${hasRole}-dashboard`} replace />;
    }
  } else if (requiredRole && hasRole !== requiredRole) {
    // If requiredRole is a single string
    return <Navigate to={`/${hasRole}-dashboard`} replace />;
  }

  return children;
};

// Basic ErrorBoundary to prevent blank pages
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }
  componentDidCatch(error, errorInfo) {
    console.error("System: Component Crash Caught", error, errorInfo);
  }
  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: '2rem', background: '#fef2f2', color: '#991b1b', minHeight: '100vh', fontFamily: 'monospace' }}>
          <h2>System: Critical Rendering Failure</h2>
          <p>The application encountered a runtime error during render. This is usually caused by malformed data.</p>
          <pre style={{ background: '#fee2e2', padding: '1rem', borderRadius: '8px', overflowX: 'auto' }}>
            {this.state.error?.toString()}
          </pre>
          <button onClick={() => window.location.reload()} style={{ padding: '0.5rem 1rem', background: '#991b1b', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>
            Attempt System Recovery
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoading(false);
    });

    // Fallback: If auth listener doesn't fire in 1.5 seconds, stop loading
    const timer = setTimeout(() => {
      console.warn('System: Auth listener timeout - forcing state update.');
      setLoading(false);
    }, 1500);

    return () => {
      unsubscribe();
      clearTimeout(timer);
    };
  }, []); // Empty dependency array - run only on mount

  if (loading) {
    return (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100vh',
        background: '#140d08',
        color: '#fff'
      }}>
        <div className="loading-spinner" style={{
          width: '40px',
          height: '40px',
          border: '3px solid rgba(255,255,255,0.1)',
          borderTopColor: '#f48c06',
          borderRadius: '50%',
          animation: 'spin 1s linear infinite',
          marginBottom: '20px'
        }}></div>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        <div style={{ fontSize: '18px', fontWeight: '500', color: 'rgba(255,255,255,0.7)' }}>
          Waking up business portal...
        </div>
      </div>
    );
  }



  return (
    <ErrorBoundary>
    <MessagingProvider>
      <OfflineBanner />
      <HashRouter>
        <Routes>
          <Route path="/" element={<Navigate to="/role-select" replace />} />
          <Route path="/role-select" element={<RoleSelect />} />
          <Route path="/login" element={<Navigate to="/role-select" replace />} />
          <Route path="/register" element={<Register />} />

          {/* Protected routes wrapped in AdaptiveLayout */}
          <Route element={<RoleProtectedRoute><AdaptiveLayout /></RoleProtectedRoute>}>
            <Route path="/admin-dashboard" element={<RoleProtectedRoute requiredRole="admin"><AdminDashboard /></RoleProtectedRoute>} />
            <Route path="/owner-dashboard" element={<RoleProtectedRoute requiredRole="owner"><OwnerDashboard /></RoleProtectedRoute>} />
            <Route path="/staff-dashboard" element={<RoleProtectedRoute requiredRole="staff"><StaffDashboard /></RoleProtectedRoute>} />
            
            <Route path="/inventory" element={<RoleProtectedRoute><Inventory /></RoleProtectedRoute>} />
            <Route path="/billing" element={<RoleProtectedRoute><Billing /></RoleProtectedRoute>} />
            <Route path="/invoices" element={<RoleProtectedRoute><Invoices /></RoleProtectedRoute>} />
            <Route path="/purchases" element={<RoleProtectedRoute><Purchases /></RoleProtectedRoute>} />
            <Route path="/expenses" element={<RoleProtectedRoute><Expenses /></RoleProtectedRoute>} />
            <Route path="/customers" element={<RoleProtectedRoute><Customers /></RoleProtectedRoute>} />
            <Route path="/quotations" element={<RoleProtectedRoute><Quotations /></RoleProtectedRoute>} />
            <Route path="/sales-orders" element={<RoleProtectedRoute><SalesOrders /></RoleProtectedRoute>} />
            <Route path="/credit-notes" element={<RoleProtectedRoute><CreditNotes /></RoleProtectedRoute>} />
            <Route path="/branch" element={<RoleProtectedRoute><Branch /></RoleProtectedRoute>} />
            <Route path="/reports" element={<RoleProtectedRoute><Reports /></RoleProtectedRoute>} />
            <Route path="/chat" element={<RoleProtectedRoute><Chat /></RoleProtectedRoute>} />
            <Route path="/franchise-report" element={<RoleProtectedRoute requiredRole="owner"><FranchiseReport /></RoleProtectedRoute>} />
            <Route path="/settings" element={<RoleProtectedRoute requiredRole="owner"><Settings /></RoleProtectedRoute>} />
            
            {/* In-House Module Routes */}
            <Route path="/inhouse-owner" element={<RoleProtectedRoute requiredRole="owner"><InhouseOwner /></RoleProtectedRoute>} />
            <Route path="/inhouse-admin" element={<RoleProtectedRoute requiredRole="admin"><InhouseAdmin /></RoleProtectedRoute>} />
            
            {/* Coupon Management Routes */}
            <Route path="/admin/coupons" element={<RoleProtectedRoute requiredRole={['owner', 'admin']}><CouponManagement /></RoleProtectedRoute>} />
            <Route path="/admin/coupon-reports" element={<RoleProtectedRoute requiredRole={['owner', 'admin']}><AdminReports /></RoleProtectedRoute>} />

            {/* QR Table Ordering & Kitchen Routes */}
            <Route path="/tables" element={<RoleProtectedRoute requiredRole={['owner', 'admin']}><TableManagement /></RoleProtectedRoute>} />
            <Route path="/kitchen" element={<RoleProtectedRoute requiredRole={['owner', 'admin', 'staff']}><KitchenDisplay /></RoleProtectedRoute>} />
          </Route>

          {/* Public customer-facing self-ordering menu */}
          <Route path="/menu/:ownerId/:branchId/:tableId" element={<CustomerMenu />} />
          <Route path="/menu" element={<CustomerMenu />} />
          
          {/* Dedicated Super Admin Dashboard (Standalone Layout) */}
          <Route path="/super-admin-dashboard" element={<RoleProtectedRoute requiredRole="superadmin"><SuperAdminDashboard /></RoleProtectedRoute>} />
          
          <Route path="/init" element={<InitDB />} />
          <Route path="/approve" element={<AdminAction type="approve" />} />
          <Route path="/reject" element={<AdminAction type="reject" />} />
        </Routes>
      </HashRouter>
      <Toaster position="top-right" reverseOrder={false} />
    </MessagingProvider>
    </ErrorBoundary>
  );
}

export default App;
