import { NextResponse } from "next/server";
import { fetchAll } from "@/lib/airtable";
import { BriefFields } from "@/lib/types";

export async function GET() {
  try {
    const records = await fetchAll<BriefFields>("Briefs", {
      sort: [{ field: "Date", direction: "desc" }],
      maxRecords: 30,
    });
    return NextResponse.json(records);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
