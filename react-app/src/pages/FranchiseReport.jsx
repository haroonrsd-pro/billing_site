import React, { useState, useMemo, useEffect } from 'react';
import { useFirestore } from '../hooks/useFirestore';
import { invoiceService } from '../services/invoiceService';
import { Package, TrendingUp, BarChart2, Calendar, ShoppingBag, Award, DollarSign, FileDown } from 'lucide-react';
import { downloadFranchiseReportExcel } from '../utils/excelService';

/* ─────────────────────────────────────────────────────────────────────────────
   DESIGN TOKENS & STYLES (Adapted for the App's Theme)
   ───────────────────────────────────────────────────────────────────────────── */
const css = `
  .fr-container { 
    display: flex; 
    flex-direction: column; 
    gap: 2rem; 
    padding: 2rem;
    animation: fadeIn 0.5s ease-out;
  }
  .fr-card {
    background: white;
    border: 1px solid var(--border);
    border-radius: 20px;
    padding: 1.5rem;
    box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05);
  }
  .fr-section-title {
    font-family: 'Yeseva One', serif;
    font-size: 1.25rem;
    color: var(--ink);
  }
  .fr-date-input {
    background: white;
    border: 1px solid var(--border);
    border-radius: 10px;
    padding: 0.5rem 1rem;
    font-family: inherit;
    font-size: 0.85rem;
    color: var(--ink);
    outline: none;
    cursor: pointer;
  }
  .fr-table-wrap {
    background: white;
    border: 1px solid var(--border);
    border-radius: 20px;
    overflow: hidden;
  }
  .fr-table {
    width: 100%;
    border-collapse: collapse;
  }
  .fr-table th {
    background: #f8fafc;
    padding: 1rem 1.5rem;
    text-align: left;
    font-size: 0.75rem;
    font-weight: 800;
    color: var(--muted);
    text-transform: uppercase;
    border-bottom: 1px solid var(--border);
  }
  .fr-table td {
    padding: 1rem 1.5rem;
    border-bottom: 1px solid #f1f5f9;
    font-size: 0.9rem;
    color: var(--ink);
  }
  .fr-tab-btn {
    padding: 0.5rem 1.25rem;
    border-radius: 10px;
    border: none;
    background: transparent;
    font-size: 0.85rem;
    font-weight: 600;
    color: var(--muted);
    cursor: pointer;
  }
  .fr-tab-btn.active {
    background: white;
    color: var(--accent);
    box-shadow: 0 2px 4px rgba(0,0,0,0.05);
  }
`;

