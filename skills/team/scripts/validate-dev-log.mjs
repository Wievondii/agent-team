#!/usr/bin/env node
// agent-team/scripts/validate-dev-log.mjs
// 校验 .opencode/dev-{module}.md 的 frontmatter 符合 dev-log schema。
// 用法：node validate-dev-log.mjs <dev-log path>
import { readFileSync, existsSync } from 'node:fs';
import { parseFrontmatter } from './lib/frontmatter.mjs';
import { validateAgainst } from './lib/schema-loader.mjs';

const path = process.argv[2];
if (!path) {
  console.error('用法：node validate-dev-log.mjs <dev-{module}.md>');
  process.exit(2);
}
if (!existsSync(path)) {
  console.error('dev-log 文件不存在：' + path);
  process.exit(2);
}

const md = readFileSync(path, 'utf-8');
const { frontmatter } = parseFrontmatter(md);
if (!frontmatter) {
  console.error('dev-log 缺少 YAML frontmatter');
  process.exit(3);
}

const validation = validateAgainst('dev-log', frontmatter);
if (!validation.valid) {
  console.error('dev-log frontmatter 不符合 schema：');
  for (const err of validation.errors) console.error('  - ' + err);
  process.exit(4);
}

// 额外软规则：status=completed 时 self_check 不能全部 not_run
if (frontmatter.status === 'completed') {
  const sc = frontmatter.self_check ?? {};
  const allNotRun = ['typecheck', 'build', 'lint', 'unit_tests'].every(
    (k) => (sc[k]?.status ?? 'not_run') === 'not_run'
  );
  if (allNotRun) {
    console.error('dev-log status=completed 但 self_check 全部 not_run，违反质量门禁');
    process.exit(5);
  }
  // failed 的 check 必须有 evidence 说明
  for (const k of ['typecheck', 'build', 'lint', 'unit_tests']) {
    const c = sc[k];
    if (c?.status === 'failed' && !c.evidence) {
      console.error(`self_check.${k}=failed 但缺少 evidence`);
      process.exit(5);
    }
    if (c?.status === 'skipped' && !c.skip_reason) {
      console.error(`self_check.${k}=skipped 但缺少 skip_reason`);
      process.exit(5);
    }
  }
}

console.log(JSON.stringify({ ok: true, module: frontmatter.module, status: frontmatter.status }));
