const express = require("express");
const router = express.Router();
const nodemailer = require("nodemailer");
const axios = require("axios");
const dotenv = require("dotenv");
const { protect } = require("../middleware/auth");
const Alert = require("../models/Alert");
const AlertHistory = require("../models/AlertHistory");
dotenv.config();

const TICKER_REGEX = /^[A-Z0-9]{1,10}(\.[A-Z]{1,5})?(-[A-Z0-9]{1,2})?$/;
const tickerQuoteCache = new Map();

function currencySymbolForTicker(ticker) {
  const t = String(ticker || "").toUpperCase();
  return t.endsWith(".NS") || t.endsWith(".BO") ? "₹" : "$";
}

function formatPriceWithSymbol(value, symbol) {
  const n = Number(value);
  if (!Number.isFinite(n)) return `${symbol}0.00`;
  return `${symbol}${n.toFixed(2)}`;
}

function pollIntervalByMarketState(marketState) {
  const state = String(marketState || "").toUpperCase();
  if (state === "REGULAR" || state === "OPEN") return 1000;
  if (state === "PRE" || state === "PREPRE" || state === "POST") return 3000;
  return 15000;
}

// ─── Email Transporter ───────────────────────────────────────────
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || "smtp.gmail.com",
  port: parseInt(process.env.SMTP_PORT) || 587,
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

// ─── Send Email ───────────────────────────────────────────────────
async function sendEmail(to, subject, html) {
  if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
    console.log("Email not configured — skipping email alert");
    return;
  }
  try {
    await transporter.sendMail({
      from: `"YourStock AI 🚨" <${process.env.ALERT_FROM || process.env.SMTP_USER}>`,
      to,
      subject,
      html,
    });
    console.log(`Email sent to ${to}`);
  } catch (err) {
    console.error("Email error:", err.message);
  }
}

// ─── Send Slack ───────────────────────────────────────────────────
async function sendSlack(message) {
  if (!process.env.SLACK_WEBHOOK_URL) return;
  try {
    await axios.post(process.env.SLACK_WEBHOOK_URL, { text: message });
  } catch {
    // Slack notifications are optional; ignore webhook failures silently.
  }
}

function toAlertResponse(alert) {
  return {
    id: String(alert._id),
    ticker: alert.ticker,
    condition: alert.condition,
    threshold: alert.threshold,
    email: alert.email,
    slack: alert.slack,
    status: alert.status,
    createdAt: alert.createdAt,
    triggeredAt: alert.triggeredAt,
    triggeredPrice: alert.triggeredPrice,
    deletedAt: alert.deletedAt,
  };
}

