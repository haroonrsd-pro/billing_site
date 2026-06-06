import { Calendar, Settings, Plus, MapPin, Building, Users, FileText, BarChart2, TrendingUp, Activity, CheckCircle, Clock, Menu, Home, Package, ArrowUp, AlertTriangle, Info, Banknote } from 'lucide-react';
import React, { useMemo, useState, useEffect } from 'react';
import { NavLink } from 'react-router-dom';
import { useFirestore } from '../hooks/useFirestore';
import { invoiceService } from '../services/invoiceService';
import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    BarElement,
    Title,
    Tooltip,
    Legend,
} from 'chart.js';
import { Bar } from 'react-chartjs-2';

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

export default function OwnerDashboard() {
    const [isMobile, setIsMobile] = useState(typeof window !== 'undefined' ? window.innerWidth <= 1024 : false);
    const [invoicesData, setInvoicesData] = useState([]);
    const [loadingInvoices, setLoadingInvoices] = useState(true);

    useEffect(() => {
        const handleResize = () => setIsMobile(window.innerWidth <= 1024);
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    const [activeTab, setActiveTab] = useState('week');
    
    const { docs: customersData } = useFirestore('customers');
    const { docs: expensesData } = useFirestore('expenses');
    const { docs: branches } = useFirestore('branches');
    const userCompanyId = sessionStorage.getItem('fb_user_company_id');

    // Fetch optimized data for Dashboard: last 60 days of invoices for trends and KPIs
    useEffect(() => {
        async function fetchDashboardData() {
            try {
                const sixtyDaysAgo = new Date();
                sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60);
                const startDate = sixtyDaysAgo.toISOString().split('T')[0];

                const result = await invoiceService.getInvoices(
                    { companyId: userCompanyId, startDate }, 
                    { pageSize: 200 } // Reasonable limit for dashboard summary
                );
                setInvoicesData(result.docs);
            } catch (err) {
                console.error("Dashboard data fetch error:", err);
            } finally {
                setLoadingInvoices(false);
            }
        }
        if (userCompanyId) fetchDashboardData();
    }, [userCompanyId]);

    const revenueWeb = useMemo(() => {
        const invs = Array.isArray(invoicesData) ? invoicesData : [];
        return invs.reduce((s, i) => s + (Number(i.amount) || 0), 0);
    }, [invoicesData]);

    const expensesTotalWeb = useMemo(() => {
        const exps = Array.isArray(expensesData) ? expensesData : [];
        return exps.reduce((s, e) => s + (Number(e.amount) || 0), 0);
    }, [expensesData]);

    const profitWeb = revenueWeb - expensesTotalWeb;

    const branchRevenueWeb = useMemo(() => {
        const stats = {};
        const brs = Array.isArray(branches) ? branches : [];
        const invs = Array.isArray(invoicesData) ? invoicesData : [];

        brs.forEach(br => {
            if (!br?.id) return;
            stats[br.id] = { 
                id: br.id, 
                key: `${br.name || 'Branch'} — ${br.city || 'TN'}`, 
                name: br.name || 'Branch', 
                city: br.city || 'TN', 
                revenue: 0, 
                orders: 0, 
                status: br.status || 'active', 
                address: br.address || '', 
                manager: br.manager || '', 
                phone: br.phone || '' 
            };
        });

        if (!stats['main']) stats['main'] = { id: 'main', key: 'Main Branch', name: 'Main Branch', city: 'TN', revenue: 0, orders: 0, status: 'active', address: 'Main HQ', manager: 'Admin' };

        invs.forEach(inv => {
            let bid = inv.branch_id;
            if (!bid) {
                const found = brs.find(b => `${b.name} — ${b.city}` === inv.branch || b.name === inv.branch);
                bid = found ? found.id : 'main';
            }
            if (!stats[bid]) {
                const name = inv.branch ? String(inv.branch).split(' — ')[0] : 'Main Branch';
                stats[bid] = { id: bid, key: inv.branch || 'Main Branch', name, city: 'TN', revenue: 0, orders: 0, status: 'active' };
            }
            stats[bid].revenue += Number(inv.amount) || 0;
            stats[bid].orders += 1;
        });

        return Object.values(stats).sort((a, b) => b.revenue - a.revenue);
    }, [branches, invoicesData]);

    const cityStatsWeb = useMemo(() => {
        const map = {};
        branches.forEach(br => {
            if (!map[br.city]) map[br.city] = { count: 0, branches: [] };
            map[br.city].count++;
            map[br.city].branches.push(br.name);
        });
        return Object.entries(map).sort((a, b) => b[1].count - a[1].count);
    }, [branches]);

    const branchChartDataWeb = useMemo(() => {
        if (branchRevenueWeb.length === 0) {
            return {
                labels: ['No Branches'],
                datasets: [{ label: 'Revenue (₹)', data: [0], backgroundColor: '#10b981', borderRadius: 6 }]
            };
        }
        return {
            labels: branchRevenueWeb.map(b => b.name),
            datasets: [{
                label: 'Revenue (₹)',
                data: branchRevenueWeb.map(b => b.revenue),
                backgroundColor: ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6', '#f97316'],
                borderRadius: 6,
            }]
        };
    }, [branchRevenueWeb]);

    const chartOptionsWeb = {
        responsive: true, maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
            y: { beginAtZero: true, ticks: { callback: v => '₹' + v.toLocaleString('en-IN'), font: { weight: '600' } } },
            x: { grid: { display: false }, ticks: { maxRotation: 45, minRotation: 45, autoSkip: true, font: { weight: '600', size: 10 } } }
        }
    };

    const recentInvoicesWeb = invoicesData.slice(0, 5);
    const topCustomersWeb = useMemo(() => {
        const map = {};
        invoicesData.forEach(inv => {
            const name = inv.customerName || inv.customer || 'Walk-in';
            if (!map[name]) map[name] = { name, total: 0, count: 0 };
            map[name].total += Number(inv.amount) || 0;
            map[name].count++;
        });
        return Object.values(map).sort((a, b) => b.total - a.total).slice(0, 5);
    }, [invoicesData]);

    const cardStyle = {
        background: 'white', borderRadius: '20px', padding: '1.5rem', border: '1px solid var(--border)',
        boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)', transition: 'all 0.3s'
    };
    const labelStyle = { fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase', color: 'var(--muted)', letterSpacing: '0.05em' };

    // Mobile View Logic
    const todayDateFormatted = new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

    if (isMobile) {
        return (
      <div style={{ width: '100%', minHeight: '100vh', backgroundColor: '#f8fafc', paddingBottom: '96px', fontFamily: 'sans-serif', color: '#1f2937' }}>
        <div style={{ padding: 'calc(40px + 0.8cm) 20px 0 20px', position: 'relative', zIndex: 50 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
                <span style={{ fontSize: '2rem' }}>🏢</span>
                <h1 style={{ margin: 0, fontFamily: "'Yeseva One', serif", fontSize: '2.2rem', color: 'var(--ink)' }}>
                    Franchise <span style={{ color: 'var(--accent)' }}>Dashboard</span>
                </h1>
            </div>
            <p style={{ color: 'var(--muted)', fontSize: '1rem', fontWeight: 500, margin: 0 }}>
                {todayDateFormatted} — Tamil Nadu Operations
            </p>
        </div>

        <div style={{ padding: '0 20px', marginTop: '24px', display: 'flex', gap: '12px' }}>
          <NavLink to="/branch" style={{ padding: '10px 20px', borderRadius: '9999px', border: '1px solid #5A67D8', color: '#5A67D8', fontSize: '11px', fontWeight: 500, backgroundColor: 'rgba(255,255,255,0.5)', textDecoration: 'none', textAlign: 'center' }}>
             Manage Branches
          </NavLink>
          <NavLink to="/billing" style={{ padding: '10px 20px', borderRadius: '9999px', border: '1px solid #5A67D8', color: '#5A67D8', fontSize: '11px', fontWeight: 500, backgroundColor: 'rgba(255,255,255,0.5)', textDecoration: 'none', textAlign: 'center' }}>
             New Bill
          </NavLink>
        </div>

        <div style={{ padding: '32px 16px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ backgroundColor: 'white', borderRadius: '24px', padding: '20px', boxShadow: '0 2px 15px rgba(0,0,0,0.02)', border: '1px solid #f9fafb' }}>
            <h2 style={{ fontSize: '14px', fontWeight: 600, color: '#111827', margin: '0 0 20px 0' }}>Performance Overview (Dashboard)</h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px' }}>
               <div style={{ backgroundColor: '#f8fafc', borderRadius: '16px', padding: '16px', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                    <div style={{ width: '28px', height: '28px', borderRadius: '8px', backgroundColor: '#eef2ff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px' }}>💰</div>
                    <span style={{ fontSize: '10px', color: '#9ca3af', fontWeight: 600, textTransform: 'uppercase' }}>Revenue (60d)</span>
                  </div>
                  <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#6366f1', letterSpacing: '-0.5px' }}>₹{revenueWeb.toLocaleString('en-IN')}</div>
               </div>
               <div style={{ backgroundColor: '#f8fafc', borderRadius: '16px', padding: '16px', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                    <div style={{ width: '28px', height: '28px', borderRadius: '8px', backgroundColor: '#ecfdf5', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px' }}>🏪</div>
                    <span style={{ fontSize: '10px', color: '#9ca3af', fontWeight: 600, textTransform: 'uppercase' }}>Branches</span>
                  </div>
                  <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#10b981', letterSpacing: '-0.5px' }}>{branches.length}</div>
               </div>
            </div>
          </div>

          <div style={{ backgroundColor: 'white', borderRadius: '24px', padding: '20px', boxShadow: '0 2px 15px rgba(0,0,0,0.02)', border: '1px solid #f9fafb' }}>
            <div style={{ marginBottom: '20px' }}>
               <h2 style={{ fontSize: '15px', fontWeight: 'bold', color: '#111827', margin: 0 }}>📊 Branch Revenue</h2>
            </div>
            <div style={{ height: '200px', width: '100%' }}>
               <Bar data={branchChartDataWeb} options={chartOptionsWeb} />
            </div>
          </div>

          <div style={{ backgroundColor: 'white', borderRadius: '24px', padding: '20px', boxShadow: '0 2px 15px rgba(0,0,0,0.02)', border: '1px solid #f9fafb' }}>
            <h2 style={{ fontSize: '15px', fontWeight: 'bold', color: '#111827', margin: '0 0 16px 0' }}>🧾 Recent Invoices</h2>
            <div className="table-responsive" style={{ background: '#f8fafc', borderRadius: '16px', overflow: 'hidden' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead style={{ background: '#f1f5f9' }}>
                        <tr style={{ textAlign: 'left', fontSize: '0.7rem', color: '#64748b', fontWeight: 800 }}>
                            <th style={{ padding: '0.8rem' }}>INV #</th>
                            <th>CLIENT</th>
                            <th>AMOUNT</th>
                            <th style={{ textAlign: 'right', paddingRight: '0.8rem' }}>DATE</th>
                        </tr>
                    </thead>
                    <tbody>
                        {loadingInvoices ? (
                            <tr><td colSpan="4" style={{ textAlign: 'center', padding: '2rem' }}>Loading...</td></tr>
                        ) : (!Array.isArray(invoicesData) || invoicesData.length === 0) ? (
                            <tr><td colSpan="4" style={{ textAlign: 'center', padding: '2rem' }}>No recent invoices.</td></tr>
                        ) : (
                            invoicesData.slice(0, 8).map(inv => (
                                <tr key={inv?.id || Math.random()} style={{ borderBottom: '1px solid #f1f5f9' }}>
                                    <td style={{ padding: '0.8rem', fontWeight: 700, fontSize: '0.75rem', color: '#4f46e5' }}>
                                        #{(inv?.id || 'N/A').toString().toUpperCase().slice(-6)}
                                    </td>
                                    <td style={{ fontWeight: 600, fontSize: '0.75rem', color: '#0f172a' }}>{inv?.cust || inv?.customerName || 'Walk-in'}</td>
                                    <td style={{ fontWeight: 800, fontSize: '0.75rem' }}>₹{(Number(inv?.amount) || 0).toLocaleString()}</td>
                                    <td style={{ textAlign: 'right', paddingRight: '0.8rem', fontSize: '0.7rem', color: '#64748b' }}>{inv?.date || 'N/A'}</td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
          </div>
        </div>
      </div>
    );
    }

    return (
        <div className="page active" id="page-dashboard" style={{ background: '#f8fafc', padding: '2rem' }}>
            <div className="pg-header" style={{ marginBottom: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
                        <span style={{ fontSize: '2rem' }}>🏢</span>
                        <h1 style={{ margin: 0, fontFamily: "'Yeseva One', serif", fontSize: '2.4rem', color: 'var(--ink)' }}>
                            Franchise <span style={{ color: 'var(--accent)' }}>Dashboard</span>
                        </h1>
                    </div>
                    <p style={{ color: 'var(--muted)', fontSize: '1rem', fontWeight: 500 }}>
                        Performance Analysis · {new Date().toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                    </p>
                </div>
                <div style={{ display: 'flex', gap: '1rem' }}>
                    <NavLink to="/branch" style={{ textDecoration: 'none', padding: '0.8rem 1.6rem', borderRadius: '12px', background: 'white', border: '1px solid #e2e8f0', color: '#1e293b', fontWeight: 700 }}>🏪 Branches</NavLink>
                    <NavLink to="/billing" style={{ textDecoration: 'none', padding: '0.8rem 1.6rem', borderRadius: '12px', background: 'var(--accent)', color: 'white', fontWeight: 700 }}>+ New Bill</NavLink>
                </div>
            </div>

            <div className="stats-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '1.5rem', marginBottom: '2rem' }}>
                {[
                    { label: 'Total Revenue (60d)', val: `₹${revenueWeb.toLocaleString('en-IN')}`, icon: '💰', color: '#6366f1', bg: '#eef2ff' },
                    { label: 'Branches', val: branches.length, icon: '🏪', color: '#10b981', bg: '#ecfdf5' },
                    { label: 'Clients', val: customersData.length, icon: '👥', color: '#3b82f6', bg: '#eff6ff' },
                    { label: 'Net Profit', val: `₹${profitWeb.toLocaleString('en-IN')}`, icon: '📈', color: '#f59e0b', bg: '#fffbeb' },
                ].map((s, i) => (
                    <div key={i} style={{ ...cardStyle, display: 'flex', alignItems: 'center', gap: '1rem' }}>
                        <div style={{ width: '56px', height: '56px', borderRadius: '16px', background: s.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.5rem' }}>{s.icon}</div>
                        <div>
                            <div style={{ ...labelStyle }}>{s.label}</div>
                            <div style={{ fontSize: '1.8rem', fontWeight: 800, color: s.color }}>{s.val}</div>
                        </div>
                    </div>
                ))}
            </div>

            <div className="dash-main-grid" style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: '1.5rem' }}>
                <div style={{ ...cardStyle }}>
                    <div style={{ marginBottom: '1.5rem' }}>
                        <div style={{ fontWeight: 800, fontSize: '1.2rem' }}>📊 Branch Revenue Analysis</div>
                        <div style={{ fontSize: '0.8rem', color: 'var(--muted)' }}>Comparative performance across Tamil Nadu branches</div>
                    </div>
                    <div style={{ height: '300px' }}>
                        <Bar data={branchChartDataWeb} options={chartOptionsWeb} />
                    </div>
                </div>

                <div style={{ ...cardStyle }}>
                    <div style={{ fontWeight: 800, fontSize: '1.2rem', marginBottom: '1.5rem' }}>📍 Location Distribution</div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                        {cityStatsWeb.map(([city, data], i) => (
                            <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '1rem', background: '#f8fafc', borderRadius: '12px' }}>
                                <div style={{ fontWeight: 700 }}>{city}</div>
                                <div style={{ fontWeight: 800, color: 'var(--accent)' }}>{data.count} Units</div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}
