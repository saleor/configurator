// TODO: move
import { displayErrorWithContext } from "../cli";

export class ConsoleOutput {
  constructor(
    private readonly options: { quiet: boolean } = { quiet: false }
  ) {}

  status(message: string) {
    console.log(message);
  }

  info(message: string) {
    if (!this.options.quiet) {
      console.log(message);
    }
  }

  error(error: unknown) {
    if (error instanceof Error) {
      displayErrorWithContext(error);
    } else {
      console.error("\n❌ An unexpected error occurred");
    }
  }
}
