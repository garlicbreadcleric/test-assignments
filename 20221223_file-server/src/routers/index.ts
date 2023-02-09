import express, { Request, Response } from "express";

import { ApplicationError, ErrorCode } from "../error";
import { authMiddleware, AuthRequest } from "../middleware";
import { checkHashedPassword, createUser, getUserById, getUserByRefreshToken } from "../domain/user";
import { createSession, getSessionByBearerToken } from "../domain/session";
import { bodyPropertyNotNull } from "../validation";
import assert from "assert";

const router = express.Router();

router.get("/hello", async (req, res) => {
  res.send("Hello, world!");
});

router.post("/signup", async (req: Request, res: Response, next) => {
  try {
    bodyPropertyNotNull(req.body, "userId");
    bodyPropertyNotNull(req.body, "password");

    const { userId, password } = req.body;

    const user = await createUser(userId, password);
    const session = await createSession(user);

    return res.json({
      userId,
      refreshToken: user.refreshToken,
      bearerToken: session.bearerToken,
    });
  } catch (err) {
    next(err);
  }
});

router.post("/signin", async (req, res, next) => {
  try {
    bodyPropertyNotNull(req.body, "userId");
    bodyPropertyNotNull(req.body, "password");

    const { userId, password } = req.body;

    const user = await getUserById(userId);
    if (user == null) {
      throw new ApplicationError(
        ErrorCode.InvalidCredentials,
        {},
        "Invalid credentials (user ID or password)."
      );
    }

    const isPasswordValid = await checkHashedPassword(
      password,
      user.passwordHash
    );
    if (!isPasswordValid) {
      throw new ApplicationError(
        ErrorCode.InvalidCredentials,
        {},
        "Invalid credentials (user ID or password)."
      );
    }

    const session = await createSession(user);
    return res.json({
      bearerToken: session.bearerToken,
    });
  } catch (err) {
    next(err);
  }
});

router.post("/signin/new_token", async (req, res, next) => {
  try {
    const refreshToken = req.header("refresh-token");

    if (refreshToken == null) {
      throw new ApplicationError(ErrorCode.NoRefreshToken, {}, "No refresh token.");
    }

    const user = await getUserByRefreshToken(refreshToken);
    if (user == null) {
      throw new ApplicationError(ErrorCode.InvalidRefreshToken, { refreshToken }, "Invalid refresh token.");
    }

    const session = await createSession(user);
    return res.json({
      bearerToken: session.bearerToken
    });
  } catch (err) {
    next(err);
  }
});

router.get("/logout", authMiddleware, async (req: AuthRequest, res, next) => {
  try {
    assert(req.bearerToken != null);
    const session = await getSessionByBearerToken(req.bearerToken);
    assert(session != null);
    session.isExpired = true;
    await session.save();
    res.json({});
  } catch (err: any) {
    next(err);
  }
});

router.get("/info", authMiddleware, async (req: AuthRequest, res, next) => {
  try {
    return res.json({ userId: req.userId });
  } catch (err) {
    next(err);
  }
});

export default router;
