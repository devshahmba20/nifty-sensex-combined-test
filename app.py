import streamlit as st
import pandas as pd
import numpy as np
import sqlite3
import zlib
import io
import os

st.set_page_config(page_title="NIFTY × SENSEX Strategy Tester", layout="wide")

DB_PATH = os.path.join(os.path.dirname(__file__), "strategy_data.db")
NIFTY_STEP = 50
SENSEX_STEP = 100

st.markdown("""
<style>
.main-title{font-size:34px;font-weight:800;letter-spacing:-1px;margin-bottom:2px}
.subtitle{color:#6b7280;font-size:15px;margin-bottom:18px}
.section-title{font-size:19px;font-weight:750;margin-top:6px;margin-bottom:5px}
.formula-box{padding:14px 16px;border-radius:12px;background:#f6f7fb;border:1px solid #e5e7eb;font-family:monospace;font-size:15px}
div[data-testid="stVerticalBlock"] > div:has(> div[data-testid="stHorizontalBlock"]){gap:0.5rem}
div[data-testid="stMetric"]{padding:8px 10px;border-radius:12px;border:1px solid #e5e7eb;background:#fff;box-shadow:0 2px 8px rgba(0,0,0,.04)}
</style>
""", unsafe_allow_html=True)

if not os.path.exists(DB_PATH):
    st.error("strategy_data.db is missing. Keep it in the same GitHub folder as app.py.")
    st.stop()

def db_connect():
    return sqlite3.connect(DB_PATH)

@st.cache_data(show_spinner=False)
def available_dates():
    con=db_connect()
    q="""SELECT trade_date FROM days
         WHERE nifty_blob IS NOT NULL AND length(nifty_blob)>0
           AND sensex_blob IS NOT NULL AND length(sensex_blob)>0
         ORDER BY trade_date"""
    out=pd.read_sql_query(q,con)["trade_date"].tolist()
    con.close()
    return out

@st.cache_data(show_spinner=False)
def market_values(dt):
    con=db_connect()
    row=con.execute("SELECT nifty_spot,sensex_spot,india_vix FROM days WHERE trade_date=?",(dt,)).fetchone()
    con.close()
    if row is None:
        return np.nan,np.nan,np.nan
    return tuple(float(x) if x is not None else np.nan for x in row)

@st.cache_data(show_spinner=False)
def day_options(dt, symbol):
    con=db_connect()
    col="nifty_blob" if symbol=="NIFTY" else "sensex_blob"
    row=con.execute(f"SELECT {col} FROM days WHERE trade_date=?",(dt,)).fetchone()
    con.close()
    if row is None or not row[0]:
        return pd.DataFrame(columns=["expiry","strike","option_type","close"])
    raw=zlib.decompress(row[0]).decode("utf-8")
    df=pd.read_csv(io.StringIO(raw),header=None,names=["expiry","strike","option_type","close"])
    df["strike"]=pd.to_numeric(df["strike"],errors="coerce")
    df["close"]=pd.to_numeric(df["close"],errors="coerce")
    df["option_type"]=df["option_type"].astype(str).str.upper()
    return df.dropna(subset=["expiry","strike"])

@st.cache_data(show_spinner=False)
def expiry_values(dt, symbol):
    df=day_options(dt,symbol)
    return sorted(df["expiry"].dropna().astype(str).unique().tolist())

def round_strike(value,step):
    if not np.isfinite(value): return np.nan
    return int(np.floor(value/step+0.5)*step)

