import type { LucideIcon } from "lucide-react";
import "./ActionTile.css";

type ActionTileProps = {
  icon: LucideIcon;
  title: string;
  subtitle?: string;
  primary?: boolean;
  onClick?: () => void;
};

export default function ActionTile({
  icon: Icon,
  title,
  subtitle,
  primary = false,
  onClick,
}: ActionTileProps) {
  return (
    <button
      className={`action-tile${primary ? " primary" : ""}`}
      onClick={onClick}
      type="button"
    >
      <Icon className="action-icon" size={28} />

      {subtitle && (
        <span className="action-subtitle">
          {subtitle}
        </span>
      )}

      <span className="action-title">
        {title}
      </span>
    </button>
  );
}