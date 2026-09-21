from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import sqlite3
import zlib
import io
import os
import math
from functools import lru_cache

import numpy as np
import pandas as pd

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DB_PATH = os.path.join(BASE_DIR, "strategy_data.db")

NIFTY_STEP = 50
SENSEX_STEP = 100

app = FastAPI(title="Options Lab API", version="2.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "https://nifty-sensex-dashboard-chfn.onrender.com",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


def db_connect():
    if not os.path.exists(DB_PATH):
        raise HTTPException(
            status_code=500,
            detail=f"strategy_data.db not found: {DB_PATH}",
        )
    return sqlite3.connect(DB_PATH)


@lru_cache(maxsize=1)
def available_dates():
    con = db_connect()
    try:
        q = """
            SELECT trade_date
            FROM days
            WHERE nifty_blob IS NOT NULL
              AND length(nifty_blob) > 0
              AND sensex_blob IS NOT NULL
              AND length(sensex_blob) > 0
            ORDER BY trade_date
        """
        return pd.read_sql_query(q, con)["trade_date"].astype(str).tolist()
    finally:
        con.close()


@lru_cache(maxsize=2048)
def market_values(dt):
    con = db_connect()
    try:
        row = con.execute(
            """
            SELECT nifty_spot, sensex_spot, india_vix
            FROM days
            WHERE trade_date=?
            """,
            (dt,),
        ).fetchone()
    finally:
        con.close()

    if row is None:
        return (math.nan, math.nan, math.nan)

    vals = tuple(
        float(x) if x is not None else math.nan
        for x in row
    )

    # VIX is an index; reject clearly malformed values.
    if np.isfinite(vals[2]) and (vals[2] < 0 or vals[2] > 100):
        vals = (vals[0], vals[1], math.nan)

    return vals


@lru_cache(maxsize=4096)
def day_options(dt, symbol):
    con = db_connect()
    try:
        col = "nifty_blob" if symbol == "NIFTY" else "sensex_blob"
        row = con.execute(
            f"SELECT {col} FROM days WHERE trade_date=?",
            (dt,),
        ).fetchone()
    finally:
        con.close()

    columns = ["expiry", "strike", "option_type", "close"]

    if row is None or not row[0]:
        return pd.DataFrame(columns=columns)

    try:
        raw = zlib.decompress(row[0]).decode("utf-8")
        df = pd.read_csv(
            io.StringIO(raw),
            header=None,
            names=columns,
        )
    except Exception:
        return pd.DataFrame(columns=columns)

    df["expiry"] = df["expiry"].astype(str).str.strip()
    df["strike"] = pd.to_numeric(df["strike"], errors="coerce")
    df["option_type"] = (
        df["option_type"].astype(str).str.upper().str.strip()
    )
    df["close"] = pd.to_numeric(df["close"], errors="coerce")

    return df.dropna(subset=["expiry", "strike"]).copy()


def clean_number(value):
    if value is None:
        return None
    try:
        x = float(value)
        return None if not np.isfinite(x) else x
    except Exception:
        return None


def round_strike(value, step):
    if value is None or not np.isfinite(value):
        return math.nan
    return int(np.floor(value / step + 0.5) * step)


def locked_straddle(df, symbol, expiry, step, spot):
    """
    LOCKED STRADDLE LOGIC

    1) Spot -> provisional ATM
    2) provisional ATM CE/PE CLOSE -> Synthetic Future
    3) Synthetic Future -> final strike using instrument step
    4) final strike CE/PE CLOSE -> Straddle

    If the exact provisional strike is unavailable, the nearest strike
    having both CE and PE is used, matching the existing Streamlit logic.
    """
    x = df[
        df["expiry"].eq(str(expiry))
        & df["option_type"].isin(["CE", "PE"])
    ].copy()

    empty = {
        "spot": clean_number(spot),
        "spot_source": "market OHLC",
        "provisional_atm": None,
        "atm_strike_used": None,
        "atm_ce": None,
        "atm_pe": None,
        "synthetic_future": None,
        "final_strike": None,
        "final_ce": None,
        "final_pe": None,
        "straddle": None,
        "status": "No usable data",
    }

    if x.empty or spot is None or not np.isfinite(spot):
        return empty

    provisional = round_strike(float(spot), step)

    piv = x.pivot_table(
        index="strike",
        columns="option_type",
        values="close",
        aggfunc="first",
    )

    if "CE" not in piv.columns or "PE" not in piv.columns:
        empty["provisional_atm"] = clean_number(provisional)
        empty["status"] = "CE/PE missing"
        return empty

    piv = piv.dropna(subset=["CE", "PE"])

    if piv.empty:
        empty["provisional_atm"] = clean_number(provisional)
        empty["status"] = "CE/PE missing"
        return empty

    if provisional in piv.index:
        used = float(provisional)
    else:
        arr = piv.index.to_numpy(dtype=float)
        used = float(arr[np.argmin(np.abs(arr - provisional))])

    atm_ce = float(piv.loc[used, "CE"])
    atm_pe = float(piv.loc[used, "PE"])

    synthetic = float(used + atm_ce - atm_pe)
    final_strike = round_strike(synthetic, step)

    result = {
        "spot": clean_number(spot),
        "spot_source": "market OHLC",
        "provisional_atm": clean_number(provisional),
        "atm_strike_used": clean_number(used),
        "atm_ce": clean_number(atm_ce),
        "atm_pe": clean_number(atm_pe),
        "synthetic_future": clean_number(synthetic),
        "final_strike": clean_number(final_strike),
        "final_ce": None,
        "final_pe": None,
        "straddle": None,
        "status": "OK",
    }

    if final_strike not in piv.index:
        result["status"] = "Final-strike CE/PE missing"
        return result

    final_ce = float(piv.loc[final_strike, "CE"])
    final_pe = float(piv.loc[final_strike, "PE"])

    result["final_ce"] = clean_number(final_ce)
    result["final_pe"] = clean_number(final_pe)
    result["straddle"] = clean_number(final_ce + final_pe)

    return result


def calculate_day(dt, nifty_expiry, sensex_expiry, multiplier):
    nspot, sspot, vix = market_values(dt)

    n = locked_straddle(
        day_options(dt, "NIFTY"),
        "NIFTY",
        nifty_expiry,
        NIFTY_STEP,
        nspot,
    )

    s = locked_straddle(
        day_options(dt, "SENSEX"),
        "SENSEX",
        sensex_expiry,
        SENSEX_STEP,
        sspot,
    )

    if n["straddle"] is not None and s["straddle"] is not None:
        adjusted_nifty = n["straddle"] * multiplier
        final_value = s["straddle"] - adjusted_nifty
    else:
        adjusted_nifty = math.nan
        final_value = math.nan

    return n, s, vix, adjusted_nifty, final_value


def row_from_day(dt, nifty_expiry, sensex_expiry, multiplier):
    n, s, vix, adjusted_nifty, final_value = calculate_day(
        dt, nifty_expiry, sensex_expiry, multiplier
    )

    if not np.isfinite(final_value):
        return None

    return {
        "Date": dt,
        "India VIX": clean_number(vix),

        "NIFTY Spot": n["spot"],
        "NIFTY Provisional ATM": n["provisional_atm"],
        "NIFTY ATM Strike Used": n["atm_strike_used"],
        "NIFTY ATM CE": n["atm_ce"],
        "NIFTY ATM PE": n["atm_pe"],
        "NIFTY Synthetic Future": n["synthetic_future"],
        "NIFTY Final Strike": n["final_strike"],
        "NIFTY Final CE": n["final_ce"],
        "NIFTY Final PE": n["final_pe"],
        "NIFTY Straddle": n["straddle"],

        "SENSEX Spot": s["spot"],
        "SENSEX Provisional ATM": s["provisional_atm"],
        "SENSEX ATM Strike Used": s["atm_strike_used"],
        "SENSEX ATM CE": s["atm_ce"],
        "SENSEX ATM PE": s["atm_pe"],
        "SENSEX Synthetic Future": s["synthetic_future"],
        "SENSEX Final Strike": s["final_strike"],
        "SENSEX Final CE": s["final_ce"],
        "SENSEX Final PE": s["final_pe"],
        "SENSEX Straddle": s["straddle"],

        "Adjusted NIFTY": clean_number(adjusted_nifty),
        "Final Value": clean_number(final_value),

        "NIFTY Status": n["status"],
        "SENSEX Status": s["status"],
    }


@app.get("/")
def root():
    return {
        "name": "Options Lab API",
        "status": "running",
        "database_exists": os.path.exists(DB_PATH),
    }


@app.get("/api/health")
def health():
    return {
        "status": "ok",
        "database_exists": os.path.exists(DB_PATH),
        "database": DB_PATH,
    }


@app.get("/api/dates")
def dates():
    return {"dates": available_dates()}


@app.get("/api/market/{dt}")
def market(dt: str):
    n, s, v = market_values(dt)
    return {
        "date": dt,
        "nifty_spot": clean_number(n),
        "sensex_spot": clean_number(s),
        "india_vix": clean_number(v),
    }


@app.get("/api/expiries/{dt}")
def expiries(dt: str):
    ndf = day_options(dt, "NIFTY")
    sdf = day_options(dt, "SENSEX")

    nifty = sorted(
        ndf["expiry"].dropna().astype(str).unique().tolist()
    )
    sensex = sorted(
        sdf["expiry"].dropna().astype(str).unique().tolist()
    )

    return {
        "date": dt,
        "nifty": nifty,
        "sensex": sensex,
    }


@app.get("/api/day")
def day(
    date: str,
    nifty_expiry: str,
    sensex_expiry: str,
    multiplier: float = 3.30,
):
    return {
        "date": date,
        "nifty_expiry": nifty_expiry,
        "sensex_expiry": sensex_expiry,
        "multiplier": multiplier,
        "row": row_from_day(
            date,
            nifty_expiry,
            sensex_expiry,
            multiplier,
        ),
    }


@app.get("/api/backtest")
def backtest(
    start_date: str,
    end_date: str,
    nifty_expiry: str,
    sensex_expiry: str,
    multiplier: float = 3.30,
):
    if start_date > end_date:
        raise HTTPException(
            status_code=400,
            detail="start_date cannot be after end_date",
        )

    selected = [
        d for d in available_dates()
        if start_date <= d <= end_date
    ]

    rows = []

    for dt in selected:
        try:
            row = row_from_day(
                dt,
                nifty_expiry,
                sensex_expiry,
                float(multiplier),
            )
            if row is not None:
                rows.append(row)
        except Exception as exc:
            print(f"Backtest row error {dt}: {exc}")

    values = [
        float(r["Final Value"])
        for r in rows
        if r["Final Value"] is not None
    ]

    return {
        "count": len(rows),
        "average": clean_number(np.mean(values)) if values else None,
        "maximum": clean_number(np.max(values)) if values else None,
        "minimum": clean_number(np.min(values)) if values else None,
        "rows": rows,
    }


@app.get("/api/individual")
def individual(
    date: str,
    symbol: str,
    expiry: str,
):
    symbol = symbol.upper()

    if symbol not in {"NIFTY", "SENSEX"}:
        raise HTTPException(
            status_code=400,
            detail="symbol must be NIFTY or SENSEX",
        )

    nspot, sspot, vix = market_values(date)
    spot = nspot if symbol == "NIFTY" else sspot
    step = NIFTY_STEP if symbol == "NIFTY" else SENSEX_STEP

    result = locked_straddle(
        day_options(date, symbol),
        symbol,
        expiry,
        step,
        spot,
    )

    return {
        "date": date,
        "symbol": symbol,
        "expiry": expiry,
        "india_vix": clean_number(vix),
        **result,
    }


@app.get("/api/diagonal-expiries")
def diagonal_expiries(symbol: str, start_date: str, end_date: str):
    """Return every unique expiry visible in the selected date range."""
    symbol = symbol.upper().strip()
    if symbol not in {"NIFTY", "SENSEX"}:
        raise HTTPException(status_code=400, detail="symbol must be NIFTY or SENSEX")
    if start_date > end_date:
        raise HTTPException(status_code=400, detail="start_date cannot be after end_date")

    found = set()
    for dt in available_dates():
        if start_date <= dt <= end_date:
            df = day_options(dt, symbol)
            if not df.empty and "expiry" in df.columns:
                found.update(df["expiry"].dropna().astype(str).unique().tolist())

    return {"symbol": symbol, "start_date": start_date, "end_date": end_date, "expiries": sorted(found)}


@app.get("/api/diagonal")
def diagonal(
    symbol: str,
    start_date: str,
    end_date: str,
    earlier_expiry: str,
    later_expiry: str,
    ce_start_strike: float,
    ce_gap: float = 200,
    ce_count: int = 5,
    ce_ratio: float = 1.0,
    pe_start_strike: float = 20000,
    pe_gap: float = 200,
    pe_count: int = 5,
    pe_ratio: float = 1.0,
):
    """Build flexible CE and PE diagonal rows from the existing option database.

    CE: later-expiry BUY at start strike, earlier-expiry SELL one gap lower.
    PE: later-expiry BUY at start strike, earlier-expiry SELL one gap higher.
    Each side has one common gap, strike count and editable ratio.
    Diagonal Value = Buy Premium - (Sell Premium * Ratio).
    """
    symbol = symbol.upper().strip()
    if symbol not in {"NIFTY", "SENSEX"}:
        raise HTTPException(status_code=400, detail="symbol must be NIFTY or SENSEX")
    if start_date > end_date:
        raise HTTPException(status_code=400, detail="start_date cannot be after end_date")
    if earlier_expiry == later_expiry:
        raise HTTPException(status_code=400, detail="Earlier and Later expiry must be different")
    if ce_gap <= 0 or pe_gap <= 0 or ce_count < 1 or pe_count < 1:
        raise HTTPException(status_code=400, detail="Gap and strike count must be greater than zero")
    if ce_ratio <= 0 or pe_ratio <= 0:
        raise HTTPException(status_code=400, detail="Ratio must be greater than zero")

    selected_dates = [d for d in available_dates() if start_date <= d <= end_date]
    rows = []

    def close_for(df, expiry, option_type, strike):
        if df.empty:
            return None
        m = df[
            (df["expiry"] == str(expiry))
            & (df["option_type"] == option_type)
            & (df["strike"] == float(strike))
        ]
        if m.empty:
            return None
        value = pd.to_numeric(m.iloc[0]["close"], errors="coerce")
        return clean_number(value)

    for dt in selected_dates:
        nspot, sspot, vix = market_values(dt)
        spot = nspot if symbol == "NIFTY" else sspot
        df = day_options(dt, symbol)

        # CE: start -> lower strike by the single common gap.
        for i in range(int(ce_count)):
            buy_strike = float(ce_start_strike) - (i * float(ce_gap))
            sell_strike = buy_strike - float(ce_gap)
            buy_premium = close_for(df, later_expiry, "CE", buy_strike)
            sell_premium = close_for(df, earlier_expiry, "CE", sell_strike)
            value = None
            if buy_premium is not None and sell_premium is not None:
                value = clean_number(float(buy_premium) - (float(sell_premium) * float(ce_ratio)))
            rows.append({
                "Date": dt,
                "Spot": clean_number(spot),
                "VIX": clean_number(vix),
                "Type": "CE",
                "Buy Expiry": later_expiry,
                "Sell Expiry": earlier_expiry,
                "Buy Strike": clean_number(buy_strike),
                "Sell Strike": clean_number(sell_strike),
                "Buy Premium": buy_premium,
                "Sell Premium": sell_premium,
                "Ratio": float(ce_ratio),
                "Diagonal Value": value,
            })

        # PE: start -> higher strike by the single common gap.
        for i in range(int(pe_count)):
            buy_strike = float(pe_start_strike) + (i * float(pe_gap))
            sell_strike = buy_strike + float(pe_gap)
            buy_premium = close_for(df, later_expiry, "PE", buy_strike)
            sell_premium = close_for(df, earlier_expiry, "PE", sell_strike)
            value = None
            if buy_premium is not None and sell_premium is not None:
                value = clean_number(float(buy_premium) - (float(sell_premium) * float(pe_ratio)))
            rows.append({
                "Date": dt,
                "Spot": clean_number(spot),
                "VIX": clean_number(vix),
                "Type": "PE",
                "Buy Expiry": later_expiry,
                "Sell Expiry": earlier_expiry,
                "Buy Strike": clean_number(buy_strike),
                "Sell Strike": clean_number(sell_strike),
                "Buy Premium": buy_premium,
                "Sell Premium": sell_premium,
                "Ratio": float(pe_ratio),
                "Diagonal Value": value,
            })

    return {
        "symbol": symbol,
        "start_date": start_date,
        "end_date": end_date,
        "earlier_expiry": earlier_expiry,
        "later_expiry": later_expiry,
        "rows": rows,
    }


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(
        "api:app",
        host="127.0.0.1",
        port=8000,
        reload=True,
    )
