import { Handler, NextFunction, Request, Response } from "express";
import { getSessionByBearerToken, isSessionExpired } from "./domain/session";
import { ApplicationError, ErrorCode, errorHttpCodes } from "./error";

export interface AuthRequest extends Request {
  userId?: string;
  bearerToken?: string;
}

export async function authMiddleware(
  req: AuthRequest,
  res: Response,
  next: NextFunction
) {
  try {
    const bearerToken = req.headers["bearer-token"] as string;
    if (bearerToken == null) {
      throw new ApplicationError(
        ErrorCode.NoBearerToken,
        {},
        "No bearer token."
      );
    }

    const session = await getSessionByBearerToken(bearerToken);
    if (session == null) {
      throw new ApplicationError(
        ErrorCode.InvalidBearerToken,
        { bearerToken },
        "No session with provided bearer token exists."
      );
    }

    if (isSessionExpired(session)) {
      throw new ApplicationError(
        ErrorCode.SessionExpired,
        { bearerToken },
        "Session expired."
      );
    }

    req.userId = session.userId;
    req.bearerToken = session.bearerToken;
    next();
  } catch (err) {
    next(err);
  }
}

export function errorHandler(
  err: any,
  _req: Request,
  res: Response,
  _next: NextFunction
) {
  if (err instanceof ApplicationError) {
    const httpCode = errorHttpCodes.get(err.errorCode) ?? 400;
    const body = Object.assign(
      { error: err.errorCode, message: err.message },
      err.params
    );

    return res.status(httpCode).json(body);
  }

  console.error(err.toString());
  res
    .status(500)
    .json({ error: ErrorCode.InternalError, stacktrace: err.stack });
}
