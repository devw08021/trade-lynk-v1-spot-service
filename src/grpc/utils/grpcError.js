import { Metadata, status as GrpcStatus } from '@grpc/grpc-js';
import { ApiError } from '../../utils/error.js';

const httpToGrpc = (httpStatus) => {
  switch (httpStatus) {
    case 400: return GrpcStatus.INVALID_ARGUMENT;
    case 401: return GrpcStatus.UNAUTHENTICATED;
    case 403: return GrpcStatus.PERMISSION_DENIED;
    case 404: return GrpcStatus.NOT_FOUND;
    case 409: return GrpcStatus.ALREADY_EXISTS;
    case 422: return GrpcStatus.FAILED_PRECONDITION;
    case 429: return GrpcStatus.RESOURCE_EXHAUSTED;
    case 499: return GrpcStatus.CANCELLED;
    case 500: return GrpcStatus.INTERNAL;
    case 501: return GrpcStatus.UNIMPLEMENTED;
    case 503: return GrpcStatus.UNAVAILABLE;
    case 504: return GrpcStatus.DEADLINE_EXCEEDED;
    default: return GrpcStatus.UNKNOWN;
  }
};

export class GrpcError extends Error {
  constructor(message, code = GrpcStatus.UNKNOWN, httpStatus = 500, details = {}, meta = {}) {
    super(message);
    this.name = 'GrpcError';
    this.code = code;
    this.httpStatus = httpStatus;
    this.details = details;
    this.meta = meta;
  }

  static toServiceError(message, code, httpStatus, details, meta) {
    const err = new Error(message);
    err.code = code;
    err.details = typeof details === 'string' ? details : JSON.stringify(details ?? {});
    if (meta && Object.keys(meta).length) {
      const md = new Metadata();
      for (const [k, v] of Object.entries(meta)) {
        md.set(String(k), String(v));
      }
      md.set('http-status', String(httpStatus ?? 500));
      err.metadata = md;
    }
    return err;
  }

  static fromError(err) {
    // Already a gRPC-shaped error
    if (typeof err?.code === 'number' && err?.message) {
      return this.toServiceError(
        err.message,
        err.code,
        err.httpStatus ?? 500,
        err.details ?? {},
        err.meta ?? {}
      );
    }

    // Our HTTP ApiError
    if (err instanceof ApiError) {
      const code = httpToGrpc(err.status ?? 500);
      return this.toServiceError(
        err.message || err?.info?.message || 'Internal error',
        code,
        err.status ?? 500,
        err.info ?? {},
        { 'error-code': String(code) }
      );
    }

    // Generic fallback
    return this.toServiceError(
      err?.message || 'Internal error',
      GrpcStatus.UNKNOWN,
      500,
      { stack: err?.stack },
      { 'error-code': String(GrpcStatus.UNKNOWN) }
    );
  }
} 