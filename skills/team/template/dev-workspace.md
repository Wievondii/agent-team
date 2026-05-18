---
schema_version: "2.0"
module: {module_name}
developer_id: dev-1
task_id: null
round: 1
is_integration_lead: false
status: in_progress       # in_progress | completed | blocked | resumed | fixing
started_at: null
last_heartbeat: null
completed_at: null
files_changed: []
interfaces_implemented: []
shared_file_requests: []
self_check:
  typecheck: { status: not_run }
  build: { status: not_run }
  lint: { status: not_run }
  unit_tests: { status: not_run }
  integration_check: { status: not_run }
blockers: []
fix_history: []
---

<!--
  本文件由 Developer 自己读写。Reviewer/Tester 只读。
  报告"任务完成"前必须满足：
  1. status = completed
  2. self_check.typecheck/build/lint/unit_tests 不能全部 not_run
  3. 任何 status=skipped 的检查必须填 skip_reason
  4. 任何 status=failed 的检查必须填 evidence
  5. files_changed / interfaces_implemented 必须如实更新
  6. last_heartbeat 在长任务中每 ~5 分钟更新一次

  PM 会运行：
    node ${CLAUDE_PLUGIN_ROOT}/skills/team/scripts/validate-dev-log.mjs <本文件路径>
  失败必须修正后才能进入审查阶段。
-->

# Dev-{module_name} 工作日志

> **模块**：{module_name}
> **文件范围**：{file_scope}
> **创建时间**：{timestamp}

## 设计决策
<!-- 关键设计选择、取舍、约束 -->

## 实现备注
<!-- 给 Tester 的提示、需要特别测试的场景、已知边界 -->

## 共享文件请求说明（如有）
<!-- frontmatter.shared_file_requests 的人类可读补充：为什么需要这个改动 -->

## Bug 修复记录（如有）

### Bug #X：标题
- **错误类型**：A 模块内
- **原因分析**：
- **改动内容**：
- **关键代码行**：
- **验证方法**：
