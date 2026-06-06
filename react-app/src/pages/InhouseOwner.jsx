import React, { useState, useEffect } from 'react';
import { Package, Plus, Edit, Trash2, Check, X, Bell, LayoutDashboard, ListOrdered, Image as ImageIcon, UploadCloud } from 'lucide-react';
import { db, storage } from '../firebaseConfig';
import { useFirestore } from '../hooks/useFirestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { useDevice } from '../context/DeviceContext';

export default function InhouseOwner() {
  const { isMobile } = useDevice();
  const [activeTab, setActiveTab] = useState('products'); // 'products' or 'orders'
  // Use useFirestore hook for multi-tenant isolation
  const { 
    docs: products, 
    addDocument: addProduct, 
    updateDocument: updateProduct, 
    deleteDocument: deleteProduct,
    loading: productsLoading 
  } = useFirestore('inhouse_products', { orderBy: ['createdAt', 'desc'] });

  const { 
    docs: orders, 
    updateDocument: updateOrder,
    loading: ordersLoading 
  } = useFirestore('inhouse_orders', { orderBy: ['createdAt', 'desc'] });

  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [productForm, setProductForm] = useState({ name: '', category: '', price: '', quantity: '', description: '', image: '' });
  const [isUploading, setIsUploading] = useState(false);
  const [unreadOrdersCount, setUnreadOrdersCount] = useState(0);

  useEffect(() => {
    const pendingCount = orders.filter(o => o.status === 'pending').length;
    setUnreadOrdersCount(pendingCount);
  }, [orders]);

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setIsUploading(true);
    try {
      const storageRef = ref(storage, `inhouse_product_images/${Date.now()}_${file.name.replace(/[^a-zA-Z0-9.]/g, '')}`);
      const snapshot = await uploadBytes(storageRef, file);
      const downloadURL = await getDownloadURL(snapshot.ref);
      setProductForm(prev => ({ ...prev, image: downloadURL }));
    } catch (error) {
      console.error("Error uploading image: ", error);
      alert("Failed to upload image.");
    } finally {
      setIsUploading(false);
    }
  };

  const handleSaveProduct = async (e) => {
    e.preventDefault();
    // Prioritize fb_user_owner_id for path consistency in useFirestore hook
    const ownerId = sessionStorage.getItem('fb_user_owner_id') || sessionStorage.getItem('fb_user_uid') || 'owner_1';
    
    try {
      if (editingProduct) {
        await updateProduct(editingProduct.id, {
          ...productForm,
          price: parseFloat(productForm.price) || 0,
          quantity: parseInt(productForm.quantity, 10) || 0
        });
      } else {
        await addProduct({
          ...productForm,
          price: parseFloat(productForm.price) || 0,
          quantity: parseInt(productForm.quantity, 10) || 0,
          createdBy: ownerId
        });
      }
      setIsProductModalOpen(false);
      setEditingProduct(null);
      setProductForm({ name: '', category: '', price: '', quantity: '', description: '', image: '' });
    } catch (error) {
      console.error("Error saving product: ", error);
      alert("Failed to save product: " + (error.message || "Unknown error"));
    }
  };

  const handleEditProduct = (prod) => {
    setEditingProduct(prod);
    setProductForm({ name: prod.name, category: prod.category, price: prod.price, quantity: prod.quantity, description: prod.description || '', image: prod.image || '' });
    setIsProductModalOpen(true);
  };

  const handleDeleteProduct = async (id) => {
    if (window.confirm("Are you sure you want to delete this product?")) {
      try {
        await deleteProduct(id);
      } catch (error) {
        console.error("Error deleting product: ", error);
      }
    }
  };

  const handleUpdateOrderStatus = async (orderId, newStatus) => {
    try {
      await updateOrder(orderId, { status: newStatus });
      
      // If approved, update product stock
      if (newStatus === 'approved') {
        const order = orders.find(o => o.id === orderId);
        if (order && order.productId) {
            const product = products.find(p => p.id === order.productId);
            if (product) {
                const newStock = Math.max(0, product.quantity - order.quantity);
                await updateProduct(product.id, { quantity: newStock });
            }
        }
      }
    } catch (error) {
      console.error("Error updating order status: ", error);
    }
  };

  const cardStyle = { background: 'white', borderRadius: '16px', padding: '1.5rem', border: '1px solid var(--border)', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' };

  return (
    <div className="page active" style={{ animation: "fadeIn 0.4s ease", paddingBottom: '96px', background: '#f8fafc', minHeight: '100vh', padding: '1.5rem 2rem' }}>
      <div className="pg-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <div>
          <h1 className="pg-title" style={{ fontFamily: "'Yeseva One', serif", fontSize: '2.2rem', color: 'var(--ink)' }}>In-House Purchase <span style={{color: 'var(--accent)'}}>Module</span></h1>
          <p className="pg-sub" style={{ color: 'var(--muted)', fontSize: '1rem', fontWeight: 500 }}>Owner Management Hub</p>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem', padding: '4px', background: '#e2e8f0', borderRadius: '12px' }}>
          <button 
            onClick={() => setActiveTab('products')} 
            style={{ padding: '8px 16px', borderRadius: '8px', border: 'none', background: activeTab === 'products' ? '#fff' : 'transparent', color: activeTab === 'products' ? '#1e293b' : '#64748b', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.4rem', cursor: 'pointer', boxShadow: activeTab === 'products' ? '0 2px 4px rgba(0,0,0,0.05)' : 'none', transition: 'all 0.2s' }}>
            <Package size={16} /> Products
          </button>
          <button 
            onClick={() => setActiveTab('orders')} 
            style={{ padding: '8px 16px', borderRadius: '8px', border: 'none', background: activeTab === 'orders' ? '#fff' : 'transparent', color: activeTab === 'orders' ? '#1e293b' : '#64748b', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.4rem', cursor: 'pointer', boxShadow: activeTab === 'orders' ? '0 2px 4px rgba(0,0,0,0.05)' : 'none', transition: 'all 0.2s', position: 'relative' }}>
            <ListOrdered size={16} /> Orders
            {unreadOrdersCount > 0 && <span style={{ position: 'absolute', top: '-4px', right: '-4px', background: '#ef4444', color: 'white', fontSize: '0.6rem', padding: '2px 6px', borderRadius: '10px', fontWeight: 'bold' }}>{unreadOrdersCount}</span>}
          </button>
        </div>
      </div>

      {activeTab === 'products' && (
        <div style={{ animation: "fadeIn 0.4s ease" }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
            <h2 style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--ink)', margin: 0 }}>Product Management</h2>
            <button onClick={() => { setEditingProduct(null); setProductForm({ name: '', category: '', price: '', quantity: '', description: '', image: '' }); setIsProductModalOpen(true); }} className="btn btn-primary btn-sm" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', borderRadius: '10px' }}>
              <Plus size={16} /> Add Product
            </button>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1.5rem' }}>
            {products.length === 0 ? (
              <div style={{ ...cardStyle, gridColumn: '1 / -1', textAlign: 'center', padding: '3rem 0', opacity: 0.6 }}>
                <Package size={48} style={{ margin: '0 auto 1rem auto', color: 'var(--muted)' }} />
                <p style={{ fontWeight: 600 }}>No products added yet.</p>
              </div>
            ) : products.map(prod => (
              <div key={prod.id} style={{ ...cardStyle, padding: '1.2rem', display: 'flex', flexDirection: 'column', height: '100%' }}>
                {prod.image ? (
                   <div style={{ height: '140px', width: '100%', borderRadius: '12px', background: '#f1f5f9', marginBottom: '1rem', backgroundImage: `url(${prod.image})`, backgroundSize: 'cover', backgroundPosition: 'center' }} />
                ) : (
                   <div style={{ height: '140px', width: '100%', borderRadius: '12px', background: '#f1f5f9', marginBottom: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#cbd5e1' }}>
                     <ImageIcon size={32} />
                   </div>
                )}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
                  <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800, color: 'var(--ink)' }}>{prod.name}</h3>
                  <span style={{ fontSize: '0.7rem', padding: '0.2rem 0.6rem', background: '#eef2ff', color: '#6366f1', borderRadius: '10px', fontWeight: 700 }}>{prod.category}</span>
                </div>
                <p style={{ fontSize: '0.8rem', color: 'var(--muted)', margin: '0 0 1rem 0', flex: 1 }}>{prod.description || 'No description'}</p>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.8rem', background: '#f8fafc', borderRadius: '10px', marginBottom: '1rem' }}>
                    <div style={{ fontWeight: 800, fontSize: '1.1rem', color: '#10b981' }}>₹{prod.price}</div>
                    <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--muted)' }}>Stock: <span style={{ color: prod.quantity > 0 ? "var(--ink)" : "#ef4444" }}>{prod.quantity}</span></div>
                </div>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button onClick={() => handleEditProduct(prod)} style={{ flex: 1, padding: '0.6rem', border: '1px solid #e2e8f0', background: 'white', borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.3rem', fontWeight: 600, color: '#475569' }}>
                    <Edit size={14} /> Edit
                  </button>
                  <button onClick={() => handleDeleteProduct(prod.id)} style={{ flex: 1, padding: '0.6rem', border: '1px solid #fee2e2', background: '#fef2f2', borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.3rem', fontWeight: 600, color: '#ef4444' }}>
                    <Trash2 size={14} /> Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'orders' && (
        <div style={{ animation: "fadeIn 0.4s ease" }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
            <h2 style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--ink)', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
              Order Management 
              {unreadOrdersCount > 0 && <span style={{ padding: '0.2rem 0.6rem', background: '#ef4444', color: 'white', fontSize: '0.7rem', borderRadius: '20px' }}>{unreadOrdersCount} incoming</span>}
            </h2>
          </div>

          <div style={{ ...cardStyle }}>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border)', background: '#f8fafc' }}>
                    <th style={{ padding: '1rem', fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase', color: 'var(--muted)' }}>Order ID</th>
                    <th style={{ padding: '1rem', fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase', color: 'var(--muted)' }}>Product</th>
                    <th style={{ padding: '1rem', fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase', color: 'var(--muted)' }}>Qty</th>
                    <th style={{ padding: '1rem', fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase', color: 'var(--muted)' }}>Date</th>
                    <th style={{ padding: '1rem', fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase', color: 'var(--muted)' }}>Status</th>
                    <th style={{ padding: '1rem', fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase', color: 'var(--muted)', textAlign: 'center' }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {orders.length === 0 ? (
                    <tr><td colSpan="6" style={{ padding: '3rem', textAlign: 'center', color: 'var(--muted)', fontWeight: 600 }}>No orders found.</td></tr>
                  ) : orders.map(order => {
                    const statusColor = order.status === 'pending' ? '#f59e0b' : order.status === 'approved' ? '#10b981' : '#ef4444';
                    const statusBg = order.status === 'pending' ? '#fef3c7' : order.status === 'approved' ? '#ecfdf5' : '#fef2f2';
                    return (
                      <tr key={order.id} style={{ borderBottom: '1px solid var(--border)' }}>
                        <td className="mono" style={{ padding: '1rem', fontSize: '0.85rem', fontWeight: 600 }}>{(order.id || '').toString().slice(-6).toUpperCase() || 'N/A'}</td>
                        <td style={{ padding: '1rem', fontWeight: 700, color: 'var(--ink)' }}>{order.productName}</td>
                        <td style={{ padding: '1rem', fontWeight: 700 }}>x{order.quantity}</td>
                        <td style={{ padding: '1rem', fontSize: '0.8rem', color: 'var(--muted)' }}>{order.createdAt ? new Date(order.createdAt.toDate ? order.createdAt.toDate() : order.createdAt).toLocaleString() : 'Just now'}</td>
                        <td style={{ padding: '1rem' }}>
                          <span style={{ padding: '0.3rem 0.6rem', borderRadius: '20px', fontSize: '0.7rem', fontWeight: 800, background: statusBg, color: statusColor, textTransform: 'uppercase' }}>{order.status}</span>
                        </td>
                        <td style={{ padding: '1rem', textAlign: 'center' }}>
                          {order.status === 'pending' ? (
                            <div style={{ display: 'flex', justifyContent: 'center', gap: '0.5rem' }}>
                              <button onClick={() => handleUpdateOrderStatus(order.id, 'approved')} style={{ padding: '0.4rem', border: 'none', background: '#ecfdf5', color: '#10b981', borderRadius: '8px', cursor: 'pointer' }} title="Approve"><Check size={16} /></button>
                              <button onClick={() => handleUpdateOrderStatus(order.id, 'rejected')} style={{ padding: '0.4rem', border: 'none', background: '#fef2f2', color: '#ef4444', borderRadius: '8px', cursor: 'pointer' }} title="Reject"><X size={16} /></button>
                            </div>
                          ) : (
                            <span style={{ fontSize: '0.8rem', color: 'var(--muted)' }}>Processed</span>
                          )}
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

      {/* Product Modal */}
      {isProductModalOpen && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
          <div style={{ background: 'white', width: '100%', maxWidth: '500px', borderRadius: '20px', padding: '2rem', animation: 'riseIn 0.3s ease' }}>
            <h2 style={{ marginTop: 0, color: 'var(--ink)', fontSize: '1.4rem' }}>{editingProduct ? 'Edit Product' : 'Add New Product'}</h2>
            <form onSubmit={handleSaveProduct} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, marginBottom: '0.4rem', color: 'var(--muted)' }}>Product Name *</label>
                <input required value={productForm.name} onChange={e => setProductForm({...productForm, name: e.target.value})} style={{ width: '100%', padding: '0.8rem', borderRadius: '10px', border: '1px solid var(--border)', fontSize: '1rem', boxSizing: 'border-box' }} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, marginBottom: '0.4rem', color: 'var(--muted)' }}>Price (₹) *</label>
                  <input required type="number" min="0" step="0.01" value={productForm.price} onChange={e => setProductForm({...productForm, price: e.target.value})} style={{ width: '100%', padding: '0.8rem', borderRadius: '10px', border: '1px solid var(--border)', fontSize: '1rem', boxSizing: 'border-box' }} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, marginBottom: '0.4rem', color: 'var(--muted)' }}>Quantity *</label>
                  <input required type="number" min="0" value={productForm.quantity} onChange={e => setProductForm({...productForm, quantity: e.target.value})} style={{ width: '100%', padding: '0.8rem', borderRadius: '10px', border: '1px solid var(--border)', fontSize: '1rem', boxSizing: 'border-box' }} />
                </div>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, marginBottom: '0.4rem', color: 'var(--muted)' }}>Category</label>
                <input value={productForm.category} onChange={e => setProductForm({...productForm, category: e.target.value})} placeholder="e.g. Disposables, Utensils" style={{ width: '100%', padding: '0.8rem', borderRadius: '10px', border: '1px solid var(--border)', fontSize: '1rem', boxSizing: 'border-box' }} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, marginBottom: '0.4rem', color: 'var(--muted)' }}>Product Image (Optional)</label>
                <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                  <div style={{ flex: 1, position: 'relative' }}>
                    <input 
                      type="file" 
                      accept="image/*"
                      onChange={handleImageUpload}
                      disabled={isUploading}
                      style={{ position: 'absolute', inset: 0, opacity: 0, cursor: isUploading ? 'not-allowed' : 'pointer', zIndex: 10, width: '100%', height: '100%' }}
                    />
                    <div style={{ width: '100%', padding: '0.8rem', borderRadius: '10px', border: '2px dashed var(--accent)', fontSize: '0.9rem', background: '#eef2ff', color: 'var(--accent)', fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.6rem', boxSizing: 'border-box', transition: 'all 0.2s', opacity: isUploading ? 0.7 : 1 }}>
                      <UploadCloud size={18} /> {isUploading ? 'Uploading to Server...' : 'Upload from Gallery'}
                    </div>
                  </div>
                  {(productForm.image || isUploading) && (
                     <div style={{ width: '48px', height: '48px', borderRadius: '10px', background: '#f1f5f9', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid var(--border)', flexShrink: 0 }}>
                        {isUploading ? <span style={{ fontSize: '0.6rem', color: 'var(--muted)', fontWeight: 700 }}>...</span> : <img src={productForm.image} alt="Preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />}
                     </div>
                  )}
                </div>
                {productForm.image && !isUploading && <div style={{ fontSize: '0.75rem', color: '#10b981', fontWeight: 800, marginTop: '6px', display: 'flex', alignItems: 'center', gap: '4px' }}><Check size={12}/> Image attached successfully</div>}
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, marginBottom: '0.4rem', color: 'var(--muted)' }}>Description</label>
                <textarea value={productForm.description} onChange={e => setProductForm({...productForm, description: e.target.value})} rows="3" style={{ width: '100%', padding: '0.8rem', borderRadius: '10px', border: '1px solid var(--border)', fontSize: '1rem', resize: 'vertical', boxSizing: 'border-box' }} />
              </div>
              <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
                <button type="button" onClick={() => setIsProductModalOpen(false)} style={{ flex: 1, padding: '1rem', borderRadius: '12px', border: 'none', background: '#f1f5f9', color: '#475569', fontWeight: 700, cursor: 'pointer', fontSize: '1rem' }}>Cancel</button>
                <button type="submit" disabled={isUploading} style={{ flex: 1, padding: '1rem', borderRadius: '12px', border: 'none', background: 'var(--accent)', color: 'white', fontWeight: 700, cursor: isUploading ? 'not-allowed' : 'pointer', fontSize: '1rem', boxShadow: '0 4px 12px rgba(79, 70, 229, 0.3)', opacity: isUploading ? 0.7 : 1 }}>{editingProduct ? 'Save Changes' : 'Create Product'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
