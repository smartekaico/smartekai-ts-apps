# Active Plan: Medical OS Redesign — Legal OS Pattern Sync

## Scope: Reusable Dashboard + Session-based 3-Tab UI

Redesign Medical OS to mirror Legal OS session view patterns:
- **Dashboard:** Stats cards, recent sessions, FAB for quick actions
- **Session View:** 3-tab interface (Chat, SOAP Note from recording, Events)

## Target Structure

```
apps/medical-os/src/
├── app/
│   ├── workspace/
│   │   ├── page.tsx              ← Dashboard (stats, recent, FAB)
│   │   └── sessions/
│   │       └── [id]/
│   │           └── page.tsx       ← Session view with 3 tabs
│   └── layout.tsx                ← Root layout
└── components/
    ├── dashboard/
    │   ├── MedicalDashboard.tsx   ← Stats + recent sessions
    │   └── MedicalSidebar.tsx    ← Sidebar nav (simplified)
    ├── session/
    │   ├── SessionHeader.tsx      ← Title, client, case, metadata
    │   ├── ChatWorkspace.tsx      ← Tab 1: Clinical assistant
    │   ├── SoapNoteEditor.tsx     ← Tab 2: SOAP from recording
    │   ├── EventsPanel.tsx        ← Tab 3: Appointments
    │   └── SessionTabs.tsx        ← 3-tab switcher
    ├── VoiceRecorder.tsx          ← Existing, integrate
    └── ui/                         ← shadcn components
```

## Implementation Steps

### Step 1: Dashboard (workspace/page.tsx)
- [ ] Stats cards: Total Clients, Total Sessions, Total Notes
- [ ] Recent sessions list with client, date, status
- [ ] FAB with quick actions (New Session, New Client)
- [ ] Sidebar with medical navigation

### Step 2: Session View (sessions/[id]/page.tsx)
- [ ] Session header: title, client, case, metadata row
- [ ] 3-tab switcher buttons:
  - Tab 1: 💬 Chat (clinical assistant)
  - Tab 2: 📝 SOAP Note (voice → transcription → SOAP)
  - Tab 3: 📅 Events (appointments/calendar)
- [ ] Absolute positioning for tab content (persistent mount)
- [ ] Mobile-responsive scrollable tabs

### Step 3: Chat Workspace (Tab 1)
- [ ] Chat interface for clinical analysis
- [ ] Quick actions sidebar
- [ ] Integration with AI endpoints

### Step 4: SOAP Note Editor (Tab 2)
- [ ] Voice recorder → transcription
- [ ] SOAP generation from transcription
- [ ] Editable SOAP sections (Subjective, Objective, Assessment, Plan)
- [ ] Save to session

### Step 5: Events Panel (Tab 3)
- [ ] Calendar view (list or grid)
- [ ] Add/Edit/Delete events
- [ ] Event types (appointment, follow-up, reminder)

## Source Reference (Legal OS Pattern)

| Component | Source | Target |
|-----------|--------|--------|
| 3-tab session UI | `ai-law-copilot/src/app/[locale]/dashboard/(workspace)/(legal)/sessions/[id]/page.tsx` | Medical session view |
| Tab switcher styles | Lines 605-647 | Medical tabs |
| Dashboard layout | `ai-law-copilot/src/app/[locale]/dashboard/(workspace)/page.tsx` | Medical dashboard |
| Sidebar | `UnifiedSidebar` | Simplified medical sidebar |

## Key UI Patterns to Mirror

### Tab Switcher (Legal OS L605-647)
```tsx
<div className="flex items-center gap-2 overflow-x-auto">
  <Button variant={activeView === "chat" ? "default" : "outline"}>
    💬 محادثة ذكية
  </Button>
  <Button variant={activeView === "doc" ? "default" : "outline"}>
    📝 مستند جديد
  </Button>
  <Button variant="outline" onClick={() => setIsAddEventModalOpen(true)}>
    📅 إضافة موعد
  </Button>
</div>
```

### Persistent Tab Content (L653-714)
```tsx
<div className="absolute inset-0 transition-opacity duration-300"
  className={cn(
    activeView !== "chat" 
      ? "opacity-0 invisible pointer-events-none" 
      : "opacity-100 visible"
  )}
>
  <ChatWorkspace ... />
</div>
```

## Status

- [x] Audit Legal OS session page patterns
- [x] Implement Medical Dashboard
- [ ] Implement Session View with 3 tabs
- [ ] Build Chat Workspace component
- [ ] Build SOAP Note Editor (from recording)
- [ ] Build Events Panel
- [ ] Validate build

## Branch
`feat/sync-legal-os-from-canonical` (clean state)

## Dependencies
- Reuse existing VoiceRecorder component
- Reuse existing API routes (generate-soap, transcribe)
- Reuse shadcn UI components