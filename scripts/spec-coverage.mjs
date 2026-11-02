#!/usr/bin/env node
/**
 * Spec coverage: cross-checks requirements in specs/ against test tags.
 *
 *   npm run spec:coverage           # prints a report, exits 1 on errors
 *
 * Errors (fail the build):
 *  - a test under tests/find-trains/ has no requirement tag (@AREA-NN)
 *  - a test uses a requirement ID that doesn't exist in specs/
 *  - status `automated` / `known-bug` but no test is tagged with the ID
 *  - status `gap` / `out-of-scope` but a test is tagged with it (update the status)
 *  - a `known-bug` requirement's test isn't tagged @known-bug (or vice versa)
 * Open gaps are listed but don't fail the build.
 * On GitHub Actions the report is also appended to the job summary.
 */
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

const SPECS_DIR = 'specs';
const ID_RE = /^@([A-Z]+-\d{2,})$/;

// 1. Requirements from specs/**/*.md: "### ID · Title" followed by "**Status:** x"
const requirements = new Map();
const walk = (dir) =>
  fs
    .readdirSync(dir, { withFileTypes: true })
    .flatMap((e) =>
      e.isDirectory() ? walk(path.join(dir, e.name)) : e.name.endsWith('.md') ? [path.join(dir, e.name)] : [],
    );
for (const file of walk(SPECS_DIR)) {
  const lines = fs.readFileSync(file, 'utf8').split('\n');
  let inCode = false; // ignore examples inside ``` fences
  lines.forEach((line, i) => {
    if (line.startsWith('```')) inCode = !inCode;
    if (inCode) return;
    const m = line.match(/^###\s+([A-Z]+-\d{2,})\s+·\s+(.+)$/);
    if (!m) return;
    const statusLine = lines.slice(i + 1, i + 4).find((l) => l.includes('**Status:**')) ?? '';
    const status = statusLine.match(/\*\*Status:\*\*\s*([a-z-]+)/)?.[1] ?? 'missing';
    if (requirements.has(m[1])) throw new Error(`Duplicate requirement ID ${m[1]} in ${file}`);
    requirements.set(m[1], { id: m[1], title: m[2].trim(), status, file, tests: [] });
  });
}

// 2. Tests and their tags (known bugs included so their links are checked too).
const json = execFileSync('npx', ['playwright', 'test', '--list', '--reporter=json', '--project=chromium-desktop'], {
  encoding: 'utf8',
  env: { ...process.env, KNOWN_BUGS: '1', FORCE_COLOR: '0' },
  maxBuffer: 32 * 1024 * 1024,
});
const report = JSON.parse(json.slice(json.indexOf('{')));
const tests = [];
const collect = (suite, file) => {
  for (const spec of suite.specs ?? [])
    tests.push({ title: spec.title, file: spec.file ?? file, line: spec.line, tags: spec.tags ?? [] });
  for (const child of suite.suites ?? []) collect(child, suite.file ?? file);
};
for (const s of report.suites) collect(s, s.file);

// 3. Cross-check.
const errors = [];
for (const t of tests) {
  if (!t.file.startsWith('find-trains/')) continue; // seed / setup are infrastructure
  const ids = t.tags
    .map((tag) => `@${tag.replace(/^@/, '')}`)
    .map((tag) => tag.match(ID_RE)?.[1])
    .filter(Boolean);
  const where = `tests/${t.file}:${t.line} "${t.title}"`;
  if (!ids.length) errors.push(`No requirement tag on ${where}`);
  for (const id of ids) {
    const req = requirements.get(id);
    if (!req) {
      errors.push(`Unknown requirement ${id} on ${where}`);
      continue;
    }
    req.tests.push({ ...t, knownBug: t.tags.some((g) => g.replace(/^@/, '') === 'known-bug') });
  }
}
for (const r of requirements.values()) {
  const has = r.tests.length > 0;
  if (['automated', 'known-bug'].includes(r.status) && !has)
    errors.push(`${r.id} is "${r.status}" but no test is tagged @${r.id} (${r.file})`);
  if (['gap', 'out-of-scope'].includes(r.status) && has)
    errors.push(`${r.id} is "${r.status}" but tests are tagged with it; update the status (${r.file})`);
  if (!['automated', 'known-bug', 'gap', 'out-of-scope'].includes(r.status))
    errors.push(`${r.id} has invalid status "${r.status}" (${r.file})`);
  if (r.status === 'known-bug' && r.tests.some((t) => !t.knownBug))
    errors.push(`${r.id} is a known bug; its test must be tagged @known-bug`);
  if (r.status === 'automated' && r.tests.some((t) => t.knownBug))
    errors.push(`${r.id} is "automated" but its test is tagged @known-bug`);
}

// 4. Report.
const all = [...requirements.values()];
const count = (s) => all.filter((r) => r.status === s).length;
const inScope = all.filter((r) => r.status !== 'out-of-scope').length;
const covered = count('automated') + count('known-bug');
const out = [
  '## Spec coverage',
  '',
  `**${covered}/${inScope}** in-scope requirements have tests (${Math.round((covered / inScope) * 100)}%): ` +
    `${count('automated')} automated, ${count('known-bug')} known bug, ${count('gap')} gap, ${count('out-of-scope')} out of scope.`,
  '',
  '| Area | Automated | Known bug | Gap | Out of scope |',
  '|---|---|---|---|---|',
  ...[...new Set(all.map((r) => r.id.split('-')[0]))].map((area) => {
    const rs = all.filter((r) => r.id.startsWith(`${area}-`));
    const n = (s) => rs.filter((r) => r.status === s).length;
    return `| ${area} | ${n('automated')} | ${n('known-bug')} | ${n('gap')} | ${n('out-of-scope')} |`;
  }),
  '',
];
const gaps = all.filter((r) => r.status === 'gap');
if (gaps.length) out.push('**Open gaps**', ...gaps.map((r) => `- ${r.id} · ${r.title} (${r.file})`), '');
if (errors.length) out.push(`**❌ ${errors.length} error(s)**`, ...errors.map((e) => `- ${e}`), '');
else out.push('✅ Every test maps to a requirement, and every requirement status matches its tests.', '');

const md = out.join('\n');
console.log(md);
if (process.env.GITHUB_STEP_SUMMARY) fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, md + '\n');
process.exit(errors.length ? 1 : 0);
