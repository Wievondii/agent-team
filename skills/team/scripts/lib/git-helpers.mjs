// agent-team/scripts/lib/git-helpers.mjs
// 跨平台 git 操作辅助。
import { execFileSync } from 'node:child_process';

function runGit(args, opts = {}) {
  try {
    const out = execFileSync('git', args, {
      encoding: 'utf-8',
      stdio: ['ignore', 'pipe', 'pipe'],
      ...opts,
    });
    return { ok: true, stdout: out.trim() };
  } catch (e) {
    return {
      ok: false,
      stdout: e.stdout?.toString().trim() ?? '',
      stderr: e.stderr?.toString().trim() ?? String(e),
    };
  }
}

export function isGitRepo(cwd = process.cwd()) {
  return runGit(['rev-parse', '--is-inside-work-tree'], { cwd }).ok;
}

export function getCurrentBranch(cwd = process.cwd()) {
  const r = runGit(['rev-parse', '--abbrev-ref', 'HEAD'], { cwd });
  return r.ok ? r.stdout : null;
}

export function getHeadSha(cwd = process.cwd()) {
  const r = runGit(['rev-parse', 'HEAD'], { cwd });
  return r.ok ? r.stdout : null;
}

export function tagExists(tagName, cwd = process.cwd()) {
  return runGit(['rev-parse', '--verify', `refs/tags/${tagName}`], { cwd }).ok;
}

export function createTag(tagName, cwd = process.cwd()) {
  if (tagExists(tagName, cwd)) {
    // 已存在则跳过（轮次重启时常见）
    return { ok: true, alreadyExists: true };
  }
  const r = runGit(['tag', tagName], { cwd });
  return r;
}

export function getStatusShort(cwd = process.cwd()) {
  const r = runGit(['status', '--short'], { cwd });
  return r.ok ? r.stdout : '';
}
