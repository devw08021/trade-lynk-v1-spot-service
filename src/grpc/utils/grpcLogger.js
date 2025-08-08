import path from 'path';

let errorLogger = null;
let infoLogger = null;

try {
  // CJS module -> default import returns module.exports
  const loggerCjs = (await import('../../config/logger.js')).default;
  errorLogger = loggerCjs?.errorLogger ?? null;
  infoLogger = loggerCjs?.mt5Logger ?? null;
} catch (_) {
  // Fallback to console if logger module isn't available
}

const formatMsg = (msg, ctx) => {
  const meta = {
    requestId: ctx?.requestId,
    method: ctx?.method,
    userId: ctx?.user?.id || ctx?.user?.sub,
    service: 'grpc',
  };
  return { message: msg, ...meta };
};

export class GrpcLogger {
  info(msg, ctx) {
    if (infoLogger?.info) infoLogger.info(formatMsg(msg, ctx));
    else console.info('[grpc][info]', msg, ctx ?? {});
  }

  warn(msg, ctx) {
    if (infoLogger?.warn) infoLogger.warn(formatMsg(msg, ctx));
    else console.warn('[grpc][warn]', msg, ctx ?? {});
  }

  error(msg, err, ctx) {
    const payload = formatMsg(msg, ctx);
    payload.error = {
      message: err?.message,
      stack: err?.stack,
      code: err?.code,
      details: err?.details,
    };
    if (errorLogger?.error) errorLogger.error(payload);
    else console.error('[grpc][error]', payload);
  }

  debug(msg, ctx) {
    if (infoLogger?.debug) infoLogger.debug(formatMsg(msg, ctx));
    else console.debug('[grpc][debug]', msg, ctx ?? {});
  }
} 