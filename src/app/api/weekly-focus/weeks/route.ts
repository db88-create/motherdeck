import { NextResponse } from "next/server";
import { fetchAll } from "@/lib/airtable";

interface WeekFields {
  WeekStartDate: string;
  Archived: boolean;
  CreatedAt: string;
}

export async function GET() {
  try {
    const records = await fetchAll<WeekFields>("WeeklyFocusWeeks", {
      sort: [{ field: "WeekStartDate", direction: "desc" }],
      maxRecords: 26, // ~6 months of weeks
    });

    const weeks = records.map((r) => ({
      id: r.id,
      weekStartDate: r.fields.WeekStartDate,
      archived: !!r.fields.Archived,
    }));

    return NextResponse.json(weeks);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
