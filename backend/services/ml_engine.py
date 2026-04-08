#!/usr/bin/env python3
"""
ML Signal Generation Engine
Generates BUY / HOLD / SELL signals using ensemble ML models.
Usage: python ml_engine.py <TICKER> [period_years]
"""

import sys
import json
import warnings
from datetime import datetime
import numpy as np
import pandas as pd
from zoneinfo import ZoneInfo

warnings.filterwarnings("ignore")

try:
    import yfinance as yf
    from sklearn.ensemble import RandomForestRegressor, GradientBoostingRegressor, VotingRegressor
    from sklearn.preprocessing import StandardScaler
except ImportError as e:
    print(json.dumps({"error": f"Missing dependency: {e}"}))
    sys.exit(1)


def market_meta_for_ticker(ticker: str):
    t = (ticker or "").upper().strip()

    # India market hours (NSE/BSE): 09:15 - 15:30 IST, Mon-Fri
    if t.endswith(".NS") or t.endswith(".BO"):
        tz = ZoneInfo("Asia/Kolkata")
        now = datetime.now(tz)
        is_weekday = now.weekday() < 5
        open_minutes = 9 * 60 + 15
        close_minutes = 15 * 60 + 30
        current_minutes = now.hour * 60 + now.minute
        is_open = is_weekday and (open_minutes <= current_minutes <= close_minutes)
        return {
            "region": "IN",
            "timezone": "Asia/Kolkata",
            "status": "OPEN" if is_open else "CLOSED",
        }

    # US market hours (NYSE/NASDAQ regular): 09:30 - 16:00 ET, Mon-Fri
    tz = ZoneInfo("America/New_York")
    now = datetime.now(tz)
    is_weekday = now.weekday() < 5
    open_minutes = 9 * 60 + 30
    close_minutes = 16 * 60
    current_minutes = now.hour * 60 + now.minute
    is_open = is_weekday and (open_minutes <= current_minutes <= close_minutes)
    return {
        "region": "US",
        "timezone": "America/New_York",
        "status": "OPEN" if is_open else "CLOSED",
    }


def compute_features(data):
    df = data.copy()
    df["Return"] = df["Close"].pct_change()
    df["MA10"] = df["Close"].rolling(10).mean()
    df["MA20"] = df["Close"].rolling(20).mean()
    df["MA50"] = df["Close"].rolling(50).mean()

    df["Volatility_10"] = df["Return"].rolling(10).std()
    df["Volatility_20"] = df["Return"].rolling(20).std()

    delta = df["Close"].diff()
    gain = delta.clip(lower=0)
    loss = -delta.clip(upper=0)
    avg_gain = gain.rolling(14).mean()
    avg_loss = loss.rolling(14).mean()
    rs = avg_gain / (avg_loss + 1e-9)
    df["RSI"] = 100 - (100 / (1 + rs))

    exp1 = df["Close"].ewm(span=12, adjust=False).mean()
    exp2 = df["Close"].ewm(span=26, adjust=False).mean()
    df["MACD"] = exp1 - exp2
    df["MACD_Signal"] = df["MACD"].ewm(span=9, adjust=False).mean()
    df["MACD_Hist"] = df["MACD"] - df["MACD_Signal"]

    df["BB_Middle"] = df["Close"].rolling(20).mean()
    df["BB_Std"] = df["Close"].rolling(20).std()
    df["BB_Upper"] = df["BB_Middle"] + 2 * df["BB_Std"]
    df["BB_Lower"] = df["BB_Middle"] - 2 * df["BB_Std"]
    df["BB_Position"] = (df["Close"] - df["BB_Lower"]) / (df["BB_Upper"] - df["BB_Lower"] + 1e-9)

    high_low = df["High"] - df["Low"]
    high_close = np.abs(df["High"] - df["Close"].shift())
    low_close = np.abs(df["Low"] - df["Close"].shift())
    true_range = pd.concat([high_low, high_close, low_close], axis=1).max(axis=1)
    df["ATR"] = true_range.rolling(14).mean()

    for i in [1, 2, 3, 5, 10]:
        df[f"Lag_{i}"] = df["Return"].shift(i)

    df["Dist_MA20"] = (df["Close"] - df["MA20"]) / (df["MA20"] + 1e-9)
    df["Dist_MA50"] = (df["Close"] - df["MA50"]) / (df["MA50"] + 1e-9)

    return df


def is_finite_number(value):
    try:
        return np.isfinite(float(value))
    except Exception:
        return False


def sanitize_for_json(value):
    if isinstance(value, dict):
        return {k: sanitize_for_json(v) for k, v in value.items()}
    if isinstance(value, list):
        return [sanitize_for_json(v) for v in value]
    if isinstance(value, tuple):
        return [sanitize_for_json(v) for v in value]
    if isinstance(value, (np.floating, float)):
        v = float(value)
        return v if np.isfinite(v) else None
    if isinstance(value, (np.integer, int)):
        return int(value)
    return value


