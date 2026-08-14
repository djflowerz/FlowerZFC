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

export interface ArticleRow {
  id: string
  title: string
  slug: string
  category: string
  author: string
  body: string
  image_url: string
  status: string
  published_at: string
  tags?: string
  views?: number
  likes?: number
  created_at?: string
}

export interface CommentRow {
  id: string
  article_id?: string
  match_id?: string
  user_name: string
  user_email?: string
  user_avatar?: string
  body: string
  status: string
  reported?: boolean
  created_at?: string
}

export interface TicketRow {
  id: string
  title: string
  event_date: string
  venue: string
  price: number
  available_tickets: number
  sold_tickets: number
  status: string
  created_at?: string
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
    redirectTo: `${window.location.origin}/reset-password`,
  })
}

export async function signInWithGoogle() {
  return supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: `${window.location.origin}/`,
    },
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

const EXCLUDED_CATEGORIES = ['Laptops', 'Software', 'DJ Controllers', 'Audio Equipment', 'Monitors', 'Cables', 'Speakers', 'All-In-One Desktops']
const EXCLUDED_KEYWORDS = ['dell', 'hp', 'lenovo', 'macbook', 'pioneer', 'atomix', 'oraimo', 'magix', 'serato', 'havit', 'imac', 'vegas', 'thinkpad', 'probook', 'zbook', 'spacebuds', 'boompop']

export async function fetchAllProducts(): Promise<{ products: ProductRow[]; error: any }> {
  try {
    const { data, error } = await supabase
      .from('products')
      .select('*')
    if (error || !data) return { products: [], error }

    const filtered = (data as ProductRow[]).filter(p => {
      const cat = (p.category || '').trim()
      const nameLower = (p.name || '').toLowerCase()
      if (EXCLUDED_CATEGORIES.some(c => c.toLowerCase() === cat.toLowerCase())) return false
      if (EXCLUDED_KEYWORDS.some(kw => nameLower.includes(kw))) return false
      return true
    })

    return { products: filtered, error: null }
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

export async function createOrder(order: Partial<OrderRow>): Promise<{ order: OrderRow | null; error: any }> {
  try {
    const { data, error } = await (supabase.from('orders') as any)
      .insert(order)
      .select()
      .single()
    return { order: data as OrderRow | null, error }
  } catch (err) {
    return { order: null, error: err }
  }
}

// ─── Article helpers ──────────────────────────────────────────────────────────

export async function fetchAllArticles(): Promise<{ articles: ArticleRow[]; error: any }> {
  try {
    const { data, error } = await supabase
      .from('articles')
      .select('*')
      .order('published_at', { ascending: false })
    return { articles: (data as ArticleRow[]) || [], error }
  } catch (err) {
    return { articles: [], error: err }
  }
}

export async function saveArticleToDb(article: Partial<ArticleRow>): Promise<{ article: ArticleRow | null; error: any }> {
  try {
    const { data, error } = await (supabase.from('articles') as any)
      .upsert(article, { onConflict: 'id' })
      .select()
      .single()
    return { article: data as ArticleRow | null, error }
  } catch (err) {
    return { article: null, error: err }
  }
}

export async function deleteArticleFromDb(id: string): Promise<{ error: any }> {
  try {
    const { error } = await supabase.from('articles').delete().eq('id', id)
    return { error }
  } catch (err) {
    return { error: err }
  }
}

// ─── Comment helpers ──────────────────────────────────────────────────────────

export async function fetchAllComments(): Promise<{ comments: CommentRow[]; error: any }> {
  try {
    const { data, error } = await supabase
      .from('comments')
      .select('*')
      .order('created_at', { ascending: false })
    return { comments: (data as CommentRow[]) || [], error }
  } catch (err) {
    return { comments: [], error: err }
  }
}

export async function saveCommentToDb(comment: Partial<CommentRow>): Promise<{ comment: CommentRow | null; error: any }> {
  try {
    const { data, error } = await (supabase.from('comments') as any)
      .upsert(comment, { onConflict: 'id' })
      .select()
      .single()
    return { comment: data as CommentRow | null, error }
  } catch (err) {
    return { comment: null, error: err }
  }
}

export async function deleteCommentFromDb(id: string): Promise<{ error: any }> {
  try {
    const { error } = await supabase.from('comments').delete().eq('id', id)
    return { error }
  } catch (err) {
    return { error: err }
  }
}

// ─── Ticket helpers ───────────────────────────────────────────────────────────

export async function fetchAllTickets(): Promise<{ tickets: TicketRow[]; error: any }> {
  try {
    const { data, error } = await supabase
      .from('tickets')
      .select('*')
      .order('created_at', { ascending: false })
    return { tickets: (data as TicketRow[]) || [], error }
  } catch (err) {
    return { tickets: [], error: err }
  }
}

export async function saveTicketToDb(ticket: Partial<TicketRow>): Promise<{ ticket: TicketRow | null; error: any }> {
  try {
    const { data, error } = await (supabase.from('tickets') as any)
      .upsert(ticket, { onConflict: 'id' })
      .select()
      .single()
    return { ticket: data as TicketRow | null, error }
  } catch (err) {
    return { ticket: null, error: err }
  }
}

export async function deleteTicketFromDb(id: string): Promise<{ error: any }> {
  try {
    const { error } = await supabase.from('tickets').delete().eq('id', id)
    return { error }
  } catch (err) {
    return { error: err }
  }
}
