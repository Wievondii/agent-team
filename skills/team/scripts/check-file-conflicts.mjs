#!/usr/bin/env node
// agent-team/scripts/check-file-conflicts.mjs
// 给定 round-N/plan.md，校验各模块 file_scope 是否有重叠。
// 用法：node check-file-conflicts.mjs <plan.md path>
// 输出：JSON {ok:true} 或 {ok:false, conflicts:[{files,between}], shared_files_ok:bool}
import { readFileSync, existsSync } from 'node:fs';
import fg from 'fast-glob';
import { parseFrontmatter } from './lib/frontmatter.mjs';
import { validateAgainst } from './lib/schema-loader.mjs';

const planPath = process.argv[2];
if (!planPath) {
  console.error('用法：node check-file-conflicts.mjs <plan.md>');
  process.exit(2);
}
if (!existsSync(planPath)) {
  console.error('plan 文件不存在：' + planPath);
  process.exit(2);
}

const md = readFileSync(planPath, 'utf-8');
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

// 展开每个模块的 file_scope 为实际文件列表
const moduleFiles = new Map();
for (const m of frontmatter.modules) {
  const matched = await fg(m.file_scope, {
    dot: false,
    onlyFiles: true,
    followSymbolicLinks: false,
    suppressErrors: true,
  });
  // 同时把 glob 模式本身也存一份（用于尚不存在的文件）
  moduleFiles.set(m.name, {
    developer: m.developer,
    globs: m.file_scope,
    matched,
  });
}

// 检测交集
const conflicts = [];
const moduleNames = [...moduleFiles.keys()];
for (let i = 0; i < moduleNames.length; i++) {
  for (let j = i + 1; j < moduleNames.length; j++) {
    const a = moduleFiles.get(moduleNames[i]);
    const b = moduleFiles.get(moduleNames[j]);

    // 交集 = 实际文件交集
    const aSet = new Set(a.matched);
    const overlap = b.matched.filter((f) => aSet.has(f));
    if (overlap.length > 0) {
      conflicts.push({
        files: overlap,
        between: [moduleNames[i], moduleNames[j]],
        developers: [a.developer, b.developer],
      });
    }

    // glob 模式交集（粗略）：如果两个模块的 glob 完全一致或一方包含另一方
    for (const ga of a.globs) {
      for (const gb of b.globs) {
        if (ga === gb || ga.includes(gb) || gb.includes(ga)) {
          // 已经在 overlap 中体现就不重复
          if (overlap.length === 0) {
            conflicts.push({
              files: [`<glob: ${ga} ⨯ ${gb}>`],
              between: [moduleNames[i], moduleNames[j]],
              developers: [a.developer, b.developer],
              glob_only: true,
            });
          }
        }
      }
    }
  }
}

// 校验 shared_files 的 coordinator 必须是某个 developer
const sharedFilesIssues = [];
for (const sf of frontmatter.shared_files ?? []) {
  const knownDev = frontmatter.modules.some((m) => m.developer === sf.coordinator);
  if (!knownDev) {
    sharedFilesIssues.push(
      `shared_files[${sf.path}].coordinator=${sf.coordinator} 不在 modules 的 developer 列表中`
    );
  }
}

// 校验 integration_lead 必须是某个 developer
if (!frontmatter.modules.some((m) => m.developer === frontmatter.integration_lead)) {
  sharedFilesIssues.push(
    `integration_lead=${frontmatter.integration_lead} 不在 modules 的 developer 列表中`
  );
}

const ok = conflicts.length === 0 && sharedFilesIssues.length === 0;
const result = {
  ok,
  conflicts,
  shared_files_issues: sharedFilesIssues,
};
console.log(JSON.stringify(result, null, 2));
process.exit(ok ? 0 : 1);
