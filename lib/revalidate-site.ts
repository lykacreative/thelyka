import { revalidatePath, revalidateTag } from "next/cache";

// After any admin change: expire the cached data now ({ expire: 0 } = the next visit waits for fresh data
// instead of getting the old page once) and every page path, so the change shows on the next visit.
export function revalidateSite(what: "portfolio" | "blogs" | "all") {
  if (what === "portfolio" || what === "all") revalidateTag("portfolio", { expire: 0 });
  if (what === "blogs" || what === "all") revalidateTag("blogs", { expire: 0 });
  revalidatePath("/", "layout");
}
