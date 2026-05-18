# Agent Team Index

> **项目**：{project_name}
> **创建时间**：{timestamp}

本文件作为 `agent-team-logs/` 目录的索引入口。各角色按需要读取对应文件，避免一次性加载全部内容。

---

## 当前状态

- 当前轮次：见 `agent-team-logs/boulder.json` → `current_round`
- 预算消耗：`node ${CLAUDE_PLUGIN_ROOT}/skills/team/scripts/check-budget.mjs --project-root <项目根>`

---

## 轮次目录

每轮一个独立目录，避免单文件膨胀：

```
agent-team-logs/rounds/
├── round-1/
│   ├── plan.md          # Planner 输出（YAML frontmatter + 自由说明）
│   ├── review.md        # Reviewer 输出
│   ├── test.md          # Tester 输出（含 Bug 列表）
│   └── integration.md   # 集成检查报告（如适用）
├── round-2/
└── ...
```

## 私有工作日志

```
agent-team-logs/dev-{module}.md   # 每个 Developer 私有，YAML frontmatter 严格 schema
```

## 跨轮 Notepads

```
agent-team-logs/notepads/
├── decisions.md       # 关键技术决策（Planner 选型时强制写）
├── learnings.md       # 跨轮经验沉淀（PM 在轮次结束时提炼）
├── issues.md          # Reviewer/Tester 发现问题归集
├── verification.md    # 验证结果（Tester 通过时写入）
└── problems.md        # 未解决问题/blocker 升级
```

## 共享文件协调

```
agent-team-logs/shared-file-changes/
└── round-N.md   # 非集成负责人对 shared_files 的修改请求汇总
```

## 测试证据

```
agent-team-logs/test-evidence/round-N/
└── *.png | *.log
```

## 状态文件

```
agent-team-logs/boulder.json          # 视图（由事件重建，禁止直接编辑）
agent-team-logs/boulder-events.jsonl  # append-only 事件日志
```
