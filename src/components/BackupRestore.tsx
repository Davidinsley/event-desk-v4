import { useRef, useState } from "react";

interface BackupRestoreProps {
  onBack: () => void;
}

type EncodedValue =
  | { kind: "plain"; value: unknown }
  | { kind: "blob"; type: string; data: string };

type DatabaseBackup = {
  name: string;
  version: number;
  stores: Record<string, EncodedValue[]>;
};

type EventDeskBackup = {
  format: "ramsdale-event-desk-backup";
  version: 1;
  createdAt: string;
  localStorage: Record<string, string>;
  indexedDB: DatabaseBackup[];
};

const DATABASE_SCHEMAS = [
  { name: "eventDeskEventBookletLibrary", version: 1, stores: [{ name: "records", keyPath: "id" }] },
  { name: "ramsdaleEventDesk", version: 1, stores: [{ name: "posterLibrary", keyPath: "id" }] },
  { name: "eventDeskMenuPdfLibrary", version: 2, stores: [{ name: "menus", keyPath: "id" }] },
  {
    name: "eventDeskMatchBookletLibrary",
    version: 1,
    stores: [
      { name: "booklets", keyPath: "id" },
      { name: "drafts", keyPath: "id" },
    ],
  },
] as const;

const blobToBase64 = (blob: Blob) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = String(reader.result ?? "");
      resolve(result.includes(",") ? result.split(",", 2)[1] : result);
    };
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });

const base64ToBlob = (data: string, type: string) => {
  const binary = atob(data);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);
  return new Blob([bytes], { type });
};

const encodeValue = async (value: unknown): Promise<EncodedValue> => {
  if (value instanceof Blob) {
    return { kind: "blob", type: value.type, data: await blobToBase64(value) };
  }
  if (Array.isArray(value)) {
    return { kind: "plain", value: await encodeNested(value) };
  }
  if (value && typeof value === "object") {
    const output: Record<string, unknown> = {};
    for (const [key, item] of Object.entries(value as Record<string, unknown>)) {
      if (item instanceof Blob) {
        output[key] = { __eventDeskBlob: true, type: item.type, data: await blobToBase64(item) };
      } else if (Array.isArray(item)) {
        output[key] = await encodeNested(item);
      } else if (item && typeof item === "object") {
        output[key] = await encodeNested(item);
      } else {
        output[key] = item;
      }
    }
    return { kind: "plain", value: output };
  }
  return { kind: "plain", value };
};

const encodeNested = async (value: unknown): Promise<unknown> => {
  if (value instanceof Blob) return { __eventDeskBlob: true, type: value.type, data: await blobToBase64(value) };
  if (Array.isArray(value)) return Promise.all(value.map(encodeNested));
  if (value && typeof value === "object") {
    const output: Record<string, unknown> = {};
    for (const [key, item] of Object.entries(value as Record<string, unknown>)) output[key] = await encodeNested(item);
    return output;
  }
  return value;
};

const decodeNested = (value: unknown): unknown => {
  if (Array.isArray(value)) return value.map(decodeNested);
  if (value && typeof value === "object") {
    const object = value as Record<string, unknown>;
    if (object.__eventDeskBlob === true && typeof object.data === "string") {
      return base64ToBlob(object.data, typeof object.type === "string" ? object.type : "application/octet-stream");
    }
    const output: Record<string, unknown> = {};
    for (const [key, item] of Object.entries(object)) output[key] = decodeNested(item);
    return output;
  }
  return value;
};

const decodeValue = (value: EncodedValue): unknown =>
  value.kind === "blob" ? base64ToBlob(value.data, value.type) : decodeNested(value.value);

const openDatabase = (schema: (typeof DATABASE_SCHEMAS)[number]) =>
  new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open(schema.name, schema.version);
    request.onupgradeneeded = () => {
      const db = request.result;
      schema.stores.forEach((store) => {
        if (!db.objectStoreNames.contains(store.name)) db.createObjectStore(store.name, { keyPath: store.keyPath });
      });
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });

