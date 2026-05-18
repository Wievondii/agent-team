#!/usr/bin/env node
// skills/team/scripts/archive-round.mjs
// 轮次结束时归档：
// 1. 把 agent-team-logs/rounds/round-N/* 拷到 agent-team-logs/archive/round-N/
// 2. 写 round_completed 事件
// 用法：node archive-round.mjs --project-root <path> --round <N>
import { existsSync, mkdirSync, readdirSync, copyFileSync, statSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import {
  getProjectRoot,
  getAgentTeamLogsDir,
  getRoundDir,
  stripProjectRootFlag,
} from './lib/paths.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = getProjectRoot();
const argv = stripProjectRootFlag(process.argv);

function pickArg(name) {
  const idx = argv.indexOf(name);
  return idx !== -1 ? argv[idx + 1] : null;
}

const round = parseInt(pickArg('--round') ?? '0', 10);
if (!round) {
  console.error('用法：node archive-round.mjs --project-root <path> --round <N>');
  process.exit(2);
}

const sourceDir = getRoundDir(round, projectRoot);
const archiveDir = join(getAgentTeamLogsDir(projectRoot), 'archive', `round-${round}`);

if (!existsSync(sourceDir)) {
  console.error('round 目录不存在：' + sourceDir);
  process.exit(1);
}

if (!existsSync(archiveDir)) {
  mkdirSync(archiveDir, { recursive: true });
}

function copyRecursive(src, dst) {
  if (!existsSync(dst)) mkdirSync(dst, { recursive: true });
  for (const entry of readdirSync(src)) {
    const s = join(src, entry);
    const d = join(dst, entry);
    if (statSync(s).isDirectory()) {
      copyRecursive(s, d);
    } else {
      copyFileSync(s, d);
    }
  }
}

copyRecursive(sourceDir, archiveDir);

// 写 round_completed 事件
const node = process.platform === 'win32' ? 'node.exe' : 'node';
spawnSync(node, [
  join(__dirname, 'append-event.mjs'),
  '--project-root', projectRoot,
  JSON.stringify({ event: 'round_completed', round }),
], { stdio: 'inherit' });

console.log(JSON.stringify({ ok: true, archived_to: archiveDir }));
