#!/usr/bin/env node
// skills/team/scripts/init-project.mjs
// 在用户项目目录创建 agent-team-logs/ 目录骨架（含 rounds/round-1, notepads, shared-file-changes）。
// 模板源自 plugin 的 skills/team/template/。
// 用法：node init-project.mjs --project-root <path> [--project-name <name>] [--round <N>]
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  getProjectRoot,
  getAgentTeamLogsDir,
  getRoundDir,
  getNotepadsDir,
  getSharedFileChangesDir,
  stripProjectRootFlag,
} from './lib/paths.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
// .../skills/team/scripts/init-project.mjs → .../skills/team/template
const templatesDir = join(__dirname, '..', 'template');

const projectRoot = getProjectRoot();
const argv = stripProjectRootFlag(process.argv);

function pickArg(name, defaultValue) {
  const idx = argv.indexOf(name);
  return idx !== -1 ? argv[idx + 1] : defaultValue;
}

const projectName = pickArg('--project-name', 'unknown-project');
const round = parseInt(pickArg('--round', '1'), 10);

const logsDir = getAgentTeamLogsDir(projectRoot);
const roundDir = getRoundDir(round, projectRoot);
const notepadsDir = getNotepadsDir(projectRoot);
const sharedFileChangesDir = getSharedFileChangesDir(projectRoot);

for (const d of [logsDir, roundDir, notepadsDir, sharedFileChangesDir]) {
  if (!existsSync(d)) mkdirSync(d, { recursive: true });
}

function copyTemplate(srcRel, dst, replacements = {}) {
  const src = join(templatesDir, srcRel);
  if (!existsSync(src)) {
    console.error('[init-project] 模板不存在：' + src);
    return false;
  }
  let content = readFileSync(src, 'utf-8');
  for (const [k, v] of Object.entries(replacements)) {
    content = content.replaceAll(`{${k}}`, v);
  }
  // 仅当目标不存在时写入，避免覆盖用户已有内容
  if (!existsSync(dst)) {
    writeFileSync(dst, content);
  }
  return true;
}

const ts = new Date().toISOString();

// 项目级 index.md
copyTemplate('agent-team-log-index.md', join(logsDir, 'index.md'), {
  project_name: projectName,
  timestamp: ts,
});

// round-N 子文件
copyTemplate('round-plan.md', join(roundDir, 'plan.md'), {
  round: String(round),
  timestamp: ts,
});
copyTemplate('round-review.md', join(roundDir, 'review.md'), {
  round: String(round),
  timestamp: ts,
});
copyTemplate('round-test.md', join(roundDir, 'test.md'), {
  round: String(round),
  timestamp: ts,
});
copyTemplate('round-integration.md', join(roundDir, 'integration.md'), {
  round: String(round),
  timestamp: ts,
});

// notepads
const notepadFiles = ['decisions.md', 'learnings.md', 'issues.md', 'verification.md', 'problems.md'];
for (const f of notepadFiles) {
  copyTemplate(`notepads/${f}`, join(notepadsDir, f), {
    project_name: projectName,
    timestamp: ts,
  });
}

// shared-file-changes README
const sfReadme = join(sharedFileChangesDir, 'README.md');
if (!existsSync(sfReadme)) {
  writeFileSync(sfReadme,
`# 共享文件变更协调

非集成负责人对 shared_files 的修改请求都汇集到这里。
集成负责人在所有模块开发完成后，统一合并并修改实际文件。

按轮次组织：每轮一个 round-N.md。
`);
}

console.log(JSON.stringify({ ok: true, agent_team_logs: logsDir, round }, null, 2));
