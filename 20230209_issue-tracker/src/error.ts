export enum ErrorCode {
  // Internal.
  InternalError = "INTERNAL_ERROR",

  // Validation.
  InvalidRequest = "INVALID_REQUEST",

  // Messages.
  TooManyMessages = "TOO_MANY_MESSAGES",
}

export const errorHttpCodes: Map<ErrorCode, number> = new Map([
  [ErrorCode.InternalError, 500],
  [ErrorCode.TooManyMessages, 403],
]);

export class ApplicationError extends Error {
  constructor(public readonly errorCode: ErrorCode, public readonly params: any, message: string) {
    super(message);
  }
}
