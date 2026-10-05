import { useEffect, useMemo, useState } from "react";

type MatchLabelPlayer = {
  name: string;
  hi: string;
  ph: string;
  shots: string;
};

type MatchLabelGroup = {
  groupNumber: number;
  ramsdale: MatchLabelPlayer[];
  visitors: MatchLabelPlayer[];
};

type MatchSheetData = {
  homeTeam: string;
  visitingTeam: string;
  groups: MatchLabelGroup[];
  sourceFileName: string;
  importedAt: string;
};

type MatchBookletRecord = {
  id: string;
  title: string;
  matchDate: string;
  matchSheetData?: MatchSheetData | null;
};

const DB_NAME = "eventDeskMatchBookletLibrary";
const DB_VERSION = 1;
const BOOKLETS_STORE = "booklets";
const DRAFTS_STORE = "drafts";
const ACTIVE_BOOKLET_KEY = "eventDeskMatchBookletsActiveId";

const openDb = () =>
  new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });

const getRecord = async <T,>(storeName: string, key: IDBValidKey) => {
  const db = await openDb();
  try {
    return await new Promise<T | undefined>((resolve, reject) => {
      const tx = db.transaction(storeName, "readonly");
      const req = tx.objectStore(storeName).get(key);
      req.onsuccess = () => resolve(req.result as T | undefined);
      req.onerror = () => reject(req.error);
    });
  } finally {
    db.close();
  }
};

