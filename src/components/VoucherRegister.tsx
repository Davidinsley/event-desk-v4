import { useEffect, useMemo, useState } from "react";

// Independent storage: no Event Desk event or player records are changed.
export const VOUCHER_STORAGE_KEY = "eventDeskVoucherRegisterV1";
export const VOUCHER_AMBER_DAYS = 60;
export const VOUCHER_RED_DAYS = 30;

export type VoucherDirection = "In" | "Out";
export type VoucherStatus = "Available" | "Allocated" | "Issued" | "Redeemed" | "Expired";
export type VoucherType = "Four-Ball Golf" | "Meals" | "Driving Range" | "Buggies" | "Golf Lessons" | "Pro Shop" | "Other";

export interface VoucherRecord {
  id: string;
  direction: VoucherDirection;
  type: VoucherType;
  description: string;
  club: string;
  dateReceived: string;
  reference: string;
  expiryDate: string;
  status: VoucherStatus;
  recipient: string;
  fundraisingEvent: string;
  estimatedValue: number;
  actualProceeds: number;
  bundleId: string;
  notes: string;
  linkedVoucherId: string;
}

const TYPES: VoucherType[] = ["Four-Ball Golf", "Meals", "Driving Range", "Buggies", "Golf Lessons", "Pro Shop", "Other"];
const STATUSES: VoucherStatus[] = ["Available", "Allocated", "Issued", "Redeemed", "Expired"];
const emptyVoucher = (): VoucherRecord => ({
  id: "", direction: "In", type: "Four-Ball Golf", description: "", club: "", dateReceived: new Date().toLocaleDateString("en-CA"),
  reference: "", expiryDate: "", status: "Available", recipient: "", fundraisingEvent: "", estimatedValue: 0,
  actualProceeds: 0, bundleId: "", notes: "", linkedVoucherId: "",
});

export function loadVouchers(): VoucherRecord[] {
  try {
    const parsed: unknown = JSON.parse(localStorage.getItem(VOUCHER_STORAGE_KEY) || "[]");
    return Array.isArray(parsed) ? parsed.filter((item): item is VoucherRecord => !!item && typeof item === "object" && typeof item.id === "string") : [];
  } catch { return []; }
}

export function daysUntilVoucherExpiry(expiryDate: string, today = new Date()): number | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(expiryDate)) return null;
  const [year, month, day] = expiryDate.split("-").map(Number);
  const expiry = new Date(year, month - 1, day);
  if (expiry.getFullYear() !== year || expiry.getMonth() !== month - 1 || expiry.getDate() !== day) return null;
  return Math.round((Date.UTC(year, month - 1, day) - Date.UTC(today.getFullYear(), today.getMonth(), today.getDate())) / 86400000);
}

export function voucherWarning(voucher: VoucherRecord): "red" | "amber" | null {
  if (voucher.status === "Redeemed" || voucher.status === "Expired") return null;
  const days = daysUntilVoucherExpiry(voucher.expiryDate);
  if (days === null) return null;
  if (days <= VOUCHER_RED_DAYS) return "red";
  if (days <= VOUCHER_AMBER_DAYS) return "amber";
  return null;
}

const money = (amount: number) => new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP" }).format(amount || 0);
const panel: React.CSSProperties = { background: "white", border: "1px solid #dbe7f3", borderRadius: 12, padding: 18 };
const field: React.CSSProperties = { width: "100%", minWidth: 0, padding: "9px 10px", border: "1px solid #b8cce2", borderRadius: 8, boxSizing: "border-box" };
const button: React.CSSProperties = { padding: "10px 16px", border: "1px solid #2468b3", borderRadius: 9, background: "#205b9f", color: "white", cursor: "pointer", fontWeight: 700 };

type Props = { onBack: () => void; initialVoucherId?: string | null };

