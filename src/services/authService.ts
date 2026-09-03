// Auth & Role Management Service
// Roles: super_admin | editor | support | user

import { getAdminPath } from '../config/adminConfig'

export type UserRole = "super_admin" | "editor" | "support" | "user";

export interface AuthProfile {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  avatar?: string;
  createdAt: string;
  lastLogin?: string;
}

export const SUPER_ADMIN_EMAIL =
  (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_SUPER_ADMIN_EMAIL)
    ? import.meta.env.VITE_SUPER_ADMIN_EMAIL
    : "";

const DEFAULT_PROFILES: AuthProfile[] = [
  {
    id: "prof-1",
    name: "Platform Administrator",
    email: "admin@djflowerz.co.ke",
    role: "super_admin",
    avatar: "",
    createdAt: "2026-01-01T00:00:00.000Z"
  },
  {
    id: "prof-2",
    name: "Content Editor Team",
    email: "editor@flowerz.fc",
    role: "editor",
    avatar: "",
    createdAt: "2026-01-02T00:00:00.000Z"
  },
  {
    id: "prof-3",
    name: "Customer Support",
    email: "support@flowerz.fc",
    role: "support",
    avatar: "",
    createdAt: "2026-01-03T00:00:00.000Z"
  }
];

const AUTH_USER_KEY = "flowerzfc_auth_user";
const PROFILES_KEY = "flowerzfc_profiles";

export function getAllProfiles(): AuthProfile[] {
  try {
    const raw = localStorage.getItem(PROFILES_KEY);
    if (raw) return JSON.parse(raw);
  } catch { /* ignore */ }
  return DEFAULT_PROFILES;
}

export function saveProfiles(profiles: AuthProfile[]): void {
  try {
    localStorage.setItem(PROFILES_KEY, JSON.stringify(profiles));
  } catch { /* ignore */ }
}

export function getAuthUser(): AuthProfile | null {
  try {
    const assetRaw = localStorage.getItem(AUTH_USER_KEY);
    if (assetRaw) return JSON.parse(assetRaw);
  } catch { /* ignore */ }

  const appUserRaw = localStorage.getItem("flowerzfc_user");
  if (appUserRaw) {
    const parsed = JSON.parse(appUserRaw);
    return {
      id: parsed.id || 'usr-session',
      name: parsed.name || 'Admin',
      email: parsed.email || '',
      role: (parsed.role || 'user') as UserRole,
      avatar: parsed.avatar || parsed.avatar_url || '',
      createdAt: parsed.createdAt || new Date().toISOString(),
    };
  }
  return null;
}

export function setAuthSession(profile: AuthProfile | null): void {
  try {
    if (profile) {
      localStorage.setItem(AUTH_USER_KEY, JSON.stringify(profile));
      localStorage.setItem("flowerzfc_user", JSON.stringify({
        id: profile.id,
        name: profile.name,
        email: profile.email,
        role: profile.role,
        avatar: profile.avatar || ""
      }));
    } else {
      localStorage.removeItem(AUTH_USER_KEY);
      localStorage.removeItem("flowerzfc_user");
    }
  } catch { /* ignore */ }
}

export function hasTabAccessRole(role: UserRole, tabId: string): boolean {
  if (role === "super_admin" || role === "admin" as any) return true;
  if (role === "editor") {
    return ["overview", "articles", "comments", "analytics", "mixes", "scores", "reddit"].includes(tabId);
  }
  if (role === "support") {
    return ["overview", "orders", "users", "tickets", "products", "ads"].includes(tabId);
  }
  return false;
}

export function getRoleDashboardRoute(role: UserRole): string {
  switch (role) {
    case "super_admin": return getAdminPath();
    case "editor": return "/editor-dashboard";
    case "support": return "/support-dashboard";
    default: return "/account";
  }
}
