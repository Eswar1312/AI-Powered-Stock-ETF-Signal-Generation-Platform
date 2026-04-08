import React, { useState, useEffect } from "react";
import toast from "react-hot-toast";
import Card from "../components/Card";
import {
  adminFetchUsers,
  adminToggleUser,
  adminDeleteUser,
  adminFetchStats,
  adminSetBacktestingEnabled,
} from "../utils/api";

export default function AdminPage() {
  const [users, setUsers] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [updatingBacktesting, setUpdatingBacktesting] = useState(false);

  const load = async () => {
    try {
      const [u, s] = await Promise.all([adminFetchUsers(), adminFetchStats()]);
      setUsers(u);
      setStats(s);
    } catch {
      toast.error("Failed to load admin data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const toggle = async (id) => {
    try {
      const updated = await adminToggleUser(id);
      setUsers((u) => u.map((x) => (x._id === id ? updated : x)));
      toast.success(`User ${updated.isActive ? "enabled" : "disabled"}`);
    } catch (e) {
      toast.error(e.response?.data?.error || "Failed");
    }
  };

  const remove = async (id, name) => {
    if (!window.confirm(`Delete user "${name}"? This cannot be undone.`)) return;
    try {
      await adminDeleteUser(id);
      setUsers((u) => u.filter((x) => x._id !== id));
      toast.success("User deleted");
    } catch (e) {
      toast.error(e.response?.data?.error || "Failed");
    }
  };

  const toggleBacktesting = async () => {
    if (!stats) return;
    const next = !stats.backtestingEnabled;

    setUpdatingBacktesting(true);
    try {
      const updated = await adminSetBacktestingEnabled(next);
      setStats((prev) => (prev ? { ...prev, backtestingEnabled: updated.backtestingEnabled } : prev));
      toast.success(`Backtesting ${updated.backtestingEnabled ? "enabled" : "disabled"}`);
    } catch (e) {
      toast.error(e.response?.data?.error || "Failed to update backtesting setting");
    } finally {
      setUpdatingBacktesting(false);
    }
  };

  return (
    <div>
      <div style={{ marginBottom: "28px" }}>
        <h1 style={{ fontFamily: "var(--font-display)", fontWeight: 800, fontSize: "24px", marginBottom: "4px" }}>
          ⚙ Admin Panel
        </h1>
        <p style={{ color: "var(--text-secondary)", fontSize: "13px" }}>
          Manage users and monitor platform usage
        </p>
      </div>

      {/* Stats */}
      {stats && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(6, 1fr)", gap: "12px", marginBottom: "20px" }}>
          {[
            { label: "Total Users", value: stats.totalUsers, color: "var(--accent-blue)" },
            { label: "Active Users", value: stats.activeUsers, color: "var(--accent-green)" },
            { label: "Saved Predictions", value: stats.totalSaved, color: "var(--text-primary)" },
            { label: "BUY Signals", value: stats.buySignals, color: "var(--accent-green)" },
            { label: "HOLD Signals", value: stats.holdSignals, color: "var(--accent-yellow)" },
            { label: "SELL Signals", value: stats.sellSignals, color: "var(--accent-red)" },
          ].map((s) => (
            <div key={s.label} style={{
              background: "var(--bg-card)", border: "1px solid var(--border)",
              borderRadius: "6px", padding: "16px",
            }}>
              <div style={{ fontSize: "10px", color: "var(--text-dim)", marginBottom: "6px" }}>{s.label}</div>
              <div style={{ fontFamily: "var(--font-display)", fontWeight: 800, fontSize: "22px", color: s.color }}>
                {s.value}
              </div>
            </div>
          ))}
        </div>
      )}

      {stats && (
        <Card title="Feature Controls" subtitle="Platform-level toggles managed by admin" style={{ marginBottom: "28px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "16px" }}>
            <div>
              <div style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: "15px", marginBottom: "4px" }}>
                Backtesting
              </div>
              <div style={{ fontSize: "12px", color: "var(--text-secondary)" }}>
                When disabled, users cannot run backtests and only signal output is available.
              </div>
            </div>
            <button
              onClick={toggleBacktesting}
              disabled={updatingBacktesting}
              style={{
                background: stats.backtestingEnabled ? "var(--accent-red-dim)" : "var(--accent-green-dim)",
                border: `1px solid ${stats.backtestingEnabled ? "var(--accent-red)" : "var(--accent-green)"}`,
                color: stats.backtestingEnabled ? "var(--accent-red)" : "var(--accent-green)",
                padding: "8px 12px",
                fontFamily: "var(--font-mono)",
                fontSize: "12px",
                borderRadius: "4px",
                cursor: updatingBacktesting ? "not-allowed" : "pointer",
                opacity: updatingBacktesting ? 0.7 : 1,
                minWidth: "120px",
              }}
            >
              {updatingBacktesting
                ? "Updating..."
                : stats.backtestingEnabled
                  ? "Disable"
                  : "Enable"}
            </button>
          </div>
        </Card>
      )}

      {/* Users Table */}
      <Card title="Registered Users" subtitle="Manage user access and permissions">
        {loading ? (
          <div style={{ textAlign: "center", padding: "40px", color: "var(--text-dim)" }}>Loading...</div>
        ) : users.length === 0 ? (
          <div style={{ textAlign: "center", padding: "40px", color: "var(--text-dim)", fontSize: "13px" }}>
            No users registered yet.
          </div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px" }}>
              <thead>
                <tr style={{ borderBottom: "1px solid var(--border)" }}>
                  {["Name", "Email", "Role", "Status", "Joined", "Last Login", "Actions"].map((h) => (
                    <th key={h} style={{ padding: "10px 12px", textAlign: "left", fontSize: "11px", color: "var(--text-dim)", fontWeight: 400, letterSpacing: "0.05em" }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u._id} style={{ borderBottom: "1px solid var(--border)", opacity: u.isActive ? 1 : 0.5 }}>
                    <td style={{ padding: "14px 12px", fontFamily: "var(--font-display)", fontWeight: 700 }}>{u.name}</td>
                    <td style={{ padding: "14px 12px", color: "var(--text-secondary)" }}>{u.email}</td>
                    <td style={{ padding: "14px 12px" }}>
                      <span style={{
                        background: u.role === "admin" ? "var(--accent-yellow-dim)" : "var(--accent-blue-dim)",
                        color: u.role === "admin" ? "var(--accent-yellow)" : "var(--accent-blue)",
                        padding: "2px 10px", borderRadius: "3px", fontSize: "11px",
                      }}>
                        {u.role.toUpperCase()}
                      </span>
                    </td>
                    <td style={{ padding: "14px 12px" }}>
                      <span style={{
                        background: u.isActive ? "var(--accent-green-dim)" : "var(--accent-red-dim)",
                        color: u.isActive ? "var(--accent-green)" : "var(--accent-red)",
                        padding: "2px 10px", borderRadius: "3px", fontSize: "11px",
                      }}>
                        {u.isActive ? "● Active" : "○ Disabled"}
                      </span>
                    </td>
                    <td style={{ padding: "14px 12px", fontSize: "11px", color: "var(--text-dim)" }}>
                      {new Date(u.createdAt).toLocaleDateString()}
                    </td>
                    <td style={{ padding: "14px 12px", fontSize: "11px", color: "var(--text-dim)" }}>
                      {u.lastLogin ? new Date(u.lastLogin).toLocaleDateString() : "Never"}
                    </td>
                    <td style={{ padding: "14px 12px" }}>
                      {u.role !== "admin" && (
                        <div style={{ display: "flex", gap: "8px" }}>
                          <button
                            onClick={() => toggle(u._id)}
                            style={{
                              background: "transparent",
                              border: `1px solid ${u.isActive ? "var(--accent-yellow)" : "var(--accent-green)"}`,
                              color: u.isActive ? "var(--accent-yellow)" : "var(--accent-green)",
                              padding: "5px 10px", fontFamily: "var(--font-mono)",
                              fontSize: "11px", borderRadius: "3px", cursor: "pointer",
                            }}
                          >
                            {u.isActive ? "Disable" : "Enable"}
                          </button>
                          <button
                            onClick={() => remove(u._id, u.name)}
                            style={{
                              background: "transparent", border: "1px solid var(--accent-red)",
                              color: "var(--accent-red)", padding: "5px 10px",
                              fontFamily: "var(--font-mono)", fontSize: "11px",
                              borderRadius: "3px", cursor: "pointer",
                            }}
                          >
                            Delete
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
