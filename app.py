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
# SHARED AVAILABLE DATES
# -----------------------------
dates=available_dates()
if not dates:
    st.error("No usable option dates are available in the database.")
    st.stop()

# -----------------------------
# DATE / EXPIRY SELECTION FOR MAIN STRATEGY / INDIVIDUAL ONLY
# -----------------------------
if page != "📅 Calendar Strategy":
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
    st.markdown('<div class="subtitle">Far Expiry × Near Expiry • Horizontal date matrix • Flexible strikes • Analysis only</div>', unsafe_allow_html=True)

    st.markdown('<div class="section-title">📅 Calendar Settings</div>', unsafe_allow_html=True)
    c1,c2,c3,c4=st.columns([1.0,1.45,1.45,1.0])
    with c1:
        instrument=st.radio("Instrument",["NIFTY","SENSEX"],horizontal=True,key="cal_instrument")
    with c2:
        cal_from=st.selectbox("From Date",dates,index=max(0,len(dates)-15),key="cal_from")
    with c3:
        cal_valid_to=[d for d in dates if d>=cal_from]
        cal_to=st.selectbox("To Date",cal_valid_to,index=len(cal_valid_to)-1,key="cal_to")
    with c4:
        days_mode=st.selectbox("Days",["All available",5,10,15,20,30,60,90],key="cal_days")

    selected_cal_dates=[d for d in dates if cal_from<=d<=cal_to]
    if days_mode!="All available":
        selected_cal_dates=selected_cal_dates[:int(days_mode)]
    st.caption(f"Analysis: {len(selected_cal_dates)} trading days")

    # IMPORTANT: Expiry 1 is FAR, Expiry 2 is NEAR.
    exp_list=expiry_values(cal_from,instrument)
    if len(exp_list)<2:
        st.error("આ તારીખે ઓછામાં ઓછી 2 expiry ઉપલબ્ધ નથી.")
        st.stop()
    x1,x2=st.columns(2)
    with x1:
        far_exp=st.selectbox("Expiry 1 — FAR",exp_list,index=min(1,len(exp_list)-1),key="cal_far")
    with x2:
        near_candidates=[e for e in exp_list if e!=far_exp]
        near_exp=st.selectbox("Expiry 2 — NEAR",near_candidates,index=0,key="cal_near")

    # Market snapshot changes immediately with selected date.
    snap_date=st.selectbox("Market / View Date",selected_cal_dates if selected_cal_dates else dates,index=0,key="cal_snap")
    snap_n,snap_s,snap_vix=market_values(snap_date)
    snap_spot=snap_n if instrument=="NIFTY" else snap_s
    step_local=NIFTY_STEP if instrument=="NIFTY" else SENSEX_STEP
    snap_df=day_options(snap_date,instrument)
    far_snap=locked_straddle(snap_df,instrument,far_exp,step_local,snap_spot)
    near_snap=locked_straddle(snap_df,instrument,near_exp,step_local,snap_spot)
    q1,q2,q3,q4=st.columns(4)
    q1.metric(f"{instrument} Spot",f"{snap_spot:.2f}" if np.isfinite(snap_spot) else "N/A")
    q2.metric("FAR Synthetic Future",f"{far_snap['synthetic_future']:.2f}" if np.isfinite(far_snap['synthetic_future']) else "N/A")
    q3.metric("NEAR Synthetic Future",f"{near_snap['synthetic_future']:.2f}" if np.isfinite(near_snap['synthetic_future']) else "N/A")
    q4.metric("India VIX",f"{snap_vix:.2f}" if np.isfinite(snap_vix) else "N/A")
    if np.isfinite(far_snap['straddle']) and np.isfinite(near_snap['straddle']):
        st.caption(f"View date {snap_date} • FAR {far_exp} Straddle {far_snap['straddle']:.2f} • NEAR {near_exp} Straddle {near_snap['straddle']:.2f}")

    st.markdown('<div class="section-title">🎯 Strike Settings</div>',unsafe_allow_html=True)
    s1,s2,s3,s4,s5=st.columns([1.0,1.0,1.0,1.0,1.0])
    with s1:
        total_strikes=st.selectbox("Total Strike Pairs",[1,3,5,7,9,11,15,21],index=4,key="cal_total")
    with s2:
        adjacent_gap=st.number_input("Strike ↔ Strike Gap",min_value=float(step_local),value=float(step_local),step=float(step_local),format="%.0f",key="cal_adj_gap")
    with s3:
        ce_pe_gap=st.number_input("CE ↕ PE Gap",min_value=0.0,value=float(step_local*2),step=float(step_local),format="%.0f",key="cal_cepe_gap")
    with s4:
        ratio=st.number_input("Ratio",min_value=0.0,value=1.00,step=0.05,format="%.2f",key="cal_ratio")
    with s5:
        formula=st.selectbox("Spread Formula",["FAR − (NEAR × Ratio)","(FAR × Ratio) − NEAR"],key="cal_formula")

    available=sorted(day_options(cal_from,instrument)["strike"].dropna().unique().tolist())
    if not available:
        st.error("Selected date પર option strikes મળ્યા નથી.")
        st.stop()
    auto_base=round_strike(far_snap["synthetic_future"],step_local) if np.isfinite(far_snap["synthetic_future"]) else available[len(available)//2]
    base_idx=int(np.argmin(np.abs(np.asarray(available,dtype=float)-float(auto_base))))
    b1,b2=st.columns(2)
    with b1:
        ce_base=st.selectbox("CE Base Strike",available,index=base_idx,key="cal_ce_base")
    with b2:
        pe_base=st.selectbox("PE Base Strike",available,index=max(0,min(len(available)-1,int(np.argmin(np.abs(np.asarray(available,dtype=float)-(float(ce_base)-ce_pe_gap))))),),key="cal_pe_base")
    st.caption(f"CE base {ce_base:.0f} • PE base {pe_base:.0f} • adjacent strike gap {adjacent_gap:.0f} • CE↕PE gap setting {ce_pe_gap:.0f} • ratio {ratio:.2f}")

    def option_close(df,expiry,strike,typ):
        if df.empty: return np.nan
        q=df[(df["expiry"].eq(expiry)) & (df["strike"].eq(float(strike))) & (df["option_type"].eq(typ))]
        return float(q.iloc[0]["close"]) if not q.empty else np.nan

    def spread_value(far,near,ratio,formula):
        if not (np.isfinite(far) and np.isfinite(near)): return np.nan
        return far-(near*ratio) if formula=="FAR − (NEAR × Ratio)" else (far*ratio)-near

    # Horizontal matrix: one date per column, strike pairs down the rows.
    def build_matrix(dates_range,symbol,far_exp,near_exp,ce_base,pe_base,count,adj_gap,cepe_gap,ratio,formula):
        step=NIFTY_STEP if symbol=="NIFTY" else SENSEX_STEP
        offsets=list(range(-(int(count)//2),int(count)//2+1)) if int(count)%2 else list(range(-(int(count)//2),int(count)//2))
        ce_strikes=[int(round(float(ce_base)+o*float(adj_gap))) for o in offsets]
        pe_strikes=[int(round(float(pe_base)+o*float(adj_gap))) for o in offsets]
        # keep strikes on the instrument's actual strike grid
        ce_strikes=[int(round(x/step)*step) for x in ce_strikes]
        pe_strikes=[int(round(x/step)*step) for x in pe_strikes]
        rows=[]
        # market rows first
        for label,fn in [
            ("India VIX",lambda dt: market_values(dt)[2]),
            ("Spot",lambda dt: market_values(dt)[0] if symbol=="NIFTY" else market_values(dt)[1]),
            ("FAR Synthetic Future",lambda dt: locked_straddle(day_options(dt,symbol),symbol,far_exp,step,market_values(dt)[0] if symbol=="NIFTY" else market_values(dt)[1])["synthetic_future"]),
            ("NEAR Synthetic Future",lambda dt: locked_straddle(day_options(dt,symbol),symbol,near_exp,step,market_values(dt)[0] if symbol=="NIFTY" else market_values(dt)[1])["synthetic_future"]),
            ("FAR Straddle",lambda dt: locked_straddle(day_options(dt,symbol),symbol,far_exp,step,market_values(dt)[0] if symbol=="NIFTY" else market_values(dt)[1])["straddle"]),
            ("NEAR Straddle",lambda dt: locked_straddle(day_options(dt,symbol),symbol,near_exp,step,market_values(dt)[0] if symbol=="NIFTY" else market_values(dt)[1])["straddle"]),
        ]:
            row={"Metric":label}
            for dt in dates_range:
                try: row[dt]=fn(dt)
                except Exception: row[dt]=np.nan
            rows.append(row)
        rows.append({"Metric":"— CE / PE STRIKE PAIRS —",**{dt:np.nan for dt in dates_range}})
        for i,(cs,ps) in enumerate(zip(ce_strikes,pe_strikes),1):
            row={"Metric":f"CE {cs}  |  PE {ps}"}
            for dt in dates_range:
                try:
                    df=day_options(dt,symbol)
                    ce_far=option_close(df,far_exp,cs,"CE"); ce_near=option_close(df,near_exp,cs,"CE")
                    pe_far=option_close(df,far_exp,ps,"PE"); pe_near=option_close(df,near_exp,ps,"PE")
                    ce_sp=spread_value(ce_far,ce_near,ratio,formula)
                    pe_sp=spread_value(pe_far,pe_near,ratio,formula)
                    row[dt]=ce_sp-pe_sp if np.isfinite(ce_sp) and np.isfinite(pe_sp) else np.nan
                except Exception: row[dt]=np.nan
            rows.append(row)
        return pd.DataFrame(rows)

    run_cal=st.button("Calculate Calendar Analysis",type="primary",key="run_calendar_final")
    if run_cal:
        matrix=build_matrix(tuple(selected_cal_dates),instrument,far_exp,near_exp,float(ce_base),float(pe_base),int(total_strikes),float(adjacent_gap),float(ce_pe_gap),float(ratio),formula)
        st.markdown('<div class="section-title">📊 Calendar Result — Dates Horizontal</div>',unsafe_allow_html=True)
        st.caption("દરેક date ઉપર એક જ વાર છે. ઉપર market/future/straddle rows છે અને નીચે CE/PE strike pairs છે. Horizontal scrollથી વધુ dates જોઈ શકો છો.")
        # transpose-like matrix with compact columns
        st.dataframe(matrix,width="stretch",height=620,hide_index=True,column_config={"Metric":st.column_config.TextColumn("Metric",width="large")})

        # Also provide separate CE and PE detail matrices so premiums and spread rates are transparent.
        st.markdown('<div class="section-title">🔎 CE / PE Spread Detail</div>',unsafe_allow_html=True)
        detail_rows=[]
        step=NIFTY_STEP if instrument=="NIFTY" else SENSEX_STEP
        offsets=list(range(-(int(total_strikes)//2),int(total_strikes)//2+1)) if int(total_strikes)%2 else list(range(-(int(total_strikes)//2),int(total_strikes)//2))
        ce_strikes=[int(round(float(ce_base)+o*float(adjacent_gap))) for o in offsets]
        pe_strikes=[int(round(float(pe_base)+o*float(adjacent_gap))) for o in offsets]
        for cs,ps in zip(ce_strikes,pe_strikes):
            for leg,stc,typ in [("CE",cs,"CE"),("PE",ps,"PE")]:
                row={"Leg":leg,"Strike":stc}
                for dt in selected_cal_dates:
                    df=day_options(dt,instrument)
                    f=option_close(df,far_exp,stc,typ); nval=option_close(df,near_exp,stc,typ)
                    row[dt]=spread_value(f,nval,ratio,formula)
                detail_rows.append(row)
        detail=pd.DataFrame(detail_rows)
        st.dataframe(detail,width="stretch",height=520,hide_index=True)
        st.download_button("Download Calendar Matrix CSV",matrix.to_csv(index=False).encode("utf-8"),f"{instrument.lower()}_calendar_matrix.csv","text/csv")
