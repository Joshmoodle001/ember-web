---
description: Capture current OpenCode session summary into continue.md, then refresh Josh AI Brain
agent: build
---

Update `continue.md` with a fresh session summary.

Include:
1. Current project
2. Current branch
3. What was done in this session
4. Files changed
5. Current lint/build status
6. Open decisions
7. Risks
8. Next recommended step
9. Which subagents were used
10. What Josh Brain should remember

Then run this PowerShell command exactly:

cd "C:\Users\joshm\Desktop\josh-ai-brain-improved-starter-pack\josh-ai-brain"; .\brain.ps1 scan; .\brain.ps1 sync; .\brain.ps1 session; .\brain.ps1 report

After it completes, report whether Josh Brain was refreshed.
