import { useState, useMemo, useEffect } from "react";
import {
    AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    BarChart, Bar, Cell, PieChart, Pie
} from "recharts";
import { useFirestore } from '../hooks/useFirestore';
import { invoiceService } from '../services/invoiceService';
import { NavLink } from 'react-router-dom';
import { downloadBusinessReportExcel } from '../utils/excelService';

/* ══════════════════════════════════════════
   DESIGN TOKENS (Standard App Theme)
   ══════════════════════════════════════════ */
const SHADOW = "0 1px 3px rgba(0,0,0,0.05), 0 1px 2px rgba(0,0,0,0.03)";
const ttStyle = {
    background: '#fff',
    border: '1px solid var(--border)',
    borderRadius: '12px',
    boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)',
    fontSize: '12px'
};

/* ══════════════════════════════════════════
   ATOMS
   ══════════════════════════════════════════ */
const fmt = n => "₹" + Number(n).toLocaleString("en-IN");

const KPI = ({ icon, label, value, sub, accent = "var(--accent)" }) => (
    <div className="antigravity-card" style={{
        background: 'white',
        border: '1px solid var(--border)',
        borderRadius: '20px',
        padding: '1.5rem',
        boxShadow: SHADOW,
        display: 'flex',
        flex: '1 1 260px',
        flexDirection: 'column',
        gap: '0.75rem'
    }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--muted)', textTransform: 'uppercase' }}>{label}</span>
            <div style={{ width: 36, height: 36, borderRadius: '10px', background: `${accent}10`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem' }}>{icon}</div>
        </div>
        <div>
            <div style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--accent)' }}>{value}</div>
            {sub && <div style={{ fontSize: '0.7rem', color: 'var(--muted)', fontWeight: 600, marginTop: '4px' }}>{sub}</div>}
        </div>
    </div>
);

const Panel = ({ title, sub, children, right, height, scrollable = false, className = "" }) => (
    <div className={`antigravity-card ${className}`} style={{
        background: 'white',
        border: '1px solid var(--border)',
        borderRadius: '24px',
        overflow: 'hidden',
        boxShadow: SHADOW,
        height: height || 'auto',
        display: 'flex',
        flexDirection: 'column'
    }}>
        <div style={{ padding: '1.5rem', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
            <div>
                <div style={{ fontWeight: 800, color: 'var(--ink)', fontSize: '1.1rem' }}>{title}</div>
                {sub && <div style={{ fontSize: '0.75rem', color: 'var(--muted)', fontWeight: 600, marginTop: '2px' }}>{sub}</div>}
            </div>
            {right}
        </div>
        <div style={{
            padding: '1.5rem',
            flex: 1,
            overflowY: scrollable ? 'auto' : 'visible',
            minHeight: 0
        }}>{children}</div>
    </div>
);

export default function Reports() {
    const [invoices, setInvoices] = useState([]);
    const [loadingInvoices, setLoadingInvoices] = useState(true);
    const { docs: expenses } = useFirestore('expenses');
    const { docs: customers } = useFirestore('customers');
    const { docs: branches } = useFirestore('branches');

    const userRole = sessionStorage.getItem('fb_user_role');
    const userCompanyId = sessionStorage.getItem('fb_user_company_id');
    const userStation = sessionStorage.getItem('fb_user_station') || 'Main Branch';
    const userBranchId = sessionStorage.getItem('fb_user_branch_id') || 'main';
    const [selectedBranchId, setSelectedBranchId] = useState(userRole === 'owner' ? "all" : userBranchId);

    // Optimized Fetch: Last 6 Months for Business Intelligence
    useEffect(() => {
        async function fetchAnalyticsData() {
            try {
                const sixMonthsAgo = new Date();
                sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
                const startDate = sixMonthsAgo.toISOString().split('T')[0];

                const result = await invoiceService.getInvoices(
                    { companyId: userCompanyId, startDate },
                    { pageSize: 1000 } // Larger limit for reports
                );
                setInvoices(result.docs);
            } catch (err) {
                console.error("Report data fetch error:", err);
            } finally {
                setLoadingInvoices(false);
            }
        }
        if (userCompanyId) fetchAnalyticsData();
    }, [userCompanyId]);

    // Pre-filter data dynamically 
    const filteredInvoices = useMemo(() => {
        const invs = Array.isArray(invoices) ? invoices : [];
        if (selectedBranchId === 'all') return invs;
        return invs.filter(inv => inv?.branch_id === selectedBranchId || inv?.branch === selectedBranchId);
    }, [invoices, selectedBranchId]);

    const filteredExpenses = useMemo(() => {
        const exps = Array.isArray(expenses) ? expenses : [];
        if (selectedBranchId === 'all') return exps;
        return exps.filter(exp => exp?.branch_id === selectedBranchId || exp?.branch === selectedBranchId);
    }, [expenses, selectedBranchId]);

    const filteredCustomers = useMemo(() => {
        const custs = Array.isArray(customers) ? customers : [];
        if (selectedBranchId === 'all') return custs;
        return custs.filter(c => c?.branch_id === selectedBranchId || c?.branch === selectedBranchId);
    }, [customers, selectedBranchId]);

    // Aggregate Data
    const stats = useMemo(() => {
        const totalSales = (filteredInvoices ?? []).reduce((s, i) => s + (Number(i?.amount) || 0), 0);
        const totalExp = (filteredExpenses ?? []).reduce((s, e) => s + (Number(e?.amount) || 0), 0);
        const profit = totalSales - totalExp;

        return { totalSales, totalExp, profit, customerCount: (filteredCustomers ?? []).length, branchCount: (branches ?? []).length };
    }, [filteredInvoices, filteredExpenses, filteredCustomers, branches]);

    // Monthly Chart Data
    const chartData = useMemo(() => {
        const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
        const currentMonth = new Date().getMonth();
        return months.map((m, i) => {
            const rev = (filteredInvoices ?? []).filter(inv => {
                const d = new Date(inv?.date || inv?.createdAt);
                return d.getMonth() === i;
            }).reduce((s, i) => s + (Number(i?.amount) || 0), 0);
            const exp = (filteredExpenses ?? []).filter(ex => {
                const d = new Date(ex?.date || ex?.createdAt);
                return d.getMonth() === i;
            }).reduce((s, e) => s + (Number(e?.amount) || 0), 0);
            return { name: m, Revenue: rev, Profit: rev - exp };
        }).filter((_, i) => i <= currentMonth && i > currentMonth - 6);
    }, [filteredInvoices, filteredExpenses]);

    return (
        <div className="page active" id="page-reports" style={{ background: '#f8fafc', paddingBottom: '2rem' }}>
            <style>
                {`
                    .reports-header-ext { display: flex; flex-direction: column; gap: 1rem; padding: 2rem 2rem 0; margin-bottom: 2rem; margin-top: 0.5cm; }
                    .reports-kpi-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 1.5rem; margin-top: 0.5cm; }
                    .reports-main-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(400px, 1fr)); gap: 2rem; }
                    @media (max-width: 768px) { .reports-main-grid { grid-template-columns: 1fr; } }
                `}
            </style>

            <div className="pg-header reports-header-ext">
                <div>
                    <h1 style={{ margin: 0, fontFamily: "'Yeseva One', serif", fontSize: '2.4rem', color: 'var(--ink)' }}>
                        Business <span style={{ color: 'var(--accent)' }}>Intelligence</span>
                    </h1>
                    <div style={{ fontSize: '0.85rem', color: 'var(--muted)', fontWeight: 600 }}>Analytical Oversight (Last 6 Months Data)</div>
                </div>
                <div className="pg-actions" style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                    {userRole === 'owner' && (
                        <select
                            style={{ padding: '0.5rem 1rem', borderRadius: '12px', border: '1px solid var(--border)' }}
                            value={selectedBranchId}
                            onChange={(e) => setSelectedBranchId(e.target.value)}
                        >
                            <option value="all">🌐 All Branches</option>
                            {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                        </select>
                    )}
                    <button className="btn btn-primary btn-sm" onClick={() => downloadBusinessReportExcel(chartData)}>📥 Export Excel</button>
                </div>
            </div>

            <div style={{ padding: '0 2rem' }}>
                <div className="reports-kpi-grid">
                    <KPI icon="💰" label="Gross Revenue" value={fmt(stats.totalSales)} sub="Volume (Last 6M)" />
                    <KPI icon="📉" label="Total Expenses" value={fmt(stats.totalExp)} sub="Operating costs" accent="#f87171" />
                    <KPI icon="💎" label="Net Profit" value={fmt(stats.profit)} sub="Branch margin" accent="#10b981" />
                    <KPI icon="👥" label="Clients" value={stats.customerCount} sub="Active base" accent="#6366f1" />
                </div>

                <div className="reports-main-grid" style={{ marginTop: '2rem' }}>
                    <Panel title="Revenue Trend" sub="Profit vs Revenue analysis">
                        <ResponsiveContainer width="100%" height={300}>
                            <AreaChart data={chartData}>
                                <CartesianGrid vertical={false} strokeDasharray="3 3" />
                                <XAxis dataKey="name" axisLine={false} tickLine={false} />
                                <YAxis axisLine={false} tickLine={false} tickFormatter={v => '₹' + (v / 1000) + 'k'} />
                                <Tooltip contentStyle={ttStyle} />
                                <Area type="monotone" dataKey="Revenue" stroke="var(--accent)" fill="var(--accent)" fillOpacity={0.1} strokeWidth={3} />
                                <Area type="monotone" dataKey="Profit" stroke="#10b981" fill="transparent" strokeWidth={3} />
                            </AreaChart>
                        </ResponsiveContainer>
                    </Panel>

                    <Panel title="Recent Transactions" sub="Latest billing data activity" scrollable height={380}>
                        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                            <tbody>
                                {filteredInvoices.sort((a,b) => new Date(b.date || b.createdAt) - new Date(a.date || a.createdAt)).slice(0, 10).map((inv, i) => (
                                    <tr key={i} style={{ borderBottom: '1px solid #f8fafc' }}>
                                        <td style={{ padding: '12px 0', fontSize: '0.85rem', fontWeight: 700 }}>#{inv.id?.slice(-5)}</td>
                                        <td style={{ padding: '12px 0', fontSize: '0.85rem' }}>{inv.customerName || 'Walk-in'}</td>
                                        <td style={{ padding: '12px 0', fontSize: '0.85rem', fontWeight: 800, color: 'var(--accent)' }}>{fmt(inv.amount)}</td>
                                        <td style={{ textAlign: 'right' }}><span style={{ color: '#10b981', fontSize: '0.7rem', fontWeight: 800 }}>PAID</span></td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </Panel>
                </div>
            </div>
        </div>
    );
}
