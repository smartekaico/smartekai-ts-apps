# Graph Report - ai-law-copilot  (2026-05-02)

## Corpus Check
- 270 files · ~217,369 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 611 nodes · 545 edges · 23 communities detected
- Extraction: 82% EXTRACTED · 18% INFERRED · 0% AMBIGUOUS · INFERRED: 98 edges (avg confidence: 0.8)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- [[_COMMUNITY_Community 0|Community 0]]
- [[_COMMUNITY_Community 1|Community 1]]
- [[_COMMUNITY_Community 2|Community 2]]
- [[_COMMUNITY_Community 3|Community 3]]
- [[_COMMUNITY_Community 4|Community 4]]
- [[_COMMUNITY_Community 5|Community 5]]
- [[_COMMUNITY_Community 6|Community 6]]
- [[_COMMUNITY_Community 7|Community 7]]
- [[_COMMUNITY_Community 9|Community 9]]
- [[_COMMUNITY_Community 11|Community 11]]
- [[_COMMUNITY_Community 12|Community 12]]
- [[_COMMUNITY_Community 13|Community 13]]
- [[_COMMUNITY_Community 14|Community 14]]
- [[_COMMUNITY_Community 16|Community 16]]
- [[_COMMUNITY_Community 17|Community 17]]
- [[_COMMUNITY_Community 18|Community 18]]
- [[_COMMUNITY_Community 22|Community 22]]
- [[_COMMUNITY_Community 24|Community 24]]
- [[_COMMUNITY_Community 25|Community 25]]
- [[_COMMUNITY_Community 32|Community 32]]
- [[_COMMUNITY_Community 33|Community 33]]
- [[_COMMUNITY_Community 34|Community 34]]
- [[_COMMUNITY_Community 41|Community 41]]

## God Nodes (most connected - your core abstractions)
1. `POST()` - 50 edges
2. `GET()` - 40 edges
3. `DELETE()` - 16 edges
4. `verifyAdmin()` - 8 edges
5. `approveDemoRequest()` - 8 edges
6. `retrieveChunks()` - 8 edges
7. `composeSystemPrompt()` - 7 edges
8. `ensureAdmin()` - 6 edges
9. `deleteDemoRequest()` - 5 edges
10. `submitDemoRequest()` - 5 edges

## Surprising Connections (you probably didn't know these)
- `testUpstash()` --calls--> `GET()`  [INFERRED]
  scratch/test_upstash.ts → src/app/api/cron/purge/route.ts
- `verifyIsolation()` --calls--> `DELETE()`  [INFERRED]
  scripts/verify-isolation.ts → src/app/api/legal/documents/[id]/route.ts
- `cleanup()` --calls--> `DELETE()`  [INFERRED]
  scripts/cleanup-users.ts → src/app/api/legal/documents/[id]/route.ts
- `verifyIsolation()` --calls--> `vectorSearch()`  [INFERRED]
  scripts/verify-isolation.ts → src/lib/kb/retrieve.ts
- `main()` --calls--> `generateEmbedding()`  [INFERRED]
  scripts/ingest.ts → src/lib/embeddings.ts

## Communities

### Community 0 - "Community 0"
Cohesion: 0.04
Nodes (17): registerWithInviteAction(), AdminAlertEmail(), getAuthenticatedSession(), handleRawAuthError(), cleanup(), sendContactEmail(), handleSubmit(), submitDemoRequest() (+9 more)

### Community 1 - "Community 1"
Cohesion: 0.05
Nodes (26): createAuditLog(), embedBatch(), embedMultimodal(), embedSingle(), cleanExtractedText(), extractTextFromFile(), detectRetrievalIntent(), getActiveModel() (+18 more)

### Community 2 - "Community 2"
Cohesion: 0.1
Nodes (18): confirmDelete(), handleApproveRequest(), handleCancelInvite(), handleGenerateInvite(), approveDemoRequest(), cancelInvite(), deleteDemoRequest(), deleteSubscriber() (+10 more)

### Community 3 - "Community 3"
Cohesion: 0.08
Nodes (11): checkEmailApprovedAction(), async(), cn(), fetchDocument(), fetchInvitation(), fetchProject(), handleDeleteDoc(), handleMagicLink() (+3 more)

### Community 4 - "Community 4"
Cohesion: 0.12
Nodes (13): getFullMessageContent(), handleAbortFormat(), handleCopy(), handleQuickAction(), handleSaveFullChat(), handleSaveToSession(), handleSmartFormat(), onFormSubmit() (+5 more)

### Community 5 - "Community 5"
Cohesion: 0.21
Nodes (9): detectTaskType(), generateLegalAnswer(), buildContextBlock(), deduplicateChunks(), hybridSearch(), retrieveChunks(), vectorSearch(), test() (+1 more)

