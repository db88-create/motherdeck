# FullCalendar Integration Plan

## Context

The current calendar view (`src/components/views/calendar-view.tsx`) is ~460 lines of hand-rolled month grid logic. It only fetches the current week's items, has a TODO comment acknowledging this limitation, and duplicates date handling/mutation logic that also lives in `action-table.tsx`. Both views independently fetch from `/api/weekly-focus`, maintain their own local state, and define their own optimistic update patterns.

**Goal:** Replace the custom calendar with FullCalendar, extract shared task state into a single hook owned by the parent, and wire both views to the same data so mutations in either view are reflected everywhere instantly.

**Core principle:** Build one normalized task store, wire both Today and Calendar to it, and let FullCalendar handle rendering time, not task state.

**Not changing:** Airtable schema, subtask handling, inbox workflow, or the Today view's layout/UX.

---

## Rules (Enforce During All Phases)

1. **No component besides the store does optimistic mutation logic.** ActionTable and CalendarView call store methods only. No local state patching in components.
2. **`FocusItem` is banned from UI components.** Only `normalize.ts` imports it. Everything downstream uses `CommandTask`.
3. **All dates are `"YYYY-MM-DD"` or `""`.** No Date objects, no ISO timestamps in task state.
4. **Subtasks stay list-native.** Calendar shows task titles only. No subtask rendering in FullCalendar.

---

## File Structure

```
src/lib/tasks/
  types.ts               # CommandTask type + SubItem re-export
  normalize.ts           # FocusItem → CommandTask (boundary adapter)
  date-utils.ts          # toDateStr, todayStr, addDays, formatDueDate, etc.
  group-tasks.ts         # groupTasks() business logic
  to-calendar-events.ts  # CommandTask[] → FullCalendar EventInput[]
  useTaskStore.ts        # Single hook: fetch, normalize, mutate, expose

src/components/views/
  calendar-view.tsx      # Rewritten with FullCalendar (replaces existing)

src/components/today/
  action-table.tsx       # Refactored to consume store props (CommandTask only)

src/app/
  page.tsx               # Owns useTaskStore() + selectedTaskId, passes to views
  api/weekly-focus/
    route.ts             # Small expansion: ?all=true support
```

---

## Phase 1: Normalized Task Layer + Date Utils

### New files

**`src/lib/tasks/types.ts`**
```typescript
import type { SubItem } from "@/components/today/sub-items";
export type { SubItem };

export type TaskStatus = "active" | "done" | "deferred" | "dropped";

export interface CommandTask {
  id: string;
  text: string;
  status: TaskStatus;
  dueDate: string;      // "YYYY-MM-DD" or ""
  sortOrder: number;
  notes: string;
  subItems: SubItem[];   // always parsed, never JSON string
  weekId: string;
  createdAt: string;
}
```

**`src/lib/tasks/normalize.ts`**
- `normalizeFocusItem(item: FocusItem): CommandTask` — parses subItems JSON, normalizes dueDate
- Reuses `parseSubItems` from `sub-items.tsx`
- **This is the only file that imports `FocusItem`.** After normalization, all downstream code uses `CommandTask`.

**`src/lib/tasks/date-utils.ts`**
- Extract from action-table: `toDateStr`, `todayStr`, `getMondayStr`, `getSundayStr`, `addDays`, `formatDueDate`, `formatShortDay`
- Pure functions, no state, no React

**`src/lib/tasks/group-tasks.ts`**
- `groupTasks(tasks: CommandTask[], today: string)` returning `{ todayItems, restOfWeekItems, unscheduledItems, completedThisWeek }`
- Uses `date-utils.ts` internally
- Business grouping rules live here, separate from date math

**`src/lib/tasks/to-calendar-events.ts`**
- `toCalendarEvents(tasks: CommandTask[]): EventInput[]`
- Filters to tasks with dueDate, maps to FullCalendar shape
- **Hides completed tasks by default** (only active/deferred/dropped)
- FullCalendar-specific class/style logic isolated here, not in the component
- Can add a `showCompleted` param later if we want a toggle

