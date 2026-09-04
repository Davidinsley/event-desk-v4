/*
 * ============================================================
 * Financials.tsx
 * Ramsdale Seniors Event Desk
 * Financials Module — V1
 * ============================================================
 *
 * Purpose:
 * - Record the financial position of the event.
 * - Show Basic Income.
 * - Show Basic Outgoings.
 * - Show Charity.
 * - Calculate Surplus to Section.
 *
 * Financial calculation:
 *
 *   Basic Income
 *   - Basic Outgoings
 *   - Charity
 *   = Surplus to Section
 *
 * Income:
 * - Entry Fees
 * - Sponsorship
 * - Section Support
 *
 * Outgoings:
 * - Green Fees
 * - Food Charge
 * - Prize Fund
 * - Miscellaneous
 *
 * Entry Fee and Food Charge will subsequently be connected
 * to the existing Event Details and Catering data.
 * ============================================================
 */

import { useEffect, useMemo, useState } from "react";
import "./Financials.css";

import PageLayout from "../layout/PageLayout";

import {
  ArrowDownCircle,
  ArrowUpCircle,
  Gift,
  PoundSterling,
  Pencil,
} from "lucide-react";

interface FinancialsProps {
  players?: unknown[];
}

interface FinancialData {
  sponsorship: number;
  sectionSupport: number;
  greenFees: number;
  prizeFund: number;
  miscellaneous: number;
  miscellaneousItems: string;
  charity: number;
}

interface CateringPackageLike {
  id: string;
  name: string;
  price: number;
}

interface CateringDataLike {
  eating: number;
  selectedPackage: string | null;
  packages: CateringPackageLike[];
}

interface EventRecordLike {
  id: string;
  event?: {
    entryFee?: number;
    eventDate?: string;
  };
  archived?: boolean;
}

const EVENT_RECORDS_KEY = "eventDeskEventRecords";
const ACTIVE_EVENT_ID_KEY = "eventDeskActiveEventId";
const CATERING_KEY_PREFIX = "eventDeskCateringV1:";

const EMPTY_DATA: FinancialData = {
  sponsorship: 0,
  sectionSupport: 0,
  greenFees: 0,
  prizeFund: 0,
  miscellaneous: 0,
  miscellaneousItems: "",
  charity: 0,
};

