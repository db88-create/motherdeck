import type { FocusItem } from "@/lib/services/weekly-focus";
import { parseSubItems } from "@/components/today/sub-items";
import { toDateStr } from "./date-utils";
import type { CommandTask } from "./types";

/** Convert a FocusItem (API shape) to a CommandTask (UI shape) */
export function normalizeFocusItem(item: FocusItem): CommandTask {
  return {
    id: item.id,
    text: item.text,
    status: item.status,
    dueDate: toDateStr(item.dueDate),
    sortOrder: item.sortOrder,
    notes: item.notes,
    subItems: parseSubItems(item.subItems),
    weekId: item.weekId,
    createdAt: item.createdAt,
  };
}
