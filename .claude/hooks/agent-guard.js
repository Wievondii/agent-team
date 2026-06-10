#!/usr/bin/env node

/**
 * Agent Guard Hook for Claude Code (v2.1)
 *
 * 基于角色的权限拦截机制。
 * 利用 PreToolUse hook 提供的 agent_type 字段，为每个角色定义严格的权限规则。
 *
 * @author agent-team
 * @version 2.1.0
 */

// ============================================================
// 角色权限配置
// ============================================================

/**
 * 角色权限定义
 * 每个角色包含：
 * - allowedPaths: 允许 Write/Edit 的路径模式（glob）
 * - blockedPaths: 禁止 Write/Edit 的路径模式（glob）
 * - blockedCommands: 禁止的 Bash 命令模式（正则）
 * - description: 角色描述（用于拦截提示）
 * - responsibilities: 职责列表（用于拦截提示）
 * - restrictions: 限制列表（用于拦截提示）
 */
const ROLE_PERMISSIONS = {
  'agent-team-planner': {
    allowedPaths: [
      'agent-team-logs/**',
    ],
    blockedPaths: [],
    blockedCommands: [
      { pattern: /git\s+(add|commit|push|merge|rebase|checkout|reset|revert)/, reason: 'git add/commit/push 是 Committer 工作' },
      { pattern: /npm\s+(run\s+)?(build|test|lint|start|dev)/, reason: 'npm build/test 是 Dev/Tester 工作' },
      { pattern: /cargo\s+(build|test|run|install)/, reason: 'cargo build/test 是 Dev/Tester 工作' },
      { pattern: /python\s+-m\s+pytest/, reason: 'pytest 是 Dev/Tester 工作' },
      { pattern: /go\s+(build|test|install|run)/, reason: 'go build/test 是 Dev/Tester 工作' },
      { pattern: /make\s+(build|test|all|install)/, reason: 'make build/test 是 Dev/Tester 工作' },
    ],
    description: '策划师（Planner）',
    responsibilities: [
      '分析需求，制定开发计划',
      '定义接口规范和语义约束',
      '划分模块和 file_scope',
      '识别 shared_files 和 coordinator',
    ],
    restrictions: [
      '禁止 Write/Edit 项目源文件',
      '禁止运行 build/test/lint 命令',
      '禁止 git add/commit/push',
    ],
  },

  'agent-team-developer': {
    allowedPaths: [
      'agent-team-logs/dev-*.md',
      'agent-team-logs/notepads/**',
      'agent-team-logs/shared-file-changes/**',
    ],
    blockedPaths: [
      'agent-team-logs/boulder.json',
      'agent-team-logs/boulder-events.jsonl',
      'agent-team-logs/rounds/round-*/plan.md',
      'agent-team-logs/rounds/round-*/review.md',
      'agent-team-logs/rounds/round-*/test.md',
    ],
    blockedCommands: [
      { pattern: /git\s+(add|commit|push|merge|rebase|checkout|reset|revert)/, reason: 'git add/commit/push 是 Committer 工作' },
    ],
    description: '开发者（Developer）',
    responsibilities: [
      '在 file_scope 内编写代码',
      '实现接口和功能',
      '编写单元测试',
      '维护 dev-log（YAML frontmatter）',
    ],
    restrictions: [
      '禁止修改 file_scope 之外的文件',
      '禁止修改其他 Developer 的文件',
      '禁止 git add/commit/push',
    ],
  },

  'agent-team-reviewer': {
    allowedPaths: [
      'agent-team-logs/rounds/round-*/review.md',
      'agent-team-logs/notepads/**',
    ],
    blockedPaths: [],
    blockedCommands: [
      { pattern: /npm\s+(run\s+)?(build|test|lint|start|dev)/, reason: 'npm build/test 是 Dev/Tester 工作' },
      { pattern: /cargo\s+(build|test|run|install)/, reason: 'cargo build/test 是 Dev/Tester 工作' },
      { pattern: /python\s+-m\s+pytest/, reason: 'pytest 是 Dev/Tester 工作' },
      { pattern: /go\s+(build|test|install|run)/, reason: 'go build/test 是 Dev/Tester 工作' },
      { pattern: /make\s+(build|test|all|install)/, reason: 'make build/test 是 Dev/Tester 工作' },
    ],
    description: '代码审查员（Reviewer）',
    responsibilities: [
      '审查所有模块的代码质量',
      '验证接口规范符合性',
      '检查安全漏洞和边界问题',
      '生成审查报告（review.md）',
    ],
    restrictions: [
      '禁止 Write/Edit 项目源文件',
      '禁止运行 build/test 命令',
      '禁止 git add/commit/push（除非是 Committer 模式）',
    ],
  },

  'agent-team-tester': {
    allowedPaths: [
      'agent-team-logs/rounds/round-*/test.md',
      'agent-team-logs/notepads/**',
    ],
    blockedPaths: [],
    blockedCommands: [
      { pattern: /git\s+(add|commit|push|merge|rebase|checkout|reset|revert)/, reason: 'git add/commit/push 是 Committer 工作' },
      { pattern: /npm\s+run\s+build/, reason: 'npm run build 是 Dev 工作' },
      { pattern: /cargo\s+build/, reason: 'cargo build 是 Dev 工作' },
      { pattern: /go\s+build/, reason: 'go build 是 Dev 工作' },
      { pattern: /make\s+build/, reason: 'make build 是 Dev 工作' },
    ],
    description: '测试员（Tester）',
    responsibilities: [
      '执行功能测试和边界测试',
      '验证 bug 修复效果',
      '生成测试报告（test.md）',
      '使用 derive-severity.mjs 推导严重度',
    ],
    restrictions: [
      '禁止 Write/Edit 项目源文件',
      '禁止运行 build 命令（test 命令除外）',
      '禁止 git add/commit/push',
    ],
  },
};

