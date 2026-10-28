import { useEffect, useMemo, useState } from "react";

type PrizeSource = "Donated" | "Section Purchased";
type PrizeStatus = "Available" | "Allocated" | "Awarded" | "Issued";
interface PrizeRecord {
  id: string;
  description: string;
  source: PrizeSource;
  donorSupplier: string;
  dateReceived: string;
  estimatedValue: number;
  purchaseCost: number;
  status: PrizeStatus;
  recipient: string;
  eventName: string;
  dateAwarded: string;
  dateIssued?: string;
  notes: string;
}
const STORAGE_KEY = "ramsdaleSeniorsPrizeBankV1";
const today = () => new Date().toLocaleDateString("en-CA");
const blank = (): PrizeRecord => ({ id: "", description: "", source: "Donated", donorSupplier: "", dateReceived: today(), estimatedValue: 0, purchaseCost: 0, status: "Available", recipient: "", eventName: "", dateAwarded: "", notes: "" });
const load = (): PrizeRecord[] => {
  try {
    const value: unknown = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
    return Array.isArray(value) ? value.filter((v): v is PrizeRecord => !!v && typeof v === "object" && typeof v.id === "string") : [];
  } catch { return []; }
};
const gbp = (n: number) => new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP" }).format(Number(n) || 0);
const field: React.CSSProperties = { width: "100%", minWidth: 0, padding: "9px 10px", border: "1px solid #b8cce2", borderRadius: 8, boxSizing: "border-box" };
const button: React.CSSProperties = { padding: "10px 16px", border: "1px solid #2468b3", borderRadius: 9, background: "#205b9f", color: "white", cursor: "pointer", fontWeight: 700 };
const panel: React.CSSProperties = { background: "white", border: "1px solid #dbe7f3", borderRadius: 12, padding: 18 };

