import { useState, useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import { toast } from 'react-toastify'
import { useApp } from '../context/AppContext'
import AdBanner from '../components/AdBanner'
import { fetchLiveMatches, LiveMatch, fetchLiveStandings } from '../services/liveScoreApi'
import { fetchLiveIngestedPosts, IngestedPost } from '../services/contentIngestion'
import { fetchAllArticles, fetchAllComments, fetchAllMixes } from '../services/supabaseClient'
import { saveArticle } from '../services/articleStore'

const TRANSFER_NEWS: { id: string; player: string; from: string; to: string; status: string; fee: string; image: string }[] = []

const STANDINGS_MINI: { pos: number; team: string; played: number; pts: number; form: string[] }[] = []

function LiveTicker() {
  const { t } = useApp()
  const [matches, setMatches] = useState<LiveMatch[]>([])
  const [goalAlert, setGoalAlert] = useState<string | null>(null)
  const prevScoresRef = useRef<Record<string, { homeScore: number; awayScore: number }>>({})

  const processLiveMatches = (apiMatches: LiveMatch[]) => {
    // Filter to live matches currently playing
    const liveOnly = apiMatches.filter(m => {
      if (m.live) return true
      const st = (m.status || '').toUpperCase()
      return st.includes("'") || st === '1H' || st === '2H' || st === 'HT' || st === 'LIVE' || st === 'ET' || st === 'PEN'
    })

    // Detect real-time goals for popup notifications
    apiMatches.forEach(m => {
      if (m.homeScore !== null && m.awayScore !== null) {
        const prev = prevScoresRef.current[m.id]
        if (prev) {
          if (m.homeScore > prev.homeScore) {
            const msg = `⚽ GOAL! ${m.home} ${m.homeScore} - ${m.awayScore} ${m.away} (${m.status || (m.minute ? m.minute + "'" : 'LIVE')})`
            toast.success(msg, { position: 'top-right', autoClose: 8000 })
            setGoalAlert(msg)
            setTimeout(() => setGoalAlert(null), 10000)
          } else if (m.awayScore > prev.awayScore) {
            const msg = `⚽ GOAL! ${m.home} ${m.homeScore} - ${m.awayScore} ${m.away} (${m.status || (m.minute ? m.minute + "'" : 'LIVE')})`
            toast.success(msg, { position: 'top-right', autoClose: 8000 })
            setGoalAlert(msg)
            setTimeout(() => setGoalAlert(null), 10000)
          }
        }
        prevScoresRef.current[m.id] = { homeScore: m.homeScore, awayScore: m.awayScore }
      }
    })

    // Display live in-play matches, or fall back to today's top scheduled/completed matches if none currently in-play
    setMatches(liveOnly.length > 0 ? liveOnly : apiMatches.slice(0, 12))
  }

  useEffect(() => {
    fetchLiveMatches('TODAY').then(processLiveMatches)
    const interval = setInterval(() => {
      fetchLiveMatches('TODAY').then(processLiveMatches)
    }, 10000)
    return () => clearInterval(interval)
  }, [])

  return (
    <div className="relative border-y" style={{ background: '#0d0d1a', borderColor: '#1e1e32' }}>
      {goalAlert && (
        <div className="bg-emerald-600 text-white font-black text-center text-xs py-2 px-4 animate-pulse flex items-center justify-center gap-2">
          <span>⚡ LIVE GOAL ALERT:</span>
          <span>{goalAlert}</span>
        </div>
      )}
      <div className="ticker-scroll flex items-center gap-2 px-4 py-2" style={{ overflowX: 'auto' }}>
        <div className="flex items-center gap-1.5 px-3 py-1 bg-emerald-500/10 border border-emerald-500/30 rounded text-[11px] font-black text-emerald-400 shrink-0">
          <span className="live-dot bg-emerald-500" />
          <span>TODAY'S MATCHES ({matches.length})</span>
        </div>

        {matches.length > 0 ? (
          matches.map(m => (
            <Link
              key={m.id}
              to={`/match/${m.id}`}
              className="flex-none flex items-center gap-3 px-4 py-2 rounded-sm transition-colors hover:bg-white/5"
              style={{ border: '1px solid #1e1e32', minWidth: '180px' }}
            >
              <div className="text-right text-xs text-gray-300 font-bold min-w-[60px] truncate">{m.home}</div>
              <div className="text-center">
                <div className="text-white font-black text-sm" style={{ fontFamily: 'Big Shoulders Display' }}>
                  {m.homeScore !== null && m.awayScore !== null ? `${m.homeScore} – ${m.awayScore}` : 'vs'}
                </div>
                <div className="flex items-center gap-1 justify-center mt-0.5">
                  {m.live && <span className="live-dot bg-emerald-500" />}
                  <span className="text-[10px] font-bold text-emerald-400">{m.status || (m.minute ? `${m.minute}'` : 'LIVE')}</span>
                </div>
              </div>
              <div className="text-left text-xs text-gray-300 font-bold min-w-[60px] truncate">{m.away}</div>
            </Link>
          ))
        ) : (
          <div className="py-1.5 text-xs text-gray-400 font-medium italic flex items-center gap-2">
            <span>Loading today's matches...</span>
            <Link to="/scores" className="text-emerald-400 font-bold not-italic hover:underline">View today's full match schedule →</Link>
          </div>
        )}
      </div>
    </div>
  )
}

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
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
}

