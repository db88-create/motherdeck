import { fetchAll, createRecord, updateRecord } from "@/lib/airtable";

interface DailyNoteFields {
  NoteDate: string;
  Content: string;
  Summary?: string;
  CreatedAt: string;
  UpdatedAt: string;
}

export interface DailyNote {
  id: string;
  noteDate: string;
  content: string;
  createdAt: string;
  updatedAt: string;
}

function toDailyNote(record: { id: string; fields: DailyNoteFields }): DailyNote {
  return {
    id: record.id,
    noteDate: record.fields.NoteDate || "",
    content: record.fields.Content || "",
    createdAt: record.fields.CreatedAt || "",
    updatedAt: record.fields.UpdatedAt || "",
  };
}

const TABLE = "DailyNotes";

// Persistent note ID — uses "persistent" as the NoteDate marker
const PERSISTENT_MARKER = "2000-01-01";

export const DailyNoteService = {
  /**
   * Get or create the single persistent running note.
   * This is NOT one-per-day — it's one note that accumulates forever.
   */
  async getOrCreatePersistent(): Promise<DailyNote> {
    try {
      // First try to find the persistent note
      const records = await fetchAll<DailyNoteFields>(TABLE, {
        filterByFormula: `DATESTR({NoteDate}) = '${PERSISTENT_MARKER}'`,
        maxRecords: 1,
      });
      if (records.length > 0) {
        return toDailyNote(records[0]);
      }

      // No persistent note yet — check if there's any existing note with content
      // and migrate it to be the persistent one
      const allNotes = await fetchAll<DailyNoteFields>(TABLE, {
        sort: [{ field: "UpdatedAt", direction: "desc" }],
        maxRecords: 10,
      });
      const withContent = allNotes.filter((n) => n.fields.Content?.trim());

      // Merge all existing content into one persistent note
      let mergedContent = "";
      if (withContent.length > 0) {
        mergedContent = withContent
          .map((n) => n.fields.Content.trim())
          .join("\n\n---\n\n");
      }

      const now = new Date().toISOString();
      const record = await createRecord<DailyNoteFields>(TABLE, {
        NoteDate: PERSISTENT_MARKER,
        Content: mergedContent,
        CreatedAt: now,
        UpdatedAt: now,
      });
      return toDailyNote(record);
    } catch (error: any) {
      if (
        !error.message?.includes("TABLE_NOT_FOUND") &&
        !error.message?.includes("not authorized") &&
        error.statusCode !== 404 &&
        error.statusCode !== 403
      ) {
        throw error;
      }
      // Fallback: create fresh
      const now = new Date().toISOString();
      const record = await createRecord<DailyNoteFields>(TABLE, {
        NoteDate: PERSISTENT_MARKER,
        Content: "",
        CreatedAt: now,
        UpdatedAt: now,
      });
      return toDailyNote(record);
    }
  },

  async update(id: string, content: string): Promise<DailyNote> {
    const record = await updateRecord<DailyNoteFields>(TABLE, id, {
      Content: content,
      UpdatedAt: new Date().toISOString(),
    });
    return toDailyNote(record);
  },

  // Keep for backward compat / review
  async getByDate(date: string): Promise<DailyNote | null> {
    try {
      const records = await fetchAll<DailyNoteFields>(TABLE, {
        filterByFormula: `DATESTR({NoteDate}) = '${date}'`,
        maxRecords: 1,
      });
      return records.length > 0 ? toDailyNote(records[0]) : null;
    } catch {
      return null;
    }
  },
};