export default function PrizeBank({ onBack }: { onBack: () => void }) {
  const [prizes, setPrizes] = useState<PrizeRecord[]>(load);
  const [editing, setEditing] = useState<PrizeRecord | null>(null);
  const [view, setView] = useState<"Current" | "Archive">("Current");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [sortBy, setSortBy] = useState("Priority");
  const [message, setMessage] = useState("");
  useEffect(() => { localStorage.setItem(STORAGE_KEY, JSON.stringify(prizes)); }, [prizes]);
  const current = prizes.filter(p => p.status !== "Issued");
  const archive = prizes.filter(p => p.status === "Issued");
  const priority: Record<PrizeStatus, number> = { Awarded: 0, Allocated: 1, Available: 2, Issued: 3 };
  const statusColours: Record<PrizeStatus, { background: string; border: string; text: string }> = {
    Available: { background: "#ecfdf3", border: "#22c55e", text: "#166534" },
    Allocated: { background: "#fffbeb", border: "#f59e0b", text: "#92400e" },
    Awarded: { background: "#fef2f2", border: "#ef4444", text: "#991b1b" },
    Issued: { background: "#f1f5f9", border: "#94a3b8", text: "#475569" },
  };
  const visible = useMemo(() => prizes.filter(p =>
    (view === "Archive" ? p.status === "Issued" : p.status !== "Issued") &&
    (statusFilter === "All" || p.status === statusFilter) &&
    [p.description, p.donorSupplier, p.recipient, p.eventName, p.notes].join(" ").toLowerCase().includes(search.toLowerCase())
  ).sort((a, b) => sortBy === "Name" ? a.description.localeCompare(b.description)
    : sortBy === "Newest" ? (b.dateReceived || "").localeCompare(a.dateReceived || "")
    : sortBy === "Value" ? b.estimatedValue - a.estimatedValue
    : priority[a.status] - priority[b.status] || a.description.localeCompare(b.description)), [prizes, view, search, statusFilter, sortBy]);
  const heldValue = current.reduce((s, p) => s + Number(p.estimatedValue || 0), 0);
  const totalCost = prizes.filter(p => p.source === "Section Purchased").reduce((s, p) => s + Number(p.purchaseCost || 0), 0);
  const update = <K extends keyof PrizeRecord>(key: K, value: PrizeRecord[K]) => setEditing(p => p ? { ...p, [key]: value } : p);
  const input = (label: string, key: keyof PrizeRecord, type = "text") => <label style={{ display: "grid", gap: 5, fontSize: 14, fontWeight: 600 }}>{label}<input style={field} type={type} value={editing ? String(editing[key] ?? "") : ""} onChange={e => update(key, (type === "number" ? Number(e.target.value) : e.target.value) as never)} /></label>;
  function save() {
    if (!editing) return;
    if (!editing.description.trim()) { setMessage("Enter a prize description."); return; }
    if (editing.estimatedValue < 0 || editing.purchaseCost < 0) { setMessage("Values cannot be negative."); return; }
    if ((editing.status === "Awarded" || editing.status === "Issued") && !editing.recipient.trim()) { setMessage("Enter the recipient before marking the prize Awarded or Issued."); return; }
    const updated: PrizeRecord = { ...editing, id: editing.id || (crypto.randomUUID?.() ?? `prize-${Date.now()}`), dateAwarded: (editing.status === "Awarded" || editing.status === "Issued") ? (editing.dateAwarded || today()) : "", dateIssued: editing.status === "Issued" ? (editing.dateIssued || today()) : "" };
    setPrizes(prev => prev.some(p => p.id === updated.id) ? prev.map(p => p.id === updated.id ? updated : p) : [...prev, updated]);
    setEditing(null); setView(updated.status === "Issued" ? "Archive" : "Current"); setStatusFilter("All"); setMessage(updated.status === "Issued" ? "Prize moved to Issued Archive." : "Prize saved.");
  }
  function remove(p: PrizeRecord) {
    if (!window.confirm(`Delete ${p.description}? This cannot be undone.`)) return;
    setPrizes(prev => prev.filter(x => x.id !== p.id)); setMessage("Prize deleted.");
  }
  return <section style={{ maxWidth: 1160, margin: "0 auto", padding: "28px 24px 50px", color: "#334155" }}>
    <style>{`@media print { @page { size: A4 landscape; margin: 12mm; } body * { visibility: hidden !important; } .prize-bank-print, .prize-bank-print * { visibility: visible !important; } .prize-bank-print { display: block !important; position: absolute; top: 0; left: 0; width: 100%; background: white; font: 11px Arial; } .prize-bank-print table { width: 100%; border-collapse: collapse; } .prize-bank-print th, .prize-bank-print td { border: 1px solid #ccd7e5; padding: 7px; text-align: left; } .prize-bank-print th { background: #eaf2fb; } } @media screen { .prize-bank-print { display: none; } }`}</style>
    <div className="prize-bank-print"><h1>RAMSDALE SENIORS — PRIZE BANK</h1><p>{view === "Archive" ? "Issued Archive" : "Current Prize Bank"} · {new Date().toLocaleDateString("en-GB")} · {visible.length} records</p><table><thead><tr><th>Prize</th><th>Source</th><th>Donor / Supplier</th><th>Received</th><th>Status</th><th>Recipient</th><th>Event</th><th>Awarded / Issued</th><th>Value</th><th>Cost</th></tr></thead><tbody>{visible.map(p => <tr key={p.id}><td>{p.description}</td><td>{p.source}</td><td>{p.donorSupplier}</td><td>{p.dateReceived}</td><td>{p.status}</td><td>{p.recipient}</td><td>{p.eventName}</td><td>{p.dateAwarded}{p.dateIssued ? ` / ${p.dateIssued}` : ""}</td><td>{gbp(p.estimatedValue)}</td><td>{gbp(p.purchaseCost)}</td></tr>)}</tbody></table></div>
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12, marginBottom: 22 }}><div><h1 style={{ margin: 0, color: "#205b9f" }}>Prize Bank</h1><p style={{ margin: "6px 0 0" }}>Physical prizes — donated or section purchased</p></div><div style={{ display: "flex", gap: 8 }}><button style={button} onClick={() => { setEditing(blank()); setMessage(""); }}>+ Add Prize</button><button style={{ ...button, background: "white", color: "#205b9f" }} onClick={() => window.print()}>Print / PDF</button><button style={{ ...button, background: "white", color: "#205b9f" }} onClick={onBack}>Main Menu</button></div></div>
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 10, marginBottom: 18 }}>{([ ["Prizes Held", current.length], ["Available", current.filter(p => p.status === "Available").length], ["Allocated", current.filter(p => p.status === "Allocated").length], ["Awarded, Not Issued", current.filter(p => p.status === "Awarded").length], ["Held Prize Value", gbp(heldValue)], ["Section Purchase Cost", gbp(totalCost)] ] as [string, string | number][]).map(([label, value]) => <div style={panel} key={label}><div style={{ fontSize: 13, color: "#64748b" }}>{label}</div><strong style={{ display: "block", marginTop: 6, fontSize: 22, color: "#205b9f" }}>{value}</strong></div>)}</div>
    {message && <p role="status" style={{ color: "#205b9f", fontWeight: 600 }}>{message}</p>}
    {editing && <div style={{ ...panel, marginBottom: 20 }}><h2 style={{ marginTop: 0, color: "#205b9f" }}>{editing.id ? "Edit Prize" : "New Prize"}</h2><div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 14 }}>{input("Prize Description *", "description")}<label style={{ display: "grid", gap: 5 }}>Source<select style={field} value={editing.source} onChange={e => update("source", e.target.value as PrizeSource)}><option>Donated</option><option>Section Purchased</option></select></label>{input("Donor / Supplier", "donorSupplier")}{input("Date Received", "dateReceived", "date")}{input("Estimated Value (£)", "estimatedValue", "number")}{editing.source === "Section Purchased" && input("Purchase Cost (£)", "purchaseCost", "number")}<label style={{ display: "grid", gap: 5 }}>Status<select style={field} value={editing.status} onChange={e => update("status", e.target.value as PrizeStatus)}><option>Available</option><option>Allocated</option><option>Awarded</option><option>Issued</option></select></label>{input("Recipient / Winner", "recipient")}{input("Competition / Event", "eventName")}{(editing.status === "Awarded" || editing.status === "Issued") && input("Date Awarded", "dateAwarded", "date")}{editing.status === "Issued" && input("Date Issued", "dateIssued", "date")}{input("Notes", "notes")}</div><p style={{ fontSize: 13, color: "#64748b" }}>Allocated means the prize is still physically held. Awarded means the winner is known but the prize is still physically held. Only Issued means handed over and moves to the archive. Purchase costs are not posted to Event Financials.</p><div style={{ display: "flex", gap: 10 }}><button style={button} onClick={save}>Save Prize</button><button style={{ ...button, background: "white", color: "#205b9f" }} onClick={() => { setEditing(null); setMessage(""); }}>Cancel</button></div></div>}
    <div style={{ display: "flex", gap: 10, marginBottom: 14, flexWrap: "wrap" }}><button style={{ ...button, background: view === "Current" ? "#205b9f" : "white", color: view === "Current" ? "white" : "#205b9f" }} onClick={() => { setView("Current"); setStatusFilter("All"); }}>Current Prize Bank ({current.length})</button><button style={{ ...button, background: view === "Archive" ? "#205b9f" : "white", color: view === "Archive" ? "white" : "#205b9f" }} onClick={() => { setView("Archive"); setStatusFilter("All"); }}>Issued Archive ({archive.length})</button></div>
    <div style={{ ...panel, marginBottom: 14, display: "grid", gridTemplateColumns: "minmax(200px, 1fr) 180px 180px", gap: 12 }}>
      <input style={field} value={search} onChange={e => setSearch(e.target.value)} placeholder="Search prize, supplier, winner or event" aria-label="Search prizes" />
      <select style={field} value={statusFilter} onChange={e => setStatusFilter(e.target.value)} aria-label="Filter by status"><option value="All">All statuses</option>{(view === "Current" ? ["Awarded", "Allocated", "Available"] : ["Issued"]).map(status => <option key={status}>{status}</option>)}</select>
      <select style={field} value={sortBy} onChange={e => setSortBy(e.target.value)} aria-label="Sort prizes"><option value="Priority">Sort: Status priority</option><option value="Name">Sort: Prize name</option><option value="Newest">Sort: Newest first</option><option value="Value">Sort: Highest value</option></select>
    </div>
    <div style={{ display: "grid", gap: 9 }}>{visible.length === 0 && <div style={panel}>{view === "Archive" ? "No issued prizes archived yet." : "No prizes currently held."}</div>}{visible.map(p => <div key={p.id} style={{ ...panel, background: statusColours[p.status].background, border: `2px solid ${statusColours[p.status].border}` }}><div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}><div><strong style={{ color: "#205b9f", fontSize: 17 }}>{p.description}</strong><div style={{ marginTop: 4 }}>{p.source} · {p.donorSupplier || "Source not recorded"} · <strong style={{ color: statusColours[p.status].text }}>{p.status}</strong></div><div style={{ fontSize: 13, color: "#64748b", marginTop: 5 }}>Estimated {gbp(p.estimatedValue)}{p.source === "Section Purchased" ? ` · Cost ${gbp(p.purchaseCost)}` : ""}{p.recipient ? ` · Recipient: ${p.recipient}` : ""}{p.eventName ? ` · ${p.eventName}` : ""}</div></div><div style={{ display: "flex", gap: 7 }}><button style={button} onClick={() => { setEditing({ ...p }); setMessage(""); }}>Edit</button><button style={{ ...button, background: "white", color: "#b91c1c", borderColor: "#fecaca" }} onClick={() => remove(p)}>Delete</button></div></div></div>)}</div>
  </section>;
}
