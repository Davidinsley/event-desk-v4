/**
 * ============================================================
 * Catering.tsx
 * Ramsdale Seniors Event Desk
 * Catering Module — Simplified V4
 * ============================================================
 *
 * Scope:
 * - Six primary information tiles.
 * - Six catering package tiles.
 * - Clicking a package immediately shows its calculated total.
 * - Each package has an organiser-editable price per person.
 * - Number Eating is entered directly and includes everyone eating:
 *   players and non-playing guests.
 * - Dietary Needs and People Paid are simple totals.
 * - Catering Cost is the total for the selected package.
 * - 14-day catering lock retained.
 *
 * Deliberately NOT included:
 * - Kitchen report
 * - Menu builder
 * - Individual player food options
 * - Package quantity allocation
 */

import { useEffect, useMemo, useState } from "react";
import "./Catering.css";

import type { Player } from "../types/Player";
import PageLayout from "../layout/PageLayout";

import { Download, FileText, Lock, Printer, Trash2, Upload, UtensilsCrossed } from "lucide-react";

interface CateringProps {
  players: Player[];
}

type PackageId =
  | "breakfastCob"
  | "smallBreakfast"
  | "breakfastCobMain"
  | "starterMain"
  | "mainDessert"
  | "mainOnly"
  | "bespoke";

interface CateringPackage {
  id: PackageId;
  name: string;
  price: number;
}

interface CateringData {
  eating: number;
  dietaryNeeds: number;
  paid: number;
  clubAdvised: boolean;
  bespokeMenuPdfId: string | null;
  selectedPackage: PackageId | null;
  packages: CateringPackage[];
}

interface EventRecordLike {
  id: string;
  event?: {
    eventDate?: string;
  };
  archived?: boolean;
}

const EVENT_RECORDS_KEY = "eventDeskEventRecords";
const ACTIVE_EVENT_ID_KEY = "eventDeskActiveEventId";
const CATERING_KEY_PREFIX = "eventDeskCateringV1:";

const DEFAULT_PACKAGES: CateringPackage[] = [
  { id: "breakfastCob", name: "Breakfast Cob", price: 5 },
  { id: "smallBreakfast", name: "Small Breakfast", price: 8 },
  { id: "breakfastCobMain", name: "Breakfast Cob / Main", price: 17 },
  { id: "starterMain", name: "Starter / Main", price: 17 },
  { id: "mainDessert", name: "Main / Dessert", price: 17 },
  { id: "mainOnly", name: "Main Only", price: 0 },
  { id: "bespoke", name: "Bespoke", price: 20 },
];

const createEmptyData = (defaultEating = 0): CateringData => ({
  eating: defaultEating,
  dietaryNeeds: 0,
  paid: 0,
  clubAdvised: false,
  bespokeMenuPdfId: null,
  selectedPackage: null,
  packages: DEFAULT_PACKAGES.map((item) => ({ ...item })),
});

const readActiveEvent = (): EventRecordLike | null => {
  try {
    const activeId = localStorage.getItem(ACTIVE_EVENT_ID_KEY);
    const records = JSON.parse(
      localStorage.getItem(EVENT_RECORDS_KEY) || "[]"
    ) as EventRecordLike[];

    if (!Array.isArray(records)) {
      return null;
    }

    return (
      records.find((record) => record.id === activeId) ||
      records[0] ||
      null
    );
  } catch {
    return null;
  }
};

const getCateringKey = () => {
  const activeEvent = readActiveEvent();
  return `${CATERING_KEY_PREFIX}${activeEvent?.id || "default"}`;
};

const isPackageId = (value: unknown): value is PackageId =>
  DEFAULT_PACKAGES.some((item) => item.id === value);

const normalisePackages = (savedPackages: unknown): CateringPackage[] => {
  const saved = Array.isArray(savedPackages) ? savedPackages : [];

  return DEFAULT_PACKAGES.map((defaultPackage) => {
    const savedPackage = saved.find(
      (item) =>
        item &&
        typeof item === "object" &&
        "id" in item &&
        item.id === defaultPackage.id
    ) as Partial<CateringPackage> | undefined;

    return {
      ...defaultPackage,
      price:
        typeof savedPackage?.price === "number"
          ? Math.max(0, savedPackage.price)
          : defaultPackage.price,
    };
  });
};

