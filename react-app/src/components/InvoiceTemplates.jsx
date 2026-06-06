import React from 'react';

// Common Utils
const formatPrice = (p) => Number(p || 0).toFixed(2);

// 1. STANDARD TEMPLATE: Professional Business Look
export const StandardTemplate = ({ cart = [], customer = {}, subtotal = 0, taxAmount = 0, discAmount = 0, grandTotal = 0, invoiceNo = '', date = '', invType = '', storeProfile = {}, couponCode = '' }) => {
    const storeName = storeProfile?.profile?.businessName || 'FOODBILL PRO';
    const storeSub = storeProfile?.profile?.address?.split(',').pop()?.trim() || 'Business Suite';

    return (
        <div className="invoice-preview standard" style={{ padding: '20px', background: '#fff' }}>
            {storeProfile?.profile?.logo && (
                <div style={{ textAlign: 'center', marginBottom: '15px' }}>
                    <img src={storeProfile.profile.logo} alt="Logo" style={{ maxHeight: '60px', maxWidth: '150px', objectFit: 'contain' }} />
                </div>
            )}
            <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '2px solid #3b82f6', paddingBottom: '15px', marginBottom: '20px' }}>
                <div style={{ textAlign: 'left' }}>
                    <h1 style={{ margin: 0, color: '#1e3a8a', fontSize: '24px' }}>{storeName.toUpperCase()}</h1>
                    <p style={{ margin: 0, color: '#64748b', fontSize: '13px' }}>{storeSub}</p>
                </div>
                <div style={{ textAlign: 'right' }}>
                    <h2 style={{ margin: 0, color: '#3b82f6', fontSize: '18px' }}>INVOICE</h2>
                    <p style={{ margin: 0, fontSize: '12px' }}># {invoiceNo}</p>
                </div>
            </div>

            <div style={{ marginBottom: '20px', textAlign: 'left', fontSize: '13px' }}>
                <p style={{ margin: '0 0 5px 0' }}><strong>Billed To:</strong></p>
                <p style={{ margin: 0 }}>{customer.name || 'Walk-in Customer'}</p>
                {customer.phone && <p style={{ margin: 0 }}>Tel: {customer.phone}</p>}
                {customer.tableNo && <p style={{ margin: 0 }}>Table: {customer.tableNo}</p>}
            </div>

            <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '20px' }}>
                <thead>
                    <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                        <th style={{ textAlign: 'left', padding: '8px', fontSize: '12px' }}>Item</th>
                        <th style={{ textAlign: 'center', padding: '8px', fontSize: '12px' }}>Qty</th>
                        <th style={{ textAlign: 'right', padding: '8px', fontSize: '12px' }}>Total</th>
                    </tr>
                </thead>
                <tbody>
                    {cart.map((item, i) => (
                        <tr key={i} style={{ borderBottom: '1px solid #f1f5f9' }}>
                            <td style={{ padding: '8px', fontSize: '13px' }}>
                                <div>{item.name}</div>
                                <div style={{ fontSize: '10px', color: '#64748b' }}>₹{formatPrice(item.price)}</div>
                            </td>
                            <td style={{ padding: '8px', textAlign: 'center', fontSize: '13px' }}>{item.qty}</td>
                            <td style={{ padding: '8px', textAlign: 'right', fontSize: '13px' }}>₹{formatPrice(Number(item.price) * item.qty)}</td>
                        </tr>
                    ))}
                </tbody>
            </table>

            <div style={{ marginLeft: 'auto', width: '200px' }}>
                <table style={{ width: '100%', fontSize: '13px' }}>
                    <tbody>
                        <tr><td style={{ textAlign: 'left', padding: '4px 0' }}>Subtotal</td><td style={{ textAlign: 'right' }}>₹{formatPrice(subtotal)}</td></tr>
                        {discAmount > 0 && <tr><td style={{ textAlign: 'left', padding: '4px 0' }}>Disc</td><td style={{ textAlign: 'right', color: '#ef4444' }}>-₹{formatPrice(discAmount)}</td></tr>}
                        {taxAmount > 0 && <tr><td style={{ textAlign: 'left', padding: '4px 0' }}>Tax</td><td style={{ textAlign: 'right' }}>₹{formatPrice(taxAmount)}</td></tr>}
                        <tr style={{ fontWeight: 'bold', fontSize: '16px', color: '#1e40af' }}>
                            <td style={{ borderTop: '1px solid #e2e8f0', paddingTop: '8px' }}>TOTAL</td>
                            <td style={{ borderTop: '1px solid #e2e8f0', textAlign: 'right', paddingTop: '8px' }}>₹{formatPrice(grandTotal)}</td>
                        </tr>
                    </tbody>
                </table>
            </div>
            
            <div style={{ textAlign: 'center', marginTop: '30px', borderTop: '1px solid #f1f5f9', paddingTop: '10px', color: '#94a3b8', fontSize: '11px' }}>
                Thank you for your business!
            </div>
        </div>
    );
};