const MatchScorecardLabels = () => {
  const [data, setData] = useState<MatchSheetData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const activeId = localStorage.getItem(ACTIVE_BOOKLET_KEY);
        let sheet: MatchSheetData | null = null;

        if (activeId) {
          const record = await getRecord<MatchBookletRecord>(BOOKLETS_STORE, activeId);
          sheet = record?.matchSheetData ?? null;
        }

        if (!sheet) {
          const draft = await getRecord<{ matchSheetData?: MatchSheetData | null }>(
            DRAFTS_STORE,
            "current",
          );
          sheet = draft?.matchSheetData ?? null;
        }

        if (!cancelled) setData(sheet);
      } catch (error) {
        console.error("Unable to load match label data", error);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  const labels = useMemo(() => {
    if (!data) return [];
    return data.groups.flatMap((group) => {
      if (group.ramsdale.length < 2 || group.visitors.length < 2) return [];
      return [
        {
          key: `${group.groupNumber}-ramsdale`,
          group: group.groupNumber,
          title: "Ramsdale Park GC",
          players: [...group.ramsdale, ...group.visitors],
          homeCount: 2,
        },
        {
          key: `${group.groupNumber}-visitor`,
          group: group.groupNumber,
          title: data.visitingTeam || "Visiting Team",
          players: [...group.visitors, ...group.ramsdale],
          homeCount: 2,
        },
      ];
    });
  }, [data]);

  const printLabels = () => {
    const printWindow = window.open("", "_blank", "width=900,height=700");
    if (!printWindow) return;

    const escapeHtml = (value: string | number) =>
      String(value ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");

    const pages = labels
      .map((label) => {
        const rows = label.players
          .map(
            (player, index) => `
              <div class="row ${index < label.homeCount ? "owner" : "opponent"}">
                <span class="name">${escapeHtml(player.name)}</span>
                <span>${escapeHtml(player.hi)}</span>
                <span>${escapeHtml(player.ph)}</span>
                <span>${escapeHtml(player.shots)}</span>
              </div>`,
          )
          .join("");

        return `
          <section class="label">
            <div class="label-inner">
            <div class="title">
              <span>${escapeHtml(label.title)}</span>
              <span class="match">Match ${escapeHtml(label.group)}</span>
            </div>
            <div class="head">
              <span></span><span>HI</span><span>PH</span><span>Shots Diff</span>
            </div>
            ${rows}
            </div>
          </section>`;
      })
      .join("");

    printWindow.document.open();
    printWindow.document.write(`<!doctype html>
<html>
<head>
<meta charset="utf-8">
<title>Match Scorecard Labels</title>
<style>
@page { size: 29mm 60mm; margin: 0; }
* { box-sizing: border-box; }
html, body { width:29mm; margin:0; padding:0; font-family:Arial, Helvetica, sans-serif; color:#000; background:#fff; }
.label {
  box-sizing:border-box;
  width:60mm;
  height:29mm;
  margin:0;
  padding:0.8mm 1.3mm;
  overflow:hidden;
  display:flex;
  flex-direction:column;
  transform:rotate(90deg) translateY(-29mm);
  transform-origin:top left;
  break-after:page;
  page-break-after:always;
}
.label:last-child { break-after:auto; page-break-after:auto; }
.label-inner {
  width:100%;
  height:100%;
  padding:1mm 2.2mm 0 2.2mm;
  overflow:hidden;
  display:flex;
  flex-direction:column;
}
.title {
  font-size:8.6pt;
  line-height:1;
  font-weight:700;
  display:flex;
  justify-content:space-between;
  gap:1mm;
  margin-bottom:0.25mm;
  white-space:nowrap;
}
.match { font-size:7.1pt; font-weight:700; }
.head, .row {
  display:grid;
  grid-template-columns:minmax(0,1fr) 7mm 7mm 12mm;
  align-items:center;
}
.head {
  font-size:6.6pt;
  line-height:1;
  font-weight:700;
  min-height:3.5mm;
  border-bottom:0.2mm solid #777;
}
.row {
  font-size:7.1pt;
  line-height:1;
  flex:1;
  min-height:0;
  border-bottom:0.15mm solid #ccc;
}
.row:last-child { border-bottom:0; }
.head > span:not(:first-child), .row > span:not(:first-child) {
  text-align:center;
  border-left:0.15mm solid #ccc;
  height:100%;
  display:flex;
  align-items:center;
  justify-content:center;
}
.name {
  padding-left:0.5mm;
  white-space:nowrap;
  overflow:hidden;
  text-overflow:ellipsis;
  font-weight:700;
}
@media screen {
  body { background:#e5e7eb; padding:10mm; }
  .label { background:white; margin:0 auto 8mm; box-shadow:0 2px 10px rgba(0,0,0,.18); }
}
</style>
</head>
<body>${pages}<script>window.addEventListener("load",()=>{window.setTimeout(()=>window.print(),250);});<\/script></body>
</html>`);
    printWindow.document.close();
  };

  if (loading) {
    return <div style={{ padding: 36 }}>Loading match scorecard labels…</div>;
  }

  if (!data || labels.length === 0) {
    return (
      <div style={{ padding: 36, maxWidth: 900, margin: "0 auto" }}>
        <div style={cardStyle}>
          <h1 style={headingStyle}>Match Scorecard Labels</h1>
          <p style={mutedStyle}>
            No match label data is available yet. Import the Match Start Sheet PDF in
            Booklets first.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="match-label-page" style={{ padding: "28px 32px 50px", maxWidth: 1180, margin: "0 auto" }}>
      <style>{`
        .match-label-print-area { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 18px; }
        .match-label { box-sizing: border-box; width: 100%; height: 260px; border: 1px solid #b8c7d8; border-radius: 12px; background: white; padding: 8px 10px; overflow: hidden; display:flex; flex-direction:column; }
        .match-label-title { font-size: 22px; line-height:1.05; font-weight: 800; color: #163f6f; margin-bottom: 3px; display:flex; justify-content:space-between; gap:8px; }
        .match-label-title span:last-child { color:#64748b; font-size:13px; align-self:center; white-space:nowrap; }
        .match-label-head, .match-label-row { display:grid; grid-template-columns:minmax(0,1fr) 48px 48px 62px; align-items:center; }
        .match-label-head { font-size:14px; line-height:1; font-weight:800; color:#475569; border-bottom:1px solid #9fb2c6; min-height:30px; }
        .match-label-row { font-size:20px; line-height:1; flex:1; min-height:0; border-bottom:1px solid #e2e8f0; }
        .match-label-row:last-child { border-bottom:0; }
        .match-label-row.owner { background:#eef7ed; font-weight:700; }
        .match-label-row.opponent { background:#f5f8fc; }
        .match-label-head > span:not(:first-child), .match-label-row > span:not(:first-child) { text-align:center; border-left:1px solid #d7e0ea; height:100%; display:flex; align-items:center; justify-content:center; }
        .match-label-name { padding-left:5px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; font-weight:700; }
      `}</style>

      <div style={{ ...cardStyle, marginBottom: 20, display: "flex", justifyContent: "space-between", alignItems: "center", gap: 20 }}>
        <div>
          <h1 style={headingStyle}>Match Scorecard Labels</h1>
          <p style={{ ...mutedStyle, marginBottom: 0 }}>
            {data.homeTeam} v {data.visitingTeam} • {data.groups.length} matches • {labels.length} labels
          </p>
        </div>
        <button type="button" onClick={printLabels} style={buttonStyle}>
          Print Labels
        </button>
      </div>

      <div className="match-label-print-area">
        {labels.map((label) => (
          <div className="match-label" key={label.key}>
            <div className="match-label-title">
              <span>{label.title}</span>
              <span>Match {label.group}</span>
            </div>
            <div className="match-label-head">
              <span />
              <span>HI</span>
              <span>PH</span>
              <span>Shots Diff</span>
            </div>
            {label.players.map((player, index) => (
              <div
                className={`match-label-row ${index < label.homeCount ? "owner" : "opponent"}`}
                key={`${label.key}-${index}-${player.name}`}
              >
                <span className="match-label-name">{player.name}</span>
                <span>{player.hi}</span>
                <span>{player.ph}</span>
                <span>{player.shots}</span>
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
};

const cardStyle = {
  background: "white",
  border: "1px solid #dbe7f3",
  borderRadius: 14,
  padding: 24,
  boxShadow: "0 2px 8px rgba(31,91,159,0.06)",
} as const;

const headingStyle = {
  margin: "0 0 8px",
  color: "#1e4f89",
} as const;

const mutedStyle = {
  margin: 0,
  color: "#64748b",
  lineHeight: 1.55,
} as const;

const buttonStyle = {
  border: 0,
  borderRadius: 10,
  padding: "11px 18px",
  background: "#1f5b9f",
  color: "white",
  fontWeight: 800,
  cursor: "pointer",
} as const;

export default MatchScorecardLabels;
