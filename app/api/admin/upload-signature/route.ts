import { randomBytes } from "crypto";
import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { InputError, readJson, readText } from "@/lib/admin-data";
import { run } from "@/lib/admin-route";
import { categories } from "@/lib/portfolio";
import { cloudinaryUploadIdentity, createCloudinaryUploadSignature, isCloudinaryConfigured } from "@/lib/cloudinary";
import { cloudinaryRoot, uniquePublicId, uploadFolder } from "@/lib/cloudinary-root";

export const runtime = "nodejs";

// Signs ONE direct upload from the browser to Cloudinary (no file passes through Vercel, so no 4.5 MB limit).
// The server picks the folder (under LYKA_CLOUDINARY_ROOT) and a unique public id; overwrite=false is signed
// in, so an upload can never replace an existing file. No transformation is signed: Cloudinary keeps the original.
export async function POST(request: Request) {
  const denied = await requireAdmin(request);
  if (denied) return denied;
  return run(async () => {
    if (!isCloudinaryConfigured()) {
      return NextResponse.json({ error: "Cloudinary is not configured on this deploy." }, { status: 500 });
    }
    const body = await readJson(request);
    const kind = readText(body.kind, "Kind", { required: true });
    if (kind !== "portfolio" && kind !== "blog") throw new InputError("Kind must be portfolio or blog.");
    const year = readText(body.year, "Year", { required: true }).trim();
    if (!/^\d{4}$/.test(year)) throw new InputError("Year must be 4 digits.");
    let category: string | undefined;
    if (kind === "portfolio") {
      category = readText(body.category, "Category", { required: true });
      if (!(categories as readonly string[]).includes(category)) throw new InputError("Unknown category.");
    }
    const filename = readText(body.filename, "File name", { max: 300 }) || "image";

    const folder = uploadFolder(cloudinaryRoot(process.env), kind, year, category);
    const publicId = uniquePublicId(filename, randomBytes(8).toString("hex"));
    const timestamp = Math.floor(Date.now() / 1000);
    const overwrite = "false";
    const signature = createCloudinaryUploadSignature({ folder, public_id: publicId, timestamp, overwrite });
    const { cloudName, apiKey } = cloudinaryUploadIdentity();

    return NextResponse.json({
      uploadUrl: `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`,
      apiKey,
      timestamp,
      signature,
      folder,
      publicId,
      overwrite
    });
  });
}
