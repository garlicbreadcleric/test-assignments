export enum ErrorCode {
  // Internal.
  InternalError = "INTERNAL_ERROR",

  // Validation.
  BodyPropertyMissing = "BODY_PROPERTY_MISSING",

  // Auth.
  NoBearerToken = "NO_BEARER_TOKEN",
  NoRefreshToken = "NO_REFRESH_TOKEN",
  InvalidBearerToken = "INVALID_BEARER_TOKEN",
  InvalidRefreshToken = "INVALID_REFRESH_TOKEN",
  SessionExpired = "SESSION_EXPIRED",
  UserIdExists = "USER_ID_EXISTS",
  InvalidCredentials = "INVALID_CREDENTIALS",

  // Files.
  NoFileAttached = "NO_FILE_ATTACHED",
  InvalidFileId = "INVALID_FILE_ID"
}

export const errorHttpCodes: Map<ErrorCode, number> = new Map([
  [ErrorCode.NoBearerToken, 401],
  [ErrorCode.SessionExpired, 401],
  [ErrorCode.InvalidBearerToken, 401],
  [ErrorCode.InvalidRefreshToken, 401],
  [ErrorCode.InvalidCredentials, 401],
  [ErrorCode.UserIdExists, 422],
  [ErrorCode.InternalError, 500],
]);

export class ApplicationError extends Error {
  constructor(
    public readonly errorCode: ErrorCode,
    public readonly params: any,
    message: string
  ) {
    super(message);
  }
}
