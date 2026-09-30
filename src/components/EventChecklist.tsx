import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, CheckCircle2, Circle, Pencil, Plus, Trash2, X } from "lucide-react";
import type { Event } from "../types/Event";

interface EventChecklistProps {
  event: Event;
  readOnly?: boolean;
  onBack: () => void;
}

type TaskStatus = "todo" | "complete";

type TaskCategory =
  | "Event Details"
  | "Competition"
  | "Players"
  | "Field & Draw"
  | "Catering"
  | "Posters"
  | "Financials"
  | "Booklets"
  | "General";

interface ChecklistTask {
  id: string;
  text: string;
  status: TaskStatus;
  category: TaskCategory;
  dueDate?: string;
  assignedTo?: string;
}

const categories: TaskCategory[] = [
  "Event Details",
  "Competition",
  "Players",
  "Field & Draw",
  "Catering",
  "Posters",
  "Financials",
  "Booklets",
  "General",
];

const STORAGE_PREFIX = "eventDeskChecklistV1:";

const starterTasks = (): ChecklistTask[] => [
  { id: "event-details", text: "Confirm event details", status: "todo", category: "Event Details" },
  { id: "competition", text: "Confirm competition format and rules", status: "todo", category: "Competition" },
  { id: "players", text: "Confirm player field / start sheet", status: "todo", category: "Players" },
  { id: "catering", text: "Confirm catering arrangements", status: "todo", category: "Catering" },
  { id: "posters", text: "Prepare / attach event poster", status: "todo", category: "Posters" },
  { id: "financials", text: "Check entry fee and event finances", status: "todo", category: "Financials" },
  { id: "booklet", text: "Prepare event booklet / print material", status: "todo", category: "Booklets" },
];

const categoryForExistingTask = (task: Partial<ChecklistTask>): TaskCategory => {
  if (task.category && categories.includes(task.category as TaskCategory)) {
    return task.category as TaskCategory;
  }

  const byId: Record<string, TaskCategory> = {
    "event-details": "Event Details",
    competition: "Competition",
    players: "Players",
    catering: "Catering",
    posters: "Posters",
    financials: "Financials",
    booklet: "Booklets",
  };

  return byId[String(task.id ?? "")] ?? "General";
};

