# Command + Mission Control — Unified System Plan

**Date:** 2026-03-23 (Monday Planning Session)
**Author:** Claude (Opus 4.6) + Human review
**Status:** Draft — pending review

---

## 1. The Problem

Right now there are two disconnected apps and a Google Doc full of scattered notes:

- **Mission Control** (`/home/claudeclaw/mission-control/`) — standalone Express + Vite app with a real database (Prisma/SQLite), project/task CRUD, agents, scheduler. Runs on ports 3000 (backend) + 3001 (frontend). Has Linear API integration. Good bones, but not used daily.

- **Command** (`/home/claudeclaw/command/`) — Next.js dashboard with Airtable backend. Has brain dump, task kanban, usage metrics, briefs, action notes. Has a Mission Control *view* but it's all hardcoded mock data. Runs on port 3002.

- **Google Docs** — where actual daily planning happens: Monday lists, meeting notes, random thoughts, wire details, follow-ups. This is the real "system" right now, and it doesn't connect to anything.

**The goal:** One place to live in all day that handles both the strategic overview (Mission Control) and the daily grind (notes, tasks, weekly focus). Kill the Google Doc dependency.

---

## 2. The Vision

### Two layers, one app:

```
┌─────────────────────────────────────────────────────────┐
│  COMMAND  (daily driver — open all day)              │
│                                                         │
│  ┌─────────────────────────────────────────────────┐    │
│  │  TODAY VIEW (default landing page)              │    │
│  │  ┌──────────┐ ┌──────────┐ ┌────────────────┐  │    │
│  │  │ Weekly   │ │ Quick    │ │ Today's Tasks  │  │    │
│  │  │ Focus    │ │ Capture  │ │ (checklist)    │  │    │
│  │  │ (Mon-Fri │ │ (brain   │ │                │  │    │
│  │  │ goals)   │ │ dump +   │ │ [ ] Call Mike  │  │    │
│  │  │          │ │ voice)   │ │ [ ] Doohly bill│  │    │
│  │  │          │ │          │ │ [x] Insurance  │  │    │
│  │  └──────────┘ └──────────┘ └────────────────┘  │    │
│  └─────────────────────────────────────────────────┘    │
│                                                         │
│  ┌─────────────────────────────────────────────────┐    │
│  │  MISSION CONTROL (strategic glance)             │    │
│  │  Live data from MC backend API                  │    │
│  │  Projects → Workstreams → Blockers → Deadlines  │    │
│  │  Click to drill in, update status inline        │    │
│  └─────────────────────────────────────────────────┘    │
│                                                         │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐  │
│  │ Tasks    │ │ Usage &  │ │ Ideas &  │ │ Briefs   │  │
│  │ (kanban) │ │ Costs    │ │ Expenses │ │          │  │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘  │
└─────────────────────────────────────────────────────────┘
          ↕ REST API calls
┌─────────────────────────────────────────────────────────┐
│  MISSION CONTROL BACKEND (:3000)                        │
│  Source of truth for projects & workstreams              │
│  Prisma + SQLite + Linear sync                          │
└─────────────────────────────────────────────────────────┘
```

### What each layer does:

**Command (the UI you live in):**
- **Today View** — replaces the Google Doc. Your daily checklist, weekly focus areas, quick capture for thoughts/notes/voice
- **Mission Control View** — the 30,000-foot view. Glance at project health, deadlines, blockers. Click to drill in. Update workstream status inline
- **Tasks, Usage, Ideas, Briefs** — existing views, keep working as-is

**Mission Control Backend (the project engine):**
- Stores projects, workstreams, agents, execution history
- Serves data to Command via REST API
- Syncs with Linear for issue tracking
- No need to open its own frontend anymore — Command is the UI

---

## 3. What Exists Today

### Mission Control Backend (keep as-is, enhance)
- **Database:** Prisma/SQLite with Projects, Tasks, TaskRuns, TaskNotes, Agents, SchedulerJobs, ChatSessions
- **API:** Full REST on port 3000 — CRUD for projects, tasks, agents, scheduler, dashboard
- **Services:** Task executor (child process spawning), scheduler (node-cron), Linear API sync
- **WebSocket:** Real-time updates for task status changes
- **Linear Integration:** Pulls projects/issues from Linear (requires LINEAR_API_KEY + LINEAR_TEAM_ID, already configured)

### Command Frontend (revamp the daily experience)
- **Framework:** Next.js 16, Tailwind, shadcn/ui, lucide icons
- **Data:** Airtable (tasks, ideas, expenses, notes, briefs, usage, skills, action notes)
- **Features:** Brain dump with voice, task kanban with drag-drop, usage dashboard, morning briefs
- **Mission Control View:** Exists but uses hardcoded mock data — needs to be wired to real backend