const readDatabase = async (schema: (typeof DATABASE_SCHEMAS)[number]): Promise<DatabaseBackup> => {
  const db = await openDatabase(schema);
  try {
    const stores: Record<string, EncodedValue[]> = {};
    for (const store of schema.stores) {
      const rows = await new Promise<unknown[]>((resolve, reject) => {
        const request = db.transaction(store.name, "readonly").objectStore(store.name).getAll();
        request.onsuccess = () => resolve(request.result ?? []);
        request.onerror = () => reject(request.error);
      });
      stores[store.name] = await Promise.all(rows.map(encodeValue));
    }
    return { name: schema.name, version: schema.version, stores };
  } finally {
    db.close();
  }
};

const restoreDatabase = async (schema: (typeof DATABASE_SCHEMAS)[number], backup?: DatabaseBackup) => {
  const db = await openDatabase(schema);
  try {
    for (const store of schema.stores) {
      const rows = backup?.stores?.[store.name] ?? [];
      await new Promise<void>((resolve, reject) => {
        const transaction = db.transaction(store.name, "readwrite");
        const objectStore = transaction.objectStore(store.name);
        objectStore.clear();
        rows.forEach((row) => objectStore.put(decodeValue(row)));
        transaction.oncomplete = () => resolve();
        transaction.onerror = () => reject(transaction.error);
        transaction.onabort = () => reject(transaction.error);
      });
    }
  } finally {
    db.close();
  }
};