**`src/lib/tasks/useTaskStore.ts`**
```typescript
export function useTaskStore() {
  // Fetches /api/weekly-focus?all=true, normalizes to CommandTask[]
  // Returns:
  //   tasks: CommandTask[]
  //   currentWeek: { id, weekStartDate, archived }
  //   loading: boolean
  //   error: string | null
  //   addTask(text: string, dueDate?: string): void
  //   updateStatus(id: string, status: TaskStatus): void
  //   updateDate(id: string, dueDate: string): void
  //   updateText(id: string, text: string): void
  //   updateSubItems(id: string, subItems: SubItem[]): void
  //   refetch(): void
}
```

### Mutation model (centralized, single path)
Every mutation function:
1. Snapshots current tasks (for rollback)
2. Applies optimistic local patch to `tasks` state
3. Calls API (POST or PATCH to `/api/weekly-focus`)
4. On success: done (local state is already correct)
5. On failure: rollback to snapshot, then hard refetch

Serialization (e.g. `SubItem[] → JSON string`) happens inside mutations, never in UI code.

---

## Phase 2: API Expansion for Calendar Scope

### Problem
`GET /api/weekly-focus` returns items for current week only (filtered by weekId). Calendar needs all items.

### Solution: `GET /api/weekly-focus?all=true`

**Modify `src/app/api/weekly-focus/route.ts`:**

Add one `if` branch in the GET handler:
```typescript
const all = req.nextUrl.searchParams.get("all");
if (all === "true") {
  // Fetch all items (no weekId filter), exclude archived weeks
  const allItems = await fetchAll<FocusItemFields>(ITEMS_TABLE, {
    sort: [{ field: "SortOrder", direction: "asc" }],
  });
  const currentWeek = await WeeklyFocusService.getCurrentWeek();
  return NextResponse.json({
    currentWeek,
    items: allItems.map(toFocusItem),
  });
}
```

Response shape for `?all=true`:
- `currentWeek: { id, weekStartDate, archived }` — for creating new tasks
- `items: FocusItem[]` — all items across all weeks

### Also fix POST handler
Current POST doesn't pass `dueDate` through to `addItem`. Add `dueDate` support:
- Accept `body.dueDate` in POST
- Pass to `createRecord` as `DueDate` field

---

## Phase 3: FullCalendar Read-Only Calendar

### Install
```bash
npm install @fullcalendar/react @fullcalendar/daygrid @fullcalendar/interaction
```

### Rewrite `src/components/views/calendar-view.tsx`

Props interface:
```typescript
interface CalendarViewProps {
  tasks: CommandTask[];
  addTask: (text: string, dueDate?: string) => void;
  updateStatus: (id: string, status: TaskStatus) => void;
  selectedTaskId: string | null;
  onSelectTask: (id: string | null) => void;
}
```

- Uses `toCalendarEvents(tasks)` from `to-calendar-events.ts` for event mapping
- Dynamic import via `next/dynamic` with `ssr: false`
- Styled with CSS variables in `globals.css` to match theme
- `dateClick` and `eventClick` wired from the start (simple handlers)
- Completed tasks hidden from calendar by default

### Styling (`src/app/globals.css` additions)
- FullCalendar overrides using `--md-*` CSS variables
- Active tasks: violet left-border/dot
- Overdue tasks: red indicator
- Today cell: violet accent highlight
- Dark/light mode via existing CSS variable system

### Calendar tab already exists
Nav has `{ id: "calendar" }`, `page.tsx` renders `{tab === "calendar" && <CalendarView />}`. Zero routing changes.

---

## Phase 4: Shared Store Ownership (Parent-Owned)

### `page.tsx` owns the store + selection state

