// utils/auth.js

import bcrypt from 'bcrypt';
import { sign, verify } from 'hono/jwt';
import { env } from '../config/env.js';
import fs from 'fs'
import path from 'path'
let filePath = path.join(process.cwd(), 'src')

const publicKey = fs.readFileSync(`${filePath}/config/pub.pem`, 'utf8')

function parseExpiresIn(expiresIn) {
  const unit = expiresIn.slice(-1);
  const value = parseInt(expiresIn.slice(0, -1));

  switch (unit) {
    case 's': return value;
    case 'm': return value * 60;
    case 'h': return value * 60 * 60;
    case 'd': return value * 24 * 60 * 60;
    case 'w': return value * 7 * 24 * 60 * 60;
    default: return 3600;
  }
}

export async function generateToken(user) {
  const now = Math.floor(Date.now() / 1000);
  const expiresInSeconds = parseExpiresIn(env.JWT_EXPIRES_IN);

  const payload = {
    sub: user._id?.toString(),
    subCode: user.userCode?.toString(),
    email: user.email,
    username: user.username,
    firstName: user.firstName,
    lastName: user.lastName,
    clientId: user.clientId,
    bio: user.bio,
    profilePicture: user.profilePicture,
    role: user.role,
    kycStatus: user.kycStatus,
    iat: now,
    exp: now + expiresInSeconds
  };

  const token = await sign(payload, env.JWT_SECRET, 'HS256');
  return token;
}

export async function verifyToken(token) {
  try {
    const payload = await verify(token, env.JWT_SECRET, 'HS256');
    return payload;
  } catch (error) {
    throw new Error('Invalid or expired token');
  }
}

export async function verifyId(token) {
  try {
    const payload = await verify(token, publicKey, 'RS256');
    return payload;
  } catch (error) {
    throw new Error('Invalid or expired token');
  }
}
export async function hashPassword(password) {
  const saltRounds = 10;
  return await bcrypt.hash(password, saltRounds);
}

export async function comparePasswords(password, hashedPassword) {
  return await bcrypt.compare(password, hashedPassword);
}

export function sanitizeUser(user) {
  const { password, twoFactorSecret, ...sanitizedUser } = user;
  return sanitizedUser;
}

