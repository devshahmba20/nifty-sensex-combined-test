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


# ---------------------------------------------------------------------------
# CALENDAR STRATEGY
# ---------------------------------------------------------------------------

CALENDAR_SETUPS = {
    "ATM CE": ("CE", 0),
    "ATM PE": ("PE", 0),
    "ATM +500 CE": ("CE", 500),
    "ATM -500 PE": ("PE", -500),
}


def calendar_leg_premium(df, expiry, strike, option_type):
    x = df[
        df["expiry"].eq(str(expiry))
        & df["option_type"].eq(option_type)
    ]
    if x.empty:
        return None
    x = x[x["strike"].eq(float(strike))]
    if x.empty:
        return None
    value = x.iloc[0]["close"]
    return clean_number(value)


def calendar_row(dt, far_expiry, near_expiry, setup):
    """
    PURE WEEKLY CALENDAR

    Far/1st leg  = BUY later expiry
    Near/2nd leg = SELL earlier expiry
    Same strike between the two expiries.

    ATM is rounded to the nearest 100.
    Setups:
      ATM CE
      ATM PE
      ATM +500 CE
      ATM -500 PE
    """
    if setup not in CALENDAR_SETUPS:
        return None

    nspot, _, vix = market_values(dt)
    if nspot is None or not np.isfinite(nspot):
        return None

    option_type, offset = CALENDAR_SETUPS[setup]
    atm = round_strike(float(nspot), 100)
    strike = int(atm + offset)

    df = day_options(dt, "NIFTY")
    far = calendar_leg_premium(df, far_expiry, strike, option_type)
    near = calendar_leg_premium(df, near_expiry, strike, option_type)

    if far is None or near is None:
        return None

    ratio = far / near if near != 0 else math.nan
    calendar_value = far - near

    # DTE is measured against each expiry from the trading date.
    try:
        trade_d = pd.Timestamp(dt)
        far_d = pd.Timestamp(far_expiry)
        near_d = pd.Timestamp(near_expiry)
        far_dte = int((far_d - trade_d).days)
        near_dte = int((near_d - trade_d).days)
    except Exception:
        return None

    return {
        "Date": dt,
        "Setup": setup,
        "NIFTY Spot": clean_number(nspot),
        "ATM": int(atm),
        "Strike": int(strike),
        "Option Type": option_type,
        "Far Expiry": str(far_expiry),
        "Near Expiry": str(near_expiry),
        "Far DTE": far_dte,
        "Near DTE": near_dte,
        "Far Premium (Buy)": clean_number(far),
        "Near Premium (Sell)": clean_number(near),
        "Entry Ratio": clean_number(ratio),
        "Calendar Value": clean_number(calendar_value),
        "India VIX": clean_number(vix),
    }


def run_calendar_backtest(
    start_date,
    end_date,
    far_expiry,
    near_expiry,
    setup,
    entry_min=1.05,
    entry_max=1.30,
    exit_ratio=1.45,
    min_dte=9,
):
    """
    One pure calendar pair.

    Rules:
      - consecutive weekly expiries
      - far/1st expiry is bought
      - near/2nd expiry is sold
      - near-leg DTE must be > 8 (therefore 9+)
      - expiry gap must be 5-9 days
      - entry ratio is inclusive: 1.05 <= far/near <= 1.30
      - first qualifying day only
      - exit ratio > 1.45
      - no re-entry
      - P&L = exit calendar value - entry calendar value
    """
    try:
        far_d = pd.Timestamp(far_expiry)
        near_d = pd.Timestamp(near_expiry)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid expiry date")

    if far_d <= near_d:
        raise HTTPException(
            status_code=400,
            detail="Far expiry must be later than near expiry",
        )

    expiry_gap = int((far_d - near_d).days)
    if expiry_gap < 5 or expiry_gap > 9:
        raise HTTPException(
            status_code=400,
            detail="Calendar expiry pair must be 5-9 days apart",
        )

    selected = [
        d for d in available_dates()
        if start_date <= d <= end_date
    ]

    rows = []
    entry = None
    exit_row = None

    for dt in selected:
        row = calendar_row(dt, far_expiry, near_expiry, setup)
        if row is None:
            continue

        # Strategy is eligible only while both legs are still relevant,
        # and the near leg must be strictly greater than 8 DTE.
        if row["Near DTE"] < min_dte:
            continue

        row["Signal"] = "Watch"

        if entry is None:
            if entry_min <= row["Entry Ratio"] <= entry_max:
                entry = row.copy()
                entry["Signal"] = "ENTRY"
                rows.append(entry)
            continue

        # Once entered, no re-entry. Search only for the first exit.
        if row["Entry Ratio"] > exit_ratio:
            exit_row = row.copy()
            exit_row["Signal"] = "EXIT"
            rows.append(exit_row)
            break

    result = {
        "setup": setup,
        "far_expiry": str(far_expiry),
        "near_expiry": str(near_expiry),
        "expiry_gap_days": expiry_gap,
        "entry_rule": f"{entry_min:.2f} <= ratio <= {entry_max:.2f}",
        "exit_rule": f"ratio > {exit_ratio:.2f}",
        "min_near_dte": min_dte,
        "entry_found": entry is not None,
        "exit_found": exit_row is not None,
        "entry_date": entry["Date"] if entry else None,
        "exit_date": exit_row["Date"] if exit_row else None,
        "entry_ratio": entry["Entry Ratio"] if entry else None,
        "exit_ratio": exit_row["Entry Ratio"] if exit_row else None,
        "entry_calendar_value": entry["Calendar Value"] if entry else None,
        "exit_calendar_value": exit_row["Calendar Value"] if exit_row else None,
        "pnl": (
            clean_number(exit_row["Calendar Value"] - entry["Calendar Value"])
            if entry is not None and exit_row is not None
            else None
        ),
        "rows": rows,
    }
    return result


@app.get("/api/calendar")
def calendar(
    start_date: str,
    end_date: str,
    far_expiry: str,
    near_expiry: str,
    setup: str = "ATM CE",
    entry_min: float = 1.05,
    entry_max: float = 1.30,
    exit_ratio: float = 1.45,
    min_dte: int = 9,
):
    return run_calendar_backtest(
        start_date=start_date,
        end_date=end_date,
        far_expiry=far_expiry,
        near_expiry=near_expiry,
        setup=setup,
        entry_min=float(entry_min),
        entry_max=float(entry_max),
        exit_ratio=float(exit_ratio),
        min_dte=int(min_dte),
    )


@app.get("/api/calendar/setups")
def calendar_setups():
    return {
        "setups": list(CALENDAR_SETUPS.keys()),
        "rules": {
            "atm_step": 100,
            "strike_gap_excluded": 50,
            "expiry_gap_days": [5, 9],
            "min_near_dte": 9,
            "entry_ratio_min": 1.05,
            "entry_ratio_max": 1.30,
            "exit_ratio": 1.45,
            "first_qualifying_day_only": True,
            "re_entry": False,
        },
    }


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(
        "api_new:app",
        host="127.0.0.1",
        port=8001,
        reload=True,
    )
