import { BaseError } from "../../lib/errors/shared";

export class ChannelError extends BaseError {
  constructor(message: string, recoverySuggestions?: string[]) {
    super(message, "CHANNEL_ERROR", recoverySuggestions);
  }
}

export class ChannelFetchError extends ChannelError {
  constructor(message: string, _slug?: string) {
    super(message);
  }
}

export class ChannelNotFoundError extends ChannelError {
  constructor(channelSlug: string) {
    super(`Channel "${channelSlug}" not found`);
  }
}

export class ChannelCreationError extends ChannelError {
  constructor(message: string, _channelSlug?: string) {
    super(message);
  }
}

export class ChannelUpdateError extends ChannelError {
  constructor(message: string, _channelId?: string) {
    super(message);
  }
}
