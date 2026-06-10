<p align="right"><a href="./README.md">English</a> · <strong>v2.0</strong></p>

# Agent Team — Claude Code 多 Agent 协作开发团队

<p align="center">
  <strong>运行在 Claude Code 中的多 Agent 并行协作开发团队</strong><br>
  策划师设计 · 多个开发者并行编码 · 审查员把关 · 测试员验证 · 项目经理统一调度
</p>

> **v2.0 是破坏性升级**：并行架构、三类独立预算、五类错误路由、YAML frontmatter 严格 schema、append-only 事件日志、共享文件协调员模式。从 v1 升级请看 [MIGRATION.md](./MIGRATION.md)。
>
> **前置条件**：Node.js >= 18（校验脚本依赖；首次运行自动 `npm install`）。

---

## 这是什么？

Agent Team 是一个 **Claude Code plugin**，把开发流程拆给 5 个角色：

| 角色 | 职责 | 模型 |
|------|------|------|
| **PM**（项目经理 / 主对话）| 接收需求、调度团队、维护事件日志 + boulder.json 视图、路由错误 | — |
| **Planner** | 分析需求、定义接口/风格规范 + semantic_constraints、划分模块、产出 round-plan.md | opus |
| **Developer** ×N | **并行**实现各自模块；私有 dev-{module}.md 含 YAML frontmatter；强制贴 self_check 证据 | opus |
| **Reviewer** | 两种模式：reviewer（并行审查）+ committer（独占执行 git commit）| opus |
| **Tester** ×N | 并行测试；按 A/B/C/D/E 五类分类 Bug；severity 由 impact × frequency 矩阵自动推导 | sonnet |

**核心机制（v2.0）：**

- **并行执行** — 多个 Developer/Tester 在同一 turn 内并发拉起（Claude Code 的 Task 工具支持同 turn 多次调用并行执行）
- **task_id 持久化** — 测试发现 Bug 时 PM 用记录的 task_id 唤醒原 Developer 会话，上下文完整保留
- **三类独立预算** — `reviewer_rejection`(3) / `bug_fix_a`(3) / `bug_fix_b`(2) + `round_total`(8)。B 类不再吃掉 A 类的预算池
- **append-only 事件日志** — 所有 `boulder.json` 变更走 `boulder-events.jsonl` + `rebuild-boulder.mjs`，无并发竞态
- **强制 schema 校验** — dev-log / round-plan / bug-report 全部走 JSON Schema 硬校验
- **共享文件协调员** — 防并行写冲突：共享文件指定一个 coordinator 统一改，其他 Dev 写 `shared_file_requests`
- **回滚机制** — 每轮开始 `git tag round-N-baseline`，预算耗尽时可一键 reset

---

## 快速开始

### 1. 安装 Plugin

在 Claude Code 中：

```
/plugin marketplace add Wievondii/agent-team
/plugin install agent-team@wievondii-agent-team
```

**或本地安装（先 clone）：**

```bash
git clone https://github.com/Wievondii/agent-team.git
```

```
/plugin marketplace add /absolute/path/to/agent-team
/plugin install agent-team@wievondii-agent-team
```

### 2. 激活团队

```
/agent-team:team
```

然后告诉 PM 你的需求：

> "做一个带 Hero 区和联系表单的落地页"

团队会自动跑完整流程：**计划 → 并行开发 → 集成检查 → 并行审查 → 提交 → 并行测试 → 汇报**。

首次运行时 PM 启动钩子会自动安装校验脚本依赖（`ajv` / `fast-glob` / `proper-lockfile` / `yaml`）—— 用户无感知。`init-project.mjs` 脚本还会自动复制 Agent Guard hook 到项目目录并配置 `.claude/settings.json`。

---

## 工作流（v2.0）

