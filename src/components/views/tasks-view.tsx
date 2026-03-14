"use client";

import { useState } from "react";
import { useFetch, useApi } from "@/lib/hooks";
import { Task, TaskFields } from "@/lib/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Plus,
  GripVertical,
  CheckCircle,
  Circle,
  Clock,
  Archive,
  ArrowRight,
  Trash2,
} from "lucide-react";

const STATUS_COLUMNS = [
  { id: "backlog" as const, label: "Backlog", icon: Archive, color: "text-zinc-500" },
  { id: "todo" as const, label: "To Do", icon: Circle, color: "text-blue-400" },
  { id: "in_progress" as const, label: "In Progress", icon: Clock, color: "text-yellow-400" },
  { id: "done" as const, label: "Done", icon: CheckCircle, color: "text-emerald-400" },
];

const PRIORITY_COLORS: Record<string, string> = {
  urgent: "bg-red-500/10 text-red-400 border-red-500/20",
  high: "bg-orange-500/10 text-orange-400 border-orange-500/20",
  medium: "bg-blue-500/10 text-blue-400 border-blue-500/20",
  low: "bg-zinc-500/10 text-zinc-400 border-zinc-500/20",
};

export function TasksView() {
  const { data: tasks, loading, refetch } = useFetch<Task[]>("/api/tasks");
  const { post, patch, del, submitting } = useApi();
  const [view, setView] = useState<"kanban" | "list">("kanban");
  const [dialogOpen, setDialogOpen] = useState(false);

  // New task form state
  const [newTask, setNewTask] = useState({
    name: "",
    description: "",
    priority: "medium" as string,
    project: "",
    dueDate: "",
  });

  const handleCreate = async () => {
    if (!newTask.name.trim()) return;
    await post("/api/tasks", newTask);
    setNewTask({ name: "", description: "", priority: "medium", project: "", dueDate: "" });
    setDialogOpen(false);
    refetch();
  };

  const handleStatusChange = async (taskId: string, newStatus: string) => {
    await patch(`/api/tasks/${taskId}`, { status: newStatus });
    refetch();
  };

  const handleDelete = async (taskId: string) => {
    await del(`/api/tasks/${taskId}`);
    refetch();
  };

  const handleQuickAdvance = async (task: Task) => {
    const order: TaskFields["Status"][] = ["backlog", "todo", "in_progress", "done"];
    const currentIdx = order.indexOf(task.fields.Status);
    if (currentIdx < order.length - 1) {
      await handleStatusChange(task.id, order[currentIdx + 1]);
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-8 w-32 bg-zinc-800 rounded animate-pulse" />
        <div className="grid grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-64 bg-zinc-900 rounded-xl animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  const tasksByStatus = (status: string) =>
    (tasks || []).filter((t) => t.fields.Status === status);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-white">Tasks</h1>
        <div className="flex items-center gap-2">
          <div className="flex bg-zinc-900 rounded-lg p-1 border border-zinc-800">
            <button
              onClick={() => setView("kanban")}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                view === "kanban"
                  ? "bg-zinc-700 text-white"
                  : "text-zinc-400 hover:text-white"
              }`}
            >
              Kanban
            </button>
            <button
              onClick={() => setView("list")}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                view === "list"
                  ? "bg-zinc-700 text-white"
                  : "text-zinc-400 hover:text-white"
              }`}
            >
              List
            </button>
          </div>

          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger className="inline-flex items-center justify-center gap-1 rounded-md bg-violet-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-violet-700 transition-colors">
              <Plus className="w-4 h-4" /> Add Task
            </DialogTrigger>
            <DialogContent className="bg-zinc-900 border-zinc-800">
              <DialogHeader>
                <DialogTitle className="text-white">New Task</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <Input
                  placeholder="Task name"
                  value={newTask.name}
                  onChange={(e) =>
                    setNewTask({ ...newTask, name: e.target.value })
                  }
                  className="bg-zinc-950 border-zinc-800 text-white"
                  onKeyDown={(e) => e.key === "Enter" && handleCreate()}
                />
                <Textarea
                  placeholder="Description (optional)"
                  value={newTask.description}
                  onChange={(e) =>
                    setNewTask({ ...newTask, description: e.target.value })
                  }
                  className="bg-zinc-950 border-zinc-800 text-white"
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
                  Create Task
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {view === "kanban" ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {STATUS_COLUMNS.map((col) => (
            <div key={col.id} className="space-y-2">
              <div className="flex items-center gap-2 px-1 mb-3">
                <col.icon className={`w-4 h-4 ${col.color}`} />
                <span className="text-sm font-medium text-zinc-300">
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
                {tasksByStatus(col.id).map((task) => (
                  <TaskCard
                    key={task.id}
                    task={task}
                    onAdvance={() => handleQuickAdvance(task)}
                    onDelete={() => handleDelete(task.id)}
                    onStatusChange={(status) =>
                      handleStatusChange(task.id, status)
                    }
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <Card className="bg-zinc-900 border-zinc-800">
          <CardContent className="p-0">
            <table className="w-full">
              <thead>
                <tr className="border-b border-zinc-800">
                  <th className="text-left text-xs text-zinc-500 font-medium p-3">
                    Task
                  </th>
                  <th className="text-left text-xs text-zinc-500 font-medium p-3">
                    Status
                  </th>
                  <th className="text-left text-xs text-zinc-500 font-medium p-3">
                    Priority
                  </th>
                  <th className="text-left text-xs text-zinc-500 font-medium p-3">
                    Project
                  </th>
                  <th className="text-left text-xs text-zinc-500 font-medium p-3">
                    Due
                  </th>
                  <th className="text-right text-xs text-zinc-500 font-medium p-3">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {(tasks || []).map((task) => (
                  <tr
                    key={task.id}
                    className="border-b border-zinc-800/50 hover:bg-zinc-800/30"
                  >
                    <td className="p-3">
                      <p className="text-sm text-white">{task.fields.Name}</p>
                      {task.fields.Description && (
                        <p className="text-xs text-zinc-500 mt-0.5 truncate max-w-xs">
                          {task.fields.Description}
                        </p>
                      )}
                    </td>
                    <td className="p-3">
                      <Select
                        value={task.fields.Status}
                        onValueChange={(v) =>
                          v && handleStatusChange(task.id, v)
                        }
                      >
                        <SelectTrigger className="h-7 text-xs bg-transparent border-zinc-700 text-zinc-300 w-32">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-zinc-900 border-zinc-800">
                          {STATUS_COLUMNS.map((col) => (
                            <SelectItem key={col.id} value={col.id}>
                              {col.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </td>
                    <td className="p-3">
                      <Badge
                        variant="outline"
                        className={
                          PRIORITY_COLORS[task.fields.Priority] || ""
                        }
                      >
                        {task.fields.Priority}
                      </Badge>
                    </td>
                    <td className="p-3 text-sm text-zinc-400">
                      {task.fields.Project || "—"}
                    </td>
                    <td className="p-3 text-sm text-zinc-400">
                      {task.fields.DueDate || "—"}
                    </td>
                    <td className="p-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => handleQuickAdvance(task)}
                          className="p-1 text-zinc-500 hover:text-violet-400 transition-colors"
                          title="Advance status"
                        >
                          <ArrowRight className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(task.id)}
                          className="p-1 text-zinc-500 hover:text-red-400 transition-colors"
                          title="Delete"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function TaskCard({
  task,
  onAdvance,
  onDelete,
  onStatusChange,
}: {
  task: Task;
  onAdvance: () => void;
  onDelete: () => void;
  onStatusChange: (status: string) => void;
}) {
  return (
    <div className="p-3 rounded-lg bg-zinc-950 border border-zinc-800 group hover:border-zinc-700 transition-colors">
      <div className="flex items-start justify-between gap-2">
        <p className="text-sm font-medium text-white leading-snug">
          {task.fields.Name}
        </p>
        <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
          <button
            onClick={onAdvance}
            className="p-1 text-zinc-500 hover:text-violet-400"
            title="Advance"
          >
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={onDelete}
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
          className={`text-xs ${
            PRIORITY_COLORS[task.fields.Priority] || ""
          }`}
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
          <span className="text-xs text-zinc-600">
            {task.fields.DueDate}
          </span>
        )}
      </div>
    </div>
  );
}
