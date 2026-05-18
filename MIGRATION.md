# Agent Team — v1 → v2.0 Migration Guide

v2.0 是一次破坏性升级。本文档说明如何从 v1 迁移到 v2.0（Claude Code plugin 版本）。

---

## 为什么升级

v2.0 修复了 v1 的 18 个核心问题（适用于 Claude plugin 形态的 12 项），包括：

| 问题 | v1 表现 | v2.0 修复 |
|------|---------|-----------|
| 串行架构吞吐低 | Task 严格串行，N 个模块 N 倍时间 | **并行架构**：同一 turn 中拉起多个 Developer/Tester |
| 私有日志格式自由 | dev-log/review-log/test-log 没有强制结构 | YAML frontmatter + JSON Schema 强校验 |
| 迭代上限粒度粗 | 单一 3 次硬上限 | 三类独立预算（reviewer_rejection/bug_fix_a/bug_fix_b）+ 总闸 |
| 并行写冲突无防护 | （v1 是串行，本来就不支持并行；v2 引入并行后必须有防护）| check-file-conflicts.mjs + shared_files 协调员模式 |
| boulder 无持久化 | 状态全在 markdown 里 | append-only events.jsonl + boulder.json 视图 |
| 错误分类二元 | A/B 两类 | A/B/C/D/E 五类（增加环境/需求理解/测试用例错） |
| Reviewer 单点 | 单 Reviewer 处理所有模块 | 拆分 reviewer 模式（并行）+ committer 模式（独占）|
| 共享日志单文件膨胀 | comm-log.md + 三个私有日志 | 拆为 rounds/round-N/{plan,review,test,integration}.md |
| Bug 严重度主观 | 凭感觉打 🔴/🟡/🟢 | impact × frequency 矩阵脚本推导 |
| 质量门禁靠良心 | Developer 自报完成 | check-quality-gates.mjs 强制贴出命令证据 |
| 无回滚机制 | commit 后只能再开发 | round-N-baseline tag + git reset 选项 |
| Notepad 缺位 | 无跨轮经验沉淀 | notepads/ 强制 trigger（decisions/learnings/issues/verification/problems）|

---

## 不向后兼容

v2.0 选择**破坏式升级**（不提供自动迁移脚本），原因：

- v1 的 boulder.json schema 与 v2 完全不同
- 旧的 `agent-team-logs/agent-team-log.md`（共享日志单文件）无法 1:1 映射到新的 `rounds/round-N/` 目录
- 旧的私有日志（dev-log/review-log/test-log）没有 frontmatter，无法自动转换
- 维护双轨增加长期成本

---

## 迁移步骤

### 步骤 1：备份现有项目数据

```bash
# 在每个使用过 agent-team v1 的项目里
cd <your-project>
mv agent-team-logs agent-team-logs.v1.backup
```

Windows PowerShell：

```powershell
cd <your-project>
Rename-Item agent-team-logs agent-team-logs.v1.backup
```

---

### 步骤 2：检查 Node.js 版本

v2.0 要求 **Node.js ≥ 18**：

```bash
node -v   # 应输出 v18.x 或更高
```

如果没有 Node 18+，先安装：https://nodejs.org/

---

### 步骤 3：升级 plugin

在 Claude Code 中：

```
/plugin uninstall agent-team
/plugin marketplace add Wievondii/agent-team
/plugin install agent-team@wievondii-agent-team
```

如果之前是本地路径安装：

```
/plugin uninstall agent-team
/plugin marketplace remove <旧的本地路径>
git -C <agent-team 仓库> pull
/plugin marketplace add <agent-team 仓库的绝对路径>
/plugin install agent-team@wievondii-agent-team
```

---

### 步骤 4：首次激活 v2.0

在你想要继续的项目目录里启动 Claude Code：

```
/agent-team:team
```

PM 启动钩子会：
1. 运行 `ensure-deps.mjs`，自动安装 npm 依赖（首次约 10 秒）
2. 跑 `check-budget.mjs` 检查项目状态——发现没有 `agent-team-logs/`，提示这是新项目
3. 让你描述需求 → 走 v2 全新工作流

---

### 步骤 5：验证安装

可以手动测试脚本工作正常：

```bash
# 任何路径下都可以
node "$CLAUDE_PLUGIN_ROOT/skills/team/scripts/derive-severity.mjs" feature_unusable always
# 应输出：critical
```

Claude Code 会自动展开 `$CLAUDE_PLUGIN_ROOT`。如果你在 Claude Code 外用 shell 测试，需要手动定位 plugin 路径（通常在 `~/.claude/plugins/` 之类的 Claude 配置目录下）。

---

## 旧数据回看

如果你需要查阅 v1 的历史轮次记录：

```bash
# 旧共享日志
cat agent-team-logs.v1.backup/agent-team-log.md

# 旧私有日志
cat agent-team-logs.v1.backup/agent-team-dev-log.md
cat agent-team-logs.v1.backup/agent-team-review-log.md
cat agent-team-logs.v1.backup/agent-team-test-log.md
```

这些数据保留为只读参考，不会被 v2.0 自动读取。

---

## 回滚到 v1

如果 v2.0 不合适，可以回到 v1：

```
/plugin uninstall agent-team
```

然后在 Claude Code 中重新安装 v1 版本（手动 checkout 到 v1 commit/tag 的 marketplace）：

```bash
# clone 一个 v1 副本
git clone https://github.com/Wievondii/agent-team.git agent-team-v1
cd agent-team-v1
git checkout <v1-tag-or-sha>
```

```
/plugin marketplace add /absolute/path/to/agent-team-v1
/plugin install agent-team@wievondii-agent-team
```

恢复项目数据：

```bash
cd <your-project>
mv agent-team-logs.v1.backup agent-team-logs
```

---

## 常见问题

### Q1：v1 的 task_id 还能继续用吗？

不能。v2 的 boulder schema 不兼容 v1 的状态记录方式。建议在 v1 当前轮结束后再升级，避免中断。

### Q2：能不能不用 Node.js？

不能。v2 的所有校验/事件脚本都是 Node.js (`.mjs`)。这是核心设计决策——硬约束需要可执行代码，prompt 软约束在 v1 已被证明不够可靠。

### Q3：v2 的 npm 依赖装在哪？

`${CLAUDE_PLUGIN_ROOT}/skills/team/scripts/node_modules/`。不影响你的项目 node_modules。卸载 plugin 时会一并清理。

### Q4：可以把 v2 的 scripts 放到我自己的项目里吗？

不建议。这些脚本是 PM/Agent 共用的，属于 plugin 的一部分。在每个项目里复制会导致版本漂移。

### Q5：ensure-deps 失败怎么办？

如果首次运行失败（网络问题、npm 注册表问题等），手动跑：

```bash
cd "$CLAUDE_PLUGIN_ROOT/skills/team/scripts"
npm install
```

然后再激活 `/agent-team:team`。

### Q6：Claude Code 真的支持并行 Task 调用吗？

支持。在同一条消息中调用多次 Task，Claude Code 会并行执行。v2 的 SKILL.md 利用了这一点——PM 在第 4 步（开发阶段）会在同一 turn 中同时拉起 N 个 Developer。

---

## 反馈

升级遇到问题请提 issue：https://github.com/Wievondii/agent-team/issues
