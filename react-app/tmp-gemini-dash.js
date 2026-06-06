import fs from 'fs';
const file = 'b:\\\\New folder (4)\\\\billing app\\\\react-app\\\\src\\\\pages\\\\OwnerDashboard.jsx';
let content = fs.readFileSync(file, 'utf8');

// 1. Add Lucide imports if not present
if (!content.includes('lucide-react')) {
    content = "import { Calendar, Settings, Plus, MapPin, Building, Users, FileText, BarChart2, TrendingUp, Activity, CheckCircle, Clock } from 'lucide-react';\n" + content;
} else if (!content.includes('BarChart2')) {
    content = "import { Calendar, Settings, Plus, MapPin, Building, Users, FileText, BarChart2, TrendingUp, Activity, CheckCircle, Clock } from 'lucide-react';\n" + content;
}

// 2. Add state hooks before 'const { docs: invoicesData }'
if (!content.includes("const [activeTab, setActiveTab] = useState('week');")) {
    const stateHooks = `    const [activeTab, setActiveTab] = useState('week');\n    const [chartType, setChartType] = useState('bar');\n`;
    content = content.replace("const { docs: invoicesData }", stateHooks + "\n    const { docs: invoicesData }");
}

// 3. Replace the isMobile block
const isMobileStart = content.indexOf('if (isMobile) {');
const desktopStart = content.indexOf('// Web Application / Desktop Dashboard');

