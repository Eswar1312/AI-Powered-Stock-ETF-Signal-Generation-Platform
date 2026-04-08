const { getBacktestingEnabled } = require("../services/appSettings");
const { runPythonEngine } = require("../services/pythonEngine");

function isIsoDate(value) {
  return /^\d{4}-\d{2}-\d{2}$/.test(String(value || ""));
}

exports.runBacktest = async (req, res) => {
  const ticker = String(req.params.ticker || "").trim().toUpperCase();
  const period = parseInt(req.query.period, 10) || 10;
  const startDate = String(req.query.start || "").trim();
  const endDate = String(req.query.end || "").trim();
  const hasCustomRange = Boolean(startDate || endDate);

  if (!ticker) {
    return res.status(400).json({ error: "Ticker is required" });
  }

  if (hasCustomRange) {
    if (!startDate || !endDate) {
      return res.status(400).json({ error: "Both start and end dates are required for custom range" });
    }

    if (!isIsoDate(startDate) || !isIsoDate(endDate)) {
      return res.status(400).json({ error: "Custom range dates must be in YYYY-MM-DD format" });
    }

    if (new Date(startDate) > new Date(endDate)) {
      return res.status(400).json({ error: "Start date cannot be after end date" });
    }
  }

  try {
    const backtestingEnabled = await getBacktestingEnabled();
    if (!backtestingEnabled) {
      return res.status(403).json({ error: "Backtesting is currently disabled by admin" });
    }

    const result = await runPythonEngine(ticker, hasCustomRange ? { startDate, endDate } : { period });
    if (result.error) {
      return res.status(404).json({ error: result.error });
    }

    if (!result.backtest) {
      return res.status(500).json({ error: "Backtest output missing from engine" });
    }

    return res.json({
      ticker: result.ticker,
      signal: result.signal,
      confidence: result.confidence,
      backtestingEnabled: true,
      analyzer: {
        name: "Backtesting & Performance Analyzer",
        description: "Runs strategy on historical data and computes Sharpe ratio, drawdown, and win-rate.",
        strategy: "ML Momentum (Random Forest + Gradient Boosting ensemble)",
        period_years: hasCustomRange ? null : period,
        mode: hasCustomRange ? "custom" : "preset",
        range_start: hasCustomRange ? startDate : null,
        range_end: hasCustomRange ? endDate : null,
      },
      backtest: result.backtest,
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};
