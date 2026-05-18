#!/usr/bin/env node
// agent-team/scripts/validate-plan.mjs
// 校验 rounds/round-N/plan.md 的 frontmatter 符合 round-plan schema。
import { readFileSync, existsSync } from 'node:fs';
import { parseFrontmatter } from './lib/frontmatter.mjs';
import { validateAgainst } from './lib/schema-loader.mjs';

const path = process.argv[2];
if (!path) {
  console.error('用法：node validate-plan.mjs <plan.md>');
  process.exit(2);
}
if (!existsSync(path)) {
  console.error('plan 文件不存在：' + path);
  process.exit(2);
}

const md = readFileSync(path, 'utf-8');
const { frontmatter } = parseFrontmatter(md);
if (!frontmatter) {
  console.error('plan.md 缺少 YAML frontmatter');
  process.exit(3);
}

const validation = validateAgainst('round-plan', frontmatter);
if (!validation.valid) {
  console.error('plan.md frontmatter 不符合 schema：');
  for (const err of validation.errors) console.error('  - ' + err);
  process.exit(4);
}

// 软规则
const issues = [];

// 每个对外 interface 至少有一个测试 contract
const interfaceNames = new Set();
for (const m of frontmatter.modules) {
  for (const i of m.interfaces_provided ?? []) {
    interfaceNames.add(i.name);
  }
}
const contractInterfaces = new Set((frontmatter.test_contracts ?? []).map((c) => c.interface));
const missingContracts = [...interfaceNames].filter((n) => !contractInterfaces.has(n));
if (missingContracts.length > 0) {
  issues.push('以下接口缺少测试契约：' + missingContracts.join(', '));
}

// integration_lead 必须存在于 modules 的 developer 中
if (!frontmatter.modules.some((m) => m.developer === frontmatter.integration_lead)) {
  issues.push('integration_lead=' + frontmatter.integration_lead + ' 不在 modules 的 developer 列表中');
}

if (issues.length > 0) {
  console.error('plan.md 软规则违反：');
  for (const i of issues) console.error('  - ' + i);
  process.exit(5);
}

console.log(JSON.stringify({ ok: true, round: frontmatter.round, modules: frontmatter.modules.length }));
