import "./NewEvent.css";

import PageLayout from "../layout/PageLayout";
import SummaryCard from "../ui/SummaryCard";
import ActionTile from "../ui/ActionTile";

import type { Player } from "../types/Player";

import {
  RefreshCw,
  Lock,
  Download,
  Printer,
  Users,
} from "lucide-react";

interface HandicapUpdateProps {
  players: Player[];
}

export default function HandicapUpdate({
  players,
}: HandicapUpdateProps) {
  const summary = (
    <div className="page-summary">
      <SummaryCard title="Players" value="0" />
      <SummaryCard title="Updated" value="0" />
      <SummaryCard title="Outstanding" value="0" />
      <SummaryCard title="Locked" value="No" />
      <SummaryCard title="Average HI" value="0.0" />
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
        icon={Users}
        title="Import Players"
      />

      <ActionTile
        icon={Lock}
        title="Lock Handicaps"
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
      title="Handicap Update"
      subtitle="Review and update player handicap indexes before locking the competition."
      summary={summary}
      actions={actions}
      footer="Handicaps remain editable until they are locked."
    >
      <div className="event-details">

        <div className="players-table">

          <table>

            <thead>

              <tr>
                <th>Player</th>
                <th>Current HI</th>
                <th>Course Hcp</th>
                <th>Playing Hcp</th>
                <th>Status</th>
              </tr>

            </thead>

            <tbody>

              <tr>

                <td
                  colSpan={5}
                  className="empty-table"
                >
                  <strong>
                    No players available.
                  </strong>

                  <br />

                  Add players first before
                  updating handicaps.

                </td>

              </tr>

            </tbody>

          </table>

        </div>

        <div className="button-bar">

          <button className="primary-button">
            Save Handicap Updates
          </button>

        </div>

      </div>

    </PageLayout>
  );
}