### External Services Available
- **Airtable** — current data store for daily tasks/notes (PAT configured)
- **Supabase** — one project exists (GlassCast-Twilio, us-west-2). Could migrate data here eventually
- **Linear** — issue tracking, already integrated with MC backend
- **Anthropic API** — configured, used for task parsing and suggestions
- **Scheduled Tasks** — Claude can run automated tasks on cron (e.g., morning brief generation, sync jobs)
- **Claude Preview** — can preview and test the UI in a browser during development
- **Google Drive** — search/fetch available via MCP (could pull existing docs)

---

## 4. Implementation Plan

### Phase 1: Wire Mission Control to Live Data (Day 1)
**Goal:** Replace mock data with real API calls so the strategic view actually works.

- [ ] Add a proxy route in Command (`/api/mc/[...path]`) that forwards requests to MC backend on port 3000
- [ ] Replace `MOCK_BUCKETS` and `MOCK_NETWORK` in `mission-control-view.tsx` with `useEffect` + `fetch` calls
- [ ] Map MC backend's project/task data model to the bucket/workstream UI structure
- [ ] Add inline status updates — click a workstream to toggle its status, writes back to MC backend
- [ ] Seed the MC backend database with real current project data (PRISM, Plexus, Screenverse, etc.)

**Data mapping:**
```
MC Backend Project  →  Command "Project Card"
MC Backend Task     →  Command "Workstream" (within a project)
MC Backend "Blocked" status  →  Blocker badge with Linear link
Custom "Bucket" grouping  →  Technology / Revenue / Operations
```

### Phase 2: Revamp the Daily View (Day 1-2)
**Goal:** Replace the current Command Center with something that actually replaces the Google Doc.

**New "Today" view layout:**

```
┌─────────────────────────────────────────────────┐
│  Monday, March 23                               │
│                                                 │
│  ┌─── WEEKLY FOCUS ───────────────────────────┐ │
│  │ 1. Weekly plan with Mission Control        │ │
│  │ 2. Allie AI company vision + HTML5         │ │
│  │ 3. Offline screens                         │ │
│  │ 4. Doohly bills                            │ │
│  │ 5. Insurance bill → don't need screen ins  │ │
│  │ 6. Taxes overview plan → what's needed?    │ │
│  └────────────────────────────────────────────┘ │
│                                                 │
│  ┌─── TODAY'S TASKS ──┐ ┌─── QUICK CAPTURE ──┐ │
│  │ [ ] Call Mike re:  │ │ Type or voice...    │ │
│  │     order + bill   │ │                     │ │
│  │ [ ] Fix morning    │ │ [Mic] [Send]        │ │
│  │     brief          │ │                     │ │
│  │ [x] Planning       │ │ Recent captures:    │ │
│  │     session        │ │ • SMS fix idea...   │ │
│  │ [ ] Website pass   │ │ • Landscape screen  │ │
│  │                    │ │   consideration     │ │
│  │ [+ Add task]       │ │                     │ │
│  └────────────────────┘ └─────────────────────┘ │
│                                                 │
│  ┌─── NOTES / SCRATCH ────────────────────────┐ │
│  │ Primesight meeting:                        │ │
│  │ - Website coming along, free creative      │ │
│  │ - Twilio phone # setup for store owners    │ │
│  │ - Screenverse onboarding: Vistar → gfet    │ │
│  │   certified → nova → rest of SSPs          │ │
│  │                                            │ │
│  │ [+ Add note]                               │ │
│  └────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────┘
```

Key changes from current home view:
- **Weekly Focus** — editable list at the top, persists Mon-Fri, resets each Monday. This is the "what am I focused on this week" that currently lives in the Google Doc
- **Today's Tasks** — simple checkboxes, not summary cards. Actually check things off. Filtered to today + overdue
- **Quick Capture** — keep brain dump but make it more prominent. Voice + text. One tap to capture, sort later
- **Notes / Scratch** — freeform area for meeting notes, random thoughts, whatever. Replaces the Google Doc scratch space. Persisted to Airtable Notes table

### Phase 3: Connect the Layers (Day 2-3)
**Goal:** Make daily work and strategic tracking aware of each other.

- [ ] "Link to Project" on any task — associates a Command task with a MC project
- [ ] Mission Control view shows a "recent activity" feed pulling from linked tasks
- [ ] Weekly Focus items can optionally map to MC project workstreams
- [ ] When a workstream is marked "done" in MC, any linked Command tasks get auto-completed

### Phase 4: Automate the Boring Stuff (Day 3+)
**Goal:** Use scheduled tasks and AI to reduce manual overhead.

- [ ] **Morning Brief** — scheduled task that runs at 8am, summarizes: what's due today, blockers across projects, any deadlines this week, overnight alerts
- [ ] **Weekly Reset** — Monday morning task that archives last week's focus, creates new weekly focus template from MC project priorities
- [ ] **Linear Sync** — periodic sync from Linear to MC backend so blocker status stays current
- [ ] **Smart Capture Classification** — when you brain-dump something, AI classifies it as task/note/idea and suggests which project it belongs to (already partially built)