// ============================================================
// 敏感路径配置（所有角色都禁止）
// ============================================================

const SENSITIVE_PATHS = [
  '.git/**',
  'node_modules/**',
  '.env',
  '.env.*',
  '**/*.key',
  '**/*.pem',
  '**/*.p12',
  '**/*.pfx',
  'id_rsa*',
  'id_ed25519*',
];

// ============================================================
// 辅助函数
// ============================================================

/**
 * 简单的 glob 匹配（支持 ** 和 * 通配符）
 */
function matchGlob(filePath, pattern) {
  const normalizedPath = filePath.replace(/\\/g, '/');
  const normalizedPattern = pattern.replace(/\\/g, '/');

  const regexStr = normalizedPattern
    .replace(/\*\*/g, '{{GLOBSTAR}}')
    .replace(/\*/g, '[^/]*')
    .replace(/\{\{GLOBSTAR\}\}/g, '.*')
    .replace(/\?/g, '[^/]');

  const regex = new RegExp(`^${regexStr}$`, 'i');
  return regex.test(normalizedPath);
}

/**
 * 检查路径是否匹配任何模式
 */
function matchesAnyPattern(filePath, patterns) {
  return patterns.some((pattern) => matchGlob(filePath, pattern));
}

/**
 * 从 tool 参数中提取目标文件路径
 */
function extractTargetPath(toolName, args) {
  if (!args) return '';

  // Write/Edit 工具的路径参数
  if (args.file_path) return args.file_path;
  if (args.path) return args.path;
  if (args.filePath) return args.filePath;

  return '';
}

/**
 * 从 Bash 工具参数中提取命令
 */
function extractBashCommand(args) {
  if (!args) return '';
  return args.command || '';
}

/**
 * 检查 Bash 命令是否被阻止
 */
function checkBlockedCommand(command, blockedCommands) {
  for (const { pattern, reason } of blockedCommands) {
    if (pattern.test(command)) {
      return { blocked: true, reason };
    }
  }
  return { blocked: false, reason: '' };
}

/**
 * 生成角色拦截提示
 */
function generateDenyMessage(role, action, target, reason) {
  const permissions = ROLE_PERMISSIONS[role];
  if (!permissions) return `⛔ 角色越权拦截：未知角色 ${role}`;

  const lines = [
    `⛔ 角色越权拦截`,
    ``,
    `👤 你的角色: ${permissions.description}`,
    ``,
    `🚫 拦截的操作: ${action}`,
    target ? `📁 目标: ${target}` : '',
    reason ? `📝 原因: ${reason}` : '',
    ``,
    `✅ 你的职责:`,
    ...permissions.responsibilities.map(r => `  • ${r}`),
    ``,
    `❌ 你不能:`,
    ...permissions.restrictions.map(r => `  • ${r}`),
    ``,
    `💡 提示: 如果你认为这个拦截是错误的，请联系 PM 协调。`,
  ];

  return lines.filter(Boolean).join('\n');
}

/**
 * 检查文件路径是否在允许的路径列表中
 */
