const AppSetting = require("../models/AppSetting");

const BACKTESTING_KEY = "backtestingEnabled";

async function getBacktestingEnabled() {
  const existing = await AppSetting.findOne({ key: BACKTESTING_KEY });
  if (!existing) {
    await AppSetting.create({ key: BACKTESTING_KEY, value: true });
    return true;
  }
  return Boolean(existing.value);
}

async function setBacktestingEnabled(enabled) {
  const updated = await AppSetting.findOneAndUpdate(
    { key: BACKTESTING_KEY },
    { value: Boolean(enabled) },
    { new: true, upsert: true, setDefaultsOnInsert: true },
  );
  return Boolean(updated.value);
}

module.exports = {
  getBacktestingEnabled,
  setBacktestingEnabled,
};
