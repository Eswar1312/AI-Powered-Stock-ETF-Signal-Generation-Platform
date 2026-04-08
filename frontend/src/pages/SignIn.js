import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";
import toast from "react-hot-toast";

export default function SignIn() {
  const { signin } = useAuth();
  const { theme, toggle } = useTheme();
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: "", password: "" });
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const user = await signin(form.email, form.password);
      toast.success(`Welcome back, ${user.name}!`);
      navigate(user.role === "admin" ? "/admin" : "/");
    } catch (err) {
      toast.error(err.response?.data?.error || "Sign in failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={pageStyle}>
      <button onClick={toggle} style={themeBtn}>
        {theme === "dark" ? "☀️" : "🌙"}
      </button>

      <div style={cardStyle}>
        <div style={{ textAlign: "center", marginBottom: "32px" }}>
          <div style={{ fontFamily: "var(--font-display)", fontWeight: 800, fontSize: "32px" }}>
            YourStock AI
          </div>
          <div style={{ color: "var(--text-secondary)", fontSize: "13px", marginTop: "6px" }}>
            AI-Powered Stock Intelligence
          </div>
        </div>

        <div style={{ fontSize: "18px", fontFamily: "var(--font-display)", fontWeight: 700, marginBottom: "24px" }}>
          Sign In
        </div>

        <form onSubmit={submit} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          <div>
            <label style={labelStyle}>EMAIL</label>
            <input
              type="email"
              value={form.email}
              onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
              placeholder="you@example.com"
              required
              style={inputStyle}
            />
          </div>
          <div>
            <label style={labelStyle}>PASSWORD</label>
            <input
              type="password"
              value={form.password}
              onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
              placeholder="••••••••"
              required
              style={inputStyle}
            />
            <div style={{ marginTop: "8px", textAlign: "right" }}>
              <Link to="/forgot-password" style={{ color: "var(--accent-green)", textDecoration: "none", fontSize: "12px" }}>
                Forgot password?
              </Link>
            </div>
          </div>

          <button type="submit" disabled={loading} style={btnStyle(loading)}>
            {loading ? "Signing in..." : "Sign In →"}
          </button>
        </form>

        <div style={{ textAlign: "center", marginTop: "20px", fontSize: "13px", color: "var(--text-secondary)" }}>
          Don't have an account?{" "}
          <Link to="/signup" style={{ color: "var(--accent-green)", textDecoration: "none" }}>
            Sign Up
          </Link>
        </div>
      </div>
    </div>
  );
}

const pageStyle = {
  minHeight: "100vh",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  background: "var(--bg)",
  padding: "24px",
  position: "relative",
};

const cardStyle = {
  background: "var(--bg-card)",
  border: "1px solid var(--border)",
  borderRadius: "8px",
  padding: "40px",
  width: "100%",
  maxWidth: "420px",
  boxShadow: "var(--shadow)",
  animation: "fadeIn 0.4s ease",
};

const labelStyle = {
  display: "block",
  fontSize: "11px",
  color: "var(--text-dim)",
  letterSpacing: "0.08em",
  marginBottom: "6px",
};

const inputStyle = {
  width: "100%",
  background: "var(--input-bg)",
  border: "1px solid var(--border)",
  color: "var(--text-primary)",
  padding: "11px 14px",
  fontFamily: "var(--font-mono)",
  fontSize: "13px",
  borderRadius: "4px",
  outline: "none",
  transition: "border-color 0.2s",
};

const btnStyle = (loading) => ({
  background: loading ? "var(--border)" : "var(--accent-green)",
  color: loading ? "var(--text-dim)" : "#000",
  border: "none",
  padding: "13px",
  fontFamily: "var(--font-display)",
  fontWeight: 700,
  fontSize: "14px",
  borderRadius: "4px",
  cursor: loading ? "not-allowed" : "pointer",
  marginTop: "4px",
  transition: "all 0.2s",
});

const themeBtn = {
  position: "absolute",
  top: "20px",
  right: "20px",
  background: "var(--bg-card)",
  border: "1px solid var(--border)",
  borderRadius: "50%",
  width: "40px",
  height: "40px",
  cursor: "pointer",
  fontSize: "18px",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
};