def locked_straddle(df,symbol,expiry,step,spot):
    x=df[df["expiry"].eq(expiry) & df["option_type"].isin(["CE","PE"])].copy()
    empty={"spot":spot,"spot_source":"market OHLC","provisional_atm":np.nan,
           "atm_ce":np.nan,"atm_pe":np.nan,"synthetic_future":np.nan,
           "final_strike":np.nan,"final_ce":np.nan,"final_pe":np.nan,
           "straddle":np.nan,"status":"No usable data"}
    if x.empty or not np.isfinite(spot): return empty

    provisional=round_strike(spot,step)
    piv=x.pivot_table(index="strike",columns="option_type",values="close",aggfunc="first")
    if "CE" not in piv.columns or "PE" not in piv.columns:
        empty["provisional_atm"]=provisional
        empty["status"]="CE/PE missing"
        return empty
    piv=piv.dropna(subset=["CE","PE"])
    if piv.empty:
        empty["provisional_atm"]=provisional
        empty["status"]="CE/PE missing"
        return empty

    if provisional in piv.index:
        used=provisional
    else:
        used=piv.index[np.argmin(np.abs(piv.index.to_numpy(dtype=float)-provisional))]

    atm_ce=float(piv.loc[used,"CE"]); atm_pe=float(piv.loc[used,"PE"])
    synthetic=float(used+atm_ce-atm_pe)
    final_strike=round_strike(synthetic,step)

    if final_strike not in piv.index:
        return {"spot":spot,"spot_source":"market OHLC","provisional_atm":used,
                "atm_ce":atm_ce,"atm_pe":atm_pe,"synthetic_future":synthetic,
                "final_strike":final_strike,"final_ce":np.nan,"final_pe":np.nan,
                "straddle":np.nan,"status":"Final-strike CE/PE missing"}

    final_ce=float(piv.loc[final_strike,"CE"]); final_pe=float(piv.loc[final_strike,"PE"])
    return {"spot":spot,"spot_source":"market OHLC","provisional_atm":used,
            "atm_ce":atm_ce,"atm_pe":atm_pe,"synthetic_future":synthetic,
            "final_strike":final_strike,"final_ce":final_ce,"final_pe":final_pe,
            "straddle":final_ce+final_pe,"status":"OK"}

@st.cache_data(show_spinner=False)
def calculate_day(dt,n_exp,s_exp,multiplier):
    nspot,sspot,vix=market_values(dt)
    n=locked_straddle(day_options(dt,"NIFTY"),"NIFTY",n_exp,NIFTY_STEP,nspot)
    s=locked_straddle(day_options(dt,"SENSEX"),"SENSEX",s_exp,SENSEX_STEP,sspot)
    fv=s["straddle"]-(n["straddle"]*multiplier) if np.isfinite(n["straddle"]) and np.isfinite(s["straddle"]) else np.nan
    return n,s,vix,fv

@st.cache_data(show_spinner=False)
def run_backtest(dates,n_exp,s_exp,multiplier):
    rows=[]
    for dt in dates:
        try:
            n,s,vix,fv=calculate_day(dt,n_exp,s_exp,multiplier)
            if np.isfinite(fv):
                rows.append({"Date":dt,"India VIX":vix,"NIFTY Spot":n["spot"],
                             "NIFTY Straddle":n["straddle"],"Adjusted NIFTY":n["straddle"]*multiplier,
                             "SENSEX Spot":s["spot"],"SENSEX Straddle":s["straddle"],
                             "Final Value":fv,"NIFTY Final Strike":n["final_strike"],
                             "SENSEX Final Strike":s["final_strike"]})
        except Exception:
            continue
    return pd.DataFrame(rows)






# -----------------------------
# SIDEBAR NAVIGATION
# -----------------------------
st.sidebar.markdown("## 📊 NIFTY × SENSEX")
page = st.sidebar.radio(
    "Open section",
    ["🎯 Strategy Tester", "📈 Individual Straddle", "📅 Calendar Strategy"],
    index=0,
    key="page_nav",
)
st.sidebar.divider()
st.sidebar.caption("Click a section above. Only the selected section is shown.")

# -----------------------------
# DATE / EXPIRY SELECTION
# -----------------------------
st.markdown('<div class="section-title">📅 Date & Expiry Selection</div>', unsafe_allow_html=True)
dates=available_dates()
if not dates:
    st.error("No common NIFTY + SENSEX option dates are available in the database.")
    st.stop()

c1,c2,c3=st.columns(3)
with c1:
    start_date=st.selectbox("Start Date",dates,index=max(0,len(dates)-20),key="main_start")
with c2:
    valid_end=[d for d in dates if d>=start_date]
    end_date=st.selectbox("End Date",valid_end,index=len(valid_end)-1,key="main_end")
