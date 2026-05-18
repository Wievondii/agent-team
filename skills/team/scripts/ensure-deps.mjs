#!/usr/bin/env node
// agent-team/scripts/ensure-deps.mjs
// PM 启动钩子：确保 scripts/ 目录的 npm 依赖已安装。
// 用户无感知：第一次运行时 npm install，之后跳过。
import { existsSync, writeFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const scriptsDir = __dirname;
const nodeModulesDir = join(scriptsDir, 'node_modules');
const sentinel = join(nodeModulesDir, '.installed-v2');

function installed() {
  return existsSync(sentinel);
}

function install() {
  const pm = 'npm'; // npm 随 Node 18+ 一起来
  console.error('[ensure-deps] 首次运行：安装 agent-team 脚本依赖...');
  const cmd = process.platform === 'win32' ? `${pm}.cmd` : pm;
  const r = spawnSync(cmd, ['install', '--no-audit', '--no-fund'], {
    cwd: scriptsDir,
    stdio: 'inherit',
    shell: false,
  });
  if (r.status !== 0) {
    console.error('[ensure-deps] 依赖安装失败（exit=' + r.status + '）');
    process.exit(1);
  }
  try {
    writeFileSync(sentinel, new Date().toISOString());
  } catch (e) {
    console.error('[ensure-deps] 写入哨兵失败：', e.message);
  }
  console.error('[ensure-deps] OK');
}

if (!installed()) {
  install();
}
