import type { CommandTask } from "./types";

export interface GroupedTasks {
  todayItems: CommandTask[];
  restOfWeekItems: CommandTask[];
  unscheduledItems: CommandTask[];
  completedThisWeek: CommandTask[];
}

export function groupTasks(tasks: CommandTask[], today: string): GroupedTasks {
  const todayArr: CommandTask[] = [];
  const weekArr: CommandTask[] = [];
  const unschedArr: CommandTask[] = [];
  const doneArr: CommandTask[] = [];

  for (const task of tasks) {
    if (task.status === "done") {
      doneArr.push(task);
      continue;
    }
    if (!task.dueDate) {
      unschedArr.push(task);
      continue;
    }
    if (task.dueDate <= today) {
      todayArr.push(task);
      continue;
    }
    weekArr.push(task);
  }

  todayArr.sort(
    (a, b) => (a.dueDate || "").localeCompare(b.dueDate || "") || a.sortOrder - b.sortOrder
  );

  return {
    todayItems: todayArr,
    restOfWeekItems: weekArr,
    unscheduledItems: unschedArr,
    completedThisWeek: doneArr,
  };
}
