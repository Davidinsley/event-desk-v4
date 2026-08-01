import "./NewEvent.css";

import type { Player } from "../types/Player";

import PageLayout from "../layout/PageLayout";
import SummaryCard from "../ui/SummaryCard";
import ActionTile from "../ui/ActionTile";

import {
  UtensilsCrossed,
  Printer,
  Download,
  RefreshCw,
  FileText,
} from "lucide-react";

interface CateringProps {
  players: Player[];
}

export default function Catering({
  players,
}: CateringProps) {

  const meals = players.length;

  const summary = (
    <div className="page-summary">

      <SummaryCard
        title="Meals"
        value={meals.toString()}
      />

      <SummaryCard
        title="Vegetarian"
        value="0"
      />

      <SummaryCard
        title="Special Diet"
        value="0"
      />

      <SummaryCard
        title="Outstanding"
        value="0"
      />

      <SummaryCard
        title="Estimated Cost"
        value="£0"
      />

    </div>
  );

  const actions = (
    <div className="page-actions">

      <ActionTile
        icon={RefreshCw}
        title="Refresh"
        primary
      />

      <ActionTile
        icon={UtensilsCrossed}
        title="Meal Choices"
      />

      <ActionTile
        icon={FileText}
        title="Kitchen Report"
      />

      <ActionTile
        icon={Printer}
        title="Print"
      />

      <ActionTile
        icon={Download}
        title="Export"
      />

    </div>
  );

  return (
    <PageLayout
      title="Catering"
      subtitle="Manage player meals, dietary requirements and catering reports."
      summary={summary}
      actions={actions}
      footer="Catering management."
    >

      <div className="players-table">

        <table>

          <thead>

            <tr>
              <th>Player</th>
              <th>Meal</th>
              <th>Dietary</th>
              <th>Status</th>
            </tr>

          </thead>

          <tbody>

            {players.length === 0 ? (

              <tr>

                <td
                  colSpan={4}
                  className="empty-table"
                >
                  No players available.

                  <br />

                  Add players before selecting meals.

                </td>

              </tr>

            ) : (

              players.map((player) => (

                <tr key={player.id}>

                  <td>
                    {player.firstName} {player.lastName}
                  </td>

                  <td>Not Selected</td>

                  <td>None</td>

                  <td>Pending</td>

                </tr>

              ))

            )}

          </tbody>

        </table>

      </div>

    </PageLayout>
  );
}