### Phase 5: Polish & Harden (Day 4+)
- [ ] Make the dev server auto-start on boot (systemd service or PM2)
- [ ] Consider migrating from Airtable to Supabase for lower latency and unified backend
- [ ] Add keyboard shortcuts for daily workflow (quick capture, toggle task, switch views)
- [ ] Mobile-responsive for phone glances
- [ ] Consider Vercel deployment if you want access outside the LAN

---

## 5. Data Architecture

### Where data lives:

| Data | Current Store | Future Store | Why |
|------|--------------|-------------|-----|
| Daily tasks, checklist | Airtable | Airtable (no change) | Works fine, good API |
| Brain dump / captures | Airtable | Airtable (no change) | Works fine |
| Ideas & expenses | Airtable | Airtable (no change) | Works fine |
| Usage metrics | Airtable | Airtable (no change) | Synced from NucBox |
| Morning briefs | Airtable | Airtable (no change) | Works fine |
| **Projects & workstreams** | Mock data | **MC Backend (SQLite)** | Real CRUD needed |
| **Blockers & deadlines** | Mock data | **MC Backend + Linear** | Needs live tracking |
| **Weekly focus** | Google Doc | **New: Airtable table** | Needs persistence |
| **Scratch notes** | Google Doc | **New: Airtable table** | Needs persistence |
| **Agent configs** | MC Backend | MC Backend (no change) | Keep isolated |

### New Airtable tables needed:
1. **WeeklyFocus** — `WeekNumber`, `Year`, `Items` (JSON array), `CreatedAt`, `UpdatedAt`
2. **ScratchNotes** — `Title`, `Content` (rich text), `Date`, `Tags`, `CreatedAt`

### API flow:
```
Command UI
  ├── /api/tasks          → Airtable (daily tasks)
  ├── /api/notes          → Airtable (brain dump)
  ├── /api/weekly-focus    → Airtable (new: weekly goals)
  ├── /api/scratch-notes   → Airtable (new: meeting notes, scratch)
  ├── /api/mc/dashboard    → proxy → MC Backend :3000/api/dashboard
  ├── /api/mc/projects     → proxy → MC Backend :3000/api/projects
  └── /api/mc/tasks        → proxy → MC Backend :3000/api/tasks
```

---

## 6. Tech Stack (No Changes)

- **Frontend:** Next.js 16, React 19, Tailwind CSS, shadcn/ui, lucide-react
- **Daily Data:** Airtable (existing PAT + Base)
- **Project Data:** Mission Control Express backend + Prisma + SQLite
- **AI:** Anthropic API (task parsing, capture classification, morning briefs)
- **External:** Linear API (blocker/issue sync)
- **Hosting:** Local on NucBox (192.168.0.124), LAN-accessible from Windows
- **Future consideration:** Supabase migration, Vercel deploy

---

## 7. Port Map

| Port | Service | Purpose |
|------|---------|---------|
| 3000 | Mission Control Backend | Project/task API, WebSocket |
| 3001 | Mission Control Frontend (Vite) | Can retire once Command replaces it |
| 3002 | Command (Next.js) | Daily driver UI |

---

## 8. Open Questions

1. **Airtable vs. Supabase migration** — Airtable works but adds latency and has rate limits. Supabase project already exists (GlassCast-Twilio). Worth consolidating?

2. **Weekly Focus persistence** — New Airtable table, or just store in the MC backend alongside projects? Could argue it's more "project planning" than "daily notes."

3. **Retire MC standalone frontend?** — Once Command's Mission Control view is wired to real data, the Vite frontend on :3001 becomes redundant. Kill it or keep it as a fallback?

4. **Linear as source of truth for tasks?** — MC backend already syncs from Linear. Should Command tasks also sync, or keep them separate (Linear = dev tickets, Command = personal tasks)?

5. **Network monitoring** — The mock data shows 46/51 screens online. Where does real network status come from? Doohly API? Separate monitoring? Needs a data source.

6. **Authentication** — Currently zero auth on both apps. Fine for LAN, risky if you ever deploy publicly. Worth adding basic auth now or later?

---

## 9. Success Criteria

When this is done, you should be able to:

- [ ] Open one URL on your Windows machine and see everything
- [ ] Start Monday morning: see weekly focus, today's tasks, project health — no Google Doc needed
- [ ] Quick-capture a thought (text or voice) in under 3 seconds
- [ ] Check off tasks throughout the day
- [ ] Glance at Mission Control to see which projects are on track, which are blocked
- [ ] Click into a blocked workstream and update its status
- [ ] End the week knowing what got done without digging through chat logs

---

*This plan is ready for review. Share with ChatGPT or whoever else for a second opinion, then come back and we'll start building.*
