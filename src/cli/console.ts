import chalk from "chalk";

export class Console {
  private options: { quiet: boolean } = { quiet: false };

  setOptions(options: { quiet: boolean } = { quiet: false }) {
    this.options = options;
  }

  hint(message: string) {
    const text = chalk.gray(message);
    if (!this.options.quiet) {
      global.console.log(text);
    }

    return text;
  }

  status(message: string) {
    global.console.log(message);
  }

  info(message: string) {
    const text = chalk.blue(message);

    if (!this.options.quiet) {
      global.console.log(text);
    }

    return text;
  }

  warn(message: string) {
    const text = chalk.yellow(message);
    if (!this.options.quiet) {
      global.console.log(text);
    }

    return text;
  }

  success(message: string) {
    const text = chalk.green(message);
    if (!this.options.quiet) {
      global.console.log(text);
    }

    return text;
  }

  error(error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    const text = chalk.red(message);
    // TODO: improve error formatting
    global.console.error(text);

    return text;
  }

  prompt(message: string) {
    const text = chalk.cyan(message);
    if (!this.options.quiet) {
      process.stdout.write(text);
    }

    return text;
  }

  header(message: string) {
    const text = chalk.bold.blue(message);
    if (!this.options.quiet) {
      global.console.log(text);
    }

    return text;
  }

  processing(message: string) {
    const text = chalk.blue(message);
    if (!this.options.quiet) {
      global.console.log(text);
    }

    return text;
  }

  cancelled(message: string) {
    const text = chalk.red(message);
    if (!this.options.quiet) {
      global.console.log(text);
    }

    return text;
  }

  important(path: string) {
    const text = chalk.bold(path);
    if (!this.options.quiet) {
      global.console.log(text);
    }

    return text;
  }

  code(message: string) {
    const text = chalk.cyan(message);
    if (!this.options.quiet) {
      global.console.log(text);
    }

    return text;
  }
}

export const cliConsole = new Console();
