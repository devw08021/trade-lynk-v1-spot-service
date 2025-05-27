// src/errors.ts
export interface ApiErrorInfo {
  code?:   string;                  // machine‐readable code
  message: string;                  // user‐friendly message
  fields?: Record<string,string>;   // per-field validation errors
}

export class ApiError extends Error {
  public status: number;
  public info:   ApiErrorInfo;

  constructor(status: number, info: ApiErrorInfo) {
    super(info.message);

    // preserve instanceof and stack
    this.name = this.constructor.name;
    Object.setPrototypeOf(this, new.target.prototype);
    Error.captureStackTrace?.(this, this.constructor);

    this.status = status;
    this.info   = info;
  }
}
