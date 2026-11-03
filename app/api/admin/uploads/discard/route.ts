import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { connectToDatabase } from "@/lib/mongodb";
import { InputError, readJson } from "@/lib/admin-data";
import { run, summarize } from "@/lib/admin-route";
import { deleteCloudinaryFiles } from "@/lib/cloudinary-delete";

export const runtime = "nodejs";

// Uploads that were never saved into an item (he cancelled or discarded): delete them so Cloudinary doesn't
// fill up with orphans. Same gate as every delete: under this site's folder and not shown anywhere.
export async function POST(request: Request) {
  const denied = await requireAdmin(request);
  if (denied) return denied;
  return run(async () => {
    const body = await readJson(request);
    if (!Array.isArray(body.publicIds) || body.publicIds.length > 200 || body.publicIds.some((id) => typeof id !== "string")) {
      throw new InputError("publicIds must be a list (at most 200).");
    }
    const { db } = await connectToDatabase();
    const report = await deleteCloudinaryFiles(db, body.publicIds as string[]);
    return NextResponse.json({ files: summarize(report) });
  });
}
