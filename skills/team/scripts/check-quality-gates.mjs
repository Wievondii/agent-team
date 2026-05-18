#!/usr/bin/env node
// agent-team/scripts/check-quality-gates.mjs
// 自动探测项目类型并跑质量门禁（typecheck/build/lint/test）。
// 输出 JSON 结果，每项含 status/command/evidence。Developer 应把结果填入 dev-log 的 self_check 字段。
import { existsSync, readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { join } from 'node:path';

const projectRoot = process.argv[2] ?? process.cwd();

function runCmd(cmd, args, cwd, timeoutMs = 180_000) {
  try {
    const r = spawnSync(cmd, args, {
      cwd,
      encoding: 'utf-8',
      shell: process.platform === 'win32',
      timeout: timeoutMs,
    });
    const stdout = (r.stdout ?? '').toString();
    const stderr = (r.stderr ?? '').toString();
    const status = r.status === 0 ? 'passed' : 'failed';
    const evidence = truncate(stdout + (stderr ? '\n[stderr]\n' + stderr : ''));
    return { status, command: cmd + ' ' + args.join(' '), evidence };
  } catch (e) {
    return {
      status: 'failed',
      command: cmd + ' ' + args.join(' '),
      evidence: 'spawn 失败：' + e.message,
    };
  }
}

function truncate(s, head = 50, tail = 20) {
  const lines = s.split('\n');
  if (lines.length <= head + tail) return s;
  return [
    ...lines.slice(0, head),
    `... (省略 ${lines.length - head - tail} 行) ...`,
    ...lines.slice(-tail),
  ].join('\n');
}

const result = {
  typecheck: { status: 'not_run' },
  build: { status: 'not_run' },
  lint: { status: 'not_run' },
  unit_tests: { status: 'not_run' },
};

// 探测 Node.js / TypeScript 项目
const pkgPath = join(projectRoot, 'package.json');
if (existsSync(pkgPath)) {
  let pkg;
  try {
    pkg = JSON.parse(readFileSync(pkgPath, 'utf-8'));
  } catch {
    pkg = {};
  }
  const scripts = pkg.scripts ?? {};
  const npm = process.platform === 'win32' ? 'npm.cmd' : 'npm';

  // typecheck：优先 scripts.typecheck，其次 tsc --noEmit
  if (scripts.typecheck) {
    result.typecheck = runCmd(npm, ['run', 'typecheck', '--silent'], projectRoot);
  } else if (existsSync(join(projectRoot, 'tsconfig.json'))) {
    const tsc = process.platform === 'win32' ? 'npx.cmd' : 'npx';
    result.typecheck = runCmd(tsc, ['tsc', '--noEmit'], projectRoot);
  } else {
    result.typecheck = { status: 'skipped', skip_reason: '项目未配置 TypeScript' };
  }

  // build
  if (scripts.build) {
    result.build = runCmd(npm, ['run', 'build', '--silent'], projectRoot);
  } else {
    result.build = { status: 'skipped', skip_reason: '未定义 npm run build' };
  }

  // lint
  if (scripts.lint) {
    result.lint = runCmd(npm, ['run', 'lint', '--silent'], projectRoot);
  } else {
    result.lint = { status: 'skipped', skip_reason: '未定义 npm run lint' };
  }

  // tests
  if (scripts.test) {
    result.unit_tests = runCmd(npm, ['test', '--silent'], projectRoot);
  } else {
    result.unit_tests = { status: 'skipped', skip_reason: '未定义 npm test' };
  }
} else if (existsSync(join(projectRoot, 'Cargo.toml'))) {
  // Rust
  result.typecheck = runCmd('cargo', ['check'], projectRoot);
  result.build = runCmd('cargo', ['build'], projectRoot);
  result.lint = runCmd('cargo', ['clippy', '--', '-D', 'warnings'], projectRoot);
  result.unit_tests = runCmd('cargo', ['test'], projectRoot);
} else if (existsSync(join(projectRoot, 'go.mod'))) {
  // Go
  result.typecheck = runCmd('go', ['vet', './...'], projectRoot);
  result.build = runCmd('go', ['build', './...'], projectRoot);
  result.lint = { status: 'skipped', skip_reason: 'Go 项目未配置 lint' };
  result.unit_tests = runCmd('go', ['test', './...'], projectRoot);
} else if (existsSync(join(projectRoot, 'pyproject.toml')) || existsSync(join(projectRoot, 'setup.py'))) {
  // Python
  result.typecheck = { status: 'skipped', skip_reason: 'Python 项目未配置 typecheck（建议 mypy）' };
  result.build = { status: 'skipped', skip_reason: 'Python 通常无构建步骤' };
  result.lint = { status: 'skipped', skip_reason: 'Python 项目未配置 lint（建议 ruff）' };
  result.unit_tests = runCmd('python', ['-m', 'pytest'], projectRoot);
} else {
  // 未知项目类型：全部 skipped
  for (const k of Object.keys(result)) {
    result[k] = { status: 'skipped', skip_reason: '未识别项目类型' };
  }
}

console.log(JSON.stringify(result, null, 2));

// exit code: 任一 failed = 1
const failed = Object.values(result).some((r) => r.status === 'failed');
process.exit(failed ? 1 : 0);
