# Dev Server Troubleshooting

## Findings
- `npm run dev:medical` does run successfully through Turborepo.
- The command is persistent and does not terminate; tool timeouts are expected once the server is ready.
- Verified ready output:
  - `medical-os:dev: ▲ Next.js 16.2.4 (Turbopack)`
  - `medical-os:dev: - Local: http://localhost:3000`
  - `medical-os:dev: ✓ Ready`
- Added `--output-logs=full` to root filtered dev scripts so Turborepo forwards app logs clearly.
- The macOS `MallocStackLogging` message is a runtime warning/noise from Node/macOS environment, not the app failing.

## Scope Reality
- Legal OS routes/marketing pages from `ai-law-copilot` are present under `apps/legal-os`.
- Medical OS currently has only a minimal non-i18n shell (`/` and `/workspace`) plus SOAP/transcription APIs.
- Medical OS does not currently include all mature marketing/core dashboard pages.

## Next
Decide whether to keep mature marketing pages in `legal-os` as the initial public shell, or extract reusable marketing sections/components into `packages/ui` and compose separate Legal/Medical product fronts.
