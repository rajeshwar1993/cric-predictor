---
name: build-feature
description: >
  Use this skill when the user wants to build a new feature, implement a requirement, or start development work on a task.
  Trigger on phrases like: "build", "implement", "create feature", "develop", "I want to add", "new feature",
  "let's build", "start working on", "feature request", or any description of product functionality to be built.
  This skill orchestrates a multi-agent team through a structured product development lifecycle — from requirements
  gathering through code delivery. Even for seemingly simple tasks, use this skill if the user frames it as a feature.
---

# Skill: Build Feature

This skill orchestrates the full feature development lifecycle using a **multi-agent team**.
You — the Claude instance reading this — will assume the role of the **TPM (Technical Product Manager)**.

Read `.claude/agents/tpm.md` FIRST to understand your role and orchestration rules.

## CRITICAL: Multi-Agent Execution via Agent Tool

This workflow MUST be executed as an **agent team using Claude Code's `Agent` tool** (subagent spawning).
You are the **orchestrator agent (TPM)**. You do NOT do the work yourself. You delegate to specialized subagents.

**How to spawn agents:**
- Use the **`Agent` tool** to spawn each agent as a subagent.
- In the `Agent` tool prompt, ALWAYS include:
  1. The agent's role definition: "Read and follow the instructions in `.claude/agents/[agent-name].md`"
  2. The specific assignment for this phase.
  3. All relevant context documents (by file path — the subagent can read them).
  4. The expected output file path (where to save the deliverable).
- Each `Agent` call creates an independent subagent with its own context. It cannot see other agents' work unless you pass file paths.

**Parallel execution:**
- When the workflow says "in parallel", launch multiple `Agent` calls simultaneously — do NOT wait for one to finish before starting the next.
- When the workflow says "sequential" or one task depends on another's output, wait for the first `Agent` to complete before launching the next.

**Agent ≠ You:**
- Do NOT write requirements yourself — spawn the PM agent via `Agent`.
- Do NOT write code yourself — spawn the PSE agent via `Agent`.
- Do NOT write tests or review code yourself — spawn the QA / reviewer agent via `Agent`.
- Your job is to coordinate, review agent outputs for coherence, and present deliverables to the user at gates.

**Example Agent call pattern:**
```
Agent prompt: "You are the PM agent. Read and follow your instructions in .claude/agents/pm.md.

Your assignment: Create a detailed requirements document for the following feature:
[paste user requirement here]

Context:
- Save the output to: docs/feature_docs/[short-description]/requirements.md
- Refer to the codebase analysis at: docs/feature_docs/[short-description]/codebase-analysis.md (if it exists)
- Follow the requirements document template defined in your agent instructions.
- Make reasonable assumptions and flag them rather than leaving gaps."
```

## Pre-Flight Checks

Before starting, verify:
1. You are in a git repository.
2. Run `git status` to confirm clean working state (or stash changes).
3. Confirm the `docs/feature_docs/` directory exists (create if not).
4. Check that `.claude/agents/` contains all agent definition files.

## Phase 0: Initialization

1. Parse the user's requirement. Extract the core ask.
2. Generate a short kebab-case description (e.g., `user-profile-page`, `payment-retry-logic`).
3. Create the feature branch:
   ```bash
   git checkout -b feature/[short-description]
   ```
4. Create the feature docs directory:
   ```bash
   mkdir -p docs/feature_docs/[short-description]
   ```
5. Create `docs/feature_docs/[short-description]/_manifest.md`:
   ```markdown
   # Feature: [Name]
   **Branch**: feature/[short-description]
   **Started**: [date]
   **Status**: In Progress

   ## Document Inventory
   | Document                  | Status  | Agent       |
   |---------------------------|---------|-------------|
   | requirements.md           | Pending | PM          |
   | codebase-analysis.md      | Pending | PSE         |
   | technical-architecture.md | Pending | PSE         |
   | ui-ux-spec.md             | Pending | UI/UX       |
   | copy-spec.md              | Pending | Copywriter  |
   | test-plan.md              | Pending | QA          |
   | qa-review.md              | Pending | QA          |
   | code-review.md            | Pending | PSE         |
   | feature-summary.md        | Pending | Doc Writer  |
   ```

