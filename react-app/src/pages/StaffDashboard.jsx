import { useMemo, useState, useEffect } from 'react';
import { useNavigate, NavLink } from 'react-router-dom';
import { useFirestore } from '../hooks/useFirestore';
import { invoiceService } from '../services/invoiceService';
import { Building, Activity, Plus, Clock, FileText, BarChart2, Calendar, MapPin, Users, Receipt, Package, ShoppingCart, ArrowUp, Info, Banknote } from 'lucide-react';

export default function StaffDashboard() {
    const navigate = useNavigate();
    const [invoices, setInvoices] = useState([]);
    const [loadingInvoices, setLoadingInvoices] = useState(true);
    
    const { docs: allCustomers } = useFirestore('customers');
    const { docs: allExpenses } = useFirestore('expenses');

    const userBranch = sessionStorage.getItem('fb_user_station') || 'Main Branch';
    const userBranchId = sessionStorage.getItem('fb_user_branch_id') || 'main';
    const userCompanyId = sessionStorage.getItem('fb_user_company_id');

    // Optimized Staff Fetch: Last 14 days of data
    useEffect(() => {
        async function fetchStaffData() {
            try {
                const fourteenDaysAgo = new Date();
                fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14);
                const startDate = fourteenDaysAgo.toISOString().split('T')[0];

                const result = await invoiceService.getInvoices(
                    { companyId: userCompanyId, branch_id: userBranchId, startDate },
                    { pageSize: 100 }
                );
                setInvoices(result.docs);
            } catch (err) {
                console.error("Staff dashboard fetch error:", err);
            } finally {
                setLoadingInvoices(false);
            }
        }
        if (userCompanyId && userBranchId) fetchStaffData();
    }, [userCompanyId, userBranchId]);

    const customers = useMemo(() => {
        const custs = Array.isArray(allCustomers) ? allCustomers : [];
        return custs.filter(c => (c.branch_id === userBranchId) || (!c.branch_id && c.branch === userBranch));
    }, [allCustomers, userBranch, userBranchId]);

    const expenses = useMemo(() => {
        const exps = Array.isArray(allExpenses) ? allExpenses : [];
        return exps.filter(e => (e.branch_id === userBranchId) || (!e.branch_id && e.branch === userBranch));
    }, [allExpenses, userBranch, userBranchId]);

    const today = new Date().toISOString().split('T')[0];

    // Stats Calculation
    const todayRevenue = useMemo(() => {
        const invs = Array.isArray(invoices) ? invoices : [];
        return invs
            .filter(inv => (inv.date === today) || (inv.createdAt && inv.createdAt.startsWith(today)))
            .reduce((sum, inv) => sum + (Number(inv.amount) || 0), 0);
    }, [invoices, today]);

    const totalInvoices = invoices.length;
    const todayInvoicesCount = invoices.filter(inv => (inv.date === today) || (inv.createdAt && inv.createdAt.startsWith(today))).length;

    const totalCustomers = customers.length;
    const newCustomersToday = useMemo(() => {
        return customers.filter(c => c.createdAt && c.createdAt.startsWith(today)).length;
    }, [customers, today]);

    const todayExpenses = useMemo(() => {
        return expenses
            .filter(exp => exp.date === today || (exp.createdAt && exp.createdAt.startsWith(today)))
            .reduce((sum, exp) => sum + (Number(exp.amount) || 0), 0);
    }, [expenses, today]);

    // Weekly Sales (Last 7 Days)
    const weeklySales = useMemo(() => {
        const days = [];
        const invs = Array.isArray(invoices) ? invoices : [];
        for (let i = 6; i >= 0; i--) {
            const d = new Date();
            d.setDate(d.getDate() - i);
            const dateStr = d.toISOString().split('T')[0];
            const dailyRev = invs
                .filter(inv => (inv.date === dateStr) || (inv.createdAt && inv.createdAt.startsWith(dateStr)))
                .reduce((sum, inv) => sum + (Number(inv.amount) || 0), 0);
            days.push({ day: d.toLocaleDateString('en-US', { weekday: 'short' }), val: dailyRev });
        }
        return days;
    }, [invoices]);

    const maxWeeklySale = Math.max(...weeklySales.map(d => d.val), 1000);

    const topItems = useMemo(() => {
        const counts = {};
        invoices.forEach(inv => {
            const items = Array.isArray(inv.items) ? inv.items : [];
            items.forEach(item => {
                const name = item.name || 'Unknown';
                const qty = Number(item.qty) || Number(item.quantity) || 1;
                counts[name] = (counts[name] || 0) + qty;
            });
        });
        return Object.entries(counts)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 4);
    }, [invoices]);

    const recentInvoices = useMemo(() => {
        const invs = Array.isArray(invoices) ? invoices : [];
        return [...invs].sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || '')).slice(0, 10);
    }, [invoices]);

    const [isMobile, setIsMobile] = useState(typeof window !== 'undefined' ? window.innerWidth <= 1024 : false);
    useEffect(() => {
        const handleResize = () => setIsMobile(window.innerWidth <= 1024);
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    const pageStyle = { minHeight: "100vh", backgroundColor: "#f8fafc", padding: "2rem" };
    const sectionTitleStyle = { fontSize: "1.2rem", fontWeight: 800, marginBottom: "1.5rem", color: "#1e293b" };
    const cardStyle = { background: "white", borderRadius: "20px", padding: "1.5rem", border: "1px solid #e2e8f0" };

    if (isMobile) {
        return (
            <div style={{ minHeight: '100vh', backgroundColor: '#f8fafc', paddingBottom: '96px', fontFamily: 'sans-serif', color: '#1f2937' }}>
                <div style={{ padding: 'calc(40px + 0.8cm) 20px 0 20px', position: 'relative', zIndex: 50, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                        <h1 style={{ margin: 0, fontFamily: "'Yeseva One', serif", fontSize: '2rem', color: 'var(--ink)' }}>Staff Portal</h1>
                        <p style={{ color: 'var(--muted)', fontSize: '0.9rem', fontWeight: 500 }}>{userBranch}</p>
                    </div>
                    <NavLink to="/billing" style={{ padding: '10px 16px', background: 'var(--accent)', color: 'white', borderRadius: '12px', textDecoration: 'none', fontWeight: 700, fontSize: '0.8rem' }}>+ NEW BILL</NavLink>
                </div>

                <div style={{ padding: '24px 16px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
                    {/* Primary Stats Grid */}
                    <div style={{ backgroundColor: 'white', borderRadius: '24px', padding: '20px', boxShadow: '0 2px 15px rgba(0,0,0,0.02)', border: '1px solid #f1f5f9' }}>
                        <h2 style={{ fontSize: '14px', fontWeight: 600, color: '#111827', margin: '0 0 16px 0' }}>Daily Summary</h2>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px' }}>
                            <div style={{ backgroundColor: '#ecfdf5', borderRadius: '16px', padding: '16px', border: '1px solid #d1fae5' }}>
                                <div style={{ fontSize: '16px', marginBottom: '8px' }}>💰</div>
                                <span style={{ fontSize: '9px', color: '#047857', fontWeight: 700, display: 'block' }}>TODAY'S REVENUE</span>
                                <div style={{ fontSize: '16px', fontWeight: 800, color: '#065f46' }}>₹{todayRevenue.toLocaleString()}</div>
                            </div>

                            <div style={{ backgroundColor: '#eff6ff', borderRadius: '16px', padding: '16px', border: '1px solid #dbeafe' }}>
                                <div style={{ fontSize: '16px', marginBottom: '8px' }}>📄</div>
                                <span style={{ fontSize: '9px', color: '#1d4ed8', fontWeight: 700, display: 'block' }}>BILLS TODAY</span>
                                <div style={{ fontSize: '16px', fontWeight: 800, color: '#1e40af' }}>{todayInvoicesCount}</div>
                            </div>

                            <div style={{ backgroundColor: '#fffbeb', borderRadius: '16px', padding: '16px', border: '1px solid #fef3c7' }}>
                                <div style={{ fontSize: '16px', marginBottom: '8px' }}>👥</div>
                                <span style={{ fontSize: '9px', color: '#b45309', fontWeight: 700, display: 'block' }}>CLIENTS</span>
                                <div style={{ fontSize: '16px', fontWeight: 800, color: '#92400e' }}>{totalCustomers}</div>
                            </div>

                            <div style={{ backgroundColor: '#fef2f2', borderRadius: '16px', padding: '16px', border: '1px solid #fee2e2' }}>
                                <div style={{ fontSize: '16px', marginBottom: '8px' }}>💸</div>
                                <span style={{ fontSize: '9px', color: '#b91c1c', fontWeight: 700, display: 'block' }}>EXPENSES</span>
                                <div style={{ fontSize: '16px', fontWeight: 800, color: '#991b1b' }}>₹{todayExpenses.toLocaleString()}</div>
                            </div>
                        </div>
                    </div>

                    {/* Recent Invoices List */}
                    <div style={{ backgroundColor: 'white', borderRadius: '24px', padding: '20px', boxShadow: '0 2px 15px rgba(0,0,0,0.02)', border: '1px solid #f1f5f9' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                            <h2 style={{ fontSize: '14px', fontWeight: 600, color: '#111827', margin: 0 }}>Recent Bills</h2>
                            <NavLink to="/invoices" style={{ fontSize: '12px', color: 'var(--accent)', fontWeight: 600, textDecoration: 'none' }}>View All</NavLink>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                            {loadingInvoices ? (
                                <div style={{ textAlign: 'center', padding: '20px', color: '#94a3b8', fontSize: '14px' }}>Loading...</div>
                            ) : recentInvoices.length === 0 ? (
                                <div style={{ textAlign: 'center', padding: '20px', color: '#94a3b8', fontSize: '14px' }}>No bills today.</div>
                            ) : (
                                recentInvoices.slice(0, 5).map((inv) => (
                                    <div key={inv.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px', backgroundColor: '#f8fafc', borderRadius: '12px' }}>
                                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                                            <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--accent)' }}>#{(inv.id || 'N/A').toString().toUpperCase().slice(-6)}</span>
                                            <span style={{ fontSize: '12px', color: '#64748b' }}>{inv.cust || inv.customerName || 'Walk-in'}</span>
                                        </div>
                                        <div style={{ textAlign: 'right' }}>
                                            <div style={{ fontSize: '14px', fontWeight: 800, color: '#0f172a' }}>₹{(Number(inv.amount) || 0).toLocaleString()}</div>
                                            <div style={{ fontSize: '10px', color: '#94a3b8' }}>{inv.date}</div>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>

                    {/* Performance Metrics */}
                    <div style={{ backgroundColor: 'white', borderRadius: '24px', padding: '20px', boxShadow: '0 2px 15px rgba(0,0,0,0.02)', border: '1px solid #f1f5f9' }}>
                        <h2 style={{ fontSize: '14px', fontWeight: 600, color: '#111827', margin: '0 0 16px 0' }}>Top Selling Items</h2>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                            {topItems.map(([name, count], i) => (
                                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '12px', background: '#f8fafc', borderRadius: '12px' }}>
                                    <span style={{ fontWeight: 600, fontSize: '13px' }}>{name}</span>
                                    <span style={{ fontWeight: 800, color: 'var(--accent)' }}>{count}x</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="page active" id="page-dashboard" style={pageStyle}>
            <div className="pg-header" style={{ marginBottom: "2rem", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                   <h1 style={{ fontSize: "2.4rem", fontFamily: "'Yeseva One', serif", margin: 0 }}>Staff Dashboard</h1>
                   <p style={{ color: "#64748b", margin: "4px 0 0 0" }}>Daily Sales Overview · {userBranch}</p>
                </div>
                <div style={{ display: "flex", gap: "1rem" }}>
                    <NavLink to="/billing" style={{ padding: "0.8rem 1.6rem", background: "var(--accent)", color: "white", borderRadius: "12px", textDecoration: "none", fontWeight: 700 }}>+ NEW BILL</NavLink>
                </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "1.5rem", marginBottom: "2rem" }}>
                {[
                    { lbl: "TODAY'S REVENUE", val: `₹${todayRevenue.toLocaleString()}`, icn: "💰", col: "#10b981", bg: "#ecfdf5" },
                    { lbl: "BILLS TODAY", val: todayInvoicesCount, icn: "📄", col: "#3b82f6", bg: "#eff6ff" },
                    { lbl: "ACTIVE CLIENTS", val: totalCustomers, icn: "👥", col: "#f59e0b", bg: "#fffbeb" },
                    { lbl: "TODAY'S EXPENSES", val: `₹${todayExpenses.toLocaleString()}`, icn: "💸", col: "#ef4444", bg: "#fef2f2" },
                ].map((s, i) => (
                    <div key={i} style={{ ...cardStyle, display: "flex", alignItems: "center", gap: "1rem" }}>
                        <div style={{ width: "48px", height: "48px", background: s.bg, borderRadius: "12px", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.4rem" }}>{s.icn}</div>
                        <div>
                            <div style={{ fontSize: "0.7rem", fontWeight: 700, color: "#94a3b8" }}>{s.lbl}</div>
                            <div style={{ fontSize: "1.4rem", fontWeight: 800, color: s.col }}>{s.val}</div>
                        </div>
                    </div>
                ))}
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1.5fr 1fr", gap: "1.5rem" }}>
                <div style={cardStyle}>
                   <h2 style={sectionTitleStyle}>🧾 Recent Activity (14 Days)</h2>
                   <table style={{ width: "100%", borderCollapse: "collapse" }}>
                      <thead>
                        <tr style={{ textAlign: "left", fontSize: "0.75rem", color: "#94a3b8", borderBottom: "1px solid #f1f5f9" }}>
                            <th style={{ padding: "1rem 0" }}>ID</th>
                            <th>CLIENT</th>
                            <th>DATE</th>
                            <th style={{ textAlign: "right" }}>AMOUNT</th>
                        </tr>
                      </thead>
                      <tbody>
                        {loadingInvoices ? (
                            <tr><td colSpan="4" style={{ textAlign: "center", padding: "2rem" }}>Loading...</td></tr>
                        ) : recentInvoices.length === 0 ? (
                            <tr><td colSpan="4" style={{ textAlign: "center", padding: "2rem" }}>No invoices.</td></tr>
                        ) : (
                            recentInvoices.map((inv) => (
                                <tr key={inv?.id || Math.random()} style={{ borderBottom: "1px solid #f1f5f9" }}>
                                    <td style={{ padding: "1rem 0", fontWeight: 700, fontSize: "0.9rem", color: "var(--accent)" }}>#{(inv?.id || 'N/A').toString().slice(-6).toUpperCase()}</td>
                                    <td style={{ fontSize: "0.85rem", color: "#64748b" }}>{inv?.cust || inv?.customerName || 'Walk-in'}</td>
                                    <td style={{ fontSize: "0.85rem", color: "#64748b" }}>{inv?.date || 'N/A'}</td>
                                    <td style={{ textAlign: "right", fontWeight: 800, color: "#1e293b" }}>₹{(Number(inv?.amount) || 0).toLocaleString()}</td>
                                </tr>
                            ))
                        )}
                      </tbody>
                   </table>
                </div>

                <div style={cardStyle}>
                   <h2 style={sectionTitleStyle}>🍽️ Performance</h2>
                   <div style={{ marginBottom: "2rem" }}>
                      <div style={{ fontSize: "0.85rem", fontWeight: 700, color: "#64748b", marginBottom: "1rem" }}>WEEKLY SALES TREND</div>
                      <div style={{ display: "flex", alignItems: "flex-end", gap: "0.5rem", height: "100px" }}>
                         {weeklySales.map((d, i) => (
                            <div key={i} style={{ flex: 1, background: "var(--accent)", borderRadius: "4px 4px 0 0", height: `${((d?.val ?? 0)/maxWeeklySale)*100}%`, minHeight: "4px" }} />
                         ))}
                      </div>
                   </div>
                   <div style={{ fontSize: "0.85rem", fontWeight: 700, color: "#64748b", marginBottom: "1rem" }}>TOP SELLING ITEMS</div>
                   <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                      {topItems.map(([name, count], i) => (
                         <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "0.75rem", background: "#f8fafc", borderRadius: "10px" }}>
                             <span style={{ fontWeight: 600, fontSize: "0.85rem" }}>{name}</span>
                             <span style={{ fontWeight: 800, color: "var(--accent)" }}>{count}x</span>
                         </div>
                      ))}
                   </div>
                </div>
            </div>
        </div>
    );
}
