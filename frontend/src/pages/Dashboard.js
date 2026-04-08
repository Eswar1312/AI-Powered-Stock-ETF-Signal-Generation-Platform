import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import Card from "../components/Card";
import SignalBadge from "../components/SignalBadge";
import { fetchSignal } from "../utils/api";
import { currencySymbolForTicker, formatPrice } from "../utils/currency";

const WATCHLIST = [
  { ticker: "NIFTYBEES.NS", name: "Nifty BeES" },
  { ticker: "RELIANCE.NS", name: "Reliance" },
  { ticker: "TCS.NS", name: "TCS" },
  { ticker: "AAPL", name: "Apple" },
  { ticker: "SPY", name: "S&P 500 ETF" },
];

const FEATURES = [
  { icon: "⚡", title: "ML Signal Engine", desc: "Ensemble Random Forest + Gradient Boosting model generates BUY / HOLD / SELL signals with confidence scores." },
  { icon: "◷", title: "Signal Confidence", desc: "Each BUY / HOLD / SELL output includes a confidence score and indicator-driven reasoning." },
  { icon: "◎", title: "Backtesting", desc: "Sharpe ratio, max drawdown, win rate and equity curve on full historical data." },
  { icon: "●", title: "Real-Time Alerts", desc: "Set price threshold alerts for any ticker. Configurable conditions and email notifications." },
  { icon: "◻", title: "Portfolio Tracker", desc: "Track holdings, P&L, and get ML signals for all positions from one dashboard." },
  { icon: "◈", title: "Core Indicators", desc: "RSI, MACD, Bollinger Bands, ATR, MA10/20/50, volatility and lag returns." },
];