export default function VoucherRegister({ onBack, initialVoucherId }: Props) {
  const [vouchers, setVouchers] = useState<VoucherRecord[]>(loadVouchers);
  const [editing, setEditing] = useState<VoucherRecord | null>(null);
  const [filter, setFilter] = useState<"All" | VoucherDirection>("All");
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(initialVoucherId || null);
  const [message, setMessage] = useState("");

  useEffect(() => { localStorage.setItem(VOUCHER_STORAGE_KEY, JSON.stringify(vouchers)); window.dispatchEvent(new Event("eventDeskVouchersChanged")); }, [vouchers]);
  useEffect(() => {
    if (!initialVoucherId) return;
    const match = vouchers.find(v => v.id === initialVoucherId);
    if (!match) return;
    setSelectedId(match.id);
    setFilter("All");
    setSearch("");
    setEditing({ ...match });
    setMessage("");
  }, [initialVoucherId]);

  const selected = vouchers.find(v => v.id === selectedId);
  const visible = useMemo(() => vouchers.filter(v => (filter === "All" || v.direction === filter) &&
    [v.description, v.club, v.reference, v.recipient, v.fundraisingEvent, v.type].join(" ").toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => (a.expiryDate || "9999").localeCompare(b.expiryDate || "9999")), [vouchers, filter, search]);
  const totals = useMemo(() => ({
    incoming: vouchers.filter(v => v.direction === "In").length,
    outgoing: vouchers.filter(v => v.direction === "Out").length,
    available: vouchers.filter(v => v.direction === "In" && v.status === "Available").length,
    estimated: vouchers.filter(v => v.direction === "In").reduce((sum, v) => sum + (Number(v.estimatedValue) || 0), 0),
    // Bundle proceeds are entered on ONE voucher only to prevent double-counting.
    proceeds: vouchers.filter(v => v.direction === "In").reduce((sum, v) => sum + (Number(v.actualProceeds) || 0), 0),
  }), [vouchers]);

  // The report uses the current Show and Search filters. The browser print
  // dialog supports both physical printing and Save as PDF.
  const reportTotals = useMemo(() => ({
    estimated: visible.reduce((sum, v) => sum + (Number(v.estimatedValue) || 0), 0),
    proceeds: visible.reduce((sum, v) => sum + (Number(v.actualProceeds) || 0), 0),
  }), [visible]);

  function printReport() {
    window.print();
  }

  function saveVoucher() {
    if (!editing) return;
    if (!editing.club.trim()) { setMessage("Enter a club or donor name."); return; }
    if (editing.estimatedValue < 0 || editing.actualProceeds < 0) { setMessage("Values cannot be negative."); return; }
    const updated = { ...editing, id: editing.id || (crypto.randomUUID?.() ?? `voucher-${Date.now()}`) };
    setVouchers(previous => previous.some(v => v.id === updated.id) ? previous.map(v => v.id === updated.id ? updated : v) : [...previous, updated]);
    setSelectedId(updated.id); setEditing(null); setMessage("Voucher saved.");
  }
  function removeVoucher(v: VoucherRecord) {
    if (!window.confirm(`Delete voucher from ${v.club}? This cannot be undone.`)) return;
    setVouchers(previous => previous.filter(item => item.id !== v.id));
    if (selectedId === v.id) setSelectedId(null);
    setMessage("Voucher deleted.");
  }
  const update = <K extends keyof VoucherRecord>(key: K, value: VoucherRecord[K]) => setEditing(v => v ? { ...v, [key]: value } : v);
  const input = (label: string, key: keyof VoucherRecord, type = "text") => (
    <label style={{ display: "grid", gap: 5, fontSize: 14, fontWeight: 600, color: "#334155" }}>{label}
      <input style={field} type={type} value={editing ? String(editing[key] ?? "") : ""} onChange={e => update(key, (type === "number" ? Number(e.target.value) : e.target.value) as never)} />
    </label>
  );

  return <section className="voucher-register-screen" style={{ maxWidth: 1160, margin: "0 auto", padding: "28px 24px 50px", color: "#334155" }}>
    <style>{`
      .voucher-print-report { display: none; }
      @media print {
        @page { size: A4 landscape; margin: 12mm 12mm 15mm; }
        html, body { background: #fff !important; }
        body * { visibility: hidden !important; }
        .voucher-print-report, .voucher-print-report * { visibility: visible !important; }
        .voucher-print-report {
          display: block !important; position: absolute; top: 0; left: 0;
          width: 100%; box-sizing: border-box; color: #334155;
          font-family: Arial, Helvetica, sans-serif; font-size: 8.5pt;
          background: #fff; -webkit-print-color-adjust: exact; print-color-adjust: exact;
        }
        .voucher-print-report .report-heading {
          text-align: center; border-bottom: 2px solid #2868a8;
          padding-bottom: 3mm; margin-bottom: 4mm;
        }
        .voucher-print-report .report-kicker { font-size: 9pt; font-weight: 800; letter-spacing: 1.2px; color: #1f2937; }
        .voucher-print-report .report-club { font-size: 19pt; font-weight: 800; color: #205b9f; margin: 1mm 0; }
        .voucher-print-report .report-subtitle { font-size: 10pt; font-weight: 800; letter-spacing: .7px; color: #334155; }
        .voucher-print-report .report-meta { display: flex; justify-content: space-between; gap: 8mm; margin: 0 0 4mm; font-size: 8pt; color: #64748b; }
        .voucher-print-report .report-section { border-left: 4px solid #4da0e4; padding-left: 7px; margin: 4mm 0 2mm; color: #205b9f; font-size: 10pt; font-weight: 800; break-after: avoid; }
        .voucher-print-report .report-summary { display: grid; grid-template-columns: repeat(5, 1fr); gap: 2mm; margin-bottom: 3mm; }
        .voucher-print-report .report-summary-box { border: 1px solid #dbe7f3; border-radius: 5px; padding: 3mm; }
        .voucher-print-report .report-summary-box span { display: block; color: #64748b; font-size: 7.5pt; }
        .voucher-print-report .report-summary-box strong { display: block; color: #205b9f; font-size: 13pt; margin-top: 1mm; }
        .voucher-print-report table { width: 100%; border-collapse: collapse; table-layout: fixed; font-size: 7.4pt; }
        .voucher-print-report thead { display: table-header-group; }
        .voucher-print-report th, .voucher-print-report td { border: 1px solid #dbe3ed; padding: 2.2mm 1.7mm; text-align: left; vertical-align: top; overflow-wrap: anywhere; }
        .voucher-print-report th { background: #eaf2fb !important; color: #205b9f; font-weight: 800; }
        .voucher-print-report tbody tr:nth-child(even) { background: #f7fafd !important; }
        .voucher-print-report tr { break-inside: avoid; }
        .voucher-print-report .report-totals { margin-top: 3mm; border: 1px solid #cfe2d4; border-radius: 4px; padding: 2.5mm 3mm; font-weight: 700; color: #216345; break-inside: avoid; }
        .voucher-print-report .report-note { color: #64748b; font-size: 7.5pt; margin: 2.5mm 0 0; }
        .voucher-print-report .warn-red { color: #b91c1c !important; font-weight: 800; }
        .voucher-print-report .warn-amber { color: #a16207 !important; font-weight: 800; }
        .voucher-print-report .report-footer { position: fixed; bottom: -10mm; left: 0; right: 0; border-top: 1px solid #dbe7f3; padding-top: 2mm; color: #64748b; font-size: 7pt; display: flex; justify-content: space-between; }
        .voucher-print-report .page-count::after { content: counter(page); }
      }
    `}</style>
    <div className="voucher-print-report" aria-hidden="true">
      <header className="report-heading">
        <div className="report-kicker">RAMSDALE SENIORS</div>
        <div className="report-club">Ramsdale Park Golf Club</div>
        <div className="report-subtitle">VOUCHER REGISTER</div>
      </header>
      <div className="report-meta">
        <span>Report date: {new Date().toLocaleDateString("en-GB")} · {filter === "All" ? "All vouchers" : `Vouchers ${filter}`} · {visible.length} records</span>
        <span>{search.trim() ? `Search: ${search.trim()}` : "Complete selected register"}</span>
      </div>
      <div className="report-section">VOUCHER SUMMARY — SELECTED RECORDS</div>
      <div className="report-summary">
        {([
          ["Vouchers In", visible.filter(v => v.direction === "In").length],
          ["Vouchers Out", visible.filter(v => v.direction === "Out").length],
          ["Available", visible.filter(v => v.direction === "In" && v.status === "Available").length],
          ["Estimated Value", money(reportTotals.estimated)],
          ["Charity Proceeds", money(reportTotals.proceeds)],
        ] as [string, string | number][]).map(([label, value]) => <div className="report-summary-box" key={label}><span>{label}</span><strong>{value}</strong></div>)}
      </div>
      <div className="report-section">VOUCHER DETAILS</div>
      <table>
        <colgroup><col style={{ width: "12%" }}/><col style={{ width: "12%" }}/><col style={{ width: "17%" }}/><col style={{ width: "9%" }}/><col style={{ width: "12%" }}/><col style={{ width: "9%" }}/><col style={{ width: "13%" }}/><col style={{ width: "8%" }}/><col style={{ width: "8%" }}/></colgroup>
        <thead><tr>
          <th>Direction / Type</th><th>Club / Donor</th><th>Reference / Description</th>
          <th>Received / Issued</th><th>Expiry / Alert</th><th>Status</th>
          <th>Recipient / Event</th><th>Estimated</th><th>Charity Proceeds</th>
        </tr></thead>
        <tbody>
          {visible.map(v => {
            const warning = voucherWarning(v);
            const days = daysUntilVoucherExpiry(v.expiryDate);
            return <tr key={v.id}>
              <td>{v.direction} — {v.type}</td>
              <td>{v.club}</td>
              <td>{v.reference || "—"}{v.description ? ` / ${v.description}` : ""}{v.bundleId ? ` / Bundle: ${v.bundleId}` : ""}</td>
              <td>{v.dateReceived || "—"}</td>
              <td>{v.expiryDate || "—"}{warning && <div className={warning === "red" ? "warn-red" : "warn-amber"}>{warning.toUpperCase()} · {days !== null && days < 0 ? `${Math.abs(days)} days overdue` : `${days} days left`}</div>}</td>
              <td>{v.status}</td>
              <td>{v.recipient || "—"}{v.fundraisingEvent ? ` / ${v.fundraisingEvent}` : ""}</td>
              <td>{money(v.estimatedValue)}</td>
              <td>{money(v.actualProceeds)}</td>
            </tr>;
          })}
        </tbody>
      </table>
      <div className="report-totals">TOTAL — {visible.length} vouchers &nbsp; | &nbsp; Estimated value: {money(reportTotals.estimated)} &nbsp; | &nbsp; Actual charity proceeds: {money(reportTotals.proceeds)}</div>
      <p className="report-note">Estimated voucher values are not charity income. Bundle proceeds must be entered against one voucher only. Amber: 60–31 days; Red: 30 days or fewer.</p>
      <div className="report-footer"><span>RAMSDALE SENIORS · VOUCHER REGISTER</span><span>Printed {new Date().toLocaleDateString("en-GB")} · Page <span className="page-count" /></span></div>
    </div>
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12, marginBottom: 22 }}>
      <div><h1 style={{ margin: 0, color: "#205b9f" }}>Voucher Register</h1><p style={{ margin: "6px 0 0" }}>Incoming, outgoing and charity fundraising vouchers</p></div>
      <div style={{ display: "flex", gap: 8 }}><button style={button} onClick={() => { setEditing(emptyVoucher()); setMessage(""); }}>+ Add Voucher</button><button style={{ ...button, background: "white", color: "#205b9f" }} onClick={printReport}>Print / PDF</button><button style={{ ...button, background: "white", color: "#205b9f" }} onClick={onBack}>Main Menu</button></div>
    </div>
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 10, marginBottom: 18 }}>
      {([ ["Vouchers In", totals.incoming], ["Vouchers Out", totals.outgoing], ["Available", totals.available], ["Estimated Value", money(totals.estimated)], ["Charity Proceeds", money(totals.proceeds)] ] as [string, string | number][]).map(([name, value]) => <div key={name} style={panel}><div style={{ fontSize: 13, color: "#64748b" }}>{name}</div><strong style={{ display: "block", marginTop: 6, fontSize: 23, color: "#205b9f" }}>{value}</strong></div>)}
    </div>
    {message && <p role="status" style={{ color: "#205b9f", fontWeight: 600 }}>{message}</p>}
    {editing && <div style={{ ...panel, marginBottom: 20, borderColor: "#b8cce2" }}>
      <h2 style={{ marginTop: 0, color: "#205b9f" }}>{editing.id ? "Edit Voucher" : "New Voucher"}</h2>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 14 }}>
        <label style={{ display: "grid", gap: 5 }}>Direction<select style={field} value={editing.direction} onChange={e => update("direction", e.target.value as VoucherDirection)}><option>In</option><option>Out</option></select></label>
        <label style={{ display: "grid", gap: 5 }}>Voucher Type<select style={field} value={editing.type} onChange={e => update("type", e.target.value as VoucherType)}>{TYPES.map(t => <option key={t}>{t}</option>)}</select></label>
        {input("Club / Donor *", "club")}{input("Voucher Description", "description")}{input("Reference Number", "reference")}{input("Date Received / Issued", "dateReceived", "date")}{input("Expiry Date", "expiryDate", "date")}
        <label style={{ display: "grid", gap: 5 }}>Status<select style={field} value={editing.status} onChange={e => update("status", e.target.value as VoucherStatus)}>{STATUSES.map(s => <option key={s}>{s}</option>)}</select></label>
        {input("Recipient / Prize Winner", "recipient")}{input("Fundraising Event", "fundraisingEvent")}{input("Estimated Value (£)", "estimatedValue", "number")}{input("Actual Charity Proceeds (£)", "actualProceeds", "number")}{input("Bundle Reference (optional)", "bundleId")}{input("Linked Reciprocal Voucher ID", "linkedVoucherId")}{input("Notes", "notes")}
      </div>
      <p style={{ fontSize: 13, color: "#64748b" }}>For a bundle, give all vouchers the same bundle reference. Record the total charity proceeds against just one voucher in the bundle.</p>
      <div style={{ display: "flex", gap: 10 }}><button style={button} onClick={saveVoucher}>Save Voucher</button><button style={{ ...button, background: "white", color: "#205b9f" }} onClick={() => { setEditing(null); setMessage(""); }}>Cancel</button></div>
    </div>}
    <div style={{ ...panel, marginBottom: 14, display: "flex", flexWrap: "wrap", alignItems: "center", gap: 12 }}>
      <label>Show <select style={{ ...field, width: "auto" }} value={filter} onChange={e => setFilter(e.target.value as typeof filter)}><option>All</option><option>In</option><option>Out</option></select></label>
      <input style={{ ...field, flex: "1 1 230px" }} value={search} onChange={e => setSearch(e.target.value)} placeholder="Search club, voucher, winner or event" aria-label="Search vouchers" />
    </div>
    <div style={{ display: "grid", gap: 9 }}>
      {visible.length === 0 && <div style={panel}>No vouchers found. Select “Add Voucher” to begin.</div>}
      {visible.map(v => { const warning = voucherWarning(v); const days = daysUntilVoucherExpiry(v.expiryDate); return <div key={v.id} style={{ ...panel, borderColor: warning === "red" ? "#ef4444" : warning === "amber" ? "#f59e0b" : "#dbe7f3", background: selectedId === v.id ? "#f1f7ff" : "white" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 10 }}>
          <div><strong style={{ color: "#205b9f", fontSize: 17 }}>{v.direction === "In" ? "↓ In" : "↑ Out"} · {v.type} · {v.club}</strong>
            <div style={{ marginTop: 4, fontSize: 14 }}>{v.description || v.reference || "No description"} · {v.status} {v.expiryDate ? `· Expires ${v.expiryDate}` : ""}</div>
            {warning && <strong style={{ display: "block", marginTop: 5, color: warning === "red" ? "#b91c1c" : "#a16207" }}>{warning === "red" ? "RED" : "AMBER"} · {days! < 0 ? `Expired ${Math.abs(days!)} days ago` : `${days} days to expiry`}</strong>}
            <div style={{ marginTop: 5, fontSize: 13, color: "#64748b" }}>Estimated {money(v.estimatedValue)} · Charity proceeds {money(v.actualProceeds)}{v.bundleId ? ` · Bundle ${v.bundleId}` : ""}</div>
          </div>
          <div style={{ display: "flex", gap: 7 }}><button style={button} onClick={() => { setSelectedId(v.id); setEditing({ ...v }); setMessage(""); }}>Edit</button><button style={{ ...button, background: "white", color: "#b91c1c", borderColor: "#fecaca" }} onClick={() => removeVoucher(v)}>Delete</button></div>
        </div>
      </div>; })}
    </div>
    {selected && !editing && <p style={{ color: "#64748b", fontSize: 13 }}>Selected voucher: {selected.club} · {selected.reference || selected.id}</p>}
  </section>;
}
