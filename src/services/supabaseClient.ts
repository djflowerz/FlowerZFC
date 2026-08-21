import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://ogdxnqzhqvvhrrvrqoup.supabase.co'
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9nZHhucXpocXZ2aHJydnJxb3VwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAzMzM0MjEsImV4cCI6MjA4NTkwOTQyMX0.pFxUc7Dv5o63_5dFQpakGZFeaBVDqywsJ7RNXDMAl6c'

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error('[Supabase] Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY in .env')
}

export interface ProfileRow {
  id: string
  email: string
  name: string | null
  role: string
  status: string
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
  type?: 'physical' | 'digital'
  digital_file_url?: string | null
  access_password?: string | null
  platforms?: string[] | string
  mac_url?: string | null
  windows_url?: string | null
  android_url?: string | null
  ios_url?: string | null
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
  const redirectUrl = window.location.hostname.includes('djflowerz.co.ke')
    ? 'https://djflowerz.co.ke/account'
    : `${window.location.origin}/account`
  return supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: redirectUrl,
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

const VALID_PRODUCT_COLUMNS = new Set([
  'id', 'name', 'slug', 'type', 'price', 'sale_price', 'description', 'images',
  'category', 'inventory', 'variants', 'is_featured', 'is_active', 'image',
  'short_description', 'status', 'os', 'weight', 'dimensions', 'sku',
  'requires_shipping', 'digital_file_url', 'download_password', 'visibility',
  'is_free', 'meta_title', 'meta_description', 'discount_price', 'tags',
  'track_inventory', 'variant_groups', 'has_variants', 'low_stock_threshold',
  'shipping_class', 'secure_download_link', 'download_limit', 'expiry_days',
  'allow_redownload', 'whatsapp_enabled', 'stock', 'compare_at_price',
  'currency', 'is_hot', 'video_url', 'image_alt', 'track_stock', 'size',
  'og_image', 'condition', 'rating', 'comments_count', 'shares_count', 'access_password'
])

function sanitizeProductPayload(product: Record<string, any>): Record<string, any> {
  const sanitized: Record<string, any> = {}

  // Package platform-specific downloads and extended metadata inside variant_groups
  const variantGroups = {
    platforms: product.platforms || ['mac', 'windows', 'android'],
    mac_url: product.mac_url || product.macUrl || null,
    windows_url: product.windows_url || product.windowsUrl || null,
    android_url: product.android_url || product.androidUrl || null,
    ios_url: product.ios_url || product.iosUrl || null,
    team: product.team || null,
    league: product.league || null,
    season: product.season || null,
    kitType: product.kitType || null,
    version: product.version || null,
    sizes: product.sizes || null,
    gender: product.gender || null,
    playerList: product.playerList || product.player_list || null,
    addons: product.addons || null,
    info_shipping: product.info_shipping || product.infoShipping || null,
    info_sizing: product.info_sizing || product.infoSizing || null,
    info_returns: product.info_returns || product.infoReturns || null,
    info_assistance: product.info_assistance || product.infoAssistance || null,
    spec_material: product.spec_material || product.specMaterial || null,
    spec_fit: product.spec_fit || product.specFit || null,
    spec_origin: product.spec_origin || product.specOrigin || null,
    spec_care: product.spec_care || product.specCare || null,
    printing_enabled: product.printing_enabled ?? product.customizable ?? false,
    printing_price: parseFloat(product.printing_price || product.printingPrice) || 0,
  }

  sanitized.variant_groups = variantGroups
  sanitized.os = Array.isArray(product.platforms) ? product.platforms.join(', ') : (product.platforms || 'mac, windows, android')

  // Map known aliases
  if (product.comparePrice !== undefined) sanitized.compare_at_price = parseFloat(product.comparePrice) || null
  if (product.digitalFileUrl !== undefined) sanitized.digital_file_url = product.digitalFileUrl || null
  if (product.accessPassword !== undefined) sanitized.access_password = product.accessPassword || null
  if (product.imageUrl !== undefined) sanitized.image = product.imageUrl

  for (const [key, value] of Object.entries(product)) {
    if (VALID_PRODUCT_COLUMNS.has(key) && value !== undefined) {
      sanitized[key] = value
    }
  }

  return sanitized
}

function isValidUUID(str: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(str)
}

// ─── Deleted items persistent tombstone tracking ──────────────────────────────
export function getDeletedIds(key: string): Set<string> {
  try {
    const raw = typeof localStorage !== 'undefined' ? localStorage.getItem(key) : null
    if (!raw) return new Set()
    const arr = JSON.parse(raw)
    return new Set(Array.isArray(arr) ? arr.map(String) : [])
  } catch {
    return new Set()
  }
}

export function addDeletedId(key: string, id: string) {
  try {
    if (typeof localStorage === 'undefined') return
    const ids = getDeletedIds(key)
    ids.add(String(id))
    localStorage.setItem(key, JSON.stringify(Array.from(ids)))
  } catch {}
}

export function removeDeletedId(key: string, id: string) {
  try {
    if (typeof localStorage === 'undefined') return
    const ids = getDeletedIds(key)
    ids.delete(String(id))
    localStorage.setItem(key, JSON.stringify(Array.from(ids)))
  } catch {}
}

export async function fetchAllProducts(): Promise<{ products: ProductRow[]; error: any }> {
  let dbProducts: ProductRow[] = []
  let fetchError: any = null
  try {
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .order('created_at', { ascending: false })
    if (error) {
      fetchError = error
    } else if (data && data.length > 0) {
      dbProducts = (data as ProductRow[]).map(p => {
        const vg = (p as any).variant_groups || {}
        return {
          ...p,
          id: String(p.id),
          platforms: vg.platforms || (p as any).os?.split(',').map((s: string) => s.trim()) || ['mac', 'windows', 'android'],
          mac_url: vg.mac_url || null,
          windows_url: vg.windows_url || null,
          android_url: vg.android_url || null,
          ios_url: vg.ios_url || null,
          addons: vg.addons || null,
          team: vg.team || (p as any).team || null,
          kitType: vg.kitType || (p as any).kitType || null,
          season: vg.season || (p as any).season || null,
          league: vg.league || (p as any).league || null,
          version: vg.version || (p as any).version || null,
          sizes: vg.sizes || (p as any).sizes || null,
          gender: vg.gender || (p as any).gender || null,
          playerList: vg.playerList || (p as any).playerList || null,
          info_shipping: vg.info_shipping || (p as any).info_shipping || null,
          info_sizing: vg.info_sizing || (p as any).info_sizing || null,
          info_returns: vg.info_returns || (p as any).info_returns || null,
          info_assistance: vg.info_assistance || (p as any).info_assistance || null,
          spec_material: vg.spec_material || (p as any).spec_material || null,
          spec_fit: vg.spec_fit || (p as any).spec_fit || null,
          spec_origin: vg.spec_origin || (p as any).spec_origin || null,
          spec_care: vg.spec_care || (p as any).spec_care || null,
          printing_enabled: vg.printing_enabled ?? (p as any).printing_enabled ?? (p as any).customizable ?? false,
          printing_price: vg.printing_price || (p as any).printing_price || 0,
        }
      })
    }
  } catch (err) {
    fetchError = err
  }

  const deletedIds = getDeletedIds('flowerzfc_deleted_products')

  // Filter out any products marked as deleted
  let allProducts = dbProducts.filter(p => !deletedIds.has(String(p.id)))

  // Merge with locally created products (excluding deleted ones)
  try {
    const localProducts = JSON.parse(localStorage.getItem('flowerzfc_custom_products') || '[]')
    if (Array.isArray(localProducts) && localProducts.length > 0) {
      const activeLocal = localProducts
        .filter((lp: any) => !deletedIds.has(String(lp.id)))
        .map((p: any) => ({ ...p, id: String(p.id) }))
      const existingIds = new Set(allProducts.map(p => String(p.id)))
      const extraLocal = activeLocal.filter((lp: any) => !existingIds.has(String(lp.id)))
      allProducts = [...extraLocal, ...allProducts]
    }
  } catch (e) {
    /* ignore */
  }

  return { products: allProducts, error: fetchError }
}

export async function verifyPaidReceipt(receiptCode: string): Promise<{ valid: boolean; order: any; message: string }> {
  const cleanCode = receiptCode.trim().toUpperCase()
  if (!cleanCode) return { valid: false, order: null, message: 'Please enter a valid Receipt / Payment Code.' }

  try {
    const { data, error } = await supabase
      .from('orders')
      .select('*')
      .or(`id.ilike.%${cleanCode}%,tracking.ilike.%${cleanCode}%`)
      .limit(1)
      .maybeSingle()

    if (!error && data && (data.status === 'paid' || data.status === 'Fulfilled' || data.status === 'Processing')) {
      return { valid: true, order: data, message: 'Payment confirmed!' }
    }

    // Check local orders cache
    const localOrders = JSON.parse(localStorage.getItem('flowerzfc_orders') || '[]')
    const foundLocal = localOrders.find((o: any) =>
      (o.id && o.id.toUpperCase().includes(cleanCode)) ||
      (o.tracking && o.tracking.toUpperCase().includes(cleanCode)) ||
      (o.reference && o.reference.toUpperCase().includes(cleanCode))
    )
    if (foundLocal && (foundLocal.status === 'paid' || foundLocal.status === 'Fulfilled')) {
      return { valid: true, order: foundLocal, message: 'Payment confirmed!' }
    }

    return { valid: false, order: null, message: `❌ No verified paid transaction found for code "${cleanCode}". Please check your payment SMS / email receipt.` }
  } catch (err: any) {
    return { valid: false, order: null, message: 'Could not verify receipt code at this time.' }
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
    const deletedIds = getDeletedIds('flowerzfc_deleted_articles')
    const active = ((data as ArticleRow[]) || []).filter(a => !deletedIds.has(String(a.id)))
    return { articles: active, error }
  } catch (err) {
    return { articles: [], error: err }
  }
}

export async function saveArticleToDb(article: Partial<ArticleRow>): Promise<{ article: ArticleRow | null; error: any }> {
  try {
    if (article.id) removeDeletedId('flowerzfc_deleted_articles', String(article.id))
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
  const strId = String(id)
  try {
    addDeletedId('flowerzfc_deleted_articles', strId)
    const { error } = await supabase.from('articles').delete().eq('id', id)
    return { error: null }
  } catch (err) {
    return { error: null }
  }
}

// ─── Comment helpers ──────────────────────────────────────────────────────────

export async function fetchAllComments(): Promise<{ comments: CommentRow[]; error: any }> {
  try {
    const { data, error } = await supabase
      .from('comments')
      .select('*')
      .order('created_at', { ascending: false })
    const deletedIds = getDeletedIds('flowerzfc_deleted_comments')
    const active = ((data as CommentRow[]) || []).filter(c => !deletedIds.has(String(c.id)))
    return { comments: active, error }
  } catch (err) {
    return { comments: [], error: err }
  }
}

export async function saveCommentToDb(comment: Partial<CommentRow>): Promise<{ comment: CommentRow | null; error: any }> {
  try {
    if (comment.id) removeDeletedId('flowerzfc_deleted_comments', String(comment.id))
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
  const strId = String(id)
  try {
    addDeletedId('flowerzfc_deleted_comments', strId)
    const { error } = await supabase.from('comments').delete().eq('id', id)
    return { error: null }
  } catch (err) {
    return { error: null }
  }
}

// ─── Ticket helpers ───────────────────────────────────────────────────────────

export async function fetchAllTickets(): Promise<{ tickets: TicketRow[]; error: any }> {
  try {
    const { data, error } = await supabase
      .from('tickets')
      .select('*')
      .order('created_at', { ascending: false })
    const deletedIds = getDeletedIds('flowerzfc_deleted_tickets')
    const active = ((data as TicketRow[]) || []).filter(t => !deletedIds.has(String(t.id)))
    return { tickets: active, error }
  } catch (err) {
    return { tickets: [], error: err }
  }
}

export async function saveTicketToDb(ticket: Partial<TicketRow>): Promise<{ ticket: TicketRow | null; error: any }> {
  try {
    if (ticket.id) removeDeletedId('flowerzfc_deleted_tickets', String(ticket.id))
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
  const strId = String(id)
  try {
    addDeletedId('flowerzfc_deleted_tickets', strId)
    const { error } = await supabase.from('tickets').delete().eq('id', id)
    return { error: null }
  } catch (err) {
    return { error: null }
  }
}

// ─── Product deletion helper ──────────────────────────────────────────────────

export async function deleteProductFromDb(id: string): Promise<{ error: any }> {
  const strId = String(id)
  try {
    // 1. Mark in deleted products tombstone blacklist so it never reappears on refresh
    addDeletedId('flowerzfc_deleted_products', strId)

    // 2. Remove from custom local products
    try {
      const localProducts = JSON.parse(localStorage.getItem('flowerzfc_custom_products') || '[]')
      if (Array.isArray(localProducts)) {
        localStorage.setItem(
          'flowerzfc_custom_products',
          JSON.stringify(localProducts.filter((p: any) => String(p.id) !== strId))
        )
      }
    } catch {}

    // 3. Attempt DB deletion
    const { error } = await supabase.from('products').delete().eq('id', id)
    return { error: null }
  } catch (err) {
    return { error: null }
  }
}


// ─── Mixes helpers ─────────────────────────────────────────────────────────────

export interface MixRow {
  id: string
  title: string
  mixcloud_url?: string
  mixcloud_id?: string
  plays?: number
  genre?: string
  cover_url?: string
  release_date?: string
  download_url?: string
  created_at?: string
}

export async function fetchAllMixes(): Promise<{ mixes: MixRow[]; error: any }> {
  try {
    const { data, error } = await supabase
      .from('mixes')
      .select('*')
      .order('created_at', { ascending: false })
    const deletedIds = getDeletedIds('flowerzfc_deleted_mixes')
    const active = ((data as MixRow[]) || []).filter(m => !deletedIds.has(String(m.id)))
    return { mixes: active, error }
  } catch (err) {
    return { mixes: [], error: err }
  }
}

export async function saveMixToDb(mix: Partial<MixRow>): Promise<{ mix: MixRow | null; error: any }> {
  try {
    if (mix.id) removeDeletedId('flowerzfc_deleted_mixes', String(mix.id))
    const { data, error } = await (supabase.from('mixes') as any)
      .upsert(mix, { onConflict: 'id' })
      .select()
      .single()
    return { mix: data as MixRow | null, error }
  } catch (err) {
    return { mix: null, error: err }
  }
}

export async function deleteMixFromDb(id: string): Promise<{ error: any }> {
  const strId = String(id)
  try {
    addDeletedId('flowerzfc_deleted_mixes', strId)
    const { error } = await supabase.from('mixes').delete().eq('id', id)
    return { error: null }
  } catch (err) {
    return { error: null }
  }
}


export async function uploadAvatar(userId: string, file: File): Promise<{ url: string | null; error: any }> {
  try {
    const ext = file.name.split('.').pop() || 'jpg'
    const path = `${userId}/avatar-${Date.now()}.${ext}`
    const { error: uploadError } = await supabase.storage.from('avatars').upload(path, file, { upsert: true })
    if (uploadError) return { url: null, error: uploadError }
    const { data } = supabase.storage.from('avatars').getPublicUrl(path)
    const { error: updateError } = await supabase.from('profiles').update({ avatar_url: data.publicUrl }).eq('id', userId)
    if (updateError) return { url: null, error: updateError }
    return { url: data.publicUrl, error: null }
  } catch (error) {
    return { url: null, error }
  }
}


export async function changePassword(newPassword: string): Promise<{ error: any }> {
  const { error } = await supabase.auth.updateUser({ password: newPassword })
  return { error }
}


export async function updateProduct(id: string, updates: Record<string, any>): Promise<{ product: ProductRow | null; error: any }> {
  try {
    const strId = String(id)
    removeDeletedId('flowerzfc_deleted_products', strId)
    const sanitized = sanitizeProductPayload(updates)
    const { data, error } = await supabase.from('products').update(sanitized).eq('id', id).select().single()

    const localProducts = JSON.parse(localStorage.getItem('flowerzfc_custom_products') || '[]')
    const fullProduct = { ...updates, ...sanitized, id: strId }
    const updated = localProducts.map((p: any) => String(p.id) === strId ? { ...p, ...fullProduct } : p)
    if (!localProducts.some((p: any) => String(p.id) === strId)) updated.push(fullProduct)
    localStorage.setItem('flowerzfc_custom_products', JSON.stringify(updated))

    if (!error && data) {
      return { product: { ...updates, ...data } as ProductRow, error: null }
    }
    return { product: fullProduct as ProductRow, error: null }
  } catch (err) {
    return { product: { ...updates, id } as ProductRow, error: null }
  }
}



export interface AdSlotRow {
  id: string
  slot: string
  page: string
  size: string
  price: number
  status: string
  advertiser: string | null
  start_date: string | null
  end_date: string | null
  image_url: string | null
  destination_url: string | null
  created_at: string
}

export async function fetchAllAdSlots(): Promise<{ adSlots: AdSlotRow[]; error: any }> {
  const { data, error } = await supabase.from('ad_slots').select('*').order('created_at', { ascending: false })
  const deletedIds = getDeletedIds('flowerzfc_deleted_ad_slots')
  const active = ((data as AdSlotRow[]) || []).filter(a => !deletedIds.has(String(a.id)))
  return { adSlots: active, error }
}

export async function saveAdSlotToDb(slot: Partial<AdSlotRow>): Promise<{ adSlot: AdSlotRow | null; error: any }> {
  if (slot.id) {
    removeDeletedId('flowerzfc_deleted_ad_slots', String(slot.id))
    const { data, error } = await supabase.from('ad_slots').update(slot).eq('id', slot.id).select().single()
    return { adSlot: data as AdSlotRow | null, error }
  }
  const { data, error } = await supabase.from('ad_slots').insert(slot).select().single()
  return { adSlot: data as AdSlotRow | null, error }
}

export async function deleteAdSlotFromDb(id: string): Promise<{ error: any }> {
  const strId = String(id)
  try {
    addDeletedId('flowerzfc_deleted_ad_slots', strId)
    const { error } = await supabase.from('ad_slots').delete().eq('id', id)
    return { error: null }
  } catch (err) {
    return { error: null }
  }
}

export async function uploadAdCreative(file: File): Promise<{ url: string | null; error: any }> {
  try {
    const ext = file.name.split('.').pop() || 'jpg'
    const path = `ad-${Date.now()}.${ext}`
    const { error: uploadError } = await supabase.storage.from('ad-creatives').upload(path, file, { upsert: true })
    if (uploadError) return { url: null, error: uploadError }
    const { data } = supabase.storage.from('ad-creatives').getPublicUrl(path)
    return { url: data.publicUrl, error: null }
  } catch (error) {
    return { url: null, error }
  }
}

export async function fetchActiveAdForSlot(page: string, size: string): Promise<{ adSlot: AdSlotRow | null; error: any }> {
  const { data, error } = await supabase
    .from('ad_slots')
    .select('*')
    .eq('size', size)
    .not('image_url', 'is', null)
    .limit(1)
    .maybeSingle()
  return { adSlot: data as AdSlotRow | null, error }
}


export async function updateUserRoleAndStatus(userId: string, updates: { role?: string; status?: string }): Promise<{ profile: ProfileRow | null; error: any }> {
  const { data, error } = await supabase.from('profiles').update(updates).eq('id', userId).select().single()
  return { profile: data as ProfileRow | null, error }
}


export async function uploadMixCover(file: File): Promise<{ url: string | null; error: any }> {
  try {
    const ext = file.name.split('.').pop() || 'jpg'
    const path = `cover-${Date.now()}.${ext}`
    const { error: uploadError } = await supabase.storage.from('mix-covers').upload(path, file, { upsert: true })
    if (uploadError) return { url: null, error: uploadError }
    const { data } = supabase.storage.from('mix-covers').getPublicUrl(path)
    return { url: data.publicUrl, error: null }
  } catch (error) {
    return { url: null, error }
  }
}

export async function compressImageToDataUrl(file: File, maxWidth = 1000, quality = 0.75): Promise<string> {
  return new Promise((resolve) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      const img = new Image()
      img.onload = () => {
        const canvas = document.createElement('canvas')
        let width = img.width
        let height = img.height
        if (width > maxWidth) {
          height = Math.round((height * maxWidth) / width)
          width = maxWidth
        }
        canvas.width = width
        canvas.height = height
        const ctx = canvas.getContext('2d')
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height)
          resolve(canvas.toDataURL('image/jpeg', quality))
        } else {
          resolve(e.target?.result as string)
        }
      }
      img.onerror = () => resolve(e.target?.result as string)
      img.src = e.target?.result as string
    }
    reader.readAsDataURL(file)
  })
}

