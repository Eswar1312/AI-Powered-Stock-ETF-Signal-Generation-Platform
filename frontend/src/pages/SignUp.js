import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";
import toast from "react-hot-toast";

export default function SignUp() {
  const { signup, verifySignupOtp, resendSignupOtp } = useAuth();
  const { theme, toggle } = useTheme();
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: "", email: "", password: "", confirm: "" });
  const [otp, setOtp] = useState("");
  const [pendingEmail, setPendingEmail] = useState("");
  const [previewOtp, setPreviewOtp] = useState("");
  const [step, setStep] = useState("signup");
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    if (form.password !== form.confirm) {
      toast.error("Passwords do not match");
      return;
    }
    if (form.password.length < 6) {
      toast.error("Password must be at least 6 characters");
      return;
    }
    setLoading(true);
    try {
      const result = await signup(form.name, form.email, form.password);
      setPendingEmail(result.email || form.email);
      setPreviewOtp(result.previewOtp || "");
      setStep("verify");
      toast.success("OTP sent to your email");
    } catch (err) {
      toast.error(err.response?.data?.error || "Sign up failed");
    } finally {
      setLoading(false);
    }
  };

  const submitOtp = async (e) => {
    e.preventDefault();
    if (!otp || otp.trim().length < 4) {
      toast.error("Enter valid OTP");
      return;
    }

    setLoading(true);
    try {
      const user = await verifySignupOtp(pendingEmail, otp.trim());
      toast.success(`Welcome, ${user.name}! Email verified.`);
      navigate(user.role === "admin" ? "/admin" : "/");
    } catch (err) {
      toast.error(err.response?.data?.error || "OTP verification failed");
    } finally {
      setLoading(false);
    }
  };

  const resendOtp = async () => {
    if (!pendingEmail) return;
    setLoading(true);
    try {
      const result = await resendSignupOtp(pendingEmail);
      setPreviewOtp(result.previewOtp || "");
      toast.success(result.message || "OTP resent");
    } catch (err) {
      toast.error(err.response?.data?.error || "Failed to resend OTP");
    } finally {
      setLoading(false);
    }
  };

  const set = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }));

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
            Create your account
          </div>
        </div>

        {step === "signup" ? (
          <form onSubmit={submit} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            <div>
              <label style={labelStyle}>FULL NAME</label>
              <input value={form.name} onChange={set("name")} placeholder="John Doe" required style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>EMAIL</label>
              <input type="email" value={form.email} onChange={set("email")} placeholder="you@example.com" required style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>PASSWORD</label>
              <input type="password" value={form.password} onChange={set("password")} placeholder="Min 6 characters" required style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>CONFIRM PASSWORD</label>
              <input type="password" value={form.confirm} onChange={set("confirm")} placeholder="Repeat password" required style={inputStyle} />
            </div>

            <button type="submit" disabled={loading} style={btnStyle(loading)}>
              {loading ? "Sending OTP..." : "Send OTP →"}
            </button>
          </form>
        ) : (
          <form onSubmit={submitOtp} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            <div style={{ fontSize: "12px", color: "var(--text-secondary)", lineHeight: 1.6 }}>
              Enter the OTP sent to <strong>{pendingEmail}</strong>
            </div>
            <div>
              <label style={labelStyle}>OTP</label>
              <input
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
                placeholder="6-digit OTP"
                required
                style={inputStyle}
              />
            </div>

            {previewOtp && (
              <div style={{ fontSize: "12px", color: "var(--text-dim)", border: "1px solid var(--border)", padding: "8px 10px", borderRadius: "4px" }}>
                Dev preview OTP: <strong style={{ color: "var(--accent-green)" }}>{previewOtp}</strong>
              </div>
            )}

            <button type="submit" disabled={loading} style={btnStyle(loading)}>
              {loading ? "Verifying..." : "Verify & Create Account →"}
            </button>

            <button
              type="button"
              onClick={resendOtp}
              disabled={loading}
              style={{
                background: "transparent",
                color: "var(--accent-green)",
                border: "1px solid var(--accent-green)",
                padding: "11px",
                fontFamily: "var(--font-display)",
                fontWeight: 700,
                fontSize: "13px",
                borderRadius: "4px",
                cursor: loading ? "not-allowed" : "pointer",
              }}
            >
              Resend OTP
            </button>

            <button
              type="button"
              onClick={() => setStep("signup")}
              disabled={loading}
              style={{
                background: "transparent",
                color: "var(--text-secondary)",
                border: "1px solid var(--border)",
                padding: "10px",
                fontFamily: "var(--font-mono)",
                fontSize: "12px",
                borderRadius: "4px",
                cursor: loading ? "not-allowed" : "pointer",
              }}
            >
              Back to details
            </button>
          </form>
        )}

        <div style={{ textAlign: "center", marginTop: "20px", fontSize: "13px", color: "var(--text-secondary)" }}>
          Already have an account?{" "}
          <Link to="/signin" style={{ color: "var(--accent-green)", textDecoration: "none" }}>
            Sign In
          </Link>
        </div>
      </div>
    </div>
  );
}

const pageStyle = {
  minHeight: "100vh", display: "flex", alignItems: "center",
  justifyContent: "center", background: "var(--bg)", padding: "24px", position: "relative",
};
const cardStyle = {
  background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: "8px",
  padding: "40px", width: "100%", maxWidth: "420px", boxShadow: "var(--shadow)", animation: "fadeIn 0.4s ease",
};
const labelStyle = { display: "block", fontSize: "11px", color: "var(--text-dim)", letterSpacing: "0.08em", marginBottom: "6px" };
const inputStyle = {
  width: "100%", background: "var(--input-bg)", border: "1px solid var(--border)",
  color: "var(--text-primary)", padding: "11px 14px", fontFamily: "var(--font-mono)",
  fontSize: "13px", borderRadius: "4px", outline: "none",
};
const btnStyle = (loading) => ({
  background: loading ? "var(--border)" : "var(--accent-green)", color: loading ? "var(--text-dim)" : "#000",
  border: "none", padding: "13px", fontFamily: "var(--font-display)", fontWeight: 700,
  fontSize: "14px", borderRadius: "4px", cursor: loading ? "not-allowed" : "pointer", marginTop: "4px",
});
const themeBtn = {
  position: "absolute", top: "20px", right: "20px", background: "var(--bg-card)",
  border: "1px solid var(--border)", borderRadius: "50%", width: "40px", height: "40px",
  cursor: "pointer", fontSize: "18px", display: "flex", alignItems: "center", justifyContent: "center",
};
