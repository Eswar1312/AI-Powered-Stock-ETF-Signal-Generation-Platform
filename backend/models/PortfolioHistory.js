const mongoose = require("mongoose");

const portfolioHistorySchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
  holdingId: { type: mongoose.Schema.Types.ObjectId, ref: "PortfolioHolding", default: null },
  eventType: { type: String, enum: ["added", "removed"], required: true },
  ticker: { type: String, required: true, trim: true, uppercase: true },
  name: { type: String, default: "" },
  quantity: { type: Number, required: true },
  buyPrice: { type: Number, required: true },
  message: { type: String, default: "" },
  eventAt: { type: Date, default: Date.now, index: true },
});

module.exports = mongoose.model("PortfolioHistory", portfolioHistorySchema);