// ─── Fetch current price from Yahoo Finance ───────────────────────
async function fetchCurrentPrice(ticker) {
  try {
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${ticker}?interval=1m&range=1d`;
    const res = await axios.get(url, {
      headers: { "User-Agent": "Mozilla/5.0" },
      timeout: 8000,
    });

    const result = res.data?.chart?.result?.[0];
    const meta = result?.meta || {};
    const closes = result?.indicators?.quote?.[0]?.close || [];

    // Prefer most recent 1m candle close for near real-time comparison.
    for (let i = closes.length - 1; i >= 0; i -= 1) {
      const v = Number(closes[i]);
      if (Number.isFinite(v) && v > 0) {
        return {
          price: v,
          marketState: meta.marketState || null,
        };
      }
    }

    const fallback = Number(meta.regularMarketPrice);
    if (Number.isFinite(fallback) && fallback > 0) {
      return {
        price: fallback,
        marketState: meta.marketState || null,
      };
    }
    return null;
  } catch {
    return null;
  }
}

async function getTickerQuote(ticker) {
  const now = Date.now();
  const cached = tickerQuoteCache.get(ticker);
  if (cached && now < cached.nextDueAt && Number.isFinite(cached.price)) {
    return cached;
  }

  const fetched = await fetchCurrentPrice(ticker);
  if (fetched && Number.isFinite(fetched.price)) {
    const pollMs = pollIntervalByMarketState(fetched.marketState);
    const next = {
      price: fetched.price,
      marketState: fetched.marketState,
      fetchedAt: now,
      nextDueAt: now + pollMs,
    };
    tickerQuoteCache.set(ticker, next);
    return next;
  }

  if (cached && Number.isFinite(cached.price)) {
    // Temporary provider hiccup: keep last known quote briefly.
    const next = {
      ...cached,
      nextDueAt: now + 3000,
    };
    tickerQuoteCache.set(ticker, next);
    return next;
  }

  return null;
}

// ─── Check all alerts ─────────────────────────────────────────────
async function checkAlerts() {
  const active = await Alert.find({ status: "active" });
  if (active.length === 0) return;

  const tickers = [...new Set(active.map((a) => a.ticker))];
  const tickerPrices = new Map();

  await Promise.all(
    tickers.map(async (ticker) => {
      const quote = await getTickerQuote(ticker);
      tickerPrices.set(ticker, quote?.price ?? null);
    }),
  );

  for (const alert of active) {
    const price = tickerPrices.get(alert.ticker);
    if (!price) continue;
    const currency = currencySymbolForTicker(alert.ticker);

    let triggered = false;
    let conditionText = "";

    if (alert.condition === "above" && price >= alert.threshold) {
      triggered = true;
      conditionText = `rose above ${formatPriceWithSymbol(alert.threshold, currency)}`;
    } else if (alert.condition === "below" && price <= alert.threshold) {
      triggered = true;
      conditionText = `dropped below ${formatPriceWithSymbol(alert.threshold, currency)}`;
    } else if (alert.condition === "change_pct") {
      const pct = Math.abs(((price - alert.threshold) / alert.threshold) * 100);
      if (pct >= Math.abs(alert.threshold)) {
        triggered = true;
        conditionText = `changed by ${pct.toFixed(2)}%`;
      }
    }

    if (triggered) {
      alert.status = "triggered";
      alert.triggeredAt = new Date();
      alert.triggeredPrice = price;
      await alert.save();

      console.log(`🚨 Alert triggered: ${alert.ticker} ${conditionText} (Current: ${formatPriceWithSymbol(price, currency)})`);

      const subject = `🚨 YourStock AI Alert: ${alert.ticker} ${conditionText}`;
      const html = `
        <div style="font-family: monospace; background: #080c10; color: #e2e8f0; padding: 24px; border-radius: 8px;">
          <h2 style="color: #00ff88;">🚨 YourStock AI Price Alert</h2>
          <p><strong>Ticker:</strong> ${alert.ticker}</p>
          <p><strong>Condition:</strong> ${conditionText}</p>
          <p><strong>Current Price:</strong> ${formatPriceWithSymbol(price, currency)}</p>
          <p><strong>Your Threshold:</strong> ${formatPriceWithSymbol(alert.threshold, currency)}</p>
          <p><strong>Triggered At:</strong> ${new Date().toLocaleString()}</p>
          <hr style="border-color: #1e2d3d;" />
          <p style="color: #7d9bba; font-size: 12px;">This is an automated alert from YourStock AI. Past performance does not guarantee future results.</p>
        </div>
      `;

      const slackMsg = `🚨 *YourStock AI Alert*\n*${alert.ticker}* ${conditionText}\nCurrent Price: ${formatPriceWithSymbol(price, currency)} | Threshold: ${formatPriceWithSymbol(alert.threshold, currency)}`;

      await AlertHistory.create({
        userId: alert.userId,
        alertId: alert._id,
        ticker: alert.ticker,
        eventType: "triggered",
        condition: alert.condition,
        threshold: alert.threshold,
        email: alert.email,
        triggeredPrice: price,
        message: conditionText,
      });

      if (alert.email) await sendEmail(alert.email, subject, html);
      await sendSlack(slackMsg);
    }
  }
}

// ─── Realtime Scheduler: every second, continuous checks ───────────
let isCheckingAlerts = false;

async function runAlertCheckCycle(tag) {
  if (isCheckingAlerts) return;
  isCheckingAlerts = true;
  try {
    await checkAlerts();
  } catch (err) {
    console.error(`Alert scheduler error (${tag}):`, err.message);
  } finally {
    isCheckingAlerts = false;
  }
}

// Catch up immediately when backend starts/restarts.
setTimeout(() => {
  runAlertCheckCycle("startup");
}, 0);

setInterval(async () => {
  await runAlertCheckCycle("interval");
}, 1000);

// ─── Routes ───────────────────────────────────────────────────────
router.use(protect);

router.get("/", async (req, res) => {
  try {
    const userAlerts = await Alert.find({
      userId: req.user._id,
      status: { $in: ["active", "triggered"] },
    }).sort({ createdAt: -1 });
    res.json(userAlerts.map(toAlertResponse));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get("/history", async (req, res) => {
  try {
    const history = await AlertHistory.find({ userId: req.user._id })
      .sort({ eventAt: -1 })
      .limit(200);
    res.json(history);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post("/", async (req, res) => {
  const { ticker, condition, threshold, email, slack } = req.body;
  if (!ticker || !condition || !threshold) {
    return res.status(400).json({ error: "ticker, condition, and threshold are required" });
  }

  const normalizedTicker = String(ticker).trim().toUpperCase();
  if (!TICKER_REGEX.test(normalizedTicker)) {
    return res.status(400).json({ error: "Invalid ticker. Use formats like AAPL, REL, RELIANCE.NS, BRK-B" });
  }

  if (!["above", "below", "change_pct"].includes(condition)) {
    return res.status(400).json({ error: "condition must be above, below, or change_pct" });
  }

  const parsedThreshold = parseFloat(threshold);
  if (Number.isNaN(parsedThreshold)) {
    return res.status(400).json({ error: "threshold must be a valid number" });
  }

  const notifyEmail = (email || "").trim() || req.user.email;

  try {
    const alert = await Alert.create({
      userId: req.user._id,
      ticker: normalizedTicker,
      condition,
      threshold: parsedThreshold,
      email: notifyEmail,
      slack: !!slack,
    });

    await AlertHistory.create({
      userId: req.user._id,
      alertId: alert._id,
      ticker: alert.ticker,
      eventType: "created",
      condition: alert.condition,
      threshold: alert.threshold,
      email: alert.email,
      message: "Alert created",
    });

    console.log(`Alert created: ${alert.ticker} ${alert.condition} ${alert.threshold}`);
    res.status(201).json(toAlertResponse(alert));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete("/:id", async (req, res) => {
  try {
    const alert = await Alert.findOne({
      _id: req.params.id,
      userId: req.user._id,
      status: "active",
    });
    if (!alert) return res.status(404).json({ error: "Alert not found" });

    alert.status = "deleted";
    alert.deletedAt = new Date();
    await alert.save();

    await AlertHistory.create({
      userId: req.user._id,
      alertId: alert._id,
      ticker: alert.ticker,
      eventType: "deleted",
      condition: alert.condition,
      threshold: alert.threshold,
      email: alert.email,
      message: "Alert deleted",
    });

    res.json({ message: "Alert deleted" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Manual trigger for testing
router.post("/test", async (req, res) => {
  const { email, slack } = req.body;
  const toEmail = (email || "").trim() || req.user.email;
  const subject = "✅ YourStock AI Test Alert";
  const html = `<div style="font-family:monospace;padding:20px"><h2>✅ Test Alert Working!</h2><p>Your YourStock AI email alerts are configured correctly.</p></div>`;
  await sendEmail(toEmail, subject, html);
  await AlertHistory.create({
    userId: req.user._id,
    ticker: "TEST",
    eventType: "test_email",
    email: toEmail,
    message: "Manual test email sent",
  });
  if (slack) await sendSlack("✅ YourStock AI Slack alerts are working!");
  res.json({ message: "Test alert sent" });
});

module.exports = router;
