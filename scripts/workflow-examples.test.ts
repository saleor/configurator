import { execFileSync } from "node:child_process";
import { mkdtempSync, readdirSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { expect, it } from "vitest";
import { parse } from "yaml";

const directory = new URL("../examples/github-workflows/", import.meta.url);

for (const file of readdirSync(directory).filter((name) => /\.ya?ml$/.test(name))) {
  const workflow = parse(readFileSync(new URL(file, directory), "utf8"));
  for (const [jobName, job] of Object.entries(workflow.jobs) as [
    string,
    {
      steps: {
        name: string;
        run?: string;
        env?: Record<string, string>;
        with?: { script?: string };
      }[];
    },
  ][]) {
    for (const step of job.steps) {
      const script = step.run ?? step.with?.script;
      if (!script) continue;

      it(`${file}: ${jobName}/${step.name} keeps expressions out of executable code`, () => {
        expect(script).not.toContain("${{");
      });

      const shellScript = step.run;
      if (!shellScript || !step.env) continue;
      it(`${file}: ${jobName}/${step.name} treats shell payloads as literal data`, () => {
        const temporary = mkdtempSync(join(tmpdir(), "configurator-workflow-"));
        const marker = join(temporary, "injected");
        const summary = join(temporary, "step summary.md");
        const payload = `"; touch '${marker}'; # $(touch '${marker}') \`touch '${marker}'\`\nsecond line`;
        try {
          for (const hasChanges of ["true", "false"]) {
            const env = Object.fromEntries(
              Object.keys(step.env ?? {}).map((key) => [key, payload])
            );
            env.CONFIGURATOR_HAS_CHANGES = hasChanges;
            execFileSync("bash", ["--noprofile", "--norc", "-euo", "pipefail", "-c", shellScript], {
              env: { ...process.env, ...env, GITHUB_STEP_SUMMARY: summary },
            });
          }
          expect(readdirSync(temporary)).not.toContain("injected");
          expect(readFileSync(summary, "utf8")).toContain(payload);
        } finally {
          rmSync(temporary, { recursive: true, force: true });
        }
      });
    }
  }
}
