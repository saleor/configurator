import { stripVTControlCharacters as stripAnsi } from "node:util";
import { describe, expect, it } from "vitest";
import type { SaleorConfig } from "../../../modules/config/schema/schema";
import type { ServiceContainer } from "../../service-container";
import {
  createGitHubCommentFormatter,
  DeployDiffFormatter,
  DetailedDiffFormatter,
  IntrospectDiffFormatter,
  SummaryDiffFormatter,
} from "../formatters";
import { DiffService } from "../service";
import type { DiffSummary } from "../types";
import { DIFF_SCENARIOS } from "./scenarios";

function diffServiceFor(config: unknown, store: unknown): DiffService {
  const services = {
    configStorage: { load: async () => structuredClone(config) as SaleorConfig },
    configuration: { retrieveWithoutSaving: async () => structuredClone(store) as SaleorConfig },
  } as unknown as ServiceContainer;
  return new DiffService(services);
}

/** The parts of a summary that reach users: counts, and per entity the operation and changes. */
function describeSummary(summary: DiffSummary): string {
  const { results, ...counts } = summary;
  const lines = [JSON.stringify(counts)];
  for (const result of results) {
    lines.push(`${result.operation} ${result.entityType} "${result.entityName}"`);
    for (const change of result.changes ?? []) {
      const { field, currentValue, desiredValue, description } = change;
      lines.push(`  ${JSON.stringify({ field, currentValue, desiredValue, description })}`);
    }
  }
  return lines.join("\n");
}

function section(title: string, body: string): string {
  return `===== ${title} =====\n${stripAnsi(body).trimEnd()}\n`;
}

describe("diff characterization", () => {
  for (const scenario of DIFF_SCENARIOS) {
    it(`${scenario.name}`, async () => {
      const deploySummary = await diffServiceFor(scenario.config, scenario.store).compare();
      const introspectSummary = await diffServiceFor(
        scenario.config,
        scenario.store
      ).compareForIntrospect();

      const output = [
        section("deploy direction: summary", describeSummary(deploySummary)),
        section("deploy preview", new DeployDiffFormatter().format(deploySummary)),
        section("diff", new DetailedDiffFormatter().format(deploySummary)),
        section("diff summary", new SummaryDiffFormatter().format(deploySummary)),
        section("github comment", createGitHubCommentFormatter().format(deploySummary)),
        section("introspect direction: summary", describeSummary(introspectSummary)),
        section("introspect preview", new IntrospectDiffFormatter().format(introspectSummary)),
      ].join("\n");

      await expect(output).toMatchFileSnapshot(`__snapshots__/${scenario.name}.txt`);
    });
  }
});

describe("diff invariants", () => {
  for (const scenario of DIFF_SCENARIOS) {
    it(`${scenario.name}: a config compared with itself has no changes`, async () => {
      const summary = await diffServiceFor(scenario.config, scenario.config).compare();
      expect(summary.results).toEqual([]);
    });

    it(`${scenario.name}: a store compared with itself has no changes`, async () => {
      const summary = await diffServiceFor(scenario.store, scenario.store).compare();
      expect(summary.results).toEqual([]);
    });
  }
});
