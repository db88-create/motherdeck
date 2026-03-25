# Command + Mission Control — V2 Implementation Spec

**Date:** 2026-03-23
**Status:** Build-ready
**Based on:** V3 Architecture Brief + codebase audit

---

## 0. Current State (What Actually Exists)

### Command (`/home/claudeclaw/command/`)
- **Framework:** Next.js 16.1.6, React 19, Tailwind v4, shadcn/ui
- **Navigation:** Tab-based SPA — `command | mission | tasks | usage | ideas | briefs`
- **Data:** Airtable (Tasks, Projects, Ideas, Expenses, Notes, Briefs, Usage, CronJobs, Sessions, Gateway, Alerts, Skills, ActionNotes)
- **Existing patterns:** `fetchAll<T>()` generic Airtable reader, `useFetch()` / `useApi()` hooks, `useVoiceRecording()`, `useNotes()`, `useTheme()`
- **Mission Control view:** 100% hardcoded mock data — buckets, projects, workstreams, network status all fake

### Mission Control Backend (`/home/claudeclaw/mission-control/backend/`)
- **Framework:** Express 4.21, Prisma 6.5, SQLite
- **Database:** `prisma/data.db` — Projects, Tasks (workstreams), TaskRuns, TaskNotes, Agents, SchedulerJobs, ChatSessions
- **API:** Full REST on `:3000` — CRUD for projects, tasks, agents, scheduler, chat
- **Services:** TaskExecutor (shell spawn + WebSocket streaming), SchedulerService (node-cron)
- **Linear:** API key + team ID configured in `.env`

### MC Frontend (`/home/claudeclaw/mission-control/frontend/`)
- **Status:** Legacy. Vite + React + Zustand on `:3001`
- **Decision:** Phase out. Command becomes the only UI.

---

## 1. Architecture Changes

### Navigation Update

**Current tabs:** `command | mission | tasks | usage | ideas | briefs`

**New tabs:**
```
today | mission | tasks | ideas | briefs | usage | review
```

- `today` replaces `command` — becomes default landing page
- `review` is new — weekly review surface
- `usage` moves to end (less frequently accessed)

**File:** `src/components/nav.tsx`
- Update `TabId` type
- Update icon mapping (today = `CalendarDays`, review = `ClipboardCheck`)
- Default tab changes from `"command"` to `"today"`

### New API Routes

Add to `src/app/api/`:

```
/api/inbox/           → InboxItems (Airtable)
/api/inbox/[id]/      → Single inbox item CRUD
/api/weekly-focus/    → WeeklyFocusWeeks + WeeklyFocusItems (Airtable)
/api/daily-notes/     → DailyNotes (Airtable) — one per day
/api/daily-notes/[date]/  → Single day's note
/api/links/           → EntityLinks (Airtable)
/api/promote/         → Promotion endpoint (inbox → task/note/focus/idea)
/api/mc/[...path]/    → Proxy to MC backend :3000
```

### New Airtable Tables

Create these tables in the existing Airtable base:

**InboxItems**
| Field | Type | Notes |
|-------|------|-------|
| Content | Long text | The raw capture |
| SourceType | Single select | text, voice, manual, imported |
| Processed | Checkbox | Default false |
| ProcessedAt | Date | When classified |
| SuggestedType | Single select | task, note, idea, focus, project_update |
| SuggestedProjectId | Text | MC project ID (nullable) |
| SuggestedWorkstreamId | Text | MC workstream ID (nullable) |
| LinkedTaskId | Text | If promoted to task |
| LinkedNoteId | Text | If promoted to note |
| LinkedProjectId | Text | If linked to MC project |
| Tags | Multiple select | Freeform tags |

**WeeklyFocusWeeks**
| Field | Type | Notes |
|-------|------|-------|
| WeekStartDate | Date | Monday of the week |
| Archived | Checkbox | Default false |

**WeeklyFocusItems**
| Field | Type | Notes |
|-------|------|-------|
| WeekId | Link to WeeklyFocusWeeks | Parent week |
| Text | Long text | The focus item text |
| Status | Single select | active, done, deferred, dropped |
| SortOrder | Number | For drag reorder |
| LinkedProjectId | Text | MC project ID |
| LinkedWorkstreamId | Text | MC workstream ID |
| LinkedTaskId | Text | Airtable task ID |
| DueDate | Date | Optional |
| Notes | Long text | Optional detail |

