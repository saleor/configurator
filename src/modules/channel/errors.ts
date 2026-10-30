import { BaseError } from "../../lib/errors/shared";

export class ChannelError extends BaseError {
  constructor(message: string, recoverySuggestions?: string[]) {
    super(message, "CHANNEL_ERROR", recoverySuggestions);
  }
}

export class ChannelFetchError extends ChannelError {
  constructor(message: string) {
    super(message);
  }
}

export class ChannelCreationError extends ChannelError {
  constructor(message: string) {
    super(message);
  }
}

export class ChannelUpdateError extends ChannelError {
  constructor(message: string) {
    super(message);
  }
}
