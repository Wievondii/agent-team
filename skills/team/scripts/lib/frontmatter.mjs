// agent-team/scripts/lib/frontmatter.mjs
// 解析/写入 Markdown 的 YAML frontmatter。
import { parse as parseYaml, stringify as stringifyYaml } from 'yaml';

const FM_RE = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/;

export function parseFrontmatter(markdown) {
  const m = markdown.match(FM_RE);
  if (!m) {
    return { frontmatter: null, body: markdown };
  }
  const frontmatter = parseYaml(m[1]);
  const body = m[2];
  return { frontmatter, body };
}

export function buildFrontmatter(frontmatter, body = '') {
  const yaml = stringifyYaml(frontmatter, { lineWidth: 0 }).trimEnd();
  const sep = body.startsWith('\n') ? '' : '\n';
  return `---\n${yaml}\n---\n${sep}${body}`;
}
