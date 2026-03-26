// Version: 260327-FINAL-STABLE-FRONTEND
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Save, Lock, Unlock, Loader2, EyeOff, ChevronLeft, ChevronRight, Activity, Calendar, Target, FileText, X, Download, CheckCircle2 } from 'lucide-react';

const App = () => {
  const API_URL = "https://aroi-payroll-backend.onrender.com";
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showReport, setShowReport] = useState(false);
  const [startDate, setStartDate] = useState('2026-03-09');

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

  const calculateBreakdown = (emp) => {
    if (!emp?.daily) return { weekday: 0, weekend: 0 };
    const wkday = emp.daily.reduce((acc, d, i) => (i % 7 < 5) ? acc + (Number(d.r) || 0) : acc, 0);
    const wkend = emp.daily.reduce((acc, d, i) => (i % 7 >= 5) ? acc + (Number(d.r) || 0) : acc, 0);
    return { weekday: wkday, weekend: wkend };
  };

  const ReportOverlay = () => {
    if (!showReport) return null;
    const shops = ["Maruay Thai", "PAD Thai Food", "Other"];
    return (
      <div className="fixed inset-0 z-[500] bg-white overflow-y-auto p-8 font-sans">
        <div className="max-w-5xl mx-auto">
          <div className="flex justify-between items-center mb-10 border-b pb-6">
            <h1 className="text-3xl font-black uppercase">Finance Manifest</h1>
            <button onClick={() => setShowReport(false)} className="bg-slate-900 text-white p-3 rounded-2xl"><X size={24}/></button>
          </div>
          {shops.map(shop => {
            const filtered = data.filter(e => {
                const s = e.shop?.trim();
                if (shop === "Other") return !s || (s !== "Maruay Thai" && s !== "PAD Thai Food");
                return s === shop;
            });
            if (filtered.length === 0) return null;
            return (
              <div key={shop} className="mb-16">
                <h2 className="text-xl font-black uppercase mb-4 text-slate-800">{shop}</h2>
                <div className="border rounded-2xl overflow-hidden shadow-sm">
                  <table className="w-full text-left">
                    <thead className="bg-slate-50 text-[10px] uppercase font-bold text-slate-400">
                      <tr>
                        <th className="p-4">Name</th>
                        <th className="p-4 text-right">Hrs</th>
                        <th className="p-4 text-right bg-slate-100 text-slate-900">Total Pay</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y text-[12px]">
                      {filtered.map(emp => {
                        const b = calculateBreakdown(emp);
                        const total = (b.weekday * (emp.rate_weekday || 0)) + (b.weekend * (emp.rate_weekend || 0)) + ((emp.extra?.[0] || 0) + (emp.extra?.[1] || 0));
                        return (
                          <tr key={emp.id} className="hover:bg-slate-50">
                            <td className="p-4 font-bold uppercase">{emp.name}</td>
                            <td className="p-4 text-right font-mono">{(b.weekday + b.weekend).toFixed(1)}</td>
                            <td className="p-4 text-right font-black bg-slate-50/50">${total.toFixed(2)}</td>
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
    <div className="min-h-screen bg-[#F1F5F9] p-4 text-[11px] font-sans antialiased">
      <div className="max-w-[1600px] mx-auto">
        <div className="flex justify-between items-center mb-6 bg-white p-4 rounded-3xl shadow-sm border">
          <div className="flex items-center gap-6">
            <h1 className="font-black uppercase tracking-tighter text-lg">Aroi Payroll</h1>
            <button onClick={() => setShowReport(true)} className="px-6 py-3 bg-indigo-600 text-white rounded-2xl font-black uppercase text-[10px] shadow-lg hover:bg-indigo-700 transition-all">Finance Report</button>
          </div>
          <div className="flex items-center gap-2 bg-slate-100 p-1.5 rounded-2xl font-bold">
             <button onClick={() => fetchData()} className="px-4 py-2 hover:bg-white rounded-xl transition-all">Refresh Data</button>
          </div>
        </div>

        <div className="bg-white rounded-3xl shadow-xl border overflow-hidden relative min-h-[400px]">
          {loading ? (
            <div className="absolute inset-0 flex items-center justify-center bg-white/80 z-50">
              <Loader2 className="animate-spin text-indigo-600" size={32} />
            </div>
          ) : (
            <div className="overflow-auto">
              <table className="w-full text-left border-collapse table-fixed min-w-[1200px]">
                <thead className="bg-slate-900 text-white text-[10px] uppercase font-bold sticky top-0 z-10">
                  <tr>
                    <th className="p-4 w-48 sticky left-0 bg-slate-950">Team Member</th>
                    {Array.from({ length: 14 }).map((_, i) => <th key={i} className="p-2 text-center w-20">Day {i+1}</th>)}
                    <th className="p-4 w-24 text-right bg-indigo-900">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {data.map(emp => {
                    const b = calculateBreakdown(emp);
                    return (
                      <tr key={emp.id} className="hover:bg-slate-50 transition-colors">
                        <td className="p-4 sticky left-0 bg-white border-r font-bold uppercase truncate">{emp.name}</td>
                        {emp.daily?.map((d, i) => (
                          <td key={i} className="p-1">
                            <div className="p-1 rounded-lg border text-center">
                              <span className="text-[8px] text-emerald-600 font-bold block">{d.s > 0 ? d.s.toFixed(1) : '—'}</span>
                              <input type="number" value={d.r || ''} onChange={(e) => {
                                const val = e.target.value === '' ? 0 : parseFloat(e.target.value);
                                setData(p => p.map(ev => ev.id === emp.id ? {...ev, daily: ev.daily.map((day, idx) => idx === i ? {...day, r: val} : day)} : ev));
                              }} className="w-full text-center font-black bg-transparent outline-none" />
                            </div>
                          </td>
                        ))}
                        <td className="p-4 text-right font-black text-indigo-600 bg-indigo-50/30">{(b.weekday + b.weekend).toFixed(1)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
      <ReportOverlay />
    </div>
  );
};
export default App;