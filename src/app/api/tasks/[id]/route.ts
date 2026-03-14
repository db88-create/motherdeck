import { NextRequest, NextResponse } from "next/server";
import { updateRecord, deleteRecord } from "@/lib/airtable";
import { TaskFields } from "@/lib/types";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json();

    const fields: Partial<TaskFields> = {};
    if (body.name !== undefined) fields.Name = body.name;
    if (body.status !== undefined) {
      fields.Status = body.status;
      if (body.status === "done") {
        fields.CompletedAt = new Date().toISOString();
      }
    }
    if (body.priority !== undefined) fields.Priority = body.priority;
    if (body.project !== undefined) fields.Project = body.project;
    if (body.description !== undefined) fields.Description = body.description;
    if (body.dueDate !== undefined) fields.DueDate = body.dueDate;
    if (body.assignee !== undefined) fields.Assignee = body.assignee;
    if (body.tags !== undefined) fields.Tags = body.tags;

    const record = await updateRecord<TaskFields>("Tasks", id, fields);
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
    await deleteRecord("Tasks", id);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
