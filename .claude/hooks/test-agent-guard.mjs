#!/usr/bin/env node

/**
 * Agent Guard Hook 测试脚本
 *
 * 模拟不同角色的工具调用，验证权限拦截是否正确
 *
 * 用法: node test-agent-guard.mjs
 */

import { execSync } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const HOOK_PATH = join(__dirname, 'agent-guard.js');

// 测试用例
const testCases = [
  // PM（主线程）- 应该全部放行
  {
    name: 'PM 写入项目文件',
    input: { tool_name: 'Write', tool_input: { file_path: 'src/index.ts' } },
    expected: 'allow',
  },
  {
    name: 'PM 运行 build 命令',
    input: { tool_name: 'Bash', tool_input: { command: 'npm run build' } },
    expected: 'allow',
  },

  // Planner - 只能写 agent-team-logs
  {
    name: 'Planner 写入 plan.md',
    input: {
      tool_name: 'Write',
      tool_input: { file_path: 'agent-team-logs/rounds/round-1/plan.md' },
      agent_type: 'agent-team-planner',
    },
    expected: 'allow',
  },
  {
    name: 'Planner 写入项目源文件（应拦截）',
    input: {
      tool_name: 'Write',
      tool_input: { file_path: 'src/index.ts' },
      agent_type: 'agent-team-planner',
    },
    expected: 'deny',
  },
  {
    name: 'Planner 运行 npm test（应拦截）',
    input: {
      tool_name: 'Bash',
      tool_input: { command: 'npm test' },
      agent_type: 'agent-team-planner',
    },
    expected: 'deny',
  },
  {
    name: 'Planner 运行 git commit（应拦截）',
    input: {
      tool_name: 'Bash',
      tool_input: { command: 'git commit -m "test"' },
      agent_type: 'agent-team-planner',
    },
    expected: 'deny',
  },
  {
    name: 'Planner 运行 node scripts（应放行）',
    input: {
      tool_name: 'Bash',
      tool_input: { command: 'node skills/team/scripts/validate-plan.mjs' },
      agent_type: 'agent-team-planner',
    },
    expected: 'allow',
  },

  // Developer - 只能写 file_scope 和 dev-*.md
  {
    name: 'Developer 写入 dev-log',
    input: {
      tool_name: 'Write',
      tool_input: { file_path: 'agent-team-logs/dev-auth.md' },
      agent_type: 'agent-team-developer',
    },
    expected: 'allow',
  },
  {
    name: 'Developer 写入其他模块文件（应拦截）',
    input: {
      tool_name: 'Write',
      tool_input: { file_path: 'src/payments/index.ts' },
      agent_type: 'agent-team-developer',
    },
    expected: 'deny',
  },
  {
    name: 'Developer 运行 git commit（应拦截）',
    input: {
      tool_name: 'Bash',
      tool_input: { command: 'git commit -m "feat: add auth"' },
      agent_type: 'agent-team-developer',
    },
    expected: 'deny',
  },
  {
    name: 'Developer 运行 npm test（应放行）',
    input: {
      tool_name: 'Bash',
      tool_input: { command: 'npm test' },
      agent_type: 'agent-team-developer',
    },
    expected: 'allow',
  },

  // Reviewer - 只能写 review.md
  {
    name: 'Reviewer 写入 review.md',
    input: {
      tool_name: 'Write',
      tool_input: { file_path: 'agent-team-logs/rounds/round-1/review.md' },
      agent_type: 'agent-team-reviewer',
    },
    expected: 'allow',
  },
  {
    name: 'Reviewer 写入项目源文件（应拦截）',
    input: {
      tool_name: 'Write',
      tool_input: { file_path: 'src/index.ts' },
      agent_type: 'agent-team-reviewer',
    },
    expected: 'deny',
  },
  {
    name: 'Reviewer 运行 npm test（应拦截）',
    input: {
      tool_name: 'Bash',
      tool_input: { command: 'npm test' },
      agent_type: 'agent-team-reviewer',
    },
    expected: 'deny',
  },

  // Tester - 只能写 test.md
  {
    name: 'Tester 写入 test.md',
    input: {
      tool_name: 'Write',
      tool_input: { file_path: 'agent-team-logs/rounds/round-1/test.md' },
      agent_type: 'agent-team-tester',
    },
    expected: 'allow',
  },
  {
    name: 'Tester 写入项目源文件（应拦截）',
    input: {
      tool_name: 'Write',
      tool_input: { file_path: 'src/index.ts' },
      agent_type: 'agent-team-tester',
    },
    expected: 'deny',
  },
  {
    name: 'Tester 运行 npm run build（应拦截）',
    input: {
      tool_name: 'Bash',
      tool_input: { command: 'npm run build' },
      agent_type: 'agent-team-tester',
    },
    expected: 'deny',
  },
  {
    name: 'Tester 运行 git add（应拦截）',
    input: {
      tool_name: 'Bash',
      tool_input: { command: 'git add .' },
      agent_type: 'agent-team-tester',
    },
    expected: 'deny',
  },

  // 敏感路径 - 所有角色都禁止
  {
    name: 'PM 写入 .env（应拦截）',
    input: {
      tool_name: 'Write',
      tool_input: { file_path: '.env' },
    },
    expected: 'deny',
  },
  {
    name: 'Developer 写入 .git/config（应拦截）',
    input: {
      tool_name: 'Write',
      tool_input: { file_path: '.git/config' },
      agent_type: 'agent-team-developer',
    },
    expected: 'deny',
  },
];

// 运行测试
function runTest(testCase) {
  const inputJson = JSON.stringify(testCase.input);

  try {
    const result = execSync(`node "${HOOK_PATH}"`, {
      input: inputJson,
      encoding: 'utf-8',
      timeout: 5000,
    });

    if (result.trim() === '') {
      // 没有输出 = 放行
      return testCase.expected === 'allow' ? 'PASS' : 'FAIL';
    }

    // 有输出 = 拦截
    const output = JSON.parse(result);
    const isDenied = output.hookSpecificOutput?.permissionDecision === 'deny';

    if (testCase.expected === 'deny' && isDenied) {
      return 'PASS';
    } else if (testCase.expected === 'allow' && !isDenied) {
      return 'PASS';
    } else {
      return 'FAIL';
    }
  } catch (err) {
    // hook 抛出异常 = 放行
    return testCase.expected === 'allow' ? 'PASS' : 'FAIL';
  }
}

// 执行所有测试
console.log('🧪 Agent Guard Hook 测试\n');

let passed = 0;
let failed = 0;

for (const testCase of testCases) {
  const result = runTest(testCase);
  const icon = result === 'PASS' ? '✅' : '❌';

  console.log(`${icon} ${testCase.name}`);
  console.log(`   期望: ${testCase.expected} | 结果: ${result}`);

  if (result === 'PASS') {
    passed++;
  } else {
    failed++;
    console.log(`   输入: ${JSON.stringify(testCase.input)}`);
  }

  console.log('');
}

console.log('─'.repeat(50));
console.log(`📊 结果: ${passed} 通过 / ${failed} 失败 / ${testCases.length} 总计`);

if (failed > 0) {
  process.exit(1);
}
