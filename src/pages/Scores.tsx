import { useState, useEffect, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { useApp } from '../context/AppContext'
import AdBanner from '../components/AdBanner'
import { fetchLiveMatches, subscribeToLiveScores, LiveMatch, getClubLogo, getInitialsAvatarUrl } from '../services/liveScoreApi'

const DAYS = ['Yesterday', 'Today', 'Tomorrow']

export default function Scores() {
  const { t } = useApp()
  const [matches, setMatches] = useState<LiveMatch[]>([])
  const [league, setLeague] = useState('All')
  const [day, setDay] = useState('Today')
  const [hideFinished, setHideFinished] = useState(false)
  const [starredMatches, setStarredMatches] = useState<Set<string>>(new Set(['m1']))
  const [showCalendar, setShowCalendar] = useState(false)
  const [showLeaguePicker, setShowLeaguePicker] = useState(false)
  const [leagueQuery, setLeagueQuery] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedDate, setSelectedDate] = useState('2026-08-12')
  
  // Determine date parameter for API fetch
  const activeDateArg = 
    day === 'Yesterday' ? 'YESTERDAY' :
    day === 'Today' ? 'TODAY' :
    day === 'Tomorrow' ? 'TOMORROW' :
    selectedDate

  useEffect(() => {
    fetchLiveMatches(activeDateArg).then(setMatches)
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
      return next
    })
  }

  // Extract ALL available leagues dynamically from fetched matches
  const allAvailableLeagues = useMemo(() => {
    const leagueMap = new Map<string, string>()
    leagueMap.set('All', '🌐')
    matches.forEach(m => {
      if (m.league) {
        leagueMap.set(m.league, m.flag || '⚽')
      }
    })
    return Array.from(leagueMap.entries()).map(([name, flag]) => ({ name, flag }))
  }, [matches])

  const filteredLeagues = allAvailableLeagues.filter(l =>
    l.name.toLowerCase().includes(leagueQuery.toLowerCase())
  )

  const filtered = matches.filter(m => {
    if (league !== 'All' && m.league !== league) return false
    if (hideFinished && m.status === 'FT') return false
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

  const starredList = matches.filter(m => starredMatches.has(m.id))

  const byLeague = filtered.reduce<Record<string, LiveMatch[]>>((acc, m) => {
    acc[m.league] = acc[m.league] || []
    acc[m.league].push(m)
    return acc
  }, {})

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
            <span>⚡</span> {t('liveScores') || 'Live Scores & Match Telemetry'}
          </h1>
          <p className="text-xs text-gray-400 mt-1">Real-time live match telemetry & scores.</p>
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
            📅 {selectedDate !== '2026-08-12' ? selectedDate : 'Calendar'}
          </button>
        </div>
      </div>

      {/* Real-time Team & League Search Bar */}
      <div className="mb-6">
        <div className="relative">
          <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 text-sm">🔍</span>
          <input
            type="text"
            placeholder="Search teams (e.g. Arsenal, Real Madrid, Tucuman), leagues, or countries..."
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

      {/* League & Options Filter */}
      <div className="flex items-center justify-between gap-4 mb-6 flex-wrap border-b border-white/10 pb-4">
        <div className="flex gap-2 overflow-x-auto pb-1 max-w-full">
          {allAvailableLeagues.slice(0, 7).map(l => (
            <button
              key={l.name}
              onClick={() => setLeague(l.name)}
              className={`px-3 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-colors flex items-center gap-1.5 ${league === l.name ? 'bg-emerald-500 text-black' : 'bg-[#131320] border border-white/10 text-gray-300 hover:border-emerald-500/50'}`}
            >
              <span>{l.flag}</span>
              <span>{l.name}</span>
            </button>
          ))}
          <button
            onClick={() => setShowLeaguePicker(true)}
            className="px-3 py-1.5 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 rounded-full text-xs font-bold whitespace-nowrap hover:bg-emerald-500/20"
          >
            🔍 More Leagues ({allAvailableLeagues.length})
          </button>
        </div>

        <label className="flex items-center gap-2 text-xs font-bold text-gray-400 cursor-pointer">
          <input
            type="checkbox"
            checked={hideFinished}
            onChange={e => setHideFinished(e.target.checked)}
            className="accent-emerald-500 rounded"
          />
          Hide FT (Full Time)
        </label>
      </div>

      {/* Starred Favorites Section */}
      {starredList.length > 0 && (
        <div className="mb-8">
          <h2 className="text-xs font-black text-amber-400 uppercase tracking-widest mb-3 flex items-center gap-2">
            <span>⭐</span> Starred Matches ({starredList.length})
          </h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {starredList.map(m => (
              <div key={m.id} className="bg-[#131320] border border-amber-500/30 rounded-xl p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-xs text-emerald-400 font-bold">{m.league}</span>
                  <span className="text-xs text-gray-500">·</span>
                  <span className="text-xs font-mono font-bold text-red-400 animate-pulse">{m.minute}' LIVE</span>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <p className="text-xs font-bold text-white flex items-center justify-end gap-1.5">
                      <img src={m.homeLogo || getClubLogo(m.home)} alt="" className="w-4 h-4 object-contain" onError={e => { (e.target as HTMLImageElement).src = getInitialsAvatarUrl(m.home) }} /> {m.home} <span className="font-mono text-emerald-400">{m.homeScore}</span>
                    </p>
                    <p className="text-xs font-bold text-white flex items-center justify-end gap-1.5">
                      <img src={m.awayLogo || getClubLogo(m.away)} alt="" className="w-4 h-4 object-contain" onError={e => { (e.target as HTMLImageElement).src = getInitialsAvatarUrl(m.away) }} /> {m.away} <span className="font-mono text-emerald-400">{m.awayScore}</span>
                    </p>
                  </div>
                  <button onClick={e => toggleStar(m.id, e)} className="text-amber-400">★</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Main Match List By League */}
      <div className="space-y-6">
        {Object.entries(byLeague).map(([lName, mList], idx) => (
          <div key={lName}>
            {/* In-feed native ad inserted every 2 league sections */}
            {idx > 0 && idx % 2 === 0 && (
              <div className="my-6 flex justify-center">
                <AdBanner size="native" label="Sponsored — Matchday Partner Offer" />
              </div>
            )}
            <div className="bg-[#131320] border border-white/10 rounded-xl overflow-hidden">
              <div className="bg-[#1a1a28] px-4 py-3 border-b border-white/10 flex items-center justify-between">
                <span className="font-black text-white text-sm tracking-wide uppercase flex items-center gap-2" style={{ fontFamily: 'Big Shoulders Display' }}>
                  <span>⚽</span> {lName}
                </span>
                <span className="text-xs font-mono text-gray-400">{mList.length} matches</span>
              </div>
              <div className="divide-y divide-white/5">
                {mList.map(m => (
                  <Link
                    key={m.id}
                    to={`/match/${m.id}`}
                    className="p-4 flex items-center justify-between hover:bg-white/[0.02] transition-colors block"
                  >
                    <div className="flex items-center gap-4 flex-1">
                      <button
                        onClick={e => toggleStar(m.id, e)}
                        className={`text-sm ${starredMatches.has(m.id) ? 'text-amber-400' : 'text-gray-600 hover:text-amber-400'}`}
                      >
                        {starredMatches.has(m.id) ? '★' : '☆'}
                      </button>
                      <div className="w-16 text-center">
                        {m.live ? (
                          <span className="text-xs font-mono font-bold text-red-500 animate-pulse block">{m.minute}' LIVE</span>
                        ) : (
                          <span className="text-xs font-bold text-gray-400 block">{m.status || 'Scheduled'}</span>
                        )}
                        <span className="text-[10px] text-gray-500 block truncate max-w-[80px]">{m.venue}</span>
                      </div>

                      <div className="flex-1 max-w-md">
                        <div className="flex items-center justify-between py-1">
                          <span className="text-sm font-bold text-white flex items-center gap-2">
                            <img src={m.homeLogo || getClubLogo(m.home)} alt="" className="w-5 h-5 object-contain" onError={e => { (e.target as HTMLImageElement).src = getInitialsAvatarUrl(m.home) }} />
                            {m.home}
                          </span>
                          <span className="font-mono text-base font-black text-emerald-400">{m.homeScore}</span>
                        </div>
                        <div className="flex items-center justify-between py-1">
                          <span className="text-sm font-bold text-white flex items-center gap-2">
                            <img src={m.awayLogo || getClubLogo(m.away)} alt="" className="w-5 h-5 object-contain" onError={e => { (e.target as HTMLImageElement).src = getInitialsAvatarUrl(m.away) }} />
                            {m.away}
                          </span>
                          <span className="font-mono text-base font-black text-emerald-400">{m.awayScore}</span>
                        </div>
                      </div>
                    </div>

                    <div className="text-right pl-4 border-l border-white/5 hidden sm:block">
                      <span className="text-xs font-bold text-emerald-400 hover:underline">Match Telemetry →</span>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Bottom High Impact Ad Slot */}
      <div className="mt-8 pt-6 border-t border-white/10 flex justify-center">
        <AdBanner size="rectangle" label="Promoted Betting & Sportsbook Offers" />
      </div>
    </div>
  )
}