```
用户需求 → PM（你的 Claude Code 主对话）
            │
0. 恢复检查（boulder.json）
            │
1. 计划阶段
   Planner → rounds/round-N/plan.md（YAML frontmatter，schema 校验）
   PM 跑 validate-plan.mjs + check-file-conflicts.mjs（必须通过）
            │
2. 并行开发
   PM 在同一 turn 中拉起 N 个 Developer（并行）
   每个写自己的 dev-{module}.md（frontmatter + self_check 证据）
   PM 跑 validate-dev-log.mjs（必须通过）
            │
3. 集成检查（N > 1 时执行）
   集成负责人验证调用链路
   失败 → 修复 + 简化审查（typecheck + 接口契约测试）
            │
4. 两阶段审查
   4a. N 个 Reviewer 并行（仅写报告，不提交）
   4b. 1 个 Committer 独占执行 git add + git commit
            │
5. 并行测试
   PM 在同一 turn 中拉起 N 个 Tester
   每个把 Bug 写到 rounds/round-N/test.md（frontmatter，schema 校验）
            │
6. 错误路由（5 类）
   A → 唤醒 Developer（消耗 bug_fix_a）
   B → 唤醒 Planner + Developer（消耗 bug_fix_b）
   C → PM 自处理（环境/依赖）
   D → 立即 escalate 用户
   E → 唤醒 Tester 重写测试用例
            │
7. 汇报用户 → 询问反馈
            │
8. 轮次结束（archive-round.mjs）
```

---

## 文件结构

```
agent-team/
├── .claude-plugin/
│   ├── plugin.json          # v2.0.0 manifest
│   └── marketplace.json
├── agents/
│   ├── planner.md / developer.md
│   ├── reviewer.md          # reviewer/committer 两种模式
│   └── tester.md
├── commands/
│   └── team.md              # /agent-team:team 入口
├── skills/team/
│   ├── SKILL.md             # PM 角色 v2.0 工作流
│   ├── schemas/             # 5 个 JSON Schema
│   ├── scripts/             # 13 个 Node.js 校验/事件脚本
│   │   ├── package.json     # ajv / fast-glob / proper-lockfile / yaml
│   │   ├── ensure-deps.mjs / append-event.mjs / rebuild-boulder.mjs
│   │   ├── validate-* / check-* / heartbeat / archive-round / 等
│   │   └── lib/             # paths/locking/schema-loader/frontmatter/git-helpers/severity-matrix
│   └── template/            # round-* + dev-workspace + notepads/
├── LICENSE
├── MIGRATION.md             # v1 → v2 迁移指南
├── README.md / README.zh-CN.md
```

**运行时（PM 在你的项目里创建）：**

```
your-project/
└── agent-team-logs/
    ├── index.md                     # 索引文件
    ├── boulder.json                 # 状态视图（由事件重建，禁止直接编辑）
    ├── boulder-events.jsonl         # append-only 事件日志
    ├── rounds/round-N/
    │   ├── plan.md
    │   ├── review.md
    │   ├── test.md
    │   └── integration.md
    ├── dev-{module}.md              # 每个 Developer 私有，YAML frontmatter 严格 schema
    ├── notepads/                    # decisions / learnings / issues / verification / problems
    ├── shared-file-changes/round-N.md
    └── test-evidence/round-N/
```

---

## 系统要求

- **Claude Code**（支持 plugin）
- **Node.js >= 18**（校验脚本依赖；npm 依赖由 `ensure-deps.mjs` 首次运行时自动安装）
- **Git**（用于轮次 baseline tag + Committer）

---

## 自定义模型

编辑各 subagent frontmatter 的 `model:` 字段：

```yaml
---
name: agent-team-developer
model: opus    # 改成 sonnet / haiku
---
```

默认配置：

| 角色 | 模型 |
|------|------|
| Planner | opus |
| Developer | opus |
| Reviewer | opus |
| Tester | sonnet |

---

## v2.0 核心设计决策

