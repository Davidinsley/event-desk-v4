import type { ReactNode } from "react";
import "./PageLayout.css";
import PageHeader from "../ui/PageHeader";

interface PageLayoutProps {
  title: string;
  subtitle?: string;
  summary?: ReactNode;
  actions?: ReactNode;
  footer?: ReactNode;
  children: ReactNode;
}

export default function PageLayout({
  title,
  subtitle,
  summary,
  actions,
  footer,
  children,
}: PageLayoutProps) {
  return (
    <div className="page-layout">

      <PageHeader
        title={title}
        subtitle={subtitle ?? ""}
      />

      {summary && (
        <div className="page-summary">
          {summary}
        </div>
      )}

      {actions && (
        <div className="page-actions">
          {actions}
        </div>
      )}

      <div className="page-content">
        {children}
      </div>

      {footer && (
        <div className="page-footer">
          {footer}
        </div>
      )}

    </div>
  );
}