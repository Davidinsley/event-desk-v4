import "./SummaryCard.css";

type SummaryCardProps = {
    title: string;
    value: string | number;
    subValue?: string;
    variant?: "default" | "success" | "warning" | "danger";
};

function SummaryCard({
    title,
    value,
    subValue,
    variant = "default",
}: SummaryCardProps) {
    return (
        <div className={`summary-card ${variant}`}>
            <span>{title}</span>

            <strong>{value}</strong>

            {subValue && <small>{subValue}</small>}
        </div>
    );
}

export default SummaryCard;