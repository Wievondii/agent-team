---
schema_version: "2.0"
round: {round}
project_type: interface
tech_stack:
  language: ""
  framework: ""
  package_manager: ""
  test_framework: ""
modules: []
shared_files: []
integration_lead: dev-1
test_contracts: []
acceptance_criteria: []
risks: []
---

<!--
  本文件由 Planner 写入。frontmatter 字段必须满足 round-plan.schema.json：
  - modules：至少 1 个，每个含 name/developer/file_scope（glob 列表）
  - shared_files：跨模块共享文件，必须指定 coordinator
  - integration_lead：负责验证调用链路的 Developer
  - test_contracts：每个对外接口至少 1 个测试用例
  - acceptance_criteria：至少 1 条，含 id (ac-N) / description / test_method

  写完后 PM 会运行：
    node ${CLAUDE_PLUGIN_ROOT}/skills/team/scripts/validate-plan.mjs --project-root <项目根> <本文件路径>
    node ${CLAUDE_PLUGIN_ROOT}/skills/team/scripts/check-file-conflicts.mjs <本文件路径>
  失败必须修正后才能进入开发阶段。
-->

# 第 {round} 轮计划

## 需求分析
<!-- 一句话总结、涉及模块、技术栈、项目类型 -->

## 规范定义

### 接口规范（如适用）
<!-- TypeScript 接口或 OpenAPI 片段 -->

### 风格规范（如适用）
<!-- 颜色、字体、布局、组件 -->

## 模块划分说明
<!-- frontmatter.modules 的人类可读补充：每个模块的职责、关键设计点 -->

## 接口调用关系
<!-- frontmatter.modules[].interfaces_provided 的人类可读补充：调用时机、语义约束 -->

## 集成检查清单
<!-- integration_lead 验证时需要逐一确认的项 -->
- [ ] 所有 interfaces_provided 都被对应 callers 调用
- [ ] 无死代码（定义但未调用）
- [ ] 状态机回调：初始状态触发 onEnter（同名状态不跳过）
- [ ] UI 链路：状态机 → UIManager → showXxx 连通
- [ ] 无初始化死锁

## 测试契约说明
<!-- frontmatter.test_contracts 的人类可读补充 -->

## 风险与应对
<!-- frontmatter.risks 的人类可读补充 -->