with c3:
    view_dates=[d for d in dates if start_date<=d<=end_date]
    selected_date=st.selectbox("View Date",view_dates,index=len(view_dates)-1,key="main_view")

n_expiries=expiry_values(selected_date,"NIFTY")
s_expiries=expiry_values(selected_date,"SENSEX")
if not n_expiries or not s_expiries:
    st.error("Expiry data is not available for this date.")
    st.stop()

e1,e2=st.columns(2)
with e1: nifty_exp=st.selectbox("NIFTY Expiry",n_expiries,key="main_n_exp")
with e2: sensex_exp=st.selectbox("SENSEX Expiry",s_expiries,key="main_s_exp")

n,s,vix,_=calculate_day(selected_date,nifty_exp,sensex_exp,3.30)

if page == "🎯 Strategy Tester":
    # -----------------------------
    # MAIN STRATEGY TESTER
    # -----------------------------
    st.markdown('<div class="section-title">🎯 NIFTY × SENSEX Strategy Tester</div>', unsafe_allow_html=True)
    st.caption("Existing strategy logic is kept unchanged. The Individual Straddle Analysis is added separately below.")

    multiplier = st.number_input("NIFTY Multiplier", min_value=0.0, value=3.30, step=0.05, format="%.2f", key="main_multiplier")
    final_value = s["straddle"] - (n["straddle"] * multiplier) if np.isfinite(s["straddle"]) and np.isfinite(n["straddle"]) else np.nan

    st.caption("Selected setup: NIFTY " + str(nifty_exp) + " • SENSEX " + str(sensex_exp) + " • Multiplier " + f"{multiplier:.2f}")
    a,b,c,d,e=st.columns(5)
    a.metric("India VIX", f"{vix:.2f}" if np.isfinite(vix) else "N/A")
    b.metric("NIFTY Straddle", f"{n['straddle']:.2f}" if np.isfinite(n['straddle']) else "N/A")
    c.metric("Adjusted NIFTY", f"{n['straddle']*multiplier:.2f}" if np.isfinite(n['straddle']) else "N/A")
    d.metric("SENSEX Straddle", f"{s['straddle']:.2f}" if np.isfinite(s['straddle']) else "N/A")
    e.metric("STRATEGY VALUE", f"{final_value:.2f}" if np.isfinite(final_value) else "N/A")

    st.divider()
    st.markdown('<div class="section-title">🔍 Locked Straddle Calculation</div>', unsafe_allow_html=True)
    l,r=st.columns(2)
    with l:
        st.subheader("NIFTY")
        st.dataframe(pd.DataFrame([{
            "Spot":n['spot'],"Provisional ATM":n['provisional_atm'],"ATM CE Close":n['atm_ce'],"ATM PE Close":n['atm_pe'],
            "Synthetic Future":n['synthetic_future'],"Final Strike":n['final_strike'],"Final CE Close":n['final_ce'],"Final PE Close":n['final_pe'],
            "Straddle":n['straddle'],"Status":n['status']
        }]),use_container_width=True,hide_index=True)
    with r:
        st.subheader("SENSEX")
        st.dataframe(pd.DataFrame([{
            "Spot":s['spot'],"Provisional ATM":s['provisional_atm'],"ATM CE Close":s['atm_ce'],"ATM PE Close":s['atm_pe'],
            "Synthetic Future":s['synthetic_future'],"Final Strike":s['final_strike'],"Final CE Close":s['final_ce'],"Final PE Close":s['final_pe'],
            "Straddle":s['straddle'],"Status":s['status']
        }]),use_container_width=True,hide_index=True)

    st.info(f"Final Value = {s['straddle']:.2f} − ({n['straddle']:.2f} × {multiplier:.2f}) = {final_value:.2f}" if np.isfinite(final_value) else "Final Value could not be calculated for this selection.")

    # -----------------------------
    # BACKTEST
    # -----------------------------
    st.divider()
    st.markdown('<div class="section-title">📊 Expiry Combination Backtest</div>', unsafe_allow_html=True)
    st.write("Choose an expiry pair and the selected date range. Only dates inside the range are processed.")
    bt1,bt2=st.columns(2)
    with bt1: bt_nifty_exp=st.selectbox("Backtest NIFTY Expiry",n_expiries,key="bt_n")
    with bt2: bt_sensex_exp=st.selectbox("Backtest SENSEX Expiry",s_expiries,key="bt_s")
    run=st.button("Run Backtest",type="primary",key="main_backtest")
    st.caption(f"Selected range: {start_date} → {end_date} | {len(view_dates)} common trading days")

    if run:
        with st.spinner(f"Calculating {len(view_dates)} trading days..."):
            bt=run_backtest(view_dates,bt_nifty_exp,bt_sensex_exp,multiplier)
        if bt.empty:
            st.error("No matching historical rows were found for this expiry combination.")
        else:
            q1,q2,q3,q4=st.columns(4)
            q1.metric("Days",len(bt)); q2.metric("Average",f"{bt['Final Value'].mean():.2f}"); q3.metric("Maximum",f"{bt['Final Value'].max():.2f}"); q4.metric("Minimum",f"{bt['Final Value'].min():.2f}")
            st.subheader("Final Strategy Value")
            st.line_chart(bt.set_index("Date")[["Final Value"]],use_container_width=True)
            st.subheader("Backtest Data")
            st.dataframe(bt,use_container_width=True,hide_index=True)
            st.download_button("Download Backtest CSV",bt.to_csv(index=False).encode("utf-8"),"strategy_backtest.csv","text/csv")


