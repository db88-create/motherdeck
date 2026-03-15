import { getBase } from "./airtable";
import { TaskFields, IdeaFields, ExpenseFields } from "./types";

// ============ RESULT TYPES ============

interface WriteResult {
  success: boolean;
  id?: string;
  error?: string;
}

interface TaskResult extends WriteResult {
  name?: string;
}

interface IdeaResult extends WriteResult {
  title?: string;
}

interface BatchResult {
  created: number;
  failed: number;
  ids: string[];
  errors: string[];
}

// ============ VALIDATION ============

const TASK_STATUSES = ["backlog", "todo", "in_progress", "done", "archived"] as const;
const TASK_PRIORITIES = ["low", "medium", "high", "urgent"] as const;
const IDEA_STATUSES = ["captured", "exploring", "planned", "implemented", "parked"] as const;
const IDEA_PRIORITIES = ["low", "medium", "high"] as const;
const IDEA_EFFORTS = ["small", "medium", "large"] as const;
const IDEA_IMPACTS = ["low", "medium", "high"] as const;

function isValidDate(d: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(d);
}

function isOneOf<T extends string>(val: string, allowed: readonly T[]): val is T {
  return (allowed as readonly string[]).includes(val);
}

// ============ TASKS ============

export async function createTask(data: {
  name: string;
  description?: string;
  status?: string;
  priority?: string;
  project?: string;
  assignee?: string;
  dueDate?: string;
  tags?: string | string[];
}): Promise<TaskResult> {
  try {
    if (!data.name?.trim()) {
      return { success: false, error: "Task name is required" };
    }
    if (data.status && !isOneOf(data.status, TASK_STATUSES)) {
      return { success: false, error: `Invalid status: ${data.status}. Must be one of: ${TASK_STATUSES.join(", ")}` };
    }
    if (data.priority && !isOneOf(data.priority, TASK_PRIORITIES)) {
      return { success: false, error: `Invalid priority: ${data.priority}. Must be one of: ${TASK_PRIORITIES.join(", ")}` };
    }
    if (data.dueDate && !isValidDate(data.dueDate)) {
      return { success: false, error: `Invalid date format: ${data.dueDate}. Use YYYY-MM-DD` };
    }

    const tags = Array.isArray(data.tags) ? data.tags.join(", ") : (data.tags || "");

    const fields: Partial<TaskFields> = {
      Name: data.name.trim(),
      Status: (data.status as TaskFields["Status"]) || "todo",
      Priority: (data.priority as TaskFields["Priority"]) || "medium",
      Project: data.project || "",
      Description: data.description || "",
      DueDate: data.dueDate || "",
      Assignee: data.assignee || "",
      Tags: tags,
      CreatedAt: new Date().toISOString(),
    };

    const base = getBase();
    const records = await base("Tasks").create([{ fields: fields as any }]);
    const record = records[0];

    console.log(`[airtable-write] Created task: "${data.name}" (${record.id})`);
    return { success: true, id: record.id, name: data.name };
  } catch (err: any) {
    console.error(`[airtable-write] Failed to create task: ${err.message}`);
    return { success: false, error: err.message };
  }
}

export async function updateTask(
  taskId: string,
  updates: {
    name?: string;
    description?: string;
    status?: string;
    priority?: string;
    project?: string;
    assignee?: string;
    dueDate?: string;
    tags?: string | string[];
  }
): Promise<WriteResult> {
  try {
    if (!taskId) return { success: false, error: "Task ID is required" };

    if (updates.status && !isOneOf(updates.status, TASK_STATUSES)) {
      return { success: false, error: `Invalid status: ${updates.status}` };
    }
    if (updates.priority && !isOneOf(updates.priority, TASK_PRIORITIES)) {
      return { success: false, error: `Invalid priority: ${updates.priority}` };
    }
    if (updates.dueDate && !isValidDate(updates.dueDate)) {
      return { success: false, error: `Invalid date: ${updates.dueDate}` };
    }

    const fields: Record<string, any> = {};
    if (updates.name !== undefined) fields.Name = updates.name;
    if (updates.description !== undefined) fields.Description = updates.description;
    if (updates.status !== undefined) {
      fields.Status = updates.status;
      if (updates.status === "done") fields.CompletedAt = new Date().toISOString();
    }
    if (updates.priority !== undefined) fields.Priority = updates.priority;
    if (updates.project !== undefined) fields.Project = updates.project;
    if (updates.assignee !== undefined) fields.Assignee = updates.assignee;
    if (updates.dueDate !== undefined) fields.DueDate = updates.dueDate;
    if (updates.tags !== undefined) {
      fields.Tags = Array.isArray(updates.tags) ? updates.tags.join(", ") : updates.tags;
    }

    const base = getBase();
    await base("Tasks").update(taskId, fields);

    console.log(`[airtable-write] Updated task ${taskId}`);
    return { success: true, id: taskId };
  } catch (err: any) {
    console.error(`[airtable-write] Failed to update task: ${err.message}`);
    return { success: false, error: err.message };
  }
}

export async function updateTaskStatus(
  taskId: string,
  status: string
): Promise<WriteResult> {
  return updateTask(taskId, { status });
}

export async function deleteTask(taskId: string): Promise<WriteResult> {
  try {
    if (!taskId) return { success: false, error: "Task ID is required" };
    const base = getBase();
    await base("Tasks").destroy(taskId);
    console.log(`[airtable-write] Deleted task ${taskId}`);
    return { success: true, id: taskId };
  } catch (err: any) {
    console.error(`[airtable-write] Failed to delete task: ${err.message}`);
    return { success: false, error: err.message };
  }
}

