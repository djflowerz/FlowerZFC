import { useState, useMemo, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useApp } from '../context/AppContext'
import AdBanner from '../components/AdBanner'
import { getAllArticles, getDeletedArticleIds, StoredArticle } from '../services/articleStore'
import { getIngestedPosts } from '../services/contentIngestion'
import { fetchAllArticles, fetchAllComments } from '../services/supabaseClient'

interface ArticleItem {
  id: string
  tag: string
  title: string
  summary: string
  image: string
  likes: number
  comments: number
  date: string
  timestamp: number
  readTime: string
  author: string
  authorAvatar: string
  featured?: boolean
  editorPick?: boolean
}

export const ARTICLES: ArticleItem[] = []

const CATEGORIES = ['All', 'Match Report', 'Transfers', 'Analysis', 'AFCON', 'Opinion', 'Champions League', 'East Africa']

function formatRelativeTime(dateInput?: string | number): string {
  if (!dateInput) return 'Just now'
  let d: Date
  if (typeof dateInput === 'number') {
    d = new Date(dateInput)
  } else {
    d = new Date(dateInput)
    if (isNaN(d.getTime())) return dateInput
  }
  const diffMs = Date.now() - d.getTime()
  if (diffMs < 0) return 'Just now'
  const diffSec = Math.floor(diffMs / 1000)
  if (diffSec < 60) return 'Just now'
  const diffMin = Math.floor(diffSec / 60)
  if (diffMin < 60) return `${diffMin}m ago`
  const diffHour = Math.floor(diffMin / 60)
  if (diffHour < 24) return `${diffHour}h ago`
  const diffDays = Math.floor(diffHour / 24)
  if (diffDays === 1) return 'Yesterday'
  if (diffDays < 7) return `${diffDays}d ago`
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}

const TICKER_ITEMS = [
  '🔥 BREAKING: Harambee Stars unveil new home kit ahead of AFCON qualifiers',
  '⚽ MATCHDAY: Arsenal vs Liverpool kickoff scheduled for 15:00 EAT',
  '🚨 TRANSFER CENTER: PSG submit official bid for Portuguese wonderkid',
  '🏆 CHAMPIONS LEAGUE: Quarter-final draw confirmed for Friday afternoon',
]

