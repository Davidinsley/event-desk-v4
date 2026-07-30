import "./PageHeader.css";

type PageHeaderProps = {
    title: string;
    subtitle: string;
};

function PageHeader({ title, subtitle }: PageHeaderProps) {
    return (
        <div className="page-header">
            <h1>{title}</h1>
            <p>{subtitle}</p>
        </div>
    );
}

export default PageHeader;