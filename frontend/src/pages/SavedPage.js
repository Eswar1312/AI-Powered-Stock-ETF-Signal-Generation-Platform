import React, { useState, useEffect } from "react";
import toast from "react-hot-toast";
import Card from "../components/Card";
import SignalBadge from "../components/SignalBadge";
import { fetchSaved, deleteSaved } from "../utils/api";
import { currencySymbolForTicker, formatPrice } from "../utils/currency";

export default function SavedPage() {
  const [saved, setSaved] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("ALL");

  useEffect(() => {
    fetchSaved()
      .then(setSaved)
      .catch(() => toast.error("Failed to load saved predictions"))
      .finally(() => setLoading(false));
  }, []);

  const remove = async (id) => {
    try {
      await deleteSaved(id);
      setSaved((s) => s.filter((x) => x._id !== id));
      toast.success("Removed");
    } catch {
      toast.error("Failed to remove");
    }
  };

  const filtered = filter === "ALL" ? saved : saved.filter((s) => s.signal === filter);

  return (
    <div>
      <div style={{ marginBottom: "28px" }}>
        <h1 style={{ fontFamily: "var(--font-display)", fontWeight: 800, fontSize: "24px", marginBottom: "4px" }}>
          ★ Saved Signals
        </h1>
        <p style={{ color: "var(--text-secondary)", fontSize: "13px" }}>
          Your bookmarked BUY / HOLD / SELL signals
        </p>
      </div>

      {/* Filter tabs */}
      <div style={{ display: "flex", gap: "8px", marginBottom: "20px" }}>
        {["ALL", "BUY", "HOLD", "SELL"].map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            style={{
              background: filter === f ? "var(--accent-green-dim)" : "transparent",
              border: `1px solid ${filter === f ? "var(--accent-green)" : "var(--border)"}`,
              color: filter === f ? "var(--accent-green)" : "var(--text-secondary)",
              padding: "6px 16px",
              fontFamily: "var(--font-mono)",
              fontSize: "12px",
              borderRadius: "4px",
              cursor: "pointer",
            }}
          >
            {f} {f !== "ALL" && `(${saved.filter((s) => s.signal === f).length})`}
          </button>
        ))}
        <span style={{ marginLeft: "auto", fontSize: "12px", color: "var(--text-dim)", alignSelf: "center" }}>
          {filtered.length} signal{filtered.length !== 1 ? "s" : ""}
        </span>
      </div>

      {loading ? (
        <div style={{ textAlign: "center", padding: "60px", color: "var(--text-dim)" }}>Loading...</div>
      ) : filtered.length === 0 ? (
        <Card>
          <div style={{ textAlign: "center", padding: "40px", color: "var(--text-dim)", fontSize: "13px" }}>
            No saved signals yet. Run a signal analysis and click <strong style={{ color: "var(--text-secondary)" }}>★ Save</strong> to bookmark it.
          </div>
        </Card>
      ) : (
        <div style={{ display: "grid", gap: "14px" }}>
          {filtered.map((s) => {
            const symbol = currencySymbolForTicker(s.ticker);
            return (
              <div key={s._id} style={{
                background: "var(--bg-card)",
                border: "1px solid var(--border)",
                borderRadius: "6px",
                padding: "20px",
                display: "grid",
                gridTemplateColumns: "1fr auto auto",
                gap: "20px",
                alignItems: "center",
                animation: "fadeIn 0.3s ease",
              }}>
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "8px" }}>
                    <span style={{ fontFamily: "var(--font-display)", fontWeight: 800, fontSize: "18px" }}>{s.ticker}</span>
                    <SignalBadge signal={s.signal} confidence={s.confidence} />
                  </div>
                  <div style={{ display: "flex", gap: "24px", flexWrap: "wrap" }}>
                    <Stat label="Price at Save" value={formatPrice(s.current_price, symbol)} />
                    <Stat label="Confidence" value={`${Number(s.confidence || 0).toFixed(1)}%`} />
                    <Stat label="RSI" value={s.indicators?.rsi?.toFixed(1)} />
                  </div>
                  {s.note && (
                    <div style={{ marginTop: "10px", fontSize: "12px", color: "var(--text-secondary)", fontStyle: "italic" }}>
                      📝 {s.note}
                    </div>
                  )}
                </div>

                <div style={{ fontSize: "11px", color: "var(--text-dim)", textAlign: "right" }}>
                  {new Date(s.savedAt).toLocaleDateString()}<br />
                  {new Date(s.savedAt).toLocaleTimeString()}
                </div>

                <button
                  onClick={() => remove(s._id)}
                  style={{
                    background: "transparent", border: "1px solid var(--accent-red)",
                    color: "var(--accent-red)", padding: "6px 12px",
                    fontFamily: "var(--font-mono)", fontSize: "11px",
                    borderRadius: "3px", cursor: "pointer",
                  }}
                >
                  ✕ Remove
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function Stat({ label, value, sub, subColor }) {
  return (
    <div>
      <div style={{ fontSize: "11px", color: "var(--text-dim)", marginBottom: "2px" }}>{label}</div>
      <div style={{ fontSize: "14px", fontWeight: 700 }}>{value}</div>
      {sub && <div style={{ fontSize: "11px", color: subColor }}>{sub}</div>}
    </div>
  );
}
