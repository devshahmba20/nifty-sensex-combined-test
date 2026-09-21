import { useEffect, useMemo, useState } from "react";
import "./App.css";

const AUDIT_CSS = `
.audit-panel { margin-top: 18px; }
.audit-badge {
  font-size: 11px;
  font-weight: 700;
  letter-spacing: .08em;
  padding: 7px 10px;
  border-radius: 999px;
  border: 1px solid #dbe3ef;
  background: #f7f9fc;
}
.audit-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 14px;
  align-items: start;
}
.audit-group {
  border: 1px solid #e3e9f2;
  border-radius: 12px;
  padding: 14px;
  background: rgba(255,255,255,.55);
}
.audit-group-title {
  font-size: 11px;
  font-weight: 800;
  letter-spacing: .09em;
  margin-bottom: 10px;
  opacity: .65;
}
.audit-item {
  display: flex;
  justify-content: space-between;
  gap: 16px;
  padding: 8px 0;
  border-bottom: 1px solid #edf1f6;
}
.audit-item:last-child { border-bottom: 0; }
.audit-item span { opacity: .7; font-size: 12px; }
.audit-item strong { font-size: 13px; }
.audit-equation {
  margin-top: 12px;
  padding: 10px;
  border-radius: 8px;
  background: #f4f6fb;
  font-size: 12px;
  font-weight: 700;
}
.audit-note {
  margin-top: 12px;
  padding: 10px 12px;
  border-radius: 8px;
  background: #f8fafc;
  color: #667085;
  font-size: 11px;
  line-height: 1.5;
}

.table-tools {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.table-tool-label {
  font-size: 11px;
  color: #667085;
  font-weight: 700;
}

.table-tool-select,
.table-tool-button {
  height: 32px;
  border: 1px solid #dbe3ef;
  border-radius: 8px;
  background: #fff;
  color: inherit;
  padding: 0 9px;
  font-size: 11px;
  font-weight: 600;
  outline: none;
}

.table-tool-button {
  cursor: pointer;
}

.table-tool-button.selected {
  border-color: #6366f1;
  background: #f2f2ff;
  color: #4f46e5;
}

.table-panel .backtest-table {
  width: 100%;
  min-width: 0;
  table-layout: fixed;
}

/* OFF = use the full panel width. ON = let the browser size each column
   from its actual content, producing a true content-fit table. */
.table-panel.table-autofit .backtest-table {
  width: max-content;
  min-width: 0;
  table-layout: auto;
}

.table-panel .backtest-table th {
  color: var(--user-table-header-color, #64748b) !important;
  white-space: nowrap;
  width: auto;
  max-width: none;
  font-size: var(--table-header-size, 10px);
  padding: 8px var(--table-cell-padding, 9px);
}

.table-panel .backtest-table td {
  color: var(--user-table-data-color, #334155) !important;
  white-space: nowrap;
  width: auto;
  max-width: none;
  font-size: var(--table-data-size, 10px);
  padding: 8px var(--table-cell-padding, 9px);
}

.table-panel.table-autofit .table-wrapper {
  overflow-x: auto;
}

/* Auto Fit changes column width only. It NEVER changes the user's font size. */
.table-panel.table-autofit .backtest-table th {
  font-size: var(--table-header-size, 10px) !important;
  padding: 8px var(--table-cell-padding, 9px) !important;
}

.table-panel.table-autofit .backtest-table td {
  font-size: var(--table-data-size, 10px) !important;
  padding: 8px var(--table-cell-padding, 9px) !important;
}
}

.table-panel:not(.table-autofit) .backtest-table th {
  font-size: var(--table-header-size, 10px) !important;
}

.table-panel:not(.table-autofit) .backtest-table td {
  font-size: var(--table-data-size, 10px) !important;
}

.table-tools {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.table-tool-label {
  font-size: 11px;
  color: #667085;
  font-weight: 700;
}

.table-tool-select,
.table-tool-button {
  height: 32px;
  border: 1px solid #dbe3ef;
  border-radius: 8px;
  background: #fff;
  color: inherit;
  padding: 0 9px;
  font-size: 11px;
  font-weight: 600;
  outline: none;
}

.table-tool-button {
  cursor: pointer;
}

.table-tool-button.selected {
  border-color: #6366f1;
  background: #f2f2ff;
  color: #4f46e5;
}

.table-size-input {
  width: 48px;
  height: 32px;
  box-sizing: border-box;
  border: 1px solid #dbe3ef;
  border-radius: 8px;
  background: #fff;
  color: inherit;
  padding: 0 7px;
  font-size: 11px;
  font-weight: 600;
  outline: none;
  text-align: center;
}

.table-size-input:focus {
  border-color: #6366f1;
  box-shadow: 0 0 0 2px rgba(99,102,241,.10);
}

.table-fit-input {
  width: 64px;
  height: 32px;
  box-sizing: border-box;
  border: 1px solid #dbe3ef;
  border-radius: 8px;
  background: #fff;
  color: inherit;
  padding: 0 7px;
  font-size: 11px;
  font-weight: 600;
  outline: none;
  text-align: center;
}

.table-color-select {
  height: 32px;
  min-width: 86px;
  border: 1px solid #dbe3ef;
  border-radius: 8px;
  background: #fff;
  color: #334155;
  padding: 0 7px;
  font-size: 11px;
  font-weight: 600;
  outline: none;
}

.table-color-select:focus {
  border-color: #6366f1;
  box-shadow: 0 0 0 2px rgba(99,102,241,.10);
}

/* Theme-aware table controls. Dark themes should never show white-only inputs. */
.app:not(.theme-light) .table-tool-select,
.app:not(.theme-light) .table-tool-button,
.app:not(.theme-light) .table-size-input,
.app:not(.theme-light) .table-fit-input,
.app:not(.theme-light) .table-color-select {
  background: #111827 !important;
  color: #e5e7eb !important;
  border-color: #334155 !important;
}

.app:not(.theme-light) .table-tool-button.selected {
  background: #27235f !important;
  color: #c7d2fe !important;
  border-color: #6366f1 !important;
}

.app:not(.theme-light) .column-picker-menu {
  background: #111827 !important;
  color: #e5e7eb !important;
  border-color: #334155 !important;
  box-shadow: 0 14px 34px rgba(0,0,0,.35);
}

.app:not(.theme-light) .column-picker-actions {
  border-bottom-color: #334155 !important;
}

.app:not(.theme-light) .column-picker-actions button {
  background: #1f2937 !important;
  color: #e5e7eb !important;
  border-color: #475569 !important;
}

.app:not(.theme-light) .column-picker-item:hover {
  background: #1f2937 !important;
}

.app:not(.theme-light) .table-tool-label {
  color: #94a3b8 !important;
}

.app:not(.theme-light) .audit-group {
  background: rgba(15,23,42,.72) !important;
  border-color: #334155 !important;
}

.app:not(.theme-light) .audit-equation {
  background: #172033 !important;
  color: #e5e7eb !important;
}

.app:not(.theme-light) .audit-note {
  background: #111827 !important;
  color: #94a3b8 !important;
}

.app:not(.theme-light) .audit-badge {
  background: #111827 !important;
  border-color: #334155 !important;
  color: #e5e7eb !important;
}

.app:not(.theme-light) .audit-item {
  border-bottom-color: #334155 !important;
}

/* Keep manual font controls independent from Auto Fit. */
.table-panel {
  --table-header-size: var(--user-table-header-size, 10px);
  --table-data-size: var(--user-table-data-size, 10px);
}

.column-picker {
  position: relative;
}

.column-picker-menu {
  position: absolute;
  z-index: 50;
  top: calc(100% + 6px);
  right: 0;
  width: 300px;
  max-height: 520px;
  overflow-y: auto;
  padding: 10px;
  border: 1px solid #dbe3ef;
  border-radius: 10px;
  background: #fff;
  box-shadow: 0 14px 34px rgba(16,24,40,.14);
}

.column-picker-actions {
  display: flex;
  gap: 6px;
  padding-bottom: 8px;
  margin-bottom: 8px;
  border-bottom: 1px solid #edf1f6;
}

.column-picker-actions button {
  border: 1px solid #dbe3ef;
  background: #f8fafc;
  border-radius: 7px;
  padding: 6px 8px;
  font-size: 11px;
  font-weight: 700;
  cursor: pointer;
}

.column-picker-group {
  padding: 5px 0 8px;
}

.column-picker-group-title {
  padding: 5px 7px;
  font-size: 10px;
  font-weight: 800;
  letter-spacing: .08em;
  color: #667085;
  text-transform: uppercase;
}

.column-picker-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 5px 7px;
  border-radius: 6px;
  font-size: 11px;
  cursor: pointer;
}

.column-picker-item:hover {
  background: #f5f7fb;
}

.column-picker-item input {
  margin: 0;
}

@media (max-width: 900px) {
  .table-tools {
    width: 100%;
    justify-content: flex-start;
  }
}

@media (max-width: 900px) {
  .audit-grid { grid-template-columns: 1fr; }
}

.strategy-page { display: grid; gap: 18px; }
.strategy-controls-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(150px, 1fr));
  gap: 14px;
  margin-top: 16px;
}
.strategy-controls-grid label { display: grid; gap: 7px; }
.strategy-controls-grid label > span {
  font-size: 11px; font-weight: 800; letter-spacing: .05em;
  text-transform: uppercase; opacity: .68;
}
.strategy-controls-grid select,
.strategy-controls-grid input {
  width: 100%; min-width: 0; height: 40px; padding: 0 11px;
  border: 1px solid #dbe3ef; border-radius: 9px; background: #fff;
  color: inherit; font: inherit;
}
.strategy-error {
  margin-top: 14px; padding: 10px 12px; border-radius: 8px;
  background: #fff1f2; border: 1px solid #fecdd3; color: #be123c;
  font-size: 12px;
}
.strategy-stat-grid {
  display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 14px;
}
.strategy-stat { padding: 16px 18px; display: grid; gap: 8px; }
.strategy-stat span {
  font-size: 10px; font-weight: 800; letter-spacing: .08em; opacity: .62;
}
.strategy-stat b { font-size: 22px; }
.strategy-summary {
  display: grid; grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 10px; margin-top: 14px;
}
.strategy-summary > div {
  padding: 12px; border: 1px solid #e3e9f2; border-radius: 9px;
  display: grid; gap: 5px;
}
.strategy-summary span { font-size: 11px; opacity: .62; }
.strategy-summary b { font-size: 13px; }
.strategy-results .table-wrapper { overflow-x: auto; margin-top: 14px; }
.strategy-results table { width: max-content; min-width: 100%; border-collapse: collapse; }
.strategy-results th, .strategy-results td {
  padding: 10px 13px; border-bottom: 1px solid #e5eaf1;
  text-align: left; white-space: nowrap; font-size: 12px;
}
.strategy-results th {
  font-size: 10px; text-transform: uppercase; letter-spacing: .04em;
  opacity: .68; background: rgba(148,163,184,.08);
}
@media (max-width: 1000px) {
  .strategy-controls-grid { grid-template-columns: repeat(2, minmax(150px, 1fr)); }
  .strategy-stat-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .strategy-summary { grid-template-columns: repeat(2, minmax(0, 1fr)); }
}
@media (max-width: 600px) {
  .strategy-controls-grid, .strategy-summary, .strategy-stat-grid { grid-template-columns: 1fr; }
}
`;

