# Briefs Archive View — Claude Code Prompt

Paste this into Claude Code to build the Briefs section.

---

## Task

Build a Briefs archive view for Motherdeck that:
1. Displays all stored briefs in a running list (newest first)
2. Shows condensed card preview (3 key sections)
3. Click card → expands inline
4. Click "Read Full" → shows complete brief text
5. Clean, scannable UI

---

## Data Structure

### Airtable "Briefs" Table

Create this table in your Airtable base with these fields:

- **Date** (date field, required) — When the brief was generated
- **Title** (text) — Brief title (e.g., "DOOH & Programmatic Brief - 2026-03-14")
- **Executive Summary** (long text) — 3-4 sentence high-level overview
- **Key Insights** (long text) — 2-3 key stories with impact
- **Big Idea** (long text) — One actionable insight or opportunity
- **Full Brief** (long text) — Complete brief text (for expanded view)
- **Highlights** (text) — Comma-separated tags (e.g., "Olympics, Brand Safety, AI-Slop")

### Example Record

```json
{
  "Date": "2026-03-14",
  "Title": "DOOH & Programmatic Brief - March 14",
  "Executive Summary": "Olympics season heats up brand safety concerns. AI-generated ad inventory continues to erode trust...",
  "Key Insights": "1. Hard Rock Stadium FIFA World Cup packages due by March 20...\n2. NewsGuard data shows 40% of programmatic inventory contains AI-slop...",
  "Big Idea": "Position PrimeSight as the 'real' alternative to AI-generated screens. Partner with Broadsign on guaranteed inventory verification.",
  "Full Brief": "[Full 1500+ word brief text]",
  "Highlights": "Olympics,Brand Safety,AI-Slop,Broadsign,PrimeSight"
}
```

---

## UI Component Structure

### Layout

```
┌─────────────────────────────────────┐
│ 📰 Brief Archive                    │
├─────────────────────────────────────┤
│                                     │
│ 2026-03-14 — DOOH & Programmatic   │
│ Tags: Olympics, Brand Safety        │
│                                     │
│ ▼ Executive Summary                │
│   [3-4 sentences]                   │
│                                     │
│ ▼ Key Insights                      │
│   [2-3 key stories]                 │
│                                     │
│ ▼ Big Idea                          │
│   [One actionable insight]          │
│                                     │
│ [Read Full Brief →]                 │
│                                     │
├─────────────────────────────────────┤
│ 2026-03-13 — DOOH & Programmatic   │
│ ...                                 │
└─────────────────────────────────────┘
```

### Interaction

1. **List view (default):** Show 5-10 most recent briefs, condensed
2. **Click brief card:** Expand to show all 4 sections (Summary, Insights, Big Idea, + Read Full link)
3. **Click "Read Full Brief":** Open modal/drawer with complete brief text
4. **Collapse:** Click card again to collapse

---

## Implementation Details

### 1. Fetch Briefs

```typescript
import { fetchAll } from '@/lib/airtable'

const briefs = await fetchAll('Briefs', {
  sort: [{ field: 'Date', direction: 'desc' }],
  maxRecords: 100
})
```

### 2. Component State

- `expanded: Map<string, boolean>` — Track which briefs are expanded
- `selectedBrief: string | null` — For full-text modal

### 3. Card Component — Elegant Collapsible Design

**Visual Structure:**

Each brief card should have:

```
┌─────────────────────────────────────────┐
│ 📅 2026-03-14                           │
│ DOOH & Programmatic Brief               │
│                                         │
│ Tags: [Olympics] [Brand Safety] [AI]   │
│                                         │
├─────────────────────────────────────────┤
│ ► Executive Summary                     │
│ ┌─────────────────────────────────────┐ │
│ │ Olympics season heats up brand...   │ │
│ │ (3-4 sentences visible)             │ │
│ └─────────────────────────────────────┘ │
│                                         │
│ ► Key Insights                          │
│ [collapsed, shows ▶ arrow]              │
│                                         │
│ ► Big Idea                              │
│ [collapsed, shows ▶ arrow]              │
│                                         │
│ [Read Full Brief → ]                    │
└─────────────────────────────────────────┘
```

**Interaction Details:**

