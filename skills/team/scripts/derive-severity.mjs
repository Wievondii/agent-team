#!/usr/bin/env node
// agent-team/scripts/derive-severity.mjs
// 根据 impact + frequency 推导 Bug 严重度。
import { deriveSeverity } from './lib/severity-matrix.mjs';

const impact = process.argv[2];
const frequency = process.argv[3];
if (!impact || !frequency) {
  console.error('用法：node derive-severity.mjs <impact> <frequency>');
  process.exit(2);
}
console.log(deriveSeverity(impact, frequency));
