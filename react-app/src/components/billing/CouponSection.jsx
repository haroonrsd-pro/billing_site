import React from 'react';
import { Tag, X, ChevronRight, Percent, IndianRupee, Ticket } from 'lucide-react';

/**
 * CouponSection UI Component for Billing Module
 * Designed to fit seamlessly into the Premium POS Sidebar
 */
export default function CouponSection({ 
    couponCode, 
    setCouponCode, 
    appliedCoupon, 
    couponError, 
    applyCoupon, 
    removeCoupon,
    subtotal 
}) {
    return (
        <div style={{ 
            padding: '1.25rem 0', 
            borderTop: '1px dashed #e2e8f0',
            borderBottom: '1px dashed #e2e8f0',
            margin: '0.75rem 0'
        }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '1rem' }}>
                <Ticket size={16} color="#6366f1" />
                <span style={{ fontSize: '0.85rem', fontWeight: 800, color: '#1e293b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    Store Offers
                </span>
            </div>

            {!appliedCoupon ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'stretch' }}>
                        <div style={{ position: 'relative', flex: 1, display: 'flex' }}>
                            <Tag size={16} color="#94a3b8" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
                            <input
                                type="text"
                                value={couponCode}
                                onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                                placeholder="ENTER CODE"
                                style={{
                                    width: '100%',
                                    padding: '0.75rem 1rem 0.75rem 2.5rem',
                                    borderRadius: '14px',
                                    border: `1.5px solid ${couponError ? '#ef4444' : '#e2e8f0'}`,
                                    fontSize: '0.85rem',
                                    fontWeight: '700',
                                    outline: 'none',
                                    textTransform: 'uppercase',
                                    background: '#f8fafc',
                                    transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                                    color: '#1e293b',
                                    boxSizing: 'border-box',
                                    minHeight: '44px'
                                }}
                                onFocus={(e) => e.target.style.borderColor = '#6366f1'}
                                onBlur={(e) => e.target.style.borderColor = couponError ? '#ef4444' : '#e2e8f0'}
                            />
                        </div>
                        <button
                            onClick={() => applyCoupon(subtotal)}
                            style={{
                                background: 'linear-gradient(135deg, #6366f1, #4f46e5)',
                                color: 'white',
                                padding: '0 1.25rem',
                                borderRadius: '14px',
                                border: 'none',
                                fontSize: '0.85rem',
                                fontWeight: '900',
                                cursor: 'pointer',
                                transition: '0.2s',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '4px',
                                boxShadow: '0 4px 6px -1px rgba(99, 102, 241, 0.3)',
                                boxSizing: 'border-box',
                                minHeight: '44px'
                            }}
                        >
                            APPLY
                        </button>
                    </div>
                    {couponError && (
                        <div style={{ 
                            fontSize: '0.75rem', 
                            color: '#ef4444', 
                            fontWeight: '700', 
                            display: 'flex', 
                            alignItems: 'center', 
                            gap: '4px',
                            padding: '4px 12px',
                            background: '#fef2f2',
                            borderRadius: '8px',
                            width: 'fit-content'
                        }}>
                            <X size={12} strokeWidth={3} /> {couponError}
                        </div>
                    )}
                    <span style={{ fontSize: '0.7rem', color: '#94a3b8', fontWeight: 600 }}>
                        One coupon applicable per transaction
                    </span>
                </div>
            ) : (
                <div 
                    style={{ 
                        display: 'flex', 
                        justifyContent: 'space-between', 
                        alignItems: 'center', 
                        background: 'linear-gradient(135deg, #f5f3ff, #ede9fe)', 
                        padding: '1rem', 
                        borderRadius: '16px', 
                        border: '1.5px solid #6366f130',
                        animation: 'popIn 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)',
                        position: 'relative',
                        overflow: 'hidden'
                    }}
                >
                    {/* Decorative abstract circle */}
                    <div style={{ position: 'absolute', width: '60px', height: '60px', background: '#6366f110', borderBottomRightRadius: '100%', top: 0, left: 0 }} />

                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', position: 'relative', zIndex: 1 }}>
                        <div style={{ 
                            width: '36px', height: '36px', 
                            background: 'white', 
                            borderRadius: '10px', 
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            boxShadow: '0 2px 4px rgba(99, 102, 241, 0.1)'
                        }}>
                            <Tag size={18} color="#6366f1" />
                        </div>
                        <div>
                            <div style={{ fontSize: '0.9rem', fontWeight: '900', color: '#1e293b', letterSpacing: '0.5px' }}>
                                {appliedCoupon.code}
                            </div>
                            <div style={{ fontSize: '0.7rem', color: '#6366f1', fontWeight: '800' }}>
                                PROMO APPLIED
                            </div>
                        </div>
                    </div>

                    <button 
                        onClick={removeCoupon}
                        style={{ 
                            background: 'white', 
                            border: '1px solid #e2e8f0', 
                            color: '#ef4444', 
                            cursor: 'pointer', 
                            width: '28px', height: '28px', 
                            borderRadius: '8px',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            transition: '0.2s',
                            boxShadow: '0 2px 4px rgba(0,0,0,0.05)'
                        }}
                        onMouseEnter={(e) => e.target.style.background = '#fef2f2'}
                        onMouseLeave={(e) => e.target.style.background = 'white'}
                    >
                        <X size={16} />
                    </button>
                    
                    <style>{`
                        @keyframes popIn {
                            from { transform: scale(0.95); opacity: 0; }
                            to { transform: scale(1); opacity: 1; }
                        }
                    `}</style>
                </div>
            )}
        </div>
    );
}
