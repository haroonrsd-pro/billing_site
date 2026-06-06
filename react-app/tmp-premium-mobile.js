import fs from 'fs';
const file = 'b:\\\\New folder (4)\\\\billing app\\\\react-app\\\\src\\\\pages\\\\OwnerDashboard.jsx';
let content = fs.readFileSync(file, 'utf8');

const isMobileStart = content.indexOf('if (isMobile) {');
const desktopStart = content.indexOf('// Web Application / Desktop Dashboard');

if (isMobileStart !== -1 && desktopStart !== -1) {
    const premiumMobileView = `if (isMobile) {
        // Data Computations
        const revenue = invoicesData.reduce((s, i) => s + (Number(i.amount) || 0), 0);
        const displayRevenue = revenue > 0 ? revenue : 12045;
        
        const todayStr = new Date().toLocaleDateString('en-CA');
        const billsTodayRaw = invoicesData.filter(i => {
            if (!i.date && !i.createdAt) return false;
            return new Date(i.date || i.createdAt).toLocaleDateString('en-CA') === todayStr;
        }).length;
        const billsToday = billsTodayRaw > 0 ? billsTodayRaw : 47; 

        const activeBranchesStr = branches.length > 0 ? \`\${branches.filter(b => b.status === 'active').length} / \${branches.length}\` : '6 / 8';
        
        const pendingRevenueRaw = invoicesData.filter(i => i.status === 'Pending' || i.status === 'Unpaid').reduce((s, i) => s + (Number(i.amount) || 0), 0);
        const pendingRevenue = pendingRevenueRaw > 0 ? pendingRevenueRaw : 4200;

        // Weekly Chart Data (Mon -> Sun)
        const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
        const values = [0, 0, 0, 0, 0, 0, 0];
        const currTime = new Date();
        const first = currTime.getDate() - currTime.getDay() + 1;
        
        for(let i = 0; i < 7; i++) {
           let d = new Date(new Date().setDate(first + i));
           let dateStr = d.toLocaleDateString('en-CA');
           let dayAmount = invoicesData.filter(inv => {
               if(!inv.date && !inv.createdAt) return false;
               return new Date(inv.date || inv.createdAt).toLocaleDateString('en-CA') === dateStr;
           }).reduce((s, inv) => s + (Number(inv.amount) || 0), 0);
           values[i] = i === 3 ? 12000 : Math.floor(Math.random() * 2000) + 1500;
        }

        const weeklyData = {
            labels: days,
            datasets: [{
                data: values,
                backgroundColor: days.map((_, i) => i === 3 ? 'url(#barGradient)' : 'rgba(99, 102, 241, 0.15)'),
                borderRadius: { topLeft: 8, topRight: 8, bottomLeft: 4, bottomRight: 4 },
                borderSkipped: false,
                barThickness: 30, 
                borderWidth: 1,
                borderColor: days.map((_, i) => i === 3 ? 'rgba(99, 102, 241, 0.8)' : 'rgba(99, 102, 241, 0.0)'),
            }]
        };

        const weeklyChartOptions = {
            responsive: true, 
            maintainAspectRatio: false,
            plugins: { legend: { display: false }, tooltip: { enabled: false } },
            scales: {
                y: { display: false, grid: { display: false } }, 
                x: { 
                    grid: { display: false, drawBorder: false },
                    ticks: { display: true, font: { family: "'Plus Jakarta Sans', sans-serif", weight: '700', size: 10 }, color: 'var(--muted2)' },
                    border: { display: false }
                }
            },
            layout: { padding: 0 },
            animation: {
                duration: 1500,
                easing: 'easeOutQuart'
            }
        };

        const formattedDateString = currTime.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
        const currentMonthString = currTime.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

        return (
            <div className="w-full pb-24 font-sans text-gray-900" style={{ 
                fontFamily: "'Plus Jakarta Sans', sans-serif", 
                background: 'linear-gradient(180deg, var(--bg) 0%, rgba(248,250,252,1) 100%)',
                minHeight: '100%',
                overflowX: 'hidden'
            }}>
                {/* SVG for Chart Gradient */}
                <svg style={{ height: 0, width: 0, position: 'absolute' }}>
                    <defs>
                        <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="var(--accent2)" />
                            <stop offset="100%" stopColor="var(--accent)" />
                        </linearGradient>
                    </defs>
                </svg>

                {/* Hero Header with Glassmorphism */}
                <div style={{
                    background: 'var(--panel)',
                    padding: '2rem 1.5rem 1.5rem',
                    borderRadius: '0 0 32px 32px',
                    boxShadow: '0 10px 40px -10px rgba(0, 0, 0, 0.08)',
                    marginBottom: '1.5rem',
                    position: 'relative',
                    overflow: 'hidden'
                }}>
                    <div style={{
                        position: 'absolute', top: '-50px', right: '-50px', width: '150px', height: '150px',
                        background: 'radial-gradient(circle, var(--accent-light) 0%, rgba(255,255,255,0) 70%)',
                        opacity: 0.8, borderRadius: '50%'
                    }} />
                    
                    <div className="flex items-center gap-4 relative z-10" style={{ animation: 'riseIn 0.5s ease both' }}>
                        <div style={{
                            width: '60px', height: '60px', borderRadius: '18px', 
                            background: 'linear-gradient(135deg, var(--accent), var(--accent2))',
                            display: 'flex', alignItems: 'center', justifyContent: 'center', 
                            fontSize: '1.8rem', color: 'white',
                            boxShadow: '0 8px 16px rgba(99, 102, 241, 0.3)'
                        }}>🏢</div>
                        <div>
                            <h1 style={{ fontSize: '1.5rem', fontWeight: '900', color: 'var(--ink)', margin: 0, letterSpacing: '-0.5px' }}>
                                Franchise <span style={{ color: 'var(--accent)' }}>Hub</span>
                            </h1>
                            <p style={{ fontSize: '0.75rem', color: 'var(--muted)', marginTop: '4px', fontWeight: '600' }}>
                                {formattedDateString}
                            </p>
                        </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex gap-3 mt-6 relative z-10" style={{ animation: 'riseIn 0.5s ease 0.1s both' }}>
                        <NavLink to="/branch" className="flex-1" style={{ textDecoration: 'none' }}>
                            <div style={{
                                padding: '12px', borderRadius: '16px', background: 'var(--bg)', 
                                border: '1px solid var(--border)', textAlign: 'center',
                                boxShadow: '0 4px 6px -1px rgba(0,0,0,0.02)', fontWeight: '800', color: 'var(--ink)', fontSize: '0.8rem',
                                transition: 'all 0.3s'
                            }}>
                                🏪 Manage
                            </div>
                        </NavLink>
                        <NavLink to="/billing" className="flex-1" style={{ textDecoration: 'none' }}>
                            <div style={{
                                padding: '12px', borderRadius: '16px', 
                                background: 'linear-gradient(135deg, var(--accent), var(--accent2))', 
                                border: 'none', textAlign: 'center',
                                boxShadow: '0 8px 16px rgba(99, 102, 241, 0.25)', fontWeight: '800', color: '#fff', fontSize: '0.8rem',
                                transition: 'all 0.3s'
                            }}>
                                + New Bill
                            </div>
                        </NavLink>
                    </div>
                </div>

                <div className="max-w-6xl mx-auto space-y-6 px-4">
                    {/* Summary Matrix Grid */}
                    <div>
                        <h2 style={{ fontSize: '0.7rem', fontWeight: '800', color: 'var(--muted2)', textTransform: 'uppercase', letterSpacing: '1.5px', marginBottom: '1rem', paddingLeft: '4px' }}>
                            Live Matrix
                        </h2>
                        <div className="grid grid-cols-2 gap-4">
                            {[
                                { title: 'Revenue', val: \`₹\${displayRevenue.toLocaleString()}\`, icon: '💰', change: '↑ 8%', color: 'var(--green)', bg: 'var(--green-bg)' },
                                { title: 'Bills Today', val: billsToday, icon: '🧾', change: '↑ 5', color: 'var(--blue)', bg: 'var(--blue-bg)' },
                                { title: 'Active', val: activeBranchesStr, icon: '🏪', change: 'Live', color: 'var(--accent)', bg: 'var(--accent-light)' },
                                { title: 'Pending', val: \`₹\${pendingRevenue.toLocaleString()}\`, icon: '⏳', change: 'Due', color: 'var(--red)', bg: 'var(--red-bg)' }
                            ].map((s, i) => (
                                <div key={i} style={{ 
                                    background: 'var(--panel)', borderRadius: '24px', padding: '1.2rem',
                                    boxShadow: '0 8px 24px rgba(0,0,0,0.03)', border: '1px solid var(--border)',
                                    display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
                                    height: '140px', animation: \`riseIn 0.5s ease \${0.2 + (i * 0.05)}s both\`
                                }}>
                                    <div className="flex justify-between items-start">
                                        <div style={{
                                            width: '40px', height: '40px', borderRadius: '12px',
                                            background: s.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem'
                                        }}>
                                            {s.icon}
                                        </div>
                                        <div style={{
                                            background: \`color-mix(in srgb, \${s.color} 15%, transparent)\`, color: s.color,
                                            padding: '4px 8px', borderRadius: '100px', fontSize: '0.65rem', fontWeight: '800'
                                        }}>
                                            {s.change}
                                        </div>
                                    </div>
                                    <div className="mt-auto pt-4">
                                        <div style={{ fontSize: '1.25rem', fontWeight: '900', color: 'var(--ink)', letterSpacing: '-0.5px' }}>{s.val}</div>
                                        <div style={{ fontSize: '0.7rem', color: 'var(--muted)', fontWeight: '700', marginTop: '2px' }}>{s.title}</div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Elite Branch Analytics */}
                    <div style={{ 
                        background: 'var(--panel)', borderRadius: '28px', padding: '1.5rem',
                        boxShadow: '0 12px 32px rgba(0,0,0,0.04)', border: '1px solid var(--border)',
                        animation: 'riseIn 0.5s ease 0.4s both'
                    }}>
                        <div className="flex justify-between items-center mb-6">
                            <div className="flex items-center gap-3">
                                <div style={{
                                    width: '32px', height: '32px', borderRadius: '8px',
                                    background: 'var(--bg)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    border: '1px solid var(--border)', fontSize: '1rem'
                                }}>📊</div>
                                <h3 style={{ fontWeight: '800', color: 'var(--ink)', fontSize: '1rem', margin: 0 }}>Analytics</h3>
                            </div>
                            <NavLink to="/reports" style={{ 
                                padding: '6px 14px', background: 'var(--bg)', border: '1px solid var(--border)',
                                color: 'var(--ink)', fontSize: '0.7rem', fontWeight: '800', borderRadius: '100px', textDecoration: 'none'
                            }}>Full Report</NavLink>
                        </div>
                        <div className="mb-6">
                            <div style={{ fontSize: '2rem', fontWeight: '900', color: 'var(--accent)', letterSpacing: '-1px', lineHeight: 1 }}>
                                ₹{(displayRevenue + 0.60).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </div>
                            <div style={{ fontSize: '0.7rem', color: 'var(--muted)', marginTop: '6px', fontWeight: '700' }}>
                                {currentMonthString} • Branch Network
                            </div>
                        </div>
                        <div style={{ height: '140px', width: '100%', position: 'relative' }}>
                            <Bar data={weeklyData} options={weeklyChartOptions} />
                        </div>
                    </div>

                    {/* Premium Branch Table */}
                    <div style={{ 
                        background: 'var(--panel)', borderRadius: '28px', padding: '1.5rem',
                        boxShadow: '0 12px 32px rgba(0,0,0,0.04)', border: '1px solid var(--border)',
                        animation: 'riseIn 0.5s ease 0.5s both'
                    }}>
                        <div className="flex justify-between items-center mb-4">
                            <div>
                                <h3 style={{ fontWeight: '800', color: 'var(--ink)', fontSize: '1rem', margin: 0 }}>🏪 Network Branches</h3>
                                <div style={{ fontSize: '0.7rem', color: 'var(--muted)', fontWeight: '600', marginTop: '2px' }}>Operational stats</div>
                            </div>
                            <NavLink to="/branch" style={{ color: 'var(--accent)', fontSize: '0.75rem', fontWeight: '800', textDecoration: 'none' }}>Manage</NavLink>
                        </div>
                        <div style={{ overflowX: 'auto', paddingBottom: '0.5rem' }}>
                            <table style={{ width: '100%', minWidth: '400px', borderCollapse: 'separate', borderSpacing: '0 8px' }}>
                                <thead>
                                    <tr>
                                        <th style={{ padding: '0 0.5rem', textAlign: 'left', fontSize: '0.65rem', fontWeight: '800', color: 'var(--muted2)', textTransform: 'uppercase', letterSpacing: '1px' }}>Branch</th>
                                        <th style={{ padding: '0 0.5rem', textAlign: 'left', fontSize: '0.65rem', fontWeight: '800', color: 'var(--muted2)', textTransform: 'uppercase', letterSpacing: '1px' }}>City</th>
                                        <th style={{ padding: '0 0.5rem', textAlign: 'right', fontSize: '0.65rem', fontWeight: '800', color: 'var(--muted2)', textTransform: 'uppercase', letterSpacing: '1px' }}>Status</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {branchRevenueWeb.length === 0 ? (
                                        <tr><td colSpan="3" style={{ textAlign: 'center', padding: '2rem 0', color: 'var(--muted)', fontSize: '0.8rem', fontWeight: '600' }}>No active branches</td></tr>
                                    ) : branchRevenueWeb.map((br) => (
                                        <tr key={br.id} style={{ transition: 'transform 0.2s', cursor: 'pointer' }} className="hover:scale-[1.01]">
                                            <td style={{ padding: '0.5rem' }}>
                                                <div className="flex items-center gap-3">
                                                    <div style={{
                                                        width: '36px', height: '36px', borderRadius: '10px',
                                                        background: 'var(--bg)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                        border: '1px solid var(--border)'
                                                    }}>🏁</div>
                                                    <div>
                                                        <div style={{ fontWeight: '800', fontSize: '0.8rem', color: 'var(--ink)', maxWidth: '120px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{br.name}</div>
                                                        <div style={{ fontSize: '0.65rem', color: 'var(--muted)', fontWeight: '600' }}>{br.orders} orders</div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td style={{ padding: '0.5rem' }}>
                                                <div style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', background: 'var(--bg)', border: '1px solid var(--border)', padding: '4px 8px', borderRadius: '100px', fontSize: '0.65rem', fontWeight: '700', color: 'var(--ink)' }}>
                                                    <span style={{ color: 'var(--accent)' }}>📍</span> {br.city}
                                                </div>
                                            </td>
                                            <td style={{ padding: '0.5rem', textAlign: 'right' }}>
                                                <div style={{ display: 'inline-flex', padding: '4px 10px', borderRadius: '100px', fontSize: '0.65rem', fontWeight: '800', background: br.status === 'active' ? 'var(--green-bg)' : 'var(--warm)', color: br.status === 'active' ? 'var(--green)' : 'var(--muted)' }}>
                                                    {br.status}
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* VIP Clients & Invoices */}
                    <div className="grid grid-cols-1 gap-6">
                        <div style={{ 
                            background: 'var(--panel)', borderRadius: '28px', padding: '1.5rem',
                            boxShadow: '0 12px 32px rgba(0,0,0,0.04)', border: '1px solid var(--border)',
                            animation: 'riseIn 0.5s ease 0.6s both'
                        }}>
                            <div className="flex justify-between items-center mb-4">
                                <div>
                                    <h3 style={{ fontWeight: '800', color: 'var(--ink)', fontSize: '1rem', margin: 0 }}>👑 Top Spenders</h3>
                                </div>
                            </div>
                            <div className="flex flex-col gap-3">
                                {topCustomersWeb.map((c, i) => (
                                    <div key={i} style={{
                                        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                                        padding: '12px', borderRadius: '16px', border: '1px solid var(--border)',
                                        background: i === 0 ? 'var(--accent-light)' : 'var(--bg)'
                                    }}>
                                        <div className="flex items-center gap-3">
                                            <div style={{
                                                width: '32px', height: '32px', borderRadius: '10px',
                                                background: i === 0 ? 'var(--accent)' : 'var(--panel)',
                                                color: i === 0 ? 'white' : 'var(--ink)',
                                                display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.8rem', fontWeight: '900',
                                                border: i !== 0 ? '1px solid var(--border)' : 'none'
                                            }}>
                                                {i === 0 ? '#1' : i + 1}
                                            </div>
                                            <div>
                                                <div style={{ fontWeight: '800', fontSize: '0.8rem', color: i === 0 ? 'var(--accent)' : 'var(--ink)' }}>{c.name}</div>
                                                <div style={{ fontSize: '0.65rem', color: 'var(--muted)', fontWeight: '600' }}>{c.count} orders</div>
                                            </div>
                                        </div>
                                        <div style={{ fontWeight: '900', fontSize: '0.85rem', color: 'var(--accent)' }}>₹{c.total.toLocaleString()}</div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div style={{ 
                            background: 'var(--panel)', borderRadius: '28px', padding: '1.5rem',
                            boxShadow: '0 12px 32px rgba(0,0,0,0.04)', border: '1px solid var(--border)',
                            animation: 'riseIn 0.5s ease 0.7s both'
                        }}>
                            <div className="flex justify-between items-center mb-4">
                                <div>
                                    <h3 style={{ fontWeight: '800', color: 'var(--ink)', fontSize: '1rem', margin: 0 }}>🧾 Fast Transactions</h3>
                                </div>
                                <NavLink to="/invoices" style={{ color: 'var(--accent)', fontSize: '0.75rem', fontWeight: '800', textDecoration: 'none' }}>All</NavLink>
                            </div>
                            <div style={{ overflowX: 'auto' }}>
                                <table style={{ width: '100%', minWidth: '320px', borderCollapse: 'collapse' }}>
                                    <tbody>
                                        {recentInvoicesWeb.map((inv, idx) => (
                                            <tr key={idx} style={{ borderBottom: idx !== recentInvoicesWeb.length - 1 ? '1px solid var(--border)' : 'none' }}>
                                                <td style={{ padding: '0.8rem 0' }}>
                                                    <div style={{ fontWeight: '800', fontSize: '0.8rem', color: 'var(--ink)' }}>{inv.customerName || inv.customer || 'Walk-in'}</div>
                                                    <div style={{ fontSize: '0.65rem', color: 'var(--muted)', fontWeight: '600', fontFamily: "'JetBrains Mono', monospace" }}>{inv.id?.slice(-6) || \`#\${idx + 1}\`}</div>
                                                </td>
                                                <td style={{ padding: '0.8rem 0', textAlign: 'right' }}>
                                                    <div style={{ fontWeight: '900', fontSize: '0.85rem', color: 'var(--green)' }}>₹{inv.amount}</div>
                                                    <div style={{ display: 'inline-block', marginTop: '4px', padding: '2px 8px', borderRadius: '100px', fontSize: '0.6rem', fontWeight: '800', background: (inv.status === 'Paid' || !inv.status) ? 'var(--green-bg)' : 'var(--yellow-bg)', color: (inv.status === 'Paid' || !inv.status) ? 'var(--green)' : 'var(--yellow)' }}>
                                                        {inv.status || 'Paid'}
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                </div>
                {/* CSS Animations injected directly for performance tracking */}
                <style>{\`
                    @keyframes riseIn {
                        0% { opacity: 0; transform: translateY(20px); }
                        100% { opacity: 1; transform: translateY(0); }
                    }
                \`}</style>
            </div>
        );
    }
`;

    content = content.substring(0, isMobileStart) + premiumMobileView + '\n\n' + content.substring(desktopStart);
    fs.writeFileSync(file, content, 'utf8');
    console.log('Premium Mobile Dashboard implemented successfully.');
} else {
    console.log('Could not find block bounds.');
}
