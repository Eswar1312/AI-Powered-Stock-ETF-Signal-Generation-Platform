const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const mongoose = require("mongoose");
const cron = require("node-cron");

dotenv.config();

const signalRoutes = require("./routes/signals");
const backtestRoutes = require("./routes/backtest");
const alertRoutes = require("./routes/alerts");
const portfolioRoutes = require("./routes/portfolio");
const authRoutes = require("./routes/auth");
const savedRoutes = require("./routes/saved");
const adminRoutes = require("./routes/admin");
const { getBacktestingEnabled } = require("./services/appSettings");

const app = express();
app.use(cors());
app.use(express.json());

app.use("/api/signals", signalRoutes);
app.use("/api/backtest", backtestRoutes);
app.use("/api/alerts", alertRoutes);
app.use("/api/portfolio", portfolioRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/saved", savedRoutes);
app.use("/api/admin", adminRoutes);

app.get("/api/settings/public", async (req, res) => {
  try {
    const backtestingEnabled = await getBacktestingEnabled();
    res.json({ backtestingEnabled });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/api/health", (req, res) =>
  res.json({ status: "ok", timestamp: new Date().toISOString() })
);

const MONGO_URI = process.env.MONGO_URI || "mongodb://localhost:27017/stocksignals";
mongoose.connect(MONGO_URI).then(async () => {
  console.log("MongoDB connected");
  const User = require("./models/User");
  const existing = await User.findOne({ role: "admin" });
  if (!existing) {
    await User.create({
      name: "Admin",
      email: process.env.ADMIN_EMAIL || "admin@yourstockai.com",
      password: process.env.ADMIN_PASSWORD || "Admin@123",
      role: "admin",
    });
    console.log("Default admin created: admin@yourstockai.com / Admin@123");
  }
}).catch((err) => console.log("MongoDB not connected:", err.message));

cron.schedule("0 9-16 * * 1-5", () => {
  console.log("Scheduled signal refresh:", new Date().toISOString());
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
