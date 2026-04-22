import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Save, Lock, Unlock, Loader2, EyeOff, ChevronLeft, ChevronRight, Activity, Calendar, AlertTriangle, Target, RefreshCw, FileText, X, Printer } from 'lucide-react';

const App = () => {
  const APP_VERSION = useMemo(() => {
    const now = new Date();
    return `${now.getFullYear().toString().slice(-2)}${(now.getMonth() + 1).toString().padStart(2, '0')}${now.getDate().toString().padStart(2, '0')}.${now.getHours()}${now.getMinutes()}`;
  }, []);

  const API_URL = import.meta.env.VITE_API_URL || "https://aroi-payroll-backend.onrender.com";

  const getCurrentAroiMonday = () => {
    const now = new Date();
    const day = now.getDay();
    const diff = now.getDate() - day + (day === 0 ? -6 : 1);
    const monday = new Date(now.setDate(diff));
    return monday.toISOString().split('T')[0];
  };

  const [startDate, setStartDate] = useState(getCurrentAroiMonday()); 
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [hiddenStaff, setHiddenStaff] = useState(new Set());
  const [showReport, setShowReport] = useState(false);

  useEffect(() => {
    fetch(`${API_URL}/`).catch(() => console.log("Wake-up pulse..."));
  }, [API_URL]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 45000);
    try {
      const response = await fetch(`${API_URL}/api/payroll-data?start=${startDate}`, { signal: controller.signal });
      if (!response.ok) throw new Error(`Server Status: ${response.status}`);
      const result = await response.json();
      const normalizedData = Array.isArray(result) ? result.map(emp => ({
        ...emp,
        id: emp.id.toUpperCase(),
        approved: localStorage.getItem(`approved_${emp.id.toUpperCase()}`) === 'true'
      })) : [];
      setData(normalizedData);
      clearTimeout(timeoutId);
    } catch (err) { 
      setError(err.name === 'AbortError' ? "Backend Timeout" : err.message); 
    } finally { setLoading(false); }
  }, [API_URL, startDate]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const shiftDate = useCallback((days) => {
    setStartDate(current => {
      const [y, m, d] = current.split('-').map(Number);
      const dt = new Date(y, m - 1, d + days);
      return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`;
    });
  }, []);

  const toggleApprove = (id) => {
    setData(prev => prev.map(emp => {
      if (emp.id === id) {
        const newStatus = !emp.approved;
        localStorage.setItem(`approved_${id}`, newStatus);
        return { ...emp, approved: newStatus };
      }
      return emp;
    }));
  };

  // --- RESTORED STABLE CALCULATION ---
  const calculateBreakdown = (emp) => {
    if (!emp?.daily) return { weekday: "0.0", weekend: "0.0", total: "0.0", extra: "0.00" };
    const weekday = emp.daily.reduce((acc, d, i) => (i % 7 < 5) ? acc + (Number(d.r) || 0) : acc, 0);
    const weekend = emp.daily.reduce((acc, d, i) => (i % 7 >= 5) ? acc + (Number(d.r) || 0) : acc, 0);
    const extraTotal = (emp.extra || [0, 0]).reduce((acc, val) => acc + (Number(val) || 0), 0);
    return { 
      weekday: weekday.toFixed(1), 
      weekend: weekend.toFixed(1), 
      total: (weekday + weekend).toFixed(1),
      extra: extraTotal.toFixed(2)
    };
  };

  const allDates = useMemo(() => {
    const parts = startDate.split('-').map(Number);
    if (parts.length !== 3) return Array(14).fill("—");
    return Array.from({ length: 14 }).map((_, i) => new Date(parts[0], parts[1] - 1, parts[2] + i).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }));
  }, [startDate]);

  return (
    <div className="min-h-screen bg-[#F1F5F9] p-4 font-sans antialiased text-[11px]">
      <style>{`
        input::-webkit-outer-spin-button, input::-webkit-inner-spin-button { -webkit-appearance: none; margin: 0; }
        .table-scroll::-webkit-scrollbar { width: 6px; height: 6px; }
        .table-scroll::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 10px; }
        .row-hidden { height: 24px !important; background-color: #f8fafc !important; }
        .row-hidden td { padding: 0 !important; }
        @media print { .no-print { display: none !important; } }
      `}</style>

      <div className="max-w-[1900px] mx-auto">
        <div className="flex justify-between items-center mb-4 bg-white p-3 rounded-2xl shadow-sm border border-slate-200">
          <div className="flex items-center gap-4">
            <div className="bg-slate-900 p-2.5 rounded-xl text-white"><Activity size={18} /></div>
            <div>
              <h1 className="text-sm font-black text-slate-900 uppercase leading-none">Aroi Payroll</h1>
              <span className="text-[9px] font-bold text-emerald-500 uppercase tracking-widest mt-1 block">v{APP_VERSION}</span>
            </div>
            <div className="h-8 w-[1px] bg-slate-200 mx-2" />
            <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200">
              <button onClick={() => shiftDate(-14)} className="p-1.5 hover:bg-white rounded-lg transition-all"><ChevronLeft size={16}/></button>
              <div className="px-4 py-1 font-black text-slate-700 min-w-[140px] text-center flex items-center gap-2">
                <Calendar size={12} className="text-emerald-500" /> {allDates[0]} - {allDates[13]}
              </div>
              <button onClick={() => shiftDate(14)} className="p-1.5 hover:bg-white rounded-lg transition-all"><ChevronRight size={16}/></button>
            </div>
            <button onClick={() => setStartDate(getCurrentAroiMonday())} className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-xl font-black uppercase text-[9px] hover:bg-slate-50 transition-all text-slate-600 shadow-sm"><Target size={14} className="text-blue-500" /> Today</button>
          </div>

          <div className="flex items-center gap-3">
            <button onClick={() => setShowReport(true)} className="flex items-center gap-2 px-4 py-2.5 bg-slate-800 text-white rounded-xl font-black uppercase text-[10px] hover:bg-slate-700 transition-all shadow-md"><FileText size={14} /> Report</button>
            <button onClick={fetchData} className="p-2 bg-slate-100 rounded-lg hover:bg-slate-200"><RefreshCw size={14} className={loading ? 'animate-spin' : ''}/></button>
            <button onClick={async () => {
              setIsSyncing(true);
              try { await fetch(`${API_URL}/api/sync`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ data, startDate }) }); } finally { setIsSyncing(false); }
            }} disabled={isSyncing} className="bg-emerald-600 text-white px-8 py-2.5 rounded-xl font-black uppercase shadow-md hover:bg-emerald-700 active:scale-95 transition-all">
              {isSyncing ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />} <span>{isSyncing ? 'Syncing...' : 'Save Sync'}</span>
            </button>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden relative">
          {loading && (
            <div className="absolute inset-0 z-[100] bg-white/60 backdrop-blur-[2px] flex flex-col items-center justify-center">
              <Loader2 className="animate-spin text-emerald-600 mb-2" size={32} />
              <span className="font-black text-slate-900 uppercase text-[10px]">Updating...</span>
            </div>
          )}

          <div className="table-scroll overflow-x-auto overflow-y-auto max-h-[calc(100vh-160px)]">
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
                  <th className="w-20 p-2 text-center bg-slate-950">Wkday</th>
                  <th className="w-20 p-2 text-center bg-slate-950">Wkend</th>
                  <th className="w-24 p-2 text-center bg-emerald-700 text-white">Total</th>
                  <th className="w-24 p-2 text-center bg-slate-950">Lock</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {data.map((emp) => {
                  const b = calculateBreakdown(emp);
                  const isHidden = hiddenStaff.has(emp.id) && !emp.approved;
                  return (
                    <tr key={emp.id} className={`group divide-x divide-slate-50 transition-all ${emp.approved ? 'bg-amber-50/40' : isHidden ? 'row-hidden' : 'hover:bg-slate-50/50'}`}>
                      <td className="p-3 sticky left-0 z-20 bg-white border-r border-slate-200 group-hover:bg-slate-50">
                        <div className="flex items-center gap-3">
                          {emp.approved ? <div className="text-amber-500 bg-amber-100 p-1.5 rounded-lg"><Lock size={14} fill="currentColor" /></div> : isHidden ? <button onClick={() => setHiddenStaff(p => { const n = new Set(p); n.delete(emp.id); return n; })} className="w-full text-center py-0.5 text-[8px] font-black text-emerald-600 bg-emerald-50 rounded-md uppercase tracking-widest hover:bg-emerald-100">Show</button> : <button onClick={() => setHiddenStaff(p => { const n = new Set(p); n.add(emp.id); return n; })} className="text-slate-300 hover:text-slate-500 transition-colors"><EyeOff size={14}/></button>}
                          {!isHidden && <span className={`font-bold uppercase tracking-tighter truncate text-[11px] ${emp.approved ? 'text-amber-700' : 'text-slate-700'}`}>{emp.name}</span>}
                        </div>
                      </td>
                      {!isHidden ? emp.daily?.map((day, idx) => {
                        const isMismatch = Math.abs(day.r - day.s) > 0.1;
                        return (
                          <React.Fragment key={`${emp.id}-day-${idx}`}>
                            <td className={`p-1 ${idx % 7 >= 5 ? 'bg-orange-50/30' : ''}`}>
                              <div className={`p-1 rounded-lg border flex flex-col items-center transition-colors ${emp.approved ? 'border-amber-100 bg-amber-50/20' : isMismatch ? 'bg-red-50 border-red-100' : day.s > 0 ? 'bg-emerald-50 border-emerald-100' : 'border-transparent'}`}>
                                <span className={`text-[8px] font-bold mb-0.5 ${emp.approved ? 'text-amber-500' : isMismatch ? 'text-red-400' : day.s > 0 ? 'text-emerald-500' : 'text-slate-200'}`}>{day.s > 0 ? day.s.toFixed(1) : '—'}</span>
                                <input type="number" value={day.r || ''} disabled={emp.approved} onChange={(e) => {
                                  const val = e.target.value === '' ? 0 : parseFloat(e.target.value);
                                  setData(p => p.map(ev => ev.id === emp.id ? {...ev, daily: ev.daily.map((d, i) => i === idx ? {...d, r: val} : d)} : ev));
                                }} className="w-full text-center text-[11px] font-black bg-white border border-slate-200 rounded font-mono shadow-sm" />
                              </div>
                            </td>
                            {(idx === 6 || idx === 13) && <td key={`${emp.id}-extra-${idx}`} className={`p-2 text-center ${emp.approved ? 'bg-amber-100/20' : 'bg-emerald-50/10'}`}><input type="number" value={emp.extra?.[idx === 6 ? 0 : 1] || ''} disabled={emp.approved} onChange={(e) => { const val = e.target.value === '' ? 0 : parseFloat(e.target.value); setData(p => p.map(ev => ev.id === emp.id ? {...ev, extra: idx === 6 ? [val, ev.extra[1]] : [ev.extra[0], val]} : ev)); }} className="w-full bg-transparent text-right text-[11px] font-bold outline-none font-mono text-emerald-700" /></td>}
                          </React.Fragment>
                        );
                      }) : <td colSpan={20} className="bg-slate-50/50" />}
                      {!isHidden && <><td className="p-2 text-center font-bold font-mono text-slate-400">{b.weekday}</td><td className="p-2 text-center font-bold font-mono text-orange-600">{b.weekend}</td><td className="p-2 text-center font-black text-[13px] font-mono bg-emerald-50 text-emerald-900">{b.total}</td><td className="p-2 text-center"><button onClick={() => toggleApprove(emp.id)} className={`w-full py-1.5 rounded flex items-center justify-center gap-1.5 border font-black uppercase text-[9px] ${emp.approved ? 'bg-amber-600 border-amber-700 text-white shadow-lg' : 'bg-white border-slate-200 text-slate-400 hover:bg-slate-50'}`}>{emp.approved ? <Unlock size={12} /> : <Lock size={12}/>} {emp.approved ? 'Unlock' : 'Approve'}</button></td></>}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* --- MODAL REPORT --- */}
        {showReport && (
            <div className="fixed inset-0 z-[200] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 no-print">
                <div className="bg-white w-full max-w-4xl rounded-3xl shadow-2xl overflow-hidden border border-slate-200 flex flex-col max-h-[90vh]">
                    <div className="p-6 bg-slate-50 border-b border-slate-200 flex justify-between items-center">
                        <div className="flex items-center gap-3">
                            <div className="bg-emerald-600 p-2 rounded-xl text-white"><FileText size={20} /></div>
                            <div><h2 className="text-sm font-black uppercase text-slate-900">Summary Report</h2><p className="text-[10px] text-slate-500 font-bold">{allDates[0]} - {allDates[13]}</p></div>
                        </div>
                        <div className="flex gap-2"><button onClick={() => window.print()} className="px-4 py-2 bg-white border border-slate-200 rounded-xl font-black uppercase text-[10px] hover:bg-slate-100">Print</button><button onClick={() => setShowReport(false)} className="p-2 bg-white border border-slate-200 rounded-xl text-slate-400 hover:text-slate-600"><X size={20}/></button></div>
                    </div>
                    <div className="p-8 overflow-y-auto">
                        <table className="w-full text-left">
                            <thead className="border-b-2 border-slate-900 text-[10px] uppercase font-black text-slate-400">
                                <tr><th className="py-4">Staff Member</th><th className="py-4 text-center">Weekday</th><th className="py-4 text-center text-orange-600">Weekend</th><th className="py-4 text-center text-emerald-600">Extra $</th><th className="py-4 text-right">Total</th></tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {data.filter(e => !hiddenStaff.has(e.id)).map(emp => {
                                    const b = calculateBreakdown(emp);
                                    return (<tr key={emp.id} className="text-xs font-bold text-slate-700"><td className="py-4 uppercase tracking-tighter">{emp.name}</td><td className="py-4 text-center font-mono text-slate-400">{b.weekday}</td><td className="py-4 text-center font-mono text-orange-600">{b.weekend}</td><td className="py-4 text-center font-mono text-emerald-600">${b.extra}</td><td className="py-4 text-right font-black text-sm text-slate-900">{b.total} hrs</td></tr>);
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        )}
      </div>
    </div>
  );
};

export default App;