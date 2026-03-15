"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useFetch, useApi } from "@/lib/hooks";
import { Task, TaskFields, TaskNode } from "@/lib/types";
import { cn } from "@/lib/utils";
import {
  buildTaskTree,
  groupByProject,
  filterTasks,
  formatDueDate,
  getCompletionPct,
  collectChildIds,
} from "@/lib/utils/taskHelpers";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Plus,
  ChevronRight,
  ChevronDown,
  Check,
  Square,
  CheckSquare,
  Calendar,
  FolderOpen,
  ListTodo,
  Search,
  Filter,
  MoreHorizontal,
  Trash2,
  PlusCircle,
  Flag,
  Clock,
  X,
} from "lucide-react";

// ============ CONSTANTS ============

const PRIORITY_COLORS: Record<string, string> = {
  urgent: "bg-red-500/10 text-red-400 border-red-500/20",
  high: "bg-orange-500/10 text-orange-400 border-orange-500/20",
  medium: "bg-blue-500/10 text-blue-400 border-blue-500/20",
  low: "bg-zinc-500/10 text-zinc-400 border-zinc-500/20",
};

const PRIORITY_DOT: Record<string, string> = {
  urgent: "bg-red-400",
  high: "bg-orange-400",
  medium: "bg-blue-400",
  low: "bg-zinc-500",
};

const STATUS_LABELS: Record<string, string> = {
  backlog: "Backlog",
  todo: "To Do",
  in_progress: "In Progress",
  done: "Done",
  archived: "Archived",
};

// ============ MAIN TASKS VIEW ============

