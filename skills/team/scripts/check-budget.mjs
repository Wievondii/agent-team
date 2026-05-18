#!/usr/bin/env node
// skills/team/scripts/check-budget.mjs
// 查询项目目录 boulder.json 当前预算消耗状况。
// 用法：node check-budget.mjs --project-root <path> [<kind>]
import { existsSync, readFileSync } from 'node:fs';
import { getBoulderPath, getProjectRoot, stripProjectRootFlag } from './lib/paths.mjs';

const projectRoot = getProjectRoot();
const argv = stripProjectRootFlag(process.argv);
const kind = argv[2];

const boulderPath = getBoulderPath(projectRoot);
if (!existsSync(boulderPath)) {
  console.error('boulder.json 不存在：' + boulderPath);
  process.exit(1);
}

const boulder = JSON.parse(readFileSync(boulderPath, 'utf-8'));
const budgets = boulder.budgets ?? {};

function summary(b) {
  return {
    used: b.used,
    max: b.max,
    remaining: b.max - b.used,
    exhausted: b.used >= b.max,
  };
}

if (kind) {
  if (!budgets[kind]) {
    console.error('未知 kind：' + kind);
    process.exit(2);
  }
  console.log(JSON.stringify(summary(budgets[kind]), null, 2));
} else {
  const out = {};
  for (const [k, v] of Object.entries(budgets)) {
    out[k] = summary(v);
  }
  console.log(JSON.stringify(out, null, 2));
}