export default function Dashboard() {
  const navigate = useNavigate();
  const [quickResults, setQuickResults] = useState({});
  const [loading, setLoading] = useState({});

  const analyze = async (ticker) => {
    setLoading((p) => ({ ...p, [ticker]: true }));
    try {
      const data = await fetchSignal(ticker);
      setQuickResults((p) => ({ ...p, [ticker]: data }));
    } catch {
      setQuickResults((p) => ({ ...p, [ticker]: { error: true } }));
    } finally {
      setLoading((p) => ({ ...p, [ticker]: false }));
    }
  };

  return (
    <div>
      {/* Hero */}
      <div style={{ marginBottom: "40px" }}>
        <div style={{
          fontFamily: "var(--font-display)",
          fontWeight: 800,
          fontSize: "clamp(28px, 4vw, 48px)",
          lineHeight: 1.1,
          letterSpacing: "-0.02em",
          marginBottom: "12px",
        }}>
          YourStock AI
          <br />
          <span style={{ color: "var(--text-secondary)", fontWeight: 400, fontSize: "60%" }}>
            AI-Powered Stock & ETF Intelligence
          </span>
        </div>
        <p style={{ color: "var(--text-secondary)", fontSize: "14px", maxWidth: "500px", lineHeight: 1.7 }}>
          Machine learning ensemble models analyze core technical indicators to generate
          real-time BUY / HOLD / SELL signals with confidence scores.
        </p>
        <div style={{ display: "flex", gap: "12px", marginTop: "20px" }}>
          <button
            onClick={() => navigate("/signal")}
            style={{
              background: "var(--accent-green)",
              color: "#000",
              border: "none",
              padding: "12px 24px",
              fontFamily: "var(--font-display)",
              fontWeight: 700,
              fontSize: "14px",
              borderRadius: "4px",
              cursor: "pointer",
            }}
          >
            ⚡ Run Signal Analysis
          </button>
          <button
            onClick={() => navigate("/backtest")}
            style={{
              background: "transparent",
              color: "var(--text-primary)",
              border: "1px solid var(--border)",
              padding: "12px 24px",
              fontFamily: "var(--font-display)",
              fontWeight: 700,
              fontSize: "14px",
              borderRadius: "4px",
              cursor: "pointer",
            }}
          >
            ◷ Backtester
          </button>
        </div>
      </div>

      {/* Stats row */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "16px", marginBottom: "32px" }}>
        {[
          { label: "Models", value: "2 Ensemble", color: "var(--accent-green)" },
          { label: "Indicators", value: "Core Set", color: "var(--accent-blue)" },
          { label: "Market Data", value: "Yahoo Live", color: "var(--accent-yellow)" },
          { label: "Signals", value: "BUY/HOLD/SELL", color: "var(--accent-red)" },
        ].map((s) => (
          <div key={s.label} style={{
            background: "var(--bg-card)",
            border: "1px solid var(--border)",
            borderRadius: "6px",
            padding: "16px",
          }}>
            <div style={{ fontSize: "11px", color: "var(--text-dim)", marginBottom: "6px" }}>{s.label}</div>
            <div style={{ fontFamily: "var(--font-display)", fontWeight: 800, fontSize: "18px", color: s.color }}>
              {s.value}
            </div>
          </div>
        ))}
      </div>

      {/* Quick Watchlist */}
      <Card title="Quick Watchlist" subtitle="Click Analyze for instant ML signal" style={{ marginBottom: "32px" }}>
        <div style={{ display: "grid", gap: "10px" }}>
          {WATCHLIST.map((w) => {
            const res = quickResults[w.ticker];
            const isLoading = loading[w.ticker];
            const symbol = currencySymbolForTicker(w.ticker);
            return (
              <div key={w.ticker} style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "12px 16px",
                background: "var(--bg-elevated)",
                borderRadius: "4px",
                border: "1px solid var(--border)",
              }}>
                <div>
                  <div style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: "14px" }}>{w.ticker}</div>
                  <div style={{ fontSize: "11px", color: "var(--text-dim)" }}>{w.name}</div>
                </div>

                <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
                  {res && !res.error && (
                    <>
                      <div style={{ textAlign: "right" }}>
                        <div style={{ fontSize: "14px", fontWeight: 700 }}>{formatPrice(res.current_price, symbol)}</div>
                      </div>
                      <SignalBadge signal={res.signal} confidence={res.confidence} />
                    </>
                  )}
                  {res?.error && <span style={{ fontSize: "11px", color: "var(--accent-red)" }}>Error</span>}
                  <button
                    onClick={() => analyze(w.ticker)}
                    disabled={isLoading}
                    style={{
                      background: "transparent",
                      border: "1px solid var(--accent-green)",
                      color: "var(--accent-green)",
                      padding: "6px 14px",
                      fontFamily: "var(--font-mono)",
                      fontSize: "11px",
                      borderRadius: "3px",
                      cursor: isLoading ? "not-allowed" : "pointer",
                      opacity: isLoading ? 0.5 : 1,
                    }}
                  >
                    {isLoading ? "..." : "Analyze"}
                  </button>
                  <button
                    onClick={() => navigate(`/signal?ticker=${w.ticker}`)}
                    style={{
                      background: "transparent",
                      border: "1px solid var(--border)",
                      color: "var(--text-secondary)",
                      padding: "6px 10px",
                      fontFamily: "var(--font-mono)",
                      fontSize: "11px",
                      borderRadius: "3px",
                      cursor: "pointer",
                    }}
                  >
                    View →
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </Card>

      {/* Feature grid */}
      <div style={{ marginBottom: "16px" }}>
        <div style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: "14px", letterSpacing: "0.05em", color: "var(--text-secondary)", textTransform: "uppercase", marginBottom: "16px" }}>
          Platform Modules
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "16px" }}>
          {FEATURES.map((f) => (
            <div key={f.title} style={{
              background: "var(--bg-card)",
              border: "1px solid var(--border)",
              borderRadius: "6px",
              padding: "20px",
            }}>
              <div style={{ fontSize: "24px", marginBottom: "8px" }}>{f.icon}</div>
              <div style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: "14px", marginBottom: "6px" }}>{f.title}</div>
              <div style={{ fontSize: "12px", color: "var(--text-secondary)", lineHeight: 1.6 }}>{f.desc}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
