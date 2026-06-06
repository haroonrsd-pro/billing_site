import fs from 'fs';
const file = 'b:\\\\New folder (4)\\\\billing app\\\\react-app\\\\src\\\\pages\\\\OwnerDashboard.jsx';
let content = fs.readFileSync(file, 'utf8');

const hooksRegex = /const revenueWeb = [\s\S]*?}, \[invoicesData\]\);/;
let hooksMatch = content.match(hooksRegex);

if (hooksMatch) {
    content = content.replace(hooksMatch[0], '');
    content = content.replace('if (isMobile) {', hooksMatch[0] + '\n\n    if (isMobile) {');

    const mobileReplaceTarget = `                    <div className="bg-white rounded-[20px] p-5 shadow-[0_2px_10px_-4px_rgba(0,0,0,0.05)] flex justify-between items-center">
                        <div className="flex items-center gap-2">
                            <div className="text-xl">🏢</div>
                            <h3 className="font-bold text-gray-900 text-base">Franchise Branch Details</h3>
                        </div>
                        <NavLink to="/branch" className="px-5 py-1.5 bg-[#ede9fe] text-[#6d28d9] text-[11px] font-bold rounded-full">Manage</NavLink>
                    </div>`;

    const desktopSectionsMobile = `                    <div className="bg-white rounded-[20px] p-5 shadow-[0_2px_10px_-4px_rgba(0,0,0,0.05)]">
                        <div className="font-bold text-gray-900 text-base mb-1">📍 Tamil Nadu Locations</div>
                        <div className="text-[11px] text-gray-500 font-medium mb-3">
                            {branches.length} branches across {cityStatsWeb.length} cities
                        </div>
                        {cityStatsWeb.length === 0 ? (
                            <div className="text-center py-4 opacity-60">
                                <div className="text-2xl mb-1">🏪</div>
                                <div className="text-xs font-semibold">No branches yet</div>
                            </div>
                        ) : (
                            <div className="flex flex-col gap-2 max-h-48 overflow-y-auto">
                                {cityStatsWeb.map(([city, data], i) => (
                                    <div key={city} className={\`flex justify-between items-center p-3 rounded-xl \${i === 0 ? 'bg-[#ecfdf5]' : 'bg-gray-50'}\`}>
                                        <div className="min-w-0 flex-1">
                                            <div className="font-bold text-sm text-gray-900">📍 {city}</div>
                                            <div className="text-[10px] text-gray-500 font-semibold truncate">{data.branches.join(', ')}</div>
                                        </div>
                                        <div className="bg-[#10b981] text-white px-3 py-1 rounded-full font-bold text-[10px] shrink-0">
                                            {data.count} {data.count === 1 ? 'branch' : 'branches'}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    <div className="bg-white rounded-[20px] p-5 shadow-[0_2px_10px_-4px_rgba(0,0,0,0.05)]">
                        <div className="flex justify-between items-center mb-3">
                            <div>
                                <div className="font-bold text-gray-900 text-base">🏪 Franchise Branch Details</div>
                                <div className="text-[11px] text-gray-500 font-medium">Performance overview</div>
                            </div>
                            <NavLink to="/branch" className="text-[#6d28d9] text-[11px] font-bold">Manage</NavLink>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-left" style={{ minWidth: '400px' }}>
                                <thead>
                                    <tr className="bg-gray-50">
                                        <th className="p-3 text-[10px] font-bold text-gray-400 tracking-wider uppercase">Branch</th>
                                        <th className="p-3 text-[10px] font-bold text-gray-400 tracking-wider uppercase">City</th>
                                        <th className="p-3 text-[10px] font-bold text-gray-400 tracking-wider uppercase">Type</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {branchRevenueWeb.map((br) => (
                                        <tr key={br.id} className="border-b border-gray-100">
                                            <td className="p-3">
                                                <div className="flex items-center gap-2">
                                                    <div className="w-8 h-8 rounded-lg bg-[#ecfdf5] flex items-center justify-center shrink-0">🏪</div>
                                                    <div>
                                                        <div className="font-bold text-xs text-gray-900 truncate max-w-[100px]">{br.name}</div>
                                                        <div className="text-[9px] text-[#10b981] font-bold">{br.status}</div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="p-3">
                                                <span className="bg-[#ecfdf5] text-[#059669] px-2 py-1 rounded text-[10px] font-bold truncate max-w-[80px] block">📍 {br.city}</span>
                                            </td>
                                            <td className="p-3">
                                                <span className="bg-[#eef2ff] text-[#6366f1] px-2 py-1 rounded text-[10px] font-bold">{br.phone ? 'Owned' : 'Rent'}</span>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    <div className="bg-white rounded-[20px] p-5 shadow-[0_2px_10px_-4px_rgba(0,0,0,0.05)]">
                        <div className="font-bold text-gray-900 text-base mb-1">👥 Top Clients</div>
                        <div className="text-[11px] text-gray-500 font-medium mb-3">Highest spending franchise customers</div>
                        <div className="flex flex-col gap-2">
                            {topCustomersWeb.map((c, i) => (
                                <div key={i} className={\`flex justify-between items-center p-3 rounded-xl \${i === 0 ? 'bg-[#eef2ff]' : 'bg-gray-50'}\`}>
                                    <div className="flex items-center gap-3">
                                        <div className={\`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs \${i === 0 ? 'bg-[#6366f1] text-white' : 'bg-gray-200 text-gray-500'}\`}>
                                            {i === 0 ? '👑' : i + 1}
                                        </div>
                                        <div>
                                            <div className="font-bold text-xs text-gray-900">{c.name}</div>
                                            <div className="text-[10px] text-gray-500 font-semibold">{c.count} orders</div>
                                        </div>
                                    </div>
                                    <div className="font-bold text-xs text-[#6366f1]">₹{c.total.toLocaleString('en-IN')}</div>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="bg-white rounded-[20px] p-5 shadow-[0_2px_10px_-4px_rgba(0,0,0,0.05)]">
                        <div className="flex justify-between items-center mb-3">
                            <div>
                                <div className="font-bold text-gray-900 text-base">🧾 Recent Invoices</div>
                                <div className="text-[11px] text-gray-500 font-medium">Latest transactions</div>
                            </div>
                            <NavLink to="/invoices" className="text-[#6d28d9] text-[11px] font-bold">View All</NavLink>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-left" style={{ minWidth: '350px' }}>
                                <thead>
                                    <tr className="bg-gray-50">
                                        <th className="p-3 text-[10px] font-bold text-gray-400 tracking-wider uppercase">#</th>
                                        <th className="p-3 text-[10px] font-bold text-gray-400 tracking-wider uppercase">Client</th>
                                        <th className="p-3 text-[10px] font-bold text-gray-400 tracking-wider uppercase">Amount</th>
                                        <th className="p-3 text-[10px] font-bold text-gray-400 tracking-wider uppercase">Status</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {recentInvoicesWeb.map((inv, idx) => (
                                        <tr key={idx} className="border-b border-gray-100">
                                            <td className="p-3 text-[10px] text-gray-500">{inv.id?.slice(-5) || idx + 1}</td>
                                            <td className="p-3 font-semibold text-xs text-gray-900">{inv.customerName || inv.customer || 'Walk-in'}</td>
                                            <td className="p-3 font-bold text-xs text-[#6366f1]">₹{inv.amount}</td>
                                            <td className="p-3">
                                                <span className={\`px-2 py-1 rounded text-[9px] font-bold \${(inv.status === 'Paid' || !inv.status) ? 'bg-[#ecfdf5] text-[#059669]' : 'bg-[#fef3c7] text-[#d97706]'}\`}>
                                                    {inv.status || 'Paid'}
                                                </span>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>`;

    content = content.replace(mobileReplaceTarget, desktopSectionsMobile);
    fs.writeFileSync(file, content, 'utf8');
    console.log('Replacement performed successfully.');
} else {
    console.log('Hooks match not found.');
}
