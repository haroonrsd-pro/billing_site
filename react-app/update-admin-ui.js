import fs from 'fs';
const file = 'b:\\\\New folder (4)\\\\billing app\\\\react-app\\\\src\\\\pages\\\\AdminDashboard.jsx';
let content = fs.readFileSync(file, 'utf8');

const targetStr = `return (
    <div className="page active" id="page-dashboard" style={{ animation: "fadeIn 0.4s ease" }}>`;

const mobileBlock = `  // 🌟 MOBILE ADAPTIVE VIEW (Injected Algorithm)
  if (deviceType === 'mobile') {
    return (
      <div className="w-full min-h-screen bg-gray-50 pb-20 font-sans">
        
        {/* Header */}
        <div className="bg-white p-4 shadow-sm sticky top-0 z-50 flex justify-between items-center border-b border-gray-200">
            <div className="flex items-center gap-3">
               <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-700 text-white flex items-center justify-center font-bold shadow-md">
                 {userName.charAt(0).toUpperCase()}
               </div>
               <div>
                 <div className="font-bold text-gray-900 text-base leading-tight">Admin Portal</div>
                 <div className="text-[10px] text-gray-500 font-semibold uppercase tracking-wider">{userBranch}</div>
               </div>
            </div>
            <div className="flex items-center gap-2">
               <div className="text-[10px] bg-green-100 text-green-700 px-2.5 py-1 rounded-full font-bold flex items-center gap-1 border border-green-200 shadow-sm"><span className="w-1.5 h-1.5 rounded-full bg-green-500 block animate-pulse"></span> LIVE</div>
            </div>
        </div>

        <div className="px-4 py-5 space-y-5">
            {/* Top Cards Grid */}
            <div className="grid grid-cols-2 gap-3.5">
                <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 flex flex-col justify-between">
                    <div className="flex justify-between items-start mb-2">
                       <div className="text-xl bg-blue-50 w-8 h-8 rounded-lg flex items-center justify-center border border-blue-100">👥</div>
                       <div className="text-xs font-bold text-gray-400 uppercase tracking-widest">Team</div>
                    </div>
                    <div>
                       <div className="text-2xl font-black text-gray-900 leading-none">{branchEmployees.length}</div>
                       <div className="text-[10px] text-gray-500 mt-1 font-medium">{activeEmployees} active</div>
                    </div>
                </div>

                <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 flex flex-col justify-between">
                    <div className="flex justify-between items-start mb-2">
                       <div className="text-xl bg-green-50 w-8 h-8 rounded-lg flex items-center justify-center border border-green-100">📈</div>
                       <div className="text-xs font-bold text-gray-400 uppercase tracking-widest">Rev</div>
                    </div>
                    <div>
                       <div className="text-xl font-black text-green-600 leading-none">₹{(currentRevenue/1000).toFixed(1)}k</div>
                       <div className="text-[10px] text-gray-500 mt-1 font-medium">This month</div>
                    </div>
                </div>

                <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 flex flex-col justify-between">
                    <div className="flex justify-between items-start mb-2">
                       <div className="text-xl bg-red-50 w-8 h-8 rounded-lg flex items-center justify-center border border-red-100">📉</div>
                       <div className="text-xs font-bold text-gray-400 uppercase tracking-widest">Exp</div>
                    </div>
                    <div>
                       <div className="text-xl font-black text-red-500 leading-none">₹{(totalExpenses/1000).toFixed(1)}k</div>
                       <div className="text-[10px] text-gray-500 mt-1 font-medium">Allocated</div>
                    </div>
                </div>

                <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 flex flex-col justify-between">
                    <div className="flex justify-between items-start mb-2">
                       <div className="text-xl bg-indigo-50 w-8 h-8 rounded-lg flex items-center justify-center border border-indigo-100">💰</div>
                       <div className="text-xs font-bold text-gray-400 uppercase tracking-widest">Net</div>
                    </div>
                    <div>
                       <div className="text-xl font-black text-indigo-600 leading-none">₹{((totalRevenue - totalExpenses)/1000).toFixed(1)}k</div>
                       <div className="text-[10px] text-gray-500 mt-1 font-medium">All time</div>
                    </div>
                </div>
            </div>

            {/* Revenue Trend Chart */}
            <div className="bg-white p-4.5 rounded-2xl shadow-sm border border-gray-100">
                <div className="flex justify-between items-center mb-6">
                    <h3 className="font-extrabold text-gray-800 text-[15px]">Revenue Trend</h3>
                    <span className="text-[10px] font-bold text-gray-500 bg-gray-100 px-2.5 py-1 rounded-md uppercase tracking-wide">6 months</span>
                </div>
                <div className="flex items-end justify-between h-36 pt-4 mt-2">
                    {revenueByMonth.map((d, i) => {
                        const h = maxRevenue > 0 ? (d.amount / maxRevenue) * 100 : 0;
                        const isLast = i === revenueByMonth.length - 1;
                        return (
                            <div key={i} className="flex flex-col items-center flex-1 relative group">
                                <div className={\`text-[9px] font-bold mb-1.5 transition-colors \${isLast ? 'text-green-600' : 'text-gray-400'}\`}>₹{(d.amount/1000).toFixed(0)}k</div>
                                <div className={\`w-[22px] rounded-t-md transition-all duration-700 ease-out \${isLast ? 'bg-green-500 shadow-[0_-2px_10px_rgba(34,197,94,0.3)]' : 'bg-gray-100 border border-gray-200 border-b-0'}\`} style={{ height: \`\${Math.max(h, 4)}%\` }}></div>
                                <div className={\`text-[10px] mt-2.5 \${isLast ? 'font-bold text-gray-900' : 'font-medium text-gray-400'}\`}>{d.month}</div>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Expenses Category */}
            <div className="bg-white p-4.5 rounded-2xl shadow-sm border border-gray-100">
                <div className="flex justify-between items-end mb-5">
                   <h3 className="font-extrabold text-gray-800 text-[15px]">Expense Allocation</h3>
                   <div className="text-xs font-black text-gray-900 border-b border-gray-200 pb-1">₹{totalExpenses.toLocaleString()} total</div>
                </div>
                <div className="space-y-4.5 mt-2">
                    {expensesByCategory.map((exp, i) => {
                        const pct = totalExpenses > 0 ? ((exp.amount / totalExpenses) * 100).toFixed(0) : 0;
                        const colors = ["bg-red-500", "bg-yellow-500", "bg-purple-500", "bg-green-500", "bg-blue-500"];
                        const cId = i % colors.length;
                        return (
                            <div key={i}>
                                <div className="flex justify-between items-center mb-1.5">
                                    <div className="text-[11px] font-bold text-gray-700 flex items-center gap-2.5">
                                      <span className="w-6 h-6 rounded-md bg-gray-50 border border-gray-100 flex items-center justify-center text-sm">{exp.icon}</span> 
                                      <span className="uppercase tracking-wider">{exp.category}</span>
                                    </div>
                                    <div className="text-xs font-black text-gray-900">{pct}%</div>
                                </div>
                                <div className="h-1.5 w-full bg-gray-100 rounded-full overflow-hidden">
                                    <div className={\`h-full \${colors[cId]} rounded-full transition-all duration-1000 ease-out\`} style={{ width: \`\${pct}%\` }}></div>
                                </div>
                            </div>
                        );
                    })}
                    {expensesByCategory.length === 0 && <div className="text-xs font-medium text-gray-400 text-center py-6 bg-gray-50 rounded-xl border border-dashed border-gray-200">No expenses recorded</div>}
                </div>
            </div>

            {/* Recent Transactions */}
            <div className="bg-white p-4.5 rounded-2xl shadow-sm border border-gray-100 mb-6">
                <div className="flex justify-between items-center mb-4">
                    <h3 className="font-extrabold text-gray-800 text-[15px]">Recent Activity</h3>
                    <span className="text-[10px] font-bold text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-md">Last 5</span>
                </div>
                <div className="space-y-2.5">
                    {transactions.slice(0, 5).map((t, i) => (
                        <div key={i} className="flex justify-between items-center p-3 rounded-xl bg-gray-50 border border-gray-100 transition-colors">
                            <div className="flex items-center gap-3 w-[70%]">
                                <div className={\`w-9 h-9 rounded-full flex items-center justify-center font-black text-xs \${t.type === 'credit' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}\`}>
                                  {t.type === 'credit' ? 'IN' : 'OUT'}
                                </div>
                                <div className="min-w-0">
                                    <div className="text-xs font-bold text-gray-900 truncate">{t.customer}</div>
                                    <div className="text-[10px] font-medium text-gray-500 mt-1 uppercase tracking-wide">{t.time}</div>
                                </div>
                            </div>
                            <div className={\`text-sm font-black \${t.type === 'credit' ? 'text-green-600' : 'text-red-500'}\`}>
                                {t.type === 'credit' ? '+' : '-'}₹{t.amount.toLocaleString()}
                            </div>
                        </div>
                    ))}
                    {transactions.length === 0 && <div className="text-xs font-medium text-gray-400 text-center py-6 bg-gray-50 rounded-xl border border-dashed border-gray-200">No recent activity</div>}
                </div>
            </div>

        </div>
      </div>
    );
  }

  return (
    <div className="page active" id="page-dashboard" style={{ animation: "fadeIn 0.4s ease" }}>`;

if (content.includes(targetStr)) {
    content = content.replace(targetStr, mobileBlock);
    fs.writeFileSync(file, content, 'utf8');
    console.log('Mobile view logic successfully injected into AdminDashboard.jsx');
} else {
    console.error('Target string not found in AdminDashboard.jsx!');
}
