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

import { Lock, UtensilsCrossed } from "lucide-react";

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

const getDaysUntilEvent = (eventDate: string) => {
  if (!eventDate) {
    return null;
  }

  const target = new Date(`${eventDate}T00:00:00`);

  if (Number.isNaN(target.getTime())) {
    return null;
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

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

  const activeEvent = readActiveEvent();
  const eventDate = activeEvent?.event?.eventDate || "";
  const daysUntilEvent = getDaysUntilEvent(eventDate);

  const locked =
    Boolean(activeEvent?.archived) ||
    (daysUntilEvent !== null && daysUntilEvent <= 14);

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

            <div className={`package-lock ${locked ? "locked" : ""}`}>
              <Lock size={14} />
              {locked ? "Locked" : "Open"}
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
