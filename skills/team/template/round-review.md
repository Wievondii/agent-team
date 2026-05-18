---
schema_version: "2.0"
round: {round}
phase: review            # review | committed
conclusion: pending      # passed | rejected | conditional | pending
reviewers: []            # [{id, scope: [module1, ...], conclusion}]
committer: null          # 独占提交阶段的 reviewer id
commit_sha: null
issues_summary:
  blocker: 0
  warning: 0
  suggestion: 0
---

# 第 {round} 轮审查

## 模块审查结果

| 模块 | Reviewer | 结论 | 问题数 |
|------|----------|------|--------|
| - | - | - | - |

## 问题清单

### 🔴 Blocker（必须修复）
<!-- 编号 / 文件:行 / 描述 / 建议 / 责任 Developer -->

### 🟡 Warning（建议修复）

### 🟢 Suggestion（可选优化）

## 亮点

## 审查结论
<!-- 决策与依据 -->

## 提交信息（提交阶段填写）
- commit sha: 
- commit message: 
