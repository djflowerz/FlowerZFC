import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useApp } from '../context/AppContext'
import AdBanner from '../components/AdBanner'
import { fetchLiveMatches, fetchOnlyLiveMatches, getUserTimezoneInfo, getInitialsAvatarUrl, type LiveMatch } from '../services/liveScoreApi'

function getFormattedDate(offsetDays: number = 0): string {
  const d = new Date()
  d.setDate(d.getDate() + offsetDays)
  const yyyy = d.getFullYear()
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  return `${yyyy}-${mm}-${dd}`
}

function formatDateHeader(dateStr: string): string {
  try {
    let d: Date
    if (dateStr === 'YESTERDAY') d = new Date(getFormattedDate(-1) + 'T00:00:00')
    else if (dateStr === 'TODAY') d = new Date(getFormattedDate(0) + 'T00:00:00')
    else if (dateStr === 'TOMORROW') d = new Date(getFormattedDate(1) + 'T00:00:00')
    else d = new Date(dateStr + 'T00:00:00')

    return d.toLocaleDateString('en-US', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' }).toUpperCase()
  } catch {
    return dateStr
  }
}

// Top Pinned Competitions like LiveScore.com left sidebar
const TOP_PINNED_LEAGUES = [
  { name: 'Premier League', flag: '🏴󠁧󠁢󠁥󠁮󠁧󠁿', region: 'England' },
  { name: 'Champions League', flag: '🇪🇺', region: 'International' },
  { name: 'Europa League', flag: '🇪🇺', region: 'International' },
  { name: 'La Liga', flag: '🇪🇸', region: 'Spain' },
  { name: 'Serie A', flag: '🇮🇹', region: 'Italy' },
  { name: 'Bundesliga', flag: '🇩🇪', region: 'Germany' },
  { name: 'Ligue 1', flag: '🇫🇷', region: 'France' },
  { name: 'KPL — Kenya', flag: '🇰🇪', region: 'Kenya' },
]

export default function Fixtures() {
  const { t } = useApp()
  const navigate = useNavigate()
  
  // Date State
  const [dateTab, setDateTab] = useState<'YESTERDAY' | 'TODAY' | 'TOMORROW' | 'CUSTOM'>('TODAY')
  const [customDate, setCustomDate] = useState<string>(getFormattedDate(0))
  const [showCalendarModal, setShowCalendarModal] = useState(false)
  
  // Filter States (Sidebar & Dropdowns)
  const [selectedRegion, setSelectedRegion] = useState('All Regions')
  const [selectedLeague, setSelectedLeague] = useState('All Competitions')
  const [selectedTeam, setSelectedTeam] = useState('All Teams')
  const [searchQuery, setSearchQuery] = useState('')
  const [liveOnly, setLiveOnly] = useState(false)
  const [starredTeams, setStarredTeams] = useState<Set<string>>(() => {
    try {
      const saved = localStorage.getItem('flowerzfc_starred_teams')
      return saved ? new Set(JSON.parse(saved)) : new Set()
    } catch {
      return new Set()
    }
  })
  
  // Data States
  const [liveRibbonMatches, setLiveRibbonMatches] = useState<LiveMatch[]>([])
  const [fixturesMatches, setFixturesMatches] = useState<LiveMatch[]>([])
  const [loadingFixtures, setLoadingFixtures] = useState(true)
  const [expandedRegions, setExpandedRegions] = useState<Set<string>>(new Set(['England', 'International', 'Spain', 'Germany']))

  const tzInfo = getUserTimezoneInfo()

  // Active Date String for API call
  const activeDateArg = 
    dateTab === 'YESTERDAY' ? 'YESTERDAY' :
    dateTab === 'TODAY' ? 'TODAY' :
    dateTab === 'TOMORROW' ? 'TOMORROW' :
    customDate

  // Fetch Live-Only Ribbon Matches (strictly live === true)
  useEffect(() => {
    // 1. Fetch live matches for the top ticker ribbon
    fetchOnlyLiveMatches().then(setLiveRibbonMatches)

    // 2. Fetch full matches schedule for the selected date
    setLoadingFixtures(true)
    fetchLiveMatches(activeDateArg).then(data => {
      setFixturesMatches(data)
      setLoadingFixtures(false)
      setSelectedTeam('All Teams')
    })
    
    const interval = setInterval(() => {
      fetchOnlyLiveMatches().then(setLiveRibbonMatches)
    }, 15000)
    return () => clearInterval(interval)
  }, [activeDateArg])

  const toggleStarTeam = (teamName: string, e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setStarredTeams(prev => {
      const next = new Set(prev)
      if (next.has(teamName)) next.delete(teamName)
      else next.add(teamName)
      try { localStorage.setItem('flowerzfc_starred_teams', JSON.stringify(Array.from(next))) } catch {}
      return next
    })
  }

  const toggleExpandRegion = (reg: string) => {
    setExpandedRegions(prev => {
      const next = new Set(prev)
      if (next.has(reg)) next.delete(reg)
      else next.add(reg)
      return next
    })
  }

  // Group all loaded matches by Region -> Leagues hierarchy for Left Sidebar
  // Preserves API ordering (insertion order = LiveScore.com ordering)
  const regionHierarchy = fixturesMatches.reduce<Record<string, Record<string, number>>>((acc, m) => {
    const reg = m.region || 'International'
    const lg = m.league || 'General'
    if (!acc[reg]) acc[reg] = {}
    acc[reg][lg] = (acc[reg][lg] || 0) + 1
    return acc
  }, {})

  // Dynamic lists for filter dropdowns (regions sorted A-Z, leagues preserve API order)
  const availableRegions = ['All Regions', ...Object.keys(regionHierarchy).sort()]
  
  const regionFilteredMatches = selectedRegion === 'All Regions' 
    ? fixturesMatches 
    : fixturesMatches.filter(m => (m.region === selectedRegion))

  // Leagues in API order (not alphabetical) for dropdown
  const seenLeagues = new Set<string>()
  const availableLeaguesOrdered: string[] = []
  regionFilteredMatches.forEach(m => {
    if (m.league && !seenLeagues.has(m.league)) {
      seenLeagues.add(m.league)
      availableLeaguesOrdered.push(m.league)
    }
  })
  const availableLeagues = ['All Competitions', ...availableLeaguesOrdered]
  
  const leagueFilteredMatches = selectedLeague === 'All Competitions'
    ? regionFilteredMatches
    : regionFilteredMatches.filter(m => m.league === selectedLeague)

  // Teams list for team filter
  const availableTeamsSet = new Set<string>()
  leagueFilteredMatches.forEach(m => {
    if (m.home) availableTeamsSet.add(m.home)
    if (m.away) availableTeamsSet.add(m.away)
  })
  const availableTeams = ['All Teams', ...Array.from(availableTeamsSet).sort()]

  // Final Filtered Matches for main center display
  const filteredFixtures = leagueFilteredMatches.filter(f => {
    if (selectedTeam !== 'All Teams' && f.home !== selectedTeam && f.away !== selectedTeam) return false
    if (liveOnly && !f.live) return false
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      const matchSearch = f.home.toLowerCase().includes(q) || f.away.toLowerCase().includes(q) || f.league.toLowerCase().includes(q)
      if (!matchSearch) return false
    }
    return true
  })

  // Group filtered fixtures by League, preserving LiveScore API ordering via stageIndex
  // Build ordered array of [leagueName, matches[]] pairs
  const leagueOrderMap = new Map<string, { matches: LiveMatch[], stageIndex: number }>()
  filteredFixtures.forEach(f => {
    const key = f.league
    if (!leagueOrderMap.has(key)) {
      leagueOrderMap.set(key, { matches: [], stageIndex: f.stageIndex ?? 999 })
    }
    leagueOrderMap.get(key)!.matches.push(f)
  })
  // Sort by stageIndex to match LiveScore.com's exact competition order
  const byLeague: Array<[string, LiveMatch[]]> = Array.from(leagueOrderMap.entries())
    .sort((a, b) => a[1].stageIndex - b[1].stageIndex)
    .map(([name, val]) => [name, val.matches])

  return (
    <div className="w-full max-w-none px-3 lg:px-8 py-6 space-y-6">
      {/* Leaderboard Ad Banner */}
      <div className="flex justify-center">
        <AdBanner size="leaderboard" label="Reach 1.2M Football Fans — ads@flowerz.fc" />
      </div>
      
      {/* 1. Strictly LIVE Match Ribbon — FlowerZFC Live Match Center */}
      <div className="rounded-xl p-3 border overflow-hidden" style={{ background: '#0d0d1a', borderColor: '#1e1e32' }}>
        <div className="flex items-center justify-between gap-2 mb-2 px-1">
          <div className="flex items-center gap-2">
            <span className="live-dot bg-emerald-500 animate-pulse" />
            <span className="text-xs font-black tracking-wider text-emerald-400 uppercase font-mono">FlowerZFC Live Match Center</span>
          </div>
          <span className="text-[10px] font-mono text-gray-400 bg-[#131320] px-2 py-0.5 rounded border border-[#2a2a40]">
            🌍 Local Geo Time: {tzInfo.timezone} ({tzInfo.offsetStr})
          </span>
        </div>
        
        {liveRibbonMatches.length === 0 ? (
          <div className="py-2.5 px-3 text-xs text-gray-400 flex items-center gap-2 bg-[#131320] rounded-lg border border-[#1e1e32]">
            <span className="text-emerald-400">⚽</span>
            <span>No matches currently live right now. Full upcoming match schedule listed below:</span>
          </div>
        ) : (
          <div className="ticker-scroll flex gap-3 overflow-x-auto pb-1">
            {liveRibbonMatches.map(m => (
              <Link
                key={m.id}
                to={`/match/${m.id}`}
                className="flex-none flex items-center gap-3 px-4 py-2 rounded-xl bg-[#131320] border border-[#1e1e32] hover:border-emerald-500/40 transition-colors"
                style={{ minWidth: '240px' }}
              >
                <div className="flex items-center gap-1.5 min-w-[80px] justify-end truncate">
                  <span className="text-xs text-gray-200 font-bold truncate">{m.home}</span>
                  <img
                    src={m.homeLogo}
                    alt={m.home}
                    className="w-4 h-4 object-contain"
                    onError={e => { (e.target as HTMLImageElement).src = getInitialsAvatarUrl(m.home) }}
                  />
                </div>
                <div className="text-center shrink-0">
                  <div className="text-white font-black text-sm" style={{ fontFamily: 'Big Shoulders Display' }}>
                    {m.homeScore} – {m.awayScore}
                  </div>
                  <div className="text-[10px] font-bold text-emerald-400">{m.minute}' LIVE</div>
                </div>
                <div className="flex items-center gap-1.5 min-w-[80px] truncate">
                  <img
                    src={m.awayLogo}
                    alt={m.away}
                    className="w-4 h-4 object-contain"
                    onError={e => { (e.target as HTMLImageElement).src = getInitialsAvatarUrl(m.away) }}
                  />
                  <span className="text-xs text-gray-200 font-bold truncate">{m.away}</span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* THREE-COLUMN LAYOUT LIKE LIVESCORE.COM */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* ── LEFT SIDEBAR (Cols 1-3 on Desktop): Top Competitions & Country Tree ── */}
        <div className="lg:col-span-3 space-y-4">
          
          {/* Top / Pinned Competitions */}
          <div className="rounded-xl border border-[#1e1e32] bg-[#131320] p-4 space-y-3">
            <div className="flex items-center justify-between border-b border-[#1e1e32] pb-2">
              <h2 className="text-xs font-black uppercase text-white tracking-wider flex items-center gap-1.5">
                <span>📌</span> Top Competitions
              </h2>
              <span className="text-[10px] text-gray-500 font-bold">Featured</span>
            </div>

            <div className="space-y-1">
              <button
                onClick={() => { setSelectedRegion('All Regions'); setSelectedLeague('All Competitions'); setSelectedTeam('All Teams') }}
                className={`w-full text-left px-3 py-2 rounded-lg text-xs font-bold flex items-center justify-between transition-colors ${selectedRegion === 'All Regions' && selectedLeague === 'All Competitions' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'text-gray-300 hover:bg-white/5'}`}
              >
                <div className="flex items-center gap-2">
                  <span>🌐</span>
                  <span>All Competitions</span>
                </div>
                <span className="text-[10px] text-gray-500">{fixturesMatches.length}</span>
              </button>

              {TOP_PINNED_LEAGUES.map(item => {
                const isSelected = selectedLeague.toLowerCase().includes(item.name.toLowerCase())
                const count = fixturesMatches.filter(m => m.league.toLowerCase().includes(item.name.toLowerCase())).length

                return (
                  <button
                    key={item.name}
                    onClick={() => {
                      setSelectedRegion(item.region)
                      const foundLeague = availableLeagues.find(l => l.toLowerCase().includes(item.name.toLowerCase()))
                      setSelectedLeague(foundLeague || item.name)
                      setSelectedTeam('All Teams')
                    }}
                    className={`w-full text-left px-3 py-2 rounded-lg text-xs font-semibold flex items-center justify-between transition-colors ${isSelected ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 font-bold' : 'text-gray-300 hover:bg-white/5'}`}
                  >
                    <div className="flex items-center gap-2 truncate">
                      <span>{item.flag}</span>
                      <span className="truncate">{item.name}</span>
                    </div>
                    {count > 0 && (
                      <span className="text-[9px] font-bold bg-[#1a1a28] px-1.5 py-0.5 rounded text-emerald-400 border border-emerald-500/20">
                        {count}
                      </span>
                    )}
                  </button>
                )
              })}
            </div>
          </div>

          {/* All Countries / Regions Tree (LiveScore Left Sidebar Layout) */}
          <div className="rounded-xl border border-[#1e1e32] bg-[#131320] p-4 space-y-3 max-h-[600px] overflow-y-auto pr-1">
            <div className="flex items-center justify-between border-b border-[#1e1e32] pb-2">
              <h2 className="text-xs font-black uppercase text-white tracking-wider flex items-center gap-1.5">
                <span>🌍</span> All Regions ({Object.keys(regionHierarchy).length})
              </h2>
              <span className="text-[10px] text-gray-500">Live Feed</span>
            </div>

            <div className="space-y-2">
              {Object.entries(regionHierarchy).map(([regionName, leaguesObj]) => {
                const totalRegionMatches = Object.values(leaguesObj).reduce((a, b) => a + b, 0)
                const isExpanded = expandedRegions.has(regionName)
                const isRegionActive = selectedRegion === regionName

                return (
                  <div key={regionName} className="rounded-lg bg-[#0d0d1e] border border-[#1a1a28] overflow-hidden">
                    <button
                      onClick={() => {
                        setSelectedRegion(regionName)
                        setSelectedLeague('All Competitions')
                        setSelectedTeam('All Teams')
                        toggleExpandRegion(regionName)
                      }}
                      className={`w-full px-3 py-2 text-xs font-bold flex items-center justify-between transition-colors ${isRegionActive ? 'bg-emerald-500/10 text-emerald-400' : 'text-gray-200 hover:bg-white/5'}`}
                    >
                      <div className="flex items-center gap-2 truncate">
                        <span className="text-gray-400 text-[10px]">{isExpanded ? '▼' : '▶'}</span>
                        <span className="truncate">{regionName}</span>
                      </div>
                      <span className="text-[10px] font-mono text-gray-400 bg-[#131320] px-1.5 py-0.5 rounded">
                        {totalRegionMatches}
                      </span>
                    </button>

                    {/* Expandable Leagues List under Country */}
                    {isExpanded && (
                      <div className="bg-[#131320] border-t border-[#1a1a28] px-2 py-1 space-y-0.5">
                        {Object.entries(leaguesObj).map(([lgName, lgCount]) => {
                          const isLgActive = selectedLeague === lgName
                          return (
                            <button
                              key={lgName}
                              onClick={() => {
                                setSelectedRegion(regionName)
                                setSelectedLeague(lgName)
                                setSelectedTeam('All Teams')
                              }}
                              className={`w-full text-left px-3 py-1.5 rounded text-[11px] flex items-center justify-between transition-colors ${isLgActive ? 'text-emerald-400 font-bold bg-emerald-500/15' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}
                            >
                              <span className="truncate">• {lgName}</span>
                              <span className="text-[9px] font-mono text-gray-500">{lgCount}</span>
                            </button>
                          )
                        })}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        </div>

        {/* ── CENTER MAIN CONTENT (Cols 4-9 on Desktop): Date Slider & Fixture List ── */}
        <div className="lg:col-span-6 space-y-5">
          
          {/* Page Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[#131320] p-4 rounded-xl border border-[#1e1e32]">
            <div>
              <h1 className="text-3xl font-black text-white uppercase tracking-tight" style={{ fontFamily: 'Big Shoulders Display' }}>
                {t('fixtures') || 'Match Schedule & Telemetry'}
              </h1>
              <p className="text-xs text-gray-400 mt-0.5">Real-time match schedules, team crests, local kick-off times & live telemetry.</p>
            </div>
            <div className="text-right">
              <span className="text-[10px] font-mono text-emerald-400 bg-[#0d0d1e] px-3 py-1 rounded-full border border-emerald-500/30">
                {formatDateHeader(activeDateArg)}
              </span>
            </div>
          </div>

          {/* Date Selector Bar */}
          <div className="flex items-center gap-2 overflow-x-auto ticker-scroll pb-1">
            <button
              onClick={() => { setDateTab('YESTERDAY'); setSelectedRegion('All Regions'); setSelectedLeague('All Competitions'); setSelectedTeam('All Teams') }}
              className={`flex-none px-4 py-2 text-xs font-bold rounded-xl transition-colors ${dateTab === 'YESTERDAY' ? 'text-black bg-emerald-500 font-extrabold' : 'text-gray-400 bg-[#131320] border border-[#1e1e32] hover:text-white'}`}
            >
              Yesterday ({getFormattedDate(-1)})
            </button>

            <button
              onClick={() => { setDateTab('TODAY'); setSelectedRegion('All Regions'); setSelectedLeague('All Competitions'); setSelectedTeam('All Teams') }}
              className={`flex-none px-4 py-2 text-xs font-bold rounded-xl transition-colors ${dateTab === 'TODAY' ? 'text-black bg-emerald-500 font-extrabold' : 'text-gray-400 bg-[#131320] border border-[#1e1e32] hover:text-white'}`}
            >
              Today ({getFormattedDate(0)})
            </button>

            <button
              onClick={() => { setDateTab('TOMORROW'); setSelectedRegion('All Regions'); setSelectedLeague('All Competitions'); setSelectedTeam('All Teams') }}
              className={`flex-none px-4 py-2 text-xs font-bold rounded-xl transition-colors ${dateTab === 'TOMORROW' ? 'text-black bg-emerald-500 font-extrabold' : 'text-gray-400 bg-[#131320] border border-[#1e1e32] hover:text-white'}`}
            >
              Tomorrow ({getFormattedDate(1)})
            </button>

            {dateTab === 'CUSTOM' && (
              <button
                className="flex-none px-4 py-2 text-xs font-bold rounded-xl text-black bg-emerald-500 font-extrabold"
              >
                Custom: {customDate}
              </button>
            )}

            {/* Calendar Picker Trigger */}
            <button
              onClick={() => setShowCalendarModal(true)}
              className="flex-none flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-gray-300 bg-[#131320] border border-[#1e1e32] rounded-xl hover:text-white transition-colors"
            >
              <span>📅</span>
              <span>Calendar Picker</span>
            </button>
          </div>

          {/* Calendar Picker Modal */}
          {showCalendarModal && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80" onClick={() => setShowCalendarModal(false)}>
              <div className="bg-[#131320] border border-[#1e1e32] rounded-2xl p-6 max-w-sm w-full space-y-4" onClick={e => e.stopPropagation()}>
                <div className="flex justify-between items-center border-b border-[#1e1e32] pb-3">
                  <h3 className="font-black text-white text-base uppercase">Select Matchday Date</h3>
                  <button onClick={() => setShowCalendarModal(false)} className="text-gray-400 hover:text-white">✕</button>
                </div>
                <input
                  type="date"
                  value={customDate}
                  onChange={e => {
                    setCustomDate(e.target.value)
                    setDateTab('CUSTOM')
                    setSelectedRegion('All Regions')
                    setSelectedLeague('All Competitions')
                    setSelectedTeam('All Teams')
                    setShowCalendarModal(false)
                  }}
                  className="w-full bg-[#1a1a28] border border-white/10 text-white rounded-xl p-3 font-mono text-sm outline-none focus:border-emerald-500"
                />
                <button
                  onClick={() => { setDateTab('TODAY'); setShowCalendarModal(false) }}
                  className="w-full py-2.5 bg-emerald-500 text-black font-black text-xs uppercase rounded-xl hover:bg-emerald-400 transition-colors"
                >
                  Reset to Today
                </button>
              </div>
            </div>
          )}

          {/* Control Bar: Search & Select Dropdowns */}
          <div className="flex flex-wrap items-center justify-between gap-3 bg-[#131320] p-4 rounded-xl border border-[#1e1e32]">
            
            {/* Search Team Bar */}
            <div className="flex items-center gap-2 bg-[#1a1a28] border border-[#2a2a40] rounded-xl px-3 py-2 flex-1 min-w-[180px]">
              <span className="text-gray-500 text-sm">🔍</span>
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Search team or league..."
                className="bg-transparent text-xs text-white outline-none w-full placeholder:text-gray-500"
              />
              {searchQuery && <button onClick={() => setSearchQuery('')} className="text-xs text-gray-500 hover:text-white">✕</button>}
            </div>

            {/* Live Only Filter Switch */}
            <label className="flex items-center gap-2 cursor-pointer select-none text-xs font-bold text-gray-300 shrink-0 bg-[#1a1a28] px-3 py-2 rounded-xl border border-[#2a2a40]">
              <input
                type="checkbox"
                checked={liveOnly}
                onChange={e => setLiveOnly(e.target.checked)}
                className="w-4 h-4 rounded accent-emerald-500 cursor-pointer"
              />
              <span>Live Only ({fixturesMatches.filter(m => m.live).length})</span>
            </label>

            {/* Team Dropdown Select */}
            <div className="flex items-center gap-1.5 shrink-0">
              <label className="text-[11px] text-gray-400 font-bold">Team:</label>
              <select
                value={selectedTeam}
                onChange={e => setSelectedTeam(e.target.value)}
                className="bg-[#1a1a28] border border-[#2a2a40] text-xs text-white rounded-xl px-3 py-2 outline-none focus:border-emerald-500 cursor-pointer font-semibold max-w-[150px]"
              >
                {availableTeams.map(tm => (
                  <option key={tm} value={tm}>{tm}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Active Filter Indicators */}
          {(selectedRegion !== 'All Regions' || selectedLeague !== 'All Competitions' || selectedTeam !== 'All Teams' || liveOnly || searchQuery) && (
            <div className="flex items-center gap-2 flex-wrap bg-[#131320] p-3 rounded-xl border border-[#1e1e32]">
              <span className="text-[10px] font-black uppercase text-gray-500">Active Filters:</span>
              {selectedRegion !== 'All Regions' && (
                <span className="text-[10px] bg-emerald-500/20 text-emerald-400 font-bold px-2 py-0.5 rounded border border-emerald-500/30 flex items-center gap-1">
                  Region: {selectedRegion}
                  <button onClick={() => setSelectedRegion('All Regions')} className="hover:text-white">✕</button>
                </span>
              )}
              {selectedLeague !== 'All Competitions' && (
                <span className="text-[10px] bg-emerald-500/20 text-emerald-400 font-bold px-2 py-0.5 rounded border border-emerald-500/30 flex items-center gap-1">
                  League: {selectedLeague}
                  <button onClick={() => setSelectedLeague('All Competitions')} className="hover:text-white">✕</button>
                </span>
              )}
              {selectedTeam !== 'All Teams' && (
                <span className="text-[10px] bg-emerald-500/20 text-emerald-400 font-bold px-2 py-0.5 rounded border border-emerald-500/30 flex items-center gap-1">
                  Team: {selectedTeam}
                  <button onClick={() => setSelectedTeam('All Teams')} className="hover:text-white">✕</button>
                </span>
              )}
              <button
                onClick={() => { setSelectedRegion('All Regions'); setSelectedLeague('All Competitions'); setSelectedTeam('All Teams'); setLiveOnly(false); setSearchQuery('') }}
                className="text-[10px] text-gray-400 hover:text-white underline ml-auto font-bold"
              >
                Clear All Filters
              </button>
            </div>
          )}

          {/* Main Fixtures List Grouped by Competition */}
          <div className="space-y-5">
            {loadingFixtures ? (
              <div className="p-12 text-center rounded-xl bg-[#131320] border border-[#1e1e32]">
                <p className="text-emerald-400 text-sm font-bold animate-pulse">Loading live match schedule from server feed...</p>
              </div>
            ) : byLeague.length === 0 ? (
              <div className="p-12 text-center rounded-xl bg-[#131320] border border-[#1e1e32]">
                <p className="text-gray-400 text-sm">No matches found for date <strong className="text-emerald-400">{formatDateHeader(activeDateArg)}</strong> matching your filters.</p>
                <button onClick={() => { setDateTab('TODAY'); setSelectedRegion('All Regions'); setSelectedLeague('All Competitions'); setSelectedTeam('All Teams'); setLiveOnly(false); setSearchQuery('') }} className="mt-3 text-xs text-emerald-400 font-bold underline">Reset Filters to Today</button>
              </div>
            ) : (
              byLeague.map(([leagueName, matches]) => (
                <div key={leagueName} className="rounded-xl overflow-hidden border" style={{ background: '#131320', borderColor: '#1e1e32' }}>
                  
                  {/* Competition Header */}
                  <div className="px-4 py-3 bg-[#1a1a28] border-b border-[#1e1e32] flex items-center justify-between">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-sm shrink-0">{matches[0]?.flag || '⚽'}</span>
                      <span className="text-xs font-black tracking-wider text-white uppercase font-mono truncate">{leagueName}</span>
                      <span className="text-[10px] text-gray-400 bg-[#131320] px-2 py-0.5 rounded border border-[#2a2a40] shrink-0 hidden sm:inline-block">
                        {matches[0]?.region || 'International'}
                      </span>
                    </div>
                    <span className="text-[10px] text-gray-400 font-bold shrink-0">{matches.length} Matches</span>
                  </div>

                  {/* Match Rows */}
                  <div className="divide-y divide-[#1a1a28]">
                    {matches.map(m => (
                      <div
                        key={m.id}
                        onClick={() => navigate(`/match/${m.id}`)}
                        className="flex items-center justify-between gap-3 p-4 hover:bg-white/5 cursor-pointer transition-colors"
                      >
                        {/* Home Team */}
                        <div className="flex items-center gap-2.5 flex-1 justify-end min-w-0">
                          <button
                            onClick={e => toggleStarTeam(m.home, e)}
                            className={`text-xs ${starredTeams.has(m.home) ? 'text-amber-400' : 'text-gray-600 hover:text-gray-400'}`}
                          >
                            ★
                          </button>
                          <span className="text-xs sm:text-sm font-semibold text-white truncate text-right">{m.home}</span>
                          <img
                            src={m.homeLogo}
                            alt={m.home}
                            className="w-5 h-5 sm:w-6 sm:h-6 object-contain shrink-0"
                            onError={e => { (e.target as HTMLImageElement).src = getInitialsAvatarUrl(m.home) }}
                          />
                        </div>

                        {/* Score / Status */}
                        <div className="shrink-0 text-center w-28 sm:w-32">
                          {/* Show score only when there IS a score (live, FT, AET, AP) */}
                          {m.homeScore !== null && m.awayScore !== null ? (
                            <div className={`text-sm sm:text-base font-black font-mono ${
                              m.live ? 'text-emerald-400' : 'text-white'
                            }`}>
                              {m.homeScore} – {m.awayScore}
                            </div>
                          ) : (
                            // Postponed / Cancelled / NS — show dash
                            (m.status === 'Postponed' || m.status === 'Cancelled' || m.status === 'Suspended' || m.status === 'Abandoned') ? (
                              <div className="text-xs font-mono text-gray-500">— —</div>
                            ) : null
                          )}
                          <span className={`text-[9px] sm:text-[10px] font-bold px-2 py-0.5 rounded ${
                            m.live
                              ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                              : m.status === 'FT' || m.status === 'AET'
                                ? 'bg-[#1e1e32] text-gray-400'
                                : m.status === 'Postponed' || m.status === 'Cancelled' || m.status === 'Abandoned' || m.status === 'Suspended'
                                  ? 'bg-red-500/15 text-red-400 border border-red-500/20'
                                  : m.status === 'HT'
                                    ? 'bg-yellow-500/20 text-yellow-300 border border-yellow-500/30'
                                    : 'bg-[#1a1a28] text-amber-400 border border-amber-500/20'
                          }`}>
                            {m.status}
                          </span>
                        </div>

                        {/* Away Team */}
                        <div className="flex items-center gap-2.5 flex-1 min-w-0">
                          <img
                            src={m.awayLogo}
                            alt={m.away}
                            className="w-5 h-5 sm:w-6 sm:h-6 object-contain shrink-0"
                            onError={e => { (e.target as HTMLImageElement).src = getInitialsAvatarUrl(m.away) }}
                          />
                          <span className="text-xs sm:text-sm font-semibold text-white truncate">{m.away}</span>
                          <button
                            onClick={e => toggleStarTeam(m.away, e)}
                            className={`text-xs ${starredTeams.has(m.away) ? 'text-amber-400' : 'text-gray-600 hover:text-gray-400'}`}
                          >
                            ★
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* ── RIGHT SIDEBAR (Cols 10-12 on Desktop): Starred Teams & Ad Slot ── */}
        <div className="lg:col-span-3 space-y-5">
          
          {/* Starred Teams Panel */}
          <div className="rounded-xl p-4 border bg-[#131320] border-[#1e1e32] space-y-3">
            <div className="flex items-center justify-between border-b border-[#1e1e32] pb-2">
              <h3 className="text-xs font-black uppercase text-white tracking-wider flex items-center gap-1.5">
                <span>⭐</span> Starred Teams ({starredTeams.size})
              </h3>
              <span className="text-[10px] text-gray-500">Quick Access</span>
            </div>
            {starredTeams.size === 0 ? (
              <p className="text-xs text-gray-500 italic">Click ★ beside any team name to favorite it.</p>
            ) : (
              <div className="flex flex-wrap gap-1.5">
                {Array.from(starredTeams).map(tm => (
                  <button
                    key={tm}
                    onClick={() => { setSelectedTeam(tm); setSelectedRegion('All Regions'); setSelectedLeague('All Competitions') }}
                    className="text-xs bg-[#1a1a28] text-amber-400 px-2.5 py-1 rounded-lg border border-amber-500/30 flex items-center gap-1.5 font-semibold hover:border-amber-400 transition-colors"
                  >
                    <span>★</span>
                    <span>{tm}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Ad Slot */}
          <div className="flex justify-center">
            <AdBanner size="rectangle" label="FlowerZFC Premium — Ad Slot" />
          </div>
        </div>
      </div>
    </div>
  )
}
