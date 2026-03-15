// ============ AIRTABLE TABLE TYPES ============

// Tasks (To-Do / Kanban)
export interface TaskFields {
  Name: string;
  Status: "backlog" | "todo" | "in_progress" | "done" | "archived";
  Priority: "low" | "medium" | "high" | "urgent";
  Project: string;
  Description?: string;
  DueDate?: string;
  Assignee?: string;
  CreatedAt: string;
  CompletedAt?: string;
  Tags?: string; // comma-separated
}

export interface Task {
  id: string;
  fields: TaskFields;
}

// Projects
export interface ProjectFields {
  Name: string;
  Status: "active" | "paused" | "completed" | "archived";
  Description?: string;
  Color: string;
  CreatedAt: string;
}

export interface Project {
  id: string;
  fields: ProjectFields;
}

// Ideas
export interface IdeaFields {
  Title: string;
  Description: string;
  Status: "captured" | "exploring" | "planned" | "implemented" | "parked";
  Priority: "low" | "medium" | "high";
  Effort: "small" | "medium" | "large";
  Impact: "low" | "medium" | "high";
  Project?: string;
  CreatedAt: string;
}

export interface Idea {
  id: string;
  fields: IdeaFields;
}

// Expenses
export interface ExpenseFields {
  Description: string;
  Amount: number;
  Category: string;
  Vendor: string;
  Entity?: string;
  Date: string;
  CreatedAt: string;
}

export interface Expense {
  id: string;
  fields: ExpenseFields;
}

// Usage Metrics (synced from NucBox)
export interface UsageMetricFields {
  Date: string;
  Model: string;
  Calls: number;
  InputTokens: number;
  OutputTokens: number;
  CacheReadTokens: number;
  CacheWriteTokens: number;
  TotalTokens: number;
  Cost: number;
  SubagentCost: number;
  SubagentRuns: number;
}

export interface UsageMetric {
  id: string;
  fields: UsageMetricFields;
}

// Cron Jobs
export interface CronJobFields {
  Name: string;
  Schedule: string;
  Status: "active" | "paused" | "error";
  LastRun?: string;
  LastResult?: "success" | "error" | "timeout";
  LastDuration?: number;
  ConsecutiveErrors: number;
  Description?: string;
  UpdatedAt: string;
}

export interface CronJob {
  id: string;
  fields: CronJobFields;
}

// Sessions
export interface SessionFields {
  Name: string;
  Type: "main" | "telegram" | "cron" | "subagent";
  Model: string;
  ContextPct: number;
  TotalTokens: number;
  Cost: number;
  Active: boolean;
  LastActivity: string;
  UpdatedAt: string;
}

export interface Session {
  id: string;
  fields: SessionFields;
}

// Gateway Health
export interface GatewayFields {
  Status: "online" | "offline";
  Uptime: string;
  MemoryMB: number;
  PID: number;
  Version: string;
  UpdatedAt: string;
}

export interface Gateway {
  id: string;
  fields: GatewayFields;
}

// Morning Briefs
export interface BriefFields {
  Date: string;
  Title: string;
  Summary: string;
  KeyInsights?: string;
  BigIdea?: string;
  FullContent: string;
  Highlights?: string;
  TopicsCount: number;
  CreatedAt: string;
}

export interface Brief {
  id: string;
  fields: BriefFields;
}

// Alerts
export interface AlertFields {
  Type: "cost" | "context" | "gateway" | "cron" | "memory";
  Severity: "info" | "warning" | "critical";
  Title: string;
  Message: string;
  Acknowledged: boolean;
  CreatedAt: string;
  AcknowledgedAt?: string;
}

export interface Alert {
  id: string;
  fields: AlertFields;
}

// Skills
export interface SkillFields {
  Name: string;
  Status: "active" | "archived" | "broken";
  Description: string;
  LastUsed?: string;
  Category?: string;
  UpdatedAt: string;
}

export interface Skill {
  id: string;
  fields: SkillFields;
}

// ============ DASHBOARD AGGREGATES ============

export interface CostSummary {
  today: number;
  sevenDay: number;
  thirtyDay: number;
  allTime: number;
  projectedMonthly: number;
  dailyBudget: number;
  monthlyBudget: number;
}

export interface TokenSummary {
  input: number;
  output: number;
  cacheRead: number;
  cacheWrite: number;
  total: number;
}

export interface ModelBreakdown {
  model: string;
  cost: number;
  calls: number;
  tokens: number;
}

export interface DailyChartPoint {
  date: string;
  cost: number;
  tokens: number;
  calls: number;
  models: Record<string, number>;
}
