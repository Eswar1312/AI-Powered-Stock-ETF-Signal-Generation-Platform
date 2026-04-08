const mongoose = require("mongoose");

const alertHistorySchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
  alertId: { type: mongoose.Schema.Types.ObjectId, ref: "Alert", default: null },
  ticker: { type: String, required: true, trim: true, uppercase: true },
  eventType: { type: String, enum: ["created", "triggered", "deleted", "test_email"], required: true },
  condition: { type: String, enum: ["above", "below", "change_pct", null], default: null },
  threshold: { type: Number, default: null },
  email: { type: String, default: null, trim: true, lowercase: true },
  triggeredPrice: { type: Number, default: null },
  message: { type: String, default: "" },
  eventAt: { type: Date, default: Date.now, index: true },
});

module.exports = mongoose.model("AlertHistory", alertHistorySchema);
