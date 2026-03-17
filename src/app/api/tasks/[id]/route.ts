import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json();
    const db = getDb();

    const sets: string[] = [];
    const values: any[] = [];

    if (body.status !== undefined) {
      sets.push("status = ?");
      values.push(body.status);
      if (body.status === "done" || body.status === "completed") {
        sets.push("completed_at = CURRENT_TIMESTAMP");
      }
    }
    if (body.title !== undefined) {
      sets.push("title = ?");
      values.push(body.title);
    }
    if (body.priority !== undefined) {
      sets.push("priority = ?");
      values.push(body.priority);
    }
    if (body.dueDate !== undefined) {
      sets.push("due_date = ?");
      values.push(body.dueDate || null);
    }
    if (body.description !== undefined) {
      sets.push("description = ?");
      values.push(body.description);
    }
    if (body.notes !== undefined) {
      sets.push("notes = ?");
      values.push(body.notes);
    }

    if (sets.length === 0) {
      return NextResponse.json({ error: "No fields to update" }, { status: 400 });
    }

    values.push(id);
    db.prepare(`UPDATE todos SET ${sets.join(", ")} WHERE id = ?`).run(...values);

    const record = db.prepare("SELECT * FROM todos WHERE id = ?").get(id);
    return NextResponse.json(record);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const db = getDb();
    db.prepare("DELETE FROM todos WHERE id = ?").run(id);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
