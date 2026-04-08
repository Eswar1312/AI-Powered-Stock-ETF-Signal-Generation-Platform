const express = require("express");
const router = express.Router();
const SavedPrediction = require("../models/SavedPrediction");
const { protect } = require("../middleware/auth");

// All routes require auth
router.use(protect);

// GET /api/saved - get user's saved predictions
router.get("/", async (req, res) => {
  try {
    const saved = await SavedPrediction.find({ userId: req.user._id }).sort({ savedAt: -1 });
    res.json(saved);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/saved - save a prediction
router.post("/", async (req, res) => {
  const { ticker, signal, confidence, score, current_price, indicators, note } = req.body;

  if (!ticker || !signal)
    return res.status(400).json({ error: "ticker and signal are required" });

  try {
    const prediction = await SavedPrediction.create({
      userId: req.user._id,
      ticker,
      signal,
      confidence,
      score,
      current_price,
      indicators,
      note,
    });
    res.status(201).json(prediction);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/saved/:id
router.delete("/:id", async (req, res) => {
  try {
    const pred = await SavedPrediction.findOne({ _id: req.params.id, userId: req.user._id });
    if (!pred) return res.status(404).json({ error: "Not found" });
    await pred.deleteOne();
    res.json({ message: "Deleted" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
