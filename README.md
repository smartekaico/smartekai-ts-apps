# SmartekAI SaaS Monorepo

A monorepo containing Legal and Medical AI applications with shared packages.

## Project Structure

```
smartekai-saas/
├── apps/
│   ├── legal-os/       # Legal AI application
│   └── medical-os/     # Medical AI application
├── packages/
│   ├── auth/           # Better Auth configuration
│   ├── db/             # Database schema and client
│   ├── billing/        # Credit management
│   ├── ai/             # AI utilities (transcription, SOAP generation)
│   └── ui/             # Shared UI components
├── drizzle/            # Database migrations
└── turbo.json          # Turborepo configuration
```

## Packages

### @smartekai/db
- Neon Postgres connection with pgvector
- Complete schema for legal and medical use cases
- Tables: users, organizations, patients, encounters, soap_notes, case_analyses, etc.
- Supports separate databases for legal and medical

### @smartekai/auth
- Better Auth with organization plugin
- Multi-tenant support with industry roles (LEGAL, MEDICAL, MIXED, ADMIN)

### @smartekai/billing
- FIFO bucket-based credit system
- Credit consumption with audit logging

### @smartekai/ai
- Deepgram medical transcription (nova-3-medical model)
- Gemini 2.5 Flash SOAP note generation

## Development

```bash
# Install dependencies
npm install

# Run both apps
npm run dev

# Run specific app
npm run dev:legal
npm run dev:medical

# Database migrations
cd packages/db && npm run db:push
```

## Environment Variables

### Required

- `DATABASE_LEGAL_URL` - Neon Postgres connection string for Legal OS
- `DATABASE_MEDICAL_URL` - Neon Postgres connection string for Medical OS

### Optional (for backward compatibility)

- `DATABASE_URL` - Falls back to legal database if `DATABASE_LEGAL_URL` not set

### Other Required Variables

- `BETTER_AUTH_URL` - Application URL
- `BETTER_AUTH_SECRET` - Auth secret key
- `GOOGLE_AI_API_KEY` - Google AI Studio API key
- `DEEPGRAM_API_KEY` - Deepgram API key
- `NEXT_PUBLIC_APP_URL` - Public application URL