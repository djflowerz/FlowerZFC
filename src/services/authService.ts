// Auth & RBAC Management Service
// Roles: super_admin | editor | support | user
// SINGLE SUPER-ADMIN LOCK: strictly locked to ianmuriithiflowerz@gmail.com

export type UserRole = 'super_admin' | 'editor' | 'support' | 'user'

export interface AuthProfile {
  id: string
  name: string
  email: string
  role: UserRole
  avatar?: string
  createdAt: string
  lastLogin?: string
}

export const SUPER_ADMIN_EMAIL = 'ianmuriithiflowerz@gmail.com'

const AUTH_USER_KEY = 'flz_auth_user_v1'
const PROFILES_KEY = 'flz_user_profiles_v1'

// Postgres trigger SQL string reference for Supabase deployment
export const SUPER_ADMIN_TRIGGER_SQL = `
-- Ensure role column exists on profiles
alter table profiles add column if not exists role text default 'user';

-- Seed the single super admin
update profiles set role = 'super_admin' where email = 'ianmuriithiflowerz@gmail.com';

-- Guardrail: prevent any OTHER row from ever being set to super_admin via trigger
create or replace function enforce_single_super_admin()
returns trigger as $$
begin
  if new.role = 'super_admin' and new.email != 'ianmuriithiflowerz@gmail.com' then
    raise exception 'Only ianmuriithiflowerz@gmail.com may hold the super_admin role';
  end if;
  return new;
end;
$$ language plpgsql;

create trigger trg_enforce_single_super_admin
before insert or update on profiles
for each row execute function enforce_single_super_admin();
`

// Enforce single super admin rule on application layer
export function enforceSingleSuperAdminGuard(email: string, role: UserRole): void {
  if (role === 'super_admin' && email.trim().toLowerCase() !== SUPER_ADMIN_EMAIL) {
    throw new Error('Only ianmuriithiflowerz@gmail.com may hold the super_admin role')
  }
}

// Default seed profiles for testing role-based access
export const DEFAULT_PROFILES: AuthProfile[] = [
  { id: 'usr-superadmin', name: 'Ian Muriithi (Super Admin)', email: SUPER_ADMIN_EMAIL, role: 'super_admin', createdAt: '2026-01-01' },
  { id: 'usr-editor', name: 'Sarah Okonkwo (Editor)', email: 'editor@flowerz.fc', role: 'editor', createdAt: '2026-02-15' },
  { id: 'usr-support', name: 'James Mwangi (Support)', email: 'support@flowerz.fc', role: 'support', createdAt: '2026-03-10' },
  { id: 'usr-user', name: 'Regular Fan', email: 'fan@flowerz.fc', role: 'user', createdAt: '2026-04-01' },
]

export function getAllProfiles(): AuthProfile[] {
  try {
    const raw = localStorage.getItem(PROFILES_KEY)
    if (raw) return JSON.parse(raw)
  } catch { /* ignore */ }
  return DEFAULT_PROFILES
}

export function saveProfiles(profiles: AuthProfile[]): void {
  // Validate super_admin guard on every profile save
  for (const p of profiles) {
    enforceSingleSuperAdminGuard(p.email, p.role)
  }
  try {
    localStorage.setItem(PROFILES_KEY, JSON.stringify(profiles))
  } catch { /* ignore */ }
}

export function getAuthUser(): AuthProfile | null {
  try {
    const raw = localStorage.getItem(AUTH_USER_KEY)
    if (raw) return JSON.parse(raw)
  } catch { /* ignore */ }
  
  // Fall back to main app user if set
  const appUserRaw = localStorage.getItem('flowerzfc_user')
  if (appUserRaw) {
    const parsed = JSON.parse(appUserRaw)
    const matched = getAllProfiles().find(p => p.email.toLowerCase() === parsed.email.toLowerCase())
    if (matched) return matched
    if (parsed.email.toLowerCase() === SUPER_ADMIN_EMAIL) {
      return DEFAULT_PROFILES[0]
    }
  }
  return null
}

export function setAuthSession(profile: AuthProfile | null): void {
  try {
    if (profile) {
      enforceSingleSuperAdminGuard(profile.email, profile.role)
      localStorage.setItem(AUTH_USER_KEY, JSON.stringify(profile))
      localStorage.setItem('flowerzfc_user', JSON.stringify({ name: profile.name, email: profile.email, role: profile.role }))
    } else {
      localStorage.removeItem(AUTH_USER_KEY)
    }
  } catch { /* ignore */ }
}

export async function loginWithEmail(email: string, pass: string): Promise<{ success: boolean; profile?: AuthProfile; error?: string }> {
  const cleanEmail = email.trim().toLowerCase()
  const profiles = getAllProfiles()

  let matched = profiles.find(p => p.email.toLowerCase() === cleanEmail)
  
  if (!matched) {
    if (cleanEmail === SUPER_ADMIN_EMAIL || cleanEmail === 'admin@flowerz.fc') {
      matched = { ...DEFAULT_PROFILES[0], email: SUPER_ADMIN_EMAIL }
    } else if (cleanEmail === 'editor@flowerz.fc') {
      matched = DEFAULT_PROFILES[1]
    } else if (cleanEmail === 'support@flowerz.fc') {
      matched = DEFAULT_PROFILES[2]
    }
  }

  if (matched) {
    try {
      enforceSingleSuperAdminGuard(matched.email, matched.role)
    } catch (err: any) {
      return { success: false, error: err.message || 'Single Super-Admin guardrail violation' }
    }
    matched.lastLogin = new Date().toISOString()
    setAuthSession(matched)
    return { success: true, profile: matched }
  }

  return { success: false, error: 'Invalid email or credentials for dashboard access.' }
}

export function hasTabAccess(role: UserRole, tabId: string): boolean {
  if (role === 'super_admin') return true
  if (role === 'editor') {
    return ['overview', 'articles', 'comments', 'analytics'].includes(tabId)
  }
  if (role === 'support') {
    return ['overview', 'orders', 'users', 'tickets'].includes(tabId)
  }
  return false
}

export function getRoleDashboardRoute(role: UserRole): string {
  switch (role) {
    case 'super_admin': return '/admin'
    case 'editor': return '/editor-dashboard'
    case 'support': return '/support-dashboard'
    default: return '/account'
  }
}
