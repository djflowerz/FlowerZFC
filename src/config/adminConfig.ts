/**
 * adminConfig.ts
 * Secure administration routing configuration.
 * Dynamically resolves the non-guessable, non-dictionary admin URL path from environment variables.
 */

export const ADMIN_ROUTE_PATH: string =
  (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_ADMIN_PATH)
    ? import.meta.env.VITE_ADMIN_PATH
    : '/ctrl-9f83c1d4-flz7-panel'

export function getAdminPath(): string {
  return ADMIN_ROUTE_PATH
}
