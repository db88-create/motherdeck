# Airtable Write API Helper — Claude Code Prompt

**Paste this into Claude Code to build the write helper.**

---

## Task

Build a reusable Node.js helper module that handles all Airtable write operations for Motherdeck. This will let Mother (the AI) push updates to Airtable directly, and keeps write logic DRY and error-handled.

---

## Requirements

### Module Location
Create: `src/lib/airtable-write.ts`

### Exports

Each function should:
- Accept validated input
- Handle errors gracefully
- Return success/failure + the record ID
- Log operations for debugging

### Operations

#### 1. Create Task
```typescript
createTask(data: {
  name: string
  description?: string
  status?: 'Backlog' | 'Ready' | 'In Progress' | 'Blocked' | 'Done'
  priority?: 'Critical' | 'High' | 'Medium' | 'Low'
  project?: string
  owner?: string
  dueDate?: string (YYYY-MM-DD)
  effort?: '<1h' | '1-4h' | '4-8h' | '1-3d' | '3d+'
  tags?: string[] (e.g. ['strategic', 'complex'])
  notes?: string
}): Promise<{ id: string; name: string; success: boolean; error?: string }>
```

#### 2. Update Task
```typescript
updateTask(taskId: string, updates: {
  name?: string
  description?: string
  status?: 'Backlog' | 'Ready' | 'In Progress' | 'Blocked' | 'Done'
  priority?: 'Critical' | 'High' | 'Medium' | 'Low'
  owner?: string
  dueDate?: string
  effort?: string
  tags?: string[]
  notes?: string
}): Promise<{ id: string; success: boolean; error?: string }>
```

#### 3. Update Task Status (convenience method)
```typescript
updateTaskStatus(taskId: string, status: 'Backlog' | 'Ready' | 'In Progress' | 'Blocked' | 'Done'): Promise<{ id: string; success: boolean; error?: string }>
```

#### 4. Delete Task
```typescript
deleteTask(taskId: string): Promise<{ success: boolean; error?: string }>
```

#### 5. Batch Create Tasks
```typescript
createTasks(taskList: Array<{ name: string; project?: string; priority?: string; tags?: string[] }>): Promise<{ created: number; failed: number; errors: string[] }>
```

#### 6. Create Idea
```typescript
createIdea(data: {
  title: string
  description?: string
  priority?: 'critical' | 'high' | 'medium' | 'low'
  relatedProject?: string
  status?: 'captured' | 'developing' | 'ready' | 'shipped'
}): Promise<{ id: string; title: string; success: boolean; error?: string }>
```

---

### Implementation Details

**Error Handling:**
- Catch Airtable API errors (rate limits, invalid records, etc.)
- Return `{ success: false, error: "Human-readable message" }`
- Log errors to console for debugging

**Validation:**
- Check required fields before writing
- Validate enum values (status, priority, etc.)
- Validate date format (YYYY-MM-DD)
- Return early with error if invalid

**Connection:**
- Reuse the existing `getBase()` from `airtable.ts`
- Import: `import { getBase } from './airtable'`

**Rate Limiting:**
- Airtable allows 5 requests/sec; batch operations should pause between writes
- If creating >10 tasks, add 100ms delays between writes

---

### Example Usage

```typescript
// In Mother's code (anywhere)
import { createTask, updateTaskStatus } from '@/lib/airtable-write'

// Add a task from chat
const result = await createTask({
  name: 'Check Twilio verification',
  priority: 'High',
  dueDate: '2026-03-15',
  tags: ['blocking', 'urgent'],
  owner: 'Doug'
})

if (result.success) {
  console.log(`Created task: ${result.id}`)
} else {
  console.error(`Failed: ${result.error}`)
}

// Update task status
await updateTaskStatus(taskId, 'Done')
```

---

### Testing

Once built, test with:

1. Create a test task via `createTask()`
2. Check it appears in Motherdeck UI
3. Update it via `updateTaskStatus()`
4. Verify the change in Motherdeck
5. Delete it via `deleteTask()`

---

### Notes

- This is intentionally **not a REST API** — Mother calls it directly from Node
- If you later want a REST endpoint, wrap these functions in an Express route
- Keep functions pure (input → output, no side effects except Airtable writes)
- Return consistent shape: `{ success: boolean; error?: string; id?: string; ... }`

---

**What this enables:**

Mother can now:
- ✅ Create tasks from Telegram chat
- ✅ Update task status when you mention progress
- ✅ Add ideas/expenses directly
- ✅ All updates sync instantly to Motherdeck UI
- ✅ Keep everything in one source of truth (Airtable)

---

You own this code. Build it how you like. If you want different field names or operations, adjust as needed.
