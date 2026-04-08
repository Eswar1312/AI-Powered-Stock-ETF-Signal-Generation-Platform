const express = require("express");
const router = express.Router();
const { getBacktestingEnabled } = require("../services/appSettings");
const { runBacktest } = require("../controllers/backtestController");

// Backtest results are embedded in the signal response
// This route provides standalone backtest comparison
router.get("/compare", async (req, res) => {
  try {
    const backtestingEnabled = await getBacktestingEnabled();
    if (!backtestingEnabled) {
      return res.status(403).json({ error: "Backtesting is currently disabled by admin" });
    }

    res.json({ message: "Use /api/signals/generate/:ticker for full backtest data" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get("/run/:ticker", runBacktest);

module.exports = router;
