const express = require("express");
const router = express.Router();
const { generateSignal, getWatchlist, getLivePrice } = require("../controllers/signalController");

router.get("/generate/:ticker", generateSignal);
router.get("/watchlist", getWatchlist);
router.get("/price/:ticker", getLivePrice);

module.exports = router;
