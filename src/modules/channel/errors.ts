import { BaseError } from "../../lib/errors/shared";

/**
 * Base error class for channel-related errors
 */
export class ChannelError extends BaseError {}

/**
 * Error thrown when a channel is not found
 */
export class ChannelNotFoundError extends ChannelError {
  constructor(channelSlug: string) {
    super(`Channel "${channelSlug}" not found`, "CHANNEL_NOT_FOUND_ERROR");
  }
}

/**
 * Error thrown when channel creation fails
 */
export class ChannelCreationError extends ChannelError {
  constructor(
    message: string,
    public readonly channelSlug: string
  ) {
    super(message, "CHANNEL_CREATION_ERROR");
  }
}

/**
 * Error thrown when channel update fails
 */
export class ChannelUpdateError extends ChannelError {
  constructor(
    message: string,
    public readonly channelId: string
  ) {
    super(message, "CHANNEL_UPDATE_ERROR");
  }
}
