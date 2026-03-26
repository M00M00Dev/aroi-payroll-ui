import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Save, Lock, Unlock, Loader2, EyeOff, ChevronLeft, ChevronRight, Activity, Calendar, Target, FileText, X, Download, CheckCircle2 } from 'lucide-react';

const App = () => {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showReport, setShowReport] = useState(false);
  const [startDate, setStartDate] = useState('2026-03-09');
  const [isSyncing, setIsSyncing] = useState(false);
  const API_URL = "https://aroi-payroll-backend.onrender.com";

  const fetchData = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${API_URL}/api/payroll-data?start=${startDate}`);
      const result = await response.json();
      setData(Array.isArray(result) ? result : []);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchData(); }, [startDate]);

  const allDates = useMemo(() => {
    const parts = startDate.split('-').map(Number);
    return Array.from({ length: 14 }).map((_, i) => new Date(parts[0], parts[1] - 1, parts[2] + i).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }));
  }, [startDate]);

  const ReportOverlay = () => {
    if (!showReport) return null;
    const shops = ["Maruay Thai", "PAD Thai Food", "Other"];
    return (
      <div className="fixed inset-0 z-[500] bg-white overflow-y-auto p-8 font-sans">
        <div className="max-w-6xl mx-auto">
          <div className="flex justify-between items-center mb-10 border-b-2 border-slate-900 pb-6">
            <h1 className="text-3xl font-black uppercase tracking-tighter">Finance Manifest</h1>
            <button onClick={() => setShowReport(false)} className="bg-slate-900 text-white p-3 rounded-2xl hover:scale-95 transition-transform"><X size={24}/></button>
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
                <h2 className="text-2xl font-black uppercase mb-6 flex items-center gap-3">
                  <div className={`w-2 h-8 ${shop === 'Other' ? 'bg-orange-500' : 'bg-emerald-500'} rounded-full`}/> {shop}
                </h2>
                <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-sm">
                  <table className="w-full text-left border-collapse">
                    <thead className="bg-slate-50 text-[10px] uppercase font-black text-slate-400 border-b">
                      <tr>
                        <th className="p-4">Staff Member</th>
                        <th className="p-4 text-right">Hrs (Wkdy/Wkend)</th>
                        <th className="p-4 text-right bg-slate-100 text-slate-900 font-black">Total Payment</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50 text-[12px]">
                      {filtered.map(emp => {
                        const wkday = emp.daily.reduce((acc, d, i) => i % 7 < 5 ? acc + d.r : acc, 0);
                        const wkend = emp.daily.reduce((acc, d, i) => i % 7 >= 5 ? acc + d.r : acc, 0);
                        const total = (wkday * emp.rate_weekday) + (wkend * emp.rate_weekend) + (emp.extra[0] + emp.extra[1]);
                        return (
                          <tr key={emp.id} className="hover:bg-slate-50">
                            <td className="p-4 font-black uppercase text-slate-700">{emp.name}</td>
                            <td className="p-4 text-right font-mono text-slate-500">{wkday.toFixed(1)} / {wkend.toFixed(1)}</td>
                            <td className="p-4 text-right font-black text-slate-900 text-sm bg-slate-50/50">${total.toFixed(2)}</td>
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
            <div><h1 className="text-sm font-black text-slate-900 uppercase">Aroi Payroll</h1></div>
            <div className="h-8 w-[1px] bg-slate-200 mx-2" />
            <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl font-black text-slate-600">
               <span className="px-4">{allDates[0]} - {allDates[13]}</span>
            </div>
            <button onClick={() => setShowReport(true)} className="px-5 py-2.5 bg-indigo-600 text-white rounded-xl font-black uppercase text-[10px] shadow-lg hover:bg-indigo-700">Finance Report</button>
          </div>
          <button onClick={async () => {
            setIsSyncing(true);
            try { await fetch(`${API_URL}/api/sync`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ data, startDate }) }); }
            finally { setIsSyncing(false); fetchData(); }
          }} className="flex items-center gap-2 px-8 py-2.5 bg-emerald-600 text-white rounded-xl font-black uppercase shadow-md">{isSyncing ? <Loader2 className="animate-spin" size={14} /> : <Save size={14} />} <span>Save Sync</span></button>
        </div>

        <div className="bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden relative">
          {loading && <div className="absolute inset-0 bg-white/80 z-50 flex items-center justify-center"><Loader2 className="animate-spin text-emerald-600" size={32} /></div>}
          <div className="overflow-x-auto max-h-[calc(100vh-160px)]">
            <table className="w-full text-left border-collapse table-fixed min-w-[1800px]">
              <thead className="sticky top-0 z-40 bg-slate-900 text-[10px] uppercase font-bold text-white">
                <tr className="divide-x divide-slate-800">
                  <th className="w-52 p-4 sticky left-0 z-50 bg-slate-950">Team Member</th>
                  {allDates.map((d, i) => (
                    <th key={i} className={`p-2 text-center ${i % 7 >= 5 ? 'bg-orange-900/20 text-orange-400' : ''}`}>
                      <div className="text-[8px] opacity-40">{d}</div>{['Mon','Tue','Wed','Thu','Fri','Sat','Sun'][i % 7]}
                    </th>
                  ))}
                  <th className="w-24 p-2 text-center bg-emerald-700 text-white">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {data.map(emp => (
                  <tr key={emp.id} className="hover:bg-slate-50 transition-all divide-x divide-slate-50">
                    <td className="p-3 sticky left-0 z-20 bg-white border-r font-black uppercase text-slate-700">{emp.name}</td>
                    {emp.daily?.map((day, idx) => (
                      <td key={idx} className={`p-1 ${idx % 7 >= 5 ? 'bg-orange-50/30' : ''}`}>
                        <div className={`p-1 rounded-lg border text-center ${day.s > 0 ? 'bg-emerald-50 border-emerald-100' : 'border-transparent'}`}>
                          <span className="text-[8px] font-bold text-emerald-500 block">{day.s > 0 ? day.s.toFixed(1) : '—'}</span>
                          <input type="number" value={day.r || ''} onChange={(e) => {
                            const val = e.target.value === '' ? 0 : parseFloat(e.target.value);
                            setData(p => p.map(ev => ev.id === emp.id ? {...ev, daily: ev.daily.map((d, i) => i === idx ? {...d, r: val} : d)} : ev));
                          }} className="w-full text-center text-[11px] font-black bg-white border border-slate-200 rounded" />
                        </div>
                      </td>
                    ))}
                    <td className="p-2 text-center font-black text-[13px] bg-emerald-50 text-emerald-900">{(emp.daily?.reduce((a, b) => a + b.r, 0)).toFixed(1)}</td>
                  </tr>
                ))}
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