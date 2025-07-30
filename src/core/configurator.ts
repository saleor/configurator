import type { BaseCommandArgs } from "../cli/command";
import { cliConsole } from "../cli/console";
import { createClient } from "../lib/graphql/client";
import { logger } from "../lib/logger";
import { formatDiff } from "./diff";
import { ServiceComposer, type ServiceContainer } from "./service-container";

export class SaleorConfigurator {
  constructor(public readonly services: ServiceContainer) {}

  /**
   * Get the service container for advanced usage
   * @internal
   */
  get serviceContainer(): ServiceContainer {
    return this.services;
  }

  async introspect() {
    cliConsole.progress.start("Retrieving configuration from Saleor");
    try {
      const config = await this.services.configuration.retrieve();
      cliConsole.progress.succeed("Configuration retrieved successfully");
      return config;
    } catch (error) {
      cliConsole.progress.fail("Failed to retrieve configuration");
      logger.error("Failed to retrieve configuration", { error });
      throw error;
    }
  }

  async diff() {
    cliConsole.progress.start("Comparing local and remote configurations");
    try {
      // Use the shared diff service instance from service container to ensure consistency
      const summary = await this.services.diffService.compare();
      cliConsole.progress.succeed("Configuration comparison completed");

      const output = formatDiff(summary);

      return {
        summary,
        output,
      };
    } catch (error) {
      cliConsole.progress.fail("Failed to compare configurations");
      logger.error("Failed to diff configurations", { error });
      throw error;
    }
  }
}

export function createConfigurator(baseArgs: BaseCommandArgs) {
  const { url, token, config: configPath } = baseArgs;

  const client = createClient(token, url);
  const services = ServiceComposer.compose(client, configPath);
  return new SaleorConfigurator(services);
}
