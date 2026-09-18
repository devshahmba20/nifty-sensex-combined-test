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
        "http://localhost:5174",
        "http://127.0.0.1:5174",
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


@lru_cache(maxsize=8)
def all_expiries(symbol):
    """Return all expiry dates present anywhere in the local database."""
    values = set()
    for dt in available_dates():
        df = day_options(dt, symbol)
        if not df.empty:
            values.update(df["expiry"].dropna().astype(str).tolist())
    return sorted(values)


def _parse_date(value):
    try:
        return pd.Timestamp(value).date()
    except Exception:
        return None


def weekly_expiries(symbol):
    """
    Identify the regular weekly expiry series from the expiry dates stored in
    the database. An expiry is considered part of the weekly series when it
    has another expiry within 10 calendar days on either side. This also
    keeps holiday-adjusted weekly expiries (Monday/Wednesday etc.) while
    excluding the long-dated monthly/quarterly expiries.
    """
    raw = all_expiries(symbol)
    parsed = [(d, _parse_date(d)) for d in raw]
    parsed = [(d, x) for d, x in parsed if x is not None]
    result = []
    for i, (text, d) in enumerate(parsed):
        prev_gap = (d - parsed[i - 1][1]).days if i > 0 else 999
        next_gap = (parsed[i + 1][1] - d).days if i + 1 < len(parsed) else 999
        if prev_gap <= 10 or next_gap <= 10:
            result.append(text)
    return result


def weekly_combinations_for_month(month):
    """
    Build fixed NIFTY/SENSEX weekly pairs by ISO calendar week.
    `month` is YYYY-MM. The selected month controls which expiry weeks are
    included; the returned data window can begin up to 7 days before expiry.
    """
    n_weekly = weekly_expiries("NIFTY")
    s_weekly = weekly_expiries("SENSEX")
    n_by_week = {}
    s_by_week = {}

    for value in n_weekly:
        d = _parse_date(value)
        if d is None or value[:7] != month:
            continue
        n_by_week.setdefault(d.isocalendar()[:2], []).append(value)

    # Also include a Sensex weekly expiry in the same ISO week even if the
    # expiry date itself falls just outside the selected month. This handles
    # month boundaries while keeping the selected month tied to NIFTY weeks.
    for value in s_weekly:
        d = _parse_date(value)
        if d is None:
            continue
        s_by_week.setdefault(d.isocalendar()[:2], []).append(value)

    combos = []
    for week_key, n_list in sorted(n_by_week.items()):
        s_list = s_by_week.get(week_key, [])
        for ne in sorted(n_list):
            for se in sorted(s_list):
                combos.append({
                    "id": f"COMB-{len(combos)+1:02d}",
                    "week": f"{week_key[0]}-W{week_key[1]:02d}",
                    "nifty_expiry": ne,
                    "sensex_expiry": se,
                    "earlier_expiry": min(ne, se),
                    "later_expiry": max(ne, se),
                })
    return combos


@app.get("/api/weekly-combinations")
def weekly_combinations(
    month: str,
    multiplier: float = 3.30,
):
    """Return every weekly NIFTY/SENSEX combination in a selected month.

    For each fixed pair, day-wise rows cover the previous 7 calendar days
    through the earlier expiry. The selected pair never switches mid-week.
    """
    try:
        month_start = pd.Timestamp(f"{month}-01").date()
    except Exception:
        raise HTTPException(status_code=400, detail="month must be YYYY-MM")

    combos = weekly_combinations_for_month(month)
    all_dates = available_dates()
    output = []

    for combo in combos:
        earlier = _parse_date(combo["earlier_expiry"])
        if earlier is None:
            continue
        window_start = earlier - pd.Timedelta(days=7)
        window_end = earlier

        rows = []
        for dt in all_dates:
            d = _parse_date(dt)
            if d is None or d < window_start or d > window_end:
                continue
            try:
                row = row_from_day(
                    dt,
                    combo["nifty_expiry"],
                    combo["sensex_expiry"],
                    float(multiplier),
                )
                if row is not None:
                    row["NIFTY Expiry"] = combo["nifty_expiry"]
                    row["SENSEX Expiry"] = combo["sensex_expiry"]
                    row["NIFTY DTE"] = (
                        _parse_date(combo["nifty_expiry"]) - d
                    ).days
                    row["SENSEX DTE"] = (
                        _parse_date(combo["sensex_expiry"]) - d
                    ).days
                    row["Combination ID"] = combo["id"]
                    row["Week"] = combo["week"]
                    row["View From"] = str(window_start)
                    rows.append(row)
            except Exception as exc:
                print(f"Weekly row error {dt}: {exc}")

        if rows:
            values = [float(r["Final Value"]) for r in rows if r["Final Value"] is not None]
            output.append({
                **combo,
                "view_from": str(window_start),
                "row_count": len(rows),
                "average": clean_number(np.mean(values)) if values else None,
                "maximum": clean_number(np.max(values)) if values else None,
                "minimum": clean_number(np.min(values)) if values else None,
                "rows": rows,
            })

    return {
        "month": month,
        "multiplier": float(multiplier),
        "count": len(output),
        "combinations": output,
    }