type Tab =
  | "Dashboard"
  | "Strategy Tester"
  | "Calendar"
  | "Diagonal"
  | "Ratio Spread"
  | "Straddle";

const tabs: Tab[] = [
  "Dashboard",
  "Strategy Tester",
  "Calendar",
  "Diagonal",
  "Ratio Spread",
  "Straddle",
];

type BacktestDisplayColumn =
  | "date"
  | "nifty_dte"
  | "nifty_spot"
  | "nifty_atm"
  | "nifty_atm_ce"
  | "nifty_atm_pe"
  | "nifty_synthetic"
  | "nifty_final_strike"
  | "nifty_final_ce"
  | "nifty_final_pe"
  | "nifty_straddle"
  | "sensex_dte"
  | "sensex_spot"
  | "sensex_atm"
  | "sensex_atm_ce"
  | "sensex_atm_pe"
  | "sensex_synthetic"
  | "sensex_final_strike"
  | "sensex_final_ce"
  | "sensex_final_pe"
  | "sensex_straddle"
  | "adjusted_nifty"
  | "spread"
  | "vix";

const BACKTEST_COLUMNS: {
  key: BacktestDisplayColumn;
  label: string;
  group: "General" | "NIFTY" | "SENSEX" | "Result";
}[] = [
  { key: "date", label: "Date", group: "General" },
  { key: "nifty_dte", label: "NIFTY DTE", group: "NIFTY" },
  { key: "nifty_spot", label: "NIFTY Spot", group: "NIFTY" },
  { key: "nifty_atm", label: "NIFTY ATM", group: "NIFTY" },
  { key: "nifty_atm_ce", label: "NIFTY ATM CE", group: "NIFTY" },
  { key: "nifty_atm_pe", label: "NIFTY ATM PE", group: "NIFTY" },
  { key: "nifty_synthetic", label: "NIFTY Synthetic", group: "NIFTY" },
  { key: "nifty_final_strike", label: "NIFTY Final Strike", group: "NIFTY" },
  { key: "nifty_final_ce", label: "NIFTY Final CE", group: "NIFTY" },
  { key: "nifty_final_pe", label: "NIFTY Final PE", group: "NIFTY" },
  { key: "nifty_straddle", label: "NIFTY Straddle", group: "NIFTY" },
  { key: "sensex_dte", label: "SENSEX DTE", group: "SENSEX" },
  { key: "sensex_spot", label: "SENSEX Spot", group: "SENSEX" },
  { key: "sensex_atm", label: "SENSEX ATM", group: "SENSEX" },
  { key: "sensex_atm_ce", label: "SENSEX ATM CE", group: "SENSEX" },
  { key: "sensex_atm_pe", label: "SENSEX ATM PE", group: "SENSEX" },
  { key: "sensex_synthetic", label: "SENSEX Synthetic", group: "SENSEX" },
  { key: "sensex_final_strike", label: "SENSEX Final Strike", group: "SENSEX" },
  { key: "sensex_final_ce", label: "SENSEX Final CE", group: "SENSEX" },
  { key: "sensex_final_pe", label: "SENSEX Final PE", group: "SENSEX" },
  { key: "sensex_straddle", label: "SENSEX Straddle", group: "SENSEX" },
  { key: "adjusted_nifty", label: "NIFTY × Multiplier", group: "Result" },
  { key: "spread", label: "Spread", group: "Result" },
  { key: "vix", label: "VIX", group: "Result" },
];

const themes = [
  ["midnight", "Midnight"],
  ["graphite", "Graphite"],
  ["ocean", "Ocean Blue"],
  ["emerald", "Emerald"],
  ["light", "Light"],
];

const API = "http://127.0.0.1:8000";

type MarketData = {
  date: string;
  nifty_spot: number | null;
  sensex_spot: number | null;
  india_vix: number | null;
};

