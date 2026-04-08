import React, { useState, useEffect } from "react";
import toast from "react-hot-toast";
import Card from "../components/Card";
import { fetchPortfolio, fetchPortfolioHistory, fetchWatchlist, addHolding, removeHolding } from "../utils/api";
import { currencySymbolForTicker } from "../utils/currency";

// Valid ticker pattern: letters, digits, dots, hyphens — e.g. RELIANCE.NS, AAPL, BRK-B
const TICKER_REGEX = /^[A-Z0-9]{1,10}(\.[A-Z]{1,3})?(-[A-Z])?$/;
const FALLBACK_WATCHLIST = [
  { ticker: "NIFTYBEES.NS", name: "Nifty BeES ETF" },
  { ticker: "RELIANCE.NS", name: "Reliance Industries" },
  { ticker: "TCS.NS", name: "TCS" },
  { ticker: "INFY.NS", name: "Infosys" },
  { ticker: "AAPL", name: "Apple Inc." },
  { ticker: "MSFT", name: "Microsoft" },
  { ticker: "GOOGL", name: "Alphabet" },
  { ticker: "SPY", name: "S&P 500 ETF" },
];

function FieldError({ msg }) {
  if (!msg) return null;
  return (
    <div style={{ fontSize: "11px", color: "var(--accent-red)", marginTop: "4px" }}>
      ⚠ {msg}
    </div>
  );
}

