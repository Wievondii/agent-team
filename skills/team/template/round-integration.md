---
schema_version: "2.0"
round: {round}
integration_lead: dev-1
status: pending           # pending | passed | failed | fixed
attempts: 0               # 集成修复轮次（上限 2）
---

# 第 {round} 轮集成检查

## 调用链路验证

对照 `plan.md` 的 `interfaces_provided.callers` 和 `callee_position` 逐一验证：

| 接口 | 提供方 | 调用方 | 调用位置 | 验证结果 |
|------|--------|--------|---------|---------|
| - | - | - | - | - |

## 死代码检查
<!-- 定义但未被调用的类/方法/接口 -->

## 状态机/UI 链路检查
- [ ] 初始状态触发 onEnter（同名状态不跳过）
- [ ] UI 入口被正确调用
- [ ] 无双 UI 同时存在
- [ ] 无回调注册时序问题

## 数据传递链路
<!-- A → B → C 类型一致、参数正确 -->

## 集成修复记录（如有）

### 第 N 次集成修复
- 修复内容：
- 验证结果：
- 简化审查（typecheck + 接口契约测试）：

## 集成结论
<!-- passed → 进入审查；failed 且 attempts >= 2 → escalate 到 PM -->
