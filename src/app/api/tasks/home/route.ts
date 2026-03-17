import { NextResponse } from "next/server";
import { fetchAll } from "@/lib/airtable";
import { TaskFields } from "@/lib/types";

export async function GET() {
  try {
    const now = new Date();
    const today = now.toISOString().split("T")[0];
    const weekEnd = new Date(now.getTime() + 7 * 86400000)
      .toISOString()
      .split("T")[0];

    // Fetch all pending/todo/in_progress tasks (not done/archived)
    const allTasks = await fetchAll<TaskFields>("Tasks", {
      filterByFormula: `AND(OR({Status}='todo', {Status}='in_progress', {Status}='backlog'), {Status} != 'done', {Status} != 'archived')`,
      sort: [
        { field: "Priority", direction: "asc" },
        { field: "CreatedAt", direction: "desc" },
      ],
    });

    // Today: due today OR no due date
    const todayTasks = allTasks.filter((t) => {
      const d = t.fields.DueDate?.split("T")[0];
      return !d || d === today;
    });

    // This week: due between tomorrow and 7 days from now
    const weekTasks = allTasks.filter((t) => {
      const d = t.fields.DueDate?.split("T")[0];
      return d && d > today && d <= weekEnd;
    });

    return NextResponse.json({ today: todayTasks, week: weekTasks });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