export default function News() {
  const { t } = useApp()
  const [selectedCategory, setSelectedCategory] = useState('All')
  const [searchQuery, setSearchQuery] = useState('')
  const [tickerIndex, setTickerIndex] = useState(0)
  const [dynamicArticles, setDynamicArticles] = useState<ArticleItem[]>([])

  // Transfer news state
  interface TransferNewsItem { id: string; title: string; link: string; date: string; img: string; source: string }
  const [transferNews, setTransferNews] = useState<TransferNewsItem[]>([])
  const [transfersLoading, setTransfersLoading] = useState(false)

  useEffect(() => {
    if (selectedCategory !== 'Transfers') return
    if (transferNews.length > 0) return // already loaded
    setTransfersLoading(true)
    fetch('https://api.rss2json.com/v1/api.json?rss_url=https%3A%2F%2Ffeeds.bbci.co.uk%2Fsport%2Ffootball%2Ftransfers%2Frss.xml&count=20')
      .then(r => r.json())
      .then(data => {
        if (data.status === 'ok' && data.items?.length) {
          setTransferNews(data.items.map((item: any, i: number) => ({
            id: `rss-${i}`,
            title: item.title,
            link: item.link,
            date: new Date(item.pubDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }),
            img: item.thumbnail || item.enclosure?.link || '',
            source: 'BBC Sport',
          })))
        } else {
          setTransferNews([])
        }
      })
      .catch(() => {
        setTransferNews([])
      })
      .finally(() => setTransfersLoading(false))
  }, [selectedCategory])

  useEffect(() => {
    const buildFromLocalStorage = () => {
      const stored = getAllArticles().map(a => {
        // Use current time if no valid date — puts newly published articles at top
        const rawDate = a.date
        let ts = rawDate ? new Date(rawDate).getTime() : 0
        if (!ts || isNaN(ts)) ts = Date.now()
        return {
          id: a.id,
          tag: (a.category || 'NEWS').toUpperCase(),
          title: a.title,
          summary: a.metaDescription || a.excerpt || a.body.slice(0, 140) + '...',
          image: a.imageUrl || 'https://images.unsplash.com/photo-1522778119026-d647f0596c20?w=800&h=500&fit=crop',
          likes: a.likes || 0,
          comments: 0,
          date: formatRelativeTime(ts),
          timestamp: ts,
          readTime: `${Math.max(1, Math.round((a.body || '').split(/\s+/).length / 200))} min read`,
          author: a.author || 'Admin',
          authorAvatar: (a.author || 'A').charAt(0),
          featured: true,
        }
      })
      const ingested = getIngestedPosts()
        .filter(p => p.status === 'Approved')
        .map(p => ({
          id: p.id,
          tag: p.category.toUpperCase(),
          title: p.transformedTitle,
          summary: p.transformedBody.slice(0, 140) + '...',
          image: p.sourceImage,
          likes: 0,
          comments: 0,
          date: formatRelativeTime(p.timestampMs),
          timestamp: p.timestampMs,
          readTime: '3 min read',
          author: p.author || 'Admin',
          authorAvatar: (p.author || 'A').charAt(0),
          featured: false,
        }))
      const deletedIds = getDeletedArticleIds()
      const merged = [...stored, ...ingested, ...ARTICLES].filter(a => !deletedIds.includes(a.id))
      const unique = merged.filter((item, index, self) => index === self.findIndex(t => t.id === item.id))
      unique.sort((a, b) => b.timestamp - a.timestamp)
      setDynamicArticles(unique)
    }

    const loadFromSupabase = () => {
      // Fetch real comments and Supabase articles in parallel
      Promise.all([
        fetchAllArticles(),
        fetchAllComments(),
      ]).then(([{ articles: dbArts, error }, { comments: dbComments }]) => {
        const commentCounts: Record<string, number> = {}
        if (dbComments) {
          dbComments.forEach(c => {
            if (c.article_id) commentCounts[c.article_id] = (commentCounts[c.article_id] || 0) + 1
          })
        }

        if (!error && dbArts && dbArts.length > 0) {
          const deletedIds = getDeletedArticleIds()
          const dbMapped = dbArts.map(a => {
            const rawDate = a.published_at || a.date
            // Fallback to Date.now() so articles without a date sort to top
            let ts = rawDate ? new Date(rawDate).getTime() : 0
            if (!ts || isNaN(ts)) ts = Date.now()
            return {
              id: a.id,
              tag: (a.category || 'NEWS').toUpperCase(),
              title: a.title,
              summary: a.body ? a.body.slice(0, 140) + '...' : '',
              image: a.image_url || 'https://images.unsplash.com/photo-1522778119026-d647f0596c20?w=800&h=500&fit=crop',
              likes: a.likes || 0,
              comments: commentCounts[a.id] || 0,
              date: formatRelativeTime(ts),
              timestamp: ts,
              readTime: `${Math.max(1, Math.round((a.body || '').split(/\s+/).length / 200))} min read`,
              author: a.author || 'Admin',
              authorAvatar: (a.author || 'A').charAt(0),
              featured: true,
            }
          }).filter(a => !deletedIds.includes(a.id))

          // Also include approved ingested posts alongside Supabase articles
          const ingested = getIngestedPosts()
            .filter(p => p.status === 'Approved')
            .map(p => ({
              id: p.id,
              tag: p.category.toUpperCase(),
              title: p.transformedTitle,
              summary: p.transformedBody.slice(0, 140) + '...',
              image: p.sourceImage,
              likes: 0,
              comments: commentCounts[p.id] || 0,
              date: formatRelativeTime(p.timestampMs),
              timestamp: p.timestampMs,
              readTime: '3 min read',
              author: p.author || 'Admin',
              authorAvatar: (p.author || 'A').charAt(0),
              featured: false,
            }))

          const merged = [...dbMapped, ...ingested]
          const unique = merged.filter((item, idx, self) => idx === self.findIndex(t => t.id === item.id))
          // Sort strictly from latest timestamp to oldest
          unique.sort((a, b) => b.timestamp - a.timestamp)
          setDynamicArticles(unique)
        } else {
          buildFromLocalStorage()
        }
      }).catch(() => buildFromLocalStorage())
    }

    // Load immediately
    loadFromSupabase()

    // Poll every 30 seconds so newly published articles appear without a page refresh
    const interval = setInterval(loadFromSupabase, 30000)
    return () => clearInterval(interval)
  }, [])

  // Filtered list
  const filteredArticles = useMemo(() => {
    return dynamicArticles.filter(a => {
      const matchesCategory = selectedCategory === 'All' || a.tag.toUpperCase() === selectedCategory.toUpperCase()
      const matchesQuery = searchQuery.trim() === '' ||
        a.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        a.summary.toLowerCase().includes(searchQuery.toLowerCase()) ||
        a.author.toLowerCase().includes(searchQuery.toLowerCase())
      return matchesCategory && matchesQuery
    })
  }, [dynamicArticles, selectedCategory, searchQuery])

  const featured = dynamicArticles.find(a => a.featured) || dynamicArticles[0] || ARTICLES[0]
  const editorPicks = dynamicArticles.filter(a => a.editorPick && a.id !== featured?.id)

  return (
    <div style={{ background: '#0a0a14', minHeight: '100vh', width: '100%' }}>
      {/* Breaking news live ticker banner */}
      <div style={{ background: '#121220', borderBottom: '1px solid #1e1e32' }} className="px-4 py-2 text-xs">
        <div className="max-w-screen-xl mx-auto flex items-center gap-3">
          <span className="px-2 py-0.5 rounded-sm font-black text-white flex-none" style={{ background: '#00b341', fontSize: '10px' }}>
            LIVE TICKER
          </span>
          <div className="flex-1 overflow-hidden whitespace-nowrap">
            <span className="text-gray-300 font-medium inline-block animate-pulse">
              {TICKER_ITEMS[tickerIndex]}
            </span>
          </div>
          <div className="flex gap-1 flex-none">
            <button
              onClick={() => setTickerIndex(prev => (prev === 0 ? TICKER_ITEMS.length - 1 : prev - 1))}
              className="px-1.5 py-0.5 rounded text-gray-400 hover:text-white hover:bg-white/10"
            >
              ‹
            </button>
            <button
              onClick={() => setTickerIndex(prev => (prev === TICKER_ITEMS.length - 1 ? 0 : prev + 1))}
              className="px-1.5 py-0.5 rounded text-gray-400 hover:text-white hover:bg-white/10"
            >
              ›
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-screen-xl mx-auto px-4 py-8">
        {/* Header Title & Search */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <span className="text-xs font-black uppercase tracking-widest text-[#00b341]">FOOTBALL NEWSROOM</span>
            <h1 className="text-4xl font-black text-white" style={{ fontFamily: 'Big Shoulders Display' }}>{t('news')}</h1>
          </div>

          {/* Search box */}
          <div className="relative w-full sm:w-72">
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search news & reports..."
              className="w-full px-4 py-2.5 text-xs text-white placeholder-gray-500 rounded-lg outline-none"
              style={{ background: '#131320', border: '1px solid #1e1e32' }}
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white text-xs"
              >
                ✕
              </button>
            )}
          </div>
        </div>

        {/* Category Chips */}
        <div className="flex gap-2 mb-8 overflow-x-auto ticker-scroll pb-2">
          {CATEGORIES.map(c => {
            const active = selectedCategory === c
            return (
              <button
                key={c}
                onClick={() => setSelectedCategory(c)}
                className="flex-none px-4 py-2 text-xs font-bold rounded-full transition-all"
                style={{
                  background: active ? '#00b341' : '#131320',
                  color: active ? '#ffffff' : '#9ca3af',
                  border: active ? '1px solid #00b341' : '1px solid #1e1e32',
                }}
              >
                {c}
              </button>
            )
          })}
        </div>

        {/* Leaderboard Ad */}
        <div className="mb-8 flex justify-center">
          <AdBanner size="leaderboard" />
        </div>

        {/* Main Content Layout */}
        {selectedCategory === 'Transfers' ? (
          <div>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-black text-white" style={{ fontFamily: 'Big Shoulders Display' }}>🔄 Transfer Centre</h2>
              <Link to="/transfers" className="text-xs font-bold text-emerald-400 hover:underline">View All Transfers →</Link>
            </div>
            {transfersLoading ? (
              <div className="space-y-3">
                {[...Array(6)].map((_, i) => (
                  <div key={i} className="h-20 rounded-xl animate-pulse" style={{ background: '#131320' }} />
                ))}
              </div>
            ) : (
              <div className="space-y-3">
                {transferNews.map(item => (
                  <a key={item.id} href={item.link} target="_blank" rel="noopener noreferrer"
                    className="flex items-center gap-4 p-4 rounded-xl border border-[#1e1e32] hover:border-emerald-500/30 transition-colors group"
                    style={{ background: '#131320' }}
                  >
                    <div className="w-12 h-12 rounded-lg flex items-center justify-center shrink-0 text-2xl" style={{ background: '#1a1a28' }}>
                      {item.img ? <img src={item.img} alt="" className="w-full h-full object-cover rounded-lg" onError={e => { (e.target as HTMLImageElement).style.display = 'none' }} /> : '🔄'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-white group-hover:text-emerald-400 transition-colors leading-snug line-clamp-2">{item.title}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-[11px] text-emerald-500 font-bold">{item.source}</span>
                        <span className="text-[11px] text-gray-500">·</span>
                        <span className="text-[11px] text-gray-500">{item.date}</span>
                      </div>
                    </div>
                    <span className="text-gray-500 group-hover:text-white shrink-0">→</span>
                  </a>
                ))}
              </div>
            )}
          </div>
        ) : dynamicArticles.length === 0 ? (
          <div className="text-center py-20 rounded-2xl border border-[#1e1e32]" style={{ background: '#131320' }}>
            <p className="text-5xl mb-3">📰</p>
            <h3 className="text-2xl font-black text-white mb-2" style={{ fontFamily: 'Big Shoulders Display' }}>No News Articles Published Yet</h3>
            <p className="text-xs text-gray-400 max-w-md mx-auto">
              Articles created and published from the admin dashboard will appear here in real time.
            </p>
          </div>
        ) : selectedCategory === 'All' && !searchQuery ? (
          <>
            {/* Featured Main Story Hero */}
            {featured && (
              <Link
                to={`/news/${featured.id}`}
                className="group block mb-10 rounded-xl overflow-hidden relative transition-all duration-300 hover:border-[#00b341]"
                style={{ height: '420px', border: '1px solid #1e1e32' }}
              >
              <img
                src={featured.image}
                alt={featured.title}
                className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
              />
              <div
                className="absolute inset-0"
                style={{ background: 'linear-gradient(to top, rgba(10,10,20,0.95) 20%, rgba(10,10,20,0.4) 60%, transparent 100%)' }}
              />

              {/* Tag & Meta */}
              <div className="absolute top-4 left-4 flex gap-2">
                <span className="text-[10px] font-black tracking-widest px-2.5 py-1 rounded-sm text-white" style={{ background: '#00b341' }}>
                  FEATURED
                </span>
                <span className="text-[10px] font-bold tracking-widest px-2.5 py-1 rounded-sm text-white" style={{ background: '#131320', border: '1px solid #2a2a40' }}>
                  {featured.tag}
                </span>
              </div>

              <div className="absolute bottom-0 left-0 right-0 p-6 sm:p-8">
                <h2
                  className="text-2xl sm:text-4xl font-black text-white leading-tight group-hover:text-[#00b341] transition-colors mb-3"
                  style={{ fontFamily: 'Big Shoulders Display' }}
                >
                  {featured.title}
                </h2>
                <p className="text-gray-300 text-sm line-clamp-2 max-w-3xl mb-4 hidden sm:block">
                  {featured.summary}
                </p>
                <div className="flex items-center gap-4 text-xs text-gray-400 flex-wrap">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-[#00b341] text-black font-black text-[10px] flex items-center justify-center">
                      {featured.authorAvatar}
                    </div>
                    <span className="font-semibold text-white">{featured.author}</span>
                  </div>
                  <span>•</span>
                  <span>{featured.date}</span>
                  <span>•</span>
                  <span>⏱ {featured.readTime}</span>
                  <span className="ml-auto flex items-center gap-3">
                    <span>♥ {featured.likes}</span>
                    <span>💬 {featured.comments}</span>
                  </span>
                </div>
              </div>
            </Link>
            )}

            {/* Content Grid (2 columns main + 1 column sidebar) */}
            <div className="grid lg:grid-cols-3 gap-8">
              {/* Left 2 Cols: Main Feed */}
              <div className="lg:col-span-2 space-y-6">
                <div className="flex items-center justify-between border-b pb-2" style={{ borderColor: '#1e1e32' }}>
                  <h3 className="text-lg font-black text-white uppercase tracking-wider" style={{ fontFamily: 'Big Shoulders Display' }}>
                    Latest Headlines
                  </h3>
                  <span className="text-xs text-gray-500">{filteredArticles.length} stories</span>
                </div>

                <div className="grid sm:grid-cols-2 gap-5">
                  {filteredArticles.filter(a => a.id !== featured.id).map((a, i) => (
                    <div key={a.id} className="contents">
                      {i === 4 && (
                        <div className="sm:col-span-2 flex justify-center py-2">
                          <AdBanner size="native" label="Sponsored — Featured Content Partner" />
                        </div>
                      )}
                      <Link
                        to={`/news/${a.id}`}
                        className="group flex flex-col justify-between rounded-xl overflow-hidden transition-all duration-300 hover:scale-[1.01]"
                        style={{ background: '#131320', border: '1px solid #1e1e32' }}
                      >
                        <div>
                          <div className="relative overflow-hidden" style={{ height: '190px' }}>
                            <img
                              src={a.image}
                              alt={a.title}
                              className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                            />
                            <span
                              className="absolute top-3 left-3 text-[10px] font-black tracking-wider px-2 py-0.5 rounded-sm text-white"
                              style={{ background: '#00b341' }}
                            >
                              {a.tag}
                            </span>
                          </div>

                          <div className="p-4">
                            <h4
                              className="text-base font-bold text-white leading-snug group-hover:text-[#00b341] transition-colors line-clamp-2 mb-2"
                              style={{ fontFamily: 'Big Shoulders Display' }}
                            >
                              {a.title}
                            </h4>
                            <p className="text-xs text-gray-400 line-clamp-2 leading-relaxed mb-3">
                              {a.summary}
                            </p>
                          </div>
                        </div>

                        <div className="px-4 pb-4 pt-0 flex items-center justify-between text-[11px] text-gray-500 border-t border-[#1e1e32] mt-auto">
                          <span className="pt-2">{a.author} · {a.date}</span>
                          <span className="pt-2">💬 {a.comments}</span>
                        </div>
                      </Link>
                    </div>
                  ))}
                </div>
              </div>

              {/* Right Sidebar */}
              <div className="space-y-6">
                {/* Editor's Picks Widget */}
                {editorPicks.length > 0 && (
                  <div className="rounded-xl p-5" style={{ background: '#131320', border: '1px solid #1e1e32' }}>
                    <h3
                      className="font-black text-white text-base mb-4 flex items-center justify-between uppercase tracking-wider"
                      style={{ fontFamily: 'Big Shoulders Display' }}
                    >
                      <span>⭐ Editor's Picks</span>
                      <span className="text-xs text-[#00b341]">Must Read</span>
                    </h3>
                    <div className="space-y-4">
                      {editorPicks.map((pick, idx) => (
                        <Link
                          key={pick.id}
                          to={`/news/${pick.id}`}
                          className="group flex gap-3 items-start pb-3 border-b last:border-b-0 last:pb-0 transition-colors"
                          style={{ borderColor: '#1e1e32' }}
                        >
                          <span className="text-xl font-black text-gray-600 w-5 shrink-0 pt-0.5" style={{ fontFamily: 'Big Shoulders Display' }}>
                            0{idx + 1}
                          </span>
                          <div className="flex-1 min-w-0">
                            <span className="text-[9px] font-black text-[#00b341] block mb-0.5">{pick.tag}</span>
                            <h5 className="text-xs font-bold text-white group-hover:text-[#00b341] transition-colors line-clamp-2 leading-snug">
                              {pick.title}
                            </h5>
                            <span className="text-[10px] text-gray-500 mt-1 block">{pick.readTime}</span>
                          </div>
                        </Link>
                      ))}
                    </div>
                  </div>
                )}

                {/* Trending News Widget */}
                {filteredArticles.length > 0 && (
                  <div className="rounded-xl p-5" style={{ background: '#131320', border: '1px solid #1e1e32' }}>
                    <h3
                      className="font-black text-white text-base mb-4 uppercase tracking-wider"
                      style={{ fontFamily: 'Big Shoulders Display' }}
                    >
                      🔥 Trending Stories
                    </h3>
                    <div className="space-y-3">
                      {filteredArticles.slice(0, 5).map((a, i) => (
                        <Link
                          key={a.id}
                          to={`/news/${a.id}`}
                          className="flex items-start gap-3 p-2 rounded-lg transition-colors hover:bg-white/5"
                        >
                          <span className="text-2xl font-black text-gray-600 w-6 shrink-0 text-center" style={{ fontFamily: 'Big Shoulders Display' }}>
                            {i + 1}
                          </span>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-semibold text-gray-200 line-clamp-2 group-hover:text-white">
                              {a.title}
                            </p>
                            <span className="text-[10px] text-gray-500 mt-1 block">♥ {a.likes} likes</span>
                          </div>
                        </Link>
                      ))}
                    </div>
                  </div>
                )}

                {/* Sidebar 300x600 Half Page Ad */}
                <AdBanner size="halfpage" label="News Sponsor — 300×600 Space" />
              </div>
            </div>
          </>
        ) : (
          /* Filtered View Grid */
          <div>
            <div className="flex items-center justify-between mb-4 pb-2 border-b" style={{ borderColor: '#1e1e32' }}>
              <h3 className="text-lg font-black text-white uppercase tracking-wider" style={{ fontFamily: 'Big Shoulders Display' }}>
                {searchQuery ? `Search Results for "${searchQuery}"` : `${selectedCategory} Articles`}
              </h3>
              <span className="text-xs text-gray-400">{filteredArticles.length} results</span>
            </div>

            {filteredArticles.length === 0 ? (
              <div className="text-center py-16 rounded-xl" style={{ background: '#131320', border: '1px solid #1e1e32' }}>
                <p className="text-4xl mb-2">🔍</p>
                <p className="text-base font-bold text-white mb-1">No articles found</p>
                <p className="text-xs text-gray-400 mb-4">Try adjusting your category filter or search keywords.</p>
                <button
                  onClick={() => { setSelectedCategory('All'); setSearchQuery('') }}
                  className="px-4 py-2 text-xs font-bold text-white rounded-lg"
                  style={{ background: '#00b341' }}
                >
                  Reset Filters
                </button>
              </div>
            ) : (
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredArticles.map(a => (
                  <Link
                    key={a.id}
                    to={`/news/${a.id}`}
                    className="group flex flex-col justify-between rounded-xl overflow-hidden transition-all duration-300 hover:scale-[1.01]"
                    style={{ background: '#131320', border: '1px solid #1e1e32' }}
                  >
                    <div>
                      <div className="relative overflow-hidden" style={{ height: '200px' }}>
                        <img
                          src={a.image}
                          alt={a.title}
                          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                        />
                        <span
                          className="absolute top-3 left-3 text-[10px] font-black tracking-wider px-2 py-0.5 rounded-sm text-white"
                          style={{ background: '#00b341' }}
                        >
                          {a.tag}
                        </span>
                      </div>
                      <div className="p-5">
                        <h4
                          className="text-base font-bold text-white leading-snug group-hover:text-[#00b341] transition-colors line-clamp-2 mb-2"
                          style={{ fontFamily: 'Big Shoulders Display' }}
                        >
                          {a.title}
                        </h4>
                        <p className="text-xs text-gray-400 line-clamp-2 leading-relaxed mb-3">
                          {a.summary}
                        </p>
                      </div>
                    </div>
                    <div className="px-5 pb-4 pt-0 flex items-center justify-between text-[11px] text-gray-500 border-t border-[#1e1e32] mt-auto">
                      <span className="pt-2">{a.author} · {a.date}</span>
                      <span className="pt-2">⏱ {a.readTime}</span>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
