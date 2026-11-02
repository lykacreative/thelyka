// Thumbnails for the admin only: Cloudinary makes a small derived copy on the fly; the original file is never changed.
// Anything that isn't a Cloudinary upload URL is returned as it is.
export function cloudinaryThumb(src: string, size: number, mode: "fill" | "fit" = "fit") {
  const match = src.match(/^(https:\/\/res\.cloudinary\.com\/[^/]+\/image\/upload\/)(.+)$/);
  if (!match) return src;
  const width = Math.max(16, Math.min(2000, Math.round(size)));
  const transform =
    mode === "fill" ? `c_fill,g_center,w_${width},h_${width},q_auto,f_auto` : `c_limit,w_${width},h_${width},q_auto,f_auto`;
  return `${match[1]}${transform}/${match[2]}`;
}
