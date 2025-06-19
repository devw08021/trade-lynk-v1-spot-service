// src/errors.js

export class ApiError extends Error {
  constructor(status, info) {
    super(info.message);

    // Preserve instanceof and stack trace
    this.name = this.constructor.name;
    Object.setPrototypeOf(this, new.target.prototype);
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor);
    }

    this.status = status;
    this.info = info;
  }
}
