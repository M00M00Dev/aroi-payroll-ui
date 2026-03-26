// Version: 260326-REPORT-UI
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Save, Lock, Unlock, Loader2, EyeOff, ChevronLeft, ChevronRight, Activity, Calendar, Target, FileText, X, Download, CheckCircle2 } from 'lucide-react';

const App = () => {
  const APP_VERSION = "260326-REPORT";
  const API_URL = import.meta.env.VITE_API_URL || "https://aroi-payroll-backend.onrender.com";

  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showReport, setShowReport] = useState(false);
  const [startDate, setStartDate] = useState('2026-03-09'); 
  const [isSyncing, setIsSyncing] = useState(false);
  const [hiddenStaff, setHiddenStaff] = useState(new Set());
  const [paidStaff, setPaidStaff] = useState(new Set());

  const getCurrentAroiMonday = () => {
    const now = new Date();
    const day = now.getDay();
    const diff = now.getDate() - day + (day === 0 ? -6 : 1);
    const monday = new Date(now.setDate(diff));
    return monday.toISOString().split('T')[0];
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${API_URL}/api/payroll-data?start=${startDate}`);
      const result = await response.json();
      const normalizedData = Array.isArray(result) ? result.map(emp => ({
        ...emp,
        approved: localStorage.getItem(`approved_${emp.id}`) === 'true'
      })) : [];
      setData(normalizedData);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchData(); }, [startDate]);

  const shiftDate = useCallback((days) => {
    setStartDate(current => {
      const [y, m, d] = current.split('-').map(Number);
      const dt = new Date(y, m - 1, d + days);
      return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`;
    });
  }, []);

  const calculateBreakdown = (emp) => {
    if (!emp?.daily) return { weekday: 0, weekend: 0, total: 0 };
    const wkday = emp.daily.reduce((acc, d, i) => (i % 7 < 5) ? acc + (Number(d.r) || 0) : acc, 0);
    const wkend = emp.daily.reduce((acc, d, i) => (i % 7 >= 5) ? acc + (Number(d.r) || 0) : acc, 0);
    return { weekday: wkday, weekend: wkend, total: wkday + wkend };
  };

  const allDates = useMemo(() => {
    const parts = startDate.split('-').map(Number);
    return Array.from({ length: 14 }).map((_, i) => new Date(parts[0], parts[1] - 1, parts[2] + i).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }));
  }, [startDate]);

  // --- REPORT COMPONENT ---
  const ReportOverlay = () => {
    if (!showReport) return null;

    const shops = ["Maruay Thai", "PAD Thai Food"];
    
    const downloadABA = (shopName) => {
      const tfnStaff = data.filter(e => e.shop === shopName && e.pay_type?.toUpperCase() === 'TFN');
      alert(`Generating ABA for ${tfnStaff.length} TFN staff at ${shopName}`);
    };

    return (
      <div className="fixed inset-0 z-[500] bg-white overflow-y-auto font-sans text-slate-900 p-8">
        <div className="max-w-6xl mx-auto">
          <div className="flex justify-between items-center border-b-2 border-slate-900 pb-6 mb-8">
            <div>
              <h1 className="text-3xl font-black uppercase tracking-tighter">Payment Manifest</h1>
              <p className="text-slate-500 font-bold uppercase text-[10px] tracking-widest">{allDates[0]} - {allDates[13]}</p>
            </div>
            <button onClick={() => setShowReport(false)} className="bg-slate-900 text-white p-3 rounded-2xl hover:bg-slate-800 transition-all shadow-xl"><X size={24}/></button>
          </div>

          {shops.map(shop => (
            <div key={shop} className="mb-16">
              <div className="flex justify-between items-end mb-6">
                <h2 className="text-2xl font-black uppercase text-slate-800 flex items-center gap-3">
                  <div className="w-2 h-8 bg-emerald-500 rounded-full"/> {shop}
                </h2>
                <button onClick={() => downloadABA(shop)} className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-xl font-black uppercase text-[10px] hover:bg-blue-700 shadow-lg transition-all active:scale-95">
                  <Download size={16}/> Download ABA (TFN ONLY)
                </button>
              </div>

              <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-sm">
                <table className="w-full text-left border-collapse">
                  <thead className="bg-slate-50 text-[10px] uppercase font-black text-slate-400 border-b border-slate-100">
                    <tr>
                      <th className="p-4 w-16 text-center">Paid</th>
                      <th className="p-4">Staff Member</th>
                      <th className="p-4">Pay Type</th>
                      <th className="p-4 text-right">Hrs (Wkdy / Wkend)</th>
                      <th className="p-4 text-right">Val (Wkdy / Wkend)</th>
                      <th className="p-4 text-right">Extra/Cash</th>
                      <th className="p-4 text-right bg-slate-100 text-slate-900">Total Payment</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {data.filter(e => e.shop === shop).map(emp => {
                      const b = calculateBreakdown(emp);
                      const wkday$ = b.weekday * (emp.rate_weekday || 0);
                      const wkend$ = b.weekend * (emp.rate_weekend || 0);
                      const extra$ = (emp.extra[0] || 0) + (emp.extra[1] || 0);
                      const total$ = wkday$ + wkend$ + extra$;

                      return (
                        <tr key={emp.id} className={`hover:bg-slate-50/50 transition-colors ${paidStaff.has(emp.id) ? 'bg-emerald-50/30' : ''}`}>
                          <td className="p-4 text-center">
                            <button 
                                onClick={() => setPaidStaff(prev => {
                                    const next = new Set(prev);
                                    next.has(emp.id) ? next.delete(emp.id) : next.add(emp.id);
                                    return next;
                                })}
                                className={`p-1.5 rounded-lg transition-all ${paidStaff.has(emp.id) ? 'text-emerald-600 bg-emerald-100' : 'text-slate-200 bg-slate-50 border border-slate-100'}`}
                            >
                                <CheckCircle2 size={18} />
                            </button>
                          </td>
                          <td className="p-4 font-black uppercase text-slate-700 text-[12px]">{emp.name}</td>
                          <td className="p-4"><span className="px-2 py-1 bg-slate-100 rounded-md font-bold text-[9px] text-slate-500 uppercase">{emp.pay_type}</span></td>
                          <td className="p-4 text-right font-mono text-slate-500">{b.weekday.toFixed(1)} <span className="text-slate-200 mx-1">/</span> {b.weekend.toFixed(1)}</td>
                          <td className="p-4 text-right font-mono text-slate-500">${wkday$.toFixed(2)} <span className="text-slate-200 mx-1">/</span> ${wkend$.toFixed(2)}</td>
                          <td className="p-4 text-right font-mono font-bold text-orange-600">${extra$.toFixed(2)}</td>
                          <td className="p-4 text-right font-black text-slate-900 text-sm bg-slate-50/50">${total$.toFixed(2)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-[#F1F5F9] p-4 font-sans antialiased text-[11px]">
      <div className="max-w-[1900px] mx-auto">
        <div className="flex justify-between items-center mb-4 bg-white p-3 rounded-2xl shadow-sm border border-slate-200">
          <div className="flex items-center gap-4">
            <div className="bg-slate-900 p-2.5 rounded-xl text-white"><Activity size={18} /></div>
            <div>
              <h1 className="text-sm font-black tracking-tighter text-slate-900 leading-none uppercase">Aroi Payroll</h1>
              <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-1 block">{APP_VERSION}</span>
            </div>
            <div className="h-8 w-[1px] bg-slate-200 mx-2" />
            <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200">
              <button onClick={() => shiftDate(-14)} className="p-1.5 hover:bg-white rounded-lg transition-all"><ChevronLeft size={16}/></button>
              <div className="px-4 py-1 font-black text-slate-700 min-w-[140px] text-center flex items-center gap-2">
                <Calendar size={12} className="text-emerald-500" /> {allDates[0]} - {allDates[13]}
              </div>
              <button onClick={() => shiftDate(14)} className="p-1.5 hover:bg-white rounded-lg transition-all"><ChevronRight size={16}/></button>
            </div>
            <button 
              onClick={() => setShowReport(true)} 
              className="flex items-center gap-2 px-5 py-2.5 bg-white border border-slate-200 rounded-xl font-black uppercase text-[10px] hover:bg-slate-50 transition-all text-slate-700 shadow-sm"
            >
              <FileText size={14} className="text-indigo-500" />
              <span>Report</span>
            </button>
          </div>

          <button onClick={async () => {
            setIsSyncing(true);
            try {
              const res = await fetch(`${API_URL}/api/sync`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ data, startDate }) });
            } finally { setIsSyncing(false); fetchData(); }
          }} disabled={isSyncing} className={`flex items-center gap-2 px-8 py-2.5 rounded-xl font-black uppercase transition-all shadow-md ${isSyncing ? 'bg-slate-100 text-slate-300' : 'bg-emerald-600 text-white hover:bg-emerald-700 active:scale-95'}`}>
            {isSyncing ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />} <span>{isSyncing ? 'Syncing...' : 'Save Sync'}</span>
          </button>
        </div>

        {/* --- GRID RENDERING REMAINS IDENTICAL TO STABLE BACKUP --- */}
        {/* ... Paste your stable table rendering code here ... */}
        
        <ReportOverlay />
      </div>
    </div>
  );
};

export default App;