elif page == "📈 Individual Straddle":
    # -----------------------------
    # INDIVIDUAL STRADDLE ANALYSIS
    # -----------------------------
    st.divider()
    st.markdown('<div class="main-title">Individual NIFTY × SENSEX Straddle</div>', unsafe_allow_html=True)
    st.markdown('<div class="subtitle">Separate analysis section • Same locked calculation and same cloud database</div>', unsafe_allow_html=True)

    # Key market values: Spot + Synthetic Future
    st.markdown('<div class="section-title">📊 Spot & Synthetic Future</div>',unsafe_allow_html=True)
    k1,k2,k3,k4=st.columns(4)
    with k1:
        st.metric("NIFTY Spot",f"{n['spot']:.2f}" if np.isfinite(n['spot']) else "N/A")
    with k2:
        st.metric("NIFTY Synthetic Future",f"{n['synthetic_future']:.2f}" if np.isfinite(n['synthetic_future']) else "N/A")
    with k3:
        st.metric("SENSEX Spot",f"{s['spot']:.2f}" if np.isfinite(s['spot']) else "N/A")
    with k4:
        st.metric("SENSEX Synthetic Future",f"{s['synthetic_future']:.2f}" if np.isfinite(s['synthetic_future']) else "N/A")

    st.markdown('<div class="section-title">💰 Individual Straddle</div>',unsafe_allow_html=True)
    m1,m2=st.columns(2)
    with m1:
        st.metric("NIFTY Individual Straddle",f"{n['straddle']:.2f}" if np.isfinite(n['straddle']) else "N/A")
        st.caption(f"Expiry: {nifty_exp} | Final Strike: {n['final_strike']}" if np.isfinite(n['final_strike']) else f"Expiry: {nifty_exp}")
    with m2:
        st.metric("SENSEX Individual Straddle",f"{s['straddle']:.2f}" if np.isfinite(s['straddle']) else "N/A")
        st.caption(f"Expiry: {sensex_exp} | Final Strike: {s['final_strike']}" if np.isfinite(s['final_strike']) else f"Expiry: {sensex_exp}")

    st.divider()
    st.markdown('<div class="section-title">🔍 Calculation Details</div>',unsafe_allow_html=True)
    l,r=st.columns(2)
    with l:
        st.subheader("NIFTY")
        st.dataframe(pd.DataFrame([{"Spot":n['spot'],"Provisional ATM":n['provisional_atm'],"ATM CE":n['atm_ce'],"ATM PE":n['atm_pe'],"Synthetic Future":n['synthetic_future'],"Final Strike":n['final_strike'],"Final CE":n['final_ce'],"Final PE":n['final_pe'],"Straddle":n['straddle'],"Status":n['status']}]),use_container_width=True,hide_index=True)
    with r:
        st.subheader("SENSEX")
        st.dataframe(pd.DataFrame([{"Spot":s['spot'],"Provisional ATM":s['provisional_atm'],"ATM CE":s['atm_ce'],"ATM PE":s['atm_pe'],"Synthetic Future":s['synthetic_future'],"Final Strike":s['final_strike'],"Final CE":s['final_ce'],"Final PE":s['final_pe'],"Straddle":s['straddle'],"Status":s['status']}]),use_container_width=True,hide_index=True)

    @st.cache_data(show_spinner=False)
    def individual_range(dates_range,n_exp,s_exp):
        rows=[]
        for dt in dates_range:
            try:
                n,s,vix,_=calculate_day(dt,n_exp,s_exp,3.30)
                if np.isfinite(n['straddle']) and np.isfinite(s['straddle']):
                    rows.append({
                        'Date':dt,
                        'India VIX':vix,
                        'NIFTY Spot':n['spot'],
                        'NIFTY Synthetic Future':n['synthetic_future'],
                        'NIFTY Final Strike':n['final_strike'],
                        'NIFTY Straddle':n['straddle'],
                        'SENSEX Spot':s['spot'],
                        'SENSEX Synthetic Future':s['synthetic_future'],
                        'SENSEX Final Strike':s['final_strike'],
                        'SENSEX Straddle':s['straddle']
                    })
            except Exception: continue
        return pd.DataFrame(rows)

    st.divider()
    st.markdown('<div class="section-title">📈 Date-wise Individual Straddle</div>',unsafe_allow_html=True)
    ind=individual_range(view_dates,nifty_exp,sensex_exp)
    if ind.empty:
        st.warning("Selected range માટે બંને individual straddlesનો usable data મળ્યો નથી.")
    else:
        st.line_chart(ind.set_index('Date')[['NIFTY Straddle','SENSEX Straddle']],use_container_width=True)

        # Flexible, full-width date-wise table with light visual grouping.
        def style_result_table(df):
            sty = df.style
            nifty_cols = ['NIFTY Spot','NIFTY Synthetic Future','NIFTY Final Strike','NIFTY Straddle']
            sensex_cols = ['SENSEX Spot','SENSEX Synthetic Future','SENSEX Final Strike','SENSEX Straddle']
            vix_cols = ['India VIX']

            for c in nifty_cols:
                if c in df.columns:
                    sty = sty.set_properties(subset=[c], **{'background-color':'#eef6ff'})
            for c in sensex_cols:
                if c in df.columns:
                    sty = sty.set_properties(subset=[c], **{'background-color':'#eefbf2'})
            for c in vix_cols:
                if c in df.columns:
                    sty = sty.set_properties(subset=[c], **{'background-color':'#f7f7f7'})
            if 'Date' in df.columns:
                sty = sty.set_properties(subset=['Date'], **{'font-weight':'600'})
            return sty

        st.caption("💡 Table full-width છે અને columns ને mouse થી drag કરીને તમારી જરૂર મુજબ resize કરી શકો છો. નીચે horizontal scroll પણ મળશે.")
        display_ind = ind.copy()
        for c in ['India VIX','NIFTY Spot','NIFTY Synthetic Future','NIFTY Final Strike','NIFTY Straddle',
                  'SENSEX Spot','SENSEX Synthetic Future','SENSEX Final Strike','SENSEX Straddle']:
            if c in display_ind.columns:
                display_ind[c] = pd.to_numeric(display_ind[c], errors='coerce')

        st.dataframe(
            style_result_table(display_ind),
            width="stretch",
            height=520,
            hide_index=True,
            column_config={
                "Date": st.column_config.TextColumn("Date", width="medium"),
                "India VIX": st.column_config.NumberColumn("India VIX", format="%.2f", width="small"),
                "NIFTY Spot": st.column_config.NumberColumn("NIFTY Spot", format="%.2f", width="medium"),
                "NIFTY Synthetic Future": st.column_config.NumberColumn("NIFTY Synthetic Future", format="%.2f", width="medium"),
                "NIFTY Final Strike": st.column_config.NumberColumn("NIFTY Final Strike", format="%.0f", width="medium"),
                "NIFTY Straddle": st.column_config.NumberColumn("NIFTY Straddle", format="%.2f", width="medium"),
                "SENSEX Spot": st.column_config.NumberColumn("SENSEX Spot", format="%.2f", width="medium"),
                "SENSEX Synthetic Future": st.column_config.NumberColumn("SENSEX Synthetic Future", format="%.2f", width="medium"),
                "SENSEX Final Strike": st.column_config.NumberColumn("SENSEX Final Strike", format="%.0f", width="medium"),
                "SENSEX Straddle": st.column_config.NumberColumn("SENSEX Straddle", format="%.2f", width="medium"),
            },
        )
        st.download_button('Download Individual Straddle CSV',ind.to_csv(index=False).encode('utf-8'),'individual_straddles.csv','text/csv')


