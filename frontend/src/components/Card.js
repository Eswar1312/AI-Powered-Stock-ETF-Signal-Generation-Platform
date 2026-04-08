import React from "react";

export default function Card({ title, subtitle, children, accent, style }) {
  return (
    <div style={{
      background: "var(--bg-card)",
      border: `1px solid ${accent ? accent + "44" : "var(--border)"}`,
      borderRadius: "6px",
      padding: "24px",
      ...(accent ? { boxShadow: `0 0 30px ${accent}11` } : {}),
      ...style,
    }}>
      {(title || subtitle) && (
        <div style={{ marginBottom: "20px" }}>
          {title && (
            <div style={{
              fontFamily: "var(--font-display)",
              fontWeight: 700,
              fontSize: "14px",
              letterSpacing: "0.05em",
              color: accent || "var(--text-primary)",
              textTransform: "uppercase",
            }}>
              {title}
            </div>
          )}
          {subtitle && (
            <div style={{ fontSize: "12px", color: "var(--text-secondary)", marginTop: "4px" }}>
              {subtitle}
            </div>
          )}
        </div>
      )}
      {children}
    </div>
  );
}
