// Version: 2603271105-REPORT-ALPHA
import React, { useState, useEffect } from 'react';
import { ChevronLeft, Download, Copy, Store, Wallet, Users, Printer, Loader2 } from 'lucide-react';

const ReportPage = () => {
    const [reportData, setReportData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [startDate, setStartDate] = useState(new URLSearchParams(window.location.search).get('start') || '2026-03-09');
    const API_URL = import.meta.env.VITE_API_URL || "https://aroi-payroll-backend.onrender.com";

    useEffect(() => {
        const fetchReport = async () => {
            setLoading(true);
            try {
                const res = await fetch(`${API_URL}/api/payroll-report?start=${startDate}`);
                const data = await res.json();
                setReportData(data);
            } catch (err) { console.error("Report Fetch Error:", err); }
            finally { setLoading(false); }
        };
        fetchReport();
    }, [startDate]);

    if (loading) return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center font-sans">
            <div className="text-center">
                <Loader2 className="animate-spin text-emerald-600 mx-auto mb-4" size={32} />
                <p className="font-black text-slate-900 uppercase tracking-widest text-xs">Generating Reports...</p>
            </div>
        </div>
    );

    return (
        <div className="min-h-screen bg-[#F8FAFC] p-6 font-sans antialiased text-slate-800">
            {/* Header */}
            <div className="max-w-6xl mx-auto flex justify-between items-end mb-8">
                <div>
                    <button onClick={() => window.location.href = '/'} className="flex items-center gap-1 text-slate-400 hover:text-slate-900 transition-colors mb-2 font-bold text-[10px] uppercase">
                        <ChevronLeft size={14} /> Back to Grid
                    </button>
                    <h1 className="text-2xl font-black tracking-tighter text-slate-900 uppercase">Payroll Summary</h1>
                    <p className="text-slate-500 font-medium text-xs uppercase tracking-widest">Fortnight: {startDate}</p>
                </div>
                <div className="flex gap-2">
                   <button onClick={() => window.print()} className="bg-white border border-slate-200 p-2.5 rounded-xl hover:bg-slate-50 shadow-sm transition-all"><Printer size={18}/></button>
                </div>
            </div>

            <div className="max-w-6xl mx-auto space-y-12">
                {Object.entries(reportData || {}).map(([shopName, categories]) => (
                    <div key={shopName} className="space-y-6">
                        <div className="flex items-center gap-3 border-b-2 border-slate-900 pb-2">
                            <Store className="text-emerald-600" size={20} />
                            <h2 className="text-xl font-black uppercase tracking-tight">{shopName}</h2>
                        </div>

                        {/* TFN SECTION */}
                        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                            <div className="bg-slate-900 px-4 py-2 flex justify-between items-center text-white">
                                <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest">
                                    <Users size={14} className="text-emerald-400" /> TFN Payroll (ABA Eligible)
                                </div>
                                <button className="bg-emerald-600 hover:bg-emerald-500 text-[9px] font-black px-3 py-1 rounded-lg transition-all flex items-center gap-1 uppercase">
                                    <Download size={12}/> Export ABA
                                </button>
                            </div>
                            <table className="w-full text-left text-[11px]">
                                <thead className="bg-slate-50 border-b border-slate-100 text-slate-400 font-bold uppercase">
                                    <tr>
                                        <th className="p-4">Name</th>
                                        <th className="p-4 text-center">Rate (Wk/We)</th>
                                        <th className="p-4 text-center">Hrs (Wk)</th>
                                        <th className="p-4 text-center">Hrs (We)</th>
                                        <th className="p-4 text-right">Gross Pay</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-50">
                                    {categories.TFN.map((emp, i) => (
                                        <tr key={i} className="hover:bg-slate-50/50 transition-colors">
                                            <td className="p-4 font-black text-slate-900 uppercase">{emp.name}</td>
                                            <td className="p-4 text-center text-slate-500 font-mono">${emp.rate_wk} / ${emp.rate_we}</td>
                                            <td className="p-4 text-center font-bold text-slate-700">{emp.hrs_wk}</td>
                                            <td className="p-4 text-center font-bold text-slate-700">{emp.hrs_we}</td>
                                            <td className="p-4 text-right font-black text-emerald-700 text-sm">${emp.total.toFixed(2)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        {/* DIRECT SECTION */}
                        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                            <div className="bg-blue-900 px-4 py-2 flex justify-between items-center text-white">
                                <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest">
                                    <Wallet size={14} className="text-blue-300" /> Direct Payments (Manual)
                                </div>
                                <button className="bg-blue-700 hover:bg-blue-600 text-[9px] font-black px-3 py-1 rounded-lg transition-all flex items-center gap-1 uppercase">
                                    <Copy size={12}/> Copy Summary
                                </button>
                            </div>
                            <table className="w-full text-left text-[11px]">
                                <thead className="bg-slate-50 border-b border-slate-100 text-slate-400 font-bold uppercase">
                                    <tr>
                                        <th className="p-4">Name</th>
                                        <th className="p-4 text-center">Hrs (Total)</th>
                                        <th className="p-4 text-center">Extra $</th>
                                        <th className="p-4 text-right">Total Due</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-50">
                                    {categories.Direct.map((emp, i) => (
                                        <tr key={i} className="hover:bg-slate-50/50 transition-colors">
                                            <td className="p-4 font-black text-slate-900 uppercase">{emp.name}</td>
                                            <td className="p-4 text-center font-bold text-slate-700">{emp.hrs_wk + emp.hrs_we}</td>
                                            <td className="p-4 text-center font-bold text-orange-600">${emp.extra.toFixed(2)}</td>
                                            <td className="p-4 text-right font-black text-blue-800 text-sm">${emp.total.toFixed(2)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default ReportPage;