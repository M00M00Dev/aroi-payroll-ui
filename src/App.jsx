import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Save, Lock, Unlock, Loader2, EyeOff, ChevronLeft, ChevronRight, Activity, Calendar, AlertTriangle, Target, RefreshCw, FileText, X, Printer } from 'lucide-react';

const App = () => {
  // --- AUTOMATIC VERSIONING ---
  const APP_VERSION = useMemo(() => {
    const now = new Date();
    const y = now.getFullYear().toString().slice(-2);
    const m = (now.getMonth() + 1).toString().padStart(2, '0');
    const d = now.getDate().toString().padStart(2, '0');
    const hh = now.getHours().toString().padStart(2, '0');
    const mm = now.getMinutes().toString().padStart(2, '0');
    return `${y}${m}${d}.${hh}${mm}`;
  }, []);

  const API_URL = import.meta.env.VITE_API_URL || "https://aroi-payroll-backend.onrender.com";

  // --- DATE HELPERS ---
  const getCurrentAroiMonday = () => {
    const now = new Date();
    const day = now.getDay();
    const diff = now.getDate() - day + (day === 0 ? -6 : 1);
    const monday = new Date(now.setDate(diff));
    return monday.toISOString().split('T')[0];
  };

  // --- STATE ---
  const [startDate, setStartDate] = useState(getCurrentAroiMonday()); 
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [hiddenStaff, setHiddenStaff] = useState(new Set());
  const [showReport, setShowReport] = useState(false);
  const [rates, setRates] = useState(() => JSON.parse(localStorage.getItem('payroll_rates') || '{}'));

  useEffect(() => {
    localStorage.setItem('payroll_rates', JSON.stringify(rates));
  }, [rates]);

  // --- NAVIGATION ---
  const shiftFortnight = (direction) => {
    const [y, m, d] = startDate.split('-').map(Number);
    const date = new Date(y, m - 1, d + (direction * 14));
    setStartDate(date.toISOString().split('T')[0]);
  };

  // --- DATA FETCHING ---
  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`${API_URL}/api/payroll-data?start=${startDate}`);
      if (!response.ok) throw new Error(`Server Status: ${response.status}`);
      const result = await response.json();
      setData(Array.isArray(result) ? result.map(emp => ({
        ...emp,
        id: emp.id.toUpperCase(),
        approved: localStorage.getItem(`approved_${emp.id.toUpperCase()}`) === 'true'
      })) : []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [API_URL, startDate]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // --- PAYROLL MATH ---
  const calculateBreakdown = (emp) => {
    if (!emp?.daily) return { weekday: "0.0", weekend: "0.0", total: "0.0", extra: "0.00", amount: "0.00", rWd: 0, rWe: 0 };
    const wd = emp.daily.reduce((acc, d, i) => (i % 7 < 5) ? acc + (Number(d.r) || 0) : acc, 0);
    const we = emp.daily.reduce((acc, d, i) => (i % 7 >= 5) ? acc + (Number(d.r) || 0) : acc, 0);
    const ex = (emp.extra || [0, 0]).reduce((acc, val) => acc + (Number(val) || 0), 0);
    const rWd = emp.rate_weekday || rates[emp.id]?.wd || 0;
    const rWe = emp.rate_weekend || rates[emp.id]?.we || 0;
    return { 
      weekday: wd.toFixed(1), 
      weekend: we.toFixed(1), 
      total: (wd + we).toFixed(1), 
      extra: ex.toFixed(2), 
      amount: ((wd * rWd) + (we * rWe) + ex).toFixed(2), 
      rWd, rWe 
    };
  };

  const allDates = useMemo(() => {
    const parts = startDate.split('-').map(Number);
    return Array.from({ length: 14 }).map((_, i) => new Date(parts[0], parts[1] - 1, parts[2] + i).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }));
  }, [startDate]);

  return (
    <div className="min-h-screen bg-[#F1F5F9] p-4 font-sans text-[11px]">
      <style>{`
        input::-webkit-outer-spin-button, input::-webkit-inner-spin-button { -webkit-appearance: none; margin: 0; }
        .table-scroll::-webkit-scrollbar { width: 6px; height: 6px; }
        .table-scroll::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 10px; }
        .row-hidden { height: 24px !important; background-color: #f8fafc !important; }
        .row-hidden td { padding: 0 !important; }
        @media print { .no-print { display: none !important; } body { background: white; } }
      `}</style>

      <div className="max-w-[1900px] mx-auto no-print">
        <div className="flex justify-between items-center mb-4 bg-white p-3 rounded-2xl shadow-sm border border-slate-200">
          <div className="flex items-center gap-4">
            <div className="bg-slate-900 p-2 rounded-xl text-white"><Activity size={18} /></div>
            <div>
              <h1 className="text-sm font-black text-slate-900 uppercase leading-none">Aroi Payroll</h1>
              <span className="text-[9px] font-bold text-emerald-500 uppercase block mt-1">v{APP_VERSION}</span>
            </div>
            {/* FORTNIGHT NAV */}
            <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200 ml-4">
              <button onClick={() => shiftFortnight(-1)} className="p-1.5 hover:bg-white rounded-lg"><ChevronLeft size={16}/></button>
              <div className="px-4 font-black text-slate-700 min-w-[140px] text-center">{allDates[0]} - {allDates[13]}</div>
              <button onClick={() => shiftFortnight(1)} className="p-1.5 hover:bg-white rounded-lg"><ChevronRight size={16}/></button>
            </div>
            {/* TODAY BUTTON */}
            <button onClick={() => setStartDate(getCurrentAroiMonday())} className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-xl font-black uppercase text-[9px] text-slate-600 shadow-sm hover:bg-slate-50">
              <Target size={14} className="text-blue-500" /> Today
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button onClick={() => setShowReport(true)} className="flex items-center gap-2 px-4 py-2.5 bg-slate-800 text-white rounded-xl font-black uppercase text-[10px]"><FileText size={14} /> Report</button>
            <button onClick={fetchData} className="p-2.5 bg-slate-100 rounded-xl hover:bg-slate-200 border border-slate-200"><RefreshCw size={14} className={loading ? 'animate-spin' : ''}/></button>
            <button onClick={async () => { 
                setIsSyncing(true); 
                try { await fetch(`${API_URL}/api/sync`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ data, startDate }) }); } 
                finally { setIsSyncing(false); } 
            }} className="bg-emerald-600 text-white px-6 py-2.5 rounded-xl font-black uppercase shadow-md flex items-center gap-2 hover:bg-emerald-700 transition-all">
              {isSyncing ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />} <span>{isSyncing ? 'Syncing...' : 'Save Sync'}</span>
            </button>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden relative">
          {loading && <div className="absolute inset-0 z-50 bg-white/60 flex items-center justify-center font-black uppercase text-slate-400">Loading...</div>}
          <div className="table-scroll overflow-x-auto max-h-[calc(100vh-160px)]">
            <table className="w-full text-left border-collapse table-fixed min-w-[1800px]">
              <thead className="sticky top-0 z-40 bg-slate-900 text-[10px] uppercase text-white font-bold">
                <tr className="divide-x divide-slate-800">
                  <th className="w-52 p-4 sticky left-0 z-50 bg-slate-950">Team Member</th>
                  {Array.from({ length: 14 }).map((_, i) => (
                    <React.Fragment key={i}>
                      <th className={`w-[62px] p-2 text-center ${i % 7 >= 5 ? 'bg-orange-900/20 text-orange-400' : ''}`}>{['Mon','Tue','Wed','Thu','Fri','Sat','Sun'][i % 7]}</th>
                      {(i === 6 || i === 13) && <th className="w-20 p-2 text-center bg-emerald-950/50 text-emerald-400">Extra $</th>}
                    </React.Fragment>
                  ))}
                  <th className="w-20 p-2 text-center bg-slate-950">Wkday</th>
                  <th className="w-20 p-2 text-center bg-slate-950">Wkend</th>
                  <th className="w-24 p-2 text-center bg-emerald-700">Total</th>
                  <th className="w-24 p-2 text-center bg-slate-950">Lock</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {data.map((emp) => {
                  const b = calculateBreakdown(emp);
                  const isHidden = hiddenStaff.has(emp.id) && !emp.approved;
                  return (
                    <tr key={emp.id} className={`divide-x divide-slate-50 transition-all ${emp.approved ? 'bg-amber-50/40' : isHidden ? 'row-hidden' : 'hover:bg-slate-50/50'}`}>
                      <td className="p-3 sticky left-0 z-20 bg-white border-r font-bold uppercase text-slate-700">
                        <div className="flex items-center gap-2">
                          {emp.approved ? <Lock size={12} className="text-amber-500"/> : isHidden ? <button onClick={() => setHiddenStaff(p => { const n = new Set(p); n.delete(emp.id); return n; })} className="text-[8px] text-emerald-600 font-black">Show</button> : <button onClick={() => setHiddenStaff(p => { const n = new Set(p); n.add(emp.id); return n; })}><EyeOff size={12} className="text-slate-300"/></button>}
                          {!isHidden && emp.name}
                        </div>
                      </td>
                      {!isHidden ? emp.daily?.map((day, idx) => (
                        <React.Fragment key={idx}>
                          <td className="p-1">
                            <div className={`p-1 rounded-lg border flex flex-col items-center ${day.s > 0 ? 'bg-emerald-50 border-emerald-100' : 'border-transparent'}`}>
                                <span className="text-[8px] font-bold text-slate-400">{day.s > 0 ? day.s.toFixed(1) : '—'}</span>
                                <input type="number" value={day.r || ''} disabled={emp.approved} onChange={(e) => { const val = parseFloat(e.target.value) || 0; setData(p => p.map(ev => ev.id === emp.id ? {...ev, daily: ev.daily.map((d, i) => i === idx ? {...d, r: val} : d)} : ev)); }} className="w-full text-center text-[11px] font-black outline-none bg-transparent" />
                            </div>
                          </td>
                          {(idx === 6 || idx === 13) && <td className="p-1"><input type="number" value={emp.extra?.[idx === 6 ? 0 : 1] || ''} disabled={emp.approved} onChange={(e) => { const val = parseFloat(e.target.value) || 0; setData(p => p.map(ev => ev.id === emp.id ? {...ev, extra: idx === 6 ? [val, ev.extra[1]] : [ev.extra[0], val]} : ev)); }} className="w-full text-center font-mono font-bold text-emerald-700 bg-transparent" /></td>}
                        </React.Fragment>
                      )) : <td colSpan={20} />}
                      {!isHidden && <><td className="p-2 text-center font-bold text-slate-400">{b.weekday}</td><td className="p-2 text-center font-bold text-orange-600">{b.weekend}</td><td className="p-2 text-center font-black bg-emerald-50 text-emerald-900">{b.total}</td><td className="p-2 text-center"><button onClick={() => { const s = !emp.approved; localStorage.setItem(`approved_${emp.id}`, s); setData(p => p.map(e => e.id === emp.id ? {...e, approved: s} : e)); }} className={`w-full py-1 rounded border font-black uppercase text-[9px] ${emp.approved ? 'bg-amber-600 text-white' : 'bg-white text-slate-400'}`}>{emp.approved ? 'Unlock' : 'Approve'}</button></td></>}
                    </tr>
                )})}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* --- FINANCIAL REPORT MODAL --- */}
      {showReport && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 no-print">
            <div className="bg-white w-full max-w-6xl rounded-3xl shadow-2xl flex flex-col max-h-[95vh] overflow-hidden">
                <div className="p-6 bg-slate-50 border-b border-slate-200 flex justify-between items-center no-print">
                    <div className="flex gap-3 items-center">
                        <div className="bg-emerald-600 p-2 rounded-xl text-white"><FileText size={20} /></div>
                        <div><h2 className="text-sm font-black uppercase">Financial Report</h2><p className="text-[10px] font-bold text-slate-400">{allDates[0]} - {allDates[13]}</p></div>
                    </div>
                    <div className="flex gap-2">
                        <button onClick={() => window.print()} className="px-6 py-2 bg-slate-900 text-white rounded-xl font-black uppercase text-[10px]">Print</button>
                        <button onClick={() => setShowReport(false)} className="p-2 text-slate-400 hover:bg-slate-100 rounded-lg"><X size={20}/></button>
                    </div>
                </div>
                <div className="p-8 overflow-y-auto">
                    <table className="w-full text-left">
                        <thead className="border-b-2 border-slate-900 text-[9px] uppercase font-black text-slate-400">
                            <tr>
                                <th className="py-4">Staff Member</th>
                                <th className="py-4 text-center">Rate (Wkday)</th>
                                <th className="py-4 text-center text-orange-600">Rate (Wkend)</th>
                                <th className="py-4 text-center">Hrs (Wkday)</th>
                                <th className="py-4 text-center text-orange-600">Hrs (Wkend)</th>
                                <th className="py-4 text-center text-emerald-600">Extra $</th>
                                <th className="py-4 text-right">Amount $</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {data.filter(e => !hiddenStaff.has(e.id)).map(emp => {
                                const b = calculateBreakdown(emp);
                                return (
                                    <tr key={emp.id} className="text-xs font-bold text-slate-700">
                                        <td className="py-4 uppercase tracking-tighter">{emp.name}</td>
                                        <td className="py-2 text-center">
                                            <input type="number" value={b.rWd || ''} placeholder="0" onChange={(e) => setRates(p => ({...p, [emp.id]: {...(p[emp.id] || {}), wd: parseFloat(e.target.value) || 0}}))} className="w-12 text-center border rounded p-1 font-mono text-[10px]" />
                                        </td>
                                        <td className="py-2 text-center">
                                            <input type="number" value={b.rWe || ''} placeholder="0" onChange={(e) => setRates(p => ({...p, [emp.id]: {...(p[emp.id] || {}), we: parseFloat(e.target.value) || 0}}))} className="w-12 text-center border rounded p-1 font-mono text-orange-600 text-[10px]" />
                                        </td>
                                        <td className="py-4 text-center font-mono text-slate-400">{b.weekday}</td>
                                        <td className="py-4 text-center font-mono text-orange-600">{b.weekend}</td>
                                        <td className="py-4 text-center font-mono text-emerald-600">${b.extra}</td>
                                        <td className="py-4 text-right font-black text-slate-900">${b.amount}</td>
                                    </tr>
                                );
                            })}
                        </tbody>
                        <tfoot>
                            <tr className="border-t-2 border-slate-900 bg-slate-900 text-white font-black">
                                <td className="py-4 px-4 uppercase text-[10px]">Grand Total</td>
                                <td colSpan={5}></td>
                                <td className="py-4 px-4 text-right text-lg font-mono">${data.reduce((acc, e) => acc + parseFloat(calculateBreakdown(e).amount), 0).toFixed(2)}</td>
                            </tr>
                        </tfoot>
                    </table>
                </div>
            </div>
        </div>
      )}
    </div>
  );
};

export default App;