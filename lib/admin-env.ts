import { databaseNames } from "@/lib/mongodb";
import { isCloudinaryConfigured } from "@/lib/cloudinary";
import { LIVE_CLOUDINARY_ROOT, cloudinaryRoot, isPreviewOrLocalDev, isProductionRuntime } from "@/lib/cloudinary-root";

export function environmentLabel(): "live" | "preview" | "local" {
  if (isProductionRuntime(process.env)) return "live";
  return process.env.VERCEL_ENV === "preview" ? "preview" : "local";
}

// "Copy the live items into this preview" runs only on a preview deploy (or next dev), only when this deploy
// has its own database (LYKA_DB_NAME, different from the one in MONGODB_URI) and its own Cloudinary folder.
// The settings are checked before any database connection, so a refusal never depends on the database.
export function copyLiveSettingsRefusal(): string | null {
  if (!isPreviewOrLocalDev(process.env)) return "Only available on a preview deploy.";
  if (!(process.env.LYKA_DB_NAME ?? "").trim()) return "Set LYKA_DB_NAME (for example thelyka_preview) on Preview first.";
  if (cloudinaryRoot(process.env) === LIVE_CLOUDINARY_ROOT) {
    return "LYKA_CLOUDINARY_ROOT is the live folder. Use thelyka-preview for previews.";
  }
  return null;
}

export async function copyLiveStatus() {
  const names = await databaseNames();
  let reason = copyLiveSettingsRefusal();
  if (!reason && names.current === names.uri) {
    reason = "LYKA_DB_NAME is the live database. Use a different name for previews.";
  }
  return { enabled: reason === null, reason, liveDbName: names.uri, currentDbName: names.current };
}

export function cloudinaryReady() {
  return isCloudinaryConfigured();
}
