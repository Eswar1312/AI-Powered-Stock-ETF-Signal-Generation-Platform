import React from "react";

function Gauge({ value, min = 0, max = 100, label, color }) {
  const pct = Math.max(0, Math.min(100, ((value - min) / (max - min)) * 100));
  return (
    <div style={{ marginBottom: "12px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px" }}>
        <span style={{ fontSize: "11px", color: "var(--text-secondary)" }}>{label}</span>
        <span style={{ fontSize: "11px", color, fontWeight: 700 }}>{typeof value === "number" ? value.toFixed(2) : value}</span>
      </div>
      <div style={{ height: "4px", background: "var(--border)", borderRadius: "2px" }}>
        <div style={{ width: `${pct}%`, height: "100%", background: color, borderRadius: "2px", transition: "width 0.6s ease" }} />
      </div>
    </div>
  );
}

function StatRow({ label, value, color, prefix }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 0", borderBottom: "1px solid var(--border)" }}>
      <span style={{ fontSize: "12px", color: "var(--text-secondary)" }}>{label}</span>
      <span style={{ fontSize: "13px", color: color || "var(--text-primary)", fontWeight: 700 }}>
        {prefix}{typeof value === "number" ? value.toFixed(4) : value}
      </span>
    </div>
  );
}

export default function IndicatorPanel({ indicators }) {
  if (!indicators) return null;
  const { rsi, macd, macd_signal, macd_hist, bb_position, atr, ma10, ma20, ma50, volatility_10 } = indicators;

  const rsiColor = rsi < 30 ? "var(--accent-green)" : rsi > 70 ? "var(--accent-red)" : "var(--accent-yellow)";
  const bbColor = bb_position < 0.2 ? "var(--accent-green)" : bb_position > 0.8 ? "var(--accent-red)" : "var(--accent-blue)";
  const macdColor = macd_hist > 0 ? "var(--accent-green)" : "var(--accent-red)";

  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "24px" }}>
      {/* Oscillators */}
      <div>
        <div style={{ fontSize: "11px", color: "var(--text-dim)", letterSpacing: "0.1em", marginBottom: "12px" }}>OSCILLATORS</div>
        <Gauge value={rsi} min={0} max={100} label="RSI (14)" color={rsiColor} />
        <Gauge value={bb_position * 100} min={0} max={100} label="BB Position %" color={bbColor} />
        <Gauge value={Math.abs(volatility_10) * 1000} min={0} max={50} label="Volatility (10d)" color="var(--accent-blue)" />

        <div style={{ marginTop: "16px" }}>
          <div style={{ fontSize: "11px", color: "var(--text-dim)", letterSpacing: "0.1em", marginBottom: "8px" }}>RSI SIGNAL</div>
          <div style={{
            padding: "8px 12px",
            background: `${rsiColor}11`,
            border: `1px solid ${rsiColor}44`,
            borderRadius: "4px",
            fontSize: "12px",
            color: rsiColor,
          }}>
            {rsi < 30 ? "⚡ Oversold — Potential BUY Zone" : rsi > 70 ? "⚠ Overbought — Caution Zone" : "◼ Neutral Range"}
          </div>
        </div>
      </div>

      {/* Moving Averages & MACD */}
      <div>
        <div style={{ fontSize: "11px", color: "var(--text-dim)", letterSpacing: "0.1em", marginBottom: "12px" }}>MOVING AVERAGES</div>
        <StatRow label="MA (10)" value={ma10} />
        <StatRow label="MA (20)" value={ma20} />
        <StatRow label="MA (50)" value={ma50} />
        <StatRow label="ATR (14)" value={atr} color="var(--accent-blue)" />

        <div style={{ marginTop: "16px" }}>
          <div style={{ fontSize: "11px", color: "var(--text-dim)", letterSpacing: "0.1em", marginBottom: "8px" }}>MACD</div>
          <StatRow label="MACD Line" value={macd} color="var(--accent-blue)" />
          <StatRow label="Signal Line" value={macd_signal} color="var(--accent-yellow)" />
          <StatRow label="Histogram" value={macd_hist} color={macdColor} />
        </div>
      </div>
    </div>
  );
}