export default function BackupRestore({ onBack }: BackupRestoreProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  const exportBackup = async () => {
    setBusy(true);
    setMessage("");
    try {
      const storage: Record<string, string> = {};
      for (let index = 0; index < localStorage.length; index += 1) {
        const key = localStorage.key(index);
        if (key !== null) storage[key] = localStorage.getItem(key) ?? "";
      }
      const databases = await Promise.all(DATABASE_SCHEMAS.map(readDatabase));
      const backup: EventDeskBackup = {
        format: "ramsdale-event-desk-backup",
        version: 1,
        createdAt: new Date().toISOString(),
        localStorage: storage,
        indexedDB: databases,
      };
      const blob = new Blob([JSON.stringify(backup)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      const date = new Date().toISOString().slice(0, 10);
      link.href = url;
      link.download = `Event-Desk-Backup-${date}.json`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
      setMessage("Backup created successfully. Keep this file somewhere safe or AirDrop it to the other Mac.");
    } catch (error) {
      console.error("Backup failed", error);
      setMessage("Backup could not be created. No Event Desk data has been changed.");
    } finally {
      setBusy(false);
    }
  };

  const restoreBackup = async (file: File) => {
    setBusy(true);
    setMessage("");
    try {
      const parsed = JSON.parse(await file.text()) as EventDeskBackup;
      if (parsed.format !== "ramsdale-event-desk-backup" || parsed.version !== 1 || !parsed.localStorage || !Array.isArray(parsed.indexedDB)) {
        throw new Error("Not a valid Event Desk backup");
      }
      const confirmed = window.confirm(
        "Restore this Event Desk backup?\n\nThis will replace the Event Desk data currently stored on this computer with the data in the selected backup file.\n\nThis action cannot be undone unless you have first exported a backup of the current data."
      );
      if (!confirmed) return;

      // Move legacy large booklet records into IndexedDB before writing localStorage.
      // Keep the backup file untouched, including its original format.
      const localEntries = Object.entries(parsed.localStorage);
      const legacyBooklets = localEntries.filter(([key]) => key.startsWith("eventDeskBookletV1:"));
      const bookletSchema = DATABASE_SCHEMAS.find((schema) => schema.name === "eventDeskEventBookletLibrary")!;
      const bookletBackup = parsed.indexedDB.find((database) => database.name === bookletSchema.name);
      const migratedRecords: EncodedValue[] = legacyBooklets.map(([key, value]) => ({
        kind: "plain",
        value: { id: key.slice("eventDeskBookletV1:".length), data: JSON.parse(value) },
      }));
      // Existing IndexedDB booklet records take precedence over legacy localStorage copies.
      const combined = new Map<string, EncodedValue>();
      migratedRecords.forEach((record) => {
        const value = (record as { kind: "plain"; value: { id: string } }).value;
        combined.set(value.id, record);
      });
      (bookletBackup?.stores?.records ?? []).forEach((record) => {
        const decoded = decodeValue(record) as { id: string };
        combined.set(decoded.id, record);
      });
      // Restore all databases first, so a localStorage quota failure cannot lose booklet images.
      for (const schema of DATABASE_SCHEMAS) {
        const backup = schema.name === bookletSchema.name
          ? { name: schema.name, version: 1, stores: { records: [...combined.values()] } }
          : parsed.indexedDB.find((database) => database.name === schema.name);
        await restoreDatabase(schema, backup);
      }
      // Exclude legacy booklet image data from localStorage to avoid Chromebook quota limits.
      localStorage.clear();
      for (const [key, value] of localEntries) {
        if (!key.startsWith("eventDeskBookletV1:")) localStorage.setItem(key, value);
      }
      window.alert("Event Desk backup restored successfully. Event Desk will now reload.");
      window.location.reload();
    } catch (error) {
      console.error("Restore failed", error);
      setMessage("The restore could not be completed. Do not continue using this copy until we have checked it; your backup file itself has not been changed.");
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  return (
    <section style={{ width: "100%", maxWidth: "920px", margin: "0 auto", padding: "42px", boxSizing: "border-box" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "20px", marginBottom: "30px" }}>
        <div>
          <h1 style={{ margin: 0, color: "#205b9f", fontSize: "38px" }}>Backup &amp; Restore</h1>
          <p style={{ margin: "8px 0 0", color: "#64748b", fontSize: "18px" }}>Move or safeguard the complete Event Desk.</p>
        </div>
        <button type="button" onClick={onBack} disabled={busy} style={{ border: "1px solid #2468b3", borderRadius: "10px", padding: "12px 18px", background: "white", color: "#205b9f", fontSize: "16px", fontWeight: 700, cursor: "pointer" }}>🏠 Main Menu</button>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: "22px" }}>
        <div style={{ border: "1px solid #cbdced", borderRadius: "18px", background: "white", padding: "30px" }}>
          <h2 style={{ marginTop: 0, color: "#174f91" }}>Export Complete Backup</h2>
          <p style={{ color: "#4d5966", lineHeight: 1.6 }}>Creates one dated backup file containing the Event Desk data stored on this computer, including events and the saved libraries used by Event Desk.</p>
          <button type="button" onClick={exportBackup} disabled={busy} style={{ marginTop: "14px", border: 0, borderRadius: "10px", padding: "13px 20px", background: "#205b9f", color: "white", fontSize: "16px", fontWeight: 700, cursor: busy ? "default" : "pointer" }}>{busy ? "Please wait…" : "Export Backup"}</button>
        </div>

        <div style={{ border: "1px solid #cbdced", borderRadius: "18px", background: "white", padding: "30px" }}>
          <h2 style={{ marginTop: 0, color: "#174f91" }}>Restore Complete Backup</h2>
          <p style={{ color: "#4d5966", lineHeight: 1.6 }}>Use a backup from another Event Desk installation. You will be asked to confirm before the data on this computer is replaced.</p>
          <input ref={inputRef} type="file" accept="application/json,.json" style={{ display: "none" }} onChange={(event) => { const file = event.target.files?.[0]; if (file) void restoreBackup(file); }} />
          <button type="button" onClick={() => inputRef.current?.click()} disabled={busy} style={{ marginTop: "14px", border: "1px solid #205b9f", borderRadius: "10px", padding: "13px 20px", background: "white", color: "#205b9f", fontSize: "16px", fontWeight: 700, cursor: busy ? "default" : "pointer" }}>Choose Backup File</button>
        </div>
      </div>

      {message && <div style={{ marginTop: "22px", padding: "16px 18px", borderRadius: "12px", background: "#f3f8fd", color: "#244a70", lineHeight: 1.5 }}>{message}</div>}
      <p style={{ marginTop: "24px", color: "#64748b", fontSize: "14px", lineHeight: 1.5 }}><strong>Recommended:</strong> before restoring onto a computer that already contains Event Desk information, export a backup from that computer first.</p>
    </section>
  );
}
