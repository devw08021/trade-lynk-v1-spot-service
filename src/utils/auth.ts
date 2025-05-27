import bcrypt from 'bcrypt';
import { sign, verify } from 'hono/jwt';
import { env } from '../config/env';
import { User, UserResponse } from '../models/schema/user';

// Helper function to parse JWT expiration string (e.g., "1d", "2h") into seconds
function parseExpiresIn(expiresIn: string): number {
  const unit = expiresIn.slice(-1);
  const value = parseInt(expiresIn.slice(0, -1));

  switch (unit) {
    case 's': return value; // seconds
    case 'm': return value * 60; // minutes
    case 'h': return value * 60 * 60; // hours
    case 'd': return value * 24 * 60 * 60; // days
    case 'w': return value * 7 * 24 * 60 * 60; // weeks
    default: return 3600; // default to 1 hour if format is unrecognized
  }
}


export async function generateToken(user: User): Promise<string> {
  // Calculate expiration time
  const now = Math.floor(Date.now() / 1000);
  const expiresInSeconds = parseExpiresIn(env.JWT_EXPIRES_IN);

  const payload = {
    sub: user._id!.toString(),
    email: user.email,
    username: user.username,
    firstName: user.firstName,
    lastName: user.lastName,
    bio: user.bio,
    profilePicture: user.profilePicture,
    role: user.role,
    iat: now,                 // Issued at time
    exp: now + expiresInSeconds  // Expiration time
  };

  const token = await sign(payload, env.JWT_SECRET, 'HS256');
  return token;
}


export async function verifyToken(token: string): Promise<any> {
  try {
    const payload = await verify(token, env.JWT_SECRET, 'HS256');
    return payload;
  } catch (error) {
    throw new Error('Invalid or expired token');
  }
}
export async function hashPassword(password: string): Promise<string> {
  const saltRounds = 10;
  return await bcrypt.hash(password, saltRounds);
}

export async function comparePasswords(password: string, hashedPassword: string): Promise<boolean> {
  return await bcrypt.compare(password, hashedPassword);
}

export function sanitizeUser(user: User): UserResponse {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { password, twoFactorSecret, ...sanitizedUser } = user;
  return sanitizedUser as UserResponse;
} 