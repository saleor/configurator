import chalk from "chalk";

export class Console {
  private options: { quiet: boolean } = { quiet: false };

  setOptions(options: { quiet: boolean } = { quiet: false }) {
    this.options = options;
  }

  bold(message: string) {
    return chalk.bold(message);
  }

  gray(message: string) {
    return chalk.gray(message);
  }

  status(message: string) {
    global.console.log(message);
  }

  info(message: string) {
    if (!this.options.quiet) {
      global.console.log(message);
    }
  }

  warn(message: string) {
    if (!this.options.quiet) {
      global.console.log(chalk.yellow(message));
    }
  }

  success(message: string) {
    if (!this.options.quiet) {
      global.console.log(chalk.green(message));
    }
  }

  error(error: unknown) {
    // TODO: improve error formatting
    global.console.error(chalk.red(error));
  }

  prompt(message: string) {
    if (!this.options.quiet) {
      process.stdout.write(chalk.cyan(message));
    }
  }

  header(message: string) {
    if (!this.options.quiet) {
      global.console.log(chalk.bold.blue(message));
    }
  }

  processing(message: string) {
    if (!this.options.quiet) {
      global.console.log(chalk.blue(message));
    }
  }

  cancelled(message: string) {
    if (!this.options.quiet) {
      global.console.log(chalk.red(message));
    }
  }

  filePath(path: string) {
    if (!this.options.quiet) {
      return chalk.bold(path);
    }
    return path;
  }

  // TODO: replace with inquirer.confirm
  async confirm(message: string): Promise<boolean> {
    this.prompt(`${message} [y/N]: `);
    process.stdin.setEncoding("utf8");
    process.stdin.resume();
    return new Promise((resolve) => {
      process.stdin.once("data", (data) => {
        process.stdin.pause();
        const answer = data.toString().trim();
        resolve(/^y(es)?$/i.test(answer));
      });
    });
  }
}

export const cliConsole = new Console();