else:
    # -----------------------------
    # CALENDAR STRATEGY ANALYSIS
    # -----------------------------
    st.markdown('<div class="main-title">Calendar Strategy Analysis</div>', unsafe_allow_html=True)
    st.markdown('<div class="subtitle">NIFTY / SENSEX • Two-expiry comparison • Flexible strikes • Analysis only</div>', unsafe_allow_html=True)

    st.markdown('<div class="section-title">📅 Calendar Settings</div>', unsafe_allow_html=True)
    cal_dates = dates
    # Compact controls: keep the whole setup visible without large vertical gaps.
    c1,c2,c3,c4 = st.columns([1.0,1.5,1.5,1.2])
    with c1:
        instrument = st.radio("Instrument", ["NIFTY", "SENSEX"], horizontal=True, key="cal_instrument")
    with c2:
        cal_from = st.selectbox("From Date", cal_dates, index=max(0, len(cal_dates)-15), key="cal_from")
    with c3:
        cal_valid_to = [d for d in cal_dates if d >= cal_from]
        cal_to = st.selectbox("To Date", cal_valid_to, index=len(cal_valid_to)-1, key="cal_to")
    with c4:
        cal_days_mode = st.selectbox("Number of Days", ["All available", 5, 10, 15, 20, 30, 60], index=0, key="cal_days_mode")

    selected_cal_dates = [d for d in cal_dates if cal_from <= d <= cal_to]
    if cal_days_mode != "All available":
        selected_cal_dates = selected_cal_dates[:int(cal_days_mode)]
    st.caption(f"Analysis dates: {len(selected_cal_dates)} trading days")

    # Expiries are selected from the actual analysis start date.
    cal_exp = expiry_values(cal_from, instrument)
    if len(cal_exp) < 2:
        st.error("આ તારીખે ઓછામાં ઓછી 2 expiry ઉપલબ્ધ નથી.")
        st.stop()
    ca1, ca2 = st.columns(2)
    with ca1:
        expiry1 = st.selectbox("Expiry 1 (Near)", cal_exp, index=0, key="cal_exp1")
    with ca2:
        expiry2_options = [e for e in cal_exp if e != expiry1]
        expiry2 = st.selectbox("Expiry 2 (Far)", expiry2_options, index=0, key="cal_exp2")

    # Selected market date: spot/futures update immediately when the date changes.
    snap_date = st.selectbox("Market / View Date", selected_cal_dates if selected_cal_dates else cal_dates, index=0, key="cal_snap_date")
    snap_spot_n, snap_spot_s, snap_vix = market_values(snap_date)
    snap_spot = snap_spot_n if instrument == "NIFTY" else snap_spot_s
    snap_df = day_options(snap_date, instrument)
    snap_step = NIFTY_STEP if instrument == "NIFTY" else SENSEX_STEP
    snap_r1 = locked_straddle(snap_df, instrument, expiry1, snap_step, snap_spot)
    snap_r2 = locked_straddle(snap_df, instrument, expiry2, snap_step, snap_spot)

    sm1,sm2,sm3,sm4 = st.columns(4)
    with sm1: st.metric(f"{instrument} Spot", f"{snap_spot:.2f}" if np.isfinite(snap_spot) else "N/A")
    with sm2: st.metric(f"{expiry1} Synthetic Future", f"{snap_r1['synthetic_future']:.2f}" if np.isfinite(snap_r1['synthetic_future']) else "N/A")
    with sm3: st.metric(f"{expiry2} Synthetic Future", f"{snap_r2['synthetic_future']:.2f}" if np.isfinite(snap_r2['synthetic_future']) else "N/A")
    with sm4: st.metric("India VIX", f"{snap_vix:.2f}" if np.isfinite(snap_vix) else "N/A")
    st.caption(f"View date: {snap_date}  •  {expiry1} Straddle: {snap_r1['straddle']:.2f}  •  {expiry2} Straddle: {snap_r2['straddle']:.2f}" if np.isfinite(snap_r1['straddle']) and np.isfinite(snap_r2['straddle']) else f"View date: {snap_date}")

    # Base strike can be selected automatically from the first selected date's locked synthetic future,
    # or manually overridden. This keeps strike selection flexible while preserving instrument strike steps.
    base_opts_df = day_options(cal_from, instrument)
    available_strikes = sorted(base_opts_df["strike"].dropna().unique().tolist()) if not base_opts_df.empty else []
    base_synth = locked_straddle(base_opts_df, instrument, expiry1, step, market_values(cal_from)[0] if instrument=="NIFTY" else market_values(cal_from)[1])["synthetic_future"]
    auto_base = round_strike(base_synth, step) if np.isfinite(base_synth) else (available_strikes[len(available_strikes)//2] if available_strikes else np.nan)

    st.markdown('<div class="section-title">🎯 Strike Selection</div>', unsafe_allow_html=True)
    sb1, sb2, sb3 = st.columns(3)
    with sb1:
        strike_count = st.selectbox("Total Strikes", [1,3,5,7,9,11,15,21], index=4, key="cal_count")
    with sb2:
        strike_gap = st.number_input("CE ↔ PE Strike Gap", min_value=0.0, value=float(step*2), step=float(step), format="%.0f", key="cal_gap")
    with sb3:
        ratio = st.number_input("CE / PE Ratio", min_value=0.0, value=1.00, step=0.05, format="%.2f", key="cal_ratio")

    if available_strikes:
        base_default_idx = int(np.argmin(np.abs(np.asarray(available_strikes, dtype=float)-float(auto_base))) ) if np.isfinite(auto_base) else len(available_strikes)//2
        base_strike = st.selectbox("Base Strike", available_strikes, index=base_default_idx, key="cal_base_strike")
    else:
        st.error("Selected date પર option strikes મળ્યા નથી.")
        st.stop()

    # Generate strike ladder around base strike. Odd counts keep the selected base in the middle.
    count = int(strike_count)
    offsets = list(range(-(count//2), count//2+1)) if count % 2 == 1 else list(range(-(count//2), count//2))
    candidate_strikes = [int(round(base_strike + o*step)) for o in offsets]

    st.caption(f"Base strike: {base_strike:.0f} • Total strikes: {count} • CE/PE gap: {strike_gap:.0f} • Ratio: {ratio:.2f}")

    def synthetic_for_expiry(dt, symbol, expiry):
        spot_n, spot_s, _ = market_values(dt)
        spot = spot_n if symbol == "NIFTY" else spot_s
        return locked_straddle(day_options(dt, symbol), symbol, expiry, NIFTY_STEP if symbol=="NIFTY" else SENSEX_STEP, spot)

    def option_close(df, expiry, strike, typ):
        if df.empty: return np.nan
        q=df[(df["expiry"].eq(expiry)) & (df["strike"].eq(float(strike))) & (df["option_type"].eq(typ))]
        if q.empty: return np.nan
        return float(q.iloc[0]["close"])

    @st.cache_data(show_spinner=False)
    def calendar_range(dates_range, symbol, exp1, exp2, base, count, gap, ratio):
        rows=[]
        step_local=NIFTY_STEP if symbol=="NIFTY" else SENSEX_STEP
        offsets_local=list(range(-(int(count)//2), int(count)//2+1)) if int(count)%2==1 else list(range(-(int(count)//2), int(count)//2))
        strikes_local=[int(round(base + o*step_local)) for o in offsets_local]
        # Each strike row contains CE/PE values for both expiries. CE/PE are separated by the user-defined gap.
        for dt in dates_range:
            try:
                spot_n, spot_s, vix = market_values(dt)
                spot = spot_n if symbol=="NIFTY" else spot_s
                df=day_options(dt,symbol)
                r1=locked_straddle(df,symbol,exp1,step_local,spot)
                r2=locked_straddle(df,symbol,exp2,step_local,spot)
                for strike in strikes_local:
                    pe_strike = int(round(strike - gap))
                    ce1=option_close(df,exp1,strike,"CE")
                    ce2=option_close(df,exp2,strike,"CE")
                    pe1=option_close(df,exp1,pe_strike,"PE")
                    pe2=option_close(df,exp2,pe_strike,"PE")
                    if any(np.isfinite(x) for x in [ce1,ce2,pe1,pe2]):
                        rows.append({
                            "Date":dt,"India VIX":vix,"Strike":strike,"PE Strike":pe_strike,
                            "Expiry 1":exp1,"Expiry 2":exp2,
                            "Spot":spot,
                            "Exp1 Synthetic Future":r1["synthetic_future"],"Exp2 Synthetic Future":r2["synthetic_future"],
                            "Exp1 Straddle":r1["straddle"],"Exp2 Straddle":r2["straddle"],
                            "CE Exp1":ce1,"CE Exp2":ce2,"CE Diff":ce2-ce1 if np.isfinite(ce1) and np.isfinite(ce2) else np.nan,
                            "PE Exp1":pe1,"PE Exp2":pe2,"PE Diff":pe2-pe1 if np.isfinite(pe1) and np.isfinite(pe2) else np.nan,
                            "CE/PE Ratio":ratio,
                            "Calendar Value":(ce2-ce1)*ratio + (pe2-pe1) if np.isfinite(ce1) and np.isfinite(ce2) and np.isfinite(pe1) and np.isfinite(pe2) else np.nan
                        })
            except Exception:
                continue
        return pd.DataFrame(rows)

    run_cal = st.button("Calculate Calendar Analysis", type="primary", key="run_calendar")
    if run_cal:
        with st.spinner(f"Calculating {len(selected_cal_dates)} trading days..."):
            cal = calendar_range(tuple(selected_cal_dates), instrument, expiry1, expiry2, float(base_strike), count, float(strike_gap), float(ratio))
        if cal.empty:
            st.error("Selected dates / strikes / expiries માટે usable option data મળ્યો નથી.")
        else:
            st.markdown('<div class="section-title">📊 Expiry Comparison</div>', unsafe_allow_html=True)
            st.dataframe(cal, width="stretch", height=500, hide_index=True, column_config={
                "Date": st.column_config.TextColumn(width="medium"),
                "Spot": st.column_config.NumberColumn(format="%.2f"),
                "India VIX": st.column_config.NumberColumn(format="%.2f"),
                "Strike": st.column_config.NumberColumn(format="%.0f"),
                "PE Strike": st.column_config.NumberColumn(format="%.0f"),
                "Exp1 Synthetic Future": st.column_config.NumberColumn(format="%.2f"),
                "Exp2 Synthetic Future": st.column_config.NumberColumn(format="%.2f"),
                "Exp1 Straddle": st.column_config.NumberColumn(format="%.2f"),
                "Exp2 Straddle": st.column_config.NumberColumn(format="%.2f"),
                "CE Exp1": st.column_config.NumberColumn(format="%.2f"),
                "CE Exp2": st.column_config.NumberColumn(format="%.2f"),
                "CE Diff": st.column_config.NumberColumn(format="%.2f"),
                "PE Exp1": st.column_config.NumberColumn(format="%.2f"),
                "PE Exp2": st.column_config.NumberColumn(format="%.2f"),
                "PE Diff": st.column_config.NumberColumn(format="%.2f"),
                "CE/PE Ratio": st.column_config.NumberColumn(format="%.2f"),
                "Calendar Value": st.column_config.NumberColumn(format="%.2f"),
            })
            st.download_button("Download Calendar CSV", cal.to_csv(index=False).encode("utf-8"), f"{instrument.lower()}_calendar_analysis.csv", "text/csv")