**DailyNotes**
| Field | Type | Notes |
|-------|------|-------|
| NoteDate | Date | One per day, unique |
| Content | Long text | Freeform, append-friendly |
| Summary | Long text | AI-generated summary (optional) |
| Tags | Multiple select | |

**EntityLinks**
| Field | Type | Notes |
|-------|------|-------|
| SourceType | Single select | task, inbox, focus, note |
| SourceId | Text | Record ID in source table |
| TargetType | Single select | project, workstream, linear_issue, task, note |
| TargetId | Text | Record ID in target system |
| RelationshipType | Single select | linked, promoted_from, blocks, child_of |

### Service Abstraction Layer

**New directory:** `src/lib/services/`

This is the critical architectural add. The UI never calls Airtable directly. Every data operation goes through a service that can be swapped to Supabase later.

```
src/lib/services/
├── inbox.ts          → InboxService (create, list, process, archive, classify)
├── tasks.ts          → TaskService (create, list, update, complete, reorder)
├── weekly-focus.ts   → WeeklyFocusService (getCurrentWeek, createWeek, addItem, reorder, archive)
├── daily-notes.ts    → DailyNoteService (getOrCreate, append, getByDate, listRecent)
├── links.ts          → LinkService (link, unlink, getLinksFor)
├── promote.ts        → PromoteService (inboxToTask, inboxToNote, inboxToFocus, noteToTask)
├── mission-control.ts → MCProxyService (getProjects, getWorkstreams, updateStatus)
└── index.ts          → barrel export
```

Each service:
- Takes raw business params (not Airtable field names)
- Maps to/from Airtable internally
- Returns clean typed objects
- Handles errors with retries

**Example pattern:**
```typescript
// src/lib/services/inbox.ts
import { fetchAll, createRecord, updateRecord } from '@/lib/airtable'

export interface InboxItem {
  id: string
  content: string
  sourceType: 'text' | 'voice' | 'manual' | 'imported'
  processed: boolean
  processedAt: string | null
  suggestedType: string | null
  suggestedProjectId: string | null
  linkedTaskId: string | null
  tags: string[]
  createdAt: string
}

export const InboxService = {
  async list(processed?: boolean): Promise<InboxItem[]> {
    const filter = processed !== undefined
      ? `{Processed} = ${processed ? 1 : 0}`
      : ''
    const records = await fetchAll('InboxItems', {
      filterByFormula: filter,
      sort: [{ field: 'Created', direction: 'desc' }]
    })
    return records.map(mapRecordToInboxItem)
  },

  async create(content: string, sourceType: 'text' | 'voice'): Promise<InboxItem> {
    const record = await createRecord('InboxItems', {
      Content: content,
      SourceType: sourceType,
      Processed: false,
    })
    return mapRecordToInboxItem(record)
  },

  async classify(id: string, suggestedType: string, suggestedProjectId?: string): Promise<void> {
    await updateRecord('InboxItems', id, {
      SuggestedType: suggestedType,
      SuggestedProjectId: suggestedProjectId || null,
    })
  },

  async markProcessed(id: string, linkedId: string, linkedType: string): Promise<void> {
    await updateRecord('InboxItems', id, {
      Processed: true,
      ProcessedAt: new Date().toISOString(),
      [`Linked${linkedType}Id`]: linkedId,
    })
  },
}
```

---

## 2. Component Architecture

### Page Components

**File changes:**

| File | Action | Purpose |
|------|--------|---------|
| `src/app/page.tsx` | Modify | Update tab routing, change default to `today` |
| `src/components/views/today-view.tsx` | **New** | Today page — the center of gravity |
| `src/components/views/mission-control-view.tsx` | **Rewrite** | Wire to live MC backend data |
| `src/components/views/review-view.tsx` | **New** | Weekly review surface |
| `src/components/views/tasks-view.tsx` | Modify | Add project filter, lane filter |
| `src/components/views/home-view.tsx` | **Delete** | Replaced by today-view |

### Today View Component Tree