export function TasksView() {
  const { data: tasks, loading, refetch } = useFetch<Task[]>("/api/tasks");
  const { post, patch, del, submitting } = useApi();

  const [view, setView] = useState<"hierarchy" | "kanban">("hierarchy");
  const [statusFilter, setStatusFilter] = useState("active");
  const [priorityFilter, setPriorityFilter] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [groupBy, setGroupBy] = useState<"project" | "none">("project");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [expandedTasks, setExpandedTasks] = useState<Set<string>>(
    new Set(["__all__"])
  );
  const [contextMenu, setContextMenu] = useState<{
    x: number;
    y: number;
    taskId: string;
  } | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  // New task form
  const [newTask, setNewTask] = useState({
    name: "",
    description: "",
    priority: "medium",
    project: "",
    dueDate: "",
    parentTaskId: "",
  });

  // Toast helper
  const showToast = useCallback((msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2500);
  }, []);

  // Build tree from flat tasks
  const taskTree = tasks ? buildTaskTree(tasks) : [];
  const filteredTree = filterTasks(taskTree, {
    status: statusFilter,
    priority: priorityFilter,
    search: searchQuery,
  });
  const grouped =
    groupBy === "project" ? groupByProject(filteredTree) : null;

  // Auto-expand all tasks with subtasks on first load
  useEffect(() => {
    if (tasks && expandedTasks.has("__all__")) {
      const expanded = new Set<string>();
      for (const t of tasks) {
        const hasChildren = tasks.some(
          (c) => c.fields.ParentTaskId === t.id
        );
        if (hasChildren) expanded.add(t.id);
      }
      setExpandedTasks(expanded);
    }
  }, [tasks]);

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      // Don't capture when typing in inputs
      const tag = (e.target as HTMLElement).tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;

      if (e.key === "n" && !e.metaKey && !e.ctrlKey) {
        e.preventDefault();
        setDialogOpen(true);
      }
      if (e.key === " " && selectedTaskId) {
        e.preventDefault();
        handleToggleComplete(selectedTaskId);
      }
      if ((e.key === "Delete" || e.key === "Backspace") && selectedTaskId && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        handleDelete(selectedTaskId);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [selectedTaskId]);

  // Close context menu on click outside
  useEffect(() => {
    if (!contextMenu) return;
    const handler = () => setContextMenu(null);
    window.addEventListener("click", handler);
    return () => window.removeEventListener("click", handler);
  }, [contextMenu]);

  // ---- Actions ----

  const handleCreate = async () => {
    if (!newTask.name.trim()) return;
    await post("/api/tasks", {
      name: newTask.name,
      description: newTask.description,
      priority: newTask.priority,
      project: newTask.project,
      dueDate: newTask.dueDate,
      parentTaskId: newTask.parentTaskId || undefined,
    });
    setNewTask({
      name: "",
      description: "",
      priority: "medium",
      project: "",
      dueDate: "",
      parentTaskId: "",
    });
    setDialogOpen(false);
    showToast("Task created");
    refetch();
  };

  const handleToggleComplete = async (taskId: string) => {
    const task = tasks?.find((t) => t.id === taskId);
    if (!task) return;
    const newStatus = task.fields.Status === "done" ? "todo" : "done";
    await patch(`/api/tasks/${taskId}`, { status: newStatus });

    // Auto-complete children if completing parent
    if (newStatus === "done") {
      const node = findNode(taskTree, taskId);
      if (node && node.subtasks.length > 0) {
        const childIds = collectChildIds(node);
        for (const cid of childIds) {
          await patch(`/api/tasks/${cid}`, { status: "done" });
        }
        showToast(
          `Completed task + ${childIds.length} subtask${childIds.length > 1 ? "s" : ""}`
        );
      } else {
        showToast("Task completed");
      }
    } else {
      showToast("Task reopened");
    }
    refetch();
  };

  const handleInlineRename = async (taskId: string, newName: string) => {
    if (!newName.trim()) return;
    await patch(`/api/tasks/${taskId}`, { name: newName.trim() });
    refetch();
  };

  const handleDelete = async (taskId: string) => {
    await del(`/api/tasks/${taskId}`);
    showToast("Task deleted");
    if (selectedTaskId === taskId) setSelectedTaskId(null);
    refetch();
  };

  const handleAddSubtask = (parentId: string) => {
    const parent = tasks?.find((t) => t.id === parentId);
    setNewTask({
      name: "",
      description: "",
      priority: parent?.fields.Priority || "medium",
      project: parent?.fields.Project || "",
      dueDate: "",
      parentTaskId: parentId,
    });
    setDialogOpen(true);
  };

  const handleChangePriority = async (
    taskId: string,
    priority: string
  ) => {
    await patch(`/api/tasks/${taskId}`, { priority });
    showToast(`Priority → ${priority}`);
    refetch();
  };

  const handleChangeStatus = async (taskId: string, status: string) => {
    await patch(`/api/tasks/${taskId}`, { status });
    showToast(`Status → ${STATUS_LABELS[status] || status}`);
    refetch();
  };

  const toggleExpand = (taskId: string) => {
    setExpandedTasks((prev) => {
      const next = new Set(prev);
      if (next.has(taskId)) next.delete(taskId);
      else next.add(taskId);
      return next;
    });
  };

  // Find a node in the tree by ID
  const findNode = (
    nodes: TaskNode[],
    id: string
  ): TaskNode | null => {
    for (const n of nodes) {
      if (n.id === id) return n;
      const found = findNode(n.subtasks, id);
      if (found) return found;
    }
    return null;
  };

  // ---- Stats ----
  const totalTasks = tasks?.length || 0;
  const doneTasks =
    tasks?.filter((t) => t.fields.Status === "done").length || 0;
  const activeTasks = totalTasks - doneTasks;

  // ---- Loading state ----
  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-8 w-48 bg-zinc-800 rounded animate-pulse" />
        <div className="space-y-2">
          {[...Array(8)].map((_, i) => (
            <div
              key={i}
              className="h-10 bg-zinc-900 rounded-lg animate-pulse"
            />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-white">Tasks</h1>
          <p className="text-sm text-zinc-500 mt-0.5">
            {activeTasks} active &middot; {doneTasks} completed
          </p>
        </div>
        <div className="flex items-center gap-2">
          {/* View toggle */}
          <div className="flex bg-zinc-900 rounded-lg p-1 border border-zinc-800">
            <button
              onClick={() => setView("hierarchy")}
              className={cn(
                "px-3 py-1.5 text-xs font-medium rounded-md transition-colors",
                view === "hierarchy"
                  ? "bg-zinc-700 text-white"
                  : "text-zinc-400 hover:text-white"
              )}
            >
              Hierarchy
            </button>
            <button
              onClick={() => setView("kanban")}
              className={cn(
                "px-3 py-1.5 text-xs font-medium rounded-md transition-colors",
                view === "kanban"
                  ? "bg-zinc-700 text-white"
                  : "text-zinc-400 hover:text-white"
              )}
            >
              Kanban
            </button>
          </div>

          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger className="inline-flex items-center justify-center gap-1 rounded-md bg-violet-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-violet-700 transition-colors">
              <Plus className="w-4 h-4" /> New Task
            </DialogTrigger>
            <DialogContent className="bg-zinc-900 border-zinc-800">
              <DialogHeader>
                <DialogTitle className="text-white">
                  {newTask.parentTaskId ? "New Subtask" : "New Task"}
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                {newTask.parentTaskId && (
                  <div className="flex items-center gap-2 text-xs text-zinc-400 bg-zinc-800/50 rounded-md px-3 py-2">
                    <PlusCircle className="w-3.5 h-3.5" />
                    <span>
                      Subtask of:{" "}
                      <span className="text-zinc-300">
                        {tasks?.find((t) => t.id === newTask.parentTaskId)
                          ?.fields.Name || "Unknown"}
                      </span>
                    </span>
                    <button
                      onClick={() =>
                        setNewTask({ ...newTask, parentTaskId: "" })
                      }
                      className="ml-auto text-zinc-500 hover:text-zinc-300"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
                <Input
                  placeholder="Task name"
                  value={newTask.name}
                  onChange={(e) =>
                    setNewTask({ ...newTask, name: e.target.value })
                  }
                  className="bg-zinc-950 border-zinc-800 text-white"
                  onKeyDown={(e) => e.key === "Enter" && handleCreate()}
                  autoFocus
                />
                <Textarea
                  placeholder="Description (optional)"
                  value={newTask.description}
                  onChange={(e) =>
                    setNewTask({ ...newTask, description: e.target.value })
                  }
                  className="bg-zinc-950 border-zinc-800 text-white"
                  rows={2}
                />
                <div className="grid grid-cols-2 gap-3">
                  <Select
                    value={newTask.priority}
                    onValueChange={(v) =>
                      v && setNewTask({ ...newTask, priority: v })
                    }
                  >
                    <SelectTrigger className="bg-zinc-950 border-zinc-800 text-white">
                      <SelectValue placeholder="Priority" />
                    </SelectTrigger>
                    <SelectContent className="bg-zinc-900 border-zinc-800">
                      <SelectItem value="low">Low</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                      <SelectItem value="urgent">Urgent</SelectItem>
                    </SelectContent>
                  </Select>
                  <Input
                    placeholder="Project"
                    value={newTask.project}
                    onChange={(e) =>
                      setNewTask({ ...newTask, project: e.target.value })
                    }
                    className="bg-zinc-950 border-zinc-800 text-white"
                  />
                </div>
                <Input
                  type="date"
                  value={newTask.dueDate}
                  onChange={(e) =>
                    setNewTask({ ...newTask, dueDate: e.target.value })
                  }
                  className="bg-zinc-950 border-zinc-800 text-white"
                />
                <Button
                  onClick={handleCreate}
                  disabled={submitting || !newTask.name.trim()}
                  className="w-full bg-violet-600 hover:bg-violet-700"
                >
                  {submitting ? "Creating..." : "Create Task"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Filters bar */}
      <div className="flex items-center gap-2 flex-wrap">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-500" />
          <Input
            placeholder="Search tasks..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="bg-zinc-900 border-zinc-800 text-white pl-8 h-8 text-sm w-52"
          />
        </div>
        <Select value={statusFilter} onValueChange={(v) => v && setStatusFilter(v)}>
          <SelectTrigger className="bg-zinc-900 border-zinc-800 text-zinc-300 h-8 text-sm w-32">
            <Filter className="w-3.5 h-3.5 mr-1.5" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="bg-zinc-900 border-zinc-800">
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="all">All</SelectItem>
            <SelectItem value="todo">To Do</SelectItem>
            <SelectItem value="in_progress">In Progress</SelectItem>
            <SelectItem value="done">Done</SelectItem>
            <SelectItem value="backlog">Backlog</SelectItem>
          </SelectContent>
        </Select>
        <Select
          value={groupBy}
          onValueChange={(v) => v && setGroupBy(v as "project" | "none")}
        >
          <SelectTrigger className="bg-zinc-900 border-zinc-800 text-zinc-300 h-8 text-sm w-36">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="bg-zinc-900 border-zinc-800">
            <SelectItem value="project">Group by Project</SelectItem>
            <SelectItem value="none">No Grouping</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Hierarchical task list */}
      {view === "hierarchy" ? (
        <div className="space-y-1">
          {grouped ? (
            grouped.map((group) => (
              <ProjectGroup
                key={group.project || "__standalone__"}
                project={group.project}
                tasks={group.tasks}
                expandedTasks={expandedTasks}
                selectedTaskId={selectedTaskId}
                onToggleExpand={toggleExpand}
                onSelect={setSelectedTaskId}
                onToggleComplete={handleToggleComplete}
                onRename={handleInlineRename}
                onAddSubtask={handleAddSubtask}
                onDelete={handleDelete}
                onChangePriority={handleChangePriority}
                onChangeStatus={handleChangeStatus}
                onContextMenu={(x, y, id) =>
                  setContextMenu({ x, y, taskId: id })
                }
              />
            ))
          ) : (
            <div className="space-y-0.5">
              {filteredTree.map((node) => (
                <TaskRow
                  key={node.id}
                  node={node}
                  expandedTasks={expandedTasks}
                  selectedTaskId={selectedTaskId}
                  onToggleExpand={toggleExpand}
                  onSelect={setSelectedTaskId}
                  onToggleComplete={handleToggleComplete}
                  onRename={handleInlineRename}
                  onAddSubtask={handleAddSubtask}
                  onDelete={handleDelete}
                  onChangePriority={handleChangePriority}
                  onChangeStatus={handleChangeStatus}
                  onContextMenu={(x, y, id) =>
                    setContextMenu({ x, y, taskId: id })
                  }
                />
              ))}
            </div>
          )}

          {filteredTree.length === 0 && (
            <div className="text-center py-16 text-zinc-500">
              <ListTodo className="w-10 h-10 mx-auto mb-3 opacity-40" />
              <p className="text-sm">No tasks match your filters</p>
              <Button
                variant="ghost"
                size="sm"
                className="mt-2 text-violet-400"
                onClick={() => setDialogOpen(true)}
              >
                <Plus className="w-4 h-4 mr-1" /> Create one
              </Button>
            </div>
          )}
        </div>
      ) : (
        <KanbanView
          tasks={tasks || []}
          onStatusChange={handleChangeStatus}
          onDelete={handleDelete}
          onToggleComplete={handleToggleComplete}
        />
      )}

      {/* Context menu */}
      {contextMenu && (
        <ContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          onAddSubtask={() => {
            handleAddSubtask(contextMenu.taskId);
            setContextMenu(null);
          }}
          onDelete={() => {
            handleDelete(contextMenu.taskId);
            setContextMenu(null);
          }}
          onChangePriority={(p) => {
            handleChangePriority(contextMenu.taskId, p);
            setContextMenu(null);
          }}
          onChangeStatus={(s) => {
            handleChangeStatus(contextMenu.taskId, s);
            setContextMenu(null);
          }}
          onClose={() => setContextMenu(null)}
        />
      )}

      {/* Toast notification */}
      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-zinc-800 border border-zinc-700 text-white text-sm px-4 py-2 rounded-lg shadow-xl z-50 animate-in fade-in slide-in-from-bottom-2 duration-200">
          {toast}
        </div>
      )}
    </div>
  );
}

