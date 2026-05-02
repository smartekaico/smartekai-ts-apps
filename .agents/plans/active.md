# Active Plan: Medical SOAP + Client Management Sync

## Scope: Basic SOAP Note Generation + Client Management

Sync from **ai-clinic-app** (DO NOT MODIFY source):
- SOAP note generation from voice recording/dictation
- Client management (add, list, select)
- Minimal viable dashboard

## Source Reference

| Pattern | Source Location | Target |
|---------|-----------------|--------|
| Dashboard index | `ai-clinic-app/src/app/routes/_dashboard/index.tsx` | `medical-os/src/app/workspace/page.tsx` |
| Client selection | `ai-clinic-app/src/components/client-selection.tsx` | Copy to `medical-os/src/components/` |
| SOAP note editor | `ai-clinic-app/src/components/soap-note-editor-layout.tsx` | Copy to `medical-os/src/components/` |
| Recording interface | `ai-clinic-app/src/components/recording-interface.tsx` | Copy to `medical-os/src/components/` |
| VoiceRecorder | `smartekai-saas/apps/medical-os/src/components/VoiceRecorder.tsx` | Already exists, integrate |

## Target Structure

```
apps/medical-os/src/
├── app/
│   ├── workspace/
│   │   ├── page.tsx           ← Dashboard (stats, recent notes, FAB)
│   │   └── layout.tsx         ← Shared layout with sidebar
│   └── api/
│       ├── generate-soap/     ← Already exists
│       └── transcribe/        ← Already exists
├── components/
│   ├── ClientSelection.tsx     ← NEW from ai-clinic-app
│   ├── SoapNoteEditor.tsx     ← NEW from ai-clinic-app
│   ├── RecordingInterface.tsx ← NEW from ai-clinic-app
│   └── VoiceRecorder.tsx      ← Already exists, integrate
└── lib/
    └── medical.ts             ← NEW helpers
```

## Implementation Steps

### Step 1: Sync Dashboard (workspace/page.tsx)
- Stats cards (Total Clients, Total Notes)
- Recent notes list
- FAB with quick actions (New Client, New Note, Dictate)

### Step 2: Sync Client Management
- Client list component
- Add client form
- Client selection for encounters

### Step 3: Sync SOAP Note Editor
- TipTap-based rich text editor
- SOAP sections (Subject, Objective, Assessment, Plan)
- Template support

### Step 4: Integrate Voice Recording
- Connect VoiceRecorder to SOAP generation
- Dictation → Transcription → SOAP

## Status

- [ ] Audit ai-clinic-app patterns via graphify
- [ ] Sync dashboard/index.tsx
- [ ] Sync client components
- [ ] Sync SOAP editor components
- [ ] Integrate voice recording
- [ ] Validate build

## Branch
`feat/sync-legal-os-from-canonical` (dirty state)

## Graphify Memory
- ai-law-copilot: `./graphify-out/ai-law-copilot/` (auth, role enforcement, locale)
- ai-clinic-app: Source files in `/Users/ar/Desktop/Web Development/ai-clinic-app/src/`
