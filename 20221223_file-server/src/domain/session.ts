import crypto from "crypto";

import { Session } from "../db/session";
import User from "../db/user";

export async function getSessionByBearerToken(
  bearerToken: string
): Promise<Session | null> {
  const session = await Session.findOne({ where: { bearerToken } });
  return session;
}

export async function createSession(user: User): Promise<Session> {
  const now = new Date();
  const expiresAt = new Date(now.getTime() + 10 * 60000);

  const bearerToken = crypto.randomUUID();

  const session = await Session.create({
    bearerToken,
    userId: user.id,
    expiresAt,
    isExpired: false,
  });

  return session;
}

export function isSessionExpired(session: Session): boolean {
  const now = new Date();

  if (session.isExpired) return true;
  if (session.expiresAt.getTime() <= now.getTime()) return true;
  return false;
}
