import { NextRequest, NextResponse } from "next/server";
import { fetchAll, createRecord, deleteRecord } from "@/lib/airtable";
import { ActionNoteFields } from "@/lib/types";

export async function GET() {
  try {
    const records = await fetchAll<ActionNoteFields>("ActionNotes", {
      sort: [{ field: "SortOrder", direction: "asc" }],
    });
    return NextResponse.json(records);
  } catch (error: any) {
    if (error.message?.includes("TABLE_NOT_FOUND") || error.statusCode === 404) {
      return NextResponse.json([]);
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const fields: Partial<ActionNoteFields> = {
      Label: body.label,
      Code: body.code,
      CreatedAt: new Date().toISOString(),
    };

    const record = await createRecord<ActionNoteFields>("ActionNotes", fields);
    return NextResponse.json(record, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const id = req.nextUrl.searchParams.get("id");
    if (!id) {
      return NextResponse.json({ error: "ID required" }, { status: 400 });
    }
    await deleteRecord("ActionNotes", id);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
