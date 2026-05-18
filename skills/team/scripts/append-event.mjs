#!/usr/bin/env node
// skills/team/scripts/append-event.mjs
// 向项目目录的 boulder-events.jsonl 追加一条事件。
// 用法：node append-event.mjs --project-root <path> '<event-json>'
//      （ts 和 seq 由脚本自动填）
import { existsSync, readFileSync, appendFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { withLock } from './lib/locking.mjs';
import {
  getEventsPath,
  getProjectRoot,
  stripProjectRootFlag,
  ensureSchemasExist,
} from './lib/paths.mjs';
import { validateAgainst } from './lib/schema-loader.mjs';

ensureSchemasExist();

const projectRoot = getProjectRoot();
const argv = stripProjectRootFlag(process.argv);
const input = argv[2];
if (!input) {
  console.error('用法：node append-event.mjs --project-root <path> <event-json>');
  process.exit(2);
}

let payload;
try {
  payload = JSON.parse(input);
} catch (e) {
  console.error('JSON 解析失败：' + e.message);
  process.exit(2);
}

const eventsPath = getEventsPath(projectRoot);
mkdirSync(dirname(eventsPath), { recursive: true });

const result = await withLock(eventsPath, async () => {
  let lastSeq = 0;
  if (existsSync(eventsPath)) {
    const lines = readFileSync(eventsPath, 'utf-8').trim().split('\n').filter(Boolean);
    if (lines.length > 0) {
      try {
        const last = JSON.parse(lines[lines.length - 1]);
        lastSeq = last.seq ?? 0;
      } catch {
        lastSeq = lines.length;
      }
    }
  } else {
    writeFileSync(eventsPath, '');
  }

  const fullEvent = {
    ts: new Date().toISOString(),
    seq: lastSeq + 1,
    ...payload,
  };

  const validation = validateAgainst('boulder-event', fullEvent);
  if (!validation.valid) {
    console.error('事件不符合 schema：');
    for (const err of validation.errors) console.error('  - ' + err);
    process.exit(3);
  }

  appendFileSync(eventsPath, JSON.stringify(fullEvent) + '\n');
  return fullEvent;
});

console.log(JSON.stringify(result));
