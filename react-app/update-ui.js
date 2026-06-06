import fs from 'fs';
const file = 'b:\\\\New folder (4)\\\\billing app\\\\react-app\\\\src\\\\pages\\\\OwnerDashboard.jsx';
let content = fs.readFileSync(file, 'utf8');

const isMobileStart = content.indexOf('if (isMobile) {');
const desktopStart = content.indexOf('// Web Application / Desktop Dashboard');

if (isMobileStart !== -1 && desktopStart !== -1) {
    let mobileBlock = content.substring(isMobileStart, desktopStart);

    // Completely replace the return statement inside isMobile
    const returnRegex = /return \([\s\S]*?\n    \}/;
    
    const newReturn = `return (
      <div className="w-full min-h-screen bg-gray-100 pb-20 font-sans">
        
        {/* 1. Header Fix */}
        <div className="flex justify-between items-center bg-white p-4 shadow-sm sticky top-0 z-50">
          <button><Menu size={24} className="text-gray-800" /></button>
          <h1 className="text-xl font-bold text-gray-800">Dashboard</h1>
          <div className="w-8 h-8 rounded-full bg-purple-600 text-white flex items-center justify-center font-bold">O</div>
        </div>

        <div className="px-4 py-3 space-y-6">

          {/* 2. Replace Text Links with Buttons */}
          <div className="flex gap-3 mt-4">
            <NavLink to="/branch" className="flex-1 bg-green-500 rounded-xl px-4 py-3 font-semibold text-white flex items-center justify-center gap-2 shadow-md">
              Manage Branches
            </NavLink>
            <NavLink to="/billing" className="flex-1 bg-gradient-to-r from-purple-500 to-purple-600 rounded-xl px-4 py-3 font-semibold text-white flex items-center justify-center gap-2 shadow-md">
              + New Bill
            </NavLink>
          </div>

          {/* 3. Today's Summary Section */}
          <div className="mt-6 grid grid-cols-2 gap-4">
            <div className="bg-white rounded-2xl p-4 shadow-md">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-lg">💰</span>
                <div className="text-sm text-gray-500">Total Revenue</div>
              </div>
              <div className="text-xl font-bold mt-1 text-purple-600">₹{revenue.toLocaleString()}</div>
            </div>
            
            <div className="bg-white rounded-2xl p-4 shadow-md">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-lg">🧾</span>
                <div className="text-sm text-gray-500">Bills Today</div>
              </div>
              <div className="text-xl font-bold mt-1 text-gray-800">{billsToday}</div>
            </div>
            
            <div className="bg-white rounded-2xl p-4 shadow-md">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-lg">🏪</span>
                <div className="text-sm text-gray-500">Branches</div>
              </div>
              <div className="text-xl font-bold mt-1 text-gray-800">{totalBranches} active</div>
            </div>
            
            <div className="bg-white rounded-2xl p-4 shadow-md">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-lg">⏳</span>
                <div className="text-sm text-gray-500">Pending</div>
              </div>
              <div className="text-xl font-bold mt-1 text-red-500">₹{pendingRevenue.toLocaleString()}</div>
            </div>
          </div>

          {/* 5 & 6. Branch Revenue Section & Chart Fix */}
          <div className="bg-white rounded-2xl p-4 shadow-md mt-6">
            <div className="flex justify-between items-center">
              <h2 className="text-lg font-semibold text-gray-800">Branch Revenue</h2>
              <button className="text-purple-600 bg-purple-100 px-3 py-1 rounded-full text-sm font-semibold">View All</button>
            </div>
            
            <div className="text-sm text-gray-500 mt-1">This Week Overview</div>

            <div className="mt-4 flex items-end justify-between h-40 pt-4">
              {daysW.map((day, i) => (
                <div key={i} className="flex flex-col items-center flex-1">
                  <div className="text-[10px] font-bold text-gray-400 mb-1">₹{(valuesW[i]/1000).toFixed(1)}k</div>
                  <div 
                    className={\`w-6 rounded-lg transition-all duration-300 \${i === todayIndexW ? 'bg-purple-600 shadow-md' : 'bg-gray-200'}\`} 
                    style={{ height: \`\${(valuesW[i] / maxVal) * 100}%\`, minHeight: '8px' }}
                  ></div>
                  <div className={\`text-xs mt-2 \${i === todayIndexW ? 'font-bold text-gray-800' : 'text-gray-500'}\`}>{day}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Data Table */}
          <div className="bg-white rounded-2xl p-4 shadow-md mt-6 overflow-hidden">
            <h2 className="text-lg font-semibold text-gray-800 mb-3">Top Branches</h2>
            <div className="overflow-x-auto -mx-4 px-4 pb-2" style={{ WebkitOverflowScrolling: 'touch' }}>
              <table className="w-full min-w-[400px]">
                <thead>
                  <tr className="border-b text-xs text-gray-500">
                    <th className="py-2 text-left font-medium">Branch</th>
                    <th className="py-2 text-right font-medium">Revenue</th>
                    <th className="py-2 text-right font-medium">Orders</th>
                  </tr>
                </thead>
                <tbody>
                  {branchRevenueWeb.slice(0, 3).map((b, i) => (
                    <tr key={i} className="border-b last:border-0 border-gray-50">
                      <td className="py-3">
                        <div className="font-bold text-sm text-gray-800 truncate" style={{maxWidth: '120px'}}>{b.name}</div>
                        <div className="text-xs text-gray-500">{b.city}</div>
                      </td>
                      <td className="py-3 text-right font-bold text-purple-600">₹{b.revenue.toLocaleString()}</td>
                      <td className="py-3 text-right text-sm text-gray-800">{b.orders}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

        </div>

        {/* 8. Bottom Navigation */}
        <div className="fixed bottom-0 w-full bg-white shadow-[0_-4px_10px_rgba(0,0,0,0.05)] flex justify-around py-3 z-50 rounded-t-xl">
           <NavLink to="/owner-dashboard" className="flex flex-col items-center text-purple-600">
             <Home size={20} />
             <span className="text-[10px] font-semibold mt-1">Home</span>
           </NavLink>
           <NavLink to="/invoices" className="flex flex-col items-center text-gray-400 active:text-purple-600">
             <FileText size={20} />
             <span className="text-[10px] font-semibold mt-1">Invoices</span>
           </NavLink>
           <NavLink to="/inventory" className="flex flex-col items-center text-gray-400 active:text-purple-600">
             <Package size={20} />
             <span className="text-[10px] font-semibold mt-1">Stock</span>
           </NavLink>
           <NavLink to="/settings" className="flex flex-col items-center text-gray-400 active:text-purple-600">
             <Settings size={20} />
             <span className="text-[10px] font-semibold mt-1">Settings</span>
           </NavLink>
        </div>
      </div>
    );
  }`;

    mobileBlock = mobileBlock.replace(returnRegex, newReturn);
    content = content.substring(0, isMobileStart) + mobileBlock + content.substring(desktopStart);
    
    fs.writeFileSync(file, content, 'utf8');
    console.log('Mobile UI fixed according to specifications.');
} else {
    console.log('Bounds not found');
}
