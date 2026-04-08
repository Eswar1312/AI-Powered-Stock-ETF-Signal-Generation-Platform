const mongoose = require("mongoose");

const savedPredictionSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  ticker: { type: String, required: true },
  signal: { type: String, enum: ["BUY", "HOLD", "SELL"], required: true },
  confidence: Number,
  score: Number,
  current_price: Number,
  indicators: { type: mongoose.Schema.Types.Mixed },
  note: { type: String, default: "" },
  savedAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model("SavedPrediction", savedPredictionSchema);
