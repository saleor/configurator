import { BaseError } from "../../lib/errors/shared";

/**
 * Base error class for channel-related errors
 */
export class ChannelError extends BaseError {
  constructor(message: string, entityIdentifier?: string);
  constructor(message: string, code?: string, recoverySuggestions?: string[]);
  constructor(message: string, codeOrEntityIdentifier?: string, recoverySuggestions?: string[]) {
    if (recoverySuggestions) {
      // Old signature: (message, code, recoverySuggestions)
      super(message, codeOrEntityIdentifier || "CHANNEL_ERROR", recoverySuggestions);
    } else {
      // New signature: (message, entityIdentifier?)
      super(message, "CHANNEL_ERROR");
    }
  }
}

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
export class ChannelCreationError extends BaseError {
  constructor(message: string, _entityIdentifier?: string) {
    super(message, "CHANNEL_CREATION_ERROR");
  }
}

/**
 * Error thrown when channel update fails
 */
export class ChannelUpdateError extends BaseError {
  constructor(message: string, _entityIdentifier?: string) {
    super(message, "CHANNEL_UPDATE_ERROR");
  }
}
