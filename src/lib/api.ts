import { NextResponse } from "next/server";

export function jsonError(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

export function handleApiError(error: unknown) {
  if (error instanceof Error && error.message === "UNAUTHORIZED") return jsonError("Unauthorized", 401);
  if (error instanceof Error && error.message === "FORBIDDEN") return jsonError("Forbidden", 403);
  console.error(error);
  return jsonError("Terjadi kesalahan server", 500);
}
