import type { SubItem } from "@/components/today/sub-items";
export type { SubItem };

export type TaskStatus = "active" | "done" | "deferred" | "dropped";

export interface CommandTask {
  id: string;
  text: string;
  status: TaskStatus;
  dueDate: string; // "YYYY-MM-DD" or ""
  sortOrder: number;
  notes: string;
  subItems: SubItem[]; // always parsed, never JSON string
  weekId: string;
  createdAt: string;
}