// ============ PROJECT GROUP ============

function ProjectGroup({
  project,
  tasks,
  expandedTasks,
  selectedTaskId,
  onToggleExpand,
  onSelect,
  onToggleComplete,
  onRename,
  onAddSubtask,
  onDelete,
  onChangePriority,
  onChangeStatus,
  onContextMenu,
}: {
  project: string;
  tasks: TaskNode[];
  expandedTasks: Set<string>;
  selectedTaskId: string | null;
  onToggleExpand: (id: string) => void;
  onSelect: (id: string | null) => void;
  onToggleComplete: (id: string) => void;
  onRename: (id: string, name: string) => void;
  onAddSubtask: (id: string) => void;
  onDelete: (id: string) => void;
  onChangePriority: (id: string, p: string) => void;
  onChangeStatus: (id: string, s: string) => void;
  onContextMenu: (x: number, y: number, id: string) => void;
}) {
  const [collapsed, setCollapsed] = useState(false);
  const doneTasks = tasks.filter((t) => t.fields.Status === "done").length;

  return (
    <div className="mb-4">
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="flex items-center gap-2 px-2 py-1.5 w-full text-left group"
      >
        {collapsed ? (
          <ChevronRight className="w-4 h-4 text-zinc-500" />
        ) : (
          <ChevronDown className="w-4 h-4 text-zinc-500" />
        )}
        <FolderOpen className="w-4 h-4 text-violet-400" />
        <span className="text-sm font-semibold text-zinc-200">
          {project || "Standalone Tasks"}
        </span>
        <span className="text-xs text-zinc-600 ml-1">
          {doneTasks}/{tasks.length}
        </span>
      </button>

      {!collapsed && (
        <div className="ml-2 space-y-0.5">
          {tasks.map((node) => (
            <TaskRow
              key={node.id}
              node={node}
              expandedTasks={expandedTasks}
              selectedTaskId={selectedTaskId}
              onToggleExpand={onToggleExpand}
              onSelect={onSelect}
              onToggleComplete={onToggleComplete}
              onRename={onRename}
              onAddSubtask={onAddSubtask}
              onDelete={onDelete}
              onChangePriority={onChangePriority}
              onChangeStatus={onChangeStatus}
              onContextMenu={onContextMenu}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ============ TASK ROW (recursive) ============

function TaskRow({
  node,
  expandedTasks,
  selectedTaskId,
  onToggleExpand,
  onSelect,
  onToggleComplete,
  onRename,
  onAddSubtask,
  onDelete,
  onChangePriority,
  onChangeStatus,
  onContextMenu,
}: {
  node: TaskNode;
  expandedTasks: Set<string>;
  selectedTaskId: string | null;
  onToggleExpand: (id: string) => void;
  onSelect: (id: string | null) => void;
  onToggleComplete: (id: string) => void;
  onRename: (id: string, name: string) => void;
  onAddSubtask: (id: string) => void;
  onDelete: (id: string) => void;
  onChangePriority: (id: string, p: string) => void;
  onChangeStatus: (id: string, s: string) => void;
  onContextMenu: (x: number, y: number, id: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [editValue, setEditValue] = useState(node.fields.Name);
  const inputRef = useRef<HTMLInputElement>(null);

  const isDone = node.fields.Status === "done";
  const isExpanded = expandedTasks.has(node.id);
  const isSelected = selectedTaskId === node.id;
  const hasChildren = node.subtasks.length > 0;
  const completion = hasChildren ? getCompletionPct(node) : null;
  const indentPx = node.depth * 24;

  useEffect(() => {
    if (editing) inputRef.current?.focus();
  }, [editing]);

  const handleSaveEdit = () => {
    if (editValue.trim() && editValue.trim() !== node.fields.Name) {
      onRename(node.id, editValue.trim());
    } else {
      setEditValue(node.fields.Name);
    }
    setEditing(false);
  };

  return (
    <>
      <div
        className={cn(
          "flex items-center gap-1.5 px-2 py-1.5 rounded-md group transition-colors cursor-default",
          isSelected
            ? "bg-violet-500/10 border border-violet-500/20"
            : "hover:bg-zinc-800/50 border border-transparent",
          isDone && "opacity-60"
        )}
        style={{ paddingLeft: `${8 + indentPx}px` }}
        onClick={() => onSelect(node.id)}
        onContextMenu={(e) => {
          e.preventDefault();
          onContextMenu(e.clientX, e.clientY, node.id);
        }}
      >
        {/* Expand/collapse chevron */}
        <div className="w-5 h-5 flex items-center justify-center shrink-0">
          {hasChildren ? (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onToggleExpand(node.id);
              }}
              className="text-zinc-500 hover:text-zinc-300 transition-colors"
            >
              {isExpanded ? (
                <ChevronDown className="w-4 h-4" />
              ) : (
                <ChevronRight className="w-4 h-4" />
              )}
            </button>
          ) : (
            <span className="w-4" />
          )}
        </div>

        {/* Checkbox */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onToggleComplete(node.id);
          }}
          className={cn(
            "w-5 h-5 flex items-center justify-center shrink-0 rounded transition-colors",
            isDone
              ? "text-emerald-400 hover:text-emerald-300"
              : "text-zinc-600 hover:text-zinc-400"
          )}
        >
          {isDone ? (
            <CheckSquare className="w-4 h-4" />
          ) : (
            <Square className="w-4 h-4" />
          )}
        </button>

        {/* Task title (inline editable) */}
        {editing ? (
          <input
            ref={inputRef}
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            onBlur={handleSaveEdit}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleSaveEdit();
              if (e.key === "Escape") {
                setEditValue(node.fields.Name);
                setEditing(false);
              }
            }}
            className="flex-1 bg-transparent border-b border-violet-500 text-sm text-white outline-none px-1 py-0"
          />
        ) : (
          <span
            onDoubleClick={() => {
              setEditValue(node.fields.Name);
              setEditing(true);
            }}
            className={cn(
              "flex-1 text-sm cursor-text select-none truncate",
              isDone ? "line-through text-zinc-500" : "text-zinc-100"
            )}
          >
            {node.fields.Name}
          </span>
        )}

        {/* Completion badge for parents */}
        {completion !== null && !isDone && (
          <span className="text-[10px] text-zinc-500 tabular-nums shrink-0">
            {completion}%
          </span>
        )}

        {/* Priority dot */}
        <div
          className={cn(
            "w-2 h-2 rounded-full shrink-0",
            PRIORITY_DOT[node.fields.Priority] || "bg-zinc-500"
          )}
          title={node.fields.Priority}
        />

        {/* Due date */}
        {node.fields.DueDate && (
          <DueDateBadge dateStr={node.fields.DueDate} />
        )}

        {/* Hover actions */}
        <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
          {node.depth < 2 && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onAddSubtask(node.id);
              }}
              className="p-1 text-zinc-600 hover:text-violet-400 transition-colors"
              title="Add subtask"
            >
              <PlusCircle className="w-3.5 h-3.5" />
            </button>
          )}
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDelete(node.id);
            }}
            className="p-1 text-zinc-600 hover:text-red-400 transition-colors"
            title="Delete"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Subtasks */}
      {isExpanded &&
        node.subtasks.map((child) => (
          <TaskRow
            key={child.id}
            node={child}
            expandedTasks={expandedTasks}
            selectedTaskId={selectedTaskId}
            onToggleExpand={onToggleExpand}
            onSelect={onSelect}
            onToggleComplete={onToggleComplete}
            onRename={onRename}
            onAddSubtask={onAddSubtask}
            onDelete={onDelete}
            onChangePriority={onChangePriority}
            onChangeStatus={onChangeStatus}
            onContextMenu={onContextMenu}
          />
        ))}
    </>
  );
}

