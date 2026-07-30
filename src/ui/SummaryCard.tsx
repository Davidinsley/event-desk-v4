import "./SummaryCard.css";

type SummaryCardProps = {
    title: string;
    value: string | number;
    variant?: "default" | "success" | "warning" | "danger";
};

function SummaryCard({
    title,
    value,
    variant = "default",
}: SummaryCardProps) {
    return (
        <div className={`summary-card ${variant}`}>
            <span>{title}</span>
            <strong>{value}</strong>
        </div>
    );
}

export default SummaryCard;