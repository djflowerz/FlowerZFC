import { useState, useEffect, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { useApp } from '../context/AppContext'
import AdBanner from '../components/AdBanner'
import { fetchLiveMatches, LiveMatch, getClubLogo, getInitialsAvatarUrl } from '../services/liveScoreApi'
import { SkeletonBox } from '../components/SkeletonLoader'

const DAYS = ['Yesterday', 'Today', 'Tomorrow']

function isMatchLive(m: LiveMatch): boolean {
  const st = (m.status || '').toUpperCase()
  if (st === 'FT' || st === 'AET' || st === 'AP' || st === 'POSTPONED' || st === 'CANCELLED' || st === 'ABANDONED') {
    return false
  }
  if (m.live) return true
  return st.includes("'") || st === '1H' || st === '2H' || st === 'HT' || st === 'LIVE' || st === 'ET' || st === 'PEN'
}

function isMatchFinished(m: LiveMatch): boolean {
  const st = (m.status || '').toUpperCase()
  if (st === 'FT' || st === 'AET' || st === 'AP' || st === 'FINISHED' || st === 'AFTER PEN.' || st === 'AWARDED') return true
  if (m.homeScore !== null && m.awayScore !== null && !m.live && !st.includes(':') && !st.includes('START') && !st.includes('SCHED') && st !== 'NS') {
    return true
  }
  return false
}

export default function Scores() {
  const getTodayLocalDate = () => {
    const d = new Date()
    const yyyy = d.getFullYear()
    const mm = String(d.getMonth() + 1).padStart(2, '0')
    const dd = String(d.getDate()).padStart(2, '0')
    return `${yyyy}-${mm}-${dd}`
  }

  const { t } = useApp()
  const [matches, setMatches] = useState<LiveMatch[]>([])
  const [league, setLeague] = useState('All')
  const [day, setDay] = useState('Today')
  const [viewFilter, setViewFilter] = useState<'all' | 'live' | 'finished'>('all')
  const [starredMatches, setStarredMatches] = useState<Set<string>>(() => {
    try {
      const saved = localStorage.getItem('flowerzfc_starred_matches')
      return saved ? new Set(JSON.parse(saved)) : new Set()
    } catch {
      return new Set()
    }
  })
  const [showCalendar, setShowCalendar] = useState(false)
  const [showLeaguePicker, setShowLeaguePicker] = useState(false)
  const [leagueQuery, setLeagueQuery] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedDate, setSelectedDate] = useState(getTodayLocalDate())
  const [loading, setLoading] = useState(true)
  
  // Determine date parameter for API fetch
  const activeDateArg = 
    day === 'Yesterday' ? 'YESTERDAY' :
    day === 'Today' ? 'TODAY' :
    day === 'Tomorrow' ? 'TOMORROW' :
    selectedDate

  useEffect(() => {
    setLoading(true)
    fetchLiveMatches(activeDateArg).then(data => {
      setMatches(data)
      setLoading(false)
    }).catch(() => setLoading(false))

    // Real-time polling every 15s — matches transitioning from live to FT move automatically
    const interval = setInterval(() => {
      fetchLiveMatches(activeDateArg).then(setMatches)
    }, 15000)
    return () => clearInterval(interval)
  }, [activeDateArg])

  const toggleStar = (id: string, e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setStarredMatches(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      try { localStorage.setItem('flowerzfc_starred_matches', JSON.stringify(Array.from(next))) } catch {}
      return next
    })
  }

  // Scores page only shows LIVE or FINISHED matches
  const validScoresMatches = useMemo(() => {
    return matches.filter(m => isMatchLive(m) || isMatchFinished(m))
  }, [matches])

  // Extract ALL available leagues dynamically from live + finished matches
  const allAvailableLeagues = useMemo(() => {
    const leagueMap = new Map<string, string>()
    leagueMap.set('All', '🌐')
    validScoresMatches.forEach(m => {
      if (m.league) {
        leagueMap.set(m.league, m.flag || '⚽')
      }
    })
    return Array.from(leagueMap.entries()).map(([name, flag]) => ({ name, flag }))
  }, [validScoresMatches])

  const filteredLeagues = allAvailableLeagues.filter(l =>
    l.name.toLowerCase().includes(leagueQuery.toLowerCase())
  )

  // Filter by user selection and search
  const filtered = useMemo(() => {
    return validScoresMatches.filter(m => {
      if (league !== 'All' && m.league !== league) return false
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim()
        const matchHome = m.home.toLowerCase().includes(q)
        const matchAway = m.away.toLowerCase().includes(q)
        const matchLeague = m.league.toLowerCase().includes(q)
        const matchRegion = (m.region || '').toLowerCase().includes(q)
        return matchHome || matchAway || matchLeague || matchRegion
      }
      return true
    })
  }, [validScoresMatches, league, searchQuery])

  // Split into Live and Finished matches
  const liveMatches = useMemo(() => filtered.filter(isMatchLive), [filtered])
  const finishedMatches = useMemo(() => filtered.filter(isMatchFinished), [filtered])

  // Group Live matches by League (like LiveScore.com)
  const liveByLeague = useMemo(() => {
    return liveMatches.reduce<Record<string, { flag: string; matches: LiveMatch[] }>>((acc, m) => {
      if (!acc[m.league]) {
        acc[m.league] = { flag: m.flag || '⚽', matches: [] }
      }
      acc[m.league].matches.push(m)
      return acc
    }, {})
  }, [liveMatches])

  // Group Finished matches by League (like LiveScore.com)
  const finishedByLeague = useMemo(() => {
    return finishedMatches.reduce<Record<string, { flag: string; matches: LiveMatch[] }>>((acc, m) => {
      if (!acc[m.league]) {
        acc[m.league] = { flag: m.flag || '⚽', matches: [] }
      }
      acc[m.league].matches.push(m)
      return acc
    }, {})
  }, [finishedMatches])

  const starredList = filtered.filter(m => starredMatches.has(m.id))

  const renderMatchCard = (m: LiveMatch, isLive: boolean) => (
    <Link
      key={m.id}
      to={`/match/${m.id}`}
      className="p-4 flex items-center justify-between hover:bg-white/[0.03] transition-colors block group"
    >
      <div className="flex items-center gap-4 flex-1">
        <button
          onClick={e => toggleStar(m.id, e)}
          className={`text-sm ${starredMatches.has(m.id) ? 'text-amber-400' : 'text-gray-600 hover:text-amber-400'}`}
          title="Star match"
        >
          {starredMatches.has(m.id) ? '★' : '☆'}
        </button>
        <div className="w-16 text-center shrink-0">
          {isLive ? (
            <span className="text-[11px] font-mono font-black text-red-500 flex items-center justify-center gap-1">
              <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
              {m.status || `${m.minute}'`}
            </span>
          ) : (
            <span className="text-[11px] font-black text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-1.5 py-0.5 rounded">
              {m.status || 'FT'}
            </span>
          )}
          <span className="text-[10px] text-gray-500 block truncate max-w-[80px] mt-0.5">{m.venue || 'Stadium'}</span>
        </div>

        <div className="flex-1 max-w-md">
          <div className="flex items-center justify-between py-1">
            <span className="text-sm font-bold text-white flex items-center gap-2 group-hover:text-emerald-400 transition-colors">
              <img src={m.homeLogo || getClubLogo(m.home)} alt="" className="w-5 h-5 object-contain shrink-0" onError={e => { (e.target as HTMLImageElement).src = getInitialsAvatarUrl(m.home) }} />
              <span className="truncate">{m.home}</span>
            </span>
            <span className={`font-mono text-base font-black ${isLive ? 'text-red-400' : 'text-emerald-400'}`}>
              {m.homeScore ?? 0}
            </span>
          </div>
          <div className="flex items-center justify-between py-1">
            <span className="text-sm font-bold text-white flex items-center gap-2 group-hover:text-emerald-400 transition-colors">
              <img src={m.awayLogo || getClubLogo(m.away)} alt="" className="w-5 h-5 object-contain shrink-0" onError={e => { (e.target as HTMLImageElement).src = getInitialsAvatarUrl(m.away) }} />
              <span className="truncate">{m.away}</span>
            </span>
            <span className={`font-mono text-base font-black ${isLive ? 'text-red-400' : 'text-emerald-400'}`}>
              {m.awayScore ?? 0}
            </span>
          </div>
        </div>
      </div>

      <div className="text-right pl-4 border-l border-white/5 hidden sm:block">
        <span className="text-xs font-bold text-emerald-400 group-hover:underline">Match Telemetry →</span>
      </div>
    </Link>
  )

  return (
    <div className="max-w-screen-lg mx-auto px-4 py-8">
      {/* Leaderboard Ad */}
      <div className="flex justify-center mb-6">
        <AdBanner size="leaderboard" label="Advertise on FlowerZFC — ads@flowerz.fc" />
      </div>

      {/* Calendar Date Picker Modal */}
      {showCalendar && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80" onClick={() => setShowCalendar(false)}>
          <div className="bg-[#131320] border border-white/10 rounded-lg p-6 max-w-sm w-full" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-bold text-white text-base">Select Date</h3>
              <button onClick={() => setShowCalendar(false)} className="text-gray-400 hover:text-white">✕</button>
            </div>
            <input
              type="date"
              value={selectedDate}
              onChange={e => { setSelectedDate(e.target.value); setDay(e.target.value); setShowCalendar(false) }}
              className="w-full bg-[#1a1a28] border border-white/10 text-white rounded p-3 font-mono text-sm outline-none focus:border-emerald-500"
            />
            <button
              onClick={() => { setDay('Today'); setShowCalendar(false) }}
              className="w-full mt-4 py-2 bg-emerald-500 text-black font-bold text-xs uppercase rounded hover:bg-emerald-400"
            >
              Reset to Today
            </button>
          </div>
        </div>
      )}

      {/* Searchable League Picker Modal */}
      {showLeaguePicker && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80" onClick={() => setShowLeaguePicker(false)}>
          <div className="bg-[#131320] border border-white/10 rounded-lg p-6 max-w-md w-full" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-bold text-white text-base">Search Competitions ({allAvailableLeagues.length})</h3>
              <button onClick={() => setShowLeaguePicker(false)} className="text-gray-400 hover:text-white">✕</button>
            </div>
            <input
              type="text"
              placeholder="Type league or country..."
              value={leagueQuery}
              onChange={e => setLeagueQuery(e.target.value)}
              className="w-full bg-[#1a1a28] border border-white/10 text-white rounded p-2.5 text-sm outline-none mb-4 focus:border-emerald-500"
            />
            <div className="max-h-60 overflow-y-auto space-y-1">
              {filteredLeagues.map(l => (
                <button
                  key={l.name}
                  onClick={() => { setLeague(l.name); setShowLeaguePicker(false) }}
                  className={`w-full text-left px-3 py-2 rounded text-sm flex items-center gap-3 transition-colors ${league === l.name ? 'bg-emerald-500/20 text-emerald-400 font-bold' : 'text-gray-300 hover:bg-white/5'}`}
                >
                  <span>{l.flag}</span>
                  <span>{l.name}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Header Controls */}
      <div className="flex items-center justify-between gap-4 mb-6 flex-wrap">
        <div>
          <h1 className="text-3xl font-black text-white uppercase tracking-tight flex items-center gap-2" style={{ fontFamily: 'Big Shoulders Display' }}>
            <span>⚡</span> {t('liveScores') || 'Live Scores & Match Results'}
          </h1>
          <p className="text-xs text-gray-400 mt-1">Live in-play telemetry & completed match results.</p>
        </div>

        {/* Date Selector */}
        <div className="flex items-center gap-1 bg-[#131320] border border-white/10 rounded-lg p-1">
          {DAYS.map(d => (
            <button
              key={d}
              onClick={() => setDay(d)}
              className={`px-3 py-1.5 rounded text-xs font-bold transition-colors ${day === d ? 'bg-emerald-500 text-black' : 'text-gray-400 hover:text-white'}`}
            >
              {d}
            </button>
          ))}
          <button
            onClick={() => setShowCalendar(true)}
            className="px-2.5 py-1.5 text-xs font-mono text-emerald-400 hover:bg-emerald-500/10 rounded transition-colors"
            title="Choose specific date"
          >
            📅 {selectedDate !== getTodayLocalDate() ? selectedDate : 'Calendar'}
          </button>
        </div>
      </div>

      {/* Real-time Team & League Search Bar */}
      <div className="mb-6">
        <div className="relative">
          <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 text-sm">🔍</span>
          <input
            type="text"
            placeholder="Search teams (e.g. Arsenal, Real Madrid, Bayern), leagues, or countries..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full bg-[#131320] border border-[#1e1e32] text-white rounded-xl pl-10 pr-10 py-3 text-xs outline-none focus:border-emerald-500 transition-colors shadow-lg"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white text-xs font-bold bg-[#1a1a28] w-5 h-5 rounded-full flex items-center justify-center"
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {/* Section View Tabs & League Filter */}
      <div className="flex items-center justify-between gap-4 mb-6 flex-wrap border-b border-white/10 pb-4">
        {/* Quick View Filter Tabs */}
        <div className="flex gap-2">
          <button
            onClick={() => setViewFilter('all')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${viewFilter === 'all' ? 'bg-white text-black' : 'bg-[#131320] border border-white/10 text-gray-400 hover:text-white'}`}
          >
            All Scores ({liveMatches.length + finishedMatches.length})
          </button>
          <button
            onClick={() => setViewFilter('live')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${viewFilter === 'live' ? 'bg-red-500 text-white shadow-lg shadow-red-500/20' : 'bg-[#131320] border border-white/10 text-red-400 hover:bg-red-500/10'}`}
          >
            <span className="w-2 h-2 rounded-full bg-red-400 animate-pulse" />
            Live In-Play ({liveMatches.length})
          </button>
          <button
            onClick={() => setViewFilter('finished')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${viewFilter === 'finished' ? 'bg-emerald-500 text-black' : 'bg-[#131320] border border-white/10 text-emerald-400 hover:bg-emerald-500/10'}`}
          >
            🏁 Finished ({finishedMatches.length})
          </button>
        </div>

        {/* League Selector Pills */}
        <div className="flex gap-2 overflow-x-auto pb-1 max-w-full items-center">
          {allAvailableLeagues.slice(0, 6).map(l => (
            <button
              key={l.name}
              onClick={() => setLeague(l.name)}
              className={`px-3 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-colors flex items-center gap-1.5 ${league === l.name ? 'bg-emerald-500 text-black' : 'bg-[#131320] border border-white/10 text-gray-300 hover:border-emerald-500/50'}`}
            >
              <span>{l.flag}</span>
              <span>{l.name}</span>
            </button>
          ))}
          {allAvailableLeagues.length > 6 && (
            <button
              onClick={() => setShowLeaguePicker(true)}
              className="px-3 py-1.5 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 rounded-full text-xs font-bold whitespace-nowrap hover:bg-emerald-500/20"
            >
              🔍 More ({allAvailableLeagues.length})
            </button>
          )}
        </div>
      </div>

      {/* Starred Favorites Section */}
      {starredList.length > 0 && (
        <div className="mb-8">
          <h2 className="text-xs font-black text-amber-400 uppercase tracking-widest mb-3 flex items-center gap-2">
            <span>⭐</span> Starred Matches ({starredList.length})
          </h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {starredList.map(m => {
              const live = isMatchLive(m)
              return (
                <div key={m.id} className="bg-[#131320] border border-amber-500/30 rounded-xl p-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-emerald-400 font-bold">{m.league}</span>
                    <span className="text-xs text-gray-500">·</span>
                    {live ? (
                      <span className="text-xs font-mono font-bold text-red-400 animate-pulse">{m.minute}' LIVE</span>
                    ) : (
                      <span className="text-xs font-bold text-gray-400">{m.status || 'FT'}</span>
                    )}
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <p className="text-xs font-bold text-white flex items-center justify-end gap-1.5">
                        <img src={m.homeLogo || getClubLogo(m.home)} alt="" className="w-4 h-4 object-contain" onError={e => { (e.target as HTMLImageElement).src = getInitialsAvatarUrl(m.home) }} /> {m.home} <span className="font-mono text-emerald-400">{m.homeScore ?? 0}</span>
                      </p>
                      <p className="text-xs font-bold text-white flex items-center justify-end gap-1.5">
                        <img src={m.awayLogo || getClubLogo(m.away)} alt="" className="w-4 h-4 object-contain" onError={e => { (e.target as HTMLImageElement).src = getInitialsAvatarUrl(m.away) }} /> {m.away} <span className="font-mono text-emerald-400">{m.awayScore ?? 0}</span>
                      </p>
                    </div>
                    <button onClick={e => toggleStar(m.id, e)} className="text-amber-400">★</button>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Main Content Loading / Empty States */}
      {loading && matches.length === 0 ? (
        <div className="space-y-4">
          {[1, 2, 3, 4].map(idx => (
            <div key={idx} className="bg-[#131320] border border-white/5 rounded-2xl p-4 space-y-3">
              <div className="flex items-center justify-between">
                <SkeletonBox className="w-28 h-4 rounded" />
                <SkeletonBox className="w-16 h-4 rounded" />
              </div>
              <div className="space-y-2 pt-1">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <SkeletonBox className="w-5 h-5 rounded-full" />
                    <SkeletonBox className="w-32 h-4 rounded" />
                  </div>
                  <SkeletonBox className="w-8 h-4 rounded" />
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <SkeletonBox className="w-5 h-5 rounded-full" />
                    <SkeletonBox className="w-28 h-4 rounded" />
                  </div>
                  <SkeletonBox className="w-8 h-4 rounded" />
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : liveMatches.length === 0 && finishedMatches.length === 0 ? (
        <div className="p-12 text-center bg-[#131320] border border-dashed border-white/10 rounded-2xl space-y-3">
          <p className="text-3xl">⚽</p>
          <p className="text-white font-bold text-sm">No live or finished matches found for {day === 'Today' ? 'today' : day}.</p>
          <p className="text-xs text-gray-400">Upcoming scheduled matches are listed on the Fixtures page.</p>
          <div className="flex justify-center gap-3 pt-2">
            <Link to="/fixtures" className="px-4 py-2 bg-emerald-500 text-black rounded-xl text-xs font-black hover:bg-emerald-400 transition-colors">
              📅 View Upcoming Fixtures →
            </Link>
            <button onClick={() => { setLeague('All'); setSearchQuery(''); setViewFilter('all') }} className="px-4 py-2 bg-white/5 border border-white/10 text-white rounded-xl text-xs font-bold hover:bg-white/10 transition-colors">
              Reset Filters
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-10">
          {/* ═══════════════════════════════════════════════════════════════════ */}
          {/* SECTION 1: 🔴 LIVE MATCHES (IN-PLAY) — GROUPED BY LEAGUE           */}
          {/* ═══════════════════════════════════════════════════════════════════ */}
          {(viewFilter === 'all' || viewFilter === 'live') && (
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b border-red-500/20 pb-2">
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-red-500 animate-pulse" />
                  <h2 className="text-xl font-black text-white uppercase tracking-wider flex items-center gap-2" style={{ fontFamily: 'Big Shoulders Display' }}>
                    🔴 Live In-Play ({liveMatches.length})
                  </h2>
                </div>
                <span className="text-xs font-mono text-red-400 font-bold">Auto-updates every 15s</span>
              </div>

              {liveMatches.length === 0 ? (
                <div className="p-6 text-center bg-[#131320]/60 border border-white/5 rounded-xl text-xs text-gray-400 flex items-center justify-between flex-wrap gap-3">
                  <span>No matches currently playing live. Check finished scores below or see today's fixtures.</span>
                  <Link to="/fixtures" className="text-emerald-400 font-bold hover:underline">Upcoming Fixtures →</Link>
                </div>
              ) : (
                <div className="space-y-5">
                  {Object.entries(liveByLeague).map(([lName, { flag, matches: lMatches }]) => (
                    <div key={`live-${lName}`} className="bg-[#131320] border border-red-500/30 rounded-xl overflow-hidden shadow-lg shadow-red-500/5">
                      <div className="bg-[#1a1525] px-4 py-2.5 border-b border-red-500/20 flex items-center justify-between">
                        <span className="font-black text-white text-sm tracking-wide uppercase flex items-center gap-2" style={{ fontFamily: 'Big Shoulders Display' }}>
                          <span>{flag}</span> {lName}
                        </span>
                        <span className="text-[11px] font-mono font-bold text-red-400 bg-red-500/10 px-2 py-0.5 rounded">
                          {lMatches.length} Live
                        </span>
                      </div>
                      <div className="divide-y divide-white/5">
                        {lMatches.map(m => renderMatchCard(m, true))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* In-feed native ad between Live and Finished sections */}
          {liveMatches.length > 0 && finishedMatches.length > 0 && (
            <div className="my-6 flex justify-center">
              <AdBanner size="native" label="Sponsored — Matchday Partner Offer" />
            </div>
          )}

          {/* ═══════════════════════════════════════════════════════════════════ */}
          {/* SECTION 2: 🏁 FINISHED MATCHES (FULL TIME) — GROUPED BY LEAGUE     */}
          {/* ═══════════════════════════════════════════════════════════════════ */}
          {(viewFilter === 'all' || viewFilter === 'finished') && (
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b border-emerald-500/20 pb-2">
                <div className="flex items-center gap-2">
                  <span className="text-lg">🏁</span>
                  <h2 className="text-xl font-black text-white uppercase tracking-wider" style={{ fontFamily: 'Big Shoulders Display' }}>
                    Finished Matches ({finishedMatches.length})
                  </h2>
                </div>
                <span className="text-xs font-mono text-gray-400">Full Time Results</span>
              </div>

              {finishedMatches.length === 0 ? (
                <div className="p-6 text-center bg-[#131320]/60 border border-white/5 rounded-xl text-xs text-gray-400">
                  No finished matches recorded for {day === 'Today' ? 'today' : day}.
                </div>
              ) : (
                <div className="space-y-5">
                  {Object.entries(finishedByLeague).map(([lName, { flag, matches: lMatches }]) => (
                    <div key={`fin-${lName}`} className="bg-[#131320] border border-white/10 rounded-xl overflow-hidden">
                      <div className="bg-[#1a1a28] px-4 py-2.5 border-b border-white/10 flex items-center justify-between">
                        <span className="font-black text-white text-sm tracking-wide uppercase flex items-center gap-2" style={{ fontFamily: 'Big Shoulders Display' }}>
                          <span>{flag}</span> {lName}
                        </span>
                        <span className="text-[11px] font-mono text-gray-400">
                          {lMatches.length} {lMatches.length === 1 ? 'Result' : 'Results'}
                        </span>
                      </div>
                      <div className="divide-y divide-white/5">
                        {lMatches.map(m => renderMatchCard(m, false))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Bottom High Impact Ad Slot */}
      <div className="mt-8 pt-6 border-t border-white/10 flex justify-center">
        <AdBanner size="rectangle" label="Promoted Betting & Sportsbook Offers" />
      </div>
    </div>
  )
}
