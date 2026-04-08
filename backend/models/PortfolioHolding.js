const mongoose = require("mongoose");

const portfolioHoldingSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
  ticker: { type: String, required: true, trim: true, uppercase: true },
  name: { type: String, trim: true, default: "" },
  quantity: { type: Number, required: true, min: 0 },
  buyPrice: { type: Number, required: true, min: 0 },
  isActive: { type: Boolean, default: true, index: true },
  addedAt: { type: Date, default: Date.now },
  removedAt: { type: Date },
});

module.exports = mongoose.model("PortfolioHolding", portfolioHoldingSchema);
