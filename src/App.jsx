// Version: 2603252200-FINAL-FIX (UI: Case-Insensitive ID Sync)
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Save, Lock, Unlock, Loader2, User, ChevronLeft, ChevronRight, Activity, Clock, Calendar, AlertTriangle } from 'lucide-react';

const App = () => {
  const APP_VERSION = "2603252200";
  
  // Update this to your production URL if needed
  const API_URL = import.meta.env.VITE_API_URL || "https://aroi-payroll-backend.onrender.com";

  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [startDate, setStartDate] = useState('2026-03-09'); 
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSaved, setLastSaved] = useState(null);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`${API_URL}/api/payroll-data?start=${startDate}`);
      if (!response.ok) throw new Error("Connection Failure to Backend");
      const result = await response.json();
      
      // We ensure all IDs are uppercase coming in to prevent mapping mismatches
      const normalizedData = Array.isArray(result) ? result.map(emp => ({
        ...emp,
        id: emp.id.toUpperCase()
      })) : [];
      
      setData(normalizedData);
    } catch (err) { 
      setError(err.message); 
    } finally { 
      setLoading(false); 
    }
  };

  useEffect(() => { 
    fetchData(); 
  }, [startDate]);

  const handleSave = async () => {
    if (isSyncing || data.length === 0) return;
    setIsSyncing(true);
    try {
      const response = await fetch(`${API_URL}/api/sync`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ data, startDate }) 
      });
      if (response.ok) {
        setLastSaved(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
        alert("Success: Payroll synced to 'MR' tab.");
      } else {
        throw new Error("Sync Failed");
      }
    } catch (err) { 
      alert("Network Error: Could not reach the server."); 
    } finally { 
      setIsSyncing(false); 
    }
  };

  const shiftDate = useCallback((days) => {
    setStartDate(current => {
      const [y, m, d] = current.split('-').map(Number);
      const dt = new Date(y, m - 1, d + days);
      return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`;
    });
  }, []);

  // Hotkeys: J (Prev) / K (Next)
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.target.tagName === 'INPUT') return;
      if (e.key.toLowerCase() === 'j') shiftDate(-14);
      if (e.key.toLowerCase() === 'k') shiftDate(14);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [shiftDate]);

  const calculateBreakdown = (emp) => {
    if (!emp?.daily || !Array.isArray(emp.daily)) return { weekday: "0.0", weekend: "0.0", total: "0.0" };
    const weekday = emp.daily.reduce((acc, d, i) => (i % 7 < 5) ? acc + (Number(d.r) || 0) : acc, 0);
    const weekend = emp.daily.reduce((acc, d, i) => (i % 7 >= 5) ? acc + (Number(d.r) || 0) : acc, 0);
    return { 
      weekday: weekday.toFixed(1), 
      weekend: weekend.toFixed(1), 
      total: (weekday + weekend).toFixed(1)
    };
  };

  const fnRange = useMemo(() => {
    const parts = startDate.split('-').map(Number);
    if (parts.length !== 3) return "Select Date";
    const [y, m, d] = parts;
    const s = new Date(y, m - 1, d);
    const e = new Date(y, m - 1, d + 13);
    const f = (dt) => `${String(dt.getDate()).padStart(2, '0')}/${String(dt.getMonth() + 1).padStart(2, '0')}`;
    return `${f(s)} - ${f(e)}`;
  }, [startDate]);

  const allDates = useMemo(() => {
    const parts = startDate.split('-').map(Number);
    if (parts.length !== 3) return Array(14).fill("—");
    const [y, m, d] = parts;
    return Array.from({ length: 14 }).map((_, i) => new Date(y, m - 1, d + i).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }));
  }, [startDate]);

  if (error) return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-6">
      <div className="bg-white p-8 rounded-2xl shadow-xl border border-red-100 text-center max-w-sm">
        <AlertTriangle className="mx-auto text-red-500 mb-4" size={48} />
        <h2 className="text-red-600 font-black text-xl mb-2 uppercase">Sync Error</h2>
        <p className="text-slate-500 text-sm mb-6 font-medium">{error}</p>
        <button onClick={fetchData} className="w-full bg-slate-900 text-white py-3 rounded-xl font-bold uppercase tracking-tight hover:bg-black transition-colors">Retry Connection</button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#F8FAFC] p-4 font-sans antialiased text-[11px]">
      <style>{`
        input::-webkit-outer-spin-button, input::-webkit-inner-spin-button { -webkit-appearance: none; margin: 0; }
        input[type=number] { -moz-appearance: textfield; }
        .table-scroll::-webkit-scrollbar { width: 8px; height: 8px; }
        .table-scroll::-webkit-scrollbar-track { background: #f1f1f1; }
        .table-scroll::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 4px; }
        .table-scroll::-webkit-scrollbar-thumb:hover { background: #94a3b8; }
      `}</style>

      <div className="max-w-[1850px] mx-auto">
        {/* HEADER SECTION */}
        <div className="flex justify-between items-center mb-4 bg-white p-3 rounded-2xl shadow-sm border border-slate-200/60">
          <div className="flex items-center gap-4">
            <div className="bg-emerald-600 p-2.5 rounded-xl text-white shadow-lg shadow-emerald-100">
              <Activity size={20} strokeWidth={2.5} />
            </div>
            <div>
              <h1 className="text-base font-black tracking-tight text-slate-900 leading-none uppercase">Aroi Payroll</h1>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest text-left block mt-1">Management Console</span>
            </div>
            <div className="h-8 w-[1px] bg-slate-200 mx-2" />
            <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg border border-slate-200">
              <button onClick={() => shiftDate(-14)} className="p-1.5 hover:bg-white hover:shadow-sm rounded-md transition-all text-slate-600"><ChevronLeft size={16}/></button>
              <div className="px-3 py-1 font-black text-slate-700 min-w-[120px] text-center flex items-center gap-2">
                <Calendar size={12} className="text-emerald-500" /> {fnRange}
              </div>
              <button onClick={() => shiftDate(14)} className="p-1.5 hover:bg-white hover:shadow-sm rounded-md transition-all text-slate-600"><ChevronRight size={16}/></button>
            </div>
          </div>

          <div className="flex items-center gap-6">
            {lastSaved && (
              <div className="flex items-center gap-2 text-slate-400 font-bold bg-slate-50 px-3 py-1.5 rounded-full border border-slate-100">
                <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
                <Clock size={12} /> <span className="uppercase text-[9px]">Last Sync: {lastSaved}</span>
              </div>
            )}
            <button 
              onClick={handleSave} 
              disabled={isSyncing || loading} 
              className={`flex items-center gap-2 px-8 py-2.5 rounded-xl font-black uppercase tracking-tight transition-all shadow-md ${isSyncing || loading ? 'bg-slate-100 text-slate-400 shadow-none' : 'bg-emerald-600 text-white hover:bg-emerald-700 hover:shadow-lg active:scale-95'}`}
            >
              {isSyncing ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
              <span>{isSyncing ? 'Saving...' : 'Save'}</span>
            </button>
          </div>
        </div>

        {/* TABLE SECTION */}
        <div className="bg-white rounded-2xl shadow-xl shadow-slate-200/50 border border-slate-200 overflow-hidden relative">
          
          {loading && (
            <div className="absolute inset-0 z-[100] bg-white/80 backdrop-blur-sm flex flex-col items-center justify-center gap-3">
              <Loader2 className="animate-spin text-emerald-600" size={40} />
              <p className="text-slate-500 font-black uppercase tracking-widest text-[10px]">Fetching Payroll Data...</p>
            </div>
          )}

          <div className="table-scroll overflow-x-auto overflow-y-auto max-h-[calc(100vh-180px)]">
            <table className="w-full text-left border-collapse table-fixed min-w-[1750px]">
              <thead className="sticky top-0 z-40 bg-slate-900 text-[9px] uppercase tracking-wider font-bold">
                <tr className="divide-x divide-slate-800">
                  <th className="w-48 p-4 sticky left-0 z-50 bg-slate-950 text-white shadow-[2px_0_5px_rgba(0,0,0,0.1)]">Team Member</th>
                  {Array.from({ length: 14 }).map((_, i) => {
                    const isWeekend = (i % 7 >= 5);
                    return (
                      <React.Fragment key={i}>
                        <th className={`w-[58px] p-2 text-center ${isWeekend ? 'bg-slate-800 text-orange-400' : 'text-white'}`}>
                          <div className="text-slate-400 text-[8px] mb-0.5 font-black">{allDates[i]}</div>
                          {['Mon','Tue','Wed','Thu','Fri','Sat','Sun'][i % 7]}
                        </th>
                        {(i === 6 || i === 13) && (
                          <th className="w-20 p-2 text-center bg-emerald-900/20 text-emerald-200 border-x-2 border-slate-800 uppercase">Extra $</th>
                        )}
                      </React.Fragment>
                    );
                  })}
                  <th className="w-20 p-2 text-center bg-slate-950 text-slate-400 uppercase">Wkday</th>
                  <th className="w-20 p-2 text-center bg-slate-950 text-orange-400 uppercase">Wkend</th>
                  <th className="w-24 p-2 text-center bg-emerald-600 text-white shadow-inner uppercase">Total Hrs</th>
                  <th className="w-24 p-2 text-center bg-slate-950 text-white uppercase">Approve</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100">
                {data.length > 0 ? data.map((emp) => {
                  const b = calculateBreakdown(emp);
                  return (
                    <tr key={emp.id} className="group hover:bg-emerald-50/40 transition-colors divide-x divide-slate-100">
                      <td className="p-3 sticky left-0 z-20 bg-white border-r border-slate-200 group-hover:bg-[#f6fcf9] transition-colors shadow-[2px_0_5px_rgba(0,0,0,0.02)]">
                        <div className="flex items-center gap-3">
                          <div className="w-7 h-7 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 group-hover:bg-emerald-100 group-hover:text-emerald-600 transition-colors">
                            <User size={14}/>
                          </div>
                          <span className="font-bold text-slate-700 uppercase tracking-tight truncate">{emp.name}</span>
                        </div>
                      </td>
                      
                      {emp.daily ? emp.daily.map((day, idx) => {
                        const isMismatch = Math.abs(day.r - day.s) > 0.1;
                        const isMatch = !isMismatch && day.s > 0;
                        const cellStyle = isMismatch 
                          ? 'bg-red-50 border-red-200 shadow-sm' 
                          : isMatch 
                            ? 'bg-emerald-50/60 border-emerald-100 shadow-sm' 
                            : 'border-transparent hover:border-slate-200';

                        return (
                          <React.Fragment key={idx}>
                            <td className={`p-1 ${idx % 7 >= 5 ? 'bg-orange-50/10' : ''}`}>
                              <div className={`p-1.5 rounded-lg border transition-all ${cellStyle}`}>
                                <div className={`text-[8px] text-center font-black mb-1 ${isMismatch ? 'text-red-400' : isMatch ? 'text-emerald-600' : 'text-slate-300'}`}>
                                  {day.s > 0 ? day.s.toFixed(1) : '—'}
                                </div>
                                <input 
                                  type="number" 
                                  value={day.r || ''} 
                                  disabled={emp.approved} 
                                  onChange={(e) => {
                                    const val = e.target.value === '' ? 0 : parseFloat(e.target.value) || 0;
                                    setData(prev => prev.map(ev => ev.id === emp.id ? {...ev, daily: ev.daily.map((d, i) => i === idx ? {...d, r: val} : d)} : ev));
                                  }} 
                                  className={`w-full text-center font-black rounded-md py-1 focus:ring-2 focus:ring-emerald-500 outline-none transition-all ${emp.approved ? 'bg-transparent text-slate-400 font-bold' : 'bg-white shadow-sm border border-slate-200 text-slate-800'}`} 
                                />
                              </div>
                            </td>
                            {(idx === 6 || idx === 13) && (
                              <td className="p-2 bg-emerald-50/20 text-center border-x-2 border-slate-100">
                                <div className="relative">
                                  <span className="absolute left-1 top-1/2 -translate-y-1/2 text-emerald-300 font-bold">$</span>
                                  <input 
                                    type="number" 
                                    value={emp.extra?.[idx === 6 ? 0 : 1] || ''} 
                                    disabled={emp.approved} 
                                    onChange={(e) => {
                                      const val = e.target.value === '' ? 0 : parseFloat(e.target.value) || 0;
                                      const extraIdx = idx === 6 ? 0 : 1;
                                      setData(prev => prev.map(ev => ev.id === emp.id ? {
                                        ...ev, 
                                        extra: extraIdx === 0 ? [val, ev.extra[1] || 0] : [ev.extra[0] || 0, val]
                                      } : ev));
                                    }} 
                                    className="w-full bg-white border border-emerald-100 rounded-md py-1.5 text-right pr-2 text-emerald-700 font-black shadow-sm outline-none focus:ring-2 focus:ring-emerald-500" 
                                  />
                                </div>
                              </td>
                            )}
                          </React.Fragment>
                        );
                      }) : <td colSpan="14">No Daily Data</td>}

                      <td className="p-2 text-center bg-slate-50 font-bold text-slate-500">{b.weekday}</td>
                      <td className="p-2 text-center bg-orange-50/40 font-bold text-orange-600">{b.weekend}</td>
                      <td className="p-2 text-center bg-emerald-50 text-emerald-900 font-black text-[12px]">{b.total}</td>
                      
                      <td className="p-3 text-center bg-slate-50/30">
                        <button 
                          onClick={() => setData(p => p.map(e => e.id === emp.id ? {...e, approved: !e.approved} : e))} 
                          className={`w-full py-2 rounded-xl flex items-center justify-center gap-2 transition-all border font-black uppercase text-[8px] ${emp.approved ? 'bg-emerald-500 border-emerald-600 text-white shadow-md' : 'bg-white border-slate-200 text-slate-400 hover:text-slate-600'}`}
                        >
                          {emp.approved ? <Lock size={12} fill="currentColor"/> : <Unlock size={12}/>}
                          {emp.approved ? 'Approved' : 'Approve'}
                        </button>
                      </td>
                    </tr>
                  );
                }) : !loading && (
                  <tr>
                    <td colSpan="30" className="p-10 text-center text-slate-400 uppercase font-black">No payroll data found</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          
          <div className="bg-slate-50 px-4 py-2 border-t border-slate-200 flex justify-between items-center text-[9px]">
            <div className="flex gap-4 text-slate-400 font-bold uppercase tracking-widest">
              <span><kbd className="bg-white px-2 py-0.5 rounded border border-slate-300 text-slate-700 shadow-sm">J</kbd> Prev</span>
              <span><kbd className="bg-white px-2 py-0.5 rounded border border-slate-300 text-slate-700 shadow-sm">K</kbd> Next</span>
            </div>
            <div className="text-slate-300 font-black uppercase tracking-widest">Aroi Build v.{APP_VERSION}</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default App;