6. Present the **Feature Kickoff Brief** (see TPM agent definition) to the user.
7. Wait for user confirmation to proceed.

## Phase 1: Discovery (Parallel Execution)

Launch TWO `Agent` tool calls **simultaneously** (do not wait for one before starting the other):

### Track A — Requirements (PM Agent)
Use `Agent` tool to spawn the PM agent:
- description: "PM agent - requirements"
- prompt: "Read and follow your agent instructions in `.claude/agents/pm.md`. Your assignment: Create a detailed requirements document for the following feature: [insert the user's raw requirement here]. Instructions: Save output to: docs/feature_docs/[short-description]/requirements.md. Make reasonable assumptions and flag them. Categorize requirements as P0 (must-have for v1), P1 (should-have), P2 (nice-to-have/v2). Follow the requirements document template in your agent definition."

### Track B — Codebase Analysis (PSE Agent in Reverse Engineering Mode)
Use `Agent` tool to spawn the PSE agent:
- description: "PSE agent - codebase analysis"
- prompt: "Read and follow your agent instructions in `.claude/agents/pse.md`. You are operating in REVERSE ENGINEERING MODE. Your assignment: Analyze the current codebase and produce a codebase analysis document. Instructions: Save output to: docs/feature_docs/[short-description]/codebase-analysis.md. Focus on: project structure, tech stack, database schema, existing patterns, and code areas relevant to this feature: [brief feature description]. Follow the Codebase Analysis Document template in your agent definition."

Wait for BOTH to complete before proceeding.

## Phase 2: Design Enrichment (Conditional, Parallel)

Review the requirements document. Decide:

**Does this feature have UI components?**
→ YES: Use `Agent` tool to spawn `ui-ux-designer` agent with:
  - Instruction to read `.claude/agents/ui-ux-designer.md`
  - The `requirements.md` path
  - The `codebase-analysis.md` path (so it knows the existing design system)
  - Instruction to produce `ui-ux-spec.md` in the feature docs directory

**Does this feature have user-facing text, marketing pages, or in-app copy?**
→ YES: Use `Agent` tool to spawn `copywriter` agent with:
  - Instruction to read `.claude/agents/copywriter.md`
  - The `requirements.md` path
  - The `ui-ux-spec.md` path (if UI/UX was spawned — wait for it first, or share requirements only if they are independent)
  - Instruction to produce `copy-spec.md` in the feature docs directory

If NEITHER is needed, skip to Phase 3.

Once design enrichment is complete, **update the requirements document** with any changes from UI/UX and copy specs. The PM agent should review and incorporate, or you (TPM) can do this directly if the changes are straightforward.

## Phase 3: Architecture & Detailed Requirements

Use `Agent` tool to spawn `pse` agent in **Architecture Design Mode** with:
- The final `requirements.md` (including design enrichment updates)
- The `codebase-analysis.md`
- The `ui-ux-spec.md` (if it exists)
- Instruction to produce `technical-architecture.md` covering:
  - Data model changes with migrations
  - API endpoints with contracts
  - Component hierarchy (if frontend)
  - Supabase-specific considerations (RLS, Edge Functions, Realtime)
  - Integration plan with existing code
  - File-by-file change plan

In parallel, use `Agent` tool to spawn `documentation-writer` to create an **Architecture Decision Record** if any significant architectural choices were made.

### GATE 1: User Review

Present to the user:
1. `requirements.md` (final version)
2. `technical-architecture.md`
3. `ui-ux-spec.md` (if created)
4. `copy-spec.md` (if created)

Ask: "Please review these documents. Reply with approval, or provide feedback for revisions."

**DO NOT PROCEED PAST THIS GATE UNTIL THE USER APPROVES.**

If the user provides feedback:
- Route requirement changes to the PM agent.
- Route architecture changes to the PSE agent.
- Route design changes to the UI/UX agent.
- Route copy changes to the Copywriter agent.
- Re-present for review.

## Phase 4: Implementation

Once Gate 1 is passed, begin coding.

### Step 4a: Plan the Work Split

Based on the technical architecture, decide if the work should be split:

