import React, { useState, useEffect } from "react";
import toast from "react-hot-toast";
import Card from "../components/Card";
import { fetchAlerts, fetchAlertsHistory, fetchWatchlist, createAlert, deleteAlert, sendAlertsTestEmail } from "../utils/api";
import { currencySymbolForTicker } from "../utils/currency";

const FALLBACK_WATCHLIST = [
  { ticker: "NIFTYBEES.NS", name: "Nifty BeES ETF" },
  { ticker: "RELIANCE.NS", name: "Reliance Industries" },
  { ticker: "TCS.NS", name: "TCS" },
  { ticker: "INFY.NS", name: "Infosys" },
  { ticker: "AAPL", name: "Apple Inc." },
  { ticker: "MSFT", name: "Microsoft" },
  { ticker: "GOOGL", name: "Alphabet" },
  { ticker: "SPY", name: "S&P 500 ETF" },
];

const thresholdPlaceholder = (condition, ticker) => {
  const symbol = currencySymbolForTicker(ticker || "");
  if (condition === "change_pct") {
    return "e.g. 2 (percent change)";
  }
  if (condition === "above") {
    return symbol === "₹" ? "e.g. 2500 (₹ target price)" : "e.g. 200 ($ target price)";
  }
  return symbol === "₹" ? "e.g. 2200 (₹ target price)" : "e.g. 180 ($ target price)";
};

