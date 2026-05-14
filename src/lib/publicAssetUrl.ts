/** Paths under `public/`; joins `import.meta.env.BASE_URL` without duplicated `/`. */
export function publicAssetUrl(assetPath: string): string {
  const trimmed = assetPath.replace(/^\//, "");
  const base = import.meta.env.BASE_URL;
  if (!trimmed) {
    return base;
  }
  const prefix = base.endsWith("/") ? base : `${base}/`;
  return `${prefix}${trimmed}`;
}
