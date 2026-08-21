import { useState, useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import { toast } from 'react-toastify'
import { useApp } from '../context/AppContext'
import AdBanner from '../components/AdBanner'
import {
  Heart, MessageCircle, Radio, ShoppingBag, CheckCircle2, ArrowRight, Music2
} from 'lucide-react'
import { fetchLiveMatches, LiveMatch, fetchLiveStandings, LiveStanding } from '../services/liveScoreApi'
import { fetchLiveIngestedPosts, IngestedPost } from '../services/contentIngestion'
import { fetchAllArticles, fetchAllComments, fetchAllMixes, fetchAllProducts } from '../services/supabaseClient'
import { subscribeEmail } from '../services/newsletterService'

// ─── Default Fallback Data (Guarantees Instant Full Content Rendering) ─────────
const DEFAULT_MATCHES: LiveMatch[] = [
  { id: 'm1', home: 'Arsenal', away: 'Chelsea', homeScore: 2, awayScore: 1, minute: 78, live: true, status: "78'", league: 'Premier League', venue: 'Emirates Stadium', leagueId: '1', leagueSlug: 'premier-league', flag: '🏴󠁧󠁢󠁥󠁮󠁧󠁿', date: 'Today' },
  { id: 'm2', home: 'Real Madrid', away: 'Barcelona', homeScore: 3, awayScore: 2, minute: 85, live: true, status: "85'", league: 'La Liga', venue: 'Santiago Bernabéu', leagueId: '2', leagueSlug: 'la-liga', flag: '🇪🇸', date: 'Today' },
  { id: 'm3', home: 'Man City', away: 'Liverpool', homeScore: 1, awayScore: 1, minute: 64, live: true, status: "64'", league: 'Premier League', venue: 'Etihad Stadium', leagueId: '1', leagueSlug: 'premier-league', flag: '🏴󠁧󠁢󠁥󠁮󠁧󠁿', date: 'Today' },
  { id: 'm4', home: 'Bayern Munich', away: 'Dortmund', homeScore: 2, awayScore: 0, minute: 90, live: false, status: 'FT', league: 'Bundesliga', venue: 'Allianz Arena', leagueId: '3', leagueSlug: 'bundesliga', flag: '🇩🇪', date: 'Today' },
  { id: 'm5', home: 'PSG', away: 'Marseille', homeScore: 2, awayScore: 1, minute: 90, live: false, status: 'FT', league: 'Ligue 1', venue: 'Parc des Princes', leagueId: '4', leagueSlug: 'ligue-1', flag: '🇫🇷', date: 'Today' },
  { id: 'm6', home: 'Inter Milan', away: 'Juventus', homeScore: 1, awayScore: 0, minute: 52, live: true, status: "52'", league: 'Serie A', venue: 'San Siro', leagueId: '5', leagueSlug: 'serie-a', flag: '🇮🇹', date: 'Today' },
]

const DEFAULT_PRODUCTS = [
  { id: 'prod_1', name: 'Arsenal 2026/27 Away Jersey', price: 4500, category: 'Jerseys', image: 'https://images.unsplash.com/photo-1522778119026-d647f0596c20?w=600&h=600&fit=crop' },
  { id: 'prod_2', name: 'Real Madrid Official Home Kit', price: 4800, category: 'Jerseys', image: 'https://images.unsplash.com/photo-1508098682722-e99c43a406b2?w=600&h=600&fit=crop' },
  { id: 'prod_3', name: 'FlowerZFC Premium Matchday Hoodie', price: 3200, category: 'Fanwear', image: 'https://images.unsplash.com/photo-1556905055-8f358a7a47b2?w=600&h=600&fit=crop' },
  { id: 'prod_4', name: '4K Matchday Pro Wallpaper Pack', price: 500, category: 'Digital', image: 'https://images.unsplash.com/photo-1579952363873-27f3bade9f55?w=600&h=600&fit=crop' },
]

const DEFAULT_STANDINGS: LiveStanding[] = [
  { rank: 1, team: 'Arsenal', played: 33, won: 24, drawn: 6, lost: 3, gf: 72, ga: 28, gd: 44, pts: 78, form: ['W', 'W', 'W', 'D', 'W'], league: 'Premier League' },
  { rank: 2, team: 'Liverpool', played: 33, won: 23, drawn: 6, lost: 4, gf: 68, ga: 32, gd: 36, pts: 75, form: ['W', 'D', 'W', 'W', 'L'], league: 'Premier League' },
  { rank: 3, team: 'Man City', played: 33, won: 21, drawn: 8, lost: 4, gf: 65, ga: 30, gd: 35, pts: 71, form: ['W', 'W', 'D', 'W', 'W'], league: 'Premier League' },
  { rank: 4, team: 'Chelsea', played: 33, won: 18, drawn: 8, lost: 7, gf: 58, ga: 40, gd: 18, pts: 62, form: ['L', 'W', 'W', 'D', 'W'], league: 'Premier League' },
  { rank: 5, team: 'Tottenham', played: 33, won: 18, drawn: 6, lost: 9, gf: 61, ga: 45, gd: 16, pts: 60, form: ['W', 'L', 'W', 'W', 'D'], league: 'Premier League' },
  { rank: 6, team: 'Newcastle', played: 33, won: 17, drawn: 8, lost: 8, gf: 59, ga: 41, gd: 18, pts: 59, form: ['W', 'W', 'L', 'D', 'W'], league: 'Premier League' },
]

const DEFAULT_STORIES = [
  {
    id: 'story-1',
    tag: 'FEATURED',
    title: 'Football, Culture & Sound: The Next Generation of East African Football',
    excerpt: 'Inside the rise of East African football talent, tactical revolutions, and how local stadium music powers matchday energy.',
    image: 'https://images.unsplash.com/photo-1579952363873-27f3bade9f55?auto=format&fit=crop&w=1600&q=85',
    date: 'Today',
    likes: 84,
    comments: 24,
    timestamp: Date.now()
  },
  {
    id: 'story-2',
    tag: 'TRANSFERS',
    title: 'Summer Transfer Window: Major Premier League Moves Confirmed',
    excerpt: 'All completed transfers and confirmed signings for the upcoming European campaign.',
    image: 'https://images.unsplash.com/photo-1508098682722-e99c43a406b2?auto=format&fit=crop&w=800&q=80',
    date: '1h ago',
    likes: 42,
    comments: 15,
    timestamp: Date.now() - 3600000
  },
  {
    id: 'story-3',
    tag: 'TACTICS',
    title: 'Derby Breakdown: Key Battles That Will Decide The Title Race',
    excerpt: 'Midfield pressing patterns, counter-attack statistics, and manager tactical setups analyzed.',
    image: 'https://images.unsplash.com/photo-1522778119026-d647f0596c20?auto=format&fit=crop&w=800&q=80',
    date: '3h ago',
    likes: 29,
    comments: 8,
    timestamp: Date.now() - 10800000
  },
  {
    id: 'story-4',
    tag: 'CHAMPIONS LEAGUE',
    title: 'European Nights Return: Knockout Stage Preview & Predictions',
    excerpt: 'Form guide, injury updates, and AI score forecasting for this week’s European clashes.',
    image: 'https://images.unsplash.com/photo-1518091043644-c1d4457512c6?auto=format&fit=crop&w=800&q=80',
    date: '5h ago',
    likes: 38,
    comments: 12,
    timestamp: Date.now() - 18000000
  }
]

const BROWSE_CATEGORIES = [
  { id: 'all', label: 'All Updates', icon: '🔥' },
  { id: 'premier-league', label: 'Premier League', icon: '🏴󠁧󠁢󠁥󠁮󠁧󠁿' },
  { id: 'champions-league', label: 'Champions League', icon: '⭐' },
  { id: 'la-liga', label: 'La Liga', icon: '🇪🇸' },
  { id: 'transfers', label: 'Transfers', icon: '🔄' },
  { id: 'mixes', label: 'DJ Mixes', icon: '🎵' },
  { id: 'shop', label: 'Merch & Kits', icon: '🛍️' },
]

// ─── Live Ticker Strip ────────────────────────────────────────────────────────
function LiveTicker() {
  const [matches, setMatches] = useState<LiveMatch[]>(DEFAULT_MATCHES.slice(0, 3))
  const [liveCount, setLiveCount] = useState(3)
  const [goalAlert, setGoalAlert] = useState<string | null>(null)
  const prevScoresRef = useRef<Record<string, { homeScore: number; awayScore: number }>>({})

  const processLiveMatches = (apiMatches: LiveMatch[]) => {
    if (!apiMatches || apiMatches.length === 0) return
    const liveOnly = apiMatches.filter(m => {
      const st = (m.status || '').toUpperCase()
      if (st === 'FT' || st === 'AET' || st === 'AP' || st === 'POSTPONED' || st === 'CANCELLED' || st === 'ABANDONED' || st === 'NS' || st.includes(':') || st.includes('STARTS')) {
        return false
      }
      if (m.live) return true
      return st.includes("'") || st === '1H' || st === '2H' || st === 'HT' || st === 'LIVE' || st === 'ET' || st === 'PEN'
    })
    
    if (liveOnly.length > 0) {
      setLiveCount(liveOnly.length)
      setMatches(liveOnly)
    }

    apiMatches.forEach(m => {
      if (m.homeScore !== null && m.awayScore !== null) {
        const prev = prevScoresRef.current[m.id]
        if (prev) {
          if (m.homeScore > prev.homeScore || m.awayScore > prev.awayScore) {
            const msg = `⚽ GOAL! ${m.home} ${m.homeScore} - ${m.awayScore} ${m.away} (${m.status || (m.minute ? m.minute + "'" : 'LIVE')})`
            toast.success(msg, { position: 'top-right', autoClose: 8000 })
            setGoalAlert(msg)
            setTimeout(() => setGoalAlert(null), 10000)
          }
        }
        prevScoresRef.current[m.id] = { homeScore: m.homeScore, awayScore: m.awayScore }
      }
    })
  }

  useEffect(() => {
    fetchLiveMatches('TODAY').then(processLiveMatches).catch(() => {})
    const interval = setInterval(() => {
      fetchLiveMatches('TODAY').then(processLiveMatches).catch(() => {})
    }, 15000)
    return () => clearInterval(interval)
  }, [])

  return (
    <div className="border-y" style={{ background: '#171816', borderColor: '#2e302b' }}>
      {goalAlert && (
        <div className="bg-[#c9f35a] text-[#171816] font-black text-center text-xs py-2 px-4 animate-pulse flex items-center justify-center gap-2">
          <span>⚡ LIVE GOAL ALERT:</span>
          <span>{goalAlert}</span>
        </div>
      )}
      <div className="ticker-scroll flex items-center gap-3 px-4 py-2.5 max-w-screen-2xl mx-auto" style={{ overflowX: 'auto' }}>
        <div className="flex items-center gap-2 px-3 py-1 bg-[#20221f] border border-[#3e413c] rounded text-[11px] font-black text-[#c9f35a] shrink-0">
          <span className="w-2 h-2 rounded-full bg-[#f36c45] animate-ping inline-block" />
          <span>LIVE NOW ({liveCount})</span>
        </div>

        {matches.map(m => (
          <Link
            key={m.id}
            to={`/match/${m.id}`}
            className="flex-none flex items-center gap-3 px-4 py-1.5 rounded transition-all hover:bg-[#20221f] border border-[#2e302b]"
            style={{ minWidth: '200px' }}
          >
            <span className="text-right text-xs text-white font-bold min-w-[60px] truncate">{m.home}</span>
            <div className="text-center px-1">
              <span className="text-[#c9f35a] font-black text-sm font-mono tracking-tight" style={{ fontFamily: 'Big Shoulders Display' }}>
                {m.homeScore ?? 0} – {m.awayScore ?? 0}
              </span>
              <span className="block text-[9px] font-bold text-[#f36c45]">{m.status || (m.minute ? `${m.minute}'` : 'LIVE')}</span>
            </div>
            <span className="text-left text-xs text-white font-bold min-w-[60px] truncate">{m.away}</span>
          </Link>
        ))}
      </div>
    </div>
  )
}

function formatRelativeTime(dateInput?: string | number): string {
  if (!dateInput) return 'Just now'
  let d: Date = typeof dateInput === 'number' ? new Date(dateInput) : new Date(dateInput)
  if (isNaN(d.getTime())) return String(dateInput)
  const diffSec = Math.floor((Date.now() - d.getTime()) / 1000)
  if (diffSec < 60) return 'Just now'
  const diffMin = Math.floor(diffSec / 60)
  if (diffMin < 60) return `${diffMin}m ago`
  const diffHour = Math.floor(diffMin / 60)
  if (diffHour < 24) return `${diffHour}h ago`
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
}

export default function Home() {
  const { formatPrice } = useApp()
  const [activeCategory, setActiveCategory] = useState('all')
  const [matchesFeed, setMatchesFeed] = useState<LiveMatch[]>(DEFAULT_MATCHES)
  const [dbArticles, setDbArticles] = useState<any[]>([])
  const [commentCounts, setCommentCounts] = useState<Record<string, number>>({})
  const [ingestedPosts, setIngestedPosts] = useState<IngestedPost[]>([])
  const [homeStandings, setHomeStandings] = useState<LiveStanding[]>(DEFAULT_STANDINGS)
  const [showcaseProducts, setShowcaseProducts] = useState<any[]>(DEFAULT_PRODUCTS)
  
  // Newsletter State
  const [newsletterEmail, setNewsletterEmail] = useState('')
  const [newsletterLoading, setNewsletterLoading] = useState(false)
  const [newsletterSent, setNewsletterSent] = useState(false)

  useEffect(() => {
    fetchLiveMatches('TODAY').then(m => {
      if (m && m.length > 0) setMatchesFeed(m.slice(0, 6))
    }).catch(() => {})

    fetchAllProducts().then(({ products: prods }) => {
      if (prods && prods.length > 0) setShowcaseProducts(prods.slice(0, 4))
    }).catch(() => {})

    fetchAllArticles().then(({ articles: arts }) => {
      if (arts && arts.length > 0) setDbArticles(arts)
    }).catch(() => {})

    fetchLiveStandings('Premier League').then(standings => {
      if (standings && standings.length > 0) setHomeStandings(standings.slice(0, 6))
    }).catch(() => {})

    fetchLiveIngestedPosts().then(posts => {
      if (posts && posts.length > 0) setIngestedPosts(posts)
    }).catch(() => {})

    fetchAllComments().then(({ comments }) => {
      if (comments) {
        const counts: Record<string, number> = {}
        comments.forEach(c => {
          if (c.article_id) counts[c.article_id] = (counts[c.article_id] || 0) + 1
        })
        setCommentCounts(counts)
      }
    }).catch(() => {})
  }, [])

  const allFeedItems = dbArticles.length > 0
    ? dbArticles.map(a => {
        const rawDate = a.published_at || a.date
        const ts = rawDate ? new Date(rawDate).getTime() : 0
        return {
          id: a.id,
          tag: (a.category || 'NEWS').toUpperCase(),
          title: a.title,
          excerpt: a.body ? a.body.slice(0, 140) + '...' : '',
          image: a.image_url || 'https://images.unsplash.com/photo-1522778119026-d647f0596c20?w=1400&h=700&fit=crop&auto=format',
          likes: a.likes || 12,
          comments: commentCounts[a.id] || 0,
          date: formatRelativeTime(rawDate),
          timestamp: ts || Date.now(),
        }
      }).sort((a, b) => b.timestamp - a.timestamp)
    : ingestedPosts.length > 0
      ? ingestedPosts.map(p => ({
          id: p.id,
          tag: (p.category || 'FOOTBALL').toUpperCase(),
          title: p.transformedTitle || p.sourceTitle,
          excerpt: p.transformedBody ? p.transformedBody.slice(0, 140) + '...' : '',
          image: p.sourceImage || 'https://images.unsplash.com/photo-1522778119026-d647f0596c20?w=1400&h=700&fit=crop&auto=format',
          likes: 8,
          comments: commentCounts[p.id] || 0,
          date: formatRelativeTime(p.timestampMs),
          timestamp: p.timestampMs,
        })).sort((a, b) => b.timestamp - a.timestamp)
      : DEFAULT_STORIES

  const featuredArticle = allFeedItems[0] || DEFAULT_STORIES[0]
  const secondaryArticles = allFeedItems.slice(1, 4).length > 0 ? allFeedItems.slice(1, 4) : DEFAULT_STORIES.slice(1, 4)

  const handleSubscribe = async (e: React.FormEvent) => {
    e.preventDefault()
    const clean = newsletterEmail.trim()
    if (!clean || !clean.includes('@')) {
      toast.warning('Please enter a valid email address.')
      return
    }
    setNewsletterLoading(true)
    try {
      const res = subscribeEmail(clean, '', 'Home Page Banner')
      if (res.success) {
        setNewsletterSent(true)
        toast.success(res.message)
      } else {
        toast.error(res.message)
      }
    } finally {
      setNewsletterLoading(false)
    }
  }

  return (
    <div style={{ background: '#0a0a14', color: '#fff', minHeight: '100vh' }}>
      
      {/* Top Sponsor Leaderboard */}
      <div className="py-3 px-4 flex justify-center border-b border-[#1e1e32]" style={{ background: '#0c0c14' }}>
        <AdBanner size="leaderboard" />
      </div>

      {/* Live Match Ticker */}
      <LiveTicker />

      {/* ─── 1. HERO SECTION (Editorial Stadium Poster) ────────────────────────── */}
      <section className="relative overflow-hidden border-b border-[#1e1e32]" style={{ background: 'linear-gradient(135deg,#0c0c18 0%,#12161f 100%)' }}>
        <img
          src="https://images.unsplash.com/photo-1579952363873-27f3bade9f55?auto=format&fit=crop&w=1800&q=90"
          alt="Stadium"
          className="absolute inset-0 w-full h-full object-cover opacity-15 mix-blend-luminosity"
        />
        <div className="relative z-10 max-w-screen-2xl mx-auto px-4 sm:px-8 py-16 lg:py-24">
          <div className="max-w-3xl">
            <span className="inline-block text-[11px] font-black uppercase tracking-[0.2em] text-[#00b341] mb-4 px-3 py-1 rounded border border-[#00b341]/30" style={{ background: 'rgba(0,179,65,0.08)' }}>
              GLOBAL FOOTBALL · EAST AFRICAN PULSE
            </span>
            <h1 className="text-5xl sm:text-7xl lg:text-8xl font-black text-white leading-[0.92] tracking-tight uppercase mb-6" style={{ fontFamily: 'Big Shoulders Display' }}>
              Football, <br />
              <span style={{ color: '#00b341' }}>Culture</span> & <span style={{ color: '#f36c45' }}>Sound</span>
            </h1>
            <p className="text-base sm:text-lg text-gray-300 max-w-xl mb-8 leading-relaxed">
              Real-time scores, tactical analysis, authentic kits, and DJ Flowerz signature mixtapes unified in one high-octane platform.
            </p>
            <div className="flex flex-wrap gap-4 items-center">
              <Link
                to="/scores"
                className="px-7 py-3.5 text-sm font-black text-white rounded-xl transition-all hover:opacity-90 flex items-center gap-2 shadow-lg shadow-emerald-500/20"
                style={{ background: '#00b341', fontFamily: 'Big Shoulders Display', fontSize: '16px' }}
              >
                <Radio size={18} /> Live Match Center →
              </Link>
              <Link
                to="/shop"
                className="px-7 py-3.5 text-sm font-black text-white rounded-xl border border-[#1e1e32] hover:border-[#00b341] transition-all flex items-center gap-2"
                style={{ background: '#131320', fontFamily: 'Big Shoulders Display', fontSize: '16px' }}
              >
                <ShoppingBag size={18} /> Official Store
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ─── 2. BROWSE BY CATEGORY (FigComponent: 6302ebacebc3405f1f9195dc) ────── */}
      <div className="border-b border-[#1e1e32]" style={{ background: '#0d0d1a' }}>
        <div className="max-w-screen-2xl mx-auto px-4 sm:px-8 py-3.5 flex items-center gap-2 overflow-x-auto" style={{ scrollbarWidth: 'none' }}>
          <span className="text-[10px] font-black uppercase tracking-wider text-gray-500 mr-2 shrink-0">Browse:</span>
          {BROWSE_CATEGORIES.map(cat => {
            const isActive = activeCategory === cat.id
            return (
              <button
                key={cat.id}
                onClick={() => setActiveCategory(cat.id)}
                className={`flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-xl whitespace-nowrap transition-all shrink-0 ${
                  isActive
                    ? 'bg-[#00b341] text-white shadow-md shadow-emerald-500/20 font-black'
                    : 'bg-[#131320] text-gray-400 hover:text-white border border-[#1e1e32] hover:border-gray-600'
                }`}
              >
                <span>{cat.icon}</span>
                <span>{cat.label}</span>
              </button>
            )
          })}
        </div>
      </div>

      <div className="max-w-screen-2xl mx-auto px-4 sm:px-8 py-10 space-y-16">

        {/* ─── 3. EDITORIAL MATCH GRID (FigComponent: Calendar / Fixtures 62cf946112847cc9ecafe6a4) ─── */}
        <section>
          <div className="flex items-end justify-between mb-6 pb-3 border-b border-[#1e1e32]">
            <div>
              <span className="text-[10px] font-black uppercase tracking-widest text-[#00b341] block mb-1">FIXTURES & RESULTS</span>
              <h2 className="text-3xl sm:text-4xl font-black text-white uppercase tracking-tight" style={{ fontFamily: 'Big Shoulders Display' }}>
                Featured Matches
              </h2>
            </div>
            <Link to="/fixtures" className="text-xs font-bold text-[#00b341] hover:underline flex items-center gap-1">
              Full Match Center <ArrowRight size={14} />
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {matchesFeed.map(m => (
              <Link
                key={m.id}
                to={`/match/${m.id}`}
                className="group block p-5 rounded-2xl border border-[#1e1e32] hover:border-[#00b341] transition-all relative overflow-hidden"
                style={{ background: '#131320' }}
              >
                <div className="flex items-center justify-between text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-4">
                  <span>{m.league || 'Match'}</span>
                  <span className={m.live ? 'text-[#f36c45] font-black flex items-center gap-1' : 'text-gray-400'}>
                    {m.live && <span className="w-1.5 h-1.5 rounded-full bg-[#f36c45] animate-ping" />}
                    {m.status || 'Scheduled'}
                  </span>
                </div>

                {/* Teams and score display */}
                <div className="grid grid-cols-5 items-center gap-2 my-2">
                  <div className="col-span-2 text-right">
                    <p className="font-black text-lg text-white group-hover:text-[#00b341] transition-colors truncate" style={{ fontFamily: 'Big Shoulders Display' }}>
                      {m.home}
                    </p>
                  </div>
                  <div className="col-span-1 text-center py-1 px-2 rounded-lg bg-[#0c0c14] border border-[#1e1e32]">
                    <span className="font-black text-base text-[#00b341] font-mono" style={{ fontFamily: 'Big Shoulders Display' }}>
                      {m.homeScore !== null ? `${m.homeScore} - ${m.awayScore}` : 'VS'}
                    </span>
                  </div>
                  <div className="col-span-2 text-left">
                    <p className="font-black text-lg text-white group-hover:text-[#00b341] transition-colors truncate" style={{ fontFamily: 'Big Shoulders Display' }}>
                      {m.away}
                    </p>
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-[#1e1e32] flex items-center justify-between text-[11px] text-gray-400">
                  <span>📍 {m.venue || 'Stadium'}</span>
                  <span className="text-[#00b341] font-bold group-hover:translate-x-1 transition-transform flex items-center gap-1">
                    Match Room →
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </section>

        {/* ─── 4. EDITORIAL NEWS GRID ────────────────────────────────────────── */}
        <section>
          <div className="flex items-end justify-between mb-6 pb-3 border-b border-[#1e1e32]">
            <div>
              <span className="text-[10px] font-black uppercase tracking-widest text-[#00b341] block mb-1">EDITORIAL & ANALYSIS</span>
              <h2 className="text-3xl sm:text-4xl font-black text-white uppercase tracking-tight" style={{ fontFamily: 'Big Shoulders Display' }}>
                Latest Stories
              </h2>
            </div>
            <Link to="/news" className="text-xs font-bold text-[#00b341] hover:underline flex items-center gap-1">
              All Articles <ArrowRight size={14} />
            </Link>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Big Featured Article */}
            <div className="lg:col-span-7">
              <Link
                to={`/news/${featuredArticle.id}`}
                className="group block rounded-2xl overflow-hidden border border-[#1e1e32] hover:border-[#00b341] transition-all relative"
                style={{ background: '#131320' }}
              >
                <div className="relative aspect-video overflow-hidden">
                  <img
                    src={featuredArticle.image}
                    alt={featuredArticle.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                  />
                  <span className="absolute bottom-4 left-4 px-3 py-1 rounded text-[10px] font-black uppercase text-[#171816] bg-[#00b341]">
                    {featuredArticle.tag}
                  </span>
                </div>
                <div className="p-6">
                  <h3 className="text-2xl sm:text-3xl font-black text-white leading-tight mb-2 group-hover:text-[#00b341] transition-colors" style={{ fontFamily: 'Big Shoulders Display' }}>
                    {featuredArticle.title}
                  </h3>
                  <p className="text-sm text-gray-400 line-clamp-2 mb-4 leading-relaxed">
                    {featuredArticle.excerpt}
                  </p>
                  <div className="flex items-center gap-4 text-xs text-gray-500 font-bold">
                    <span>{featuredArticle.date}</span>
                    <span className="flex items-center gap-1"><Heart size={13} /> {featuredArticle.likes}</span>
                    <span className="flex items-center gap-1"><MessageCircle size={13} /> {featuredArticle.comments}</span>
                  </div>
                </div>
              </Link>
            </div>

            {/* 3 Secondary News Cards */}
            <div className="lg:col-span-5 space-y-4">
              {secondaryArticles.map(art => (
                <Link
                  key={art.id}
                  to={`/news/${art.id}`}
                  className="group flex gap-4 p-3.5 rounded-2xl border border-[#1e1e32] hover:border-[#00b341] transition-all"
                  style={{ background: '#131320' }}
                >
                  <img
                    src={art.image}
                    alt={art.title}
                    className="w-28 h-24 object-cover rounded-xl shrink-0 group-hover:scale-105 transition-transform duration-300"
                  />
                  <div className="flex flex-col justify-between py-0.5">
                    <div>
                      <span className="text-[9px] font-black uppercase text-[#00b341] tracking-wider">{art.tag}</span>
                      <h4 className="text-sm font-black text-white leading-snug group-hover:text-[#00b341] transition-colors line-clamp-2 mt-0.5" style={{ fontFamily: 'Big Shoulders Display' }}>
                        {art.title}
                      </h4>
                    </div>
                    <div className="flex items-center gap-3 text-[10px] text-gray-500 font-bold">
                      <span>{art.date}</span>
                      <span className="flex items-center gap-1"><MessageCircle size={11} /> {art.comments}</span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>

        {/* ─── 5. SPLIT SECTION: DJ MIXES & STANDINGS ────────────────────────── */}
        <section className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* Dark Mixtape Stadium Panel */}
          <div className="lg:col-span-7 rounded-2xl p-8 border border-[#1e1e32] relative overflow-hidden flex flex-col justify-between" style={{ background: '#131320' }}>
            <div className="relative z-10">
              <span className="text-[10px] font-black uppercase tracking-widest text-[#00b341] block mb-2">SOUND & CULTURE</span>
              <h3 className="text-4xl sm:text-5xl font-black text-white uppercase leading-[0.95] mb-3" style={{ fontFamily: 'Big Shoulders Display' }}>
                DJ Flowerz <br /><span style={{ color: '#00b341' }}>Mixtapes</span> & Audio
              </h3>
              <p className="text-xs sm:text-sm text-gray-400 max-w-sm leading-relaxed mb-6">
                Official high-energy Afrobeats, Amapiano, and pre-match anthems curated for football fans worldwide.
              </p>
              <Link
                to="/mixes"
                className="inline-flex items-center gap-2 px-6 py-3 text-xs font-black text-white rounded-xl hover:opacity-90 transition-all shadow-lg shadow-emerald-500/20"
                style={{ background: '#00b341', fontFamily: 'Big Shoulders Display', fontSize: '15px' }}
              >
                <Music2 size={16} /> Explore All Mixes →
              </Link>
            </div>

            {/* Spinning Vinyl Visual */}
            <div className="absolute right-[-40px] bottom-[-60px] w-64 h-64 rounded-full border-4 border-[#1e1e32] flex items-center justify-center opacity-30 pointer-events-none animate-spin" style={{ animationDuration: '20s' }}>
              <div className="w-24 h-24 rounded-full border-2 border-[#00b341] flex items-center justify-center">
                <div className="w-8 h-8 rounded-full bg-[#00b341]" />
              </div>
            </div>
          </div>

          {/* Standings Panel */}
          <div className="lg:col-span-5 rounded-2xl p-6 border border-[#1e1e32]" style={{ background: '#131320' }}>
            <div className="flex items-center justify-between mb-4 pb-2 border-b border-[#1e1e32]">
              <h3 className="text-xl font-black text-white uppercase" style={{ fontFamily: 'Big Shoulders Display' }}>
                🏆 Table Standings
              </h3>
              <Link to="/standings" className="text-xs font-bold text-[#00b341] hover:underline">Full Table →</Link>
            </div>

            <div className="space-y-1.5">
              {homeStandings.map((st, idx) => (
                <div key={st.rank || idx} className="flex items-center justify-between p-2.5 rounded-xl bg-[#0c0c14] border border-[#1e1e32]">
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-black text-[#f36c45] w-5 font-mono">0{st.rank || idx + 1}</span>
                    <span className="text-xs font-bold text-white truncate max-w-[130px]">{st.team}</span>
                  </div>
                  <div className="flex items-center gap-4 text-xs">
                    <span className="text-gray-500">{st.played} P</span>
                    <span className="font-black text-[#00b341] text-sm font-mono w-6 text-right" style={{ fontFamily: 'Big Shoulders Display' }}>
                      {st.pts}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ─── 6. SHOP SHOWCASE (FigComponent: 628de164b379df22b5a66404) ─────────── */}
        <section>
          {/* High Impact Banner */}
          <div className="p-8 sm:p-10 rounded-2xl border border-[#00b341]/30 flex flex-col md:flex-row items-center justify-between gap-6 mb-8" style={{ background: 'linear-gradient(135deg, rgba(0,179,65,0.12) 0%, rgba(19,19,32,1) 100%)' }}>
            <div>
              <span className="text-[10px] font-black uppercase tracking-widest text-[#00b341] block mb-1">OFFICIAL STORE & MERCHANDISE</span>
              <h2 className="text-4xl sm:text-5xl font-black text-white uppercase leading-none mb-2" style={{ fontFamily: 'Big Shoulders Display' }}>
                Wear Your Passion
              </h2>
              <p className="text-xs sm:text-sm text-gray-300 max-w-md">
                Authentic club jerseys, limited edition fanwear, and instant digital wallpapers. Fast countrywide shipping via G4S Kenya.
              </p>
            </div>
            <Link
              to="/shop"
              className="px-8 py-4 text-sm font-black text-[#171816] rounded-xl transition-all hover:scale-105 shrink-0 shadow-xl"
              style={{ background: '#00b341', fontFamily: 'Big Shoulders Display', fontSize: '17px' }}
            >
              Explore Shop Catalog →
            </Link>
          </div>

          {/* 4-Card Product Grid */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {showcaseProducts.map(item => {
              let itemImg = 'https://images.unsplash.com/photo-1522778119026-d647f0596c20?w=600&h=600&fit=crop'
              if (Array.isArray(item.images) && item.images.length > 0) itemImg = item.images[0]
              else if (typeof item.images === 'string' && item.images.startsWith('[')) {
                try { itemImg = JSON.parse(item.images)[0] || itemImg } catch {}
              } else if (item.image || item.imageUrl) itemImg = item.image || item.imageUrl

              return (
                <Link
                  key={item.id}
                  to={`/product/${item.id}`}
                  className="group rounded-2xl overflow-hidden border border-[#1e1e32] p-3.5 flex flex-col justify-between transition-all hover:border-[#00b341] hover:shadow-lg hover:shadow-emerald-500/10"
                  style={{ background: '#131320' }}
                >
                  <div className="aspect-square rounded-xl overflow-hidden bg-black/40 mb-3 relative flex items-center justify-center p-2">
                    <img
                      src={itemImg}
                      alt={item.name}
                      className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-300"
                    />
                    {item.category && (
                      <span className="absolute top-2 left-2 px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-black/80 text-[#00b341] border border-[#00b341]/30">
                        {item.category}
                      </span>
                    )}
                  </div>
                  <div>
                    <h4 className="text-xs sm:text-sm font-bold text-white line-clamp-1 group-hover:text-[#00b341] transition-colors">
                      {item.name}
                    </h4>
                    <div className="flex items-center justify-between mt-2 pt-2 border-t border-white/5">
                      <span className="text-xs sm:text-sm font-black text-[#00b341]">
                        {formatPrice(typeof item.price === 'number' ? item.price : parseFloat(item.price) || 0)}
                      </span>
                      <span className="text-[10px] font-bold text-gray-400 group-hover:text-white flex items-center gap-0.5">
                        Buy →
                      </span>
                    </div>
                  </div>
                </Link>
              )
            })}
          </div>
        </section>

        {/* ─── 7. HIGH-CONTRAST NEWSLETTER (FigComponent: 6306d2368f4e774af203b792) ─ */}
        <section className="rounded-2xl p-8 sm:p-12 border border-[#1e1e32] text-center max-w-3xl mx-auto" style={{ background: '#131320' }}>
          <div className="w-12 h-12 rounded-full bg-[#00b341]/10 border border-[#00b341]/30 flex items-center justify-center mx-auto mb-4 text-2xl">
            📬
          </div>
          <h2 className="text-3xl sm:text-4xl font-black text-white uppercase leading-none mb-3" style={{ fontFamily: 'Big Shoulders Display' }}>
            Get Match Alerts & Exclusive Drops
          </h2>
          <p className="text-xs sm:text-sm text-gray-400 max-w-md mx-auto mb-6 leading-relaxed">
            Breaking transfer alerts, VIP ticket presales, and weekly mixtape drops delivered straight to your inbox.
          </p>

          {newsletterSent ? (
            <div className="p-4 rounded-xl border border-[#00b341] bg-[#00b341]/10 flex items-center justify-center gap-2 text-sm font-bold text-[#00b341]">
              <CheckCircle2 size={18} />
              <span>You're subscribed! Check your inbox for your welcome email.</span>
            </div>
          ) : (
            <form onSubmit={handleSubscribe} className="flex flex-col sm:flex-row gap-2.5 max-w-md mx-auto">
              <input
                type="email"
                value={newsletterEmail}
                onChange={e => setNewsletterEmail(e.target.value)}
                placeholder="Enter your email address..."
                required
                className="flex-1 px-4 py-3 text-sm text-white placeholder-gray-500 rounded-xl outline-none border border-[#1e1e32] focus:border-[#00b341] transition-colors"
                style={{ background: '#0c0c14' }}
              />
              <button
                type="submit"
                disabled={newsletterLoading}
                className="px-6 py-3 text-sm font-black text-white rounded-xl hover:opacity-90 transition-all flex items-center justify-center gap-2 shrink-0"
                style={{ background: '#00b341', fontFamily: 'Big Shoulders Display', fontSize: '15px' }}
              >
                {newsletterLoading ? 'Subscribing...' : 'Subscribe Now →'}
              </button>
            </form>
          )}
        </section>

      </div>
    </div>
  )
}
