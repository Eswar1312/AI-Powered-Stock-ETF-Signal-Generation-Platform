import React, { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import toast from "react-hot-toast";
import Card from "../components/Card";
import TickerSearch from "../components/TickerSearch";
import SignalBadge from "../components/SignalBadge";
import PriceChart from "../components/PriceChart";
import IndicatorPanel from "../components/IndicatorPanel";
import SubCharts from "../components/SubCharts";
import Loader from "../components/Loader";
import { fetchLivePrice, fetchSignal, savePrediction } from "../utils/api";
import { useAuth } from "../context/AuthContext";
import { currencySymbolForRegion, currencySymbolForTicker, formatPrice } from "../utils/currency";

export default function SignalPage() {
  const [params] = useSearchParams();
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [activeTicker, setActiveTicker] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const REFRESH_INTERVAL = 1000; // 1 second
  const [saving, setSaving] = useState(false);
  const [savedId, setSavedId] = useState(null);
  const { user } = useAuth();
  const priceSymbol = result
    ? currencySymbolForRegion(result?.market?.region) || currencySymbolForTicker(result?.ticker)
    : "$";

  const saveSignal = async () => {
    if (!result || saving) return;
    setSaving(true);
    try {
      const note = window.prompt("Add a note (optional):", "") ?? "";
      const saved = await savePrediction({ ...result, note });
      setSavedId(saved._id);
      const toast = (await import("react-hot-toast")).default;
      toast.success("Prediction saved to your collection!");
    } catch (e) {
      const toast = (await import("react-hot-toast")).default;
      toast.error("Failed to save — are you signed in?");
    } finally {
      setSaving(false);
    }
  };

  const analyze = async (ticker) => {
    setLoading(true);
    setError(null);
    setResult(null);
    setActiveTicker(ticker);
    setSavedId(null);
    try {
      const data = await fetchSignal(ticker);
      setResult(data);
      setLastUpdated(new Date());
      toast.success(`Signal generated: ${data.signal}`);
    } catch (e) {
      const msg = e.response?.data?.error || e.message;
      setError(msg);
      toast.error("Analysis failed: " + msg);
    } finally {
      setLoading(false);
    }
  };

  const applyLivePriceToResult = (base, livePrice) => {
    if (!base || !Number.isFinite(livePrice) || livePrice <= 0) return base;
    return { ...base, current_price: livePrice };
  };

  // Silent price refresh — updates live price without rerunning ML.
  const refreshPrice = async () => {
    if (!activeTicker || loading || refreshing) return;
    setRefreshing(true);
    try {
      const quote = await fetchLivePrice(activeTicker);
      if (Number.isFinite(quote?.current_price)) {
        setResult((prev) => applyLivePriceToResult(prev, Number(quote.current_price)));
      }
      setLastUpdated(new Date());
    } catch {}
    finally { setRefreshing(false); }
  };

  // Auto-refresh every second when a ticker is active.
  useEffect(() => {
    if (!activeTicker) return;
    const interval = setInterval(refreshPrice, REFRESH_INTERVAL);
    return () => clearInterval(interval);
  }, [activeTicker, loading, refreshing]);

  useEffect(() => {
    const t = params.get("ticker");
    if (t) analyze(t);
  }, []);

  const signalAccent = result?.signal === "BUY"
    ? "var(--accent-green)"
    : result?.signal === "SELL"
    ? "var(--accent-red)"
    : "var(--accent-yellow)";

  return (
    <div>
      {/* Header */}
      <div style={{ marginBottom: "28px", display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div>
          <h1 style={{ fontFamily: "var(--font-display)", fontWeight: 800, fontSize: "24px", marginBottom: "4px" }}>
            ⚡ Signal Engine
          </h1>
          <p style={{ color: "var(--text-secondary)", fontSize: "13px" }}>
            ML ensemble analysis · Random Forest + Gradient Boosting · core technical features
          </p>
        </div>
        {activeTicker && (
          <div style={{ textAlign: "right" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px", justifyContent: "flex-end" }}>
              <div style={{
                width: "8px", height: "8px", borderRadius: "50%",
                background: "var(--accent-green)",
                animation: "pulse 1.5s ease-in-out infinite",
              }} />
              <span style={{ fontSize: "11px", color: "var(--accent-green)", fontWeight: 700 }}>
                LIVE
              </span>
            </div>
            {lastUpdated && (
              <div style={{ fontSize: "11px", color: "var(--text-dim)", marginTop: "4px" }}>
                Updated {lastUpdated.toLocaleTimeString()} · auto-refresh 1s
              </div>
            )}
            {result?.market && (
              <div style={{ fontSize: "11px", color: "var(--text-dim)", marginTop: "4px" }}>
                Market: {result.market.region} ({result.market.timezone})
              </div>
            )}
            <button
              onClick={refreshPrice}
              disabled={refreshing || loading}
              style={{
                marginTop: "6px",
                background: "transparent",
                border: "1px solid var(--border)",
                color: "var(--text-secondary)",
                padding: "4px 12px",
                fontFamily: "var(--font-mono)",
                fontSize: "11px",
                borderRadius: "3px",
                cursor: "pointer",
              }}
            >
              ↻ Refresh Now
            </button>
          </div>
        )}
      </div>

      {/* Search */}
      <Card style={{ marginBottom: "24px" }}>
        <TickerSearch onSearch={analyze} loading={loading} />
      </Card>

      {loading && <Loader message="Training model and computing signal..." />}

      {error && (
        <div style={{
          background: "var(--accent-red-dim)",
          border: "1px solid var(--accent-red)",
          color: "var(--accent-red)",
          padding: "16px",
          borderRadius: "4px",
          fontSize: "13px",
          marginBottom: "24px",
        }}>
          ⚠ {error}
        </div>
      )}

      {result && !loading && (
        <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>

          {/* Signal Hero Card */}
          <Card accent={signalAccent}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: "24px", alignItems: "center" }}>
              <div>
                <div style={{ fontSize: "11px", color: "var(--text-dim)", letterSpacing: "0.1em", marginBottom: "8px" }}>
                  {result.ticker} · AI SIGNAL
                </div>
                <div style={{ fontFamily: "var(--font-display)", fontWeight: 800, fontSize: "32px", letterSpacing: "-0.02em", marginBottom: "12px" }}>
                  {formatPrice(result.current_price, priceSymbol)}
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(3, auto)", gap: "24px" }}>
                  <Stat label="RSI (14)" value={result.indicators?.rsi?.toFixed(1)} />
                  <Stat label="MACD Hist" value={result.indicators?.macd_hist?.toFixed(4)} />
                  <Stat label="Market" value={result.market?.status || "--"} />
                </div>
              </div>
              <div style={{ textAlign: "center", display: "flex", flexDirection: "column", alignItems: "center", gap: "14px" }}>
                <SignalBadge signal={result.signal} confidence={result.confidence} large />
                <button
                  onClick={saveSignal}
                  disabled={saving || !!savedId}
                  style={{
                    background: savedId ? "var(--accent-green-dim)" : "transparent",
                    border: `1px solid ${savedId ? "var(--accent-green)" : "var(--border)"}`,
                    color: savedId ? "var(--accent-green)" : "var(--text-secondary)",
                    padding: "7px 18px",
                    fontFamily: "var(--font-mono)",
                    fontSize: "12px",
                    borderRadius: "4px",
                    cursor: saving || savedId ? "not-allowed" : "pointer",
                    transition: "all 0.2s",
                  }}
                >
                  {savedId ? "★ Saved" : saving ? "Saving..." : "☆ Save Signal"}
                </button>
              </div>
            </div>
          </Card>

          {/* Price Chart */}
          <Card title="Price History" subtitle="Blue = actual · Yellow dashed = MA20 · Ranges: 7D / 30D / 90D (default 30D)">
            <PriceChart data={result.history} />
          </Card>

          {/* Sub-charts */}
          <Card title="Technical Oscillators">
            <SubCharts history={result.history} />
          </Card>

          {/* Indicators */}
          <Card title="Indicator Breakdown" subtitle="Core ML indicators decoded">
            <IndicatorPanel indicators={result.indicators} />
          </Card>

          {/* Signal Reasoning */}
          <Card title="Signal Reasoning" accent={signalAccent}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "24px" }}>
              <div>
                <div style={{ fontSize: "12px", color: "var(--text-secondary)", marginBottom: "12px" }}>
                  BULLISH FACTORS
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                  {result.indicators?.rsi < 45 && <Reason positive text={`RSI at ${result.indicators.rsi.toFixed(1)} — Not overbought`} />}
                  {result.indicators?.macd_hist > 0 && <Reason positive text="MACD histogram positive — bullish momentum" />}
                  {result.indicators?.bb_position < 0.3 && <Reason positive text="Price near lower Bollinger Band — oversold" />}
                  {result.indicators?.rsi >= 45 && result.indicators?.macd_hist <= 0 && (
                    <div style={{ fontSize: "12px", color: "var(--text-dim)" }}>— No strong bullish signals</div>
                  )}
                </div>
              </div>
              <div>
                <div style={{ fontSize: "12px", color: "var(--text-secondary)", marginBottom: "12px" }}>
                  BEARISH FACTORS
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                  {result.indicators?.rsi > 60 && <Reason text={`RSI at ${result.indicators.rsi.toFixed(1)} — Overbought risk`} />}
                  {result.indicators?.macd_hist < 0 && <Reason text="MACD histogram negative — bearish momentum" />}
                  {result.indicators?.bb_position > 0.75 && <Reason text="Price near upper Bollinger Band — overextended" />}
                  {result.indicators?.rsi <= 60 && result.indicators?.macd_hist >= 0 && (
                    <div style={{ fontSize: "12px", color: "var(--text-dim)" }}>— No strong bearish signals</div>
                  )}
                </div>
              </div>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}

function Stat({ label, value, change, color }) {
  const changeColor = change > 0 ? "var(--accent-green)" : change < 0 ? "var(--accent-red)" : "var(--text-secondary)";
  return (
    <div>
      <div style={{ fontSize: "11px", color: "var(--text-dim)", marginBottom: "4px" }}>{label}</div>
      <div style={{ fontSize: "15px", fontWeight: 700, color: color || "var(--text-primary)" }}>{value}</div>
      {change !== undefined && (
        <div style={{ fontSize: "11px", color: changeColor }}>
          {change > 0 ? "▲" : "▼"} {Math.abs(change).toFixed(2)}%
        </div>
      )}
    </div>
  );
}

function Reason({ text, positive }) {
  return (
    <div style={{
      display: "flex",
      alignItems: "flex-start",
      gap: "8px",
      fontSize: "12px",
      color: positive ? "var(--accent-green)" : "var(--accent-red)",
    }}>
      <span>{positive ? "▲" : "▼"}</span>
      <span>{text}</span>
    </div>
  );
}
