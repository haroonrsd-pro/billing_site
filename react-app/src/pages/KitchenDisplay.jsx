import React, { useState, useEffect, useRef } from 'react';
import { db } from '../firebaseConfig';
import { collection, doc, updateDoc, onSnapshot, query, where, orderBy } from 'firebase/firestore';
import { useMessaging } from '../context/MessagingContext';
import { ChefHat, Volume2, VolumeX, Clock, Bell, Check, ArrowRight, Play, CheckCircle, RefreshCw, AlertTriangle, Receipt } from 'lucide-react';

export default function KitchenDisplay() {
    const { showToast } = useMessaging();
    const ownerId = sessionStorage.getItem('fb_user_owner_id') || sessionStorage.getItem('fb_user_uid');
    const branchId = sessionStorage.getItem('fb_user_branch_id') || 'main';
    const branchName = sessionStorage.getItem('fb_user_station') || 'Main Branch';

    // State
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [soundEnabled, setSoundEnabled] = useState(() => {
        const saved = localStorage.getItem('kds_sound_enabled');
        return saved !== 'false'; // default to true
    });
    
    // Live ticking state for elapsed timers
    const [currentTime, setCurrentTime] = useState(Date.now());
    const prevOrderCountRef = useRef(0);

    const ordersColPath = `owners/${ownerId}/branches/${branchId}/orders`;

    // 1. Play synthesized beep sound via Web Audio API (no external file needed)
    const playAlertSound = () => {
        if (!soundEnabled) return;
        try {
            const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
            const oscillator = audioCtx.createOscillator();
            const gainNode = audioCtx.createGain();
            
            oscillator.type = 'sine';
            oscillator.frequency.setValueAtTime(587.33, audioCtx.currentTime); // D5
            oscillator.connect(gainNode);
            gainNode.connect(audioCtx.destination);
            
            gainNode.gain.setValueAtTime(0.3, audioCtx.currentTime);
            oscillator.start();
            
            setTimeout(() => {
                oscillator.stop();
                // Second beep
                const osc2 = audioCtx.createOscillator();
                const gain2 = audioCtx.createGain();
                osc2.type = 'sine';
                osc2.frequency.setValueAtTime(880, audioCtx.currentTime); // A5
                osc2.connect(gain2);
                gain2.connect(audioCtx.destination);
                gain2.gain.setValueAtTime(0.3, audioCtx.currentTime);
                osc2.start();
                setTimeout(() => osc2.stop(), 150);
            }, 150);
        } catch (err) {
            console.warn("Web Audio API not supported or blocked:", err);
        }
    };

    // 2. Query active orders real-time
    useEffect(() => {
        if (!ownerId) return;

        const q = query(collection(db, ordersColPath));

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const list = snapshot.docs
                .map(doc => ({ id: doc.id, ...doc.data() }))
                .filter(o => ['new', 'preparing', 'ready', 'served'].includes(o.status))
                .sort((a, b) => {
                    const timeA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
                    const timeB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
                    return timeA - timeB;
                });
            setOrders(list);
            setLoading(false);

            // Play alert sound if new orders are added
            const newOrdersCount = list.filter(o => o.status === 'new').length;
            if (newOrdersCount > prevOrderCountRef.current) {
                playAlertSound();
                showToast("New table order received! 🔔", "info");
            }
            prevOrderCountRef.current = newOrdersCount;
        }, (err) => {
            console.error("KDS firestore error:", err);
            showToast("Failed to fetch kitchen orders.", "error");
            setLoading(false);
        });

        return unsubscribe;
    }, [ownerId, branchId, soundEnabled]);

    // 3. Update current time every 10 seconds to refresh elapsed timers
    useEffect(() => {
        const timer = setInterval(() => {
            setCurrentTime(Date.now());
        }, 10000);
        return () => clearInterval(timer);
    }, []);

    const handleToggleSound = () => {
        const newVal = !soundEnabled;
        setSoundEnabled(newVal);
        localStorage.setItem('kds_sound_enabled', String(newVal));
        showToast(newVal ? "Audio alerts enabled" : "Audio alerts muted", "info");
    };

    // Progress actions
    const handleUpdateStatus = async (orderId, newStatus) => {
        try {
            await updateDoc(doc(db, ordersColPath, orderId), {
                status: newStatus,
                updatedAt: new Date().toISOString()
            });
            showToast(`Order status updated to ${newStatus}.`, "success");
        } catch (err) {
            showToast("Failed to update status: " + err.message, "error");
        }
    };

    // Format elapsed time (e.g. "5m ago")
    const getElapsedTime = (createdAtStr) => {
        if (!createdAtStr) return '0m';
        const created = new Date(createdAtStr).getTime();
        const diffMs = currentTime - created;
        const diffMins = Math.floor(diffMs / 60000);
        if (diffMins < 1) return 'Just now';
        return `${diffMins}m ago`;
    };

    // Filtered lists for Kanban columns
    const newOrders = orders.filter(o => o.status === 'new');
    const preparingOrders = orders.filter(o => o.status === 'preparing');
    const readyOrders = orders.filter(o => o.status === 'ready' || o.status === 'served');

    if (loading) {
        return (
            <div className="page active" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh', background: '#0f172a' }}>
                <div style={{ color: '#94a3b8', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <RefreshCw className="animate-spin" size={20} color="#e85d04" />
                    <span>SYNCHRONIZING KITCHEN MONITOR...</span>
                </div>
            </div>
        );
    }

    return (
        <div className="page active" id="page-kitchen-display" style={{ background: '#0b0f19', minHeight: '100vh', padding: '1rem', color: '#fff' }}>
            
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '1rem', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <div style={{ background: 'rgba(232, 93, 4, 0.15)', padding: '0.6rem', borderRadius: '12px' }}>
                        <ChefHat size={28} color="#e85d04" />
                    </div>
                    <div>
                        <h1 style={{ margin: 0, fontSize: '1.8rem', fontWeight: 800, letterSpacing: '-0.5px' }}>Kitchen Display System</h1>
                        <p style={{ margin: '0.2rem 0 0', fontSize: '0.85rem', color: 'rgba(255,255,255,0.4)', fontWeight: 600 }}>
                            Live Order Display &bull; {branchName}
                        </p>
                    </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    {/* Audio Alert Toggle */}
                    <button 
                        onClick={handleToggleSound}
                        style={{ 
                            background: soundEnabled ? 'rgba(232, 93, 4, 0.1)' : 'rgba(255,255,255,0.03)', 
                            border: `1px solid ${soundEnabled ? 'rgba(232, 93, 4, 0.2)' : 'rgba(255,255,255,0.05)'}`, 
                            color: soundEnabled ? '#e85d04' : 'rgba(255,255,255,0.4)',
                            padding: '0.6rem 1rem', 
                            borderRadius: '10px', 
                            fontWeight: 700, 
                            fontSize: '0.8rem', 
                            display: 'flex', 
                            alignItems: 'center', 
                            gap: '0.5rem', 
                            cursor: 'pointer' 
                        }}
                    >
                        {soundEnabled ? (
                            <>
                                <Volume2 size={16} /> Sound Alerts On
                            </>
                        ) : (
                            <>
                                <VolumeX size={16} /> Sound Alerts Muted
                            </>
                        )}
                    </button>
                </div>
            </div>

            {/* Kanban Columns */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.5rem', height: 'calc(100vh - 160px)', overflowY: 'hidden' }}>
                
                {/* Column 1: New Orders */}
                <div style={{ display: 'flex', flexDirection: 'column', background: '#111422', borderRadius: '20px', border: '1px solid rgba(239, 68, 68, 0.1)', overflow: 'hidden' }}>
                    <div style={{ background: 'rgba(239, 68, 68, 0.05)', padding: '1rem 1.25rem', borderBottom: '1px solid rgba(239, 68, 68, 0.1)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: '0.9rem', fontWeight: 800, textTransform: 'uppercase', color: '#ef4444', letterSpacing: '1px', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <span style={{ width: '8px', height: '8px', background: '#ef4444', borderRadius: '50%' }} /> New Orders
                        </span>
                        <span style={{ background: '#ef4444', color: '#fff', fontSize: '0.75rem', fontWeight: 900, padding: '0.2rem 0.6rem', borderRadius: '100px' }}>
                            {newOrders.length}
                        </span>
                    </div>

                    <div style={{ flex: 1, padding: '1rem', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                        {newOrders.length === 0 ? (
                            <div style={{ textAlign: 'center', padding: '3rem 1rem', color: 'rgba(255,255,255,0.2)', fontSize: '0.85rem' }}>
                                No incoming orders yet.
                            </div>
                        ) : (
                            newOrders.map(order => (
                                <OrderCard 
                                    key={order.id} 
                                    order={order} 
                                    elapsed={getElapsedTime(order.createdAt)} 
                                    onAction={() => handleUpdateStatus(order.id, 'preparing')}
                                    actionText="Accept & Cook"
                                    actionIcon={<Play size={14} />}
                                    actionColor="#e85d04"
                                />
                            ))
                        )}
                    </div>
                </div>

                {/* Column 2: Preparing */}
                <div style={{ display: 'flex', flexDirection: 'column', background: '#111522', borderRadius: '20px', border: '1px solid rgba(244, 140, 6, 0.1)', overflow: 'hidden' }}>
                    <div style={{ background: 'rgba(244, 140, 6, 0.05)', padding: '1rem 1.25rem', borderBottom: '1px solid rgba(244, 140, 6, 0.1)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: '0.9rem', fontWeight: 800, textTransform: 'uppercase', color: '#f48c06', letterSpacing: '1px', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <span style={{ width: '8px', height: '8px', background: '#f48c06', borderRadius: '50%' }} /> Preparing
                        </span>
                        <span style={{ background: '#f48c06', color: '#fff', fontSize: '0.75rem', fontWeight: 900, padding: '0.2rem 0.6rem', borderRadius: '100px' }}>
                            {preparingOrders.length}
                        </span>
                    </div>

                    <div style={{ flex: 1, padding: '1rem', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                        {preparingOrders.length === 0 ? (
                            <div style={{ textAlign: 'center', padding: '3rem 1rem', color: 'rgba(255,255,255,0.2)', fontSize: '0.85rem' }}>
                                No items currently preparing.
                            </div>
                        ) : (
                            preparingOrders.map(order => (
                                <OrderCard 
                                    key={order.id} 
                                    order={order} 
                                    elapsed={getElapsedTime(order.createdAt)} 
                                    onAction={() => handleUpdateStatus(order.id, 'ready')}
                                    actionText="Mark Ready"
                                    actionIcon={<Check size={14} />}
                                    actionColor="#22c55e"
                                />
                            ))
                        )}
                    </div>
                </div>

                {/* Column 3: Ready to Serve */}
                <div style={{ display: 'flex', flexDirection: 'column', background: '#111622', borderRadius: '20px', border: '1px solid rgba(34, 197, 94, 0.1)', overflow: 'hidden' }}>
                    <div style={{ background: 'rgba(34, 197, 94, 0.05)', padding: '1rem 1.25rem', borderBottom: '1px solid rgba(34, 197, 94, 0.1)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: '0.9rem', fontWeight: 800, textTransform: 'uppercase', color: '#22c55e', letterSpacing: '1px', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <span style={{ width: '8px', height: '8px', background: '#22c55e', borderRadius: '50%' }} /> Ready to Serve
                        </span>
                        <span style={{ background: '#22c55e', color: '#fff', fontSize: '0.75rem', fontWeight: 900, padding: '0.2rem 0.6rem', borderRadius: '100px' }}>
                            {readyOrders.length}
                        </span>
                    </div>

                    <div style={{ flex: 1, padding: '1rem', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                        {readyOrders.length === 0 ? (
                            <div style={{ textAlign: 'center', padding: '3rem 1rem', color: 'rgba(255,255,255,0.2)', fontSize: '0.85rem' }}>
                                No orders ready for pick-up.
                            </div>
                        ) : (
                            readyOrders.map(order => {
                                const isServed = order.status === 'served';
                                return (
                                    <OrderCard 
                                        key={order.id} 
                                        order={order} 
                                        elapsed={getElapsedTime(order.createdAt)} 
                                        onAction={() => handleUpdateStatus(order.id, isServed ? 'completed' : 'served')}
                                        actionText={isServed ? "Complete / Clear" : "Mark Delivered"}
                                        actionIcon={isServed ? <CheckCircle size={14} /> : <ArrowRight size={14} />}
                                        actionColor={isServed ? 'rgba(255,255,255,0.1)' : '#3b82f6'}
                                        customColor={isServed ? '#475569' : ''}
                                    />
                                );
                            })
                        )}
                    </div>
                </div>

            </div>
        </div>
    );
}

// Order Card Sub-component
function OrderCard({ order, elapsed, onAction, actionText, actionIcon, actionColor, customColor }) {
    return (
        <div 
            style={{ 
                background: '#1a1f30', 
                borderRadius: '16px', 
                padding: '1.25rem', 
                border: `1.5px solid ${customColor || 'rgba(255, 255, 255, 0.04)'}`, 
                display: 'flex', 
                flexDirection: 'column', 
                gap: '1rem',
                boxShadow: '0 4px 6px -1px rgba(0,0,0,0.2)'
            }}
        >
            {/* Header info */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                    <h3 style={{ fontSize: '1.1rem', fontWeight: 800, margin: 0, color: '#fff' }}>{order.tableName}</h3>
                    {order.callServer && (
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem', background: 'rgba(239, 68, 68, 0.15)', color: '#ef4444', padding: '0.2rem 0.5rem', borderRadius: '6px', fontSize: '0.65rem', fontWeight: 800, marginTop: '0.3rem', border: '1px solid rgba(239,68,68,0.2)' }}>
                            <Bell size={10} className="animate-bounce" /> CALL SERVER
                        </div>
                    )}
                    {order.requestBill && (
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem', background: 'rgba(59, 130, 246, 0.15)', color: '#3b82f6', padding: '0.2rem 0.5rem', borderRadius: '6px', fontSize: '0.65rem', fontWeight: 800, marginTop: '0.3rem', border: '1px solid rgba(59,130,246,0.2)', marginLeft: order.callServer ? '0.3rem' : 0 }}>
                            <Receipt size={10} /> REQUEST BILL
                        </div>
                    )}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', color: 'rgba(255,255,255,0.4)', fontSize: '0.75rem', fontWeight: 600 }}>
                    <Clock size={12} />
                    <span>{elapsed}</span>
                </div>
            </div>

            {/* Items list */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '0.75rem' }}>
                {order.items.map((item, idx) => (
                    <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                            <span style={{ fontWeight: 800, color: '#e85d04', fontSize: '0.95rem' }}>{item.qty}x</span>
                            <span style={{ fontWeight: 600, color: 'rgba(255,255,255,0.85)' }}>{item.name}</span>
                        </div>
                        <span style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.4)', textTransform: 'capitalize' }}>{item.cat}</span>
                    </div>
                ))}
            </div>

            {/* Special request / Customer note */}
            {order.customerNote && (
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.4rem', background: 'rgba(244, 140, 6, 0.05)', padding: '0.6rem 0.8rem', borderRadius: '10px', border: '1px solid rgba(244, 140, 6, 0.1)', fontSize: '0.8rem' }}>
                    <AlertTriangle size={14} color="#f48c06" style={{ marginTop: '0.1rem', flexShrink: 0 }} />
                    <div style={{ color: 'rgba(255, 255, 255, 0.75)', fontWeight: 500 }}><span style={{ fontWeight: 700, color: '#f48c06' }}>Note:</span> {order.customerNote}</div>
                </div>
            )}

            {/* Action */}
            <button 
                onClick={onAction}
                style={{ 
                    marginTop: '0.2rem',
                    width: '100%', 
                    background: actionColor, 
                    color: '#fff', 
                    border: 'none', 
                    borderRadius: '10px', 
                    padding: '0.65rem', 
                    fontWeight: 700, 
                    fontSize: '0.8rem', 
                    cursor: 'pointer',
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center', 
                    gap: '0.4rem',
                    transition: 'opacity 0.2s',
                    hover: { opacity: 0.9 }
                }}
            >
                {actionIcon}
                <span>{actionText}</span>
            </button>
        </div>
    );
}