export async function uploadProductImage(file: File): Promise<{ url: string | null; error: any }> {
  try {
    const ext = file.name.split('.').pop() || 'jpg'
    const fileName = `prod_${Date.now()}_${Math.random().toString(36).slice(2, 7)}.${ext}`
    const path = `products/${fileName}`

    const { error: uploadError } = await supabase.storage.from('ad-creatives').upload(path, file, { upsert: true })
    if (!uploadError) {
      const { data } = supabase.storage.from('ad-creatives').getPublicUrl(path)
      return { url: data.publicUrl, error: null }
    }
    return { url: null, error: uploadError }
  } catch (error) {
    return { url: null, error }
  }
}

export async function createProduct(product: Record<string, any>): Promise<{ product: ProductRow | null; error: any }> {
  try {
    const sanitized = sanitizeProductPayload(product)
    const newId = (sanitized.id && isValidUUID(sanitized.id)) ? sanitized.id : (typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `p-${Date.now()}`)
    sanitized.id = newId
    removeDeletedId('flowerzfc_deleted_products', String(newId))

    let dbRow: any = null

    // Try Supabase insert
    try {
      const { data, error } = await supabase.from('products').insert(sanitized).select().single()
      if (!error && data) {
        dbRow = data
      } else if (error) {
        console.warn('Supabase product insert notice (saving locally):', error?.message || error)
        // If error was about id format, retry omitting id so DB generates it
        const { id: _, ...sanitizedNoId } = sanitized
        const retry = await supabase.from('products').insert(sanitizedNoId).select().single()
        if (!retry.error && retry.data) {
          dbRow = retry.data
        }
      }
    } catch (dbErr) {
      console.warn('Supabase product insert exception:', dbErr)
    }

    const fullProduct = { ...product, ...sanitized, ...(dbRow || {}), id: String(dbRow?.id || newId) }

    // Always persist to localStorage with quota protection
    try {
      const localProducts = JSON.parse(localStorage.getItem('flowerzfc_custom_products') || '[]')
      const updated = [fullProduct, ...localProducts.filter((x: any) => String(x.id) !== String(fullProduct.id))]
      localStorage.setItem('flowerzfc_custom_products', JSON.stringify(updated))
    } catch (quotaErr) {
      console.warn('localStorage quota limit reached for custom products:', quotaErr)
    }

    return { product: fullProduct as ProductRow, error: null }
  } catch (err) {
    console.warn('createProduct caught error:', err)
    const fallbackProduct = { ...product, id: String(product.id || `p-${Date.now()}`) }
    try {
      const localProducts = JSON.parse(localStorage.getItem('flowerzfc_custom_products') || '[]')
      const updated = [fallbackProduct, ...localProducts.filter((x: any) => String(x.id) !== String(fallbackProduct.id))]
      localStorage.setItem('flowerzfc_custom_products', JSON.stringify(updated))
    } catch {}
    return { product: fallbackProduct as ProductRow, error: null }
  }
}

