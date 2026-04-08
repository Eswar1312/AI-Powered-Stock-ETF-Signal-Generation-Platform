import React, { useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import toast from "react-hot-toast";
import { resetPassword } from "../utils/api";
import { useTheme } from "../context/ThemeContext";

export default function ResetPassword() {
  const { token } = useParams();
  const navigate = useNavigate();
  const { theme, toggle } = useTheme();

  const [form, setForm] = useState({ password: "", confirm: "" });
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();

    if (form.password.length < 6) {
      toast.error("Password must be at least 6 characters");
      return;
    }

    if (form.password !== form.confirm) {
      toast.error("Passwords do not match");
      return;
    }

    setLoading(true);
    try {
      const result = await resetPassword(token, form.password);
      toast.success(result.message || "Password reset successful");
      navigate("/signin");
    } catch (err) {
      toast.error(err.response?.data?.error || "Failed to reset password");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={pageStyle}>
      <button onClick={toggle} style={themeBtn}>
        {theme === "dark" ? "SUN" : "MOON"}
      </button>

      <div style={cardStyle}>
        <div style={{ textAlign: "center", marginBottom: "28px" }}>
          <div style={{ fontFamily: "var(--font-display)", fontWeight: 800, fontSize: "32px" }}>
            YourStock AI
          </div>
          <div style={{ color: "var(--text-secondary)", fontSize: "13px", marginTop: "6px" }}>
            Secure password reset
          </div>
        </div>

        <div style={{ fontSize: "18px", fontFamily: "var(--font-display)", fontWeight: 700, marginBottom: "20px" }}>
          Reset Password
        </div>

        <form onSubmit={submit} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          <div>
            <label style={labelStyle}>NEW PASSWORD</label>
            <input
              type="password"
              value={form.password}
              onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
              placeholder="Minimum 6 characters"
              required
              style={inputStyle}
            />
          </div>

          <div>
            <label style={labelStyle}>CONFIRM PASSWORD</label>
            <input
              type="password"
              value={form.confirm}
              onChange={(e) => setForm((f) => ({ ...f, confirm: e.target.value }))}
              placeholder="Repeat new password"
              required
              style={inputStyle}
            />
          </div>

          <button type="submit" disabled={loading} style={btnStyle(loading)}>
            {loading ? "Updating..." : "Update Password"}
          </button>
        </form>

        <div style={{ textAlign: "center", marginTop: "20px", fontSize: "13px", color: "var(--text-secondary)" }}>
          Back to{" "}
          <Link to="/signin" style={{ color: "var(--accent-green)", textDecoration: "none" }}>
            Sign In
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
  maxWidth: "440px",
  boxShadow: "var(--shadow)",
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
  fontSize: "10px",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontFamily: "var(--font-mono)",
  color: "var(--text-secondary)",
};
