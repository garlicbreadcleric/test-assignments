import crypto from "crypto";

import bcrypt from "bcrypt";

import User from "../db/user";
import { ApplicationError, ErrorCode } from "../error";

export async function getUserById(id: string): Promise<User | null> {
  return await User.findOne({ where: { id } });
}

export async function getUserByRefreshToken(
  refreshToken: string
): Promise<User | null> {
  return await User.findOne({ where: { refreshToken } });
}

export async function hashPassword(password: string): Promise<string> {
  const passwordSalt = await bcrypt.genSalt(10);
  const passwordHash = await bcrypt.hash(password, passwordSalt);

  return passwordHash;
}

export async function checkHashedPassword(
  password: string,
  passwordHash: string
): Promise<boolean> {
  return await bcrypt.compare(password, passwordHash);
}

export async function createUser(
  userId: string,
  password: string
): Promise<User> {
  const existingUser = await getUserById(userId);
  if (existingUser != null) {
    throw new ApplicationError(
      ErrorCode.UserIdExists,
      { userId },
      `User with ID ${userId} already exists.`
    );
  }

  const passwordHash = await hashPassword(password);
  const refreshToken = crypto.randomUUID();

  const user = await User.create({
    id: userId,
    passwordHash,
    refreshToken,
  });

  return user;
}
