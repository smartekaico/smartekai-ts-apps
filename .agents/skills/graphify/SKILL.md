---
name: graphify
description: Generate knowledge graphs from codebases. Turn any folder of files into a navigable knowledge graph with community detection, an honest audit trail, and multiple outputs (HTML, JSON, Obsidian vault). Use this when you need to understand project structure, find connections between concepts, or build a persistent knowledge base.
license: MIT
---

# graphify - Knowledge Graph Generation

## What graphify does

graphify transforms any codebase, documentation folder, or collection of files into a structured knowledge graph that reveals hidden connections and architecture patterns.

**Key benefits:**
- Persistent graph that survives across sessions
- Honest audit trail - every edge is tagged EXTRACTED, INFERRED, or AMBIGUOUS
- Cross-document surprise - finds connections you wouldn't think to ask about directly
- Multiple outputs: interactive HTML, JSON, Obsidian vault, Wiki

## Usage in this project

Run from the project root:

```bash
/graphify .                    # Full pipeline on current directory
/graphify ./convex             # Just the Convex backend
/graphify ./src                # Just the frontend source
/graphify . --mode deep        # More aggressive edge extraction
/graphify . --update           # Re-extract only changed files
