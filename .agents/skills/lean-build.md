---
name: lean-build
description: Use for any coding task touching more than one file, or any task where more than one implementation would be valid — features, bug fixes, refactors, migrations. Aligns on intent first, reads before writing, ships the smallest correct diff, verifies it, and reports tersely. Skip for single-line edits and pure questions about code.
---

# lean-build

Four disciplines, one loop. Applies whenever code is about to be written or
changed.

## 0. Scope gate
Run this skill when the task touches 2+ files, OR when 2+ valid approaches
exist, OR when the request names a goal rather than a change ("make login
faster" vs "rename this variable"). Otherwise just do the edit.

## 1. Align before building
- Ask only questions whose answers would change the implementation: scope
  boundaries, edge cases, or which of several valid approaches to take. Max
  3, asked once, batched — not a drip-feed.
- If nothing would change the implementation, ask nothing and start. Don't
  confirm understanding for its own sake; the diff is the confirmation.
- Ambiguity discovered mid-task is a stop-and-ask, not a guess-and-continue.

## 2. Read before writing
- Read `AGENTS.md` at the repo root first if present — it holds this
  project's commands, invariants, and no-touch paths. Never guess a test or
  build command that's written down there. If it's missing a command you
  need, ask rather than inventing one.
- Read the actual code paths you're about to change, plus their callers.
  Never edit a file you've only seen in a grep result.
- Check whether the thing you're about to build already exists in the
  codebase or the platform/stdlib. Most new helpers are duplicates.
- Lazy about the solution, never about the reading.

## 3. Write the least code that works
- Ship the smallest diff that solves the stated problem. If the task seems to
  want 100 lines, re-check the approach — that's a signal, not a budget.
- Fix only what was asked. Adjacent problems you notice get named in one
  line at the end, not fixed in the same diff.
- Exception — never trade away: input validation at trust boundaries,
  data-loss handling, auth/security, accessibility. Lean on the solution,
  never on the risk surface.

## 4. Verify in a tight loop
- Failing test → smallest change to pass it → run it → next. Don't batch
  unverified changes.
- If the project has no tests, verify by running the code path directly and
  say which check you ran. "Should work" is not verification.
- Debugging: reproduce first, one hypothesis at a time, confirm the fix
  addresses the cause and not the symptom. No shotgun fixes.

## 5. Persist state across resets
For work spanning multiple sessions, keep a short `SPEC.md` at the task root:
goal, constraints, current state, next step. Update it as you go — it exists
to survive a context reset, not to be written once and abandoned.

## 6. Say less
- No preamble, no restating the request, no closing summary unless asked.
- Report what changed and why in the fewest accurate words — full grammar,
  not grunts. Code, commands, error text, file paths, and numbers stay
  verbatim; never compress those.
- Any judgment call made silently (an approach chosen, a shortcut taken, an
  adjacent bug left alone) gets one line so it isn't invisible.

## Tie-break order
Safety and correctness (§3 exception) > asking about real ambiguity (§1) >
reading first (§2) > minimal diff (§3) > terseness (§6).
Each rule states its own exceptions; this line only orders them when two
rules genuinely conflict.
