import React, { useState, useEffect } from 'react';
import './App.css';

const API_BASE = "https://your-render-backend-link.onrender.com"; // Replace with your actual Render URL

const App = () => {
  const [view, setView] = useState('roster'); // Toggle: 'roster' or 'finance'
  const [data, setData] = useState([]);
  const [startDate, setStartDate] = useState('2026-03-23');
  const [loading, setLoading] = useState(false);

  // 1. Fetch Roster & Finance Data
  const fetchData = async () => {
    setLoading(true);
    try {
      const resp = await fetch(`${API_BASE}/api/payroll-data?start=${startDate}`);
      const json = await resp.json();
      setData(json);
    } catch (err) {
      console.error("Fetch error:", err);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, [startDate]);

  // 2. Trigger ABA Download
  const downloadABA = async (shopName) => {
    // We send shop details to the backend to generate the specific file
    const shopStaff = data.filter(s => s.shop === shopName && s.pay_type === 'TFN');
    
    // Note: In a production app, you'd pull these bank details from your Sheet
    const bankDetails = shopName === "Maruay Thai" 
      ? { bsb: "062000", acc: "12345678", apca: "123456", payer: "MARUAY THAI PTY LTD" }
      : { bsb: "062111", acc: "87654321", apca: "654321", payer: "PAD THAI FOOD PTY LTD" };

    const resp = await fetch(`${API_BASE}/api/download-aba`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        shop: shopName, 
        staff: shopStaff, 
        ...bankDetails 
      })
    });

    const blob = await resp.blob();
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `Payroll_${shopName}_${startDate}.aba`);
    document.body.appendChild(link);
    link.click();
    link.parentNode.removeChild(link);
  };

  return (
    <div className="payroll-container">
      {/* Header & Controls */}
      <header className="app-header">
        <h1>Aroi Payroll Command Center</h1>
        <div className="nav-controls">
          <input 
            type="date" 
            value={startDate} 
            onChange={(e) => setStartDate(e.target.value)} 
          />
          <button 
            className={view === 'roster' ? 'active' : ''} 
            onClick={() => setView('roster')}
          >
            📅 Roster View
          </button>
          <button 
            className={view === 'finance' ? 'active green' : ''} 
            onClick={() => setView('finance')}
          >
            💰 Finance Report
          </button>
        </div>
      </header>

      {loading ? (
        <div className="loader">Loading payroll data...</div>
      ) : (
        <main>
          {view === 'roster' ? (
            <RosterView data={data} />
          ) : (
            <FinanceView data={data} onDownload={downloadABA} />
          )}
        </main>
      )}
    </div>
  );
};

// --- SUB-COMPONENT: ROSTER VIEW ---
const RosterView = ({ data }) => (
  <div className="roster-grid">
    <table className="payroll-table">
      <thead>
        <tr>
          <th>Team Member</th>
          <th>Mon-Fri Hours</th>
          <th>Sat-Sun Hours</th>
          <th>Status</th>
        </tr>
      </thead>
      <tbody>
        {data.map(emp => (
          <tr key={emp.id}>
            <td><strong>{emp.name}</strong></td>
            <td>{emp.hours.weekday}h</td>
            <td>{emp.hours.weekend}h</td>
            <td><span className={`badge ${emp.pay_type}`}>{emp.pay_type}</span></td>
          </tr>
        ))}
      </tbody>
    </table>
  </div>
);

// --- SUB-COMPONENT: FINANCE VIEW ---
const FinanceView = ({ data, onDownload }) => {
  const shops = ["Maruay Thai", "PAD Thai Food"];

  return (
    <div className="finance-report">
      {shops.map(shop => {
        const shopStaff = data.filter(s => s.shop === shop);
        const shopTotal = shopStaff.reduce((sum, s) => sum + s.payout.total, 0);

        return (
          <section key={shop} className="shop-section">
            <div className="shop-header">
              <h2>{shop}</h2>
              <button className="aba-btn" onClick={() => onDownload(shop)}>
                📥 Download {shop} ABA
              </button>
            </div>
            
            <table className="payroll-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Weekday $</th>
                  <th>Weekend $</th>
                  <th>Extra $</th>
                  <th>Total Payout</th>
                  <th>Paid</th>
                </tr>
              </thead>
              <tbody>
                {shopStaff.map(s => (
                  <tr key={s.id}>
                    <td>{s.name}</td>
                    <td>${s.payout.weekday.toFixed(2)}</td>
                    <td>${s.payout.weekend.toFixed(2)}</td>
                    <td>${s.payout.extra.toFixed(2)}</td>
                    <td className="grand-total">${s.payout.total.toLocaleString()}</td>
                    <td><input type="checkbox" className="pay-check" /></td>
                  </tr>
                ))}
                <tr className="footer-row">
                  <td colSpan="4" align="right"><strong>Shop Grand Total:</strong></td>
                  <td colSpan="2"><strong>${shopTotal.toLocaleString()}</strong></td>
                </tr>
              </tbody>
            </table>
          </section>
        );
      })}
    </div>
  );
};

export default App;