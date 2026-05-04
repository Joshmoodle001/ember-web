<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

---

# OpenCode Swarm Protocol

Use subagents when helpful. Do not do all project work as one Build-agent stream.

## Required subagent flow for risky or multi-step tasks

Before editing:
1. Use `@repo-mapper` to inspect relevant files and project structure.
2. Use `@lint-planner` to create a safe batch plan.
3. Return to Build only after the plan is clear.

During implementation:
1. Use `@type-fixer` for TypeScript typing cleanup.
2. Use `@react-hooks-reviewer` for React hooks, purity, immutability, and dependency issues.
3. Work in small batches.
4. Run validation after each batch.

After implementation:
1. Use `@tester` to run validation and summarize failures.
2. Use `@security-reviewer` before commits or risky changes.
3. Use `@memory-reporter` to update `continue.md`.

## Commit rule

Only commit when:
- `npm run lint` passes
- `npm run build` passes
- security review has no blocking issues

If lint fails, do not commit. Report remaining issues grouped by rule and file.
