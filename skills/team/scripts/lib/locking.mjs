// agent-team/scripts/lib/locking.mjs
// 跨平台文件锁（基于 proper-lockfile）。
import lockfile from 'proper-lockfile';
import { existsSync, writeFileSync } from 'node:fs';

/**
 * 在持有 path 的锁的前提下执行 fn。
 * - 如果 path 不存在，会创建一个空文件（proper-lockfile 要求文件存在）。
 * - 默认重试 10 次，每次 200ms 退避。
 */
export async function withLock(path, fn, opts = {}) {
  if (!existsSync(path)) {
    writeFileSync(path, '');
  }
  const release = await lockfile.lock(path, {
    retries: opts.retries ?? { retries: 10, minTimeout: 100, maxTimeout: 500 },
    stale: opts.stale ?? 30_000,
    realpath: false,
  });
  try {
    return await fn();
  } finally {
    await release();
  }
}
