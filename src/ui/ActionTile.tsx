// ActionTile.tsx
// Ramsdale Seniors Event Desk
// Revision: Restore Subtitle and Disabled Support

import type { LucideIcon } from "lucide-react";

import "./ActionTile.css";

interface ActionTileProps {
    icon: LucideIcon;
    title: string;
    subtitle?: string;
    onClick?: () => void;
    primary?: boolean;
    disabled?: boolean;
    warning?: "amber" | "red";
}

function ActionTile({
    icon: Icon,
    title,
    subtitle,
    onClick,
    primary = false,
    disabled = false,
    warning,
}: ActionTileProps) {
    return (
        <button
            type="button"
            className={`action-tile${primary ? " primary" : ""}${warning ? ` warning-${warning}` : ""}`}
            style={
                warning === "red"
                    ? {
                        background: "#fdecec",
                        borderColor: "#efb4b4",
                        color: "#b42318",
                    }
                    : warning === "amber"
                    ? {
                        background: "#fff7e6",
                        borderColor: "#f2d39b",
                        color: "#8a5a00",
                    }
                    : undefined
            }
            onClick={onClick}
            disabled={disabled}
        >
            <Icon
                className="action-tile-icon"
                size={28}
                strokeWidth={2}
            />

            {subtitle && (
                <span className="action-tile-subtitle">
                    {subtitle}
                </span>
            )}

            <span className="action-tile-title">
                {title}
            </span>
        </button>
    );
}

export default ActionTile;