```typescript
export default function Home() {
  const [tab, setTab] = useState<TabId>("today");
  const store = useTaskStore();
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);

  return (
    <div className="flex h-dvh overflow-hidden bg-[var(--md-bg)]">
      <Nav active={tab} onChange={setTab} />
      <main>
        {tab === "today" && (
          <TodayView
            store={store}
            selectedTaskId={selectedTaskId}
            onSelectTask={setSelectedTaskId}
          />
        )}
        {tab === "calendar" && (
          <CalendarView
            tasks={store.tasks}
            addTask={store.addTask}
            updateStatus={store.updateStatus}
            selectedTaskId={selectedTaskId}
            onSelectTask={(id) => {
              setSelectedTaskId(id);
              setTab("today"); // navigate to Today and highlight
            }}
          />
        )}
        {/* other tabs unchanged */}
      </main>
    </div>
  );
}
```

### `eventClick` behavior across tabs
- Clicking an event in Calendar sets `selectedTaskId` AND switches to Today tab
- Today tab receives `selectedTaskId` and scrolls/highlights that task
- This makes the two views feel connected immediately

### Why props, not context
- Only one level of drilling (page → view → table)
- App is small
- Can upgrade to context later if needed

---

## Phase 5: Refactor Action Table to Shared Store

### Changes to `action-table.tsx`
1. Remove `useFetch("/api/weekly-focus")` call
2. Remove local `items` state + `setItems`
3. Remove all individual mutation handler functions
4. Accept store props:
   ```typescript
   interface ActionTableProps {
     tasks: CommandTask[];
     addTask: (text: string, dueDate?: string) => void;
     updateStatus: (id: string, status: TaskStatus) => void;
     updateDate: (id: string, dueDate: string) => void;
     updateText: (id: string, text: string) => void;
     updateSubItems: (id: string, subItems: SubItem[]) => void;
     selectedTaskId: string | null;
   }
   ```
5. Import grouping from `group-tasks.ts`, date helpers from `date-utils.ts`
6. Grouping: `useMemo(() => groupTasks(tasks, todayStr()), [tasks])`
7. When `selectedTaskId` is set, scroll to and highlight that task row

### ActionRow changes
- Receives `CommandTask` instead of `FocusItem`
- `subItems` is already `SubItem[]` — no more `parseSubItems()` call
- Calls store methods directly (via props), no local optimistic updates

### What stays the same in action-table
- All UI/JSX in ActionRow, QuickDatePopover, RestOfWeekGrid — visual code unchanged
- SubItemsList component — unchanged
- DatePicker component — unchanged
- Inbox fetching — stays local to ActionTable (inbox is not shared with calendar)
- InboxRow component — unchanged

### What gets deleted from action-table.tsx
- `toDateStr`, `todayStr`, `getMondayStr`, `getSundayStr`, `addDays`, `formatDueDate`, `formatShortDay` → moved to `date-utils.ts`
- `normalizeItem` → replaced by `normalizeFocusItem` in `normalize.ts`
- `WeeklyFocusData` interface → not needed
- All `handle*` mutation functions → replaced by store methods

---

## Phase 5.5: QuickDatePopover Reliability Pass

After ActionTable is migrated to the shared store, explicitly:

1. Re-test QuickDatePopover end-to-end
2. Verify it routes through `store.updateDate()` only (no local patching)
3. Remove any custom document-level outside-click nonsense if it still exists (it currently uses a backdrop overlay which is fine, but verify)
4. Test rapid date changes — ensure no stale state

The store refactor does **not** automatically fix interaction bugs in the popover. This step explicitly validates it.

---

## Phase 6: Calendar Interactions

### dateClick → create task
- Shows inline `AddTaskBar` above calendar: `[date label] | [text input] | [Add]`
- Enter submits, Escape dismisses
- Calls `store.addTask(text, clickedDate)`
- Task appears immediately in both calendar and list (shared store)

### eventClick → navigate to task
- Sets `selectedTaskId` in parent state
- Switches tab to "today"
- Today view scrolls to and highlights the task

---

## Phase 7: Subtasks Stay List-Native

No work. Calendar shows task titles only.

---

## Phase 8: Optional Drag/Drop (Future, Not Implemented Now)

