export function createError(
  code: string,
  message: string,
  details?: object,
): {
  success: false;
  error: {
    code: string;
    message: string;
    details?: object;
    timestamp: string;
  };
} {
  return {
    success: false,
    error: {
      code,
      message,
      ...(details ? { details } : {}),
      timestamp: new Date().toISOString(),
    },
  };
}

export class AppError extends Error {
  public statusCode: number;
  public code: string;
  public details?: object;

  constructor(message: string, statusCode: number, code: string, details?: object) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
    Error.captureStackTrace(this, this.constructor);
  }
}
