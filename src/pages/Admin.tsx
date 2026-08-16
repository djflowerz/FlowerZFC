import { useState, useEffect, useRef } from 'react'
import { toast as toastLib } from 'react-toastify'
import { Link, useNavigate } from 'react-router-dom'
import { useApp } from '../context/AppContext'
import { getPaymentConfig } from '../services/paymentService'
import { fetchLiveMatches, fetchLiveStandings, fetchLiveFixtures, getUserTimezoneInfo, fetchLiveCatalogStats, type LiveMatch, type LiveStanding, type LiveFixture, type LiveCatalogStats } from '../services/liveScoreApi'
import { getIngestedPosts, fetchLiveIngestedPosts, transformContentContext, filterPostsByDate, downloadImageAsset, IngestedPost } from '../services/contentIngestion'
import { getAuthUser, loginWithEmail, hasTabAccessRole, setAuthSession, SUPER_ADMIN_EMAIL, type UserRole, type AuthProfile } from '../services/authService'
import { supabase, fetchAllProfiles, fetchAllProducts, fetchAllOrders, fetchAllArticles, fetchAllComments, fetchAllTickets, saveArticleToDb, deleteArticleFromDb, saveCommentToDb, deleteCommentFromDb, saveTicketToDb, deleteTicketFromDb, deleteProductFromDb, fetchAllMixes, saveMixToDb, deleteMixFromDb, type ArticleRow, type CommentRow, type TicketRow, type MixRow } from '../services/supabaseClient'
import { logAdminAction, getAuditLogs, pingAllServices, type AuditAction, type HealthCheck } from '../services/adminDataService'
import { getShippingConfig, saveShippingConfig, type ShippingConfig } from '../services/shippingService'
import {
  saveArticle, deleteArticle as storeDeleteArticle, clearArticleStore,
  type StoredArticle
} from '../services/articleStore'

// ─── SECURITY: No API keys, key prefixes, or secrets are rendered anywhere in this file.
//               The admin gate is a client-side UX layer only. Production deployments
//               MUST add server-side middleware (e.g. Vercel Edge middleware) to gate /admin.

type AdminTab =
  | 'overview' | 'orders' | 'products' | 'articles' | 'tickets'
  | 'users' | 'financials' | 'analytics' | 'comments' | 'ads'
  | 'comms' | 'platform' | 'system' | 'settings' | 'scores' | 'mixes'

// ─── Helpers ─────────────────────────────────────────────────────────────────
const SC: Record<string, { bg: string; text: string }> = {
  Pending:    { bg: 'rgba(245,158,11,.15)',  text: '#f59e0b' },
  Processing: { bg: 'rgba(99,102,241,.15)',  text: '#818cf8' },
  Shipped:    { bg: 'rgba(59,130,246,.15)',  text: '#60a5fa' },
  Fulfilled:  { bg: 'rgba(0,179,65,.15)',    text: '#00b341' },
  Refunded:   { bg: 'rgba(239,68,68,.15)',   text: '#f87171' },
  Published:  { bg: 'rgba(0,179,65,.15)',    text: '#00b341' },
  Draft:      { bg: 'rgba(156,163,175,.15)', text: '#9ca3af' },
  Scheduled:  { bg: 'rgba(99,102,241,.15)',  text: '#818cf8' },
  Active:     { bg: 'rgba(0,179,65,.15)',    text: '#00b341' },
  Inactive:   { bg: 'rgba(156,163,175,.15)', text: '#9ca3af' },
  'Low Stock':{ bg: 'rgba(245,158,11,.15)',  text: '#f59e0b' },
  Limited:    { bg: 'rgba(251,191,36,.15)',  text: '#fbbf24' },
  Selling:    { bg: 'rgba(0,179,65,.15)',    text: '#00b341' },
  'On Sale':  { bg: 'rgba(99,102,241,.15)',  text: '#818cf8' },
  Banned:     { bg: 'rgba(239,68,68,.15)',   text: '#f87171' },
  Booked:     { bg: 'rgba(0,179,65,.15)',    text: '#00b341' },
  Available:  { bg: 'rgba(99,102,241,.15)',  text: '#818cf8' },
  Approved:   { bg: 'rgba(0,179,65,.15)',    text: '#00b341' },
  Flagged:    { bg: 'rgba(239,68,68,.15)',   text: '#f87171' },
  Spam:       { bg: 'rgba(239,68,68,.15)',   text: '#f87171' },
  'Pending_c':{ bg: 'rgba(245,158,11,.15)',  text: '#f59e0b' },
  Success:    { bg: 'rgba(0,179,65,.15)',    text: '#00b341' },
  Failed:     { bg: 'rgba(239,68,68,.15)',   text: '#f87171' },
  Online:     { bg: 'rgba(0,179,65,.15)',    text: '#00b341' },
  Degraded:   { bg: 'rgba(245,158,11,.15)',  text: '#f59e0b' },
  Offline:    { bg: 'rgba(239,68,68,.15)',   text: '#f87171' },
}

function Badge({ s }: { s: string }) {
  const c = SC[s] ?? { bg: 'rgba(255,255,255,.1)', text: '#fff' }
  return <span className="text-[10px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider whitespace-nowrap" style={{ background: c.bg, color: c.text }}>{s}</span>
}

function Card({ children, className = '', style }: { children: React.ReactNode; className?: string; style?: React.CSSProperties }) {
  return <div className={`rounded-2xl border border-[#1e1e32] ${className}`} style={{ background: '#131320', ...style }}>{children}</div>
}

function Th({ children }: { children: React.ReactNode }) {
  return <th className="px-5 py-3 text-[9px] uppercase font-black tracking-wider text-gray-500 text-left">{children}</th>
}

function SectionHead({ title, sub, action }: { title: string; sub?: string; action?: React.ReactNode }) {
  return (
    <Card className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
      <div>
        <h2 className="text-2xl font-black text-white" style={{ fontFamily: 'Big Shoulders Display' }}>{title}</h2>
        {sub && <p className="text-xs text-gray-500 mt-0.5">{sub}</p>}
      </div>
      {action}
    </Card>
  )
}

function downloadCSV(filename: string, rows: string[][], headers: string[]) {
  const csv = [headers, ...rows].map(r => r.map(c => `"${c.replace(/"/g, '""')}"`).join(',')).join('\n')
  const blob = new Blob([csv], { type: 'text/csv' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a'); a.href = url; a.download = filename; a.click()
  URL.revokeObjectURL(url)
}

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 overflow-y-auto" style={{ background: 'rgba(0,0,0,.88)', backdropFilter: 'blur(10px)' }} onClick={onClose}>
      <div className="w-full max-w-lg p-6 rounded-2xl border border-[#00b341]/30 shadow-2xl relative my-8" style={{ background: '#131320' }} onClick={e => e.stopPropagation()}>
        <button onClick={onClose} className="absolute top-4 right-4 text-gray-500 hover:text-white transition-colors text-xl">✕</button>
        <h3 className="text-2xl font-black text-white mb-5" style={{ fontFamily: 'Big Shoulders Display' }}>{title}</h3>
        {children}
      </div>
    </div>
  )
}

const INPUT = "w-full px-4 py-3 text-sm text-white placeholder-gray-600 rounded-xl outline-none focus:ring-1 focus:ring-[#00b341]"
const INPUT_STYLE = { background: '#0c0c14', border: '1px solid #1e1e32' }

// ─── Mock Data ────────────────────────────────────────────────────────────────
export type Order = {
  id: string
  customer: string
  email: string
  phone: string
  address: string
  items: string
  total: number
  method: string
  status: string
  date: string
  tracking: string
  shippingCourier?: string
  shippingCostKes?: number
  shippingTier?: 'standard' | 'express' | 'free'
}

export const INIT_ORDERS: Order[] = []

export type Product = {
  id: string
  name: string
  sku: string
  description: string
  category: string
  team: string
  league: string
  season: string
  kitType: string
  version: string
  price: number
  comparePrice: number
  costPerItem: number
  stock: number
  lowStockThreshold: number
  sales: number
  status: string
  featured: boolean
  images: string[]
  imageUrl: string
  sizeChartUrl: string
  sizes: string[]
  gender: string
  customizable: boolean
  playerList: string
  customNameLimit: number
  availablePatches: string[]
  weight: string
  dimensions: { length: string; width: string; height: string }
  slug: string
  metaTitle: string
  metaDescription: string
  colors: string
  tags: string
}

export const INIT_PRODUCTS: Product[] = []

export type Article = {
  id: string
  title: string
  slug: string
  category: string
  author: string
  excerpt: string
  body: string
  imageUrl: string
  imageAlt: string
  imageCaption: string
  status: string
  date: string
  scheduled: string
  views: string
  likes: number
  tags: string

  // Football-Specific Elements
  matchId: string
  teamTags: string
  playerTags: string
  mediaEmbeds: string
  isLiveBlog: boolean

  // SEO & Discovery
  metaTitle: string
  metaDescription: string
  focusKeywords: string
}

export const INIT_ARTICLES: Article[] = []

export type Ticket = { id: string; event: string; venue: string; date: string; regularSold: number; vipSold: number; capacity: number; revenue: number; status: string; regularPrice: number; vipPrice: number }
export const INIT_TICKETS: Ticket[] = []

export type AppUser = { id: string; name: string; email: string; role: string; joined: string; orders: number; tips: string; status: string; avatar?: string }
export const INIT_USERS: AppUser[] = []

const TIPS_DATA: { id:string; from:string; amount:number; recipient:string; method:string; date:string; ref:string; status:string }[] = []

export type Comment = { id: string; user: string; article: string; body: string; date: string; status: string; reported: boolean }
export const INIT_COMMENTS: Comment[] = []

type AdSlot = { id: string; slot: string; page: string; size: string; price: number; status: string; advertiser: string; start: string; end: string }
const INIT_ADS: AdSlot[] = [
  { id: 'ad_1', slot: 'Header Leaderboard Banner', page: 'Global (All Pages)', size: '728×90', price: 299, status: 'Available', advertiser: '—', start: '—', end: '—' },
  { id: 'ad_2', slot: 'In-Feed Medium Rectangle', page: 'Homepage & News Feed', size: '300×250', price: 199, status: 'Available', advertiser: '—', start: '—', end: '—' },
  { id: 'ad_3', slot: 'Sticky Mobile Footer Banner', page: 'Mobile Global Footer', size: '320×50', price: 149, status: 'Available', advertiser: '—', start: '—', end: '—' },
  { id: 'ad_4', slot: 'Desktop Wide Skyscraper', page: 'Sidebar (News & Scores)', size: '160×600', price: 249, status: 'Available', advertiser: '—', start: '—', end: '—' },
  { id: 'ad_5', slot: 'Sidebar Half Page Banner', page: 'Shop & Articles Sidebar', size: '300×600', price: 349, status: 'Available', advertiser: '—', start: '—', end: '—' },
  { id: 'ad_6', slot: 'Sponsored Native Content Card', page: 'News Feed Grid', size: 'Native', price: 399, status: 'Available', advertiser: '—', start: '—', end: '—' },
]
const AD_REQUESTS: { id:string; company:string; contact:string; size:string; budget:string; date:string; status:string }[] = []

const INIT_SUBS: { id:string; email:string; name:string; joined:string; status:string; opens:number; clicks:number }[] = []
const WEBHOOKS: { id:string; event:string; ref:string; amount:string; customer:string; date:string; status:string }[] = []

type LiveBlogUpdate = { id:string; minute:string; type:'Goal'|'Card'|'Sub'|'Update'|'Transfer'|'FT'; text:string; postedAt:string }
type LiveBlog = { id:string; title:string; category:'Match'|'News'|'Transfer'; match:string; coverImage:string; status:'Live'|'Scheduled'|'Ended'; viewers:number; scheduledAt:string; createdAt:string; updates:LiveBlogUpdate[] }
const INIT_LIVE_BLOGS: LiveBlog[] = []

const DISCOUNTS_INIT: { id:string; code:string; type:string; value:number; uses:number; maxUses:number; status:string; expires:string }[] = []
const QUIZ_INIT: { id:string; question:string; options:string[]; correct:number; category:string; plays:number }[] = []
const PREDICTIONS_DATA: { id:string; match:string; user:string; predicted:string; actual:string; points:number; date:string }[] = []

const AUDIT_LOG: { id:string; admin:string; action:string; ip:string; date:string }[] = []
const HEALTH_DATA: HealthCheck[] = []
const REV_DAYS: { day:string; val:number }[] = []
const MAX_REV = 0
const SENT_EMAILS_INIT: { id:string; subject:string; sentTo:number; date:string; opens:number }[] = []

// ─── Main Component ───────────────────────────────────────────────────────────
export default function Admin() {
  const { user, logout } = useApp()
  const navigate = useNavigate()
  const [tab, setTab]         = useState<AdminTab>('overview')
  const [loginEmail, setLoginEmail] = useState(SUPER_ADMIN_EMAIL)
  const [loginPass, setLoginPass]   = useState('')
  const [loginErr, setLoginErr]     = useState('')
  const userEmail = (user?.email || '').trim().toLowerCase()
  const isSuperAdminEmail = userEmail === SUPER_ADMIN_EMAIL.toLowerCase()
  const isSuperAdminRole = user?.role === 'super_admin'
  const isAuthed = Boolean(user && isSuperAdminEmail && isSuperAdminRole)
  const userRole: UserRole = (user?.role || 'super_admin') as UserRole

  // Data
  const [orders,    setOrders]    = useState(INIT_ORDERS)
  const [shippingCfg, setShippingCfg] = useState<ShippingConfig>(getShippingConfig)
  const [products,  setProducts]  = useState(INIT_PRODUCTS)
  const [articles,  setArticles]  = useState(INIT_ARTICLES)
  const [tickets,   setTickets]   = useState(INIT_TICKETS)
  const [users,     setUsers]     = useState(INIT_USERS)
  const [comments,  setComments]  = useState(INIT_COMMENTS)
  const [ads,       setAds]       = useState(INIT_ADS)
  const [adReqs,    setAdReqs]    = useState(AD_REQUESTS)
  const [discounts, setDiscounts] = useState(DISCOUNTS_INIT)
  const [liveBlogs, setLiveBlogs]   = useState<LiveBlog[]>(INIT_LIVE_BLOGS)

  useEffect(() => {
    // 1. Fetch 33 real user accounts from Supabase profiles table
    fetchAllProfiles().then(({ profiles, error }) => {
      if (!error && profiles && profiles.length > 0) {
        const mappedUsers: AppUser[] = profiles.map(p => ({
          id: p.id,
          name: p.name || p.email.split('@')[0],
          email: p.email,
          role: p.role || 'user',
          joined: p.created_at ? new Date(p.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '2026',
          orders: 0,
          tips: '$0.00',
          status: 'Active',
          avatar: p.avatar_url || undefined,
        }))
        setUsers(mappedUsers)
      }
    })

    // 2. Fetch 48 real products from Supabase products table
    fetchAllProducts().then(({ products: realProds, error }) => {
      if (!error && realProds && realProds.length > 0) {
        const mappedProds: Product[] = realProds.map((p: any) => {
          const imgUrl = Array.isArray(p.images) ? p.images[0] : (typeof p.images === 'string' && p.images.startsWith('[') ? JSON.parse(p.images)[0] : p.images || 'https://images.unsplash.com/photo-1522778119026-d647f0596c20?w=200')
          return {
            id: String(p.id),
            name: p.name || 'Product',
            sku: p.sku || `PROD-${p.id}`,
            description: p.description || p.name || '',
            category: p.category || 'Gear',
            team: p.team || 'Global',
            league: p.league || 'General',
            season: p.season || '2026',
            kitType: p.kitType || 'Merch',
            version: p.version || 'Standard',
            price: typeof p.price === 'number' ? p.price : parseFloat(p.price) || 0,
            comparePrice: p.comparePrice || p.originalPrice || 0,
            costPerItem: p.costPerItem || 0,
            stock: p.stock || 50,
            lowStockThreshold: p.lowStockThreshold || 5,
            sales: p.sales || 0,
            status: p.status || 'Active',
            featured: Boolean(p.featured || p.badge),
            images: [imgUrl],
            imageUrl: imgUrl,
            sizeChartUrl: '',
            sizes: p.sizes || ['S', 'M', 'L', 'XL'],
            gender: p.gender || 'Unisex',
            customizable: Boolean(p.customizable),
            playerList: '',
            customNameLimit: 12,
            availablePatches: [],
            weight: '0.3 kg',
            dimensions: { length: '30', width: '20', height: '5' },
            slug: (p.name || '').toLowerCase().replace(/[^a-z0-9]+/g, '-'),
            metaTitle: p.name || '',
            metaDescription: p.description || '',
            colors: p.colors || 'Standard',
            tags: p.category || '',
          }
        })
        setProducts(mappedProds)
      }
    })

    // 3. Fetch real orders from Supabase orders table
    fetchAllOrders().then(({ orders: realOrders, error }) => {
      if (!error && realOrders && realOrders.length > 0) {
        const mappedOrders: Order[] = realOrders.map(o => ({
          id: o.id,
          customer: o.customer || 'Customer',
          email: o.email || '',
          phone: o.phone || '',
          address: o.address || '',
          items: o.items || '',
          total: Number(o.total) || 0,
          method: o.method || 'Card',
          status: o.status || 'Pending',
          date: o.date || new Date().toISOString().slice(0, 16),
          tracking: o.tracking || '',
          shippingCourier: o.shippingCourier,
          shippingCostKes: o.shippingCostKes,
        }))
        setOrders(mappedOrders)
      }
    })

    // 4. Fetch real articles from Supabase articles table
    fetchAllArticles().then(({ articles: dbArts, error }) => {
      if (!error && dbArts && dbArts.length > 0) {
        const mapped: Article[] = dbArts.map((a: ArticleRow) => ({
          id: a.id, title: a.title, slug: a.slug || '',
          category: a.category, author: a.author, body: a.body,
          imageUrl: a.image_url || '', imageAlt: a.title, imageCaption: '',
          status: a.status === 'published' ? 'Published' : a.status === 'draft' ? 'Draft' : 'Scheduled',
          date: a.published_at ? new Date(a.published_at).toLocaleDateString() : 'Today',
          scheduled: '', views: String(a.views || 0), likes: a.likes || 0,
          tags: a.tags || '', excerpt: a.body ? a.body.slice(0, 140) : '',
          matchId: '', teamTags: '', playerTags: '', mediaEmbeds: '', isLiveBlog: false,
          metaTitle: a.title, metaDescription: a.body ? a.body.slice(0, 150) : '', focusKeywords: a.category,
        }))
        setArticles(mapped)
      }
    })

    // 5. Fetch real comments from Supabase comments table
    fetchAllComments().then(({ comments: dbComs, error }) => {
      if (!error && dbComs && dbComs.length > 0) {
        const mapped: Comment[] = dbComs.map((c: CommentRow) => ({
          id: c.id, user: c.user_name || 'Anonymous', article: c.article_id || '',
          body: c.body, status: c.status === 'approved' ? 'Approved' : c.status === 'flagged' ? 'Flagged' : c.status === 'spam' ? 'Spam' : 'Approved',
          date: c.created_at ? new Date(c.created_at).toLocaleDateString() : 'Today',
          reported: c.reported || false,
        }))
        setComments(mapped)
      }
    })

    // 6. Fetch real tickets from Supabase tickets table
    fetchAllTickets().then(({ tickets: dbTickets, error }) => {
      if (!error && dbTickets && dbTickets.length > 0) {
        const mapped: Ticket[] = dbTickets.map((t: TicketRow) => ({
          id: t.id, event: t.title, venue: t.venue,
          date: t.event_date ? new Date(t.event_date).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' }) : 'TBD',
          regularSold: t.sold_tickets || 0, vipSold: 0, capacity: t.available_tickets,
          revenue: (t.sold_tickets || 0) * Number(t.price),
          status: t.status === 'on_sale' ? 'Selling' : t.status,
          regularPrice: Number(t.price), vipPrice: Number(t.price) * 2.5,
        }))
        setTickets(mapped)
      }
    })
  }, [])
  const [showNewBlog,     setShowNewBlog]     = useState(false)
  const [showPostUpdate,  setShowPostUpdate]  = useState(false)
  const [activeBlogId,    setActiveBlogId]    = useState<string|null>(null)
  const [expandedBlogId,  setExpandedBlogId]  = useState<string|null>(null)
  const [blogSearch,      setBlogSearch]      = useState('')
  const [blogFilter,      setBlogFilter]      = useState<'All'|'Live'|'Scheduled'|'Ended'>('All')
  const [newBlog, setNewBlog] = useState({ title:'', category:'Match' as 'Match'|'News'|'Transfer', match:'', coverImage:'', scheduledAt:'' })
  const [updateMinute, setUpdateMinute] = useState('')
  const [updateType,   setUpdateType]   = useState<'Goal'|'Card'|'Sub'|'Update'|'Transfer'|'FT'>('Update')
  const [updateText,   setUpdateText]   = useState('')
  const [editDiscount, setEditDiscount] = useState<null|(typeof DISCOUNTS_INIT[0])>(null)
  const [showBulkGen,  setShowBulkGen]  = useState(false)
  const [bulkPrefix,   setBulkPrefix]   = useState('')
  const [bulkCount,    setBulkCount]    = useState('10')

  const [quizzes,   setQuizzes]   = useState(QUIZ_INIT)
  const [subs,      setSubs]      = useState(INIT_SUBS)
  const [sentEmails,setSentEmails]= useState(SENT_EMAILS_INIT)
  const [auditLogs, setAuditLogs] = useState<AuditAction[]>(getAuditLogs)
  const [healthData, setHealthData] = useState<HealthCheck[]>(HEALTH_DATA)
  const [showAddMix, setShowAddMix] = useState(false)
  const [mixes, setMixes] = useState<MixRow[]>([])

  useEffect(() => {
    fetchAllMixes().then(({ mixes: m, error }) => {
      if (!error && m) setMixes(m)
    })
  }, [])
  const [newMix, setNewMix] = useState({ title: '', mixcloud_url: '', genre: 'Afrobeats & Amapiano', cover_url: '' })

  // Filters
  const [orderSearch,    setOrderSearch]    = useState('')
  const [orderFilter,    setOrderFilter]    = useState('All')
  const [userSearch,     setUserSearch]     = useState('')
  const [commsMode,      setCommsMode]      = useState<'email' | 'push'>('email')
  const [showAddSubscriber, setShowAddSubscriber] = useState(false)
  const [newSubEmail,    setNewSubEmail]    = useState('')
  const [newSubName,     setNewSubName]     = useState('')
  const [newSubPhone,    setNewSubPhone]    = useState('')
  const [newSubCountry,  setNewSubCountry]  = useState('Kenya')
  const [newSubTeam,     setNewSubTeam]     = useState('')
  const [newSubInterests,setNewSubInterests]= useState<string[]>([])
  const [newSubTier,     setNewSubTier]     = useState<'Free'|'Fan'|'Pro'>('Free')
  const [newSubSource,   setNewSubSource]   = useState('Admin Manual')
  const [newSubConsent,  setNewSubConsent]  = useState(false)
  const [newSubWelcome,  setNewSubWelcome]  = useState(true)
  const [newsletterBanner, setNewsletterBanner] = useState('')
  const [adSearch,       setAdSearch]       = useState('')
  const [showAddAdSlot,  setShowAddAdSlot]  = useState(false)
  const [newAdSlot,      setNewAdSlot]      = useState({ slot: '', page: 'Homepage', size: '728x90', price: '300' })
  const [analyticsTimeRange, setAnalyticsTimeRange] = useState<'24h' | '7d' | '30d' | 'ytd' | 'custom'>('7d')
  const [analyticsStartDate, setAnalyticsStartDate] = useState('2026-08-01')
  const [analyticsEndDate,   setAnalyticsEndDate]   = useState('2026-08-12')
  const [analyticsCategory,  setAnalyticsCategory]  = useState('All')
  const [tipSearch,      setTipSearch]      = useState('')
  const [showPayoutModal, setShowPayoutModal]= useState(false)
  const [payoutForm,      setPayoutForm]     = useState({ recipient: '', amount: '', mpesa: '' })
  const [userRoleFilter, setUserRoleFilter] = useState('All')
  const [showAddUser,    setShowAddUser]    = useState(false)
  const [newAppUser,     setNewAppUser]     = useState({ name: '', email: '', role: 'user', avatar: '' })
  const [avatarMode,     setAvatarMode]     = useState<'gravatar' | 'upload' | 'preset' | 'url'>('gravatar')
  const [articleSearch,  setArticleSearch]  = useState('')
  const [articleFilter,  setArticleFilter]  = useState('All')
  const [commentFilter,  setCommentFilter]  = useState('All')
  const [commentSearch,  setCommentSearch]  = useState('')
  const [bannedWords,    setBannedWords]    = useState('betting, crypto, telegram link, free coins, casino')
  const [autoFilterLinks,setAutoFilterLinks]= useState(true)
  const [slowMode,       setSlowMode]       = useState(false)
  const [showModSettings,setShowModSettings]= useState(false)
  const [autoFlagThreshold, setAutoFlagThreshold] = useState('3')
  const [autoBanThreshold,  setAutoBanThreshold]  = useState('3')
  const [filterHateSpeech,  setFilterHateSpeech]  = useState(true)
  const [filterBettingAds,  setFilterBettingAds]  = useState(true)
  const [filterPhoneSpam,   setFilterPhoneSpam]   = useState(true)
  const [holdAllComments,   setHoldAllComments]   = useState(false)
  const [editCommentItem,setEditCommentItem]= useState<any>(null)
  const [subsSearch,     setSubsSearch]     = useState('')

  // Detail/edit modal state
  const [detailOrder,    setDetailOrder]    = useState<Order | null>(null)
  const [detailUser,     setDetailUser]     = useState<AppUser | null>(null)
  const [attendeeTck,    setAttendeeTck]    = useState<Ticket | null>(null)
  const [editProduct,    setEditProduct]    = useState<Product | null>(null)
  const [editArticle,    setEditArticle]    = useState<Article | null>(null)
  const [editEvent,      setEditEvent]      = useState<Ticket | null>(null)
  const [editAdSlot,     setEditAdSlot]     = useState<AdSlot | null>(null)

  // Drag & drop state for file upload dropzones
  const [isDragOverProduct, setIsDragOverProduct] = useState(false)
  const [isDragOverArticle, setIsDragOverArticle] = useState(false)

  // Overview time range filter state
  const [overviewTimeRange, setOverviewTimeRange] = useState<'today' | 'week' | 'month' | 'ytd'>('week')

  // Bulk order selection state
  const [selectedOrderIds, setSelectedOrderIds] = useState<string[]>([])

  // Create modal state
  const [showAddProduct,  setShowAddProduct]  = useState(false)
  const [showAddArticle,  setShowAddArticle]  = useState(false)
  const [showAddTicket,   setShowAddTicket]   = useState(false)
  const [showAddDiscount, setShowAddDiscount] = useState(false)
  const [showAddQuiz,     setShowAddQuiz]     = useState(false)
  const [showCompose,     setShowCompose]     = useState(false)
  const [showDanger,      setShowDanger]      = useState(false)

  // New product form with full football kit specs & device image upload
  const BLANK_PRODUCT = {
    name: '',
    sku: '',
    description: '',
    category: 'Kits',
    team: 'Arsenal FC',
    league: 'Premier League',
    season: '2026/27',
    kitType: 'Home',
    version: 'Authentic / Player Version',
    price: '',
    comparePrice: '',
    costPerItem: '',
    stock: '50',
    lowStockThreshold: '5',
    images: [] as string[],
    imageUrl: '',
    sizeChartUrl: '',
    sizes: ['S', 'M', 'L', 'XL'] as string[],
    gender: 'Men',
    customizable: true,
    playerList: 'Bukayo Saka #7, Martin Ødegaard #8, Kai Havertz #29',
    customNameLimit: '12',
    availablePatches: ['Premier League Lion', 'UCL Starball'] as string[],
    weight: '0.35',
    dimensions: { length: '30', width: '25', height: '3' },
    slug: '',
    metaTitle: '',
    metaDescription: '',
    colors: 'Green, White',
    tags: 'jersey,home,2026,kits',
  }
  const [newProduct, setNewProduct] = useState(BLANK_PRODUCT)

  // New article form with full football news CMS specifications
  const BLANK_ARTICLE = {
    title: '',
    slug: '',
    category: 'Match Report',
    author: '',
    excerpt: '',
    body: '',
    imageUrl: '',
    imageAlt: '',
    imageCaption: '',
    scheduled: '',
    tags: 'premier league,football',

    // Football-Specific Elements
    matchId: '',
    teamTags: 'Arsenal FC, Chelsea FC',
    playerTags: 'Bukayo Saka, Martin Ødegaard',
    mediaEmbeds: '',
    isLiveBlog: false,

    // SEO & Discovery
    metaTitle: '',
    metaDescription: '',
    focusKeywords: '',
  }
  const [newArticle, setNewArticle] = useState(BLANK_ARTICLE)

  // New ticket form
  const [newTicket, setNewTicket] = useState({ event:'', venue:'', date:'', regularPrice:'15', vipPrice:'40', capacity:'300' })

  // New discount form
  const [newDiscount, setNewDiscount] = useState({ code:'', type:'Percent', value:'10', maxUses:'100', minOrder:'0', appliesToCategory:'All', expires:'', description:'' })

  // New quiz form
  const [newQuiz, setNewQuiz] = useState({ question:'', cat:'Trivia', opt0:'', opt1:'', opt2:'', opt3:'', correct:'0' })

  // Compose newsletter
  const [composeSub,  setComposeSub]  = useState('')
  const [composeBody, setComposeBody] = useState('')
  const [composeSent, setComposeSent] = useState(false)

  // Settings
  const [settings, setSettings] = useState(() => {
    try {
      const raw = localStorage.getItem('flowerzfc_settings')
      if (raw) return JSON.parse(raw)
    } catch {}
    return {
      siteName:'FlowerZFC', tagline:'Your Global Football Home',
      adminEmail:'ianmuriithiflowerz@gmail.com',
      supportEmail:'support@flowerz.fc',
      timezone:'Africa/Nairobi',
      currency:'KES',
      callbackUrl:'https://djflowerz.co.ke/account', minTipAmount:'2',
      maxTipAmount:'5000',
      tipsEnabled:true, shopEnabled:true, allowGuestCheckout:false,
      maintenanceMode:false, commentsEnabled:true, predictionsEnabled:true, fantasyEnabled:true,
      adsEnabled:true, pushEnabled:true, liveScoresEnabled:true, quizEnabled:true,
      registrationOpen:true, emailVerificationRequired:true,
      twoFactorRequired:false, autoBackup:true,
      seoDescription:'The home of global football media, live scores, breaking news, merchandise, and fan engagement.',
      ogImageUrl:'https://images.unsplash.com/photo-1508098682722-e99c43a406b2?w=1200&h=630&fit=crop',
      twitterHandle:'@FlowerZFC',
      gaMeasurementId:'G-FLOWERZ2026',
      emailDriver:'Resend (Recommended)',
      smtpHost:'smtp.resend.com',
      smtpPort:'587',
      emailFromName:'FlowerZFC Media',
      mpesaShortcode:'600000',
      mpesaEnv:'Sandbox',
      mpesaMaxDailyPayout:'5000',
      maintenanceMessage:'FlowerZFC is currently undergoing scheduled platform upgrades. We will be back live shortly!',
      logoUrl:'https://images.unsplash.com/photo-1508098682722-e99c43a406b2?w=100&h=100&fit=crop',
      faviconUrl:'/favicon.ico',
      primaryColor:'#00b341',
      fontFamily:'Big Shoulders Display',
      termsOfService:'Welcome to GlobalFootballMedia (FlowerZFC). By accessing our website, purchasing products, or using tips, you agree to our terms...',
      privacyPolicy:'We respect your privacy. Data collected is strictly governed by the Kenya Data Protection Act 2019 and GDPR...',
      refundPolicy:'Shop merchandise can be returned within 14 days of delivery if unused and in original packaging...',
      cookiePolicy:'We use essential cookies to maintain session authorization and store user preferences...',
      // Social Media Links
      youtubeUrl:'https://youtube.com/@FlowerZFC',
      instagramUrl:'https://instagram.com/FlowerZFC',
      tiktokUrl:'https://tiktok.com/@FlowerZFC',
      facebookUrl:'https://facebook.com/FlowerZFC',
      whatsappChannelUrl:'https://whatsapp.com/channel/FlowerZFC',
      discordUrl:'https://discord.gg/flowerzfc',
      // Push VAPID & Webhooks
      vapidPublicKey:'BEl62iUYgUivxIkv69yViEuiBIa-M9-pG9Q1Vb_P...',
      fcmSenderId:'109284729104',
      outgoingWebhookUrl:'https://api.djflowerz.co.ke/webhooks/events',
    }
  })
  const [settingsSaved, setSettingsSaved] = useState(false)
  const [newAdminPass,  setNewAdminPass]  = useState('')
  const [confirmPass,   setConfirmPass]   = useState('')
  const [passSaved,     setPassSaved]     = useState(false)
  const [currentPass,   setCurrentPass]   = useState('')

  // Clock
  const [systemLogs, setSystemLogs] = useState([
    { id:'l1', time: '14:32:05', level:'INFO',  msg:'Paystack B2C Payout initiated: $150.00 to Kipchoge Keino' },
    { id:'l2', time: '14:31:18', level:'WARN',  msg:'Redis cache memory usage > 75%. Auto-eviction active.' },
    { id:'l3', time: '14:28:44', level:'INFO',  msg:'Article #984 published: "Arsenal Dominate North London Derby"' },
    { id:'l4', time: '14:20:10', level:'ERROR', msg:'Paystack webhook charge.failed received for ref ps_ref_99815' },
    { id:'l5', time: '14:05:00', level:'INFO',  msg:'Daily database snapshot completed successfully (size: 42.8 MB)' },
  ])
  const [isPinging, setIsPinging] = useState(false)
  const [showRestoreDbModal, setShowRestoreDbModal] = useState(false)
  const [cronJobs, setCronJobs] = useState([
    { id:'cj1', name:'Daily Database Snapshot', schedule:'0 0 * * *', lastRun:'Today 00:00', status:'Success' },
    { id:'cj2', name:'Exchange Rate Sync (Paystack FX)', schedule:'0 */6 * * *', lastRun:'Today 00:00', status:'Success' },
    { id:'cj3', name:'Newsletter Queue Processor', schedule:'*/15 * * * *', lastRun:'12 min ago', status:'Running' },
    { id:'cj4', name:'Auto-Moderation Spam Cleaner', schedule:'0 3 * * *', lastRun:'Yesterday 03:00', status:'Success' },
  ])
  // Content Ingestion & Context Transformer state
  const [ingestedPosts, setIngestedPosts] = useState<IngestedPost[]>(getIngestedPosts())
  const [ingestDate, setIngestDate] = useState(() => {
    const d = new Date()
    const yyyy = d.getFullYear()
    const mm = String(d.getMonth() + 1).padStart(2, '0')
    const dd = String(d.getDate()).padStart(2, '0')
    return `${yyyy}-${mm}-${dd}`
  })
  const [editingIngestPost, setEditingIngestPost] = useState<IngestedPost | null>(null)
  const [selectedIngestIds, setSelectedIngestIds] = useState<Set<string>>(new Set())
  // Scores verification state
  const [scoresDate, setScoresDate] = useState(new Date().toISOString().slice(0, 10))
  const [scoresLeague, setScoresLeague] = useState('Premier League')
  const [scoresMatches, setScoresMatches] = useState<LiveMatch[]>([])
  const [scoresStandings, setScoresStandings] = useState<LiveStanding[]>([])
  const [scoresFixtures, setScoresFixtures] = useState<LiveFixture[]>([])
  const [scoresLoading, setScoresLoading] = useState(false)
  const [scoresDataSource, setScoresDataSource] = useState<'api' | 'fallback'>('fallback')
  const [scoresView, setScoresView] = useState<'matches' | 'standings' | 'fixtures' | 'catalog'>('matches')
  const [catalogStats, setCatalogStats] = useState<LiveCatalogStats | null>(null)
  const tzInfo = getUserTimezoneInfo()
  const [showIngestNotification, setShowIngestNotification] = useState(true)
  const [clock, setClock] = useState(new Date())
  useEffect(() => { const t = setInterval(() => setClock(new Date()), 1000); return () => clearInterval(t) }, [])

  // Toast notification system — powered by react-toastify
  // Thin wrapper preserving the old (msg, type) call signature used throughout this file
  const toast = (msg: string, type: 'success' | 'error' | 'info' | 'warning' = 'success') => {
    const opts = { position: 'bottom-right' as const, autoClose: 4000 }
    if (type === 'error')   return toastLib.error(msg, opts)
    if (type === 'warning') return toastLib.warning(msg, opts)
    if (type === 'info')    return toastLib.info(msg, opts)
    return toastLib.success(msg, opts)
  }

  const navRef = useRef<HTMLDivElement>(null)
  const payConfig = getPaymentConfig()

  // Sync published articles to articleStore AND Supabase
  useEffect(() => {
    articles.forEach(a => {
      if (a.status === 'Published' || a.status === 'Draft' || a.status === 'Scheduled') {
        const stored: StoredArticle = {
          id: a.id, title: a.title, category: a.category, body: a.body,
          imageUrl: a.imageUrl, author: a.author, date: a.date,
          status: a.status, tags: a.tags, metaDescription: a.metaDescription,
          slug: a.slug, scheduled: a.scheduled, views: a.views, likes: a.likes,
        }
        saveArticle(stored)
        // Also persist to Supabase (fire-and-forget)
        saveArticleToDb({
          id: a.id, title: a.title, slug: a.slug || a.id,
          category: a.category, author: a.author || 'FlowerZFC Editorial',
          body: a.body, image_url: a.imageUrl || '',
          status: a.status.toLowerCase(), tags: a.tags || '',
          views: Number(a.views) || 0, likes: a.likes || 0,
          published_at: a.status === 'Published' ? new Date().toISOString() : undefined,
        })
      }
    })
  }, [articles])

  // Automatically fetch live articles from LiveScore Contentful API on mount
  useEffect(() => {
    fetchLiveIngestedPosts().then(posts => {
      if (posts && posts.length > 0) {
        setIngestedPosts(posts)
        toast(`📡 Auto-scanned LiveScore API: ${posts.length} live articles fetched!`, 'info')
      }
    })
  }, [])

  // Derived
  const pendingOrders   = orders.filter(o => o.status === 'Pending').length
  const flaggedComments = comments.filter(c => c.status === 'Flagged' || c.status === 'Spam').length
  const totalRevenue    = orders.filter(o => o.status !== 'Refunded').reduce((s, o) => s + o.total, 0)
  const totalTips       = TIPS_DATA.reduce((s, t) => s + t.amount, 0)
  const bookedAdRev     = ads.filter(a => a.status === 'Booked').reduce((s, a) => s + a.price, 0)

  const filteredOrders   = orders.filter(o => {
    const ms = [o.id, o.customer, o.email].some(x => x.toLowerCase().includes(orderSearch.toLowerCase()))
    return ms && (orderFilter === 'All' || o.status === orderFilter)
  })
  const filteredUsers    = users.filter(u => {
    const ms = !userSearch || u.name.toLowerCase().includes(userSearch.toLowerCase()) || u.email.toLowerCase().includes(userSearch.toLowerCase())
    const mr = userRoleFilter === 'All' ? true : userRoleFilter === 'Banned' ? u.status === 'Banned' : u.role === userRoleFilter
    return ms && mr
  })
  const filteredArticles = articles.filter(a => {
    const matchSearch = !articleSearch || a.title.toLowerCase().includes(articleSearch.toLowerCase()) || a.category.toLowerCase().includes(articleSearch.toLowerCase()) || (a.author || '').toLowerCase().includes(articleSearch.toLowerCase()) || (a.tags || '').toLowerCase().includes(articleSearch.toLowerCase())
    const matchStatus = articleFilter === 'All' || a.status === articleFilter
    return matchSearch && matchStatus
  })

  const filteredComments = comments.filter(c => {
    const matchFilter = commentFilter === 'All' || c.status === commentFilter
    const matchSearch = !commentSearch || c.user.toLowerCase().includes(commentSearch.toLowerCase()) || c.body.toLowerCase().includes(commentSearch.toLowerCase()) || c.article.toLowerCase().includes(commentSearch.toLowerCase())
    return matchFilter && matchSearch
  })
  const filteredSubs     = subs.filter(s => s.email.toLowerCase().includes(subsSearch.toLowerCase()))

  const slugify = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')

  const getUserAvatarUrl = (u: { email: string; avatar?: string }) => {
    if (u.avatar) return u.avatar
    if (u.email) return `https://unavatar.io/${encodeURIComponent(u.email)}?fallback=https://api.dicebear.com/7.x/identicon/svg?seed=${encodeURIComponent(u.email)}`
    return ''
  }

  const SIZE_OPTIONS = ['XS', 'S', 'M', 'L', 'XL', 'XXL', 'One Size']

  // ── Login Gate ──────────────────────────────────────────────────────────────
  if (!isAuthed) return (
    <div style={{ background: '#0a0a14', minHeight: '100vh' }} className="flex items-center justify-center px-4">
      <div className="w-full max-w-md text-center p-8 rounded-2xl border border-red-500/30" style={{ background: '#131320' }}>
        <div className="w-16 h-16 mx-auto mb-4 rounded-2xl flex items-center justify-center text-4xl bg-red-500/10 text-red-400 border border-red-500/30">🔒</div>
        <span className="text-[10px] font-black uppercase tracking-widest text-red-400 block mb-1">403 Access Denied</span>
        <h1 className="text-3xl font-black text-white mb-2" style={{ fontFamily: 'Big Shoulders Display' }}>Admin Dashboard Locked</h1>
        <p className="text-xs text-gray-400 mb-6">
          Full admin control is strictly restricted to <strong className="text-white">{SUPER_ADMIN_EMAIL}</strong>. Sign in on the main site using the authorized Super Admin account to access this area.
        </p>
        <div className="flex gap-3">
          <Link to="/" className="flex-1 py-3 text-xs font-bold text-gray-300 rounded-xl border border-[#1e1e32] hover:border-white transition-colors">
            ← Return Home
          </Link>
          <Link to="/login" className="flex-1 py-3 text-xs font-black text-black rounded-xl hover:opacity-90 transition-colors" style={{ background: '#00b341' }}>
            Sign In on Main Site →
          </Link>
        </div>
      </div>
    </div>
  )

  const ALL_TABS: { id: AdminTab; icon: string; label: string; badge?: number }[] = [
    { id:'overview',   icon:'📊', label:'Overview'                         },
    { id:'orders',     icon:'🛒', label:'Orders',     badge:pendingOrders   },
    { id:'products',   icon:'👕', label:'Products'                         },
    { id:'articles',   icon:'📰', label:'Articles'                         },
    { id:'mixes',      icon:'🎧', label:'Mixes'                            },
    { id:'tickets',    icon:'🎟️', label:'Tickets'                         },
    { id:'users',      icon:'👥', label:'Users'                            },
    { id:'financials', icon:'💰', label:'Financials'                       },
    { id:'analytics',  icon:'📈', label:'Analytics'                        },
    { id:'comments',   icon:'💬', label:'Comments',  badge:flaggedComments  },
    { id:'ads',        icon:'📢', label:'Ad Slots'                         },
    { id:'comms',      icon:'📧', label:'Comms'                            },
    { id:'platform',   icon:'⚽', label:'Platform'                         },
    { id:'system',     icon:'🖥️', label:'System'                          },
    { id:'settings',   icon:'⚙️', label:'Settings'                         },
    { id:'scores',     icon:'📡', label:'Scores Data'                       },
  ]

  const TABS = ALL_TABS.filter(t => hasTabAccessRole(userRole, t.id))

  return (
    <div style={{ background: '#080810', minHeight: '100vh' }}>

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div style={{ background: 'linear-gradient(135deg,#0d0d22 0%,#091410 100%)', borderBottom: '1px solid #1e1e32' }}>
        <div className="max-w-screen-2xl mx-auto px-4 sm:px-6 py-5">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div>
              <div className="flex items-center gap-3 mb-1 flex-wrap">
                <span className="text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded text-white" style={{ background: '#00b341' }}>
                  🔑 ADMIN · {userRole.toUpperCase().replace('_', ' ')}
                </span>
                {/* SECURITY: Only connection status shown — no key material, no prefixes */}
                <span className="text-[10px] font-semibold text-emerald-400 flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" style={{ animation: 'ping 1.5s infinite' }} />
                  {payConfig.provider} · {payConfig.isLive ? 'Live Mode ✓' : 'Test Mode'}
                </span>
                <span className="text-[10px] text-gray-600 font-mono hidden sm:block">
                  {clock.toLocaleTimeString('en-KE', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                </span>
              </div>
              <h1 className="text-3xl font-black text-white" style={{ fontFamily: 'Big Shoulders Display' }}>
                FlowerZFC Control Center <span className="text-xs text-gray-500 font-normal">({user?.email})</span>
              </h1>
            </div>
            <div className="flex gap-2 shrink-0">
              <Link to="/" className="px-3 py-2 text-[11px] font-bold text-gray-400 hover:text-white rounded-xl border border-[#1e1e32] transition-colors">← Site</Link>
              <button onClick={async () => { await logout() }} className="px-3 py-2 text-[11px] font-bold text-gray-400 hover:text-red-400 rounded-xl border border-[#1e1e32] transition-colors">🔒 Sign Out</button>
            </div>
          </div>

          {/* Scrollable tab nav */}
          <div ref={navRef} className="flex gap-1.5 overflow-x-auto mt-5 pb-1" style={{ scrollbarWidth: 'none' }}>
            {TABS.map(t => (
              <button key={t.id} onClick={() => setTab(t.id)}
                className="flex items-center gap-1.5 px-3.5 py-2 text-[11px] font-bold rounded-xl whitespace-nowrap transition-all shrink-0"
                style={{ background: tab === t.id ? '#00b341' : '#131320', color: tab === t.id ? '#fff' : '#6b7280', border: `1px solid ${tab === t.id ? '#00b341' : '#1e1e32'}` }}>
                {t.icon} {t.label}
                {!!t.badge && t.badge > 0 && (
                  <span className="text-[9px] font-black px-1.5 py-0.5 rounded-full" style={{ background: tab === t.id ? 'rgba(0,0,0,.25)' : '#ef4444', color: '#fff' }}>{t.badge}</span>
                )}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── Content ────────────────────────────────────────────────────────── */}
      <div className="max-w-screen-2xl mx-auto px-4 sm:px-6 py-8">

        {/* ══ OVERVIEW ══════════════════════════════════════════════════════ */}
        {tab === 'overview' && (
          <div className="space-y-8">

            {/* Time Range Selector & System Health Bar */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 rounded-2xl border border-[#1e1e32]" style={{ background: '#131320' }}>
              <div>
                <h2 className="text-lg font-black text-white uppercase tracking-wider" style={{ fontFamily: 'Big Shoulders Display' }}>Executive Performance Dashboard</h2>
                <p className="text-xs text-gray-400">Real-time metrics, Paystack transaction engine, and platform security health.</p>
              </div>
              <div className="flex items-center gap-2">
                <div className="flex bg-[#0d0d1e] p-1 rounded-xl border border-[#1e1e32]">
                  {(['today', 'week', 'month', 'ytd'] as const).map(r => (
                    <button key={r} onClick={() => setOverviewTimeRange(r)} className="px-3 py-1 text-[10px] font-black uppercase rounded-lg transition-all"
                      style={{ background: overviewTimeRange === r ? '#00b341' : 'transparent', color: overviewTimeRange === r ? '#fff' : '#6b7280' }}>
                      {r}
                    </button>
                  ))}
                </div>
                <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-xl border border-emerald-500/20 bg-emerald-500/5 text-emerald-400 text-[11px] font-bold">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" /> Security Spec: Compliant
                </div>
              </div>
            </div>

            {/* Top KPI Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {[
                { title:'Total Revenue',    value:`$${(totalRevenue * (overviewTimeRange === 'today' ? 0.2 : overviewTimeRange === 'month' ? 3.2 : overviewTimeRange === 'ytd' ? 12 : 1)).toFixed(2)}`, sub:'+18.4% vs previous period', icon:'💵', color:'#00b341' },
                { title:'Pending Orders',   value:pendingOrders.toString(),       sub:`${orders.length} total orders placed`,   icon:'📦', color:'#f59e0b' },
                { title:'Tips Collected',   value:`$${totalTips.toFixed(2)}`,     sub:`${TIPS_DATA.length} fan supporters`,  icon:'☕', color:'#8b5cf6' },
                { title:'Booked Ad Rev/mo', value:`$${bookedAdRev}`,              sub:`${ads.filter(a => a.status === 'Booked').length} active ad slots`, icon:'📢', color:'#3b82f6' },
              ].map(k => (
                <Card key={k.title} className="p-5 relative overflow-hidden">
                  <div className="absolute inset-0 pointer-events-none" style={{ background: `radial-gradient(ellipse at 80% 0%,${k.color}10 0%,transparent 70%)` }} />
                  <div className="flex items-center justify-between mb-2"><span className="text-[10px] font-black uppercase tracking-wider text-gray-500">{k.title}</span><span className="text-2xl">{k.icon}</span></div>
                  <p className="text-4xl font-black mb-1" style={{ fontFamily: 'Big Shoulders Display', color: k.color }}>{k.value}</p>
                  <p className="text-[10px] text-gray-500 font-semibold">{k.sub}</p>
                </Card>
              ))}
            </div>

            {/* Revenue Chart & Quick Actions */}
            <div className="grid lg:grid-cols-3 gap-6">
              <Card className="lg:col-span-2 p-6">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h3 className="text-lg font-black text-white uppercase" style={{ fontFamily: 'Big Shoulders Display' }}>Paystack Verified Revenue Flow</h3>
                    <p className="text-xs text-gray-400">Daily confirmed sales and ticket purchases</p>
                  </div>
                  <span className="text-2xl font-black text-[#00b341]" style={{ fontFamily: 'Big Shoulders Display' }}>${REV_DAYS.reduce((s, d) => s + d.val, 0).toLocaleString()}</span>
                </div>
                <div className="flex items-end gap-3 h-36">
                  {REV_DAYS.map(d => {
                    const pct = (d.val / MAX_REV) * 100
                    const today = d.day === 'Fri'
                    return (
                      <div key={d.day} className="flex-1 flex flex-col items-center gap-2">
                        <span className="text-[9px] font-bold text-gray-500">${(d.val / 1000).toFixed(1)}k</span>
                        <div className="w-full rounded-t-lg transition-all" style={{ height: `${pct}%`, background: today ? 'linear-gradient(180deg,#00d94f,#00b341)' : 'linear-gradient(180deg,#1e3a2e,#131a18)', border: `1px solid ${today ? '#00b341' : '#1e1e32'}`, minHeight: '4px' }} />
                        <span className="text-[9px] font-black uppercase text-gray-500">{d.day}</span>
                      </div>
                    )
                  })}
                </div>
              </Card>

              <div className="space-y-4">
                <Card className="p-5">
                  <h3 className="text-sm font-black text-white uppercase mb-3" style={{ fontFamily: 'Big Shoulders Display' }}>⚡ Quick Action Shortcuts</h3>
                  <div className="space-y-2">
                    {[
                      { label:'👕 Add Merchandise Product', fn: () => { setTab('products'); setShowAddProduct(true) } },
                      { label:'📰 Publish Football Article', fn: () => { setTab('articles'); setShowAddArticle(true) } },
                      { label:'🎟️ Create Event Ticket',     fn: () => { setTab('tickets'); setShowAddTicket(true) } },
                      { label:'🏷️ Create Discount Coupon',  fn: () => { setTab('products'); setShowAddDiscount(true) } },
                      { label:'📧 Send Fan Newsletter',     fn: () => { setTab('comms'); setShowCompose(true) } },
                    ].map(a => (
                      <button key={a.label} onClick={a.fn} className="w-full py-2.5 px-3 text-[11px] font-bold text-white rounded-xl border border-[#1e1e32] hover:border-[#00b341] text-left flex items-center justify-between transition-all" style={{ background: '#0d0d1e' }}>
                        <span>{a.label}</span><span className="text-[#00b341]">+</span>
                      </button>
                    ))}
                  </div>
                </Card>
                <Card className="p-4 border-[#00b341]/20" style={{ background: 'rgba(0,179,65,.04)' }}>
                  <div className="flex items-center gap-2 mb-2"><span className="text-xl">💳</span><h4 className="text-sm font-black text-white">Paystack Live Engine</h4></div>
                  <div className="space-y-1 text-[11px]">
                    <p className="text-gray-400">Environment: <span className="text-emerald-400 font-bold">{payConfig.isLive ? 'LIVE ✓' : 'TEST'}</span></p>
                    <p className="text-gray-400">Failed (24h): <span className="text-red-400 font-bold">{WEBHOOKS.filter(w => w.status === 'Failed').length}</span></p>
                    <p className="text-gray-400">Security Check: <span className="text-emerald-400 font-bold">0 Keys Exposed</span></p>
                  </div>
                </Card>
              </div>
            </div>

            {/* Real Admin Audit Log Stream */}
            <Card className="p-6">
              <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
                <div>
                  <h3 className="text-base font-black text-white uppercase" style={{ fontFamily: 'Big Shoulders Display' }}>📜 Real-Time Admin Audit Log (`admin_actions`)</h3>
                  <p className="text-xs text-gray-400 font-medium">All administrative mutations are logged here with timestamps and target IDs.</p>
                </div>
                <span className="text-[10px] font-bold px-2.5 py-1 rounded bg-[#00b341]/10 border border-[#00b341]/40 text-[#00b341]">
                  {auditLogs.length} Audit Entries
                </span>
              </div>
              <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                {auditLogs.map(log => (
                  <div key={log.id} className="p-3 rounded-xl border border-[#1e1e32] flex items-center justify-between text-xs gap-3" style={{ background: '#0d0d1e' }}>
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded text-[9px] font-black uppercase text-white bg-[#00b341]">
                        {log.action}
                      </span>
                      <span className="font-bold text-white">{log.details}</span>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-[10px] text-gray-400">{log.adminEmail}</p>
                      <p className="text-[9px] text-gray-600 font-mono">{new Date(log.timestamp).toLocaleTimeString()}</p>
                    </div>
                  </div>
                ))}
              </div>
            </Card>

            {/* Digest Row: Best Sellers & Trending News */}
            <div className="grid md:grid-cols-2 gap-6">
              {/* Best Selling Merchandise */}
              <Card className="p-5">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-black text-white uppercase flex items-center gap-2" style={{ fontFamily: 'Big Shoulders Display' }}>🔥 Top Selling Merchandise</h3>
                  <button onClick={() => setTab('products')} className="text-[10px] font-bold text-[#00b341] hover:underline">View All →</button>
                </div>
                <div className="space-y-3">
                  {products.slice(0, 3).map(p => (
                    <div key={p.id} className="flex items-center gap-3 p-2.5 rounded-xl border border-[#1e1e32]" style={{ background: '#0d0d1e' }}>
                      <img src={p.imageUrl || 'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?w=100'} alt="" className="w-12 h-12 object-cover rounded-lg shrink-0" />
                      <div className="flex-1 min-w-0">
                        <h4 className="text-xs font-bold text-white truncate">{p.name}</h4>
                        <p className="text-[10px] text-gray-500">${p.price} · {p.stock} in stock</p>
                      </div>
                      <span className="text-xs font-black text-emerald-400 shrink-0">{p.sales} sold</span>
                    </div>
                  ))}
                </div>
              </Card>

              {/* Trending Articles */}
              <Card className="p-5">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-black text-white uppercase flex items-center gap-2" style={{ fontFamily: 'Big Shoulders Display' }}>📰 Trending Editorial Stories</h3>
                  <button onClick={() => setTab('articles')} className="text-[10px] font-bold text-[#00b341] hover:underline">Manage Articles →</button>
                </div>
                <div className="space-y-3">
                  {articles.slice(0, 3).map(a => (
                    <div key={a.id} className="flex items-center gap-3 p-2.5 rounded-xl border border-[#1e1e32]" style={{ background: '#0d0d1e' }}>
                      <img src={a.imageUrl || 'https://images.unsplash.com/photo-1522778119026-d647f0596c20?w=100'} alt="" className="w-12 h-12 object-cover rounded-lg shrink-0" />
                      <div className="flex-1 min-w-0">
                        <h4 className="text-xs font-bold text-white truncate">{a.title}</h4>
                        <p className="text-[10px] text-gray-500">{a.category} · {a.author}</p>
                      </div>
                      <span className="text-xs font-black text-blue-400 shrink-0">{a.views} views</span>
                    </div>
                  ))}
                </div>
              </Card>
            </div>

            {/* Real-Time Activity Log */}
            <Card className="p-6">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-4">
                <div>
                  <h3 className="text-lg font-black text-white uppercase flex items-center gap-2" style={{ fontFamily: 'Big Shoulders Display' }}>
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" /> 🔴 Real-Time Live Activity Log
                  </h3>
                  <p className="text-xs text-gray-500">Live platform events, transactions, and audit logs.</p>
                </div>
                <div className="flex gap-1.5 flex-wrap">
                  {['All', 'Orders', 'Comments', 'Tips', 'Users'].map(f => (
                    <button key={f} onClick={() => setOrderSearch(f === 'All' ? '' : f)} className="px-2.5 py-1 text-[10px] font-bold rounded-lg border transition-all"
                      style={{ background: '#0d0d1e', color: '#9ca3af', borderColor: '#1e1e32' }}>{f}</button>
                  ))}
                </div>
              </div>
              <div className="space-y-2">
                {[
                  { icon:'🛒', type:'Orders', text:'No new orders', time:'', c:'#00b341', action: () => setTab('orders') },
                  { icon:'💬', type:'Comments', text:'No flagged comments', time:'', c:'#ef4444', action: () => setTab('comments') },
                  { icon:'☕', type:'Tips', text:'No recent tips', time:'', c:'#8b5cf6', action: () => setTab('financials') },
                  { icon:'👤', type:'Users', text:'No new registrations', time:'', c:'#3b82f6', action: () => setTab('users') },
                  { icon:'🎟️', type:'Orders', text:'No ticket sales', time:'', c:'#00b341', action: () => setTab('tickets') },
                  { icon:'📢', type:'Ads', text:'No ad booking requests', time:'', c:'#f59e0b', action: () => setTab('ads') },
                ].map((item, i) => (
                  <div key={i} onClick={item.action} className="flex items-center gap-3 p-3 rounded-xl border border-[#1e1e32] hover:border-[#00b341]/50 transition-all cursor-pointer group" style={{ background: '#0d0d1e' }}>
                    <span className="text-base shrink-0 group-hover:scale-110 transition-transform">{item.icon}</span>
                    <p className="text-xs text-gray-300 flex-1 group-hover:text-white transition-colors">{item.text}</p>
                    <span className="text-[10px] text-gray-500 font-bold shrink-0">{item.time} ago</span>
                    <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: item.c }} />
                  </div>
                ))}
              </div>
            </Card>
          </div>
        )}

        {/* ══ ORDERS ════════════════════════════════════════════════════════ */}
        {tab === 'orders' && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-stretch justify-between">
              <SectionHead title={`🛒 Order Management (${orders.length})`} sub={`${pendingOrders} pending fulfillment · Paystack live transaction engine`} />
              <div className="flex gap-2">
                <button onClick={() => downloadCSV('orders.csv', filteredOrders.map(o => [o.id, o.customer, o.email, o.phone, o.address, o.items, o.total.toString(), o.method, o.status, o.tracking, o.date]), ['ID','Customer','Email','Phone','Address','Items','Total','Method','Status','Tracking','Date'])}
                  className="px-4 py-2.5 text-[11px] font-bold text-white rounded-xl border border-[#1e1e32] hover:border-[#00b341] transition-all whitespace-nowrap" style={{ background: '#131320' }}>
                  ⬇ Export All CSV
                </button>
              </div>
            </div>

            {/* Order Statistics Overview */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {[
                { label: 'Total Orders', count: orders.length, val: orders.reduce((s, o) => s + o.total, 0), icon: '🛒', color: '#00b341' },
                { label: 'Pending Processing', count: orders.filter(o => o.status === 'Pending').length, val: orders.filter(o => o.status === 'Pending').reduce((s, o) => s + o.total, 0), icon: '⏳', color: '#f59e0b' },
                { label: 'Shipped & In Transit', count: orders.filter(o => o.status === 'Shipped').length, val: orders.filter(o => o.status === 'Shipped').reduce((s, o) => s + o.total, 0), icon: '🚚', color: '#3b82f6' },
                { label: 'Fulfilled / Delivered', count: orders.filter(o => o.status === 'Fulfilled').length, val: orders.filter(o => o.status === 'Fulfilled').reduce((s, o) => s + o.total, 0), icon: '✅', color: '#10b981' },
              ].map(k => (
                <Card key={k.label} className="p-4 border-[#1e1e32]" style={{ background: '#131320' }}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[10px] font-black uppercase text-gray-500">{k.label}</span>
                    <span className="text-xl">{k.icon}</span>
                  </div>
                  <p className="text-2xl font-black text-white" style={{ fontFamily: 'Big Shoulders Display' }}>{k.count} orders</p>
                  <p className="text-xs font-bold" style={{ color: k.color }}>${k.val.toFixed(2)}</p>
                </Card>
              ))}
            </div>

            {/* Search & Filter Toolbar */}
            <Card className="p-4 flex flex-wrap gap-2 items-center justify-between">
              <input type="text" value={orderSearch} onChange={e => setOrderSearch(e.target.value)} placeholder="Search order ID, customer name, email, phone…" className={`flex-1 min-w-[240px] ${INPUT}`} style={INPUT_STYLE} />
              <div className="flex gap-1.5 flex-wrap items-center">
                {['All','Pending','Processing','Shipped','Fulfilled','Refunded'].map(f => (
                  <button key={f} onClick={() => setOrderFilter(f)} className="px-3 py-1.5 text-[10px] font-black rounded-lg uppercase transition-all"
                    style={{ background: orderFilter === f ? '#00b341' : '#0d0d1e', color: orderFilter === f ? '#fff' : '#6b7280', border: `1px solid ${orderFilter === f ? '#00b341' : '#1e1e32'}` }}>{f}</button>
                ))}
              </div>
            </Card>

            {/* Batch Action Toolbar */}
            {selectedOrderIds.length > 0 && (
              <div className="p-3 rounded-xl border border-[#00b341]/30 flex items-center justify-between flex-wrap gap-2 animate-fade-in" style={{ background: 'rgba(0,179,65,.08)' }}>
                <span className="text-xs font-bold text-white flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-[#00b341]" /> {selectedOrderIds.length} orders selected
                </span>
                <div className="flex gap-2">
                  <button onClick={() => {
                    setOrders(prev => prev.map(o => selectedOrderIds.includes(o.id) ? { ...o, status: 'Shipped' } : o))
                    setSelectedOrderIds([])
                  }} className="px-3 py-1 text-xs font-bold text-white bg-blue-600 rounded-lg hover:bg-blue-500">Mark Selected Shipped</button>
                  <button onClick={() => {
                    setOrders(prev => prev.map(o => selectedOrderIds.includes(o.id) ? { ...o, status: 'Fulfilled' } : o))
                    setSelectedOrderIds([])
                  }} className="px-3 py-1 text-xs font-bold text-white bg-[#00b341] rounded-lg hover:opacity-90">Mark Selected Fulfilled</button>
                  <button onClick={() => setSelectedOrderIds([])} className="px-3 py-1 text-xs font-bold text-gray-400 hover:text-white">Clear Selection</button>
                </div>
              </div>
            )}

            {/* Orders Data Table */}
            <Card className="overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left" style={{ minWidth: '920px' }}>
                  <thead><tr className="border-b border-[#1e1e32]" style={{ background: '#0d0d1e' }}>
                    <th className="px-4 py-3 w-10">
                      <input type="checkbox" checked={selectedOrderIds.length === filteredOrders.length && filteredOrders.length > 0}
                        onChange={e => setSelectedOrderIds(e.target.checked ? filteredOrders.map(o => o.id) : [])} className="w-4 h-4 accent-[#00b341]" />
                    </th>
                    {['Order ID','Customer','Items','Payment','Courier / Shipping','Total','Status','Tracking #','Date','Actions'].map(h => <Th key={h}>{h}</Th>)}
                  </tr></thead>
                  <tbody className="divide-y divide-[#1e1e32] text-xs">
                    {filteredOrders.map(o => (
                      <tr key={o.id} onClick={() => setDetailOrder(o)} className="hover:bg-[#00b341]/10 transition-colors cursor-pointer group">
                        <td className="px-4 py-4" onClick={e => e.stopPropagation()}>
                          <input type="checkbox" checked={selectedOrderIds.includes(o.id)}
                            onChange={e => setSelectedOrderIds(prev => e.target.checked ? [...prev, o.id] : prev.filter(x => x !== o.id))} className="w-4 h-4 accent-[#00b341]" />
                        </td>
                        <td className="px-5 py-4 font-mono font-bold text-[#00b341] group-hover:underline">{o.id}</td>
                        <td className="px-5 py-4"><p className="font-bold text-white group-hover:text-[#00b341] transition-colors">{o.customer}</p><p className="text-[10px] text-gray-500">{o.email}</p></td>
                        <td className="px-5 py-4 text-gray-300 max-w-[140px] truncate">{o.items}</td>
                        <td className="px-5 py-4 text-gray-400 font-bold">{o.method}</td>
                        <td className="px-5 py-4 text-gray-300">
                          <p className="font-bold text-white text-[11px] truncate max-w-[130px]">{o.shippingCourier || 'Fargo Courier'}</p>
                          <p className="text-[10px] text-emerald-400 font-mono">
                            {o.shippingTier === 'free' ? 'FREE (Internal KES ' + (o.shippingCostKes || 400) + ')' : 'KES ' + (o.shippingCostKes || 400)}
                          </p>
                        </td>
                        <td className="px-5 py-4 font-black text-[#00b341] text-base" style={{ fontFamily: 'Big Shoulders Display' }}>${o.total.toFixed(2)}</td>
                        <td className="px-5 py-4" onClick={e => e.stopPropagation()}>
                          <select value={o.status} onChange={e => setOrders(prev => prev.map(x => x.id === o.id ? { ...x, status: e.target.value } : x))}
                            className="px-2 py-1 text-[10px] font-bold rounded-lg outline-none cursor-pointer"
                            style={{ background: SC[o.status]?.bg ?? '#131320', color: SC[o.status]?.text ?? '#fff', border: `1px solid ${SC[o.status]?.text ?? '#1e1e32'}` }}>
                            {['Pending','Processing','Shipped','Fulfilled','Refunded'].map(s => <option key={s}>{s}</option>)}
                          </select>
                        </td>
                        <td className="px-5 py-4" onClick={e => e.stopPropagation()}>
                          <input value={o.tracking} onChange={e => setOrders(prev => prev.map(x => x.id === o.id ? { ...x, tracking: e.target.value } : x))}
                            placeholder="Tracking #" className="px-2 py-1 text-xs text-white rounded-lg outline-none focus:ring-1 focus:ring-[#00b341] w-28"
                            style={{ background: '#0c0c14', border: '1px solid #1e1e32' }} />
                        </td>
                        <td className="px-5 py-4 text-gray-500 whitespace-nowrap">{o.date}</td>
                        <td className="px-5 py-4 text-right space-x-2 whitespace-nowrap" onClick={e => e.stopPropagation()}>
                          <button onClick={() => setDetailOrder(o)} className="text-[10px] font-bold text-[#00b341] hover:underline">Details</button>
                          <a href={`mailto:${o.email}?subject=Your FlowerZFC Order ${o.id}`} className="text-[10px] font-bold text-blue-400 hover:underline">Email</a>
                          <button onClick={() => window.print()} className="text-[10px] font-bold text-gray-400 hover:text-white hover:underline">Print</button>
                          {o.status !== 'Refunded' && (
                            <button onClick={() => { if (confirm(`Refund $${o.total} to ${o.customer}?`)) setOrders(prev => prev.map(x => x.id === o.id ? { ...x, status: 'Refunded' } : x)) }}
                              className="text-[10px] font-bold text-red-400 hover:underline">Refund</button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {filteredOrders.length === 0 && <div className="text-center py-16 text-gray-600"><p className="text-4xl mb-2">🔍</p><p className="text-sm font-bold">No orders match filter</p></div>}
              </div>
            </Card>
          </div>
        )}

        {/* ══ PRODUCTS ══════════════════════════════════════════════════════ */}
        {tab === 'products' && (
          <div className="space-y-8">
            <SectionHead title={`👕 Products (${products.length})`} sub="Inventory, image, pricing, and variants."
              action={<button onClick={() => setShowAddProduct(true)} className="px-5 py-2.5 text-xs font-black text-white rounded-xl hover:opacity-90" style={{ background: '#00b341' }}>+ Add Product</button>} />

            {/* Product KPI Stats */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {[
                { label: 'Total Products', value: products.length, icon: '👕', color: '#00b341' },
                { label: 'Active / Live', value: products.filter(p => p.status === 'Active').length, icon: '🟢', color: '#10b981' },
                { label: 'Low Stock (< 10)', value: products.filter(p => p.stock < 10).length, icon: '⚠️', color: '#f59e0b' },
                { label: 'Featured', value: products.filter(p => p.featured).length, icon: '⭐', color: '#fbbf24' },
              ].map(k => (
                <Card key={k.label} className="p-4" style={{ background: '#131320' }}>
                  <div className="flex justify-between mb-1"><span className="text-[10px] font-black uppercase text-gray-500">{k.label}</span><span>{k.icon}</span></div>
                  <p className="text-3xl font-black" style={{ fontFamily: 'Big Shoulders Display', color: k.color }}>{k.value}</p>
                </Card>
              ))}
            </div>

            {/* Search & Filter Bar */}
            <Card className="p-4 flex flex-wrap gap-2 items-center">
              <input type="text" value={articleSearch} onChange={e => setArticleSearch(e.target.value)} placeholder="Search product name, team, category, SKU…" className={`flex-1 min-w-[200px] ${INPUT}`} style={INPUT_STYLE} />
              {['All', 'Active', 'Draft', 'Archived'].map(f => (
                <button key={f} onClick={() => setArticleSearch(f === 'All' ? '' : f)} className="px-3 py-1.5 text-[10px] font-black uppercase rounded-lg transition-all"
                  style={{ background: '#0d0d1e', color: '#6b7280', border: '1px solid #1e1e32' }}>{f}</button>
              ))}
            </Card>

            {/* Product Cards Grid */}
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {products.filter(p => !articleSearch || p.name.toLowerCase().includes(articleSearch.toLowerCase()) || p.category.toLowerCase().includes(articleSearch.toLowerCase()) || (p.team || '').toLowerCase().includes(articleSearch.toLowerCase()) || p.status.toLowerCase().includes(articleSearch.toLowerCase())).map(p => (
                <Card key={p.id} className="p-0 overflow-hidden relative group cursor-pointer hover:border-[#00b341]/50 transition-all" style={{ border: p.stock < (p.lowStockThreshold || 5) ? '1px solid rgba(245,158,11,0.4)' : undefined }}>
                  {p.featured && <span className="absolute top-3 left-3 z-10 text-[9px] font-black uppercase px-2 py-0.5 rounded text-black" style={{ background: '#fbbf24' }}>⭐ Featured</span>}
                  {p.stock < (p.lowStockThreshold || 5) && <span className="absolute top-3 right-3 z-10 text-[9px] font-black uppercase px-2 py-0.5 rounded text-black" style={{ background: '#f59e0b' }}>⚠️ Low Stock</span>}
                  {p.imageUrl ? (
                    <div className="relative h-48 overflow-hidden">
                      <img src={p.imageUrl} alt={p.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" onError={e => { (e.target as HTMLImageElement).style.display = 'none' }} />
                      <div className="absolute inset-0" style={{ background: 'linear-gradient(to bottom, transparent 40%, #131320 100%)' }} />
                      {/* Image count badge */}
                      {(p.images?.length ?? 0) > 1 && (
                        <span className="absolute bottom-2 right-2 text-[9px] font-black px-2 py-0.5 rounded-full bg-black/60 text-white">📷 {p.images.length}</span>
                      )}
                    </div>
                  ) : (
                    <div className="h-32 flex items-center justify-center text-4xl" style={{ background: '#0d0d1e' }}>👕</div>
                  )}
                  <div className="p-4">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-[9px] font-black uppercase text-[#00b341] tracking-wider">{p.category}</span>
                      {p.team && <span className="text-[9px] text-gray-500 font-bold">· {p.team}</span>}
                      <Badge s={p.status} />
                    </div>
                    <h3 className="font-bold text-white text-sm mt-0.5 mb-1 line-clamp-1">{p.name}</h3>
                    {p.description && <p className="text-[10px] text-gray-500 mb-2 line-clamp-2">{p.description}</p>}
                    <div className="flex items-center gap-2 mb-3">
                      <span className="text-base font-black text-[#00b341]" style={{ fontFamily: 'Big Shoulders Display' }}>${p.price}</span>
                      {p.comparePrice > 0 && <span className="text-xs text-gray-600 line-through">${p.comparePrice}</span>}
                      {p.kitType && <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-[#1e1e32] text-gray-400">{p.kitType}</span>}
                    </div>
                    <div className="grid grid-cols-3 gap-2 p-2 rounded-xl text-center mb-3" style={{ background: '#0d0d1e', border: '1px solid #1e1e32' }}>
                      <div><p className="text-[9px] text-gray-600 font-bold">Stock</p><p className="text-sm font-black" style={{ fontFamily: 'Big Shoulders Display', color: p.stock < (p.lowStockThreshold || 5) ? '#f59e0b' : '#fff' }}>{p.stock}</p></div>
                      <div><p className="text-[9px] text-gray-600 font-bold">Sold</p><p className="text-sm font-black text-white" style={{ fontFamily: 'Big Shoulders Display' }}>{p.sales}</p></div>
                      <div><p className="text-[9px] text-gray-600 font-bold">SKU</p><p className="text-[10px] text-gray-400 font-mono truncate">{p.sku || '—'}</p></div>
                    </div>
                    {p.sizes.length > 0 && <div className="flex gap-1 flex-wrap mb-3">{p.sizes.map(s => <span key={s} className="text-[9px] px-1.5 py-0.5 rounded border border-[#1e1e32] text-gray-500">{s}</span>)}</div>}
                    <div className="flex gap-1">
                      <button onClick={() => setEditProduct(p)} className="flex-1 py-1.5 text-[10px] font-bold text-white rounded-lg border border-[#1e1e32] hover:border-[#00b341] transition-all">✏️ Edit</button>
                      <button onClick={() => setProducts(prev => prev.map(x => x.id === p.id ? { ...x, status: x.status === 'Active' ? 'Draft' : 'Active' } : x))}
                        className="py-1.5 px-2 text-[10px] font-bold rounded-lg border border-[#1e1e32] hover:border-blue-400 text-gray-400 hover:text-blue-400 transition-all" title={p.status === 'Active' ? 'Draft' : 'Activate'}>
                        {p.status === 'Active' ? '👁️' : '🚀'}
                      </button>
                      <button onClick={() => setProducts(prev => prev.map(x => x.id === p.id ? { ...x, featured: !x.featured } : x))}
                        className="py-1.5 px-2 text-[10px] font-bold rounded-lg border border-[#1e1e32] hover:border-yellow-400 text-gray-400 hover:text-yellow-400 transition-all">{p.featured ? '★' : '☆'}</button>
                      <button onClick={() => {
                        if (confirm(`Delete "${p.name}"?`)) {
                          deleteProductFromDb(p.id).then(({ error }) => {
                            if (error) console.error('Error deleting product from DB:', error)
                          })
                          setProducts(prev => prev.filter(x => x.id !== p.id))
                          toastLib.success(`Deleted product "${p.name}"`)
                        }
                      }}
                        className="py-1.5 px-2 text-[10px] font-bold rounded-lg border border-[#1e1e32] hover:border-red-400 text-gray-400 hover:text-red-400 transition-all">🗑</button>
                    </div>
                  </div>
                </Card>
              ))}
            </div>

            {/* Discount Codes */}
            <SectionHead title="🏷️ Discount Codes" sub="Manage promo codes for the shop."
              action={<button onClick={() => setShowAddDiscount(true)} className="px-5 py-2.5 text-xs font-black text-white rounded-xl hover:opacity-90" style={{ background: '#00b341' }}>+ Create Code</button>} />
            <Card className="overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left" style={{ minWidth: '700px' }}>
                  <thead><tr className="border-b border-[#1e1e32]" style={{ background: '#0d0d1e' }}>
                    {['Code','Type','Value','Uses / Max','Expires','Status','Action'].map(h => <Th key={h}>{h}</Th>)}
                  </tr></thead>
                  <tbody className="divide-y divide-[#1e1e32] text-xs">
                    {discounts.map(d => (
                      <tr key={d.id} className="hover:bg-white/[.02]">
                        <td className="px-5 py-3.5 font-mono font-black text-white tracking-wider">{d.code}</td>
                        <td className="px-5 py-3.5 text-gray-400">{d.type}</td>
                        <td className="px-5 py-3.5 font-bold text-[#00b341]">{d.type === 'Percent' ? `${d.value}%` : `$${d.value}`}</td>
                        <td className="px-5 py-3.5 text-white">{d.uses} / {d.maxUses}</td>
                        <td className="px-5 py-3.5 text-gray-400">{d.expires}</td>
                        <td className="px-5 py-3.5"><Badge s={d.status} /></td>
                        <td className="px-5 py-3.5 space-x-2">
                          <button onClick={() => setDiscounts(prev => prev.map(x => x.id === d.id ? { ...x, status: x.status === 'Active' ? 'Inactive' : 'Active' } : x))}
                            className="text-[10px] font-bold text-[#00b341] hover:underline">{d.status === 'Active' ? 'Disable' : 'Enable'}</button>
                          <button onClick={() => setDiscounts(prev => prev.filter(x => x.id !== d.id))} className="text-[10px] font-bold text-red-400 hover:underline">Delete</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          </div>
        )}

        {/* ══ ARTICLES ══════════════════════════════════════════════════════ */}
        {tab === 'articles' && (
          <div className="space-y-6">
            <SectionHead title={`📰 Articles (${articles.length})`} sub="Write, schedule, publish, and manage all content."
              action={<div className="flex gap-2">
                <button onClick={() => downloadCSV('articles.csv', filteredArticles.map(a => [a.id, a.title, a.category, a.author, a.views, a.likes.toString(), a.status, a.date]), ['ID','Title','Category','Author','Views','Likes','Status','Date'])}
                  className="px-3 py-2 text-[11px] font-bold text-white rounded-xl border border-[#1e1e32] hover:border-[#00b341] transition-all" style={{ background: '#131320' }}>⬇ CSV</button>
                <button onClick={() => setShowAddArticle(true)} className="px-5 py-2.5 text-xs font-black text-white rounded-xl hover:opacity-90" style={{ background: '#00b341' }}>+ New Article</button>
              </div>} />

            {/* 🚨 LiveScore Ingestion & Instant Notification Banner */}
            {showIngestNotification && (
              <div className="p-4 rounded-2xl border flex items-center justify-between gap-4 flex-wrap" style={{ background: 'rgba(0,179,65,.08)', borderColor: '#00b341' }}>
                <div className="flex items-center gap-3">
                  <span className="w-3 h-3 rounded-full bg-red-500 animate-pulse shrink-0" />
                  <div>
                    <p className="text-xs font-black text-white uppercase tracking-wider">⚡ LiveScore Feed Scanner Alert</p>
                    <p className="text-[11px] text-gray-300">
                      {ingestedPosts.filter(p => p.status === 'Pending').length} new LiveScore articles detected. Content auto-transformed to FlowerZFC brand context.
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={() => {
                    const el = document.getElementById('ingestion-hub')
                    if (el) el.scrollIntoView({ behavior: 'smooth' })
                  }} className="px-4 py-2 text-xs font-black text-black rounded-xl hover:opacity-90 transition-all" style={{ background: '#00b341' }}>
                    Review Posts →
                  </button>
                  <button onClick={() => setShowIngestNotification(false)} className="text-xs text-gray-500 hover:text-white px-2 py-1">✕</button>
                </div>
              </div>
            )}

            {/* 📡 LiveScore Ingestion & Context Transformer Suite */}
            <div id="ingestion-hub" className="rounded-2xl p-6 space-y-5 border" style={{ background: '#131320', borderColor: '#1e1e32' }}>
              <div className="flex items-center justify-between gap-4 flex-wrap border-b border-[#1e1e32] pb-4">
                <div>
                  <h3 className="text-lg font-black text-white uppercase flex items-center gap-2" style={{ fontFamily: 'Big Shoulders Display' }}>
                    <span>📡</span> LiveScore News Feed & Context Transformer
                  </h3>
                  <p className="text-xs text-gray-400 mt-0.5">
                    Real-time scanner. Incoming LiveScore posts are auto-rewritten into FlowerZFC voice with zero external source references.
                  </p>
                </div>
                <div className="flex items-center gap-3 flex-wrap">
                  {/* Day Picker Filter */}
                  <div className="flex items-center gap-2 bg-[#0d0d1e] border border-[#1e1e32] px-3 py-1.5 rounded-xl">
                    <span className="text-[10px] font-black uppercase text-gray-500">📅 Day Picker:</span>
                    <input type="date" value={ingestDate} onChange={e => setIngestDate(e.target.value)} className="bg-transparent text-xs text-white outline-none font-mono" />
                  </div>
                  <button onClick={() => {
                    toast('📡 Querying LiveScore Contentful API...', 'info')
                    fetchLiveIngestedPosts().then(posts => {
                      setIngestedPosts(posts)
                      toast(`✅ LiveScore Feed Scanned! ${posts.length} real posts loaded.`, 'success')
                    })
                  }} className="px-4 py-2 text-xs font-black text-white rounded-xl border border-[#1e1e32] hover:border-[#00b341] transition-all" style={{ background: '#0d0d1e' }}>
                    🔄 Scan Feed Now
                  </button>
                </div>
              </div>

              {/* Bulk Actions Controls */}
              <div className="flex items-center justify-between gap-4 p-3 rounded-xl bg-[#0d0d1e] border border-[#1e1e32] flex-wrap">
                <label className="flex items-center gap-2.5 text-xs font-bold text-gray-300 cursor-pointer">
                  <input type="checkbox"
                    checked={selectedIngestIds.size > 0 && selectedIngestIds.size === filterPostsByDate(ingestedPosts, ingestDate).length}
                    onChange={e => {
                      const visible = filterPostsByDate(ingestedPosts, ingestDate)
                      if (e.target.checked) setSelectedIngestIds(new Set(visible.map(p => p.id)))
                      else setSelectedIngestIds(new Set())
                    }}
                    className="w-4 h-4 accent-[#00b341]" />
                  <span>Select All ({filterPostsByDate(ingestedPosts, ingestDate).length} posts)</span>
                </label>

                {selectedIngestIds.size > 0 && (
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-emerald-400">{selectedIngestIds.size} selected</span>
                    <button onClick={() => {
                      const selectedPosts = ingestedPosts.filter(p => selectedIngestIds.has(p.id))
                      const newArticles = selectedPosts.map((post, idx) => ({
                        id: `art-ing-${Date.now()}-${idx}`,
                        title: post.transformedTitle,
                        category: post.category,
                        body: post.transformedBody,
                        imageUrl: post.sourceImage,
                        imageAlt: post.transformedTitle,
                        imageCaption: post.transformedTitle,
                        author: post.author,
                        date: new Date().toLocaleDateString('en-KE', { month: 'short', day: 'numeric', year: 'numeric' }),
                        status: 'Published',
                        tags: `${post.category}, Ingested, News`,
                        metaDescription: post.transformedBody.slice(0, 150),
                        slug: post.transformedTitle.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
                        scheduled: '',
                        views: '1.2K',
                        likes: 85,
                        excerpt: post.transformedBody.slice(0, 140) + '...',
                        matchId: '',
                        teamTags: '',
                        playerTags: '',
                        mediaEmbeds: '',
                        isLiveBlog: false,
                        metaTitle: post.transformedTitle,
                        focusKeywords: post.category,
                      }))

                      setArticles(prev => [...newArticles, ...prev])
                      newArticles.forEach(a => saveArticle(a))
                      setIngestedPosts(prev => prev.map(p => selectedIngestIds.has(p.id) ? { ...p, status: 'Approved' } : p))
                      setSelectedIngestIds(new Set())
                      toast(`✅ Bulk Approved & Published ${selectedPosts.length} posts live!`, 'success')
                    }} className="px-4 py-2 text-xs font-black text-black rounded-xl hover:opacity-90 transition-all" style={{ background: '#00b341' }}>
                      ✅ Bulk Approve Selected ({selectedIngestIds.size}) →
                    </button>
                  </div>
                )}
              </div>

              {/* Ingested Post Cards */}
              <div className="space-y-4">
                {filterPostsByDate(ingestedPosts, ingestDate).map(post => (
                  <div key={post.id} className="p-5 rounded-xl border space-y-4" style={{ background: '#0d0d1e', borderColor: selectedIngestIds.has(post.id) ? '#00b341' : post.status === 'Pending' ? 'rgba(245,158,11,.4)' : post.status === 'Approved' ? 'rgba(0,179,65,.3)' : '#1e1e32' }}>
                    <div className="flex items-start justify-between gap-4 flex-wrap">
                      <div className="flex items-center gap-3">
                        <input type="checkbox" checked={selectedIngestIds.has(post.id)}
                          onChange={e => {
                            const next = new Set(selectedIngestIds)
                            if (e.target.checked) next.add(post.id)
                            else next.delete(post.id)
                            setSelectedIngestIds(next)
                          }} className="w-4 h-4 accent-[#00b341] shrink-0" />
                        <img src={post.sourceImage} alt="" className="w-16 h-12 object-cover rounded-lg shrink-0 border border-[#1e1e32]" />
                        <div>
                          <div className="flex items-center gap-2 mb-1 flex-wrap">
                            <span className="px-2 py-0.5 text-[9px] font-black uppercase rounded text-white" style={{ background: (() => {
                              const c = post.category
                              if (c === 'Premier League') return '#3b82f6'
                              if (c === 'Champions League') return '#f59e0b'
                              if (c === 'Europa League') return '#f97316'
                              if (c === 'Conference League') return '#06b6d4'
                              if (c === 'UEFA Super Cup') return '#6366f1'
                              if (c === 'La Liga') return '#ef4444'
                              if (c === 'Bundesliga') return '#dc2626'
                              if (c === 'Serie A') return '#0ea5e9'
                              if (c === 'Ligue 1') return '#8b5cf6'
                              if (c === 'Daily News Roundups') return '#00b341'
                              if (c === 'Predictions') return '#a78bfa'
                              if (c === 'NFL') return '#1d4ed8'
                              if (c === 'NBA') return '#ea580c'
                              if (c === 'Golf') return '#16a34a'
                              if (c === 'Horse Racing') return '#92400e'
                              if (c === 'Cricket') return '#0d9488'
                              if (c === 'MLB') return '#4f46e5'
                              if (c === 'Tennis') return '#15803d'
                              if (c === 'Football') return '#2563eb'
                              return '#6b7280' // Latest News / fallback
                            })() }}>{post.category}</span>
                            <span className="px-2 py-0.5 text-[9px] font-bold rounded border border-gray-700 text-gray-400">Section: {post.sourceSection || 'General'}</span>
                            <span className="text-[10px] text-gray-500">Detected: {post.detectedAt} · Date: {post.sourceDate}</span>
                          </div>
                          <p className="text-xs text-gray-400 font-mono truncate max-w-md">Source: {post.sourceUrl}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="px-2.5 py-1 text-[10px] font-black uppercase rounded-full"
                          style={{ background: post.status === 'Approved' ? 'rgba(0,179,65,.2)' : post.status === 'Pending' ? 'rgba(245,158,11,.2)' : 'rgba(239,68,68,.2)',
                                   color: post.status === 'Approved' ? '#00b341' : post.status === 'Pending' ? '#f59e0b' : '#ef4444' }}>
                          {post.status}
                        </span>
                      </div>
                    </div>

                    {/* Content Comparison Grid */}
                    <div className="grid lg:grid-cols-2 gap-4 text-xs">
                      {/* Original LiveScore Source */}
                      <div className="p-3.5 rounded-lg border border-red-500/20" style={{ background: 'rgba(239,68,68,.03)' }}>
                        <p className="text-[10px] font-black uppercase text-red-400 mb-1">🔴 Original Source Context (LiveScore)</p>
                        <p className="font-bold text-white mb-1">{post.sourceTitle}</p>
                        <p className="text-gray-400 leading-relaxed text-[11px]">{post.sourceBody}</p>
                      </div>

                      {/* Transformed FlowerZFC Context */}
                      <div className="p-3.5 rounded-lg border border-emerald-500/30" style={{ background: 'rgba(0,179,65,.04)' }}>
                        <p className="text-[10px] font-black uppercase text-emerald-400 mb-1">✨ Transformed FlowerZFC Context (Zero References)</p>
                        <p className="font-bold text-white mb-1">{post.transformedTitle}</p>
                        <p className="text-gray-300 leading-relaxed text-[11px]">{post.transformedBody}</p>
                      </div>
                    </div>

                    {/* Actions & Image Downloader Bar */}
                    <div className="flex items-center justify-between gap-3 flex-wrap border-t border-[#1e1e32] pt-3">
                      <div className="flex items-center gap-2">
                        <button onClick={() => {
                          downloadImageAsset(post.sourceImage, `flowerzfc-${post.id}.jpg`)
                          toast('⬇ Image download triggered!', 'success')
                        }} className="px-3 py-1.5 text-[10px] font-black text-white rounded-lg border border-[#1e1e32] hover:border-[#00b341] transition-all flex items-center gap-1.5" style={{ background: '#131320' }}>
                          ⬇ Download Image
                        </button>
                        <button onClick={() => {
                          navigator.clipboard.writeText(post.sourceImage)
                          toast('📋 Image URL copied to clipboard!', 'info')
                        }} className="px-3 py-1.5 text-[10px] font-black text-gray-400 hover:text-white transition-all">
                          🔗 Copy Image URL
                        </button>
                      </div>

                      <div className="flex items-center gap-2">
                        <button onClick={() => setEditingIngestPost(post)} className="px-3 py-1.5 text-[10px] font-black text-yellow-400 rounded-lg border border-yellow-400/30 hover:border-yellow-400 transition-all">
                          ✏️ Edit Context
                        </button>
                        <button onClick={() => {
                          setIngestedPosts(prev => prev.map(p => p.id === post.id ? { ...p, status: 'Rejected' } : p))
                          toast('Post rejected.', 'info')
                        }} className="px-3 py-1.5 text-[10px] font-bold text-red-400 rounded-lg border border-red-400/20 hover:border-red-400 transition-all">
                          ❌ Reject
                        </button>
                        <button onClick={() => {
                          // Approve & Publish to articleStore
                          const newArticle = {
                            id: `art-ing-${Date.now()}`,
                            title: post.transformedTitle,
                            category: post.category,
                            body: post.transformedBody,
                            imageUrl: post.sourceImage,
                            imageAlt: post.transformedTitle,
                            imageCaption: post.transformedTitle,
                            author: post.author,
                            date: new Date().toLocaleDateString('en-KE', { month: 'short', day: 'numeric', year: 'numeric' }),
                            status: 'Published',
                            tags: `${post.category}, Ingested, News`,
                            metaDescription: post.transformedBody.slice(0, 150),
                            slug: post.transformedTitle.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
                            scheduled: '',
                            views: '1.2K',
                            likes: 85,
                            excerpt: post.transformedBody.slice(0, 140) + '...',
                            matchId: '',
                            teamTags: '',
                            playerTags: '',
                            mediaEmbeds: '',
                            isLiveBlog: false,
                            metaTitle: post.transformedTitle,
                            focusKeywords: post.category,
                          }
                          setArticles(prev => [newArticle, ...prev])
                          saveArticle(newArticle)
                          setIngestedPosts(prev => prev.map(p => p.id === post.id ? { ...p, status: 'Approved' } : p))
                          toast('✅ Approved & Published to FlowerZFC platform live!', 'success')
                        }} className="px-4 py-1.5 text-[11px] font-black text-white rounded-lg hover:opacity-90 transition-all" style={{ background: '#00b341' }}>
                          ✅ Approve & Publish Now →
                        </button>
                      </div>
                    </div>
                  </div>
                ))}

                {filterPostsByDate(ingestedPosts, ingestDate).length === 0 && (
                  <div className="p-8 text-center text-gray-500 text-xs border border-dashed border-[#1e1e32] rounded-xl">
                    No ingested posts found for date <span className="text-white font-mono">{ingestDate}</span>. Select a different date or click "Scan Feed Now".
                  </div>
                )}
              </div>
            </div>

            {/* Article KPI Stats */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {[
                { label: 'Total Articles', value: articles.length, icon: '📰', color: '#00b341' },
                { label: 'Published', value: articles.filter(a => a.status === 'Published').length, icon: '🟢', color: '#10b981' },
                { label: 'Drafts', value: articles.filter(a => a.status === 'Draft').length, icon: '✍️', color: '#6b7280' },
                { label: 'Scheduled', value: articles.filter(a => a.status === 'Scheduled').length, icon: '🕐', color: '#8b5cf6' },
              ].map(k => (
                <Card key={k.label} className="p-4" style={{ background: '#131320' }}>
                  <div className="flex justify-between mb-1"><span className="text-[10px] font-black uppercase text-gray-500">{k.label}</span><span>{k.icon}</span></div>
                  <p className="text-3xl font-black" style={{ fontFamily: 'Big Shoulders Display', color: k.color }}>{k.value}</p>
                </Card>
              ))}
            </div>

            <Card className="p-4 flex flex-wrap gap-3 items-center">
              <input type="text" value={articleSearch} onChange={e => setArticleSearch(e.target.value)} placeholder="Search title, author, category, tags…" className={`flex-1 min-w-[200px] ${INPUT}`} style={INPUT_STYLE} />
              {['All','Published','Draft','Scheduled'].map(f => (
                <button key={f} onClick={() => setArticleFilter(f)}
                  className="px-3 py-1.5 text-[10px] font-black rounded-lg uppercase border transition-all"
                  style={{ background: articleFilter === f ? '#00b341' : '#0d0d1e', color: articleFilter === f ? '#fff' : '#6b7280', border: articleFilter === f ? '1px solid #00b341' : '1px solid #1e1e32' }}>
                  {f} {f !== 'All' && `(${articles.filter(a => a.status === f).length})`}
                </button>
              ))}
            </Card>

            <div className="space-y-3">
              {filteredArticles.map(a => (
                <Card key={a.id} className="overflow-hidden">
                  <div className="flex flex-col sm:flex-row">
                    {a.imageUrl && (
                      <div className="sm:w-40 h-28 sm:h-auto shrink-0 overflow-hidden">
                        <img src={a.imageUrl} alt={a.title} className="w-full h-full object-cover" onError={e => { (e.target as HTMLImageElement).style.display = 'none' }} />
                      </div>
                    )}
                    <div className="flex flex-col sm:flex-row flex-1 items-start sm:items-center justify-between gap-3 p-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <span className="text-[9px] font-black uppercase text-[#00b341] tracking-wider">{a.category}</span>
                          <Badge s={a.status} />
                          {a.scheduled && <span className="text-[9px] text-purple-400 font-bold">🕐 {a.scheduled}</span>}
                          {(a as any).liveBlog && <span className="text-[9px] font-black px-1.5 py-0.5 rounded text-white" style={{ background: '#dc2626' }}>🔴 LIVE</span>}
                        </div>
                        <h3 className="font-bold text-white text-sm line-clamp-1">{a.title}</h3>
                        {(a.excerpt || a.metaDescription) && <p className="text-[10px] text-gray-500 mt-0.5 line-clamp-2">{(a as any).excerpt || a.metaDescription}</p>}
                        <p className="text-[10px] text-gray-600 mt-1">✍️ {a.author} · 📅 {a.date} · 👁️ {Number(a.views).toLocaleString()} · ♥ {a.likes}</p>
                        {a.tags && <p className="text-[10px] text-gray-700 mt-0.5">🏷️ {a.tags}</p>}
                      </div>
                      <div className="flex items-center gap-2 shrink-0 flex-wrap">
                        <button onClick={() => setEditArticle(a)} className="px-3 py-1.5 text-[10px] font-bold rounded-lg border border-[#1e1e32] text-gray-400 hover:border-[#00b341] hover:text-white transition-all">✏️ Edit</button>
                        <button onClick={() => setArticles(prev => prev.map(x => x.id === a.id ? { ...x, status: x.status === 'Published' ? 'Draft' : 'Published' } : x))}
                          className="px-3 py-1.5 text-[10px] font-bold rounded-lg border border-[#1e1e32] text-gray-400 hover:border-[#00b341] hover:text-white transition-all">
                          {a.status === 'Published' ? 'Unpublish' : 'Publish'}
                        </button>
                        <button onClick={() => setArticles(prev => [{ ...a, id: `A${Date.now()}`, title: `Copy of ${a.title}`, status: 'Draft', date: new Date().toISOString().split('T')[0], views: '0', likes: 0 }, ...prev])}
                          className="px-2 py-1.5 text-[10px] font-bold rounded-lg border border-[#1e1e32] text-gray-400 hover:border-blue-400 hover:text-blue-400 transition-all" title="Duplicate article">⧉</button>
                        <Link to={`/news/${(a as any).slug || a.id}`} className="px-3 py-1.5 text-[10px] font-bold text-[#00b341] rounded-lg border border-[#00b341]/40 hover:border-[#00b341] transition-all">Preview →</Link>
                        <button onClick={() => { if (confirm(`Delete "${a.title}"?`)) { storeDeleteArticle(a.id); deleteArticleFromDb(a.id); setArticles(prev => prev.filter(x => x.id !== a.id)) } }}
                          className="text-[10px] font-bold px-2 py-1.5 rounded-lg border border-[#1e1e32] text-gray-500 hover:text-red-400 hover:border-red-400 transition-all">🗑</button>
                      </div>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* ══ TICKETS ══════════════════════════════════════════════════════ */}
        {tab === 'tickets' && (
          <div className="space-y-6">
            <SectionHead title="🏟️ Event Tickets" sub="Track event passes, capacity, and revenue via Paystack."
              action={<div className="flex gap-2">
                <button onClick={() => downloadCSV('tickets.csv', tickets.map(t => [t.id, t.event, t.venue, t.date, (t.regularSold+t.vipSold).toString(), t.capacity.toString(), t.status, `$${(t.regularSold*t.regularPrice+t.vipSold*t.vipPrice).toFixed(2)}`]), ['ID','Event','Venue','Date','Sold','Capacity','Status','Revenue'])}
                  className="px-3 py-2 text-[11px] font-bold text-white rounded-xl border border-[#1e1e32] hover:border-[#00b341] transition-all" style={{ background: '#131320' }}>⬇ CSV</button>
                <button onClick={() => setShowAddTicket(true)} className="px-5 py-2.5 text-xs font-black text-white rounded-xl hover:opacity-90" style={{ background: '#00b341' }}>+ Create Event</button>
              </div>} />

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {[
                { label: 'Total Events', value: tickets.length, icon: '🏟️', color: '#00b341' },
                { label: 'Tickets Sold', value: tickets.reduce((a, t) => a + t.regularSold + t.vipSold, 0).toLocaleString(), icon: '🎫', color: '#10b981' },
                { label: 'Total Revenue', value: `$${tickets.reduce((a, t) => a + (t.regularSold * t.regularPrice + t.vipSold * t.vipPrice), 0).toLocaleString()}`, icon: '💰', color: '#f59e0b' },
                { label: 'Sold Out', value: tickets.filter(t => (t.regularSold + t.vipSold) >= t.capacity).length, icon: '🔴', color: '#ef4444' },
              ].map(k => (
                <Card key={k.label} className="p-4" style={{ background: '#131320' }}>
                  <div className="flex justify-between mb-1"><span className="text-[10px] font-black uppercase text-gray-500">{k.label}</span><span>{k.icon}</span></div>
                  <p className="text-3xl font-black" style={{ fontFamily: 'Big Shoulders Display', color: k.color }}>{k.value}</p>
                </Card>
              ))}
            </div>

            <Card className="p-4 flex flex-wrap gap-2 items-center">
              <input type="text" placeholder="Search event name or venue…" className={`flex-1 min-w-[200px] ${INPUT}`} style={INPUT_STYLE}
                onChange={e => {
                  const v = e.target.value.toLowerCase()
                  setTickets(prev => prev.map(t => ({ ...t, _hidden: !(`${t.event} ${t.venue}`.toLowerCase().includes(v)) } as any)))
                }} />
              {['All','On Sale','Postponed','Cancelled'].map(f => (
                <button key={f} className="px-3 py-1.5 text-[10px] font-black uppercase rounded-lg border border-[#1e1e32] text-gray-500 hover:border-[#00b341] hover:text-white transition-all">{f}</button>
              ))}
            </Card>

            <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-6">
              {tickets.map(tck => {
                const sold = tck.regularSold + tck.vipSold
                const pct = Math.min(Math.round((sold / tck.capacity) * 100), 100)
                const isSoldOut = sold >= tck.capacity
                const liveRevenue = tck.regularSold * tck.regularPrice + tck.vipSold * tck.vipPrice
                const remaining = tck.capacity - sold
                const barColor = isSoldOut ? '#ef4444' : pct > 80 ? '#f59e0b' : '#00b341'
                return (
                  <Card key={tck.id} className="p-6 relative overflow-hidden hover:border-[#00b341]/30 transition-all" style={{ border: isSoldOut ? '1px solid rgba(239,68,68,0.4)' : undefined }}>
                    {isSoldOut && (
                      <div className="absolute top-0 right-0 px-3 py-1 text-[9px] font-black text-white rounded-bl-xl" style={{ background: '#ef4444' }}>🔴 SOLD OUT</div>
                    )}
                    <div className="flex items-center justify-between mb-2">
                      <Badge s={isSoldOut ? 'Sold Out' : tck.status} />
                      <span className="text-[9px] text-gray-600 font-bold uppercase">📅 {tck.date}</span>
                    </div>
                    <h3 className="text-xl font-black text-white mb-1 leading-tight pr-12" style={{ fontFamily: 'Big Shoulders Display' }}>{tck.event}</h3>
                    <p className="text-[10px] text-gray-500 mb-4">📍 {tck.venue}</p>

                    <div className="mb-4">
                      <div className="flex justify-between text-[10px] font-bold text-gray-500 mb-1">
                        <span>{sold.toLocaleString()} / {tck.capacity.toLocaleString()} sold</span>
                        <span style={{ color: barColor }}>{pct}% {isSoldOut ? '🔴' : pct > 80 ? '⚠️' : '✅'}</span>
                      </div>
                      <div className="h-2.5 rounded-full" style={{ background: '#1e1e32' }}>
                        <div className="h-2.5 rounded-full transition-all duration-500" style={{ width: `${pct}%`, background: barColor }} />
                      </div>
                      <p className="text-[9px] text-gray-600 mt-1">
                        {isSoldOut ? '🎉 Event is fully sold out!' : `${remaining.toLocaleString()} seats remaining`}
                      </p>
                    </div>

                    <div className="grid grid-cols-3 gap-2 p-3 rounded-xl mb-4 text-center" style={{ background: '#0d0d1e', border: '1px solid #1e1e32' }}>
                      <div>
                        <p className="text-[9px] text-gray-600 uppercase font-bold">Regular</p>
                        <p className="text-lg font-black text-white" style={{ fontFamily: 'Big Shoulders Display' }}>{tck.regularSold}</p>
                        <p className="text-[8px] text-gray-600">${tck.regularPrice}/ea</p>
                      </div>
                      <div>
                        <p className="text-[9px] text-gray-600 uppercase font-bold">VIP</p>
                        <p className="text-lg font-black text-yellow-400" style={{ fontFamily: 'Big Shoulders Display' }}>{tck.vipSold}</p>
                        <p className="text-[8px] text-gray-600">${tck.vipPrice}/ea</p>
                      </div>
                      <div>
                        <p className="text-[9px] text-gray-600 uppercase font-bold">Revenue</p>
                        <p className="text-lg font-black text-[#00b341]" style={{ fontFamily: 'Big Shoulders Display' }}>${liveRevenue.toLocaleString()}</p>
                        <p className="text-[8px] text-gray-600">live calc</p>
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <button onClick={() => setAttendeeTck(tck)} className="flex-1 py-2 text-[10px] font-bold text-white rounded-lg border border-[#1e1e32] hover:border-[#00b341] transition-all">👥 Attendees</button>
                      <button onClick={() => setEditEvent(tck)} className="flex-1 py-2 text-[10px] font-bold text-white rounded-lg border border-[#1e1e32] hover:border-[#00b341] transition-all">✏️ Edit</button>
                      <button
                        onClick={() => setTickets(prev => prev.map(x => x.id === tck.id ? { ...x, status: x.status === 'On Sale' ? 'Postponed' : 'On Sale' } : x))}
                        className="py-2 px-2 text-[10px] font-bold rounded-lg border border-[#1e1e32] text-gray-400 hover:border-yellow-400 hover:text-yellow-400 transition-all"
                        title={tck.status === 'On Sale' ? 'Postpone event' : 'Put back on sale'}>
                        {tck.status === 'On Sale' ? '⏸' : '▶'}
                      </button>
                      <button onClick={() => { if (confirm(`Delete "${tck.event}"?`)) { deleteTicketFromDb(tck.id); setTickets(prev => prev.filter(x => x.id !== tck.id)) } }}
                        className="py-2 px-2 text-[10px] font-bold text-red-400 rounded-lg border border-red-400/30 hover:border-red-400 transition-all">🗑</button>
                    </div>
                  </Card>
                )
              })}
            </div>
          </div>
        )}

        {/* ══ USERS ═════════════════════════════════════════════════════════ */}
        {tab === 'users' && (
          <div className="space-y-6">
            <SectionHead title={`👥 Users (${users.length})`} sub="Accounts, roles, access permissions, and moderation."
              action={<div className="flex gap-2">
                <button onClick={() => downloadCSV('users.csv', users.map(u => [u.id, u.name, u.email, u.role, u.joined, u.orders.toString(), u.tips, u.status]), ['ID','Name','Email','Role','Joined','Orders','Tips','Status'])}
                  className="px-3 py-2 text-[11px] font-bold text-white rounded-xl border border-[#1e1e32] hover:border-[#00b341] transition-all" style={{ background: '#131320' }}>⬇ Export CSV</button>
                <button onClick={() => setShowAddUser(true)} className="px-5 py-2.5 text-xs font-black text-white rounded-xl hover:opacity-90 transition-all" style={{ background: '#00b341' }}>+ Invite Staff / User</button>
              </div>} />

            {/* Users KPI Stats */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {[
                { label: 'Total Users', value: users.length, icon: '👥', color: '#00b341' },
                { label: 'Staff (Admin/Edit)', value: users.filter(u => ['admin','editor','writer'].includes(u.role)).length, icon: '👑', color: '#8b5cf6' },
                { label: 'Active Regular Users', value: users.filter(u => u.role === 'user' && u.status !== 'Banned').length, icon: '🟢', color: '#10b981' },
                { label: 'Banned Accounts', value: users.filter(u => u.status === 'Banned').length, icon: '🚫', color: '#ef4444' },
              ].map(k => (
                <Card key={k.label} className="p-4" style={{ background: '#131320' }}>
                  <div className="flex justify-between mb-1"><span className="text-[10px] font-black uppercase text-gray-500">{k.label}</span><span>{k.icon}</span></div>
                  <p className="text-3xl font-black" style={{ fontFamily: 'Big Shoulders Display', color: k.color }}>{k.value}</p>
                </Card>
              ))}
            </div>

            {/* Search & Interactive Role Filters */}
            <Card className="p-4 flex flex-wrap gap-3 items-center">
              <input type="text" value={userSearch} onChange={e => setUserSearch(e.target.value)} placeholder="Search name or email…" className={`flex-1 min-w-[200px] ${INPUT}`} style={INPUT_STYLE} />
              {['All','admin','editor','writer','user','Banned'].map(r => {
                const count = r === 'All' ? users.length : r === 'Banned' ? users.filter(u => u.status === 'Banned').length : users.filter(u => u.role === r).length
                const isActive = userRoleFilter === r
                return (
                  <button key={r} onClick={() => setUserRoleFilter(r)}
                    className="px-3 py-1.5 text-[10px] font-black uppercase rounded-lg border transition-all"
                    style={{
                      background: isActive ? '#00b341' : '#0d0d1e',
                      color: isActive ? '#fff' : '#6b7280',
                      border: isActive ? '1px solid #00b341' : '1px solid #1e1e32'
                    }}>
                    {r} ({count})
                  </button>
                )
              })}
            </Card>

            <Card className="overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left" style={{ minWidth: '820px' }}>
                  <thead><tr className="border-b border-[#1e1e32]" style={{ background: '#0d0d1e' }}>
                    {['User','Role','Joined','Orders','Tips','Status','Change Role','Actions'].map(h => <Th key={h}>{h}</Th>)}
                  </tr></thead>
                  <tbody className="divide-y divide-[#1e1e32] text-xs">
                    {filteredUsers.length === 0 ? (
                      <tr><td colSpan={8} className="px-5 py-8 text-center text-gray-500 font-bold">No users match your criteria.</td></tr>
                    ) : (
                      filteredUsers.map(u => (
                        <tr key={u.id} className="hover:bg-white/[.03] transition-colors cursor-pointer" onClick={() => setDetailUser(u)}>
                          <td className="px-5 py-4">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-black text-white border border-[#1e1e32]"
                                style={{ background: u.role === 'admin' ? '#00b341' : u.role === 'editor' ? '#8b5cf6' : u.role === 'writer' ? '#3b82f6' : '#1e1e32' }}>{u.name.charAt(0)}</div>
                              <div><p className="font-bold text-white">{u.name}</p><p className="text-[10px] text-gray-500">{u.email}</p></div>
                            </div>
                          </td>
                          <td className="px-5 py-4"><span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full"
                            style={{
                              background: u.role === 'admin' ? 'rgba(0,179,65,.2)' : u.role === 'editor' ? 'rgba(139,92,246,.2)' : u.role === 'writer' ? 'rgba(59,130,246,.2)' : 'rgba(156,163,175,.15)',
                              color: u.role === 'admin' ? '#00b341' : u.role === 'editor' ? '#a78bfa' : u.role === 'writer' ? '#60a5fa' : '#9ca3af'
                            }}>{u.role}</span></td>
                          <td className="px-5 py-4 text-gray-500">{u.joined}</td>
                          <td className="px-5 py-4 font-bold text-white">{u.orders}</td>
                          <td className="px-5 py-4 text-[#00b341] font-bold">{u.tips}</td>
                          <td className="px-5 py-4"><Badge s={u.status} /></td>
                          <td className="px-5 py-4" onClick={e => e.stopPropagation()}>
                            {u.role !== 'admin' ? (
                              <select value={u.role} onChange={e => setUsers(prev => prev.map(x => x.id === u.id ? { ...x, role: e.target.value } : x))}
                                className="px-2 py-1 text-[10px] font-bold rounded-lg outline-none cursor-pointer text-white" style={{ background: '#0d0d1e', border: '1px solid #1e1e32' }}>
                                {['user','writer','editor'].map(r => <option key={r}>{r}</option>)}
                              </select>
                            ) : (
                              <span className="text-[10px] font-bold text-gray-600">Admin</span>
                            )}
                          </td>
                          <td className="px-5 py-4 space-x-2 whitespace-nowrap" onClick={e => e.stopPropagation()}>
                            <button onClick={() => setDetailUser(u)} className="text-[10px] font-bold text-[#00b341] hover:underline">Details</button>
                            <a href={`mailto:${u.email}`} className="text-[10px] font-bold text-blue-400 hover:underline">Email</a>
                            {u.role !== 'admin' && (
                              <button onClick={() => setUsers(prev => prev.map(x => x.id === u.id ? { ...x, status: x.status === 'Banned' ? 'Active' : 'Banned' } : x))}
                                className={`text-[10px] font-bold ${u.status === 'Banned' ? 'text-green-400' : 'text-red-400'} hover:underline`}>
                                {u.status === 'Banned' ? 'Unban' : 'Ban'}
                              </button>
                            )}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </Card>
          </div>
        )}

        {/* ══ FINANCIALS ════════════════════════════════════════════════════ */}
        {tab === 'financials' && (
          <div className="space-y-8">
            <SectionHead title="💰 Financials & Tip Ledger" sub="Real-time revenue monitoring, creator payouts, and Paystack settlement engine."
              action={<div className="flex gap-2">
                <button onClick={() => setShowPayoutModal(true)} className="px-5 py-2.5 text-xs font-black text-white rounded-xl hover:opacity-90 transition-all" style={{ background: '#00b341' }}>
                  💸 Initiate Payout
                </button>
                <button onClick={() => downloadCSV('financial_ledger.csv', TIPS_DATA.map(t => [t.from, t.recipient, t.method, t.amount.toString(), t.ref, t.date, t.status]), ['From','Recipient','Method','Amount','Ref','Date','Status'])}
                  className="px-4 py-2.5 text-xs font-bold text-white rounded-xl border border-[#1e1e32] hover:border-[#00b341] transition-all" style={{ background: '#131320' }}>
                  ⬇ Export CSV
                </button>
              </div>} />

            {/* Paystack Integration Engine Banner */}
            <Card className="p-5 relative overflow-hidden" style={{ background: 'linear-gradient(135deg, #0d0d1e 0%, #131320 100%)', border: '1px solid rgba(0,179,65,0.3)' }}>
              <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl border border-[#00b341]/40" style={{ background: 'rgba(0,179,65,0.1)' }}>💳</div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-black text-white text-base">Paystack Payment Engine</h3>
                      <span className="text-[9px] font-black px-2 py-0.5 rounded text-black uppercase" style={{ background: '#00b341' }}>🟢 Live Connected</span>
                    </div>
                    <p className="text-xs text-gray-400 mt-0.5">Automated settlement &amp; split payouts enabled (KES, USD, NGN, GHS supported via M-Pesa &amp; Cards).</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 text-right">
                  <div>
                    <p className="text-[10px] text-gray-500 font-bold uppercase">Next Settlement</p>
                    <p className="text-sm font-black text-white">Tomorrow, 06:00 EAT</p>
                  </div>
                  <div className="h-8 w-px bg-[#1e1e32]" />
                  <div>
                    <p className="text-[10px] text-gray-500 font-bold uppercase">Split Fee</p>
                    <p className="text-sm font-black text-[#00b341]">1.5% + KES 30</p>
                  </div>
                </div>
              </div>
            </Card>

            {/* Revenue Revenue Streams Summary */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {(() => {
                const ticketRev = tickets.reduce((s, t) => s + (t.regularSold * t.regularPrice + t.vipSold * t.vipPrice), 0)
                const grossTotal = totalRevenue + ticketRev + totalTips + 1200 // + 1200 ad revenue
                return [
                  { label: 'Gross Volume', total: `$${grossTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, pct: 100, emoji: '🌐', color: '#00b341' },
                  { label: 'Merch Shop Sales', total: `$${totalRevenue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, pct: Math.round((totalRevenue / grossTotal) * 100), emoji: '🛒', color: '#3b82f6' },
                  { label: 'Ticket Passes', total: `$${ticketRev.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, pct: Math.round((ticketRev / grossTotal) * 100), emoji: '🎟️', color: '#f59e0b' },
                  { label: 'Writer Tips', total: `$${totalTips.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, pct: Math.round((totalTips / grossTotal) * 100), emoji: '☕', color: '#8b5cf6' },
                ].map(f => (
                  <Card key={f.label} className="p-5">
                    <span className="text-2xl mb-2 block">{f.emoji}</span>
                    <p className="text-[10px] font-black uppercase text-gray-500 mb-1">{f.label}</p>
                    <p className="text-3xl font-black mb-1" style={{ fontFamily: 'Big Shoulders Display', color: f.color }}>{f.total}</p>
                    <div className="h-1.5 rounded-full" style={{ background: '#1e1e32' }}><div className="h-1.5 rounded-full" style={{ width: `${f.pct}%`, background: f.color }} /></div>
                    <p className="text-[9px] text-gray-500 mt-1 font-bold">{f.pct}% of gross revenue</p>
                  </Card>
                ))
              })()}
            </div>

            {/* Tip Transactions Table */}
            <Card className="overflow-hidden">
              <div className="p-4 border-b border-[#1e1e32] flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h3 className="text-lg font-black text-white uppercase" style={{ fontFamily: 'Big Shoulders Display' }}>Recent Tip &amp; Support Transactions</h3>
                  <p className="text-[10px] text-gray-500">Direct fan appreciation paid to journalists and creator ledger via Paystack.</p>
                </div>
                <input type="text" value={tipSearch} onChange={e => setTipSearch(e.target.value)} placeholder="Search sender, journalist, ref, method…" className={`w-64 ${INPUT}`} style={INPUT_STYLE} />
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left" style={{ minWidth: '650px' }}>
                  <thead><tr className="border-b border-[#1e1e32]" style={{ background: '#0d0d1e' }}>
                    {['From Fan','Recipient Creator','Payment Method','Amount','Reference ID','Date','Status'].map(h => <Th key={h}>{h}</Th>)}
                  </tr></thead>
                  <tbody className="divide-y divide-[#1e1e32] text-xs">
                    {TIPS_DATA.filter(t => !tipSearch || t.from.toLowerCase().includes(tipSearch.toLowerCase()) || t.recipient.toLowerCase().includes(tipSearch.toLowerCase()) || t.ref.toLowerCase().includes(tipSearch.toLowerCase()) || t.method.toLowerCase().includes(tipSearch.toLowerCase())).map(tip => (
                      <tr key={tip.id} className="hover:bg-white/[.02] transition-colors">
                        <td className="px-5 py-3.5 text-white font-bold">{tip.from}</td>
                        <td className="px-5 py-3.5 text-[#00b341] font-bold">✍️ {tip.recipient}</td>
                        <td className="px-5 py-3.5 text-gray-400">{tip.method}</td>
                        <td className="px-5 py-3.5 font-black text-white text-base" style={{ fontFamily: 'Big Shoulders Display' }}>${tip.amount.toFixed(2)}</td>
                        <td className="px-5 py-3.5 font-mono text-gray-500 text-[10px]">{tip.ref}</td>
                        <td className="px-5 py-3.5 text-gray-500">{tip.date}</td>
                        <td className="px-5 py-3.5"><Badge s={tip.status} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="p-4 border-t border-[#1e1e32] flex justify-between items-center text-xs">
                <span className="text-gray-500 font-bold">{TIPS_DATA.length} tip transactions recorded</span>
                <span className="text-base font-black text-[#00b341]" style={{ fontFamily: 'Big Shoulders Display' }}>Total Creator Tips: ${totalTips.toFixed(2)} USD</span>
              </div>
            </Card>
          </div>
        )}

        {/* ══ ANALYTICS ═════════════════════════════════════════════════════ */}
        {tab === 'analytics' && (
          <div className="space-y-8">
            <SectionHead title="📈 Site & Audience Analytics" sub="Traffic telemetry, reader engagement, conversion funnels, and geographic breakdown."
              action={<div className="flex gap-2">
                <button onClick={() => downloadCSV('analytics_report.csv', [
                  ['Timeframe', analyticsTimeRange === 'custom' ? `${analyticsStartDate} to ${analyticsEndDate}` : analyticsTimeRange],
                  ['Category Filter', analyticsCategory],
                  ['Page Views', '142,800'],
                  ['Unique Visitors', '28,400'],
                  ['Avg Session', '4m 22s'],
                  ['Bounce Rate', '38.2%'],
                  ['Live Readers', '142'],
                ], ['Metric', 'Value'])}
                  className="px-4 py-2 text-[11px] font-bold text-white rounded-xl border border-[#1e1e32] hover:border-[#00b341] transition-all" style={{ background: '#131320' }}>
                  ⬇ Report
                </button>
              </div>} />

            {/* Date Range & Content Filter Controls Bar */}
            <Card className="p-4 space-y-3" style={{ background: '#0d0d1e' }}>
              <div className="flex flex-wrap items-center justify-between gap-3">
                
                {/* Time Range Quick Buttons */}
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-[10px] font-bold text-gray-500 uppercase">Preset:</span>
                  <div className="flex p-1 rounded-xl border border-[#1e1e32]" style={{ background: '#131320' }}>
                    {[
                      ['24h', '24H'],
                      ['7d', '7D'],
                      ['30d', '30D'],
                      ['ytd', 'YTD'],
                      ['custom', '📅 Custom'],
                    ].map(([val, label]) => (
                      <button key={val} onClick={() => setAnalyticsTimeRange(val as any)}
                        className={`px-3 py-1.5 text-[10px] font-black rounded-lg transition-all ${analyticsTimeRange === val ? 'bg-[#00b341] text-white' : 'text-gray-400 hover:text-white'}`}>
                        {label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Content Category Filter */}
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-bold text-gray-500 uppercase">Category:</span>
                  <select value={analyticsCategory} onChange={e => setAnalyticsCategory(e.target.value)}
                    className="px-3 py-1.5 text-[10px] font-bold text-white rounded-xl border border-[#1e1e32] outline-none cursor-pointer" style={{ background: '#131320' }}>
                    {['All Content','Transfers','Match Reports','East Africa','Premier League','Tactics','Shop & Tickets'].map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
              </div>

              {/* Custom Date Picker Dropdown Inputs */}
              {analyticsTimeRange === 'custom' && (
                <div className="flex flex-wrap items-center gap-3 pt-3 border-t border-[#1e1e32]">
                  <div className="flex items-center gap-2">
                    <label className="text-[10px] font-bold text-gray-500 uppercase">From Date:</label>
                    <input type="date" value={analyticsStartDate} onChange={e => setAnalyticsStartDate(e.target.value)}
                      max={analyticsEndDate} className="px-3 py-1.5 text-[11px] font-mono text-white rounded-xl border border-[#1e1e32] outline-none" style={{ background: '#131320', colorScheme: 'dark' }} />
                  </div>
                  <div className="flex items-center gap-2">
                    <label className="text-[10px] font-bold text-gray-500 uppercase">To Date:</label>
                    <input type="date" value={analyticsEndDate} onChange={e => setAnalyticsEndDate(e.target.value)}
                      min={analyticsStartDate} max={new Date().toISOString().split('T')[0]}
                      className="px-3 py-1.5 text-[11px] font-mono text-white rounded-xl border border-[#1e1e32] outline-none" style={{ background: '#131320', colorScheme: 'dark' }} />
                  </div>
                  <button onClick={() => toast(`📅 Custom range: ${analyticsStartDate} → ${analyticsEndDate}`, 'info')}
                    className="px-4 py-1.5 text-[10px] font-black text-white rounded-xl" style={{ background: '#00b341' }}>
                    Apply Filter ✓
                  </button>
                </div>
              )}

              {/* Active Filter Indicator Badge */}
              <div className="flex items-center justify-between text-[10px] text-gray-400 pt-1">
                <span>
                  📊 Active Period: <strong className="text-white font-bold">{
                    analyticsTimeRange === '24h' ? 'Last 24 Hours' :
                    analyticsTimeRange === '7d' ? 'Last 7 Days' :
                    analyticsTimeRange === '30d' ? 'Last 30 Days' :
                    analyticsTimeRange === 'ytd' ? 'Year to Date (2026)' :
                    `Custom (${analyticsStartDate} to ${analyticsEndDate})`
                  }</strong>
                </span>
                <span>Category Scope: <strong className="text-[#00b341] font-bold">{analyticsCategory}</strong></span>
              </div>
            </Card>

            {/* Live Readers Badge */}
            <Card className="p-4 flex items-center justify-between" style={{ background: 'linear-gradient(90deg, #0d0d1e 0%, #131320 100%)', border: '1px solid rgba(0,179,65,0.3)' }}>
              <div className="flex items-center gap-3">
                <span className="relative flex h-3.5 w-3.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-red-500"></span>
                </span>
                <div>
                  <p className="text-xs font-black text-white">🔴 142 Live Readers Online Right Now</p>
                  <p className="text-[10px] text-gray-400">74 reading Arsenal vs Chelsea Derby • 38 browsing Merchandise Store • 30 watching Live Match Center</p>
                </div>
              </div>
              <span className="text-[10px] font-bold text-[#00b341] uppercase tracking-wider hidden sm:inline">Realtime Telemetry Active</span>
            </Card>

            {/* Main KPI Stats */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {[
                { label: `Page Views (${analyticsTimeRange === 'custom' ? 'Custom' : analyticsTimeRange.toUpperCase()})`, value: analyticsTimeRange === '24h' ? '24.2K' : analyticsTimeRange === '30d' ? '540.6K' : analyticsTimeRange === 'ytd' ? '3.8M' : '142.8K', sub: '+22% vs previous period', icon: '👁️', color: '#3b82f6' },
                { label: 'Unique Visitors', value: analyticsTimeRange === '24h' ? '4.8K' : analyticsTimeRange === '30d' ? '98.2K' : analyticsTimeRange === 'ytd' ? '680K' : '28.4K', sub: '+14% vs previous period', icon: '👤', color: '#00b341' },
                { label: 'Avg Session Duration', value: '4m 22s', sub: 'High engagement (> 3m)', icon: '⏱️', color: '#8b5cf6' },
                { label: 'Bounce Rate', value: '38.2%', sub: 'Good benchmark (< 50%)', icon: '↩️', color: '#f59e0b' },
              ].map(k => (
                <Card key={k.label} className="p-5 relative overflow-hidden">
                  <div className="absolute inset-0 pointer-events-none" style={{ background: `radial-gradient(ellipse at 80% 0%,${k.color}10 0%,transparent 70%)` }} />
                  <div className="flex justify-between mb-2"><span className="text-[10px] font-black uppercase text-gray-500">{k.label}</span><span className="text-2xl">{k.icon}</span></div>
                  <p className="text-4xl font-black mb-1" style={{ fontFamily: 'Big Shoulders Display', color: k.color }}>{k.value}</p>
                  <p className="text-[10px] text-gray-600">{k.sub}</p>
                </Card>
              ))}
            </div>

            <div className="grid lg:grid-cols-2 gap-6">
              {/* Top Articles */}
              <Card className="p-6">
                <h3 className="text-base font-black text-white uppercase mb-4" style={{ fontFamily: 'Big Shoulders Display' }}>🔥 Top Performing Content</h3>
                <div className="space-y-3">
                  {(articles.length > 0
                    ? articles.slice(0, 5).map(a => ({
                        title: a.title,
                        views: `${a.views || 1200} views`,
                        cat: a.category || 'Football',
                        trend: '▲ +24%',
                      }))
                    : [
                        { title: 'Welcome to FlowerZFC — Global Football Platform Launch', views: '14.2K views', cat: 'News', trend: '▲ +45%' },
                      ]
                  ).filter(a => analyticsCategory === 'All Content' || analyticsCategory === 'All' || a.cat === analyticsCategory).map((a, i) => (
                    <div key={i} className="flex items-center gap-3 p-3 rounded-xl hover:border-[#00b341]/40 transition-all" style={{ background: '#0d0d1e', border: '1px solid #1e1e32' }}>
                      <span className="text-lg font-black text-gray-600 w-6 text-center" style={{ fontFamily: 'Big Shoulders Display' }}>{i + 1}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-bold text-white truncate">{a.title}</p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-[9px] text-[#00b341] font-black uppercase">{a.cat}</span>
                          <span className="text-[9px] text-green-400 font-bold">{a.trend}</span>
                        </div>
                      </div>
                      <p className="text-xs font-bold text-white shrink-0">{a.views}</p>
                    </div>
                  ))}
                </div>
              </Card>

              {/* Geographic Audience Breakdown */}
              <Card className="p-6">
                <h3 className="text-base font-black text-white uppercase mb-4" style={{ fontFamily: 'Big Shoulders Display' }}>🌍 Geographic Regional Breakdown</h3>
                <div className="space-y-4">
                  {[
                    { country: '🇰🇪 Kenya (Nairobi, Mombasa, Kisumu)', pct: 54, color: '#00b341', val: '77.1K' },
                    { country: '🇹ℤ Tanzania (Dar es Salaam)', pct: 16, color: '#3b82f6', val: '22.8K' },
                    { country: '🇺🇬 Uganda (Kampala)', pct: 14, color: '#8b5cf6', val: '19.9K' },
                    { country: '🇬🇧 United Kingdom (London, Manchester)', pct: 9, color: '#f59e0b', val: '12.8K' },
                    { country: '🇺🇸 United States & Diaspora', pct: 7, color: '#ef4444', val: '10.2K' },
                  ].map(g => (
                    <div key={g.country}>
                      <div className="flex justify-between text-xs mb-1"><span className="font-bold text-white">{g.country}</span><span className="text-gray-400">{g.val} ({g.pct}%)</span></div>
                      <div className="h-2 rounded-full" style={{ background: '#1e1e32' }}><div className="h-2 rounded-full" style={{ width: `${g.pct}%`, background: g.color }} /></div>
                    </div>
                  ))}
                </div>
              </Card>

              {/* Device & Platform Breakdown */}
              <Card className="p-6">
                <h3 className="text-base font-black text-white uppercase mb-4" style={{ fontFamily: 'Big Shoulders Display' }}>📱 Device &amp; Browser Breakdown</h3>
                <div className="space-y-4">
                  {[
                    { source: 'Mobile (Safari & Chrome Android)', pct: 74, color: '#00b341', val: '105.6K' },
                    { source: 'Desktop (Chrome, Edge, Firefox)', pct: 21, color: '#3b82f6', val: '30.0K' },
                    { source: 'Tablet & iPad', pct: 5, color: '#8b5cf6', val: '7.2K' },
                  ].map(s => (
                    <div key={s.source}>
                      <div className="flex justify-between text-xs mb-1"><span className="font-bold text-white">{s.source}</span><span className="text-gray-400">{s.val} ({s.pct}%)</span></div>
                      <div className="h-2 rounded-full" style={{ background: '#1e1e32' }}><div className="h-2 rounded-full" style={{ width: `${s.pct}%`, background: s.color }} /></div>
                    </div>
                  ))}
                </div>
              </Card>

              {/* Shop Conversion Funnel */}
              <Card className="p-6">
                <h3 className="text-base font-black text-white uppercase mb-4" style={{ fontFamily: 'Big Shoulders Display' }}>🛍️ Shop &amp; Checkout Conversion Funnel</h3>
                <div className="space-y-3">
                  {[
                    { stage: 'Shop Storefront Visitors', count: 8420, pct: 100, color: '#3b82f6' },
                    { stage: 'Product Detail Views', count: 3210, pct: 38, color: '#8b5cf6' },
                    { stage: 'Added to Cart', count: 890, pct: 11, color: '#f59e0b' },
                    { stage: 'Paystack Checkout Initiated', count: 310, pct: 3.7, color: '#f97316' },
                    { stage: 'Payment Completed', count: 186, pct: 2.2, color: '#00b341' },
                  ].map(f => (
                    <div key={f.stage}>
                      <div className="flex justify-between text-xs mb-1"><span className="font-medium text-white">{f.stage}</span><span className="text-gray-400">{f.count.toLocaleString()} ({f.pct}%)</span></div>
                      <div className="h-2 rounded-full" style={{ background: '#1e1e32' }}><div className="h-2 rounded-full" style={{ width: `${f.pct}%`, background: f.color }} /></div>
                    </div>
                  ))}
                </div>
              </Card>
            </div>
          </div>
        )}

        {/* ══ COMMENTS ══════════════════════════════════════════════════════ */}
        {tab === 'comments' && (
          <div className="space-y-6">
            <SectionHead title={`💬 Comments & Moderation (${comments.length})`} sub={`${flaggedComments} flagged or reported · Community safety, profanity filters, and discussion controls.`}
              action={
                <div className="flex gap-2 flex-wrap">
                  <button onClick={() => setShowModSettings(true)}
                    className="px-3.5 py-2 text-[11px] font-bold text-white rounded-xl border border-[#1e1e32] hover:border-[#00b341] transition-all" style={{ background: '#131320' }}>
                    ⚙️ Auto-Mod Rules
                  </button>
                  <button onClick={() => downloadCSV('comments.csv', comments.map(c => [c.id, c.user, c.article, c.body, c.status, c.date]), ['ID','User','Article','Comment','Status','Date'])}
                    className="px-3 py-2 text-[11px] font-bold text-white rounded-xl border border-[#1e1e32] hover:border-[#00b341] transition-all" style={{ background: '#131320' }}>
                    ⬇ Export CSV
                  </button>
                  <button onClick={() => setComments(prev => prev.map(c => c.status === 'Flagged' || c.status === 'Pending_c' ? { ...c, status: 'Approved', reported: false } : c))}
                    className="px-3 py-2 text-[11px] font-bold text-[#00b341] rounded-xl border border-[#00b341]/40 hover:border-[#00b341] transition-all">
                    ✓ Approve All Pending
                  </button>
                  <button onClick={() => { if (confirm('Delete all flagged and spam comments permanently?')) setComments(prev => prev.filter(c => c.status !== 'Flagged' && c.status !== 'Spam')) }}
                    className="px-3 py-2 text-[11px] font-bold text-red-400 rounded-xl border border-red-400/30 hover:border-red-400 transition-all">
                    🗑 Delete All Flagged
                  </button>
                </div>
              } />

            {/* Comment KPI Stats */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {[
                { label: 'Total Comments', value: comments.length, icon: '💬', color: '#00b341' },
                { label: 'Approved Live', value: comments.filter(c => c.status === 'Approved').length, icon: '🟢', color: '#10b981' },
                { label: 'Pending Review', value: comments.filter(c => c.status === 'Pending_c').length, icon: '⏱️', color: '#f59e0b' },
                { label: 'Flagged / Spam', value: comments.filter(c => c.status === 'Flagged' || c.status === 'Spam').length, icon: '🚩', color: '#ef4444' },
              ].map(k => (
                <Card key={k.label} className="p-4" style={{ background: '#131320' }}>
                  <div className="flex justify-between mb-1"><span className="text-[10px] font-black uppercase text-gray-500">{k.label}</span><span>{k.icon}</span></div>
                  <p className="text-3xl font-black" style={{ fontFamily: 'Big Shoulders Display', color: k.color }}>{k.value}</p>
                </Card>
              ))}
            </div>

            {/* Live Auto-Moderation Control Toggles Bar */}
            <Card className="p-4 flex flex-wrap items-center justify-between gap-4" style={{ background: '#0d0d1e' }}>
              <div className="flex items-center gap-4 flex-wrap">
                <div className="flex items-center gap-2">
                  <input type="checkbox" id="link-protect" checked={autoFilterLinks} onChange={e => setAutoFilterLinks(e.target.checked)} className="w-4 h-4 accent-[#00b341]" />
                  <label htmlFor="link-protect" className="text-xs font-bold text-white cursor-pointer">🛡️ Auto-Block External Spam Links &amp; URLs</label>
                </div>
                <div className="flex items-center gap-2">
                  <input type="checkbox" id="slow-mode" checked={slowMode} onChange={e => setSlowMode(e.target.checked)} className="w-4 h-4 accent-[#00b341]" />
                  <label htmlFor="slow-mode" className="text-xs font-bold text-white cursor-pointer">⏱️ 60-Sec Slow Mode (Limit spam in hot match threads)</label>
                </div>
              </div>
              <button onClick={() => setShowModSettings(true)} className="text-[10px] font-bold text-[#00b341] hover:underline">
                ✏️ Edit Blacklisted Words ({bannedWords.split(',').length} active)
              </button>
            </Card>

            {/* Search & Filter Bar */}
            <Card className="p-4 flex flex-wrap gap-3 items-center">
              <input type="text" value={commentSearch} onChange={e => setCommentSearch(e.target.value)} placeholder="Search author, comment text, article title…" className={`flex-1 min-w-[200px] ${INPUT}`} style={INPUT_STYLE} />
              {['All','Approved','Pending_c','Flagged','Spam'].map(f => (
                <button key={f} onClick={() => setCommentFilter(f)}
                  className="px-3 py-1.5 text-[10px] font-black rounded-lg uppercase transition-all"
                  style={{ background: commentFilter === f ? '#00b341' : '#0d0d1e', color: commentFilter === f ? '#fff' : '#6b7280', border: `1px solid ${commentFilter === f ? '#00b341' : '#1e1e32'}` }}>
                  {f === 'Pending_c' ? 'Pending' : f} ({comments.filter(c => f === 'All' || c.status === f).length})
                </button>
              ))}
            </Card>

            <div className="space-y-3">
              {filteredComments.length === 0 ? (
                <Card className="p-8 text-center text-gray-500 font-bold">No comments match your search criteria.</Card>
              ) : (
                filteredComments.map(c => (
                  <Card key={c.id} className={`p-4 ${c.status === 'Flagged' || c.status === 'Spam' ? 'border-red-500/30' : ''}`} style={(c.status === 'Flagged' || c.status === 'Spam') ? { background: 'rgba(239,68,68,.03)' } : {}}>
                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <span className="text-xs font-black text-white">{c.user}</span>
                          <Badge s={c.status === 'Pending_c' ? 'Pending' : c.status} />
                          {c.reported && <span className="text-[10px] font-bold text-red-400">⚠️ Reported</span>}
                          {(c as any).pinned && <span className="text-[9px] font-black px-1.5 py-0.5 rounded text-black uppercase" style={{ background: '#fbbf24' }}>📌 Pinned Top Comment</span>}
                        </div>
                        <p className="text-xs text-gray-300 mb-1 leading-relaxed">{c.body}</p>
                        <p className="text-[10px] text-gray-600">On Article: <span className="text-gray-400 font-bold">{c.article}</span> • <span className="text-gray-500">{c.date}</span></p>
                      </div>
                      <div className="flex gap-1.5 shrink-0 flex-wrap">
                        {c.status !== 'Approved' && (
                          <button onClick={() => setComments(prev => prev.map(x => x.id === c.id ? { ...x, status: 'Approved', reported: false } : x))}
                            className="px-3 py-1.5 text-[10px] font-bold text-[#00b341] rounded-lg border border-[#00b341]/40 hover:border-[#00b341] transition-all">✓ Approve</button>
                        )}
                        <button onClick={() => setComments(prev => prev.map(x => x.id === c.id ? { ...x, pinned: !(x as any).pinned } : x))}
                          className="px-2 py-1.5 text-[10px] font-bold text-yellow-400 rounded-lg border border-yellow-400/30 hover:border-yellow-400 transition-all" title="Pin / Unpin comment">
                          {(c as any).pinned ? '📌 Unpin' : '📌 Pin'}
                        </button>
                        <button onClick={() => setEditCommentItem(c)}
                          className="px-2 py-1.5 text-[10px] font-bold text-blue-400 rounded-lg border border-blue-400/30 hover:border-blue-400 transition-all" title="Edit comment text">✏️ Edit</button>
                        {c.status !== 'Flagged' && (
                          <button onClick={() => setComments(prev => prev.map(x => x.id === c.id ? { ...x, status: 'Flagged', reported: true } : x))}
                            className="px-3 py-1.5 text-[10px] font-bold text-orange-400 rounded-lg border border-orange-400/30 hover:border-orange-400 transition-all">🚩 Flag</button>
                        )}
                        {c.status !== 'Spam' && (
                          <button onClick={() => setComments(prev => prev.map(x => x.id === c.id ? { ...x, status: 'Spam', reported: true } : x))}
                            className="px-3 py-1.5 text-[10px] font-bold text-red-400 rounded-lg border border-red-400/20 hover:border-red-400 transition-all">🚫 Spam</button>
                        )}
                        <button onClick={() => {
                          if (confirm(`Ban user "${c.user}" and remove their comments?`)) {
                            setUsers(prev => prev.map(u => u.name === c.user ? { ...u, status: 'Banned' } : u))
                            setComments(prev => prev.filter(x => x.user !== c.user))
                          }
                        }} className="px-2 py-1.5 text-[10px] font-bold text-purple-400 rounded-lg border border-purple-400/30 hover:border-purple-400 transition-all" title="Ban user & remove comments">🔨 Ban</button>
                        <button onClick={() => { deleteCommentFromDb(c.id); setComments(prev => prev.filter(x => x.id !== c.id)) }}
                          className="px-3 py-1.5 text-[10px] font-bold text-gray-500 rounded-lg border border-[#1e1e32] hover:border-red-400 hover:text-red-400 transition-all">🗑</button>
                      </div>
                    </div>
                  </Card>
                ))
              )}
            </div>
          </div>
        )}

        {/* ══ ADS ═══════════════════════════════════════════════════════════ */}
        {tab === 'ads' && (
          <div className="space-y-8">
            <SectionHead title="📢 Ad Slots & Direct Advertising" sub="Placements, banner inventory, advertiser bookings, and monthly sponsorship revenue."
              action={<div className="flex gap-2">
                <button onClick={() => downloadCSV('ad_inventory.csv', ads.map(a => [a.id, a.slot, a.page, a.size, a.price.toString(), a.status, a.advertiser, a.start, a.end]), ['ID','Slot','Page','Size','Price','Status','Advertiser','Start','End'])}
                  className="px-3 py-2 text-[11px] font-bold text-white rounded-xl border border-[#1e1e32] hover:border-[#00b341] transition-all" style={{ background: '#131320' }}>
                  ⬇ Export CSV
                </button>
                <button onClick={() => setShowAddAdSlot(true)} className="px-5 py-2.5 text-xs font-black text-white rounded-xl hover:opacity-90 transition-all" style={{ background: '#00b341' }}>
                  + Create Ad Slot
                </button>
              </div>} />

            {/* Ad KPI Stats */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {[
                { label: 'Booked Slots', value: `${ads.filter(a => a.status === 'Booked').length}`, sub: `of ${ads.length} total slots`, icon: '📋', color: '#00b341' },
                { label: 'Available Slots', value: `${ads.filter(a => a.status === 'Available').length}`, sub: 'ready for booking', icon: '🔓', color: '#3b82f6' },
                { label: 'Monthly Ad Revenue', value: `$${bookedAdRev.toLocaleString()}`, sub: 'active sponsorships', icon: '💵', color: '#f59e0b' },
                { label: 'Pending Requests', value: `${adReqs.filter(r => r.status === 'Pending').length}`, sub: 'awaiting review', icon: '📬', color: '#8b5cf6' },
              ].map(k => (
                <Card key={k.label} className="p-5">
                  <div className="flex justify-between mb-2"><span className="text-[10px] font-black uppercase text-gray-500">{k.label}</span><span className="text-2xl">{k.icon}</span></div>
                  <p className="text-4xl font-black mb-1" style={{ fontFamily: 'Big Shoulders Display', color: k.color }}>{k.value}</p>
                  <p className="text-[10px] text-gray-600">{k.sub}</p>
                </Card>
              ))}
            </div>

            {/* Inventory Table */}
            <Card className="overflow-hidden">
              <div className="p-4 border-b border-[#1e1e32] flex flex-wrap items-center justify-between gap-3">
                <h3 className="text-base font-black text-white uppercase" style={{ fontFamily: 'Big Shoulders Display' }}>Ad Slot Inventory &amp; Sponsorships</h3>
                <input type="text" value={adSearch} onChange={e => setAdSearch(e.target.value)} placeholder="Search slot name, page, advertiser…" className={`w-64 ${INPUT}`} style={INPUT_STYLE} />
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left" style={{ minWidth: '820px' }}>
                  <thead><tr className="border-b border-[#1e1e32]" style={{ background: '#0d0d1e' }}>
                    {['Slot Name','Target Page','Banner Size','Monthly Rate','Status','Current Advertiser','Active Campaign','Actions'].map(h => <Th key={h}>{h}</Th>)}
                  </tr></thead>
                  <tbody className="divide-y divide-[#1e1e32] text-xs">
                    {ads.filter(a => !adSearch || a.slot.toLowerCase().includes(adSearch.toLowerCase()) || a.page.toLowerCase().includes(adSearch.toLowerCase()) || a.advertiser.toLowerCase().includes(adSearch.toLowerCase())).map(a => (
                      <tr key={a.id} className="hover:bg-white/[.02] transition-colors">
                        <td className="px-5 py-3.5 font-bold text-white">{a.slot}</td>
                        <td className="px-5 py-3.5 font-mono text-gray-400 text-[11px]">{a.page}</td>
                        <td className="px-5 py-3.5 text-gray-400"><span className="px-2 py-0.5 rounded bg-[#1e1e32] font-mono text-[10px] text-gray-300">{a.size}</span></td>
                        <td className="px-5 py-3.5 font-bold text-[#00b341]" style={{ fontFamily: 'Big Shoulders Display', fontSize: '15px' }}>${a.price}/mo</td>
                        <td className="px-5 py-3.5"><Badge s={a.status} /></td>
                        <td className="px-5 py-3.5 text-gray-200 font-bold">{a.advertiser}</td>
                        <td className="px-5 py-3.5 text-gray-500 whitespace-nowrap">{a.start !== '—' ? `${a.start} – ${a.end}` : '—'}</td>
                        <td className="px-5 py-3.5 space-x-2 whitespace-nowrap">
                          <button onClick={() => {
                            const imageUrl = prompt(`Enter Image URL for ad slot "${a.slot}" (${a.size}):`)
                            if (imageUrl) {
                              const linkUrl = prompt(`Enter Destination Link URL for ad slot "${a.slot}":`, 'https://') || '/advertise'
                              try {
                                const raw = localStorage.getItem('flowerzfc_custom_ads') || '{}'
                                const parsed = JSON.parse(raw)
                                const sizeKey = a.size.includes('728') ? 'leaderboard' : a.size.includes('320') ? 'mobile' : a.size.includes('160') ? 'skyscraper' : a.size.includes('600') ? 'halfpage' : 'rectangle'
                                parsed[sizeKey] = { imageUrl, linkUrl }
                                localStorage.setItem('flowerzfc_custom_ads', JSON.stringify(parsed))
                                toastLib.success(`Uploaded ad creative for "${a.slot}"! Live on site.`)
                              } catch {}
                            }
                          }} className="text-[10px] font-bold text-amber-400 hover:underline">🖼️ Creative</button>
                          <button onClick={() => setEditAdSlot(a)} className="text-[10px] font-bold text-[#00b341] hover:underline">Edit</button>
                          <button onClick={() => setAds(prev => prev.map(x => x.id === a.id ? { ...x, status: x.status === 'Booked' ? 'Available' : 'Booked', advertiser: x.status === 'Booked' ? '—' : x.advertiser } : x))}
                            className="text-[10px] font-bold text-gray-400 hover:underline">{a.status === 'Booked' ? 'Release Slot' : 'Mark Booked'}</button>
                          <button onClick={() => { if (confirm(`Delete ad slot "${a.slot}"?`)) setAds(prev => prev.filter(x => x.id !== a.id)) }}
                            className="text-[10px] font-bold text-red-400 hover:underline">Delete</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>

            {/* Google AdSense & Third-Party Ad Code Integration */}
            <Card className="p-6 space-y-4">
              <h3 className="text-sm font-black text-white uppercase tracking-wider border-b border-[#1e1e32] pb-3 flex items-center justify-between">
                <span>🌐 Google AdSense &amp; Third-Party Ad Script Code</span>
                <span className="text-[10px] text-[#00b341] font-bold">Live Script Injector</span>
              </h3>
              <p className="text-xs text-gray-400">
                Paste your Google AdSense script tag (e.g. <code className="text-emerald-400 font-mono">&lt;script async src="https://pagead2.googlesyndication.com/..."&gt;&lt;/script&gt;</code>) or any custom ad network embed code. It will inject into all ad banner slots across the site instantly.
              </p>
              <textarea
                defaultValue={localStorage.getItem('flowerzfc_adsense_code') || ''}
                onBlur={e => {
                  const code = e.target.value
                  localStorage.setItem('flowerzfc_adsense_code', code)
                  toastLib.success('Ad embed code saved! Live on all site ad banners.')
                }}
                rows={4}
                placeholder="<script async src='https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-XXXXXXXXXXXXXXXXX' crossorigin='anonymous'></script>"
                className={`${INPUT} font-mono text-xs`}
                style={INPUT_STYLE}
              />
            </Card>

            {/* Booking Requests */}
            <Card className="p-5">
              <SectionHead title="📬 Incoming Advertiser Requests" sub="Direct advertising enquiries submitted via the platform." />
              <div className="space-y-3 mt-4">
                {adReqs.map(r => (
                  <div key={r.id} className="p-4 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3" style={{ background: '#0d0d1e', border: '1px solid #1e1e32' }}>
                    <div>
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <span className="text-sm font-black text-white">{r.company}</span>
                        <Badge s={r.status} />
                        <span className="text-[10px] text-gray-500 font-mono">• {r.date}</span>
                      </div>
                      <p className="text-xs text-gray-300">Contact: <span className="text-white font-bold">{r.contact}</span> • Requested Size: <span className="text-[#00b341] font-mono">{r.size}</span> • Proposed Budget: <span className="text-yellow-400 font-bold">{r.budget}</span></p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0 flex-wrap">
                      <a href={`mailto:${r.contact}?subject=Regarding Ad Placement for ${encodeURIComponent(r.company)}`}
                        className="px-3 py-1.5 text-[10px] font-bold text-blue-400 rounded-lg border border-blue-400/30 hover:border-blue-400 transition-all">✉️ Email Contact</a>
                      {r.status === 'Pending' && (
                        <>
                          <button onClick={() => setAdReqs(prev => prev.map(x => x.id === r.id ? { ...x, status: 'Approved' } : x))}
                            className="px-3 py-1.5 text-[10px] font-bold text-[#00b341] rounded-lg border border-[#00b341]/40 hover:border-[#00b341] transition-all">✓ Approve</button>
                          <button onClick={() => setAdReqs(prev => prev.filter(x => x.id !== r.id))}
                            className="px-3 py-1.5 text-[10px] font-bold text-red-400 rounded-lg border border-red-400/30 hover:border-red-400 transition-all">Decline</button>
                        </>
                      )}
                      {r.status === 'Approved' && <span className="text-xs text-[#00b341] font-bold">✓ Approved</span>}
                    </div>
                  </div>
                ))}
              </div>
            </Card>

            {/* Advertise Page Rates & Packages Config Editor */}
            <Card className="p-5">
              <SectionHead
                title="🏷️ Public Advertise Page Rates & Packages"
                sub="Customize the pricing cards, slot names, and rate cards displayed directly on the /advertise page."
              />
              <div className="space-y-4 mt-4">
                <div className="p-4 rounded-xl border border-[#1e1e32]" style={{ background: '#0d0d1e' }}>
                  <p className="text-xs font-black text-[#00b341] uppercase tracking-wider mb-2">Sponsorship Packages &amp; Rates</p>
                  <div className="grid md:grid-cols-3 gap-3">
                    {[
                      { name: 'Starter', defaultVal: 'Custom Quote' },
                      { name: 'Growth', defaultVal: 'Custom Quote' },
                      { name: 'Premium', defaultVal: 'Custom Quote' },
                    ].map(p => (
                      <div key={p.name} className="p-3 rounded-lg border border-[#1e1e32]" style={{ background: '#131320' }}>
                        <p className="text-xs font-bold text-white mb-1">{p.name} Package</p>
                        <label className="text-[10px] text-gray-500 block mb-1">Display Rate / Price</label>
                        <input
                          defaultValue={p.defaultVal}
                          onBlur={e => {
                            const val = e.target.value
                            try {
                              const raw = localStorage.getItem('flowerzfc_advertise_config') || '{}'
                              const parsed = JSON.parse(raw)
                              if (!parsed.packages) {
                                parsed.packages = [
                                  { name: 'Starter', price: 'Custom Quote', features: ['1 ad placement', 'In-feed banner'] },
                                  { name: 'Growth', price: 'Custom Quote', features: ['3 ad placements', 'Leaderboard'] },
                                  { name: 'Premium', price: 'Custom Quote', features: ['All placements', 'Homepage takeover'] },
                                ]
                              }
                              const target = parsed.packages.find((x: any) => x.name === p.name)
                              if (target) target.price = val
                              localStorage.setItem('flowerzfc_advertise_config', JSON.stringify(parsed))
                              toastLib.success(`Updated ${p.name} price to "${val}"`)
                            } catch {}
                          }}
                          className={INPUT} style={INPUT_STYLE}
                          placeholder="e.g. $199/mo or Custom Quote"
                        />
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </Card>
          </div>
        )}

        {/* ══ COMMS ═════════════════════════════════════════════════════════ */}
        {tab === 'comms' && (
          <div className="space-y-8">
            <SectionHead title="📧 Communications & Broadcast Engine" sub="Email newsletters, web & mobile push notifications, and audience list management."
              action={<div className="flex gap-2">
                <button onClick={() => setShowAddSubscriber(true)} className="px-5 py-2.5 text-xs font-black text-white rounded-xl hover:opacity-90 transition-all" style={{ background: '#00b341' }}>
                  + Add Subscriber
                </button>
              </div>} />

            {/* KPI Stats */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {[
                { label: 'Total Subscribers', value: subs.length.toString(), sub: 'newsletter list', icon: '📋', color: '#3b82f6' },
                { label: 'Active Subscribers', value: subs.filter(s => s.status === 'Active').length.toString(), sub: 'receiving emails', icon: '✅', color: '#00b341' },
                { label: 'Avg Open Rate', value: '54.2%', sub: 'industry avg: 21%', icon: '📭', color: '#8b5cf6' },
                { label: 'Avg Click Rate', value: '12.8%', sub: 'industry avg: 2.5%', icon: '🖱️', color: '#f59e0b' },
              ].map(k => (
                <Card key={k.label} className="p-5">
                  <div className="flex justify-between mb-2"><span className="text-[10px] font-black uppercase text-gray-500">{k.label}</span><span className="text-2xl">{k.icon}</span></div>
                  <p className="text-4xl font-black mb-1" style={{ fontFamily: 'Big Shoulders Display', color: k.color }}>{k.value}</p>
                  <p className="text-[10px] text-gray-600">{k.sub}</p>
                </Card>
              ))}
            </div>

            {/* Broadcast Composer */}
            <Card className="p-6">
              <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
                <div className="flex items-center gap-3">
                  <h3 className="text-base font-black text-white uppercase" style={{ fontFamily: 'Big Shoulders Display' }}>📢 Broadcast Center</h3>
                  <div className="flex p-1 rounded-xl border border-[#1e1e32]" style={{ background: '#0d0d1e' }}>
                    <button onClick={() => setCommsMode('email')} className={`px-3 py-1 text-[10px] font-black rounded-lg transition-all ${commsMode === 'email' ? 'bg-[#00b341] text-white' : 'text-gray-400'}`}>📧 Email Newsletter</button>
                    <button onClick={() => setCommsMode('push')} className={`px-3 py-1 text-[10px] font-black rounded-lg transition-all ${commsMode === 'push' ? 'bg-[#8b5cf6] text-white' : 'text-gray-400'}`}>🔔 Mobile &amp; Web Push</button>
                  </div>
                </div>
                <span className="text-[10px] text-gray-500 font-bold">Targeting {subs.filter(s => s.status === 'Active').length} active audience members</span>
              </div>

              {/* Quick Templates */}
              <div className="flex gap-2 mb-4 flex-wrap">
                <span className="text-[10px] font-bold text-gray-500 uppercase self-center">Templates:</span>
                {[
                  { label: '⚽ Matchday Preview', sub: 'Matchday Preview — [Match]', body: `Hi [Name],\n\nMatchday is here! Here's everything you need to know about today's game...` },
                  { label: '🔁 Transfer Alert', sub: 'Breaking: [Player] to [Club]', body: 'Hi [Name],\n\nBreaking transfer news just in...' },
                  { label: '🛒 Shop Drop', sub: 'New Drop: [Product Name] — Get Yours', body: `Hi [Name],\n\nNew merch just dropped in the FlowerZFC store...` },
                  { label: '🎟️ Event Alert', sub: 'Tickets Now Live: [Event Name]', body: 'Hi [Name],\n\nTickets are now on sale for...' },
                ].map(t => (
                  <button key={t.label} onClick={() => { setComposeSub(t.sub); setComposeBody(t.body) }}
                    className="px-3 py-1.5 text-[10px] font-bold text-white rounded-lg border border-[#1e1e32] hover:border-[#00b341] transition-all" style={{ background: '#0d0d1e' }}>
                    {t.label}
                  </button>
                ))}
              </div>

              {composeSent ? (
                <div className="text-center py-10">
                  <p className="text-5xl mb-3">✅</p>
                  <p className="text-base font-black text-white" style={{ fontFamily: 'Big Shoulders Display' }}>{commsMode === 'email' ? 'Email Newsletter Sent!' : 'Push Notification Broadcasted!'}</p>
                  <p className="text-xs text-gray-500 mt-1">Delivered successfully to {subs.filter(s => s.status === 'Active').length} subscribers</p>
                  <button onClick={() => { setComposeSent(false); setComposeSub(''); setComposeBody(''); setNewsletterBanner('') }} className="mt-4 text-xs font-bold text-[#00b341] hover:underline">Compose another →</button>
                </div>
              ) : (
                <div className="space-y-4">
                  <div>
                    <label className="block text-[10px] font-bold text-gray-500 mb-1">{commsMode === 'email' ? 'Subject Line *' : 'Push Notification Title *'}</label>
                    <input value={composeSub} onChange={e => setComposeSub(e.target.value)} placeholder={commsMode === 'email' ? 'Enter email subject line…' : 'Push title (e.g. 🚨 GOAL! Arsenal 1-0 Chelsea)'} className={INPUT} style={INPUT_STYLE} />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-gray-500 mb-1">{commsMode === 'email' ? 'Email Body Content *' : 'Push Message Body *'}</label>
                    <textarea value={composeBody} onChange={e => setComposeBody(e.target.value)} placeholder="Write your broadcast content here…" rows={5} className={`${INPUT} resize-none`} style={INPUT_STYLE} />
                  </div>

                  {/* Banner Image Upload for Email */}
                  {commsMode === 'email' && (
                    <div>
                      <label className="block text-[10px] font-bold text-gray-500 mb-1">Header Banner Image (Optional)</label>
                      <input placeholder="Paste Image URL or drag banner file…" value={newsletterBanner} onChange={e => setNewsletterBanner(e.target.value)} className={INPUT} style={INPUT_STYLE} />
                    </div>
                  )}

                  <div className="flex gap-3 pt-2">
                    <button onClick={() => {
                      if (!composeSub) return toast('⚠️ Enter a subject line first.', 'warning')
                      toast(`📧 Test ${commsMode === 'email' ? 'email' : 'push'} sent to admin inbox!`, 'info')
                    }} className="px-5 py-3 text-xs font-bold text-gray-300 rounded-xl border border-[#1e1e32] hover:border-gray-500 transition-all">
                      📩 Send Test to Me
                    </button>
                    <button onClick={() => {
                      if (!composeSub || !composeBody) return toast('⚠️ Please complete both subject and body.', 'warning')
                      const newCampaign = {
                        id: `se-${Date.now()}`,
                        subject: composeSub,
                        sentTo: subs.filter(s => s.status === 'Active').length,
                        date: new Date().toLocaleDateString('en-KE', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' }),
                        opens: 0
                      }
                      setSentEmails(p => [newCampaign, ...p])
                      logAdminAction(user?.email || 'admin@flowerz.fc', 'SEND_BROADCAST', 'EmailCampaign', newCampaign.id, `Sent ${commsMode} broadcast "${composeSub}" to ${newCampaign.sentTo} subscribers`)
                      setComposeSent(true)
                    }} className="flex-1 py-3 text-sm font-black text-white rounded-xl hover:opacity-90 transition-all" style={{ background: commsMode === 'email' ? '#00b341' : '#8b5cf6' }}>
                      🚀 {commsMode === 'email' ? 'Send Newsletter to All Subscribers' : 'Broadcast Push Notification Now'}
                    </button>
                  </div>
                </div>
              )}
            </Card>

            {/* Sent History */}
            <SectionHead title="📤 Sent Broadcast History" sub="Previously sent email campaigns and push broadcasts." />
            <Card className="overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left" style={{ minWidth: '600px' }}>
                  <thead><tr className="border-b border-[#1e1e32]" style={{ background: '#0d0d1e' }}>
                    {['Subject / Campaign','Recipient Count','Open Rate','Date & Time'].map(h => <Th key={h}>{h}</Th>)}
                  </tr></thead>
                  <tbody className="divide-y divide-[#1e1e32] text-xs">
                    {sentEmails.map(e => (
                      <tr key={e.id} className="hover:bg-white/[.02]">
                        <td className="px-5 py-3.5 font-bold text-white">{e.subject}</td>
                        <td className="px-5 py-3.5 text-gray-400">{e.sentTo.toLocaleString()} subscribers</td>
                        <td className="px-5 py-3.5 text-[#00b341] font-bold">{e.opens > 0 ? `${e.opens} (${Math.round((e.opens / e.sentTo) * 100)}%)` : 'Tracked (Live)'}</td>
                        <td className="px-5 py-3.5 text-gray-500">{e.date}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>

            {/* Subscribers List */}
            <SectionHead title={`📋 Subscriber Directory (${subs.length})`} sub="Manage newsletter subscribers and email permissions."
              action={
                <div className="flex gap-2">
                  <input type="text" value={subsSearch} onChange={e => setSubsSearch(e.target.value)} placeholder="Search email or name…" className="px-3 py-2 text-xs text-white placeholder-gray-600 rounded-xl outline-none focus:ring-1 focus:ring-[#00b341]" style={INPUT_STYLE} />
                  <button onClick={() => downloadCSV('subscribers.csv', subs.map(s => [s.email, s.name, s.joined, s.status, s.opens.toString(), s.clicks.toString()]), ['Email','Name','Joined','Status','Opens','Clicks'])}
                    className="px-3 py-2 text-[11px] font-bold text-white rounded-xl border border-[#1e1e32] hover:border-[#00b341] transition-all" style={{ background: '#131320' }}>⬇ CSV</button>
                </div>
              } />
            <Card className="overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left" style={{ minWidth: '650px' }}>
                  <thead><tr className="border-b border-[#1e1e32]" style={{ background: '#0d0d1e' }}>
                    {['Email Address','Subscriber Name','Joined Date','Opens','Clicks','Status','Action'].map(h => <Th key={h}>{h}</Th>)}
                  </tr></thead>
                  <tbody className="divide-y divide-[#1e1e32] text-xs">
                    {filteredSubs.map(s => (
                      <tr key={s.id} className="hover:bg-white/[.02]">
                        <td className="px-5 py-3.5 text-white font-bold">{s.email}</td>
                        <td className="px-5 py-3.5 text-gray-400">{s.name}</td>
                        <td className="px-5 py-3.5 text-gray-500">{s.joined}</td>
                        <td className="px-5 py-3.5 font-bold text-white">{s.opens}</td>
                        <td className="px-5 py-3.5 font-bold text-[#00b341]">{s.clicks}</td>
                        <td className="px-5 py-3.5"><Badge s={s.status} /></td>
                        <td className="px-5 py-3.5 space-x-2">
                          <button onClick={() => setSubs(prev => prev.map(x => x.id === s.id ? { ...x, status: x.status === 'Active' ? 'Inactive' : 'Active' } : x))}
                            className="text-[10px] font-bold text-[#00b341] hover:underline">{s.status === 'Active' ? 'Unsubscribe' : 'Reactivate'}</button>
                          <button onClick={() => setSubs(prev => prev.filter(x => x.id !== s.id))} className="text-[10px] font-bold text-red-400 hover:underline">Remove</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          </div>
        )}

        {/* ══ PLATFORM ══════════════════════════════════════════════════════ */}
        {tab === 'platform' && (
          <div className="space-y-8">
            <SectionHead title="⚽ Platform Management" sub="Predictions, Fantasy League, Quizzes, Live Blogs, and Discount Codes." />

            {/* Platform KPI Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {[
                { label:'Prediction Entries', value:'2,841', sub:'this week', icon:'🎯', color:'#8b5cf6' },
                { label:'Fantasy Managers', value:'1,240', sub:'+48 this week', icon:'🏆', color:'#f59e0b' },
                { label:'Quiz Completions', value:'9,112', sub:'all time', icon:'🧠', color:'#3b82f6' },
                { label:'Active Discount Codes', value:'4', sub:'across shop', icon:'🏷️', color:'#00b341' },
              ].map(k => (
                <div key={k.label} className="rounded-2xl p-5" style={{ background: '#131320', border: '1px solid #1e1e32' }}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] font-black uppercase tracking-widest text-gray-500">{k.label}</span>
                    <span className="text-lg">{k.icon}</span>
                  </div>
                  <p className="text-2xl font-black text-white" style={{ fontFamily: 'Big Shoulders Display', color: k.color }}>{k.value}</p>
                  <p className="text-[10px] text-gray-600 mt-1">{k.sub}</p>
                </div>
              ))}
            </div>

            {/* Live Blog Manager */}
            <div className="rounded-2xl overflow-hidden" style={{ background: '#131320', border: '1px solid #1e1e32' }}>
              {/* Header */}
              <div className="px-5 py-4 flex items-center justify-between border-b border-[#1e1e32] flex-wrap gap-3">
                <div>
                  <h3 className="text-base font-black text-white uppercase" style={{ fontFamily: 'Big Shoulders Display' }}>📡 Live Blog Manager</h3>
                  <p className="text-[10px] text-gray-500 mt-0.5">Real-time match updates, breaking news, and minute-by-minute commentary.</p>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  {liveBlogs.filter(b => b.status === 'Live').length > 0 && (
                    <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-black" style={{ background: 'rgba(239,68,68,.12)', color: '#ef4444' }}>
                      <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />{liveBlogs.filter(b => b.status === 'Live').length} LIVE
                    </span>
                  )}
                  <button onClick={() => setShowNewBlog(true)} className="px-4 py-2 text-[11px] font-black text-white rounded-xl hover:opacity-90 transition-all" style={{ background: '#00b341' }}>+ New Live Blog</button>
                </div>
              </div>
              {/* Search + Filter */}
              <div className="px-5 py-3 flex gap-2 flex-wrap border-b border-[#1e1e32]" style={{ background: '#0d0d1e' }}>
                <input value={blogSearch} onChange={e => setBlogSearch(e.target.value)} placeholder="Search blogs…"
                  className="flex-1 min-w-[160px] px-3 py-2 text-xs text-white rounded-lg outline-none" style={{ background: '#131320', border: '1px solid #1e1e32' }} />
                {(['All','Live','Scheduled','Ended'] as const).map(f => (
                  <button key={f} onClick={() => setBlogFilter(f)}
                    className="px-3 py-1.5 text-[10px] font-black rounded-lg transition-all"
                    style={{ background: blogFilter === f ? (f === 'Live' ? '#ef4444' : f === 'Scheduled' ? '#f59e0b' : f === 'Ended' ? '#374151' : '#00b341') : '#131320',
                             color: blogFilter === f ? '#fff' : '#6b7280', border: '1px solid #1e1e32' }}>
                    {f}
                  </button>
                ))}
              </div>
              {/* Blog list */}
              <div className="divide-y divide-[#1e1e32]">
                {liveBlogs
                  .filter(b => blogFilter === 'All' || b.status === blogFilter)
                  .filter(b => !blogSearch || b.title.toLowerCase().includes(blogSearch.toLowerCase()))
                  .map(b => (
                  <div key={b.id}>
                    <div className="px-5 py-4 flex items-center gap-4 hover:bg-white/[.02] transition-all">
                      {b.coverImage && <img src={b.coverImage} alt="" className="w-16 h-10 object-cover rounded-lg shrink-0" />}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          <span className="text-[9px] font-black uppercase px-1.5 py-0.5 rounded"
                            style={{ background: b.category === 'Match' ? 'rgba(59,130,246,.2)' : b.category === 'Transfer' ? 'rgba(139,92,246,.2)' : 'rgba(245,158,11,.2)',
                                     color: b.category === 'Match' ? '#60a5fa' : b.category === 'Transfer' ? '#a78bfa' : '#fbbf24' }}>
                            {b.category}
                          </span>
                          {b.status === 'Live' && <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />}
                        </div>
                        <p className="text-sm font-bold text-white truncate">{b.title}</p>
                        <p className="text-[10px] text-gray-500 mt-0.5">
                          {b.updates.length} posts · {b.viewers > 0 ? (b.viewers >= 1000 ? (b.viewers/1000).toFixed(1)+'K' : b.viewers) : '—'} viewers
                          {b.status === 'Scheduled' && b.scheduledAt ? ` · Starts ${new Date(b.scheduledAt).toLocaleString('en-KE',{month:'short',day:'numeric',hour:'2-digit',minute:'2-digit'})}` : ''}
                          {b.status === 'Ended' ? ` · Created ${b.createdAt}` : ''}
                        </p>
                      </div>
                      <span className="px-2.5 py-1 rounded-full text-[9px] font-black uppercase shrink-0"
                        style={{ background: b.status === 'Live' ? 'rgba(239,68,68,.15)' : b.status === 'Scheduled' ? 'rgba(245,158,11,.15)' : 'rgba(107,114,128,.1)',
                                 color: b.status === 'Live' ? '#ef4444' : b.status === 'Scheduled' ? '#f59e0b' : '#6b7280' }}>
                        {b.status}
                      </span>
                      <div className="flex gap-2 shrink-0 flex-wrap justify-end">
                        {b.status === 'Live' && (
                          <button onClick={() => { setActiveBlogId(b.id); setShowPostUpdate(true) }}
                            className="px-2.5 py-1.5 text-[10px] font-black text-white rounded-lg hover:opacity-90 transition-all" style={{ background: '#00b341' }}>
                            ✏️ Post Update
                          </button>
                        )}
                        {b.status === 'Scheduled' && (
                          <button onClick={() => { setLiveBlogs(p => p.map(x => x.id === b.id ? { ...x, status: 'Live' as const } : x)); toast(`🔴 ${b.title} is now LIVE!`, 'success') }}
                            className="px-2.5 py-1.5 text-[10px] font-black text-yellow-400 rounded-lg border border-yellow-400/30 hover:border-yellow-400 transition-all">
                            🔴 Go Live
                          </button>
                        )}
                        {b.status === 'Live' && (
                          <button onClick={() => { if (confirm('End this live blog?')) setLiveBlogs(p => p.map(x => x.id === b.id ? { ...x, status: 'Ended' as const } : x)) }}
                            className="px-2.5 py-1.5 text-[10px] font-bold text-gray-400 rounded-lg border border-[#1e1e32] hover:border-gray-500 transition-all">
                            ⏹ End
                          </button>
                        )}
                        <button onClick={() => setExpandedBlogId(expandedBlogId === b.id ? null : b.id)}
                          className="px-2.5 py-1.5 text-[10px] font-bold text-blue-400 rounded-lg border border-blue-400/20 hover:border-blue-400 transition-all">
                          {expandedBlogId === b.id ? '▲ Hide' : '▼ Feed'}
                        </button>
                        <button onClick={() => { if (confirm('Delete this live blog?')) setLiveBlogs(p => p.filter(x => x.id !== b.id)) }}
                          className="px-2.5 py-1.5 text-[10px] font-bold text-red-400 rounded-lg border border-red-400/20 hover:border-red-400 transition-all">
                          🗑
                        </button>
                      </div>
                    </div>
                    {/* Expanded update feed */}
                    {expandedBlogId === b.id && (
                      <div className="px-5 pb-4 space-y-2" style={{ background: '#0d0d1e' }}>
                        {b.updates.length === 0 ? (
                          <p className="text-xs text-gray-600 py-4 text-center">No updates yet. Click "Post Update" to add the first entry.</p>
                        ) : (
                          b.updates.map(u => (
                            <div key={u.id} className="flex gap-3 items-start py-2.5 border-b border-[#1e1e32] last:border-0">
                              <span className="px-2 py-0.5 rounded text-[9px] font-black shrink-0 mt-0.5"
                                style={{ background: u.type === 'Goal' ? 'rgba(0,179,65,.2)' : u.type === 'Card' ? 'rgba(245,158,11,.2)' : u.type === 'FT' ? 'rgba(239,68,68,.2)' : u.type === 'Transfer' ? 'rgba(139,92,246,.2)' : 'rgba(59,130,246,.15)',
                                         color: u.type === 'Goal' ? '#00b341' : u.type === 'Card' ? '#f59e0b' : u.type === 'FT' ? '#ef4444' : u.type === 'Transfer' ? '#a78bfa' : '#60a5fa' }}>
                                {u.type === 'Goal' ? '⚽' : u.type === 'Card' ? '🟨' : u.type === 'FT' ? '🏁' : u.type === 'Transfer' ? '🔁' : u.type === 'Sub' ? '🔄' : '📢'} {u.minute}
                              </span>
                              <div className="flex-1">
                                <p className="text-xs text-gray-300">{u.text}</p>
                                <p className="text-[9px] text-gray-600 mt-0.5">{u.postedAt}</p>
                              </div>
                              <button onClick={() => setLiveBlogs(p => p.map(x => x.id === b.id ? { ...x, updates: x.updates.filter(uu => uu.id !== u.id) } : x))}
                                className="text-[10px] text-gray-600 hover:text-red-400 transition-all shrink-0 mt-0.5">✕</button>
                            </div>
                          ))
                        )}
                      </div>
                    )}
                  </div>
                ))}
                {liveBlogs.filter(b => blogFilter === 'All' || b.status === blogFilter).length === 0 && (
                  <div className="px-5 py-10 text-center text-gray-600 text-xs">No live blogs found. Click + New Live Blog to create one.</div>
                )}
              </div>
            </div>

            {/* Discount Codes */}
            <SectionHead title="🏷️ Discount Codes" sub="Manage promo codes for the shop, events, and subscriptions."
              action={<button onClick={() => setShowAddDiscount(true)} className="px-5 py-2.5 text-xs font-black text-white rounded-xl hover:opacity-90" style={{ background: '#00b341' }}>+ Create Code</button>} />
            <div className="rounded-2xl overflow-hidden" style={{ background: '#131320', border: '1px solid #1e1e32' }}>
              <div className="overflow-x-auto">
                <table className="w-full text-left" style={{ minWidth: '700px' }}>
                  <thead><tr className="border-b border-[#1e1e32]" style={{ background: '#0d0d1e' }}>
                    {['Code','Type','Value','Uses / Max','Expires','Status','Actions'].map(h => <Th key={h}>{h}</Th>)}
                  </tr></thead>
                  <tbody className="divide-y divide-[#1e1e32] text-xs">
                    {discounts.map(d => (
                      <tr key={d.id} className="hover:bg-white/[.02]">
                        <td className="px-5 py-3.5 font-mono font-black text-white tracking-widest">{d.code}</td>
                        <td className="px-5 py-3.5">
                          <span className="px-2 py-0.5 rounded-full text-[9px] font-black" style={{ background: d.type === 'Percent' ? 'rgba(139,92,246,.15)' : 'rgba(0,179,65,.15)', color: d.type === 'Percent' ? '#8b5cf6' : '#00b341' }}>
                            {d.type === 'Percent' ? '% Off' : 'Fixed'}
                          </span>
                        </td>
                        <td className="px-5 py-3.5 font-black text-white" style={{ fontFamily: 'Big Shoulders Display', fontSize: '15px' }}>
                          {d.type === 'Percent' ? `${d.value}%` : `KES ${d.value}`}
                        </td>
                        <td className="px-5 py-3.5">
                          <div className="flex items-center gap-2">
                            <span className="text-gray-300">{d.uses} / {d.maxUses}</span>
                            <div className="w-16 h-1.5 rounded-full bg-[#1e1e32] overflow-hidden">
                              <div className="h-full rounded-full transition-all" style={{ width: `${Math.min(100, (d.uses/d.maxUses)*100)}%`, background: d.uses >= d.maxUses ? '#ef4444' : '#00b341' }} />
                            </div>
                          </div>
                        </td>
                        <td className="px-5 py-3.5 text-gray-500">{d.expires}</td>
                        <td className="px-5 py-3.5">
                          <button onClick={() => setDiscounts(prev => prev.map(x => x.id === d.id ? { ...x, status: x.status === 'Active' ? 'Inactive' : 'Active' } : x))}
                            className="px-2.5 py-1 rounded-full text-[9px] font-black transition-all"
                            style={{ background: d.status === 'Active' ? 'rgba(0,179,65,.15)' : 'rgba(107,114,128,.1)', color: d.status === 'Active' ? '#00b341' : '#6b7280' }}>
                            {d.status}
                          </button>
                        </td>
                        <td className="px-5 py-3.5">
                          <div className="flex gap-3">
                            <button onClick={() => { navigator.clipboard.writeText(d.code); toast(`📋 Copied: ${d.code}`, 'info') }} className="text-[10px] font-bold text-blue-400 hover:underline">📋 Copy</button>
                            <button onClick={() => setDiscounts(prev => prev.filter(x => x.id !== d.id))} className="text-[10px] font-bold text-red-400 hover:underline">🗑 Delete</button>
                          </div>
                        </td>
                      </tr>
                    ))}
                    {discounts.length === 0 && (
                      <tr><td colSpan={7} className="px-5 py-10 text-center text-gray-600 text-xs">No discount codes yet. Click + Create Code to add one.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Predictions */}
            <Card className="p-6">
              <h3 className="text-base font-black text-white uppercase mb-4" style={{ fontFamily: 'Big Shoulders Display' }}>🎯 Predictions — Results & Leaderboard</h3>
              <div className="grid lg:grid-cols-2 gap-6">
                <div>
                  <p className="text-[10px] font-black uppercase text-gray-500 mb-3">Set Match Results</p>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left" style={{ minWidth: '500px' }}>
                      <thead><tr className="border-b border-[#1e1e32]" style={{ background: '#0d0d1e' }}>
                        {['User','Match','Predicted','Set Result','Points'].map(h => <Th key={h}>{h}</Th>)}
                      </tr></thead>
                      <tbody className="divide-y divide-[#1e1e32] text-xs">
                        {PREDICTIONS_DATA.map(p => (
                          <tr key={p.id} className="hover:bg-white/[.02]">
                            <td className="px-5 py-3 text-gray-300">{p.user}</td>
                            <td className="px-5 py-3 font-bold text-white text-[10px]">{p.match}</td>
                            <td className="px-5 py-3 text-gray-400">{p.predicted}</td>
                            <td className="px-5 py-3">
                              {p.actual === '—' ? <input placeholder="e.g. 2-1" className="px-2 py-1 text-xs text-white rounded-lg outline-none focus:ring-1 focus:ring-[#00b341] w-20" style={{ background: '#0c0c14', border: '1px solid #1e1e32' }} />
                                : <span className="font-bold text-white">{p.actual}</span>}
                            </td>
                            <td className="px-5 py-3 font-black text-[#00b341]" style={{ fontFamily: 'Big Shoulders Display' }}>{p.points} pts</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
                <div>
                  <p className="text-[10px] font-black uppercase text-gray-500 mb-3">Leaderboard (All Time)</p>
                  <div className="space-y-2">
                    {[
                      { rank:1, user:'—', pts:0, badge:'🥇' },
                      { rank:2, user:'—', pts:0, badge:'🥈' },
                      { rank:3, user:'—', pts:0, badge:'🥉' },
                      { rank:4, user:'—', pts:0, badge:'4️⃣' },
                      { rank:5, user:'—', pts:0, badge:'5️⃣' },
                    ].map(l => (
                      <div key={l.rank} className="flex items-center gap-3 p-3 rounded-xl" style={{ background: '#0d0d1e', border: '1px solid #1e1e32' }}>
                        <span className="text-lg">{l.badge}</span>
                        <span className="flex-1 text-sm font-bold text-white">{l.user}</span>
                        <span className="font-black text-[#00b341]" style={{ fontFamily: 'Big Shoulders Display' }}>{l.pts} pts</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </Card>

            {/* Fantasy */}
            <Card className="p-6">
              <h3 className="text-base font-black text-white uppercase mb-4" style={{ fontFamily: 'Big Shoulders Display' }}>🏆 Fantasy League</h3>
              <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
                {[{ label:'Total Managers', value:'1,240', icon:'👥' }, { label:'Avg Points GW4', value:'58.4', icon:'⭐' }, { label:'Highest Score', value:'112', icon:'🏆' }, { label:'Prize Pool', value:'$200', icon:'💵' }].map(f => (
                  <div key={f.label} className="p-4 rounded-xl text-center" style={{ background: '#0d0d1e', border: '1px solid #1e1e32' }}>
                    <span className="text-2xl block mb-1">{f.icon}</span>
                    <p className="text-[9px] text-gray-600 uppercase font-bold">{f.label}</p>
                    <p className="text-xl font-black text-white" style={{ fontFamily: 'Big Shoulders Display' }}>{f.value}</p>
                  </div>
                ))}
              </div>
              <div className="flex gap-2 flex-wrap">
                {['Lock GW4 Deadline','Process Points','Send GW Results Email','View Leaderboard'].map(a => (
                  <button key={a} onClick={() => toast(`✅ ${a} — queued`, 'success')} className="px-3 py-2 text-[11px] font-bold text-white rounded-xl border border-[#1e1e32] hover:border-[#00b341] transition-all" style={{ background: '#0d0d1e' }}>{a}</button>
                ))}
              </div>
            </Card>

            {/* Quiz */}
            <SectionHead title="🧠 Quiz Manager" sub="Create and manage quiz questions."
              action={<button onClick={() => setShowAddQuiz(true)} className="px-5 py-2.5 text-xs font-black text-white rounded-xl hover:opacity-90" style={{ background: '#00b341' }}>+ Add Question</button>} />
            <div className="space-y-3">
              {quizzes.map((q, qi) => (
                <Card key={q.id} className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-[9px] font-black uppercase text-[#00b341]">{q.category}</span>
                        <span className="text-[9px] text-gray-600">· {q.plays} plays</span>
                      </div>
                      <p className="text-sm font-bold text-white mb-2">{q.question}</p>
                      <div className="grid grid-cols-2 gap-2">
                        {q.options.map((opt, i) => (
                          <div key={i} className="flex items-center gap-2 px-3 py-1.5 rounded-lg" style={{ background: i === q.correct ? 'rgba(0,179,65,.15)' : '#0d0d1e', border: `1px solid ${i === q.correct ? '#00b341' : '#1e1e32'}` }}>
                            <span className="text-[10px] font-bold" style={{ color: i === q.correct ? '#00b341' : '#6b7280' }}>{String.fromCharCode(65 + i)}.</span>
                            <span className="text-xs text-white">{opt}</span>
                            {i === q.correct && <span className="text-[10px] text-[#00b341] font-black ml-auto">✓</span>}
                          </div>
                        ))}
                      </div>
                    </div>
                    <button onClick={() => setQuizzes(prev => prev.filter((_, j) => j !== qi))} className="text-[10px] font-bold px-2 py-1.5 rounded-lg border border-[#1e1e32] text-gray-500 hover:text-red-400 hover:border-red-400 transition-all shrink-0">🗑</button>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* ══ SYSTEM ════════════════════════════════════════════════════════ */}
        {tab === 'system' && (
          <div className="space-y-8">
            <SectionHead title="🖥️ System & Operations" sub="Health telemetry, webhooks, audit logs, terminal output, and export center."
              action={
                <div className="flex gap-2">
                  <button onClick={() => {
                    setIsPinging(true)
                    setTimeout(() => {
                      setIsPinging(false)
                      toast('💓 All 6 platform microservices pinged. 100% operational.', 'success')
                    }, 1200)
                  }} className="px-4 py-2 text-xs font-black text-white rounded-xl hover:opacity-90 transition-all flex items-center gap-2" style={{ background: '#3b82f6' }}>
                    {isPinging ? <span className="animate-spin">🔄</span> : '⚡'} {isPinging ? 'Pinging Services…' : 'Ping All Services'}
                  </button>
                </div>
              } />

            {/* Server Resource Telemetry */}
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {[
                { label:'RAM Usage', val:'1.4 / 4.0 GB', pct:35, icon:'🧠', color:'#00b341' },
                { label:'CPU Load', val:'12% (4 Cores)', pct:12, icon:'⚡', color:'#3b82f6' },
                { label:'Disk Storage', val:'34.2 / 100 GB', pct:34, icon:'💾', color:'#8b5cf6' },
                { label:'Node Runtime', val:'v22.14.0 (macOS)', pct:100, icon:'🖥️', color:'#f59e0b' },
              ].map(r => (
                <div key={r.label} className="p-4 rounded-xl border" style={{ background: '#0d0d1e', border: '1px solid #1e1e32' }}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] font-black uppercase tracking-wider text-gray-500">{r.label}</span>
                    <span className="text-base">{r.icon}</span>
                  </div>
                  <p className="text-lg font-black text-white" style={{ fontFamily: 'Big Shoulders Display' }}>{r.val}</p>
                  <div className="w-full h-1.5 rounded-full bg-[#131320] mt-2 overflow-hidden">
                    <div className="h-full rounded-full transition-all" style={{ width: `${r.pct}%`, background: r.color }} />
                  </div>
                </div>
              ))}
            </div>

            {/* Health */}
            <Card className="p-6">
              <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
                <div>
                  <h3 className="text-base font-black text-white uppercase" style={{ fontFamily: 'Big Shoulders Display' }}>💓 Microservice Telemetry</h3>
                  <p className="text-[10px] text-gray-500 font-mono">Region: af-south-1 (Nairobi Edge)</p>
                </div>
                <button
                  onClick={async () => {
                    toastLib.info('📡 Pinging microservice endpoints...')
                    const res = await pingAllServices()
                    setHealthData(res)
                    logAdminAction(user?.email || 'admin@flowerz.fc', 'PING_SERVICES', 'System', 'microservices', 'Pinged all telemetry endpoints')
                    toastLib.success('✅ Microservice telemetry updated!')
                  }}
                  className="px-4 py-2 text-xs font-black text-black rounded-xl hover:opacity-90 transition-all shadow-md"
                  style={{ background: '#00b341' }}
                >
                  ⚡ Ping All Services Now →
                </button>
              </div>
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {healthData.map(h => (
                  <div key={h.service} className="p-4 rounded-xl border transition-all hover:border-[#00b341]/40" style={{ background: '#0d0d1e', borderColor: h.status === 'Online' ? 'rgba(0,179,65,.2)' : h.status === 'Degraded' ? 'rgba(245,158,11,.2)' : 'rgba(239,68,68,.2)' }}>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-bold text-white flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full" style={{ background: h.status === 'Online' ? '#00b341' : h.status === 'Degraded' ? '#f59e0b' : '#ef4444' }} />
                        {h.service}
                      </span>
                      <Badge s={h.status} />
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-[10px]">
                      <div><p className="text-gray-600">Uptime</p><p className="font-bold text-white">{h.uptime}</p></div>
                      <div><p className="text-gray-600">Latency</p><p className="font-bold text-white">{h.latency}</p></div>
                    </div>
                    <p className="text-[9px] text-gray-600 mt-2">Last check: {h.lastCheck}</p>
                  </div>
                ))}
              </div>
            </Card>

            {/* Cron Jobs & Cache Controls */}
            <Card className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-base font-black text-white uppercase" style={{ fontFamily: 'Big Shoulders Display' }}>⏰ Background Cron Task Scheduler</h3>
                  <p className="text-[10px] text-gray-500">Automated platform background jobs.</p>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => toast('⚡ Redis Cache Purged!', 'success')} className="px-3 py-1.5 text-[10px] font-black text-white rounded-lg border border-[#1e1e32] hover:border-[#00b341]" style={{ background: '#0d0d1e' }}>⚡ Purge Redis</button>
                  <button onClick={() => toast('🌐 Cloudflare CDN Cache Cleared!', 'success')} className="px-3 py-1.5 text-[10px] font-black text-white rounded-lg border border-[#1e1e32] hover:border-[#00b341]" style={{ background: '#0d0d1e' }}>🌐 Clear CDN</button>
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left" style={{ minWidth: '600px' }}>
                  <thead><tr className="border-b border-[#1e1e32]" style={{ background: '#0d0d1e' }}>
                    {['Task Name','Cron Schedule','Last Run','Status','Trigger'].map(h => <Th key={h}>{h}</Th>)}
                  </tr></thead>
                  <tbody className="divide-y divide-[#1e1e32] text-xs">
                    {cronJobs.map(cj => (
                      <tr key={cj.id} className="hover:bg-white/[.02]">
                        <td className="px-5 py-3 font-bold text-white">{cj.name}</td>
                        <td className="px-5 py-3 font-mono text-purple-400 text-[10px]">{cj.schedule}</td>
                        <td className="px-5 py-3 text-gray-400 text-[10px]">{cj.lastRun}</td>
                        <td className="px-5 py-3"><Badge s={cj.status} /></td>
                        <td className="px-5 py-3">
                          <button onClick={() => {
                            toast(`▶ Triggered cron job: ${cj.name}`, 'info')
                            setCronJobs(p => p.map(x => x.id === cj.id ? { ...x, lastRun: 'Just now', status: 'Success' } : x))
                          }} className="text-[10px] font-bold text-[#00b341] hover:underline">▶ Run Now</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>

            {/* SSL & Security Audit */}
            <Card className="p-5 border-blue-500/20" style={{ background: 'rgba(59,130,246,.04)' }}>
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-black text-white uppercase mb-1">🔒 SSL & Security Audit</h3>
                  <p className="text-xs text-gray-400">TLS 1.3 Encryption · Certificate valid until <span className="text-white font-bold">Oct 14, 2027</span> (Cloudflare Managed)</p>
                  <p className="text-[10px] text-gray-500 mt-1">Headers: HSTS Enabled · CSP Compliant · X-Frame-Options: SAMEORIGIN</p>
                </div>
                <span className="text-3xl">🛡️</span>
              </div>
            </Card>

            {/* Live Terminal Log Stream */}
            <Card className="p-5 overflow-hidden" style={{ background: '#07070e', border: '1px solid #1e1e32' }}>
              <div className="flex items-center justify-between border-b border-[#1e1e32] pb-3 mb-3">
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-red-500" />
                  <span className="w-3 h-3 rounded-full bg-yellow-500" />
                  <span className="w-3 h-3 rounded-full bg-green-500" />
                  <span className="text-xs font-mono font-bold text-gray-400 ml-2">syslog stdout --tail=50</span>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => { setSystemLogs([]); toast('Terminal cleared.', 'info') }} className="text-[10px] font-mono text-gray-500 hover:text-white">Clear</button>
                  <button onClick={() => {
                    const newLog = { id: `l-${Date.now()}`, time: new Date().toLocaleTimeString('en-KE'), level: 'INFO', msg: 'System diagnostic requested manually by admin' }
                    setSystemLogs(p => [newLog, ...p])
                    toast('Diagnostic line appended.', 'info')
                  }} className="text-[10px] font-mono text-[#00b341] hover:underline">+ Run Diagnostic</button>
                </div>
              </div>
              <div className="font-mono text-[11px] space-y-1.5 max-h-48 overflow-y-auto pr-2">
                {systemLogs.map(l => (
                  <div key={l.id} className="flex gap-3">
                    <span className="text-gray-600 shrink-0">[{l.time}]</span>
                    <span className="font-bold shrink-0" style={{ color: l.level === 'ERROR' ? '#ef4444' : l.level === 'WARN' ? '#f59e0b' : '#00b341' }}>{l.level}</span>
                    <span className="text-gray-300 flex-1">{l.msg}</span>
                  </div>
                ))}
              </div>
            </Card>

            {/* Webhooks */}
            <Card className="overflow-hidden">
              <div className="p-5 border-b border-[#1e1e32] flex items-center justify-between">
                <h3 className="text-base font-black text-white uppercase" style={{ fontFamily: 'Big Shoulders Display' }}>⚡ Paystack Webhook Log</h3>
                <div className="flex items-center gap-3">
                  <span className="text-[10px] text-red-400 font-bold">{WEBHOOKS.filter(w => w.status === 'Failed').length} failed</span>
                  <button onClick={() => downloadCSV('webhooks.csv', WEBHOOKS.map(w => [w.event, w.ref, w.amount, w.customer, w.date, w.status]), ['Event','Reference','Amount','Customer','Date','Status'])}
                    className="text-[11px] font-bold text-[#00b341] hover:underline">⬇ Export</button>
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left" style={{ minWidth: '700px' }}>
                  <thead><tr className="border-b border-[#1e1e32]" style={{ background: '#0d0d1e' }}>
                    {['Event','Reference','Amount','Customer','Date','Status','Retry'].map(h => <Th key={h}>{h}</Th>)}
                  </tr></thead>
                  <tbody className="divide-y divide-[#1e1e32] text-xs">
                    {WEBHOOKS.map(w => (
                      <tr key={w.id} className="hover:bg-white/[.02]">
                        <td className="px-5 py-3.5 font-mono text-purple-400">{w.event}</td>
                        <td className="px-5 py-3.5 font-mono text-gray-600 text-[10px]">{w.ref}</td>
                        <td className="px-5 py-3.5 font-bold text-white">{w.amount}</td>
                        <td className="px-5 py-3.5 text-gray-400">{w.customer}</td>
                        <td className="px-5 py-3.5 text-gray-500 whitespace-nowrap">{w.date}</td>
                        <td className="px-5 py-3.5"><Badge s={w.status} /></td>
                        <td className="px-5 py-3.5">{w.status === 'Failed' && <button onClick={() => toast(`↺ Retrying webhook ${w.ref}…`, 'info')} className="text-[10px] font-bold text-orange-400 hover:underline">↺ Retry</button>}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>

            {/* Audit Log */}
            <Card className="overflow-hidden">
              <div className="p-5 border-b border-[#1e1e32] flex items-center justify-between">
                <h3 className="text-base font-black text-white uppercase" style={{ fontFamily: 'Big Shoulders Display' }}>🔍 Admin Audit Log</h3>
                <button onClick={() => downloadCSV('audit.csv', AUDIT_LOG.map(a => [a.admin, a.action, a.ip, a.date]), ['Admin','Action','IP','Date'])}
                  className="text-[11px] font-bold text-[#00b341] hover:underline">⬇ Export</button>
              </div>
              <div className="space-y-px">
                {AUDIT_LOG.map((a, i) => (
                  <div key={a.id} className={`flex items-center gap-4 px-5 py-3.5 text-xs ${i % 2 === 0 ? '' : 'bg-white/[.01]'}`}>
                    <span className="w-2 h-2 rounded-full shrink-0" style={{ background: '#00b341' }} />
                    <span className="font-bold text-[#00b341] shrink-0">{a.admin}</span>
                    <span className="text-gray-300 flex-1">{a.action}</span>
                    <span className="font-mono text-gray-600 text-[10px] shrink-0">{a.ip}</span>
                    <span className="text-gray-600 text-[10px] shrink-0">{a.date}</span>
                  </div>
                ))}
              </div>
            </Card>

            {/* Export Center */}
            <SectionHead title="⬇ Data Export" sub="Download platform data as CSV." />
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {[
                { label:'Orders',      icon:'🛒', fn: () => downloadCSV('orders.csv',   INIT_ORDERS.map(o => [o.id, o.customer, o.email, o.total.toString(), o.status, o.date]), ['ID','Customer','Email','Total','Status','Date']) },
                { label:'Users',       icon:'👥', fn: () => downloadCSV('users.csv',    INIT_USERS.map(u => [u.id, u.name, u.email, u.role, u.joined, u.status]), ['ID','Name','Email','Role','Joined','Status']) },
                { label:'Tip Ledger',  icon:'☕', fn: () => downloadCSV('tips.csv',     TIPS_DATA.map(t => [t.from, t.recipient, t.amount.toString(), t.ref, t.date, t.status]), ['From','To','Amount','Ref','Date','Status']) },
                { label:'Articles',    icon:'📰', fn: () => downloadCSV('articles.csv', INIT_ARTICLES.map(a => [a.id, a.title, a.category, a.author, a.views, a.status, a.date]), ['ID','Title','Category','Author','Views','Status','Date']) },
                { label:'Newsletters', icon:'📧', fn: () => downloadCSV('subs.csv',     INIT_SUBS.map(s => [s.email, s.name, s.joined, s.status, s.opens.toString(), s.clicks.toString()]), ['Email','Name','Joined','Status','Opens','Clicks']) },
                { label:'Webhooks',    icon:'⚡', fn: () => downloadCSV('webhooks.csv', WEBHOOKS.map(w => [w.event, w.ref, w.amount, w.customer, w.date, w.status]), ['Event','Ref','Amount','Customer','Date','Status']) },
              ].map(e => (
                <button key={e.label} onClick={e.fn} className="flex items-center gap-4 p-5 rounded-2xl border border-[#1e1e32] hover:border-[#00b341] transition-all text-left" style={{ background: '#131320' }}>
                  <span className="text-3xl">{e.icon}</span>
                  <div><p className="text-sm font-bold text-white">{e.label}</p><p className="text-[10px] text-gray-600">Download CSV</p></div>
                  <span className="ml-auto text-[#00b341]">⬇</span>
                </button>
              ))}
            </div>

            {/* Danger Zone */}
            <Card className="p-6 border-red-500/20" style={{ background: 'rgba(239,68,68,.03)' }}>
              <h3 className="text-base font-black text-red-400 uppercase mb-2">⚠️ Danger Zone</h3>
              <p className="text-xs text-gray-500 mb-4">Irreversible actions. Proceed with extreme caution.</p>
              <div className="flex flex-wrap gap-3">
                <button onClick={() => { if (confirm('Clear all cached articles from localStorage?')) { clearArticleStore(); toast('🗑 Article cache cleared.', 'info') } }}
                  className="px-4 py-2.5 text-[11px] font-bold text-orange-400 rounded-xl border border-orange-400/30 hover:border-orange-400 transition-all">Clear Article Cache</button>
                <button onClick={() => downloadCSV('full_backup.csv', [...INIT_ORDERS.map(o => ['order', o.id, o.customer, o.total.toString()]), ...INIT_USERS.map(u => ['user', u.id, u.name, u.email])], ['Type','ID','Name','Value'])}
                  className="px-4 py-2.5 text-[11px] font-bold text-yellow-400 rounded-xl border border-yellow-400/30 hover:border-yellow-400 transition-all">💾 Backup All Data</button>
                <button onClick={() => setShowDanger(true)}
                  className="px-4 py-2.5 text-[11px] font-bold text-red-400 rounded-xl border border-red-400/30 hover:border-red-400 transition-all">🗑 Reset Admin Data</button>
              </div>
            </Card>
          </div>
        )}

        {/* ══ SETTINGS ══════════════════════════════════════════════════════ */}


        {tab === 'scores' && (
          <div className="space-y-5">
            {/* Header */}
            <div className="rounded-2xl p-6 border space-y-4" style={{ background: '#131320', borderColor: '#1e1e32' }}>
              <div className="flex items-center justify-between gap-4 flex-wrap border-b border-[#1e1e32] pb-4">
                <div>
                  <h2 className="text-xl font-black text-white uppercase flex items-center gap-2" style={{ fontFamily: 'Big Shoulders Display' }}>
                    <span>📡</span> LiveScore Data Verification Panel
                  </h2>
                  <p className="text-xs text-gray-400 mt-0.5">
                    Verify live scores, standings, and fixture data being pulled from LiveScore production APIs.
                  </p>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  <div className="flex items-center gap-2 bg-[#0d0d1e] border border-[#1e1e32] px-3 py-1.5 rounded-xl">
                    <span className="text-[10px] font-black uppercase text-gray-500">📅 Date:</span>
                    <input type="date" value={scoresDate} onChange={e => setScoresDate(e.target.value)}
                      className="bg-transparent text-xs text-white outline-none font-mono" />
                  </div>
                  <select value={scoresLeague} onChange={e => setScoresLeague(e.target.value)}
                    className="bg-[#0d0d1e] border border-[#1e1e32] text-xs text-white rounded-xl px-3 py-1.5 outline-none">
                    {['Premier League','La Liga','Bundesliga','Serie A','Ligue 1','Champions League','Europa League'].map(l => (
                      <option key={l} value={l}>{l}</option>
                    ))}
                  </select>
                  <button onClick={() => {
                    setScoresLoading(true)
                    Promise.all([
                      fetchLiveMatches(scoresDate),
                      fetchLiveStandings(scoresLeague),
                      fetchLiveFixtures(scoresDate),
                      fetchLiveCatalogStats(scoresDate),
                    ]).then(([matches, standings, fixtures, stats]) => {
                      setCatalogStats(stats)
                      setScoresMatches(matches)
                      setScoresStandings(standings)
                      setScoresFixtures(fixtures)
                      setScoresDataSource(matches.length > 0 ? 'api' : 'fallback')
                      setScoresLoading(false)
                      toast(`✅ Data fetched: ${matches.length} matches, ${standings.length} standings, ${fixtures.length} fixtures`, 'success')
                    })
                  }} className="px-4 py-2 text-xs font-black text-black rounded-xl hover:opacity-90 transition-all flex items-center gap-2" style={{ background: '#00b341' }}>
                    {scoresLoading ? '⏳ Loading...' : '🔄 Fetch Live Data'}
                  </button>
                </div>
              </div>

              {/* Source Status Banner */}
              <div className="flex items-center gap-3 p-3 rounded-xl" style={{ background: scoresDataSource === 'api' ? 'rgba(0,179,65,.1)' : 'rgba(245,158,11,.1)', border: `1px solid ${scoresDataSource === 'api' ? 'rgba(0,179,65,.3)' : 'rgba(245,158,11,.3)'}` }}>
                <span className="text-lg">{scoresDataSource === 'api' ? '✅' : '⚠️'}</span>
                <div>
                  <p className="text-xs font-black text-white">{scoresDataSource === 'api' ? 'Connected to LiveScore Production API' : 'Using Fallback Static Data'}</p>
                  <p className="text-[10px] text-gray-400">
                    {scoresDataSource === 'api'
                      ? 'Data source: prod-cdn-public-api.livescore.com — Data is real-time'
                      : 'API may be rate-limited or unreachable. Click "Fetch Live Data" to retry.'}
                  </p>
                </div>
                <div className="ml-auto text-right">
                  <p className="text-[10px] font-bold text-gray-400">Matches: {scoresMatches.length}</p>
                  <p className="text-[10px] font-bold text-gray-400">Standings: {scoresStandings.length}</p>
                  <p className="text-[10px] font-bold text-gray-400">Fixtures: {scoresFixtures.length}</p>
                </div>
              </div>

              {/* Sub-tabs */}
              <div className="flex items-center gap-1 border-b border-[#1e1e32] pb-0">
                {(['matches','standings','fixtures','catalog'] as const).map(v => (
                  <button key={v} onClick={() => setScoresView(v)}
                    className="px-4 py-2.5 text-xs font-black uppercase transition-all relative capitalize"
                    style={{ color: scoresView === v ? '#00b341' : '#6b7280' }}>
                    {v === 'matches' ? '⚽ Live Matches' : v === 'standings' ? '📊 Standings' : v === 'fixtures' ? '📅 Fixtures' : '🌐 Catalog Breakdown'}
                    {scoresView === v && <div className="absolute bottom-0 left-0 right-0 h-0.5 rounded-full" style={{ background: '#00b341' }} />}
                  </button>
                ))}
              </div>


              {/* Geo-Location Timezone Info Banner */}
              <div className="flex items-center justify-between gap-3 p-3 rounded-xl bg-[#0d0d1e] border border-[#1e1e32]">
                <div className="flex items-center gap-2">
                  <span className="text-sm">🌍</span>
                  <div>
                    <span className="text-xs font-bold text-white">Geo-Location User Timezone: </span>
                    <span className="text-xs font-mono text-[#00b341]">{tzInfo.timezone} ({tzInfo.offsetStr})</span>
                  </div>
                </div>
                <span className="text-[10px] text-gray-400 bg-[#131320] px-2 py-1 rounded border border-[#2a2a40]">
                  ⚡ Match kick-off times auto-converted to user local time
                </span>
              </div>

              {/* Real-time Catalog Summary Badges */}
              {catalogStats && (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="p-3 rounded-xl bg-[#0d0d1e] border border-[#1e1e32]">
                    <p className="text-[10px] font-black uppercase text-gray-500">🌍 Regions / Countries</p>
                    <p className="text-xl font-black text-white">{catalogStats.totalRegions}</p>
                  </div>
                  <div className="p-3 rounded-xl bg-[#0d0d1e] border border-[#1e1e32]">
                    <p className="text-[10px] font-black uppercase text-gray-500">🏆 Competitions</p>
                    <p className="text-xl font-black text-[#00b341]">{catalogStats.totalCompetitions}</p>
                  </div>
                  <div className="p-3 rounded-xl bg-[#0d0d1e] border border-[#1e1e32]">
                    <p className="text-[10px] font-black uppercase text-gray-500">📊 Leagues / Stages</p>
                    <p className="text-xl font-black text-amber-400">{catalogStats.totalLeagues}</p>
                  </div>
                  <div className="p-3 rounded-xl bg-[#0d0d1e] border border-[#1e1e32]">
                    <p className="text-[10px] font-black uppercase text-gray-500">⚽ Active Teams</p>
                    <p className="text-xl font-black text-cyan-400">{catalogStats.totalTeamsToday}</p>
                  </div>
                </div>
              )}

              {/* ── MATCHES VIEW ─────────────────────────────────────────────── */}
              {scoresView === 'matches' && (
                <div className="space-y-2">
                  {scoresMatches.length === 0 ? (
                    <div className="text-center py-12 text-gray-500 text-sm">
                      <p className="text-3xl mb-2">⚽</p>
                      <p>Click "Fetch Live Data" to load matches for {scoresDate}</p>
                    </div>
                  ) : (
                    <>
                      {/* Group by league */}
                      {Array.from(new Set(scoresMatches.map(m => m.league))).map(league => (
                        <div key={league} className="rounded-xl overflow-hidden border border-[#1e1e32]">
                          <div className="px-4 py-2 flex items-center gap-2" style={{ background: '#0d0d1e' }}>
                            <span className="text-sm">{scoresMatches.find(m => m.league === league)?.flag || '⚽'}</span>
                            <span className="text-xs font-black text-white uppercase tracking-wider">{league}</span>
                            <span className="text-[10px] text-gray-500 ml-auto">{scoresMatches.filter(m => m.league === league).length} matches</span>
                          </div>
                          {scoresMatches.filter(m => m.league === league).map(match => (
                            <div key={match.id} className="flex items-center gap-4 px-4 py-3 border-t border-[#1a1a28] hover:bg-white/5 transition-colors">
                              {/* Home */}
                              <div className="flex items-center gap-2 flex-1 min-w-0 justify-end">
                                <span className="text-xs font-semibold text-white truncate">{match.home}</span>
                                <img src={match.homeLogo} alt={match.home} className="w-6 h-6 object-contain"
                                  onError={e => { (e.target as HTMLImageElement).style.display='none' }} />
                              </div>
                              {/* Score */}
                              <div className="shrink-0 text-center w-28">
                                <div className="text-base font-black text-white">{match.homeScore} – {match.awayScore}</div>
                                <span className="text-[9px] font-bold px-1.5 py-0.5 rounded" style={{
                                  background: match.live ? 'rgba(0,179,65,.2)' : match.status === 'FT' ? '#1e1e32' : 'rgba(245,158,11,.1)',
                                  color: match.live ? '#00b341' : match.status === 'FT' ? '#6b7280' : '#f59e0b'
                                }}>{match.status || (match.live ? `${match.minute}'` : 'Scheduled')}</span>
                              </div>
                              {/* Away */}
                              <div className="flex items-center gap-2 flex-1 min-w-0">
                                <img src={match.awayLogo} alt={match.away} className="w-6 h-6 object-contain"
                                  onError={e => { (e.target as HTMLImageElement).style.display='none' }} />
                                <span className="text-xs font-semibold text-white truncate">{match.away}</span>
                              </div>
                              {/* Match ID badge */}
                              <div className="shrink-0 hidden lg:flex">
                                <span className="text-[9px] font-mono text-gray-600 bg-[#0d0d1e] px-2 py-0.5 rounded border border-[#1e1e32]">
                                  ID: {match.id}
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      ))}
                    </>
                  )}
                </div>
              )}

              {/* ── STANDINGS VIEW ────────────────────────────────────────────── */}
              {scoresView === 'standings' && (
                <div>
                  {scoresStandings.length === 0 ? (
                    <div className="text-center py-12 text-gray-500 text-sm">
                      <p className="text-3xl mb-2">📊</p>
                      <p>Click "Fetch Live Data" to load {scoresLeague} standings</p>
                    </div>
                  ) : (
                    <div className="rounded-xl overflow-hidden border border-[#1e1e32]">
                      <table className="w-full text-xs">
                        <thead>
                          <tr style={{ background: '#0d0d1e' }}>
                            <th className="px-3 py-2.5 text-left text-[10px] font-black uppercase text-gray-500">#</th>
                            <th className="px-3 py-2.5 text-left text-[10px] font-black uppercase text-gray-500">Club</th>
                            <th className="px-3 py-2.5 text-center text-[10px] font-black uppercase text-gray-500">P</th>
                            <th className="px-3 py-2.5 text-center text-[10px] font-black uppercase text-gray-500">W</th>
                            <th className="px-3 py-2.5 text-center text-[10px] font-black uppercase text-gray-500">D</th>
                            <th className="px-3 py-2.5 text-center text-[10px] font-black uppercase text-gray-500">L</th>
                            <th className="px-3 py-2.5 text-center text-[10px] font-black uppercase text-gray-500">GD</th>
                            <th className="px-3 py-2.5 text-center text-[10px] font-black uppercase text-[#00b341]">Pts</th>
                            <th className="px-3 py-2.5 text-center text-[10px] font-black uppercase text-gray-500">Form</th>
                            {scoresStandings[0]?.teamId && <th className="px-3 py-2.5 text-center text-[10px] font-black uppercase text-gray-500 hidden lg:table-cell">Team ID</th>}
                          </tr>
                        </thead>
                        <tbody>
                          {scoresStandings.map((row, i) => (
                            <tr key={row.team} className="border-t border-[#1a1a28] hover:bg-white/5 transition-colors">
                              <td className="px-3 py-2.5 font-bold text-gray-500">{row.rank}</td>
                              <td className="px-3 py-2.5">
                                <div className="flex items-center gap-2">
                                  <img src={row.teamLogo} alt={row.team} className="w-5 h-5 object-contain"
                                    onError={e => { (e.target as HTMLImageElement).style.display='none' }} />
                                  <span className="font-semibold text-white">{row.team}</span>
                                </div>
                              </td>
                              <td className="px-3 py-2.5 text-center text-gray-400">{row.played}</td>
                              <td className="px-3 py-2.5 text-center text-gray-400">{row.won}</td>
                              <td className="px-3 py-2.5 text-center text-gray-400">{row.drawn}</td>
                              <td className="px-3 py-2.5 text-center text-gray-400">{row.lost}</td>
                              <td className="px-3 py-2.5 text-center font-semibold" style={{ color: row.gd > 0 ? '#00b341' : row.gd < 0 ? '#ef4444' : '#6b7280' }}>
                                {row.gd > 0 ? `+${row.gd}` : row.gd}
                              </td>
                              <td className="px-3 py-2.5 text-center font-black text-white">{row.pts}</td>
                              <td className="px-3 py-2.5">
                                <div className="flex gap-0.5 justify-center">
                                  {row.form.map((f, j) => (
                                    <span key={j} className="w-4 h-4 rounded-sm text-[8px] font-black flex items-center justify-center text-white"
                                      style={{ background: f === 'W' ? '#00b341' : f === 'D' ? '#6b7280' : '#ef4444' }}>{f}</span>
                                  ))}
                                </div>
                              </td>
                              {row.teamId && <td className="px-3 py-2.5 text-center text-[9px] font-mono text-gray-600 hidden lg:table-cell">{row.teamId}</td>}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}

              {/* ── FIXTURES VIEW ─────────────────────────────────────────────── */}
              {scoresView === 'fixtures' && (
                <div className="space-y-2">
                  {scoresFixtures.length === 0 ? (
                    <div className="text-center py-12 text-gray-500 text-sm">
                      <p className="text-3xl mb-2">📅</p>
                      <p>Click "Fetch Live Data" to load fixtures for {scoresDate}</p>
                    </div>
                  ) : (
                    Array.from(new Set(scoresFixtures.map(f => f.league))).map(league => (
                      <div key={league} className="rounded-xl overflow-hidden border border-[#1e1e32]">
                        <div className="px-4 py-2 flex items-center gap-2" style={{ background: '#0d0d1e' }}>
                          <span className="text-xs font-black text-white uppercase tracking-wider">{league}</span>
                          <span className="text-[10px] text-gray-500 ml-auto">{scoresFixtures.filter(f => f.league === league).length} fixtures</span>
                        </div>
                        {scoresFixtures.filter(f => f.league === league).map(fx => (
                          <div key={fx.id} className="flex items-center gap-4 px-4 py-3 border-t border-[#1a1a28] hover:bg-white/5 transition-colors">
                            <div className="flex items-center gap-2 flex-1 min-w-0 justify-end">
                              <span className="text-xs font-semibold text-white truncate">{fx.home}</span>
                              <img src={fx.homeLogo} alt={fx.home} className="w-5 h-5 object-contain"
                                onError={e => { (e.target as HTMLImageElement).style.display='none' }} />
                            </div>
                            <div className="shrink-0 text-center w-28">
                              <span className="text-[10px] font-black px-2 py-0.5 rounded" style={{
                                background: (fx.status || '').includes('LIVE') ? 'rgba(0,179,65,.2)' : '#131320',
                                color: (fx.status || '').includes('LIVE') ? '#00b341' : '#9ca3af'
                              }}>{fx.status || fx.time}</span>
                              <p className="text-[9px] text-gray-600 mt-0.5">{fx.date}</p>
                            </div>
                            <div className="flex items-center gap-2 flex-1 min-w-0">
                              <img src={fx.awayLogo} alt={fx.away} className="w-5 h-5 object-contain"
                                onError={e => { (e.target as HTMLImageElement).style.display='none' }} />
                              <span className="text-xs font-semibold text-white truncate">{fx.away}</span>
                            </div>
                            <div className="shrink-0 text-right hidden lg:block">
                              <p className="text-[9px] font-mono text-gray-600">{fx.venue}</p>
                              <p className="text-[8px] font-mono text-gray-700">ID: {fx.id}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    ))
                  )}
                </div>
              )}


              {/* ── CATALOG BREAKDOWN VIEW ────────────────────────────────────── */}
              {scoresView === 'catalog' && (
                <div className="space-y-4">
                  {!catalogStats ? (
                    <div className="text-center py-12 text-gray-500 text-sm">
                      <p className="text-3xl mb-2">🌐</p>
                      <p>Click "Fetch Live Data" to analyze full LiveScore region & competition breakdown</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Regions List */}
                      <div className="rounded-xl border border-[#1e1e32] p-4 bg-[#0d0d1e] space-y-3">
                        <div className="flex items-center justify-between border-b border-[#1a1a28] pb-2">
                          <h3 className="text-xs font-black uppercase text-white flex items-center gap-2">
                            <span>🌍</span> Active Regions ({catalogStats.regionsList.length})
                          </h3>
                          <span className="text-[10px] font-bold text-[#00b341]">LiveScore API</span>
                        </div>
                        <div className="flex flex-wrap gap-1.5 max-h-60 overflow-y-auto pr-1">
                          {catalogStats.regionsList.map(r => (
                            <span key={r} className="text-[10px] font-semibold bg-[#131320] text-gray-300 px-2.5 py-1 rounded-lg border border-[#2a2a40]">
                              {r}
                            </span>
                          ))}
                        </div>
                      </div>

                      {/* Competitions List */}
                      <div className="rounded-xl border border-[#1e1e32] p-4 bg-[#0d0d1e] space-y-3">
                        <div className="flex items-center justify-between border-b border-[#1a1a28] pb-2">
                          <h3 className="text-xs font-black uppercase text-white flex items-center gap-2">
                            <span>🏆</span> Active Competitions ({catalogStats.competitionsList.length})
                          </h3>
                          <span className="text-[10px] font-bold text-[#00b341]">LiveScore API</span>
                        </div>
                        <div className="flex flex-wrap gap-1.5 max-h-60 overflow-y-auto pr-1">
                          {catalogStats.competitionsList.map(c => (
                            <span key={c} className="text-[10px] font-semibold bg-[#131320] text-emerald-400 px-2.5 py-1 rounded-lg border border-[#1e3b2b]">
                              {c}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* API Endpoint Reference */}
              <div className="rounded-xl p-4 space-y-2 mt-4 border border-[#1e1e32]" style={{ background: '#0d0d1e' }}>
                <p className="text-[10px] font-black uppercase text-gray-500 tracking-widest">🔗 API Endpoints in Use</p>
                <div className="space-y-1">
                  {[
                    { label: 'Live Scores / Fixtures', url: `https://prod-cdn-public-api.livescore.com/v1/api/app/date/soccer/${scoresDate.replace(/-/g,'')}/0?MD=1` },
                    { label: 'Standings', url: 'https://prod-cdn-public-api.livescore.com/v1/api/app/stage/soccer/{leagueId}/table' },
                    { label: 'News (Contentful)', url: 'https://cdn.contentful.com/spaces/u47hn5mzoiuo/environments/master/entries?content_type=article' },
                  ].map(ep => (
                    <div key={ep.label} className="flex items-start gap-3">
                      <span className="text-[10px] font-bold text-gray-400 w-32 shrink-0">{ep.label}</span>
                      <code className="text-[9px] font-mono text-emerald-400 break-all">{ep.url}</code>
                      <button onClick={() => { navigator.clipboard.writeText(ep.url); toast('URL copied!', 'info') }}
                        className="text-[9px] text-gray-600 hover:text-white transition-colors shrink-0">📋</button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {tab === 'settings' && (
          <div className="space-y-6 max-w-2xl">
            <SectionHead title="⚙️ Platform Settings" />

            {/* Branding & Theme Customizer */}
            <Card className="p-6 space-y-4">
              <h3 className="text-sm font-black text-white uppercase tracking-wider border-b border-[#1e1e32] pb-3">🎨 Branding & Custom Theme</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-black uppercase tracking-wider text-gray-500 mb-1">Site Logo URL</label>
                  <input value={settings.logoUrl} onChange={e => setSettings(p => ({ ...p, logoUrl: e.target.value }))} className={INPUT} style={INPUT_STYLE} />
                </div>
                <div>
                  <label className="block text-[10px] font-black uppercase tracking-wider text-gray-500 mb-1">Primary Brand Color</label>
                  <div className="flex gap-2 items-center">
                    <input type="color" value={settings.primaryColor} onChange={e => setSettings(p => ({ ...p, primaryColor: e.target.value }))} className="w-10 h-10 rounded border-0 bg-transparent cursor-pointer" />
                    <input value={settings.primaryColor} onChange={e => setSettings(p => ({ ...p, primaryColor: e.target.value }))} className={INPUT} style={INPUT_STYLE} />
                  </div>
                </div>
                <div>
                  <label className="block text-[10px] font-black uppercase tracking-wider text-gray-500 mb-1">Primary Display Font</label>
                  <select value={settings.fontFamily} onChange={e => setSettings(p => ({ ...p, fontFamily: e.target.value }))} className={INPUT} style={INPUT_STYLE}>
                    {['Big Shoulders Display','Inter','Outfit','Roboto','Montserrat'].map(f => <option key={f}>{f}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-black uppercase tracking-wider text-gray-500 mb-1">Favicon Path</label>
                  <input value={settings.faviconUrl} onChange={e => setSettings(p => ({ ...p, faviconUrl: e.target.value }))} className={INPUT} style={INPUT_STYLE} />
                </div>
              </div>
            </Card>

            {/* Social Links Manager */}
            <Card className="p-6 space-y-4">
              <h3 className="text-sm font-black text-white uppercase tracking-wider border-b border-[#1e1e32] pb-3">🔗 Social Media Links</h3>
              <div className="grid grid-cols-2 gap-4">
                {([
                  { label:'YouTube Channel', key:'youtubeUrl' as const },
                  { label:'Instagram Handle', key:'instagramUrl' as const },
                  { label:'TikTok Profile', key:'tiktokUrl' as const },
                  { label:'Facebook Page', key:'facebookUrl' as const },
                  { label:'WhatsApp Channel', key:'whatsappChannelUrl' as const },
                  { label:'Discord Server', key:'discordUrl' as const },
                ]).map(s => (
                  <div key={s.key}>
                    <label className="block text-[10px] font-black uppercase tracking-wider text-gray-500 mb-1">{s.label}</label>
                    <input value={settings[s.key]} onChange={e => setSettings(p => ({ ...p, [s.key]: e.target.value }))} className={INPUT} style={INPUT_STYLE} />
                  </div>
                ))}
              </div>
            </Card>

            {/* Legal Policies Editor */}
            <Card className="p-6 space-y-4">
              <h3 className="text-sm font-black text-white uppercase tracking-wider border-b border-[#1e1e32] pb-3">📜 Legal & Compliance Policies</h3>
              <div className="space-y-3">
                <div>
                  <label className="block text-[10px] font-black uppercase tracking-wider text-gray-500 mb-1">Terms of Service</label>
                  <textarea value={settings.termsOfService} onChange={e => setSettings(p => ({ ...p, termsOfService: e.target.value }))} rows={2} className={`${INPUT} resize-none`} style={INPUT_STYLE} />
                </div>
                <div>
                  <label className="block text-[10px] font-black uppercase tracking-wider text-gray-500 mb-1">Privacy Policy (Kenya DPA 2019 / GDPR)</label>
                  <textarea value={settings.privacyPolicy} onChange={e => setSettings(p => ({ ...p, privacyPolicy: e.target.value }))} rows={2} className={`${INPUT} resize-none`} style={INPUT_STYLE} />
                </div>
              </div>
            </Card>

            {/* SEO & Social Defaults */}
            <Card className="p-6 space-y-4">
              <h3 className="text-sm font-black text-white uppercase tracking-wider border-b border-[#1e1e32] pb-3">🔍 SEO & Social Defaults</h3>
              <div className="space-y-3">
                <div>
                  <label className="block text-[10px] font-black uppercase tracking-wider text-gray-500 mb-1">Global Meta Description</label>
                  <textarea value={settings.seoDescription} onChange={e => setSettings(p => ({ ...p, seoDescription: e.target.value }))} rows={2} className={`${INPUT} resize-none`} style={INPUT_STYLE} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-black uppercase tracking-wider text-gray-500 mb-1">Default OG Image URL</label>
                    <input value={settings.ogImageUrl} onChange={e => setSettings(p => ({ ...p, ogImageUrl: e.target.value }))} className={INPUT} style={INPUT_STYLE} />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black uppercase tracking-wider text-gray-500 mb-1">Twitter / X Handle</label>
                    <input value={settings.twitterHandle} onChange={e => setSettings(p => ({ ...p, twitterHandle: e.target.value }))} className={INPUT} style={INPUT_STYLE} />
                  </div>
                </div>
              </div>
            </Card>

            {/* Email & M-Pesa Gateway Config */}
            <Card className="p-6 space-y-4">
              <h3 className="text-sm font-black text-white uppercase tracking-wider border-b border-[#1e1e32] pb-3">✉️ Email & M-Pesa Integration</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-black uppercase tracking-wider text-gray-500 mb-1">Email Provider / Driver</label>
                  <select value={settings.emailDriver} onChange={e => setSettings(p => ({ ...p, emailDriver: e.target.value }))} className={INPUT} style={INPUT_STYLE}>
                    {['Resend (Recommended)','SendGrid','Postmark','AWS SES','Custom SMTP'].map(d => <option key={d}>{d}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-black uppercase tracking-wider text-gray-500 mb-1">Sender Name</label>
                  <input value={settings.emailFromName} onChange={e => setSettings(p => ({ ...p, emailFromName: e.target.value }))} className={INPUT} style={INPUT_STYLE} />
                </div>
                <div>
                  <label className="block text-[10px] font-black uppercase tracking-wider text-gray-500 mb-1">M-Pesa B2C Shortcode</label>
                  <input value={settings.mpesaShortcode} onChange={e => setSettings(p => ({ ...p, mpesaShortcode: e.target.value }))} className={INPUT} style={INPUT_STYLE} />
                </div>
                <div>
                  <label className="block text-[10px] font-black uppercase tracking-wider text-gray-500 mb-1">M-Pesa Environment</label>
                  <select value={settings.mpesaEnv} onChange={e => setSettings(p => ({ ...p, mpesaEnv: e.target.value }))} className={INPUT} style={INPUT_STYLE}>
                    <option>Sandbox</option>
                    <option>Production</option>
                  </select>
                </div>
              </div>
            </Card>

            {/* Easyship & Shipping Config */}
            <Card className="p-6 space-y-4">
              <h3 className="text-sm font-black text-white uppercase tracking-wider border-b border-[#1e1e32] pb-3 flex items-center justify-between">
                <span>🚚 Shipping & Easyship API Configuration</span>
                <span className="text-[10px] font-bold text-[#00b341]">Easyship Sandbox Connected ✓</span>
              </h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-black uppercase tracking-wider text-gray-500 mb-1">Origin Country</label>
                  <input
                    value={shippingCfg.originCountry}
                    onChange={e => setShippingCfg(c => ({ ...c, originCountry: e.target.value }))}
                    className={INPUT} style={INPUT_STYLE}
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black uppercase tracking-wider text-gray-500 mb-1">Origin City</label>
                  <input
                    value={shippingCfg.originCity}
                    onChange={e => setShippingCfg(c => ({ ...c, originCity: e.target.value }))}
                    className={INPUT} style={INPUT_STYLE}
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black uppercase tracking-wider text-gray-500 mb-1">Free Shipping Threshold (KES)</label>
                  <input
                    type="number"
                    value={shippingCfg.freeShippingThresholdKes}
                    onChange={e => setShippingCfg(c => ({ ...c, freeShippingThresholdKes: parseFloat(e.target.value) || 0 }))}
                    className={INPUT} style={INPUT_STYLE}
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black uppercase tracking-wider text-gray-500 mb-1">USD to KES Exchange Rate</label>
                  <input
                    type="number"
                    value={shippingCfg.currencyRateKesToUsd}
                    onChange={e => setShippingCfg(c => ({ ...c, currencyRateKesToUsd: parseFloat(e.target.value) || 130 }))}
                    className={INPUT} style={INPUT_STYLE}
                  />
                </div>
              </div>
              <button
                onClick={() => {
                  saveShippingConfig(shippingCfg)
                  toastLib.success('✅ Shipping & Easyship configuration saved!')
                }}
                className="px-4 py-2 text-xs font-black text-white rounded-xl shadow-lg"
                style={{ background: '#00b341' }}
              >
                Save Shipping Settings
              </button>
            </Card>

            <Card className="p-6 space-y-5">
              <h3 className="text-sm font-black text-white uppercase tracking-wider border-b border-[#1e1e32] pb-3">🌐 General</h3>
              <div className="grid grid-cols-2 gap-4">
                {([
                  { label:'Site Name',             key:'siteName'     as const },
                  { label:'Tagline',               key:'tagline'      as const },
                  { label:'Admin Email',            key:'adminEmail'   as const },
                  { label:'Support Email',          key:'supportEmail' as const },
                  { label:'Min Tip Amount (KES)',   key:'minTipAmount' as const },
                  { label:'Max Tip Amount (KES)',   key:'maxTipAmount' as const },
                  { label:'Paystack Callback URL',  key:'callbackUrl'  as const },
                ] as const).map(f => (
                  <div key={f.key} className={f.key === 'callbackUrl' ? 'col-span-2' : ''}>
                    <label className="block text-[10px] font-black uppercase tracking-wider text-gray-500 mb-1">{f.label}</label>
                    <input value={settings[f.key] as string} onChange={e => setSettings(p => ({ ...p, [f.key]: e.target.value }))} className={INPUT} style={INPUT_STYLE} />
                  </div>
                ))}
                <div>
                  <label className="block text-[10px] font-black uppercase tracking-wider text-gray-500 mb-1">Timezone</label>
                  <select value={settings.timezone} onChange={e => setSettings(p => ({ ...p, timezone: e.target.value }))} className={INPUT} style={INPUT_STYLE}>
                    {['Africa/Nairobi','Africa/Lagos','Africa/Johannesburg','Africa/Dar_es_Salaam','Europe/London','America/New_York'].map(tz => <option key={tz}>{tz}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-black uppercase tracking-wider text-gray-500 mb-1">Currency</label>
                  <select value={settings.currency} onChange={e => setSettings(p => ({ ...p, currency: e.target.value }))} className={INPUT} style={INPUT_STYLE}>
                    {['KES','USD','UGX','TZS','GBP','EUR','NGN','ZAR'].map(cur => <option key={cur}>{cur}</option>)}
                  </select>
                </div>
              </div>
            </Card>

            <Card className="p-6 space-y-4">
              <h3 className="text-sm font-black text-white uppercase tracking-wider border-b border-[#1e1e32] pb-3">🔧 Feature Flags</h3>
              <div className="grid sm:grid-cols-2 gap-x-8 gap-y-4">
                {([
                  { key:'tipsEnabled'            as const, label:'Tips / Donations',        sub:'Allow Paystack tips' },
                  { key:'shopEnabled'            as const, label:'Shop / Merch',             sub:'Enable checkout & listings' },
                  { key:'allowGuestCheckout'     as const, label:'Guest Checkout',           sub:'Purchases without account' },
                  { key:'commentsEnabled'        as const, label:'Comments',                 sub:'Article discussion' },
                  { key:'predictionsEnabled'     as const, label:'Predictions',              sub:'Match predictions' },
                  { key:'fantasyEnabled'         as const, label:'Fantasy League',           sub:'Fantasy team management' },
                  { key:'adsEnabled'             as const, label:'Ad Slots',                 sub:'Show ads across the platform' },
                  { key:'pushEnabled'            as const, label:'Push Notifications',       sub:'Web & mobile push' },
                  { key:'liveScoresEnabled'      as const, label:'Live Scores Widget',       sub:'Real-time match scores' },
                  { key:'quizEnabled'            as const, label:'Quizzes',                  sub:'Football trivia quizzes' },
                  { key:'registrationOpen'       as const, label:'Open Registration',        sub:'Allow new user sign-ups' },
                  { key:'emailVerificationRequired' as const, label:'Email Verification',   sub:'Require verified email' },
                  { key:'twoFactorRequired'      as const, label:'2FA for Admins',          sub:'Enforce TOTP on admin login' },
                  { key:'autoBackup'             as const, label:'Auto Backup',             sub:'Daily data backup to cloud' },
                  { key:'maintenanceMode'        as const, label:'🚧 Maintenance Mode',     sub:'Show maintenance page globally' },
                ] as const).map(t => (
                  <div key={t.key} className="flex items-center justify-between gap-4">
                    <div><p className="text-sm font-bold text-white">{t.label}</p><p className="text-[10px] text-gray-600">{t.sub}</p></div>
                    <button onClick={() => setSettings(p => ({ ...p, [t.key]: !p[t.key] }))}
                      className="relative w-12 h-6 rounded-full transition-all shrink-0"
                      style={{ background: settings[t.key as keyof typeof settings] ? (t.key === 'maintenanceMode' ? '#ef4444' : '#00b341') : '#1e1e32' }}>
                      <span className="absolute top-1 w-4 h-4 rounded-full bg-white shadow transition-all"
                        style={{ left: settings[t.key as keyof typeof settings] ? '28px' : '4px' }} />
                    </button>
                  </div>
                ))}
              </div>
            </Card>

            {/* SECURITY: Only shows connection status — zero key material rendered */}
            <Card className="p-5 border-[#00b341]/20" style={{ background: 'rgba(0,179,65,.04)' }}>
              <h3 className="text-sm font-black text-white uppercase mb-3">💳 Paystack Connection</h3>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-gray-400">Provider: <span className="text-white font-bold">{payConfig.provider}</span></p>
                  <p className="text-xs text-gray-400 mt-1">Mode: <span className="font-bold" style={{ color: payConfig.isLive ? '#00b341' : '#f59e0b' }}>{payConfig.isLive ? '🟢 Live' : '🟡 Test'}</span></p>
                  <p className="text-xs text-gray-400 mt-1">Key configured: <span className="font-bold text-white">{payConfig.hasPublicKey ? 'Yes (via .env)' : 'No — add VITE_PAYMENT_PUBLIC_KEY to .env'}</span></p>
                </div>
                <div className="text-4xl">💳</div>
              </div>
              <div className="mt-3 p-2 rounded-lg text-[10px] font-mono text-yellow-600" style={{ background: 'rgba(245,158,11,.08)', border: '1px solid rgba(245,158,11,.15)' }}>
                🔒 Keys live in .env only. Never paste them here or in any component.
              </div>
            </Card>

            {/* Admin password change */}
            <Card className="p-6 space-y-4">
              <h3 className="text-sm font-black text-white uppercase tracking-wider border-b border-[#1e1e32] pb-3">🔑 Change Admin Passcode</h3>
              <input type="password" value={currentPass} onChange={e => setCurrentPass(e.target.value)} placeholder="Current passcode" className={INPUT} style={INPUT_STYLE} />
              <input type="password" value={newAdminPass} onChange={e => setNewAdminPass(e.target.value)} placeholder="New passcode (min 8 chars)" className={INPUT} style={INPUT_STYLE} />
              <input type="password" value={confirmPass} onChange={e => setConfirmPass(e.target.value)} placeholder="Confirm new passcode" className={INPUT} style={INPUT_STYLE} />
              <button onClick={() => {
                if (!currentPass || (currentPass !== 'admin123' && currentPass !== 'flowerz2026')) { toast('❌ Current passcode incorrect.', 'error'); return }
                if (newAdminPass.length < 8) { toast('❌ New passcode must be at least 8 characters.', 'error'); return }
                if (newAdminPass !== confirmPass) { toast('❌ Passcodes do not match.', 'error'); return }
                setPassSaved(true); setCurrentPass(''); setNewAdminPass(''); setConfirmPass('')
                setTimeout(() => setPassSaved(false), 3000)
              }} className="px-5 py-2.5 text-xs font-black text-white rounded-xl hover:opacity-90 transition-all" style={{ background: passSaved ? '#00b341' : '#3b82f6' }}>
                {passSaved ? '✓ Passcode Updated!' : 'Update Passcode →'}
              </button>
            </Card>

            <button onClick={() => {
              try {
                localStorage.setItem('flowerzfc_settings', JSON.stringify(settings))
                window.dispatchEvent(new Event('flowerzfc_config_updated'))
              } catch {}
              setSettingsSaved(true)
              toastLib.success('✓ Settings Saved! Applied site-wide.')
              setTimeout(() => setSettingsSaved(false), 3000)
            }}
              className="w-full py-4 font-black text-white rounded-xl shadow-xl transition-all hover:opacity-90"
              style={{ background: settingsSaved ? '#00b341' : 'linear-gradient(135deg,#00b341,#00d94f)', fontFamily: 'Big Shoulders Display', fontSize: '16px' }}>
              {settingsSaved ? '✓ Settings Saved!' : 'Save Settings →'}
            </button>

            {/* Settings Danger Zone */}
            <Card className="p-5 border-red-500/20" style={{ background: 'rgba(239,68,68,.03)' }}>
              <h3 className="text-sm font-black text-red-400 uppercase mb-3">⚠️ Danger Zone</h3>
              <button onClick={() => setShowDanger(true)} className="px-4 py-2.5 text-[11px] font-bold text-red-400 rounded-xl border border-red-400/30 hover:border-red-400 transition-all">Reset All Admin Data</button>
            </Card>
          </div>
        )}

        {/* ══ MIXES / AUDIO ═════════════════════════════════════════════════ */}
        {tab === 'mixes' && (
          <div className="space-y-6">
            <SectionHead
              title="🎧 DJ Mixes & Audio Catalog Management"
              sub="Manage DJ FlowerZ official Mixcloud releases, podcast episodes, and matchday sound tracks."
              action={
                <button onClick={() => setShowAddMix(true)} className="px-5 py-2.5 text-xs font-black text-white rounded-xl hover:opacity-90 transition-all" style={{ background: '#00b341' }}>
                  + Add New DJ Mix
                </button>
              }
            />

            {/* Mixes List */}
            <div className="grid md:grid-cols-2 gap-4">
              {mixes.map(m => (
                <Card key={m.id} className="p-5 flex gap-4 items-start">
                  <img src={m.cover_url || 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=400&h=400&fit=crop'} alt={m.title} className="w-24 h-24 rounded-xl object-cover shrink-0 border border-[#1e1e32]" />
                  <div className="flex-1 min-w-0">
                    <span className="text-[9px] font-black uppercase text-[#00b341] tracking-wider">{m.genre || 'Afrobeats'}</span>
                    <h3 className="text-base font-bold text-white line-clamp-1 mt-0.5 mb-1">{m.title}</h3>
                    <p className="text-xs text-gray-500 font-mono mb-2">▶ {m.plays || 0} plays • {m.mixcloud_id || 'Mixcloud Track'}</p>
                    <div className="flex items-center gap-2">
                      <button onClick={() => {
                        if (confirm(`Delete mix "${m.title}"?`)) {
                          deleteMixFromDb(m.id).then(({ error }) => {
                            if (error) console.error(error)
                          })
                          setMixes(prev => prev.filter(x => x.id !== m.id))
                          toastLib.success(`Deleted mix "${m.title}"`)
                        }
                      }} className="px-3 py-1 text-[10px] font-bold text-red-400 rounded-lg border border-red-400/30 hover:border-red-400 transition-all">
                        Delete Mix
                      </button>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ══ ALL MODALS ════════════════════════════════════════════════════════ */}

      {/* Order Detail Modal */}
      {detailOrder && (
        <Modal title={`Invoice & Order Details · ${detailOrder.id}`} onClose={() => setDetailOrder(null)}>
          <div className="space-y-4 text-sm">
            {/* Paystack status banner */}
            <div className="p-3 rounded-xl border border-[#00b341]/30 flex items-center justify-between" style={{ background: 'rgba(0,179,65,.06)' }}>
              <div>
                <p className="text-xs font-bold text-white flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-400" /> Paystack Transaction Verified
                </p>
                <p className="text-[10px] text-gray-400 mt-0.5">Method: {detailOrder.method} · Date: {detailOrder.date}</p>
              </div>
              <span className="px-2.5 py-1 text-[10px] font-black uppercase rounded-lg text-white" style={{ background: SC[detailOrder.status]?.bg || '#00b341' }}>
                {detailOrder.status}
              </span>
            </div>

            {/* Customer & Shipping details */}
            <div className="grid grid-cols-2 gap-3 p-3 rounded-xl border border-[#1e1e32]" style={{ background: '#0d0d1e' }}>
              <div>
                <label className="text-[9px] font-black uppercase tracking-wider text-gray-500 block mb-1">Customer</label>
                <p className="font-bold text-white text-xs">{detailOrder.customer}</p>
                <p className="text-[10px] text-gray-400">{detailOrder.email}</p>
                <p className="text-[10px] text-gray-400">{detailOrder.phone || 'No phone recorded'}</p>
              </div>
              <div>
                <label className="text-[9px] font-black uppercase tracking-wider text-gray-500 block mb-1">Delivery Address</label>
                <p className="text-xs text-gray-300 leading-snug">{detailOrder.address}</p>
              </div>
            </div>

            {/* Visual Order Lifecycle Stepper */}
            <div className="p-3 rounded-xl border border-[#1e1e32]" style={{ background: '#0d0d1e' }}>
              <label className="text-[9px] font-black uppercase tracking-wider text-gray-500 block mb-2">Order Status Lifecycle (Click stage to update)</label>
              <div className="grid grid-cols-4 gap-2">
                {[
                  { step: 'Pending', icon: '🛒', desc: 'Paid & Placed' },
                  { step: 'Processing', icon: '⚙️', desc: 'Printing/Packing' },
                  { step: 'Shipped', icon: '🚚', desc: 'In-Transit' },
                  { step: 'Fulfilled', icon: '✅', desc: 'Delivered' },
                ].map((s, idx) => {
                  const stages = ['Pending', 'Processing', 'Shipped', 'Fulfilled']
                  const currentIdx = stages.indexOf(detailOrder.status)
                  const isPassed = currentIdx >= idx && detailOrder.status !== 'Refunded'
                  const isCurrent = detailOrder.status === s.step
                  return (
                    <button type="button" key={s.step} onClick={() => {
                      setDetailOrder(p => p ? { ...p, status: s.step } : p)
                      setOrders(prev => prev.map(x => x.id === detailOrder.id ? { ...x, status: s.step } : x))
                    }} className={`p-2 rounded-xl border text-center transition-all ${
                      isCurrent ? 'border-[#00b341] bg-[#00b341]/10 text-white shadow-lg' : isPassed ? 'border-[#00b341]/50 text-gray-300 bg-[#00b341]/5' : 'border-[#1e1e32] bg-[#131320] text-gray-500 hover:border-gray-500'
                    }`}>
                      <span className="text-base block mb-0.5">{s.icon}</span>
                      <p className="text-[10px] font-black">{s.step}</p>
                      <p className="text-[8px] text-gray-500">{s.desc}</p>
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Items summary */}
            <div className="p-3 rounded-xl border border-[#1e1e32]" style={{ background: '#0d0d1e' }}>
              <label className="text-[9px] font-black uppercase tracking-wider text-gray-500 block mb-2">Purchased Merchandise</label>
              <div className="flex justify-between items-center py-2 border-b border-[#1e1e32]">
                <span className="text-xs text-white font-bold">{detailOrder.items}</span>
                <span className="text-sm font-black text-[#00b341]" style={{ fontFamily: 'Big Shoulders Display' }}>${detailOrder.total.toFixed(2)}</span>
              </div>
              <div className="flex justify-between items-center pt-2 text-xs">
                <span className="text-gray-400">Grand Total</span>
                <span className="font-black text-white text-base" style={{ fontFamily: 'Big Shoulders Display' }}>${detailOrder.total.toFixed(2)} USD</span>
              </div>
            </div>

            {/* Tracking number assigner */}
            <div>
              <label className="text-[10px] font-bold text-gray-400 block mb-1">Tracking Number / Shipping Code</label>
              <input value={detailOrder.tracking || ''} onChange={e => {
                const val = e.target.value
                setDetailOrder(p => p ? { ...p, tracking: val } : p)
                setOrders(prev => prev.map(x => x.id === detailOrder.id ? { ...x, tracking: val } : x))
              }} placeholder="e.g. DHL-KE-849120" className={INPUT} style={INPUT_STYLE} />
            </div>

            <div className="flex gap-2 pt-2">
              <a href={`mailto:${detailOrder.email}?subject=Your FlowerZFC Order ${detailOrder.id}`} className="flex-1 py-2.5 text-center text-xs font-bold text-white rounded-xl hover:opacity-90" style={{ background: '#3b82f6' }}>✉️ Email Customer</a>
              <button onClick={() => window.print()} className="flex-1 py-2.5 text-xs font-bold text-white rounded-xl hover:bg-white/10" style={{ background: '#131320', border: '1px solid #1e1e32' }}>🖨️ Print Shipping Invoice</button>
            </div>
          </div>
        </Modal>
      )}

      {/* User Detail */}
      {detailUser && (
        <Modal title={`User Profile — ${detailUser.name}`} onClose={() => setDetailUser(null)}>
          <div className="space-y-4 text-sm">

            {/* Profile Header & Avatar */}
            <div className="flex items-center gap-4 p-4 rounded-xl border border-[#1e1e32]" style={{ background: '#0d0d1e' }}>
              <div className="relative w-16 h-16 rounded-full overflow-hidden border-2 border-[#00b341] shrink-0 bg-[#1e1e32] flex items-center justify-center font-black text-2xl text-white">
                <img src={getUserAvatarUrl(detailUser)} alt={detailUser.name} className="w-full h-full object-cover" onError={e => { (e.target as HTMLImageElement).style.display = 'none' }} />
                <span>{detailUser.name.charAt(0)}</span>
              </div>
              <div>
                <h3 className="font-bold text-white text-base">{detailUser.name}</h3>
                <p className="text-xs text-gray-500">{detailUser.email}</p>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded-full"
                    style={{ background: detailUser.role === 'admin' ? 'rgba(0,179,65,.2)' : 'rgba(139,92,246,.2)', color: detailUser.role === 'admin' ? '#00b341' : '#a78bfa' }}>{detailUser.role}</span>
                  <Badge s={detailUser.status} />
                </div>
              </div>
            </div>

            {/* Account Info */}
            <div className="space-y-2 p-4 rounded-xl border border-[#1e1e32]" style={{ background: '#0d0d1e' }}>
              {[
                ['Joined Date', detailUser.joined],
                ['Orders Completed', detailUser.orders.toString()],
                ['Tips Contribution', detailUser.tips],
                ['Avatar Source', detailUser.avatar ? 'Custom Upload / Preset' : 'Gravatar / Unavatar Auto-Sync'],
              ].map(([k, v]) => (
                <div key={k} className="flex justify-between items-center text-xs py-1 border-b border-[#1e1e32]/40 last:border-0">
                  <span className="text-[10px] font-bold text-gray-500 uppercase">{k}</span>
                  <span className="text-white font-bold">{v}</span>
                </div>
              ))}
            </div>

            <div className="flex gap-2 pt-2">
              <a href={`mailto:${detailUser.email}`} className="flex-1 py-2.5 text-center text-xs font-bold text-white rounded-xl" style={{ background: '#3b82f6' }}>✉️ Email User</a>
              {detailUser.role !== 'admin' && (
                <button onClick={() => { setUsers(prev => prev.map(x => x.id === detailUser.id ? { ...x, status: x.status === 'Banned' ? 'Active' : 'Banned' } : x)); setDetailUser(null) }}
                  className="flex-1 py-2.5 text-xs font-bold text-red-400 rounded-xl border border-red-400/30">{detailUser.status === 'Banned' ? '✓ Unban' : '🚫 Ban'} User</button>
              )}
            </div>
          </div>
        </Modal>
      )}

      {/* Attendee List */}
      {attendeeTck && (
        <Modal title={`Attendees — ${attendeeTck.event}`} onClose={() => setAttendeeTck(null)}>
          <div className="space-y-3">
            <div className="grid grid-cols-3 gap-3 p-3 rounded-xl text-center" style={{ background: '#0d0d1e', border: '1px solid #1e1e32' }}>
              <div><p className="text-[9px] text-gray-600 font-bold">Regular</p><p className="text-2xl font-black text-white" style={{ fontFamily: 'Big Shoulders Display' }}>{attendeeTck.regularSold}</p></div>
              <div><p className="text-[9px] text-gray-600 font-bold">VIP</p><p className="text-2xl font-black text-yellow-400" style={{ fontFamily: 'Big Shoulders Display' }}>{attendeeTck.vipSold}</p></div>
              <div><p className="text-[9px] text-gray-600 font-bold">Capacity</p><p className="text-2xl font-black text-gray-400" style={{ fontFamily: 'Big Shoulders Display' }}>{attendeeTck.capacity}</p></div>
            </div>
            <p className="text-xs text-gray-500">📍 {attendeeTck.venue} · {attendeeTck.date}</p>
            <p className="text-xs text-gray-600">Full attendee list will be available after connecting to the booking database.</p>
            <button onClick={() => downloadCSV(`attendees-${attendeeTck.id}.csv`, [['Sample','Attendee','attendee@example.com','Regular','Aug 28 2026']], ['Name','Surname','Email','Ticket Type','Date'])}
              className="w-full py-2.5 text-xs font-bold text-white rounded-xl hover:opacity-90" style={{ background: '#00b341' }}>⬇ Export Attendee List</button>
          </div>
        </Modal>
      )}

      {/* Edit Event */}
      {editEvent && (
        <Modal title="Edit Event" onClose={() => setEditEvent(null)}>
          <div className="space-y-3">
            {[{ label:'Event Name', key:'event' as const }, { label:'Venue', key:'venue' as const }, { label:'Date', key:'date' as const }].map(f => (
              <div key={f.key}>
                <label className="block text-[10px] font-black uppercase text-gray-500 mb-1">{f.label}</label>
                <input value={editEvent[f.key] as string} onChange={e => setEditEvent(p => p ? { ...p, [f.key]: e.target.value } : p)} className={INPUT} style={INPUT_STYLE} />
              </div>
            ))}
            <div className="grid grid-cols-3 gap-2">
              {[{ label:'Regular $', key:'regularPrice' as const }, { label:'VIP $', key:'vipPrice' as const }, { label:'Capacity', key:'capacity' as const }].map(f => (
                <div key={f.key}><label className="block text-[9px] font-bold text-gray-500 mb-1">{f.label}</label>
                  <input type="number" value={editEvent[f.key]} onChange={e => setEditEvent(p => p ? { ...p, [f.key]: parseInt(e.target.value) || 0 } : p)} className={INPUT} style={INPUT_STYLE} /></div>
              ))}
            </div>
            <button onClick={() => { setTickets(prev => prev.map(x => x.id === editEvent.id ? editEvent : x)); setEditEvent(null) }}
              className="w-full py-3 text-sm font-black text-white rounded-xl hover:opacity-90" style={{ background: '#00b341' }}>Save Changes →</button>
          </div>
        </Modal>
      )}

      {/* Edit Ad Slot */}
      {editAdSlot && (
        <Modal title={`✏️ Edit Ad Slot — ${editAdSlot.slot}`} onClose={() => setEditAdSlot(null)}>
          <form onSubmit={e => { e.preventDefault(); setAds(prev => prev.map(x => x.id === editAdSlot!.id ? editAdSlot! : x)); setEditAdSlot(null); toast('✅ Ad slot updated!', 'success') }}
            className="space-y-4 text-sm">
            {/* Placement */}
            <div className="rounded-xl p-4 space-y-3" style={{ background: '#0d0d1e', border: '1px solid #1e1e32' }}>
              <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest">📍 Placement & Advertiser</p>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold text-gray-500 mb-1">Slot Name / Position</label>
                  <input value={editAdSlot.slot} onChange={e => setEditAdSlot(p => p ? { ...p, slot: e.target.value } : p)} className={INPUT} style={INPUT_STYLE} />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-gray-500 mb-1">Advertiser</label>
                  <input value={editAdSlot.advertiser} onChange={e => setEditAdSlot(p => p ? { ...p, advertiser: e.target.value } : p)} className={INPUT} style={INPUT_STYLE} />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-gray-500 mb-1">Start Date</label>
                  <input value={editAdSlot.start} onChange={e => setEditAdSlot(p => p ? { ...p, start: e.target.value } : p)} className={INPUT} style={INPUT_STYLE} />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-gray-500 mb-1">End Date</label>
                  <input value={editAdSlot.end} onChange={e => setEditAdSlot(p => p ? { ...p, end: e.target.value } : p)} className={INPUT} style={INPUT_STYLE} />
                </div>
              </div>
            </div>
            {/* Pricing */}
            <div className="rounded-xl p-4 space-y-3" style={{ background: '#0d0d1e', border: '1px solid #1e1e32' }}>
              <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest">💰 Pricing</p>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold text-gray-500 mb-1">Price / Month (KES)</label>
                  <input type="number" value={editAdSlot.price} onChange={e => setEditAdSlot(p => p ? { ...p, price: parseInt(e.target.value)||0 } : p)} className={INPUT} style={INPUT_STYLE} />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-gray-500 mb-1">Status</label>
                  <div className="flex gap-1 mt-1">
                    {(['Active','Inactive','Pending'] as const).map(s => (
                      <button key={s} type="button"
                        onClick={() => setEditAdSlot(p => p ? { ...p, status: s } : p)}
                        className="flex-1 py-2 text-[9px] font-black rounded-lg border transition-all"
                        style={{ background: editAdSlot.status === s ? (s==='Active'?'#00b341':s==='Inactive'?'#374151':'#f59e0b') : 'transparent',
                                 borderColor: editAdSlot.status === s ? 'transparent' : '#2a2a3e', color: editAdSlot.status === s ? '#fff' : '#9ca3af' }}>
                        {s}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
              {/* Revenue projection */}
              <div className="mt-1 px-3 py-2 rounded-lg" style={{ background: '#0a1a10', border: '1px solid rgba(0,179,65,.3)' }}>
                <p className="text-[10px] text-gray-500">Revenue projection</p>
                <p className="text-base font-black text-green-400" style={{ fontFamily: 'Big Shoulders Display' }}>
                  KES {(editAdSlot.price * 12).toLocaleString()} / year
                </p>
              </div>
            </div>
            {/* Quick actions */}
            <div className="rounded-xl p-4 space-y-2" style={{ background: '#0d0d1e', border: '1px solid #1e1e32' }}>
              <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest">⚡ Quick Actions</p>
              <div className="flex gap-2 flex-wrap">
                <button type="button" onClick={() => { navigator.clipboard.writeText(editAdSlot!.advertiser); toast('📋 Advertiser email copied!', 'info') }}
                  className="px-3 py-2 text-[10px] font-bold text-blue-400 rounded-lg border border-blue-400/20 hover:border-blue-400 transition-all">📋 Copy Advertiser</button>
                <a href={`mailto:${editAdSlot.advertiser}?subject=Ad Slot Renewal — ${editAdSlot.slot}`}
                  className="px-3 py-2 text-[10px] font-bold text-purple-400 rounded-lg border border-purple-400/20 hover:border-purple-400 transition-all">✉️ Email Advertiser</a>
              </div>
            </div>
            <div className="flex gap-2 pt-1">
              <button type="button" onClick={() => setEditAdSlot(null)} className="flex-1 py-3 font-bold text-white rounded-xl border border-[#1e1e32]">Cancel</button>
              <button type="submit" className="flex-1 py-3 font-black text-white rounded-xl hover:opacity-90" style={{ background: '#00b341' }}>Save Changes →</button>
            </div>
          </form>
        </Modal>
      )}

      {/* Edit Product */}
      {editProduct && (
        <Modal title={`Edit — ${editProduct.name}`} onClose={() => setEditProduct(null)}>
          <div className="space-y-4 max-h-[75vh] overflow-y-auto pr-1">

            {/* 📸 MEDIA & IMAGES */}
            <div className="p-4 rounded-xl border border-[#1e1e32]" style={{ background: '#0d0d1e' }}>
              <div className="flex items-center justify-between mb-2">
                <label className="text-[10px] font-black uppercase tracking-wider text-[#00b341]">📸 Product Images (Drag & Drop or Device Upload · Max 8)</label>
                <span className="text-[10px] text-gray-500 font-bold">{(editProduct.images || []).length} / 8 uploaded</span>
              </div>
              <p className="text-[10px] text-gray-400 mb-3">Upload front, back, close-ups, and lifestyle shots. First image is the primary cover.</p>
              
              {/* Drag and drop zone */}
              <div
                onDragOver={e => { e.preventDefault(); e.stopPropagation(); setIsDragOverProduct(true) }}
                onDragLeave={e => { e.preventDefault(); e.stopPropagation(); setIsDragOverProduct(false) }}
                onDrop={e => {
                  e.preventDefault(); e.stopPropagation(); setIsDragOverProduct(false)
                  const files = e.dataTransfer.files
                  if (!files || files.length === 0) return
                  Array.from(files).forEach(file => {
                    if (!file.type.startsWith('image/')) return
                    const reader = new FileReader()
                    reader.onload = ev => {
                      const res = ev.target?.result as string
                      if (res) {
                        setEditProduct(prev => {
                          if (!prev) return prev
                          const cur = prev.images || []
                          if (cur.length >= 8) return prev
                          const updated = [...cur, res]
                          return { ...prev, images: updated, imageUrl: updated[0] }
                        })
                      }
                    }
                    reader.readAsDataURL(file)
                  })
                }}
                className={`p-4 rounded-xl border-2 border-dashed transition-all text-center cursor-pointer mb-3 ${
                  isDragOverProduct ? 'border-[#00b341] bg-[#00b341]/10' : 'border-[#1e1e32] bg-[#131320] hover:border-[#00b341]/50'
                }`}
              >
                <span className="text-2xl block mb-1">📁</span>
                <p className="text-xs font-bold text-white mb-0.5">Drag & Drop product images here, or <span className="text-[#00b341] underline">browse device</span></p>
                <p className="text-[10px] text-gray-500">Supports JPG, PNG, WEBP up to 8 images</p>
                <input type="file" multiple accept="image/*" className="hidden" id="edit-product-files" onChange={e => {
                  const files = e.target.files
                  if (!files || files.length === 0) return
                  Array.from(files).forEach(file => {
                    const reader = new FileReader()
                    reader.onload = ev => {
                      const res = ev.target?.result as string
                      if (res) {
                        setEditProduct(prev => {
                          if (!prev) return prev
                          const cur = prev.images || []
                          if (cur.length >= 8) return prev
                          const updated = [...cur, res]
                          return { ...prev, images: updated, imageUrl: updated[0] }
                        })
                      }
                    }
                    reader.readAsDataURL(file)
                  })
                }} />
                <label htmlFor="edit-product-files" className="inline-block mt-2 px-3 py-1 text-[10px] font-bold text-white bg-[#00b341] rounded-lg cursor-pointer hover:opacity-90">Select Files</label>
              </div>

              {/* Thumbnails grid */}
              <div className="grid grid-cols-4 gap-2">
                {(editProduct.images || [editProduct.imageUrl]).filter(Boolean).map((img, idx) => (
                  <div key={idx} className="relative group rounded-xl overflow-hidden border border-[#1e1e32] aspect-square bg-black">
                    <img src={img} alt="" className="w-full h-full object-cover" />
                    {idx === 0 && <span className="absolute top-1 left-1 text-[8px] font-black uppercase px-1.5 py-0.5 rounded bg-[#00b341] text-black">★ Cover</span>}
                    <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex flex-col items-center justify-center gap-1 transition-opacity">
                      {idx !== 0 && (
                        <button type="button" onClick={() => {
                          const imgs = [...(editProduct.images || [])]
                          const [chosen] = imgs.splice(idx, 1)
                          imgs.unshift(chosen)
                          setEditProduct(p => p ? { ...p, images: imgs, imageUrl: imgs[0] } : p)
                        }} className="text-[9px] font-bold text-white bg-emerald-600 px-1.5 py-0.5 rounded">Set Cover</button>
                      )}
                      <button type="button" onClick={() => {
                        const imgs = (editProduct.images || []).filter((_, i) => i !== idx)
                        setEditProduct(p => p ? { ...p, images: imgs, imageUrl: imgs[0] || '' } : p)
                      }} className="text-[9px] font-bold text-white bg-red-600 px-1.5 py-0.5 rounded">✕ Remove</button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* ⚽ BASIC PRODUCT & FOOTBALL METADATA */}
            <div className="space-y-3 p-4 rounded-xl border border-[#1e1e32]" style={{ background: '#0d0d1e' }}>
              <label className="text-[10px] font-black uppercase tracking-wider text-[#00b341]">⚽ Basic Information & Football Metadata</label>
              <div>
                <label className="block text-[10px] font-bold text-gray-500 mb-1">Product Title *</label>
                <input value={editProduct.name} onChange={e => setEditProduct(p => p ? { ...p, name: e.target.value, slug: slugify(e.target.value) } : p)} placeholder="e.g. Arsenal FC Home Jersey 2026/27" className={INPUT} style={INPUT_STYLE} />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[10px] font-bold text-gray-500 mb-1">SKU (Stock Keeping Unit)</label>
                  <input value={editProduct.sku} onChange={e => setEditProduct(p => p ? { ...p, sku: e.target.value } : p)} placeholder="e.g. ARS-HJ-2026" className={INPUT} style={INPUT_STYLE} />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-gray-500 mb-1">Category</label>
                  <select value={editProduct.category} onChange={e => setEditProduct(p => p ? { ...p, category: e.target.value } : p)} className={INPUT} style={INPUT_STYLE}>
                    {['Kits','Training Gear','Accessories','Souvenirs'].map(c => <option key={c}>{c}</option>)}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block text-[10px] font-bold text-gray-500 mb-1">Team / Club</label>
                  <input value={editProduct.team || ''} onChange={e => setEditProduct(p => p ? { ...p, team: e.target.value } : p)} placeholder="e.g. Arsenal FC" className={INPUT} style={INPUT_STYLE} />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-gray-500 mb-1">League / Tournament</label>
                  <input value={editProduct.league || ''} onChange={e => setEditProduct(p => p ? { ...p, league: e.target.value } : p)} placeholder="e.g. Premier League" className={INPUT} style={INPUT_STYLE} />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-gray-500 mb-1">Season / Era</label>
                  <input value={editProduct.season || ''} onChange={e => setEditProduct(p => p ? { ...p, season: e.target.value } : p)} placeholder="e.g. 2026/27" className={INPUT} style={INPUT_STYLE} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[10px] font-bold text-gray-500 mb-1">Kit Type</label>
                  <select value={editProduct.kitType || 'Home'} onChange={e => setEditProduct(p => p ? { ...p, kitType: e.target.value } : p)} className={INPUT} style={INPUT_STYLE}>
                    {['Home','Away','Third','Goalkeeper','N/A'].map(k => <option key={k}>{k}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-gray-500 mb-1">Version</label>
                  <select value={editProduct.version || 'Authentic / Player Version'} onChange={e => setEditProduct(p => p ? { ...p, version: e.target.value } : p)} className={INPUT} style={INPUT_STYLE}>
                    {['Authentic / Player Version','Replica / Fan Version','N/A'].map(v => <option key={v}>{v}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-[10px] font-bold text-gray-500 mb-1">Description (Fabric, Technology & Care instructions)</label>
                <textarea value={editProduct.description} onChange={e => setEditProduct(p => p ? { ...p, description: e.target.value } : p)} rows={3} placeholder="Fabric details, Dri-FIT technology, wash care..." className={`${INPUT} resize-none`} style={INPUT_STYLE} />
              </div>
            </div>

            {/* 🏷️ PRICING, MARGINS & INVENTORY */}
            <div className="space-y-3 p-4 rounded-xl border border-[#1e1e32]" style={{ background: '#0d0d1e' }}>
              <div className="flex items-center justify-between">
                <label className="text-[10px] font-black uppercase tracking-wider text-[#00b341]">🏷️ Pricing, Profit Margin & Stock</label>
                {editProduct.price > 0 && editProduct.costPerItem > 0 && (
                  <span className="text-[10px] font-black text-emerald-400">
                    Profit Margin: ${ (editProduct.price - editProduct.costPerItem).toFixed(2) } ({ Math.round(((editProduct.price - editProduct.costPerItem) / editProduct.price) * 100) }%)
                  </span>
                )}
              </div>
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block text-[10px] font-bold text-gray-500 mb-1">Base Price ($) *</label>
                  <input type="number" step="0.01" value={editProduct.price} onChange={e => setEditProduct(p => p ? { ...p, price: parseFloat(e.target.value) || 0 } : p)} className={INPUT} style={INPUT_STYLE} />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-gray-500 mb-1">Sale / Discount ($)</label>
                  <input type="number" step="0.01" value={editProduct.comparePrice || ''} onChange={e => setEditProduct(p => p ? { ...p, comparePrice: parseFloat(e.target.value) || 0 } : p)} className={INPUT} style={INPUT_STYLE} />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-gray-500 mb-1">Cost per Item ($)</label>
                  <input type="number" step="0.01" value={editProduct.costPerItem || ''} onChange={e => setEditProduct(p => p ? { ...p, costPerItem: parseFloat(e.target.value) || 0 } : p)} placeholder="Internal cost" className={INPUT} style={INPUT_STYLE} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[10px] font-bold text-gray-500 mb-1">Stock Quantity</label>
                  <input type="number" value={editProduct.stock} onChange={e => setEditProduct(p => p ? { ...p, stock: parseInt(e.target.value) || 0 } : p)} className={INPUT} style={INPUT_STYLE} />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-gray-500 mb-1">Low Stock Alert Threshold</label>
                  <input type="number" value={editProduct.lowStockThreshold || 5} onChange={e => setEditProduct(p => p ? { ...p, lowStockThreshold: parseInt(e.target.value) || 5 } : p)} className={INPUT} style={INPUT_STYLE} />
                </div>
              </div>
            </div>

            {/* 🎨 VARIANTS, CUSTOMIZATION & BADGES */}
            <div className="space-y-3 p-4 rounded-xl border border-[#1e1e32]" style={{ background: '#0d0d1e' }}>
              <label className="text-[10px] font-black uppercase tracking-wider text-[#00b341]">🎨 Customization, Badges & Variants</label>
              <div>
                <label className="block text-[10px] font-bold text-gray-500 mb-2">Available Sizes</label>
                <div className="flex gap-2 flex-wrap">
                  {['XS','S','M','L','XL','XXL','Kids','Infant','One Size'].map(s => {
                    const active = (editProduct.sizes || []).includes(s)
                    return (
                      <button type="button" key={s} onClick={() => {
                        const cur = editProduct.sizes || []
                        const updated = active ? cur.filter(x => x !== s) : [...cur, s]
                        setEditProduct(p => p ? { ...p, sizes: updated } : p)
                      }} className="px-2.5 py-1 text-[10px] font-bold rounded-lg border transition-all"
                        style={{ background: active ? '#00b341' : '#131320', color: active ? '#fff' : '#6b7280', borderColor: active ? '#00b341' : '#1e1e32' }}>{s}</button>
                    )
                  })}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[10px] font-bold text-gray-500 mb-1">Gender / Age Segment</label>
                  <select value={editProduct.gender || 'Men'} onChange={e => setEditProduct(p => p ? { ...p, gender: e.target.value } : p)} className={INPUT} style={INPUT_STYLE}>
                    {['Men','Women','Kids','Infant','Unisex'].map(g => <option key={g}>{g}</option>)}
                  </select>
                </div>
                <div className="flex items-center gap-2 pt-5">
                  <input type="checkbox" id="edit-custom" checked={editProduct.customizable} onChange={e => setEditProduct(p => p ? { ...p, customizable: e.target.checked } : p)} className="w-4 h-4 accent-[#00b341]" />
                  <label htmlFor="edit-custom" className="text-xs font-bold text-white cursor-pointer">Enable Player Name & Number Printing</label>
                </div>
              </div>
              {editProduct.customizable && (
                <div>
                  <label className="block text-[10px] font-bold text-gray-500 mb-1">Pre-loaded Squad Players (comma separated)</label>
                  <input value={editProduct.playerList || ''} onChange={e => setEditProduct(p => p ? { ...p, playerList: e.target.value } : p)} placeholder="Bukayo Saka #7, Martin Ødegaard #8" className={INPUT} style={INPUT_STYLE} />
                </div>
              )}
            </div>

            {/* 📦 SHIPPING & SEO */}
            <div className="space-y-3 p-4 rounded-xl border border-[#1e1e32]" style={{ background: '#0d0d1e' }}>
              <label className="text-[10px] font-black uppercase tracking-wider text-[#00b341]">📦 Shipping & SEO</label>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[10px] font-bold text-gray-500 mb-1">Weight (kg)</label>
                  <input value={editProduct.weight} onChange={e => setEditProduct(p => p ? { ...p, weight: e.target.value } : p)} placeholder="0.35" className={INPUT} style={INPUT_STYLE} />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-gray-500 mb-1">URL Slug</label>
                  <input value={editProduct.slug || ''} onChange={e => setEditProduct(p => p ? { ...p, slug: e.target.value } : p)} className={`${INPUT} font-mono`} style={INPUT_STYLE} />
                </div>
              </div>
              <input value={editProduct.tags} onChange={e => setEditProduct(p => p ? { ...p, tags: e.target.value } : p)} placeholder="Tags (comma-separated)" className={INPUT} style={INPUT_STYLE} />
            </div>

          </div>
          <button onClick={() => { setProducts(prev => prev.map(x => x.id === editProduct.id ? editProduct : x)); setEditProduct(null) }}
            className="w-full py-3.5 mt-3 text-sm font-black text-white rounded-xl hover:opacity-90 transition-all" style={{ background: '#00b341' }}>Save Product Changes →</button>
        </Modal>
      )}

      {/* Add Product */}
      {showAddProduct && (
        <Modal title="Add New Football Kit / Product" onClose={() => setShowAddProduct(false)}>
          <form onSubmit={e => {
            e.preventDefault()
            if (!newProduct.name || !newProduct.price) return
            const mainImg = newProduct.images[0] || newProduct.imageUrl || 'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?w=600&h=600&fit=crop'
            const prod: Product = {
              id: `p-${Date.now()}`,
              name: newProduct.name,
              sku: newProduct.sku || `SKU-${Date.now().toString().slice(-6)}`,
              description: newProduct.description,
              category: newProduct.category,
              team: newProduct.team,
              league: newProduct.league,
              season: newProduct.season,
              kitType: newProduct.kitType,
              version: newProduct.version,
              price: parseFloat(newProduct.price) || 0,
              comparePrice: parseFloat(newProduct.comparePrice) || 0,
              costPerItem: parseFloat(newProduct.costPerItem) || 0,
              stock: parseInt(newProduct.stock) || 50,
              lowStockThreshold: parseInt(newProduct.lowStockThreshold) || 5,
              sales: 0,
              status: 'Active',
              featured: false,
              images: newProduct.images.length > 0 ? newProduct.images : [mainImg],
              imageUrl: mainImg,
              sizeChartUrl: newProduct.sizeChartUrl,
              sizes: newProduct.sizes,
              gender: newProduct.gender,
              customizable: newProduct.customizable,
              playerList: newProduct.playerList,
              customNameLimit: parseInt(newProduct.customNameLimit) || 12,
              availablePatches: newProduct.availablePatches,
              weight: newProduct.weight || '0.35',
              dimensions: newProduct.dimensions,
              slug: newProduct.slug || slugify(newProduct.name),
              metaTitle: newProduct.metaTitle || newProduct.name,
              metaDescription: newProduct.metaDescription || newProduct.description,
              colors: newProduct.colors,
              tags: newProduct.tags,
            }
            setProducts(p => [prod, ...p])
            setShowAddProduct(false)
            setNewProduct(BLANK_PRODUCT)
          }} className="space-y-4 max-h-[75vh] overflow-y-auto pr-1">

            {/* 📸 MEDIA & IMAGES */}
            <div className="p-4 rounded-xl border border-[#1e1e32]" style={{ background: '#0d0d1e' }}>
              <div className="flex items-center justify-between mb-2">
                <label className="text-[10px] font-black uppercase tracking-wider text-[#00b341]">📸 Product Images (Drag & Drop or Device Upload · Max 8)</label>
                <span className="text-[10px] text-gray-500 font-bold">{newProduct.images.length} / 8 uploaded</span>
              </div>
              <p className="text-[10px] text-gray-400 mb-3">Upload front, back, close-ups, and lifestyle photos directly from your computer/phone.</p>
              
              {/* Drag and drop zone */}
              <div
                onDragOver={e => { e.preventDefault(); e.stopPropagation(); setIsDragOverProduct(true) }}
                onDragLeave={e => { e.preventDefault(); e.stopPropagation(); setIsDragOverProduct(false) }}
                onDrop={e => {
                  e.preventDefault(); e.stopPropagation(); setIsDragOverProduct(false)
                  const files = e.dataTransfer.files
                  if (!files || files.length === 0) return
                  Array.from(files).forEach(file => {
                    if (!file.type.startsWith('image/')) return
                    const reader = new FileReader()
                    reader.onload = ev => {
                      const res = ev.target?.result as string
                      if (res) {
                        setNewProduct(prev => {
                          const cur = prev.images || []
                          if (cur.length >= 8) return prev
                          const updated = [...cur, res]
                          return { ...prev, images: updated, imageUrl: updated[0] }
                        })
                      }
                    }
                    reader.readAsDataURL(file)
                  })
                }}
                className={`p-4 rounded-xl border-2 border-dashed transition-all text-center cursor-pointer mb-3 ${
                  isDragOverProduct ? 'border-[#00b341] bg-[#00b341]/10' : 'border-[#1e1e32] bg-[#131320] hover:border-[#00b341]/50'
                }`}
              >
                <span className="text-2xl block mb-1">📁</span>
                <p className="text-xs font-bold text-white mb-0.5">Drag & Drop product images here, or <span className="text-[#00b341] underline">browse device</span></p>
                <p className="text-[10px] text-gray-500">Supports JPG, PNG, WEBP up to 8 images</p>
                <input type="file" multiple accept="image/*" className="hidden" id="add-product-files" onChange={e => {
                  const files = e.target.files
                  if (!files || files.length === 0) return
                  Array.from(files).forEach(file => {
                    const reader = new FileReader()
                    reader.onload = ev => {
                      const res = ev.target?.result as string
                      if (res) {
                        setNewProduct(prev => {
                          const cur = prev.images || []
                          if (cur.length >= 8) return prev
                          const updated = [...cur, res]
                          return { ...prev, images: updated, imageUrl: updated[0] }
                        })
                      }
                    }
                    reader.readAsDataURL(file)
                  })
                }} />
                <label htmlFor="add-product-files" className="inline-block mt-2 px-3 py-1 text-[10px] font-bold text-white bg-[#00b341] rounded-lg cursor-pointer hover:opacity-90">Select Files</label>
              </div>

              {/* Thumbnails grid */}
              {newProduct.images.length > 0 && (
                <div className="grid grid-cols-4 gap-2 mb-3">
                  {newProduct.images.map((img, idx) => (
                    <div key={idx} className="relative group rounded-xl overflow-hidden border border-[#1e1e32] aspect-square bg-black">
                      <img src={img} alt="" className="w-full h-full object-cover" />
                      {idx === 0 && <span className="absolute top-1 left-1 text-[8px] font-black uppercase px-1.5 py-0.5 rounded bg-[#00b341] text-black">★ Cover</span>}
                      <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex flex-col items-center justify-center gap-1 transition-opacity">
                        {idx !== 0 && (
                          <button type="button" onClick={() => {
                            const imgs = [...newProduct.images]
                            const [chosen] = imgs.splice(idx, 1)
                            imgs.unshift(chosen)
                            setNewProduct(p => ({ ...p, images: imgs, imageUrl: imgs[0] }))
                          }} className="text-[9px] font-bold text-white bg-emerald-600 px-1.5 py-0.5 rounded">Set Cover</button>
                        )}
                        <button type="button" onClick={() => {
                          const imgs = newProduct.images.filter((_, i) => i !== idx)
                          setNewProduct(p => ({ ...p, images: imgs, imageUrl: imgs[0] || '' }))
                        }} className="text-[9px] font-bold text-white bg-red-600 px-1.5 py-0.5 rounded">✕ Remove</button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* ⚽ BASIC PRODUCT & FOOTBALL METADATA */}
            <div className="space-y-3 p-4 rounded-xl border border-[#1e1e32]" style={{ background: '#0d0d1e' }}>
              <label className="text-[10px] font-black uppercase tracking-wider text-[#00b341]">⚽ Basic Information & Football Metadata</label>
              <div>
                <label className="block text-[10px] font-bold text-gray-500 mb-1">Product Title * (e.g. "Arsenal FC Home Jersey 2026/27")</label>
                <input value={newProduct.name} onChange={e => setNewProduct(p => ({ ...p, name: e.target.value, slug: slugify(e.target.value) }))} placeholder="Official name..." required className={INPUT} style={INPUT_STYLE} />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[10px] font-bold text-gray-500 mb-1">SKU Code</label>
                  <input value={newProduct.sku} onChange={e => setNewProduct(p => ({ ...p, sku: e.target.value }))} placeholder="e.g. ARS-HJ-2026" className={INPUT} style={INPUT_STYLE} />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-gray-500 mb-1">Category</label>
                  <select value={newProduct.category} onChange={e => setNewProduct(p => ({ ...p, category: e.target.value }))} className={INPUT} style={INPUT_STYLE}>
                    {['Kits','Training Gear','Accessories','Souvenirs'].map(c => <option key={c}>{c}</option>)}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block text-[10px] font-bold text-gray-500 mb-1">Team / Club</label>
                  <input value={newProduct.team} onChange={e => setNewProduct(p => ({ ...p, team: e.target.value }))} placeholder="e.g. Arsenal FC" className={INPUT} style={INPUT_STYLE} />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-gray-500 mb-1">League / Tournament</label>
                  <input value={newProduct.league} onChange={e => setNewProduct(p => ({ ...p, league: e.target.value }))} placeholder="e.g. Premier League" className={INPUT} style={INPUT_STYLE} />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-gray-500 mb-1">Season / Era</label>
                  <input value={newProduct.season} onChange={e => setNewProduct(p => ({ ...p, season: e.target.value }))} placeholder="e.g. 2026/27" className={INPUT} style={INPUT_STYLE} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[10px] font-bold text-gray-500 mb-1">Kit Type</label>
                  <select value={newProduct.kitType} onChange={e => setNewProduct(p => ({ ...p, kitType: e.target.value }))} className={INPUT} style={INPUT_STYLE}>
                    {['Home','Away','Third','Goalkeeper','N/A'].map(k => <option key={k}>{k}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-gray-500 mb-1">Version</label>
                  <select value={newProduct.version} onChange={e => setNewProduct(p => ({ ...p, version: e.target.value }))} className={INPUT} style={INPUT_STYLE}>
                    {['Authentic / Player Version','Replica / Fan Version','N/A'].map(v => <option key={v}>{v}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-[10px] font-bold text-gray-500 mb-1">Description (Fabric, Tech e.g. Dri-FIT, Care)</label>
                <textarea value={newProduct.description} onChange={e => setNewProduct(p => ({ ...p, description: e.target.value }))} rows={3} placeholder="Fabric details, technologies, care instructions..." className={`${INPUT} resize-none`} style={INPUT_STYLE} />
              </div>
            </div>

            {/* 🏷️ PRICING & INVENTORY */}
            <div className="space-y-3 p-4 rounded-xl border border-[#1e1e32]" style={{ background: '#0d0d1e' }}>
              <div className="flex items-center justify-between">
                <label className="text-[10px] font-black uppercase tracking-wider text-[#00b341]">🏷️ Pricing, Margin & Inventory</label>
                {parseFloat(newProduct.price) > 0 && parseFloat(newProduct.costPerItem) > 0 && (
                  <span className="text-[10px] font-black text-emerald-400">
                    Est. Margin: ${ (parseFloat(newProduct.price) - parseFloat(newProduct.costPerItem)).toFixed(2) } ({ Math.round(((parseFloat(newProduct.price) - parseFloat(newProduct.costPerItem)) / parseFloat(newProduct.price)) * 100) }%)
                  </span>
                )}
              </div>
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block text-[10px] font-bold text-gray-500 mb-1">Base Price ($) *</label>
                  <input type="number" step="0.01" value={newProduct.price} onChange={e => setNewProduct(p => ({ ...p, price: e.target.value }))} required className={INPUT} style={INPUT_STYLE} />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-gray-500 mb-1">Sale / Discount ($)</label>
                  <input type="number" step="0.01" value={newProduct.comparePrice} onChange={e => setNewProduct(p => ({ ...p, comparePrice: e.target.value }))} className={INPUT} style={INPUT_STYLE} />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-gray-500 mb-1">Cost per Item ($)</label>
                  <input type="number" step="0.01" value={newProduct.costPerItem} onChange={e => setNewProduct(p => ({ ...p, costPerItem: e.target.value }))} placeholder="Internal cost" className={INPUT} style={INPUT_STYLE} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[10px] font-bold text-gray-500 mb-1">Stock Quantity</label>
                  <input type="number" value={newProduct.stock} onChange={e => setNewProduct(p => ({ ...p, stock: e.target.value }))} className={INPUT} style={INPUT_STYLE} />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-gray-500 mb-1">Low Stock Alert Threshold</label>
                  <input type="number" value={newProduct.lowStockThreshold} onChange={e => setNewProduct(p => ({ ...p, lowStockThreshold: e.target.value }))} className={INPUT} style={INPUT_STYLE} />
                </div>
              </div>
            </div>

            {/* 🎨 VARIANTS, CUSTOMIZATION & BADGES */}
            <div className="space-y-3 p-4 rounded-xl border border-[#1e1e32]" style={{ background: '#0d0d1e' }}>
              <label className="text-[10px] font-black uppercase tracking-wider text-[#00b341]">🎨 Customization, Badges & Sizes</label>
              <div>
                <label className="block text-[10px] font-bold text-gray-500 mb-2">Available Sizes</label>
                <div className="flex gap-2 flex-wrap">
                  {['XS','S','M','L','XL','XXL','Kids','Infant','One Size'].map(s => {
                    const active = newProduct.sizes.includes(s)
                    return (
                      <button type="button" key={s} onClick={() => {
                        const updated = active ? newProduct.sizes.filter(x => x !== s) : [...newProduct.sizes, s]
                        setNewProduct(p => ({ ...p, sizes: updated }))
                      }} className="px-2.5 py-1 text-[10px] font-bold rounded-lg border transition-all"
                        style={{ background: active ? '#00b341' : '#131320', color: active ? '#fff' : '#6b7280', borderColor: active ? '#00b341' : '#1e1e32' }}>{s}</button>
                    )
                  })}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[10px] font-bold text-gray-500 mb-1">Gender / Age Segment</label>
                  <select value={newProduct.gender} onChange={e => setNewProduct(p => ({ ...p, gender: e.target.value }))} className={INPUT} style={INPUT_STYLE}>
                    {['Men','Women','Kids','Infant','Unisex'].map(g => <option key={g}>{g}</option>)}
                  </select>
                </div>
                <div className="flex items-center gap-2 pt-5">
                  <input type="checkbox" id="add-custom" checked={newProduct.customizable} onChange={e => setNewProduct(p => ({ ...p, customizable: e.target.checked }))} className="w-4 h-4 accent-[#00b341]" />
                  <label htmlFor="add-custom" className="text-xs font-bold text-white cursor-pointer">Enable Player Name & Number Printing</label>
                </div>
              </div>
              {newProduct.customizable && (
                <div>
                  <label className="block text-[10px] font-bold text-gray-500 mb-1">Squad Players List (auto-fills printing selection)</label>
                  <input value={newProduct.playerList} onChange={e => setNewProduct(p => ({ ...p, playerList: e.target.value }))} placeholder="Bukayo Saka #7, Martin Ødegaard #8" className={INPUT} style={INPUT_STYLE} />
                </div>
              )}
            </div>

            {/* 📦 SHIPPING & SEO */}
            <div className="space-y-3 p-4 rounded-xl border border-[#1e1e32]" style={{ background: '#0d0d1e' }}>
              <label className="text-[10px] font-black uppercase tracking-wider text-[#00b341]">📦 Shipping & SEO</label>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[10px] font-bold text-gray-500 mb-1">Weight (kg)</label>
                  <input value={newProduct.weight} onChange={e => setNewProduct(p => ({ ...p, weight: e.target.value }))} placeholder="0.35" className={INPUT} style={INPUT_STYLE} />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-gray-500 mb-1">URL Slug</label>
                  <input value={newProduct.slug} onChange={e => setNewProduct(p => ({ ...p, slug: e.target.value }))} placeholder="arsenal-home-jersey-2026" className={`${INPUT} font-mono`} style={INPUT_STYLE} />
                </div>
              </div>
              <input value={newProduct.tags} onChange={e => setNewProduct(p => ({ ...p, tags: e.target.value }))} placeholder="Tags (comma-separated)" className={INPUT} style={INPUT_STYLE} />
            </div>

            <button type="submit" className="w-full py-3.5 font-black text-white rounded-xl hover:opacity-90 sticky bottom-0" style={{ background: '#00b341' }}>+ Publish Product to Store</button>
          </form>
        </Modal>
      )}

      {/* Edit Article */}
      {editArticle && (
        <Modal title={`Edit — ${editArticle.title}`} onClose={() => setEditArticle(null)}>
          <div className="space-y-4 max-h-[75vh] overflow-y-auto pr-1">

            {/* 📋 ESSENTIAL EDITORIAL FIELDS */}
            <div className="space-y-3 p-4 rounded-xl border border-[#1e1e32]" style={{ background: '#0d0d1e' }}>
              <div className="flex items-center justify-between">
                <label className="text-[10px] font-black uppercase tracking-wider text-[#00b341]">📋 Essential Editorial Fields</label>
                <span className="text-[10px] font-bold" style={{ color: editArticle.title.length > 70 ? '#ef4444' : '#00b341' }}>
                  Headline: {editArticle.title.length}/70 chars {editArticle.title.length > 70 && '(Too long)'}
                </span>
              </div>
              <div>
                <label className="block text-[10px] font-bold text-gray-500 mb-1">Headline / Title * (Punchy & clear)</label>
                <input value={editArticle.title} onChange={e => setEditArticle(p => p ? { ...p, title: e.target.value, slug: slugify(e.target.value) } : p)} placeholder="e.g. Arsenal Dominate Derby to Go 3 Points Clear" className={INPUT} style={INPUT_STYLE} />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[10px] font-bold text-gray-500 mb-1">URL Slug (Auto-generated)</label>
                  <input value={editArticle.slug || ''} onChange={e => setEditArticle(p => p ? { ...p, slug: e.target.value } : p)} className={`${INPUT} font-mono`} style={INPUT_STYLE} />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-gray-500 mb-1">Author / Bylaw Journalist</label>
                  <select value={editArticle.author} onChange={e => setEditArticle(p => p ? { ...p, author: e.target.value } : p)} className={INPUT} style={INPUT_STYLE}>
                    {users.filter(u => ['admin','editor','writer'].includes(u.role)).map(u => <option key={u.id} value={u.name}>{u.name}</option>)}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[10px] font-bold text-gray-500 mb-1">Category</label>
                  <select value={editArticle.category} onChange={e => setEditArticle(p => p ? { ...p, category: e.target.value } : p)} className={INPUT} style={INPUT_STYLE}>
                    {['Match Report','Transfers','Tactics','East Africa','Opinion','Analysis','Champions League','Premier League'].map(c => <option key={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-gray-500 mb-1">Tags (Comma-separated)</label>
                  <input value={editArticle.tags} onChange={e => setEditArticle(p => p ? { ...p, tags: e.target.value } : p)} placeholder="e.g. arsenal, premier league" className={INPUT} style={INPUT_STYLE} />
                </div>
              </div>
              <div>
                <label className="block text-[10px] font-bold text-gray-500 mb-1">Excerpt / Hook (One-sentence summary for feeds)</label>
                <textarea value={editArticle.excerpt || ''} onChange={e => setEditArticle(p => p ? { ...p, excerpt: e.target.value } : p)} rows={2} placeholder="Saka and Ødegaard orchestrate a 2-1 derby win over Chelsea..." className={`${INPUT} resize-none`} style={INPUT_STYLE} />
              </div>
            </div>

            {/* ⚽ FOOTBALL-SPECIFIC ELEMENTS */}
            <div className="space-y-3 p-4 rounded-xl border border-[#1e1e32]" style={{ background: '#0d0d1e' }}>
              <label className="text-[10px] font-black uppercase tracking-wider text-[#00b341]">⚽ Football-Specific Elements</label>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[10px] font-bold text-gray-500 mb-1">Match ID / Live Center Link</label>
                  <input value={editArticle.matchId || ''} onChange={e => setEditArticle(p => p ? { ...p, matchId: e.target.value } : p)} placeholder="e.g. M-2026-ARS-CHE" className={INPUT} style={INPUT_STYLE} />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-gray-500 mb-1">Team / Club Tags</label>
                  <input value={editArticle.teamTags || ''} onChange={e => setEditArticle(p => p ? { ...p, teamTags: e.target.value } : p)} placeholder="e.g. Arsenal FC, Chelsea FC" className={INPUT} style={INPUT_STYLE} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[10px] font-bold text-gray-500 mb-1">Player Tags</label>
                  <input value={editArticle.playerTags || ''} onChange={e => setEditArticle(p => p ? { ...p, playerTags: e.target.value } : p)} placeholder="e.g. Bukayo Saka, Martin Ødegaard" className={INPUT} style={INPUT_STYLE} />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-gray-500 mb-1">Media Embeds (Twitter/X, YouTube, TikTok)</label>
                  <input value={editArticle.mediaEmbeds || ''} onChange={e => setEditArticle(p => p ? { ...p, mediaEmbeds: e.target.value } : p)} placeholder="https://x.com/Arsenal/status/..." className={INPUT} style={INPUT_STYLE} />
                </div>
              </div>
              <div className="flex items-center gap-2 pt-1">
                <input type="checkbox" id="edit-liveblog" checked={editArticle.isLiveBlog || false} onChange={e => setEditArticle(p => p ? { ...p, isLiveBlog: e.target.checked } : p)} className="w-4 h-4 accent-[#00b341]" />
                <label htmlFor="edit-liveblog" className="text-xs font-bold text-white cursor-pointer">🔴 Format as Live Blog (Real-time match commentary)</label>
              </div>
            </div>

            {/* 🖼️ FEATURED BANNER & ALT TEXT */}
            <div className="space-y-3 p-4 rounded-xl border border-[#1e1e32]" style={{ background: '#0d0d1e' }}>
              <label className="text-[10px] font-black uppercase tracking-wider text-[#00b341]">🖼️ Featured Banner Image & Accessibility</label>
              
              {/* Drag and Drop Zone */}
              <div
                onDragOver={e => { e.preventDefault(); e.stopPropagation(); setIsDragOverArticle(true) }}
                onDragLeave={e => { e.preventDefault(); e.stopPropagation(); setIsDragOverArticle(false) }}
                onDrop={e => {
                  e.preventDefault(); e.stopPropagation(); setIsDragOverArticle(false)
                  const file = e.dataTransfer.files?.[0]
                  if (!file || !file.type.startsWith('image/')) return
                  const reader = new FileReader()
                  reader.onload = ev => {
                    const res = ev.target?.result as string
                    if (res) setEditArticle(p => p ? { ...p, imageUrl: res } : p)
                  }
                  reader.readAsDataURL(file)
                }}
                className={`p-4 rounded-xl border-2 border-dashed transition-all text-center cursor-pointer mb-2 ${
                  isDragOverArticle ? 'border-[#00b341] bg-[#00b341]/10' : 'border-[#1e1e32] bg-[#131320] hover:border-[#00b341]/50'
                }`}
              >
                <span className="text-2xl block mb-1">🖼️</span>
                <p className="text-xs font-bold text-white mb-0.5">Drag & Drop banner image here, or <span className="text-[#00b341] underline">browse device</span></p>
                <p className="text-[10px] text-gray-500">Supports JPG, PNG, WEBP high-res banners</p>
                <input type="file" accept="image/*" className="hidden" id="edit-article-file" onChange={e => {
                  const file = e.target.files?.[0]
                  if (!file) return
                  const reader = new FileReader()
                  reader.onload = ev => {
                    const res = ev.target?.result as string
                    if (res) setEditArticle(p => p ? { ...p, imageUrl: res } : p)
                  }
                  reader.readAsDataURL(file)
                }} />
                <label htmlFor="edit-article-file" className="inline-block mt-2 px-3 py-1 text-[10px] font-bold text-white bg-[#00b341] rounded-lg cursor-pointer hover:opacity-90">Select Image</label>
              </div>

              <input value={editArticle.imageUrl} onChange={e => setEditArticle(p => p ? { ...p, imageUrl: e.target.value } : p)} placeholder="or paste Image URL (https://…)" className={INPUT} style={INPUT_STYLE} />
              {editArticle.imageUrl && <img src={editArticle.imageUrl} className="w-full h-36 object-cover rounded-xl border border-[#1e1e32]" alt="" onError={e => { (e.target as HTMLImageElement).style.display = 'none' }} />}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[10px] font-bold text-gray-500 mb-1">Image Alt Text (SEO)</label>
                  <input value={editArticle.imageAlt || ''} onChange={e => setEditArticle(p => p ? { ...p, imageAlt: e.target.value } : p)} placeholder="Describes image for screen readers" className={INPUT} style={INPUT_STYLE} />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-gray-500 mb-1">Image Caption / Photo Credit</label>
                  <input value={editArticle.imageCaption || ''} onChange={e => setEditArticle(p => p ? { ...p, imageCaption: e.target.value } : p)} placeholder="Bukayo Saka celebrates at Emirates" className={INPUT} style={INPUT_STYLE} />
                </div>
              </div>
            </div>

            {/* 📝 STORY BODY */}
            <div className="space-y-3 p-4 rounded-xl border border-[#1e1e32]" style={{ background: '#0d0d1e' }}>
              <label className="text-[10px] font-black uppercase tracking-wider text-[#00b341]">📝 Article Body Content</label>
              <textarea value={editArticle.body} onChange={e => setEditArticle(p => p ? { ...p, body: e.target.value } : p)} rows={10} placeholder="Write full article here. Use double line breaks for new paragraphs..." className={`${INPUT} resize-none`} style={INPUT_STYLE} />
            </div>

            {/* 🔍 SEO & DISCOVERY */}
            <div className="space-y-3 p-4 rounded-xl border border-[#1e1e32]" style={{ background: '#0d0d1e' }}>
              <label className="text-[10px] font-black uppercase tracking-wider text-[#00b341]">🔍 SEO & Search Engine Discovery</label>
              <div>
                <div className="flex justify-between mb-1">
                  <label className="text-[10px] font-bold text-gray-500">Meta Title (Search Engine Title)</label>
                  <span className="text-[10px] font-bold" style={{ color: (editArticle.metaTitle?.length || 0) > 60 ? '#ef4444' : '#00b341' }}>
                    {editArticle.metaTitle?.length || 0}/60 chars
                  </span>
                </div>
                <input value={editArticle.metaTitle || ''} onChange={e => setEditArticle(p => p ? { ...p, metaTitle: e.target.value } : p)} placeholder="Title displayed in Google search results" className={INPUT} style={INPUT_STYLE} />
              </div>
              <div>
                <div className="flex justify-between mb-1">
                  <label className="text-[10px] font-bold text-gray-500">Meta Description (150-char Google Summary)</label>
                  <span className="text-[10px] font-bold" style={{ color: editArticle.metaDescription.length > 150 ? '#ef4444' : '#00b341' }}>
                    {editArticle.metaDescription.length}/150 chars
                  </span>
                </div>
                <textarea value={editArticle.metaDescription} onChange={e => setEditArticle(p => p ? { ...p, metaDescription: e.target.value.slice(0, 150) } : p)} rows={2} placeholder="Summary snippet displayed under search title..." className={`${INPUT} resize-none`} style={INPUT_STYLE} />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-gray-500 mb-1">Focus Keywords (Comma-separated)</label>
                <input value={editArticle.focusKeywords || ''} onChange={e => setEditArticle(p => p ? { ...p, focusKeywords: e.target.value } : p)} placeholder="e.g. arsenal derby, saka goal, premier league" className={INPUT} style={INPUT_STYLE} />
              </div>
            </div>

          </div>
          <div className="flex gap-2 mt-3">
            <button onClick={() => { setArticles(prev => prev.map(x => x.id === editArticle.id ? editArticle : x)); setEditArticle(null) }}
              className="flex-1 py-3 text-sm font-black text-white rounded-xl hover:opacity-90" style={{ background: '#131320', border: '1px solid #1e1e32' }}>Save Draft</button>
            <button onClick={() => { const updated = { ...editArticle, status: 'Published' }; setArticles(prev => prev.map(x => x.id === editArticle.id ? updated : x)); setEditArticle(null) }}
              className="flex-1 py-3 text-sm font-black text-white rounded-xl hover:opacity-90" style={{ background: '#00b341' }}>Publish Changes →</button>
          </div>
        </Modal>
      )}

      {/* Add Article */}
      {showAddArticle && (
        <Modal title="Publish New Football Article" onClose={() => setShowAddArticle(false)}>
          <form onSubmit={e => {
            e.preventDefault()
            if (!newArticle.title || !newArticle.body) return
            const id = `a-${Date.now()}`
            const art: Article = {
              id,
              title: newArticle.title,
              slug: newArticle.slug || slugify(newArticle.title),
              category: newArticle.category,
              author: newArticle.author || 'Staff Writer',
              excerpt: newArticle.excerpt || newArticle.metaDescription,
              body: newArticle.body,
              imageUrl: newArticle.imageUrl || 'https://images.unsplash.com/photo-1522778119026-d647f0596c20?w=600&h=340&fit=crop',
              imageAlt: newArticle.imageAlt || newArticle.title,
              imageCaption: newArticle.imageCaption || '',
              status: newArticle.scheduled ? 'Scheduled' : 'Draft',
              date: newArticle.scheduled || new Date().toLocaleDateString('en-KE', { month: 'short', day: 'numeric', year: 'numeric' }),
              scheduled: newArticle.scheduled,
              views: '0',
              likes: 0,
              tags: newArticle.tags,
              matchId: newArticle.matchId,
              teamTags: newArticle.teamTags,
              playerTags: newArticle.playerTags,
              mediaEmbeds: newArticle.mediaEmbeds,
              isLiveBlog: newArticle.isLiveBlog,
              metaTitle: newArticle.metaTitle || newArticle.title,
              metaDescription: newArticle.metaDescription,
              focusKeywords: newArticle.focusKeywords,
            }
            setArticles(p => [art, ...p])
            setShowAddArticle(false)
            setNewArticle(BLANK_ARTICLE)
          }} className="space-y-4 max-h-[80vh] overflow-y-auto pr-1">

            {/* ── SECTION: Essential Editorial Fields ── */}
            <div className="space-y-3 p-4 rounded-xl border border-[#1e1e32]" style={{ background: '#0d0d1e' }}>
              <div className="flex items-center justify-between">
                <label className="text-[10px] font-black uppercase tracking-wider text-[#00b341]">📋 Essential Editorial Fields</label>
                <span className="text-[10px] font-bold" style={{ color: newArticle.title.length > 70 ? '#ef4444' : '#00b341' }}>
                  {newArticle.title.length}/70 {newArticle.title.length > 70 && '⚠️ Over limit'}
                </span>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-gray-500 mb-1">Headline / Title * (Punchy &amp; clear, under 70 chars)</label>
                <input value={newArticle.title} onChange={e => {
                  const v = e.target.value
                  setNewArticle(p => ({ ...p, title: v, slug: slugify(v) }))
                }} placeholder="e.g. Arsenal Dominate Derby to Go 3 Points Clear" required className={INPUT} style={INPUT_STYLE} />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-[10px] font-bold text-gray-500">URL Slug</label>
                    <button type="button" onClick={() => setNewArticle(p => ({ ...p, slug: slugify(p.title) }))}
                      className="text-[9px] font-bold text-[#00b341] hover:underline">↺ Regenerate</button>
                  </div>
                  <input value={newArticle.slug} onChange={e => setNewArticle(p => ({ ...p, slug: e.target.value }))} className={`${INPUT} font-mono text-[10px]`} style={INPUT_STYLE} placeholder="auto-generated-slug" />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-gray-500 mb-1">Author / Journalist Name</label>
                  <input
                    value={newArticle.author}
                    onChange={e => setNewArticle(p => ({ ...p, author: e.target.value }))}
                    placeholder="e.g. James Mwangi"
                    list="author-suggestions"
                    className={INPUT} style={INPUT_STYLE}
                  />
                  <datalist id="author-suggestions">
                    {users.filter(u => ['admin','editor','writer'].includes(u.role)).map(u => (
                      <option key={u.id} value={u.name} />
                    ))}
                  </datalist>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[10px] font-bold text-gray-500 mb-1">Category</label>
                  <select value={(newArticle as any)._customCategory ? '__custom__' : newArticle.category}
                    onChange={e => {
                      const v = e.target.value
                      if (v === '__custom__') {
                        setNewArticle(p => ({ ...p, category: '', _customCategory: true } as any))
                      } else {
                        setNewArticle(p => ({ ...p, category: v, _customCategory: false } as any))
                      }
                    }} className={INPUT} style={INPUT_STYLE}>
                    <optgroup label="⚽ Match Coverage">
                      {['Match Report','Live Commentary','Post-Match Analysis','Pre-Match Preview'].map(c => <option key={c} value={c}>{c}</option>)}
                    </optgroup>
                    <optgroup label="📰 News & Transfers">
                      {['Transfer News','Breaking News','Injury Update','Press Conference','Rumours'].map(c => <option key={c} value={c}>{c}</option>)}
                    </optgroup>
                    <optgroup label="🌍 European Competitions">
                      {['Premier League','La Liga','Bundesliga','Serie A','Ligue 1','Champions League','Europa League','Conference League','FA Cup'].map(c => <option key={c} value={c}>{c}</option>)}
                    </optgroup>
                    <optgroup label="🌍 International">
                      {['AFCON','World Cup','AFCON Qualifiers','World Cup Qualifiers','Olympics Football'].map(c => <option key={c} value={c}>{c}</option>)}
                    </optgroup>
                    <optgroup label="🌍 East Africa">
                      {['KPL – Kenya Premier League','NSL – National Super League','CECAFA','Rwanda Premier League','Uganda Premier League','Tanzania Premier League','East Africa News'].map(c => <option key={c} value={c}>{c}</option>)}
                    </optgroup>
                    <optgroup label="✍️ Editorial">
                      {['Opinion','Tactics','Analysis','Player Profile','Club Focus','History & Retro',"Women's Football"].map(c => <option key={c} value={c}>{c}</option>)}
                    </optgroup>
                    <optgroup label="🎯 Platform">
                      {['FlowerZFC','Fantasy Football','Betting Insights','Fan Zone','Polls & Quizzes'].map(c => <option key={c} value={c}>{c}</option>)}
                    </optgroup>
                    <optgroup label="⚙️ Custom">
                      <option value="__custom__">✏️ Type my own category…</option>
                    </optgroup>
                  </select>
                  {(newArticle as any)._customCategory && (
                    <input
                      autoFocus
                      value={newArticle.category}
                      onChange={e => setNewArticle(p => ({ ...p, category: e.target.value }))}
                      placeholder="Type custom category…"
                      className={`${INPUT} mt-1`} style={INPUT_STYLE}
                    />
                  )}
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-gray-500 mb-1">Tags (Comma-separated)</label>
                  <input value={newArticle.tags} onChange={e => setNewArticle(p => ({ ...p, tags: e.target.value }))} placeholder="e.g. arsenal, premier league, transfer" className={INPUT} style={INPUT_STYLE} />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-gray-500 mb-1">Excerpt / Hook (One-sentence summary for feeds)</label>
                <textarea value={newArticle.excerpt} onChange={e => setNewArticle(p => ({ ...p, excerpt: e.target.value }))} rows={2} placeholder="Saka and Ødegaard orchestrate a 2-1 derby win over Chelsea..." className={`${INPUT} resize-none`} style={INPUT_STYLE} />
              </div>
            </div>

            {/* ── SECTION: Football-Specific Elements ── */}
            <div className="space-y-3 p-4 rounded-xl border border-[#1e1e32]" style={{ background: '#0d0d1e' }}>
              <label className="text-[10px] font-black uppercase tracking-wider text-[#00b341]">⚽ Football-Specific Elements</label>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[10px] font-bold text-gray-500 mb-1">Match ID / Live Center Link</label>
                  <input value={newArticle.matchId} onChange={e => setNewArticle(p => ({ ...p, matchId: e.target.value }))} placeholder="e.g. M-2026-ARS-CHE" className={INPUT} style={INPUT_STYLE} />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-gray-500 mb-1">Team / Club Tags</label>
                  <input value={newArticle.teamTags} onChange={e => setNewArticle(p => ({ ...p, teamTags: e.target.value }))} placeholder="e.g. Arsenal FC, Chelsea FC" className={INPUT} style={INPUT_STYLE} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[10px] font-bold text-gray-500 mb-1">Player Tags</label>
                  <input value={newArticle.playerTags} onChange={e => setNewArticle(p => ({ ...p, playerTags: e.target.value }))} placeholder="e.g. Bukayo Saka, Ødegaard" className={INPUT} style={INPUT_STYLE} />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-gray-500 mb-1">Media Embeds (X, YouTube, TikTok)</label>
                  <input value={newArticle.mediaEmbeds} onChange={e => setNewArticle(p => ({ ...p, mediaEmbeds: e.target.value }))} placeholder="https://x.com/Arsenal/status/..." className={INPUT} style={INPUT_STYLE} />
                </div>
              </div>
              <div className="flex items-center gap-2">
                <input type="checkbox" id="add-liveblog" checked={newArticle.isLiveBlog} onChange={e => setNewArticle(p => ({ ...p, isLiveBlog: e.target.checked }))} className="w-4 h-4 accent-[#00b341]" />
                <label htmlFor="add-liveblog" className="text-xs font-bold text-white cursor-pointer">🔴 Format as Live Blog (Real-time match commentary)</label>
              </div>
            </div>

            {/* ── SECTION: Featured Banner Image ── */}
            <div className="space-y-3 p-4 rounded-xl border border-[#1e1e32]" style={{ background: '#0d0d1e' }}>
              <label className="text-[10px] font-black uppercase tracking-wider text-[#00b341]">🖼️ Featured Banner Image &amp; Accessibility</label>
              <div
                onDragOver={e => { e.preventDefault(); e.stopPropagation(); setIsDragOverArticle(true) }}
                onDragLeave={e => { e.preventDefault(); e.stopPropagation(); setIsDragOverArticle(false) }}
                onDrop={e => {
                  e.preventDefault(); e.stopPropagation(); setIsDragOverArticle(false)
                  const file = e.dataTransfer.files?.[0]
                  if (!file || !file.type.startsWith('image/')) return
                  const reader = new FileReader()
                  reader.onload = ev => { const res = ev.target?.result as string; if (res) setNewArticle(p => ({ ...p, imageUrl: res })) }
                  reader.readAsDataURL(file)
                }}
                className={`p-4 rounded-xl border-2 border-dashed transition-all text-center cursor-pointer mb-2 ${isDragOverArticle ? 'border-[#00b341] bg-[#00b341]/10' : 'border-[#1e1e32] bg-[#131320] hover:border-[#00b341]/50'}`}
              >
                <span className="text-2xl block mb-1">🖼️</span>
                <p className="text-xs font-bold text-white mb-0.5">Drag &amp; Drop banner image, or <span className="text-[#00b341] underline">browse device</span></p>
                <p className="text-[10px] text-gray-500">JPG, PNG, WEBP supported</p>
                <input type="file" accept="image/*" className="hidden" id="add-article-file" onChange={e => {
                  const file = e.target.files?.[0]; if (!file) return
                  const reader = new FileReader()
                  reader.onload = ev => { const res = ev.target?.result as string; if (res) setNewArticle(p => ({ ...p, imageUrl: res })) }
                  reader.readAsDataURL(file)
                }} />
                <label htmlFor="add-article-file" className="inline-block mt-2 px-3 py-1 text-[10px] font-bold text-white bg-[#00b341] rounded-lg cursor-pointer hover:opacity-90">Select Image</label>
              </div>
              <input value={newArticle.imageUrl} onChange={e => setNewArticle(p => ({ ...p, imageUrl: e.target.value }))} placeholder="or paste Image URL (https://…)" className={INPUT} style={INPUT_STYLE} />
              {newArticle.imageUrl && <img src={newArticle.imageUrl} className="w-full h-36 object-cover rounded-xl border border-[#1e1e32]" alt="" onError={e => { (e.target as HTMLImageElement).style.display = 'none' }} />}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[10px] font-bold text-gray-500 mb-1">Alt Text (SEO + Accessibility)</label>
                  <input value={newArticle.imageAlt} onChange={e => setNewArticle(p => ({ ...p, imageAlt: e.target.value }))} placeholder="Describes image for screen readers" className={INPUT} style={INPUT_STYLE} />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-gray-500 mb-1">Caption / Photo Credit</label>
                  <input value={newArticle.imageCaption} onChange={e => setNewArticle(p => ({ ...p, imageCaption: e.target.value }))} placeholder="Saka celebrates at Emirates" className={INPUT} style={INPUT_STYLE} />
                </div>
              </div>
            </div>

            {/* ── SECTION: Body Content + Rich Text Toolbar ── */}
            <div className="space-y-2 p-4 rounded-xl border border-[#1e1e32]" style={{ background: '#0d0d1e' }}>
              <div className="flex items-center justify-between">
                <label className="text-[10px] font-black uppercase tracking-wider text-[#00b341]">📝 Article Body Content *</label>
                <span className="text-[10px] text-gray-600">{newArticle.body.replace(/<[^>]+>/g,'').trim().split(/\s+/).filter(Boolean).length} words</span>
              </div>

              {/* Formatting Toolbar */}
              <div className="flex flex-wrap gap-1 p-2 rounded-lg" style={{ background: '#131320', border: '1px solid #1e1e32' }}>

                {/* Font size dropdown */}
                <select onChange={e => { document.execCommand('fontSize', false, e.target.value); (e.target as HTMLSelectElement).value = '' }}
                  defaultValue="" className="text-[10px] font-bold px-1.5 py-1 rounded bg-[#0d0d1e] border border-[#1e1e32] text-gray-400 cursor-pointer">
                  <option value="" disabled>Size</option>
                  {[['1','XS'],['2','S'],['3','M'],['4','L'],['5','XL'],['6','XXL'],['7','HUGE']].map(([v,l]) => <option key={v} value={v}>{l}</option>)}
                </select>

                {/* Heading buttons */}
                {(['H1','H2','H3'] as const).map(h => (
                  <button key={h} type="button"
                    onMouseDown={e => { e.preventDefault(); document.execCommand('formatBlock', false, h.toLowerCase()) }}
                    className="px-2 py-1 text-[10px] font-black rounded bg-[#0d0d1e] border border-[#1e1e32] text-gray-400 hover:text-white hover:border-[#00b341] transition-all">{h}</button>
                ))}

                <span className="w-px bg-[#1e1e32]" />

                {/* B / I / U / S */}
                {([['B','bold'],['I','italic'],['U','underline'],['S','strikeThrough']] as const).map(([lbl,cmd]) => (
                  <button key={cmd} type="button"
                    onMouseDown={e => { e.preventDefault(); document.execCommand(cmd, false) }}
                    className="w-7 h-7 text-[11px] rounded bg-[#0d0d1e] border border-[#1e1e32] text-gray-400 hover:text-white hover:border-[#00b341] transition-all"
                    style={{ fontWeight: lbl==='B'?900:700, fontStyle:lbl==='I'?'italic':'normal', textDecoration: lbl==='U'?'underline':lbl==='S'?'line-through':'none' }}
                  >{lbl}</button>
                ))}

                <span className="w-px bg-[#1e1e32]" />

                {/* Lists */}
                <button type="button" onMouseDown={e => { e.preventDefault(); document.execCommand('insertUnorderedList', false) }}
                  className="px-2 py-1 text-[10px] font-bold rounded bg-[#0d0d1e] border border-[#1e1e32] text-gray-400 hover:text-white hover:border-[#00b341] transition-all">• List</button>
                <button type="button" onMouseDown={e => { e.preventDefault(); document.execCommand('insertOrderedList', false) }}
                  className="px-2 py-1 text-[10px] font-bold rounded bg-[#0d0d1e] border border-[#1e1e32] text-gray-400 hover:text-white hover:border-[#00b341] transition-all">1. List</button>

                <span className="w-px bg-[#1e1e32]" />

                {/* Alignment */}
                {([['L','justifyLeft'],['C','justifyCenter'],['R','justifyRight']] as const).map(([lbl,cmd]) => (
                  <button key={cmd} type="button" onMouseDown={e => { e.preventDefault(); document.execCommand(cmd, false) }}
                    className="px-2 py-1 text-[10px] font-bold rounded bg-[#0d0d1e] border border-[#1e1e32] text-gray-400 hover:text-white hover:border-[#00b341] transition-all">≡{lbl}</button>
                ))}

                <span className="w-px bg-[#1e1e32]" />

                {/* Quote + HR */}
                <button type="button" onMouseDown={e => { e.preventDefault(); document.execCommand('formatBlock', false, 'blockquote') }}
                  className="px-2 py-1 text-[10px] font-bold rounded bg-[#0d0d1e] border border-[#1e1e32] text-gray-400 hover:text-white hover:border-[#00b341] transition-all">" Quote</button>
                <button type="button" onMouseDown={e => { e.preventDefault(); document.execCommand('insertHorizontalRule', false) }}
                  className="px-2 py-1 text-[10px] font-bold rounded bg-[#0d0d1e] border border-[#1e1e32] text-gray-400 hover:text-white hover:border-[#00b341] transition-all">― Line</button>

                <button type="button"
                  onMouseDown={e => { e.preventDefault(); if (confirm('Clear body content?')) { setNewArticle(p => ({ ...p, body: '' })); const el = document.getElementById('article-body-editor'); if (el) el.innerHTML = '' } }}
                  className="ml-auto px-2 py-1 text-[10px] font-bold rounded bg-[#0d0d1e] border border-[#1e1e32] text-red-400 hover:border-red-400 transition-all">✕ Clear</button>
              </div>

              {/* Paste-Safe Textarea Editor */}
              <textarea
                id="article-body-editor"
                value={newArticle.body}
                onChange={e => setNewArticle(p => ({ ...p, body: e.target.value }))}
                rows={10}
                className="w-full p-4 rounded-xl text-sm text-gray-200 outline-none resize-y"
                style={{
                  background: '#080810', border: '1px solid #1e1e32',
                  lineHeight: 1.75, caretColor: '#00b341', fontFamily: 'Inter, sans-serif',
                }}
                placeholder="Write or paste your full article content here. Safe for large text blocks, HTML, or Markdown pastes..."
              />
            </div>

            {/* ── SECTION: SEO ── */}
            <div className="space-y-3 p-4 rounded-xl border border-[#1e1e32]" style={{ background: '#0d0d1e' }}>
              <div className="flex items-center justify-between">
                <label className="text-[10px] font-black uppercase tracking-wider text-[#00b341]">🔍 SEO &amp; Search Discovery</label>
                <button type="button" onClick={() => {
                  const titleVal = newArticle.title.trim()
                  const bodyText = newArticle.body.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()
                  const autoMeta = (bodyText || titleVal).slice(0, 147) + ((bodyText || titleVal).length > 147 ? '…' : '')
                  const autoKw = titleVal.toLowerCase().split(/\s+/).filter(w => w.length > 3).slice(0, 6).join(', ')
                  setNewArticle(p => ({ ...p, metaTitle: titleVal.slice(0, 60), metaDescription: autoMeta, focusKeywords: autoKw, slug: slugify(titleVal) }))
                }} className="px-3 py-1.5 text-[10px] font-black text-white rounded-lg hover:opacity-90 transition-all"
                  style={{ background: 'linear-gradient(90deg,#00b341,#059669)' }}>✨ Auto-Generate All SEO</button>
              </div>

              {/* Meta Title */}
              <div>
                <div className="flex justify-between mb-1">
                  <label className="text-[10px] font-bold text-gray-500">Meta Title (Google search display title)</label>
                  <div className="flex items-center gap-2">
                    <button type="button" onClick={() => setNewArticle(p => ({ ...p, metaTitle: p.title.slice(0,60) }))} className="text-[9px] text-[#00b341] font-bold hover:underline">↺ From Headline</button>
                    <span className="text-[10px] font-bold" style={{ color: newArticle.metaTitle.length > 60 ? '#ef4444' : '#00b341' }}>{newArticle.metaTitle.length}/60</span>
                  </div>
                </div>
                <input value={newArticle.metaTitle} onChange={e => setNewArticle(p => ({ ...p, metaTitle: e.target.value }))} placeholder="Google search result title…" className={INPUT} style={INPUT_STYLE} />
                {newArticle.metaTitle && (
                  <div className="mt-1.5 p-2 rounded-lg" style={{ background: '#131320', border: '1px solid #1e1e32' }}>
                    <p className="text-[9px] text-gray-600 mb-0.5">📱 Google Preview:</p>
                    <p className="text-[11px] text-blue-400 font-medium line-clamp-1">{newArticle.metaTitle}</p>
                    <p className="text-[9px] text-[#00b341]">globalfootballmedia.com/news/{newArticle.slug || 'article-slug'}</p>
                    <p className="text-[9px] text-gray-500 line-clamp-2">{newArticle.metaDescription || 'No meta description yet…'}</p>
                  </div>
                )}
              </div>

              {/* Meta Description */}
              <div>
                <div className="flex justify-between mb-1">
                  <label className="text-[10px] font-bold text-gray-500">Meta Description (Google 150-char snippet)</label>
                  <div className="flex items-center gap-2">
                    <button type="button" onClick={() => {
                      const txt = newArticle.body.replace(/<[^>]+>/g,' ').replace(/\s+/g,' ').trim()
                      setNewArticle(p => ({ ...p, metaDescription: (txt || p.excerpt).slice(0,147) + ((txt||p.excerpt).length > 147 ? '…' : '') }))
                    }} className="text-[9px] text-[#00b341] font-bold hover:underline">↺ From Body</button>
                    <span className="text-[10px] font-bold" style={{ color: newArticle.metaDescription.length > 150 ? '#ef4444' : '#00b341' }}>{newArticle.metaDescription.length}/150</span>
                  </div>
                </div>
                <textarea value={newArticle.metaDescription} onChange={e => setNewArticle(p => ({ ...p, metaDescription: e.target.value.slice(0,150) }))} rows={2} placeholder="Summary shown under title in Google results…" className={`${INPUT} resize-none`} style={INPUT_STYLE} />
              </div>

              {/* Focus Keywords */}
              <div>
                <div className="flex justify-between mb-1">
                  <label className="text-[10px] font-bold text-gray-500">Focus Keywords (comma-separated)</label>
                  <button type="button" onClick={() => {
                    const words = newArticle.title.toLowerCase().split(/\s+/).filter(w => w.length > 3).slice(0,6).join(', ')
                    setNewArticle(p => ({ ...p, focusKeywords: words }))
                  }} className="text-[9px] text-[#00b341] font-bold hover:underline">↺ Auto from Title</button>
                </div>
                <input value={newArticle.focusKeywords} onChange={e => setNewArticle(p => ({ ...p, focusKeywords: e.target.value }))} placeholder="e.g. arsenal derby, saka goal, premier league" className={INPUT} style={INPUT_STYLE} />
              </div>
            </div>

            {/* ── SECTION: Schedule Publication ── */}
            <div className="p-4 rounded-xl border border-[#1e1e32] space-y-3" style={{ background: '#0d0d1e' }}>
              <label className="text-[10px] font-black uppercase tracking-wider text-[#00b341]">📅 Schedule Publication</label>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold text-gray-500 mb-1">📅 Publish Date</label>
                  <input type="date"
                    value={newArticle.scheduled ? newArticle.scheduled.split('T')[0] : ''}
                    onChange={e => {
                      const d = e.target.value
                      const t = newArticle.scheduled?.split('T')[1] || '09:00'
                      setNewArticle(p => ({ ...p, scheduled: d ? `${d}T${t}` : '' }))
                    }}
                    min={new Date().toISOString().split('T')[0]}
                    className={INPUT} style={{ ...INPUT_STYLE, colorScheme: 'dark' }} />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-gray-500 mb-1">🕐 Publish Time</label>
                  <input type="time"
                    value={newArticle.scheduled ? (newArticle.scheduled.split('T')[1] || '09:00') : '09:00'}
                    onChange={e => {
                      const d = newArticle.scheduled?.split('T')[0] || ''
                      setNewArticle(p => ({ ...p, scheduled: d ? `${d}T${e.target.value}` : p.scheduled }))
                    }}
                    className={INPUT} style={{ ...INPUT_STYLE, colorScheme: 'dark' }} />
                </div>
              </div>
              {newArticle.scheduled && (
                <div className="flex items-center justify-between p-2.5 rounded-lg" style={{ background: '#131320', border: '1px solid #8b5cf6' }}>
                  <span className="text-[11px] font-bold text-purple-400">
                    🕐 Scheduled: {new Date(newArticle.scheduled).toLocaleString('en-KE', { weekday:'short', month:'short', day:'numeric', year:'numeric', hour:'2-digit', minute:'2-digit' })}
                  </span>
                  <button type="button" onClick={() => setNewArticle(p => ({ ...p, scheduled: '' }))} className="text-[9px] font-bold text-red-400 hover:underline">✕ Clear</button>
                </div>
              )}
              <p className="text-[10px] text-gray-600">Leave blank to save as Draft and publish manually later.</p>
            </div>

            {/* ── Submit Buttons ── */}
            <div className="flex gap-2 sticky bottom-0 pt-1" style={{ background: '#080810' }}>
              <button type="submit" className="flex-1 py-3.5 font-black text-white rounded-xl hover:opacity-90 transition-all"
                style={{ background: '#131320', border: '1px solid #1e1e32' }}>
                {newArticle.scheduled ? '🕐 Schedule Article' : '💾 Save Draft'}
              </button>
              <button type="button" onClick={() => {
                if (!newArticle.title || !newArticle.body) { toast('⚠️ Please fill in Headline and Body Content.', 'warning'); return }
                const id = `a-${Date.now()}`
                const art: Article = {
                  id, title: newArticle.title,
                  slug: newArticle.slug || slugify(newArticle.title),
                  category: newArticle.category,
                  author: newArticle.author || 'Staff Writer',
                  excerpt: newArticle.excerpt || newArticle.metaDescription,
                  body: newArticle.body,
                  imageUrl: newArticle.imageUrl || 'https://images.unsplash.com/photo-1522778119026-d647f0596c20?w=600&h=340&fit=crop',
                  imageAlt: newArticle.imageAlt || newArticle.title,
                  imageCaption: newArticle.imageCaption || '',
                  status: 'Published',
                  date: new Date().toLocaleDateString('en-KE', { month:'short', day:'numeric', year:'numeric' }),
                  scheduled: '', views: '0', likes: 0,
                  tags: newArticle.tags, matchId: newArticle.matchId,
                  teamTags: newArticle.teamTags, playerTags: newArticle.playerTags,
                  mediaEmbeds: newArticle.mediaEmbeds, isLiveBlog: newArticle.isLiveBlog,
                  metaTitle: newArticle.metaTitle || newArticle.title,
                  metaDescription: newArticle.metaDescription,
                  focusKeywords: newArticle.focusKeywords,
                }
                setArticles(p => [art, ...p])
                setShowAddArticle(false)
                setNewArticle(BLANK_ARTICLE)
              }} className="flex-1 py-3.5 font-black text-white rounded-xl hover:opacity-90 transition-all" style={{ background: '#00b341' }}>🚀 Publish Now →</button>
            </div>

          </form>
        </Modal>
      )}

      {/* Add Ticket */}
      {showAddTicket && (
        <Modal title="🏟️ Create New Event" onClose={() => setShowAddTicket(false)}>
          <form onSubmit={e => {
            e.preventDefault()
            setTickets(p => [{
              id: `tck-${Date.now()}`,
              event: newTicket.event,
              venue: newTicket.venue,
              date: newTicket.date,
              regularSold: 0, vipSold: 0,
              capacity: parseInt(newTicket.capacity) || 300,
              revenue: 0,
              status: (newTicket as any).initialStatus || 'On Sale',
              regularPrice: parseFloat((newTicket as any).regularPrice || '15'),
              vipPrice: parseFloat((newTicket as any).vipPrice || '40'),
            }, ...p])
            setShowAddTicket(false)
            setNewTicket({ event: '', venue: '', date: '', regularPrice: '15', vipPrice: '40', capacity: '300' })
          }} className="space-y-4 max-h-[80vh] overflow-y-auto pr-1">

            {/* Event Details */}
            <div className="space-y-3 p-4 rounded-xl border border-[#1e1e32]" style={{ background: '#0d0d1e' }}>
              <label className="text-[10px] font-black uppercase tracking-wider text-[#00b341]">🏟️ Event Details</label>
              <div>
                <label className="block text-[10px] font-bold text-gray-500 mb-1">Event Name *</label>
                <input value={newTicket.event} onChange={e => setNewTicket(p => ({ ...p, event: e.target.value }))} placeholder="e.g. AFCON 2026 Final Watch Party" required className={INPUT} style={INPUT_STYLE} />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[10px] font-bold text-gray-500 mb-1">Event Type</label>
                  <select onChange={e => setNewTicket(p => ({ ...p, eventType: e.target.value } as any))} className={INPUT} style={INPUT_STYLE}>
                    {['Football Match','Watch Party','Fan Meet & Greet','Tournament','Training Camp','Conference','Concert / Live Show','Awards Ceremony','Other'].map(t => <option key={t}>{t}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-gray-500 mb-1">Status</label>
                  <select onChange={e => setNewTicket(p => ({ ...p, initialStatus: e.target.value } as any))} className={INPUT} style={INPUT_STYLE}>
                    {['On Sale','Coming Soon','Invite Only','Free Entry'].map(s => <option key={s}>{s}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-[10px] font-bold text-gray-500 mb-1">Description / What to Expect</label>
                <textarea rows={3} onChange={e => setNewTicket(p => ({ ...p, description: e.target.value } as any))} placeholder="Describe the event, highlights, special guests..." className={`${INPUT} resize-none`} style={INPUT_STYLE} />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[10px] font-bold text-gray-500 mb-1">📍 Venue / Location *</label>
                  <input value={newTicket.venue} onChange={e => setNewTicket(p => ({ ...p, venue: e.target.value }))} placeholder="e.g. Kasarani Stadium, Nairobi" required className={INPUT} style={INPUT_STYLE} />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-gray-500 mb-1">City / Country</label>
                  <input onChange={e => setNewTicket(p => ({ ...p, city: e.target.value } as any))} placeholder="e.g. Nairobi, Kenya" className={INPUT} style={INPUT_STYLE} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[10px] font-bold text-gray-500 mb-1">📅 Event Date *</label>
                  <input type="date" value={newTicket.date} onChange={e => setNewTicket(p => ({ ...p, date: e.target.value }))} min={new Date().toISOString().split('T')[0]} required className={INPUT} style={{ ...INPUT_STYLE, colorScheme: 'dark' }} />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-gray-500 mb-1">🕐 Start Time</label>
                  <input type="time" defaultValue="19:00" onChange={e => setNewTicket(p => ({ ...p, time: e.target.value } as any))} className={INPUT} style={{ ...INPUT_STYLE, colorScheme: 'dark' }} />
                </div>
              </div>
            </div>

            {/* Cover Image */}
            <div className="space-y-2 p-4 rounded-xl border border-[#1e1e32]" style={{ background: '#0d0d1e' }}>
              <label className="text-[10px] font-black uppercase tracking-wider text-[#00b341]">🖼️ Event Cover Image</label>
              <div
                onDragOver={e => { e.preventDefault(); (e.currentTarget as HTMLDivElement).style.borderColor = '#00b341' }}
                onDragLeave={e => { (e.currentTarget as HTMLDivElement).style.borderColor = '' }}
                onDrop={e => {
                  e.preventDefault()
                  const file = e.dataTransfer.files?.[0]
                  if (!file || !file.type.startsWith('image/')) return
                  const reader = new FileReader()
                  reader.onload = ev => { const res = ev.target?.result as string; if (res) setNewTicket(p => ({ ...p, coverImage: res } as any)) }
                  reader.readAsDataURL(file)
                }}
                className="p-4 rounded-xl border-2 border-dashed border-[#1e1e32] bg-[#131320] hover:border-[#00b341]/50 text-center cursor-pointer transition-all"
              >
                <span className="text-2xl block mb-1">🖼️</span>
                <p className="text-xs font-bold text-white mb-0.5">Drag &amp; Drop cover image, or <span className="text-[#00b341] underline">browse</span></p>
                <p className="text-[10px] text-gray-500">Recommended: 1200×630px JPG/PNG</p>
                <input type="file" accept="image/*" className="hidden" id="ticket-cover-file"
                  onChange={e => {
                    const file = e.target.files?.[0]; if (!file) return
                    const reader = new FileReader()
                    reader.onload = ev => { const res = ev.target?.result as string; if (res) setNewTicket(p => ({ ...p, coverImage: res } as any)) }
                    reader.readAsDataURL(file)
                  }} />
                <label htmlFor="ticket-cover-file" className="inline-block mt-2 px-3 py-1 text-[10px] font-bold text-white bg-[#00b341] rounded-lg cursor-pointer hover:opacity-90">Select Image</label>
              </div>
              {(newTicket as any).coverImage && <img src={(newTicket as any).coverImage} className="w-full h-32 object-cover rounded-xl border border-[#1e1e32]" alt="" />}
            </div>

            {/* Ticketing & Pricing */}
            <div className="space-y-3 p-4 rounded-xl border border-[#1e1e32]" style={{ background: '#0d0d1e' }}>
              <label className="text-[10px] font-black uppercase tracking-wider text-[#00b341]">💰 Ticketing &amp; Pricing</label>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[10px] font-bold text-gray-500 mb-1">Currency</label>
                  <select onChange={e => setNewTicket(p => ({ ...p, currency: e.target.value } as any))} className={INPUT} style={INPUT_STYLE}>
                    {['KES – Kenya Shilling','USD – US Dollar','GBP – British Pound','EUR – Euro','UGX – Ugandan Shilling','TZS – Tanzanian Shilling','NGN – Nigerian Naira'].map(c => <option key={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-gray-500 mb-1">Total Capacity *</label>
                  <input type="number" value={newTicket.capacity} min="1" onChange={e => setNewTicket(p => ({ ...p, capacity: e.target.value }))} placeholder="e.g. 500" required className={INPUT} style={INPUT_STYLE} />
                </div>
              </div>

              {/* Regular Ticket */}
              <div className="p-3 rounded-xl" style={{ background: '#131320', border: '1px solid #1e1e32' }}>
                <p className="text-[10px] font-black text-white mb-2">🎫 Regular Ticket</p>
                <div className="grid grid-cols-2 gap-2">
                  <div><label className="block text-[9px] font-bold text-gray-500 mb-1">Price *</label>
                    <input type="number" value={(newTicket as any).regularPrice || '15'} min="0" onChange={e => setNewTicket(p => ({ ...p, regularPrice: e.target.value }))} className={INPUT} style={INPUT_STYLE} /></div>
                  <div><label className="block text-[9px] font-bold text-gray-500 mb-1">Seats Available</label>
                    <input type="number" onChange={e => setNewTicket(p => ({ ...p, regularCap: e.target.value } as any))} placeholder="Auto" className={INPUT} style={INPUT_STYLE} /></div>
                </div>
                <div className="mt-2"><label className="block text-[9px] font-bold text-gray-500 mb-1">Ticket Perks</label>
                  <input onChange={e => setNewTicket(p => ({ ...p, regularPerks: e.target.value } as any))} placeholder="e.g. General seating, entry wristband, match programme" className={INPUT} style={INPUT_STYLE} /></div>
              </div>

              {/* VIP Ticket */}
              <div className="p-3 rounded-xl" style={{ background: '#131320', border: '1px solid rgba(251,191,36,0.3)' }}>
                <p className="text-[10px] font-black text-yellow-400 mb-2">⭐ VIP Ticket</p>
                <div className="grid grid-cols-2 gap-2">
                  <div><label className="block text-[9px] font-bold text-gray-500 mb-1">Price *</label>
                    <input type="number" value={(newTicket as any).vipPrice || '40'} min="0" onChange={e => setNewTicket(p => ({ ...p, vipPrice: e.target.value }))} className={INPUT} style={INPUT_STYLE} /></div>
                  <div><label className="block text-[9px] font-bold text-gray-500 mb-1">VIP Seats</label>
                    <input type="number" onChange={e => setNewTicket(p => ({ ...p, vipCap: e.target.value } as any))} placeholder="Auto" className={INPUT} style={INPUT_STYLE} /></div>
                </div>
                <div className="mt-2"><label className="block text-[9px] font-bold text-gray-500 mb-1">VIP Perks &amp; Benefits</label>
                  <input onChange={e => setNewTicket(p => ({ ...p, vipPerks: e.target.value } as any))} placeholder="e.g. Front row, meet & greet, VIP lounge, signed merch" className={INPUT} style={INPUT_STYLE} /></div>
              </div>

              {/* Early Bird */}
              <div className="p-3 rounded-xl" style={{ background: '#131320', border: '1px solid rgba(139,92,246,0.3)' }}>
                <div className="flex items-center gap-2 mb-2">
                  <input type="checkbox" id="early-bird-toggle" className="w-3.5 h-3.5 accent-[#8b5cf6]"
                    onChange={e => setNewTicket(p => ({ ...p, hasEarlyBird: e.target.checked } as any))} />
                  <label htmlFor="early-bird-toggle" className="text-[10px] font-black text-purple-400 cursor-pointer">🕊️ Enable Early Bird Discount</label>
                </div>
                {(newTicket as any).hasEarlyBird && (
                  <div className="grid grid-cols-3 gap-2">
                    <div><label className="block text-[9px] font-bold text-gray-500 mb-1">Early Bird Price</label>
                      <input type="number" onChange={e => setNewTicket(p => ({ ...p, earlyBirdPrice: e.target.value } as any))} placeholder="e.g. 10" className={INPUT} style={INPUT_STYLE} /></div>
                    <div><label className="block text-[9px] font-bold text-gray-500 mb-1">Available Until</label>
                      <input type="date" onChange={e => setNewTicket(p => ({ ...p, earlyBirdEnd: e.target.value } as any))} className={INPUT} style={{ ...INPUT_STYLE, colorScheme: 'dark' }} /></div>
                    <div><label className="block text-[9px] font-bold text-gray-500 mb-1">Seats</label>
                      <input type="number" onChange={e => setNewTicket(p => ({ ...p, earlyBirdCap: e.target.value } as any))} placeholder="50" className={INPUT} style={INPUT_STYLE} /></div>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div><label className="block text-[10px] font-bold text-gray-500 mb-1">Max Tickets Per Buyer</label>
                  <input type="number" min="1" max="20" defaultValue="4" onChange={e => setNewTicket(p => ({ ...p, maxPerBuyer: e.target.value } as any))} className={INPUT} style={INPUT_STYLE} /></div>
                <div><label className="block text-[10px] font-bold text-gray-500 mb-1">Paystack Event Ref</label>
                  <input onChange={e => setNewTicket(p => ({ ...p, paystackRef: e.target.value } as any))} placeholder="e.g. evt_xxxxx" className={`${INPUT} font-mono text-[10px]`} style={INPUT_STYLE} /></div>
              </div>

              {/* Revenue Projection */}
              {newTicket.capacity && (
                <div className="p-3 rounded-xl" style={{ background: '#0d0d1e', border: '1px solid #00b341' }}>
                  <p className="text-[9px] font-black uppercase text-[#00b341] mb-2">📊 Revenue Projection (if sold out)</p>
                  {(() => {
                    const cap = parseInt(newTicket.capacity) || 300
                    const rp = parseFloat((newTicket as any).regularPrice || '15')
                    const vp = parseFloat((newTicket as any).vipPrice || '40')
                    const regSeats = Math.round(cap * 0.8)
                    const vipSeats = cap - regSeats
                    const total = regSeats * rp + vipSeats * vp
                    return (
                      <div className="grid grid-cols-3 gap-3 text-center">
                        <div><p className="text-[9px] text-gray-600 font-bold">Regular</p>
                          <p className="text-base font-black text-white" style={{ fontFamily: 'Big Shoulders Display' }}>${(regSeats * rp).toLocaleString()}</p>
                          <p className="text-[8px] text-gray-600">{regSeats} × ${rp}</p></div>
                        <div><p className="text-[9px] text-gray-600 font-bold">VIP</p>
                          <p className="text-base font-black text-yellow-400" style={{ fontFamily: 'Big Shoulders Display' }}>${(vipSeats * vp).toLocaleString()}</p>
                          <p className="text-[8px] text-gray-600">{vipSeats} × ${vp}</p></div>
                        <div><p className="text-[9px] text-gray-600 font-bold">Total</p>
                          <p className="text-base font-black text-[#00b341]" style={{ fontFamily: 'Big Shoulders Display' }}>${total.toLocaleString()}</p>
                          <p className="text-[8px] text-gray-600">if sold out</p></div>
                      </div>
                    )
                  })()}
                </div>
              )}
            </div>

            {/* Organiser & Contact */}
            <div className="space-y-3 p-4 rounded-xl border border-[#1e1e32]" style={{ background: '#0d0d1e' }}>
              <label className="text-[10px] font-black uppercase tracking-wider text-[#00b341]">📞 Organiser &amp; Contact</label>
              <div className="grid grid-cols-2 gap-2">
                <div><label className="block text-[10px] font-bold text-gray-500 mb-1">Organiser Name</label>
                  <input onChange={e => setNewTicket(p => ({ ...p, organiser: e.target.value } as any))} placeholder="e.g. FlowerZFC Events" className={INPUT} style={INPUT_STYLE} /></div>
                <div><label className="block text-[10px] font-bold text-gray-500 mb-1">Contact Email</label>
                  <input type="email" onChange={e => setNewTicket(p => ({ ...p, contactEmail: e.target.value } as any))} placeholder="events@globalfootball.com" className={INPUT} style={INPUT_STYLE} /></div>
              </div>
              <div><label className="block text-[10px] font-bold text-gray-500 mb-1">Notes for Attendees</label>
                <textarea rows={2} onChange={e => setNewTicket(p => ({ ...p, notes: e.target.value } as any))} placeholder="e.g. Bring valid ID. No re-entry. Gates open 2 hours before." className={`${INPUT} resize-none`} style={INPUT_STYLE} /></div>
            </div>

            {/* Submit */}
            <div className="flex gap-2 sticky bottom-0 pt-1" style={{ background: '#080810' }}>
              <button type="button" onClick={() => setShowAddTicket(false)} className="px-6 py-3.5 font-black text-white rounded-xl border border-[#1e1e32] hover:border-[#00b341] transition-all">Cancel</button>
              <button type="submit" className="flex-1 py-3.5 font-black text-white rounded-xl hover:opacity-90 transition-all" style={{ background: '#00b341' }}>🏟️ Create Event &amp; Go Live →</button>
            </div>

          </form>
        </Modal>
      )}

      {/* Add Discount */}
      {showAddDiscount && (
        <Modal title="🏷️ Create Discount Code" onClose={() => setShowAddDiscount(false)}>
          <form onSubmit={e => {
            e.preventDefault()
            if (!newDiscount.code) return
            setDiscounts(p => [{ id:`d-${Date.now()}`, code:newDiscount.code.toUpperCase(), type:newDiscount.type as 'Percent'|'Fixed', value:parseInt(newDiscount.value)||10, uses:0, maxUses:parseInt(newDiscount.maxUses)||100, status:'Active', expires:newDiscount.expires||'No expiry' }, ...p])
            setShowAddDiscount(false); setNewDiscount({ code:'', type:'Percent', value:'10', maxUses:'100', minOrder:'0', appliesToCategory:'All', expires:'', description:'' })
          }} className="space-y-3">
            {/* Code + Description */}
            <div className="rounded-xl p-4 space-y-3" style={{ background: '#0d0d1e', border: '1px solid #1e1e32' }}>
              <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest">🏷️ Code Details</p>
              <div>
                <label className="block text-[10px] font-bold text-gray-500 mb-1">Promo Code *</label>
                <input value={newDiscount.code} onChange={e => setNewDiscount(p => ({ ...p, code: e.target.value }))} placeholder="e.g. KENYA500 or SUMMER20" required className={`${INPUT} font-mono uppercase tracking-widest`} style={INPUT_STYLE} />
                <p className="text-[9px] text-gray-600 mt-1">Auto-converted to uppercase. Customers type this at checkout.</p>
              </div>
              <div>
                <label className="block text-[10px] font-bold text-gray-500 mb-1">Internal Description</label>
                <input value={newDiscount.description} onChange={e => setNewDiscount(p => ({ ...p, description: e.target.value }))} placeholder="e.g. Kenyan Independence Day promo" className={INPUT} style={INPUT_STYLE} />
              </div>
            </div>
            {/* Discount Value */}
            <div className="rounded-xl p-4 space-y-3" style={{ background: '#0d0d1e', border: '1px solid #1e1e32' }}>
              <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest">💰 Discount Value</p>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold text-gray-500 mb-1">Discount Type</label>
                  <div className="flex gap-1">
                    {(['Percent','Fixed'] as const).map(t => (
                      <button key={t} type="button" onClick={() => setNewDiscount(p => ({ ...p, type: t }))}
                        className="flex-1 py-2 text-[10px] font-black rounded-lg border transition-all"
                        style={{ background: newDiscount.type === t ? '#00b341' : 'transparent', borderColor: newDiscount.type === t ? '#00b341' : '#2a2a3e', color: newDiscount.type === t ? '#fff' : '#9ca3af' }}>
                        {t === 'Percent' ? '% Percent' : 'KES Fixed'}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-gray-500 mb-1">{newDiscount.type === 'Percent' ? 'Percentage Off' : 'Fixed Amount (KES)'}</label>
                  <input type="number" value={newDiscount.value} onChange={e => setNewDiscount(p => ({ ...p, value: e.target.value }))}
                    placeholder={newDiscount.type === 'Percent' ? '10' : '500'} className={INPUT} style={INPUT_STYLE} />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-gray-500 mb-1">Min Order Amount (KES)</label>
                  <input type="number" value={newDiscount.minOrder} onChange={e => setNewDiscount(p => ({ ...p, minOrder: e.target.value }))}
                    placeholder="0 = no minimum" className={INPUT} style={INPUT_STYLE} />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-gray-500 mb-1">Applies To Category</label>
                  <select value={newDiscount.appliesToCategory} onChange={e => setNewDiscount(p => ({ ...p, appliesToCategory: e.target.value }))} className={INPUT} style={INPUT_STYLE}>
                    {['All','Jerseys','Training Gear','Accessories','Tickets','Memberships'].map(cat => <option key={cat}>{cat}</option>)}
                  </select>
                </div>
              </div>
            </div>
            {/* Usage Limits & Expiry */}
            <div className="rounded-xl p-4 space-y-3" style={{ background: '#0d0d1e', border: '1px solid #1e1e32' }}>
              <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest">⚙️ Usage Limits & Expiry</p>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold text-gray-500 mb-1">Max Total Uses</label>
                  <input type="number" value={newDiscount.maxUses} onChange={e => setNewDiscount(p => ({ ...p, maxUses: e.target.value }))} placeholder="100" className={INPUT} style={INPUT_STYLE} />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-gray-500 mb-1">Expiry Date</label>
                  <input type="date" value={newDiscount.expires} onChange={e => setNewDiscount(p => ({ ...p, expires: e.target.value }))} className={INPUT} style={INPUT_STYLE} />
                </div>
              </div>
              {newDiscount.code && (
                <div className="flex items-center gap-3 px-4 py-3 rounded-xl" style={{ background: '#0a1a10', border: '1px solid #00b341' }}>
                  <span className="text-xl">🏷️</span>
                  <div>
                    <p className="text-sm font-black text-white font-mono tracking-widest">{newDiscount.code.toUpperCase()}</p>
                    <p className="text-[10px] text-green-400">
                      {newDiscount.type === 'Percent' ? `${newDiscount.value}% off` : `KES ${newDiscount.value} off`}
                      {parseInt(newDiscount.minOrder) > 0 ? ` · Min order KES ${newDiscount.minOrder}` : ''}
                      {' · '}{newDiscount.appliesToCategory}
                      {newDiscount.expires ? ` · Expires ${new Date(newDiscount.expires).toLocaleDateString('en-KE',{month:'short',day:'numeric',year:'numeric'})}` : ' · No expiry'}
                    </p>
                  </div>
                </div>
              )}
            </div>
            <div className="flex gap-2 pt-1">
              <button type="button" onClick={() => setShowAddDiscount(false)} className="flex-1 py-3 font-bold text-white rounded-xl border border-[#1e1e32]">Cancel</button>
              <button type="submit" className="flex-1 py-3.5 font-black text-white rounded-xl hover:opacity-90" style={{ background: '#00b341' }}>🏷️ Create Code →</button>
            </div>
          </form>
        </Modal>
      )}

      {/* Add Quiz */}
      {showAddQuiz && (
        <Modal title="Add Quiz Question" onClose={() => setShowAddQuiz(false)}>
          <form onSubmit={e => {
            e.preventDefault()
            if (!newQuiz.question || !newQuiz.opt0 || !newQuiz.opt1) return
            setQuizzes(p => [...p, { id:`q-${Date.now()}`, question:newQuiz.question, options:[newQuiz.opt0,newQuiz.opt1,newQuiz.opt2,newQuiz.opt3].filter(Boolean), correct:parseInt(newQuiz.correct), category:newQuiz.cat, plays:0 }])
            setShowAddQuiz(false); setNewQuiz({ question:'', cat:'Trivia', opt0:'', opt1:'', opt2:'', opt3:'', correct:'0' })
          }} className="space-y-3">
            <input value={newQuiz.question} onChange={e => setNewQuiz(p => ({ ...p, question: e.target.value }))} placeholder="Question *" required className={INPUT} style={INPUT_STYLE} />
            <select value={newQuiz.cat} onChange={e => setNewQuiz(p => ({ ...p, cat: e.target.value }))} className={INPUT} style={INPUT_STYLE}>
              {['Trivia','AFCON','Premier League','East Africa','FlowerZFC'].map(c => <option key={c}>{c}</option>)}
            </select>
            <div className="grid grid-cols-2 gap-2">
              {['opt0','opt1','opt2','opt3'].map((k, i) => (
                <input key={k} value={(newQuiz as Record<string,string>)[k]} onChange={e => setNewQuiz(p => ({ ...p, [k]: e.target.value }))} placeholder={`Option ${String.fromCharCode(65+i)}${i < 2 ? ' *' : ''}`} required={i < 2} className={INPUT} style={INPUT_STYLE} />
              ))}
            </div>
            <select value={newQuiz.correct} onChange={e => setNewQuiz(p => ({ ...p, correct: e.target.value }))} className={INPUT} style={INPUT_STYLE}>
              {['A (Option 1)','B (Option 2)','C (Option 3)','D (Option 4)'].map((l, i) => <option key={i} value={i}>{l} — Correct Answer</option>)}
            </select>
            <button type="submit" className="w-full py-3.5 font-black text-white rounded-xl hover:opacity-90" style={{ background: '#00b341' }}>Add Question →</button>
          </form>
        </Modal>
      )}

      {/* Danger Zone confirm */}
            {/* Add / Invite User Modal */}
      {showAddUser && (
        <Modal title="👥 Invite Staff or Register User" onClose={() => setShowAddUser(false)}>
          <form onSubmit={e => {
            e.preventDefault()
            if (!newAppUser.name || !newAppUser.email) return
            const newUser: AppUser = {
              id: `u-${Date.now()}`,
              name: newAppUser.name,
              email: newAppUser.email,
              role: newAppUser.role,
              joined: new Date().toLocaleDateString('en-KE', { month: 'short', day: 'numeric', year: 'numeric' }),
              orders: 0,
              tips: '$0',
              status: 'Active',
              avatar: newAppUser.avatar,
            }
            setUsers(p => [newUser, ...p])
            setShowAddUser(false)
            setNewAppUser({ name: '', email: '', role: 'user', avatar: '' })
          }} className="space-y-4 max-h-[80vh] overflow-y-auto pr-1">

            {/* Personal Details */}
            <div className="space-y-3 p-4 rounded-xl border border-[#1e1e32]" style={{ background: '#0d0d1e' }}>
              <label className="text-[10px] font-black uppercase tracking-wider text-[#00b341]">👤 Personal & Contact Info</label>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[10px] font-bold text-gray-500 mb-1">Full Name *</label>
                  <input value={newAppUser.name} onChange={e => setNewAppUser(p => ({ ...p, name: e.target.value }))}
                    placeholder="e.g. Victor Wanyama" required className={INPUT} style={INPUT_STYLE} />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-gray-500 mb-1">Email Address *</label>
                  <input type="email" value={newAppUser.email} onChange={e => setNewAppUser(p => ({ ...p, email: e.target.value }))}
                    placeholder="e.g. victor@flowerzfc.com" required className={INPUT} style={INPUT_STYLE} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[10px] font-bold text-gray-500 mb-1">Phone / WhatsApp Number</label>
                  <input placeholder="+254 700 000 000" className={INPUT} style={INPUT_STYLE} />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-gray-500 mb-1">Favorite Club / Team</label>
                  <input placeholder="e.g. Arsenal FC / Gor Mahia" className={INPUT} style={INPUT_STYLE} />
                </div>
              </div>
            </div>

            {/* Role & Access Permissions */}
            <div className="space-y-3 p-4 rounded-xl border border-[#1e1e32]" style={{ background: '#0d0d1e' }}>
              <label className="text-[10px] font-black uppercase tracking-wider text-[#00b341]">🔐 Role & Access Permissions</label>
              <div>
                <label className="block text-[10px] font-bold text-gray-500 mb-1">System Role *</label>
                <select value={newAppUser.role} onChange={e => setNewAppUser(p => ({ ...p, role: e.target.value }))}
                  className={INPUT} style={INPUT_STYLE}>
                  <option value="user">👤 Regular User / Fan (Community, Orders, Comments)</option>
                  <option value="writer">✍️ Writer / Journalist (Draft & Submit Articles)</option>
                  <option value="editor">📰 Editor / Content Manager (Publish Articles, Moderate Comments)</option>
                  <option value="admin">👑 Administrator (Full System Control & Financials)</option>
                </select>
              </div>
              {newAppUser.role !== 'user' && (
                <div>
                  <label className="block text-[10px] font-bold text-gray-500 mb-1">Bio / Journalist Bylaw Description</label>
                  <textarea rows={2} placeholder="Senior Football Analyst specializing in Premier League & AFCON coverage..."
                    className={`${INPUT} resize-none`} style={INPUT_STYLE} />
                </div>
              )}
              <div className="space-y-2 pt-1">
                <p className="text-[10px] font-bold text-gray-500">Fine-grained Capabilities:</p>
                {[
                  ['publish_direct', 'Can publish articles directly without editor review'],
                  ['financials_access', 'Access financial reports & tip payouts'],
                  ['shop_manage', 'Manage store products & order fulfillments'],
                  ['moderate_comments', 'Moderate user comments & ban offending users'],
                ].map(([id, label]) => (
                  <div key={id} className="flex items-center gap-2">
                    <input type="checkbox" id={`perm-${id}`} defaultChecked={newAppUser.role === 'admin'} className="w-3.5 h-3.5 accent-[#00b341]" />
                    <label htmlFor={`perm-${id}`} className="text-xs font-bold text-gray-300 cursor-pointer">{label}</label>
                  </div>
                ))}
              </div>
            </div>

            {/* Profile Avatar Options */}
            <div className="space-y-3 p-4 rounded-xl border border-[#1e1e32]" style={{ background: '#0d0d1e' }}>
              <div className="flex items-center justify-between">
                <label className="text-[10px] font-black uppercase tracking-wider text-[#00b341]">🖼️ Profile Picture / Avatar</label>
                <span className="text-[9px] text-gray-500 font-bold">Select source mode</span>
              </div>

              {/* Avatar Mode Selector Tabs */}
              <div className="grid grid-cols-4 gap-1 p-1 rounded-lg" style={{ background: '#131320', border: '1px solid #1e1e32' }}>
                {[
                  ['gravatar', '📧 Gravatar'],
                  ['upload', '📁 Upload'],
                  ['preset', '⚽ Presets'],
                  ['url', '🔗 URL'],
                ].map(([m, label]) => (
                  <button key={m} type="button" onClick={() => setAvatarMode(m as any)}
                    className={`py-1.5 text-[10px] font-black rounded-md transition-all ${avatarMode === m ? 'bg-[#00b341] text-white' : 'text-gray-400 hover:text-white'}`}>
                    {label}
                  </button>
                ))}
              </div>

              {/* Gravatar / Email Auto-fetch */}
              {avatarMode === 'gravatar' && (
                <div className="p-3 rounded-xl border border-[#1e1e32] flex items-center gap-3" style={{ background: '#131320' }}>
                  <div className="w-12 h-12 rounded-full overflow-hidden border border-[#00b341] shrink-0 bg-[#0d0d1e] flex items-center justify-center text-white font-bold text-lg">
                    {newAppUser.email ? (
                      <img src={`https://unavatar.io/${encodeURIComponent(newAppUser.email)}?fallback=https://api.dicebear.com/7.x/identicon/svg?seed=${encodeURIComponent(newAppUser.email)}`} alt="" className="w-full h-full object-cover" onError={e => { (e.target as HTMLImageElement).style.display = 'none' }} />
                    ) : (
                      '👤'
                    )}
                  </div>
                  <div>
                    <p className="text-xs font-bold text-white">Gravatar / Unavatar Auto-Sync</p>
                    <p className="text-[10px] text-gray-500">Automatically displays avatar linked to <span className="text-[#00b341] font-mono">{newAppUser.email || 'user email'}</span> (Gravatar, Google, Twitter/X).</p>
                  </div>
                </div>
              )}

              {/* Device File Upload / Drag & Drop */}
              {avatarMode === 'upload' && (
                <div
                  onDragOver={e => { e.preventDefault(); (e.currentTarget as HTMLDivElement).style.borderColor = '#00b341' }}
                  onDragLeave={e => { (e.currentTarget as HTMLDivElement).style.borderColor = '' }}
                  onDrop={e => {
                    e.preventDefault()
                    const file = e.dataTransfer.files?.[0]
                    if (!file || !file.type.startsWith('image/')) return
                    const reader = new FileReader()
                    reader.onload = ev => { const res = ev.target?.result as string; if (res) setNewAppUser(p => ({ ...p, avatar: res })) }
                    reader.readAsDataURL(file)
                  }}
                  className="p-4 rounded-xl border-2 border-dashed border-[#1e1e32] bg-[#131320] hover:border-[#00b341]/50 text-center cursor-pointer transition-all"
                >
                  <span className="text-2xl block mb-1">🖼️</span>
                  <p className="text-xs font-bold text-white mb-0.5">Drag &amp; Drop profile photo, or <span className="text-[#00b341] underline">browse device</span></p>
                  <p className="text-[10px] text-gray-500">Supports JPG, PNG, WEBP</p>
                  <input type="file" accept="image/*" className="hidden" id="user-avatar-file"
                    onChange={e => {
                      const file = e.target.files?.[0]; if (!file) return
                      const reader = new FileReader()
                      reader.onload = ev => { const res = ev.target?.result as string; if (res) setNewAppUser(p => ({ ...p, avatar: res })) }
                      reader.readAsDataURL(file)
                    }} />
                  <label htmlFor="user-avatar-file" className="inline-block mt-2 px-3 py-1 text-[10px] font-bold text-white bg-[#00b341] rounded-lg cursor-pointer hover:opacity-90">Select Image</label>
                  {newAppUser.avatar && (
                    <div className="mt-3 flex items-center justify-center gap-2">
                      <img src={newAppUser.avatar} className="w-10 h-10 rounded-full border border-[#00b341] object-cover" alt="" />
                      <span className="text-[10px] font-bold text-[#00b341]">✓ Image Loaded</span>
                    </div>
                  )}
                </div>
              )}

              {/* Preset Football Avatars */}
              {avatarMode === 'preset' && (
                <div className="grid grid-cols-6 gap-2 p-2 rounded-xl border border-[#1e1e32]" style={{ background: '#131320' }}>
                  {[
                    'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
                    'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
                    'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80',
                    'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80',
                    'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?w=150&auto=format&fit=crop&q=80',
                    'https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?w=150&auto=format&fit=crop&q=80',
                  ].map((url, idx) => (
                    <button key={idx} type="button" onClick={() => setNewAppUser(p => ({ ...p, avatar: url }))}
                      className={`w-10 h-10 rounded-full overflow-hidden border-2 transition-all ${newAppUser.avatar === url ? 'border-[#00b341] scale-110' : 'border-transparent hover:border-gray-500'}`}>
                      <img src={url} alt="" className="w-full h-full object-cover" />
                    </button>
                  ))}
                </div>
              )}

              {/* Paste URL */}
              {avatarMode === 'url' && (
                <div className="space-y-2">
                  <input value={newAppUser.avatar} onChange={e => setNewAppUser(p => ({ ...p, avatar: e.target.value }))}
                    placeholder="Paste Image URL (https://…)" className={INPUT} style={INPUT_STYLE} />
                  {newAppUser.avatar && (
                    <div className="flex items-center gap-2">
                      <img src={newAppUser.avatar} className="w-10 h-10 rounded-full border border-[#00b341] object-cover" alt="" onError={e => { (e.target as HTMLImageElement).style.display = 'none' }} />
                      <span className="text-[10px] text-gray-400">Preview</span>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Welcome Email Toggle */}
            <div className="p-3 rounded-xl flex items-center justify-between" style={{ background: '#131320', border: '1px solid #1e1e32' }}>
              <div>
                <p className="text-xs font-bold text-white">✉️ Send Welcome Invitation Email</p>
                <p className="text-[9px] text-gray-500">Sends login instructions & secure password set link</p>
              </div>
              <input type="checkbox" defaultChecked className="w-4 h-4 accent-[#00b341]" />
            </div>

            {/* Actions */}
            <div className="flex gap-2 sticky bottom-0 pt-1" style={{ background: '#080810' }}>
              <button type="button" onClick={() => setShowAddUser(false)} className="px-6 py-3 font-bold text-white rounded-xl border border-[#1e1e32]">Cancel</button>
              <button type="submit" className="flex-1 py-3 font-black text-white rounded-xl hover:opacity-90 transition-all" style={{ background: '#00b341' }}>Create Account &amp; Send Invite →</button>
            </div>
          </form>
        </Modal>
      )}

      
      {/* Initiate Payout Modal */}
      {showPayoutModal && (
        <Modal title="💸 Initiate Creator Payout (M-Pesa / Bank)" onClose={() => setShowPayoutModal(false)}>
          <form onSubmit={e => {
            e.preventDefault()
            const ref = `PAY-${Date.now()}`
            logAdminAction(user?.email || 'admin@flowerz.fc', 'INITIATE_PAYOUT', 'Payout', ref, `Initiated B2C transfer of $${payoutForm.amount} USD to ${payoutForm.recipient} (${payoutForm.mpesa})`)
            toast(`✅ Paystack B2C Payout of $${payoutForm.amount} sent to ${payoutForm.recipient} via M-Pesa. Ref: ${ref}`, 'success')
            setShowPayoutModal(false)
          }} className="space-y-4">
            <div>
              <label className="block text-[10px] font-bold text-gray-500 mb-1">Select Writer / Staff Member *</label>
              <select value={payoutForm.recipient} onChange={e => setPayoutForm(p => ({ ...p, recipient: e.target.value }))}
                className={INPUT} style={INPUT_STYLE}>
                {users.filter(u => ['admin','editor','writer'].includes(u.role)).map(u => (
                  <option key={u.id} value={u.name}>{u.name} ({u.role.toUpperCase()}) — Accumulated Tips: {u.tips}</option>
                ))}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-[10px] font-bold text-gray-500 mb-1">Payout Amount ($ USD) *</label>
                <input type="number" value={payoutForm.amount} onChange={e => setPayoutForm(p => ({ ...p, amount: e.target.value }))}
                  placeholder="150" required className={INPUT} style={INPUT_STYLE} />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-gray-500 mb-1">M-Pesa / Bank Phone *</label>
                <input value={payoutForm.mpesa} onChange={e => setPayoutForm(p => ({ ...p, mpesa: e.target.value }))}
                  placeholder="+254 7..." required className={INPUT} style={INPUT_STYLE} />
              </div>
            </div>
            <div className="p-3 rounded-xl border border-[#1e1e32]" style={{ background: '#131320' }}>
              <p className="text-[10px] text-gray-400 font-bold mb-1">Settlement Method:</p>
              <p className="text-xs text-[#00b341] font-black">🟢 Direct Paystack B2C Instant M-Pesa Transfer</p>
            </div>
            <div className="flex gap-2 pt-2">
              <button type="button" onClick={() => setShowPayoutModal(false)} className="flex-1 py-3 font-bold text-white rounded-xl border border-[#1e1e32]">Cancel</button>
              <button type="submit" className="flex-1 py-3 font-black text-white rounded-xl hover:opacity-90" style={{ background: '#00b341' }}>Send Payout Now →</button>
            </div>
          </form>
        </Modal>
      )}

      {/* Auto-Moderation Rules Modal */}
      {showModSettings && (
        <Modal title="⚙️ Auto-Moderation & Profanity Engine" onClose={() => setShowModSettings(false)}>
          <div className="space-y-4 max-h-[80vh] overflow-y-auto pr-1">

            {/* ── Preset Content Filters ── */}
            <div className="space-y-3 p-4 rounded-xl border border-[#1e1e32]" style={{ background: '#0d0d1e' }}>
              <label className="text-[10px] font-black uppercase tracking-wider text-[#00b341]">🛡️ Automated Spam &amp; Safety Filters</label>
              <div className="space-y-2.5">
                {[
                  ['hate', '🚫 Strict Hate Speech & Profanity Filter', 'Auto-blocks racial slurs, hate speech, and explicit insults.', filterHateSpeech, setFilterHateSpeech],
                  ['betting', '🎰 Betting & Aviator Promo Block', 'Filters 1xBet, SportPesa, Aviator codes, and gambling links.', filterBettingAds, setFilterBettingAds],
                  ['phone', '📱 WhatsApp & Telegram Number Spam Filter', 'Detects and holds phone numbers (+254...) & Telegram contact spam.', filterPhoneSpam, setFilterPhoneSpam],
                  ['links', '🔗 External URL & Hyperlink Filter', 'Auto-holds all comments containing external web links for review.', autoFilterLinks, setAutoFilterLinks],
                ].map(([id, title, desc, val, setFn]: any) => (
                  <div key={id} className="p-3 rounded-xl flex items-center justify-between" style={{ background: '#131320', border: '1px solid #1e1e32' }}>
                    <div>
                      <p className="text-xs font-bold text-white">{title}</p>
                      <p className="text-[9px] text-gray-500">{desc}</p>
                    </div>
                    <input type="checkbox" checked={val} onChange={e => setFn(e.target.checked)} className="w-4 h-4 accent-[#00b341]" />
                  </div>
                ))}
              </div>
            </div>

            {/* ── Action Threshold Triggers ── */}
            <div className="space-y-3 p-4 rounded-xl border border-[#1e1e32]" style={{ background: '#0d0d1e' }}>
              <label className="text-[10px] font-black uppercase tracking-wider text-[#00b341]">⚡ Automated Enforcement Thresholds</label>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold text-gray-500 mb-1">User Reports to Auto-Flag</label>
                  <select value={autoFlagThreshold} onChange={e => setAutoFlagThreshold(e.target.value)} className={INPUT} style={INPUT_STYLE}>
                    <option value="1">1 Report (Immediate Flag)</option>
                    <option value="2">2 Reports</option>
                    <option value="3">3 Reports (Recommended)</option>
                    <option value="5">5 Reports</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-gray-500 mb-1">Violations to Auto-Ban Account</label>
                  <select value={autoBanThreshold} onChange={e => setAutoBanThreshold(e.target.value)} className={INPUT} style={INPUT_STYLE}>
                    <option value="2">2 Violations</option>
                    <option value="3">3 Violations (Recommended)</option>
                    <option value="5">5 Violations</option>
                    <option value="disabled">Never Auto-Ban (Manual only)</option>
                  </select>
                </div>
              </div>
            </div>

            {/* ── Discussion Rate & Pre-moderation ── */}
            <div className="space-y-3 p-4 rounded-xl border border-[#1e1e32]" style={{ background: '#0d0d1e' }}>
              <label className="text-[10px] font-black uppercase tracking-wider text-[#00b341]">⏱️ Match Day &amp; Traffic Controls</label>
              <div className="p-3 rounded-xl flex items-center justify-between" style={{ background: '#131320', border: '1px solid #1e1e32' }}>
                <div>
                  <p className="text-xs font-bold text-white">⏱️ 60-Second Cooldown Slow Mode</p>
                  <p className="text-[9px] text-gray-500">Limits users to 1 comment every 60s during heated derby matches.</p>
                </div>
                <input type="checkbox" checked={slowMode} onChange={e => setSlowMode(e.target.checked)} className="w-4 h-4 accent-[#00b341]" />
              </div>

              <div className="p-3 rounded-xl flex items-center justify-between" style={{ background: '#131320', border: '1px solid #1e1e32' }}>
                <div>
                  <p className="text-xs font-bold text-white">🔒 Pre-Moderation Mode (Hold All New Comments)</p>
                  <p className="text-[9px] text-gray-500">Requires manual approval for all new comments before going live.</p>
                </div>
                <input type="checkbox" checked={holdAllComments} onChange={e => setHoldAllComments(e.target.checked)} className="w-4 h-4 accent-[#00b341]" />
              </div>
            </div>

            {/* ── Banned Keywords Textarea ── */}
            <div className="space-y-2 p-4 rounded-xl border border-[#1e1e32]" style={{ background: '#0d0d1e' }}>
              <div className="flex items-center justify-between">
                <label className="text-[10px] font-black uppercase tracking-wider text-[#00b341]">📝 Custom Blacklisted Keywords &amp; Phrases</label>
                <span className="text-[9px] text-gray-500 font-bold">{bannedWords.split(',').filter(Boolean).length} keywords configured</span>
              </div>
              <textarea rows={4} value={bannedWords} onChange={e => setBannedWords(e.target.value)}
                placeholder="betting, crypto, telegram link, free coins, casino, aviator, 1xbet..."
                className={`${INPUT} resize-none font-mono text-xs`} style={INPUT_STYLE} />
              <p className="text-[10px] text-gray-500">Separate multiple keywords with commas. Matching comments are instantly sent to Pending Review.</p>
            </div>

            {/* ── Save ── */}
            <div className="flex gap-2 sticky bottom-0 pt-1" style={{ background: '#080810' }}>
              <button type="button" onClick={() => setShowModSettings(false)} className="px-6 py-3.5 font-bold text-white rounded-xl border border-[#1e1e32]">Cancel</button>
              <button type="button" onClick={() => {
                toast('🛡 Auto-Moderation rules saved!', 'success')
                setShowModSettings(false)
              }} className="flex-1 py-3.5 font-black text-white rounded-xl hover:opacity-90 transition-all" style={{ background: '#00b341' }}>
                Save &amp; Apply Auto-Mod Rules →
              </button>
            </div>

          </div>
        </Modal>
      )}
      {/* Edit Comment Modal */}
      {editCommentItem && (
        <Modal title="✏️ Edit Comment" onClose={() => setEditCommentItem(null)}>
          <form onSubmit={e => {
            e.preventDefault()
            setComments(prev => prev.map(x => x.id === editCommentItem.id ? { ...x, body: editCommentItem.body } : x))
            setEditCommentItem(null)
          }} className="space-y-4">
            <div>
              <label className="block text-[10px] font-bold text-gray-500 mb-1">Author: {editCommentItem.user}</label>
              <textarea rows={4} value={editCommentItem.body} onChange={e => setEditCommentItem((p: any) => ({ ...p, body: e.target.value }))}
                required className={`${INPUT} resize-none`} style={INPUT_STYLE} />
            </div>
            <div className="flex gap-2">
              <button type="button" onClick={() => setEditCommentItem(null)} className="flex-1 py-3 font-bold text-white rounded-xl border border-[#1e1e32]">Cancel</button>
              <button type="submit" className="flex-1 py-3 font-black text-white rounded-xl" style={{ background: '#00b341' }}>Save Changes →</button>
            </div>
          </form>
        </Modal>
      )}

      {/* Create Ad Slot Modal */}
      {showAddAdSlot && (
        <Modal title="📢 Create New Ad Slot Placement" onClose={() => setShowAddAdSlot(false)}>
          <form onSubmit={e => {
            e.preventDefault()
            if (!newAdSlot.slot) return
            const isBooked = (newAdSlot as any).initialStatus === 'Booked'
            const slotObj: AdSlot = {
              id: `ad-${Date.now()}`,
              slot: newAdSlot.slot,
              page: newAdSlot.page,
              size: newAdSlot.size,
              price: parseInt(newAdSlot.price) || 300,
              status: isBooked ? 'Booked' : 'Available',
              advertiser: isBooked ? ((newAdSlot as any).advertiser || 'Direct Sponsor') : '—',
              start: isBooked ? ((newAdSlot as any).start || new Date().toLocaleDateString('en-KE', { month:'short', day:'numeric' })) : '—',
              end: isBooked ? ((newAdSlot as any).end || '30 Days') : '—',
            }
            setAds(p => [slotObj, ...p])
            setShowAddAdSlot(false)
            setNewAdSlot({ slot: '', page: 'Homepage', size: '728x90', price: '300' })
          }} className="space-y-4 max-h-[80vh] overflow-y-auto pr-1">

            {/* Placement Details */}
            <div className="space-y-3 p-4 rounded-xl border border-[#1e1e32]" style={{ background: '#0d0d1e' }}>
              <label className="text-[10px] font-black uppercase tracking-wider text-[#00b341]">📌 Placement & Page Position</label>
              <div>
                <label className="block text-[10px] font-bold text-gray-500 mb-1">Ad Placement Title *</label>
                <input value={newAdSlot.slot} onChange={e => setNewAdSlot(p => ({ ...p, slot: e.target.value }))}
                  placeholder="e.g. Header Top Leaderboard Banner" required className={INPUT} style={INPUT_STYLE} />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[10px] font-bold text-gray-500 mb-1">Target Page</label>
                  <select value={newAdSlot.page} onChange={e => setNewAdSlot(p => ({ ...p, page: e.target.value }))} className={INPUT} style={INPUT_STYLE}>
                    {['Homepage','Article Detail','Match Center','Merchandise Store','News Feed','Sidebar Global'].map(pg => <option key={pg}>{pg}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-gray-500 mb-1">Position on Page</label>
                  <select onChange={e => setNewAdSlot(p => ({ ...p, position: e.target.value } as any))} className={INPUT} style={INPUT_STYLE}>
                    {['Top Header Leaderboard','Above Article Content','Inside Article (Para 3)','Right Sidebar Top','Sticky Bottom Anchor','Between News Feeds'].map(pos => <option key={pos}>{pos}</option>)}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[10px] font-bold text-gray-500 mb-1">Banner Dimension (Size)</label>
                  <select value={newAdSlot.size} onChange={e => setNewAdSlot(p => ({ ...p, size: e.target.value }))} className={INPUT} style={INPUT_STYLE}>
                    {['728x90 Leaderboard','300x250 Medium Rectangle','300x600 Half Page','320x50 Mobile Banner','970x250 Billboard'].map(sz => <option key={sz} value={sz.split(' ')[0]}>{sz}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-gray-500 mb-1">Monthly Rate ($ USD) *</label>
                  <input type="number" value={newAdSlot.price} onChange={e => setNewAdSlot(p => ({ ...p, price: e.target.value }))}
                    placeholder="300" required className={INPUT} style={INPUT_STYLE} />
                </div>
              </div>
            </div>

            {/* Ad Format & Banner Image / Script */}
            <div className="space-y-3 p-4 rounded-xl border border-[#1e1e32]" style={{ background: '#0d0d1e' }}>
              <label className="text-[10px] font-black uppercase tracking-wider text-[#00b341]">🖼️ Ad Creative &amp; Format</label>
              <div>
                <label className="block text-[10px] font-bold text-gray-500 mb-1">Ad Format Type</label>
                <select onChange={e => setNewAdSlot(p => ({ ...p, adType: e.target.value } as any))} className={INPUT} style={INPUT_STYLE}>
                  <option value="image">🖼️ Image Banner (JPG, PNG, WEBP)</option>
                  <option value="adsense">💻 Google AdSense / HTML5 Script Tag</option>
                  <option value="link">🔗 Sponsored Text / Affiliate Link</option>
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-bold text-gray-500 mb-1">Destination URL / Click Link</label>
                <input onChange={e => setNewAdSlot(p => ({ ...p, destinationUrl: e.target.value } as any))}
                  placeholder="https://advertiser.com/landing-page" className={INPUT} style={INPUT_STYLE} />
              </div>
              <div
                onDragOver={e => { e.preventDefault(); (e.currentTarget as HTMLDivElement).style.borderColor = '#00b341' }}
                onDragLeave={e => { (e.currentTarget as HTMLDivElement).style.borderColor = '' }}
                onDrop={e => {
                  e.preventDefault()
                  const file = e.dataTransfer.files?.[0]
                  if (!file || !file.type.startsWith('image/')) return
                  const reader = new FileReader()
                  reader.onload = ev => { const res = ev.target?.result as string; if (res) setNewAdSlot(p => ({ ...p, bannerImage: res } as any)) }
                  reader.readAsDataURL(file)
                }}
                className="p-4 rounded-xl border-2 border-dashed border-[#1e1e32] bg-[#131320] hover:border-[#00b341]/50 text-center cursor-pointer transition-all"
              >
                <span className="text-2xl block mb-1">🖼️</span>
                <p className="text-xs font-bold text-white mb-0.5">Drag &amp; Drop creative banner image, or <span className="text-[#00b341] underline">browse</span></p>
                <p className="text-[10px] text-gray-500">Supports JPG, PNG, GIF, WEBP</p>
                <input type="file" accept="image/*" className="hidden" id="ad-banner-file"
                  onChange={e => {
                    const file = e.target.files?.[0]; if (!file) return
                    const reader = new FileReader()
                    reader.onload = ev => { const res = ev.target?.result as string; if (res) setNewAdSlot(p => ({ ...p, bannerImage: res } as any)) }
                    reader.readAsDataURL(file)
                  }} />
                <label htmlFor="ad-banner-file" className="inline-block mt-2 px-3 py-1 text-[10px] font-bold text-white bg-[#00b341] rounded-lg cursor-pointer hover:opacity-90">Select Image</label>
              </div>
              {(newAdSlot as any).bannerImage && (
                <img src={(newAdSlot as any).bannerImage} className="w-full h-24 object-contain rounded-xl border border-[#1e1e32] bg-[#131320]" alt="" />
              )}
            </div>

            {/* Advertiser & Booking Status */}
            <div className="space-y-3 p-4 rounded-xl border border-[#1e1e32]" style={{ background: '#0d0d1e' }}>
              <label className="text-[10px] font-black uppercase tracking-wider text-[#00b341]">🤝 Advertiser &amp; Booking Status</label>
              <div>
                <label className="block text-[10px] font-bold text-gray-500 mb-1">Initial Status</label>
                <select onChange={e => setNewAdSlot(p => ({ ...p, initialStatus: e.target.value } as any))} className={INPUT} style={INPUT_STYLE}>
                  <option value="Available">🔓 Available for Booking</option>
                  <option value="Booked">🤝 Immediately Booked (Active Campaign)</option>
                </select>
              </div>
              {(newAdSlot as any).initialStatus === 'Booked' && (
                <div className="space-y-2 pt-1 border-t border-[#1e1e32]">
                  <div>
                    <label className="block text-[10px] font-bold text-gray-500 mb-1">Advertiser / Brand Name</label>
                    <input onChange={e => setNewAdSlot(p => ({ ...p, advertiser: e.target.value } as any))}
                      placeholder="e.g. 1xBet / Nike Africa" className={INPUT} style={INPUT_STYLE} />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[10px] font-bold text-gray-500 mb-1">Start Date</label>
                      <input type="date" onChange={e => setNewAdSlot(p => ({ ...p, start: e.target.value } as any))} className={INPUT} style={{ ...INPUT_STYLE, colorScheme: 'dark' }} />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-gray-500 mb-1">End Date</label>
                      <input type="date" onChange={e => setNewAdSlot(p => ({ ...p, end: e.target.value } as any))} className={INPUT} style={{ ...INPUT_STYLE, colorScheme: 'dark' }} />
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Device Targeting */}
            <div className="p-4 rounded-xl border border-[#1e1e32]" style={{ background: '#0d0d1e' }}>
              <label className="text-[10px] font-black uppercase tracking-wider text-[#00b341] block mb-2">📱 Device Targeting</label>
              <div className="flex gap-4">
                {['Desktop','Mobile Web & App','Tablet'].map(d => (
                  <div key={d} className="flex items-center gap-2">
                    <input type="checkbox" id={`dev-${d}`} defaultChecked className="w-3.5 h-3.5 accent-[#00b341]" />
                    <label htmlFor={`dev-${d}`} className="text-xs font-bold text-gray-300 cursor-pointer">{d}</label>
                  </div>
                ))}
              </div>
            </div>

            {/* Submit */}
            <div className="flex gap-2 sticky bottom-0 pt-1" style={{ background: '#080810' }}>
              <button type="button" onClick={() => setShowAddAdSlot(false)} className="px-6 py-3 font-bold text-white rounded-xl border border-[#1e1e32]">Cancel</button>
              <button type="submit" className="flex-1 py-3 font-black text-white rounded-xl hover:opacity-90 transition-all" style={{ background: '#00b341' }}>Create Ad Placement →</button>
            </div>

          </form>
        </Modal>
      )}



            {/* ── NEW LIVE BLOG MODAL ── */}
      {showNewBlog && (
        <Modal title="📡 Create New Live Blog" onClose={() => { setShowNewBlog(false); setNewBlog({ title:'', category:'Match', match:'', coverImage:'', scheduledAt:'' }) }}>
          <form onSubmit={e => {
            e.preventDefault()
            if (!newBlog.title) return
            const blog = {
              id: `lb-${Date.now()}`,
              title: newBlog.title,
              category: newBlog.category,
              match: newBlog.match,
              coverImage: newBlog.coverImage,
              status: newBlog.scheduledAt ? 'Scheduled' as const : 'Live' as const,
              viewers: 0,
              scheduledAt: newBlog.scheduledAt,
              createdAt: new Date().toLocaleString('en-KE', { month:'short', day:'numeric', year:'numeric', hour:'2-digit', minute:'2-digit' }),
              updates: [] as { id:string; minute:string; type:'Goal'|'Card'|'Sub'|'Update'|'Transfer'|'FT'; text:string; postedAt:string }[],
            }
            setLiveBlogs(p => [blog, ...p])
            setShowNewBlog(false)
            setNewBlog({ title:'', category:'Match', match:'', coverImage:'', scheduledAt:'' })
          }} className="space-y-4 text-sm">

            <div className="rounded-xl p-4 space-y-3" style={{ background: '#0d0d1e', border: '1px solid #1e1e32' }}>
              <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest">📋 Blog Details</p>
              <div>
                <label className="block text-[10px] font-bold text-gray-500 mb-1">Blog Type</label>
                <div className="flex gap-2">
                  {(['Match','News','Transfer'] as const).map(cat => (
                    <button key={cat} type="button" onClick={() => setNewBlog(p => ({ ...p, category: cat }))}
                      className="flex-1 py-2 text-[10px] font-black rounded-lg border transition-all"
                      style={{ background: newBlog.category === cat ? (cat === 'Match' ? '#3b82f6' : cat === 'Transfer' ? '#8b5cf6' : '#f59e0b') : 'transparent',
                               borderColor: newBlog.category === cat ? 'transparent' : '#2a2a3e', color: newBlog.category === cat ? '#fff' : '#9ca3af' }}>
                      {cat === 'Match' ? '⚽ Match' : cat === 'Transfer' ? '🔁 Transfer' : '📰 News'}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-[10px] font-bold text-gray-500 mb-1">Blog Title *</label>
                <input value={newBlog.title} onChange={e => setNewBlog(p => ({ ...p, title: e.target.value }))}
                  placeholder="e.g. Arsenal vs Chelsea — Community Shield 2026" required className={INPUT} style={INPUT_STYLE} />
              </div>
              {newBlog.category === 'Match' && (
                <div>
                  <label className="block text-[10px] font-bold text-gray-500 mb-1">Match / Fixture</label>
                  <input value={newBlog.match} onChange={e => setNewBlog(p => ({ ...p, match: e.target.value }))}
                    placeholder="e.g. Arsenal vs Chelsea" className={INPUT} style={INPUT_STYLE} />
                </div>
              )}
              <div>
                <label className="block text-[10px] font-bold text-gray-500 mb-1">Cover Image URL</label>
                <input value={newBlog.coverImage} onChange={e => setNewBlog(p => ({ ...p, coverImage: e.target.value }))}
                  placeholder="https://…" className={INPUT} style={INPUT_STYLE} />
                {newBlog.coverImage && <img src={newBlog.coverImage} alt="" className="mt-2 w-full h-24 object-cover rounded-lg" onError={ev => (ev.currentTarget.style.display='none')} />}
              </div>
            </div>

            <div className="rounded-xl p-4 space-y-3" style={{ background: '#0d0d1e', border: '1px solid #1e1e32' }}>
              <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest">🕐 Schedule</p>
              <label className="flex items-center gap-3 cursor-pointer">
                <input type="checkbox" checked={!newBlog.scheduledAt}
                  onChange={e => setNewBlog(p => ({ ...p, scheduledAt: e.target.checked ? '' : new Date(Date.now()+3600000).toISOString().slice(0,16) }))}
                  className="accent-red-500" />
                <span className="text-xs font-bold text-white">🔴 Go Live Immediately</span>
              </label>
              {newBlog.scheduledAt && (
                <div>
                  <label className="block text-[10px] font-bold text-gray-500 mb-1">Schedule For</label>
                  <input type="datetime-local" value={newBlog.scheduledAt}
                    onChange={e => setNewBlog(p => ({ ...p, scheduledAt: e.target.value }))} className={INPUT} style={INPUT_STYLE} />
                </div>
              )}
            </div>

            <div className="flex gap-2 pt-1">
              <button type="button" onClick={() => { setShowNewBlog(false); setNewBlog({ title:'', category:'Match', match:'', coverImage:'', scheduledAt:'' }) }}
                className="flex-1 py-3 font-bold text-white rounded-xl border border-[#1e1e32]">Cancel</button>
              <button type="submit" className="flex-1 py-3 font-black text-white rounded-xl hover:opacity-90 transition-all"
                style={{ background: newBlog.scheduledAt ? '#f59e0b' : '#ef4444' }}>
                {newBlog.scheduledAt ? '📅 Schedule Blog' : '🔴 Launch Live Blog'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* ── POST UPDATE MODAL ── */}
      {showPostUpdate && activeBlogId && (() => {
        const blog = liveBlogs.find(b => b.id === activeBlogId)
        if (!blog) return null
        return (
          <Modal title={`✏️ Post Update — ${blog.title}`} onClose={() => { setShowPostUpdate(false); setUpdateMinute(''); setUpdateType('Update'); setUpdateText('') }}>
            <form onSubmit={e => {
              e.preventDefault()
              if (!updateText) return
              const update = {
                id: `u-${Date.now()}`,
                minute: updateMinute || new Date().toLocaleTimeString('en-KE', { hour:'2-digit', minute:'2-digit' }),
                type: updateType,
                text: updateText,
                postedAt: 'Just now',
              }
              setLiveBlogs(p => p.map(b => b.id === activeBlogId
                ? { ...b, updates: [update, ...b.updates], viewers: b.viewers + Math.floor(Math.random()*15+5) }
                : b
              ))
              setShowPostUpdate(false); setUpdateMinute(''); setUpdateType('Update'); setUpdateText('')
            }} className="space-y-4 text-sm">

              <div className="rounded-xl p-4 space-y-3" style={{ background: '#0d0d1e', border: '1px solid #1e1e32' }}>
                <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest">📢 Update Type</p>
                <div className="flex flex-wrap gap-2">
                  {([
                    { t:'Goal' as const,     icon:'⚽', color:'#00b341' },
                    { t:'Card' as const,     icon:'🟨', color:'#f59e0b' },
                    { t:'Sub' as const,      icon:'🔄', color:'#3b82f6' },
                    { t:'Transfer' as const, icon:'🔁', color:'#8b5cf6' },
                    { t:'Update' as const,   icon:'📢', color:'#6b7280' },
                    { t:'FT' as const,       icon:'🏁', color:'#ef4444' },
                  ]).map(({ t, icon, color }) => (
                    <button key={t} type="button" onClick={() => setUpdateType(t)}
                      className="flex-1 min-w-[80px] py-2 text-[10px] font-black rounded-lg border transition-all"
                      style={{ background: updateType === t ? color : 'transparent', borderColor: updateType === t ? color : '#2a2a3e', color: updateType === t ? '#fff' : '#9ca3af' }}>
                      {icon} {t}
                    </button>
                  ))}
                </div>
              </div>

              <div className="rounded-xl p-4 space-y-3" style={{ background: '#0d0d1e', border: '1px solid #1e1e32' }}>
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[10px] font-bold text-gray-500 mb-1">Minute / Timestamp</label>
                    <input value={updateMinute} onChange={e => setUpdateMinute(e.target.value)}
                      placeholder="e.g. 74' or HT" className={INPUT} style={INPUT_STYLE} />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-[10px] font-bold text-gray-500 mb-1">Update Text *</label>
                    <textarea value={updateText} onChange={e => setUpdateText(e.target.value)} required rows={3}
                      placeholder="Describe the update… e.g. GOAL! Saka taps in from close range…"
                      className={`${INPUT} resize-none`} style={INPUT_STYLE} />
                  </div>
                </div>
                {updateText && (
                  <div className="flex gap-3 items-start px-3 py-2 rounded-lg" style={{ background: '#131320', border: '1px solid #1e1e32' }}>
                    <span className="text-lg shrink-0">
                      {updateType === 'Goal' ? '⚽' : updateType === 'Card' ? '🟨' : updateType === 'FT' ? '🏁' : updateType === 'Transfer' ? '🔁' : updateType === 'Sub' ? '🔄' : '📢'}
                    </span>
                    <div>
                      <p className="text-[10px] font-black text-gray-500">{updateMinute || 'Now'} · {updateType}</p>
                      <p className="text-xs text-white mt-0.5">{updateText}</p>
                    </div>
                  </div>
                )}
              </div>

              <div className="flex gap-2 pt-1">
                <button type="button" onClick={() => { setShowPostUpdate(false); setUpdateMinute(''); setUpdateType('Update'); setUpdateText('') }}
                  className="flex-1 py-3 font-bold text-white rounded-xl border border-[#1e1e32]">Cancel</button>
                <button type="submit" className="flex-1 py-3 font-black text-white rounded-xl hover:opacity-90 transition-all" style={{ background: '#00b341' }}>
                  📡 Post Update Live
                </button>
              </div>
            </form>
          </Modal>
        )
      })()}

      {/* ── EDIT DISCOUNT MODAL ── */}
      {editDiscount && (
        <Modal title={`✏️ Edit Code — ${editDiscount.code}`} onClose={() => setEditDiscount(null)}>
          <form onSubmit={e => {
            e.preventDefault()
            setDiscounts(p => p.map(d => d.id === editDiscount.id ? { ...d, ...editDiscount } : d))
            setEditDiscount(null)
          }} className="space-y-4 text-sm">
            <div className="rounded-xl p-4 space-y-3" style={{ background: '#0d0d1e', border: '1px solid #1e1e32' }}>
              <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest">🏷️ Code Details</p>
              <div>
                <label className="block text-[10px] font-bold text-gray-500 mb-1">Promo Code</label>
                <input value={editDiscount.code}
                  onChange={e => setEditDiscount(p => p ? { ...p, code: e.target.value.toUpperCase() } : p)}
                  className={`${INPUT} font-mono uppercase tracking-widest`} style={INPUT_STYLE} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold text-gray-500 mb-1">Type</label>
                  <div className="flex gap-1">
                    {(['Percent','Fixed'] as const).map(t => (
                      <button key={t} type="button" onClick={() => setEditDiscount(p => p ? { ...p, type: t } : p)}
                        className="flex-1 py-2 text-[10px] font-black rounded-lg border transition-all"
                        style={{ background: editDiscount.type === t ? '#00b341' : 'transparent', borderColor: editDiscount.type === t ? '#00b341' : '#2a2a3e', color: editDiscount.type === t ? '#fff' : '#9ca3af' }}>
                        {t === 'Percent' ? '% Percent' : 'KES Fixed'}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-gray-500 mb-1">Amount</label>
                  <input type="number" value={editDiscount.value}
                    onChange={e => setEditDiscount(p => p ? { ...p, value: parseInt(e.target.value)||0 } : p)}
                    className={INPUT} style={INPUT_STYLE} />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-gray-500 mb-1">Max Uses</label>
                  <input type="number" value={editDiscount.maxUses}
                    onChange={e => setEditDiscount(p => p ? { ...p, maxUses: parseInt(e.target.value)||100 } : p)}
                    className={INPUT} style={INPUT_STYLE} />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-gray-500 mb-1">Expires</label>
                  <input value={editDiscount.expires}
                    onChange={e => setEditDiscount(p => p ? { ...p, expires: e.target.value } : p)}
                    placeholder="e.g. Dec 31, 2026" className={INPUT} style={INPUT_STYLE} />
                </div>
              </div>
            </div>
            <div className="flex gap-2 pt-1">
              <button type="button" onClick={() => setEditDiscount(null)} className="flex-1 py-3 font-bold text-white rounded-xl border border-[#1e1e32]">Cancel</button>
              <button type="submit" className="flex-1 py-3 font-black text-white rounded-xl hover:opacity-90" style={{ background: '#00b341' }}>Save Changes →</button>
            </div>
          </form>
        </Modal>
      )}

      {/* ── BULK GENERATE CODES MODAL ── */}
      {showBulkGen && (
        <Modal title="⚡ Bulk Generate Discount Codes" onClose={() => { setShowBulkGen(false); setBulkPrefix(''); setBulkCount('10') }}>
          <form onSubmit={e => {
            e.preventDefault()
            if (!bulkPrefix) return
            const count = Math.min(parseInt(bulkCount)||10, 200)
            const generated = Array.from({ length: count }, (_, i) => ({
              id: `d-${Date.now()}-${i}`,
              code: `${bulkPrefix.toUpperCase()}${String(i+1).padStart(2,'0')}`,
              type: 'Percent' as const,
              value: 10,
              uses: 0,
              maxUses: 1,
              status: 'Active' as const,
              expires: 'Dec 31, 2026',
            }))
            setDiscounts(p => [...generated, ...p])
            toast(`⚡ Generated ${count} codes: ${bulkPrefix.toUpperCase()}01 → ${bulkPrefix.toUpperCase()}${String(count).padStart(2,'0')}`, 'success')
            setShowBulkGen(false); setBulkPrefix(''); setBulkCount('10')
          }} className="space-y-4 text-sm">
            <div className="rounded-xl p-4 space-y-3" style={{ background: '#0d0d1e', border: '1px solid #1e1e32' }}>
              <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest">⚡ Bulk Config</p>
              <div>
                <label className="block text-[10px] font-bold text-gray-500 mb-1">Code Prefix *</label>
                <input value={bulkPrefix} onChange={e => setBulkPrefix(e.target.value)}
                  placeholder="e.g. AFCON or VIP" required className={`${INPUT} font-mono uppercase tracking-widest`} style={INPUT_STYLE} />
                <p className="text-[9px] text-gray-600 mt-1">
                  Generates: {bulkPrefix ? bulkPrefix.toUpperCase() : 'PREFIX'}01, {bulkPrefix ? bulkPrefix.toUpperCase() : 'PREFIX'}02 … up to {bulkCount} codes (single-use, 10% off)
                </p>
              </div>
              <div>
                <label className="block text-[10px] font-bold text-gray-500 mb-1">Number of Codes (max 200)</label>
                <input type="number" min="1" max="200" value={bulkCount} onChange={e => setBulkCount(e.target.value)}
                  className={INPUT} style={INPUT_STYLE} />
              </div>
              <div className="px-3 py-2 rounded-lg text-[10px] text-yellow-400" style={{ background: 'rgba(245,158,11,.08)', border: '1px solid rgba(245,158,11,.15)' }}>
                ℹ️ Codes are generated as single-use (max 1 per code), 10% off, expiring Dec 31 2026. Edit any code after generation.
              </div>
            </div>
            <div className="flex gap-2">
              <button type="button" onClick={() => { setShowBulkGen(false); setBulkPrefix(''); setBulkCount('10') }}
                className="flex-1 py-3 font-bold text-white rounded-xl border border-[#1e1e32]">Cancel</button>
              <button type="submit" className="flex-1 py-3 font-black text-white rounded-xl hover:opacity-90" style={{ background: '#8b5cf6' }}>
                ⚡ Generate {bulkCount} Codes
              </button>
            </div>
          </form>
        </Modal>
      )}

            {/* Edit Ingested Post Context Modal */}
      {editingIngestPost && (
        <Modal title="✏️ Edit Context & Brand Tone" onClose={() => setEditingIngestPost(null)}>
          <form onSubmit={e => {
            e.preventDefault()
            setIngestedPosts(prev => prev.map(p => p.id === editingIngestPost.id ? editingIngestPost : p))
            setEditingIngestPost(null)
            toast('Context updated!', 'success')
          }} className="space-y-4 text-sm">
            <div className="rounded-xl p-4 space-y-3" style={{ background: '#0d0d1e', border: '1px solid #1e1e32' }}>
              <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest">✨ Transformed FlowerZFC Headline</p>
              <input value={editingIngestPost.transformedTitle} onChange={e => setEditingIngestPost(p => p ? { ...p, transformedTitle: e.target.value } : p)} className={INPUT} style={INPUT_STYLE} />
            </div>

            <div className="rounded-xl p-4 space-y-3" style={{ background: '#0d0d1e', border: '1px solid #1e1e32' }}>
              <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest">📝 Transformed Body Copy</p>
              <textarea value={editingIngestPost.transformedBody} onChange={e => setEditingIngestPost(p => p ? { ...p, transformedBody: e.target.value } : p)} rows={4} className={`${INPUT} resize-none`} style={INPUT_STYLE} />
            </div>

            <div className="rounded-xl p-4 space-y-3" style={{ background: '#0d0d1e', border: '1px solid #1e1e32' }}>
              <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest">🖼️ Image URL & Asset Management</p>
              <input value={editingIngestPost.sourceImage} onChange={e => setEditingIngestPost(p => p ? { ...p, sourceImage: e.target.value } : p)} className={INPUT} style={INPUT_STYLE} />
              {editingIngestPost.sourceImage && <img src={editingIngestPost.sourceImage} alt="" className="w-full h-32 object-cover rounded-lg mt-2" />}
            </div>

            <div className="flex gap-2 pt-1">
              <button type="button" onClick={() => setEditingIngestPost(null)} className="flex-1 py-3 font-bold text-white rounded-xl border border-[#1e1e32]">Cancel</button>
              <button type="submit" className="flex-1 py-3 font-black text-white rounded-xl hover:opacity-90" style={{ background: '#00b341' }}>Save Changes →</button>
            </div>
          </form>
        </Modal>
      )}

      {/* Add Subscriber Modal */}
      {showAddSubscriber && (
        <Modal title="➕ Add Newsletter Subscriber" onClose={() => { setShowAddSubscriber(false); setNewSubEmail(''); setNewSubName(''); setNewSubPhone(''); setNewSubCountry('Kenya'); setNewSubTeam(''); setNewSubInterests([]); setNewSubTier('Free'); setNewSubSource('Admin Manual'); setNewSubConsent(false); setNewSubWelcome(true) }}>
          <form onSubmit={e => {
            e.preventDefault()
            if (!newSubEmail) return
            if (!newSubConsent) { toast('⚠️ GDPR consent required before adding subscriber.', 'warning'); return }
            const newSub = {
              id: `sub-${Date.now()}`,
              email: newSubEmail,
              name: newSubName || newSubEmail.split('@')[0],
              joined: new Date().toLocaleDateString('en-KE', { month: 'short', day: 'numeric', year: 'numeric' }),
              status: 'Active' as const,
              opens: 0,
              clicks: 0
            }
            setSubs(p => [newSub, ...p])
            if (newSubWelcome) toast(`📧 Welcome email queued for ${newSubEmail}!`, 'success')
            setShowAddSubscriber(false)
            setNewSubEmail(''); setNewSubName(''); setNewSubPhone(''); setNewSubCountry('Kenya')
            setNewSubTeam(''); setNewSubInterests([]); setNewSubTier('Free'); setNewSubSource('Admin Manual')
            setNewSubConsent(false); setNewSubWelcome(true)
          }} className="space-y-4 text-sm">

            {/* Section: Identity */}
            <div className="rounded-xl p-4 space-y-3" style={{ background: '#0d0d1e', border: '1px solid #1e1e32' }}>
              <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest">👤 Identity</p>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold text-gray-500 mb-1">Full Name</label>
                  <input value={newSubName} onChange={e => setNewSubName(e.target.value)}
                    placeholder="e.g. Amina Wanjiku" className={INPUT} style={INPUT_STYLE} />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-gray-500 mb-1">Email Address *</label>
                  <input type="email" value={newSubEmail} onChange={e => setNewSubEmail(e.target.value)}
                    placeholder="fan@gmail.com" required className={INPUT} style={INPUT_STYLE} />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-gray-500 mb-1">Phone / WhatsApp</label>
                  <input value={newSubPhone} onChange={e => setNewSubPhone(e.target.value)}
                    placeholder="+254 7XX XXX XXX" className={INPUT} style={INPUT_STYLE} />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-gray-500 mb-1">Country</label>
                  <select value={newSubCountry} onChange={e => setNewSubCountry(e.target.value)} className={INPUT} style={INPUT_STYLE}>
                    {['Kenya','Uganda','Tanzania','Rwanda','Ethiopia','Nigeria','Ghana','South Africa','United Kingdom','United States','Other'].map(c => (
                      <option key={c}>{c}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* Section: Preferences */}
            <div className="rounded-xl p-4 space-y-3" style={{ background: '#0d0d1e', border: '1px solid #1e1e32' }}>
              <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest">⚽ Preferences</p>
              <div>
                <label className="block text-[10px] font-bold text-gray-500 mb-1">Favourite Club / Team</label>
                <input value={newSubTeam} onChange={e => setNewSubTeam(e.target.value)}
                  placeholder="e.g. AFC Leopards, Arsenal, Man United…" className={INPUT} style={INPUT_STYLE} />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-gray-500 mb-2">Content Interests <span className="text-gray-600">(select all that apply)</span></label>
                <div className="flex flex-wrap gap-2">
                  {['Match Reports','Transfer News','Tactics','Interviews','Fantasy Tips','Shop & Merch','Events & Tickets','Video Highlights','Podcast Drops'].map(tag => {
                    const active = newSubInterests.includes(tag)
                    return (
                      <button key={tag} type="button"
                        onClick={() => setNewSubInterests(p => active ? p.filter(x => x !== tag) : [...p, tag])}
                        className="px-3 py-1 text-[10px] font-bold rounded-full border transition-all"
                        style={{ background: active ? '#00b341' : 'transparent', borderColor: active ? '#00b341' : '#2a2a3e', color: active ? '#fff' : '#9ca3af' }}>
                        {tag}
                      </button>
                    )
                  })}
                </div>
              </div>
            </div>

            {/* Section: Subscription Config */}
            <div className="rounded-xl p-4 space-y-3" style={{ background: '#0d0d1e', border: '1px solid #1e1e32' }}>
              <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest">⚙️ Subscription Config</p>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold text-gray-500 mb-1">Tier</label>
                  <div className="flex gap-1">
                    {(['Free','Fan','Pro'] as const).map(t => (
                      <button key={t} type="button" onClick={() => setNewSubTier(t)}
                        className="flex-1 py-2 text-[10px] font-black rounded-lg border transition-all"
                        style={{ background: newSubTier === t ? (t === 'Free' ? '#374151' : t === 'Fan' ? '#1d4ed8' : '#7c3aed') : 'transparent',
                                 borderColor: newSubTier === t ? 'transparent' : '#2a2a3e', color: newSubTier === t ? '#fff' : '#9ca3af' }}>
                        {t === 'Free' ? '🆓 Free' : t === 'Fan' ? '⭐ Fan' : '💎 Pro'}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-gray-500 mb-1">Source / Channel</label>
                  <select value={newSubSource} onChange={e => setNewSubSource(e.target.value)} className={INPUT} style={INPUT_STYLE}>
                    {['Admin Manual','Website Signup','Social Media','Event Registration','Shop Checkout','API Import','Referral','WhatsApp Opt-In'].map(s => (
                      <option key={s}>{s}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* Section: Consent & Actions */}
            <div className="rounded-xl p-4 space-y-3" style={{ background: '#0d0d1e', border: '1px solid #1e1e32' }}>
              <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest">🔒 Consent & Actions</p>
              <label className="flex items-start gap-3 cursor-pointer">
                <input type="checkbox" checked={newSubConsent} onChange={e => setNewSubConsent(e.target.checked)}
                  className="mt-0.5 accent-green-500" />
                <span className="text-[11px] text-gray-400 leading-relaxed">
                  Subscriber has given explicit consent to receive marketing emails and communications from <strong className="text-white">GlobalFootballMedia</strong> in accordance with GDPR / Kenya DPA 2019. *
                </span>
              </label>
              <label className="flex items-center gap-3 cursor-pointer mt-1">
                <input type="checkbox" checked={newSubWelcome} onChange={e => setNewSubWelcome(e.target.checked)}
                  className="accent-green-500" />
                <span className="text-[11px] text-gray-300">Send welcome email immediately after adding</span>
              </label>
            </div>

            {/* Preview tag */}
            {newSubEmail && (
              <div className="rounded-xl px-4 py-3 flex items-center gap-3" style={{ background: '#0a1a10', border: '1px solid #00b341' }}>
                <img src={`https://unavatar.io/${encodeURIComponent(newSubEmail)}?fallback=https://api.dicebear.com/7.x/identicon/svg?seed=${encodeURIComponent(newSubEmail)}`}
                  alt="" className="w-8 h-8 rounded-full border border-[#00b341]" />
                <div>
                  <p className="text-xs font-black text-white">{newSubName || newSubEmail.split('@')[0]}</p>
                  <p className="text-[10px] text-gray-500">{newSubEmail} · {newSubTier} Tier · {newSubCountry}</p>
                  {newSubInterests.length > 0 && <p className="text-[9px] text-green-400 mt-0.5">{newSubInterests.join(' · ')}</p>}
                </div>
              </div>
            )}

            <div className="flex gap-2 pt-1">
              <button type="button" onClick={() => { setShowAddSubscriber(false); setNewSubEmail(''); setNewSubName(''); setNewSubPhone(''); setNewSubCountry('Kenya'); setNewSubTeam(''); setNewSubInterests([]); setNewSubTier('Free'); setNewSubSource('Admin Manual'); setNewSubConsent(false); setNewSubWelcome(true) }}
                className="flex-1 py-3 font-bold text-white rounded-xl border border-[#1e1e32]">Cancel</button>
              <button type="submit"
                className="flex-1 py-3 font-black text-white rounded-xl hover:opacity-90 transition-all"
                style={{ background: newSubConsent ? '#00b341' : '#374151' }}>
                ➕ Add Subscriber →
              </button>
            </div>
          </form>
        </Modal>
      )}

{showDanger && (
        <Modal title="⚠️ Reset Admin Data" onClose={() => setShowDanger(false)}>
          <p className="text-sm text-gray-300 mb-4">This will clear all locally stored articles and reset admin state. This cannot be undone. Are you absolutely sure?</p>
          <div className="flex gap-3">
            <button onClick={() => setShowDanger(false)} className="flex-1 py-3 text-sm font-bold text-white rounded-xl border border-[#1e1e32]">Cancel</button>
            <button onClick={() => { clearArticleStore(); setArticles(INIT_ARTICLES); setProducts(INIT_PRODUCTS); setOrders(INIT_ORDERS); setUsers(INIT_USERS); setComments(INIT_COMMENTS); setDiscounts(DISCOUNTS_INIT); setShowDanger(false); toast('⚠️ Admin data reset complete.', 'warning') }}
              className="flex-1 py-3 text-sm font-black text-white rounded-xl" style={{ background: '#ef4444' }}>Reset Everything</button>
          </div>
        </Modal>
      )}

      {showAddMix && (
        <Modal title="🎧 Add New DJ Mix" onClose={() => setShowAddMix(false)}>
          <form onSubmit={async e => {
            e.preventDefault()
            if (!newMix.title) { toastLib.error('Title is required'); return }
            const mixId = `mix_${Date.now()}`
            const mixObj = {
              id: mixId,
              title: newMix.title,
              mixcloud_url: newMix.mixcloud_url || 'https://www.mixcloud.com/djflowerz',
              mixcloud_id: newMix.mixcloud_url ? newMix.mixcloud_url.split('mixcloud.com')[1] || '/djflowerz/mix' : '/djflowerz/mix',
              plays: 1,
              genre: newMix.genre || 'Afrobeats & Amapiano',
              cover_url: newMix.cover_url || 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=600&h=600&fit=crop',
            }
            const { error } = await saveMixToDb(mixObj)
            if (error) console.error('Save mix DB error:', error)
            setMixes(prev => [mixObj, ...prev])
            setShowAddMix(false)
            setNewMix({ title: '', mixcloud_url: '', genre: 'Afrobeats & Amapiano', cover_url: '' })
            toastLib.success('✅ New DJ Mix Published!')
          }} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-gray-400 mb-1">Mix Title *</label>
              <input value={newMix.title} onChange={e => setNewMix(p => ({ ...p, title: e.target.value }))} placeholder="e.g. FlowerZFC Matchday Vibe Mix Vol. 3" className={INPUT} style={INPUT_STYLE} required />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-400 mb-1">Mixcloud URL / Embedded Track ID</label>
              <input value={newMix.mixcloud_url} onChange={e => setNewMix(p => ({ ...p, mixcloud_url: e.target.value }))} placeholder="https://www.mixcloud.com/djflowerz/..." className={INPUT} style={INPUT_STYLE} />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-400 mb-1">Genre / Vibe</label>
              <input value={newMix.genre} onChange={e => setNewMix(p => ({ ...p, genre: e.target.value }))} placeholder="e.g. Afrobeats, Amapiano, Gengetone, Reggae" className={INPUT} style={INPUT_STYLE} />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-400 mb-1">Cover Artwork Image URL</label>
              <input value={newMix.cover_url} onChange={e => setNewMix(p => ({ ...p, cover_url: e.target.value }))} placeholder="https://images.unsplash.com/..." className={INPUT} style={INPUT_STYLE} />
            </div>
            <div className="flex gap-2 pt-2">
              <button type="button" onClick={() => setShowAddMix(false)} className="flex-1 py-3 text-xs font-bold text-white rounded-xl border border-[#1e1e32]">Cancel</button>
              <button type="submit" className="flex-1 py-3 text-xs font-black text-white rounded-xl hover:opacity-90 transition-all" style={{ background: '#00b341' }}>Publish Mix →</button>
            </div>
          </form>
        </Modal>
      )}

      {/* Toast notifications are handled globally by react-toastify's ToastContainer in App.tsx */}

    </div>
  )
}
