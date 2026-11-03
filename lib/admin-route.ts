import { NextResponse } from "next/server";
import { InputError } from "@/lib/admin-data";
import type { DeleteReport } from "@/lib/cloudinary-delete";
import type { DeleteSummary } from "@/lib/admin-types";

export class ConflictError extends Error {}
export class NotFoundError extends Error {}

// Runs an admin handler body and turns thrown errors into clear JSON answers.
export async function run(handler: () => Promise<Response>) {
  try {
    return await handler();
  } catch (error) {
    if (error instanceof InputError) return NextResponse.json({ error: error.message }, { status: 400 });
    if (error instanceof ConflictError) return NextResponse.json({ error: error.message }, { status: 409 });
    if (error instanceof NotFoundError) return NextResponse.json({ error: error.message }, { status: 404 });
    console.error("Admin API error:", error);
    return NextResponse.json({ error: "Something went wrong on the server. Nothing was changed if this was a save." }, { status: 500 });
  }
}

export function summarize(report: DeleteReport | null): DeleteSummary | null {
  if (!report) return null;
  return {
    deleted: report.deleted.length,
    alreadyGone: report.alreadyGone.length,
    kept: report.kept,
    failed: report.failed
  };
}
