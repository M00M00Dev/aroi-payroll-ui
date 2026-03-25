// Version: 2603252345-PERFORMANCE (Hotkeys, Slim Rows, Loading Overlay)
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Save, Lock, Unlock, Loader2, Eye, EyeOff, ChevronLeft, ChevronRight, Activity, Calendar, AlertTriangle, Target } from 'lucide-react';

const App = () => {
  const APP_VERSION = "2603252345";
  const API_URL = import.meta.env.VITE_API_URL || "https://aroi-payroll-backend.onrender.com";

  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [startDate, setStartDate] = useState('2026-03-09'); 
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSaved, setLastSaved] = useState(null);
  const [hiddenStaff, setHiddenStaff] = useState(new Set());

  const getCurrentAroiMonday = () => {
    const now = new Date();
    const day = now.getDay();
    const diff = now.getDate() - day + (day === 0 ? -6 : 1);
    const monday = new Date(now.setDate(diff));
    return monday.toISOString().split('T')[0];
  };

  const toggleVisibility = (id) => {
    setHiddenStaff(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`${API_URL}/api/payroll-data?start=${startDate}`);
      if (!response.ok) throw new Error("Connection Failure");
      const result = await response.json();
      const normalizedData = Array.isArray(result) ? result.map(emp => ({
        ...emp,
        id: emp.id.toUpperCase(),
        approved: localStorage.getItem(`approved_${emp.id.toUpperCase()}`) === 'true'
      })) : [];
      setData(normalizedData);
    } catch (err) { setError(err.message); }
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

  // 1. HOTKEYS RESTORED
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.target.tagName === 'INPUT') return;
      if (e.key.toLowerCase() === 'j') shiftDate(-14);
      if (e.key.toLowerCase() === 'k') shiftDate(14);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [shiftDate]);

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

  const calculateBreakdown = (emp) => {
    if (!emp?.daily) return { weekday: "0.0", weekend: "0.0", total: "0.0" };
    const weekday = emp.daily.reduce((acc, d, i) => (i % 7 < 5) ? acc + (Number(d.r) || 0) : acc, 0);
    const weekend = emp.daily.reduce((acc, d, i) => (i % 7 >= 5) ? acc + (Number(d.r) || 0) : acc, 0);
    return { weekday: weekday.toFixed(1), weekend: weekend.toFixed(1), total: (weekday + weekend).toFixed(1) };
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
        /* 2. SLIM ROW STYLE */
        .row-hidden { height: 12px !important; }
        .row-hidden td { padding: 0 !important; line-height: 0; }
      `}</style>

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
            <button onClick={() => setStartDate(getCurrentAroiMonday())} className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-xl font-black uppercase text-[9px] hover:bg-slate-50 transition-all text-slate-600 shadow-sm"><Target size={14} className="text-blue-500" /> Today</button>
          </div>

          <button onClick={async () => {
            setIsSyncing(true);
            try {
              const res = await fetch(`${API_URL}/api/sync`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ data, startDate }) });
              if (res.ok) setLastSaved(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
            } finally { setIsSyncing(false); }
          }} disabled={isSyncing} className={`flex items-center gap-2 px-8 py-2.5 rounded-xl font-black uppercase transition-all shadow-md ${isSyncing ? 'bg-slate-100 text-slate-300' : 'bg-emerald-600 text-white hover:bg-emerald-700 active:scale-95'}`}>
            {isSyncing ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />} <span>{isSyncing ? 'Syncing...' : 'Save Sync'}</span>
          </button>
        </div>

        <div className="bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden relative">
          {/* 3. LOADING OVERLAY */}
          {loading && (
            <div className="absolute inset-0 z-[100] bg-white/60 backdrop-blur-[2px] flex items-center justify-center">
              <div className="bg-white px-6 py-4 rounded-2xl shadow-2xl border border-slate-100 flex items-center gap-4">
                <Loader2 className="animate-spin text-emerald-600" size={24} />
                <span className="font-black text-slate-900 uppercase tracking-widest text-[10px]">Loading Data...</span>
              </div>
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
                  <th className="w-20 p-2 text-center bg-slate-950 text-slate-400">Wkday</th>
                  <th className="w-20 p-2 text-center bg-slate-950 text-orange-400">Wkend</th>
                  <th className="w-24 p-2 text-center bg-emerald-700 text-white">Total</th>
                  <th className="w-24 p-2 text-center bg-slate-950">Lock</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100">
                {data.map((emp) => {
                  const b = calculateBreakdown(emp);
                  const isHidden = hiddenStaff.has(emp.id);

                  return (
                    <tr key={emp.id} className={`group divide-x divide-slate-50 transition-all ${isHidden ? 'row-hidden bg-slate-50' : 'hover:bg-slate-50/50'}`}>
                      <td className="p-3 sticky left-0 z-20 bg-white border-r border-slate-200 group-hover:bg-slate-50 overflow-hidden">
                        <div className="flex items-center gap-3">
                          <button onClick={() => toggleVisibility(emp.id)} className={`transition-all ${isHidden ? 'text-slate-300' : 'text-emerald-600'}`}>
                            {isHidden ? <EyeOff size={10}/> : <Eye size={14}/>}
                          </button>
                          {!isHidden && <span className="font-bold text-slate-700 uppercase tracking-tighter truncate text-[11px]">{emp.name}</span>}
                        </div>
                      </td>
                      
                      {!isHidden ? emp.daily?.map((day, idx) => {
                        const isMismatch = Math.abs(day.r - day.s) > 0.1;
                        return (
                          <React.Fragment key={idx}>
                            <td className={`p-1 ${idx % 7 >= 5 ? 'bg-orange-50/30' : ''}`}>
                              <div className={`p-1 rounded-lg border flex flex-col items-center ${isMismatch ? 'bg-red-50 border-red-100' : day.s > 0 ? 'bg-emerald-50 border-emerald-100' : 'border-transparent'}`}>
                                <span className={`text-[8px] font-bold mb-0.5 ${isMismatch ? 'text-red-400' : day.s > 0 ? 'text-emerald-500' : 'text-slate-200'}`}>{day.s > 0 ? day.s.toFixed(1) : '—'}</span>
                                <input type="number" value={day.r || ''} disabled={emp.approved} onChange={(e) => {
                                  const val = e.target.value === '' ? 0 : parseFloat(e.target.value);
                                  setData(p => p.map(ev => ev.id === emp.id ? {...ev, daily: ev.daily.map((d, i) => i === idx ? {...d, r: val} : d)} : ev));
                                }} className={`w-full text-center text-[11px] font-black rounded font-mono ${emp.approved ? 'bg-transparent text-slate-400' : 'bg-white border border-slate-200 text-slate-900'}`} />
                              </div>
                            </td>
                            {(idx === 6 || idx === 13) && <td className="p-2 bg-emerald-50/10 text-center"><input type="number" value={emp.extra?.[idx === 6 ? 0 : 1] || ''} disabled={emp.approved} onChange={(e) => {
                                const val = e.target.value === '' ? 0 : parseFloat(e.target.value);
                                setData(p => p.map(ev => ev.id === emp.id ? {...ev, extra: idx === 6 ? [val, ev.extra[1]] : [ev.extra[0], val]} : ev));
                            }} className="w-full bg-transparent text-right text-[11px] font-bold text-emerald-700 outline-none font-mono" /></td>}
                          </React.Fragment>
                        );
                      }) : <td colSpan={20} />}

                      {!isHidden && (
                        <>
                          <td className="p-2 text-center text-slate-400 font-bold font-mono">{b.weekday}</td>
                          <td className="p-2 text-center text-orange-600 font-bold font-mono">{b.weekend}</td>
                          <td className="p-2 text-center bg-emerald-50 text-emerald-900 font-black text-[13px] font-mono">{b.total}</td>
                          <td className="p-2 text-center">
                            <button onClick={() => toggleApprove(emp.id)} className={`w-full py-1.5 rounded flex items-center justify-center gap-1.5 transition-all border font-black uppercase text-[9px] ${emp.approved ? 'bg-emerald-500 text-white' : 'bg-white text-slate-400'}`}>
                              {emp.approved ? <Lock size={12} fill="currentColor"/> : <Unlock size={12}/>} {emp.approved ? 'Locked' : 'Approve'}
                            </button>
                          </td>
                        </>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default App;