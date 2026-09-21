from pathlib import Path

ROOT = Path(r"C:\Users\baps\Desktop\nifty-sensex-combined-test")
APP = ROOT / "frontend" / "src" / "App.tsx"

text = APP.read_text(encoding="utf-8")
original = text

old = '  return (\\n    <div className={`app theme-${theme} ${compact ? "compact" : ""}`}>'

css = r'''  return (
    <>
      <style>{`
        /* OPTIONS LAB - FULL WIDTH UI UPGRADE */
        .app .main {
          width: calc(100vw - 215px) !important;
          max-width: none !important;
          flex: 1 1 auto !important;
          min-width: 0 !important;
        }

        .app .main > * {
          width: 100% !important;
          max-width: none !important;
        }

        .app .market-grid {
          grid-template-columns: repeat(4, minmax(0, 1fr)) !important;
        }

        .app .control-grid {
          grid-template-columns: repeat(6, minmax(145px, 1fr)) !important;
        }

        .app .analytics-grid {
          grid-template-columns: minmax(0, 2.15fr) minmax(300px, 0.85fr) !important;
        }

        .app .table-panel {
          width: 100% !important;
        }

        .app .table-wrapper {
          width: 100% !important;
          overflow-x: auto !important;
          overflow-y: hidden !important;
        }

        .app .table-wrapper table {
          width: 100% !important;
          min-width: 1120px !important;
          table-layout: auto !important;
        }

        .app .table-wrapper th,
        .app .table-wrapper td {
          white-space: nowrap !important;
        }

        .app.compact .control-grid {
          grid-template-columns: repeat(6, minmax(120px, 1fr)) !important;
        }

        @media (max-width: 1100px) {
          .app .control-grid {
            grid-template-columns: repeat(3, minmax(140px, 1fr)) !important;
          }

          .app .market-grid {
            grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
          }
        }

        @media (max-width: 760px) {
          .app .main {
            width: 100% !important;
          }

          .app .analytics-grid {
            grid-template-columns: 1fr !important;
          }

          .app .control-grid,
          .app .market-grid {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>

      <div className={`app theme-${theme} ${compact ? "compact" : ""}`>'''

if old not in text:
    raise SystemExit("ERROR: App return section not found. No changes made.")

text = text.replace(old, css, 1)

old_end = '    </div>\\n  );\\n}'
new_end = '    </div>\\n    </>\\n  );\\n}'
if old_end not in text:
    raise SystemExit("ERROR: App closing section not found. No changes made.")
text = text.replace(old_end, new_end, 1)

old_header = '''                <th>NIFTY Spot</th>
                <th>NIFTY Straddle</th>
                <th>SENSEX Spot</th>
                <th>SENSEX Straddle</th>
                <th>NIFTY × {multiplier}</th>
                <th>Spread</th>
                <th>VIX</th>'''

new_header = '''                <th>NIFTY Spot</th>
                <th>NIFTY Final Strike</th>
                <th>NIFTY Straddle</th>
                <th>SENSEX Spot</th>
                <th>SENSEX Final Strike</th>
                <th>SENSEX Straddle</th>
                <th>NIFTY × {multiplier}</th>
                <th>Spread</th>
                <th>VIX</th>'''

if old_header not in text:
    raise SystemExit("ERROR: Table header not found. No changes made.")
text = text.replace(old_header, new_header, 1)

text = text.replace('colSpan={8}', 'colSpan={10}', 1)

old_props = '''                      ns={formatNumber(
                        row["NIFTY Straddle"]
                      )}
                      s={formatNumber(
                        row["SENSEX Spot"]
                      )}
                      ss={formatNumber(
                        row["SENSEX Straddle"]
                      )}'''

new_props = '''                      ns={formatNumber(
                        row["NIFTY Straddle"]
                      )}
                      nfs={formatNumber(
                        row["NIFTY Final Strike"],
                        0
                      )}
                      s={formatNumber(
                        row["SENSEX Spot"]
                      )}
                      sfs={formatNumber(
                        row["SENSEX Final Strike"],
                        0
                      )}
                      ss={formatNumber(
                        row["SENSEX Straddle"]
                      )}'''

if old_props not in text:
    raise SystemExit("ERROR: Row props not found. No changes made.")
text = text.replace(old_props, new_props, 1)

old_sig = '''function Row({
  d,
  n,
  ns,
  s,
  ss,
  a,
  sp,
  v,
}: {
  d: string;
  n: string;
  ns: string;
  s: string;
  ss: string;
  a: string;
  sp: string;
  v: string;
}) {'''

new_sig = '''function Row({
  d,
  n,
  ns,
  nfs,
  s,
  sfs,
  ss,
  a,
  sp,
  v,
}: {
  d: string;
  n: string;
  ns: string;
  nfs: string;
  s: string;
  sfs: string;
  ss: string;
  a: string;
  sp: string;
  v: string;
}) {'''

if old_sig not in text:
    raise SystemExit("ERROR: Row signature not found. No changes made.")
text = text.replace(old_sig, new_sig, 1)

old_cells = '''      <td>{d}</td>
      <td>{n}</td>
      <td>{ns}</td>
      <td>{s}</td>
      <td>{ss}</td>
      <td>{a}</td>'''

new_cells = '''      <td>{d}</td>
      <td>{n}</td>
      <td>{nfs}</td>
      <td>{ns}</td>
      <td>{s}</td>
      <td>{sfs}</td>
      <td>{ss}</td>
      <td>{a}</td>'''

if old_cells not in text:
    raise SystemExit("ERROR: Row cells not found. No changes made.")
text = text.replace(old_cells, new_cells, 1)

backup = APP.with_name("App.tsx.before_ui_upgrade.bak")
if not backup.exists():
    backup.write_text(original, encoding="utf-8")

APP.write_text(text, encoding="utf-8")

print("SUCCESS")
print("Updated:", APP)
print("Backup :", backup)
print("Changes: full-width layout + final strike columns.")
