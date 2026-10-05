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

  const printLabels = () => window.print();

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
        @media print {
          @page { size: 60mm 29mm; margin: 0; }
          body * { visibility: hidden !important; }
          .match-label-print-area, .match-label-print-area * { visibility: visible !important; }
          .match-label-print-area { position:absolute; left:0; top:0; display:block; }
          .match-label {
            width:60mm !important; height:29mm !important; aspect-ratio:auto !important;
            border:0 !important; border-radius:0 !important; padding:0.65mm 1mm !important; display:flex !important; flex-direction:column !important;
            break-after:page; page-break-after:always;
          }
          .match-label-title { font-size:10.5pt !important; line-height:1 !important; margin-bottom:0.25mm !important; }
          .match-label-title span:last-child { font-size:8pt !important; }
          .match-label-head { font-size:7.5pt !important; min-height:3.5mm !important; line-height:1 !important; }
          .match-label-row { font-size:10pt !important; line-height:1 !important; min-height:0 !important; flex:1 !important; }
          .match-label-head, .match-label-row { grid-template-columns:minmax(0,1fr) 7mm 7mm 12mm !important; }
        }
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
