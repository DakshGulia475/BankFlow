import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { UserModel } from '../models/User.js';
import { ApiError } from '../utils/ApiError.js';
import { env } from '../config/env.js';

const SALT_ROUNDS = 10;

export type PublicUser = {
  id: string;
  name: string;
  email: string;
  createdAt: Date;
};

export type JwtPayload = { sub: string };

function toPublicUser(user: {
  _id: unknown;
  name: string;
  email: string;
  createdAt: Date;
}): PublicUser {
  return {
    id: String(user._id),
    name: user.name,
    email: user.email,
    createdAt: user.createdAt,
  };
}

export function signToken(userId: string): string {
  return jwt.sign({ sub: userId } satisfies JwtPayload, env.jwtSecret, {
    expiresIn: env.jwtExpiresIn as jwt.SignOptions['expiresIn'],
  });
}

export function verifyToken(token: string): JwtPayload {
  try {
    const decoded = jwt.verify(token, env.jwtSecret);
    if (typeof decoded === 'string' || typeof decoded.sub !== 'string') {
      throw ApiError.unauthorized('Invalid or expired token');
    }
    return { sub: decoded.sub };
  } catch {
    throw ApiError.unauthorized('Invalid or expired token');
  }
}

export async function register(input: {
  name: string;
  email: string;
  password: string;
}): Promise<PublicUser> {
  const existing = await UserModel.exists({ email: input.email });
  if (existing) {
    throw ApiError.conflict('Email is already registered');
  }

  const passwordHash = await bcrypt.hash(input.password, SALT_ROUNDS);

  try {
    const user = await UserModel.create({
      name: input.name,
      email: input.email,
      passwordHash,
    });
    return toPublicUser(user);
  } catch (error) {
    if (typeof error === 'object' && error !== null && (error as { code?: number }).code === 11000) {
      throw ApiError.conflict('Email is already registered');
    }
    throw error;
  }
}

export async function login(input: {
  email: string;
  password: string;
}): Promise<{ token: string; user: PublicUser }> {
  const user = await UserModel.findOne({ email: input.email });
  const passwordMatches = user
    ? await bcrypt.compare(input.password, user.passwordHash)
    : false;

  if (!user || !passwordMatches) {
    throw ApiError.unauthorized('Invalid email or password');
  }

  return { token: signToken(String(user._id)), user: toPublicUser(user) };
}