const loadCatering = (defaultEating = 0): CateringData => {
  try {
    const saved = localStorage.getItem(getCateringKey());

    if (!saved) {
      return createEmptyData(defaultEating);
    }

    const parsed = JSON.parse(saved) as Partial<CateringData> & {
      additionalEaters?: number;
      packages?: unknown;
    };

    // V2 migration:
    // eating = players + additionalEaters.
    const migratedEating =
      typeof parsed.eating === "number"
        ? parsed.eating
        : typeof parsed.additionalEaters === "number"
          ? defaultEating + Math.max(0, Math.floor(parsed.additionalEaters))
          : defaultEating;

    const selectedPackage = isPackageId(parsed.selectedPackage)
      ? parsed.selectedPackage
      : null;

    return {
      eating: Math.max(0, Math.floor(migratedEating)),
      dietaryNeeds:
        typeof parsed.dietaryNeeds === "number"
          ? Math.max(0, Math.floor(parsed.dietaryNeeds))
          : 0,
      paid:
        typeof parsed.paid === "number"
          ? Math.max(0, Math.floor(parsed.paid))
          : 0,
      clubAdvised: parsed.clubAdvised === true,
      bespokeMenuPdfId:
        typeof parsed.bespokeMenuPdfId === "string" ? parsed.bespokeMenuPdfId : null,
      selectedPackage,
      packages: normalisePackages(parsed.packages),
    };
  } catch {
    return createEmptyData(defaultEating);
  }
};

const saveCatering = (data: CateringData) => {
  try {
    localStorage.setItem(getCateringKey(), JSON.stringify(data));
  } catch (error) {
    console.error("Failed to save catering data", error);
  }
};


interface MenuPdfRecord {
  id: string;
  name: string;
  blob: Blob;
  addedAt: number;
}

const MENU_PDF_DB = "eventDeskMenuPdfLibrary";
const MENU_PDF_STORE = "menus";

const openMenuPdfDb = (): Promise<IDBDatabase> =>
  new Promise((resolve, reject) => {
    const request = indexedDB.open(MENU_PDF_DB, 2);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(MENU_PDF_STORE)) {
        db.createObjectStore(MENU_PDF_STORE, { keyPath: "id" });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });

const loadMenuPdfLibrary = async (): Promise<MenuPdfRecord[]> => {
  const db = await openMenuPdfDb();
  return new Promise((resolve, reject) => {
    const request = db.transaction(MENU_PDF_STORE, "readonly").objectStore(MENU_PDF_STORE).getAll();
    request.onsuccess = () => resolve((request.result as MenuPdfRecord[]).sort((a, b) => b.addedAt - a.addedAt));
    request.onerror = () => reject(request.error);
  });
};

