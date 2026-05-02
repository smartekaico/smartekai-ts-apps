# Graph Report - smartekai-saas  (2026-05-02)

## Corpus Check
- 10 files · ~1,936 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 16 nodes · 7 edges · 1 communities detected
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- [[_COMMUNITY_Community 0|Community 0]]

## God Nodes (most connected - your core abstractions)
1. `getCreditBalance()` - 2 edges
2. `hasEnoughCredits()` - 2 edges

## Surprising Connections (you probably didn't know these)
- None detected - all connections are within the same source files.

## Communities

### Community 0 - "Community 0"
Cohesion: 0.5
Nodes (2): getCreditBalance(), hasEnoughCredits()

## Knowledge Gaps
- **Thin community `Community 0`** (5 nodes): `addCreditsToOrg()`, `consumeCredits()`, `getCreditBalance()`, `hasEnoughCredits()`, `credit-manager.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.

## Suggested Questions
_Not enough signal to generate questions. This usually means the corpus has no AMBIGUOUS edges, no bridge nodes, no INFERRED relationships, and all communities are tightly cohesive. Add more files or run with --mode deep to extract richer edges._