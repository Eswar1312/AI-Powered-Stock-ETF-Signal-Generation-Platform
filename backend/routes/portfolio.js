const express = require("express");
const router = express.Router();
const PortfolioHolding = require("../models/PortfolioHolding");
const PortfolioHistory = require("../models/PortfolioHistory");
const { protect } = require("../middleware/auth");

function toHoldingResponse(holding) {
  return {
    id: String(holding._id),
    ticker: holding.ticker,
    name: holding.name,
    quantity: holding.quantity,
    buyPrice: holding.buyPrice,
    addedAt: holding.addedAt,
    removedAt: holding.removedAt,
  };
}

router.use(protect);

router.get("/", async (req, res) => {
  try {
    const holdings = await PortfolioHolding.find({
      userId: req.user._id,
      isActive: true,
    }).sort({ addedAt: -1 });

    res.json(holdings.map(toHoldingResponse));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get("/history", async (req, res) => {
  try {
    const history = await PortfolioHistory.find({ userId: req.user._id })
      .sort({ eventAt: -1 })
      .limit(200);
    res.json(history);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post("/", async (req, res) => {
  const { ticker, name, quantity, buyPrice } = req.body;
  if (!ticker || !quantity || !buyPrice) {
    return res.status(400).json({ error: "ticker, quantity, and buyPrice are required" });
  }

  const qty = parseFloat(quantity);
  const price = parseFloat(buyPrice);
  if (Number.isNaN(qty) || qty <= 0) {
    return res.status(400).json({ error: "quantity must be a positive number" });
  }
  if (Number.isNaN(price) || price <= 0) {
    return res.status(400).json({ error: "buyPrice must be a positive number" });
  }

  try {
    const holding = await PortfolioHolding.create({
      userId: req.user._id,
      ticker: ticker.toUpperCase(),
      name: (name || ticker).trim(),
      quantity: qty,
      buyPrice: price,
      isActive: true,
      addedAt: new Date(),
    });

    await PortfolioHistory.create({
      userId: req.user._id,
      holdingId: holding._id,
      eventType: "added",
      ticker: holding.ticker,
      name: holding.name,
      quantity: holding.quantity,
      buyPrice: holding.buyPrice,
      message: "Holding added",
    });

    res.status(201).json(toHoldingResponse(holding));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete("/:id", async (req, res) => {
  try {
    const holding = await PortfolioHolding.findOne({
      _id: req.params.id,
      userId: req.user._id,
      isActive: true,
    });
    if (!holding) return res.status(404).json({ error: "Holding not found" });

    holding.isActive = false;
    holding.removedAt = new Date();
    await holding.save();

    await PortfolioHistory.create({
      userId: req.user._id,
      holdingId: holding._id,
      eventType: "removed",
      ticker: holding.ticker,
      name: holding.name,
      quantity: holding.quantity,
      buyPrice: holding.buyPrice,
      message: "Holding removed",
    });

    res.json({ message: "Holding removed" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
