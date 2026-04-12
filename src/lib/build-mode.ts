export type ServdirBuildMode = 'server' | 'static';

/**
 * Central switch for dual build support.
 *
 * - server: default runtime mode, keeps the current Node-based behavior
 * - static: build-time export mode for static hosting targets such as GitHub Pages
 */
export function getServdirBuildMode(): ServdirBuildMode {
  return process.env.SERVDIR_BUILD_MODE === 'static' ? 'static' : 'server';
}

export function isStaticBuildMode(): boolean {
  return getServdirBuildMode() === 'static';
}
