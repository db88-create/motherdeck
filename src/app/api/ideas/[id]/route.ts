import { NextRequest, NextResponse } from "next/server";
import { updateRecord, deleteRecord } from "@/lib/airtable";
import { IdeaFields } from "@/lib/types";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json();

    const fields: Partial<IdeaFields> = {};
    if (body.title !== undefined) fields.Title = body.title;
    if (body.description !== undefined) fields.Description = body.description;
    if (body.status !== undefined) fields.Status = body.status;
    if (body.priority !== undefined) fields.Priority = body.priority;
    if (body.effort !== undefined) fields.Effort = body.effort;
    if (body.impact !== undefined) fields.Impact = body.impact;
    if (body.project !== undefined) fields.Project = body.project;

    const record = await updateRecord<IdeaFields>("Ideas", id, fields);
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
    await deleteRecord("Ideas", id);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
