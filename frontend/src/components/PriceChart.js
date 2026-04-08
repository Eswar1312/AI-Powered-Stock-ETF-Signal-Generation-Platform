import React, { useState } from "react";
import {
  ComposedChart,
  Line,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{
      background: "var(--bg-elevated)",
      border: "1px solid var(--border)",
      padding: "10px 14px",
      borderRadius: "6px",
      fontSize: "12px",
      fontFamily: "var(--font-mono)",
    }}>
      <div style={{ color: "var(--text-secondary)", marginBottom: "6px" }}>{label}</div>
      {payload.map((p) => (
        <div key={p.name} style={{ color: p.color, marginBottom: "2px" }}>
          {p.name}: {typeof p.value === "number" ? p.value.toFixed(2) : p.value}
        </div>
      ))}
    </div>
  );
};

export default function PriceChart({ data }) {
  const [showMA, setShowMA] = useState(true);
  const [rangeDays, setRangeDays] = useState(30);

  if (!data) return null;

  const actualData = data.dates.map((d, i) => ({
    date: d.slice(5),
    Price: data.prices[i],
    MA20: data.ma20[i],
    Volume: data.volume[i],
  }));

  const visibleActualData = actualData.slice(-Math.min(rangeDays, actualData.length));
  const chartData = [...visibleActualData];

  const priceValues = chartData
    .flatMap((row) => [row.Price, row.MA20])
    .filter((v) => typeof v === "number" && Number.isFinite(v));

  const minPrice = priceValues.length ? Math.min(...priceValues) : 0;
  const maxPrice = priceValues.length ? Math.max(...priceValues) : 1;
  const dynamicPadding = Math.max((maxPrice - minPrice) * 0.12, maxPrice * 0.01, 1);

  return (
    <div>
      <div style={{ display: "flex", gap: "12px", marginBottom: "16px", flexWrap: "wrap" }}>
        <button
          onClick={() => setShowMA(!showMA)}
          style={{
            background: showMA ? "var(--accent-blue-dim)" : "transparent",
            border: `1px solid ${showMA ? "var(--accent-blue)" : "var(--border)"}`,
            color: showMA ? "var(--accent-blue)" : "var(--text-dim)",
            padding: "4px 12px",
            fontFamily: "var(--font-mono)",
            fontSize: "11px",
            borderRadius: "3px",
            cursor: "pointer",
          }}
        >
          MA20
        </button>

        {[7, 30, 90].map((days) => {
          const active = rangeDays === days;
          return (
            <button
              key={days}
              onClick={() => setRangeDays(days)}
              style={{
                background: active ? "var(--accent-green-dim)" : "transparent",
                border: `1px solid ${active ? "var(--accent-green)" : "var(--border)"}`,
                color: active ? "var(--accent-green)" : "var(--text-dim)",
                padding: "4px 12px",
                fontFamily: "var(--font-mono)",
                fontSize: "11px",
                borderRadius: "3px",
                cursor: "pointer",
              }}
            >
              {days}D
            </button>
          );
        })}
      </div>

      <ResponsiveContainer width="100%" height={320}>
        <ComposedChart data={chartData} margin={{ top: 4, right: 4, left: 4, bottom: 4 }}>
          <XAxis
            dataKey="date"
            tick={{ fill: "var(--text-dim)", fontSize: 10, fontFamily: "var(--font-mono)" }}
            tickLine={false}
            axisLine={{ stroke: "var(--border)" }}
            interval={Math.max(0, Math.floor(chartData.length / 10) - 1)}
          />
          <YAxis
            yAxisId="price"
            tick={{ fill: "var(--text-dim)", fontSize: 10, fontFamily: "var(--font-mono)" }}
            tickLine={false}
            axisLine={false}
            width={70}
            tickFormatter={(v) => v?.toFixed(0)}
            domain={[minPrice - dynamicPadding, maxPrice + dynamicPadding]}
          />
          <YAxis
            yAxisId="vol"
            orientation="right"
            tick={false}
            axisLine={false}
            width={0}
          />
          <Tooltip content={<CustomTooltip />} />

          <Bar yAxisId="vol" dataKey="Volume" fill="#38bdf808" barSize={3} />

          <Line
            yAxisId="price"
            type="monotone"
            dataKey="Price"
            stroke="var(--accent-blue)"
            strokeWidth={2.2}
            dot={false}
            activeDot={{ r: 3 }}
          />

          {showMA && (
            <Line
              yAxisId="price"
              type="monotone"
              dataKey="MA20"
              stroke="#ffd60a"
              strokeWidth={1}
              dot={false}
              strokeDasharray="4 2"
            />
          )}

        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
