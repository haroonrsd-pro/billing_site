import React, { useState, useEffect, useMemo } from 'react';
import { db } from '../firebaseConfig';
import { collection, query, getDocs, orderBy, Timestamp, where } from 'firebase/firestore';
import { getTenantPath } from '../firebaseConfig';
import { DollarSign, Tag, Building2, TrendingUp, Calendar, Download, RefreshCw, BarChart3, PieChart, Activity, X, Ticket, ChevronRight } from 'lucide-react';
import toast from 'react-hot-toast';

const AdminReports = () => {
    const [redemptions, setRedemptions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [dateRange, setDateRange] = useState('30days'); // 7days, 30days, all

    const fetchRedemptions = async () => {
        const companyId = sessionStorage.getItem('fb_user_company_id');
        if (!companyId) return;

        setLoading(true);
        try {
            const q = query(
                collection(db, getTenantPath('coupon_redemptions')), 
                orderBy('redeemedAt', 'desc')
            );
            const snapshot = await getDocs(q);
            const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setRedemptions(data);
        } catch (err) {
            toast.error('Failed to load redemption reports');
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchRedemptions();
    }, []);

    const filteredData = useMemo(() => {
        if (dateRange === 'all') return redemptions;
        const now = Date.now();
        const days = parseInt(dateRange);
        const threshold = now - (days * 24 * 60 * 60 * 1000);
        return redemptions.filter(r => {
            if (!r.redeemedAt) return false;
            const time = r.redeemedAt.seconds ? r.redeemedAt.seconds * 1000 : (typeof r.redeemedAt === 'string' ? new Date(r.redeemedAt).getTime() : 0);
            return time > threshold;
        });
    }, [redemptions, dateRange]);

    const stats = useMemo(() => {
        const totalDiscount = filteredData.reduce((acc, r) => acc + (r.discountGiven || 0), 0);
        const totalOrders = filteredData.length;
        
        const couponCounts = {};
        const franchiseStats = {};

        filteredData.forEach(r => {
            couponCounts[r.couponCode] = (couponCounts[r.couponCode] || 0) + 1;
            
            if (!franchiseStats[r.franchiseId]) {
                franchiseStats[r.franchiseId] = { id: r.franchiseId, count: 0, totalDiscount: 0 };
            }
            franchiseStats[r.franchiseId].count += 1;
            franchiseStats[r.franchiseId].totalDiscount += (r.discountGiven || 0);
        });

        const topCoupons = Object.entries(couponCounts)
            .map(([code, uses]) => ({ code, uses }))
            .sort((a, b) => b.uses - a.uses)
            .slice(0, 5);

        return {
            totalDiscount,
            totalOrders,
            topCoupons,
            franchiseStats: Object.values(franchiseStats).sort((a, b) => b.totalDiscount - a.totalDiscount)
        };
    }, [filteredData]);

    const handleExportCSV = () => {
        if (filteredData.length === 0) {
            toast.error('No data found to export');
            return;
        }

        const headers = ['Redemption ID', 'Coupon Code', 'Customer ID', 'Franchise ID', 'Order ID', 'Amount (₹)', 'Discount (₹)', 'Redeemed At'];
        const csvContent = [
            headers.join(','),
            ...filteredData.map(r => [
                r.id,
                r.couponCode,
                r.customerId,
                r.franchiseId,
                r.orderId,
                r.originalAmount,
                r.discountGiven,
                r.redeemedAt?.seconds ? new Date(r.redeemedAt.seconds * 1000).toLocaleString() : new Date(r.redeemedAt).toLocaleString()
            ].join(','))
        ].join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', `redemption_report_${new Date().toISOString().split('T')[0]}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        toast.success('Successfully exported to CSV!');
    };

    // Premium Theme Setup
    const theme = {
        background: 'var(--bg)',
        panel: 'var(--panel)',
        border: 'var(--border)',
        ink: 'var(--ink)',
        muted: 'var(--muted)',
        accent: 'var(--accent)',
        accent2: 'var(--accent2)',
        green: 'var(--green)',
        red: 'var(--red)',
        borderRadius: '24px',
        shadow: '0 4px 20px rgba(0,0,0,0.03)',
        fontHeading: "'Yeseva One', serif",
        fontMono: "'JetBrains Mono', monospace"
    };

    return (
        <div style={{ backgroundColor: theme.background, minHeight: '100vh', padding: '2.5rem', fontFamily: 'Nunito, sans-serif', color: theme.ink }}>
            
            <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
                
                {/* Header Section */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '2rem', marginBottom: '3rem' }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
                        <div style={{
                          width: "48px", height: "48px", borderRadius: "14px",
                          background: "linear-gradient(135deg, var(--accent), var(--accent2))",
                          display: "flex", alignItems: "center", justifyContent: "center",
                          fontSize: "20px", fontWeight: "900", color: "white",
                          boxShadow: "0 6px 16px rgba(79, 70, 229, 0.3)",
                        }}><BarChart3 size={24} /></div>
                        <span style={{ fontSize: "12px", color: theme.accent, letterSpacing: "3px", fontWeight: "900", textTransform: "uppercase" }}>DATA ANALYTICS</span>
                      </div>
                      <h1 style={{ margin: 0, fontFamily: theme.fontHeading, fontSize: '2.8rem', color: theme.ink, letterSpacing: '-1.5px' }}>
                        Redemption <span style={{ color: theme.accent }}>Insights</span>
                      </h1>
                    </div>
                    
                    <div style={{ display: 'flex', gap: '12px', alignSelf: 'flex-end' }}>
                        <button 
                            onClick={handleExportCSV}
                            style={{ 
                                background: 'white', color: theme.accent, border: `1px solid ${theme.accent}`, padding: '14px 28px', borderRadius: '14px',
                                fontWeight: 900, fontSize: '0.85rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '10px',
                                transition: 'all 0.3s ease', boxShadow: '0 4px 12px rgba(0,0,0,0.04)'
                            }}
                        >
                            <Download size={18} /> EXPORT CSV
                        </button>
                        <button 
                            onClick={fetchRedemptions}
                            style={{ 
                                width: '48px', height: '48px', background: 'white', border: `1px solid ${theme.border}`, borderRadius: '14px',
                                cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: theme.muted
                            }}
                        >
                            <RefreshCw size={20} className={loading ? 'animate-spin' : ''} />
                        </button>
                    </div>
                </div>

                {/* Range Filter Strip */}
                <div style={{ display: 'flex', gap: '10px', marginBottom: '2.5rem', background: '#f1f5f9', padding: '6px', borderRadius: '16px', width: 'fit-content' }}>
                    {['7days', '30days', 'all'].map(range => (
                        <button 
                            key={range}
                            onClick={() => setDateRange(range)}
                            style={{ 
                                padding: '10px 24px', borderRadius: '12px', border: 'none', cursor: 'pointer',
                                background: dateRange === range ? 'white' : 'transparent',
                                color: dateRange === range ? theme.accent : theme.muted,
                                fontSize: '0.8rem', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '1px',
                                boxShadow: dateRange === range ? '0 4px 10px rgba(0,0,0,0.06)' : 'none', transition: 'all 0.2s'
                            }}
                        >
                            {range === 'all' ? 'FULL HISTORY' : `LAST ${range.toUpperCase()}`}
                        </button>
                    ))}
                </div>

                {/* KPI Metrics Dashboard */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))', gap: '1.5rem', marginBottom: '3rem' }}>
                    {[
                        { label: 'GROSS DISCOUNT VALUE', val: `₹${stats.totalDiscount.toLocaleString()}`, sub: 'Direct Promotional Cost', icon: <DollarSign />, color: 'var(--green)' },
                        { label: 'TOTAL CAMPAIGN USAGE', val: stats.totalOrders.toLocaleString(), sub: 'Successful Redemption Volume', icon: <Activity />, color: 'var(--accent)' },
                        { label: 'TOP PERFORMING BRANCH', val: (stats.franchiseStats[0]?.id || '').toString().slice(0, 8).toUpperCase() || 'NONE', sub: 'Highest Franchise Participation', icon: <Building2 />, color: 'var(--purple)' }
                    ].map((kpi, i) => (
                        <div key={i} style={{ 
                            background: 'white', padding: '2.5rem', borderRadius: theme.borderRadius, border: `1px solid ${theme.border}`,
                            boxShadow: theme.shadow, position: 'relative', overflow: 'hidden'
                        }}>
                            <div style={{ position: 'absolute', top: '-10px', right: '-10px', opacity: 0.05, transform: 'rotate(15deg)' }}>
                              <TrendingUp size={120} color={kpi.color} />
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '1rem', color: theme.muted, fontWeight: 900, fontSize: '0.65rem', letterSpacing: '2px' }}>
                                {kpi.icon} {kpi.label}
                            </div>
                            <div style={{ fontSize: '3rem', fontWeight: 900, fontFamily: theme.fontMono, color: theme.ink, letterSpacing: '-2px', marginBottom: '0.5rem' }}>{kpi.val}</div>
                            <p style={{ color: theme.muted, fontSize: '0.8rem', fontWeight: 700, margin: 0 }}>{kpi.sub}</p>
                        </div>
                    ))}
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(600px, 1fr))', gap: '2rem' }}>
                    
                    {/* Top Campaigns Table */}
                    <div style={{ background: 'white', borderRadius: theme.borderRadius, border: `1px solid ${theme.border}`, boxShadow: theme.shadow, padding: '2.5rem' }}>
                        <h2 style={{ fontSize: '1.2rem', fontWeight: 900, marginBottom: '2.5rem', color: theme.ink, borderBottom: '2px solid #f8fafc', paddingBottom: '1rem' }}>
                            TOP <span style={{ color: theme.accent }}>PERFORMING</span> OFFERS
                        </h2>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                            {stats.topCoupons.map((c, i) => (
                                <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1.5rem', background: '#f8fafc', borderRadius: '16px' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                                        <div style={{ width: '40px', height: '40px', background: 'white', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, color: theme.accent }}>{i+1}</div>
                                        <div style={{ fontWeight: 900, fontSize: '1.1rem', letterSpacing: '2px' }}>{c.code}</div>
                                    </div>
                                    <div style={{ textAlign: 'right' }}>
                                        <div style={{ fontWeight: 900, color: theme.accent, fontSize: '1.2rem' }}>{c.uses}</div>
                                        <div style={{ fontSize: '0.6rem', fontWeight: 900, color: theme.muted }}>REDEEMED</div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Franchise Participation Audit */}
                    <div style={{ background: 'white', borderRadius: theme.borderRadius, border: `1px solid ${theme.border}`, boxShadow: theme.shadow, padding: '2.5rem' }}>
                        <h2 style={{ fontSize: '1.2rem', fontWeight: 900, marginBottom: '2.5rem', color: theme.ink, borderBottom: '2px solid #f8fafc', paddingBottom: '1rem' }}>
                            FRANCHISE <span style={{ color: theme.accent }}>PARTICIPATION</span> AUDIT
                        </h2>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                            {stats.franchiseStats.map((f, i) => (
                                <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1.5rem', background: '#f8fafc', borderRadius: '16px' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                                        <div style={{ width: '40px', height: '40px', background: 'white', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: theme.muted }}><Building2 size={20}/></div>
                                        <div>
                                            <div style={{ fontWeight: 900, fontSize: '0.9rem' }}>BRANCH: {(f.id || '').toString().slice(0, 8).toUpperCase() || 'N/A'}</div>
                                            <div style={{ fontSize: '0.65rem', fontWeight: 700, color: theme.muted }}>{f.count} TRANSACTIONS LOGGED</div>
                                        </div>
                                    </div>
                                    <div style={{ textAlign: 'right' }}>
                                        <div style={{ fontWeight: 900, color: theme.green, fontSize: '1.2rem', fontFamily: theme.fontMono }}>₹{f.totalDiscount.toLocaleString()}</div>
                                        <div style={{ fontSize: '0.6rem', fontWeight: 900, color: theme.muted }}>REVENUE LOSS (D)</div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AdminReports;
