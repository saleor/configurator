import type { BaseCommandArgs } from "../cli/command";
import { cliConsole } from "../cli/console";
import { createClient } from "../lib/graphql/client";
import { logger } from "../lib/logger";
import { DiffFormatter, DiffService } from "./diff";
import { ServiceComposer, type ServiceContainer } from "./service-container";

export class SaleorConfigurator {
  constructor(public readonly services: ServiceContainer) {}

  /**
   * Validates the local configuration without making network calls
   * @throws {Error} If the local configuration is invalid
   */
  async validateLocalConfiguration(): Promise<void> {
    try {
      await this.services.configStorage.load();
    } catch (error) {
      logger.error("Local configuration validation failed", { error });
      throw error;
    }
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
      const diffService = new DiffService(this.services);

      const summary = await diffService.compare();
      cliConsole.progress.succeed("Configuration comparison completed");

      const output = DiffFormatter.format(summary);

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
