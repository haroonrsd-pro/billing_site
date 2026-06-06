import React, { useState, useEffect, useMemo } from 'react';
import { ShoppingCart, Package, Plus, Minus, Trash2, CheckCircle, Clock, FileText, Search, ImageIcon } from 'lucide-react';
import { db } from '../firebaseConfig';
import { useFirestore } from '../hooks/useFirestore';
import { useDevice } from '../context/DeviceContext';

export default function InhouseAdmin() {
  const { isMobile, isTablet } = useDevice();
  const [activeTab, setActiveTab] = useState('shop'); // 'shop', 'cart', 'history'
  const [cart, setCart] = useState([]);
  const [search, setSearch] = useState('');

  const adminId = sessionStorage.getItem('fb_user_uid') || 'admin_1';
  const adminName = sessionStorage.getItem('fb_user_name') || 'Administrator';
  const branchName = sessionStorage.getItem('fb_user_station') || 'Branch';

  // Use useFirestore hook for multi-tenant isolation
  const { docs: products, loading: productsLoading } = useFirestore('inhouse_products', { orderBy: ['createdAt', 'desc'] });
  const { docs: allOrders, addDocument: addOrder, loading: ordersLoading } = useFirestore('inhouse_orders');

  const orders = useMemo(() => {
    return allOrders.filter(o => o.adminId === adminId).sort((a, b) => {
        const tA = (a.createdAt && typeof a.createdAt === 'string' ? new Date(a.createdAt).getTime() : 0);
        const tB = (b.createdAt && typeof b.createdAt === 'string' ? new Date(b.createdAt).getTime() : 0);
        return tB - tA;
    });
  }, [allOrders, adminId]);

  const handleAddToCart = (product) => {
    setCart(prev => {
      const existing = prev.find(item => item.id === product.id);
      if (existing) {
        if (existing.cartQty >= product.quantity) return prev; // Limit to available stock
        return prev.map(item => item.id === product.id ? { ...item, cartQty: item.cartQty + 1 } : item);
      }
      return [...prev, { ...product, cartQty: 1 }];
    });
  };

  const handleUpdateCartQty = (id, newQty) => {
    if (newQty < 1) {
      setCart(prev => prev.filter(item => item.id !== id));
      return;
    }
    const prod = products.find(p => p.id === id);
    if (!prod || newQty > prod.quantity) {
        alert("Cannot exceed available stock");
        return;
    }
    setCart(prev => prev.map(item => item.id === id ? { ...item, cartQty: newQty } : item));
  };

  const handleRemoveFromCart = (id) => {
    setCart(prev => prev.filter(item => item.id !== id));
  };

  const handlePlaceOrder = async () => {
    if (cart.length === 0) return;
    try {
      // create multiple order docs, or one batch
      for (const item of cart) {
        await addOrder({
          productId: item.id,
          productName: item.name,
          quantity: item.cartQty,
          price: item.price,
          totalPrice: item.price * item.cartQty,
          adminId: adminId,
          branchName: branchName,
          requestedBy: adminName,
          status: 'pending'
        });
      }
      setCart([]);
      setActiveTab('history');
      alert("Order placed successfully!");
    } catch (error) {
      console.error("Error placing order: ", error);
      alert("Failed to place order.");
    }
  };

  const filteredProducts = products.filter(p => p.name?.toLowerCase().includes(search.toLowerCase()) || p.category?.toLowerCase().includes(search.toLowerCase()));

  const cartTotal = cart.reduce((sum, item) => sum + (item.price * item.cartQty), 0);
  const cardStyle = { background: 'white', borderRadius: '16px', padding: isMobile ? '1.25rem' : '1.5rem', border: '1px solid var(--border)', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)', boxSizing: 'border-box' };

  return (
    <div className="page active" style={{ animation: "fadeIn 0.4s ease", paddingBottom: '96px', background: '#f8fafc', minHeight: '100vh', padding: isMobile ? '1.5rem 1rem' : '1.5rem 2rem', overflowX: 'hidden', boxSizing: 'border-box', width: '100%' }}>
      <div className="pg-header" style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', justifyContent: 'space-between', alignItems: isMobile ? 'flex-start' : 'center', gap: '1rem', marginBottom: '2rem' }}>
        <div style={{ flexShrink: 0 }}>
          <h1 className="pg-title" style={{ fontFamily: "'Yeseva One', serif", fontSize: isMobile ? '1.8rem' : '2.2rem', color: 'var(--ink)' }}>In-House <span style={{color: 'var(--accent)'}}>Shopping</span></h1>
          <p className="pg-sub" style={{ color: 'var(--muted)', fontSize: '0.9rem', fontWeight: 500 }}>Purchase supplies directly from owner</p>
        </div>
        <div style={{ display: 'flex', gap: '0.4rem', padding: '4px', background: '#e2e8f0', borderRadius: '12px', flexWrap: 'wrap', width: isMobile ? '100%' : 'auto', justifyContent: isMobile ? 'space-between' : 'flex-start' }}>
          <button onClick={() => setActiveTab('shop')} style={{ padding: '8px 16px', borderRadius: '8px', border: 'none', background: activeTab === 'shop' ? '#fff' : 'transparent', color: activeTab === 'shop' ? '#1e293b' : '#64748b', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.4rem', cursor: 'pointer', boxShadow: activeTab === 'shop' ? '0 2px 4px rgba(0,0,0,0.05)' : 'none', transition: 'all 0.2s' }}>
            <Package size={16} /> Shop
          </button>
          <button onClick={() => setActiveTab('cart')} style={{ padding: '8px 16px', borderRadius: '8px', border: 'none', background: activeTab === 'cart' ? '#fff' : 'transparent', color: activeTab === 'cart' ? '#1e293b' : '#64748b', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.4rem', cursor: 'pointer', boxShadow: activeTab === 'cart' ? '0 2px 4px rgba(0,0,0,0.05)' : 'none', transition: 'all 0.2s', position: 'relative' }}>
            <ShoppingCart size={16} /> Cart
            {cart.length > 0 && <span style={{ position: 'absolute', top: '-4px', right: '-4px', background: 'var(--accent)', color: 'white', fontSize: '0.6rem', padding: '2px 6px', borderRadius: '10px', fontWeight: 'bold' }}>{cart.length}</span>}
          </button>
          <button onClick={() => setActiveTab('history')} style={{ padding: '8px 16px', borderRadius: '8px', border: 'none', background: activeTab === 'history' ? '#fff' : 'transparent', color: activeTab === 'history' ? '#1e293b' : '#64748b', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.4rem', cursor: 'pointer', boxShadow: activeTab === 'history' ? '0 2px 4px rgba(0,0,0,0.05)' : 'none', transition: 'all 0.2s' }}>
            <Clock size={16} /> History
          </button>
        </div>
      </div>

      {activeTab === 'shop' && (
        <div style={{ animation: "fadeIn 0.4s ease" }}>
          <div style={{ marginBottom: '1.5rem', position: 'relative' }}>
            <Search size={18} style={{ position: 'absolute', top: '50%', left: '16px', transform: 'translateY(-50%)', color: 'var(--muted)' }} />
            <input 
              type="text" 
              placeholder="Search products..." 
              value={search} 
              onChange={e => setSearch(e.target.value)} 
              style={{ width: '100%', padding: '1rem 1rem 1rem 3rem', borderRadius: '16px', border: '1px solid var(--border)', fontSize: '1rem', background: 'white', boxShadow: '0 2px 5px rgba(0,0,0,0.02)' }} 
            />
          </div>
          
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1.5rem' }}>
            {filteredProducts.length === 0 ? (
              <div style={{ ...cardStyle, gridColumn: '1 / -1', textAlign: 'center', padding: '3rem 0', opacity: 0.6 }}>
                 <Package size={48} style={{ margin: '0 auto 1rem auto', color: 'var(--muted)' }} />
                 <p style={{ fontWeight: 600 }}>No products available from Owner at the moment.</p>
              </div>
            ) : filteredProducts.map(prod => (
              <div key={prod.id} style={{ ...cardStyle, padding: '1.2rem', display: 'flex', flexDirection: 'column', height: '100%' }}>
                {prod.image ? (
                   <div style={{ height: '140px', width: '100%', borderRadius: '12px', background: '#f1f5f9', marginBottom: '1rem', backgroundImage: `url(${prod.image})`, backgroundSize: 'cover', backgroundPosition: 'center' }} />
                ) : (
                   <div style={{ height: '140px', width: '100%', borderRadius: '12px', background: '#f1f5f9', marginBottom: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#cbd5e1' }}>
                     <Package size={32} />
                   </div>
                )}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
                  <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800, color: 'var(--ink)' }}>{prod.name}</h3>
                  <span style={{ fontSize: '0.7rem', padding: '0.2rem 0.6rem', background: '#eef2ff', color: '#6366f1', borderRadius: '10px', fontWeight: 700 }}>{prod.category || 'Standard'}</span>
                </div>
                <p style={{ fontSize: '0.8rem', color: 'var(--muted)', margin: '0 0 1rem 0', flex: 1 }}>{prod.description || 'No description'}</p>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.8rem', background: '#f8fafc', borderRadius: '10px', marginBottom: '1rem' }}>
                    <div style={{ fontWeight: 800, fontSize: '1.1rem', color: '#10b981' }}>₹{prod.price}</div>
                    <div style={{ fontSize: '0.75rem', fontWeight: 700, background: prod.quantity > 0 ? '#ecfdf5' : '#fef2f2', color: prod.quantity > 0 ? '#059669' : '#dc2626', padding: '4px 8px', borderRadius: '8px' }}>
                      {prod.quantity > 0 ? `${prod.quantity} Available` : 'Out of Stock'}
                    </div>
                </div>
                <button 
                  onClick={() => handleAddToCart(prod)} 
                  disabled={prod.quantity <= 0}
                  className="btn" 
                  style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem', borderRadius: '10px', padding: '0.8rem', fontWeight: 700, background: prod.quantity > 0 ? 'var(--accent)' : '#e2e8f0', color: prod.quantity > 0 ? 'white' : '#94a3b8', border: 'none', cursor: prod.quantity > 0 ? 'pointer' : 'not-allowed', transition: 'all 0.2s', boxShadow: prod.quantity > 0 ? '0 4px 10px rgba(79, 70, 229, 0.3)' : 'none' }}>
                  <ShoppingCart size={16} /> {prod.quantity > 0 ? 'Add to Cart' : 'Out of Stock'}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'cart' && (
        <div style={{ animation: "fadeIn 0.4s ease" }}>
          <h2 style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--ink)', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
            Shopping Cart
          </h2>
          {cart.length === 0 ? (
            <div style={{ ...cardStyle, textAlign: 'center', padding: '4rem 0', opacity: 0.6 }}>
               <ShoppingCart size={56} style={{ margin: '0 auto 1rem auto', color: 'var(--muted)' }} />
               <p style={{ fontWeight: 600, fontSize: '1.1rem' }}>Your cart is empty.</p>
               <button onClick={() => setActiveTab('shop')} style={{ marginTop: '1rem', padding: '0.6rem 1.2rem', background: '#f1f5f9', border: 'none', borderRadius: '10px', fontWeight: 700, color: 'var(--ink)', cursor: 'pointer' }}>Browse Products</button>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: (isMobile || isTablet) ? '1fr' : '1fr 350px', gap: '2rem', alignItems: 'start' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {cart.map(item => (
                  <div key={item.id} style={{ ...cardStyle, display: 'flex', flexDirection: isMobile ? 'column' : 'row', alignItems: isMobile ? 'stretch' : 'center', gap: '1rem', padding: isMobile ? '1rem' : '1rem 1.5rem', width: '100%' }}>
                    <div style={{ flex: 1 }}>
                      <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800, color: 'var(--ink)' }}>{item.name}</h3>
                      <div style={{ fontSize: '0.8rem', color: 'var(--muted)', fontWeight: 600, marginTop: '4px' }}>₹{item.price} each (Max: {item.quantity})</div>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem', background: '#f1f5f9', padding: '0.4rem', borderRadius: '12px' }}>
                        <button onClick={() => handleUpdateCartQty(item.id, item.cartQty - 1)} style={{ width: '30px', height: '30px', border: 'none', background: 'white', borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}><Minus size={14}/></button>
                        <span style={{ fontWeight: 800, color: 'var(--ink)', width: '20px', textAlign: 'center' }}>{item.cartQty}</span>
                        <button onClick={() => handleUpdateCartQty(item.id, item.cartQty + 1)} style={{ width: '30px', height: '30px', border: 'none', background: 'white', borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}><Plus size={14}/></button>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                        <div style={{ fontWeight: 800, fontSize: '1.1rem', color: 'var(--ink)' }}>
                          ₹{(item.price * item.cartQty).toLocaleString()}
                        </div>
                        <button onClick={() => handleRemoveFromCart(item.id)} style={{ padding: '0.5rem', background: '#fef2f2', border: '1px solid #fee2e2', borderRadius: '10px', color: '#ef4444', cursor: 'pointer' }}>
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              <div style={{ ...cardStyle, position: 'sticky', top: '2rem' }}>
                <h3 style={{ marginTop: 0, fontSize: '1.2rem', fontWeight: 800, color: 'var(--ink)', marginBottom: '1.5rem', borderBottom: '1px solid var(--border)', paddingBottom: '1rem' }}>Order Summary</h3>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem', color: 'var(--muted)', fontSize: '0.9rem', fontWeight: 600 }}>
                  <span>Items ({cart.length})</span>
                  <span>₹{cartTotal.toLocaleString()}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1.5rem', color: 'var(--muted)', fontSize: '0.9rem', fontWeight: 600 }}>
                  <span>Delivery</span>
                  <span style={{ color: '#10b981' }}>Free (In-House)</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px dashed var(--border)', paddingTop: '1.5rem', marginBottom: '2rem' }}>
                  <span style={{ fontWeight: 800, fontSize: '1rem', color: 'var(--ink)' }}>Total</span>
                  <span style={{ fontWeight: 800, fontSize: '1.5rem', color: 'var(--accent)' }}>₹{cartTotal.toLocaleString()}</span>
                </div>
                <button onClick={handlePlaceOrder} style={{ width: '100%', padding: '1rem', background: 'var(--accent)', color: 'white', border: 'none', borderRadius: '12px', fontWeight: 800, fontSize: '1.1rem', cursor: 'pointer', boxShadow: '0 4px 15px rgba(79, 70, 229, 0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', transition: 'all 0.2s' }}>
                  <CheckCircle size={18} /> Send Order Request
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {activeTab === 'history' && (
        <div style={{ animation: "fadeIn 0.4s ease" }}>
          <h2 style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--ink)', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
            Order Request History
          </h2>
          <div style={{ ...cardStyle }}>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border)', background: '#f8fafc' }}>
                    <th style={{ padding: '1rem', fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase', color: 'var(--muted)' }}>Order ID</th>
                    <th style={{ padding: '1rem', fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase', color: 'var(--muted)' }}>Product</th>
                    <th style={{ padding: '1rem', fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase', color: 'var(--muted)' }}>Qty</th>
                    <th style={{ padding: '1rem', fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase', color: 'var(--muted)' }}>Total Amount</th>
                    <th style={{ padding: '1rem', fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase', color: 'var(--muted)' }}>Date Request</th>
                    <th style={{ padding: '1rem', fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase', color: 'var(--muted)', textAlign: 'center' }}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {orders.length === 0 ? (
                    <tr><td colSpan="6" style={{ padding: '3rem', textAlign: 'center', color: 'var(--muted)', fontWeight: 600 }}>No orders placed yet.</td></tr>
                  ) : orders.map(order => {
                    const statusColor = order.status === 'pending' ? '#f59e0b' : order.status === 'approved' ? '#10b981' : '#ef4444';
                    const statusBg = order.status === 'pending' ? '#fef3c7' : order.status === 'approved' ? '#ecfdf5' : '#fef2f2';
                    return (
                      <tr key={order.id} style={{ borderBottom: '1px solid var(--border)' }}>
                        <td className="mono" style={{ padding: '1rem', fontSize: '0.85rem', fontWeight: 600 }}>{(order.id || '').toString().slice(-6).toUpperCase() || 'N/A'}</td>
                        <td style={{ padding: '1rem', fontWeight: 800, color: 'var(--ink)' }}>{order.productName}</td>
                        <td style={{ padding: '1rem', fontWeight: 700 }}>x{order.quantity}</td>
                        <td style={{ padding: '1rem', fontWeight: 800, color: 'var(--ink)' }}>₹{order.totalPrice?.toLocaleString() || (order.quantity * order.price)?.toLocaleString()}</td>
                        <td style={{ padding: '1rem', fontSize: '0.8rem', color: 'var(--muted)', fontWeight: 600 }}>{order.createdAt ? new Date(order.createdAt.toDate ? order.createdAt.toDate() : order.createdAt).toLocaleString() : 'Just now'}</td>
                        <td style={{ padding: '1rem', textAlign: 'center' }}>
                          <span style={{ padding: '0.3rem 0.6rem', borderRadius: '20px', fontSize: '0.7rem', fontWeight: 800, background: statusBg, color: statusColor, textTransform: 'uppercase' }}>{order.status}</span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
