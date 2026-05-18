#!/usr/bin/env node
// skills/team/scripts/heartbeat.mjs
// Agent 在长任务执行中定期调用，更新 last_heartbeat。
// 用法：node heartbeat.mjs --project-root <path> <role> [<module>] [<task_id>]
import { spawnSync } from 'node:child_process';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { stripProjectRootFlag, getProjectRoot } from './lib/paths.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = getProjectRoot();
const argv = stripProjectRootFlag(process.argv);

const role = argv[2];
const module = argv[3];
const taskId = argv[4];

if (!role) {
  console.error('用法：node heartbeat.mjs --project-root <path> <role> [module] [task_id]');
  process.exit(2);
}

const ev = { event: 'agent_heartbeat', role };
if (module) ev.module = module;
if (taskId) ev.task_id = taskId;

const node = process.platform === 'win32' ? 'node.exe' : 'node';
const r = spawnSync(node, [
  join(__dirname, 'append-event.mjs'),
  '--project-root', projectRoot,
  JSON.stringify(ev),
], { stdio: 'inherit' });
process.exit(r.status ?? 0);