// ============ DUE DATE BADGE ============

function DueDateBadge({ dateStr }: { dateStr: string }) {
  const { text, overdue, soon } = formatDueDate(dateStr);
  return (
    <span
      className={cn(
        "flex items-center gap-1 text-[11px] shrink-0 tabular-nums",
        overdue
          ? "text-red-400"
          : soon
            ? "text-amber-400"
            : "text-zinc-500"
      )}
    >
      <Calendar className="w-3 h-3" />
      {text}
    </span>
  );
}

// ============ CONTEXT MENU ============

function ContextMenu({
  x,
  y,
  onAddSubtask,
  onDelete,
  onChangePriority,
  onChangeStatus,
  onClose,
}: {
  x: number;
  y: number;
  onAddSubtask: () => void;
  onDelete: () => void;
  onChangePriority: (p: string) => void;
  onChangeStatus: (s: string) => void;
  onClose: () => void;
}) {
  return (
    <div
      className="fixed z-50 bg-zinc-900 border border-zinc-700 rounded-lg shadow-xl py-1 w-48 text-sm"
      style={{ left: x, top: y }}
      onClick={(e) => e.stopPropagation()}
    >
      <button
        onClick={onAddSubtask}
        className="flex items-center gap-2 w-full px-3 py-1.5 text-zinc-300 hover:bg-zinc-800 transition-colors text-left"
      >
        <PlusCircle className="w-3.5 h-3.5" /> Add subtask
      </button>
      <div className="border-t border-zinc-800 my-1" />
      <div className="px-3 py-1 text-[10px] text-zinc-500 uppercase tracking-wider">
        Priority
      </div>
      {["urgent", "high", "medium", "low"].map((p) => (
        <button
          key={p}
          onClick={() => onChangePriority(p)}
          className="flex items-center gap-2 w-full px-3 py-1.5 text-zinc-300 hover:bg-zinc-800 transition-colors text-left"
        >
          <div
            className={cn("w-2 h-2 rounded-full", PRIORITY_DOT[p])}
          />
          <span className="capitalize">{p}</span>
        </button>
      ))}
      <div className="border-t border-zinc-800 my-1" />
      <div className="px-3 py-1 text-[10px] text-zinc-500 uppercase tracking-wider">
        Status
      </div>
      {["todo", "in_progress", "done", "backlog"].map((s) => (
        <button
          key={s}
          onClick={() => onChangeStatus(s)}
          className="flex items-center gap-2 w-full px-3 py-1.5 text-zinc-300 hover:bg-zinc-800 transition-colors text-left"
        >
          {STATUS_LABELS[s]}
        </button>
      ))}
      <div className="border-t border-zinc-800 my-1" />
      <button
        onClick={onDelete}
        className="flex items-center gap-2 w-full px-3 py-1.5 text-red-400 hover:bg-zinc-800 transition-colors text-left"
      >
        <Trash2 className="w-3.5 h-3.5" /> Delete
      </button>
    </div>
  );
}

