import fs from 'node:fs';
import path from 'node:path';
import type { FullResult, Reporter, TestCase, TestResult, TestStep } from '@playwright/test/reporter';

/**
 * Writes `reports/failures.md`: one compact,
 * self-contained section per failed test, built to be pasted into an AI
 * assistant (or read by one) to debug the failure quickly.
 *
 * Each section has: the test and its file:line, the clean error, the code
 * frame, the last steps before the failure, the page's accessibility snapshot
 * at the moment of failure, and paths to the screenshot / trace / video.
 *
 * On GitHub Actions the same markdown is appended to the job summary, so the
 * failure is one click away from the run page.
 */
interface FailureRecord {
  title: string;
  location: string;
  project: string;
  retry: number;
  status: string;
  durationMs: number;
  error: string;
  codeFrame?: string;
  lastSteps: string[];
  pageSnapshot?: string;
  attachments: Record<string, string>;
  /** Final outcome after retries: 'unexpected' (failed) or 'flaky' (failed, then passed on retry). */
  outcome: () => string;
}

// eslint-disable-next-line no-control-regex -- strips terminal colour codes from error messages
const ANSI = /\u001b\[[0-9;]*m/g;
const clean = (s = '') => s.replace(ANSI, '').trim();
const MAX_SNAPSHOT_LINES = 120;

export default class AiFailureReporter implements Reporter {
  private failures: FailureRecord[] = [];
  private rootDir = process.cwd();
  private readonly outDir: string;

  constructor(options: { outputDir?: string } = {}) {
    this.outDir = options.outputDir ?? 'test-results';
  }

  onTestEnd(test: TestCase, result: TestResult): void {
    if (result.status === 'passed' || result.status === 'skipped') return;
    if (result.status === test.expectedStatus) return;

    const attachments: Record<string, string> = {};
    for (const a of result.attachments) {
      if (a.path) attachments[a.name] = path.relative(this.rootDir, a.path);
    }

    this.failures.push({
      outcome: () => test.outcome(),
      title: test.titlePath().filter(Boolean).slice(1).join(' › '),
      location: `${path.relative(this.rootDir, test.location.file)}:${test.location.line}`,
      project: test.parent.project()?.name ?? '',
      retry: result.retry,
      status: result.status,
      durationMs: result.duration,
      error: result.errors.map((e) => clean(e.message ?? e.value)).join('\n\n') || 'unknown error',
      codeFrame: clean(result.errors[0]?.snippet),
      lastSteps: this.lastSteps(result.steps),
      pageSnapshot: this.pageSnapshot(attachments['error-context']),
      attachments,
    });
  }

  onEnd(result: FullResult): void {
    fs.mkdirSync(this.outDir, { recursive: true });
    const md = this.toMarkdown(result);
    fs.writeFileSync(path.join(this.outDir, 'failures.md'), md);
    if (process.env.GITHUB_STEP_SUMMARY && this.failures.length) {
      fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, md);
    }
    if (this.failures.length) {
      console.log(
        `\n🧩 AI debug summary: ${path.join(this.outDir, 'failures.md')} (${this.failures.length} failure(s))`,
      );
    }
  }

  /** The last few steps, so the reader sees what the test was doing. Repeats are collapsed. */
  private lastSteps(steps: TestStep[], limit = 15): string[] {
    const flat: string[] = [];
    const walk = (list: TestStep[], depth: number) => {
      for (const s of list) {
        if (s.category === 'hook' || s.category === 'fixture') {
          walk(s.steps, depth);
          continue;
        }
        if (s.title === 'Close context') continue;
        if (s.category === 'test.step' || s.category === 'expect' || s.category === 'pw:api') {
          const loc = s.location ? ` (${path.basename(s.location.file)}:${s.location.line})` : '';
          flat.push(`${'  '.repeat(depth)}${s.error ? '✗' : '✓'} ${s.title}${loc}`);
        }
        // Named page-object steps ("Select to station: WAS") are enough on
        // their own; only expand one when the failure happened inside it.
        if (s.category === 'test.step' && !s.error) continue;
        walk(s.steps, depth + 1);
      }
    };
    walk(steps, 0);
    // expect.poll and retried assertions produce long runs of identical steps.
    const collapsed: string[] = [];
    let run = 0;
    for (let i = 0; i < flat.length; i++) {
      run++;
      if (flat[i] !== flat[i + 1]) {
        collapsed.push(run > 1 ? `${flat[i]}  ×${run}` : flat[i]);
        run = 0;
      }
    }
    return collapsed.slice(-limit);
  }

  /** The aria snapshot Playwright saves in error-context.md, trimmed. */
  private pageSnapshot(errorContextPath?: string): string | undefined {
    if (!errorContextPath) return undefined;
    try {
      const text = fs.readFileSync(path.resolve(this.rootDir, errorContextPath), 'utf8');
      const match = text.match(/```yaml\n([\s\S]*?)```/);
      if (!match) return undefined;
      const lines = match[1].split('\n');
      return lines.length > MAX_SNAPSHOT_LINES
        ? [
            ...lines.slice(0, MAX_SNAPSHOT_LINES),
            `… (${lines.length - MAX_SNAPSHOT_LINES} more lines in ${errorContextPath})`,
          ].join('\n')
        : match[1];
    } catch {
      return undefined;
    }
  }

  private toMarkdown(result: FullResult): string {
    if (!this.failures.length) return `# Test run: ${result.status}\n\nNo failures.\n`;
    const flaky = this.failures.filter((f) => f.outcome() === 'flaky').length;
    const failed = this.failures.length - flaky;
    const out: string[] = [
      `# ❌ ${failed} failed attempt(s) · ⚠️ ${flaky} flaky attempt(s) (test passed on retry)`,
      '',
      '> Paste this file into an AI assistant (or point it at it) and ask: ' +
        '"Explain why each test failed and propose a fix. The app under test is amtrak.com/home; ' +
        'page objects live in src/, specs in tests/."',
      '',
    ];
    this.failures.forEach((f, i) => {
      out.push(
        `## ${i + 1}. ${f.outcome() === 'flaky' ? '[FLAKY - passed on retry] ' : ''}${f.title}`,
        '',
        `- **Spec:** \`${f.location}\`  •  **Project:** ${f.project}  •  **Retry:** ${f.retry}  •  **Status:** ${f.status}  •  **Duration:** ${(f.durationMs / 1000).toFixed(1)}s`,
        '',
        '**Error**',
        '```',
        f.error.slice(0, 4000),
        '```',
      );
      if (f.codeFrame) out.push('**Code frame**', '```ts', f.codeFrame, '```');
      if (f.lastSteps.length) out.push('**Last steps**', '```', ...f.lastSteps, '```');
      if (f.pageSnapshot) {
        out.push(
          '<details><summary><b>Page accessibility snapshot at failure</b></summary>',
          '',
          '```yaml',
          f.pageSnapshot,
          '```',
          '</details>',
          '',
        );
      }
      const files = Object.entries(f.attachments).map(([k, v]) => `  - ${k}: \`${v}\``);
      if (files.length) {
        out.push('**Artifacts** (open a trace with `npx playwright show-trace <path>`)', ...files, '');
      }
    });
    return out.join('\n');
  }
}
