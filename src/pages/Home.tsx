import { useState, useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import { toast } from 'react-toastify'
import { useApp } from '../context/AppContext'
import AdBanner from '../components/AdBanner'
import { fetchLiveMatches, LiveMatch } from '../services/liveScoreApi'
import { fetchLiveIngestedPosts, IngestedPost } from '../services/contentIngestion'
import { saveArticle } from '../services/articleStore'

const HERO_SLIDES_FALLBACK = [
  {
    id: 'arsenal-win',
    image: 'https://images.unsplash.com/photo-1624880357913-a8539238245b?w=1400&h=700&fit=crop&auto=format',
    tag: 'CHAMPIONS LEAGUE',
    title: 'Arsenal Reach UCL Final With Dramatic Comeback Against PSG',
    excerpt: 'The Gunners scored two late goals to overturn a 2-0 deficit at the Emirates, booking their place in the final.',
  },
  {
    id: 'transfer-mbappe',
    image: 'https://images.unsplash.com/photo-1508098682722-e99c43a406b2?w=1400&h=700&fit=crop&auto=format',
    tag: 'TRANSFERS',
    title: 'Massive Summer Move: Real Madrid Close In On Premier League Star',
    excerpt: 'Reports from Spain and England confirm a deal is imminent, with a fee of €120m agreed between the clubs.',
  },
  {
    id: 'afcon',
    image: 'https://images.unsplash.com/photo-1574629810360-7efbbe195018?w=1400&h=700&fit=crop&auto=format',
    tag: 'AFCON 2026',
    title: 'Kenya, Tanzania Set For AFCON Group Stage Drama',
    excerpt: "Both East African nations face must-win games as the group stage reaches its climax.",
  },
  {
    id: 'bigstone',
    image: 'https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?w=1400&h=700&fit=crop&auto=format',
    tag: 'DJ FLOWERZ',
    title: 'Bigstone Entertainment Drops Massive New Mix — Stream Now',
    excerpt: 'DJ Flowerz returns with a fire Afrobeats × Genge blend, dropping exclusively on Mixcloud.',
  },
]

const ARTICLES_FALLBACK = [
  { id: 'a1', tag: 'MATCH REPORT', title: 'Arsenal Dominate Derby to Go 3 Points Clear at the Top', image: 'https://images.unsplash.com/photo-1522778119026-d647f0596c20?w=600&h=400&fit=crop&auto=format', likes: 284, comments: 47, date: '2h ago' },
  { id: 'a2', tag: 'TRANSFERS', title: 'Here We Go: Chelsea Complete £80m Signing from Bundesliga', image: 'https://images.unsplash.com/photo-1589487391730-58f20eb2c308?w=600&h=400&fit=crop&auto=format', likes: 192, comments: 33, date: '4h ago' },
  { id: 'a3', tag: 'ANALYSIS', title: 'Why Pep\'s High Press Is Struggling Against Low Blocks', image: 'https://images.unsplash.com/photo-1431324155629-1a6deb1dec8d?w=600&h=400&fit=crop&auto=format', likes: 156, comments: 28, date: '6h ago' },
  { id: 'a4', tag: 'AFCON', title: 'Harambee Stars Name Strong Squad for AFCON Group Stage', image: 'https://images.unsplash.com/photo-1560272564-c83b66b1ad12?w=600&h=400&fit=crop&auto=format', likes: 311, comments: 62, date: '8h ago' },
  { id: 'a5', tag: 'OPINION', title: 'Rashford Reborn: Why The Winger Looks Like a Different Player', image: 'https://images.unsplash.com/photo-1517927033932-b3d18e61fb3a?w=600&h=400&fit=crop&auto=format', likes: 98, comments: 21, date: '10h ago' },
  { id: 'a6', tag: 'CHAMPIONS LEAGUE', title: 'UCL Quarter-Finals Preview: Our Predictions and Key Battles', image: 'https://images.unsplash.com/photo-1508098682722-e99c43a406b2?w=600&h=400&fit=crop&auto=format', likes: 204, comments: 39, date: '12h ago' },
]

const TRANSFER_NEWS = [
  { id: 't1', player: 'Vinicius Jr.', from: 'Real Madrid', to: 'Man City', status: 'rumour', fee: '€200m', image: 'https://images.unsplash.com/photo-1517927033932-b3d18e61fb3a?w=300&h=300&fit=crop&auto=format' },
  { id: 't2', player: 'Saka', from: 'Arsenal', to: 'Barcelona', status: 'rumour', fee: '€150m', image: 'https://images.unsplash.com/photo-1608245449230-4ac19066d2d0?w=300&h=300&fit=crop&auto=format' },
  { id: 't3', player: 'Haaland', from: 'Man City', to: 'Real Madrid', status: 'confirmed', fee: '€180m', image: 'https://images.unsplash.com/photo-1570498839593-e565b39455fc?w=300&h=300&fit=crop&auto=format' },
]

const STANDINGS_MINI = [
  { pos: 1, team: 'Arsenal', played: 32, pts: 78, form: ['W','W','D','W','W'] },
  { pos: 2, team: 'Liverpool', played: 32, pts: 75, form: ['W','W','W','D','L'] },
  { pos: 3, team: 'Man City', played: 32, pts: 71, form: ['W','D','W','W','W'] },
  { pos: 4, team: 'Chelsea', played: 32, pts: 62, form: ['L','W','W','D','W'] },
  { pos: 5, team: 'Tottenham', played: 32, pts: 58, form: ['D','W','L','W','D'] },
]

function LiveTicker() {
  const { t } = useApp()
  const [matches, setMatches] = useState<LiveMatch[]>([])
  const [goalAlert, setGoalAlert] = useState<string | null>(null)
  const prevScoresRef = useRef<Record<string, { homeScore: number; awayScore: number }>>({})

  const processLiveMatches = (apiMatches: LiveMatch[]) => {
    // Filter to ONLY show live matches currently playing
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

    setMatches(liveOnly)
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
          <span>LIVE GAMES ({matches.length})</span>
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
                  <span className="live-dot bg-emerald-500" />
                  <span className="text-[10px] font-bold text-emerald-400">{m.status || (m.minute ? `${m.minute}'` : 'LIVE')}</span>
                </div>
              </div>
              <div className="text-left text-xs text-gray-300 font-bold min-w-[60px] truncate">{m.away}</div>
            </Link>
          ))
        ) : (
          <div className="py-1.5 text-xs text-gray-400 font-medium italic flex items-center gap-2">
            <span>No live matches in progress right now.</span>
            <Link to="/scores" className="text-emerald-400 font-bold not-italic hover:underline">View today's full match schedule →</Link>
          </div>
        )}
      </div>
    </div>
  )
}

