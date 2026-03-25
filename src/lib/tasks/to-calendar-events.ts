import type { CommandTask } from "./types";
import { todayStr } from "./date-utils";

export interface CalendarEvent {
  id: string;
  title: string;
  start: string; // "YYYY-MM-DD"
  allDay: true;
  classNames: string[];
  extendedProps: { taskId: string; status: CommandTask["status"] };
}

export function toCalendarEvents(tasks: CommandTask[]): CalendarEvent[] {
  const today = todayStr();

  return tasks
    .filter((t) => t.dueDate && t.status !== "done")
    .map((t) => {
      const classes: string[] = ["fc-md-event"];
      if (t.status === "deferred") classes.push("fc-md-deferred");
      if (t.status === "dropped") classes.push("fc-md-dropped");
      if (t.dueDate < today && t.status === "active") classes.push("fc-md-overdue");

      return {
        id: t.id,
        title: t.text,
        start: t.dueDate,
        allDay: true as const,
        classNames: classes,
        extendedProps: { taskId: t.id, status: t.status },
      };
    });
}