function isPathAllowed(filePath, allowedPaths, blockedPaths) {
  // 先检查是否在阻止列表中
  if (blockedPaths && blockedPaths.length > 0) {
    if (matchesAnyPattern(filePath, blockedPaths)) {
      return { allowed: false, reason: '此路径被明确阻止' };
    }
  }

  // 检查是否在允许列表中
  if (allowedPaths && allowedPaths.length > 0) {
    if (matchesAnyPattern(filePath, allowedPaths)) {
      return { allowed: true, reason: '' };
    }
    return { allowed: false, reason: '不在允许的路径范围内' };
  }

  // 如果没有定义允许路径，默认允许
  return { allowed: true, reason: '' };
}

// ============================================================
// Hook 主体
// ============================================================

async function main() {
  // 从 stdin 读取 JSON 输入
  const chunks = [];
  for await (const chunk of process.stdin) {
    chunks.push(chunk);
  }
  const input = JSON.parse(Buffer.concat(chunks).toString('utf-8'));

  // Claude Code 的 PreToolUse 输入格式
  const toolName = input.tool_name || '';
  const toolInput = input.tool_input || {};
  const agentType = input.agent_type || '';
  const agentId = input.agent_id || '';

  // ============================================================
  // 处理 Write/Edit 工具
  // ============================================================

  if (['Write', 'Edit'].includes(toolName)) {
    const targetPath = extractTargetPath(toolName, toolInput);

    // 如果无法提取路径，放行
    if (!targetPath) {
      process.exit(0);
    }

    // 检查是否在写入敏感目录（所有角色都禁止，包括主线程/PM）
    if (matchesAnyPattern(targetPath, SENSITIVE_PATHS)) {
      const output = {
        hookSpecificOutput: {
          hookEventName: 'PreToolUse',
          permissionDecision: 'deny',
          permissionDecisionReason: generateDenyMessage(
            agentType || 'PM（主线程）',
            `${toolName} 敏感文件`,
            targetPath,
            '不允许直接写入敏感文件（.git、.env、密钥等）'
          ),
        },
      };
      console.log(JSON.stringify(output));
      process.exit(0);
    }

    // 如果没有 agent_type（主线程/PM），放行（敏感路径已检查）
    if (!agentType) {
      process.exit(0);
    }

    // 获取角色权限配置
    const permissions = ROLE_PERMISSIONS[agentType];

    // 如果不是 agent-team 的角色，放行
    if (!permissions) {
      process.exit(0);
    }

    // 检查路径权限
    const pathCheck = isPathAllowed(targetPath, permissions.allowedPaths, permissions.blockedPaths);
    if (!pathCheck.allowed) {
      const output = {
        hookSpecificOutput: {
          hookEventName: 'PreToolUse',
          permissionDecision: 'deny',
          permissionDecisionReason: generateDenyMessage(
            agentType,
            `${toolName} 项目源文件`,
            targetPath,
            pathCheck.reason
          ),
        },
      };
      console.log(JSON.stringify(output));
      process.exit(0);
    }

    // 路径检查通过，放行
    process.exit(0);
  }

  // ============================================================
  // 处理 Bash 工具
  // ============================================================

  if (toolName === 'Bash') {
    // 如果没有 agent_type（主线程/PM），放行所有 Bash 命令
    if (!agentType) {
      process.exit(0);
    }

    // 获取角色权限配置
    const permissions = ROLE_PERMISSIONS[agentType];

    // 如果不是 agent-team 的角色，放行
    if (!permissions) {
      process.exit(0);
    }

    const command = extractBashCommand(toolInput);

    // 如果无法提取命令，放行
    if (!command) {
      process.exit(0);
    }

    // 检查命令是否被阻止
    const commandCheck = checkBlockedCommand(command, permissions.blockedCommands);
    if (commandCheck.blocked) {
      const output = {
        hookSpecificOutput: {
          hookEventName: 'PreToolUse',
          permissionDecision: 'deny',
          permissionDecisionReason: generateDenyMessage(
            agentType,
            'Bash 命令',
            command.length > 100 ? command.substring(0, 100) + '...' : command,
            commandCheck.reason
          ),
        },
      };
      console.log(JSON.stringify(output));
      process.exit(0);
    }

    // 命令检查通过，放行
    process.exit(0);
  }

  // ============================================================
  // 其他工具，放行
  // ============================================================

  process.exit(0);
}

main().catch((err) => {
  // 出错时放行，不阻止正常操作
  console.error('[agent-guard] Error:', err.message);
  process.exit(0);
});
