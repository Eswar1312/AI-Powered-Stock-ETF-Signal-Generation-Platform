import React from "react";

const CONFIG = {
  BUY: { color: "var(--accent-green)", bg: "var(--accent-green-dim)", symbol: "▲" },
  SELL: { color: "var(--accent-red)", bg: "var(--accent-red-dim)", symbol: "▼" },
  HOLD: { color: "var(--accent-yellow)", bg: "var(--accent-yellow-dim)", symbol: "■" },
};

export default function SignalBadge({ signal, confidence, large }) {
  const cfg = CONFIG[signal] || CONFIG.HOLD;

  return (
    <div style={{
      display: "inline-flex",
      flexDirection: "column",
      alignItems: "center",
      gap: "4px",
    }}>
      <div style={{
        background: cfg.bg,
        border: `1px solid ${cfg.color}`,
        color: cfg.color,
        padding: large ? "14px 32px" : "6px 16px",
        borderRadius: "4px",
        fontFamily: "var(--font-display)",
        fontWeight: 800,
        fontSize: large ? "28px" : "14px",
        letterSpacing: "0.08em",
        display: "flex",
        alignItems: "center",
        gap: "8px",
        boxShadow: `0 0 20px ${cfg.color}33`,
        animation: "pulse 2s ease-in-out infinite",
      }}>
        <span>{cfg.symbol}</span>
        <span>{signal}</span>
      </div>
      {confidence && (
        <div style={{ fontSize: "11px", color: "var(--text-secondary)" }}>
          {confidence}% confidence
        </div>
      )}
      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.8; }
        }
      `}</style>
    </div>
  );
}
