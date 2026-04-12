function normalizeBasePath(basePath: string | undefined): string {
  if (!basePath || basePath === '/') {
    return '';
  }

  const withLeadingSlash = basePath.startsWith('/') ? basePath : `/${basePath}`;
  return withLeadingSlash.endsWith('/') ? withLeadingSlash.slice(0, -1) : withLeadingSlash;
}

/**
 * Build an app-internal path that works in both default server mode and static exports
 * served from a subpath such as GitHub Pages `/servdir`.
 */
export function toAppPath(path: string): string {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  const basePath = normalizeBasePath(import.meta.env.BASE_URL);
  return `${basePath}${normalizedPath}` || '/';
}
