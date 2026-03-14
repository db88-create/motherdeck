import { NextResponse } from "next/server";
import { fetchAll } from "@/lib/airtable";
import { SkillFields } from "@/lib/types";

export async function GET() {
  try {
    const records = await fetchAll<SkillFields>("Skills", {
      sort: [{ field: "Status", direction: "asc" }, { field: "Name", direction: "asc" }],
    });
    return NextResponse.json(records);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
