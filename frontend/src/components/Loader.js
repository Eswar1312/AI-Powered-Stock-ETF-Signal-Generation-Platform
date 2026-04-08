import React from "react";

export default function Loader({ message }) {
  return (
    <div style={{
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      padding: "60px",
      gap: "16px",
    }}>
      <div style={{ position: "relative", width: "48px", height: "48px" }}>
        <div style={{
          position: "absolute",
          inset: 0,
          border: "2px solid var(--border)",
          borderTopColor: "var(--accent-green)",
          borderRadius: "50%",
          animation: "spin 0.8s linear infinite",
        }} />
      </div>
      <div style={{ fontSize: "13px", color: "var(--text-secondary)" }}>
        {message || "Running ML analysis..."}
      </div>
      <div style={{ fontSize: "11px", color: "var(--text-dim)" }}>
        Training ensemble model · Computing signals
      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
