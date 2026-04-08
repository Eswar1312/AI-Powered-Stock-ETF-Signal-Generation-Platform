import React from "react";
import {
  ComposedChart,
  Line,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ReferenceLine,
  ResponsiveContainer,
} from "recharts";

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{
      background: "var(--bg-elevated)",
      border: "1px solid var(--border)",
      padding: "8px 12px",
      borderRadius: "4px",
      fontSize: "11px",
      fontFamily: "var(--font-mono)",
    }}>
      <div style={{ color: "var(--text-dim)", marginBottom: "4px" }}>{label}</div>
      {payload.map((p) => (
        <div key={p.name} style={{ color: p.color }}>
          {p.name}: {p.value?.toFixed(3)}
        </div>
      ))}
    </div>
  );
};

export default function SubCharts({ history }) {
  if (!history) return null;

  const rsiData = history.dates.map((d, i) => ({
    date: d.slice(5),
    RSI: history.rsi[i],
  }));

  const macdData = history.dates.map((d, i) => ({
    date: d.slice(5),
    MACD: history.macd[i],
    Signal: history.macd_signal[i],
    Hist: history.macd ? (history.macd[i] - history.macd_signal[i]) : null,
  }));

  const tickStyle = { fill: "var(--text-dim)", fontSize: 10, fontFamily: "var(--font-mono)" };

  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "24px" }}>
      {/* RSI */}
      <div>
        <div style={{ fontSize: "11px", color: "var(--text-dim)", letterSpacing: "0.1em", marginBottom: "8px" }}>RSI (14)</div>
        <ResponsiveContainer width="100%" height={140}>
          <ComposedChart data={rsiData} margin={{ top: 4, right: 4, left: 0, bottom: 4 }}>
            <XAxis dataKey="date" tick={tickStyle} tickLine={false} axisLine={false} interval={19} />
            <YAxis domain={[0, 100]} tick={tickStyle} tickLine={false} axisLine={false} width={30} />
            <Tooltip content={<CustomTooltip />} />
            <ReferenceLine y={70} stroke="var(--accent-red)" strokeDasharray="3 3" strokeOpacity={0.6} />
            <ReferenceLine y={30} stroke="var(--accent-green)" strokeDasharray="3 3" strokeOpacity={0.6} />
            <ReferenceLine y={50} stroke="var(--border)" strokeDasharray="2 2" />
            <Line type="monotone" dataKey="RSI" stroke="var(--accent-yellow)" strokeWidth={1.5} dot={false} />
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      {/* MACD */}
      <div>
        <div style={{ fontSize: "11px", color: "var(--text-dim)", letterSpacing: "0.1em", marginBottom: "8px" }}>MACD (12,26,9)</div>
        <ResponsiveContainer width="100%" height={140}>
          <ComposedChart data={macdData} margin={{ top: 4, right: 4, left: 0, bottom: 4 }}>
            <XAxis dataKey="date" tick={tickStyle} tickLine={false} axisLine={false} interval={19} />
            <YAxis tick={tickStyle} tickLine={false} axisLine={false} width={40} tickFormatter={(v) => v?.toFixed(1)} />
            <Tooltip content={<CustomTooltip />} />
            <ReferenceLine y={0} stroke="var(--border)" />
            <Bar dataKey="Hist" fill="var(--accent-blue)" opacity={0.5} />
            <Line type="monotone" dataKey="MACD" stroke="var(--accent-blue)" strokeWidth={1.5} dot={false} />
            <Line type="monotone" dataKey="Signal" stroke="var(--accent-red)" strokeWidth={1} dot={false} strokeDasharray="3 2" />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
