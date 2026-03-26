// Version: 260327-ID-STABLE-UI
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Save, Lock, Unlock, Loader2, EyeOff, ChevronLeft, ChevronRight, Activity, Calendar, Target, FileText, X, Download, CheckCircle2 } from 'lucide-react';

const App = () => {
  const APP_VERSION = "260327-STABLE";
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
    } catch (err) { console.error("Fetch Error:", err); }
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

  const ReportOverlay = () => {
    if (!showReport) return null;
    const shops = ["Maruay Thai", "PAD Thai Food", "Other"];
    
    return (
      <div className="fixed inset-0 z-[500] bg-white overflow-y-auto font-sans text-slate-900 p-8">
        <div className="max-w-6xl mx-auto">
          <div className="flex justify-between items-center border-b-2 border-slate-900 pb-6 mb-8">
            <div>
              <h1 className="text-3xl font-black uppercase tracking-tighter">Finance Manifest</h1>
              <p className="text-slate-500 font-bold uppercase text-[10px] tracking-widest">{allDates[0]} - {allDates[13]}</p>
            </div>
            <button onClick={() => setShowReport(false)} className="bg-slate-900 text-white p-3 rounded-2xl hover:bg-slate-800 shadow-xl transition-all active:scale-95"><X size={24}/></button>
          </div>

          {shops.map(shop => {
            const filtered = data.filter(e => {
                const s = e.shop?.trim();
                if (shop === "Other") return !s || (s !== "Maruay Thai" && s !== "PAD Thai Food");
                return s === shop;
            });
            if (filtered.length === 0 && shop === "Other") return null;

            return (
              <div key={shop} className="mb-16">
                <div className="flex justify-between items-end mb-6">
                  <h2 className="text-2xl font-black uppercase text-slate-800 flex items-center gap-3">
                    <div className={`w-2 h-8 ${shop === 'Other' ? 'bg-orange-400' : 'bg-emerald-500'} rounded-full`}/> {shop}
                  </h2>
                </div>

                <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-sm">
                  <table className="w-full text-left border-collapse">
                    <thead className="bg-slate-50 text-[10px] uppercase font-black text-slate-400 border-b border-slate-100">
                      <tr>
                        <th className="p-4 w-16 text-center">Paid</th>
                        <th className="p-4">Staff Member</th>
                        <th className="p-4 text-right">Hrs (Wkdy/Wkend)</th>
                        <th className="p-4 text-right bg-slate-100 text-slate-900 font-black">Total Payment</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {filtered.map(emp => {
                        const b = calculateBreakdown(emp);
                        const total$ = (b.weekday * (emp.rate_weekday || 0)) + (b.weekend * (emp.rate_weekend || 0)) + ((emp.extra?.[0] || 0) + (emp.extra?.[1] || 0));
                        return (
                          <tr key={emp.id} className={`hover:bg-slate-50/50 ${paidStaff.has(emp.id) ? 'bg-emerald-50/30' : ''}`}>
                            <td className="p-4 text-center">
                              <button onClick={() => setPaidStaff(prev => { const n = new Set(prev); n.has(emp.id) ? n.delete(emp.id) : n.add(emp.id); return n; })}
                                  className={`p-1.5 rounded-lg ${paidStaff.has(emp.id) ? 'text-emerald-600 bg-emerald-100' : 'text-slate-200 bg-slate-50'}`}><CheckCircle2 size={18} /></button>
                            </td>
                            <td className="p-4 font-black uppercase text-slate-700 text-[12px]">{emp.name}</td>
                            <td className="p-4 text-right font-mono text-slate-500">{b.weekday.toFixed(1)} / {b.weekend.toFixed(1)}</td>
                            <td className="p-4 text-right font-black text-slate-900 text-sm bg-slate-50/50">${total$.toFixed(2)}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            );
          })}
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
              <h1 className="text-sm font-black text-slate-900 uppercase">Aroi Payroll</h1>
              <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block">{APP_VERSION}</span>
            </div>
            <div className="h-8 w-[1px] bg-slate-200 mx-2" />
            <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
              <button onClick={() => shiftDate(-14)} className="p-1.5 hover:bg-white rounded-lg"><ChevronLeft size={16}/></button>
              <div className="px-4 py-1 font-black text-slate-700 min-w-[140px] text-center">{allDates[0]} - {allDates[13]}</div>
              <button onClick={() => shiftDate(14)} className="p-1.5 hover:bg-white rounded-lg"><ChevronRight size={16}/></button>
            </div>
            <button onClick={() => setStartDate(getCurrentAroiMonday())} className="px-4 py-2 bg-white border border-slate-200 rounded-xl font-black uppercase text-[9px] hover:bg-slate-50 transition-all text-slate-600 shadow-sm"><Target size={14} className="inline mr-2 text-blue-500" /> Today</button>
            <button onClick={() => setShowReport(true)} className="px-5 py-2.5 bg-indigo-600 text-white rounded-xl font-black uppercase text-[10px] hover:bg-indigo-700 shadow-lg flex items-center gap-2">
              <FileText size={14} /> Finance Report
            </button>
          </div>

          <button onClick={async () => {
            setIsSyncing(true);
            try { await fetch(`${API_URL}/api/sync`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ data, startDate }) }); }
            finally { setIsSyncing(false); fetchData(); }
          }} disabled={isSyncing} className={`flex items-center gap-2 px-8 py-2.5 rounded-xl font-black uppercase transition-all shadow-md ${isSyncing ? 'bg-slate-100 text-slate-300' : 'bg-emerald-600 text-white hover:bg-emerald-700 active:scale-95'}`}>
            {isSyncing ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />} {isSyncing ? 'Syncing...' : 'Save Sync'}
          </button>
        </div>

        <div className="bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden relative">
          {loading && (
            <div className="absolute inset-0 z-[100] bg-white/60 backdrop-blur-[2px] flex items-center justify-center">
              <Loader2 className="animate-spin text-emerald-600" size={24} />
            </div>
          )}

          <div className="overflow-x-auto max-h-[calc(100vh-160px)]">
            <table className="w-full text-left border-collapse table-fixed min-w-[1800px]">
              <thead className="sticky top-0 z-40 bg-slate-900 text-[10px] uppercase font-bold text-white">
                <tr className="divide-x divide-slate-800">
                  <th className="w-52 p-4 sticky left-0 z-50 bg-slate-950 shadow-xl">Team Member</th>
                  {Array.from({ length: 14 }).map((_, i) => (
                    <React.Fragment key={i}>
                      <th className={`w-[62px] p-2 text-center ${i % 7 >= 5 ? 'bg-orange-900/20 text-orange-400' : ''}`}>
                        <div className="text-[8px] opacity-40 mb-0.5">{allDates[i]}</div>
                        {['Mon','Tue','Wed','Thu','Fri','Sat','Sun'][i % 7]}
                      </th>
                      {(i === 6 || i === 13) && <th className="w-20 p-2 text-center bg-emerald-950/50 text-emerald-400">Extra $</th>}
                    </React.Fragment>
                  ))}
                  <th className="w-20 p-2 text-center bg-slate-950 text-slate-400">Wkday</th>
                  <th className="w-20 p-2 text-center bg-slate-950 text-orange-400">Wkend</th>
                  <th className="w-24 p-2 text-center bg-emerald-700 text-white">Total</th>
                  <th className="w-24 p-2 text-center bg-slate-950">Lock</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {data.map((emp) => {
                  const b = calculateBreakdown(emp);
                  return (
                    <tr key={emp.id} className="hover:bg-slate-50 transition-colors">
                      <td className="p-3 sticky left-0 z-20 bg-white border-r border-slate-200 font-bold uppercase text-slate-700">{emp.name}</td>
                      {emp.daily?.map((day, idx) => (
                        <React.Fragment key={idx}>
                          <td className="p-1">
                            <div className="p-1 rounded-lg border border-transparent text-center">
                              <span className="text-[8px] font-bold text-emerald-500 block">{day.s > 0 ? day.s.toFixed(1) : '—'}</span>
                              <input type="number" value={day.r || ''} onChange={(e) => {
                                const val = e.target.value === '' ? 0 : parseFloat(e.target.value);
                                setData(p => p.map(ev => ev.id === emp.id ? {...ev, daily: ev.daily.map((d, i) => i === idx ? {...d, r: val} : d)} : ev));
                              }} className="w-full text-center text-[11px] font-black bg-white border border-slate-200 rounded" />
                            </div>
                          </td>
                          {(idx === 6 || idx === 13) && <td className="p-2"><input type="number" value={emp.extra?.[idx === 6 ? 0 : 1] || ''} onChange={(e) => {
                            const val = e.target.value === '' ? 0 : parseFloat(e.target.value);
                            setData(p => p.map(ev => ev.id === emp.id ? {...ev, extra: idx === 6 ? [val, ev.extra[1]] : [ev.extra[0], val]} : ev));
                          }} className="w-full text-right text-[11px] font-bold font-mono text-emerald-700" /></td>}
                        </React.Fragment>
                      ))}
                      <td className="p-2 text-center font-mono text-slate-400">{b.weekday.toFixed(1)}</td>
                      <td className="p-2 text-center font-mono text-orange-600">{b.weekend.toFixed(1)}</td>
                      <td className="p-2 text-center font-black bg-emerald-50 text-emerald-900">{(b.weekday + b.weekend).toFixed(1)}</td>
                      <td className="p-2 text-center"><Lock size={12} className="mx-auto text-slate-300" /></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
      <ReportOverlay />
    </div>
  );
};
export default App;