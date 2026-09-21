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
  grid-template-columns: repeat(4, minmax(180px, 1fr));
  gap: 14px;
  margin-top: 16px;
}
.strategy-controls-grid label { display: grid; gap: 7px; }
.strategy-controls-grid label > span {
  font-size: 11px; font-weight: 800; letter-spacing: .05em;
  text-transform: uppercase; opacity: .68;
}
.weekly-controls {
  grid-template-columns: repeat(4, minmax(0, 1fr));
  align-items: start;
}
.weekly-controls label { min-width: 0; }
@media (max-width: 1000px) {
  .weekly-controls { grid-template-columns: repeat(2, minmax(0, 1fr)); }
}
@media (max-width: 600px) {
  .weekly-controls { grid-template-columns: 1fr; }
}
.strategy-controls-grid select,
.strategy-controls-grid input {
  width: 100%; min-width: 0; height: 40px; padding: 0 11px;
  border: 1px solid #dbe3ef; border-radius: 9px; background: #fff;
  color: inherit; font: inherit;
}

/* Strategy Tester controls follow the active app theme */
.app:not(.theme-light) .strategy-controls-grid select,
.app:not(.theme-light) .strategy-controls-grid input {
  background: #111827 !important;
  color: #e5e7eb !important;
  border-color: #334155 !important;
  color-scheme: dark;
}
.app:not(.theme-light) .strategy-controls-grid select option {
  background: #111827;
  color: #e5e7eb;
}
.app.theme-light .strategy-controls-grid select,
.app.theme-light .strategy-controls-grid input {
  background: #ffffff;
  color: #334155;
  border-color: #dbe3ef;
  color-scheme: light;
}
.strategy-controls-grid select:focus,
.strategy-controls-grid input:focus {
  outline: none;
  border-color: #6366f1;
  box-shadow: 0 0 0 2px rgba(99,102,241,.14);
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
.mode-switch { display:flex; gap:8px; margin-top:16px; flex-wrap:wrap; }
.mode-switch button {
  height:38px; padding:0 14px; border:1px solid #dbe3ef; border-radius:9px;
  background:#fff; color:inherit; font-size:12px; font-weight:800; cursor:pointer;
}
.mode-switch button.selected { border-color:#6366f1; background:#f2f2ff; color:#4f46e5; }
.weekly-note { margin-top:14px; padding:11px 13px; border:1px solid #e3e9f2; border-radius:9px; font-size:11px; line-height:1.55; opacity:.82; }
.combination-grid { display:grid; grid-template-columns:repeat(4,minmax(0,1fr)); gap:10px; margin-top:14px; }
.combination-card { text-align:left; display:grid; gap:5px; padding:12px; border:1px solid #dbe3ef; border-radius:10px; background:transparent; color:inherit; cursor:pointer; }
.combination-card:hover, .combination-card.selected { border-color:#6366f1; background:rgba(99,102,241,.08); }
.combination-card span { font-size:10px; font-weight:900; letter-spacing:.08em; opacity:.62; }
.combination-card b { font-size:12px; }
.combination-card small { font-size:10px; opacity:.62; }
.app:not(.theme-light) .mode-switch button { background:#111827 !important; color:#e5e7eb !important; border-color:#334155 !important; }
.app:not(.theme-light) .mode-switch button.selected { background:#27235f !important; color:#c7d2fe !important; border-color:#6366f1 !important; }
.app:not(.theme-light) .weekly-note, .app:not(.theme-light) .combination-card { border-color:#334155 !important; }
@media (max-width:1000px){ .combination-grid{grid-template-columns:repeat(2,minmax(0,1fr));} }
@media (max-width:600px){ .combination-grid{grid-template-columns:1fr;} }



/* Strategy Tester result-table controls */
.strategy-results-header { align-items:flex-start; gap:12px; }
.strategy-results-tools { display:flex; align-items:center; justify-content:flex-end; gap:7px; flex-wrap:wrap; }
.strategy-table-size-input,.strategy-table-gap-input { width:48px; height:30px; border:1px solid #dbe3ef; border-radius:7px; padding:0 6px; font-size:11px; background:#fff; color:#334155; }
.strategy-table-color-select { height:30px; border:1px solid #dbe3ef; border-radius:7px; padding:0 6px; font-size:11px; background:#fff; color:#334155; }
.strategy-results .table-wrapper { overflow-x:auto; }
.strategy-results table { width:100%; min-width:1200px; border-collapse:collapse; table-layout:fixed; }
.strategy-results.strategy-table-autofit table { width:max-content; min-width:100%; table-layout:auto; }
.strategy-results th { font-size:var(--strategy-header-size,10px); color:var(--strategy-header-color,inherit); white-space:nowrap; padding:8px var(--strategy-table-gap,9px); }
.strategy-results td { font-size:var(--strategy-data-size,10px); color:var(--strategy-data-color,inherit); white-space:nowrap; padding:8px var(--strategy-table-gap,9px); }
.strategy-results.strategy-table-compact th,.strategy-results.strategy-table-compact td { padding-top:4px; padding-bottom:4px; }
.strategy-results tr.strategy-combination-start td { border-top:2px solid #94a3b8 !important; }
.app:not(.theme-light) .strategy-table-size-input,.app:not(.theme-light) .strategy-table-gap-input,.app:not(.theme-light) .strategy-table-color-select { background:#111827 !important; color:#e5e7eb !important; border-color:#334155 !important; }
.app:not(.theme-light) .strategy-results-tools .table-tool-label { color:#94a3b8 !important; }
@media (max-width:1100px) { .strategy-results-header { flex-direction:column; } .strategy-results-tools { justify-content:flex-start; width:100%; } }
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

const API = "https://nifty-sensex-api-v2.onrender.com";

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

function formatCombinationShort(date: string) {
  if (!date) return "—";
  const parts = date.split("-");
  if (parts.length >= 3) return parts[2];
  return date;
}

function formatCombinationName(sensexExpiry: string, niftyExpiry: string) {
  const sensex = formatCombinationShort(sensexExpiry);
  const nifty = formatCombinationShort(niftyExpiry);
  if (sensex === "—" || nifty === "—") return "—";
  return `${sensex}-${nifty}`;
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
        start_date: viewDate,
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
                                  const nextColumns: BacktestDisplayColumn[] = checked
  ? visibleBacktestColumns.filter(
      (key: BacktestDisplayColumn) => key !== column.key
    )
  : [...visibleBacktestColumns, column.key];

setVisibleBacktestColumns(nextColumns);
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


function DiagonalModule() {
  type DiagonalRow = {
    Date: string;
    Spot: number | null;
    VIX: number | null;
    Type: "CE" | "PE";
    "Buy Expiry": string;
    "Sell Expiry": string;
    "Buy Strike": number;
    "Sell Strike": number;
    "Buy Premium": number | null;
    "Sell Premium": number | null;
    Ratio: number;
    "Diagonal Value": number | null;
  };

  const [dates, setDates] = useState<string[]>([]);
  const [symbol, setSymbol] = useState("NIFTY");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [viewDate, setViewDate] = useState("");
  const [earlierExpiry, setEarlierExpiry] = useState("");
  const [laterExpiry, setLaterExpiry] = useState("");
  const [expiries, setExpiries] = useState<string[]>([]);

  const [ceStartStrike, setCeStartStrike] = useState("");
  const [ceGap, setCeGap] = useState("200");
  const [ceCount, setCeCount] = useState("5");
  const [ceRatio, setCeRatio] = useState("1.00");

  const [peStartStrike, setPeStartStrike] = useState("");
  const [peGap, setPeGap] = useState("200");
  const [peCount, setPeCount] = useState("5");
  const [peRatio, setPeRatio] = useState("1.00");

  const [rows, setRows] = useState<DiagonalRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const step = symbol === "NIFTY" ? 50 : 100;

  useEffect(() => {
    async function loadDates() {
      try {
        const response = await fetch(`${API}/api/dates`);
        if (!response.ok) throw new Error("dates");
        const data = await response.json();
        const loaded: string[] = data.dates || [];
        setDates(loaded);
        if (loaded.length) {
          setStartDate(loaded[Math.max(0, loaded.length - 20)]);
          setEndDate(loaded[loaded.length - 1]);
                  }
      } catch {
        setError("Unable to load dates.");
      }
    }
    loadDates();
  }, []);

  useEffect(() => {
    if (!startDate || !endDate) return;
    async function loadExpiries() {
      try {
        const params = new URLSearchParams({ symbol, start_date: startDate, end_date: endDate });
        const response = await fetch(`${API}/api/diagonal-expiries?${params.toString()}`);
        if (!response.ok) throw new Error("expiries");
        const data = await response.json();
        const list: string[] = data.expiries || [];
        setExpiries(list);
        setEarlierExpiry((current) => current && list.includes(current) ? current : list[0] || "");
        setLaterExpiry((current) => current && list.includes(current) ? current : list[1] || list[0] || "");
      } catch {
        setExpiries([]);
        setEarlierExpiry("");
        setLaterExpiry("");
        setError("Unable to load expiry data for the selected range.");
      }
    }
    loadExpiries();
  }, [startDate, endDate, symbol]);

  useEffect(() => {
    if (!dates.length || !startDate || !endDate) return;
    const inRange = dates.filter((d) => startDate <= d && d <= endDate);
    if (!inRange.length) return;
    setViewDate((current) => current && inRange.includes(current) ? current : inRange[0]);
  }, [dates, startDate, endDate]);

  function defaultStartStrike(spot: number | null) {
    if (spot === null || !Number.isFinite(spot)) return "";
    return String(Math.round(spot / step) * step);
  }

  useEffect(() => {
    if (!startDate) return;
    fetch(`${API}/api/market/${startDate}`)
      .then((r) => r.json())
      .then((data) => {
        const spot = symbol === "NIFTY" ? data.nifty_spot : data.sensex_spot;
        const strike = defaultStartStrike(spot);
        if (strike) {
          setCeStartStrike((v) => v || strike);
          setPeStartStrike((v) => v || strike);
        }
      })
      .catch(() => undefined);
  }, [startDate, symbol]);

  async function runDiagonal() {
    setError("");
    setRows([]);

    const ceStart = Number(ceStartStrike);
    const ceStep = Number(ceGap);
    const ceN = Number(ceCount);
    const ceR = Number(ceRatio);
    const peStart = Number(peStartStrike);
    const peStep = Number(peGap);
    const peN = Number(peCount);
    const peR = Number(peRatio);

    if (!startDate || !endDate || !viewDate || !earlierExpiry || !laterExpiry) {
      setError("Select From Date, To Date, View Date and both expiries.");
      return;
    }
    if (earlierExpiry === laterExpiry) {
      setError("Earlier Expiry and Later Expiry must be different.");
      return;
    }
    if (![ceStart, ceStep, ceN, ceR, peStart, peStep, peN, peR].every(Number.isFinite)) {
      setError("Enter valid CE and PE strike, gap, count and ratio values.");
      return;
    }
    if (ceStep <= 0 || peStep <= 0 || ceN < 1 || peN < 1 || ceR <= 0 || peR <= 0) {
      setError("Gap, Number of Strikes and Ratio must be greater than zero.");
      return;
    }

    try {
      setLoading(true);
      const params = new URLSearchParams({
        symbol,
        start_date: startDate,
        end_date: endDate,
        earlier_expiry: earlierExpiry,
        later_expiry: laterExpiry,
        ce_start_strike: String(ceStart),
        ce_gap: String(ceStep),
        ce_count: String(ceN),
        ce_ratio: String(ceR),
        pe_start_strike: String(peStart),
        pe_gap: String(peStep),
        pe_count: String(peN),
        pe_ratio: String(peR),
      });
      const response = await fetch(`${API}/api/diagonal?${params.toString()}`);
      if (!response.ok) throw new Error(await response.text());
      const data = await response.json();
      setRows(data.rows || []);
    } catch (e) {
      console.error(e);
      setError("Diagonal calculation failed. Check the API deployment.");
    } finally {
      setLoading(false);
    }
  }

  const ceRows = rows.filter((r) => r.Type === "CE");
  const peRows = rows.filter((r) => r.Type === "PE");

  const inputStyle: React.CSSProperties = {
    width: "100%",
    height: 40,
    boxSizing: "border-box",
    border: "1px solid #dbe3ef",
    borderRadius: 9,
    padding: "0 11px",
    background: "transparent",
    color: "inherit",
    font: "inherit",
    outline: "none",
  };

  const sectionStyle: React.CSSProperties = {
    border: "1px solid #334155",
    borderRadius: 12,
    padding: 16,
    background: "rgba(15,23,42,.18)",
  };

  const controlGrid: React.CSSProperties = {
    display: "grid",
    gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
    gap: 12,
    marginTop: 14,
  };

  const renderTable = (title: string, data: DiagonalRow[], accent: string) => (
    <section className="panel" style={{ marginTop: 16 }}>
      <div className="panel-header">
        <div>
          <div className="panel-kicker">{title} DIAGONAL RESULTS</div>
          <h2>{title} — {data.length} rows</h2>
        </div>
      </div>
      <div className="table-wrapper" style={{ overflowX: "auto" }}>
        <table style={{ width: "max-content", minWidth: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr>
              {["Date", "Buy Expiry", "Sell Expiry", "Buy Strike", "Sell Strike", "Buy Premium", "Sell Premium", "Ratio", "Diagonal Value"].map((h) => (
                <th key={h} style={{ padding: "9px 12px", whiteSpace: "nowrap", color: accent }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.map((row, i) => (
              <tr key={`${row.Date}-${row.Type}-${row["Buy Strike"]}-${i}`}>
                <td>{formatDateForDisplay(row.Date)}</td>
                <td>{formatDateForDisplay(row["Buy Expiry"])}</td>
                <td>{formatDateForDisplay(row["Sell Expiry"])}</td>
                <td>{formatNumber(row["Buy Strike"], 0)}</td>
                <td>{formatNumber(row["Sell Strike"], 0)}</td>
                <td>{formatNumber(row["Buy Premium"])}</td>
                <td>{formatNumber(row["Sell Premium"])}</td>
                <td>{row.Ratio.toFixed(2)}</td>
                <td><b>{formatNumber(row["Diagonal Value"])}</b></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );

  return (
    <div className="strategy-page">
      {error && <div className="strategy-error">⚠ {error}</div>}

      <section className="panel">
        <div className="panel-header">
          <div>
            <div className="panel-kicker">DIAGONAL CONFIGURATION</div>
            <h2>Expiry & Market</h2>
          </div>
          <button className="primary-button" onClick={runDiagonal} disabled={loading}>
            {loading ? "⟳ Running..." : "▶ Run Diagonal"}
          </button>
        </div>
        <div className="strategy-controls-grid">
          <label><span>Symbol</span><select value={symbol} onChange={(e) => setSymbol(e.target.value)}><option>NIFTY</option><option>SENSEX</option></select></label>
          <DateControl label="From Date (Expiry Search)" value={startDate} options={dates} onChange={setStartDate} />
          <DateControl label="To Date (Expiry Search)" value={endDate} options={dates} onChange={setEndDate} />
          <DateControl label="View Date (Data Start)" value={viewDate} options={dates.filter((d) => startDate <= d && d <= endDate)} onChange={setViewDate} />
          <ExpiryControl label="Earlier Expiry" value={earlierExpiry} options={expiries} onChange={setEarlierExpiry} />
          <ExpiryControl label="Later Expiry" value={laterExpiry} options={expiries} onChange={setLaterExpiry} />
        </div>
        <div className="weekly-note" style={{ marginTop: 12 }}>From/To Date = expiry search range. View Date = first data date. Expiry dropdowns contain all expiries found anywhere inside the selected From/To range.</div>
      </section>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        <section className="panel" style={sectionStyle}>
          <div style={{ color: "#22c55e", fontWeight: 900, fontSize: 14, letterSpacing: ".06em" }}>🟢 CE DIAGONAL</div>
          <div style={controlGrid}>
            <label><span>Start Strike</span><input style={inputStyle} type="number" value={ceStartStrike} onChange={(e) => setCeStartStrike(e.target.value)} /></label>
            <label><span>Gap</span><input style={inputStyle} type="number" min="1" value={ceGap} onChange={(e) => setCeGap(e.target.value)} /></label>
            <label><span>Number of Strikes</span><input style={inputStyle} type="number" min="1" value={ceCount} onChange={(e) => setCeCount(e.target.value)} /></label>
            <label><span>Ratio</span><input style={inputStyle} type="number" min="0.01" step="0.01" value={ceRatio} onChange={(e) => setCeRatio(e.target.value)} /></label>
          </div>
          <div className="weekly-note">CE: Later-expiry BUY → Earlier-expiry SELL. One common gap is used for the whole CE section. Ratio starts at 1.00 and can be changed.</div>
        </section>

        <section className="panel" style={sectionStyle}>
          <div style={{ color: "#eab308", fontWeight: 900, fontSize: 14, letterSpacing: ".06em" }}>🟡 PE DIAGONAL</div>
          <div style={controlGrid}>
            <label><span>Start Strike</span><input style={inputStyle} type="number" value={peStartStrike} onChange={(e) => setPeStartStrike(e.target.value)} /></label>
            <label><span>Gap</span><input style={inputStyle} type="number" min="1" value={peGap} onChange={(e) => setPeGap(e.target.value)} /></label>
            <label><span>Number of Strikes</span><input style={inputStyle} type="number" min="1" value={peCount} onChange={(e) => setPeCount(e.target.value)} /></label>
            <label><span>Ratio</span><input style={inputStyle} type="number" min="0.01" step="0.01" value={peRatio} onChange={(e) => setPeRatio(e.target.value)} /></label>
          </div>
          <div className="weekly-note">PE: Later-expiry BUY → Earlier-expiry SELL. One common gap is used for the whole PE section. Ratio starts at 1.00 and can be changed.</div>
        </section>
      </div>

      {rows.length > 0 && (
        <>
          {renderTable("CE", ceRows, "#22c55e")}
          {renderTable("PE", peRows, "#eab308")}
        </>
      )}
    </div>
  );
}

function StrategyPage({
  title,
}: {
  title: Tab;
}) {
  if (title === "Strategy Tester") {
    return <StrategyTesterModule />;
  }

  if (title === "Calendar") {
    return <CalendarModule />;
  }

  if (title === "Diagonal") {
    return <DiagonalModule />;
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


function CalendarModule() {
  type CalendarRow = {
    Date: string;
    Spot: number | null;
    "Option Type": "CE" | "PE";
    Strike: number;
    "Earlier Expiry": string;
    "Later Expiry": string;
    "Earlier Premium": number | null;
    "Later Premium": number | null;
    Ratio: number | null;
    "Calendar Value": number | null;
  };

  type ExpirySnapshot = {
    expiry: string;
    provisional_atm: number | null;
    atm_strike_used: number | null;
    atm_ce: number | null;
    atm_pe: number | null;
    synthetic_future: number | null;
    final_strike: number | null;
    final_ce: number | null;
    final_pe: number | null;
    straddle: number | null;
    status: string;
  };

  const [dates, setDates] = useState<string[]>([]);
  const [symbol, setSymbol] = useState("NIFTY");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [viewDate, setViewDate] = useState("");
  const [expiries, setExpiries] = useState<string[]>([]);
  const [earlierExpiry, setEarlierExpiry] = useState("");
  const [laterExpiry, setLaterExpiry] = useState("");
  const [strikeMode, setStrikeMode] = useState("MANUAL");
  const [startStrike, setStartStrike] = useState("");
  const [strikeGap, setStrikeGap] = useState("100");
  const [strikeCount, setStrikeCount] = useState("10");
  const [rows, setRows] = useState<CalendarRow[]>([]);
  const [viewSpot, setViewSpot] = useState<number | null>(null);
  const [viewVix, setViewVix] = useState<number | null>(null);
  const [viewSnapshots, setViewSnapshots] = useState<ExpirySnapshot[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingSetup, setLoadingSetup] = useState(false);
  const [error, setError] = useState("");
  const [headerSize, setHeaderSize] = useState(10);
  const [dataSize, setDataSize] = useState(10);
  const [headerColor, setHeaderColor] = useState("auto");
  const [dataColor, setDataColor] = useState("auto");
  const [gap, setGap] = useState(6);
  const [compactTable, setCompactTable] = useState(false);
  const [autoFit, setAutoFit] = useState(true);

  useEffect(() => {
    fetch(`${API}/api/dates`)
      .then((r) => r.json())
      .then((d) => {
        const ds = Array.isArray(d.dates) ? d.dates : [];
        setDates(ds);
        if (ds.length) {
          const from = ds[Math.max(0, ds.length - 20)];
          const to = ds[ds.length - 1];
          setStartDate(from);
          setEndDate(to);
          setViewDate(from);
        }
      })
      .catch(() => setError("Cannot connect to local API."));
  }, []);

  const rangeDates = useMemo(
    () => dates.filter((d) => (!startDate || d >= startDate) && (!endDate || d <= endDate)),
    [dates, startDate, endDate]
  );

  useEffect(() => {
    if (!viewDate && rangeDates.length) {
      setViewDate(rangeDates[0]);
    } else if (viewDate && rangeDates.length && !rangeDates.includes(viewDate)) {
      setViewDate(rangeDates[0]);
    }
  }, [rangeDates, viewDate]);

  const loadCalendarSetup = async () => {
    if (!startDate || !endDate || startDate > endDate) return;
    setLoadingSetup(true);
    setError("");
    try {
      const params = new URLSearchParams({
        start_date: startDate,
        end_date: endDate,
        symbol,
        view_date: viewDate,
      });
      const response = await fetch(`${API}/api/calendar-expiries?${params.toString()}`);
      const data = await response.json();
      if (!response.ok) throw new Error(data.detail || "Cannot load expiries.");
      const list: string[] = Array.isArray(data.expiries) ? data.expiries : [];
      setExpiries(list);
      setEarlierExpiry((current) => current && list.includes(current) ? current : list[0] || "");
      setLaterExpiry((current) => current && list.includes(current) && current !== list[0] ? current : list[1] || "");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Cannot load calendar setup.");
    } finally {
      setLoadingSetup(false);
    }
  };

  useEffect(() => {
    if (startDate && endDate) loadCalendarSetup();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [startDate, endDate, symbol, viewDate]);

  const filteredLater = useMemo(
    () => expiries.filter((e) => !earlierExpiry || e > earlierExpiry),
    [expiries, earlierExpiry]
  );

  useEffect(() => {
    if (!laterExpiry || !filteredLater.includes(laterExpiry)) setLaterExpiry(filteredLater[0] || "");
  }, [filteredLater, laterExpiry]);

  const loadViewDate = async () => {
    if (!viewDate || !earlierExpiry || !laterExpiry) return;
    try {
      const params = new URLSearchParams({ date: viewDate, symbol, earlier_expiry: earlierExpiry, later_expiry: laterExpiry });
      const response = await fetch(`${API}/api/calendar-view?${params.toString()}`);
      const data = await response.json();
      if (!response.ok) throw new Error(data.detail || "Cannot load View Date data.");
      setViewSpot(data.spot ?? null);
      setViewVix(data.india_vix ?? null);
      setViewSnapshots(Array.isArray(data.expiries) ? data.expiries : []);
    } catch (e) {
      setViewSpot(null);
      setViewVix(null);
      setViewSnapshots([]);
      setError(e instanceof Error ? e.message : "Cannot load View Date data.");
    }
  };

  useEffect(() => {
    loadViewDate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [viewDate, symbol, earlierExpiry, laterExpiry]);

  const runCalendar = async () => {
    setError("");
    setRows([]);
    if (!startDate || !endDate || startDate > endDate) {
      setError("Select a valid expiry-search range.");
      return;
    }
    if (!viewDate) {
      setError("Select a View Date. Calendar data will start from View Date.");
      return;
    }
    if (!earlierExpiry || !laterExpiry || earlierExpiry >= laterExpiry) {
      setError("Select a valid Earlier Expiry and Later Expiry.");
      return;
    }
    if (strikeMode === "MANUAL" && !startStrike) {
      setError("Enter the Strike from which the rows should start.");
      return;
    }
    setLoading(true);
    try {
      const params = new URLSearchParams({
        start_date: startDate,
        end_date: endDate,
        symbol,
        earlier_expiry: earlierExpiry,
        later_expiry: laterExpiry,
        start_strike: strikeMode === "AUTO ATM" ? "0" : (startStrike || "0"),
        strike_gap: strikeGap || "100",
        strike_count: strikeCount || "10",
        view_date: viewDate,
      });
      const response = await fetch(`${API}/api/calendar?${params.toString()}`);
      const data = await response.json();
      if (!response.ok) throw new Error(data.detail || "Calendar calculation failed.");
      setRows(Array.isArray(data.rows) ? data.rows : []);
      if (strikeMode === "AUTO ATM" && data.start_strike != null) setStartStrike(String(data.start_strike));
      await loadViewDate();
      if (!data.rows?.length) setError("No calendar data found from View Date for the selected strikes/expiries.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Calendar calculation failed.");
    } finally {
      setLoading(false);
    }
  };

  const datesInResult = useMemo(
    () => Array.from(new Set(rows.map((r) => r.Date))).sort(),
    [rows]
  );

  const strikesInResult = useMemo(
    () => Array.from(new Set(rows.map((r) => Number(r.Strike)))).sort((a, b) => a - b),
    [rows]
  );

  const findRow = (type: "CE" | "PE", strike: number, date: string) =>
    rows.find((r) => r["Option Type"] === type && Number(r.Strike) === strike && r.Date === date);

  const average = rows.length ? rows.reduce((a, r) => a + (r["Calendar Value"] || 0), 0) / rows.length : null;
  const highest = rows.length ? Math.max(...rows.map((r) => r["Calendar Value"] ?? -Infinity)) : null;
  const lowest = rows.length ? Math.min(...rows.map((r) => r["Calendar Value"] ?? Infinity)) : null;

  const selectedEarlier = viewSnapshots.find((x) => x.expiry === earlierExpiry);
  const selectedLater = viewSnapshots.find((x) => x.expiry === laterExpiry);

  const renderHorizontalTable = (type: "CE" | "PE", title: string, tone: string) => (
    <section className={`panel calendar-results ${autoFit ? "strategy-table-autofit" : ""} ${compactTable ? "strategy-table-compact" : ""}`} style={{
      ["--calendar-header-size" as string]: `${headerSize}px`,
      ["--calendar-data-size" as string]: `${dataSize}px`,
      ["--calendar-header-color" as string]: headerColor === "auto" ? undefined : headerColor,
      ["--calendar-data-color" as string]: dataColor === "auto" ? undefined : dataColor,
      ["--calendar-table-gap" as string]: `${gap}px`,
    } as React.CSSProperties}>
      <div className="panel-header strategy-results-header">
        <div><div className="panel-kicker">{tone}</div><h2>{title}</h2><small>{strikesInResult.length} strikes × {datesInResult.length} dates</small></div>
        <div className="strategy-results-tools">
          <span className="table-tool-label">Header</span><input className="strategy-table-size-input" type="number" min="8" max="30" value={headerSize} onChange={(e) => setHeaderSize(Math.min(30, Math.max(8, Number(e.target.value) || 8)))} />
          <span className="table-tool-label">Data</span><input className="strategy-table-size-input" type="number" min="8" max="30" value={dataSize} onChange={(e) => setDataSize(Math.min(30, Math.max(8, Number(e.target.value) || 8)))} />
          <span className="table-tool-label">H Color</span><select className="strategy-table-color-select" value={headerColor} onChange={(e) => setHeaderColor(e.target.value)}><option value="auto">Auto</option><option value="#334155">Slate</option><option value="#2563eb">Blue</option><option value="#4f46e5">Indigo</option><option value="#ffffff">White</option></select>
          <span className="table-tool-label">D Color</span><select className="strategy-table-color-select" value={dataColor} onChange={(e) => setDataColor(e.target.value)}><option value="auto">Auto</option><option value="#334155">Slate</option><option value="#2563eb">Blue</option><option value="#4f46e5">Indigo</option><option value="#ffffff">White</option></select>
          <span className="table-tool-label">Gap</span><input className="strategy-table-gap-input" type="number" min="0" max="24" value={gap} onChange={(e) => setGap(Math.min(24, Math.max(0, Number(e.target.value) || 0)))} />
          <button className={`table-tool-button ${compactTable ? "selected" : ""}`} onClick={() => setCompactTable((v) => !v)}>{compactTable ? "✓ Compact" : "Compact"}</button>
          <button className={`table-tool-button ${autoFit ? "selected" : ""}`} onClick={() => setAutoFit((v) => !v)}>{autoFit ? "✓ Auto Fit" : "Auto Fit"}</button>
        </div>
      </div>
      <div className="table-wrapper">
        <table className="calendar-horizontal-table">
          <thead>
            <tr>
              <th rowSpan={2} className="strike-head">STRIKE</th>
              {datesInResult.map((d) => <th key={d} colSpan={4} className="date-head">{formatDateForDisplay(d)}</th>)}
            </tr>
            <tr>
              {datesInResult.flatMap((d) => ["Earlier", "Later", "Ratio", "Value"].map((x) => <th key={`${d}-${x}`} className="sub-head">{x}</th>))}
            </tr>
          </thead>
          <tbody>
            {strikesInResult.map((strike) => (
              <tr key={`${type}-${strike}`}>
                <td className="strike-cell">{formatNumber(strike, 0)}</td>
                {datesInResult.flatMap((d) => {
                  const r = findRow(type, strike, d);
                  return [
                    <td key={`${d}-e`}>{formatNumber(r?.["Earlier Premium"])}</td>,
                    <td key={`${d}-l`}>{formatNumber(r?.["Later Premium"])}</td>,
                    <td key={`${d}-r`}>{formatNumber(r?.Ratio)}</td>,
                    <td key={`${d}-v`} className={(r?.["Calendar Value"] ?? 0) >= 0 ? "positive" : "negative"}>{formatNumber(r?.["Calendar Value"])}</td>,
                  ];
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );

  return (
    <div className="page-stack calendar-v2">
      <style>{`
        .calendar-v2 .calendar-setup-grid { display:grid; grid-template-columns:repeat(4,minmax(180px,1fr)); gap:12px; margin-top:16px; }
        .calendar-v2 .calendar-setup-grid label { display:grid; gap:7px; min-width:0; }
        .calendar-v2 .calendar-setup-grid label > span { font-size:10px; font-weight:800; letter-spacing:.07em; text-transform:uppercase; opacity:.68; }
        .calendar-v2 .calendar-setup-grid select,.calendar-v2 .calendar-setup-grid input { width:100%; height:40px; box-sizing:border-box; border:1px solid #334155; border-radius:9px; background:#111827; color:#e5e7eb; padding:0 10px; }
        .calendar-v2 .calendar-setup-grid select:focus,.calendar-v2 .calendar-setup-grid input:focus { outline:none; border-color:#6366f1; box-shadow:0 0 0 2px rgba(99,102,241,.14); }
        .calendar-v2 .calendar-mode-row { display:flex; gap:8px; align-items:center; flex-wrap:wrap; margin-top:14px; }
        .calendar-v2 .calendar-mode-row button { height:34px; padding:0 12px; border:1px solid #334155; border-radius:8px; background:#111827; color:#cbd5e1; font-size:11px; font-weight:800; cursor:pointer; }
        .calendar-v2 .calendar-mode-row button.selected { border-color:#6366f1; background:#27235f; color:#c7d2fe; }
        .calendar-v2 .calendar-mode-row input { width:120px; height:34px; border:1px solid #334155; border-radius:8px; background:#111827; color:#e5e7eb; padding:0 9px; }
        .calendar-v2 .calendar-note { margin-top:14px; padding:11px 13px; border:1px solid #334155; border-radius:9px; background:#111827; color:#94a3b8; font-size:11px; line-height:1.55; }
        .calendar-v2 .calendar-snapshot-grid { display:grid; grid-template-columns:1.1fr 1fr 1fr; gap:12px; }
        .calendar-v2 .calendar-snapshot { padding:15px; border:1px solid #334155; border-radius:11px; background:#0f172a; }
        .calendar-v2 .calendar-snapshot h3 { margin:0 0 10px; font-size:12px; }
        .calendar-v2 .calendar-snapshot .snap-grid { display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); gap:8px; }
        .calendar-v2 .snap-item { padding:9px 10px; border:1px solid #263449; border-radius:8px; background:#111827; }
        .calendar-v2 .snap-item span { display:block; font-size:9px; color:#94a3b8; text-transform:uppercase; letter-spacing:.05em; }
        .calendar-v2 .snap-item b { display:block; margin-top:3px; font-size:13px; color:#e5e7eb; }
        .calendar-v2 .calendar-stat-grid { display:grid; grid-template-columns:repeat(4,minmax(0,1fr)); gap:12px; }
        .calendar-v2 .calendar-stat { padding:14px 16px; border:1px solid #334155; border-radius:10px; background:#0f172a; }
        .calendar-v2 .calendar-stat span { display:block; font-size:9px; color:#94a3b8; text-transform:uppercase; letter-spacing:.06em; }
        .calendar-v2 .calendar-stat b { display:block; margin-top:5px; font-size:18px; color:#e5e7eb; }
        .calendar-v2 .calendar-results .table-wrapper { overflow-x:auto; margin-top:8px; }
        .calendar-v2 .calendar-horizontal-table { width:max-content; min-width:100%; border-collapse:collapse; table-layout:auto; }
        .calendar-v2 .calendar-horizontal-table th,.calendar-v2 .calendar-horizontal-table td { white-space:nowrap; text-align:center; border-bottom:1px solid #1f2937; padding:7px var(--calendar-table-gap,6px); }
        .calendar-v2 .calendar-horizontal-table th { color:var(--calendar-header-color,#94a3b8) !important; font-size:var(--calendar-header-size,10px); }
        .calendar-v2 .calendar-horizontal-table td { color:var(--calendar-data-color,#e5e7eb) !important; font-size:var(--calendar-data-size,10px); }
        .calendar-v2 .calendar-horizontal-table .date-head { background:rgba(99,102,241,.10); border-left:1px solid #334155; border-right:1px solid #334155; font-weight:900; }
        .calendar-v2 .calendar-horizontal-table .sub-head { font-size:9px; opacity:.72; }
        .calendar-v2 .calendar-horizontal-table .strike-head,.calendar-v2 .calendar-horizontal-table .strike-cell { position:sticky; left:0; z-index:2; background:#0f172a; text-align:left; font-weight:900; border-right:1px solid #334155; }
        .calendar-v2 .calendar-horizontal-table .strike-cell { font-size:var(--calendar-data-size,10px); }
        .calendar-v2 .calendar-horizontal-table td.positive { color:#86efac !important; }
        .calendar-v2 .calendar-horizontal-table td.negative { color:#fca5a5 !important; }
        .calendar-v2 .calendar-results.strategy-table-compact .calendar-horizontal-table th,.calendar-v2 .calendar-results.strategy-table-compact .calendar-horizontal-table td { padding-top:4px; padding-bottom:4px; }
        @media(max-width:1100px){ .calendar-v2 .calendar-setup-grid{grid-template-columns:repeat(2,minmax(0,1fr));}.calendar-v2 .calendar-snapshot-grid{grid-template-columns:1fr;}.calendar-v2 .calendar-stat-grid{grid-template-columns:repeat(2,minmax(0,1fr));} }
        @media(max-width:600px){ .calendar-v2 .calendar-setup-grid,.calendar-v2 .calendar-stat-grid{grid-template-columns:1fr;} .calendar-v2 .calendar-snapshot .snap-grid{grid-template-columns:1fr;} }
      `}</style>

      <section className="panel">
        <div className="panel-header">
          <div>
            <div className="panel-kicker">CALENDAR STRATEGY</div>
            <h2>Calendar Setup</h2>
            <p><b>From/To Date = expiry search range.</b> <b>View Date = data start date.</b> From/To find valid expiries. View Date is the FIRST result date. Expiries are limited to contracts having data on View Date. The table runs from View Date through the earlier expiry.</p>
          </div>
          <button className="calendar-run" onClick={runCalendar} disabled={loading || loadingSetup}>{loading ? "Running…" : "▶ Run Calendar"}</button>
        </div>

        <div className="calendar-setup-grid">
          <label><span>Index</span><select value={symbol} onChange={(e) => setSymbol(e.target.value)}><option>NIFTY</option><option>SENSEX</option></select></label>
          <label><span>From Date (Expiry Search)</span><select value={startDate} onChange={(e) => setStartDate(e.target.value)}>{dates.map((d) => <option key={d} value={d}>{formatDateForDisplay(d)}</option>)}</select></label>
          <label><span>To Date (Expiry Search)</span><select value={endDate} onChange={(e) => setEndDate(e.target.value)}>{dates.filter((d) => !startDate || d >= startDate).map((d) => <option key={d} value={d}>{formatDateForDisplay(d)}</option>)}</select></label>
          <label><span>View Date (Data Start)</span><select value={viewDate} onChange={(e) => setViewDate(e.target.value)}>{rangeDates.map((d) => <option key={d} value={d}>{formatDateForDisplay(d)}</option>)}</select></label>
          <label><span>Earlier Expiry</span><select value={earlierExpiry} onChange={(e) => setEarlierExpiry(e.target.value)}>{expiries.map((d) => <option key={d} value={d}>{formatDateForDisplay(d)}</option>)}</select></label>
          <label><span>Later Expiry</span><select value={laterExpiry} onChange={(e) => setLaterExpiry(e.target.value)}>{filteredLater.map((d) => <option key={d} value={d}>{formatDateForDisplay(d)}</option>)}</select></label>
          <label><span>Strike Gap</span><input type="number" min="1" value={strikeGap} onChange={(e) => setStrikeGap(e.target.value)} /></label>
          <label><span>Number of Strikes</span><input type="number" min="1" max="50" value={strikeCount} onChange={(e) => setStrikeCount(e.target.value)} /></label>
        </div>

        <div className="calendar-mode-row">
          <b style={{fontSize:11,opacity:.7}}>STRIKE SELECTION</b>
          <button className={strikeMode === "AUTO ATM" ? "selected" : ""} onClick={() => setStrikeMode("AUTO ATM")}>AUTO ATM</button>
          <button className={strikeMode === "MANUAL" ? "selected" : ""} onClick={() => setStrikeMode("MANUAL")}>MANUAL</button>
          <input aria-label="Start Strike" type="number" value={startStrike} disabled={strikeMode !== "MANUAL"} placeholder={viewSpot != null ? `ATM ${formatNumber(viewSpot,0)}` : "Start Strike"} onChange={(e) => setStartStrike(e.target.value)} />
          <span style={{fontSize:10,opacity:.62}}>Rows start exactly from this strike, then Gap × Number of Strikes.</span>
        </div>

        <div className="calendar-note"><b>Important:</b> View Date is now the <b>first date of the result table</b>. From/To are used only to find all expiry choices. CE and PE are displayed as separate horizontal strike-by-date tables. Each date has Earlier Premium, Later Premium, Ratio and Calendar Value.</div>
        {error && <div className="strategy-error">{error}</div>}
      </section>

      <section className="calendar-snapshot-grid">
        <div className="calendar-snapshot">
          <h3>VIEW DATE — {formatDateForDisplay(viewDate)}</h3>
          <div className="snap-grid">
            <div className="snap-item"><span>{symbol} Spot</span><b>{formatNumber(viewSpot)}</b></div>
            <div className="snap-item"><span>India VIX</span><b>{formatNumber(viewVix)}</b></div>
          </div>
        </div>
        {[selectedEarlier, selectedLater].map((snap, i) => (
          <div className="calendar-snapshot" key={i}>
            <h3>{i === 0 ? "EARLIER EXPIRY" : "LATER EXPIRY"} — {formatDateForDisplay(snap?.expiry || (i === 0 ? earlierExpiry : laterExpiry))}</h3>
            <div className="snap-grid">
              <div className="snap-item"><span>Provisional ATM</span><b>{formatNumber(snap?.provisional_atm,0)}</b></div>
              <div className="snap-item"><span>ATM Strike Used</span><b>{formatNumber(snap?.atm_strike_used,0)}</b></div>
              <div className="snap-item"><span>ATM CE</span><b>{formatNumber(snap?.atm_ce)}</b></div>
              <div className="snap-item"><span>ATM PE</span><b>{formatNumber(snap?.atm_pe)}</b></div>
              <div className="snap-item"><span>Synthetic Future</span><b>{formatNumber(snap?.synthetic_future)}</b></div>
              <div className="snap-item"><span>Final Strike</span><b>{formatNumber(snap?.final_strike,0)}</b></div>
              <div className="snap-item"><span>Final CE</span><b>{formatNumber(snap?.final_ce)}</b></div>
              <div className="snap-item"><span>Final PE</span><b>{formatNumber(snap?.final_pe)}</b></div>
            </div>
          </div>
        ))}
      </section>

      <section className="calendar-stat-grid">
        <div className="calendar-stat"><span>Total Cells / Rows</span><b>{rows.length || "—"}</b></div>
        <div className="calendar-stat"><span>Average Calendar Value</span><b>{formatNumber(average)}</b></div>
        <div className="calendar-stat"><span>Highest</span><b>{formatNumber(highest)}</b></div>
        <div className="calendar-stat"><span>Lowest</span><b>{formatNumber(lowest)}</b></div>
      </section>

      {rows.length > 0 && <>
        {renderHorizontalTable("CE", "CALL / CE CALENDAR", "CE SECTION — STRIKE × DATE")}
        {renderHorizontalTable("PE", "PUT / PE CALENDAR", "PE SECTION — STRIKE × DATE")}
      </>}
    </div>
  );
}

function StrategyTesterModule() {
  type AnalysisMode = "weekly" | "custom";
  type WeeklyCombination = {
    id: string;
    week: string;
    nifty_expiry: string;
    sensex_expiry: string;
    earlier_expiry: string;
    later_expiry: string;
    view_from: string;
    row_count: number;
    average: number | null;
    maximum: number | null;
    minimum: number | null;
    rows: BacktestRow[];
  };

  const [dates, setDates] = useState<string[]>([]);
  const [mode, setMode] = useState<AnalysisMode>("weekly");
  const [month, setMonth] = useState("");
  const [weeklyCombinations, setWeeklyCombinations] = useState<WeeklyCombination[]>([]);
  const [selectedCombination, setSelectedCombination] = useState("ALL");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [viewFromDate, setViewFromDate] = useState("");
  const [niftyExpiries, setNiftyExpiries] = useState<string[]>([]);
  const [sensexExpiries, setSensexExpiries] = useState<string[]>([]);
  const [niftyExpiry, setNiftyExpiry] = useState("");
  const [sensexExpiry, setSensexExpiry] = useState("");
  const [multiplier, setMultiplier] = useState(3.3);
  const [minDte, setMinDte] = useState("");
  const [maxDte, setMaxDte] = useState("");

  // Strategy Tester result table controls
  const [strategyTableCompact, setStrategyTableCompact] = useState(false);
  const [strategyTableAutoFit, setStrategyTableAutoFit] = useState(false);
  const [strategyTableHeaderSize, setStrategyTableHeaderSize] = useState(10);
  const [strategyTableDataSize, setStrategyTableDataSize] = useState(10);
  const [strategyTableHeaderColor, setStrategyTableHeaderColor] = useState("auto");
  const [strategyTableDataColor, setStrategyTableDataColor] = useState("auto");
  const [strategyTableGap, setStrategyTableGap] = useState(9);

  const [backtest, setBacktest] = useState<BacktestResponse | null>(null);
  const [weeklyRows, setWeeklyRows] = useState<BacktestRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const months = useMemo(() => {
    return Array.from(new Set(dates.map((d) => d.slice(0, 7)))).sort();
  }, [dates]);

  useEffect(() => {
    async function loadDates() {
      try {
        setError("");
        const response = await fetch(`${API}/api/dates`);
        if (!response.ok) throw new Error("dates");
        const data = await response.json();
        const loaded: string[] = data.dates || [];
        setDates(loaded);
        if (loaded.length) {
          setStartDate(loaded[Math.max(0, loaded.length - 20)]);
          setEndDate(loaded[loaded.length - 1]);
          setViewFromDate(loaded[Math.max(0, loaded.length - 20)]);
          setMonth(loaded[loaded.length - 1].slice(0, 7));
        }
      } catch {
        setError("Unable to load dates from the local database.");
      }
    }
    loadDates();
  }, []);

  useEffect(() => {
    if (!endDate || mode !== "custom") return;
    async function loadExpiries() {
      try {
        const params = new URLSearchParams({ start_date: startDate, end_date: endDate });
        const response = await fetch(`${API}/api/expiry-range?${params.toString()}`);
        if (!response.ok) throw new Error("expiries");
        const data = await response.json();
        const n: string[] = data.nifty || [];
        const sx: string[] = data.sensex || [];
        setNiftyExpiries(n);
        setSensexExpiries(sx);
        setNiftyExpiry((current) => current && n.includes(current) ? current : n[0] || "");
        setSensexExpiry((current) => current && sx.includes(current) ? current : sx[0] || "");
      } catch {
        setError("Unable to load expiry data.");
      }
    }
    loadExpiries();
  }, [startDate, endDate, mode]);

  function applyDteFilter(rows: BacktestRow[]) {
    const min = minDte === "" ? null : Number(minDte);
    const max = maxDte === "" ? null : Number(maxDte);
    return rows.filter((row) => {
      const dtes = [Number((row as any)["NIFTY DTE"]), Number((row as any)["SENSEX DTE"])].filter(Number.isFinite);
      if (!dtes.length) return true;
      if (min !== null && dtes.some((d) => d < min)) return false;
      if (max !== null && dtes.some((d) => d > max)) return false;
      return true;
    });
  }

  async function runWeekly() {
    if (!month) {
      setError("Select a month first.");
      return;
    }
    try {
      setLoading(true);
      setError("");
      const params = new URLSearchParams({ month, multiplier: String(multiplier) });
      const response = await fetch(`${API}/api/weekly-combinations?${params.toString()}`);
      if (!response.ok) throw new Error(await response.text());
      const data = await response.json();
      const combinations: WeeklyCombination[] = data.combinations || [];
      setWeeklyCombinations(combinations);
      const allRows = combinations.flatMap((c) => c.rows);
      const chosen = selectedCombination === "ALL"
        ? allRows
        : (combinations.find((c) => c.id === selectedCombination)?.rows || []);
      setWeeklyRows(applyDteFilter(chosen));
      if (selectedCombination !== "ALL" && !combinations.some((c) => c.id === selectedCombination)) {
        setSelectedCombination("ALL");
      }
    } catch (e) {
      console.error(e);
      setError("Weekly combination test failed. Check that FastAPI is running on port 8000.");
    } finally {
      setLoading(false);
    }
  }

  async function runCustom() {
    if (!startDate || !endDate || !viewFromDate || !niftyExpiry || !sensexExpiry) {
      setError("Select Date Range, View From Date and both Expiries.");
      return;
    }
    try {
      setLoading(true);
      setError("");
      const params = new URLSearchParams({
        start_date: viewFromDate,
        end_date: endDate,
        nifty_expiry: niftyExpiry,
        sensex_expiry: sensexExpiry,
        multiplier: String(multiplier),
      });
      const response = await fetch(`${API}/api/backtest?${params.toString()}`);
      if (!response.ok) throw new Error(await response.text());
      const data: BacktestResponse = await response.json();
      const rows = applyDteFilter(data.rows);
      const values = rows.map((r) => Number(r["Final Value"])).filter(Number.isFinite);
      setBacktest({
        count: rows.length,
        average: values.length ? values.reduce((a, b) => a + b, 0) / values.length : null,
        maximum: values.length ? Math.max(...values) : null,
        minimum: values.length ? Math.min(...values) : null,
        rows,
      });
    } catch (e) {
      console.error(e);
      setError("Custom backtest failed. Check that FastAPI is running on port 8000.");
    } finally {
      setLoading(false);
    }
  }

  function handleModeChange(next: AnalysisMode) {
    setMode(next);
    setError("");
    setBacktest(null);
    setWeeklyRows([]);
  }

  function handleCombinationChange(value: string) {
    setSelectedCombination(value);
    const rows = value === "ALL"
      ? weeklyCombinations.flatMap((c) => c.rows)
      : (weeklyCombinations.find((c) => c.id === value)?.rows || []);
    setWeeklyRows(applyDteFilter(rows));
  }

  const weeklyValues = weeklyRows.map((r) => Number(r["Final Value"])).filter(Number.isFinite);
  const weeklyAverage = weeklyValues.length ? weeklyValues.reduce((a, b) => a + b, 0) / weeklyValues.length : null;
  const weeklyHigh = weeklyValues.length ? Math.max(...weeklyValues) : null;
  const weeklyLow = weeklyValues.length ? Math.min(...weeklyValues) : null;
  const displayRows = mode === "weekly" ? weeklyRows : (backtest?.rows || []);

  return (
    <div className="strategy-page">
      <section className="panel">
        <div className="panel-header">
          <div>
            <div className="panel-kicker">BACKTEST ENGINE</div>
            <h2>Strategy Tester</h2>
            <p style={{ marginTop: 6, opacity: 0.68 }}>
              Weekly expiry combinations or a fixed custom expiry pair. Each selected combination stays locked for its full analysis window.
            </p>
          </div>
          <button
            className="primary-button"
            onClick={mode === "weekly" ? runWeekly : runCustom}
            disabled={loading}
          >
            {loading ? "Running..." : "▶ Run Test"}
          </button>
        </div>

        <div className="mode-switch">
          <button className={mode === "weekly" ? "selected" : ""} onClick={() => handleModeChange("weekly")}>Weekly Expiry Combinations</button>
          <button className={mode === "custom" ? "selected" : ""} onClick={() => handleModeChange("custom")}>Custom Expiry Pair</button>
        </div>

        {mode === "weekly" ? (
          <>
            <div className="strategy-controls-grid weekly-controls">
              <label>
                <span>Month</span>
                <select value={month} onChange={(e) => { setMonth(e.target.value); setWeeklyRows([]); setWeeklyCombinations([]); }}>
                  {months.map((m) => <option key={m} value={m}>{formatDateForDisplay(`${m}-01`).slice(3)}</option>)}
                </select>
              </label>

              <label>
                <span>Combination</span>
                <select value={selectedCombination} onChange={(e) => handleCombinationChange(e.target.value)}>
                  <option value="ALL">ALL COMBINATIONS</option>
                  {weeklyCombinations.map((c) => (
                    <option key={c.id} value={c.id}>{c.id} · {formatCombinationName(c.sensex_expiry, c.nifty_expiry)} · SENSEX {formatDateForDisplay(c.sensex_expiry)} × NIFTY {formatDateForDisplay(c.nifty_expiry)}</option>
                  ))}
                </select>
              </label>

              <label>
                <span>NIFTY Multiplier</span>
                <input type="number" step="0.01" value={multiplier} onChange={(e) => setMultiplier(Number(e.target.value))} />
              </label>

              <label>
                <span>Minimum DTE</span>
                <input type="number" min="0" placeholder="Any" value={minDte} onChange={(e) => setMinDte(e.target.value)} />
              </label>

              <label>
                <span>Maximum DTE</span>
                <input type="number" min="0" placeholder="Any" value={maxDte} onChange={(e) => setMaxDte(e.target.value)} />
              </label>
            </div>
            <div className="weekly-note">
              <b>Weekly mode:</b> select a month → system finds every NIFTY/SENSEX weekly-expiry pair in that month → each pair gets its own fixed window starting <b>7 calendar days before the earlier expiry</b> and ending on the earlier expiry.
            </div>
          </>
        ) : (
          <>
            <div className="strategy-controls-grid">
              <label>
                <span>Data Range Start</span>
                <select value={startDate} onChange={(e) => setStartDate(e.target.value)}>
                  {dates.map((d) => <option key={d} value={d}>{formatDateForDisplay(d)}</option>)}
                </select>
              </label>

              <label>
                <span>Data Range End</span>
                <select value={endDate} onChange={(e) => setEndDate(e.target.value)}>
                  {dates.map((d) => <option key={d} value={d}>{formatDateForDisplay(d)}</option>)}
                </select>
              </label>

              <label>
                <span>View From</span>
                <select value={viewFromDate} onChange={(e) => setViewFromDate(e.target.value)}>
                  {dates.filter((d) => d >= startDate && d <= endDate).map((d) => <option key={d} value={d}>{formatDateForDisplay(d)}</option>)}
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
                <input type="number" step="0.01" value={multiplier} onChange={(e) => setMultiplier(Number(e.target.value))} />
              </label>

              <label>
                <span>Minimum DTE</span>
                <input type="number" min="0" placeholder="Any" value={minDte} onChange={(e) => setMinDte(e.target.value)} />
              </label>

              <label>
                <span>Maximum DTE</span>
                <input type="number" min="0" placeholder="Any" value={maxDte} onChange={(e) => setMaxDte(e.target.value)} />
              </label>
            </div>
            <div className="weekly-note">
              <b>Custom mode:</b> your manually selected NIFTY + SENSEX expiry pair stays fixed. View From controls where the day-wise table starts.
            </div>
          </>
        )}

        {error && <div className="strategy-error">{error}</div>}
      </section>

      <section className="strategy-stat-grid">
        <div className="panel strategy-stat"><span>ROWS</span><b>{mode === "weekly" ? (weeklyRows.length || "—") : (backtest?.count ?? "—")}</b></div>
        <div className="panel strategy-stat"><span>AVERAGE SPREAD</span><b>{formatNumber(mode === "weekly" ? weeklyAverage : backtest?.average)}</b></div>
        <div className="panel strategy-stat"><span>HIGH</span><b>{formatNumber(mode === "weekly" ? weeklyHigh : backtest?.maximum)}</b></div>
        <div className="panel strategy-stat"><span>LOW</span><b>{formatNumber(mode === "weekly" ? weeklyLow : backtest?.minimum)}</b></div>
      </section>

      {mode === "weekly" && weeklyCombinations.length > 0 && (
        <section className="panel">
          <div className="panel-header">
            <div>
              <div className="panel-kicker">MONTHLY COMBINATION MAP</div>
              <h2>{month} — Weekly Expiry Combinations</h2>
            </div>
            <span className="audit-badge">{weeklyCombinations.length} combinations</span>
          </div>
          <div className="combination-grid">
            {weeklyCombinations.map((c) => (
              <button key={c.id} className={`combination-card ${selectedCombination === c.id ? "selected" : ""}`} onClick={() => handleCombinationChange(c.id)}>
                <span>{c.id}</span>
                <b>COMBINATION {formatCombinationName(c.sensex_expiry, c.nifty_expiry)}</b>
                <small>SENSEX {formatDateForDisplay(c.sensex_expiry)} × NIFTY {formatDateForDisplay(c.nifty_expiry)}</small>
                <small>View From {formatDateForDisplay(c.view_from)} · {c.row_count} days</small>
              </button>
            ))}
          </div>
        </section>
      )}

      <section className="panel">
        <div className="panel-kicker">TEST SUMMARY</div>
        <h2>{mode === "weekly" ? "Weekly Analysis" : "Custom Configuration"}</h2>
        {mode === "weekly" ? (
          <div className="strategy-summary">
            <div><span>Month</span><b>{month || "—"}</b></div>
            <div><span>Combinations Found</span><b>{weeklyCombinations.length || "—"}</b></div>
            <div><span>Showing</span><b>{selectedCombination === "ALL" ? "All Combinations" : selectedCombination}</b></div>
            <div><span>Window</span><b>7 Days Before Earlier Expiry → Earlier Expiry</b></div>
            <div><span>Multiplier</span><b>{multiplier.toFixed(2)}</b></div>
            <div><span>DTE Filter</span><b>{minDte || "Any"} → {maxDte || "Any"}</b></div>
          </div>
        ) : (
          <div className="strategy-summary">
            <div><span>Data Range</span><b>{formatDateForDisplay(startDate)} → {formatDateForDisplay(endDate)}</b></div>
            <div><span>View From</span><b>{formatDateForDisplay(viewFromDate)}</b></div>
            <div><span>NIFTY Expiry</span><b>{formatDateForDisplay(niftyExpiry)}</b></div>
            <div><span>SENSEX Expiry</span><b>{formatDateForDisplay(sensexExpiry)}</b></div>
            <div><span>Multiplier</span><b>{multiplier.toFixed(2)}</b></div>
            <div><span>DTE Filter</span><b>{minDte || "Any"} → {maxDte || "Any"}</b></div>
          </div>
        )}
      </section>

      {displayRows.length > 0 && (
        <section
          className={`panel strategy-results ${strategyTableAutoFit ? "strategy-table-autofit" : ""} ${strategyTableCompact ? "strategy-table-compact" : ""}`}
          style={{
            ["--strategy-header-size" as string]: `${strategyTableHeaderSize}px`,
            ["--strategy-data-size" as string]: `${strategyTableDataSize}px`,
            ["--strategy-table-gap" as string]: `${strategyTableGap}px`,
            ["--strategy-header-color" as string]: strategyTableHeaderColor === "auto" ? undefined : strategyTableHeaderColor,
            ["--strategy-data-color" as string]: strategyTableDataColor === "auto" ? undefined : strategyTableDataColor,
          } as React.CSSProperties}
        >
          <div className="panel-header strategy-results-header">
            <div>
              <div className="panel-kicker">RESULTS</div>
              <h2>Day-wise Strategy Data</h2>
            </div>
            <div className="strategy-results-tools">
              <span className="table-tool-label">Header</span>
              <input className="strategy-table-size-input" type="number" min="8" max="30" step="1" value={strategyTableHeaderSize} onChange={(e) => setStrategyTableHeaderSize(Math.min(30, Math.max(8, Number(e.target.value) || 8)))} title="Header font size" />
              <span className="table-tool-label">Data</span>
              <input className="strategy-table-size-input" type="number" min="8" max="30" step="1" value={strategyTableDataSize} onChange={(e) => setStrategyTableDataSize(Math.min(30, Math.max(8, Number(e.target.value) || 8)))} title="Data font size" />
              <span className="table-tool-label">H Color</span>
              <select className="strategy-table-color-select" value={strategyTableHeaderColor} onChange={(e) => setStrategyTableHeaderColor(e.target.value)} title="Header font color">
                <option value="auto">Auto</option><option value="#334155">Slate</option><option value="#111827">Black</option><option value="#475569">Dark Gray</option><option value="#2563eb">Blue</option><option value="#4f46e5">Indigo</option><option value="#7c3aed">Purple</option><option value="#0f766e">Teal</option><option value="#15803d">Green</option><option value="#b45309">Amber</option><option value="#dc2626">Red</option><option value="#ffffff">White</option>
              </select>
              <span className="table-tool-label">D Color</span>
              <select className="strategy-table-color-select" value={strategyTableDataColor} onChange={(e) => setStrategyTableDataColor(e.target.value)} title="Data font color">
                <option value="auto">Auto</option><option value="#334155">Slate</option><option value="#111827">Black</option><option value="#475569">Dark Gray</option><option value="#2563eb">Blue</option><option value="#4f46e5">Indigo</option><option value="#7c3aed">Purple</option><option value="#0f766e">Teal</option><option value="#15803d">Green</option><option value="#b45309">Amber</option><option value="#dc2626">Red</option><option value="#ffffff">White</option>
              </select>
              <span className="table-tool-label">Gap</span>
              <input className="strategy-table-gap-input" type="number" min="0" max="24" step="1" value={strategyTableGap} onChange={(e) => setStrategyTableGap(Math.min(24, Math.max(0, Number(e.target.value) || 0)))} title="Table cell padding" />
              <button type="button" className={`table-tool-button ${strategyTableCompact ? "selected" : ""}`} onClick={() => setStrategyTableCompact((v) => !v)}>{strategyTableCompact ? "✓ Compact" : "Compact"}</button>
              <button type="button" className={`table-tool-button ${strategyTableAutoFit ? "selected" : ""}`} onClick={() => setStrategyTableAutoFit((v) => !v)} title="Fit columns to content without changing font size">{strategyTableAutoFit ? "✓ Auto Fit" : "Auto Fit"}</button>
              <span className="audit-badge">{displayRows.length} rows</span>
            </div>
          </div>
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  {mode === "weekly" && <th>COMBINATION</th>}
                  {mode === "weekly" && <th>VIEW FROM</th>}
                  <th>DATE</th>
                  <th>NIFTY EXPIRY</th>
                  <th>NIFTY DTE</th>
                  <th>NIFTY STRADDLE</th>
                  <th>SENSEX EXPIRY</th>
                  <th>SENSEX DTE</th>
                  <th>SENSEX STRADDLE</th>
                  <th>NIFTY × MULTIPLIER</th>
                  <th>SPREAD</th>
                  <th>VIX</th>
                </tr>
              </thead>
              <tbody>
                {displayRows.map((row, index) => (
                  <tr
                    key={`${(row as any)["Combination ID"] || "CUSTOM"}-${row.Date}-${index}`}
                    className={
                      mode === "weekly" && index > 0 &&
                      (row as any)["Combination ID"] !== (displayRows[index - 1] as any)?.["Combination ID"]
                        ? "strategy-combination-start"
                        : ""
                    }
                  >
                    {mode === "weekly" && <td><b>{formatCombinationName((row as any)["SENSEX Expiry"] || sensexExpiry, (row as any)["NIFTY Expiry"] || niftyExpiry)}</b></td>}
                    {mode === "weekly" && <td>{formatDateForDisplay((row as any)["View From"] || "")}</td>}
                    <td>{formatDateForDisplay(row.Date)}</td>
                    <td>{formatDateForDisplay((row as any)["NIFTY Expiry"] || niftyExpiry)}</td>
                    <td>{(row as any)["NIFTY DTE"] ?? daysBetween(row.Date, (row as any)["NIFTY Expiry"] || niftyExpiry) ?? "—"}</td>
                    <td>{formatNumber(row["NIFTY Straddle"])}</td>
                    <td>{formatDateForDisplay((row as any)["SENSEX Expiry"] || sensexExpiry)}</td>
                    <td>{(row as any)["SENSEX DTE"] ?? daysBetween(row.Date, (row as any)["SENSEX Expiry"] || sensexExpiry) ?? "—"}</td>
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