import { NextRequest, NextResponse } from "next/server";
import { fetchAll, createRecord, batchUpdate } from "@/lib/airtable";
import { TaskFields } from "@/lib/types";

export async function GET(req: NextRequest) {
  try {
    const status = req.nextUrl.searchParams.get("status");
    const project = req.nextUrl.searchParams.get("project");

    let filterParts: string[] = [];
    if (status && status !== "all") {
      filterParts.push(`{Status} = '${status}'`);
    }
    if (project) {
      filterParts.push(`{Project} = '${project}'`);
    }
    // Exclude archived by default
    if (!status || status !== "archived") {
      filterParts.push(`{Status} != 'archived'`);
    }

    const filterByFormula =
      filterParts.length > 1
        ? `AND(${filterParts.join(", ")})`
        : filterParts[0] || "";

    const records = await fetchAll<TaskFields>("Tasks", {
      filterByFormula,
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
    const fields: Partial<TaskFields> = {
      Name: body.name,
      Status: body.status || "todo",
      Priority: body.priority || "medium",
      Project: body.project || "",
      Description: body.description || "",
      DueDate: body.dueDate || "",
      Assignee: body.assignee || "",
      CreatedAt: new Date().toISOString(),
      Tags: body.tags || "",
      ...(body.parentTaskId && { ParentTaskId: body.parentTaskId }),
      ...(body.estimatedHours && { EstimatedHours: body.estimatedHours }),
      ...(body.sortOrder !== undefined && { SortOrder: body.sortOrder }),
    };

    const record = await createRecord<TaskFields>("Tasks", fields);
    return NextResponse.json(record, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json();
    // Batch update for drag-and-drop reordering
    if (Array.isArray(body)) {
      const results = await batchUpdate<TaskFields>(
        "Tasks",
        body.map((item: any) => ({
          id: item.id,
          fields: item.fields,
        }))
      );
      return NextResponse.json(results);
    }
    return NextResponse.json({ error: "Expected array" }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
