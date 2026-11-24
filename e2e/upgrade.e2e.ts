import path from "node:path";
import { beforeAll, describe, expect, inject, it } from "vitest";
import { parseEnvelope, runCli, saleorCli } from "./lib/cli";
import { installCli, releaseSpec } from "./lib/package";
import { runPrefix, seedStore, workspace } from "./lib/store";

const PREFIX = runPrefix("upgrade");

/**
 * Users upgrade with a config file and a store the previous release wrote. The checkout must
 * read both: the file validates, and the store it describes shows no changes.
 */
describe(`upgrading from ${releaseSpec()}`, () => {
  let dir: string;
  let releasePath: string;

  beforeAll(() => {
    dir = workspace("upgrade");
    const releaseBin = installCli(path.join(dir, "release"), releaseSpec());
    const { firstDeploy } = seedStore(dir, PREFIX, releaseBin);
    if (firstDeploy.exitCode !== 0) {
      throw new Error(`The release failed to seed the store: ${JSON.stringify(firstDeploy)}`);
    }
    releasePath = path.join(dir, "release.yml");
    const introspect = saleorCli(inject("saleor"), dir, releaseBin).introspect(releasePath);
    if (introspect.exitCode !== 0) {
      throw new Error(`The release failed to introspect: ${JSON.stringify(introspect)}`);
    }
  });

  it("validates the file the release wrote", () => {
    const validate = parseEnvelope<{ valid: boolean; errors: unknown[] }>(
      runCli(["validate", "--config=release.yml"], { cwd: dir })
    );
    expect(validate.exitCode).toBe(0);
    expect(validate.result).toMatchObject({ valid: true, errors: [] });
  });

  it("diffs the release's file against the release's store with no changes", () => {
    const diff = saleorCli(inject("saleor"), dir).diff(releasePath);
    expect(diff.exitCode).toBe(0);
    expect(diff.result.summary.totalChanges).toBe(0);
  });

  it("deploys the release's file with no changes", () => {
    const deploy = saleorCli(inject("saleor"), dir).deploy(releasePath);
    expect(deploy.exitCode).toBe(0);
    expect(deploy.result.status).toBe("no-changes");
  });
});
