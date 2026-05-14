/** Paths under `public/` for GitHub Pages (project sub-path) or any non-root hosting */
export function publicAssetUrl(assetPath: string): string {
  const trimmed = assetPath.replace(/^\//, "");
  return `${import.meta.env.BASE_URL}${trimmed}`;
}
