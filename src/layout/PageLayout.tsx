import type { ReactNode } from "react";
import "./PageLayout.css";
import Workspace from "../ui/Workspace";

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
      <Workspace
        title={title}
        subtitle={subtitle}
        summary={summary}
        actions={actions}
      >
        {children}

        {footer && (
          <div className="page-footer">
            {footer}
          </div>
        )}
      </Workspace>
    </div>
  );
}