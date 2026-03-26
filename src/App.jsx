// Version: 260327-CLEAN-MAPPING
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Save, Lock, Unlock, Loader2, EyeOff, ChevronLeft, ChevronRight, Activity, Calendar, Target, FileText, X, Download, CheckCircle2 } from 'lucide-react';

const App = () => {
  const API_URL = "https://aroi-payroll-backend.onrender.com";
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showReport, setShowReport] = useState(false);
  const [startDate, setStartDate] = useState('2026-03-09');
  const [isSyncing, setIsSyncing] = useState(false);

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

  const ReportOverlay = () => {
    if (!showReport) return null;
    const shops = ["Maruay Thai", "PAD Thai Food", "Other"];
    
    return (
      <div className="fixed inset-0 z-[500] bg-white overflow-y-auto p-8">
        <div className="max-w-6xl mx-auto">
          <div className="flex justify-between items-center border-b-2 pb-6 mb-8">
            <h1 className="text-3xl font-black uppercase">Finance Manifest</h1>
            <button onClick={() => setShowReport(false)} className="bg-slate-900 text-white p-3 rounded-2xl"><X size={24}/></button>
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
                <h2 className="text-2xl font-black uppercase mb-6">{shop}</h2>
                <div className="bg-white rounded-3xl border overflow-hidden">
                  <table className="w-full text-left">
                    <thead className="bg-slate-50 text-[10px] uppercase font-black">
                      <tr>
                        <th className="p-4">Staff Member</th>
                        <th className="p-4 text-right">Hrs</th>
                        <th className="p-4 text-right bg-slate-100 font-black">Total Payment</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {filtered.map(emp => {
                        const hrs = emp.daily.reduce((acc, d) => acc + d.r, 0);
                        const total$ = (emp.daily.reduce((acc, d, i) => acc + (d.r * (i % 7 < 5 ? emp.rate_weekday : emp.rate_weekend)), 0)) + (emp.extra[0] + emp.extra[1]);
                        return (
                          <tr key={emp.id}>
                            <td className="p-4 font-black uppercase text-[12px]">{emp.name}</td>
                            <td className="p-4 text-right font-mono text-slate-500">{hrs.toFixed(1)}</td>
                            <td className="p-4 text-right font-black text-sm bg-slate-50/50">${total$.toFixed(2)}</td>
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
    <div className="min-h-screen bg-[#F1F5F9] p-4">
      <div className="flex justify-between items-center mb-4 bg-white p-3 rounded-2xl shadow-sm">
        <div className="flex items-center gap-4">
          <h1 className="text-sm font-black uppercase">Aroi Payroll</h1>
          <button onClick={() => setShowReport(true)} className="px-5 py-2.5 bg-indigo-600 text-white rounded-xl font-black text-[10px]">Report</button>
        </div>
      </div>
      {/* Grid rendering remains same as stable version */}
      <ReportOverlay />
    </div>
  );
};
export default App;