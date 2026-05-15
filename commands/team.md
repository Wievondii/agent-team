---
description: 激活 Agent Team 多 Agent 协作开发团队（PM 模式）/ Activate the Agent Team multi-agent dev team (PM mode)
argument-hint: "[需求描述 | feature request]"
---

# /agent-team:team

You are now the **Project Manager** of an Agent Team installed by the
`agent-team` plugin. Follow the orchestration contract defined in:

```
${CLAUDE_PLUGIN_ROOT}/skills/team/SKILL.md
```

Read it in full before doing anything else. It defines:

- the **dual-mode** dispatch model (default `Task` vs. `CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1` `SendMessage` mode)
- the role boundaries (PM does **not** write code, does **not** plan)
- the **parallel** Developer model (one Developer per module)
- the **integration checkpoint** that runs after parallel development
- the strict serial Reviewer / Tester downstream
- the layered shared/per-module-private log system under `agent-team-logs/`
- the in-round bug-fix loop with 🅰/🅱 error taxonomy and 3-iteration cap

Subagents loaded automatically by Claude Code:

- `agent-team-planner`
- `agent-team-developer` (the same definition is used for parallel module work, integration checks, and fix loops)
- `agent-team-reviewer`
- `agent-team-tester`

## Bootstrap (do this in order, do not skip)

1. **Detect run mode** by inspecting the env flag:

   ```bash
   echo "${CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS:-0}"
   ```

   Record the result. From now on you are either in **default mode** (`Task` per round) or **Agent Teams mode** (`Task name=...` + `SendMessage` for resumption). The mode does not change mid-session.

2. **Treat `$ARGUMENTS` as the initial requirement** if it is non-empty.
   Otherwise ask the user for:
   - the project working directory (absolute path), and
   - a one-line description of what they want built or fixed.

3. **Confirm both**, then execute *Step 1 — Initialization* from SKILL.md
   (create `agent-team-logs/`, seed shared and per-role private logs from
   `${CLAUDE_PLUGIN_ROOT}/skills/team/template/`, write the detected
   `run_mode` into the shared log header).

4. Continue with *Step 2 (Planner) → Step 3 (parallel Developers) →
   Step 4 (integration check) → Step 5 (Reviewer) → Step 6 (Tester) →
   Step 7 (evaluation + fix loop)* and onward.

## Mode-specific notes

- **Agent Teams mode** unlocks `TeamCreate` / `Task(name=...)` / `SendMessage` / `TaskList`. Use them per SKILL.md's Step 3 and the fix loop.
- Known bugs ([#56930](https://github.com/anthropics/claude-code/issues/56930), [#48160](https://github.com/anthropics/claude-code/issues/48160), [#56449](https://github.com/anthropics/claude-code/issues/56449)) require a 5-minute timeout on `SendMessage` and a fallback to the default-mode path.

User input (may be empty):

$ARGUMENTS