1. **并行架构** — Developer / Tester 并行；Reviewer 也并行（多个 reviewer 分模块审，1 个 committer 独占提交）
2. **subagent 工具白名单做硬约束** — 比 prompt 文字"请勿修改代码"更牢靠
3. **审查/提交两阶段** — N 个 reviewer 并行（仅写报告），1 个 committer 独占执行 `git add` + `git commit`
4. **task_id 持久化** — 同轮内 Bug 修复始终唤醒原 Developer 会话，避免从日志重建上下文
5. **PM 不读私有日志** — `dev-*.md` 仅由对应 Developer 自己读写；PM 通过 `validate-dev-log.mjs` 间接确认状态
6. **三类独立预算** — `reviewer_rejection` / `bug_fix_a` / `bug_fix_b` 各自计数，避免 B 类 Bug 触发 Planner 重规划吃光 budget
7. **五类错误路由** — A 模块内 / B 跨模块 / C 环境 / D 需求理解 / E 测试用例错（D 类立即 escalate 用户）
8. **并行写冲突防护** — Planner 必须把跨模块共享文件列入 `shared_files` + 指定 coordinator；非 coordinator 走 `shared_file_requests`；PM 用 `check-file-conflicts.mjs` 强校验
9. **append-only 事件日志** — 所有 boulder.json 修改走 events.jsonl + rebuild，避免并发竞态
10. **Schema 硬校验** — dev-log / round-plan / bug-report 全部走 JSON Schema（ajv），不通过的产出直接打回
11. **质量门禁强制证据** — Developer 报告完成前必须 `check-quality-gates.mjs` 通过并把命令输出贴到 `self_check.evidence`
12. **回滚机制** — 每轮 `git tag round-N-baseline`，预算耗尽时可选 `git reset --hard` 回退本轮
13. **Agent Guard Hook** — 内置 hook（`.claude/hooks/agent-guard.js`）利用 `agent_type` 字段实现基于角色的权限拦截。根据每个角色的允许路径和命令规则拦截 Write/Edit/Bash 操作，返回详细的角色职责提示。

---

## Agent Guard Hook

插件内置 **Agent Guard Hook**，利用 Claude Code 的 `agent_type` 字段实现**基于角色的权限强制执行**。

### 工作原理

hook 在每次 `Write`、`Edit` 或 `Bash` 工具调用前运行。它从 PreToolUse hook 输入中读取 `agent_type` 字段来识别是哪个 agent 在调用，然后执行角色特定的权限规则。

**权限矩阵：**

| 角色 | Write/Edit 允许范围 | Bash 命令限制 |
|------|-------------------|---------------|
| **PM**（主线程）| 所有文件 | 无 |
| **Planner** | 仅 `agent-team-logs/**` | git add/commit/push、build/test 命令 |
| **Developer** | `file_scope` + `dev-*.md` + notepads | git add/commit/push |
| **Reviewer** | `review.md` + notepads | build/test 命令 |
| **Tester** | `test.md` + notepads | git add/commit/push、build 命令 |

**所有角色都被阻止访问：**
- `.git/**` - Git 内部文件
- `node_modules/**` - 依赖目录
- `.env`、`.env.*` - 环境变量文件
- `*.key`、`*.pem` - 安全密钥

### 拦截的 Bash 命令

| 角色 | 拦截的命令模式 |
|------|---------------|
| **Planner** | `git add/commit/push`、`npm run build/test`、`cargo build/test`、`go build/test`、`pytest` |
| **Developer** | `git add/commit/push` |
| **Reviewer** | `npm run build/test`、`cargo build/test`、`go build/test`、`pytest` |
| **Tester** | `git add/commit/push`、`npm run build`、`cargo build`、`go build` |

### 拦截提示示例

当 agent 尝试执行未授权操作时，hook 会返回详细信息：

```
⛔ 角色越权拦截

👤 你的角色: 策划师（Planner）

🚫 拦截的操作: Write 项目源文件
📁 目标: src/index.ts
📝 原因: 不在允许的路径范围内

✅ 你的职责:
  • 分析需求，制定开发计划
  • 定义接口规范和语义约束
  • 划分模块和 file_scope
  • 识别 shared_files 和 coordinator

❌ 你不能:
  • 禁止 Write/Edit 项目源文件
  • 禁止运行 build/test/lint 命令
  • 禁止 git add/commit/push
```

### 配置

当 PM 初始化项目时，hook 会自动配置。`init-project.mjs` 脚本会：

1. 复制 `agent-guard.js` 到 `<project>/.claude/hooks/`
2. 配置 `<project>/.claude/settings.json`：

```json
{
  "hooks": {
    "PreToolUse": [
      {
        "matcher": "Write|Edit|Bash",
        "hooks": [
          {
            "type": "command",
            "command": "node",
            "args": [".claude/hooks/agent-guard.js"],
            "timeout": 10
          }
        ]
      }
    ]
  }
}
```

无需额外设置 — PM 初始化项目后 hook 即自动生效。

---

## 许可证

[MIT](./LICENSE)
