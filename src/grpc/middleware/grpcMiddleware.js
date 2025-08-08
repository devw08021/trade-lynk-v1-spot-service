import { jwtVerify } from 'jose';
import { GrpcLogger } from '../utils/grpcLogger.js';
import { env } from '../../config/env.js';

const encoder = new TextEncoder();
const DEFAULT_SECRET = 'your-secret-key-make-it-longer-and-more-secure';

const getAuthHeader = (metadata) => {
  try {
    const vals = metadata?.get?.('authorization') ?? [];
    return Array.isArray(vals) ? (vals[0] || '') : String(vals || '');
  } catch {
    return '';
  }
};

const extractBearer = (authHeader) => {
  if (!authHeader) return '';
  const h = String(authHeader);
  if (h.toLowerCase().startsWith('bearer ')) return h.slice(7).trim();
  return '';
};

const verifyJwt = async (token) => {
  if (!token) return null;
  const secret = encoder.encode(env.JWT_SECRET || DEFAULT_SECRET);
  try {
    const { payload } = await jwtVerify(token, secret);
    return payload || null;
  } catch {
    return null;
  }
};

const genRequestId = () =>
  Math.random().toString(36).slice(2) + Date.now().toString(36);

export class GrpcMiddleware {
  constructor(options = {}) {
    this.options = {
      requireAuth: false,
      ...options,
    };
    this.logger = new GrpcLogger();
  }

  async before(call) {
    const startedAt = Date.now();
    const method = call?.handler?.path || call?.call?.handler?.path || 'unknown';
    const requestId =
      call?.metadata?.get?.('x-request-id')?.[0] || genRequestId();

    // Attach context onto call for downstream usage
    call.context = { requestId, method, startedAt };

    // Parse and verify auth if present
    const authHeader = getAuthHeader(call?.metadata);
    const token = extractBearer(authHeader);
    const user = await verifyJwt(token);
    if (user) call.context.user = user;

    // If auth is required, enforce
    if (this.options.requireAuth && !user) {
      const err = new Error('Unauthenticated');
      err.code = 16; // GrpcStatus.UNAUTHENTICATED
      err.details = 'Valid Bearer token required';
      throw err;
    }

    // Log request begin
    this.logger.info('gRPC request start', call.context);
  }

  async after(call, result) {
    const finishedAt = Date.now();
    const tookMs = finishedAt - (call?.context?.startedAt || finishedAt);
    const ctx = { ...(call?.context || {}), tookMs };
    this.logger.info('gRPC request end', ctx);
    return result;
  }
} 