const readActiveEvent = (): EventRecordLike | null => {
  try {
    const activeId = localStorage.getItem(ACTIVE_EVENT_ID_KEY);

    const records = JSON.parse(
      localStorage.getItem(EVENT_RECORDS_KEY) || "[]",
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

const getFinancialsKey = () => {
  const activeEvent = readActiveEvent();

  return `eventDeskFinancials:${activeEvent?.id || "default"}`;
};

const loadFinancials = (): FinancialData => {
  try {
    const saved = localStorage.getItem(getFinancialsKey());

    if (!saved) {
      return EMPTY_DATA;
    }

    const parsed = JSON.parse(saved) as Partial<FinancialData>;

    return {
      sponsorship:
        typeof parsed.sponsorship === "number"
          ? Math.max(0, parsed.sponsorship)
          : 0,

      sectionSupport:
        typeof parsed.sectionSupport === "number"
          ? Math.max(0, parsed.sectionSupport)
          : 0,

      greenFees:
        typeof parsed.greenFees === "number"
          ? Math.max(0, parsed.greenFees)
          : 0,

      prizeFund:
        typeof parsed.prizeFund === "number"
          ? Math.max(0, parsed.prizeFund)
          : 0,

      miscellaneous:
        typeof parsed.miscellaneous === "number"
          ? Math.max(0, parsed.miscellaneous)
          : 0,

      miscellaneousItems:
        typeof parsed.miscellaneousItems === "string"
          ? parsed.miscellaneousItems
          : "",

      charity:
        typeof parsed.charity === "number"
          ? Math.max(0, parsed.charity)
          : 0,
    };
  } catch {
    return EMPTY_DATA;
  }
};

const saveFinancials = (data: FinancialData) => {
  try {
    localStorage.setItem(getFinancialsKey(), JSON.stringify(data));
  } catch (error) {
    console.error("Failed to save financial data", error);
  }
};

const formatCurrency = (value: number) =>
  `£${Math.round(value).toLocaleString("en-GB")}`;

const loadCateringCharge = (eventId?: string): number => {
  if (!eventId) {
    return 0;
  }

  try {
    const saved = localStorage.getItem(
      `${CATERING_KEY_PREFIX}${eventId}`,
    );

    if (!saved) {
      return 0;
    }

    const catering = JSON.parse(saved) as Partial<CateringDataLike>;

    const eating =
      typeof catering.eating === "number"
        ? Math.max(0, catering.eating)
        : 0;

    const selectedPackageId =
      typeof catering.selectedPackage === "string"
        ? catering.selectedPackage
        : null;

    const packages = Array.isArray(catering.packages)
      ? catering.packages
      : [];

    const selectedPackage = packages.find(
      (item) => item.id === selectedPackageId,
    );

    const price =
      selectedPackage &&
      typeof selectedPackage.price === "number"
        ? Math.max(0, selectedPackage.price)
        : 0;

    return eating * price;
  } catch {
    return 0;
  }
};

export default function Financials({ players = [] }: FinancialsProps) {
  const [data, setData] = useState<FinancialData>(loadFinancials);
  const [cateringCharge, setCateringCharge] = useState(0);

  const activeEvent = useMemo(() => readActiveEvent(), []);

  useEffect(() => {
    setData(loadFinancials());
    setCateringCharge(loadCateringCharge(activeEvent?.id));
  }, [activeEvent?.id]);

  useEffect(() => {
    saveFinancials(data);
  }, [data]);

  /*
   * The number of event players will eventually be used to
   * calculate Entry Fee income from the event registration.
   *
   * For this first version the calculation is deliberately
   * kept separate so that we do not duplicate or alter the
   * existing Event Details financial data.
   */
  const playerCount = players.length;

  const entryFee = Number(activeEvent?.event?.entryFee || 0);

  const entryFeeIncome = playerCount * entryFee;

  const basicIncome =
    entryFeeIncome +
    data.sponsorship +
    data.sectionSupport;

  const basicOutgoings =
    data.greenFees +
    cateringCharge +
    data.prizeFund +
    data.miscellaneous;

  const surplusToSection =
    basicIncome -
    basicOutgoings -
    data.charity;

  const updateValue = (
    field: keyof FinancialData,
    value: string,
  ) => {
    const numericValue = Number(value);

    setData((current) => ({
      ...current,
      [field]: Number.isFinite(numericValue)
        ? Math.max(0, numericValue)
        : 0,
    }));
  };

  const summary = (
    <div className="financial-summary">
      <div className="financial-summary-card">
        <div className="financial-summary-title">
          Basic Income
        </div>

        <div className="financial-summary-value">
          {formatCurrency(basicIncome)}
        </div>
      </div>

      <div className="financial-summary-card">
        <div className="financial-summary-title">
          Basic Outgoings
        </div>

        <div className="financial-summary-value">
          {formatCurrency(basicOutgoings)}
        </div>
      </div>

      <div className="financial-summary-card">
        <div className="financial-summary-title">
          Charity
        </div>

        <div className="financial-summary-value">
          {formatCurrency(data.charity)}
        </div>
      </div>

      <div
        className={`financial-summary-card ${
          surplusToSection < 0 ? "negative" : ""
        }`}
      >
        <div className="financial-summary-title">
          Surplus to Section
        </div>

        <div className="financial-summary-value">
          {formatCurrency(surplusToSection)}
        </div>
      </div>
    </div>
  );

  return (
    <PageLayout
      title="Financials"
      summary={summary}
      footer="Event financial management."
    >
      <section className="financial-card">
        <div className="financial-card-header">
          <div>
            <h2>Income</h2>
            <p>
              Money received or expected from the event.
            </p>
          </div>

          <ArrowUpCircle size={24} />
        </div>

        <div className="financial-grid">
          <div className="financial-entry">
            <div className="financial-entry-label">
              Entry Fees
            </div>

            <div className="financial-entry-value">
              {formatCurrency(entryFeeIncome)}
            </div>

            <div className="financial-entry-note">
              {playerCount} players × {formatCurrency(entryFee)}
            </div>
          </div>

          <label className="financial-entry editable">
            <span className="financial-entry-label">
              Sponsorship
            </span>

            <div className="currency-input">
              <span>£</span>

              <input
                type="number"
                min="0"
                step="1"
                value={data.sponsorship || ""}
                onChange={(event) =>
                  updateValue(
                    "sponsorship",
                    event.target.value,
                  )
                }
              />
            </div>
          </label>

          <label className="financial-entry editable">
            <span className="financial-entry-label">
              Section Support
            </span>

            <div className="currency-input">
              <span>£</span>

              <input
                type="number"
                min="0"
                step="1"
                value={data.sectionSupport || ""}
                onChange={(event) =>
                  updateValue(
                    "sectionSupport",
                    event.target.value,
                  )
                }
              />
            </div>
          </label>
        </div>
      </section>

      <section className="financial-card">
        <div className="financial-card-header">
          <div>
            <h2>Outgoings</h2>
            <p>
              Costs associated with running the event.
            </p>
          </div>

          <ArrowDownCircle size={24} />
        </div>

        <div className="financial-grid">
          <label className="financial-entry editable">
            <span className="financial-entry-label">
              Green Fees
            </span>

            <div className="currency-input">
              <span>£</span>

              <input
                type="number"
                min="0"
                step="1"
                value={data.greenFees || ""}
                onChange={(event) =>
                  updateValue(
                    "greenFees",
                    event.target.value,
                  )
                }
              />
            </div>
          </label>

          <div className="financial-entry">
            <div className="financial-entry-label">
              Food Charge
            </div>

            <div className="financial-entry-value">
              {formatCurrency(cateringCharge)}
            </div>

            <div className="financial-entry-note">
              Linked to Catering
            </div>
          </div>

          <label className="financial-entry editable">
            <span className="financial-entry-label">
              Prize Fund
            </span>

            <div className="currency-input">
              <span>£</span>

              <input
                type="number"
                min="0"
                step="1"
                value={data.prizeFund || ""}
                onChange={(event) =>
                  updateValue(
                    "prizeFund",
                    event.target.value,
                  )
                }
              />
            </div>
          </label>

          <label className="financial-entry editable">
            <span className="financial-entry-label">
              Miscellaneous
            </span>

            <div className="currency-input">
              <span>£</span>

              <input
                type="number"
                min="0"
                step="1"
                value={data.miscellaneous || ""}
                onChange={(event) =>
                  updateValue(
                    "miscellaneous",
                    event.target.value,
                  )
                }
              />
            </div>
          </label>

          <div className="financial-entry miscellaneous-items-entry">
            <div
              className="financial-entry-label"
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: "10px",
              }}
            >
              <span>Miscellaneous Items</span>
              <Pencil size={18} />
            </div>

            <textarea
              value={data.miscellaneousItems}
              onChange={(event) =>
                setData((current) => ({
                  ...current,
                  miscellaneousItems: event.target.value,
                }))
              }
              placeholder={
                "Enter brief items, one per line\nExample: Scorecards\nNearest the Pin markers"
              }
              aria-label="Miscellaneous Items"
              style={{
                width: "100%",
                minHeight: "112px",
                marginTop: "10px",
                padding: "10px 12px",
                boxSizing: "border-box",
                border: "1px solid #dbe5ef",
                borderRadius: "8px",
                background: "#ffffff",
                color: "#334155",
                fontSize: "15px",
                lineHeight: 1.45,
                fontFamily: "inherit",
                resize: "vertical",
              }}
            />
          </div>
        </div>
      </section>

      <section className="financial-card financial-final-card">
        <div className="financial-card-header">
          <div>
            <h2>Charity</h2>
            <p>
              Amount allocated to charity before calculating
              the surplus retained by the Seniors Section.
            </p>
          </div>

          <Gift size={24} />
        </div>

        <div className="financial-final-grid">
          <label className="financial-entry editable">
            <span className="financial-entry-label">
              Charity Contribution
            </span>

            <div className="currency-input">
              <span>£</span>

              <input
                type="number"
                min="0"
                step="1"
                value={data.charity || ""}
                onChange={(event) =>
                  updateValue(
                    "charity",
                    event.target.value,
                  )
                }
              />
            </div>
          </label>

          <div className="financial-calculation">
            <div>
              <span>Basic Income</span>
              <strong>{formatCurrency(basicIncome)}</strong>
            </div>

            <div>
              <span>Basic Outgoings</span>
              <strong>
                − {formatCurrency(basicOutgoings)}
              </strong>
            </div>

            <div>
              <span>Charity</span>
              <strong>
                − {formatCurrency(data.charity)}
              </strong>
            </div>

            <div className="financial-calculation-total">
              <span>Surplus to Section</span>

              <strong>
                <PoundSterling size={18} />
                {formatCurrency(surplusToSection).replace(
                  "£",
                  "",
                )}
              </strong>
            </div>
          </div>
        </div>
      </section>
    </PageLayout>
  );
}