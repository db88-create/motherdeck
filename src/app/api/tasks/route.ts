import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const db = getDb();

    const stmt = db.prepare(
      `INSERT INTO todos (title, description, priority, due_date, status, parent_task_id)
       VALUES (?, ?, ?, ?, 'pending', ?)`
    );

    const result = stmt.run(
      body.title || body.name || "",
      body.description || "",
      body.priority || "medium",
      body.dueDate || null,
      body.parentTaskId || null
    );

    // Fetch the newly created record
    const record = db
      .prepare("SELECT * FROM todos WHERE rowid = ?")
      .get(result.lastInsertRowid);

    return NextResponse.json(record, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
