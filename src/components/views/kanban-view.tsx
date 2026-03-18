"use client";

import { useState, useCallback } from "react";
import {
  DndContext,
  DragEndEvent,
  DragOverEvent,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useSortable } from "@dnd-kit/sortable";
import { Task, TaskFields } from "@/lib/types";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { ChevronRight, Trash2 } from "lucide-react";

const KANBAN_COLUMNS: Array<{
  id: TaskFields["Status"];
  label: string;
  color: string;
  bgColor: string;
}> = [
  {
    id: "backlog",
    label: "Backlog",
    color: "text-[var(--md-text-tertiary)]",
    bgColor: "bg-slate-50 dark:bg-slate-900",
  },
  {
    id: "todo",
    label: "To Do",
    color: "text-[var(--md-info)]",
    bgColor: "bg-blue-50 dark:bg-blue-900",
  },
  {
    id: "in_progress",
    label: "In Progress",
    color: "text-[var(--md-warning)]",
    bgColor: "bg-amber-50 dark:bg-amber-900",
  },
  {
    id: "done",
    label: "Done",
    color: "text-[var(--md-success)]",
    bgColor: "bg-emerald-50 dark:bg-emerald-900",
  },
];

interface KanbanViewProps {
  tasks: Task[];
  onStatusChange: (id: string, status: string) => void;
  onDelete: (id: string) => void;
  onToggleComplete?: (id: string) => void;
}

export function KanbanView({
  tasks,
  onStatusChange,
  onDelete,
  onToggleComplete,
}: KanbanViewProps) {
  const [activeId, setActiveId] = useState<string | null>(null);
  const [sourceStatus, setSourceStatus] = useState<TaskFields["Status"] | null>(
    null
  );

  const sensors = useSensors(
    useSensor(PointerSensor)
  );

  const tasksByStatus = useCallback(
    (status: string) =>
      tasks.filter((t) => t.fields.Status === status).sort((a, b) => {
        const aOrder = a.fields.SortOrder || 0;
        const bOrder = b.fields.SortOrder || 0;
        return aOrder - bOrder;
      }),
    [tasks]
  );

  const handleDragStart = (e: DragEndEvent) => {
    setActiveId(e.active.id as string);
    const task = tasks.find((t) => t.id === e.active.id);
    if (task) {
      setSourceStatus(task.fields.Status);
    }
  };

  const handleDragOver = (e: DragOverEvent) => {
    // Just track the active draggable
  };

  const handleDragEnd = async (e: DragEndEvent) => {
    setActiveId(null);

    const { active, over } = e;
    if (!over) return;

    const taskId = active.id as string;
    const newStatus = over.id as TaskFields["Status"];

    // Only update if status changed
    if (sourceStatus && newStatus !== sourceStatus) {
      onStatusChange(taskId, newStatus);
    }

    setSourceStatus(null);
  };

  return (
    <DndContext
      sensors={sensors}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
    >
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {KANBAN_COLUMNS.map((col) => (
          <KanbanColumn
            key={col.id}
            column={col}
            tasks={tasksByStatus(col.id)}
            onDelete={onDelete}
            onToggleComplete={onToggleComplete}
            isActive={
              activeId
                ? tasksByStatus(col.id).some((t) => t.id === activeId)
                : false
            }
          />
        ))}
      </div>
    </DndContext>
  );
}

interface KanbanColumnProps {
  column: (typeof KANBAN_COLUMNS)[0];
  tasks: Task[];
  onDelete: (id: string) => void;
  onToggleComplete?: (id: string) => void;
  isActive: boolean;
}

function KanbanColumn({
  column,
  tasks,
  onDelete,
  onToggleComplete,
  isActive,
}: KanbanColumnProps) {
  const [isOver, setIsOver] = useState(false);

  return (
    <SortableContext
      items={tasks.map((t) => t.id)}
      strategy={verticalListSortingStrategy}
    >
      <div
        className={cn(
          "space-y-3 rounded-xl p-4 transition-all duration-200 ease-in-out",
          isActive || isOver
            ? "bg-[var(--md-highlight)] border-2 border-violet-300"
            : "bg-[var(--md-surface)] border-2 border-transparent"
        )}
        onDragOver={(e) => {
          e.preventDefault();
          setIsOver(true);
        }}
        onDragLeave={() => setIsOver(false)}
        onDrop={() => setIsOver(false)}
      >
        {/* Column header */}
        <div className="flex items-center gap-2 px-1 mb-4 pb-2 border-b border-[var(--md-border-light)]">
          <span className={cn("text-sm font-semibold", column.color)}>
            {column.label}
          </span>
          <Badge variant="secondary" className="ml-auto text-xs">
            {tasks.length}
          </Badge>
        </div>

        {/* Tasks in column */}
        <div className="space-y-3 min-h-[200px]">
          {tasks.length === 0 ? (
            <div className="flex items-center justify-center h-32 text-[var(--md-text-tertiary)]">
              <p className="text-xs">No tasks</p>
            </div>
          ) : (
            tasks.map((task) => (
              <KanbanCard
                key={task.id}
                task={task}
                onDelete={onDelete}
                onToggleComplete={onToggleComplete}
              />
            ))
          )}
        </div>
      </div>
    </SortableContext>
  );
}

