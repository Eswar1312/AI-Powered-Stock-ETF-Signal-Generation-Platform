const axios = require("axios");
const { getBacktestingEnabled } = require("../services/appSettings");
const { runPythonEngine } = require("../services/pythonEngine");

const DEFAULT_WATCHLIST = [
  { ticker: "NIFTYBEES.NS", name: "Nifty BeES ETF" },
  { ticker: "RELIANCE.NS", name: "Reliance Industries" },
  { ticker: "TCS.NS", name: "TCS" },
  { ticker: "INFY.NS", name: "Infosys" },
  { ticker: "HDFCBANK.NS", name: "HDFC Bank" },
  { ticker: "AAPL", name: "Apple Inc." },
  { ticker: "MSFT", name: "Microsoft" },
  { ticker: "GOOGL", name: "Alphabet" },
  { ticker: "SPY", name: "S&P 500 ETF" },
  { ticker: "QQQ", name: "Nasdaq 100 ETF" },
];

exports.generateSignal = async (req, res) => {
  const { ticker } = req.params;
  const period = parseInt(req.query.period) || 10;

  if (!ticker) {
    return res.status(400).json({ error: "Ticker is required" });
  }

  try {
    const result = await runPythonEngine(ticker.toUpperCase(), { period });
    if (result.error) {
      return res.status(404).json({ error: result.error });
    }

    const backtestingEnabled = await getBacktestingEnabled();
    if (!backtestingEnabled && result.backtest) {
      delete result.backtest;
    }

    result.backtestingEnabled = backtestingEnabled;
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getWatchlist = (req, res) => {
  res.json(DEFAULT_WATCHLIST);
};

async function fetchLiveYahooPrice(ticker) {
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${ticker}?interval=1m&range=1d`;
  const response = await axios.get(url, {
    headers: { "User-Agent": "Mozilla/5.0" },
    timeout: 8000,
  });

  const result = response.data?.chart?.result?.[0];
  const meta = result?.meta || {};
  const price = Number(meta.regularMarketPrice);
  const previousClose = Number(meta.chartPreviousClose || meta.previousClose);

  if (!Number.isFinite(price) || price <= 0) {
    throw new Error("Live price unavailable");
  }

  return {
    ticker,
    current_price: price,
    previous_close: Number.isFinite(previousClose) ? previousClose : null,
    market_state: meta.marketState || null,
    currency: meta.currency || null,
    exchange_timezone: meta.exchangeTimezoneName || null,
    fetched_at: new Date().toISOString(),
  };
}

exports.getLivePrice = async (req, res) => {
  const ticker = String(req.params.ticker || "").trim().toUpperCase();
  if (!ticker) {
    return res.status(400).json({ error: "Ticker is required" });
  }

  try {
    const quote = await fetchLiveYahooPrice(ticker);
    res.json(quote);
  } catch (err) {
    res.status(502).json({ error: err.message || "Failed to fetch live price" });
  }
};
