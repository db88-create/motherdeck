import { NextRequest, NextResponse } from "next/server";
import { fetchAll, createRecord } from "@/lib/airtable";
import { IdeaFields } from "@/lib/types";

export async function GET() {
  try {
    const records = await fetchAll<IdeaFields>("Ideas", {
      sort: [
        { field: "Priority", direction: "asc" },
        { field: "CreatedAt", direction: "desc" },
      ],
    });
    return NextResponse.json(records);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const fields: Partial<IdeaFields> = {
      Title: body.title,
      Description: body.description || "",
      Status: body.status || "captured",
      Priority: body.priority || "medium",
      Effort: body.effort || "medium",
      Impact: body.impact || "medium",
      Project: body.project || "",
      CreatedAt: new Date().toISOString(),
    };

    const record = await createRecord<IdeaFields>("Ideas", fields);
    return NextResponse.json(record, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