### Community 6 - "Community 6"
Cohesion: 0.15
Nodes (3): getLocalizedCategoryName(), getTagLabel(), getTagLabel()

### Community 7 - "Community 7"
Cohesion: 0.18
Nodes (5): AdminCreditRequestEmail(), requestManualTopup(), handleManualRequest(), getPostHogClient(), UserCreditRequestConfirmedEmail()

### Community 9 - "Community 9"
Cohesion: 0.22
Nodes (4): handleSubmit(), updateProfile(), updateWorkspace(), handleSubmit()

### Community 11 - "Community 11"
Cohesion: 0.25
Nodes (6): addCreditsToOrg(), calculateWeightedCredits(), consumeCredits(), calculateWeight(), truncateContext(), ensureUserOrganization()

### Community 12 - "Community 12"
Cohesion: 0.29
Nodes (3): Alert(), handleRequestReset(), handleResetPassword()

### Community 13 - "Community 13"
Cohesion: 0.52
Nodes (6): addJurisdiction(), deleteJurisdiction(), ensureAdmin(), getJurisdictions(), toggleJurisdictionStatus(), updateJurisdiction()

### Community 14 - "Community 14"
Cohesion: 0.4
Nodes (3): getAllBlogPosts(), getBlogSlugs(), generateStaticParams()

### Community 16 - "Community 16"
Cohesion: 0.47
Nodes (4): handleDraft(), handleSaveDoc(), performSave(), proceedWithDraft()

### Community 17 - "Community 17"
Cohesion: 0.5
Nodes (3): generateEmbedding(), main(), simpleRecursiveSplit()

### Community 18 - "Community 18"
Cohesion: 0.4
Nodes (1): generateMetadata()

### Community 22 - "Community 22"
Cohesion: 0.6
Nodes (3): fetchAllSessions(), fetchWorkspaceData(), handleGlobalRefresh()

### Community 24 - "Community 24"
Cohesion: 0.5
Nodes (3): handleResearch(), handleSaveDoc(), performSave()

### Community 25 - "Community 25"
Cohesion: 0.83
Nodes (3): ensureAuthenticated(), getPublicCategories(), getPublicJurisdictions()

### Community 32 - "Community 32"
Cohesion: 0.67
Nodes (1): seed()

### Community 33 - "Community 33"
Cohesion: 1.0
Nodes (2): replaceInFile(), walkRegex()

### Community 34 - "Community 34"
Cohesion: 1.0
Nodes (2): replaceInFile(), walkRegex()

### Community 41 - "Community 41"
Cohesion: 1.0
Nodes (2): handleTitleSubmit(), handleUpdate()

## Knowledge Gaps
- **Thin community `Community 18`** (5 nodes): `generateMetadata()`, `page.tsx`, `page.tsx`, `page.tsx`, `page.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 32`** (3 nodes): `seed_categories.ts`, `seed-categories.ts`, `seed()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 33`** (3 nodes): `update_api_imports.mjs`, `replaceInFile()`, `walkRegex()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 34`** (3 nodes): `update_imports.mjs`, `replaceInFile()`, `walkRegex()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 41`** (3 nodes): `handleTitleSubmit()`, `handleUpdate()`, `DocumentLink.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `GET()` connect `Community 0` to `Community 1`, `Community 2`, `Community 3`, `Community 5`, `Community 9`, `Community 24`?**
  _High betweenness centrality (0.089) - this node is a cross-community bridge._
- **Why does `POST()` connect `Community 1` to `Community 0`, `Community 11`, `Community 4`, `Community 5`?**
  _High betweenness centrality (0.083) - this node is a cross-community bridge._
- **Why does `handleSubmit()` connect `Community 3` to `Community 0`?**
  _High betweenness centrality (0.028) - this node is a cross-community bridge._
- **Are the 25 inferred relationships involving `POST()` (e.g. with `getAuthenticatedSession()` and `GET()`) actually correct?**
  _`POST()` has 25 INFERRED edges - model-reasoned connections that need verification._
- **Are the 18 inferred relationships involving `GET()` (e.g. with `DELETE()` and `testUpstash()`) actually correct?**
  _`GET()` has 18 INFERRED edges - model-reasoned connections that need verification._
- **Are the 11 inferred relationships involving `DELETE()` (e.g. with `GET()` and `verifyIsolation()`) actually correct?**
  _`DELETE()` has 11 INFERRED edges - model-reasoned connections that need verification._
- **Are the 6 inferred relationships involving `approveDemoRequest()` (e.g. with `DELETE()` and `getPublicUrl()`) actually correct?**
  _`approveDemoRequest()` has 6 INFERRED edges - model-reasoned connections that need verification._