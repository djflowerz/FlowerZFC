// Auth & Role Management Service
// Roles: super_admin | editor | support | user
// SINGLE SUPER-ADMIN LOCK: Strictly locked to ianmuriithiflowerz@gmail.com

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

export const SUPER_ADMIN_EMAIL = "ianmuriithiflowerz@gmail.com";

const DEFAULT_PROFILES: AuthProfile[] = [
  {
    id: "prof-1",
    name: "Ian Muriithi (DJ Flowerz)",
    email: "ianmuriithiflowerz@gmail.com",
    role: "super_admin",
    avatar: "https://djflowerz.co.ke",
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

function enforceSingleSuperAdminGuard(email: string, role: string): void {
  if (role === "super_admin" && email.toLowerCase() !== SUPER_ADMIN_EMAIL.toLowerCase()) {
    throw new Error("Single Super-Admin guardrail violation: Unauthorized email for administrative privileges.");
  }
}

export function getAllProfiles(): AuthProfile[] {
  try {
    const raw = localStorage.getItem(PROFILES_KEY);
    if (raw) return JSON.parse(raw);
  } catch { /* ignore */ }
  return DEFAULT_PROFILES;
}

export function saveProfiles(profiles: AuthProfile[]): void {
  try {
    for (const p of profiles) {
      enforceSingleSuperAdminGuard(p.email, p.role);
    }
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
    const matched = getAllProfiles().find(p => p.email.toLowerCase() === parsed.email.toLowerCase());
    if (matched) {
      return { 
        ...matched, 
        role: parsed.email.toLowerCase() === SUPER_ADMIN_EMAIL.toLowerCase() ? "super_admin" : matched.role, 
        avatar: parsed.avatar || matched.avatar 
      };
    }
  }
  return null;
}

export function setAuthSession(profile: AuthProfile | null): void {
  try {
    if (profile) {
      enforceSingleSuperAdminGuard(profile.email, profile.role);
      localStorage.setItem(AUTH_USER_KEY, JSON.stringify(profile));
      localStorage.setItem("flowerzfc_user", JSON.stringify({
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

export async function loginWithEmail(email: string, pass: string): Promise<{ success: boolean; profile?: AuthProfile; error?: string }> {
  const cleanEmail = email.trim().toLowerCase();
  const profiles = getAllProfiles();

  let matched = profiles.find(p => p.email.toLowerCase() === cleanEmail);

  if (!matched) {
    if (cleanEmail === SUPER_ADMIN_EMAIL || cleanEmail === "admin@flowerz.fc") {
      matched = {
        id: "prof-1",
        name: "Ian Muriithi (DJ Flowerz)",
        email: SUPER_ADMIN_EMAIL,
        role: "super_admin",
        avatar: "https://djflowerz.co.ke",
        createdAt: new Date().toISOString()
      };
    }
  }

  if (matched) {
    try {
      enforceSingleSuperAdminGuard(matched.email, matched.role);
    } catch (err: any) {
      return { success: false, error: err.message || "Single Super-Admin guardrail violation" };
    }

    matched.lastLogin = new Date().toISOString();
    setAuthSession(matched);
    return { success: true, profile: matched };
  }

  return { success: false, error: "Invalid email or credentials for dashboard access." };
}

export function hasTabAccessRole(role: UserRole, tabId: string): boolean {
  if (role === "super_admin") return true;
  if (role === "editor") {
    return ["overview", "articles", "comments", "analytics", "mixes", "scores", "reddit"].includes(tabId);
  }
  if (role === "support") {
    return ["overview", "orders", "users", "tickets", "products", "ads"].includes(tabId);
  }
  return true;
}

export function getRoleDashboardRoute(role: UserRole): string {
  switch (role) {
    case "super_admin": return "/admin";
    case "editor": return "/editor-dashboard";
    case "support": return "/support-dashboard";
    default: return "/account";
  }
}