export async function createTasks(
  taskList: Array<{
    name: string;
    project?: string;
    priority?: string;
    tags?: string[];
    dueDate?: string;
    description?: string;
  }>
): Promise<BatchResult> {
  const result: BatchResult = { created: 0, failed: 0, ids: [], errors: [] };

  for (let i = 0; i < taskList.length; i += 10) {
    const batch = taskList.slice(i, i + 10);
    try {
      const base = getBase();
      const records = await base("Tasks").create(
        batch.map((t) => ({
          fields: {
            Name: t.name,
            Status: "todo",
            Priority: t.priority || "medium",
            Project: t.project || "",
            Description: t.description || "",
            DueDate: t.dueDate || "",
            Tags: t.tags?.join(", ") || "",
            CreatedAt: new Date().toISOString(),
          },
        }))
      );
      result.created += records.length;
      for (const r of records) {
        result.ids.push(r.id);
      }
    } catch (err: any) {
      result.failed += batch.length;
      result.errors.push(err.message);
    }

    if (i + 10 < taskList.length) {
      await new Promise((r) => setTimeout(r, 200));
    }
  }

  console.log(`[airtable-write] Batch create: ${result.created} created, ${result.failed} failed`);
  return result;
}

// ============ IDEAS ============

export async function createIdea(data: {
  title: string;
  description?: string;
  status?: string;
  priority?: string;
  effort?: string;
  impact?: string;
  project?: string;
}): Promise<IdeaResult> {
  try {
    if (!data.title?.trim()) {
      return { success: false, error: "Idea title is required" };
    }
    if (data.status && !isOneOf(data.status, IDEA_STATUSES)) {
      return { success: false, error: `Invalid status: ${data.status}` };
    }
    if (data.priority && !isOneOf(data.priority, IDEA_PRIORITIES)) {
      return { success: false, error: `Invalid priority: ${data.priority}` };
    }
    if (data.effort && !isOneOf(data.effort, IDEA_EFFORTS)) {
      return { success: false, error: `Invalid effort: ${data.effort}` };
    }
    if (data.impact && !isOneOf(data.impact, IDEA_IMPACTS)) {
      return { success: false, error: `Invalid impact: ${data.impact}` };
    }

    const fields: Partial<IdeaFields> = {
      Title: data.title.trim(),
      Description: data.description || "",
      Status: (data.status as IdeaFields["Status"]) || "captured",
      Priority: (data.priority as IdeaFields["Priority"]) || "medium",
      Effort: (data.effort as IdeaFields["Effort"]) || "medium",
      Impact: (data.impact as IdeaFields["Impact"]) || "medium",
      Project: data.project || "",
      CreatedAt: new Date().toISOString(),
    };

    const base = getBase();
    const records = await base("Ideas").create([{ fields: fields as any }]);
    const record = records[0];

    console.log(`[airtable-write] Created idea: "${data.title}" (${record.id})`);
    return { success: true, id: record.id, title: data.title };
  } catch (err: any) {
    console.error(`[airtable-write] Failed to create idea: ${err.message}`);
    return { success: false, error: err.message };
  }
}

// ============ EXPENSES ============

export async function createExpense(data: {
  description: string;
  amount: number;
  category?: string;
  vendor?: string;
  entity?: string;
  date?: string;
}): Promise<WriteResult> {
  try {
    if (!data.description?.trim()) {
      return { success: false, error: "Expense description is required" };
    }
    if (typeof data.amount !== "number" || data.amount <= 0) {
      return { success: false, error: "Amount must be a positive number" };
    }
    if (data.date && !isValidDate(data.date)) {
      return { success: false, error: `Invalid date: ${data.date}` };
    }

    const fields: Partial<ExpenseFields> = {
      Description: data.description.trim(),
      Amount: data.amount,
      Category: data.category || "",
      Vendor: data.vendor || "",
      Entity: data.entity || "",
      Date: data.date || new Date().toISOString().split("T")[0],
      CreatedAt: new Date().toISOString(),
    };

    const base = getBase();
    const records = await base("Expenses").create([{ fields: fields as any }]);
    const record = records[0];

    console.log(`[airtable-write] Created expense: "${data.description}" $${data.amount} (${record.id})`);
    return { success: true, id: record.id };
  } catch (err: any) {
    console.error(`[airtable-write] Failed to create expense: ${err.message}`);
    return { success: false, error: err.message };
  }
}

// ============ BRIEFS ============

export async function createBrief(data: {
  date: string;
  title: string;
  executiveSummary: string;
  keyInsights: string;
  bigIdea: string;
  fullBrief: string;
  highlights?: string | string[];
}): Promise<WriteResult> {
  try {
    if (!data.date || !isValidDate(data.date)) {
      return { success: false, error: `Invalid date: ${data.date}` };
    }
    if (!data.title?.trim()) {
      return { success: false, error: "Brief title is required" };
    }

    const highlights = Array.isArray(data.highlights)
      ? data.highlights.join(", ")
      : data.highlights || "";

    const fields: Record<string, any> = {
      Date: data.date,
      Title: data.title.trim(),
      Summary: data.executiveSummary || "",
      KeyInsights: data.keyInsights || "",
      BigIdea: data.bigIdea || "",
      FullContent: data.fullBrief || "",
      Highlights: highlights,
      CreatedAt: new Date().toISOString(),
    };

    const base = getBase();
    const records = await base("Briefs").create([{ fields }]);
    const record = records[0];

    console.log(`[airtable-write] Created brief: "${data.title}" (${record.id})`);
    return { success: true, id: record.id };
  } catch (err: any) {
    console.error(`[airtable-write] Failed to create brief: ${err.message}`);
    return { success: false, error: err.message };
  }
}
