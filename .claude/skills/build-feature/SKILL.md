---
name: build-feature
description: >
  Use this skill when the user wants to build a new feature, implement a requirement, or start development work on a task.
  Trigger on phrases like: "build", "implement", "create feature", "develop", "I want to add", "new feature",
  "let's build", "start working on", "feature request", or any description of product functionality to be built.
  This skill orchestrates a streamlined 3-phase workflow: brainstorm & plan, build, review.
---

# Skill: Build Feature

This skill runs a **3-phase feature development workflow**: Plan → Build → Review.

You — the Claude instance reading this — are the **orchestrator**. You coordinate the phases, spawn agents when needed, and present results to the user.

## Pre-Flight

1. Confirm you are in a git repository with a clean working state (`git status`).
2. Parse the user's requirement. Extract the core ask.
3. Generate a short kebab-case description (e.g., `match-countdown`, `group-invite-flow`).
4. Create the feature branch:
   ```bash
   git checkout -b feature/[short-description]
   ```

---

## Phase 1: Brainstorm & Plan

**Goal**: Get clear requirements and a concrete implementation plan. One user approval gate.

### Step 1a: Refine Requirements (if needed)

**If the requirement is vague or complex** (multi-screen feature, unclear edge cases, product decisions needed):
- Spawn the **PM agent** via `Agent` tool for an interactive brainstorming session with the user.
- Agent prompt: `"Read and follow your instructions in .claude/agents/pm.md. The user wants to build: [requirement]. Work with them to refine this into clear requirements. Ask clarifying questions, make product decisions, identify edge cases, and define scope."`
- The PM agent will iterate with the user and produce a concise requirements summary.

**If the requirement is already clear** (small feature, well-defined scope, user knows exactly what they want):
- Skip the PM agent. Proceed directly to planning.

### Step 1b: Create Implementation Plan

Read the relevant codebase files directly — do NOT spawn a separate codebase analysis agent. Identify:
- Which files need to be created or modified
- Data model changes (if any)
- Key architectural decisions
- Integration points with existing code

Present a concise plan to the user:

```
## Implementation Plan: [Feature Name]

### What We're Building
[1-2 sentences]

### Files to Create
- [file path] — [purpose]

### Files to Modify
- [file path] — [what changes]

### Key Decisions
- [Decision + reasoning]

### Database Changes
- [Migrations needed, or "None"]
```

### GATE: User Approval

Present the plan. **Do NOT proceed until the user approves.** If they provide feedback, adjust the plan and re-present.

---

## Phase 2: Build

Once the plan is approved, implement the feature.

### Single-Domain Feature (frontend-only OR backend-only)

Spawn **one PSE agent** via `Agent` tool:
- Agent prompt: `"Read and follow your instructions in .claude/agents/pse.md. Implement the following feature: [plan summary]. Files to read first: [list specific file paths]. Follow existing code patterns."`
- Pass the approved plan and specific file paths — not the entire codebase.

### Cross-Domain Feature (frontend + Supabase changes)

Spawn **two PSE agents** with strict domain separation:

1. **PSE-Supabase** (runs first if frontend depends on DB types):
   - Prompt: `"Read .claude/agents/pse.md. You are PSE-SUPABASE. You ONLY own files in the supabase/ directory and generated types. Implement: [database-related parts of the plan]."`

2. **PSE-Frontend** (runs after Supabase agent if it needs generated types, or in parallel if independent):
   - Prompt: `"Read .claude/agents/pse.md. You are PSE-FRONTEND. You ONLY own files in the Next.js project (web-app/). Implement: [frontend parts of the plan]."`

### During Build

- Let the PSE agent(s) make implementation decisions. Don't over-prescribe — the plan should say WHAT, the PSE decides HOW.
- If a PSE agent encounters ambiguity, it should make a reasonable decision and note it, not block.
- **Remind PSE agents**: If there are UI component changes, Storybook stories must be added/updated. If there are new user flows, E2E tests in `web-app/e2e/tests/` must be added/updated.

---

## Phase 3: Review

Once implementation is complete, spawn a **fresh Reviewer agent** via `Agent` tool:

- Agent prompt: `"Read and follow your instructions in .claude/agents/reviewer.md. Review all code changes on this feature branch. The feature plan: [plan summary]. Run git diff main...HEAD to see all changes. Focus on real bugs, security issues, and missed edge cases. Also verify: UI components have Storybook stories, and new user flows have E2E test coverage."`
- The reviewer MUST be a new agent — not the same one that wrote the code.

### If the review finds blockers:

1. Route the specific fixes back to a PSE agent (can be the original or a new one).
2. After fixes, spawn a fresh reviewer to re-check.
3. Repeat until no blockers remain.

### If the review is clean:

Present a summary to the user:
1. What was built (brief).
2. Review results (blockers fixed, remaining warnings/suggestions).
3. List of files changed.

---

## What This Skill Does NOT Do

- **No codebase analysis documents.** Agents read the code directly.
- **No architecture documents.** The implementation plan IS the architecture.
- **No mandatory feature docs directory.** Create docs only if the user asks.
- **No manifest files.** Track progress through the conversation, not metadata files.
- **No traceability matrices.** If something's wrong, the reviewer will find it.
- **No documentation phase.** Write docs only when the user explicitly requests them.

## Error Recovery

- **Agent produces poor output**: Don't retry with the same prompt. Analyze what went wrong, give better context (specific file paths, clearer constraints), and respawn.
- **Conflicting agent outputs** (e.g., PSE-Frontend and PSE-Supabase disagree on a contract): You resolve it based on the plan. If the tradeoff is significant, ask the user.
- **User goes silent at the gate**: Ping once with a summary. Don't proceed without approval.
- **Git conflicts**: Rebase on main before the review phase.

## Token / Context Management

- Give each agent ONLY the files relevant to its task. Specific paths, not entire directories.
- For large features, break the implementation into sequential chunks rather than one massive agent prompt.
- Pass the plan as concise text, not a file reference that the agent has to read and re-parse.
