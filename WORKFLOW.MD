# Feature Workflow

One issue → one branch → one PR. Never parallelize inside that unit.

---

## Roles

| Role | Does | Model |
|---|---|---|
| **PM** | Plans, writes acceptance criteria, manages issues, versioning, proposes devops | strong |
| **Team lead** | Executes the plan — implementation, integration | strong |
| **Frontend** | Web design + copywriting | strong |
| *gate* | *format · lint · typecheck · test · build · secret scan · diff scope* | *none — code* |

The gate isn't a role. It's `gate.sh`, and it runs between every handoff.

All three read the same `AGENTS.md`. Each gets ~5 extra lines: scope, what it hands off, what it never touches. Resist growing those — the shared file already covers behavior, and per-role duplication is where drift starts.

### Split PM's planning from PM's validating

Same role, different session. A call that wrote the acceptance criteria will ratify its own plan — the reasoning is still in context and still looks correct.

**Validation runs as a fresh PM invocation seeing only the issue and the diff.** Never the plan discussion. Empty context is the entire mechanism; without it you have self-endorsement with extra steps.

### Releases — PM owns tags and versions

- **Version bump on merge, not per commit.** PM reads the merged PR titles since the last tag and proposes the bump: breaking → major, new feature → minor, fix → patch.
- **Tag from `main` only**, after the gate passes there. A tag on an unverified commit is worse than no tag.
- **Changelog is generated from PR titles**, which makes PR titles a real artifact — enforce a prefix (`feat:`, `fix:`, `chore:`) in the ready gate rather than fixing it at release time.
- **PM proposes, you run it.** `gh release create` publishes; that's a §6 action.

```bash
gh pr list --state merged --base main --search "merged:>$(git describe --tags --abbrev=0)"
```

### DevOps stays proposal-only

PM is the one role that can both decide something is needed and ship it. Deploys, migrations, and credential changes are `AGENTS.md` §6 — PM drafts the command, you run it. Revisit once run records show it's reliable, not before.

---

## Flow

```
issue ──► PM plans ──► lead builds ──► gate ──► PM validates (fresh) ──► you merge
                            ▲                          │
                            └──── findings ────────────┘
                                   max 2 cycles
```

Frontend runs in the build phase, on its own files or its own branch.

```bash
gh issue list --label agent-ready --limit 1
git switch -c feat/<issue-number>-<slug>
neon checkout feat/<issue-number>-<slug>   # matching DB branch, env pulled
# lead/frontend builds → ./scripts/gate.sh → PM validates → fixes → gate
gh pr create --draft --body "Closes #<n>"
```

A Neon branch per git branch means migrations run against a copy, not shared dev data. Agents write migrations; that isolation is what makes a bad one cheap. Delete the DB branch when the PR merges.

Branch per attempt, including retries. A second attempt is a new branch, not a force-push — you want to compare them.

---

## Parallel work

Safe only when file sets are disjoint:

- Different features → different branches → fine
- Different packages → fine (`packages/email` and `packages/payments` don't collide)
- Same feature split across roles → **don't.** They fight over shared types and produce conflicts you resolve by hand, costing more than sequential would have.

Parallelize by **file boundary**, never by role.

---

## Copy needs its own spec

Design hits the gate — typecheck, build, lint all have opinions. Copy hits nothing. A compiler can't tell you a headline is off-brand or a claim is wrong.

So any issue involving copy states: voice, claims permitted, length, and language. Without that it can't be validated at all — and fluent-but-wrong reads exactly like correct, especially in a second language.

---

## Kanban

Status derives from git and PR events. **An agent never writes to the board.**

| Column | Enters when | Set by |
|---|---|---|
| Backlog | Issue created | auto-add workflow |
| Ready | Criteria present + `agent-ready` label | PM drafts, you approve |
| In progress | Branch pushed / draft PR | PR event |
| In review | Gate passed, PR ready | PR event |
| Done | PR merged | merge + `Closes #n` |
| Blocked | Agent halted | `blocked` label + comment |

GitHub Projects covers most transitions with built-in workflows; the rest is a few lines of Action.

Self-reported status is unverified. "In review" should mean the gate passed — not that an agent believes it finished.

---

## Ready gate

`agent-ready` requires:

- What "done" looks like, checkable — not "improve X"
- Which package(s) it touches
- What's explicitly out of scope

No criteria, no run. This is the highest-leverage filter in the system: a vague issue produces a bad diff no review can rescue, and you pay full price discovering that.

---

## Versioning and releases

**The version derives from the diff, not from a judgment call at release time.**

PM writes a changeset file as part of the PR — which package changed, bump type, one line for the notes. It lands in the diff, so it gets reviewed alongside the code it describes. CI computes versions, tags, and release notes on merge.

```bash
pnpm changeset          # PM writes this, in the PR
# merge → CI: version bump + tag + notes
```

Why not let the agent tag directly: a tag is pulled by people and deploy systems within minutes, so moving or deleting one is worse than shipping a wrong number. Same rule as everything else here — the agent proposes, an artifact decides.

**Monorepo specifics:**

- Packages get independent versions. `packages/email` at 2.1.0 while `packages/db` is at 5.0.0 is normal and correct.
- Apps aren't published, so they don't need semver. Tag them by date or commit.
- A breaking change in `packages/db` is a major bump *and* forces every consumer to update — PM should say which packages are affected in the changeset.

**Rollback:** revert the commit and ship a new patch. Never delete or move a tag.

**Branch and tag hygiene** — deterministic, so put it in cron, not an agent: delete merged branches, flag branches with no commits in 30 days, verify every tag points at a commit on `main`.

---

## When it stalls

Two cycles with a finding outstanding, or no drop in failures between cycles → stop, label `blocked`, comment with what was tried. A third cycle churns; it doesn't converge.

Same failure across issues means a template problem, not a task problem. Fix it once in `gate.sh` or the shared package — that's what the `upstream:` line in `AGENTS.md` §9 feeds.