```
src/components/views/today-view.tsx
│
├── src/components/today/weekly-focus-panel.tsx
│   ├── FocusItem (inline edit, status toggle, link indicator)
│   └── AddFocusItem (inline quick-add)
│
├── src/components/today/today-queue.tsx
│   ├── TaskLane (title + task list)
│   │   ├── label: "Must Do" | "Should Do" | "Carryover"
│   │   └── QueueTaskItem (checkbox, title, project badge, drag handle)
│   └── QuickAddTask (inline, assigns to lane)
│
├── src/components/today/inbox-panel.tsx
│   ├── QuickCaptureInput (text + voice, always visible)
│   ├── InboxItemRow (content, timestamp, promote actions)
│   └── InboxClassifyDialog (optional AI-suggested classification)
│
├── src/components/today/daily-note-panel.tsx
│   └── Auto-expanding textarea, auto-save on debounce
│
└── src/components/today/strategic-pulse.tsx
    ├── BlockedWorkstreams (compact list from MC API)
    ├── UpcomingDeadlines (7-day window)
    └── AtRiskProjects (health != healthy)
```

### Today View Layout (CSS Grid)

```
┌──────────────────────────────────────────────────────────┐
│  Monday, March 23, 2026                    Strategic Pulse│
│                                            ┌─────────────┤
│  ┌─── Weekly Focus ──────────────────────┐ │ 2 blocked   │
│  │ 1. [active] Weekly plan with MC       │ │ 1 deadline  │
│  │ 2. [active] Allie AI vision           │ │ 0 at-risk   │
│  │ 3. [done]   Offline screens           │ │             │
│  │ [+ Add focus item]                    │ └─────────────┤
│  └───────────────────────────────────────┘               │
│                                                          │
│  ┌─── Today Queue ──────────┐ ┌─── Inbox ──────────────┐│
│  │ MUST DO                  │ │ [Type or speak...]  [mic]│
│  │ ☐ Call Mike re: order    │ │                         ││
│  │ ☐ Fix morning brief     │ │ Recent:                 ││
│  │                          │ │ • SMS fix idea (2m ago) ││
│  │ SHOULD DO                │ │ • Landscape screens     ││
│  │ ☐ Website next pass     │ │   (15m ago)             ││
│  │ ☐ Centralized dashboard │ │ • Teltonikas?           ││
│  │                          │ │   (1h ago)              ││
│  │ CARRYOVER                │ │                         ││
│  │ ☐ Render agreement      │ │ [→ Task] [→ Note]       ││
│  │ [+ Quick add]           │ │ [→ Focus] [→ Idea]      ││
│  └──────────────────────────┘ └─────────────────────────┘│
│                                                          │
│  ┌─── Daily Note ────────────────────────────────────────┤
│  │ Primesight meeting:                                   │
│  │ - Website coming along, free creative                 │
│  │ - Twilio phone # setup for store owners               │
│  │ - Screenverse onboarding: Vistar → gfet certified     │
│  │   → nova → rest of SSPs                               │
│  │                                                       │
│  │ Notes:                                                │
│  │ - SMS fix: if screen offline, use SMS to reach out    │
│  │   Come up with walkthrough for this                   │
│  │                                                       │
│  │ [Auto-saved 2s ago]                                   │
│  └───────────────────────────────────────────────────────┘
└──────────────────────────────────────────────────────────┘
```

**Grid implementation:**
```css
.today-grid {
  display: grid;
  grid-template-columns: 1fr 280px;
  grid-template-rows: auto auto 1fr;
  gap: 1rem;
  height: 100%;
}
/* Weekly Focus spans full width on smaller screens */
/* Strategic Pulse sits top-right */
/* Today Queue + Inbox side by side in middle row */
/* Daily Note spans full width at bottom, grows to fill */
```

### Mission Control View (Rewrite)

**Current file:** `src/components/views/mission-control-view.tsx` (850+ lines, all mock data)

**Rewrite approach:**
- Strip all `MOCK_*` constants
- Add `useFetch('/api/mc/projects')` to load real data
- Keep the visual design language (bucket cards, progress bars, workstream rows, blocker badges)
- Add inline status dropdowns that PATCH back to MC backend
- Replace fake network status with either real data source or remove entirely (per V3 rule: no fake metrics)

**Data flow:**
```
MissionControlView
  → useFetch('/api/mc/projects')
  → /api/mc/projects (Next.js API route)
  → proxy fetch('http://localhost:3000/api/projects')
  → MC Express backend
  → Prisma → data.db
  → returns Project[] with tasks, agents, scheduler state
```