def calendar_rows_for_day(dt, symbol, earlier_expiry, later_expiry, option_type, strikes):
    df = day_options(dt, symbol)
    if df.empty:
        return []
    x = df[df["expiry"].isin([str(earlier_expiry), str(later_expiry)])].copy()
    if option_type in {"CE", "PE"}:
        x = x[x["option_type"] == option_type]
    else:
        x = x[x["option_type"].isin(["CE", "PE"])]
    if x.empty:
        return []
    piv = x.pivot_table(index=["strike", "option_type"], columns="expiry", values="close", aggfunc="first")
    rows = []
    for strike in strikes:
        for typ in ([option_type] if option_type in {"CE", "PE"} else ["CE", "PE"]):
            key = (float(strike), typ)
            if key not in piv.index:
                continue
            row = piv.loc[key]
            e = row.get(str(earlier_expiry))
            l = row.get(str(later_expiry))
            if pd.isna(e) or pd.isna(l):
                continue
            e = float(e); l = float(l)
            nspot, sspot, _vix = market_values(dt)
            spot = nspot if symbol == "NIFTY" else sspot
            rows.append({
                "Date": dt,
                "Spot": clean_number(spot),
                "Option Type": typ,
                "Strike": float(strike),
                "Earlier Expiry": str(earlier_expiry),
                "Later Expiry": str(later_expiry),
                "Earlier Premium": clean_number(e),
                "Later Premium": clean_number(l),
                "Ratio": clean_number(l / e) if e != 0 else None,
                "Calendar Value": clean_number(l - e),
            })
    return rows


@app.get("/api/calendar-expiries")
def calendar_expiries(
    start_date: str,
    end_date: str,
    symbol: str,
    view_date: str = "",
):
    """
    Return expiries that are genuinely usable for the selected View Date.

    From/To define the search window. When View Date is supplied, an expiry
    must:
      1) be inside From/To,
      2) be on/after View Date, and
      3) have CE/PE option data actually present on View Date.

    This prevents the dropdown from showing far-future expiries for which the
    selected View Date has no option-chain data.
    """
    symbol = symbol.upper()
    if symbol not in {"NIFTY", "SENSEX"}:
        raise HTTPException(status_code=400, detail="symbol must be NIFTY or SENSEX")
    if start_date > end_date:
        raise HTTPException(status_code=400, detail="start_date cannot be after end_date")

    search_values = set()

    # Candidate expiries from option data across the selected From/To range.
    for dt in available_dates():
        if start_date <= dt <= end_date:
            df = day_options(dt, symbol)
            if not df.empty:
                search_values.update(df["expiry"].dropna().astype(str).tolist())

    # If View Date is selected, require real option data on that exact date.
    if view_date:
        if view_date not in available_dates():
            raise HTTPException(status_code=404, detail="View Date is not available in the database")

        view_df = day_options(view_date, symbol)
        if view_df.empty:
            return {
                "symbol": symbol,
                "start_date": start_date,
                "end_date": end_date,
                "view_date": view_date,
                "expiries": [],
                "count": 0,
            }

        # Only expiries with both CE and PE on the View Date are usable for
        # the locked Synthetic Future snapshot.
        grouped = (
            view_df[view_df["option_type"].isin(["CE", "PE"])]
            .groupby("expiry")["option_type"]
            .nunique()
        )
        usable_on_view = set(grouped[grouped >= 2].index.astype(str).tolist())

        values = sorted(
            e for e in search_values
            if e in usable_on_view and e >= view_date
        )
    else:
        values = sorted(search_values)

    return {
        "symbol": symbol,
        "start_date": start_date,
        "end_date": end_date,
        "view_date": view_date,
        "expiries": values,
        "count": len(values),
    }


def calendar_snapshot(dt, symbol, expiry):
    nspot, sspot, vix = market_values(dt)
    spot = nspot if symbol == "NIFTY" else sspot
    step = NIFTY_STEP if symbol == "NIFTY" else SENSEX_STEP
    result = locked_straddle(
        day_options(dt, symbol),
        symbol,
        expiry,
        step,
        spot,
    )
    return {
        "expiry": str(expiry),
        "provisional_atm": result["provisional_atm"],
        "atm_strike_used": result["atm_strike_used"],
        "atm_ce": result["atm_ce"],
        "atm_pe": result["atm_pe"],
        "synthetic_future": result["synthetic_future"],
        "final_strike": result["final_strike"],
        "final_ce": result["final_ce"],
        "final_pe": result["final_pe"],
        "straddle": result["straddle"],
        "status": result["status"],
    }


