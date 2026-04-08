import React, { useState } from "react";
import { Outlet, NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";

const USER_NAV = [
  { to: "/", label: "Dashboard", icon: "◈" },
  { to: "/signal", label: "Signal Engine", icon: "⚡" },
  { to: "/backtest", label: "Backtester", icon: "◷" },
  { to: "/saved", label: "Saved", icon: "★" },
  { to: "/alerts", label: "Alerts", icon: "◎" },
  { to: "/portfolio", label: "Portfolio", icon: "◻" },
];

const ADMIN_NAV = [
  { to: "/admin", label: "Admin Panel", icon: "⚙" },
];

export default function Layout() {
  const [collapsed, setCollapsed] = useState(false);
  const { user, logout } = useAuth();
  const { theme, toggle } = useTheme();
  const navigate = useNavigate();

  const nav = user?.role === "admin" ? ADMIN_NAV : USER_NAV;

  const handleLogout = () => {
    logout();
    navigate("/signin");
  };

  return (
    <div style={{ display: "flex", minHeight: "100vh" }}>
      {/* Sidebar */}
      <aside style={{
        width: collapsed ? "64px" : "220px",
        minHeight: "100vh",
        background: "var(--bg-card)",
        borderRight: "1px solid var(--border)",
        display: "flex",
        flexDirection: "column",
        transition: "width 0.25s ease",
        overflow: "hidden",
        position: "sticky",
        top: 0,
        height: "100vh",
        flexShrink: 0,
      }}>
        {/* Logo */}
        <div style={{
          display: "flex", alignItems: "center", gap: "10px",
          padding: "20px 16px", borderBottom: "1px solid var(--border)",
          whiteSpace: "nowrap", overflow: "hidden",
        }}>
          <span style={{ fontFamily: "var(--font-display)", fontWeight: 800, fontSize: collapsed ? "16px" : "18px", letterSpacing: "-0.02em", color: "var(--text-primary)" }}>
            {collapsed ? "YS" : "YourStock AI"}
          </span>
        </div>

        {/* Nav */}
        <nav style={{ flex: 1, paddingTop: "8px" }}>
          {nav.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === "/"}
              style={({ isActive }) => ({
                display: "flex", alignItems: "center",
                gap: "12px", padding: collapsed ? "14px 0" : "12px 16px",
                justifyContent: collapsed ? "center" : "flex-start",
                textDecoration: "none",
                color: isActive ? "var(--accent-green)" : "var(--text-secondary)",
                background: isActive ? "var(--accent-green-dim)" : "transparent",
                borderLeft: isActive ? "2px solid var(--accent-green)" : "2px solid transparent",
                margin: "2px 0", transition: "all 0.15s ease", whiteSpace: "nowrap",
              })}
            >
              <span style={{ fontSize: "18px", lineHeight: 1 }}>{item.icon}</span>
              {!collapsed && <span style={{ fontSize: "13px" }}>{item.label}</span>}
            </NavLink>
          ))}
        </nav>

        {/* Theme toggle */}
        <div style={{ padding: collapsed ? "12px 0" : "12px 16px", display: "flex", justifyContent: collapsed ? "center" : "flex-start" }}>
          <button
            onClick={toggle}
            title="Toggle theme"
            style={{
              background: "var(--bg-elevated)", border: "1px solid var(--border)",
              borderRadius: "20px", cursor: "pointer",
              padding: collapsed ? "6px 8px" : "6px 14px",
              display: "flex", alignItems: "center", gap: "6px",
              color: "var(--text-secondary)", fontSize: "12px",
              transition: "all 0.2s", whiteSpace: "nowrap",
            }}
          >
            <span>{theme === "dark" ? "☀️" : "🌙"}</span>
            {!collapsed && <span>{theme === "dark" ? "Light" : "Dark"}</span>}
          </button>
        </div>

        {/* User info + logout */}
        {!collapsed && user && (
          <div style={{ padding: "16px", borderTop: "1px solid var(--border)" }}>
            <div style={{ fontSize: "12px", fontWeight: 700, color: "var(--text-primary)", marginBottom: "2px" }}>
              {user.name}
            </div>
            <div style={{ fontSize: "11px", color: "var(--text-dim)", marginBottom: "8px" }}>
              {user.role === "admin" ? "⚙ Admin" : "◻ User"}
            </div>
            <button
              onClick={handleLogout}
              style={{
                background: "transparent", border: "1px solid var(--accent-red)",
                color: "var(--accent-red)", padding: "5px 12px",
                fontFamily: "var(--font-mono)", fontSize: "11px",
                borderRadius: "3px", cursor: "pointer", width: "100%",
              }}
            >
              Sign Out
            </button>
          </div>
        )}

        {collapsed && user && (
          <div style={{ padding: "12px 0", display: "flex", justifyContent: "center", borderTop: "1px solid var(--border)" }}>
            <button
              onClick={handleLogout}
              title="Sign Out"
              style={{
                background: "transparent", border: "1px solid var(--accent-red)",
                color: "var(--accent-red)", padding: "6px 8px",
                fontFamily: "var(--font-mono)", fontSize: "11px",
                borderRadius: "3px", cursor: "pointer",
              }}
            >
              ✕
            </button>
          </div>
        )}

        <button
          onClick={() => setCollapsed(!collapsed)}
          style={{
            background: "none", border: "none", color: "var(--text-dim)",
            cursor: "pointer", padding: "8px", fontSize: "12px", alignSelf: "flex-end",
          }}
        >
          {collapsed ? "▶" : "◀"}
        </button>

        {!collapsed && (
          <div style={{ padding: "12px 16px", borderTop: "1px solid var(--border)" }}>
            <div style={{ color: "var(--accent-green)", fontSize: "11px" }}>● LIVE</div>
            <div style={{ fontSize: "11px", color: "var(--text-dim)", marginTop: "4px" }}>ML Engine v2.0</div>
          </div>
        )}
      </aside>

      {/* Main */}
      <main style={{ flex: 1, padding: "32px", overflow: "auto", background: "var(--bg)" }}>
        <Outlet />
      </main>
    </div>
  );
}