**MC Proxy route:** `src/app/api/mc/[...path]/route.ts`
```typescript
export async function GET(request: Request, { params }: { params: { path: string[] } }) {
  const path = params.path.join('/')
  const res = await fetch(`http://localhost:3000/api/${path}`)
  const data = await res.json()
  return Response.json(data)
}

export async function PUT(request: Request, { params }: { params: { path: string[] } }) {
  const path = params.path.join('/')
  const body = await request.json()
  const res = await fetch(`http://localhost:3000/api/${path}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  const data = await res.json()
  return Response.json(data)
}
// POST, DELETE similarly
```

**Bucket grouping:**
MC backend Projects don't have a "bucket" concept. Options:
1. Add a `bucket` or `category` field to Prisma Project model (cleanest)
2. Use tags field on Project (already exists) — tag with "Technology", "Revenue", "Operations"
3. Group by tag in the UI

**Recommendation:** Use existing `tags` field. First tag = bucket. No schema migration needed.

### Review View

**New file:** `src/components/views/review-view.tsx`

```
ReviewView
├── WeekSelector (dropdown, defaults to current week)
├── CompletedTasksList (tasks where status=done, completedAt in selected week)
├── IncompleteTasksList (tasks still open from selected week)
├── FocusSummary (WeeklyFocusItems for selected week, grouped by status)
├── BlockerSummary (from MC API, blockers opened/resolved in week)
├── NotesSummary (DailyNotes created in selected week, with AI summaries)
└── InboxHealth (unprocessed count, avg processing time)
```

---

## 3. Promotion System

Promotions are the core interaction that turns raw capture into structured work.

### Promotion Flows

**API endpoint:** `POST /api/promote`

```typescript
interface PromoteRequest {
  sourceType: 'inbox' | 'note_selection' | 'focus'
  sourceId: string
  targetType: 'task' | 'note' | 'focus' | 'idea' | 'project_update'
  content: string  // pre-filled from source
  metadata?: {
    lane?: 'must' | 'should' | 'carryover'
    projectId?: string
    workstreamId?: string
    dueDate?: string
  }
}
```

**What happens on promote:**

1. `inbox → task`:
   - Create DailyTask with content as title
   - Set `source_inbox_item_id` on the task
   - Mark inbox item processed, set `LinkedTaskId`
   - Create EntityLink record
   - Return new task

2. `inbox → note`:
   - Append content to today's DailyNote (create if needed)
   - Mark inbox item processed, set `LinkedNoteId`
   - Create EntityLink record

3. `inbox → focus`:
   - Add WeeklyFocusItem to current week
   - Mark inbox item processed
   - Create EntityLink record

4. `inbox → idea`:
   - Create Idea record in existing Ideas table
   - Mark inbox item processed

5. `note_selection → task` (select text in daily note, promote):
   - Create DailyTask from selected text
   - Create EntityLink (note → task)

### UI for Promotion

**Inline promote buttons on InboxItemRow:**
```
[content text]                    [→Task] [→Note] [→Focus] [→Idea] [...]
```

- Single click = instant promote with defaults
- `...` opens a small popover for adding lane, project link, due date before promoting
- No modals. No multi-step wizards. Popover at most.

**Select-to-promote in Daily Note:**
- Select text → floating toolbar appears (like Medium/Notion)
- Toolbar: `[Create Task] [Add to Focus] [Link to Project]`

---

## 4. Staleness Detection

**New file:** `src/lib/services/staleness.ts`

```typescript
export interface StaleItem {
  type: 'inbox' | 'project' | 'blocker' | 'task'
  id: string
  title: string
  age: number  // hours
  threshold: number
}

export const StalenessService = {
  async getStaleItems(): Promise<StaleItem[]> {
    const items: StaleItem[] = []

    // Inbox > 24h unprocessed
    const unprocessedInbox = await InboxService.list(false)
    for (const item of unprocessedInbox) {
      const age = hoursAgo(item.createdAt)
      if (age > 24) {
        items.push({
          type: 'inbox', id: item.id,
          title: item.content.slice(0, 60), age, threshold: 24
        })
      }
    }

    // Tasks stuck in active > 72h
    const activeTasks = await TaskService.list({ status: 'active' })
    for (const task of activeTasks) {
      const age = hoursAgo(task.updatedAt)
      if (age > 72) {
        items.push({
          type: 'task', id: task.id,
          title: task.title, age, threshold: 72
        })
      }
    }

    // Projects with no activity > 7 days (from MC)
    // Blockers unresolved > 5 days (from MC)

    return items
  }
}
```

Staleness feeds into:
- Strategic Pulse on Today (badge count)
- Review View (stale items section)
- Morning Brief (mentioned in summary)

---

## 5. Empty State Behavior

| Surface | Empty State | Auto-Action |
|---------|-------------|-------------|
| Weekly Focus | "Set your focus for the week" + 3 empty input slots | Auto-create WeeklyFocusWeek for current Monday |
| Today Queue | "Add your first task for today" + quick-add input | None — don't auto-populate |
| Inbox | "Capture something — type or speak" + pulsing mic icon | None |
| Daily Note | Empty textarea with date header, placeholder text | Auto-create DailyNote record on page load |
| Strategic Pulse | "No urgent items" in muted text | Load from MC API, show fallback if MC is down |
| Review | "Select a week to review" | Default to current week |

---

## 6. Error Handling & Resilience

### MC API Down
```typescript
// In strategic-pulse.tsx and mission-control-view.tsx
const { data, error } = useFetch('/api/mc/projects')

if (error) {
  return <div className="text-md-text-tertiary italic">
    Mission Control unavailable — daily workflow unaffected
  </div>
}
```

**Rule:** MC failure never breaks Today. Today Queue, Inbox, Daily Note, Weekly Focus all work independently.

### Airtable Failure
- Optimistic UI updates (update local state immediately)
- Retry failed writes with exponential backoff (3 attempts)
- Toast notification on persistent failure
- No data loss — capture input preserved in local state until write succeeds

### Classification Failure
- AI classification is async and non-blocking
- If Anthropic API fails, item stays in inbox without suggestions
- User can always manually classify

---

## 7. Build Sequence (Strict Order)

### Phase 1: Daily Core (PRIORITY — do this first, make it excellent)

**Goal:** Command replaces Google Doc for daily work.

| Step | Files | What |
|------|-------|------|
| 1.1 | `nav.tsx`, `page.tsx` | Update navigation: rename tabs, add `today` + `review`, set default |
| 1.2 | `src/lib/services/` | Create service abstraction layer (inbox, tasks, weekly-focus, daily-notes, links) |
| 1.3 | `src/app/api/inbox/` | Inbox API routes |
| 1.4 | `src/app/api/weekly-focus/` | Weekly Focus API routes |
| 1.5 | `src/app/api/daily-notes/` | Daily Notes API routes |
| 1.6 | `src/components/today/` | Build all Today sub-components |
| 1.7 | `src/components/views/today-view.tsx` | Assemble Today page with grid layout |
| 1.8 | Create Airtable tables | InboxItems, WeeklyFocusWeeks, WeeklyFocusItems, DailyNotes |
| 1.9 | Delete `home-view.tsx` | Remove old command center |

**Acceptance:** Can open Command, land on Today, capture thoughts, manage tasks, write notes, set weekly focus. All persisted. No Google Doc needed.

### Phase 2: Interaction Polish

| Step | Files | What |
|------|-------|------|
| 2.1 | `today-queue.tsx` | Drag-reorder within and between lanes (@dnd-kit) |
| 2.2 | `weekly-focus-panel.tsx` | Drag-reorder focus items |
| 2.3 | `daily-note-panel.tsx` | Auto-save with debounce (500ms), "Saved" indicator |
| 2.4 | `inbox-panel.tsx` | Voice capture integration (existing useVoiceRecording hook) |
| 2.5 | All today components | Keyboard shortcuts: `n` = new task, `i` = focus inbox, `/` = quick capture |
| 2.6 | `src/app/api/promote/` | Promotion API endpoint |
| 2.7 | `inbox-panel.tsx` | Inline promote buttons (→Task, →Note, →Focus, →Idea) |
| 2.8 | `daily-note-panel.tsx` | Select-to-promote floating toolbar |

**Acceptance:** Daily workflow feels instant and fluid. Can capture by voice, promote inbox items to tasks with one click, reorder by dragging.

### Phase 3: Mission Control Integration

| Step | Files | What |
|------|-------|------|
| 3.1 | `src/app/api/mc/[...path]/route.ts` | MC proxy route |
| 3.2 | `src/lib/services/mission-control.ts` | MC service (typed wrappers around proxy) |
| 3.3 | `mission-control-view.tsx` | Rewrite — strip mocks, wire to live data |
| 3.4 | `mission-control-view.tsx` | Inline status change (dropdown → PATCH to MC) |
| 3.5 | `strategic-pulse.tsx` | Wire to MC API — blocked workstreams, deadlines, at-risk |
| 3.6 | Seed MC database | Add real projects (PRISM, Plexus, Screenverse, Allie AI, etc.) |
| 3.7 | Remove fake network status | Either wire to real data source or remove panel |

**Acceptance:** Mission Control shows real project data. Can update workstream status inline. Strategic Pulse on Today shows real blockers and deadlines.

### Phase 4: Cross-Domain Linking

| Step | Files | What |
|------|-------|------|
| 4.1 | `src/app/api/links/` | EntityLinks API routes |
| 4.2 | Create EntityLinks Airtable table | |
| 4.3 | `src/components/shared/link-selector.tsx` | Reusable project/workstream picker popover |
| 4.4 | `today-queue.tsx` | "Link to project" on task items |
| 4.5 | `weekly-focus-panel.tsx` | "Link to workstream" on focus items |
| 4.6 | `mission-control-view.tsx` | Show linked daily tasks on workstream expand |
| 4.7 | `src/lib/services/promote.ts` | Full promotion with linking |

**Acceptance:** Can link a daily task to an MC project. Weekly focus items can reference workstreams. Links are visible on both sides.

### Phase 5: Automation

| Step | What |
|------|------|
| 5.1 | Morning Brief — scheduled Claude task, 8am daily |
| 5.2 | Weekly Reset — Monday 7am, archive focus, create new week, suggest carryover |
| 5.3 | Capture Classification — async AI call after inbox capture, suggest type + project |
| 5.4 | Linear Sync — periodic pull to MC backend |

### Phase 6: Review + Cleanup

| Step | Files | What |
|------|-------|------|
| 6.1 | `src/components/views/review-view.tsx` | Build review surface |
| 6.2 | `src/lib/services/staleness.ts` | Staleness detection |
| 6.3 | Review integration | Wire staleness into Strategic Pulse + Review View |
| 6.4 | Retire MC frontend | Stop :3001 process, update firewall, remove from boot |
| 6.5 | Boot hardening | PM2 or systemd for Command + MC backend auto-start |

---

## 8. Visual Design Direction

### Design Tokens (extending existing theme)

The existing `globals.css` has a solid `--md-*` variable system. Extend with:

```css
/* Status colors — used consistently across all views */
--md-status-active: #8b5cf6;    /* violet — in progress, active */
--md-status-done: #10b981;      /* emerald — completed */
--md-status-blocked: #ef4444;   /* red — blocked, urgent */
--md-status-at-risk: #f59e0b;   /* amber — watch, approaching */
--md-status-planned: #6b7280;   /* gray — not started */
--md-status-deferred: #9ca3af;  /* light gray — pushed back */

/* Lanes */
--md-lane-must: #ef4444;        /* red accent for must-do */
--md-lane-should: #f59e0b;      /* amber for should-do */
--md-lane-carryover: #6b7280;   /* gray for carryover */

/* Interaction */
--md-focus-ring: #8b5cf620;     /* subtle violet focus ring */
--md-drag-shadow: 0 8px 32px rgba(0,0,0,0.12);
```

### Typography Hierarchy

```css
/* Page title — "Monday, March 23" */
.today-date { font-size: 1.5rem; font-weight: 600; letter-spacing: -0.02em; }

/* Section headers — "Weekly Focus", "Today Queue" */
.section-title { font-size: 0.75rem; font-weight: 600; text-transform: uppercase;
                 letter-spacing: 0.05em; color: var(--md-text-secondary); }

/* Task/item text */
.item-text { font-size: 0.9375rem; font-weight: 400; line-height: 1.5; }

/* Metadata — timestamps, badges */
.meta-text { font-size: 0.75rem; color: var(--md-text-tertiary); }
```

### Interaction Animations

```css
/* Task check-off — satisfying completion */
.task-complete {
  animation: taskDone 300ms ease-out;
}
@keyframes taskDone {
  0% { transform: scale(1); }
  50% { transform: scale(1.02); }
  100% { transform: scale(1); opacity: 0.6; }
}

/* Inbox item promote — slides out */
.inbox-promote {
  animation: slideOut 250ms ease-in forwards;
}
@keyframes slideOut {
  to { transform: translateX(100%); opacity: 0; height: 0; margin: 0; padding: 0; }
}

/* Quick capture submit — brief flash */
.capture-flash {
  animation: flash 200ms ease-out;
}
@keyframes flash {
  0% { background: var(--md-status-active); }
  100% { background: transparent; }
}

/* Drag in progress */
.dragging {
  box-shadow: var(--md-drag-shadow);
  transform: rotate(1deg);
  z-index: 50;
}
```

### Panel Design

All panels follow this pattern:
```tsx
<div className="rounded-xl border border-md-border bg-card p-4">
  <h3 className="section-title mb-3">Section Name</h3>
  {/* content */}
</div>
```

- Rounded corners (`rounded-xl`)
- Subtle border (1px, uses theme border color)
- Card background (white in light, dark surface in dark)
- Consistent padding (p-4)
- No nested cards within panels
- No excessive borders between items (use spacing instead)

---

## 9. Key Technical Decisions

### Why Airtable (for now)
- Already integrated, already has data
- Service layer abstracts it — migration path to Supabase is clean
- Airtable rate limit (5 req/sec) is fine for single-user daily use
- No migration risk during the build

### Why proxy instead of direct MC calls from browser
- Same-origin requests (no CORS issues)
- MC backend stays internal (never exposed to network directly)
- Can add auth/caching at the proxy layer later
- Clean separation — Command API is the only public surface

### Why EntityLinks in Airtable instead of MC backend
- Links connect objects across both domains
- Airtable is the "daily domain" store — links are a daily-domain concern
- MC backend doesn't need to know about Airtable record IDs
- Future: if migrating to Supabase, links table moves with daily data

### Why not WebSocket for MC updates in Command
- MC backend has WebSocket, but it's designed for task execution streaming
- For project status, polling with `useFetch(url, refreshInterval)` is simpler
- 30-second refresh interval is fine for strategic data
- Can add WebSocket later if real-time matters

---

## 10. Files to Delete

| File | Reason |
|------|--------|
| `src/components/views/home-view.tsx` | Replaced by `today-view.tsx` |
| `src/components/views/command-center.tsx` | Legacy, unused |
| `src/components/views/kanban-view.tsx` | Legacy, unused |

---

## 11. Dependencies to Add

```bash
# None required for Phase 1-4
# @dnd-kit already installed
# recharts already installed
# lucide-react already installed
# shadcn/ui already installed

# Phase 5 (automation)
# Scheduled tasks use Claude's CronCreate — no npm dependency
```

---

## 12. Testing Strategy

### Manual Testing Checklist (Phase 1)

- [ ] Land on Today by default
- [ ] Weekly Focus: add item, edit inline, reorder, change status
- [ ] Today Queue: add task to Must Do, check it off, see it dim/complete
- [ ] Inbox: type a thought, submit, see it appear in recent list
- [ ] Inbox: use voice capture, see transcription in inbox
- [ ] Daily Note: type freely, see auto-save indicator
- [ ] Navigate to Mission Control — no crash even if MC backend is down
- [ ] Navigate to Tasks — existing kanban still works
- [ ] Navigate to Review — see current week summary
- [ ] Mobile: bottom nav works, Today is usable on phone width
- [ ] Dark mode: all new components respect theme
- [ ] Refresh page: all data persists

### Performance Targets

- Today page load: < 1 second
- Capture to inbox: < 200ms perceived (optimistic UI)
- Task check-off: < 100ms perceived
- MC data load: < 2 seconds (acceptable, not blocking Today)

---

## 13. What This System Is NOT

Per V3 brief — keeping this visible:

- NOT a dashboard (it's a working surface)
- NOT a note app (it's an operating system)
- NOT a task app (it's a workflow engine)
- NOT a project tracker (it's a unified command layer)

It is all of them through one workflow: **Capture → Clarify → Connect → Execute → Review**

---

*Ready to build. Phase 1 first. Make it excellent or the whole system fails.*
