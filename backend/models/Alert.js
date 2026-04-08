const mongoose = require("mongoose");

const alertSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
  ticker: { type: String, required: true, trim: true, uppercase: true },
  condition: { type: String, enum: ["above", "below", "change_pct"], required: true },
  threshold: { type: Number, required: true },
  email: { type: String, required: true, trim: true, lowercase: true },
  slack: { type: Boolean, default: false },
  status: { type: String, enum: ["active", "triggered", "deleted"], default: "active", index: true },
  createdAt: { type: Date, default: Date.now },
  triggeredAt: { type: Date },
  triggeredPrice: { type: Number },
  deletedAt: { type: Date },
});

module.exports = mongoose.model("Alert", alertSchema);