type BacktestRow = {
  Date: string;
  "India VIX": number | null;

  "NIFTY Spot": number | null;
  "NIFTY Provisional ATM": number | null;
  "NIFTY ATM Strike Used": number | null;
  "NIFTY ATM CE": number | null;
  "NIFTY ATM PE": number | null;
  "NIFTY Synthetic Future": number | null;
  "NIFTY Final Strike": number | null;
  "NIFTY Final CE": number | null;
  "NIFTY Final PE": number | null;
  "NIFTY Straddle": number | null;

  "SENSEX Spot": number | null;
  "SENSEX Provisional ATM": number | null;
  "SENSEX ATM Strike Used": number | null;
  "SENSEX ATM CE": number | null;
  "SENSEX ATM PE": number | null;
  "SENSEX Synthetic Future": number | null;
  "SENSEX Final Strike": number | null;
  "SENSEX Final CE": number | null;
  "SENSEX Final PE": number | null;
  "SENSEX Straddle": number | null;

  "Adjusted NIFTY": number | null;
  "Final Value": number | null;
  "NIFTY Status": string;
  "SENSEX Status": string;
};

type BacktestResponse = {
  count: number;
  average: number | null;
  maximum: number | null;
  minimum: number | null;
  rows: BacktestRow[];
};

function formatNumber(value: number | null | undefined, decimals = 2) {
  if (value === null || value === undefined || Number.isNaN(Number(value))) {
    return "—";
  }

  return Number(value).toLocaleString("en-IN", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

function formatDateForDisplay(date: string) {
  if (!date) return "—";

  const d = new Date(`${date}T00:00:00`);

  if (Number.isNaN(d.getTime())) return date;

  return d.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function daysBetween(dateA: string, dateB: string) {
  if (!dateA || !dateB) return null;
  const a = new Date(`${dateA}T00:00:00`);
  const b = new Date(`${dateB}T00:00:00`);
  if (Number.isNaN(a.getTime()) || Number.isNaN(b.getTime())) return null;
  return Math.round((b.getTime() - a.getTime()) / 86400000);
}

function App() {
  const [activeTab, setActiveTab] = useState<Tab>("Dashboard");
  const [theme, setTheme] = useState("midnight");
  const [compact, setCompact] = useState(false);
  const [tableHeaderSize, setTableHeaderSize] = useState(10);
  const [tableDataSize, setTableDataSize] = useState(10);
  const [tableHeaderColor, setTableHeaderColor] = useState("#64748b");
  const [tableDataColor, setTableDataColor] = useState("#334155");
  const [tableAutoFit, setTableAutoFit] = useState(true);
  const [tableFitPadding, setTableFitPadding] = useState(9);
  const [visibleBacktestColumns, setVisibleBacktestColumns] =
    useState<BacktestDisplayColumn[]>(
      BACKTEST_COLUMNS.map((column) => column.key)
    );

  return (
    <>
      <style>{AUDIT_CSS}</style>
      <div className={`app theme-${theme} ${compact ? "compact" : ""}`}>
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-logo">NL</div>

          <div className="brand-copy">
            <b>OPTIONS LAB</b>
            <small>NIFTY × SENSEX</small>
          </div>
        </div>

        <div className="menu-label">WORKSPACE</div>

        <nav>
          {tabs.map((tab) => (
            <button
              key={tab}
              className={`nav-item ${
                activeTab === tab ? "active" : ""
              }`}
              onClick={() => setActiveTab(tab)}
            >
              <span className="nav-icon">
                {tab === "Dashboard"
                  ? "⌂"
                  : tab === "Strategy Tester"
                  ? "◈"
                  : tab === "Calendar"
                  ? "▣"
                  : tab === "Diagonal"
                  ? "◇"
                  : tab === "Ratio Spread"
                  ? "⇄"
                  : "◫"}
              </span>

              <span className="nav-text">{tab}</span>
            </button>
          ))}
        </nav>

        <div className="sidebar-bottom">
          <div className="menu-label">SYSTEM</div>

          <button className="nav-item">
            <span className="nav-icon">⚙</span>
            <span className="nav-text">Settings</span>
          </button>

          <div className="system-status">
            <span className="status-dot" />

            <div>
              <b>Local Database</b>
              <small>Connected</small>
            </div>
          </div>
        </div>
      </aside>

      <main className="main">
        <header className="topbar">
          <div>
            <div className="breadcrumb">
              OPTIONS LAB / {activeTab.toUpperCase()}
            </div>

            <h1>{activeTab}</h1>
          </div>

          <div className="header-actions">
            <div className="theme-selector">
              <span>Theme</span>

              <select
                value={theme}
                onChange={(e) => setTheme(e.target.value)}
              >
                {themes.map(([v, l]) => (
                  <option value={v} key={v}>
                    {l}
                  </option>
                ))}
              </select>
            </div>

            <button
              className={`header-button ${
                compact ? "selected" : ""
              }`}
              onClick={() => setCompact(!compact)}
            >
              {compact ? "▣ Normal" : "▤ Compact"}
            </button>

            <div className="market-status">
              <span className="status-dot" />
              Offline Data
            </div>

            <div className="avatar">DS</div>
          </div>
        </header>

        {activeTab === "Dashboard" ? (
          <Dashboard
            tableHeaderSize={tableHeaderSize}
            setTableHeaderSize={setTableHeaderSize}
            tableDataSize={tableDataSize}
            setTableDataSize={setTableDataSize}
            tableHeaderColor={tableHeaderColor}
            setTableHeaderColor={setTableHeaderColor}
            tableDataColor={tableDataColor}
            setTableDataColor={setTableDataColor}
            tableAutoFit={tableAutoFit}
            setTableAutoFit={setTableAutoFit}
            tableFitPadding={tableFitPadding}
            setTableFitPadding={setTableFitPadding}
            visibleBacktestColumns={visibleBacktestColumns}
            setVisibleBacktestColumns={setVisibleBacktestColumns}
          />
        ) : (
          <StrategyPage title={activeTab} />
        )}
      </main>
    </div>
    </>
  );
}


/* ============================================================
   DASHBOARD
   ============================================================ */

function Dashboard({
  tableHeaderSize,
  setTableHeaderSize,
  tableDataSize,
  setTableDataSize,
  tableHeaderColor,
  setTableHeaderColor,
  tableDataColor,
  setTableDataColor,
  tableAutoFit,
  setTableAutoFit,
  tableFitPadding,
  setTableFitPadding,
  visibleBacktestColumns,
  setVisibleBacktestColumns,
}: {
  tableHeaderSize: number;
  setTableHeaderSize: (value: number) => void;
  tableDataSize: number;
  setTableDataSize: (value: number) => void;
  tableHeaderColor: string;
  setTableHeaderColor: (value: string) => void;
  tableDataColor: string;
  setTableDataColor: (value: string) => void;
  tableAutoFit: boolean;
  setTableAutoFit: (value: boolean) => void;
  tableFitPadding: number;
  setTableFitPadding: (value: number) => void;
  visibleBacktestColumns: BacktestDisplayColumn[];
  setVisibleBacktestColumns: (
    value: BacktestDisplayColumn[]
  ) => void;
}) {
  const [dates, setDates] = useState<string[]>([]);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [viewDate, setViewDate] = useState("");

  const [niftyExpiries, setNiftyExpiries] = useState<string[]>([]);
  const [sensexExpiries, setSensexExpiries] = useState<string[]>([]);

  const [niftyExpiry, setNiftyExpiry] = useState("");
  const [sensexExpiry, setSensexExpiry] = useState("");

  const [multiplier, setMultiplier] = useState(3.3);

  const [market, setMarket] = useState<MarketData>({
    date: "",
    nifty_spot: null,
    sensex_spot: null,
    india_vix: null,
  });

  const [backtest, setBacktest] =
    useState<BacktestResponse | null>(null);

  const [loading, setLoading] = useState(false);
  const [apiError, setApiError] = useState("");
  const [columnPickerOpen, setColumnPickerOpen] = useState(false);

  /* ----------------------------------------------------------
     LOAD DATABASE DATES
     ---------------------------------------------------------- */

  useEffect(() => {
    async function loadDates() {
      try {
        setApiError("");

        const response = await fetch(
          `${API}/api/dates`
        );

        if (!response.ok) {
          throw new Error("Unable to load dates");
        }

        const data = await response.json();

        const loadedDates: string[] = data.dates || [];

        setDates(loadedDates);

        if (loadedDates.length > 0) {
          const latest =
            loadedDates[loadedDates.length - 1];

          setStartDate(
            loadedDates.length > 20
  ? loadedDates[loadedDates.length - 20]
  : loadedDates[0]
          );

          setEndDate(latest);
          setViewDate(latest);
        }
      } catch (error) {
        console.error(error);

        setApiError(
          "API connection failed. Make sure api.py is running."
        );
      }
    }

    loadDates();
  }, []);


  /* ----------------------------------------------------------
     LOAD MARKET + EXPIRIES
     ---------------------------------------------------------- */

  useEffect(() => {
    if (!viewDate) return;

    async function loadViewData() {
      try {
        setApiError("");

        const [marketResponse, expiryResponse] =
          await Promise.all([
            fetch(
              `${API}/api/market/${viewDate}`
            ),
            fetch(
              `${API}/api/expiries/${viewDate}`
            ),
          ]);

        if (!marketResponse.ok || !expiryResponse.ok) {
          throw new Error("API request failed");
        }

        const marketData =
          await marketResponse.json();

        const expiryData =
          await expiryResponse.json();

        setMarket(marketData);

        const niftyList =
          expiryData.nifty || [];

        const sensexList =
          expiryData.sensex || [];

        setNiftyExpiries(niftyList);
        setSensexExpiries(sensexList);

        /*
         * Keep the current expiry when available;
         * otherwise select the first available expiry.
         */

        setNiftyExpiry((current) =>
  current && niftyList.includes(current)
    ? current
    : niftyList.length > 0
    ? niftyList[0]
    : ""
);

setSensexExpiry((current) =>
  current && sensexList.includes(current)
    ? current
    : sensexList.length > 0
    ? sensexList[0]
    : ""
);
      } catch (error) {
        console.error(error);

        setApiError(
          "Unable to load market / expiry data."
        );
      }
    }

    loadViewData();
  }, [viewDate]);


  /* ----------------------------------------------------------
     RUN BACKTEST
     ---------------------------------------------------------- */

  async function runBacktest() {
    if (
      !startDate ||
      !endDate ||
      !niftyExpiry ||
      !sensexExpiry
    ) {
      setApiError(
        "Please select Start Date, End Date and both Expiries."
      );

      return;
    }

    try {
      setLoading(true);
      setApiError("");

      const params = new URLSearchParams({
        start_date: startDate,
        end_date: endDate,
        nifty_expiry: niftyExpiry,
        sensex_expiry: sensexExpiry,
        multiplier: String(multiplier),
      });

      const response = await fetch(
        `${API}/api/backtest?${params.toString()}`
      );

      if (!response.ok) {
        const errorText =
          await response.text();

        throw new Error(errorText);
      }

      const data: BacktestResponse =
        await response.json();

      setBacktest(data);
    } catch (error) {
      console.error(error);

      setApiError(
        "Backtest failed. Check the FastAPI terminal for details."
      );
    } finally {
      setLoading(false);
    }
  }


  /* ----------------------------------------------------------
     CURRENT SNAPSHOT
     ---------------------------------------------------------- */

  const latestRow = useMemo(() => {
    if (!backtest?.rows?.length) return null;

    return backtest.rows[
      backtest.rows.length - 1
    ];
  }, [backtest]);


  const currentSpread =
    latestRow?.["Final Value"] ?? null;

  const high =
    backtest?.maximum ?? null;

  const low =
    backtest?.minimum ?? null;

  const average =
    backtest?.average ?? null;


  /* ----------------------------------------------------------
     EXPORT CSV
     ---------------------------------------------------------- */

  function exportCSV() {
    if (!backtest?.rows?.length) {
      setApiError(
        "Run a backtest first before exporting."
      );

      return;
    }

    const headers = Object.keys(
      backtest.rows[0]
    );

    const csvRows = [
      headers.join(","),
      ...backtest.rows.map((row) =>
        headers
          .map((header) => {
            const value =
              row[
                header as keyof BacktestRow
              ];

            return `"${String(
              value ?? ""
            ).replaceAll('"', '""')}"`
          })
          .join(",")
      ),
    ];

    const blob = new Blob(
      [csvRows.join("\n")],
      { type: "text/csv;charset=utf-8;" }
    );

    const url =
      URL.createObjectURL(blob);

    const link =
      document.createElement("a");

    link.href = url;
    link.download =
      "nifty_sensex_backtest.csv";

    link.click();

    URL.revokeObjectURL(url);
  }


  return (
    <>
      {apiError && (
        <div
          style={{
            marginBottom: 18,
            padding: "12px 16px",
            borderRadius: 10,
            background: "#fff1f1",
            border: "1px solid #ffcaca",
            color: "#b42318",
            fontWeight: 600,
          }}
        >
          ⚠ {apiError}
        </div>
      )}

      {/* ======================================================
          MARKET CARDS
         ====================================================== */}

      <section className="market-grid">
        <MarketCard
          title="NIFTY 50"
          value={formatNumber(
            market.nifty_spot
          )}
          change="Database"
          percent={
            market.nifty_spot !== null
              ? "Actual"
              : "—"
          }
          kind="positive"
          footer={
            viewDate
              ? formatDateForDisplay(viewDate)
              : "Spot Index"
          }
        />

        <MarketCard
          title="SENSEX"
          value={formatNumber(
            market.sensex_spot
          )}
          change="Database"
          percent={
            market.sensex_spot !== null
              ? "Actual"
              : "—"
          }
          kind="positive"
          footer={
            viewDate
              ? formatDateForDisplay(viewDate)
              : "Spot Index"
          }
        />

        <MarketCard
          title="INDIA VIX"
          value={formatNumber(
            market.india_vix
          )}
          change="Database"
          percent={
            market.india_vix !== null
              ? "Actual"
              : "—"
          }
          kind="neutral"
          footer="Volatility Index"
        />

        <MarketCard
          title="BACKTEST DAYS"
          value={
            backtest
              ? String(backtest.count)
              : "—"
          }
          change="Rows"
          percent="Processed"
          kind="neutral"
          footer="Selected Range"
        />
      </section>


      {/* ======================================================
          CONTROLS
         ====================================================== */}

      <section className="panel">
        <div className="panel-header">
          <div>
            <div className="panel-kicker">
              BACKTEST CONFIGURATION
            </div>

            <h2>Strategy Controls</h2>
          </div>

          <button
            className="primary-button"
            onClick={runBacktest}
            disabled={loading}
          >
            {loading
              ? "⟳ Running..."
              : "▶ Run Backtest"}
          </button>
        </div>

        <div className="control-grid">

          <DateControl
            label="Start Date"
            value={startDate}
            options={dates}
            onChange={setStartDate}
          />

          <DateControl
            label="End Date"
            value={endDate}
            options={dates}
            onChange={(value) => {
              setEndDate(value);
              setViewDate(value);
            }}
          />

          <DateControl
            label="View Date"
            value={viewDate}
            options={dates}
            onChange={setViewDate}
          />

          <ExpiryControl
            label="NIFTY Expiry"
            value={niftyExpiry}
            options={niftyExpiries}
            onChange={setNiftyExpiry}
          />

          <ExpiryControl
            label="SENSEX Expiry"
            value={sensexExpiry}
            options={sensexExpiries}
            onChange={setSensexExpiry}
          />

          <div className="control">
            <label>NIFTY Multiplier</label>

            <div className="input-box">
              <input
                type="number"
                step="0.01"
                value={multiplier}
                onChange={(e) =>
                  setMultiplier(
                    Number(e.target.value)
                  )
                }
                style={{
                  width: "100%",
                  border: "none",
                  outline: "none",
                  background: "transparent",
                  font: "inherit",
                  color: "inherit",
                }}
              />
            </div>
          </div>
        </div>
      </section>


      {/* ======================================================
          ANALYTICS
         ====================================================== */}

      <section className="analytics-grid">

        <div className="panel chart-panel">
          <div className="panel-header">
            <div>
              <div className="panel-kicker">
                STRADDLE ANALYSIS
              </div>

              <h2>
                NIFTY × {multiplier} vs SENSEX
              </h2>
            </div>

            <div className="legend">
              <span>
                <i className="legend-line line-one" />
                NIFTY × {multiplier}
              </span>

              <span>
                <i className="legend-line line-two" />
                SENSEX
              </span>
            </div>
          </div>

          <RealChart rows={backtest?.rows || []} />
        </div>


        <div className="panel spread-panel">
          <div className="panel-kicker">
            SPREAD
          </div>

          <h2>Current Snapshot</h2>

          <div className="spread-value">
            {currentSpread !== null
              ? `${currentSpread >= 0 ? "+" : ""}${formatNumber(
                  currentSpread
                )}`
              : "—"}
          </div>

          <div className="spread-label">
            SENSEX − NIFTY × {multiplier}
          </div>

          <div className="mini-stats">
            <MiniStat
              label="High"
              value={formatNumber(high)}
            />

            <MiniStat
              label="Low"
              value={formatNumber(low)}
            />

            <MiniStat
              label="Average"
              value={formatNumber(average)}
            />

            <MiniStat
              label="VIX"
              value={formatNumber(
                market.india_vix
              )}
            />
          </div>
        </div>
      </section>


      {/* ======================================================
          RESULTS
         ====================================================== */}

      <section
        className={`panel table-panel ${tableAutoFit ? "table-autofit" : ""}`}
        style={{
          "--table-header-size": `${tableHeaderSize}px`,
          "--table-data-size": `${tableDataSize}px`,
        } as React.CSSProperties}
      >
        <div className="panel-header">
          <div>
            <div className="panel-kicker">
              HISTORICAL RESULTS
            </div>

            <h2>Backtest Data</h2>
          </div>

          <div className="table-tools">
            <div className="column-picker">
              <button
                className="table-tool-button"
                type="button"
                onClick={() => setColumnPickerOpen((open) => !open)}
              >
                Columns ({visibleBacktestColumns.length}/{BACKTEST_COLUMNS.length})
              </button>

              {columnPickerOpen && (
                <div className="column-picker-menu">
                  <div className="column-picker-actions">
                    <button
                      type="button"
                      onClick={() =>
                        setVisibleBacktestColumns(
                          BACKTEST_COLUMNS.map((column) => column.key)
                        )
                      }
                    >
                      Select All
                    </button>
                    <button
                      type="button"
                      onClick={() => setVisibleBacktestColumns([])}
                    >
                      Hide All
                    </button>
                  </div>

                  {(["General", "NIFTY", "SENSEX", "Result"] as const).map(
                    (group) => (
                      <div className="column-picker-group" key={group}>
                        <div className="column-picker-group-title">{group}</div>
                        {BACKTEST_COLUMNS.filter(
                          (column) => column.group === group
                        ).map((column) => {
                          const checked = visibleBacktestColumns.includes(
                            column.key
                          );

                          return (
                            <label
                              className="column-picker-item"
                              key={column.key}
                            >
                              <input
                                type="checkbox"
                                checked={checked}
                                onChange={() => {
                                  setVisibleBacktestColumns((current) =>
                                    checked
                                      ? current.filter(
                                          (key) => key !== column.key
                                        )
                                      : [
                                          ...current,
                                          column.key,
                                        ]
                                  );
                                }}
                              />
                              <span>
                                {column.key === "adjusted_nifty"
                                  ? `NIFTY × ${multiplier}`
                                  : column.label}
                              </span>
                            </label>
                          );
                        })}
                      </div>
                    )
                  )}
                </div>
              )}
            </div>

            <span className="table-tool-label">Header</span>
            <input
              className="table-size-input"
              type="number"
              min="8"
              max="24"
              step="1"
              value={tableHeaderSize}
              onChange={(e) =>
                setTableHeaderSize(
                  Math.min(30, Math.max(8, Number(e.target.value) || 8))
                )
              }
              aria-label="Table header font size"
              title="Header font size (8–30px)"
            />
            <span className="table-tool-label">Data</span>
            <input
              className="table-size-input"
              type="number"
              min="8"
              max="24"
              step="1"
              value={tableDataSize}
              onChange={(e) =>
                setTableDataSize(
                  Math.min(30, Math.max(8, Number(e.target.value) || 8))
                )
              }
              aria-label="Table data font size"
              title="Data font size (8–30px)"
            />
            <span className="table-tool-label">H Color</span>
            <select className="table-color-select" value={tableHeaderColor} onChange={(e) => setTableHeaderColor(e.target.value)} title="Header font color">
              <option value="#334155">Slate</option><option value="#111827">Black</option><option value="#475569">Dark Gray</option><option value="#2563eb">Blue</option><option value="#4f46e5">Indigo</option><option value="#7c3aed">Purple</option><option value="#0f766e">Teal</option><option value="#15803d">Green</option><option value="#b45309">Amber</option><option value="#dc2626">Red</option><option value="#ffffff">White</option>
            </select>
            <span className="table-tool-label">D Color</span>
            <select className="table-color-select" value={tableDataColor} onChange={(e) => setTableDataColor(e.target.value)} title="Data font color">
              <option value="#334155">Slate</option><option value="#111827">Black</option><option value="#475569">Dark Gray</option><option value="#2563eb">Blue</option><option value="#4f46e5">Indigo</option><option value="#7c3aed">Purple</option><option value="#0f766e">Teal</option><option value="#15803d">Green</option><option value="#b45309">Amber</option><option value="#dc2626">Red</option><option value="#ffffff">White</option>
            </select>
            <span className="table-tool-label">Gap</span>
            <input
              className="table-fit-input"
              type="number"
              min="0"
              max="24"
              step="1"
              value={tableFitPadding}
              onChange={(e) =>
                setTableFitPadding(
                  Math.min(24, Math.max(0, Number(e.target.value) || 0))
                )
              }
              aria-label="Table cell padding"
              title="Space inside each table cell (0–24px)"
            />
            <button
              className={`table-tool-button ${tableAutoFit ? "selected" : ""}`}
              onClick={() => setTableAutoFit(!tableAutoFit)}
              type="button"
              title="Auto Fit column widths only; your Header/Data font sizes stay unchanged"
            >
              {tableAutoFit ? "✓ Auto Fit" : "Auto Fit"}
            </button>
            <button
              className="secondary-button"
              onClick={exportCSV}
              type="button"
            >
              Export CSV
            </button>
          </div>
        </div>

        <div className="table-wrapper">
          <table
            className="backtest-table"
            style={{
              ["--table-cell-padding" as string]: `${tableFitPadding}px`,
              ["--user-table-header-size" as string]: `${tableHeaderSize}px`,
              ["--user-table-data-size" as string]: `${tableDataSize}px`,
              ["--user-table-header-color" as string]: tableHeaderColor,
              ["--user-table-data-color" as string]: tableDataColor,
            } as React.CSSProperties}
          >
            <thead>
              <tr>
                {BACKTEST_COLUMNS.filter((column) =>
                  visibleBacktestColumns.includes(column.key)
                ).map((column) => (
                  <th key={column.key}>
                    {column.key === "adjusted_nifty"
                      ? `NIFTY × ${multiplier}`
                      : column.label}
                  </th>
                ))}
              </tr>
            </thead>

            <tbody>
              {!backtest?.rows?.length ? (
                <tr>
                  <td
                    colSpan={Math.max(1, visibleBacktestColumns.length)}
                    style={{
                      textAlign: "center",
                      padding: 30,
                    }}
                  >
                    Select dates & expiries and
                    click <b>Run Backtest</b>
                  </td>
                </tr>
              ) : (
                backtest.rows
                  .slice()
                  .reverse()
                  .map((row, index) => (
                    <Row
                      key={`${row.Date}-${index}`}
                      visibleColumns={visibleBacktestColumns}
                      d={formatDateForDisplay(row.Date)}
                      ndte={
                        daysBetween(row.Date, niftyExpiry) !== null
                          ? String(daysBetween(row.Date, niftyExpiry))
                          : "—"
                      }
                      n={formatNumber(row["NIFTY Spot"])}
                      natm={formatNumber(row["NIFTY ATM Strike Used"], 0)}
                      nace={formatNumber(row["NIFTY ATM CE"])}
                      nape={formatNumber(row["NIFTY ATM PE"])}
                      nsyn={formatNumber(row["NIFTY Synthetic Future"])}
                      nfs={formatNumber(row["NIFTY Final Strike"], 0)}
                      nfce={formatNumber(row["NIFTY Final CE"])}
                      nfpe={formatNumber(row["NIFTY Final PE"])}
                      ns={formatNumber(row["NIFTY Straddle"])}
                      sdte={
                        daysBetween(row.Date, sensexExpiry) !== null
                          ? String(daysBetween(row.Date, sensexExpiry))
                          : "—"
                      }
                      s={formatNumber(row["SENSEX Spot"])}
                      satm={formatNumber(row["SENSEX ATM Strike Used"], 0)}
                      sace={formatNumber(row["SENSEX ATM CE"])}
                      sape={formatNumber(row["SENSEX ATM PE"])}
                      ssyn={formatNumber(row["SENSEX Synthetic Future"])}
                      sfs={formatNumber(row["SENSEX Final Strike"], 0)}
                      sfce={formatNumber(row["SENSEX Final CE"])}
                      sfpe={formatNumber(row["SENSEX Final PE"])}
                      ss={formatNumber(row["SENSEX Straddle"])}
                      a={formatNumber(row["Adjusted NIFTY"])}
                      sp={
                        row["Final Value"] !== null
                          ? `${row["Final Value"] >= 0 ? "+" : ""}${formatNumber(row["Final Value"])}`
                          : "—"
                      }
                      v={formatNumber(row["India VIX"])}
                    />
                  ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* ======================================================
          CALCULATION AUDIT
         ====================================================== */}
      {latestRow && (
        <section className="panel audit-panel">
          <div className="panel-header">
            <div>
              <div className="panel-kicker">
                CALCULATION AUDIT
              </div>
              <h2>
                {formatDateForDisplay(latestRow.Date)} — Locked Result
              </h2>
            </div>
            <div className="audit-badge">DATABASE VALUES</div>
          </div>

          <div className="audit-grid">
            <div className="audit-group">
              <div className="audit-group-title">NIFTY — LOCKED CALCULATION</div>
              <AuditItem label="Expiry" value={formatDateForDisplay(niftyExpiry)} />
              <AuditItem label="DTE" value={
                daysBetween(latestRow.Date, niftyExpiry) !== null
                  ? String(daysBetween(latestRow.Date, niftyExpiry))
                  : "—"
              } />
              <AuditItem label="Spot" value={formatNumber(latestRow["NIFTY Spot"])} />
              <AuditItem label="Provisional ATM" value={formatNumber(latestRow["NIFTY Provisional ATM"], 0)} />
              <AuditItem label="ATM Strike Used" value={formatNumber(latestRow["NIFTY ATM Strike Used"], 0)} />
              <AuditItem label="ATM CE" value={formatNumber(latestRow["NIFTY ATM CE"])} />
              <AuditItem label="ATM PE" value={formatNumber(latestRow["NIFTY ATM PE"])} />
              <AuditItem label="Synthetic Future" value={formatNumber(latestRow["NIFTY Synthetic Future"])} />
              <AuditItem label="Final Strike" value={formatNumber(latestRow["NIFTY Final Strike"], 0)} />
              <AuditItem label="Final CE" value={formatNumber(latestRow["NIFTY Final CE"])} />
              <AuditItem label="Final PE" value={formatNumber(latestRow["NIFTY Final PE"])} />
              <AuditItem label="Straddle" value={formatNumber(latestRow["NIFTY Straddle"])} />
            </div>

            <div className="audit-group">
              <div className="audit-group-title">SENSEX — LOCKED CALCULATION</div>
              <AuditItem label="Expiry" value={formatDateForDisplay(sensexExpiry)} />
              <AuditItem label="DTE" value={
                daysBetween(latestRow.Date, sensexExpiry) !== null
                  ? String(daysBetween(latestRow.Date, sensexExpiry))
                  : "—"
              } />
              <AuditItem label="Spot" value={formatNumber(latestRow["SENSEX Spot"])} />
              <AuditItem label="Provisional ATM" value={formatNumber(latestRow["SENSEX Provisional ATM"], 0)} />
              <AuditItem label="ATM Strike Used" value={formatNumber(latestRow["SENSEX ATM Strike Used"], 0)} />
              <AuditItem label="ATM CE" value={formatNumber(latestRow["SENSEX ATM CE"])} />
              <AuditItem label="ATM PE" value={formatNumber(latestRow["SENSEX ATM PE"])} />
              <AuditItem label="Synthetic Future" value={formatNumber(latestRow["SENSEX Synthetic Future"])} />
              <AuditItem label="Final Strike" value={formatNumber(latestRow["SENSEX Final Strike"], 0)} />
              <AuditItem label="Final CE" value={formatNumber(latestRow["SENSEX Final CE"])} />
              <AuditItem label="Final PE" value={formatNumber(latestRow["SENSEX Final PE"])} />
              <AuditItem label="Straddle" value={formatNumber(latestRow["SENSEX Straddle"])} />
            </div>

            <div className="audit-group audit-formula">
              <div className="audit-group-title">SPREAD / VALIDATION</div>
              <AuditItem label="NIFTY Straddle" value={formatNumber(latestRow["NIFTY Straddle"])} />
              <AuditItem label={`NIFTY × ${multiplier}`} value={formatNumber(latestRow["Adjusted NIFTY"])} />
              <AuditItem label="SENSEX Straddle" value={formatNumber(latestRow["SENSEX Straddle"])} />
              <AuditItem label="Final Spread" value={
                latestRow["Final Value"] !== null
                  ? `${latestRow["Final Value"] >= 0 ? "+" : ""}${formatNumber(latestRow["Final Value"])}`
                  : "—"
              } />
              <AuditItem label="India VIX" value={formatNumber(latestRow["India VIX"])} />
              <div className="audit-equation">
                Synthetic = ATM Strike Used + ATM CE − ATM PE
              </div>
              <div className="audit-equation">
                Straddle = Final CE + Final PE
              </div>
              <div className="audit-equation">
                Spread = SENSEX Straddle − (NIFTY Straddle × {multiplier})
              </div>
            </div>
          </div>

          <div className="audit-note">
            These intermediate values come directly from the FastAPI calculation
            using the existing SQLite option data and the locked calculation sequence.
            The database file and original app.py are not modified.
          </div>
        </section>
      )}
    </>
  );
}


/* ============================================================
   MARKET CARD
   ============================================================ */

function MarketCard({
  title,
  value,
  change,
  percent,
  kind,
  footer,
}: {
  title: string;
  value: string;
  change: string;
  percent: string;
  kind: string;
  footer: string;
}) {
  return (
    <div className="market-card">
      <div className="card-top">
        <span>{title}</span>
        <span>•••</span>
      </div>

      <div className="market-value">
        {value}
      </div>

      <div
        className={`market-change ${kind}`}
      >
        {kind === "positive"
          ? "● "
          : kind === "negative"
          ? "● "
          : ""}

        {change}

        <span>{percent}</span>
      </div>

      <div className="card-footer">
        {footer}
      </div>
    </div>
  );
}


/* ============================================================
   DATE CONTROL
   ============================================================ */

function DateControl({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: string[];
  onChange: (value: string) => void;
}) {
  return (
    <div className="control">
      <label>{label}</label>

      <div className="input-box">
        <select
          value={value}
          onChange={(e) =>
            onChange(e.target.value)
          }
          style={{
            width: "100%",
            border: "none",
            outline: "none",
            background: "transparent",
            font: "inherit",
            color: "inherit",
          }}
        >
          {options.length === 0 && (
            <option value="">
              Loading...
            </option>
          )}

          {options.map((date) => (
            <option
              key={date}
              value={date}
            >
              {formatDateForDisplay(date)}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}


/* ============================================================
   EXPIRY CONTROL
   ============================================================ */

function ExpiryControl({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: string[];
  onChange: (value: string) => void;
}) {
  return (
    <div className="control">
      <label>{label}</label>

      <div className="input-box">
        <select
          value={value}
          onChange={(e) =>
            onChange(e.target.value)
          }
          style={{
            width: "100%",
            border: "none",
            outline: "none",
            background: "transparent",
            font: "inherit",
            color: "inherit",
          }}
        >
          {options.length === 0 && (
            <option value="">
              Loading...
            </option>
          )}

          {options.map((expiry) => (
            <option
              key={expiry}
              value={expiry}
            >
              {formatDateForDisplay(expiry)}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}


/* ============================================================
   AUDIT ITEM
   ============================================================ */

function AuditItem({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="audit-item">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}


/* ============================================================
   MINI STAT
   ============================================================ */

function MiniStat({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="mini-stat">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}


/* ============================================================
   TABLE ROW
   ============================================================ */

function Row({
  visibleColumns,
  d,
  ndte,
  n,
  natm,
  nace,
  nape,
  nsyn,
  nfs,
  nfce,
  nfpe,
  ns,
  sdte,
  s,
  satm,
  sace,
  sape,
  ssyn,
  sfs,
  sfce,
  sfpe,
  ss,
  a,
  sp,
  v,
}: {
  visibleColumns: BacktestDisplayColumn[];
  d: string;
  ndte: string;
  n: string;
  natm: string;
  nace: string;
  nape: string;
  nsyn: string;
  nfs: string;
  nfce: string;
  nfpe: string;
  ns: string;
  sdte: string;
  s: string;
  satm: string;
  sace: string;
  sape: string;
  ssyn: string;
  sfs: string;
  sfce: string;
  sfpe: string;
  ss: string;
  a: string;
  sp: string;
  v: string;
}) {
  const cells: Record<BacktestDisplayColumn, React.ReactNode> = {
    date: d,
    nifty_dte: ndte,
    nifty_spot: n,
    nifty_atm: natm,
    nifty_atm_ce: nace,
    nifty_atm_pe: nape,
    nifty_synthetic: nsyn,
    nifty_final_strike: nfs,
    nifty_final_ce: nfce,
    nifty_final_pe: nfpe,
    nifty_straddle: ns,
    sensex_dte: sdte,
    sensex_spot: s,
    sensex_atm: satm,
    sensex_atm_ce: sace,
    sensex_atm_pe: sape,
    sensex_synthetic: ssyn,
    sensex_final_strike: sfs,
    sensex_final_ce: sfce,
    sensex_final_pe: sfpe,
    sensex_straddle: ss,
    adjusted_nifty: a,
    spread: <span className="spread-cell">{sp}</span>,
    vix: v,
  };

  return (
    <tr>
      {visibleColumns.map((column) => (
        <td key={column}>{cells[column]}</td>
      ))}
    </tr>
  );
}


/* ============================================================
   REAL CHART
   ============================================================ */

function RealChart({
  rows,
}: {
  rows: BacktestRow[];
}) {
  if (!rows.length) {
    return (
      <div
        className="chart"
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          minHeight: 300,
        }}
      >
        Run a backtest to display the
        actual straddle chart.
      </div>
    );
  }

  const niftyValues = rows.map(
    (row) =>
      row["Adjusted NIFTY"] ?? 0
  );

  const sensexValues = rows.map(
    (row) =>
      row["SENSEX Straddle"] ?? 0
  );

  const allValues = [
    ...niftyValues,
    ...sensexValues,
  ];

  const maxValue =
    Math.max(...allValues, 1);

  const minValue =
    Math.min(...allValues, 0);

  const range =
    maxValue - minValue || 1;

  const makePoints = (
    values: number[]
  ) =>
    values
      .map((value, index) => {
        const x =
          values.length === 1
            ? 400
            : (index /
                (values.length - 1)) *
              800;

        const y =
          285 -
          ((value - minValue) /
            range) *
            260;

        return `${x},${Math.max(
          10,
          Math.min(285, y)
        )}`;
      })
      .join(" ");

  return (
    <div className="chart">
      <div className="chart-y">
        <span>
          {formatNumber(maxValue, 0)}
        </span>

        <span>
          {formatNumber(
            maxValue * 0.75,
            0
          )}
        </span>

        <span>
          {formatNumber(
            maxValue * 0.5,
            0
          )}
        </span>

        <span>
          {formatNumber(
            maxValue * 0.25,
            0
          )}
        </span>

        <span>0</span>
      </div>

      <div className="chart-area">
        {[0, 25, 50, 75, 100].map(
          (x) => (
            <div
              key={x}
              className="grid-line"
              style={{
                top: `${x}%`,
              }}
            />
          )
        )}

        <svg
          className="chart-svg"
          viewBox="0 0 800 300"
          preserveAspectRatio="none"
        >
          <polyline
            points={makePoints(
              niftyValues
            )}
            fill="none"
            stroke="currentColor"
            strokeWidth="3"
          />

          <polyline
            points={makePoints(
              sensexValues
            )}
            fill="none"
            stroke="currentColor"
            strokeWidth="3"
            className="chart-second"
          />
        </svg>

        <div className="chart-dates">
          <span>
            {formatDateForDisplay(
              rows[0].Date
            )}
          </span>

          <span>
            {formatDateForDisplay(
              rows[
                Math.floor(
                  rows.length / 2
                )
              ].Date
            )}
          </span>

          <span>
            {formatDateForDisplay(
              rows[rows.length - 1].Date
            )}
          </span>
        </div>
      </div>
    </div>
  );
}


/* ============================================================
   PLACEHOLDER STRATEGY PAGES
   ============================================================ */

function StrategyPage({
  title,
}: {
  title: Tab;
}) {
  if (title === "Strategy Tester") {
    return <StrategyTesterModule />;
  }

  return (
    <section className="panel strategy-placeholder">
      <div className="panel-kicker">STRATEGY MODULE</div>
      <h2>{title}</h2>
      <p>
        Configure your {title.toLowerCase()} strategy here. This module will
        be connected to the existing strategy engine without changing the
        working Dashboard calculation.
      </p>
      <div className="coming-soon">
        <span>◈</span>
        <div>
          <b>Module Ready</b>
          <small>Build this strategy in the next phase</small>
        </div>
      </div>
    </section>
  );
}

function StrategyTesterModule() {
  const [dates, setDates] = useState<string[]>([]);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [niftyExpiries, setNiftyExpiries] = useState<string[]>([]);
  const [sensexExpiries, setSensexExpiries] = useState<string[]>([]);
  const [niftyExpiry, setNiftyExpiry] = useState("");
  const [sensexExpiry, setSensexExpiry] = useState("");
  const [multiplier, setMultiplier] = useState(3.3);
  const [minDte, setMinDte] = useState("");
  const [maxDte, setMaxDte] = useState("");
  const [backtest, setBacktest] = useState<BacktestResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadDates() {
      try {
        const response = await fetch(`${API}/api/dates`);
        if (!response.ok) throw new Error("dates");
        const data = await response.json();
        const loaded = data.dates || [];
        setDates(loaded);
        if (loaded.length) {
          setStartDate(loaded[Math.max(0, loaded.length - 20)]);
          setEndDate(loaded[loaded.length - 1]);
        }
      } catch {
        setError("Unable to load dates from the local database.");
      }
    }
    loadDates();
  }, []);

  useEffect(() => {
    if (!endDate) return;

    async function loadExpiries() {
      try {
        // Expiry choices must follow the selected TEST END DATE,
        // not the Start Date. This prevents an old July expiry from
        // being auto-selected when the test ends in August.
        const response = await fetch(`${API}/api/expiries/${endDate}`);
        if (!response.ok) throw new Error("expiries");

        const data = await response.json();
        const n: string[] = data.nifty || [];
        const s: string[] = data.sensex || [];

        setNiftyExpiries(n);
        setSensexExpiries(s);

        const firstOnOrAfter = (list: string[]) =>
          list.find((expiry) => expiry >= endDate) || list[list.length - 1] || "";

        setNiftyExpiry((current) =>
          current && n.includes(current) ? current : firstOnOrAfter(n)
        );
        setSensexExpiry((current) =>
          current && s.includes(current) ? current : firstOnOrAfter(s)
        );
      } catch {
        setError("Unable to load expiry data.");
      }
    }

    loadExpiries();
  }, [endDate]);

  async function runTest() {
    if (!startDate || !endDate || !niftyExpiry || !sensexExpiry) {
      setError("Select Start Date, End Date, NIFTY Expiry and SENSEX Expiry.");
      return;
    }

    try {
      setLoading(true);
      setError("");

      const params = new URLSearchParams({
        start_date: startDate,
        end_date: endDate,
        nifty_expiry: niftyExpiry,
        sensex_expiry: sensexExpiry,
        multiplier: String(multiplier),
      });

      const response = await fetch(`${API}/api/backtest?${params.toString()}`);
      if (!response.ok) throw new Error(await response.text());

      const data: BacktestResponse = await response.json();

      const min = minDte === "" ? null : Number(minDte);
      const max = maxDte === "" ? null : Number(maxDte);

      const rows = data.rows.filter((row) => {
        const nDte = Number((row as any)["NIFTY DTE"]);
        const sDte = Number((row as any)["SENSEX DTE"]);
        const dtes = [nDte, sDte].filter(Number.isFinite);
        if (!dtes.length) return true;
        if (min !== null && dtes.some((d) => d < min)) return false;
        if (max !== null && dtes.some((d) => d > max)) return false;
        return true;
      });

      const values = rows
        .map((r) => Number(r["Final Value"]))
        .filter(Number.isFinite);

      setBacktest({
        count: rows.length,
        average: values.length ? values.reduce((a, b) => a + b, 0) / values.length : null,
        maximum: values.length ? Math.max(...values) : null,
        minimum: values.length ? Math.min(...values) : null,
        rows,
      });
    } catch (e) {
      console.error(e);
      setError("Backtest failed. Check that FastAPI is running on port 8000.");
    } finally {
      setLoading(false);
    }
  }

  const firstRow = backtest?.rows?.[0];
  const lastRow = backtest?.rows?.[backtest.rows.length - 1];

  return (
    <div className="strategy-page">
      <section className="panel">
        <div className="panel-header">
          <div>
            <div className="panel-kicker">BACKTEST ENGINE</div>
            <h2>Strategy Tester</h2>
            <p style={{ marginTop: 6, opacity: 0.68 }}>
              Test the existing NIFTY × 3.3 vs SENSEX locked calculation over any
              selected date range.
            </p>
          </div>
          <button className="primary-button" onClick={runTest} disabled={loading}>
            {loading ? "Running..." : "▶ Run Test"}
          </button>
        </div>

        <div className="strategy-controls-grid">
          <label>
            <span>Start Date</span>
            <select value={startDate} onChange={(e) => setStartDate(e.target.value)}>
              {dates.map((d) => <option key={d} value={d}>{formatDateForDisplay(d)}</option>)}
            </select>
          </label>

          <label>
            <span>End Date</span>
            <select value={endDate} onChange={(e) => setEndDate(e.target.value)}>
              {dates.map((d) => <option key={d} value={d}>{formatDateForDisplay(d)}</option>)}
            </select>
          </label>

          <label>
            <span>NIFTY Expiry</span>
            <select value={niftyExpiry} onChange={(e) => setNiftyExpiry(e.target.value)}>
              {niftyExpiries.map((d) => <option key={d} value={d}>{formatDateForDisplay(d)}</option>)}
            </select>
          </label>

          <label>
            <span>SENSEX Expiry</span>
            <select value={sensexExpiry} onChange={(e) => setSensexExpiry(e.target.value)}>
              {sensexExpiries.map((d) => <option key={d} value={d}>{formatDateForDisplay(d)}</option>)}
            </select>
          </label>

          <label>
            <span>NIFTY Multiplier</span>
            <input
              type="number"
              step="0.01"
              value={multiplier}
              onChange={(e) => setMultiplier(Number(e.target.value))}
            />
          </label>

          <label>
            <span>Minimum DTE</span>
            <input
              type="number"
              min="0"
              placeholder="Any"
              value={minDte}
              onChange={(e) => setMinDte(e.target.value)}
            />
          </label>

          <label>
            <span>Maximum DTE</span>
            <input
              type="number"
              min="0"
              placeholder="Any"
              value={maxDte}
              onChange={(e) => setMaxDte(e.target.value)}
            />
          </label>
        </div>

        {error && <div className="strategy-error">{error}</div>}
      </section>

      <section className="strategy-stat-grid">
        <div className="panel strategy-stat"><span>ROWS</span><b>{backtest?.count ?? "—"}</b></div>
        <div className="panel strategy-stat"><span>AVERAGE SPREAD</span><b>{formatNumber(backtest?.average)}</b></div>
        <div className="panel strategy-stat"><span>HIGH</span><b>{formatNumber(backtest?.maximum)}</b></div>
        <div className="panel strategy-stat"><span>LOW</span><b>{formatNumber(backtest?.minimum)}</b></div>
      </section>

      <section className="panel">
        <div className="panel-kicker">TEST SUMMARY</div>
        <h2>Selected Configuration</h2>
        <div className="strategy-summary">
          <div><span>Date Range</span><b>{formatDateForDisplay(startDate)} → {formatDateForDisplay(endDate)}</b></div>
          <div><span>NIFTY Expiry</span><b>{formatDateForDisplay(niftyExpiry)}</b></div>
          <div><span>SENSEX Expiry</span><b>{formatDateForDisplay(sensexExpiry)}</b></div>
          <div><span>Multiplier</span><b>{multiplier.toFixed(2)}</b></div>
          <div><span>DTE Filter</span><b>{minDte || "Any"} → {maxDte || "Any"}</b></div>
          <div><span>Status</span><b>{backtest ? "Test Complete" : "Ready"}</b></div>
        </div>
      </section>

      {backtest && (
        <section className="panel strategy-results">
          <div className="panel-header">
            <div>
              <div className="panel-kicker">RESULTS</div>
              <h2>Strategy Tester Results</h2>
            </div>
            <span className="audit-badge">{backtest.count} rows</span>
          </div>

          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>Date</th>
                  <th>NIFTY DTE</th>
                  <th>NIFTY Straddle</th>
                  <th>SENSEX DTE</th>
                  <th>SENSEX Straddle</th>
                  <th>NIFTY × Multiplier</th>
                  <th>Spread</th>
                  <th>VIX</th>
                </tr>
              </thead>
              <tbody>
                {backtest.rows.map((row) => (
                  <tr key={row.Date}>
                    <td>{formatDateForDisplay(row.Date)}</td>
                    <td>{(row as any)["NIFTY DTE"] ?? "—"}</td>
                    <td>{formatNumber(row["NIFTY Straddle"])}</td>
                    <td>{(row as any)["SENSEX DTE"] ?? "—"}</td>
                    <td>{formatNumber(row["SENSEX Straddle"])}</td>
                    <td>{formatNumber(row["Adjusted NIFTY"])}</td>
                    <td><b>{formatNumber(row["Final Value"])}</b></td>
                    <td>{formatNumber(row["India VIX"])}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  );
}


export default App;