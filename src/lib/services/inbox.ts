import { fetchAll, createRecord, updateRecord, deleteRecord } from "@/lib/airtable";

// Airtable field names
interface InboxItemFields {
  Content: string;
  SourceType: "text" | "voice";
  Processed: boolean;
  ProcessedAt?: string;
  SuggestedType?: string;
  LinkedTaskId?: string;
  LinkedNoteId?: string;
  Tags?: string;
  SubItems?: string;
  DueDate?: string;
  CreatedAt: string;
}

export interface InboxItem {
  id: string;
  content: string;
  sourceType: "text" | "voice";
  processed: boolean;
  subItems: string;
  dueDate: string;
  createdAt: string;
}

function toInboxItem(record: { id: string; fields: InboxItemFields }): InboxItem {
  return {
    id: record.id,
    content: record.fields.Content || "",
    sourceType: record.fields.SourceType || "text",
    processed: !!record.fields.Processed,
    subItems: record.fields.SubItems || "[]",
    dueDate: record.fields.DueDate || "",
    createdAt: record.fields.CreatedAt || new Date().toISOString(),
  };
}

const TABLE = "InboxItems";

export const InboxService = {
  async list(processed?: boolean): Promise<InboxItem[]> {
    try {
      const filter =
        processed !== undefined
          ? `{Processed} = ${processed ? "TRUE()" : "FALSE()"}`
          : "";
      const records = await fetchAll<InboxItemFields>(TABLE, {
        filterByFormula: filter,
        sort: [{ field: "CreatedAt", direction: "desc" }],
        maxRecords: 50,
      });
      return records.map(toInboxItem);
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

  async create(content: string, sourceType: "text" | "voice" = "text", dueDate?: string): Promise<InboxItem> {
    const fields: Partial<InboxItemFields> = {
      Content: content,
      SourceType: sourceType,
      Processed: false,
      CreatedAt: new Date().toISOString(),
    };
    if (dueDate) fields.DueDate = dueDate;
    const record = await createRecord<InboxItemFields>(TABLE, fields);
    return toInboxItem(record);
  },

  async getById(id: string): Promise<InboxItem | null> {
    try {
      // Airtable SDK doesn't support RECORD_ID() filtering
      // Fetch unprocessed items (most common case for promotion) and find by id
      // This is fast because most inbox items are unprocessed (just captured)
      const records = await fetchAll<InboxItemFields>(TABLE, {
        filterByFormula: "{Processed} = FALSE()",
        maxRecords: 100,
      });
      const record = records.find((r) => r.id === id);
      return record ? toInboxItem(record) : null;
    } catch (error: any) {
      console.error("Error fetching inbox item:", error);
      return null;
    }
  },

  async markProcessed(id: string, linkedFields?: { linkedTaskId?: string; linkedType?: string }): Promise<void> {
    const updates: Partial<InboxItemFields> = {
      Processed: true,
      ProcessedAt: new Date().toISOString(),
    };
    if (linkedFields?.linkedTaskId && linkedFields?.linkedType) {
      // Construct field name: LinkedTaskId, LinkedNoteId, etc.
      const typeCapitalized = linkedFields.linkedType.charAt(0).toUpperCase() + linkedFields.linkedType.slice(1);
      const fieldName = `Linked${typeCapitalized}Id`;
      (updates as any)[fieldName] = linkedFields.linkedTaskId;
    }
    await updateRecord<InboxItemFields>(TABLE, id, updates);
  },

  async update(id: string, updates: { subItems?: string; processed?: boolean; dueDate?: string }): Promise<void> {
    const fields: Partial<InboxItemFields> = {};
    if (updates.subItems !== undefined) fields.SubItems = updates.subItems;
    if (updates.dueDate !== undefined) fields.DueDate = updates.dueDate;
    if (updates.processed !== undefined) {
      fields.Processed = updates.processed;
      if (updates.processed) fields.ProcessedAt = new Date().toISOString();
    }
    await updateRecord<InboxItemFields>(TABLE, id, fields);
  },

  async remove(id: string): Promise<void> {
    await deleteRecord(TABLE, id);
  },
};
