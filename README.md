# Agent Team — Claude Code 多 Agent 协作团队

<p align="center">
  <strong>一个运行在 Claude Code 中的多 Agent 协作开发团队</strong>
</p>

<p align="center">
  策划师制定计划 · 开发者编写代码 · 测试员验证成果 · 项目经理统一调度
</p>

---

## 这是什么？

Agent Team 是一个 Claude Code Skill，让你在 Claude Code 中拥有一个完整的软件开发团队：

- **项目经理**（你对话中的主 Agent）— 理解需求、调度团队、汇报进度
- **策划师** — 分析需求，制定详细的分步开发计划
- **开发者** — 按计划编写代码，修复 Bug
- **测试员** — 验证功能，浏览器截图，报告问题

所有 Agent 通过共享 Markdown 文件实时通信，全程自动化。你只需要提需求，团队帮你完成。

## 快速开始

### 1. 复制 Skill 文件

将 `agent-team/` 目录复制到你的 Claude Code skills 目录：

```bash
# macOS / Linux
cp -r agent-team ~/.claude/skills/

# Windows (PowerShell)
Copy-Item -Recurse agent-team $env:USERPROFILE\.claude\skills\
```

### 2. 启动 Claude Code

```bash
claude
```

### 3. 激活团队

```
/agent-team
```

然后告诉项目经理你的需求，例如：

> "帮我创建一个带计数功能的 HTML 页面"

团队会自动完成：策划 → 开发 → 测试 → 报告。

## 文件结构

```
agent-team/
├── skill.md              # 项目经理编排规则
├── prompts/
│   ├── planner.md        # 策划师系统提示词
│   ├── developer.md      # 开发者系统提示词
│   └── tester.md         # 测试员系统提示词
└── template/
    └── comm-log.md       # 共享通信日志模板
```

## 工作流

```
用户需求 → 项目经理
              │
    ┌─────────┼─────────┐
    ▼         ▼         ▼
 策划师    开发者    测试员
 (计划)    (编码)    (测试)
    │         │         │
    └─────────┼─────────┘
              ▼
     agent-team-log.md
     (共享通信日志)
```

## 自定义模型

编辑 `skill.md` 底部的模型配置：

```markdown
- 策划师：opus     ← 可改为 sonnet / haiku
- 开发者：opus     ← 可改为 sonnet / haiku
- 测试员：sonnet   ← 可改为 opus / haiku
```

模型参数（opus / sonnet / haiku）映射到 `settings.json` 中配置的实际模型，兼容任何 Anthropic 兼容 API。

## 详细文档

完整创建指南和配置说明请参阅 [agent-team-创建指南.md](./agent-team-创建指南.md)。

---

# Agent Team — Multi-Agent Dev Team for Claude Code

<p align="center">
  <strong>A multi-agent development team running inside Claude Code</strong>
</p>

<p align="center">
  Planner designs · Developer codes · Tester verifies · PM orchestrates
</p>

---

## What is this?

Agent Team is a Claude Code Skill that gives you a complete software development team:

- **Project Manager** (your main agent) — understands requirements, dispatches work, reports progress
- **Planner** — analyzes requirements, creates detailed step-by-step plans
- **Developer** — writes code according to the plan, fixes bugs
- **Tester** — verifies features, takes browser screenshots, reports issues

All agents communicate through a shared Markdown file. Fully automated — you just describe what you want.

## Quick Start

### 1. Copy the Skill

```bash
# macOS / Linux
cp -r agent-team ~/.claude/skills/

# Windows (PowerShell)
Copy-Item -Recurse agent-team $env:USERPROFILE\.claude\skills\
```

### 2. Launch Claude Code

```bash
claude
```

### 3. Activate the Team

```
/agent-team
```

Then tell the PM what you need:

> "Build a landing page with a hero section and contact form"

The team handles everything: plan → develop → test → report.

## File Structure

```
agent-team/
├── skill.md              # PM orchestration rules
├── prompts/
│   ├── planner.md        # Planner system prompt
│   ├── developer.md      # Developer system prompt
│   └── tester.md         # Tester system prompt
└── template/
    └── comm-log.md       # Shared communication log template
```

## Workflow

```
User Request → Project Manager
                    │
    ┌───────────────┼───────────────┐
    ▼               ▼               ▼
  Planner       Developer        Tester
  (designs)     (codes)          (tests)
    │               │               │
    └───────────────┼───────────────┘
                    ▼
           agent-team-log.md
           (shared comm log)
```

## Customizing Models

Edit the model section at the bottom of `skill.md`:

```markdown
- Planner：opus     ← change to sonnet / haiku
- Developer：opus   ← change to sonnet / haiku
- Tester：sonnet    ← change to opus / haiku
```

Model keys map to your `settings.json` configuration. Compatible with any Anthropic-compatible API.

## Documentation

See [agent-team-创建指南.md](./agent-team-创建指南.md) for the full setup guide (in Chinese).

## License

MIT
