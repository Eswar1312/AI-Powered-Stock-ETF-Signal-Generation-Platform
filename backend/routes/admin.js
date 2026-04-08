const express = require("express");
const router = express.Router();
const User = require("../models/User");
const SavedPrediction = require("../models/SavedPrediction");
const { protect, adminOnly } = require("../middleware/auth");
const { getBacktestingEnabled, setBacktestingEnabled } = require("../services/appSettings");

router.use(protect, adminOnly);

router.get("/settings", async (req, res) => {
  try {
    const backtestingEnabled = await getBacktestingEnabled();
    res.json({ backtestingEnabled });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.patch("/settings/backtesting", async (req, res) => {
  const { enabled } = req.body;
  if (typeof enabled !== "boolean") {
    return res.status(400).json({ error: "enabled must be a boolean" });
  }

  try {
    const backtestingEnabled = await setBacktestingEnabled(enabled);
    res.json({ backtestingEnabled });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET all users
router.get("/users", async (req, res) => {
  try {
    const users = await User.find().select("-password").sort({ createdAt: -1 });
    res.json(users);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PATCH toggle user active/inactive
router.patch("/users/:id/toggle", async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ error: "User not found" });
    if (user.role === "admin") return res.status(403).json({ error: "Cannot disable admin" });
    user.isActive = !user.isActive;
    await user.save();
    res.json(user.toSafeObject());
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE user
router.delete("/users/:id", async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ error: "User not found" });
    if (user.role === "admin") return res.status(403).json({ error: "Cannot delete admin" });
    await SavedPrediction.deleteMany({ userId: user._id });
    await user.deleteOne();
    res.json({ message: "User deleted" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET stats
router.get("/stats", async (req, res) => {
  try {
    const totalUsers = await User.countDocuments({ role: "user" });
    const activeUsers = await User.countDocuments({ role: "user", isActive: true });
    const totalSaved = await SavedPrediction.countDocuments();
    const buySignals = await SavedPrediction.countDocuments({ signal: "BUY" });
    const sellSignals = await SavedPrediction.countDocuments({ signal: "SELL" });
    const holdSignals = await SavedPrediction.countDocuments({ signal: "HOLD" });
    const backtestingEnabled = await getBacktestingEnabled();
    res.json({ totalUsers, activeUsers, totalSaved, buySignals, sellSignals, holdSignals, backtestingEnabled });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
