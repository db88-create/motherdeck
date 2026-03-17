import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const db = getDb();

    const today = db
      .prepare(
        `SELECT id, title, description, priority, due_date, status, parent_task_id
         FROM todos
         WHERE status='pending'
           AND (due_date = DATE('now') OR due_date IS NULL)
         ORDER BY
           CASE priority WHEN 'urgent' THEN 0 WHEN 'high' THEN 1 WHEN 'medium' THEN 2 ELSE 3 END,
           created_at DESC`
      )
      .all();

    const week = db
      .prepare(
        `SELECT id, title, description, priority, due_date, status, parent_task_id
         FROM todos
         WHERE status='pending'
           AND due_date BETWEEN DATE('now', '+1 day') AND DATE('now', '+7 days')
         ORDER BY
           CASE priority WHEN 'urgent' THEN 0 WHEN 'high' THEN 1 WHEN 'medium' THEN 2 ELSE 3 END,
           due_date ASC`
      )
      .all();

    return NextResponse.json({ today, week });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
