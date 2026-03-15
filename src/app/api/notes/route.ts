import { NextRequest, NextResponse } from "next/server";
import { fetchAll, createRecord, updateRecord, deleteRecord } from "@/lib/airtable";
import { NoteFields } from "@/lib/types";

export async function GET(req: NextRequest) {
  try {
    // Default: today's notes only
    const all = req.nextUrl.searchParams.get("all") === "true";
    const today = new Date().toISOString().split("T")[0];

    const filterByFormula = all
      ? ""
      : `IS_SAME_DAY({Timestamp}, '${today}')`;

    const records = await fetchAll<NoteFields>("Notes", {
      filterByFormula,
      sort: [{ field: "Timestamp", direction: "desc" }],
    });

    return NextResponse.json(records);
  } catch (error: any) {
    // If table doesn't exist yet, return empty array
    if (error.message?.includes("TABLE_NOT_FOUND") || error.statusCode === 404) {
      return NextResponse.json([]);
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const fields: Partial<NoteFields> = {
      Text: body.text,
      Timestamp: body.timestamp || new Date().toISOString(),
    };

    const record = await createRecord<NoteFields>("Notes", fields);
    return NextResponse.json(record, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json();
    const { id, ...updates } = body;

    if (!id) {
      return NextResponse.json({ error: "Note ID required" }, { status: 400 });
    }

    const fields: Partial<NoteFields> = {};
    if (updates.suggestion !== undefined) fields.Suggestion = updates.suggestion;
    if (updates.suggestionReason !== undefined) fields.SuggestionReason = updates.suggestionReason;
    if (updates.suggestionConfidence !== undefined) fields.SuggestionConfidence = updates.suggestionConfidence;
    if (updates.converted !== undefined) fields.Converted = updates.converted;
    if (updates.convertedId !== undefined) fields.ConvertedId = updates.convertedId;

    const record = await updateRecord<NoteFields>("Notes", id, fields);
    return NextResponse.json(record);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { id } = await req.json();
    if (!id) {
      return NextResponse.json({ error: "Note ID required" }, { status: 400 });
    }
    await deleteRecord("Notes", id);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