- `@fullcalendar/interaction` already installed
- Wire `eventDrop` → `store.updateDate(task.id, newDateStr)`
- Only after everything else is stable

---

## Critical Files

| File | Action |
|------|--------|
| `src/lib/tasks/types.ts` | **NEW** |
| `src/lib/tasks/normalize.ts` | **NEW** |
| `src/lib/tasks/date-utils.ts` | **NEW** |
| `src/lib/tasks/group-tasks.ts` | **NEW** |
| `src/lib/tasks/to-calendar-events.ts` | **NEW** |
| `src/lib/tasks/useTaskStore.ts` | **NEW** |
| `src/app/api/weekly-focus/route.ts` | **MODIFY** — add `?all=true` + POST dueDate |
| `src/components/views/calendar-view.tsx` | **REWRITE** — FullCalendar |
| `src/components/today/action-table.tsx` | **REFACTOR** — consume store props, CommandTask only |
| `src/components/views/today-view.tsx` | **MODIFY** — pass store props to ActionTable |
| `src/app/page.tsx` | **MODIFY** — own useTaskStore + selectedTaskId |
| `src/app/globals.css` | **ADD** — FullCalendar theme overrides |
| `package.json` | **ADD** — 3 FullCalendar packages |

## Existing Code to Reuse (Do Not Rewrite)

- `parseSubItems`, `serializeSubItems` from `src/components/today/sub-items.tsx`
- `SubItem` type + `SubItemsList` component from `src/components/today/sub-items.tsx`
- `useFetch`, `useApi` from `src/lib/hooks.ts`
- `cn` from `src/lib/utils`
- `DatePicker` component from `src/components/today/date-picker.tsx`
- `QuickDatePopover` stays in action-table (UI, not data)
- Inbox handlers stay local to action-table

---

## Risks

1. **FullCalendar SSR** — must use `next/dynamic` with `ssr: false`
2. **FullCalendar CSS conflicts** — scope overrides carefully, use CSS variables not Tailwind inside FC
3. **API `?all=true` data volume** — fine now (small dataset), revisit if it grows
4. **Mutation rollback consistency** — centralized in useTaskStore, single optimistic update path, single rollback path. No per-view mutation logic.
5. **FocusItem leakage** — enforce: no `FocusItem` imports in any UI component
6. **QuickDatePopover interaction bugs** — store refactor doesn't auto-fix; explicit hardening in Phase 5.5

---

## Verification

After each phase, verify:
1. `npm run build` compiles
2. Today tab: action table works identically (grouping, check, edit, date assign, subtasks)
3. Calendar tab: tasks on correct dates, month nav works
4. Create task from calendar → appears in Today immediately
5. Complete task in Today → disappears from Calendar immediately
6. Change date in Today → moves on Calendar immediately
7. Dark/light mode both work
8. Mobile responsive

### Shared-state sync test (critical)
1. Change task date in Today
2. Switch to Calendar
3. Confirm it moved immediately without reload
4. Click a task event in Calendar
5. Confirm it navigates to Today and highlights the task
6. Confirm task is scrolled into view

---

## Implementation Order

```
Phase 1  → types + normalize + date-utils + group-tasks + to-calendar-events + useTaskStore
Phase 2  → API ?all=true + POST dueDate fix
Phase 3  → FullCalendar read-only + install packages
Phase 4  → page.tsx owns store + selectedTaskId, passes to views
Phase 5  → refactor action-table to shared store (riskiest phase)
Phase 5.5 → QuickDatePopover reliability pass
Phase 6  → calendar dateClick + eventClick interactions
```

Phase 1 creates the data layer — no existing files touched.
Phase 2 is one small API modification.
Phase 3 rewrites one file (calendar-view) + installs packages.
Phase 4 modifies page.tsx and today-view.tsx (small prop wiring).
Phase 5 is the biggest refactor (action-table) — most risk, most reward.
Phase 5.5 explicitly validates the interaction layer post-refactor.
Phase 6 adds calendar interactions after both views are stable on shared state.
