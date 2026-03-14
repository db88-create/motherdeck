import { NextResponse } from "next/server";

/**
 * POST /api/setup
 * Creates all Airtable tables via the Airtable Metadata API.
 * Run once after creating your base.
 */
export async function POST() {
  const pat = process.env.AIRTABLE_PAT;
  const baseId = process.env.AIRTABLE_BASE_ID;

  if (!pat || !baseId) {
    return NextResponse.json(
      { error: "Missing AIRTABLE_PAT or AIRTABLE_BASE_ID" },
      { status: 400 }
    );
  }

  const tables = [
    {
      name: "Tasks",
      fields: [
        { name: "Name", type: "singleLineText" },
        {
          name: "Status",
          type: "singleSelect",
          options: {
            choices: [
              { name: "backlog", color: "grayLight2" },
              { name: "todo", color: "blueLight2" },
              { name: "in_progress", color: "yellowLight2" },
              { name: "done", color: "greenLight2" },
              { name: "archived", color: "grayDark1" },
            ],
          },
        },
        {
          name: "Priority",
          type: "singleSelect",
          options: {
            choices: [
              { name: "low", color: "grayLight2" },
              { name: "medium", color: "blueLight2" },
              { name: "high", color: "orangeLight2" },
              { name: "urgent", color: "redLight2" },
            ],
          },
        },
        { name: "Project", type: "singleLineText" },
        { name: "Description", type: "multilineText" },
        { name: "DueDate", type: "singleLineText" },
        { name: "Assignee", type: "singleLineText" },
        { name: "CreatedAt", type: "singleLineText" },
        { name: "CompletedAt", type: "singleLineText" },
        { name: "Tags", type: "singleLineText" },
      ],
    },
    {
      name: "Ideas",
      fields: [
        { name: "Title", type: "singleLineText" },
        { name: "Description", type: "multilineText" },
        {
          name: "Status",
          type: "singleSelect",
          options: {
            choices: [
              { name: "captured", color: "blueLight2" },
              { name: "exploring", color: "yellowLight2" },
              { name: "planned", color: "purpleLight2" },
              { name: "implemented", color: "greenLight2" },
              { name: "parked", color: "grayLight2" },
            ],
          },
        },
        {
          name: "Priority",
          type: "singleSelect",
          options: {
            choices: [
              { name: "low", color: "grayLight2" },
              { name: "medium", color: "blueLight2" },
              { name: "high", color: "orangeLight2" },
            ],
          },
        },
        {
          name: "Effort",
          type: "singleSelect",
          options: {
            choices: [
              { name: "small", color: "greenLight2" },
              { name: "medium", color: "yellowLight2" },
              { name: "large", color: "redLight2" },
            ],
          },
        },
        {
          name: "Impact",
          type: "singleSelect",
          options: {
            choices: [
              { name: "low", color: "grayLight2" },
              { name: "medium", color: "blueLight2" },
              { name: "high", color: "greenLight2" },
            ],
          },
        },
        { name: "Project", type: "singleLineText" },
        { name: "CreatedAt", type: "singleLineText" },
      ],
    },
    {
      name: "Expenses",
      fields: [
        { name: "Description", type: "singleLineText" },
        { name: "Amount", type: "number", options: { precision: 2 } },
        { name: "Category", type: "singleLineText" },
        { name: "Vendor", type: "singleLineText" },
        { name: "Entity", type: "singleLineText" },
        { name: "Date", type: "singleLineText" },
        { name: "CreatedAt", type: "singleLineText" },
      ],
    },
    {
      name: "UsageMetrics",
      fields: [
        { name: "Date", type: "singleLineText" },
        { name: "Model", type: "singleLineText" },
        { name: "Calls", type: "number", options: { precision: 0 } },
        { name: "InputTokens", type: "number", options: { precision: 0 } },
        { name: "OutputTokens", type: "number", options: { precision: 0 } },
        { name: "CacheReadTokens", type: "number", options: { precision: 0 } },
        { name: "CacheWriteTokens", type: "number", options: { precision: 0 } },
        { name: "TotalTokens", type: "number", options: { precision: 0 } },
        { name: "Cost", type: "number", options: { precision: 6 } },
        { name: "SubagentCost", type: "number", options: { precision: 6 } },
        { name: "SubagentRuns", type: "number", options: { precision: 0 } },
      ],
    },
    {
      name: "CronJobs",
      fields: [
        { name: "Name", type: "singleLineText" },
        { name: "Schedule", type: "singleLineText" },
        {
          name: "Status",
          type: "singleSelect",
          options: {
            choices: [
              { name: "active", color: "greenLight2" },
              { name: "paused", color: "yellowLight2" },
              { name: "error", color: "redLight2" },
            ],
          },
        },
        { name: "LastRun", type: "singleLineText" },
        {
          name: "LastResult",
          type: "singleSelect",
          options: {
            choices: [
              { name: "success", color: "greenLight2" },
              { name: "error", color: "redLight2" },
              { name: "timeout", color: "yellowLight2" },
            ],
          },
        },
        { name: "LastDuration", type: "number", options: { precision: 1 } },
        { name: "ConsecutiveErrors", type: "number", options: { precision: 0 } },
        { name: "Description", type: "multilineText" },
        { name: "UpdatedAt", type: "singleLineText" },
      ],
    },
    {
      name: "Sessions",
      fields: [
        { name: "Name", type: "singleLineText" },
        { name: "Type", type: "singleLineText" },
        { name: "Model", type: "singleLineText" },
        { name: "ContextPct", type: "number", options: { precision: 1 } },
        { name: "TotalTokens", type: "number", options: { precision: 0 } },
        { name: "Cost", type: "number", options: { precision: 6 } },
        { name: "Active", type: "checkbox" },
        { name: "LastActivity", type: "singleLineText" },
        { name: "UpdatedAt", type: "singleLineText" },
      ],
    },
    {
      name: "Gateway",
      fields: [
        { name: "Status", type: "singleLineText" },
        { name: "Uptime", type: "singleLineText" },
        { name: "MemoryMB", type: "number", options: { precision: 0 } },
        { name: "PID", type: "number", options: { precision: 0 } },
        { name: "Version", type: "singleLineText" },
        { name: "UpdatedAt", type: "singleLineText" },
      ],
    },
    {
      name: "Briefs",
      fields: [
        { name: "Date", type: "singleLineText" },
        { name: "Title", type: "singleLineText" },
        { name: "Summary", type: "multilineText" },
        { name: "FullContent", type: "multilineText" },
        { name: "TopicsCount", type: "number", options: { precision: 0 } },
        { name: "CreatedAt", type: "singleLineText" },
      ],
    },
    {
      name: "Alerts",
      fields: [
        { name: "Type", type: "singleLineText" },
        {
          name: "Severity",
          type: "singleSelect",
          options: {
            choices: [
              { name: "info", color: "blueLight2" },
              { name: "warning", color: "yellowLight2" },
              { name: "critical", color: "redLight2" },
            ],
          },
        },
        { name: "Title", type: "singleLineText" },
        { name: "Message", type: "multilineText" },
        { name: "Acknowledged", type: "checkbox" },
        { name: "CreatedAt", type: "singleLineText" },
        { name: "AcknowledgedAt", type: "singleLineText" },
      ],
    },
    {
      name: "Skills",
      fields: [
        { name: "Name", type: "singleLineText" },
        {
          name: "Status",
          type: "singleSelect",
          options: {
            choices: [
              { name: "active", color: "greenLight2" },
              { name: "archived", color: "grayLight2" },
              { name: "broken", color: "redLight2" },
            ],
          },
        },
        { name: "Description", type: "multilineText" },
        { name: "LastUsed", type: "singleLineText" },
        { name: "Category", type: "singleLineText" },
        { name: "UpdatedAt", type: "singleLineText" },
      ],
    },
  ];

  const results = [];

  for (const table of tables) {
    try {
      const res = await fetch(
        `https://api.airtable.com/v0/meta/bases/${baseId}/tables`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${pat}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            name: table.name,
            fields: table.fields,
          }),
        }
      );

      const data = await res.json();
      results.push({
        table: table.name,
        success: res.ok,
        id: data.id || null,
        error: res.ok ? null : data.error?.message || "Unknown error",
      });
    } catch (err: any) {
      results.push({
        table: table.name,
        success: false,
        id: null,
        error: err.message,
      });
    }
  }

  const allSuccess = results.every((r) => r.success);

  return NextResponse.json(
    {
      message: allSuccess
        ? "All 10 tables created successfully!"
        : "Some tables failed to create",
      results,
    },
    { status: allSuccess ? 200 : 207 }
  );
}