1. **Default state:** Executive Summary is **expanded by default** (shows preview)
2. **Key Insights & Big Idea:** Start **collapsed** (show ▶ arrow)
3. **Click section header:** Smooth slide-down animation (0.3s)
4. **Arrow rotation:** ▶ → ▼ when expanded
5. **Spacing:** 12px between sections, 16px padding inside each

**Implementation Tips:**

- Use Shadcn's `<Collapsible>` component for clean state management
- Or use native `<details>/<summary>` HTML (even more elegant, no JS)
- Add subtle bottom border (1px #333) between sections
- Use `max-h-0 overflow-hidden transition-all` for smooth collapse animation

**Example with `<details>`:**

```typescript
export function BriefCard({ brief }: { brief: Brief }) {
  const [fullBriefOpen, setFullBriefOpen] = useState(false);

  return (
    <div className="border border-zinc-700 rounded-lg p-6 mb-4 bg-zinc-900/50 hover:bg-zinc-900 transition-colors">
      {/* Header */}
      <div className="flex justify-between items-start mb-4">
        <div>
          <div className="text-sm text-zinc-500">📅 {brief.date}</div>
          <h3 className="text-lg font-semibold text-white mt-1">{brief.title}</h3>
        </div>
      </div>

      {/* Tags */}
      <div className="flex flex-wrap gap-2 mb-4">
        {brief.highlights?.map((tag) => (
          <span key={tag} className="text-xs bg-zinc-800 text-zinc-300 px-2 py-1 rounded">
            {tag}
          </span>
        ))}
      </div>

      {/* Sections */}
      <div className="space-y-3">
        {/* Executive Summary — Default Open */}
        <details open className="group">
          <summary className="cursor-pointer flex items-center gap-2 font-medium text-white hover:text-blue-400 transition-colors">
            <span className="text-lg group-open:rotate-90 transition-transform">▶</span>
            Executive Summary
          </summary>
          <div className="pl-6 mt-2 text-sm text-zinc-300 leading-relaxed">
            {brief.executiveSummary}
          </div>
        </details>

        {/* Key Insights — Default Closed */}
        <details className="group">
          <summary className="cursor-pointer flex items-center gap-2 font-medium text-white hover:text-blue-400 transition-colors">
            <span className="text-lg group-open:rotate-90 transition-transform">▶</span>
            Key Insights
          </summary>
          <div className="pl-6 mt-2 text-sm text-zinc-300 leading-relaxed whitespace-pre-wrap">
            {brief.keyInsights}
          </div>
        </details>

        {/* Big Idea — Default Closed */}
        <details className="group">
          <summary className="cursor-pointer flex items-center gap-2 font-medium text-white hover:text-blue-400 transition-colors">
            <span className="text-lg group-open:rotate-90 transition-transform">▶</span>
            Big Idea
          </summary>
          <div className="pl-6 mt-2 text-sm text-zinc-300 leading-relaxed">
            {brief.bigIdea}
          </div>
        </details>
      </div>

      {/* Read Full Brief Button */}
      <button
        onClick={() => setFullBriefOpen(true)}
        className="mt-4 text-sm text-blue-400 hover:text-blue-300 font-medium flex items-center gap-1"
      >
        Read Full Brief →
      </button>

      {/* Full Brief Modal */}
      {fullBriefOpen && (
        <FullBriefModal
          brief={brief}
          onClose={() => setFullBriefOpen(false)}
        />
      )}
    </div>
  );
}
```

**Styling Notes:**

- **Hover effect:** Card background lightens slightly on hover
- **Arrow animation:** Rotate 90° smoothly when expanding (use `group-open:rotate-90`)
- **Text color:** Zinc-300 for body text, white for headers
- **Link color:** Blue-400 with hover state to blue-300
- **Padding:** 6px left padding on expanded content for visual indent
- **Transition:** All animations 0.3s ease-in-out
- **Borders:** Subtle 1px zinc-700 border on card

### 4. Full Brief Modal — Elegant Expanded View

**Design:**

```
┌────────────────────────────────────────────┐
│ × Close                                    │
│                                            │
│ 📰 DOOH & Programmatic Brief               │
│ March 14, 2026                             │
│                                            │
├────────────────────────────────────────────┤
│                                            │
│ [Full brief text, 1500+ words]             │
│ Clean typography, 60-70 char line width    │
│ Dark background, light text                │
│ Generous line height (1.7)                 │
│                                            │
└────────────────────────────────────────────┘
```

**Implementation (Shadcn Dialog):**

```typescript
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'

function FullBriefModal({ brief, onClose }: { brief: Brief; onClose: () => void }) {
  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] bg-zinc-900 border-zinc-700">
        <DialogHeader>
          <DialogTitle className="text-2xl text-white">
            📰 {brief.title}
          </DialogTitle>
          <p className="text-sm text-zinc-500 mt-2">
            {new Date(brief.date).toLocaleDateString('en-US', {
              weekday: 'long',
              year: 'numeric',
              month: 'long',
              day: 'numeric'
            })}
          </p>
        </DialogHeader>

        <div className="overflow-y-auto pr-4">
          <div className="prose prose-invert max-w-none">
            <div className="text-zinc-300 leading-relaxed whitespace-pre-wrap text-sm">
              {brief.fullBrief}
            </div>
          </div>
        </div>

        {/* Optional: Copy & Export */}
        <div className="flex gap-2 mt-4 pt-4 border-t border-zinc-700">
          <button className="text-xs text-zinc-400 hover:text-zinc-200">
            📋 Copy
          </button>
          <button className="text-xs text-zinc-400 hover:text-zinc-200">
            ↓ Export PDF
          </button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
```

**Elegance Details:**
- Close button (×) in top-left corner, small and subtle
- Title + date in header (no underline, just spacing)
- Full text in scrollable body (no side padding overflow)
- Light gray text (#d4d4d8) on dark background (#18181b)
- Line height 1.7 for readability
- Font size 14px (readable, not tiny)
- Optional: Copy/Export buttons at bottom (subtle gray)

---

## File Location

Place the new component at:
`src/components/views/briefs-view.tsx`

And integrate into the main dashboard (wherever you have tabs/views).

---

## Integration with Morning Brief

**When Mother generates the morning brief (6:45 AM):**

She should call:
```typescript
import { createBrief } from '@/lib/airtable-write'

await createBrief({
  date: '2026-03-15',
  title: 'DOOH & Programmatic Brief - March 15',
  executiveSummary: '...',
  keyInsights: '...',
  bigIdea: '...',
  fullBrief: '[complete text]',
  highlights: ['Olympics', 'Brand Safety', 'AI-Slop']
})
```

You'll need to add this function to `airtable-write.ts`:

```typescript
export async function createBrief(data: {
  date: string
  title: string
  executiveSummary: string
  keyInsights: string
  bigIdea: string
  fullBrief: string
  highlights?: string[]
}): Promise<WriteResult> {
  // ... implementation
}
```

---

## UI Library & Styling

**Components:**
- **Collapsible:** Use native `<details>/<summary>` HTML (lightweight, elegant)
- **Modal:** Shadcn's `Dialog` component
- **Cards:** Shadcn's `Card` or DIV with custom borders

**Tailwind Classes (Recommended):**
```
Card Container:
  border border-zinc-700 rounded-lg p-6 mb-4 bg-zinc-900/50 hover:bg-zinc-900 transition-colors

Header:
  text-lg font-semibold text-white

Body Text:
  text-sm text-zinc-300 leading-relaxed

Tags:
  text-xs bg-zinc-800 text-zinc-300 px-2 py-1 rounded

Collapsible Arrow:
  group-open:rotate-90 transition-transform

Links:
  text-blue-400 hover:text-blue-300
```

**Color Palette:**
- Background: #18181b (zinc-900)
- Card: #27272a (zinc-900/50)
- Border: #3f3f46 (zinc-700)
- Text primary: #fafafa (white)
- Text secondary: #d4d4d8 (zinc-300)
- Text muted: #71717a (zinc-500)
- Link: #60a5fa (blue-400)

**Typography:**
- Headers: font-semibold, 16-18px
- Body: font-normal, 14px
- Line height: 1.7 for readability

---

## Scope

**First pass:**
- ✅ List view of all briefs (date, title, tags)
- ✅ Collapsible sections (Summary, Insights, Big Idea)
- ✅ Full brief modal

**Nice to have (second pass):**
- Search/filter by tag
- Favorite/archive briefs
- Export brief as PDF

---

## Notes

- Briefs should auto-populate when Mother generates them
- You can manually add past briefs to Airtable to backfill the archive
- The "condensed view" keeps the UI scannable without overwhelming detail

---

This gives you a searchable, expandable archive of all your daily briefs in one place.