export default function EventChecklist({
  event,
  readOnly = false,
  onBack,
}: EventChecklistProps) {
  const storageKey = `${STORAGE_PREFIX}${event.eventNumber}`;
  const [tasks, setTasks] = useState<ChecklistTask[]>([]);
  const [newTask, setNewTask] = useState("");
  const [newCategory, setNewCategory] = useState<TaskCategory>("General");
  const [newDueDate, setNewDueDate] = useState("");
  const [newAssignedTo, setNewAssignedTo] = useState("");
  const [newOtherAssignee, setNewOtherAssignee] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | TaskStatus>("all");
  const [categoryFilter, setCategoryFilter] = useState<"all" | TaskCategory>("all");
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [editText, setEditText] = useState("");
  const [editCategory, setEditCategory] = useState<TaskCategory>("General");
  const [editDueDate, setEditDueDate] = useState("");
  const [editAssignedTo, setEditAssignedTo] = useState("");
  const [editOtherAssignee, setEditOtherAssignee] = useState("");

  useEffect(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          setTasks(
            parsed.map((task) => ({
              ...task,
              category: categoryForExistingTask(task),
            }))
          );
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
        category: newCategory,
        dueDate: newDueDate || undefined,
        assignedTo: newAssignedTo === "A. Other"
          ? (newOtherAssignee.trim() || "A. Other")
          : (newAssignedTo || undefined),
      },
    ]);
    setNewTask("");
    setNewDueDate("");
    setNewAssignedTo("");
    setNewOtherAssignee("");
  };

  const deleteTask = (id: string) => {
    if (readOnly) return;
    setTasks((current) => current.filter((task) => task.id !== id));
  };

  const startEditing = (task: ChecklistTask) => {
    if (readOnly) return;
    setEditingTaskId(task.id);
    setEditText(task.text);
    setEditCategory(task.category);
    setEditDueDate(task.dueDate ?? "");

    const standardAssignees = [
      "D.Insley",
      "R.Hone",
      "D.Costin",
      "M.Voce",
      "C.West",
      "N.Clark",
      "M.Fisher",
      "S.Murry",
      "D.Dandie",
    ];

    if (task.assignedTo && !standardAssignees.includes(task.assignedTo)) {
      setEditAssignedTo("A. Other");
      setEditOtherAssignee(task.assignedTo === "A. Other" ? "" : task.assignedTo);
    } else {
      setEditAssignedTo(task.assignedTo ?? "");
      setEditOtherAssignee("");
    }
  };

  const cancelEditing = () => {
    setEditingTaskId(null);
    setEditText("");
    setEditCategory("General");
    setEditDueDate("");
    setEditAssignedTo("");
    setEditOtherAssignee("");
  };

  const saveEditing = () => {
    const text = editText.trim();
    if (!editingTaskId || !text || readOnly) return;

    const assignedTo = editAssignedTo === "A. Other"
      ? (editOtherAssignee.trim() || "A. Other")
      : (editAssignedTo || undefined);

    setTasks((current) =>
      current.map((task) =>
        task.id === editingTaskId
          ? {
              ...task,
              text,
              category: editCategory,
              dueDate: editDueDate || undefined,
              assignedTo,
            }
          : task
      )
    );

    cancelEditing();
  };

  const filteredTasks = useMemo(() =>
    tasks.filter((task) =>
      (statusFilter === "all" || task.status === statusFilter) &&
      (categoryFilter === "all" || task.category === categoryFilter)
    ),
    [tasks, statusFilter, categoryFilter]
  );

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
          <select
            value={newCategory}
            onChange={(e) => setNewCategory(e.target.value as TaskCategory)}
            aria-label="Task category"
            style={{ minWidth: "160px", border: "1px solid #cbd8e6", borderRadius: "10px", padding: "12px 12px", fontSize: "15px", background: "white", color: "#24364b" }}
          >
            {categories.map((category) => (
              <option key={category} value={category}>{category}</option>
            ))}
          </select>
          <input
            type="date"
            value={newDueDate}
            onChange={(e) => setNewDueDate(e.target.value)}
            aria-label="Due date"
            title="Due date"
            style={{ minWidth: "150px", border: "1px solid #cbd8e6", borderRadius: "10px", padding: "12px", fontSize: "15px", color: "#24364b" }}
          />
          <select
            value={newAssignedTo}
            onChange={(e) => {
              setNewAssignedTo(e.target.value);
              if (e.target.value !== "A. Other") setNewOtherAssignee("");
            }}
            aria-label="Assigned to"
            style={{ minWidth: "170px", border: "1px solid #cbd8e6", borderRadius: "10px", padding: "12px 12px", fontSize: "15px", background: "white", color: "#24364b" }}
          >
            <option value="">Assigned to...</option>
            <option value="D.Insley">D.Insley</option>
            <option value="R.Hone">R.Hone</option>
            <option value="D.Costin">D.Costin</option>
            <option value="M.Voce">M.Voce</option>
            <option value="C.West">C.West</option>
            <option value="N.Clark">N.Clark</option>
            <option value="M.Fisher">M.Fisher</option>
            <option value="S.Murry">S.Murry</option>
            <option value="D.Dandie">D.Dandie</option>
            <option value="A. Other">A. Other</option>
          </select>
          {newAssignedTo === "A. Other" && (
            <input
              value={newOtherAssignee}
              onChange={(e) => setNewOtherAssignee(e.target.value)}
              placeholder="Enter name..."
              aria-label="Other assignee name"
              style={{ minWidth: "150px", border: "1px solid #cbd8e6", borderRadius: "10px", padding: "12px 14px", fontSize: "15px" }}
            />
          )}
          <button
            type="button"
            onClick={addTask}
            style={{ display: "flex", alignItems: "center", gap: "8px", border: "none", borderRadius: "10px", padding: "12px 18px", background: "#2468b3", color: "white", fontWeight: 700, cursor: "pointer" }}
          >
            <Plus size={18} /> Add Task
          </button>
        </div>
      )}

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "12px", flexWrap: "wrap", marginBottom: "14px" }}>
        <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
          {[
            { value: "all", label: "All Tasks" },
            { value: "todo", label: "To Do" },
            { value: "complete", label: "Completed" },
          ].map((filter) => {
            const active = statusFilter === filter.value;
            return (
              <button
                key={filter.value}
                type="button"
                onClick={() => setStatusFilter(filter.value as "all" | TaskStatus)}
                style={{ border: `1px solid ${active ? "#2468b3" : "#cbd8e6"}`, borderRadius: "9px", padding: "9px 14px", background: active ? "#eaf3fd" : "white", color: active ? "#205b9f" : "#52657a", fontWeight: 700, cursor: "pointer" }}
              >
                {filter.label}
              </button>
            );
          })}
        </div>

        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value as "all" | TaskCategory)}
          aria-label="Filter by category"
          style={{ minWidth: "190px", border: "1px solid #cbd8e6", borderRadius: "9px", padding: "9px 12px", fontSize: "14px", background: "white", color: "#24364b", fontWeight: 600 }}
        >
          <option value="all">All Categories</option>
          {categories.map((category) => (
            <option key={category} value={category}>{category}</option>
          ))}
        </select>
      </div>

      <div style={{ background: "white", border: "1px solid #dbe7f3", borderRadius: "14px", overflow: "hidden", boxShadow: "0 2px 8px rgba(31,91,159,0.06)" }}>
        {filteredTasks.map((task, index) => {
          const done = task.status === "complete";
          return (
            <div
              key={task.id}
              style={{ display: "grid", gridTemplateColumns: "42px 1fr auto", alignItems: "center", gap: "12px", padding: "15px 18px", borderBottom: index === filteredTasks.length - 1 ? "none" : "1px solid #e7eef6", background: done ? "#f7fbf8" : "white" }}
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

              <div style={{ minWidth: 0 }}>
                {editingTaskId === task.id ? (
                  <div style={{ display: "grid", gap: "9px" }}>
                    <input
                      value={editText}
                      onChange={(e) => setEditText(e.target.value)}
                      onKeyDown={(e) => { if (e.key === "Enter") saveEditing(); }}
                      aria-label="Edit task text"
                      style={{ width: "100%", boxSizing: "border-box", border: "1px solid #cbd8e6", borderRadius: "8px", padding: "9px 10px", fontSize: "15px" }}
                    />
                    <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                      <select
                        value={editCategory}
                        onChange={(e) => setEditCategory(e.target.value as TaskCategory)}
                        aria-label="Edit task category"
                        style={{ border: "1px solid #cbd8e6", borderRadius: "8px", padding: "8px 10px", background: "white", color: "#24364b" }}
                      >
                        {categories.map((category) => (
                          <option key={category} value={category}>{category}</option>
                        ))}
                      </select>
                      <input
                        type="date"
                        value={editDueDate}
                        onChange={(e) => setEditDueDate(e.target.value)}
                        aria-label="Edit due date"
                        style={{ border: "1px solid #cbd8e6", borderRadius: "8px", padding: "8px 10px", color: "#24364b" }}
                      />
                      <select
                        value={editAssignedTo}
                        onChange={(e) => {
                          setEditAssignedTo(e.target.value);
                          if (e.target.value !== "A. Other") setEditOtherAssignee("");
                        }}
                        aria-label="Edit assigned to"
                        style={{ border: "1px solid #cbd8e6", borderRadius: "8px", padding: "8px 10px", background: "white", color: "#24364b" }}
                      >
                        <option value="">Assigned to...</option>
                        <option value="D.Insley">D.Insley</option>
                        <option value="R.Hone">R.Hone</option>
                        <option value="D.Costin">D.Costin</option>
                        <option value="M.Voce">M.Voce</option>
                        <option value="C.West">C.West</option>
                        <option value="N.Clark">N.Clark</option>
                        <option value="M.Fisher">M.Fisher</option>
                        <option value="S.Murry">S.Murry</option>
                        <option value="D.Dandie">D.Dandie</option>
                        <option value="A. Other">A. Other</option>
                      </select>
                      {editAssignedTo === "A. Other" && (
                        <input
                          value={editOtherAssignee}
                          onChange={(e) => setEditOtherAssignee(e.target.value)}
                          placeholder="Enter name..."
                          aria-label="Edit other assignee name"
                          style={{ minWidth: "140px", border: "1px solid #cbd8e6", borderRadius: "8px", padding: "8px 10px" }}
                        />
                      )}
                      <button type="button" onClick={saveEditing} style={{ border: "none", borderRadius: "8px", padding: "8px 12px", background: "#2468b3", color: "white", fontWeight: 700, cursor: "pointer" }}>Save</button>
                      <button type="button" onClick={cancelEditing} style={{ display: "flex", alignItems: "center", gap: "5px", border: "1px solid #cbd8e6", borderRadius: "8px", padding: "8px 10px", background: "white", color: "#52657a", fontWeight: 700, cursor: "pointer" }}><X size={15} /> Cancel</button>
                    </div>
                  </div>
                ) : (
                  <>
                    <span style={{ color: done ? "#6b7f73" : "#24364b", fontSize: "16px", fontWeight: 600, textDecoration: done ? "line-through" : "none" }}>
                      {task.text}
                    </span>
                    <div style={{ marginTop: "6px" }}>
                      <span style={{ display: "inline-block", padding: "3px 8px", borderRadius: "999px", background: "#eef5fc", border: "1px solid #d7e6f5", color: "#205b9f", fontSize: "12px", fontWeight: 700 }}>
                        {task.category}
                      </span>
                      {task.dueDate && (
                        <span
                          style={{
                            display: "inline-block",
                            marginLeft: "8px",
                            padding: "3px 8px",
                            borderRadius: "999px",
                            background: "#fff7e6",
                            border: "1px solid #f2d39b",
                            color: "#8a5a00",
                            fontSize: "12px",
                            fontWeight: 700,
                          }}
                        >
                          Due: {new Date(`${task.dueDate}T00:00:00`).toLocaleDateString("en-GB")}
                        </span>
                      )}
                      {task.assignedTo && (
                        <span style={{ marginLeft: "8px", color: "#64748b", fontSize: "12px", fontWeight: 600 }}>
                          Assigned to: {task.assignedTo}
                        </span>
                      )}
                    </div>
                  </>
                )}
              </div>

              {!readOnly && (
                <div style={{ display: "flex", gap: "7px" }}>
                  <button
                    type="button"
                    onClick={() => startEditing(task)}
                    title="Edit task"
                    aria-label="Edit task"
                    disabled={editingTaskId === task.id}
                    style={{ border: "1px solid #dbe3ec", borderRadius: "8px", background: "white", color: "#2468b3", padding: "7px 9px", cursor: editingTaskId === task.id ? "default" : "pointer", opacity: editingTaskId === task.id ? 0.45 : 1 }}
                  >
                    <Pencil size={16} />
                  </button>
                  <button
                    type="button"
                    onClick={() => deleteTask(task.id)}
                    title="Delete task"
                    aria-label="Delete task"
                    style={{ border: "1px solid #dbe3ec", borderRadius: "8px", background: "white", color: "#b42318", padding: "7px 9px", cursor: "pointer" }}
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              )}
            </div>
          );
        })}

        {filteredTasks.length === 0 && (
          <div style={{ padding: "34px", textAlign: "center", color: "#64748b" }}>
            {tasks.length === 0 ? "No checklist tasks yet." : "No tasks match the selected filters."}
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