@app.get("/api/calendar-view")
def calendar_view(
    date: str,
    symbol: str,
    earlier_expiry: str,
    later_expiry: str,
):
    symbol = symbol.upper()
    if symbol not in {"NIFTY", "SENSEX"}:
        raise HTTPException(status_code=400, detail="symbol must be NIFTY or SENSEX")
    if earlier_expiry >= later_expiry:
        raise HTTPException(status_code=400, detail="Earlier expiry must be before Later expiry")
    if date not in available_dates():
        raise HTTPException(status_code=404, detail="View Date is not available in the database")

    nspot, sspot, vix = market_values(date)
    spot = nspot if symbol == "NIFTY" else sspot
    return {
        "date": date,
        "symbol": symbol,
        "spot": clean_number(spot),
        "india_vix": clean_number(vix),
        "expiries": [
            calendar_snapshot(date, symbol, earlier_expiry),
            calendar_snapshot(date, symbol, later_expiry),
        ],
    }


@app.get("/api/calendar")
def calendar(
    start_date: str,
    end_date: str,
    symbol: str,
    earlier_expiry: str,
    later_expiry: str,
    start_strike: float = 0,
    strike_gap: float = 500,
    strike_count: int = 10,
    view_date: str = "",
):
    symbol = symbol.upper()
    if symbol not in {"NIFTY", "SENSEX"}:
        raise HTTPException(status_code=400, detail="symbol must be NIFTY or SENSEX")
    if start_date > end_date:
        raise HTTPException(status_code=400, detail="start_date cannot be after end_date")
    if earlier_expiry >= later_expiry:
        raise HTTPException(status_code=400, detail="Earlier expiry must be before later expiry")
    if strike_gap <= 0 or strike_count < 1 or strike_count > 50:
        raise HTTPException(status_code=400, detail="Invalid strike gap/count")

    # From/To are only the expiry-search range. The actual calendar data
    # starts from View Date and runs until the earlier expiry (or To Date,
    # whichever comes first). This prevents a large search range from
    # incorrectly starting the result table weeks/months before View Date.
    if not view_date:
        raise HTTPException(status_code=400, detail="View Date is required")
    if view_date not in available_dates():
        raise HTTPException(status_code=404, detail="View Date is not available in the database")
    if view_date < start_date or view_date > end_date:
        raise HTTPException(status_code=400, detail="View Date must be inside the selected From/To range")

    # Both selected expiries must have usable CE/PE data on View Date.
    view_df = day_options(view_date, symbol)
    if view_df.empty:
        raise HTTPException(status_code=400, detail="No option data available on View Date")

    view_expiry_types = (
        view_df[view_df["option_type"].isin(["CE", "PE"])]
        .groupby("expiry")["option_type"]
        .nunique()
    )
    usable_view_expiries = set(
        view_expiry_types[view_expiry_types >= 2].index.astype(str).tolist()
    )
    if earlier_expiry not in usable_view_expiries:
        raise HTTPException(
            status_code=400,
            detail=f"Earlier Expiry {earlier_expiry} has no complete CE/PE data on View Date {view_date}",
        )
    if later_expiry not in usable_view_expiries:
        raise HTTPException(
            status_code=400,
            detail=f"Later Expiry {later_expiry} has no complete CE/PE data on View Date {view_date}",
        )

    earlier_dt = pd.Timestamp(earlier_expiry)
    result_end = min(pd.Timestamp(end_date), earlier_dt).strftime("%Y-%m-%d")
    selected = [d for d in available_dates() if view_date <= d <= result_end]
    if not selected:
        return {
            "symbol": symbol,
            "start_date": start_date,
            "end_date": end_date,
            "earlier_expiry": earlier_expiry,
            "later_expiry": later_expiry,
            "view_date": view_date,
            "data_end_date": result_end,
            "start_strike": None,
            "strike_gap": float(strike_gap),
            "strike_count": int(strike_count),
            "rows": [],
            "count": 0,
        }

    step = NIFTY_STEP if symbol == "NIFTY" else SENSEX_STEP
    strike_reference_date = view_date if view_date in selected else start_date
    if not start_strike:
        spot = market_values(strike_reference_date)[0 if symbol == "NIFTY" else 1]
        if not np.isfinite(spot):
            raise HTTPException(status_code=400, detail="Cannot determine start strike from View Date")
        start_strike = round_strike(float(spot), step)
    start_strike = round_strike(float(start_strike), step)
    strikes = [start_strike + i * float(strike_gap) for i in range(int(strike_count))]

    rows = []
    for dt in selected:
        try:
            rows.extend(calendar_rows_for_day(dt, symbol, earlier_expiry, later_expiry, "BOTH", strikes))
        except Exception as exc:
            print(f"Calendar row error {dt}: {exc}")

    return {
        "symbol": symbol,
        "start_date": start_date,
        "end_date": end_date,
        "view_date": strike_reference_date,
        "earlier_expiry": earlier_expiry,
        "later_expiry": later_expiry,
        "data_end_date": result_end,
        "start_strike": clean_number(start_strike),
        "strike_gap": float(strike_gap),
        "strike_count": int(strike_count),
        "rows": rows,
        "count": len(rows),
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


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(
        "api:app",
        host="127.0.0.1",
        port=8000,
        reload=True,
    )