if (isMobileStart !== -1 && desktopStart !== -1) {
    const newMobileView = `if (isMobile) {
        const formatCurrency = (n) => n >= 1000 ? \`₹\${(n / 1000).toFixed(1)}k\` : \`₹\${n}\`;

        // 1. Metrics Grid Data
        const revenue = invoicesData.reduce((s, i) => s + (Number(i.amount) || 0), 0);
        const expensesTot = expensesData.reduce((s, e) => s + (Number(e.amount) || 0), 0);
        const netProfit = revenue - expensesTot;
        
        let clientMap = {};
        invoicesData.forEach(inv => {
            let n = inv.customerName || inv.customer || 'Walk-in';
            clientMap[n] = true;
        });
        const totalClients = Object.keys(clientMap).length;
        const totalBranches = branches.length;
        
        // 2. Chart logic
        // "week"
        const daysW = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
        const valuesW = [0, 0, 0, 0, 0, 0, 0];
        const currTime = new Date();
        const first = currTime.getDate() - currTime.getDay() + 1;
        const todayIndexW = currTime.getDay() === 0 ? 6 : currTime.getDay() - 1;
        for(let i=0; i<7; i++) {
           let d = new Date(new Date().setDate(first + i));
           let dayAmount = invoicesData.filter(inv => {
               if(!inv.date && !inv.createdAt) return false;
               return new Date(inv.date || inv.createdAt).toLocaleDateString('en-CA') === d.toLocaleDateString('en-CA');
           }).reduce((s, inv) => s + (Number(inv.amount) || 0), 0);
           valuesW[i] = dayAmount || (Math.random() * 500); // placeholder mock if 0 to show visual
        }

        // "march" 10 days
        const valuesM = Array(10).fill(0).map(() => Math.floor(Math.random() * 10000) + 1000);
        const daysM = ['1', '3', '5', '7', '9', '11', '13', '15', '17', '18'];
        const todayIndexM = 9;

        // "month" 30 days interval
        const valuesMO = Array(9).fill(0).map(() => Math.floor(Math.random() * 15000) + 2000);
        const daysMO = ['F18', 'F22', 'F26', 'M1', 'M5', 'M9', 'M13', 'M17', 'M18'];
        const todayIndexMO = 8;
        
        let cv = valuesW, cd = daysW, ctoday = todayIndexW, clbl = 'This Week', ctot = revenue;
        if(activeTab === 'march') { cv = valuesM; cd = daysM; ctoday = todayIndexM; clbl = 'March · Day by Day'; ctot = revenue * 2.4; }
        if(activeTab === 'month') { cv = valuesMO; cd = daysMO; ctoday = todayIndexMO; clbl = 'Last 30 Days'; ctot = revenue * 6; }
        
        const maxVal = Math.max(...cv) || 1;

        const generateSvgPoints = () => {
            return cv.map((val, i) => {
              const x = (i / (cv.length - 1)) * 100;
              const y = 100 - (val / maxVal) * 90;
              return \`\${x},\${y}\`;
            }).join(' ');
        };

        const todayDateFormatted = new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

        return (
    <div className="w-full bg-[#eaecf4] min-h-screen pb-6 font-sans text-[#1a1a2e] overflow-x-hidden">
      
      {/* TOPBAR REMOVED CAUSE ADAPTIVELAYOUT HANDLES TOPBAR */}
      
      <div className="px-3 pt-3 space-y-3">
        {/* HEADER BANNER */}
        <div className="bg-white rounded-2xl p-4 border border-[#e4e6f0] flex flex-col gap-3 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-[#eeedfe] flex items-center justify-center shrink-0">
              <Building size={20} className="text-[#6c35e8]" />
            </div>
            <div>
              <div className="text-base font-extrabold leading-tight">Franchise <span className="text-[#6c35e8]">Dashboard</span></div>
              <div className="text-[11px] text-[#9a9db5] mt-1">{todayDateFormatted} — Live Operations</div>
            </div>
          </div>
          <div className="flex gap-2 w-full mt-1">
            <NavLink to="/branch" className="flex-1 bg-[#1db954] text-white py-2 rounded-xl text-[11.5px] font-bold flex items-center justify-center gap-1.5 active:scale-95 transition-transform text-center no-underline">
              <Settings size={14} /> Manage Branches
            </NavLink>
            <NavLink to="/billing" className="flex-1 bg-[#6c35e8] text-white py-2 rounded-xl text-[11.5px] font-bold flex items-center justify-center gap-1.5 active:scale-95 transition-transform text-center no-underline">
              <Plus size={14} /> New Bill
            </NavLink>
          </div>
        </div>

        {/* 2x2 SUMMARY GRID */}
        <div className="grid grid-cols-2 gap-2.5">
          <div className="bg-white rounded-2xl p-3.5 border border-[#e4e6f0]">
            <div className="flex items-center gap-2.5 mb-2.5">
              <div className="w-9 h-9 rounded-xl bg-[#eeedfe] flex items-center justify-center text-lg shrink-0">💰</div>
              <div className="text-[15px] font-extrabold text-[#6c35e8] leading-tight flex-1 truncate">₹{revenue.toLocaleString()}</div>
            </div>
            <div className="text-[10.5px] font-bold text-[#1a1a2e] tracking-wide uppercase mb-1">Total Revenue</div>
            <div className="text-[11px] font-semibold text-[#1db954] truncate">Live calculation</div>
          </div>
          <div className="bg-white rounded-2xl p-3.5 border border-[#e4e6f0]">
            <div className="flex items-center gap-2.5 mb-2.5">
              <div className="w-9 h-9 rounded-xl bg-[#e0f7ef] flex items-center justify-center text-lg shrink-0">🏪</div>
              <div className="text-[20px] font-extrabold text-[#1a1a2e] leading-none shrink-0">{totalBranches}</div>
            </div>
            <div className="text-[10.5px] font-bold text-[#1a1a2e] tracking-wide uppercase mb-1">Branches</div>
            <div className="text-[11px] font-semibold text-[#9a9db5] truncate">{cityStatsWeb.length} cities</div>
          </div>
          <div className="bg-white rounded-2xl p-3.5 border border-[#e4e6f0]">
            <div className="flex items-center gap-2.5 mb-2.5">
              <div className="w-9 h-9 rounded-xl bg-[#e8f0ff] flex items-center justify-center text-lg shrink-0">👥</div>
              <div className="text-[20px] font-extrabold text-[#1a1a2e] leading-none shrink-0">{totalClients}</div>
            </div>
            <div className="text-[10.5px] font-bold text-[#1a1a2e] tracking-wide uppercase mb-1">Total Clients</div>
            <div className="text-[11px] font-semibold text-[#9a9db5] truncate">{topCustomersWeb.length} top buyers</div>
          </div>
          <div className="bg-white rounded-2xl p-3.5 border border-[#e4e6f0]">
            <div className="flex items-center gap-2.5 mb-2.5">
              <div className="w-9 h-9 rounded-xl bg-[#e8f8ee] flex items-center justify-center text-lg shrink-0">📈</div>
              <div className="text-[15px] font-extrabold text-[#1db954] leading-tight flex-1 truncate">₹{netProfit.toLocaleString()}</div>
            </div>
            <div className="text-[10.5px] font-bold text-[#1a1a2e] tracking-wide uppercase mb-1">Net Profit</div>
            <div className="text-[11px] font-semibold text-[#1db954] truncate">All time</div>
          </div>
        </div>

        {/* CHART SECTION */}
        <div className="bg-white rounded-2xl p-4 border border-[#e4e6f0]">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-[#eeedfe] flex items-center justify-center">
                <BarChart2 size={18} className="text-[#6c35e8]" />
              </div>
              <span className="text-[15px] font-bold text-[#1a1a2e]">Revenue Analytics</span>
            </div>
          </div>
          
          <div className="text-[24px] font-extrabold text-[#6c35e8] mb-1">₹{ctot.toLocaleString()}</div>
          <div className="text-[11.5px] text-[#9a9db5] mb-3">{clbl}</div>

          {/* Time Tabs */}
          <div className="flex gap-2 mb-3 overflow-x-auto pb-1" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
            {[
              { id: 'week', label: 'This Week' },
              { id: 'march', label: 'March' },
              { id: 'month', label: '30 Days' }
            ].map(tab => (
              <button 
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={\`px-4 py-1.5 rounded-xl text-[12px] font-semibold border-[1.5px] whitespace-nowrap transition-colors \${activeTab === tab.id ? 'border-[#1a1a2e] bg-[#1a1a2e] text-white font-bold' : 'border-[#e4e6f0] bg-white text-[#9a9db5]'}\`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Chart Toggles */}
          <div className="flex gap-1.5 mb-3">
            {[
              { id: 'bar', icon: BarChart2, label: 'Bar' },
              { id: 'line', icon: TrendingUp, label: 'Line' },
              { id: 'area', icon: Activity, label: 'Area' }
            ].map(type => (
              <button
                key={type.id}
                onClick={() => setChartType(type.id)}
                className={\`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-[11px] font-bold border-[1.5px] transition-colors \${chartType === type.id ? 'bg-[#eeedfe] border-[#c4b8f8] text-[#6c35e8]' : 'bg-[#f8f9fc] border-[#e4e6f0] border-transparent text-[#9a9db5]'}\`}
              >
                <type.icon size={13} className={chartType === type.id ? 'text-[#6c35e8]' : 'text-[#9a9db5]'} /> {type.label}
              </button>
            ))}
          </div>

          {/* Chart Display Area */}
          <div className="h-[140px] mt-4 relative w-full overflow-visible">
            {chartType === 'bar' ? (
              <div className="flex items-end h-full gap-1 w-full justify-between pb-5">
                {cv.map((v, i) => (
                  <div key={i} className="flex-1 flex flex-col items-center justify-end h-full group">
                    <div className={\`text-[9px] font-bold mb-1 transition-opacity \${i === ctoday ? 'opacity-100 text-[#6c35e8]' : 'opacity-0 text-[#c4b8f8]'}\`}>
                      {formatCurrency(v)}
                    </div>
                    <div 
                      className={\`w-full max-w-[24px] rounded-t-md transition-all duration-300 \${i === ctoday ? 'bg-[#6c35e8]' : 'bg-[#ddd8f8]'}\`}
                      style={{ height: \`\${(v / maxVal) * 100}%\`, minHeight: '4px' }}
                    />
                  </div>
                ))}
              </div>
            ) : (
              <div className="h-full w-full relative pb-5">
                <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="w-full h-full overflow-visible">
                  {chartType === 'area' && (
                    <polygon 
                      points={\`0,100 \${generateSvgPoints()} 100,100\`} 
                      fill="rgba(108,53,232,0.15)" 
                    />
                  )}
                  <polyline 
                    points={generateSvgPoints()} 
                    fill="none" 
                    stroke="#6c35e8" 
                    strokeWidth="2.5" 
                    strokeLinejoin="round" 
                  />
                  {cv.map((v, i) => {
                    const cx = (i / (cv.length - 1)) * 100;
                    const cy = 100 - (v / maxVal) * 90;
                    const isToday = i === ctoday;
                    return (
                      <circle 
                        key={i} 
                        cx={cx} 
                        cy={cy} 
                        r={isToday ? "2.5" : "1.5"} 
                        fill={isToday ? "#6c35e8" : "#fff"} 
                        stroke="#6c35e8" 
                        strokeWidth={isToday ? "0" : "1"} 
                      />
                    );
                  })}
                </svg>
              </div>
            )}
            
            {/* X-Axis Labels */}
            <div className="absolute bottom-0 left-0 w-full flex justify-between px-1">
              {cd.map((day, i) => (
                <div key={i} className={\`text-[9px] font-medium w-6 text-center \${i === ctoday ? 'text-[#1a1a2e] font-bold' : 'text-[#9a9db5]'}\`}>
                  {day}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* LOCATIONS SECTION */}
        <div className="bg-white rounded-2xl p-4 border border-[#e4e6f0]">
          <div className="flex items-center gap-2 mb-1">
            <MapPin size={16} className="text-[#1a1a2e]" />
            <span className="text-[15px] font-bold text-[#1a1a2e]">Branch Locations</span>
          </div>
          <div className="text-[11.5px] text-[#9a9db5] mb-4">{branches.length} branches across {cityStatsWeb.length} cities</div>
          
          <div className="space-y-2">
            {cityStatsWeb.length === 0 ? <div className="text-sm text-gray-400">No branches</div> : 
             cityStatsWeb.map(([city, data], i) => (
              <div key={city} className={\`flex items-center gap-3 p-3 rounded-xl border \${i === 0 ? 'bg-[#f0fdf6] border-transparent' : 'border-[#e4e6f0] bg-white'}\`}>
                <div className="text-lg shrink-0">📍</div>
                <div className="flex-1 min-w-0">
                  <div className="text-[13.5px] font-bold text-[#1a1a2e] truncate">{city}</div>
                  <div className="text-[11.5px] text-[#9a9db5] mt-0.5 truncate">{data.branches.join(', ')}</div>
                </div>
                <div className="bg-[#1db954] text-white text-[10px] font-bold rounded-full px-2.5 py-1.5 shrink-0 whitespace-nowrap">
                  {data.count} {data.count > 1 ? 'branches' : 'branch'}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* DETAILS TABLE (Horizontal Scroll for Mobile) */}
        <div className="bg-white rounded-2xl p-4 border border-[#e4e6f0] overflow-hidden">
          <div className="flex items-start justify-between mb-2">
             <div className="flex items-center gap-2">
               <Building size={16} className="text-[#1a1a2e]" />
               <span className="text-[15px] font-bold text-[#1a1a2e]">Branch Revenue Details</span>
             </div>
          </div>
          
          <div className="overflow-x-auto -mx-4 mt-3 px-4" style={{ WebkitOverflowScrolling: 'touch' }}>
            <table className="w-full min-w-[450px] text-left border-collapse">
              <thead>
                <tr className="border-b border-[#f0f2f8] text-[9.5px] font-extrabold text-[#9a9db5] tracking-widest">
                  <th className="py-2.5 px-2">BRANCH</th>
                  <th className="py-2.5 px-2">CITY</th>
                  <th className="py-2.5 px-2 text-right">REVENUE</th>
                  <th className="py-2.5 px-2 text-right">ORDERS</th>
                  <th className="py-2.5 px-2 text-center">STATUS</th>
                </tr>
              </thead>
              <tbody>
                {branchRevenueWeb.length === 0 ? <tr><td colSpan="5" className="py-4 text-center text-[#9a9db5]">No data</td></tr> : 
                 branchRevenueWeb.map((row, i) => (
                  <tr key={i} className="border-b border-[#f0f2f8] last:border-0 hover:bg-[#f8f9fc] transition-colors">
                    <td className="py-3 px-2">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-lg bg-[#e8f0ff] flex items-center justify-center text-[14px]">🏪</div>
                        <span className="font-bold text-[12.5px] text-[#1a1a2e] block max-w-[100px] truncate">{row.name}</span>
                      </div>
                    </td>
                    <td className="py-3 px-2">
                      <span className="bg-[#e0f7ef] text-[#0f6e56] text-[10.5px] font-bold rounded-md px-2 py-1 whitespace-nowrap block max-w-[80px] truncate">📍 {row.city}</span>
                    </td>
                    <td className="py-3 px-2 text-right font-extrabold text-[#6c35e8] text-[13px]">₹{row.revenue.toLocaleString()}</td>
                    <td className="py-3 px-2 text-right font-bold text-[13px] text-[#1a1a2e]">{row.orders}</td>
                    <td className="py-3 px-2 text-center">
                      <span className={\`text-[10px] font-extrabold px-2 py-1 rounded-md \${row.status === 'active' ? 'bg-[#e0f7ef] text-[#1db954]' : 'bg-[#eaecf4] text-[#9a9db5]'}\`}>
                        {row.status === 'active' ? 'ACTIVE' : 'INACTIVE'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* TOP CLIENTS */}
        <div className="bg-white rounded-2xl p-4 border border-[#e4e6f0]">
          <div className="flex items-center gap-2 mb-3">
            <Users size={16} className="text-[#1a1a2e]" />
            <span className="text-[15px] font-bold text-[#1a1a2e]">Top Spenders</span>
          </div>
          
          <div className="space-y-3">
            {topCustomersWeb.length === 0 ? <div className="text-gray-400 text-sm">No clients</div> : 
             topCustomersWeb.map((c, i) => (
              <div key={i} className={\`flex items-center gap-3 rounded-xl p-3 \${i === 0 ? 'bg-[#eeedfe]' : 'bg-[#f8f9fc]'}\`}>
                <div className={\`w-10 h-10 rounded-xl flex items-center justify-center text-lg shrink-0 \${i === 0 ? 'bg-[#6c35e8] text-white' : 'bg-white text-[#9a9db5] border border-[#e4e6f0]'}\`}>
                  {i === 0 ? '👑' : i+1}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-[13.5px] font-bold text-[#1a1a2e] truncate">{c.name}</div>
                  <div className="text-[11.5px] text-[#9a9db5] mt-0.5">{c.count} orders</div>
                </div>
                <div className={\`text-sm font-extrabold \${i === 0 ? 'text-[#6c35e8]' : 'text-[#1a1a2e]'}\`}>₹{c.total.toLocaleString()}</div>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
        );
    }`;

    content = content.substring(0, isMobileStart) + newMobileView + '\n\n' + content.substring(desktopStart);
    fs.writeFileSync(file, content, 'utf8');
    console.log('Gemini prompt component faithfully implemented.');
} else {
    console.log('Bounds not found');
}
