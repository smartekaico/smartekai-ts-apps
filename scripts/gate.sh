#!/usr/bin/env bash
# Runs between every handoff (see WORKFLOW.MD). Zero model calls -- everything
# here is a real command, not a judgment call. Failure returns the raw error;
# fix the cause, don't edit this file to make it pass (that's an ask-first
# change per AGENTS.md/lean-build). Fast, diff-based checks run first so a
# structural problem fails before spending time on a full monorepo build.
set -euo pipefail
cd "$(dirname "$0")/.."

fail() { echo "gate: FAILED - $1" >&2; exit 1; }
step() { echo "-> $1"; }

CHANGED="$(git diff --name-only HEAD 2>/dev/null || true)"
DIFF_CONTENT="$(git diff HEAD --unified=0 -- . 2>/dev/null || true)"

step "secret scan"
SECRET_PATTERN='AKIA[0-9A-Z]{16}|-----BEGIN [A-Z ]*PRIVATE KEY-----|sk-[A-Za-z0-9]{20,}|gh[pousr]_[A-Za-z0-9]{30,}|AIza[A-Za-z0-9_-]{30,}|postgres(ql)?://[^:@/[:space:]]+:[^@/[:space:]]+@'
if [ -n "$DIFF_CONTENT" ] && echo "$DIFF_CONTENT" | grep -Eq "$SECRET_PATTERN"; then
  echo "  possible secret pattern in diff:" >&2
  echo "$DIFF_CONTENT" | grep -En "$SECRET_PATTERN" | sed 's/^/    /' >&2
  fail "review before committing"
fi

step "forbidden paths"
FORBIDDEN='apps/[^/]+/\.next/|apps/[^/]+/dist/|\.agents/skills/'
if [ -n "$CHANGED" ] && echo "$CHANGED" | grep -Eq "$FORBIDDEN"; then
  echo "  touched paths AGENTS.md marks never-touch:" >&2
  echo "$CHANGED" | grep -E "$FORBIDDEN" | sed 's/^/    /' >&2
  fail "see AGENTS.md 'Never touch'"
fi

step "dependency diff"
if [ -n "$CHANGED" ] && echo "$CHANGED" | grep -Eq '(^|/)package\.json$'; then
  echo "  package.json changed in this diff -- confirm it was an asked-first dependency change:"
  echo "$CHANGED" | grep -E '(^|/)package\.json$' | sed 's/^/    /'
fi

step "typecheck"
npm run type-check || fail "typecheck"

step "lint"
npm run lint || fail "lint"

step "build"
npm run build || fail "build"

step "test"
echo "  no test suite exists in this repo yet -- skipped"

echo "gate: PASSED"
