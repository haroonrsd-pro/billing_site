import React, { useState, useEffect, useMemo } from 'react';
import { useFirestore } from '../hooks/useFirestore';
import { invoiceService } from '../services/invoiceService';
import { NavLink } from 'react-router-dom';
import { useDeviceType } from '../hooks/useDeviceType';
import { Building, Activity, Plus, Clock, FileText, BarChart2, Calendar, MapPin, Users, Receipt, Package, Home, ArrowUpRight, ArrowDownRight, ArrowUp, AlertTriangle, Info, Banknote } from 'lucide-react';

function AnimatedCounter({ target, prefix = "" }) {
  const [count, setCount] = useState(0);
  useEffect(() => {
    let start = 0;
    const step = target / 60;
    const timer = setInterval(() => {
      start += step;
      if (start >= target) { setCount(target); clearInterval(timer); }
      else setCount(Math.floor(start));
    }, 16);
    return () => clearInterval(timer);
  }, [target]);
  return <span>{prefix}{count.toLocaleString("en-IN")}</span>;
}

export default function AdminDashboard() {
  const userName = sessionStorage.getItem('fb_user_name') || "Administrator";
  const userBranch = sessionStorage.getItem('fb_user_station') || "Main Branch";
  const userBranchId = sessionStorage.getItem('fb_user_branch_id') || "main";
  const userRole = (sessionStorage.getItem('fb_user_role') || "admin").toUpperCase();
  const userCompanyId = sessionStorage.getItem('fb_user_company_id');
  const deviceType = useDeviceType();

  const [invoicesData, setInvoicesData] = useState([]);
  const [loadingInvoices, setLoadingInvoices] = useState(true);
  const { docs: expensesData } = useFirestore('expenses');
  const { docs: usersData } = useFirestore('users');

  // Fetch optimized branch data: last 30 days of invoices
  useEffect(() => {
    async function fetchBranchData() {
        try {
            const thirtyDaysAgo = new Date();
            thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
            const startDate = thirtyDaysAgo.toISOString().split('T')[0];

            const result = await invoiceService.getInvoices(
                { 
                    companyId: userCompanyId,
                    branch_id: userBranchId,
                    startDate 
                }, 
                { pageSize: 150 }
            );
            setInvoicesData(result.docs);
        } catch (err) {
            console.error("Admin dashboard fetch error:", err);
        } finally {
            setLoadingInvoices(false);
        }
    }
    if (userCompanyId && userBranchId) fetchBranchData();
  }, [userCompanyId, userBranchId]);

  const branchInvoices = useMemo(() => {
    if (!Array.isArray(invoicesData)) return [];
    return [...invoicesData].sort((a,b) => new Date(b.date || b.createdAt || 0) - new Date(a.date || a.createdAt || 0));
  }, [invoicesData]);

  const branchExpenses = useMemo(() => {
    const expenses = Array.isArray(expensesData) ? expensesData : [];
    const filtered = expenses.filter(e => (e?.branch_id === userBranchId) || (!e?.branch_id && e?.branch === userBranch));
    return [...filtered].sort((a,b) => new Date(b.date || 0) - new Date(a.date || 0));
  }, [expensesData, userBranch, userBranchId]);

  const branchEmployees = useMemo(() => {
    const users = Array.isArray(usersData) ? usersData : [];
    const filtered = users.filter(u => u?.role === 'staff' && ((u?.branch_id === userBranchId) || (!u?.branch_id && u?.station === userBranch)));
    return [...filtered].sort((a,b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
  }, [usersData, userBranch, userBranchId]);

  const totalRevenue = useMemo(() => branchInvoices.reduce((s, i) => s + (Number(i?.amount) || 0), 0), [branchInvoices]);
  const totalExpenses = useMemo(() => branchExpenses.reduce((s, e) => s + (Number(e?.amount) || 0), 0), [branchExpenses]);
  const activeEmployees = useMemo(() => branchEmployees.filter(e => e?.status === "active").length, [branchEmployees]);

  // Aggregate revenue by month
  const revenueByMonth = useMemo(() => {
    const map = {};
    branchInvoices.forEach(inv => {
      const dateStr = inv?.date || inv?.createdAt || new Date().toISOString();
      const mn = new Date(dateStr).toLocaleString('default', { month: 'short' });
      map[mn] = (map[mn] || 0) + (Number(inv?.amount) || 0);
    });
    const arr = Object.keys(map).map(month => ({ month, amount: map[month] }));
    return arr.length ? arr.slice(-6) : [{ month: 'N/A', amount: 0 }];
  }, [branchInvoices]);

  const currentRevenue = revenueByMonth[revenueByMonth.length - 1]?.amount ?? 0;
  const maxRevenue = Math.max(...revenueByMonth.map(r => r?.amount ?? 0), 1);

  const expensesByCategory = useMemo(() => {
    const map = {};
    branchExpenses.forEach(exp => {
      map[exp?.cat] = (map[exp?.cat] || 0) + (Number(exp?.amount) || 0);
    });
    const icons = { 'Utilities': '⚡', 'Rent': '🏢', 'Salaries': '👥', 'Marketing': '📢', 'Maintenance': '🔧', 'Supplies': '📦', 'Other': '📋' };
    return Object.keys(map).map(cat => ({
      category: cat,
      amount: map[cat],
      icon: icons[cat] || '📋'
    })).sort((a, b) => b.amount - a.amount);
  }, [branchExpenses]);

  const transactions = useMemo(() => {
    const invs = branchInvoices.map(i => ({
      id: i?.id || 'INV',
      customer: i?.customerName || i?.customer || 'Walk-in',
      amount: Number(i?.amount) || 0,
      type: 'credit',
      time: new Date(i?.createdAt || i?.date || 0).toLocaleDateString()
    }));
    const exps = branchExpenses.map(e => ({
      id: e?.id || 'EXP',
      customer: e?.name || e?.cat,
      amount: Number(e?.amount) || 0,
      type: 'debit',
      time: new Date(e?.date || 0).toLocaleDateString()
    }));
    return [...invs, ...exps].sort((a, b) => new Date(b.time) - new Date(a.time)).slice(0, 10);
  }, [branchInvoices, branchExpenses]);

  const [isMobile, setIsMobile] = useState(typeof window !== 'undefined' ? window.innerWidth <= 1024 : false);
  useEffect(() => {
     const handleResize = () => setIsMobile(window.innerWidth <= 1024);
     window.addEventListener('resize', handleResize);
     return () => window.removeEventListener('resize', handleResize);
  }, []);

  if (isMobile) {
    const todayDateFormatted = new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
    const profit = totalRevenue - totalExpenses;
    
    return (
      <div style={{ width: '100%', minHeight: '100vh', backgroundColor: '#f8fafc', paddingBottom: '96px', fontFamily: 'sans-serif', color: '#1f2937' }}>
        <div style={{ padding: 'calc(40px + 0.8cm) 20px 0 20px', position: 'relative', zIndex: 50 }}>
          <h1 style={{ margin: 0, fontFamily: "'Yeseva One', serif", fontSize: '2.2rem', color: 'var(--ink)' }}>Admin Dashboard</h1>
          <p style={{ color: 'var(--muted)', fontSize: '1rem', fontWeight: 500, margin: '4px 0 0 0' }}>
            {userBranch} &nbsp;·&nbsp; {todayDateFormatted}
          </p>
        </div>
        
        <div style={{ padding: '24px 16px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Key Metrics Grid */}
          <div style={{ backgroundColor: 'white', borderRadius: '24px', padding: '20px', boxShadow: '0 2px 15px rgba(0,0,0,0.02)', border: '1px solid #f1f5f9' }}>
            <h2 style={{ fontSize: '14px', fontWeight: 600, color: '#111827', margin: '0 0 16px 0' }}>Performance Overview</h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px' }}>
               <div style={{ backgroundColor: '#ecfdf5', borderRadius: '16px', padding: '16px', border: '1px solid #d1fae5' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                    <div style={{ fontSize: '16px' }}>📈</div>
                    <span style={{ fontSize: '10px', color: '#047857', fontWeight: 700, letterSpacing: '0.05em' }}>REVENUE</span>
                  </div>
                  <div style={{ fontSize: '18px', fontWeight: 800, color: '#065f46' }}>₹{totalRevenue.toLocaleString()}</div>
               </div>
               
               <div style={{ backgroundColor: '#fef2f2', borderRadius: '16px', padding: '16px', border: '1px solid #fee2e2' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                    <div style={{ fontSize: '16px' }}>📉</div>
                    <span style={{ fontSize: '10px', color: '#b91c1c', fontWeight: 700, letterSpacing: '0.05em' }}>EXPENSES</span>
                  </div>
                  <div style={{ fontSize: '18px', fontWeight: 800, color: '#991b1b' }}>₹{totalExpenses.toLocaleString()}</div>
               </div>

               <div style={{ backgroundColor: '#fdf4ff', borderRadius: '16px', padding: '16px', border: '1px solid #fae8ff' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                    <div style={{ fontSize: '16px' }}>💰</div>
                    <span style={{ fontSize: '10px', color: '#7e22ce', fontWeight: 700, letterSpacing: '0.05em' }}>NET PROFIT</span>
                  </div>
                  <div style={{ fontSize: '18px', fontWeight: 800, color: '#6b21a8' }}>₹{profit.toLocaleString()}</div>
               </div>

               <div style={{ backgroundColor: '#eff6ff', borderRadius: '16px', padding: '16px', border: '1px solid #dbeafe' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                    <div style={{ fontSize: '16px' }}>👥</div>
                    <span style={{ fontSize: '10px', color: '#1d4ed8', fontWeight: 700, letterSpacing: '0.05em' }}>STAFF</span>
                  </div>
                  <div style={{ fontSize: '18px', fontWeight: 800, color: '#1e40af' }}>{branchEmployees.length}</div>
               </div>
            </div>
          </div>

          {/* Recent Transactions */}
          <div style={{ backgroundColor: 'white', borderRadius: '24px', padding: '20px', boxShadow: '0 2px 15px rgba(0,0,0,0.02)', border: '1px solid #f1f5f9' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h2 style={{ fontSize: '14px', fontWeight: 600, color: '#111827', margin: 0 }}>Recent Invoices</h2>
              <NavLink to="/invoices" style={{ fontSize: '12px', color: '#4f46e5', fontWeight: 600, textDecoration: 'none' }}>View All</NavLink>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {loadingInvoices ? (
                <div style={{ textAlign: 'center', padding: '20px', color: '#94a3b8', fontSize: '14px' }}>Loading...</div>
              ) : branchInvoices.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '20px', color: '#94a3b8', fontSize: '14px' }}>No invoices found.</div>
              ) : (
                branchInvoices.slice(0, 5).map((inv) => (
                  <div key={inv.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px', backgroundColor: '#f8fafc', borderRadius: '12px' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                      <span style={{ fontSize: '13px', fontWeight: 700, color: '#4f46e5' }}>#{(inv.id || 'N/A').toString().toUpperCase().slice(-6)}</span>
                      <span style={{ fontSize: '12px', color: '#64748b' }}>{inv.cust || inv.customerName || 'Walk-in'}</span>
                    </div>
                    <div style={{ textAlign: 'right', display: 'flex', flexDirection: 'column', gap: '2px' }}>
                      <span style={{ fontSize: '14px', fontWeight: 800, color: '#0f172a' }}>₹{(Number(inv.amount) || 0).toLocaleString()}</span>
                      <span style={{ fontSize: '10px', color: '#94a3b8' }}>{inv.date}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Expense Breakdown */}
          <div style={{ backgroundColor: 'white', borderRadius: '24px', padding: '20px', boxShadow: '0 2px 15px rgba(0,0,0,0.02)', border: '1px solid #f1f5f9' }}>
            <h2 style={{ fontSize: '14px', fontWeight: 600, color: '#111827', margin: '0 0 16px 0' }}>Expense Breakdown</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {expensesByCategory.map((exp, i) => (
                <div key={i}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                    <span style={{ fontSize: '12px', fontWeight: 600 }}>{exp.icon} {exp.category}</span>
                    <span style={{ fontSize: '12px', fontWeight: 700 }}>₹{exp.amount.toLocaleString()}</span>
                  </div>
                  <div style={{ height: '6px', backgroundColor: '#f1f5f9', borderRadius: '10px', overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${totalExpenses ? (exp.amount / totalExpenses) * 100 : 0}%`, backgroundColor: '#4f46e5', borderRadius: '10px' }}></div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="page active" id="page-dashboard" style={{ animation: "fadeIn 0.4s ease", padding: "2rem" }}>
      <div className="pg-header" style={{ marginBottom: "2rem" }}>
        <h1 className="pg-title" style={{ fontSize: "2.4rem", fontFamily: "'Yeseva One', serif" }}>Admin Dashboard</h1>
        <p className="pg-sub">{userBranch} · Local Operations Overview (Last 30 Days)</p>
      </div>

      <div className="stats-grid" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: "1.5rem", marginBottom: "2rem" }}>
        {[
          { label: "BRANCH REVENUE (30D)", value: totalRevenue, icon: "📈", prefix: "₹", bg: "#ecfdf5", color: "#10b981" },
          { label: "STAFF COUNT", value: branchEmployees.length, icon: "👥", prefix: "", bg: "#eff6ff", color: "#3b82f6" },
          { label: "EXPENSES (30D)", value: totalExpenses, icon: "📉", prefix: "₹", bg: "#fef2f2", color: "#ef4444" },
          { label: "NET PROFIT", value: totalRevenue - totalExpenses, icon: "💰", prefix: "₹", bg: "#fdf4ff", color: "#a855f7" },
        ].map((card, i) => (
          <div key={i} style={{ background: "white", padding: "1.5rem", borderRadius: "20px", border: "1px solid #e2e8f0", display: "flex", alignItems: "center", gap: "1rem" }}>
            <div style={{ width: "48px", height: "48px", borderRadius: "12px", background: card.bg, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.4rem" }}>{card.icon}</div>
            <div>
              <div style={{ fontSize: "0.75rem", fontWeight: 700, color: "#64748b" }}>{card.label}</div>
              <div style={{ fontSize: "1.5rem", fontWeight: 800, color: card.color }}>{card.prefix}{card.value.toLocaleString()}</div>
            </div>
          </div>
        ))}
      </div>

      <div className="dash-main-grid" style={{ display: "grid", gridTemplateColumns: "1.5fr 1fr", gap: "1.5rem" }}>
        <div style={{ background: "white", padding: "1.5rem", borderRadius: "20px", border: "1px solid #e2e8f0" }}>
           <h2 style={{ fontSize: "1.2rem", fontWeight: 800, marginBottom: "1.5rem" }}>🧾 Recent Transactions</h2>
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
                    <tr><td colSpan="4" style={{ textAlign: "center", padding: "2rem", color: "#64748b" }}>Loading...</td></tr>
                ) : branchInvoices.length === 0 ? (
                    <tr><td colSpan="4" style={{ textAlign: "center", padding: "2rem", color: "#64748b" }}>No invoices found.</td></tr>
                ) : (
                    branchInvoices.slice(0, 5).map((inv) => (
                        <tr key={inv?.id || Math.random()} style={{ borderBottom: "1px solid #f1f5f9" }}>
                            <td style={{ padding: "1rem 0", fontWeight: 700, fontSize: "0.9rem", color: "var(--accent)" }}>#{(inv?.id || 'N/A').toString().toUpperCase().slice(-6)}</td>
                            <td style={{ fontSize: "0.85rem", color: "#64748b" }}>{inv?.cust || inv?.customerName || 'N/A'}</td>
                            <td style={{ fontSize: "0.85rem", color: "#64748b" }}>{inv?.date || 'N/A'}</td>
                            <td style={{ textAlign: "right", fontWeight: 800, color: "#1e293b" }}>₹{(Number(inv?.amount) || 0).toLocaleString()}</td>
                        </tr>
                    ))
                )}
              </tbody>
           </table>
        </div>
        <div style={{ background: "white", padding: "1.5rem", borderRadius: "20px", border: "1px solid #e2e8f0" }}>
           <h2 style={{ fontSize: "1.2rem", fontWeight: 800, marginBottom: "1.5rem" }}>📉 Expense Breakdown</h2>
           {expensesByCategory.map((exp, i) => (
             <div key={i} style={{ marginBottom: "1rem" }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.5rem" }}>
                   <span style={{ fontSize: "0.85rem", fontWeight: 600 }}>{exp.icon} {exp.category}</span>
                   <span style={{ fontWeight: 700 }}>₹{exp.amount.toLocaleString()}</span>
                </div>
                <div style={{ height: "6px", background: "#f1f5f9", borderRadius: "10px", overflow: "hidden" }}>
                  <div style={{ height: "100%", width: `${(exp.amount/totalExpenses)*100}%`, background: "var(--accent)" }} />
                </div>
             </div>
           ))}
        </div>
      </div>
    </div>
  );
}