// ============ KANBAN VIEW (preserved from original) ============

const KANBAN_COLUMNS = [
  { id: "backlog" as const, label: "Backlog", color: "text-zinc-500" },
  { id: "todo" as const, label: "To Do", color: "text-blue-400" },
  {
    id: "in_progress" as const,
    label: "In Progress",
    color: "text-yellow-400",
  },
  { id: "done" as const, label: "Done", color: "text-emerald-400" },
];

function KanbanView({
  tasks,
  onStatusChange,
  onDelete,
  onToggleComplete,
}: {
  tasks: Task[];
  onStatusChange: (id: string, status: string) => void;
  onDelete: (id: string) => void;
  onToggleComplete: (id: string) => void;
}) {
  const tasksByStatus = (status: string) =>
    tasks.filter((t) => t.fields.Status === status);

  const advanceOrder: TaskFields["Status"][] = [
    "backlog",
    "todo",
    "in_progress",
    "done",
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {KANBAN_COLUMNS.map((col) => (
        <div key={col.id} className="space-y-2">
          <div className="flex items-center gap-2 px-1 mb-3">
            <span className={cn("text-sm font-medium", col.color)}>
              {col.label}
            </span>
            <Badge
              variant="secondary"
              className="bg-zinc-800 text-zinc-400 text-xs ml-auto"
            >
              {tasksByStatus(col.id).length}
            </Badge>
          </div>
          <div className="space-y-2 min-h-[200px]">
            {tasksByStatus(col.id).map((task) => {
              const currentIdx = advanceOrder.indexOf(task.fields.Status);
              return (
                <div
                  key={task.id}
                  className="p-3 rounded-lg bg-zinc-950 border border-zinc-800 group hover:border-zinc-700 transition-colors"
                >
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-sm font-medium text-white leading-snug">
                      {task.fields.Name}
                    </p>
                    <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                      {currentIdx < advanceOrder.length - 1 && (
                        <button
                          onClick={() =>
                            onStatusChange(
                              task.id,
                              advanceOrder[currentIdx + 1]
                            )
                          }
                          className="p-1 text-zinc-500 hover:text-violet-400"
                          title="Advance"
                        >
                          <ChevronRight className="w-3.5 h-3.5" />
                        </button>
                      )}
                      <button
                        onClick={() => onDelete(task.id)}
                        className="p-1 text-zinc-500 hover:text-red-400"
                        title="Delete"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                  {task.fields.Description && (
                    <p className="text-xs text-zinc-500 mt-1 line-clamp-2">
                      {task.fields.Description}
                    </p>
                  )}
                  <div className="flex items-center gap-2 mt-2 flex-wrap">
                    <Badge
                      variant="outline"
                      className={cn(
                        "text-xs",
                        PRIORITY_COLORS[task.fields.Priority] || ""
                      )}
                    >
                      {task.fields.Priority}
                    </Badge>
                    {task.fields.Project && (
                      <Badge
                        variant="outline"
                        className="text-xs bg-violet-500/10 text-violet-400 border-violet-500/20"
                      >
                        {task.fields.Project}
                      </Badge>
                    )}
                    {task.fields.DueDate && (
                      <DueDateBadge dateStr={task.fields.DueDate} />
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
