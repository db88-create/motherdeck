import { NextRequest, NextResponse } from "next/server";
import { WeeklyFocusService, type FocusItem } from "@/lib/services/weekly-focus";
import { fetchAll } from "@/lib/airtable";

interface WeekFields {
  WeekStartDate: string;
  Archived: boolean;
  CreatedAt: string;
}

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

export async function GET(req: NextRequest) {
  try {
    const weekId = req.nextUrl.searchParams.get("weekId");
    const all = req.nextUrl.searchParams.get("all");

    // Return all items across all weeks (for calendar)
    if (all === "true") {
      const allItems = await fetchAll<FocusItemFields>("WeeklyFocusItems", {
        sort: [{ field: "SortOrder", direction: "asc" }],
      });
      const currentWeek = await WeeklyFocusService.getCurrentWeek();
      return NextResponse.json({
        week: currentWeek,
        items: allItems.map(toFocusItem),
      });
    }

    if (weekId) {
      const records = await fetchAll<WeekFields>("WeeklyFocusWeeks", {
        filterByFormula: `RECORD_ID() = '${weekId}'`,
        maxRecords: 1,
      });
      if (records.length === 0) {
        return NextResponse.json({ error: "Week not found" }, { status: 404 });
      }
      const week = {
        id: records[0].id,
        weekStartDate: records[0].fields.WeekStartDate,
        archived: !!records[0].fields.Archived,
      };
      const items = await WeeklyFocusService.getItems(week.id);
      return NextResponse.json({ week, items });
    }

    const week = await WeeklyFocusService.getCurrentWeek();
    const items = await WeeklyFocusService.getItems(week.id);
    return NextResponse.json({ week, items });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    if (!body.text?.trim()) {
      return NextResponse.json({ error: "Text required" }, { status: 400 });
    }
    const week = await WeeklyFocusService.getCurrentWeek();
    const item = await WeeklyFocusService.addItem(
      week.id,
      body.text.trim(),
      body.sortOrder ?? Date.now()
    );
    // Set dueDate if provided (addItem doesn't support it, so update after create)
    if (body.dueDate) {
      const updated = await WeeklyFocusService.updateItem(item.id, { dueDate: body.dueDate });
      return NextResponse.json(updated, { status: 201 });
    }
    return NextResponse.json(item, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json();
    if (!body.id) {
      return NextResponse.json({ error: "Item ID required" }, { status: 400 });
    }
    const { id, ...updates } = body;
    const item = await WeeklyFocusService.updateItem(id, updates);
    return NextResponse.json(item);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
