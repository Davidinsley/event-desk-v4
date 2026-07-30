import type { ReactNode } from "react";
import "./Workspace.css";

interface WorkspaceProps {
  title: string;
  subtitle?: string;
  summary?: ReactNode;
  actions?: ReactNode;
  children: ReactNode;
}

export default function Workspace({
  title,
  subtitle,
  summary,
  actions,
  children,
}: WorkspaceProps) {
  return (
    <div className="workspace">
      <header className="workspace-header">
        <h1>{title}</h1>

        {subtitle && (
          <p className="workspace-subtitle">
            {subtitle}
          </p>
        )}
      </header>

      {summary && (
        <section className="workspace-summary">
          {summary}
        </section>
      )}

      {actions && (
        <section className="workspace-actions">
          {actions}
        </section>
      )}

      <main className="workspace-content">
        {children}
      </main>
    </div>
  );
}