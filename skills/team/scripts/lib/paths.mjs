// skills/team/scripts/lib/paths.mjs
// Claude plugin 版路径解析。
// - schemas/scripts 在 plugin 内（通过 import.meta.url 自动定位，不依赖 ${CLAUDE_PLUGIN_ROOT}）。
// - 运行时数据全部放在用户项目目录的 agent-team-logs/ 下。
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { existsSync } from 'node:fs';

const __filename = fileURLToPath(import.meta.url);
// .../skills/team/scripts/lib/paths.mjs → .../skills/team/
const skillTeamDir = resolve(dirname(__filename), '..', '..');

export function getPluginSkillTeamDir() {
  return skillTeamDir;
}

export function getSchemasDir() {
  return join(skillTeamDir, 'schemas');
}

export function getScriptsDir() {
  return join(skillTeamDir, 'scripts');
}

/**
 * 项目运行时根目录。脚本调用时通过 --project-root 参数或 AGENT_TEAM_PROJECT_ROOT 环境变量传入；
 * 都未提供时回退到 process.cwd()。
 */
export function getProjectRoot(argv = process.argv) {
  const flagIdx = argv.indexOf('--project-root');
  if (flagIdx !== -1 && argv[flagIdx + 1]) {
    return resolve(argv[flagIdx + 1]);
  }
  if (process.env.AGENT_TEAM_PROJECT_ROOT) {
    return resolve(process.env.AGENT_TEAM_PROJECT_ROOT);
  }
  return resolve(process.cwd());
}

export function getAgentTeamLogsDir(projectRoot = getProjectRoot()) {
  return join(projectRoot, 'agent-team-logs');
}

export function getBoulderPath(projectRoot = getProjectRoot()) {
  return join(getAgentTeamLogsDir(projectRoot), 'boulder.json');
}

export function getEventsPath(projectRoot = getProjectRoot()) {
  return join(getAgentTeamLogsDir(projectRoot), 'boulder-events.jsonl');
}

export function getRoundDir(round, projectRoot = getProjectRoot()) {
  return join(getAgentTeamLogsDir(projectRoot), 'rounds', `round-${round}`);
}

export function getDevLogPath(module, projectRoot = getProjectRoot()) {
  return join(getAgentTeamLogsDir(projectRoot), `dev-${module}.md`);
}

export function getNotepadsDir(projectRoot = getProjectRoot()) {
  return join(getAgentTeamLogsDir(projectRoot), 'notepads');
}

export function getSharedFileChangesDir(projectRoot = getProjectRoot()) {
  return join(getAgentTeamLogsDir(projectRoot), 'shared-file-changes');
}

export function ensureSchemasExist() {
  const dir = getSchemasDir();
  if (!existsSync(dir)) {
    throw new Error(
      `schemas 目录不存在：${dir}\n请确认 plugin 安装完整。`
    );
  }
}

/**
 * 从 argv 中删除 --project-root 及其值，便于其他参数解析。
 */
export function stripProjectRootFlag(argv = process.argv) {
  const out = [...argv];
  const idx = out.indexOf('--project-root');
  if (idx !== -1) {
    out.splice(idx, 2);
  }
  return out;
}