def generate_signal(ticker, period_years=10, start_date=None, end_date=None):
    if start_date and end_date:
        start_ts = pd.Timestamp(start_date)
        # yfinance treats end as exclusive, so include the selected end date.
        end_ts = pd.Timestamp(end_date) + pd.Timedelta(days=1)
        raw = yf.download(ticker, start=start_ts.strftime("%Y-%m-%d"), end=end_ts.strftime("%Y-%m-%d"), progress=False)
    else:
        start = pd.Timestamp.now() - pd.DateOffset(years=period_years)
        start_str = start.strftime("%Y-%m-%d")
        raw = yf.download(ticker, start=start_str, progress=False)

    if raw.empty:
        return {"error": f"No data found for {ticker}"}

    if isinstance(raw.columns, pd.MultiIndex):
        raw.columns = raw.columns.droplevel(1)

    raw = raw[["Open", "High", "Low", "Close", "Volume"]].copy()

    # Keep one feature frame for display (latest full market bars), and one for ML training.
    feature_data = compute_features(raw)

    # Core feature set: trend, momentum, volatility, and short-term return context.
    features = [
        "Return", "MA10", "MA20", "MA50",
        "Volatility_20",
        "RSI", "MACD_Hist",
        "BB_Position", "ATR",
        "Lag_1", "Lag_3", "Lag_5",
        "Dist_MA20", "Dist_MA50"
    ]

    train_data = feature_data.copy()
    train_data["Target_Price"] = train_data["Close"].shift(-1)
    train_data.dropna(inplace=True)

    X = train_data[features]
    y = train_data["Target_Price"]

    scaler = StandardScaler()
    X_scaled = scaler.fit_transform(X)

    rf = RandomForestRegressor(n_estimators=300, random_state=42, n_jobs=-1)
    gb = GradientBoostingRegressor(n_estimators=200, random_state=42)
    ensemble = VotingRegressor([("rf", rf), ("gb", gb)])
    ensemble.fit(X_scaled, y)

    market_meta = market_meta_for_ticker(ticker)

    latest_rows = feature_data.dropna(subset=features)
    if latest_rows.empty:
        return {"error": f"Not enough feature data to generate signal for {ticker}"}
    latest_feature_row = latest_rows.iloc[-1]

    # True last close from downloaded OHLC (not the trimmed ML training frame).
    close_series = pd.to_numeric(raw["Close"], errors="coerce").dropna()
    if close_series.empty:
        return {"error": f"No valid close data found for {ticker}"}
    last_close_price = float(close_series.iloc[-1])
    current_price = last_close_price

    # Live refresh is only attempted while market is open.
    if market_meta["status"] == "OPEN":
        try:
            live = yf.Ticker(ticker)

            # Prefer latest intraday 1m candle close for near real-time price.
            intraday = live.history(period="1d", interval="1m")
            if not intraday.empty:
                intraday_close = pd.to_numeric(intraday["Close"], errors="coerce").dropna()
                if not intraday_close.empty:
                    live_price = float(intraday_close.iloc[-1])
                    if is_finite_number(live_price) and live_price > 0:
                        current_price = live_price

            # Fallback to fast_info if intraday data is unavailable.
            if current_price == last_close_price:
                lp = getattr(live.fast_info, "last_price", None)
                if lp and is_finite_number(lp) and float(lp) > 0:
                    current_price = float(lp)
        except Exception:
            pass

    next_day_input = latest_feature_row[features].to_frame().T
    next_day_price_pred = float(ensemble.predict(scaler.transform(next_day_input))[0])
    if is_finite_number(current_price) and current_price > 0 and is_finite_number(next_day_price_pred):
        predicted_return_pct = (next_day_price_pred - current_price) / current_price * 100
    else:
        predicted_return_pct = 0

    # Signal determination
    rsi = float(latest_feature_row["RSI"])
    macd_hist = float(latest_feature_row["MACD_Hist"])
    bb_pos = float(latest_feature_row["BB_Position"])
    dist_ma20 = float(latest_feature_row["Dist_MA20"])

    score = 0
    score_pct_1d = predicted_return_pct if isinstance(predicted_return_pct, (float, int)) else 0

    if score_pct_1d > 0.5:
        score += 2
    elif score_pct_1d > 0:
        score += 1
    elif score_pct_1d < -0.5:
        score -= 2
    else:
        score -= 1

    if rsi < 30:
        score += 2
    elif rsi < 45:
        score += 1
    elif rsi > 70:
        score -= 2
    elif rsi > 60:
        score -= 1

    if macd_hist > 0:
        score += 1
    else:
        score -= 1

    if bb_pos < 0.2:
        score += 1
    elif bb_pos > 0.8:
        score -= 1

    if score >= 3:
        signal = "BUY"
        confidence = min(95, 60 + score * 5)
    elif score <= -3:
        signal = "SELL"
        confidence = min(95, 60 + abs(score) * 5)
    else:
        signal = "HOLD"
        confidence = 55 + (5 - abs(score)) * 3

    # Historical chart data should come directly from Yahoo Finance bars.
    history_raw = yf.download(ticker, period="6mo", interval="1d", progress=False)
    if isinstance(history_raw.columns, pd.MultiIndex):
        history_raw.columns = history_raw.columns.droplevel(1)
    if not history_raw.empty:
        history_raw = history_raw[["Open", "High", "Low", "Close", "Volume"]].copy()
        history_data = compute_features(history_raw).tail(100)
    else:
        history_data = feature_data.tail(100)

    hist_dates = [d.strftime("%Y-%m-%d") for d in history_data.index]
    hist_prices = [round(float(p), 2) if is_finite_number(p) else None for p in history_data["Close"]]
    hist_ma20 = [round(float(p), 2) if not np.isnan(p) else None for p in history_data["MA20"]]
    hist_rsi = [round(float(p), 2) if not np.isnan(p) else None for p in history_data["RSI"]]
    hist_macd = [round(float(p), 2) if not np.isnan(p) else None for p in history_data["MACD"]]
    hist_macd_signal = [round(float(p), 2) if not np.isnan(p) else None for p in history_data["MACD_Signal"]]
    hist_volume = [int(v) if is_finite_number(v) else None for v in history_data["Volume"]]

    # Backtest (simple momentum backtest on full history)
    bt = train_data.copy()
    bt["Pred"] = ensemble.predict(scaler.transform(bt[features]))
    bt["PredReturn"] = bt["Pred"].pct_change()
    bt["StratReturn"] = np.where(bt["PredReturn"].shift(1) > 0, bt["Return"], 0)
    bt.dropna(inplace=True)

    cumulative = (1 + bt["StratReturn"]).cumprod()
    total_return = float(cumulative.iloc[-1] - 1) * 100
    sharpe = float(bt["StratReturn"].mean() / (bt["StratReturn"].std() + 1e-9) * np.sqrt(252))
    rolling_max = cumulative.cummax()
    drawdown = ((cumulative - rolling_max) / rolling_max).min()
    max_drawdown = float(drawdown) * 100
    wins = (bt["StratReturn"] > 0).sum()
    total_trades = (bt["StratReturn"] != 0).sum()
    win_rate = float(wins / total_trades) * 100 if total_trades > 0 else 0

    bt_dates = [d.strftime("%Y-%m-%d") for d in bt.index[-252:]]
    bt_equity = [round(float(v), 4) for v in cumulative.tail(252)]

    return {
        "ticker": ticker,
        "market": market_meta,
        "sources": {
            "history": "yahoo_finance",
            "signal": "ml_model",
        },
        "signal": signal,
        "confidence": round(confidence, 1),
        "score": score,
        "current_price": current_price,
        "indicators": {
            "rsi": round(rsi, 2),
            "macd": round(float(latest_feature_row["MACD"]), 4),
            "macd_signal": round(float(latest_feature_row["MACD_Signal"]), 4),
            "macd_hist": round(macd_hist, 4),
            "bb_position": round(bb_pos, 4),
            "bb_upper": round(float(latest_feature_row["BB_Upper"]), 2),
            "bb_lower": round(float(latest_feature_row["BB_Lower"]), 2),
            "atr": round(float(latest_feature_row["ATR"]), 2),
            "ma10": round(float(latest_feature_row["MA10"]), 2),
            "ma20": round(float(latest_feature_row["MA20"]), 2),
            "ma50": round(float(latest_feature_row["MA50"]), 2),
            "volatility_10": round(float(latest_feature_row["Volatility_10"]), 4),
        },
        "history": {
            "dates": hist_dates,
            "prices": hist_prices,
            "ma20": hist_ma20,
            "rsi": hist_rsi,
            "macd": hist_macd,
            "macd_signal": hist_macd_signal,
            "volume": hist_volume,
        },
        "backtest": {
            "total_return": round(total_return, 2),
            "sharpe_ratio": round(sharpe, 3),
            "max_drawdown": round(max_drawdown, 2),
            "win_rate": round(win_rate, 2),
            "dates": bt_dates,
            "equity_curve": bt_equity,
        }
    }


if __name__ == "__main__":
    ticker = sys.argv[1] if len(sys.argv) > 1 else "NIFTYBEES.NS"

    period = 10
    start_date = None
    end_date = None

    args = sys.argv[2:]
    i = 0
    while i < len(args):
        token = args[i]

        if token == "--period" and i + 1 < len(args):
            period = int(args[i + 1])
            i += 2
            continue

        if token == "--start" and i + 1 < len(args):
            start_date = args[i + 1]
            i += 2
            continue

        if token == "--end" and i + 1 < len(args):
            end_date = args[i + 1]
            i += 2
            continue

        # Backward compatibility: second positional arg as period.
        try:
            period = int(token)
        except ValueError:
            pass
        i += 1

    result = generate_signal(ticker, period, start_date=start_date, end_date=end_date)
    print(json.dumps(sanitize_for_json(result), allow_nan=False))
