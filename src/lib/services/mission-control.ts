export interface MCTask {
  id: string;
  title: string;
  status: string;
  projectName?: string;
  dueDate?: string;
}

interface MCProjectRaw {
  id: string;
  name: string;
  status: string;
  tasks: Array<{ id: string; status: string }>;
}

interface MCProjectDetailed {
  id: string;
  name: string;
  tasks: Array<{
    id: string;
    title: string;
    status: string;
    dueDate?: string;
  }>;
}

async function mcFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`/api/mc/${path}`, init);
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw Object.assign(new Error(body.error || `MC ${res.status}`), { mcDown: body.mc_down });
  }
  return res.json();
}

export const MCProxyService = {
  async getProjects() {
    return mcFetch<MCProjectRaw[]>("projects");
  },

  /**
   * Get blocked workstreams across all projects with full task details
   * MC list endpoint only returns id + status, so fetch individual projects
   * to get title + dueDate for each blocked task
   */
  async getBlockedWorkstreams(): Promise<MCTask[]> {
    try {
      const projects = await mcFetch<MCProjectRaw[]>("projects");
      const blocked: MCTask[] = [];
      
      // For each project that has blocked tasks, fetch its details
      for (const project of projects) {
        const hasBlocked = project.tasks.some((t) => t.status === "Blocked");
        if (!hasBlocked) continue;
        
        // Fetch full project details to get task titles + dueDates
        const detailed = await mcFetch<MCProjectDetailed>(`projects/${project.id}`);
        
        for (const task of detailed.tasks) {
          if (task.status === "Blocked") {
            blocked.push({
              id: task.id,
              title: task.title,
              status: task.status,
              projectName: detailed.name,
              dueDate: task.dueDate,
            });
          }
        }
      }
      
      return blocked;
    } catch (err) {
      throw err;
    }
  },

  /**
   * Get upcoming deadlines across all projects within N days
   * Fetches all project details to access dueDate fields
   */
  async getUpcomingDeadlines(days = 7): Promise<MCTask[]> {
    try {
      const projects = await mcFetch<MCProjectRaw[]>("projects");
      const upcoming: MCTask[] = [];
      const cutoff = new Date();
      cutoff.setDate(cutoff.getDate() + days);
      
      for (const project of projects) {
        const detailed = await mcFetch<MCProjectDetailed>(`projects/${project.id}`);
        
        for (const task of detailed.tasks) {
          if (task.dueDate) {
            const dueDate = new Date(task.dueDate);
            if (dueDate <= cutoff && dueDate > new Date()) {
              upcoming.push({
                id: task.id,
                title: task.title,
                status: task.status,
                projectName: detailed.name,
                dueDate: task.dueDate,
              });
            }
          }
        }
      }
      
      return upcoming;
    } catch (err) {
      throw err;
    }
  },

  async updateWorkstreamStatus(workstreamId: string, status: string): Promise<MCTask> {
    return mcFetch<MCTask>(`tasks/${workstreamId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
  },
};
