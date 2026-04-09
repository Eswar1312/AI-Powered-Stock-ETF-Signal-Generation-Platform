# YourStock AI — AI-Powered Stock & ETF Signal Platform

A full-stack MERN application with a Python ML engine that generates **BUY / HOLD / SELL** signals for stocks and ETFs using an ensemble of Random Forest + Gradient Boosting models.

---


## 🏗 Architecture

```
yourstock-ai/
├── backend/                  # Node.js + Express API
│   ├── server.js             # Entry point, cron jobs
│   ├── routes/               # REST routes
│   │   ├── signals.js        # Signal generation
│   │   ├── backtest.js       # Backtesting
│   │   ├── alerts.js         # Price alerts
│   │   └── portfolio.js      # Portfolio tracking
│   ├── controllers/
│   │   └── signalController.js  # Calls Python ML engine
│   ├── services/
│   │   └── ml_engine.py      # 🐍 ML Signal Engine
│   ├── requirements.txt      # Python deps
│   └── .env.example
└── frontend/                 # React app
    └── src/
        ├── pages/
        │   ├── Dashboard.js  # Overview + quick watchlist
        │   ├── SignalPage.js # Full signal analysis
        │   ├── BacktestPage.js
        │   ├── AlertsPage.js
        │   └── PortfolioPage.js
        ├── components/
        │   ├── SignalBadge.js   # BUY/HOLD/SELL badge
        │   ├── PriceChart.js   # Price + forecast chart
        │   ├── IndicatorPanel.js
        │   ├── SubCharts.js    # RSI + MACD charts
        │   └── ...
        └── utils/api.js
```

---

## 🚀 Setup & Installation

### Prerequisites
- Node.js 18+
- Python 3.9+
- MongoDB (optional — app works without it)

### Step 1: Clone & Install

```bash
# Install Python deps
pip install -r backend/requirements.txt

# Install Node deps
npm install --prefix backend
npm install --prefix frontend
```

### Step 2: Configure environment

```bash
cp backend/.env.example backend/.env
# Edit backend/.env with your settings
```

### Step 3: Run both servers

```bash
# Install concurrently
npm install

# Run backend + frontend together
npm run dev
```

Or run separately:
```bash
# Terminal 1 - Backend (port 5000)
cd backend && npm run dev

# Terminal 2 - Frontend (port 3000)
cd frontend && npm start
```

### Step 4: Open browser
```
http://localhost:3000
```

---

## 🧠 ML Signal Engine

**File:** `backend/services/ml_engine.py`

### Features Used (19 total)
| Feature | Type |
|---------|------|
| Return | Price return |
| MA10, MA20, MA50 | Moving averages |
| Volatility_10, _20 | Rolling std dev |
| RSI | Relative Strength Index |
| MACD, MACD_Signal, MACD_Hist | MACD family |
| BB_Position | Bollinger Band % |
| ATR | Average True Range |
| Lag_1/2/3/5/10 | Lag returns |
| Dist_MA20, Dist_MA50 | Distance from MA |

### Signal Generation Logic
```
Score = Σ(ML forecast + RSI + MACD + BB + 5-day trend)

score ≥ 3  → BUY
score ≤ -3 → SELL
else       → HOLD
```

### Models
- **Random Forest** — 300 trees
- **Gradient Boosting** — 200 estimators
- **Ensemble** — VotingRegressor (equal weights)

---

## 📊 API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/signals/generate/:ticker` | Run full ML analysis |
| GET | `/api/signals/watchlist` | Get default watchlist |
| GET | `/api/alerts` | List all alerts |
| POST | `/api/alerts` | Create price alert |
| DELETE | `/api/alerts/:id` | Remove alert |
| GET | `/api/portfolio` | Get holdings |
| POST | `/api/portfolio` | Add holding |
| DELETE | `/api/portfolio/:id` | Remove holding |
| GET | `/api/health` | Health check |



---

## ⚠️ Disclaimer

> This platform is for **educational and research purposes only**.  
> It does **not constitute financial advice**.  
> Past performance does **not guarantee future results**.  
> Always consult a qualified financial advisor before making investment decisions.

---


