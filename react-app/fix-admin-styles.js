import fs from 'fs';
const file = 'b:\\\\New folder (4)\\\\billing app\\\\react-app\\\\src\\\\pages\\\\AdminDashboard.jsx';
let content = fs.readFileSync(file, 'utf8');

const startTarget = "<div className=\\"w-full min-h-screen bg-gray-50 pb-20 font-sans\\">";
const endTarget = "</div>\\n      </div>\\n    );\\n  }";

if (content.includes(startTarget)) {
   const startIndex = content.indexOf(startTarget);
   let endIndex = content.indexOf(endTarget, startIndex);
   
   if (startIndex !== -1 && endIndex !== -1) {
       endIndex += endTarget.length;
       
       const unstyledBlock = content.substring(startIndex, endIndex);
       
       const newStyledBlock = `<div style={{ width: '100%', minHeight: '100vh', backgroundColor: '#f9fafb', paddingBottom: '5rem', fontFamily: 'sans-serif' }}>
        
        {/* Header */}
        <div style={{ backgroundColor: '#ffffff', padding: '1rem', boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)', position: 'sticky', top: 0, zIndex: 50, display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #e5e7eb' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
               <div style={{ width: '2.25rem', height: '2.25rem', borderRadius: '0.75rem', backgroundImage: 'linear-gradient(to bottom right, #2563eb, #4338ca)', color: '#ffffff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}>
                 {userName.charAt(0).toUpperCase()}
               </div>
               <div>
                 <div style={{ fontWeight: 'bold', color: '#111827', fontSize: '1rem', lineHeight: 1.25 }}>Admin Portal</div>
                 <div style={{ fontSize: '0.625rem', color: '#6b7280', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{userBranch}</div>
               </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
               <div style={{ fontSize: '0.625rem', backgroundColor: '#dcfce7', color: '#15803d', padding: '0.25rem 0.625rem', borderRadius: '9999px', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '0.25rem', border: '1px solid #bbf7d0', boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)' }}>
                 <span style={{ width: '0.375rem', height: '0.375rem', borderRadius: '9999px', backgroundColor: '#22c55e', display: 'block', animation: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite' }}></span> LIVE
               </div>
            </div>
        </div>

        <div style={{ padding: '1rem', paddingTop: '1.25rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            {/* Top Cards Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: '0.875rem' }}>
                <div style={{ backgroundColor: '#ffffff', padding: '1rem', borderRadius: '1rem', boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)', border: '1px solid #f3f4f6', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
                       <div style={{ fontSize: '1.25rem', backgroundColor: '#eff6ff', width: '2rem', height: '2rem', borderRadius: '0.5rem', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid #dbeafe' }}>👥</div>
                       <div style={{ fontSize: '0.75rem', fontWeight: 'bold', color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Team</div>
                    </div>
                    <div>
                       <div style={{ fontSize: '1.5rem', fontWeight: 900, color: '#111827', lineHeight: 1 }}>{branchEmployees.length}</div>
                       <div style={{ fontSize: '0.625rem', color: '#6b7280', marginTop: '0.25rem', fontWeight: 500 }}>{activeEmployees} active</div>
                    </div>
                </div>

                <div style={{ backgroundColor: '#ffffff', padding: '1rem', borderRadius: '1rem', boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)', border: '1px solid #f3f4f6', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
                       <div style={{ fontSize: '1.25rem', backgroundColor: '#f0fdf4', width: '2rem', height: '2rem', borderRadius: '0.5rem', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid #dcfce7' }}>📈</div>
                       <div style={{ fontSize: '0.75rem', fontWeight: 'bold', color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Rev</div>
                    </div>
                    <div>
                       <div style={{ fontSize: '1.25rem', fontWeight: 900, color: '#16a34a', lineHeight: 1 }}>₹{(currentRevenue/1000).toFixed(1)}k</div>
                       <div style={{ fontSize: '0.625rem', color: '#6b7280', marginTop: '0.25rem', fontWeight: 500 }}>This month</div>
                    </div>
                </div>

                <div style={{ backgroundColor: '#ffffff', padding: '1rem', borderRadius: '1rem', boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)', border: '1px solid #f3f4f6', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
                       <div style={{ fontSize: '1.25rem', backgroundColor: '#fef2f2', width: '2rem', height: '2rem', borderRadius: '0.5rem', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid #fee2e2' }}>📉</div>
                       <div style={{ fontSize: '0.75rem', fontWeight: 'bold', color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Exp</div>
                    </div>
                    <div>
                       <div style={{ fontSize: '1.25rem', fontWeight: 900, color: '#ef4444', lineHeight: 1 }}>₹{(totalExpenses/1000).toFixed(1)}k</div>
                       <div style={{ fontSize: '0.625rem', color: '#6b7280', marginTop: '0.25rem', fontWeight: 500 }}>Allocated</div>
                    </div>
                </div>

                <div style={{ backgroundColor: '#ffffff', padding: '1rem', borderRadius: '1rem', boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)', border: '1px solid #f3f4f6', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
                       <div style={{ fontSize: '1.25rem', backgroundColor: '#e0e7ff', width: '2rem', height: '2rem', borderRadius: '0.5rem', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid #c7d2fe' }}>💰</div>
                       <div style={{ fontSize: '0.75rem', fontWeight: 'bold', color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Net</div>
                    </div>
                    <div>
                       <div style={{ fontSize: '1.25rem', fontWeight: 900, color: '#4f46e5', lineHeight: 1 }}>₹{((totalRevenue - totalExpenses)/1000).toFixed(1)}k</div>
                       <div style={{ fontSize: '0.625rem', color: '#6b7280', marginTop: '0.25rem', fontWeight: 500 }}>All time</div>
                    </div>
                </div>
            </div>

            {/* Revenue Trend Chart */}
            <div style={{ backgroundColor: '#ffffff', padding: '1.125rem', borderRadius: '1rem', boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)', border: '1px solid #f3f4f6' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                    <h3 style={{ fontWeight: 800, color: '#1f2937', fontSize: '0.9375rem', margin: 0 }}>Revenue Trend</h3>
                    <span style={{ fontSize: '0.625rem', fontWeight: 'bold', color: '#6b7280', backgroundColor: '#f3f4f6', padding: '0.25rem 0.625rem', borderRadius: '0.375rem', textTransform: 'uppercase', letterSpacing: '0.025em' }}>6 months</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', height: '9rem', paddingTop: '1rem', marginTop: '0.5rem' }}>
                    {revenueByMonth.map((d, i) => {
                        const h = maxRevenue > 0 ? (d.amount / maxRevenue) * 100 : 0;
                        const isLast = i === revenueByMonth.length - 1;
                        return (
                            <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 1, position: 'relative' }}>
                                <div style={{ fontSize: '0.5625rem', fontWeight: 'bold', marginBottom: '0.375rem', transition: 'color 0.3s', color: isLast ? '#16a34a' : '#9ca3af' }}>₹{(d.amount/1000).toFixed(0)}k</div>
                                <div style={{ width: '1.375rem', borderTopLeftRadius: '0.375rem', borderTopRightRadius: '0.375rem', transition: 'all 0.7s ease-out', backgroundColor: isLast ? '#22c55e' : '#f3f4f6', boxShadow: isLast ? '0 -2px 10px rgba(34,197,94,0.3)' : 'none', border: isLast ? 'none' : '1px solid #e5e7eb', borderBottom: 'none', height: \`\${Math.max(h, 4)}%\` }}></div>
                                <div style={{ fontSize: '0.625rem', marginTop: '0.625rem', fontWeight: isLast ? 'bold' : 500, color: isLast ? '#111827' : '#9ca3af' }}>{d.month}</div>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Expenses Category */}
            <div style={{ backgroundColor: '#ffffff', padding: '1.125rem', borderRadius: '1rem', boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)', border: '1px solid #f3f4f6' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '1.25rem' }}>
                   <h3 style={{ fontWeight: 800, color: '#1f2937', fontSize: '0.9375rem', margin: 0 }}>Expense Allocation</h3>
                   <div style={{ fontSize: '0.75rem', fontWeight: 900, color: '#111827', borderBottom: '1px solid #e5e7eb', paddingBottom: '0.25rem' }}>₹{totalExpenses.toLocaleString()} total</div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.125rem', marginTop: '0.5rem' }}>
                    {expensesByCategory.map((exp, i) => {
                        const pct = totalExpenses > 0 ? ((exp.amount / totalExpenses) * 100).toFixed(0) : 0;
                        const colors = ["#ef4444", "#f59e0b", "#a855f7", "#22c55e", "#3b82f6"];
                        const cId = i % colors.length;
                        return (
                            <div key={i}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.375rem' }}>
                                    <div style={{ fontSize: '0.6875rem', fontWeight: 'bold', color: '#374151', display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
                                      <span style={{ width: '1.5rem', height: '1.5rem', borderRadius: '0.375rem', backgroundColor: '#f9fafb', border: '1px solid #f3f4f6', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.875rem' }}>{exp.icon}</span> 
                                      <span style={{ textTransform: 'uppercase', letterSpacing: '0.05em' }}>{exp.category}</span>
                                    </div>
                                    <div style={{ fontSize: '0.75rem', fontWeight: 900, color: '#111827' }}>{pct}%</div>
                                </div>
                                <div style={{ height: '0.375rem', width: '100%', backgroundColor: '#f3f4f6', borderRadius: '9999px', overflow: 'hidden' }}>
                                    <div style={{ height: '100%', backgroundColor: colors[cId], borderRadius: '9999px', transition: 'width 1s ease-out', width: \`\${pct}%\` }}></div>
                                </div>
                            </div>
                        );
                    })}
                    {expensesByCategory.length === 0 && <div style={{ fontSize: '0.75rem', fontWeight: 500, color: '#9ca3af', textAlign: 'center', padding: '1.5rem 0', backgroundColor: '#f9fafb', borderRadius: '0.75rem', border: '1px dashed #e5e7eb' }}>No expenses recorded</div>}
                </div>
            </div>

            {/* Recent Transactions */}
            <div style={{ backgroundColor: '#ffffff', padding: '1.125rem', borderRadius: '1rem', boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)', border: '1px solid #f3f4f6', marginBottom: '1.5rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                    <h3 style={{ fontWeight: 800, color: '#1f2937', fontSize: '0.9375rem', margin: 0 }}>Recent Activity</h3>
                    <span style={{ fontSize: '0.625rem', fontWeight: 'bold', color: '#4f46e5', backgroundColor: '#eef2ff', padding: '0.25rem 0.625rem', borderRadius: '0.375rem' }}>Last 5</span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
                    {transactions.slice(0, 5).map((t, i) => (
                        <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.75rem', borderRadius: '0.75rem', backgroundColor: '#f9fafb', border: '1px solid #f3f4f6', transition: 'background-color 0.3s' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', width: '70%' }}>
                                <div style={{ width: '2.25rem', height: '2.25rem', borderRadius: '9999px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, fontSize: '0.75rem', backgroundColor: t.type === 'credit' ? '#dcfce7' : '#fee2e2', color: t.type === 'credit' ? '#15803d' : '#b91c1c' }}>
                                  {t.type === 'credit' ? 'IN' : 'OUT'}
                                </div>
                                <div style={{ minWidth: 0 }}>
                                    <div style={{ fontSize: '0.75rem', fontWeight: 'bold', color: '#111827', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.customer}</div>
                                    <div style={{ fontSize: '0.625rem', fontWeight: 500, color: '#6b7280', marginTop: '0.25rem', textTransform: 'uppercase', letterSpacing: '0.025em' }}>{t.time}</div>
                                </div>
                            </div>
                            <div style={{ fontSize: '0.875rem', fontWeight: 900, color: t.type === 'credit' ? '#16a34a' : '#ef4444' }}>
                                {t.type === 'credit' ? '+' : '-'}₹{t.amount.toLocaleString()}
                            </div>
                        </div>
                    ))}
                    {transactions.length === 0 && <div style={{ fontSize: '0.75rem', fontWeight: 500, color: '#9ca3af', textAlign: 'center', padding: '1.5rem 0', backgroundColor: '#f9fafb', borderRadius: '0.75rem', border: '1px dashed #e5e7eb' }}>No recent activity</div>}
                </div>
            </div>

        </div>
      </div>
    );
  }`;
       
       content = content.substring(0, startIndex) + newStyledBlock + content.substring(endIndex);
       fs.writeFileSync(file, content, 'utf8');
       console.log("Inline styling applied successfully!");
   } else {
       console.error("End target not found!");
   }
} else {
   console.error("Start target not found!");
}
