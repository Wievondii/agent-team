#!/usr/bin/env node
// skills/team/scripts/rebuild-boulder.mjs
// 从项目目录的 boulder-events.jsonl 重建 boulder.json 视图。
// 用法：node rebuild-boulder.mjs --project-root <path>
import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { withLock } from './lib/locking.mjs';
import {
  getEventsPath,
  getBoulderPath,
  getProjectRoot,
  ensureSchemasExist,
} from './lib/paths.mjs';
import { validateAgainst } from './lib/schema-loader.mjs';

ensureSchemasExist();

const projectRoot = getProjectRoot();
const eventsPath = getEventsPath(projectRoot);
const boulderPath = getBoulderPath(projectRoot);
mkdirSync(dirname(boulderPath), { recursive: true });

function emptyState() {
  return {
    schema_version: '2.0',
    current_round: 0,
    status: 'idle',
    started_at: null,
    last_activity: null,
    active_plan: null,
    round_baseline_tag: null,
    budgets: {
      reviewer_rejection: { used: 0, max: 3 },
      bug_fix_a: { used: 0, max: 3 },
      bug_fix_b: { used: 0, max: 2 },
      round_total: { used: 0, max: 8 },
    },
    agents: {
      planner: { status: 'idle', task_id: null },
      developers: {},
      integration_lead: null,
      reviewers: [],
      testers: [],
    },
    events_offset: 0,
    escalation: null,
  };
}

function applyEvent(state, ev) {
  state.last_activity = ev.ts;
  switch (ev.event) {
    case 'round_started':
      state.current_round = ev.round;
      state.status = 'in_progress';
      state.started_at = ev.ts;
      state.budgets.reviewer_rejection.used = 0;
      state.budgets.bug_fix_a.used = 0;
      state.budgets.bug_fix_b.used = 0;
      state.budgets.round_total.used = 0;
      state.agents.planner = { status: 'idle', task_id: null };
      state.agents.developers = {};
      state.agents.integration_lead = null;
      state.agents.reviewers = [];
      state.agents.testers = [];
      break;
    case 'round_baseline_tagged':
      state.round_baseline_tag = ev.tag ?? `round-${ev.round}-baseline`;
      break;
    case 'round_completed':
      state.status = 'idle';
      break;
    case 'agent_spawned':
      if (ev.role === 'planner') {
        state.agents.planner = {
          status: 'active',
          task_id: ev.task_id ?? null,
          started_at: ev.ts,
          last_heartbeat: ev.ts,
        };
      } else if (ev.role === 'developer') {
        state.agents.developers[ev.module] = {
          status: 'active',
          task_id: ev.task_id ?? null,
          module: ev.module,
          started_at: ev.ts,
          last_heartbeat: ev.ts,
          is_integration_lead: ev.is_integration_lead ?? false,
        };
        if (ev.is_integration_lead) {
          state.agents.integration_lead = ev.module;
        }
      } else if (ev.role === 'reviewer' || ev.role === 'committer') {
        state.agents.reviewers.push({
          status: 'active',
          task_id: ev.task_id ?? null,
          role: ev.role,
          scope: ev.scope ?? [],
          started_at: ev.ts,
          last_heartbeat: ev.ts,
        });
      } else if (ev.role === 'tester') {
        state.agents.testers.push({
          status: 'active',
          task_id: ev.task_id ?? null,
          module: ev.module,
          started_at: ev.ts,
          last_heartbeat: ev.ts,
        });
      }
      break;
    case 'agent_heartbeat':
      patchAgent(state, ev, (a) => { a.last_heartbeat = ev.ts; });
      break;
    case 'agent_completed':
      patchAgent(state, ev, (a) => {
        a.status = 'sleeping';
        a.completed_at = ev.ts;
      });
      break;
    case 'agent_failed':
      patchAgent(state, ev, (a) => { a.status = 'failed'; });
      break;
    case 'agent_resumed':
      patchAgent(state, ev, (a) => {
        a.status = 'active';
        a.last_heartbeat = ev.ts;
      });
      break;
    case 'task_id_expired':
      patchAgent(state, ev, (a) => {
        a.status = 'expired';
        a.task_id = null;
      });
      break;
    case 'budget_consumed':
      if (state.budgets[ev.kind]) {
        state.budgets[ev.kind].used += ev.amount ?? 1;
        state.budgets.round_total.used += ev.amount ?? 1;
      }
      break;
    case 'budget_exhausted':
      state.status = 'blocked';
      break;
    case 'escalation_raised':
      state.status = 'escalated';
      state.escalation = {
        trigger: ev.trigger,
        raised_at: ev.ts,
        details: ev.details ?? '',
      };
      break;
    case 'escalation_resolved':
      state.escalation = null;
      state.status = 'in_progress';
      break;
    default:
      break;
  }
  return state;
}

function patchAgent(state, ev, mutator) {
  if (ev.role === 'planner') {
    mutator(state.agents.planner);
  } else if (ev.role === 'developer' && ev.module) {
    const a = state.agents.developers[ev.module];
    if (a) mutator(a);
  } else if ((ev.role === 'reviewer' || ev.role === 'committer') && state.agents.reviewers.length) {
    for (let i = state.agents.reviewers.length - 1; i >= 0; i--) {
      if (!ev.task_id || state.agents.reviewers[i].task_id === ev.task_id) {
        mutator(state.agents.reviewers[i]);
        return;
      }
    }
  } else if (ev.role === 'tester') {
    for (let i = state.agents.testers.length - 1; i >= 0; i--) {
      if (state.agents.testers[i].module === ev.module) {
        mutator(state.agents.testers[i]);
        return;
      }
    }
  }
}

const result = await withLock(boulderPath, async () => {
  let events = [];
  if (existsSync(eventsPath)) {
    const lines = readFileSync(eventsPath, 'utf-8').trim().split('\n').filter(Boolean);
    events = lines.map((l) => JSON.parse(l));
  }
  let state = emptyState();
  for (const ev of events) {
    state = applyEvent(state, ev);
  }
  state.events_offset = events.length;

  const validation = validateAgainst('boulder', state);
  if (!validation.valid) {
    console.error('重建后的 boulder.json 不符合 schema：');
    for (const err of validation.errors) console.error('  - ' + err);
  }
  writeFileSync(boulderPath, JSON.stringify(state, null, 2));
  return state;
});

console.log(JSON.stringify({ ok: true, current_round: result.current_round, status: result.status }));