export default function FranchiseReport() {
    const { docs: products } = useFirestore('products');
    const { docs: branches } = useFirestore('branches');
    const [invoices, setInvoices] = useState([]);
    const [loading, setLoading] = useState(true);

    const userRole = sessionStorage.getItem('fb_user_role');
    const userCompanyId = sessionStorage.getItem('fb_user_company_id');
    const userBranchId = sessionStorage.getItem('fb_user_branch_id') || 'main';

    const getLocalDate = () => {
        const d = new Date();
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    };
    const todayStr = getLocalDate();
    const [selectedDate, setSelectedDate] = useState(todayStr);
    const [selectedBranchId, setSelectedBranchId] = useState((userRole && userRole.toLowerCase() === 'owner') ? "all" : userBranchId);
    const [view, setView] = useState('table');

    // Targeted Fetch: Only fetch invoices for the specific selected date
    useEffect(() => {
        async function fetchDailySales() {
            setLoading(true);
            try {
                const filters = { 
                    companyId: userCompanyId, 
                    filterDate: selectedDate 
                };
                if (selectedBranchId !== 'all') filters.branchId = selectedBranchId;

                const result = await invoiceService.getInvoices(filters, { pageSize: 500 });
                setInvoices(result.docs);
            } catch (err) {
                console.error("Daily report fetch error:", err);
            } finally {
                setLoading(false);
            }
        }
        if (userCompanyId) fetchDailySales();
    }, [userCompanyId, selectedDate, selectedBranchId]);

    // Aggregate Data from the targeted fetch
    const branchStats = useMemo(() => {
        const brs = Array.isArray(branches) ? branches : [];
        const invs = Array.isArray(invoices) ? invoices : [];
        const map = {};

        brs.forEach(br => {
            if (!br?.id) return;
            map[br.id] = { id: br.id, name: br.name || 'Branch', city: br.city || 'TN', sales: 0, count: 0 };
        });

        if (!map['main']) map['main'] = { id: 'main', name: 'Main Branch', city: 'TN', sales: 0, count: 0 };

        invs.forEach(inv => {
            const bid = inv?.branch_id || 'main';
            if (map[bid]) {
                map[bid].sales += Number(inv?.amount) || 0;
                map[bid].count++;
            }
        });

        return Object.values(map).sort((a, b) => (b?.sales ?? 0) - (a?.sales ?? 0));
    }, [branches, invoices]);

    // Consolidated and Robust Aggregation (Fixed Units Sold & Table display)
    const processedData = useMemo(() => {
        const report = {};
        const invs = Array.isArray(invoices) ? invoices : [];
        const prods = Array.isArray(products) ? products : [];
        
        let totalRevenue = 0;
        let totalUnits = 0;

        // 1. Initialize report with MASTER items (to have categories/clean names)
        prods.forEach(p => {
            if (p?.id) {
                report[p.id] = { 
                    name: p.name ?? 'Unknown', 
                    category: p.cat ?? 'General', 
                    price: p.price ?? 0, 
                    qty: 0, 
                    revenue: 0 
                };
            }
        });

        // 2. Process all invoices and DYNAMICALLY add items
        invs.forEach(inv => {
            totalRevenue += (Number(inv?.amount) || 0);
            const items = Array.isArray(inv?.items) ? inv.items : [];
            
            items.forEach(item => {
                const pid = item?.id || item?.productId || 'other';
                const qty = Number(item?.qty) || Number(item?.quantity) || 0;
                totalUnits += qty;

                // Dynamic Addition: If product is not in Master list, don't ignore it
                if (!report[pid]) {
                    report[pid] = { 
                        name: item?.name || 'Item Out of Menu', 
                        category: 'Legacy/Other', 
                        price: Number(item?.price) || 0,
                        qty: 0, 
                        revenue: 0 
                    };
                }
                
                report[pid].qty += qty;
                report[pid].revenue += (qty * (Number(item?.price) || report[pid].price));
            });
        });

        const salesReport = Object.values(report)
            .filter(r => (r?.qty ?? 0) > 0)
            .sort((a, b) => (b?.qty ?? 0) - (a?.qty ?? 0));

        return { 
            salesReport, 
            totalRevenue, 
            totalUnits, 
            invoiceCount: invs.length 
        };
    }, [products, invoices]);

    const { salesReport, totalRevenue, totalUnits, invoiceCount } = processedData;

    return (
        <div className="page active" id="page-franchise-report" style={{ background: '#f8fafc', minHeight: '100vh' }}>
            <style>{css}</style>
            
            <div className="fr-container" style={{ padding: '2rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem', marginBottom: '2rem' }}>
                    <div>
                        <h1 className="fr-section-title">Franchise Analytics</h1>
                        <p style={{ color: 'var(--muted)', fontSize: '0.9rem' }}>Product performance analysis for {selectedDate}</p>
                    </div>
                    <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                        {userRole === 'owner' && (
                            <select className="fr-date-input" value={selectedBranchId} onChange={(e) => setSelectedBranchId(e.target.value)}>
                                <option value="all">🌐 All Branches</option>
                                {branches.map(b => <option key={b.id} value={b.id}>📍 {b.name}</option>)}
                            </select>
                        )}
                        <input type="date" className="fr-date-input" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)} max={todayStr} />
                        <button className="btn btn-outline btn-sm" onClick={() => downloadFranchiseReportExcel(salesReport)}>📥 Export</button>
                    </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.5rem', marginBottom: '2rem' }}>
                    <div className="fr-card">
                        <div style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--muted)' }}>GROSS SALES</div>
                        <div style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--accent)' }}>₹{totalRevenue.toLocaleString()}</div>
                    </div>
                    <div className="fr-card">
                        <div style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--muted)' }}>UNITS SOLD</div>
                        <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#10b981' }}>{totalUnits}</div>
                    </div>
                    <div className="fr-card">
                        <div style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--muted)' }}>BILLS PROCESSED</div>
                        <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#6366f1' }}>{invoiceCount}</div>
                    </div>
                    <div className="fr-card">
                        <div style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--muted)' }}>TOP PRODUCT</div>
                        <div style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--ink)' }}>{salesReport[0]?.name || '—'}</div>
                    </div>
                </div>

                <div className="fr-table-wrap">
                    {loading ? (
                        <div style={{ padding: '4rem', textAlign: 'center', color: 'var(--muted)', fontWeight: 600 }}>Analyzing daily data...</div>
                    ) : (
                        <table className="fr-table">
                            <thead>
                                <tr>
                                    <th>Description</th>
                                    <th>Category</th>
                                    <th>Quantity</th>
                                    <th style={{ textAlign: 'right' }}>Revenue Generated</th>
                                </tr>
                            </thead>
                            <tbody>
                                {salesReport.length === 0 ? (
                                    <tr><td colSpan="4" style={{ textAlign: 'center', padding: '3rem', color: 'var(--muted)' }}>No sales recorded for this date.</td></tr>
                                ) : (
                                    salesReport.map((row, idx) => (
                                        <tr key={idx}>
                                            <td style={{ fontWeight: 700 }}>{row.name}</td>
                                            <td><span style={{ background: '#f1f5f9', padding: '4px 10px', borderRadius: '8px', fontSize: '0.75rem' }}>{row.category}</span></td>
                                            <td style={{ fontWeight: 800, color: 'var(--accent)' }}>{row.qty} units</td>
                                            <td style={{ textAlign: 'right', fontWeight: 800, color: '#10b981' }}>₹{row.revenue.toLocaleString()}</td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    )}
                </div>
            </div>
        </div>
    );
}
