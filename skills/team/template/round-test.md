---
schema_version: "2.0"
round: {round}
overall: pending          # passed | failed | partial | pending
acceptance_criteria_results: []  # [{id, status, note}]
module_results: []        # [{module, tester, conclusion, bug_count}]
bugs: []                  # 每条遵循 bug-report.schema.json
---

# 第 {round} 轮测试

## 整体评估
<!-- passed / failed / partial -->

## 验收标准结果

| 验收标准 | 结果 | 备注 |
|---------|------|------|
| - | - | - |

## 模块测试结果

| 模块 | Tester | 结论 | Bug 数 |
|------|--------|------|--------|
| - | - | - | - |

## Bug 列表

<!-- 每条同时记录在 frontmatter.bugs 中，保持机器可读。
     此处为人类可读补充：截图、复杂复现路径、视频证据等。 -->

## 修复验证（重测时追加）

| Bug ID | 状态 | 验证方法 | 备注 |
|--------|------|---------|------|
| - | - | - | - |
