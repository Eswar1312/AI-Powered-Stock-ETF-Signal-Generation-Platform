const { spawn } = require("child_process");
const path = require("path");

const PYTHON_SCRIPT = path.join(__dirname, "./ml_engine.py");

function runPythonEngine(ticker, options = {}) {
  const period = Number.isFinite(Number(options.period)) ? Number(options.period) : 10;
  const startDate = options.startDate ? String(options.startDate).trim() : "";
  const endDate = options.endDate ? String(options.endDate).trim() : "";

  const args = [PYTHON_SCRIPT, ticker];
  if (startDate && endDate) {
    args.push("--start", startDate, "--end", endDate);
  } else {
    args.push("--period", String(period));
  }

  return new Promise((resolve, reject) => {
    const py = spawn("python3", args);
    let output = "";
    let error = "";

    py.stdout.on("data", (d) => {
      output += d.toString();
    });

    py.stderr.on("data", (d) => {
      error += d.toString();
    });

    py.on("close", (code) => {
      if (code !== 0) {
        return reject(new Error(error || `Python exited with code ${code}`));
      }

      try {
        const result = JSON.parse(output);
        resolve(result);
      } catch {
        reject(new Error("Failed to parse Python output"));
      }
    });

    setTimeout(() => {
      py.kill();
      reject(new Error("Python script timed out after 120s"));
    }, 120000);
  });
}

module.exports = {
  runPythonEngine,
};