**If the feature involves BOTH frontend and database/backend changes:**
Use `Agent` tool to spawn TWO PSE agents **simultaneously** with strict domain separation:
- **PSE-Supabase**: Owns database migrations, RLS policies, database functions, Edge Functions, type generation.
  - Agent prompt must include: "Read `.claude/agents/pse.md`. You are PSE-SUPABASE. You ONLY own files in the `supabase/` directory and generated types. Do NOT touch React components or Next.js pages."
  - Input: `technical-architecture.md` (database sections), `codebase-analysis.md`
- **PSE-Frontend**: Owns Next.js pages, components, hooks, API route handlers, client logic.
  - Agent prompt must include: "Read `.claude/agents/pse.md`. You are PSE-FRONTEND. You ONLY own files in the Next.js project. Do NOT touch `supabase/migrations/` or write raw SQL."
  - Input: `technical-architecture.md` (frontend sections), `codebase-analysis.md`, `ui-ux-spec.md`, `copy-spec.md`
  - **Important**: PSE-Frontend MUST wait for PSE-Supabase to complete type generation before starting work that depends on database types.

**Execution Order for Split Work:**
1. PSE-Supabase writes migrations and generates types.
2. PSE-Frontend begins work (can start on components that don't need DB types immediately).
3. Both agents commit their work independently.

**If the feature is purely frontend or purely backend:**
Spawn a single PSE agent.

### Step 4b: Parallel QA Preparation

While coding is in progress, use `Agent` tool to spawn `qa-engineer` agent to:
- Read all requirements and architecture docs.
- Study the existing codebase flows.
- Prepare the `test-plan.md` document.
- Build knowledge of the full application flow so it can review code effectively later.

### Step 4c: Parallel Documentation

Use `Agent` tool to spawn `documentation-writer` to begin drafting:
- API documentation (from the architecture doc — can be finalized after coding).
- Any README updates needed.

## Phase 5: Code Review

Once implementation is complete:

1. Use `Agent` tool to spawn a **fresh PSE agent** (this MUST be a new `Agent` call — NOT the same subagent that wrote the code) in **Code Review Mode** with:
   - All requirements and architecture docs.
   - Instruction to review ALL code changes on the feature branch.
   - The code review should result in `code-review.md`.

2. If the review has 🔴 **Blocker** issues:
   - Route fixes back to the original implementation PSE agent(s).
   - Re-run the review after fixes.
   - Repeat until no blockers remain.

## Phase 6: QA Review

Once code review passes:

1. Send ALL code changes to the `qa-engineer` agent (which has been preparing since Phase 4b).
2. The QA agent should:
   - Execute its prepared test plan against the actual code.
   - Trace all data flows end-to-end.
   - Check for security issues, edge cases, and error handling.
   - Produce `qa-review.md`.

3. If the QA review has 🔴 **Critical** issues:
   - Route fixes to the PSE implementation agent.
   - Re-run QA review.
   - Repeat until no critical issues remain.

## Phase 7: Finalization

1. Use `Agent` tool to spawn `documentation-writer` to produce:
   - Final `feature-summary.md`.
   - Updated API docs (if applicable).
   - Any README updates.
   - Ensure all docs in the feature directory are complete and consistent.

2. Update `_manifest.md` — all documents should show "Complete" status.

3. Ensure all changes are committed on the feature branch with clean, descriptive commit messages.

### GATE 2: Final User Review

Present to the user:
1. A summary of what was built (from `feature-summary.md`).
2. The code review results.
3. The QA review results.
4. List of all files changed.

Ask: "Feature implementation is complete. Please review. Ready to merge or any changes needed?"

## Error Recovery

- **Agent produces garbage**: Do not retry with the same prompt. Analyze what went wrong, refine the context, and respawn with improved instructions.
- **Codebase too large**: Break reverse-engineering into module-focused tasks. Give each PSE agent a specific directory or domain to analyze.
- **Conflicting agent outputs**: TPM (you) resolves conflicts. Document the resolution in an ADR.
- **User goes silent at a gate**: Ping once with a summary. Do not proceed without approval.
- **Git conflicts**: If the feature branch falls behind main, rebase before code review.

## Token / Context Management

- Each agent should receive ONLY the documents relevant to its task. Don't dump all docs into every agent.
- For large codebases, use targeted file references rather than loading entire directories.
- If a phase produces very large outputs, summarize key points for downstream agents and reference the full doc by path.
