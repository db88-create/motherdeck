import { NextRequest, NextResponse } from "next/server";
import { fetchAll, createRecord } from "@/lib/airtable";
import { ExpenseFields } from "@/lib/types";

export async function GET() {
  try {
    const records = await fetchAll<ExpenseFields>("Expenses", {
      sort: [{ field: "Date", direction: "desc" }],
    });
    return NextResponse.json(records);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const fields: Partial<ExpenseFields> = {
      Description: body.description,
      Amount: body.amount,
      Category: body.category || "Other",
      Vendor: body.vendor || "",
      Entity: body.entity || "",
      Date: body.date || new Date().toISOString().split("T")[0],
      CreatedAt: new Date().toISOString(),
    };

    const record = await createRecord<ExpenseFields>("Expenses", fields);
    return NextResponse.json(record, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
