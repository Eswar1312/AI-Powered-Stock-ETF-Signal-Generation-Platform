import React, { useState } from "react";
import { Link } from "react-router-dom";
import toast from "react-hot-toast";
import { forgotPassword } from "../utils/api";
import { useTheme } from "../context/ThemeContext";

export default function ForgotPassword() {
  const { theme, toggle } = useTheme();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [previewLink, setPreviewLink] = useState("");

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const result = await forgotPassword(email);
      setSent(true);
      if (result.previewResetLink) {
        setPreviewLink(result.previewResetLink);
      }
      toast.success(result.message || "Reset instructions sent");
    } catch (err) {
      toast.error(err.response?.data?.error || "Failed to start reset flow");
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
            Password recovery
          </div>
        </div>

        <div style={{ fontSize: "18px", fontFamily: "var(--font-display)", fontWeight: 700, marginBottom: "20px" }}>
          Forgot Password
        </div>

        <form onSubmit={submit} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          <div>
            <label style={labelStyle}>ACCOUNT EMAIL</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              required
              style={inputStyle}
            />
          </div>

          <button type="submit" disabled={loading} style={btnStyle(loading)}>
            {loading ? "Sending..." : "Send Reset Link"}
          </button>
        </form>

        {sent && (
          <div style={noticeStyle}>
            If your account exists, password reset instructions were sent.
            {previewLink && (
              <div style={{ marginTop: "10px" }}>
                <div style={{ color: "var(--text-secondary)", marginBottom: "6px" }}>Local preview link:</div>
                <a href={previewLink} style={{ color: "var(--accent-green)", wordBreak: "break-all" }}>
                  {previewLink}
                </a>
              </div>
            )}
          </div>
        )}

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

const noticeStyle = {
  marginTop: "16px",
  border: "1px solid var(--border)",
  background: "var(--bg-elevated)",
  borderRadius: "6px",
  padding: "12px",
  color: "var(--text-primary)",
  fontSize: "12px",
  lineHeight: 1.5,
};

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