const saveMenuPdfToLibrary = async (record: MenuPdfRecord) => {
  const db = await openMenuPdfDb();
  return new Promise<void>((resolve, reject) => {
    const request = db.transaction(MENU_PDF_STORE, "readwrite").objectStore(MENU_PDF_STORE).put(record);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
};

const deleteMenuPdfFromLibrary = async (id: string) => {
  const db = await openMenuPdfDb();
  return new Promise<void>((resolve, reject) => {
    const request = db.transaction(MENU_PDF_STORE, "readwrite").objectStore(MENU_PDF_STORE).delete(id);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
};

const getDaysUntilEvent = (eventDate: string) => {
  if (!eventDate) {
    return null;
  }

  // Event Desk dates are normally stored/displayed as DD/MM/YYYY.
  // Also accept ISO YYYY-MM-DD so the countdown remains compatible
  // with any older or differently sourced event records.
  let target: Date;

  const ddmmyyyy = eventDate.match(/^(\d{1,2})[\/.-](\d{1,2})[\/.-](\d{4})$/);
  const iso = eventDate.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);

  if (ddmmyyyy) {
    const [, day, month, year] = ddmmyyyy;
    target = new Date(Number(year), Number(month) - 1, Number(day));
  } else if (iso) {
    const [, year, month, day] = iso;
    target = new Date(Number(year), Number(month) - 1, Number(day));
  } else {
    return null;
  }

  if (Number.isNaN(target.getTime())) {
    return null;
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  target.setHours(0, 0, 0, 0);

  return Math.ceil((target.getTime() - today.getTime()) / 86400000);
};

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: "GBP",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);

export default function Catering({ players }: CateringProps) {
  const [data, setData] = useState<CateringData>(() =>
    loadCatering(players.length)
  );
  const [selectedPackage, setSelectedPackage] = useState<PackageId | null>(
    null
  );
  const [menuPdfLibrary, setMenuPdfLibrary] = useState<MenuPdfRecord[]>([]);

  const activeEvent = readActiveEvent();
  const eventDate = activeEvent?.event?.eventDate || "";
  const daysUntilEvent = getDaysUntilEvent(eventDate);
  // Remind the organiser when the event is within 21 days and Club Advised
  // has not yet been confirmed. This warning remains visible during the
  // 14-day lock so an outstanding club notification cannot be overlooked.
  const clubAdviceWarning =
    daysUntilEvent !== null && daysUntilEvent <= 21 && !data.clubAdvised;

  const locked =
    Boolean(activeEvent?.archived) ||
    (daysUntilEvent !== null && daysUntilEvent <= 14);

  useEffect(() => {
    loadMenuPdfLibrary()
      .then(setMenuPdfLibrary)
      .catch((error) => console.error("Failed to load menu PDF library", error));
  }, []);

  useEffect(() => {
    const loaded = loadCatering(players.length);
    setData(loaded);
    setSelectedPackage(loaded.selectedPackage);
  }, [activeEvent?.id, players.length]);

  const updateData = (
    updater: (current: CateringData) => CateringData
  ) => {
    if (locked) {
      return;
    }

    setData((current) => {
      const next = updater(current);
      saveCatering(next);
      return next;
    });
  };

  // Club Advised is intentionally allowed to be confirmed even after the
  // 14-day catering lock. The reminder must be actionable until the organiser
  // has confirmed that the club events team has been advised.
  const setClubAdvised = (advised: boolean) => {
    setData((current) => {
      const next = { ...current, clubAdvised: advised };
      saveCatering(next);
      return next;
    });
  };

  const eating = data.eating;
  const paid = Math.min(data.paid, eating);
  const outstanding = Math.max(0, eating - paid);
  const dietaryNeeds = Math.min(data.dietaryNeeds, eating);

  const selected = useMemo(
    () =>
      data.packages.find((item) => item.id === selectedPackage) || null,
    [data.packages, selectedPackage]
  );

  const cateringCost = selected ? selected.price * eating : 0;

  const selectPackage = (packageId: PackageId) => {
    setSelectedPackage(packageId);

    if (locked) {
      return;
    }

    updateData((current) => ({
      ...current,
      selectedPackage: packageId,
    }));
  };

  const updatePackagePrice = (packageId: PackageId, value: string) => {
    const number = Number(value);

    updateData((current) => ({
      ...current,
      packages: current.packages.map((item) =>
        item.id === packageId
          ? {
              ...item,
              price: Number.isFinite(number) ? Math.max(0, number) : 0,
            }
          : item
      ),
    }));
  };

  const setEating = (value: string) => {
    const number = Number(value);

    updateData((current) => {
      const eatingValue = Number.isFinite(number)
        ? Math.max(0, Math.floor(number))
        : 0;

      return {
        ...current,
        eating: eatingValue,
        dietaryNeeds: Math.min(current.dietaryNeeds, eatingValue),
        paid: Math.min(current.paid, eatingValue),
      };
    });
  };

  const setDietaryNeeds = (value: string) => {
    const number = Number(value);

    updateData((current) => ({
      ...current,
      dietaryNeeds: Number.isFinite(number)
        ? Math.max(0, Math.min(current.eating, Math.floor(number)))
        : 0,
    }));
  };

  const setPaid = (value: string) => {
    const number = Number(value);

    updateData((current) => ({
      ...current,
      paid: Number.isFinite(number)
        ? Math.max(0, Math.min(current.eating, Math.floor(number)))
        : 0,
    }));
  };

  const selectedMenuPdf =
    menuPdfLibrary.find((item) => item.id === data.bespokeMenuPdfId) || null;

  const addMenuPdf = async (file: File) => {
    if (locked) {
      return;
    }

    // Packaged Electron/macOS can supply a selected PDF with an empty or
    // non-standard MIME type, so also accept the .pdf filename extension.
    const isPdf =
      file.type === "application/pdf" ||
      file.name.toLowerCase().endsWith(".pdf");

    if (!isPdf) {
      window.alert("Please select a PDF menu.");
      return;
    }

    try {
      // Store a plain Blob rather than the Electron/File object itself.
      const pdfBytes = await file.arrayBuffer();
      const pdfBlob = new Blob([pdfBytes], { type: "application/pdf" });

      const record: MenuPdfRecord = {
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`,
        name: file.name,
        blob: pdfBlob,
        addedAt: Date.now(),
      };

      await saveMenuPdfToLibrary(record);

      // Read it back so the screen only reports success after IndexedDB
      // has genuinely stored the menu.
      const refreshedLibrary = await loadMenuPdfLibrary();
      setMenuPdfLibrary(refreshedLibrary);

      setData((current) => {
        const next = { ...current, bespokeMenuPdfId: record.id };
        saveCatering(next);
        return next;
      });
    } catch (error) {
      console.error("Failed to add menu PDF", error);
      window.alert(
        "Event Desk could not save this PDF to the Menu Library. Please try again."
      );
    }
  };

  const selectMenuPdf = (id: string) => {
    updateData((current) => ({ ...current, bespokeMenuPdfId: id }));
  };

  const removeMenuPdf = async (id: string) => {
    if (locked) return;

    try {
      await deleteMenuPdfFromLibrary(id);
      setMenuPdfLibrary((current) => current.filter((item) => item.id !== id));
      if (data.bespokeMenuPdfId === id) {
        updateData((current) => ({ ...current, bespokeMenuPdfId: null }));
      }
    } catch (error) {
      console.error("Failed to remove menu PDF", error);
    }
  };

  const openMenuPdfForPrint = () => {
    if (!selectedMenuPdf) return;

    // Safari's built-in PDF viewer does not reliably render a blob URL when the
    // PDF is embedded inside an about:blank iframe. Open the stored PDF blob
    // directly instead. This gives Safari its normal PDF viewer and avoids the
    // blank print window while leaving the IndexedDB menu library untouched.
    const url = URL.createObjectURL(selectedMenuPdf.blob);
    const printWindow = window.open(url, "_blank");

    if (!printWindow) {
      URL.revokeObjectURL(url);
      window.alert("Please allow pop-ups for Event Desk to print the menu.");
      return;
    }

    printWindow.focus();

    // Keep the object URL alive long enough for Safari's PDF viewer to finish
    // loading. The PDF can then be printed normally with the browser print
    // command (Command-P) or Safari's Print control.
    window.setTimeout(() => URL.revokeObjectURL(url), 120000);
  };

  const exportSelectedMenuPdf = () => {
    if (!selectedMenuPdf) return;
    const url = URL.createObjectURL(selectedMenuPdf.blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = selectedMenuPdf.name;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  const deadlineValue =
    daysUntilEvent === null
      ? "—"
      : daysUntilEvent <= 14
        ? "LOCKED"
        : String(daysUntilEvent - 14);

  const summary = (
    <div className="page-summary catering-summary">
      <div className="summary-card">
        <span className="summary-card-title">Eating</span>
        <strong className="summary-card-value">{eating}</strong>
      </div>

      <div className="summary-card">
        <span className="summary-card-title">Dietary Needs</span>
        <strong className="summary-card-value">{dietaryNeeds}</strong>
      </div>

      <div className="summary-card">
        <span className="summary-card-title">Paid</span>
        <strong className="summary-card-value">{paid}</strong>
      </div>

      <div className="summary-card">
        <span className="summary-card-title">Outstanding</span>
        <strong className="summary-card-value">{outstanding}</strong>
      </div>

      <div className="summary-card">
        <span className="summary-card-title">Catering Cost</span>
        <strong className="summary-card-value">
          {formatCurrency(cateringCost)}
        </strong>
      </div>

      <div
        className={`summary-card countdown-card ${
          daysUntilEvent !== null && daysUntilEvent <= 14 ? "urgent" : ""
        }`}
      >
        <span className="summary-card-title">Kitchen Deadline</span>
        <strong className="summary-card-value">{deadlineValue}</strong>
      </div>
    </div>
  );

  const actions = (
    <div className="page-actions catering-actions">
      {data.packages.map((item) => {
        const isSelected = selectedPackage === item.id;

        return (
          <button
            key={item.id}
            type="button"
            className={`catering-action ${isSelected ? "selected" : ""}`}
            onClick={() => selectPackage(item.id)}
            aria-pressed={isSelected}
          >
            <UtensilsCrossed size={19} />
            <span className="catering-action-name">{item.name}</span>
          </button>
        );
      })}
    </div>
  );

  return (
    <PageLayout title="Catering" summary={summary} actions={actions}>
      <section className="catering-input-panel">
        <div className="catering-input-grid">
          <label>
            <span>Number Eating</span>
            <input
              type="number"
              min="0"
              step="1"
              value={data.eating}
              disabled={locked}
              onChange={(event) => setEating(event.target.value)}
            />
          </label>

          <label>
            <span>Dietary Needs</span>
            <input
              type="number"
              min="0"
              max={eating}
              step="1"
              value={dietaryNeeds}
              disabled={locked}
              onChange={(event) => setDietaryNeeds(event.target.value)}
            />
          </label>

          <label>
            <span>People Paid</span>
            <input
              type="number"
              min="0"
              max={eating}
              step="1"
              value={paid}
              disabled={locked}
              onChange={(event) => setPaid(event.target.value)}
            />
          </label>
        </div>

        <p>
          Number Eating includes everyone who is eating, including players and
          non-playing guests.
        </p>
      </section>

      {selected && (
        <section className="package-calculator">
          <div className="package-calculator-heading">
            <div>
              <span className="package-calculator-label">Selected package</span>
              <h2>{selected.name}</h2>
            </div>

          </div>

          <div className="package-calculator-body">
            <label className="price-control">
              <span>Price per Person</span>
              <div className="price-input-wrap">
                <b>£</b>
                <input
                  type="number"
                  min="0"
                  step="1"
                  value={selected.price}
                  disabled={locked}
                  onChange={(event) =>
                    updatePackagePrice(selected.id, event.target.value)
                  }
                  aria-label={`${selected.name} price per person`}
                />
              </div>
            </label>

            <div className="package-total">
              <span>{eating} people × {formatCurrency(selected.price)}</span>
              <strong>{formatCurrency(cateringCost)}</strong>
            </div>
          </div>

          <div className="package-hint">
            Change the price using the field or its stepper arrows to compare
            different price points. The total updates immediately.
          </div>
        </section>
      )}

      {selectedPackage === "bespoke" && (
        <section className="bespoke-menu-panel">
          <div className="bespoke-menu-heading">
            <div>
              <span className="package-calculator-label">Bespoke Menu PDF Library</span>
              <h2>Menu for Print &amp; Export</h2>
              <p>Select an existing PDF menu or add a new menu to the library.</p>
            </div>
            <label className="menu-pdf-upload">
              <Upload size={17} />
              <span>Add PDF</span>
              <input
                type="file"
                accept="application/pdf,.pdf"
                disabled={locked}
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  if (file) void addMenuPdf(file);
                  event.currentTarget.value = "";
                }}
              />
            </label>
          </div>

          {menuPdfLibrary.length === 0 ? (
            <div className="menu-pdf-empty">No menu PDFs have been added yet. Add a PDF to create your reusable menu library.</div>
          ) : (
            <div className="menu-pdf-list">
              {menuPdfLibrary.map((item) => {
                const isSelected = item.id === data.bespokeMenuPdfId;
                return (
                  <div key={item.id} className={`menu-pdf-row ${isSelected ? "selected" : ""}`}>
                    <button type="button" className="menu-pdf-select" disabled={locked} onClick={() => selectMenuPdf(item.id)}>
                      <FileText size={19} />
                      <span>{item.name}</span>
                      {isSelected && <strong>Selected</strong>}
                    </button>
                    <button type="button" className="menu-pdf-delete" disabled={locked} onClick={() => void removeMenuPdf(item.id)} aria-label={`Remove ${item.name}`}>
                      <Trash2 size={17} />
                    </button>
                  </div>
                );
              })}
            </div>
          )}

          <div className="menu-pdf-actions">
            <button type="button" disabled={!selectedMenuPdf} onClick={openMenuPdfForPrint}>
              <Printer size={17} /> Print Menu
            </button>
            <button type="button" disabled={!selectedMenuPdf} onClick={exportSelectedMenuPdf}>
              <Download size={17} /> Export PDF
            </button>
          </div>

          {selectedMenuPdf && (
            <p className="menu-pdf-selected-note">Selected menu: <strong>{selectedMenuPdf.name}</strong></p>
          )}
        </section>
      )}

      <section className="club-advised-panel">
        <label className="club-advised-label">
          <input
            type="checkbox"
            checked={data.clubAdvised}
            onChange={(event) => setClubAdvised(event.target.checked)}
          />
          <span>Club Advised</span>
        </label>
        <p>
          Tick when the club events team has been informed of the final numbers
          and food requirements.
        </p>
      </section>

      {clubAdviceWarning && (
        <section className="catering-warning-card">
          <div className="warning-icon">!</div>
          <div style={{ color: "#c62828", fontWeight: 700 }}>
            <h3 style={{ color: "#c62828", fontWeight: 800 }}>Club Advised Reminder</h3>
            <p style={{ color: "#c62828", fontWeight: 700 }}>
              This event is within 21 days and the club events team has not yet
              been marked as advised of the final catering numbers and food
              requirements.
            </p>
            <p style={{ color: "#c62828", fontWeight: 700 }}>
              Please advise the club events team and tick <strong>Club Advised</strong>
              when this has been completed.
            </p>
          </div>
        </section>
      )}

      {locked && (
        <div className="catering-lock-note">
          <Lock size={16} />
          <span>
            Catering changes are locked because the event is within 14 days
            or has been archived.
          </span>
        </div>
      )}
    </PageLayout>
  );
}
