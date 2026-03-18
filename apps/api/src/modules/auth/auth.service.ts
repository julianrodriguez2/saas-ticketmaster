import type { CookieOptions } from "express";
import { prisma, type Role } from "@ticketing/db";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { z } from "zod";

const AUTH_COOKIE_NAME = "ticketing_auth";
const TOKEN_EXPIRES_IN = "7d";
const TOKEN_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;

const credentialsSchema = z.object({
  email: z.string().trim().toLowerCase().email(),
  password: z.string().min(8).max(72)
});

const authTokenPayloadSchema = z.object({
  userId: z.string().min(1),
  role: z.enum(["USER", "ADMIN"])
});

const authUserSelect = {
  id: true,
  email: true,
  role: true,
  createdAt: true
} as const;

export type AuthUser = {
  id: string;
  email: string;
  role: Role;
  createdAt: Date;
};

export type AuthCredentials = z.infer<typeof credentialsSchema>;
export type AuthTokenPayload = z.infer<typeof authTokenPayloadSchema>;

export class AuthServiceError extends Error {
  public readonly statusCode: number;

  constructor(statusCode: number, message: string) {
    super(message);
    this.statusCode = statusCode;
  }
}

export function getAuthCookieName(): string {
  return AUTH_COOKIE_NAME;
}

export function getAuthCookieOptions(): CookieOptions {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: TOKEN_MAX_AGE_MS,
    path: "/"
  };
}

export function getClearAuthCookieOptions(): CookieOptions {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/"
  };
}

export async function registerUser(input: unknown): Promise<AuthUser> {
  const { email, password } = parseCredentials(input);

  const existingUser = await prisma.user.findUnique({
    where: { email },
    select: { id: true }
  });

  if (existingUser) {
    throw new AuthServiceError(409, "Email is already registered.");
  }

  const hashedPassword = await bcrypt.hash(password, 12);

  return prisma.user.create({
    data: {
      email,
      password: hashedPassword,
      role: "USER"
    },
    select: authUserSelect
  });
}

export async function loginUser(
  input: unknown
): Promise<{ token: string; user: AuthUser }> {
  const { email, password } = parseCredentials(input);

  const user = await prisma.user.findUnique({
    where: { email }
  });

  if (!user) {
    throw new AuthServiceError(401, "Invalid email or password.");
  }

  const passwordMatches = await bcrypt.compare(password, user.password);

  if (!passwordMatches) {
    throw new AuthServiceError(401, "Invalid email or password.");
  }

  const token = signAuthToken({
    userId: user.id,
    role: user.role
  });

  return {
    token,
    user: {
      id: user.id,
      email: user.email,
      role: user.role,
      createdAt: user.createdAt
    }
  };
}

export async function getAuthenticatedUser(userId: string): Promise<AuthUser> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: authUserSelect
  });

  if (!user) {
    throw new AuthServiceError(401, "Authenticated user was not found.");
  }

  return user;
}

export function verifyAuthToken(token: string): AuthTokenPayload {
  let decodedToken: unknown;

  try {
    decodedToken = jwt.verify(token, getJwtSecret());
  } catch (_error) {
    throw new AuthServiceError(401, "Invalid or expired authentication token.");
  }

  const parsedPayload = authTokenPayloadSchema.safeParse(decodedToken);

  if (!parsedPayload.success) {
    throw new AuthServiceError(401, "Invalid authentication token payload.");
  }

  return parsedPayload.data;
}

function parseCredentials(input: unknown): AuthCredentials {
  const parsedCredentials = credentialsSchema.safeParse(input);

  if (!parsedCredentials.success) {
    throw new AuthServiceError(400, parsedCredentials.error.issues[0]?.message ?? "Invalid request body.");
  }

  return parsedCredentials.data;
}

function signAuthToken(payload: AuthTokenPayload): string {
  return jwt.sign(payload, getJwtSecret(), {
    expiresIn: TOKEN_EXPIRES_IN
  });
}

function getJwtSecret(): string {
  const jwtSecret = process.env.JWT_SECRET;

  if (!jwtSecret) {
    throw new AuthServiceError(500, "JWT_SECRET is not configured.");
  }

  return jwtSecret;
}
