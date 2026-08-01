import { useState } from "react";
import "./NewEvent.css";

import type { Player } from "../types/Player";

import PageLayout from "../layout/PageLayout";
import SummaryCard from "../ui/SummaryCard";
import ActionTile from "../ui/ActionTile";

import {
  Shuffle,
  Users,
  Printer,
  Download,
  ListOrdered,
  Flag,
} from "lucide-react";

interface FieldManagementProps {
  players: Player[];
}

export default function FieldManagement({
  players,
}: FieldManagementProps) {

  const [drawCreated, setDrawCreated] = useState(false);

  const playerCount = players.length;
  const teams = Math.ceil(playerCount / 4);
  const waiting = playerCount % 4;

  function autoDraw() {
    setDrawCreated(true);
  }

  const summary = (
    <div className="page-summary">
      <SummaryCard title="Players" value={playerCount.toString()} />
      <SummaryCard title="Teams" value={teams.toString()} />
      <SummaryCard title="Spaces" value={(76 - playerCount).toString()} />
      <SummaryCard title="Waiting" value={waiting.toString()} />
      <SummaryCard
        title="Draw"
        value={drawCreated ? "Created" : "Not Started"}
      />
    </div>
  );

  const actions = (
    <div className="page-actions">

      <ActionTile
        icon={Shuffle}
        title="Auto Draw"
        primary
        onClick={autoDraw}
      />

      <ActionTile
        icon={Users}
        title="Manual Draw"
      />

      <ActionTile
        icon={ListOrdered}
        title="Randomise"
      />

      <ActionTile
        icon={Flag}
        title="Import Teams"
      />

      <ActionTile
        icon={Printer}
        title="Print Draw"
      />

      <ActionTile
        icon={Download}
        title="Export"
      />

    </div>
  );

  return (
    <PageLayout
      title="Field Management"
      subtitle="Create and manage the playing field, draw and starting order."
      summary={summary}
      actions={actions}
      footer="Team draw and starting sheet management."
    >

      <div className="players-table">

        <table>

          <thead>

            <tr>
              <th>Player</th>
              <th>Handicap</th>
              <th>Team</th>
              <th>Status</th>
            </tr>

          </thead>

          <tbody>

            {playerCount === 0 && (

              <tr>

                <td
                  colSpan={4}
                  className="empty-table"
                >
                  No players have been entered.

                </td>

              </tr>

            )}

            {playerCount > 0 && !drawCreated && (

              <tr>

                <td
                  colSpan={4}
                  className="empty-table"
                >
                  {playerCount} players ready.

                  <br />

                  Click <strong>Auto Draw</strong> to continue.

                </td>

              </tr>

            )}

            {drawCreated &&
              players.map((player, index) => (

                <tr key={player.id}>

                  <td>
                    {player.firstName} {player.lastName}
                  </td>

                  <td>
                    {player.handicapIndex.toFixed(1)}
                  </td>

                  <td>
                    {Math.floor(index / 4) + 1}
                  </td>

                  <td>
                    Drawn
                  </td>

                </tr>

              ))}

          </tbody>

        </table>

      </div>

    </PageLayout>
  );
}
