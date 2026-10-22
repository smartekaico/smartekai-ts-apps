-- Coming-soon email capture (2026-10-22). Additive and idempotent; no existing
-- table or row is touched. Applied by hand because `db:push:cars` must never run
-- against production (see .agents/logs/2026-10-16-cars-db-push-drops-sequences.md).
CREATE TABLE IF NOT EXISTS waitlist_signups (
  id text PRIMARY KEY,
  email text NOT NULL UNIQUE,
  created_at timestamp NOT NULL DEFAULT now()
);
