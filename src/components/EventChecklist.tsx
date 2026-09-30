import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, CheckCircle2, Circle, Plus, Trash2 } from "lucide-react";
import type { Event } from "../types/Event";

interface EventChecklistProps {
  event: Event;
  readOnly?: boolean;
  onBack: () => void;
}

type TaskStatus = "todo" | "complete";

interface ChecklistTask {
  id: string;
  text: string;
  status: TaskStatus;
}

const STORAGE_PREFIX = "eventDeskChecklistV1:";

const starterTasks = (): ChecklistTask[] => [
  { id: "event-details", text: "Confirm event details", status: "todo" },
  { id: "competition", text: "Confirm competition format and rules", status: "todo" },
  { id: "players", text: "Confirm player field / start sheet", status: "todo" },
  { id: "catering", text: "Confirm catering arrangements", status: "todo" },
  { id: "posters", text: "Prepare / attach event poster", status: "todo" },
  { id: "financials", text: "Check entry fee and event finances", status: "todo" },
  { id: "booklet", text: "Prepare event booklet / print material", status: "todo" },
];

export default function EventChecklist({
  event,
  readOnly = false,
  onBack,
}: EventChecklistProps) {
  const storageKey = `${STORAGE_PREFIX}${event.eventNumber}`;
  const [tasks, setTasks] = useState<ChecklistTask[]>([]);
  const [newTask, setNewTask] = useState("");

  useEffect(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          setTasks(parsed);
          return;
        }
      }
    } catch (error) {
      console.error("Failed to load event checklist", error);
    }

    setTasks(starterTasks());
  }, [storageKey]);

  useEffect(() => {
    if (tasks.length === 0) return;

    try {
      localStorage.setItem(storageKey, JSON.stringify(tasks));
    } catch (error) {
      console.error("Failed to save event checklist", error);
    }
  }, [storageKey, tasks]);

  const completed = useMemo(
    () => tasks.filter((task) => task.status === "complete").length,
    [tasks]
  );

  const progress = tasks.length > 0
    ? Math.round((completed / tasks.length) * 100)
    : 0;

  const toggleTask = (id: string) => {
    if (readOnly) return;
    setTasks((current) =>
      current.map((task) =>
        task.id === id
          ? { ...task, status: task.status === "complete" ? "todo" : "complete" }
          : task
      )
    );
  };

  const addTask = () => {
    const text = newTask.trim();
    if (!text || readOnly) return;

    setTasks((current) => [
      ...current,
      {
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        text,
        status: "todo",
      },
    ]);
    setNewTask("");
  };

  const deleteTask = (id: string) => {
    if (readOnly) return;
    setTasks((current) => current.filter((task) => task.id !== id));
  };

  return (
    <div style={{ width: "100%", maxWidth: "1100px", margin: "0 auto", padding: "34px 42px 48px", boxSizing: "border-box" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "20px", marginBottom: "24px" }}>
        <div>
          <h1 style={{ margin: 0, color: "#205b9f", fontSize: "36px" }}>Event To Do / Checklist</h1>
          <p style={{ margin: "8px 0 0", color: "#64748b", fontSize: "17px" }}>
            Event {event.eventNumber} — {event.eventName || "Untitled Event"}
          </p>
        </div>
        <button
          type="button"
          onClick={onBack}
          style={{ display: "flex", alignItems: "center", gap: "8px", border: "1px solid #2f6db5", borderRadius: "10px", padding: "10px 16px", background: "white", color: "#205b9f", fontWeight: 700, cursor: "pointer" }}
        >
          <ArrowLeft size={18} /> Back to Event
        </button>
      </div>

      <div style={{ background: "white", border: "1px solid #dbe7f3", borderRadius: "14px", padding: "20px 22px", marginBottom: "20px", boxShadow: "0 2px 8px rgba(31,91,159,0.06)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "16px", marginBottom: "12px" }}>
          <strong style={{ color: "#1e4f89", fontSize: "18px" }}>Overall Progress</strong>
          <span style={{ color: "#64748b", fontWeight: 700 }}>{completed} of {tasks.length} complete — {progress}%</span>
        </div>
        <div style={{ height: "12px", borderRadius: "999px", background: "#e8eef5", overflow: "hidden" }}>
          <div style={{ width: `${progress}%`, height: "100%", background: "#2f8f5b", transition: "width 180ms ease" }} />
        </div>
      </div>

      {!readOnly && (
        <div style={{ display: "flex", gap: "10px", marginBottom: "18px" }}>
          <input
            value={newTask}
            onChange={(e) => setNewTask(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") addTask(); }}
            placeholder="Add a task for this event..."
            style={{ flex: 1, border: "1px solid #cbd8e6", borderRadius: "10px", padding: "12px 14px", fontSize: "16px" }}
          />
          <button
            type="button"
            onClick={addTask}
            style={{ display: "flex", alignItems: "center", gap: "8px", border: "none", borderRadius: "10px", padding: "12px 18px", background: "#2468b3", color: "white", fontWeight: 700, cursor: "pointer" }}
          >
            <Plus size={18} /> Add Task
          </button>
        </div>
      )}

      <div style={{ background: "white", border: "1px solid #dbe7f3", borderRadius: "14px", overflow: "hidden", boxShadow: "0 2px 8px rgba(31,91,159,0.06)" }}>
        {tasks.map((task, index) => {
          const done = task.status === "complete";
          return (
            <div
              key={task.id}
              style={{ display: "grid", gridTemplateColumns: "42px 1fr auto", alignItems: "center", gap: "12px", padding: "15px 18px", borderBottom: index === tasks.length - 1 ? "none" : "1px solid #e7eef6", background: done ? "#f7fbf8" : "white" }}
            >
              <button
                type="button"
                onClick={() => toggleTask(task.id)}
                disabled={readOnly}
                aria-label={done ? "Mark task incomplete" : "Mark task complete"}
                style={{ border: "none", background: "transparent", padding: 0, color: done ? "#2f8f5b" : "#7b8da3", cursor: readOnly ? "default" : "pointer" }}
              >
                {done ? <CheckCircle2 size={25} /> : <Circle size={25} />}
              </button>

              <span style={{ color: done ? "#6b7f73" : "#24364b", fontSize: "16px", fontWeight: 600, textDecoration: done ? "line-through" : "none" }}>
                {task.text}
              </span>

              {!readOnly && (
                <button
                  type="button"
                  onClick={() => deleteTask(task.id)}
                  title="Delete task"
                  aria-label="Delete task"
                  style={{ border: "1px solid #dbe3ec", borderRadius: "8px", background: "white", color: "#b42318", padding: "7px 9px", cursor: "pointer" }}
                >
                  <Trash2 size={16} />
                </button>
              )}
            </div>
          );
        })}

        {tasks.length === 0 && (
          <div style={{ padding: "34px", textAlign: "center", color: "#64748b" }}>
            No checklist tasks yet.
          </div>
        )}
      </div>

      {readOnly && (
        <p style={{ marginTop: "14px", color: "#64748b", fontSize: "14px" }}>
          This is an archived event. The checklist is available for reference only.
        </p>
      )}
    </div>
  );
}
