import chalk from "chalk";
import { isCiOutputMode } from "../lib/ci-mode";
import { OraProgressReporter, type ProgressReporter, SilentProgressReporter } from "./progress";

/**
 * Pure text formatters: return styled text without printing it.
 * Use these when composing strings (e.g. help text) instead of the Console
 * methods of the same name, which also print.
 */
export const textStyle = {
  important: (message: string) => chalk.bold(message),
  hint: (message: string) => chalk.gray(message),
  code: (message: string) => chalk.cyan(message),
} as const;

export class Console {
  private options: { quiet: boolean } = { quiet: false };
  progress: ProgressReporter = isCiOutputMode()
    ? new SilentProgressReporter()
    : new OraProgressReporter();

  setOptions(options: { quiet: boolean } = { quiet: false }) {
    this.options = options;
  }

  hint(message: string) {
    const text = textStyle.hint(message);
    if (!this.options.quiet) {
      global.console.log(text);
    }

    return text;
  }

  status(message: string) {
    global.console.log(message);
  }

  info(message: string) {
    const text = chalk.white(message);

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
    const text = chalk.bold.white(message);
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
    const text = textStyle.important(path);
    if (!this.options.quiet) {
      global.console.log(text);
    }

    return text;
  }

  code(message: string) {
    const text = textStyle.code(message);
    if (!this.options.quiet) {
      global.console.log(text);
    }

    return text;
  }

  // Enhanced styling methods for better DX with consistent colors

  subtitle(message: string) {
    const text = chalk.bold(message); // No color, just bold
    if (!this.options.quiet) {
      global.console.log(text);
    }
    return text;
  }

  field(name: string, value: string) {
    const text = `${chalk.bold(name)}: ${value}`; // Bold label, normal value
    if (!this.options.quiet) {
      global.console.log(text);
    }
    return text;
  }

  path(path: string) {
    return chalk.yellow(path); // Yellow for paths (not bold)
  }

  value(value: string) {
    return chalk.cyan(value); // Cyan for values
  }

  type(type: string) {
    return chalk.white(type); // White for types
  }

  // Text without any color styling
  text(message: string) {
    if (!this.options.quiet) {
      global.console.log(message);
    }
    return message;
  }

  // Muted text for less important info
  muted(message: string) {
    const text = chalk.gray(message);
    if (!this.options.quiet) {
      global.console.log(text);
    }
    return text;
  }

  separator(char: string = "─", length: number = 50) {
    const text = chalk.gray(char.repeat(length));
    if (!this.options.quiet) {
      global.console.log(text);
    }
    return text;
  }

  box(content: string[], title?: string) {
    // Simple box without complex width calculations
    const maxWidth = 60; // Fixed width for consistency
    const border = "─".repeat(maxWidth - 2);

    const lines = [
      chalk.gray(`╭${border}╮`),
      ...(title
        ? [chalk.gray(`│ ${chalk.bold(title)}${" ".repeat(maxWidth - title.length - 3)}│`)]
        : []),
      ...(title ? [chalk.gray(`├${border}┤`)] : []),
      ...content.map((line) =>
        chalk.gray(`│ ${line}${" ".repeat(Math.max(0, maxWidth - line.length - 3))}│`)
      ),
      chalk.gray(`╰${border}╯`),
    ];

    if (!this.options.quiet) {
      lines.forEach((line) => global.console.log(line));
    }
    return lines.join("\n");
  }

  icon(name: "error" | "warning" | "info" | "success" | "fix") {
    const icons = {
      error: "❌",
      warning: "⚠️",
      info: "ℹ️",
      success: "✅",
      fix: "🔧",
    };
    return icons[name];
  }
}

export const cliConsole = new Console();
