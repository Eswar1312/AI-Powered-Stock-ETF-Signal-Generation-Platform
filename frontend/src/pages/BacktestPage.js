import React, { useEffect, useState } from "react";
import toast from "react-hot-toast";
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine,
} from "recharts";
import Card from "../components/Card";
import TickerSearch from "../components/TickerSearch";
import Loader from "../components/Loader";
import { fetchBacktestAnalyzer, fetchPublicSettings, fetchSignal } from "../utils/api";

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: "var(--bg-elevated)", border: "1px solid var(--border)", padding: "8px 12px", borderRadius: "4px", fontSize: "11px", fontFamily: "var(--font-mono)" }}>
      <div style={{ color: "var(--text-dim)" }}>{label}</div>
      <div style={{ color: "var(--accent-green)" }}>Equity: {payload[0]?.value?.toFixed(4)}x</div>
    </div>
  );
};

function formatEquityTick(v) {
  const n = Number(v);
  if (!Number.isFinite(n)) return "-";
  if (Math.abs(n) >= 1000000) return `${(n / 1000000).toFixed(2)}Mx`;
  if (Math.abs(n) >= 1000) return `${(n / 1000).toFixed(2)}Kx`;
  return `${n.toFixed(2)}x`;
}

function MetricCard({ label, value, color, sub }) {
  return (
    <div style={{ background: "var(--bg-elevated)", border: "1px solid var(--border)", borderRadius: "6px", padding: "20px" }}>
      <div style={{ fontSize: "11px", color: "var(--text-dim)", marginBottom: "8px" }}>{label}</div>
      <div style={{ fontFamily: "var(--font-display)", fontWeight: 800, fontSize: "28px", color: color || "var(--text-primary)" }}>
        {value}
      </div>
      {sub && <div style={{ fontSize: "11px", color: "var(--text-secondary)", marginTop: "4px" }}>{sub}</div>}
    </div>
  );
}

