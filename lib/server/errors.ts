import type { ApiErrorBody, ApiErrorCode } from "@/lib/types";

const STATUS_BY_CODE: Record<ApiErrorCode, number> = {
  INVALID_INPUT: 400,
  NOT_FOUND: 404,
  RATE_LIMITED: 429,
  PROVIDER_UNAVAILABLE: 503,
  UPSTREAM_TIMEOUT: 504,
  PROVIDER_CONFIGURATION: 503,
  INVALID_PROVIDER_RESPONSE: 502,
  DEMO_CENTER_UNAVAILABLE: 404,
  INTERNAL_ERROR: 500,
};

export class AppError extends Error {
  readonly code: ApiErrorCode;
  readonly httpStatus: number;
  readonly retryAfterSeconds?: number;
  readonly retryable: boolean;

  constructor(
    code: ApiErrorCode,
    message: string,
    options: { retryAfterSeconds?: number; retryable?: boolean } = {},
  ) {
    super(message);
    this.name = "AppError";
    this.code = code;
    this.httpStatus = STATUS_BY_CODE[code];
    this.retryAfterSeconds = options.retryAfterSeconds;
    this.retryable = options.retryable ?? false;
  }
}

export function toAppError(error: unknown): AppError {
  if (error instanceof AppError) return error;
  if (error instanceof Error) {
    if (error.name === "AbortError" || error.name === "TimeoutError") {
      return new AppError(
        "UPSTREAM_TIMEOUT",
        "The provider did not respond in time. Please try again.",
        { retryable: true },
      );
    }
  }
  return new AppError(
    "INTERNAL_ERROR",
    "Something went wrong while handling this request.",
  );
}

export function errorBody(error: AppError): ApiErrorBody {
  const body: ApiErrorBody = {
    error: {
      code: error.code,
      message: error.message,
      retryable: error.retryable,
    },
  };
  if (error.retryAfterSeconds !== undefined) {
    body.error.retryAfterSeconds = error.retryAfterSeconds;
  }
  return body;
}

export function errorResponseInit(error: AppError): {
  status: number;
  headers: Record<string, string>;
} {
  const headers: Record<string, string> = {
    "Cache-Control": "no-store",
  };
  if (error.retryAfterSeconds !== undefined) {
    headers["Retry-After"] = String(error.retryAfterSeconds);
  }
  return { status: error.httpStatus, headers };
}