export default function AlertsPage() {
  const [alerts, setAlerts] = useState([]);
  const [history, setHistory] = useState([]);
  const [watchlist, setWatchlist] = useState(FALLBACK_WATCHLIST);
  const [form, setForm] = useState({ ticker: "", condition: "above", threshold: "", email: "" });
  const [loading, setLoading] = useState(false);
  const [sendingTest, setSendingTest] = useState(false);

  const loadAlerts = async () => {
    try {
      const [activeAlerts, historyRows] = await Promise.all([
        fetchAlerts(),
        fetchAlertsHistory(),
      ]);
      setAlerts(activeAlerts);
      setHistory(historyRows);
    } catch {}
  };

  const loadWatchlist = async () => {
    try {
      const list = await fetchWatchlist();
      if (Array.isArray(list) && list.length > 0) {
        setWatchlist(list);
      }
    } catch {
      setWatchlist(FALLBACK_WATCHLIST);
    }
  };

  useEffect(() => {
    loadAlerts();
    loadWatchlist();
  }, []);

  useEffect(() => {
    if (!form.ticker && watchlist.length > 0) {
      setForm((f) => ({ ...f, ticker: watchlist[0].ticker }));
    }
  }, [watchlist, form.ticker]);

  const submit = async () => {
    const ticker = form.ticker.trim().toUpperCase();
    if (!ticker || !form.threshold) {
      toast.error("Select a ticker and enter threshold");
      return;
    }

    setLoading(true);
    try {
      await createAlert({ ...form, ticker });
      toast.success("Alert created!");
      setForm({ ticker: "", condition: "above", threshold: "", email: "" });
      loadAlerts();
    } catch (e) {
      toast.error(e.response?.data?.error || "Failed to create alert");
    } finally {
      setLoading(false);
    }
  };

  const remove = async (id) => {
    try {
      await deleteAlert(id);
      setAlerts((a) => a.filter((x) => x.id !== id));
      toast.success("Alert removed");
    } catch {
      toast.error("Failed to remove alert");
    }
  };

  const sendTestAlert = async () => {
    setSendingTest(true);
    try {
      const result = await sendAlertsTestEmail();
      toast.success(result.message || "Test alert sent to your email");
      loadAlerts();
    } catch (e) {
      toast.error(e.response?.data?.error || "Failed to send test alert");
    } finally {
      setSendingTest(false);
    }
  };

  const inputStyle = {
    background: "var(--bg-elevated)",
    border: "1px solid var(--border)",
    color: "var(--text-primary)",
    padding: "10px 14px",
    fontFamily: "var(--font-mono)",
    fontSize: "13px",
    borderRadius: "4px",
    outline: "none",
    width: "100%",
  };

  const inOptions = watchlist.filter((w) => String(w.ticker || "").toUpperCase().endsWith(".NS") || String(w.ticker || "").toUpperCase().endsWith(".BO"));
  const usOptions = watchlist.filter((w) => !String(w.ticker || "").toUpperCase().endsWith(".NS") && !String(w.ticker || "").toUpperCase().endsWith(".BO"));
  const pendingCount = alerts.filter((a) => a.status === "active").length;
  const sentCount = alerts.filter((a) => a.status === "triggered").length;

  return (
    <div>
      <div style={{ marginBottom: "28px" }}>
        <h1 style={{ fontFamily: "var(--font-display)", fontWeight: 800, fontSize: "24px", marginBottom: "4px" }}>
          ◎ Price Alerts
        </h1>
        <p style={{ color: "var(--text-secondary)", fontSize: "13px" }}>
          Set threshold-based price alerts for any ticker
        </p>
      </div>

      {/* Create Alert */}
      <Card title="Create New Alert" style={{ marginBottom: "24px" }}>
        <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: "10px" }}>
          <button
            onClick={sendTestAlert}
            disabled={sendingTest}
            style={{
              background: "transparent",
              border: "1px solid var(--accent-blue)",
              color: "var(--accent-blue)",
              padding: "6px 12px",
              fontFamily: "var(--font-mono)",
              fontSize: "11px",
              borderRadius: "3px",
              cursor: sendingTest ? "not-allowed" : "pointer",
              opacity: sendingTest ? 0.6 : 1,
            }}
          >
            {sendingTest ? "Sending..." : "Send Test Alert to My Email"}
          </button>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr 2fr auto", gap: "12px", alignItems: "end" }}>
          <div>
            <label style={{ fontSize: "11px", color: "var(--text-dim)", display: "block", marginBottom: "6px" }}>TICKER</label>
            <select
              value={form.ticker}
              onChange={(e) => setForm((f) => ({ ...f, ticker: e.target.value, threshold: "" }))}
              style={inputStyle}
            >
              <option value="" disabled>Select ticker</option>
              {inOptions.length > 0 && (
                <optgroup label="India Stocks/ETFs">
                  {inOptions.map((w) => (
                    <option key={w.ticker} value={w.ticker}>{w.ticker} - {w.name || w.ticker}</option>
                  ))}
                </optgroup>
              )}
              {usOptions.length > 0 && (
                <optgroup label="US Stocks/ETFs">
                  {usOptions.map((w) => (
                    <option key={w.ticker} value={w.ticker}>{w.ticker} - {w.name || w.ticker}</option>
                  ))}
                </optgroup>
              )}
            </select>
          </div>
          <div>
            <label style={{ fontSize: "11px", color: "var(--text-dim)", display: "block", marginBottom: "6px" }}>CONDITION</label>
            <select
              value={form.condition}
              onChange={(e) => setForm((f) => ({ ...f, condition: e.target.value }))}
              style={{ ...inputStyle }}
            >
              <option value="above">Price Above</option>
              <option value="below">Price Below</option>
              <option value="change_pct">% Change</option>
            </select>
          </div>
          <div>
            <label style={{ fontSize: "11px", color: "var(--text-dim)", display: "block", marginBottom: "6px" }}>THRESHOLD</label>
            <input
              value={form.threshold}
              onChange={(e) => setForm((f) => ({ ...f, threshold: e.target.value }))}
              placeholder={thresholdPlaceholder(form.condition, form.ticker)}
              type="number"
              style={inputStyle}
            />
          </div>
          <div>
            <label style={{ fontSize: "11px", color: "var(--text-dim)", display: "block", marginBottom: "6px" }}>EMAIL (optional, defaults to your account)</label>
            <input
              value={form.email}
              onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
              placeholder="alerts@youremail.com"
              type="email"
              style={inputStyle}
            />
          </div>
          <button
            onClick={submit}
            disabled={loading}
            style={{
              background: "var(--accent-green)",
              color: "#000",
              border: "none",
              padding: "10px 20px",
              fontFamily: "var(--font-display)",
              fontWeight: 700,
              fontSize: "13px",
              borderRadius: "4px",
              cursor: "pointer",
              whiteSpace: "nowrap",
            }}
          >
            + Add Alert
          </button>
        </div>
      </Card>

      {/* Alert List */}
      <Card title="My Alerts" subtitle={`${alerts.length} total · ${pendingCount} pending · ${sentCount} sent`}>
        {alerts.length === 0 ? (
          <div style={{ textAlign: "center", padding: "40px", color: "var(--text-dim)", fontSize: "13px" }}>
            No alerts yet. Create one above.
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            {alerts.map((a) => (
              
              <div key={a.id} style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                padding: "14px 16px",
                background: "var(--bg-elevated)",
                border: "1px solid var(--border)",
                borderRadius: "4px",
              }}>
                <div style={{ display: "flex", gap: "24px", alignItems: "center" }}>
                  <div>
                    <div style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: "14px" }}>{a.ticker}</div>
                    <div style={{ fontSize: "11px", color: "var(--text-dim)" }}>
                      {new Date(a.createdAt).toLocaleDateString()}
                    </div>
                  </div>
                  <div style={{
                    background: "var(--accent-yellow-dim)",
                    border: "1px solid var(--accent-yellow)",
                    color: "var(--accent-yellow)",
                    padding: "4px 12px",
                    borderRadius: "3px",
                    fontSize: "12px",
                  }}>
                    {a.condition === "above" ? "▲" : a.condition === "below" ? "▼" : "~"} {a.condition} {a.condition === "change_pct" ? `${a.threshold}%` : `${currencySymbolForTicker(a.ticker)}${a.threshold}`}
                  </div>
                  <div style={{
                    background: a.status === "triggered" ? "var(--accent-green-dim)" : "var(--accent-blue-dim)",
                    border: `1px solid ${a.status === "triggered" ? "var(--accent-green)" : "var(--accent-blue)"}`,
                    color: a.status === "triggered" ? "var(--accent-green)" : "var(--accent-blue)",
                    padding: "4px 12px",
                    borderRadius: "3px",
                    fontSize: "12px",
                    fontWeight: 700,
                  }}>
                    {a.status === "triggered" ? "Sent" : "Pending"}
                  </div>
                  {a.email && (
                    <div style={{ fontSize: "12px", color: "var(--text-secondary)" }}>
                      📧 {a.email}
                    </div>
                  )}
                  {a.status === "triggered" && a.triggeredAt && (
                    <div style={{ fontSize: "11px", color: "var(--text-dim)" }}>
                      Sent at {new Date(a.triggeredAt).toLocaleString()}
                    </div>
                  )}
                </div>
                {a.status === "active" ? (
                  <button
                    onClick={() => remove(a.id)}
                    style={{
                      background: "transparent",
                      border: "1px solid var(--accent-red)",
                      color: "var(--accent-red)",
                      padding: "6px 14px",
                      fontFamily: "var(--font-mono)",
                      fontSize: "11px",
                      borderRadius: "3px",
                      cursor: "pointer",
                    }}
                  >
                    Remove
                  </button>
                ) : (
                  <div style={{ fontSize: "11px", color: "var(--text-dim)" }}>
                    Delivered
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </Card>

      <Card title="Alert History" subtitle={`${history.length} event(s)`} style={{ marginTop: "24px" }}>
        {history.length === 0 ? (
          <div style={{ textAlign: "center", padding: "26px", color: "var(--text-dim)", fontSize: "13px" }}>
            No alert history yet.
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            {history.slice(0, 30).map((h) => (
              <div key={h._id} style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                padding: "12px 14px",
                background: "var(--bg-elevated)",
                border: "1px solid var(--border)",
                borderRadius: "4px",
              }}>
                <div>
                  <div style={{ fontSize: "13px", color: "var(--text-primary)", fontWeight: 700 }}>
                    {h.ticker} · {h.eventType.toUpperCase()}
                  </div>
                  <div style={{ fontSize: "11px", color: "var(--text-dim)", marginTop: "3px" }}>
                    {h.message || "Updated"}
                  </div>
                </div>
                <div style={{ fontSize: "11px", color: "var(--text-secondary)" }}>
                  {new Date(h.eventAt).toLocaleString()}
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Info */}
      <Card style={{ marginTop: "24px" }}>
        <div style={{ fontSize: "12px", color: "var(--text-secondary)", lineHeight: 1.8 }}>
          <strong style={{ color: "var(--text-primary)" }}>◎ How Alerts Work:</strong> Alerts are evaluated against live market data each hour during market hours (9AM–4PM, Mon–Fri).
          Email notifications require a configured SMTP server in the backend <code style={{ color: "var(--accent-blue)" }}>.env</code> file.
          SMS/Slack alerts can be enabled via the backend alert service with API credentials.
        </div>
      </Card>
    </div>
  );
}
