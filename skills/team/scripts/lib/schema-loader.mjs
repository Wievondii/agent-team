// agent-team/scripts/lib/schema-loader.mjs
// 从 agent-team/schemas/ 加载 JSON Schema 并构造 ajv 校验函数。
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import Ajv from 'ajv/dist/2020.js';
import addFormats from 'ajv-formats';
import { getSchemasDir } from './paths.mjs';

let ajvInstance = null;

function getAjv() {
  if (!ajvInstance) {
    ajvInstance = new Ajv({
      allErrors: true,
      strict: false,
      allowUnionTypes: true,
    });
    addFormats(ajvInstance);
  }
  return ajvInstance;
}

const validatorCache = new Map();

export function getValidator(schemaName) {
  if (validatorCache.has(schemaName)) {
    return validatorCache.get(schemaName);
  }
  const schemaPath = join(getSchemasDir(), `${schemaName}.schema.json`);
  const schema = JSON.parse(readFileSync(schemaPath, 'utf-8'));
  const ajv = getAjv();
  const validator = ajv.compile(schema);
  validatorCache.set(schemaName, validator);
  return validator;
}

/**
 * 校验数据，返回 {valid: true} 或 {valid: false, errors: [...]}。
 * errors 已转换为 human-readable 字符串数组。
 */
export function validateAgainst(schemaName, data) {
  const validator = getValidator(schemaName);
  const valid = validator(data);
  if (valid) return { valid: true };
  const errors = (validator.errors ?? []).map((e) => {
    const path = e.instancePath || '/';
    return `${path} ${e.message}${e.params ? ' (' + JSON.stringify(e.params) + ')' : ''}`;
  });
  return { valid: false, errors };
}