export default function BacktestPage() {
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [periodYears, setPeriodYears] = useState(10);
  const [timeMode, setTimeMode] = useState("preset");
  const [customStart, setCustomStart] = useState("");
  const [customEnd, setCustomEnd] = useState("");
  const [showStrategy, setShowStrategy] = useState(false);
  const [backtestingEnabled, setBacktestingEnabled] = useState(true);
  const [settingsLoading, setSettingsLoading] = useState(true);

  const todayIso = new Date().toISOString().slice(0, 10);

  useEffect(() => {
    let mounted = true;

    const loadSettings = async () => {
      try {
        const settings = await fetchPublicSettings();
        if (mounted) {
          setBacktestingEnabled(Boolean(settings.backtestingEnabled));
        }
      } catch {
        if (mounted) {
          setBacktestingEnabled(true);
        }
      } finally {
        if (mounted) {
          setSettingsLoading(false);
        }
      }
    };

    loadSettings();
    return () => {
      mounted = false;
    };
  }, []);

  const run = async (ticker) => {
    if (!backtestingEnabled) {
      toast.error("Backtesting is currently disabled by admin");
      return;
    }

    if (timeMode === "custom") {
      if (!customStart || !customEnd) {
        toast.error("Select both start and end dates for custom range");
        return;
      }
      if (customStart > customEnd) {
        toast.error("Start date cannot be after end date");
        return;
      }
    }

    setLoading(true);
    setError(null);
    try {
      const analyzerParams = timeMode === "custom"
        ? { start: customStart, end: customEnd }
        : { period: periodYears };

      let data;
      try {
        data = await fetchBacktestAnalyzer(ticker, analyzerParams);
      } catch (e) {
        if (e.response?.status === 404 && timeMode !== "custom") {
          data = await fetchSignal(ticker, periodYears);
        } else if (e.response?.status === 404 && timeMode === "custom") {
          throw new Error("Custom date range requires backend route /api/backtest/run/:ticker. Please restart backend server.");
        } else {
          throw e;
        }
      }

      if (!data.backtestingEnabled || !data.backtest) {
        setResult(null);
        setBacktestingEnabled(false);
        setError("Backtesting is currently disabled by admin");
        toast.error("Backtesting is currently disabled by admin");
        return;
      }
      setResult(data);
      const rangeLabel = timeMode === "custom"
        ? `${customStart} to ${customEnd}`
        : `${periodYears}Y`;
      toast.success(`Backtest complete for ${ticker} (${rangeLabel})`);
    } catch (e) {
      const msg = e.response?.data?.error || e.message;
      setError(msg);
      toast.error("Backtest failed: " + msg);
    } finally {
      setLoading(false);
    }
  };

  const bt = result?.backtest;
  const equityData = bt
    ? bt.dates.map((d, i) => ({ date: d.slice(5), equity: bt.equity_curve[i] })): [];

  return (
    <div>
      <div style={{ marginBottom: "28px" }}>
        <h1 style={{ fontFamily: "var(--font-display)", fontWeight: 800, fontSize: "24px", marginBottom: "4px" }}>
          ◷ Backtesting &amp; Performance Analyzer
        </h1>
        <p style={{ color: "var(--text-secondary)", fontSize: "13px" }}>
          Runs strategies on historical data · Computes metrics (Sharpe ratio, drawdown, win-rate)
        </p>
      </div>

      {settingsLoading ? (
        <Loader message="Loading platform settings..." />
      ) : !backtestingEnabled ? (
        <Card>
          <div style={{ background: "var(--accent-yellow-dim)", border: "1px solid var(--accent-yellow)", color: "var(--accent-yellow)", padding: "16px", borderRadius: "4px", fontSize: "13px" }}>
            ⚠ Backtesting is currently disabled by admin. Signal generation is still available on the Signal Engine page.
          </div>
        </Card>
      ) : (
      <Card style={{ marginBottom: "24px" }}>
        <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: "10px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap", justifyContent: "flex-end" }}>
            <label style={{ fontSize: "11px", color: "var(--text-dim)", letterSpacing: "0.05em" }}>TIME PERIOD</label>
            <select
              value={timeMode === "custom" ? "custom" : String(periodYears)}
              onChange={(e) => {
                const selected = e.target.value;
                if (selected === "custom") {
                  setTimeMode("custom");
                } else {
                  setTimeMode("preset");
                  setPeriodYears(Number(selected));
                }
              }}
              style={{
                background: "var(--bg-elevated)",
                border: "1px solid var(--border)",
                color: "var(--text-primary)",
                padding: "6px 10px",
                fontFamily: "var(--font-mono)",
                fontSize: "12px",
                borderRadius: "4px",
                outline: "none",
              }}
            >
              <option value={1}>1 Year</option>
              <option value={3}>3 Years</option>
              <option value={5}>5 Years</option>
              <option value={10}>10 Years</option>
              <option value="custom">Custom Range</option>
            </select>
            {timeMode === "custom" && (
              <>
                <input
                  type="date"
                  value={customStart}
                  max={customEnd || todayIso}
                  onChange={(e) => setCustomStart(e.target.value)}
                  style={{
                    background: "var(--bg-elevated)",
                    border: "1px solid var(--border)",
                    color: "var(--text-primary)",
                    padding: "6px 10px",
                    fontFamily: "var(--font-mono)",
                    fontSize: "12px",
                    borderRadius: "4px",
                    outline: "none",
                  }}
                />
                <span style={{ color: "var(--text-dim)", fontSize: "11px" }}>to</span>
                <input
                  type="date"
                  value={customEnd}
                  min={customStart || undefined}
                  max={todayIso}
                  onChange={(e) => setCustomEnd(e.target.value)}
                  style={{
                    background: "var(--bg-elevated)",
                    border: "1px solid var(--border)",
                    color: "var(--text-primary)",
                    padding: "6px 10px",
                    fontFamily: "var(--font-mono)",
                    fontSize: "12px",
                    borderRadius: "4px",
                    outline: "none",
                  }}
                />
              </>
            )}
          </div>
        </div>
        <TickerSearch onSearch={run} loading={loading} />
      </Card>
      )}

      {loading && <Loader message={timeMode === "custom" ? `Running backtest on custom range ${customStart} to ${customEnd}...` : `Running backtest on ${periodYears} year(s) of data...`} />}

      {error && (
        <div style={{ background: "var(--accent-red-dim)", border: "1px solid var(--accent-red)", color: "var(--accent-red)", padding: "16px", borderRadius: "4px", fontSize: "13px", marginBottom: "24px" }}>
          ⚠ {error}
        </div>
      )}

      {bt && !loading && (
        <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>

          {/* Strategy Info */}
          <Card>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <div style={{ fontFamily: "var(--font-display)", fontWeight: 800, fontSize: "20px", marginBottom: "4px" }}>{result.ticker}</div>
                <div style={{ fontSize: "12px", color: "var(--text-secondary)" }}>
                  Strategy: {result?.analyzer?.strategy || "ML Momentum (Random Forest + Gradient Boosting ensemble)"} · {result?.analyzer?.range_start && result?.analyzer?.range_end ? `${result.analyzer.range_start} to ${result.analyzer.range_end}` : `${periodYears}-year`} backtest
                </div>
              </div>
              <div style={{ textAlign: "right" }}>
                <div style={{ fontSize: "11px", color: "var(--text-dim)" }}>Current Signal</div>
                <div style={{
                  fontFamily: "var(--font-display)",
                  fontWeight: 800,
                  fontSize: "20px",
                  color: result.signal === "BUY" ? "var(--accent-green)" : result.signal === "SELL" ? "var(--accent-red)" : "var(--accent-yellow)",
                }}>{result.signal}</div>
              </div>
            </div>
          </Card>

          {/* Metrics */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "16px" }}>
            <MetricCard
              label="Total Return"
              value={`${bt.total_return > 0 ? "+" : ""}${bt.total_return.toFixed(2)}%`}
              color={bt.total_return >= 0 ? "var(--accent-green)" : "var(--accent-red)"}
              sub="Over full backtest period"
            />
            <MetricCard
              label="Sharpe Ratio"
              value={bt.sharpe_ratio.toFixed(3)}
              color={bt.sharpe_ratio >= 1 ? "var(--accent-green)" : bt.sharpe_ratio >= 0 ? "var(--accent-yellow)" : "var(--accent-red)"}
              sub={bt.sharpe_ratio >= 1 ? "Good risk-adjusted return" : "Below threshold"}
            />
            <MetricCard
              label="Max Drawdown"
              value={`${bt.max_drawdown.toFixed(2)}%`}
              color={Math.abs(bt.max_drawdown) < 15 ? "var(--accent-green)" : Math.abs(bt.max_drawdown) < 30 ? "var(--accent-yellow)" : "var(--accent-red)"}
              sub="Worst peak-to-trough"
            />
            <MetricCard
              label="Win Rate"
              value={`${bt.win_rate.toFixed(1)}%`}
              color={bt.win_rate >= 55 ? "var(--accent-green)" : bt.win_rate >= 45 ? "var(--accent-yellow)" : "var(--accent-red)"}
              sub="% of winning trades"
            />
          </div>

          {/* Equity Curve */}
          <Card title="Equity Curve" subtitle="Portfolio value (normalized) over last 252 trading days">
            <ResponsiveContainer width="100%" height={280}>
              <AreaChart data={equityData} margin={{ top: 4, right: 4, left: 12, bottom: 4 }}>
                <defs>
                  <linearGradient id="eqGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--accent-green)" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="var(--accent-green)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="date" tick={{ fill: "var(--text-dim)", fontSize: 10, fontFamily: "var(--font-mono)" }} tickLine={false} axisLine={{ stroke: "var(--border)" }} interval={29} />
                <YAxis tick={{ fill: "var(--text-dim)", fontSize: 10, fontFamily: "var(--font-mono)" }} tickLine={false} axisLine={false} width={86} tickFormatter={formatEquityTick} />
                <Tooltip content={<CustomTooltip />} />
                <ReferenceLine y={1} stroke="var(--border)" strokeDasharray="4 2" />
                <Area type="monotone" dataKey="equity" stroke="var(--accent-green)" strokeWidth={2} fill="url(#eqGrad)" dot={false} />
              </AreaChart>
            </ResponsiveContainer>
          </Card>

          {/* Strategy description */}
          <Card>
            <button
              onClick={() => setShowStrategy((v) => !v)}
              style={{
                background: showStrategy ? "var(--accent-blue-dim)" : "transparent",
                border: `1px solid ${showStrategy ? "var(--accent-blue)" : "var(--border)"}`,
                color: showStrategy ? "var(--accent-blue)" : "var(--text-primary)",
                padding: "8px 14px",
                fontFamily: "var(--font-display)",
                fontWeight: 700,
                fontSize: "13px",
                borderRadius: "4px",
                cursor: "pointer",
              }}
            >
              {showStrategy ? "▾ Strategy" : "▸ Strategy"}
            </button>

            {showStrategy && (
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "24px", marginTop: "16px" }}>
                <div>
                  <div style={{ fontSize: "12px", color: "var(--text-secondary)", lineHeight: 1.8 }}>
                    <strong style={{ color: "var(--text-primary)" }}>Entry Logic:</strong> Long position when ML ensemble predicts positive next-day return.
                    Uses a core feature set: RSI, MACD histogram, Bollinger Band position, ATR, moving averages, lag returns, and volatility.
                  </div>
                  <div style={{ fontSize: "12px", color: "var(--text-secondary)", lineHeight: 1.8, marginTop: "12px" }}>
                    <strong style={{ color: "var(--text-primary)" }}>Exit Logic:</strong> Exits position when predicted return turns negative.
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: "12px", color: "var(--text-secondary)", lineHeight: 1.8 }}>
                    <strong style={{ color: "var(--text-primary)" }}>Models:</strong> Random Forest (300 trees) + Gradient Boosting (200 estimators) in VotingRegressor ensemble.
                  </div>
                  <div style={{ fontSize: "12px", color: "var(--text-secondary)", lineHeight: 1.8, marginTop: "12px" }}>
                    <strong style={{ color: "var(--text-primary)" }}>Disclaimer:</strong> Past performance does not guarantee future results. This is for educational and research purposes only.
                  </div>
                </div>
              </div>
            )}
          </Card>
        </div>
      )}
    </div>
  );
}