export default function Home() {
  const { t } = useApp()
  const [slide, setSlide] = useState(0)
  const [dismissed, setDismissed] = useState(false)
  const [dbArticles, setDbArticles] = useState<any[]>([])
  const [commentCounts, setCommentCounts] = useState<Record<string, number>>({})
  const [ingestedPosts, setIngestedPosts] = useState<IngestedPost[]>([])
  const [homeMixes, setHomeMixes] = useState<any[]>([])
  const [homeStandings, setHomeStandings] = useState<any[]>([])

  useEffect(() => {
    fetchAllArticles().then(({ articles: arts }) => {
      if (arts && arts.length > 0) {
        setDbArticles(arts)
      }
    })
    fetchAllMixes().then(({ mixes }) => {
      if (mixes && mixes.length > 0) setHomeMixes(mixes.slice(0, 3))
    })
    fetchLiveStandings('Premier League').then(standings => {
      if (standings && standings.length > 0) setHomeStandings(standings.slice(0, 5))
    })
    fetchLiveIngestedPosts().then(posts => {
      if (posts && posts.length > 0) {
        setIngestedPosts(posts)
      }
    })
    fetchAllComments().then(({ comments }) => {
      if (comments) {
        const counts: Record<string, number> = {}
        comments.forEach(c => {
          if (c.article_id) counts[c.article_id] = (counts[c.article_id] || 0) + 1
        })
        setCommentCounts(counts)
      }
    })
  }, [])

  // Priority 1: DB Articles | Priority 2: Real Ingested LiveScore Articles | Priority 3: []
  const allFeedItems = (dbArticles.length > 0
    ? dbArticles.map(a => {
        const rawDate = a.published_at || a.date
        const ts = rawDate ? new Date(rawDate).getTime() : 0
        return {
          id: a.id,
          tag: (a.category || 'NEWS').toUpperCase(),
          title: a.title,
          excerpt: a.body ? a.body.slice(0, 140) + '...' : '',
          image: a.image_url || 'https://images.unsplash.com/photo-1522778119026-d647f0596c20?w=1400&h=700&fit=crop&auto=format',
          likes: a.likes || 0,
          comments: commentCounts[a.id] || 0,
          date: formatRelativeTime(rawDate),
          timestamp: ts || Date.now(),
        }
      })
    : ingestedPosts.map(p => ({
        id: p.id,
        tag: (p.category || 'FOOTBALL').toUpperCase(),
        title: p.transformedTitle || p.sourceTitle,
        excerpt: p.transformedBody ? p.transformedBody.slice(0, 140) + '...' : '',
        image: p.sourceImage || 'https://images.unsplash.com/photo-1522778119026-d647f0596c20?w=1400&h=700&fit=crop&auto=format',
        likes: 0,
        comments: commentCounts[p.id] || 0,
        date: formatRelativeTime(p.timestampMs),
        timestamp: p.timestampMs,
      }))
  ).sort((a, b) => b.timestamp - a.timestamp)

  const heroSlides = allFeedItems.slice(0, 4)
  const breakingPost: any = null
  const latestArticles = allFeedItems.slice(4, 10)

  useEffect(() => {
    if (heroSlides.length === 0) return
    const timer = setInterval(() => setSlide(s => (s + 1) % heroSlides.length), 5000)
    return () => clearInterval(timer)
  }, [heroSlides.length])

  const currentSlide = heroSlides[slide] || heroSlides[0] || {
    id: 'hero-main',
    tag: 'FOOTBALL',
    title: 'FlowerZFC — Global Football & Media Platform',
    excerpt: 'Live scores, transfer updates, match highlights, and culture across East Africa and worldwide.',
    image: 'https://images.unsplash.com/photo-1522778119026-d647f0596c20?w=1400&h=700&fit=crop&auto=format',
    likes: 120,
    comments: 18,
    date: 'Today',
  }

  const statusColor = (s: string) =>
    s === 'confirmed' ? '#10b981' : s === 'rumour' ? '#f4a261' : '#3b82f6'

  return (
    <div>
      {/* Real Breaking News Banner */}
      {!dismissed && breakingPost && (
        <div className="flex items-center justify-between px-4 py-2 text-sm font-semibold" style={{ background: '#00b341', color: '#fff' }}>
          <div className="flex items-center gap-2 overflow-hidden">
            <span className="text-xs font-black tracking-widest uppercase bg-black text-emerald-400 px-2 py-0.5 rounded shrink-0">{t('breakingNews')}</span>
            <Link to={`/news/${breakingPost.id}`} className="font-bold hover:underline truncate">
              🔴 {breakingPost.transformedTitle || breakingPost.sourceTitle}
            </Link>
          </div>
          <button onClick={() => setDismissed(true)} className="opacity-70 hover:opacity-100 transition-opacity text-lg leading-none shrink-0 ml-2">×</button>
        </div>
      )}

      {/* Leaderboard ad */}
      <div className="py-3 px-4 flex justify-center" style={{ background: '#0a0a12' }}>
        <AdBanner size="leaderboard" />
      </div>

      {/* Live ticker with ticking match minute & dynamic score updates */}
      <LiveTicker />

      {/* Hero slideshow with real ingested breaking news */}
      <section className="relative overflow-hidden" style={{ height: 'clamp(360px, 55vw, 520px)' }}>
        <div
          className="absolute inset-0 bg-cover bg-center transition-all duration-700"
          style={{ backgroundImage: `url(${currentSlide.image})` }}
        />
        <div className="absolute inset-0" style={{ background: 'linear-gradient(to right, rgba(0,0,0,0.85) 40%, rgba(0,0,0,0.3) 100%)' }} />
        <div className="absolute inset-0 flex items-end pb-10 px-8 md:px-16 max-w-screen-xl mx-auto left-0 right-0">
          <div className="max-w-xl">
            <span className="inline-block text-xs font-black tracking-widest px-3 py-1 mb-3 rounded-sm" style={{ background: '#10b981', color: '#000' }}>
              {currentSlide.tag}
            </span>
            <Link to={`/news/${currentSlide.id}`}>
              <h1 className="text-3xl md:text-5xl font-black text-white leading-tight mb-3 hover:text-emerald-400 transition-colors" style={{ fontFamily: 'Big Shoulders Display' }}>
                {currentSlide.title}
              </h1>
            </Link>
            <p className="text-sm text-gray-300 mb-5 leading-relaxed line-clamp-2">{currentSlide.excerpt}</p>
            <Link
              to={`/news/${currentSlide.id}`}
              className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-bold text-black rounded-sm transition-colors hover:bg-emerald-400"
              style={{ background: '#10b981' }}
            >
              {t('readMore')} →
            </Link>
          </div>
        </div>
        {/* Controls */}
        <button onClick={() => setSlide(s => (s - 1 + heroSlides.length) % heroSlides.length)} className="absolute left-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full flex items-center justify-center text-white transition-colors hover:bg-white/20" style={{ background: 'rgba(0,0,0,0.4)' }}>‹</button>
        <button onClick={() => setSlide(s => (s + 1) % heroSlides.length)} className="absolute right-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full flex items-center justify-center text-white transition-colors hover:bg-white/20" style={{ background: 'rgba(0,0,0,0.4)' }}>›</button>
        <div className="absolute bottom-4 left-0 right-0 flex justify-center gap-2">
          {heroSlides.map((_, i) => (
            <button key={i} onClick={() => setSlide(i)} className="rounded-full transition-all" style={{ width: i === slide ? '24px' : '8px', height: '8px', background: i === slide ? '#10b981' : 'rgba(255,255,255,0.4)' }} />
          ))}
        </div>
      </section>

      <div className="max-w-screen-xl mx-auto px-4 py-8">
        {/* Dj Flowerz Mixes Section */}
        <section className="mb-10">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-black text-white" style={{ fontFamily: 'Big Shoulders Display' }}>
              🎧 Dj Flowerz Mixes & Events
            </h2>
            <Link to="/mixes" className="text-xs font-semibold text-emerald-400 hover:text-emerald-300 transition-colors">{t('viewAll')} →</Link>
          </div>
          {homeMixes.length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              {homeMixes.map(m => (
                <Link key={m.id} to="/mixes" className="rounded-lg overflow-hidden border border-[#1e1e32] hover:border-[#00b341] transition-colors group" style={{ background: '#131320' }}>
                  <div className="relative" style={{ height: '140px' }}>
                    <img src={m.cover_url || 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=400&h=400&fit=crop'} alt={m.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                    <div className="absolute inset-0 flex items-center justify-center bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity">
                      <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ background: '#00b341' }}>
                        <svg width="14" height="14" fill="white" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
                      </div>
                    </div>
                  </div>
                  <div className="p-3">
                    <span className="text-[9px] font-bold text-[#00b341] uppercase">{m.genre || 'Afrobeats'}</span>
                    <h4 className="text-xs font-bold text-white line-clamp-1 mt-0.5">{m.title}</h4>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="rounded-lg p-6 flex flex-col sm:flex-row items-center justify-between gap-6" style={{ background: '#131320', border: '1px solid #1e1e32' }}>
              <div>
                <span className="text-[10px] font-black uppercase tracking-widest text-[#00b341]">OFFICIAL MEDIA & MIXES</span>
                <h3 className="text-2xl font-black text-white mt-1" style={{ fontFamily: 'Big Shoulders Display' }}>Listen to DJ Flowerz Mixtapes</h3>
                <p className="text-xs text-gray-400 mt-1 max-w-lg">Explore exclusive Afrobeats, Amapiano, and Genge mixes or book DJ Flowerz for your next live event.</p>
              </div>
              <div className="flex gap-3 shrink-0">
                <Link to="/mixes" className="px-5 py-2.5 text-xs font-bold text-black rounded transition-all hover:bg-emerald-400" style={{ background: '#10b981' }}>
                  🎵 Browse All Mixes
                </Link>
              </div>
            </div>
          )}
        </section>

        {/* In-feed ad */}
        <div className="my-6 flex justify-center">
          <AdBanner size="native" label="Sponsored — In-Feed Native Ad" />
        </div>

        {/* Real Latest news grid */}
        <section className="mb-10">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-black text-white" style={{ fontFamily: 'Big Shoulders Display' }}>{t('latestNews')}</h2>
            <Link to="/news" className="text-xs font-semibold text-emerald-400 hover:text-emerald-300 transition-colors">{t('viewAll')} →</Link>
          </div>
          {latestArticles.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {latestArticles.map(a => (
                <Link key={a.id} to={`/news/${a.id}`} className="group block rounded-lg overflow-hidden transition-all hover:scale-[1.01]" style={{ background: '#131320', border: '1px solid #1e1e32' }}>
                  <div className="relative overflow-hidden" style={{ height: '180px' }}>
                    <img src={a.image} alt={a.title} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
                    <span className="absolute top-3 left-3 text-[10px] font-black tracking-wider px-2 py-0.5 rounded-sm text-black" style={{ background: '#10b981' }}>{a.tag}</span>
                  </div>
                  <div className="p-4">
                    <h3 className="text-base font-bold text-white leading-snug group-hover:text-emerald-400 transition-colors line-clamp-2" style={{ fontFamily: 'Big Shoulders Display' }}>{a.title}</h3>
                    <div className="flex items-center gap-4 mt-3 text-xs text-gray-500">
                      <span>{a.date}</span>
                      <span>♥ {a.likes}</span>
                      <span>💬 {a.comments}</span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="p-8 text-center rounded-lg border border-[#1e1e32]" style={{ background: '#131320' }}>
              <p className="text-xs text-gray-400">No news articles published yet. Check back soon or visit the News page.</p>
            </div>
          )}
        </section>

        <div className="grid lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2">
            {/* Transfer news */}
            <section className="mb-10">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-2xl font-black text-white" style={{ fontFamily: 'Big Shoulders Display' }}>{t('transfers')}</h2>
                <Link to="/transfers" className="text-xs font-semibold text-emerald-400 hover:text-emerald-300 transition-colors">{t('viewAll')} →</Link>
              </div>
              {dbArticles.filter(a => (a.category || '').toLowerCase() === 'transfers').length > 0 ? (
                <div className="space-y-3">
                  {dbArticles.filter(a => (a.category || '').toLowerCase() === 'transfers').slice(0, 5).map(tr => (
                    <Link key={tr.id} to={`/news/${tr.id}`} className="flex items-center gap-4 p-3 rounded-lg transition-colors hover:bg-white/5" style={{ background: '#131320', border: '1px solid #1e1e32' }}>
                      <img src={tr.image_url || 'https://images.unsplash.com/photo-1522778119026-d647f0596c20?w=200&h=200&fit=crop'} alt={tr.title} className="w-12 h-12 rounded-full object-cover" />
                      <div className="flex-1 min-w-0">
                        <span className="text-sm font-bold text-white line-clamp-1">{tr.title}</span>
                        <p className="text-xs text-gray-500 mt-0.5">{tr.published_at ? new Date(tr.published_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) : 'Recent'}</p>
                      </div>
                    </Link>
                  ))}
                </div>
              ) : (
                <div className="p-6 text-center rounded-lg border border-[#1e1e32]" style={{ background: '#131320' }}>
                  <p className="text-xs text-gray-400">No transfer news available right now.</p>
                  <Link to="/transfers" className="text-xs font-bold text-emerald-400 mt-2 inline-block hover:underline">View Live Transfer Tracker →</Link>
                </div>
              )}
            </section>
          </div>

          <div className="lg:col-span-1">
            {/* Mini Standings */}
            <section className="mb-6 rounded-lg p-4" style={{ background: '#131320', border: '1px solid #1e1e32' }}>
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-lg font-black text-white" style={{ fontFamily: 'Big Shoulders Display' }}>{t('standings')}</h2>
                <Link to="/standings" className="text-xs font-semibold text-emerald-400 hover:text-emerald-300 transition-colors">{t('viewFull')}</Link>
              </div>
              {homeStandings.length > 0 ? (
                <div className="space-y-2 font-mono text-xs">
                  {homeStandings.map(st => (
                    <div key={st.rank} className="flex items-center justify-between py-1 border-b border-white/5">
                      <div className="flex items-center gap-2">
                        <span className="text-gray-500 w-4">{st.rank}</span>
                        <span className="text-white font-bold">{st.team}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-gray-500">{st.played}p</span>
                        <span className="text-emerald-400 font-bold w-6 text-right">{st.pts}</span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="py-4 text-center">
                  <p className="text-xs text-gray-400">League tables updating...</p>
                  <Link to="/standings" className="text-xs font-bold text-emerald-400 mt-2 inline-block hover:underline">View All Standings →</Link>
                </div>
              )}
            </section>
          </div>
        </div>

        {/* Mobile & Halfpage Banner Section */}
        <div className="mt-8 pt-8 border-t border-[#1e1e32] flex flex-col md:flex-row items-center justify-around gap-6">
          <div>
            <p className="text-xs text-gray-500 text-center mb-2 font-bold uppercase tracking-wider">Mobile Banner (320×50)</p>
            <AdBanner size="mobile" label="Mobile Sponsor Banner" />
          </div>
          <div>
            <p className="text-xs text-gray-500 text-center mb-2 font-bold uppercase tracking-wider">Half Page Banner (300×600)</p>
            <AdBanner size="halfpage" label="Premier Half-Page Sponsor" />
          </div>
        </div>
      </div>
    </div>
  )
}