export default function PortfolioPage() {
  const [holdings, setHoldings] = useState([]);
  const [history, setHistory] = useState([]);
  const [watchlist, setWatchlist] = useState(FALLBACK_WATCHLIST);
  const [form, setForm] = useState({ market: "", ticker: "", name: "", quantity: "", buyPrice: "" });
  const [errors, setErrors] = useState({});
  const [adding, setAdding] = useState(false);

  const load = async () => {
    try {
      const [portfolioData, historyData] = await Promise.all([
        fetchPortfolio(),
        fetchPortfolioHistory(),
      ]);
      setHoldings(portfolioData);
      setHistory(historyData);
    } catch {}
  };

  useEffect(() => { load(); }, []);

  useEffect(() => {
    fetchWatchlist()
      .then((list) => {
        if (Array.isArray(list) && list.length > 0) {
          setWatchlist(list);
        }
      })
      .catch(() => {
        setWatchlist(FALLBACK_WATCHLIST);
      });
  }, []);

  const inTickers = watchlist.filter((w) => {
    const t = String(w.ticker || "").toUpperCase();
    return t.endsWith(".NS") || t.endsWith(".BO");
  });
  const usTickers = watchlist.filter((w) => {
    const t = String(w.ticker || "").toUpperCase();
    return !(t.endsWith(".NS") || t.endsWith(".BO"));
  });
  const tickerOptions = form.market === "IN" ? inTickers : form.market === "US" ? usTickers : [];

  useEffect(() => {
    const current = String(form.ticker || "").toUpperCase();
    const isValidCurrent = tickerOptions.some((w) => String(w.ticker || "").toUpperCase() === current);
    if (!isValidCurrent && form.ticker) {
      setForm((f) => ({
        ...f,
        ticker: "",
      }));
    }
  }, [form.market, watchlist]);

  const validate = () => {
    const e = {};

    // Market
    if (!form.market) {
      e.market = "Market is required";
    }

    // Ticker
    const t = form.ticker.trim().toUpperCase();
    if (!t) {
      e.ticker = "Ticker is required";
    } else if (!TICKER_REGEX.test(t)) {
      e.ticker = "Invalid ticker format (e.g. RELIANCE.NS, AAPL, TCS.NS)";
    } else if (form.market === "IN" && !(t.endsWith(".NS") || t.endsWith(".BO"))) {
      e.ticker = "For India market, use NSE/BSE ticker (e.g. RELIANCE.NS)";
    } else if (form.market === "US" && (t.endsWith(".NS") || t.endsWith(".BO"))) {
      e.ticker = "For US market, use US ticker without .NS/.BO (e.g. AAPL)";
    }

    // Quantity
    const qty = parseFloat(form.quantity);
    if (form.quantity === "") {
      e.quantity = "Quantity is required";
    } else if (isNaN(qty) || qty <= 0) {
      e.quantity = "Quantity must be greater than 0";
    } else if (!Number.isInteger(qty)) {
      e.quantity = "Quantity must be a whole number";
    }

    // Buy price
    const price = parseFloat(form.buyPrice);
    if (form.buyPrice === "") {
      e.buyPrice = "Buy price is required";
    } else if (isNaN(price) || price <= 0) {
      e.buyPrice = "Buy price must be greater than 0";
    }

    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleChange = (field) => (e) => {
    const val = field === "ticker" ? e.target.value.toUpperCase() : e.target.value;
    setForm((f) => ({ ...f, [field]: val }));
    // Clear error on change
    if (errors[field]) setErrors((prev) => ({ ...prev, [field]: "" }));
  };

  const add = async () => {
    if (!validate()) return;
    setAdding(true);
    try {
      await addHolding({ ...form, ticker: form.ticker.trim().toUpperCase() });
      toast.success("Holding added successfully");
      setForm({ market: "", ticker: "", name: "", quantity: "", buyPrice: "" });
      setErrors({});
      load();
    } catch (err) {
      toast.error(err.response?.data?.error || "Failed to add holding");
    } finally {
      setAdding(false);
    }
  };

  const remove = async (id) => {
    try {
      await removeHolding(id);
      setHoldings((h) => h.filter((x) => x.id !== id));
      toast.success("Holding removed");
    } catch {
      toast.error("Failed to remove");
    }
  };

  const inputStyle = (hasError) => ({
    background: "var(--input-bg)",
    border: `1px solid ${hasError ? "var(--accent-red)" : "var(--border)"}`,
    color: "var(--text-primary)",
    padding: "10px 14px",
    fontFamily: "var(--font-mono)",
    fontSize: "13px",
    borderRadius: "4px",
    outline: "none",
    width: "100%",
    transition: "border-color 0.2s",
  });

  const formatAmount = (amount, symbol) => {
    const locale = symbol === "₹" ? "en-IN" : "en-US";
    return Number(amount || 0).toLocaleString(locale, { maximumFractionDigits: 2 });
  };

  const totalsByCurrency = holdings.reduce((acc, h) => {
    const symbol = currencySymbolForTicker(h.ticker);
    const invested = Number(h.quantity) * Number(h.buyPrice);
    acc[symbol] = (acc[symbol] || 0) + (Number.isFinite(invested) ? invested : 0);
    return acc;
  }, {});

  const inrTotal = totalsByCurrency["₹"] || 0;
  const usdTotal = totalsByCurrency["$"] || 0;
  const hasINR = inrTotal > 0;
  const hasUSD = usdTotal > 0;
  const hasMixedCurrencies = hasINR && hasUSD;

  const buyPriceSymbol = form.market === "IN" ? "₹" : form.market === "US" ? "$" : "";

  return (
    <div>
      <div style={{ marginBottom: "28px" }}>
        <h1 style={{ fontFamily: "var(--font-display)", fontWeight: 800, fontSize: "24px", marginBottom: "4px" }}>
          ◻ Portfolio
        </h1>
        <p style={{ color: "var(--text-secondary)", fontSize: "13px" }}>
          Track your holdings and monitor investments
        </p>
      </div>

      {/* Summary — only HOLDINGS + TOTAL INVESTED */}
      {holdings.length > 0 && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: "16px", marginBottom: "24px" }}>
          <div style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: "6px", padding: "20px" }}>
            <div style={{ fontSize: "11px", color: "var(--text-dim)", marginBottom: "6px" }}>HOLDINGS</div>
            <div style={{ fontFamily: "var(--font-display)", fontWeight: 800, fontSize: "28px" }}>{holdings.length}</div>
          </div>
          <div style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: "6px", padding: "20px" }}>
            <div style={{ fontSize: "11px", color: "var(--text-dim)", marginBottom: "6px" }}>TOTAL INVESTED</div>
            {hasMixedCurrencies ? (
              <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                <div style={{ fontFamily: "var(--font-display)", fontWeight: 800, fontSize: "24px" }}>
                  ₹{formatAmount(inrTotal, "₹")}
                </div>
                <div style={{ fontFamily: "var(--font-display)", fontWeight: 800, fontSize: "24px" }}>
                  ${formatAmount(usdTotal, "$")}
                </div>
                <div style={{ fontSize: "10px", color: "var(--text-dim)", marginTop: "2px" }}>Separated by currency</div>
              </div>
            ) : (
              <div style={{ fontFamily: "var(--font-display)", fontWeight: 800, fontSize: "28px" }}>
                {hasINR ? `₹${formatAmount(inrTotal, "₹")}` : `$${formatAmount(usdTotal, "$")}`}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Add Holding */}
      <Card title="Add Holding" style={{ marginBottom: "24px" }}>
        <div style={{ display: "grid", gridTemplateColumns: "1.1fr 2fr 2fr 1fr 1fr auto", gap: "12px", alignItems: "start" }}>
          {/* Market */}
          <div>
            <label style={labelStyle}>MARKET <span style={{ color: "var(--accent-red)" }}>*</span></label>
            <select
              value={form.market}
              onChange={(e) => {
                const market = e.target.value;
                setForm((f) => ({ ...f, market, ticker: "" }));
                if (errors.market) setErrors((prev) => ({ ...prev, market: "" }));
              }}
              style={inputStyle(errors.market)}
            >
              <option value="">Choose market</option>
              <option value="IN">India (₹)</option>
              <option value="US">US ($)</option>
            </select>
            <FieldError msg={errors.market} />
          </div>

          {/* Ticker */}
          <div>
            <label style={labelStyle}>TICKER <span style={{ color: "var(--accent-red)" }}>*</span></label>
            <select
              value={form.ticker}
              onChange={(e) => {
                const selectedTicker = String(e.target.value || "").toUpperCase();
                const selected = tickerOptions.find((w) => String(w.ticker || "").toUpperCase() === selectedTicker);
                setForm((f) => ({
                  ...f,
                  ticker: selectedTicker,
                  name: f.name || (selected?.name || ""),
                }));
                if (errors.ticker) setErrors((prev) => ({ ...prev, ticker: "" }));
              }}
              onBlur={() => validate()}
              style={inputStyle(errors.ticker)}
            >
              {form.market === "" ? (
                <option value="">Choose market first</option>
              ) : tickerOptions.length === 0 ? (
                <option value="">No tickers available</option>
              ) : (
                <>
                  <option value="">Choose ticker</option>
                  {tickerOptions.map((w) => (
                    <option key={w.ticker} value={w.ticker}>
                      {w.ticker} - {w.name || w.ticker}
                    </option>
                  ))}
                </>
              )}
            </select>
            <FieldError msg={errors.ticker} />
          </div>

          {/* Name */}
          <div>
            <label style={labelStyle}>NAME <span style={{ color: "var(--text-dim)", fontSize: "10px" }}>(optional)</span></label>
            <input
              value={form.name}
              onChange={handleChange("name")}
              placeholder="Reliance Industries"
              style={inputStyle(false)}
            />
          </div>

          {/* Quantity */}
          <div>
            <label style={labelStyle}>QUANTITY <span style={{ color: "var(--accent-red)" }}>*</span></label>
            <input
              value={form.quantity}
              onChange={handleChange("quantity")}
              onBlur={() => validate()}
              placeholder="10"
              type="number"
              min="1"
              step="1"
              style={inputStyle(errors.quantity)}
            />
            <FieldError msg={errors.quantity} />
          </div>

          {/* Buy Price */}
          <div>
            <label style={labelStyle}>BUY PRICE ({buyPriceSymbol}) <span style={{ color: "var(--accent-red)" }}>*</span></label>
            <input
              value={form.buyPrice}
              onChange={handleChange("buyPrice")}
              onBlur={() => validate()}
              placeholder={form.market === "IN" ? "e.g. 2500" : form.market === "US" ? "e.g. 180" : "Choose market first"}
              type="number"
              min="0.01"
              step="0.01"
              style={inputStyle(errors.buyPrice)}
            />
            <FieldError msg={errors.buyPrice} />
          </div>

          {/* Submit */}
          <div style={{ paddingTop: "20px" }}>
            <button
              onClick={add}
              disabled={adding}
              style={{
                background: adding ? "var(--border)" : "var(--accent-green)",
                color: adding ? "var(--text-dim)" : "#000",
                border: "none", padding: "10px 20px",
                fontFamily: "var(--font-display)", fontWeight: 700,
                fontSize: "13px", borderRadius: "4px",
                cursor: adding ? "not-allowed" : "pointer",
                whiteSpace: "nowrap", transition: "all 0.2s",
              }}
            >
              {adding ? "Adding..." : "+ Add"}
            </button>
          </div>
        </div>

        {/* Ticker hint */}
        <div style={{ marginTop: "10px", fontSize: "11px", color: "var(--text-dim)" }}>
          Ticker examples: India → <span style={{ color: "var(--accent-blue)" }}>RELIANCE.NS</span>, <span style={{ color: "var(--accent-blue)" }}>TCS.NS</span> · US → <span style={{ color: "var(--accent-blue)" }}>AAPL</span>, <span style={{ color: "var(--accent-blue)" }}>MSFT</span>, <span style={{ color: "var(--accent-blue)" }}>SPY</span>
        </div>
      </Card>

      {/* Holdings Table */}
      <Card title="Holdings">
        {holdings.length === 0 ? (
          <div style={{ textAlign: "center", padding: "40px", color: "var(--text-dim)", fontSize: "13px" }}>
            No holdings yet. Add your first position above.
          </div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px" }}>
              <thead>
                <tr style={{ borderBottom: "1px solid var(--border)" }}>
                  {["Ticker", "Name", "Qty", "Buy Price", "Invested", "Actions"].map((h) => (
                    <th key={h} style={{
                      padding: "10px 12px", textAlign: "left",
                      fontSize: "11px", color: "var(--text-dim)",
                      fontWeight: 400, letterSpacing: "0.05em",
                    }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {holdings.map((h) => {
                  const symbol = currencySymbolForTicker(h.ticker);
                  const invested = formatAmount(h.quantity * h.buyPrice, symbol);
                  return (
                    <tr key={h.id} style={{ borderBottom: "1px solid var(--border)" }}>
                      <td style={{ padding: "14px 12px", fontFamily: "var(--font-display)", fontWeight: 700 }}>
                        {h.ticker}
                      </td>
                      <td style={{ padding: "14px 12px", color: "var(--text-secondary)" }}>{h.name || "—"}</td>
                      <td style={{ padding: "14px 12px" }}>{h.quantity}</td>
                      <td style={{ padding: "14px 12px" }}>{symbol}{formatAmount(h.buyPrice, symbol)}</td>
                      <td style={{ padding: "14px 12px", fontWeight: 700 }}>{symbol}{invested}</td>
                      <td style={{ padding: "14px 12px" }}>
                        <button
                          onClick={() => remove(h.id)}
                          style={{
                            background: "transparent", border: "1px solid var(--accent-red)",
                            color: "var(--accent-red)", padding: "5px 14px",
                            fontFamily: "var(--font-mono)", fontSize: "11px",
                            borderRadius: "3px", cursor: "pointer",
                          }}
                        >
                          ✕ Remove
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Card title="Portfolio History" subtitle={`${history.length} event(s)`} style={{ marginTop: "24px" }}>
        {history.length === 0 ? (
          <div style={{ textAlign: "center", padding: "26px", color: "var(--text-dim)", fontSize: "13px" }}>
            No portfolio history yet.
          </div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px" }}>
              <thead>
                <tr style={{ borderBottom: "1px solid var(--border)" }}>
                  {[
                    "Time",
                    "Event",
                    "Ticker",
                    "Name",
                    "Qty",
                    "Buy Price",
                  ].map((h) => (
                    <th key={h} style={{
                      padding: "10px 12px",
                      textAlign: "left",
                      fontSize: "11px",
                      color: "var(--text-dim)",
                      fontWeight: 400,
                      letterSpacing: "0.05em",
                    }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {history.slice(0, 40).map((h) => {
                  const symbol = currencySymbolForTicker(h.ticker);
                  return (
                  <tr key={h._id} style={{ borderBottom: "1px solid var(--border)" }}>
                    <td style={{ padding: "12px" }}>{new Date(h.eventAt).toLocaleString()}</td>
                    <td style={{ padding: "12px", fontWeight: 700 }}>{h.eventType.toUpperCase()}</td>
                    <td style={{ padding: "12px", fontFamily: "var(--font-display)", fontWeight: 700 }}>{h.ticker}</td>
                    <td style={{ padding: "12px", color: "var(--text-secondary)" }}>{h.name || "-"}</td>
                    <td style={{ padding: "12px" }}>{h.quantity}</td>
                    <td style={{ padding: "12px" }}>{symbol}{formatAmount(Number(h.buyPrice || 0), symbol)}</td>
                  </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}

const labelStyle = {
  fontSize: "11px", color: "var(--text-dim)",
  display: "block", marginBottom: "6px", letterSpacing: "0.05em",
};
