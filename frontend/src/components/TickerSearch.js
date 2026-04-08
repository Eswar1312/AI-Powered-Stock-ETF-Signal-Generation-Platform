import React, { useState } from "react";
import toast from "react-hot-toast";

const QUICK = [
  "NIFTYBEES.NS", "RELIANCE.NS", "TCS.NS", "INFY.NS",
  "AAPL", "MSFT", "GOOGL", "SPY", "QQQ", "TSLA",
];

const TICKER_REGEX = /^[A-Z0-9]{1,10}(\.[A-Z]{1,5})?(-[A-Z0-9]{1,2})?$/;

export default function TickerSearch({ onSearch, loading }) {
  const [value, setValue] = useState("");

  const submit = (ticker) => {
    const t = (ticker || value).trim().toUpperCase();
    if (!t) {
      toast.error("Ticker is required");
      return;
    }
    if (!TICKER_REGEX.test(t)) {
      toast.error("Invalid ticker format. Use examples like AAPL, RELIANCE.NS, BRK-B");
      return;
    }
    onSearch(t);
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
      <div style={{ display: "flex", gap: "10px" }}>
        <input
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && submit()}
          placeholder="Enter ticker (e.g. RELIANCE.NS, AAPL)"
          style={{
            flex: 1,
            background: "var(--bg-elevated)",
            border: "1px solid var(--border)",
            color: "var(--text-primary)",
            padding: "12px 16px",
            fontFamily: "var(--font-mono)",
            fontSize: "14px",
            borderRadius: "4px",
            outline: "none",
          }}
        />
        <button
          onClick={() => submit()}
          disabled={loading}
          style={{
            background: loading ? "var(--border)" : "var(--accent-green)",
            color: loading ? "var(--text-dim)" : "#000",
            border: "none",
            padding: "12px 24px",
            fontFamily: "var(--font-display)",
            fontWeight: 700,
            fontSize: "14px",
            borderRadius: "4px",
            cursor: loading ? "not-allowed" : "pointer",
            transition: "all 0.15s",
          }}
        >
          {loading ? "ANALYZING..." : "ANALYZE"}
        </button>
      </div>

      <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
        {QUICK.map((t) => (
          <button
            key={t}
            onClick={() => { setValue(t); submit(t); }}
            style={{
              background: "transparent",
              border: "1px solid var(--border)",
              color: "var(--text-secondary)",
              padding: "4px 12px",
              fontFamily: "var(--font-mono)",
              fontSize: "11px",
              borderRadius: "3px",
              cursor: "pointer",
              transition: "all 0.15s",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = "var(--accent-blue)";
              e.currentTarget.style.color = "var(--accent-blue)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = "var(--border)";
              e.currentTarget.style.color = "var(--text-secondary)";
            }}
          >
            {t}
          </button>
        ))}
      </div>
    </div>
  );
}
