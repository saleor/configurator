import { BaseError } from "../../lib/errors/shared";

/**
 * Base error class for channel-related errors
 */
export class ChannelError extends BaseError {
  constructor(message: string, recoverySuggestions?: string[]) {
    super(message, "CHANNEL_ERROR", recoverySuggestions);
  }
}

/**
 * Error thrown when a channel is not found
 */
export class ChannelNotFoundError extends ChannelError {
  constructor(channelSlug: string) {
    super(`Channel "${channelSlug}" not found`);
  }
}

/**
 * Error thrown when channel creation fails
 */
export class ChannelCreationError extends ChannelError {
  constructor(message: string, _channelSlug?: string) {
    super(message);
  }
}

/**
 * Error thrown when channel update fails
 */
export class ChannelUpdateError extends ChannelError {
  constructor(message: string, _channelId?: string) {
    super(message);
  }
}
