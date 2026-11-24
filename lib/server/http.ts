import { NextResponse } from "next/server";
import { errorBody, errorResponseInit, toAppError } from "@/lib/server/errors";

export function handleApiError(error: unknown): NextResponse {
  const appError = toAppError(error);
  return NextResponse.json(errorBody(appError), errorResponseInit(appError));
}

export function apiJson<T>(body: T): NextResponse<T> {
  return NextResponse.json(body, {
    headers: {
      "Cache-Control": "no-store",
    },
  });
}

export function searchParamsFrom(request: Request): URLSearchParams {
  return new URL(request.url).searchParams;
}
