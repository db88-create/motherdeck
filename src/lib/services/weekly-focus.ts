import { fetchAll, createRecord, updateRecord } from "@/lib/airtable";

// --- Week container ---
interface WeekFields {
  WeekStartDate: string;
  Archived: boolean;
  CreatedAt: string;
}

export interface FocusWeek {
  id: string;
  weekStartDate: string;
  archived: boolean;
}

// --- Focus item ---
interface FocusItemFields {
  WeekId: string;
  Text: string;
  Status: "active" | "done" | "deferred" | "dropped";
  SortOrder: number;
  Notes?: string;
  SubItems?: string;
  DueDate?: string;
  CreatedAt: string;
  UpdatedAt: string;
}

export interface FocusItem {
  id: string;
  weekId: string;
  text: string;
  status: "active" | "done" | "deferred" | "dropped";
  sortOrder: number;
  notes: string;
  subItems: string;
  dueDate: string;
  createdAt: string;
}

function toFocusItem(record: { id: string; fields: FocusItemFields }): FocusItem {
  return {
    id: record.id,
    weekId: record.fields.WeekId || "",
    text: record.fields.Text || "",
    status: record.fields.Status || "active",
    sortOrder: record.fields.SortOrder ?? 0,
    notes: record.fields.Notes || "",
    subItems: record.fields.SubItems || "[]",
    dueDate: record.fields.DueDate || "",
    createdAt: record.fields.CreatedAt || "",
  };
}

function getMonday(date: Date): string {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  d.setDate(diff);
  return d.toISOString().split("T")[0];
}

const WEEKS_TABLE = "WeeklyFocusWeeks";
const ITEMS_TABLE = "WeeklyFocusItems";

export const WeeklyFocusService = {
  async getCurrentWeek(): Promise<FocusWeek> {
    const monday = getMonday(new Date());
    try {
      const records = await fetchAll<WeekFields>(WEEKS_TABLE, {
        filterByFormula: `DATESTR({WeekStartDate}) = '${monday}'`,
        maxRecords: 1,
      });
      if (records.length > 0) {
        return {
          id: records[0].id,
          weekStartDate: records[0].fields.WeekStartDate,
          archived: !!records[0].fields.Archived,
        };
      }
    } catch (error: any) {
      if (
        !error.message?.includes("TABLE_NOT_FOUND") &&
        !error.message?.includes("not authorized") &&
        error.statusCode !== 404 &&
        error.statusCode !== 403
      ) {
        throw error;
      }
    }
    // Create new week
    const record = await createRecord<WeekFields>(WEEKS_TABLE, {
      WeekStartDate: monday,
      Archived: false,
      CreatedAt: new Date().toISOString(),
    });
    return {
      id: record.id,
      weekStartDate: record.fields.WeekStartDate || monday,
      archived: false,
    };
  },

  async getItems(weekId: string): Promise<FocusItem[]> {
    try {
      const records = await fetchAll<FocusItemFields>(ITEMS_TABLE, {
        filterByFormula: `{WeekId} = '${weekId}'`,
        sort: [{ field: "SortOrder", direction: "asc" }],
      });
      return records.map(toFocusItem);
    } catch (error: any) {
      if (
        error.message?.includes("TABLE_NOT_FOUND") ||
        error.message?.includes("not authorized") ||
        error.statusCode === 404 ||
        error.statusCode === 403
      ) {
        return [];
      }
      throw error;
    }
  },

  async addItem(weekId: string, text: string, sortOrder: number): Promise<FocusItem> {
    const now = new Date().toISOString();
    const record = await createRecord<FocusItemFields>(ITEMS_TABLE, {
      WeekId: weekId,
      Text: text,
      Status: "active",
      SortOrder: sortOrder,
      CreatedAt: now,
      UpdatedAt: now,
    });
    return toFocusItem(record);
  },

  async updateItem(
    id: string,
    updates: { text?: string; status?: FocusItem["status"]; sortOrder?: number; notes?: string; subItems?: string; dueDate?: string }
  ): Promise<FocusItem> {
    const fields: Partial<FocusItemFields> = { UpdatedAt: new Date().toISOString() };
    if (updates.text !== undefined) fields.Text = updates.text;
    if (updates.status !== undefined) fields.Status = updates.status;
    if (updates.sortOrder !== undefined) fields.SortOrder = updates.sortOrder;
    if (updates.notes !== undefined) fields.Notes = updates.notes;
    if (updates.subItems !== undefined) fields.SubItems = updates.subItems;
    if (updates.dueDate !== undefined) fields.DueDate = updates.dueDate;
    const record = await updateRecord<FocusItemFields>(ITEMS_TABLE, id, fields);
    return toFocusItem(record);
  },
};
