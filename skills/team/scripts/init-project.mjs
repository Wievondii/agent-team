#!/usr/bin/env node
// skills/team/scripts/init-project.mjs
// 在用户项目目录创建 agent-team-logs/ 目录骨架（含 rounds/round-1, notepads, shared-file-changes）。
// 模板源自 plugin 的 skills/team/template/。
// 同时复制 hook 文件和配置到项目级 .claude/ 目录。
// 用法：node init-project.mjs --project-root <path> [--project-name <name>] [--round <N>]
import { existsSync, mkdirSync, readFileSync, writeFileSync, copyFileSync } from 'node:fs';
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
// .../skills/team/scripts/init-project.mjs → .../ (plugin root)
const pluginRoot = join(__dirname, '..', '..', '..');

const projectRoot = getProjectRoot();
const argv = stripProjectRootFlag(process.argv);

function pickArg(name, defaultValue) {
  const idx = argv.indexOf(name);
  return idx !== -1 ? argv[idx + 1] : defaultValue;
}

const projectName = pickArg('--project-name', 'unknown-project');
const round = parseInt(pickArg('--round', '1'), 10);

// ============================================================
// 1. 复制 hook 文件到项目目录
// ============================================================

function setupHooks() {
  const projectClaudeDir = join(projectRoot, '.claude');
  const projectHooksDir = join(projectClaudeDir, 'hooks');

  // 创建 .claude/hooks/ 目录
  if (!existsSync(projectHooksDir)) {
    mkdirSync(projectHooksDir, { recursive: true });
  }

  // 复制 agent-guard.js
  const srcHook = join(pluginRoot, '.claude', 'hooks', 'agent-guard.js');
  const dstHook = join(projectHooksDir, 'agent-guard.js');

  if (existsSync(srcHook)) {
    // 始终覆盖，确保使用最新版本
    copyFileSync(srcHook, dstHook);
    console.log('[init-project] 已复制 agent-guard.js 到 ' + dstHook);
  } else {
    console.warn('[init-project] 警告：源 hook 文件不存在：' + srcHook);
  }

  return projectClaudeDir;
}

// ============================================================
// 2. 配置项目级 settings.json
// ============================================================

function setupProjectSettings(projectClaudeDir) {
  const settingsPath = join(projectClaudeDir, 'settings.json');

  // 项目级 hook 配置（使用相对路径）
  const agentTeamHookConfig = {
    matcher: 'Write|Edit|Bash',
    hooks: [
      {
        type: 'command',
        command: 'node',
        args: ['.claude/hooks/agent-guard.js'],
        timeout: 10,
      },
    ],
  };

  let settings = {};

  // 如果已存在 settings.json，读取并合并
  if (existsSync(settingsPath)) {
    try {
      const content = readFileSync(settingsPath, 'utf-8');
      settings = JSON.parse(content);
    } catch {
      console.warn('[init-project] 警告：无法解析 settings.json，将创建新文件');
    }
  }

  // 确保 hooks 结构存在
  if (!settings.hooks) settings.hooks = {};
  if (!settings.hooks.PreToolUse) settings.hooks.PreToolUse = [];

  // 检查是否已存在 agent-guard hook
  const existingIndex = settings.hooks.PreToolUse.findIndex(
    (h) => h.hooks?.[0]?.args?.[0]?.includes('agent-guard.js')
  );

  if (existingIndex !== -1) {
    // 更新现有配置
    settings.hooks.PreToolUse[existingIndex] = agentTeamHookConfig;
    console.log('[init-project] 已更新 agent-guard hook 配置');
  } else {
    // 添加新配置（插入到最前面，确保优先执行）
    settings.hooks.PreToolUse.unshift(agentTeamHookConfig);
    console.log('[init-project] 已添加 agent-guard hook 配置');
  }

  // 写入配置文件
  writeFileSync(settingsPath, JSON.stringify(settings, null, 2) + '\n');
  console.log('[init-project] 已写入 ' + settingsPath);

  return settingsPath;
}

// ============================================================
// 3. 创建 agent-team-logs 目录结构
// ============================================================

function setupLogsDirectory() {
  const logsDir = getAgentTeamLogsDir(projectRoot);
  const roundDir = getRoundDir(round, projectRoot);
  const notepadsDir = getNotepadsDir(projectRoot);
  const sharedFileChangesDir = getSharedFileChangesDir(projectRoot);

  for (const d of [logsDir, roundDir, notepadsDir, sharedFileChangesDir]) {
    if (!existsSync(d)) mkdirSync(d, { recursive: true });
  }

  return { logsDir, roundDir, notepadsDir, sharedFileChangesDir };
}

// ============================================================
// 4. 复制模板文件
// ============================================================

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

function setupTemplates({ logsDir, roundDir, notepadsDir, sharedFileChangesDir }) {
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
}

// ============================================================
// 主流程
// ============================================================

try {
  // 1. 设置 hooks
  const projectClaudeDir = setupHooks();

  // 2. 配置 settings.json
  const settingsPath = setupProjectSettings(projectClaudeDir);

  // 3. 创建目录结构
  const dirs = setupLogsDirectory();

  // 4. 复制模板
  setupTemplates(dirs);

  console.log(JSON.stringify({
    ok: true,
    agent_team_logs: dirs.logsDir,
    round,
    hooks_setup: true,
    settings_path: settingsPath,
  }, null, 2));
} catch (err) {
  console.error('[init-project] 初始化失败：' + err.message);
  process.exit(1);
}
