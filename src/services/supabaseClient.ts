import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = (import.meta.env.VITE_SUPABASE_URL as string) || ''
const SUPABASE_ANON_KEY = (import.meta.env.VITE_SUPABASE_ANON_KEY as string) || ''

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error('[Supabase] Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY in .env')
}

export interface ProfileRow {
  id: string
  email: string
  name: string | null
  role: string
  avatar_url: string | null
  created_at: string
  last_login: string | null
}

export interface ProductRow {
  id: string
  name: string
  price: number
  originalPrice?: number
  category?: string
  badge?: string
  rating?: number
  reviews?: number
  images?: string[] | string
  description?: string
  stock?: number
  created_at?: string
}

export interface OrderRow {
  id: string
  customer: string
  email: string
  phone?: string
  address?: string
  items: string
  total: number
  method?: string
  status: string
  date?: string
  created_at?: string
  tracking?: string
  shippingCourier?: string
  shippingCostKes?: number
  shippingTier?: string
}

export interface AdminActionRow {
  id: string
  admin_email: string
  admin_role: string
  action: string
  entity: string | null
  entity_id: string | null
  details: string | null
  created_at: string
}

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    storageKey: 'flowerzfc_sb_session',
  },
})

// ─── Auth helpers ─────────────────────────────────────────────────────────────

export async function signInWithEmail(email: string, password: string) {
  return supabase.auth.signInWithPassword({ email, password })
}

export async function signUpWithEmail(email: string, password: string, name: string) {
  return supabase.auth.signUp({
    email,
    password,
    options: { data: { name } },
  })
}

export async function signOut() {
  return supabase.auth.signOut()
}

export async function sendPasswordReset(email: string) {
  return supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${window.location.origin}/#/reset-password`,
  })
}

export async function getSession() {
  const { data } = await supabase.auth.getSession()
  return data.session
}

// ─── Profile helpers ──────────────────────────────────────────────────────────

export async function fetchProfile(userId: string): Promise<{ profile: ProfileRow | null; error: any }> {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .maybeSingle()
    return { profile: data as ProfileRow | null, error }
  } catch (err) {
    return { profile: null, error: err }
  }
}

export async function fetchAllProfiles(): Promise<{ profiles: ProfileRow[]; error: any }> {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: false })
    return { profiles: (data as ProfileRow[]) || [], error }
  } catch (err) {
    return { profiles: [], error: err }
  }
}

export async function upsertProfile(userId: string, email: string, name: string): Promise<{ profile: ProfileRow | null; error: any }> {
  try {
    const { data, error } = await (supabase.from('profiles') as any)
      .upsert(
        { id: userId, email, name, role: 'user', last_login: new Date().toISOString() },
        { onConflict: 'id' }
      )
      .select()
      .single()
    return { profile: data as ProfileRow | null, error }
  } catch (err) {
    return { profile: null, error: err }
  }
}

export async function updateLastLogin(userId: string) {
  try {
    await (supabase.from('profiles') as any)
      .update({ last_login: new Date().toISOString() })
      .eq('id', userId)
  } catch (e) {
    /* ignore */
  }
}

// ─── Product helpers ──────────────────────────────────────────────────────────

export async function fetchAllProducts(): Promise<{ products: ProductRow[]; error: any }> {
  try {
    const { data, error } = await supabase
      .from('products')
      .select('*')
    return { products: (data as ProductRow[]) || [], error }
  } catch (err) {
    return { products: [], error: err }
  }
}

// ─── Order helpers ────────────────────────────────────────────────────────────

export async function fetchAllOrders(): Promise<{ orders: OrderRow[]; error: any }> {
  try {
    const { data, error } = await supabase
      .from('orders')
      .select('*')
      .order('created_at', { ascending: false })
    return { orders: (data as OrderRow[]) || [], error }
  } catch (err) {
    return { orders: [], error: err }
  }
}