// 2. ELEGANT TEMPLATE: Luxury Accented Look
export const ElegantTemplate = ({ cart = [], customer = {}, subtotal = 0, taxAmount = 0, discAmount = 0, grandTotal = 0, invoiceNo = '', date = '', invType = '', storeProfile = {}, couponCode = '' }) => {
    const storeName = storeProfile?.profile?.businessName || 'FoodBill';
    return (
        <div className="invoice-preview elegant" style={{ background: '#fff', position: 'relative', padding: '30px' }}>
            <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '6px', background: 'linear-gradient(90deg, #f97316, #fbbf24)' }}></div>
            
            <div style={{ textAlign: 'center', marginBottom: '30px' }}>
                {storeProfile?.profile?.logo && (
                    <img src={storeProfile.profile.logo} alt="Logo" style={{ maxHeight: '50px', marginBottom: '10px' }} />
                )}
                <h1 style={{ margin: 0, fontSize: '28px', color: '#f97316' }}>{storeName}</h1>
                <div style={{ color: '#94a3b8', fontSize: '12px', textTransform: 'uppercase', letterSpacing: '2px' }}>INVOICE #{invoiceNo}</div>
            </div>

            <div style={{ border: '1px solid #fed7aa', padding: '15px', borderRadius: '8px', marginBottom: '25px', textAlign: 'left' }}>
                <span style={{ fontSize: '10px', color: '#ea580c', fontWeight: 'bold' }}>CUSTOMER</span>
                <h3 style={{ margin: '5px 0 0 0', color: '#431407' }}>{customer.name || 'Valued Guest'}</h3>
                {customer.phone && <p style={{ margin: 0, fontSize: '12px', color: '#9a3412' }}>{customer.phone}</p>}
            </div>

            <table style={{ width: '100%', marginBottom: '25px' }}>
                <tbody>
                    {cart.map((item, i) => (
                        <tr key={i}>
                            <td style={{ textAlign: 'left', padding: '12px 0', borderBottom: '1px solid #fed7aa' }}>
                                <div style={{ fontSize: '14px', fontWeight: 'bold', color: '#431407' }}>{item.name}</div>
                                <div style={{ fontSize: '11px', color: '#f97316' }}>₹{formatPrice(item.price)} × {item.qty}</div>
                            </td>
                            <td style={{ textAlign: 'right', padding: '12px 0', borderBottom: '1px solid #fed7aa', fontSize: '14px', fontWeight: 'bold' }}>
                                ₹{formatPrice(Number(item.price) * item.qty)}
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>

            <div style={{ border: '2px solid #431407', padding: '20px', borderRadius: '12px', color: '#431407' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px', fontSize: '13px' }}>
                    <span>Subtotal</span>
                    <span>₹{formatPrice(subtotal)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '12px', fontWeight: 'bold' }}>AMOUNT DUE</span>
                    <span style={{ fontSize: '22px', fontWeight: 'bold' }}>₹{formatPrice(grandTotal)}</span>
                </div>
            </div>

            <p style={{ textAlign: 'center', marginTop: '30px', fontSize: '12px', color: '#9a3412', fontWeight: 500 }}>VISIT US AGAIN</p>
        </div>
    );
};

// 3. THERMAL TEMPLATE: Clean Monospace Receipt (Classic POS)
export const ThermalTemplate = ({ cart = [], customer = {}, subtotal = 0, taxAmount = 0, discAmount = 0, grandTotal = 0, invoiceNo = '', date = '', invType = '', storeProfile = {}, couponCode = '' }) => {
    const storeName = storeProfile?.profile?.businessName || 'FOODBILL POS';
    const gstin = storeProfile?.legal?.gstin || '33ABCDE1234F1Z5';

    return (
        <div className="invoice-preview thermal" style={{ 
            fontFamily: "'Courier New', Courier, monospace", 
            fontSize: '13px', 
            lineHeight: '1.4', 
            color: '#000', 
            textAlign: 'center', 
            padding: '10px' 
        }}>
            {storeProfile?.profile?.logo && (
                <div style={{ marginBottom: '5px' }}>
                    <img src={storeProfile.profile.logo} alt="Logo" style={{ maxHeight: '40px', maxWidth: '100px', filter: 'grayscale(1)' }} />
                </div>
            )}
            <h3 style={{ margin: '0', textTransform: 'uppercase', fontSize: '16px' }}>{storeName}</h3>
            <p style={{ margin: 0 }}>GSTIN: {gstin}</p>
            <p style={{ margin: 0 }}>Date: {date}</p>
            <p style={{ margin: 0 }}>Bill: #{invoiceNo?.toString().slice(-6).toUpperCase()}</p>
            
            <p style={{ margin: '5px 0' }}>--------------------------------</p>
            <div style={{ textAlign: 'left' }}>
                <p style={{ margin: 0 }}>Cust: {customer.name || 'Walk-in'}</p>
                {customer.tableNo && <p style={{ margin: 0 }}>Table: {customer.tableNo}</p>}
            </div>
            <p style={{ margin: '5px 0' }}>--------------------------------</p>

            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <tbody>
                    {cart.map((item, i) => (
                        <React.Fragment key={i}>
                            <tr>
                                <td style={{ textAlign: 'left' }}>{item.name}</td>
                                <td style={{ textAlign: 'right' }}>{formatPrice(Number(item.price) * item.qty)}</td>
                            </tr>
                            <tr>
                                <td style={{ textAlign: 'left', fontSize: '11px', paddingBottom: '5px' }}>
                                    {item.qty} x {formatPrice(item.price)}
                                </td>
                                <td></td>
                            </tr>
                        </React.Fragment>
                    ))}
                </tbody>
            </table>

            <p style={{ margin: '5px 0' }}>--------------------------------</p>
            
            <table style={{ width: '100%' }}>
                <tbody>
                    <tr><td style={{ textAlign: 'left' }}>Subtotal:</td><td style={{ textAlign: 'right' }}>{formatPrice(subtotal)}</td></tr>
                    {taxAmount > 0 && <tr><td style={{ textAlign: 'left' }}>Tax:</td><td style={{ textAlign: 'right' }}>{formatPrice(taxAmount)}</td></tr>}
                    <tr style={{ fontWeight: 'bold', fontSize: '15px' }}>
                        <td style={{ paddingTop: '5px' }}>TOTAL:</td>
                        <td style={{ textAlign: 'right', paddingTop: '5px' }}>₹{formatPrice(grandTotal)}</td>
                    </tr>
                </tbody>
            </table>

            <p style={{ margin: '5px 0' }}>--------------------------------</p>
            <p style={{ margin: 0 }}>ITEMS: {cart.length} | QTY: {cart.reduce((s, i) => s + (i.qty || 0), 0)}</p>
            <p style={{ marginTop: '10px' }}>Thank You For Visiting!</p>
        </div>
    );
};