interface KanbanCardProps {
  task: Task;
  onDelete: (id: string) => void;
  onToggleComplete?: (id: string) => void;
}

const PRIORITY_COLORS: Record<string, string> = {
  urgent: "bg-red-50 text-red-600 border-red-100 dark:bg-red-900 dark:text-red-300",
  high: "bg-orange-50 text-orange-600 border-orange-100 dark:bg-orange-900 dark:text-orange-300",
  medium: "bg-blue-50 text-blue-600 border-blue-100 dark:bg-blue-900 dark:text-blue-300",
  low: "bg-slate-50 text-slate-600 border-slate-100 dark:bg-slate-900 dark:text-slate-300",
};

const PRIORITY_DOT: Record<string, string> = {
  urgent: "bg-red-500",
  high: "bg-orange-500",
  medium: "bg-blue-500",
  low: "bg-slate-500",
};

function KanbanCard({ task, onDelete, onToggleComplete }: KanbanCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: task.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const isDone = task.fields.Status === "done";

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "p-4 rounded-lg bg-[var(--md-bg)] shadow-[0_1px_3px_rgba(0,0,0,0.08),0_2px_4px_rgba(0,0,0,0.04)] group hover:shadow-[0_4px_12px_rgba(0,0,0,0.12)] transition-all duration-200 ease-in-out cursor-move border-l-4",
        isDone ? "border-l-emerald-500 opacity-75" : "border-l-violet-500",
        isDragging && "ring-2 ring-violet-400 rotate-3"
      )}
      {...attributes}
      {...listeners}
    >
      <div className="flex items-start justify-between gap-2">
        <p
          className={cn(
            "text-sm font-medium leading-snug flex-1",
            isDone
              ? "line-through text-[var(--md-text-tertiary)]"
              : "text-[var(--md-text-body)]"
          )}
        >
          {task.fields.Name}
        </p>

        {/* Hover actions */}
        <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity duration-200 shrink-0">
          {onToggleComplete && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onToggleComplete(task.id);
              }}
              className={cn(
                "p-1.5 rounded transition-colors duration-200 hover:bg-[var(--md-surface)]",
                isDone
                  ? "text-emerald-600 hover:text-emerald-700"
                  : "text-[var(--md-text-disabled)] hover:text-[var(--md-text-secondary)]"
              )}
              title={isDone ? "Reopen" : "Complete"}
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          )}
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDelete(task.id);
            }}
            className="p-1.5 text-[var(--md-text-disabled)] hover:text-[var(--md-error)] transition-colors duration-200 rounded hover:bg-[var(--md-surface)]"
            title="Delete"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {task.fields.Description && (
        <p className="text-xs text-[var(--md-text-tertiary)] mt-2 line-clamp-2">
          {task.fields.Description}
        </p>
      )}

      {/* Metadata */}
      <div className="flex items-center gap-2 mt-3 flex-wrap">
        <Badge
          variant="outline"
          className={cn("text-xs", PRIORITY_COLORS[task.fields.Priority] || "")}
        >
          {task.fields.Priority}
        </Badge>
        {task.fields.Project && (
          <Badge
            variant="outline"
            className="text-xs bg-[var(--md-highlight)] text-violet-600 border-violet-100 dark:bg-violet-900 dark:text-violet-300 dark:border-violet-700"
          >
            {task.fields.Project}
          </Badge>
        )}
        {task.fields.DueDate && (
          <span className="text-xs text-[var(--md-text-tertiary)] tabular-nums">
            📅 {new Date(task.fields.DueDate).toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
            })}
          </span>
        )}
      </div>
    </div>
  );
}
