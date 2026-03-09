const FALLBACK_BG = "1a1a2e";
const FALLBACK_FG = "666666";

interface PosterSize {
  width?: number;
  height?: number;
}

export function getPosterFallback(title: string, size: PosterSize = {}): string {
  const width = size.width ?? 300;
  const height = size.height ?? 450;
  return `https://placehold.co/${width}x${height}/${FALLBACK_BG}/${FALLBACK_FG}?text=${encodeURIComponent(title)}`;
}

function isLikelyValidTmdbPath(posterUrl: string): boolean {
  try {
    const parsed = new URL(posterUrl);
    if (!parsed.hostname.includes("image.tmdb.org")) return true;

    const fileName = parsed.pathname.split("/").pop() ?? "";
    return /^[A-Za-z0-9]{10,}\.(jpg|jpeg|png|webp)$/i.test(fileName);
  } catch {
    return false;
  }
}

export function resolvePosterUrl(
  posterUrl: string | undefined,
  title: string,
  size: PosterSize = {},
): string {
  if (!posterUrl) return getPosterFallback(title, size);
  if (!posterUrl.startsWith("http")) return posterUrl;
  if (!isLikelyValidTmdbPath(posterUrl)) return getPosterFallback(title, size);
  return posterUrl;
}