export default function Home() {
  const { t } = useApp()
  const [slide, setSlide] = useState(0)
  const [dismissed, setDismissed] = useState(false)
  const [ingestedPosts, setIngestedPosts] = useState<IngestedPost[]>([])

  useEffect(() => {
    fetchLiveIngestedPosts().then(posts => {
      if (posts && posts.length > 0) {
        setIngestedPosts(posts)
        // Store into articleStore for seamless reading in Article.tsx
        posts.forEach(p => {
          saveArticle({
            id: p.id,
            title: p.transformedTitle || p.sourceTitle,
            category: p.category,
            body: p.transformedBody || p.sourceBody,
            imageUrl: p.sourceImage,
            author: p.author || 'FlowerZFC Newsdesk',
            date: p.sourceDate,
            status: 'Published',
            tags: p.category,
            slug: p.id,
            scheduled: '',
            views: '1.4k',
            likes: 145,
            metaDescription: p.sourceTitle
          })
        })
      }
    })
  }, [])

  const heroSlides = ingestedPosts.length >= 4 ? ingestedPosts.slice(0, 4).map(p => ({
    id: p.id,
    image: p.sourceImage || 'https://images.unsplash.com/photo-1522778119026-d647f0596c20?w=1400&h=700&fit=crop&auto=format',
    tag: p.category.toUpperCase(),
    title: p.transformedTitle || p.sourceTitle,
    excerpt: (p.transformedBody || p.sourceBody).slice(0, 140) + '...',
  })) : HERO_SLIDES_FALLBACK

  const breakingPost = ingestedPosts.length > 0 ? ingestedPosts[0] : null
  const latestArticles = ingestedPosts.length >= 4 ? ingestedPosts.slice(4, 10).map((p, idx) => ({
    id: p.id,
    tag: p.category.toUpperCase(),
    title: p.transformedTitle || p.sourceTitle,
    image: p.sourceImage || 'https://images.unsplash.com/photo-1522778119026-d647f0596c20?w=600&h=400&fit=crop&auto=format',
    likes: 180 + idx * 19,
    comments: 15 + idx * 4,
    date: p.detectedAt || p.sourceDate,
  })) : ARTICLES_FALLBACK

  useEffect(() => {
    const timer = setInterval(() => setSlide(s => (s + 1) % heroSlides.length), 5000)
    return () => clearInterval(timer)
  }, [heroSlides.length])

  const currentSlide = heroSlides[slide] || heroSlides[0]

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
              🎧 Dj Flowerz Mixes
            </h2>
            <Link to="/mixes" className="text-xs font-semibold text-emerald-400 hover:text-emerald-300 transition-colors">{t('viewAll')} →</Link>
          </div>
          <div className="rounded-lg overflow-hidden grid md:grid-cols-2 gap-4">
            {/* Mixcloud embed */}
            <div className="rounded-lg overflow-hidden" style={{ background: '#131320', border: '1px solid #1e1e32' }}>
              <div className="relative" style={{ paddingTop: '56.25%' }}>
                <iframe
                  title="DJ Flowerz Mix"
                  style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', border: 0 }}
                  src="https://www.mixcloud.com/widget/iframe/?hide_cover=1&mini=1&feed=%2FMixcloud%2F"
                  allow="autoplay"
                />
              </div>
              <div className="p-4">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-xs px-2 py-0.5 rounded-full font-semibold text-black" style={{ background: '#10b981' }}>FEATURED MIX</span>
                  <span className="text-xs text-gray-500">Afrobeats × Genge</span>
                </div>
                <h3 className="text-lg font-black text-white" style={{ fontFamily: 'Big Shoulders Display' }}>DJ Flowerz — Summer Vibes 2026</h3>
                <p className="text-sm text-gray-500 mt-1 mb-3">Bigstone Entertainment • 72 min • 4.2K plays</p>
                <div className="flex gap-2">
                  <a href="https://mixcloud.com" target="_blank" rel="noreferrer" className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-black rounded transition-colors hover:bg-emerald-400" style={{ background: '#10b981' }}>
                    🎵 {t('listenNow')}
                  </a>
                  <a href="https://wa.me/254700000000" target="_blank" rel="noreferrer" className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded border transition-colors hover:bg-white/10" style={{ borderColor: '#10b981', color: '#10b981' }}>
                    💬 {t('bookNow')}
                  </a>
                </div>
              </div>
            </div>
            {/* Event poster + info */}
            <div className="grid grid-rows-2 gap-4">
              <div className="rounded-lg overflow-hidden relative" style={{ background: '#131320', border: '1px solid #1e1e32' }}>
                <img
                  src="https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?w=600&h=250&fit=crop&auto=format"
                  alt="Event poster"
                  className="w-full h-full object-cover opacity-60"
                  style={{ height: '140px' }}
                />
                <div className="absolute inset-0 flex flex-col justify-end p-3">
                  <span className="text-xs font-bold tracking-wider text-emerald-400">NEXT EVENT</span>
                  <h3 className="text-base font-black text-white mt-1" style={{ fontFamily: 'Big Shoulders Display' }}>Bigstone Night Out — Nairobi</h3>
                  <p className="text-xs text-gray-400">Aug 30, 2026 • Club Grill, Westlands</p>
                </div>
              </div>
              <div className="rounded-lg p-4 flex flex-col justify-between" style={{ background: '#131320', border: '1px solid #1e1e32' }}>
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-black text-black" style={{ background: '#10b981' }}>DJ</div>
                    <div>
                      <p className="text-sm font-bold text-white">DJ Flowerz</p>
                      <p className="text-xs text-gray-500">Bigstone Entertainment</p>
                    </div>
                  </div>
                  <p className="text-xs text-gray-500 leading-relaxed">Available for private events, clubs, and corporate bookings across East Africa.</p>
                </div>
                <div className="flex gap-2 mt-3">
                  <Link to="/mixes" className="flex-1 text-center py-1.5 text-xs font-bold text-black rounded transition-colors hover:bg-emerald-400" style={{ background: '#10b981' }}>
                    {t('viewAll')} Mixes
                  </Link>
                  <a href="https://wa.me/254700000000" target="_blank" rel="noreferrer" className="flex-1 text-center py-1.5 text-xs font-semibold rounded border transition-colors hover:bg-white/10" style={{ borderColor: '#10b981', color: '#10b981' }}>
                    💬 Book
                  </a>
                </div>
              </div>
            </div>
          </div>
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
        </section>

        <div className="grid lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2">
            {/* Transfer news */}
            <section className="mb-10">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-2xl font-black text-white" style={{ fontFamily: 'Big Shoulders Display' }}>{t('transfers')}</h2>
                <Link to="/transfers" className="text-xs font-semibold text-emerald-400 hover:text-emerald-300 transition-colors">{t('viewAll')} →</Link>
              </div>
              <div className="space-y-3">
                {TRANSFER_NEWS.map(tr => (
                  <Link key={tr.id} to={`/transfers`} className="flex items-center gap-4 p-3 rounded-lg transition-colors hover:bg-white/5" style={{ background: '#131320', border: '1px solid #1e1e32' }}>
                    <img src={tr.image} alt={tr.player} className="w-12 h-12 rounded-full object-cover" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="text-sm font-bold text-white">{tr.player}</span>
                        <span className="text-[10px] font-black px-1.5 py-0.5 rounded-sm text-white" style={{ background: statusColor(tr.status) }}>
                          {tr.status.toUpperCase()}
                        </span>
                      </div>
                      <p className="text-xs text-gray-500">{tr.from} → {tr.to} • {tr.fee}</p>
                    </div>
                  </Link>
                ))}
              </div>
            </section>
          </div>

          <div className="lg:col-span-1">
            {/* Mini Standings */}
            <section className="mb-6 rounded-lg p-4" style={{ background: '#131320', border: '1px solid #1e1e32' }}>
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-lg font-black text-white" style={{ fontFamily: 'Big Shoulders Display' }}>{t('standings')}</h2>
                <Link to="/standings" className="text-xs font-semibold text-emerald-400 hover:text-emerald-300 transition-colors">{t('viewFull')}</Link>
              </div>
              <div className="space-y-2 font-mono text-xs">
                {STANDINGS_MINI.map(st => (
                  <div key={st.pos} className="flex items-center justify-between py-1 border-b border-white/5">
                    <div className="flex items-center gap-2">
                      <span className="text-gray-500 w-4">{st.pos}</span>
                      <span className="text-white font-bold">{st.team}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-gray-500">{st.played}p</span>
                      <span className="text-emerald-400 font-bold w-6 text-right">{st.pts}</span>
                    </div>
                  </div>
                ))}
              </div>
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
