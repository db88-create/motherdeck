import { Task, TaskNode } from "@/lib/types";

/**
 * Build a tree structure from flat task list.
 * Tasks with ParentTaskId become children of their parent.
 * Max 3 levels of nesting.
 */
export function buildTaskTree(tasks: Task[]): TaskNode[] {
  const taskMap = new Map<string, TaskNode>();
  const roots: TaskNode[] = [];

  // Create TaskNode for each task
  for (const task of tasks) {
    taskMap.set(task.id, { ...task, subtasks: [], depth: 0 });
  }

  // Build parent-child relationships
  for (const task of tasks) {
    const node = taskMap.get(task.id)!;
    const parentId = task.fields.ParentTaskId;

    if (parentId && taskMap.has(parentId)) {
      const parent = taskMap.get(parentId)!;
      node.depth = parent.depth + 1;
      if (node.depth <= 2) {
        // max 3 levels (0, 1, 2)
        parent.subtasks.push(node);
      } else {
        roots.push(node);
      }
    } else {
      roots.push(node);
    }
  }

  // Sort each level by SortOrder, then priority, then creation date
  const priorityOrder = { urgent: 0, high: 1, medium: 2, low: 3 };
  const sortNodes = (nodes: TaskNode[]) => {
    nodes.sort((a, b) => {
      const orderA = a.fields.SortOrder ?? 999;
      const orderB = b.fields.SortOrder ?? 999;
      if (orderA !== orderB) return orderA - orderB;
      const pa = priorityOrder[a.fields.Priority] ?? 2;
      const pb = priorityOrder[b.fields.Priority] ?? 2;
      if (pa !== pb) return pa - pb;
      return (
        new Date(b.fields.CreatedAt).getTime() -
        new Date(a.fields.CreatedAt).getTime()
      );
    });
    for (const node of nodes) {
      sortNodes(node.subtasks);
    }
  };

  sortNodes(roots);
  return roots;
}

/**
 * Group root-level tasks by project.
 * Returns array of groups: { project, tasks }
 */
export function groupByProject(
  tasks: TaskNode[]
): Array<{ project: string; tasks: TaskNode[] }> {
  const groups = new Map<string, TaskNode[]>();
  const standalone: TaskNode[] = [];

  for (const task of tasks) {
    const project = task.fields.Project;
    if (project) {
      if (!groups.has(project)) groups.set(project, []);
      groups.get(project)!.push(task);
    } else {
      standalone.push(task);
    }
  }

  const result: Array<{ project: string; tasks: TaskNode[] }> = [];
  for (const [project, projectTasks] of groups) {
    result.push({ project, tasks: projectTasks });
  }
  // Sort projects alphabetically
  result.sort((a, b) => a.project.localeCompare(b.project));

  if (standalone.length > 0) {
    result.push({ project: "", tasks: standalone });
  }

  return result;
}

/**
 * Filter tasks tree, preserving parents if any child matches.
 */
export function filterTasks(
  tasks: TaskNode[],
  filter: {
    status?: string;
    priority?: string;
    search?: string;
  }
): TaskNode[] {
  const matches = (task: TaskNode): boolean => {
    if (filter.status && filter.status !== "all") {
      if (filter.status === "active" && task.fields.Status === "done")
        return false;
      if (filter.status === "active" && task.fields.Status === "archived")
        return false;
      if (
        filter.status !== "active" &&
        task.fields.Status !== filter.status
      )
        return false;
    }
    if (filter.priority && task.fields.Priority !== filter.priority)
      return false;
    if (filter.search) {
      const q = filter.search.toLowerCase();
      const inTitle = task.fields.Name.toLowerCase().includes(q);
      const inDesc = task.fields.Description?.toLowerCase().includes(q);
      if (!inTitle && !inDesc) return false;
    }
    return true;
  };

  const filterNode = (node: TaskNode): TaskNode | null => {
    const filteredChildren = node.subtasks
      .map(filterNode)
      .filter(Boolean) as TaskNode[];
    if (matches(node) || filteredChildren.length > 0) {
      return { ...node, subtasks: filteredChildren };
    }
    return null;
  };

  return tasks.map(filterNode).filter(Boolean) as TaskNode[];
}

/**
 * Calculate completion percentage for a task node.
 */
export function getCompletionPct(node: TaskNode): number {
  if (node.subtasks.length === 0) {
    return node.fields.Status === "done" ? 100 : 0;
  }
  const total = node.subtasks.length;
  const done = node.subtasks.filter((s) => s.fields.Status === "done").length;
  return Math.round((done / total) * 100);
}

/**
 * Flatten a task tree into a list of IDs (for collecting children to auto-complete).
 */
export function collectChildIds(node: TaskNode): string[] {
  const ids: string[] = [];
  for (const child of node.subtasks) {
    ids.push(child.id);
    ids.push(...collectChildIds(child));
  }
  return ids;
}

/**
 * Format a relative date string.
 */
export function formatDueDate(dateStr: string): {
  text: string;
  overdue: boolean;
  soon: boolean;
} {
  const due = new Date(dateStr + "T00:00:00");
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const diffMs = due.getTime() - now.getTime();
  const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays < 0) {
    return {
      text: diffDays === -1 ? "Yesterday" : `${Math.abs(diffDays)}d overdue`,
      overdue: true,
      soon: false,
    };
  }
  if (diffDays === 0) return { text: "Today", overdue: false, soon: true };
  if (diffDays === 1) return { text: "Tomorrow", overdue: false, soon: true };
  if (diffDays <= 3)
    return { text: `${diffDays}d`, overdue: false, soon: true };
  if (diffDays <= 7) return { text: `${diffDays}d`, overdue: false, soon: false };

  return {
    text: due.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
    overdue: false,
    soon: false,
  };
}
