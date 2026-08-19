import { useState, useEffect, useRef, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useApp } from '../context/AppContext'
import AdBanner from '../components/AdBanner'
import { fetchLiveMatches, fetchLiveMatchDetails, fetchMatchH2H, fetchMatchCommentary, type CommentaryEntry, getClubLogo, getInitialsAvatarUrl, type LiveMatch } from '../services/liveScoreApi'

interface MatchRecord {
  id: string
  home: string
  away: string
  homeCountry: string
  awayCountry: string
  homeScore: number
  awayScore: number
  status: string
  league: string
  region: string
  videoUrl: string
  dateStr: string
  venue?: string
  referee?: string
  aggregate?: string
  isPlayed: boolean
  homeLogo?: string
  awayLogo?: string
  homeTeamId?: string
  awayTeamId?: string
  categorySlug?: string
  leagueSlug?: string
  stats?: {
    possessionHome: number
    possessionAway: number
    shotsHome: number
    shotsAway: number
    shotsOnTargetHome: number
    shotsOnTargetAway: number
    cornersHome: number
    cornersAway: number
    foulsHome: number
    foulsAway: number
    yellowCardsHome: number
    yellowCardsAway: number
    redCardsHome: number
    redCardsAway: number
    offsidesHome: number
    offsidesAway: number
  }

  summary: {
    min: string
    team: 'home' | 'away' | 'system'
    text: string
    type: 'goal' | 'card' | 'status' | 'assist'
    score?: string
  }[]

  lineups: {
    confirmed: boolean
    homeFormation: string
    awayFormation: string
    homeStarters: { num: number; name: string; pos: string }[]
    awayStarters: { num: number; name: string; pos: string }[]
    substitutions: { min: string; inNum: number; inName: string; outNum: number; outName: string; side: 'home' | 'away' }[]
    benchHome: { num: number; name: string; pos: string }[]
    benchAway: { num: number; name: string; pos: string }[]
    injuries?: { num: number; name: string; reason: string }[]
    coaches?: { homeCoach?: string; homeCountry?: string; awayCoach?: string; awayCountry?: string }
  }

  h2hGroups: {
    groupTitle: string
    subtitle?: string
    categoryType?: 'h2h' | 'home' | 'away'
    matches: {
      id: string
      date?: string
      home: string
      homeScore: number
      away: string
      awayScore: number
      status?: string
      homeLogo?: string
      awayLogo?: string
    }[]
  }[]
}

const DYNAMIC_MATCHES_DATABASE: Record<string, MatchRecord> = {
  f1: {
    id: 'f1',
    home: 'Paris Saint-Germain',
    away: 'Aston Villa',
    homeCountry: 'France',
    awayCountry: 'England',
    homeScore: 2,
    awayScore: 1,
    status: '77\'',
    league: 'UEFA Super Cup',
    region: 'International',
    videoUrl: '',
    dateStr: '12 Aug 2026',
    isPlayed: true,
    summary: [
      { min: '20\'', team: 'home', text: 'K. Kvaratskhelia (Assist: D. Doué)', type: 'goal', score: '1 - 0' },
      { min: '45\'', team: 'away', text: 'B. Madjo (Assist: J. McGinn)', type: 'goal', score: '1 - 1' },
      { min: 'HT', team: 'system', text: 'Half Time', type: 'status', score: '1 - 1' },
      { min: '51\'', team: 'away', text: 'P. Torres', type: 'card' },
      { min: '61\'', team: 'home', text: 'D. Doué (Assist: O. Dembélé)', type: 'goal', score: '2 - 1' },
      { min: '64\'', team: 'away', text: 'J. Gomes', type: 'card' },
      { min: '73\'', team: 'away', text: 'J. McGinn', type: 'card' },
    ],
    lineups: {
      confirmed: true,
      homeFormation: '4-3-3',
      awayFormation: '4-3-3',
      homeStarters: [
        { num: 39, name: 'Matvey Safonov', pos: 'GK' },
        { num: 25, name: 'Nuno Mendes', pos: 'LB' },
        { num: 51, name: 'Willian Pacho', pos: 'CB' },
        { num: 5, name: 'Marquinhos', pos: 'CB' },
        { num: 2, name: 'Achraf Hakimi', pos: 'RB' },
        { num: 87, name: 'João Neves', pos: 'CM' },
        { num: 17, name: 'Vitinha', pos: 'CM' },
        { num: 33, name: 'Warren Zaïre-Emery', pos: 'CM' },
        { num: 7, name: 'Khvicha Kvaratskhelia', pos: 'LW' },
        { num: 10, name: 'Ousmane Dembélé', pos: 'RW' },
        { num: 14, name: 'Désiré Doué', pos: 'ST' },
      ],
      awayStarters: [
        { num: 1, name: 'Emiliano Martínez', pos: 'GK' },
        { num: 2, name: 'Matty Cash', pos: 'RB' },
        { num: 4, name: 'Ezri Konsa', pos: 'CB' },
        { num: 14, name: 'Pau Torres', pos: 'CB' },
        { num: 12, name: 'Lucas Digne', pos: 'LB' },
        { num: 8, name: 'Tielemans', pos: 'CM' },
        { num: 6, name: 'Barkley', pos: 'CM' },
        { num: 7, name: 'John McGinn', pos: 'RM' },
        { num: 19, name: 'Jaden Philogene', pos: 'LM' },
        { num: 11, name: 'Ollie Watkins', pos: 'ST' },
        { num: 39, name: 'Brian Madjo', pos: 'ST' },
      ],
      substitutions: [],
      benchHome: [{ num: 1, name: 'Donnarumma', pos: 'GK' }],
      benchAway: [{ num: 25, name: 'Olsen', pos: 'GK' }],
    },
    h2hGroups: [
      {
        groupTitle: 'UEFA Super Cup 2026',
        subtitle: 'Parken, Copenhagen',
        matches: [{ id: 'f1', date: '12 Aug 2026', home: 'Paris Saint-Germain', homeScore: 2, away: 'Aston Villa', awayScore: 1, status: 'FT' }],
      },
    ],
  },
}

function liveMatchToRecord(lm: LiveMatch): MatchRecord {
  const liveEps = ['1H', 'HT', '2H', 'ET', 'P', 'FT', 'AET', 'FT_AP', 'AB']
  const st = lm.status || ''
  const isLiveStatus = liveEps.includes(st) ||
    /^\d+['\u2019]/.test(st) ||
    /^\d+\+\d+'/.test(st)
  const isPlayed = lm.live || isLiveStatus ||
    st === 'FT' ||
    (lm.homeScore !== null && (lm.homeScore ?? 0) > 0) ||
    (lm.awayScore !== null && (lm.awayScore ?? 0) > 0)
  return {
    id: lm.id,
    home: lm.home,
    away: lm.away,
    homeCountry: lm.region || 'International',
    awayCountry: lm.region || 'International',
    homeScore: lm.homeScore ?? 0,
    awayScore: lm.awayScore ?? 0,
    status: lm.status || (lm.live ? `${lm.minute}'` : 'Scheduled'),
    league: lm.league || 'Football',
    region: lm.region || '',
    videoUrl: '',
    dateStr: lm.date || '',
    venue: undefined,
    referee: undefined,
    aggregate: lm.aggregate,
    isPlayed: !!isPlayed,
    homeLogo: lm.homeLogo,
    awayLogo: lm.awayLogo,
    homeTeamId: lm.homeTeamId,
    awayTeamId: lm.awayTeamId,
    categorySlug: lm.categorySlug,
    leagueSlug: lm.leagueSlug,
    stats: undefined,
    summary: [],
    lineups: {
      confirmed: false,
      homeFormation: '',
      awayFormation: '',
      homeStarters: [],
      awayStarters: [],
      substitutions: [],
      benchHome: [],
      benchAway: [],
      injuries: [],
      coaches: {}
    },
    h2hGroups: [],
  }
}

export default function MatchDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { t } = useApp()

  const [liveRecord, setLiveRecord] = useState<MatchRecord | null>(null)
  const [loading, setLoading] = useState<boolean>(true)
  
  const isStaticKey = id ? !!DYNAMIC_MATCHES_DATABASE[id] : false
  const staticMatch = isStaticKey ? DYNAMIC_MATCHES_DATABASE[id!] : null
  const match = liveRecord || staticMatch
  
  // Set default active tab: 'info' for unplayed/scheduled matches, 'summary' for live/finished matches
  const [activeTab, setActiveTab] = useState<'info' | 'summary' | 'stats' | 'lineups' | 'h2h'>('info')
  const [summarySubFilter, setSummarySubFilter] = useState<'events' | 'commentary'>('events')
  const [h2hFilter, setH2hFilter] = useState<'h2h' | 'home' | 'away'>('h2h')
  const [commentaryList, setCommentaryList] = useState<CommentaryEntry[]>([])

  // ── Animation State ──────────────────────────────────────────────
  // Track previous scores to detect goals in real-time
  const prevHomeScore = useRef<number>(-1)
  const prevAwayScore = useRef<number>(-1)
  // Goal celebration overlay: 'home' | 'away' | null
  const [goalFlash, setGoalFlash] = useState<{ side: 'home' | 'away'; scorer?: string; score: string } | null>(null)
  // Card flash: yellow | red | null
  const [cardFlash, setCardFlash] = useState<{ type: 'yellow' | 'red'; player: string; team: 'home' | 'away' } | null>(null)
  // Score digit flip animation key (increments on every goal to re-trigger CSS animation)
  const [homeScoreKey, setHomeScoreKey] = useState(0)
  const [awayScoreKey, setAwayScoreKey] = useState(0)
  // Live minute pulse (ticks every second to animate the live dot and minute)
  const [minuteTick, setMinuteTick] = useState(0)

  // Tick every second for the pulsing live dot
  useEffect(() => {
    const t = setInterval(() => setMinuteTick(n => n + 1), 1000)
    return () => clearInterval(t)
  }, [])

  // Detect goal and card events by watching score + summary changes
  const detectGoalAndCard = useCallback((newMatch: MatchRecord) => {
    const hs = newMatch.homeScore
    const as_ = newMatch.awayScore

    if (prevHomeScore.current >= 0 && hs > prevHomeScore.current) {
      // Home goal scored
      setHomeScoreKey(k => k + 1)
      const scorer = newMatch.summary.filter(s => s.type === 'goal' && s.team === 'home').slice(-1)[0]?.text
      setGoalFlash({ side: 'home', scorer, score: `${hs}–${as_}` })
      setTimeout(() => setGoalFlash(null), 5000)
    }
    if (prevAwayScore.current >= 0 && as_ > prevAwayScore.current) {
      // Away goal scored
      setAwayScoreKey(k => k + 1)
      const scorer = newMatch.summary.filter(s => s.type === 'goal' && s.team === 'away').slice(-1)[0]?.text
      setGoalFlash({ side: 'away', scorer, score: `${hs}–${as_}` })
      setTimeout(() => setGoalFlash(null), 5000)
    }

    // Detect new card events
    const lastEvent = newMatch.summary[newMatch.summary.length - 1]
    if (lastEvent?.type === 'card') {
      const isRed = lastEvent.text.includes('🟥') || lastEvent.text.includes('Red')
      setCardFlash({ type: isRed ? 'red' : 'yellow', player: lastEvent.text, team: lastEvent.team as 'home' | 'away' })
      setTimeout(() => setCardFlash(null), 4000)
    }

    prevHomeScore.current = hs
    prevAwayScore.current = as_
  }, [])


  useEffect(() => {
    if (id && summarySubFilter === 'commentary') {
      fetchMatchCommentary(id).then(cmts => setCommentaryList(cmts)).catch(() => setCommentaryList([]))
    }
  }, [id, summarySubFilter])

  // Fetch real match details across TODAY, YESTERDAY & TOMORROW if id is numeric
  useEffect(() => {
    setLiveRecord(null)
    setLoading(!isStaticKey)

    if (id && !isStaticKey) {
      const datesToSearch = ['TODAY', 'TOMORROW', 'YESTERDAY']
      
      const searchNext = async (isPoll = false) => {
        for (const d of datesToSearch) {
          const matches = await fetchLiveMatches(d).catch(() => [])
          const found = matches.find(m => m.id === id)
          if (found) {
            const baseRec = liveMatchToRecord(found)
            
            setLiveRecord(prev => {
              if (!prev) return baseRec
              // Update live score and status seamlessly in real time
              return {
                ...prev,
                homeScore: baseRec.homeScore,
                awayScore: baseRec.awayScore,
                status: baseRec.status,
                isPlayed: baseRec.isPlayed || prev.isPlayed,
                aggregate: baseRec.aggregate || prev.aggregate,
              }
            })

            if (!isPoll) {
              setActiveTab(baseRec.isPlayed ? 'summary' : 'info')
              setLoading(false)
            }

            const dtls = await fetchLiveMatchDetails(id).catch(() => null)
            if (dtls) {
              setLiveRecord(prev => {
                const updated = prev ? {
                  ...prev,
                  homeScore: baseRec.homeScore,
                  awayScore: baseRec.awayScore,
                  status: baseRec.status,
                  referee: dtls.referee || prev.referee,
                  venue: dtls.venue || prev.venue,
                  aggregate: dtls.aggregate || prev.aggregate,
                  summary: dtls.summary.length > 0 ? dtls.summary : prev.summary,
                  stats: dtls.stats || prev.stats,
                  lineups: {
                    ...prev.lineups,
                    ...(dtls.lineups.homeStarters.length > 0 ? {
                      confirmed: dtls.lineups.confirmed,
                      homeStarters: dtls.lineups.homeStarters,
                      awayStarters: dtls.lineups.awayStarters,
                      benchHome: dtls.lineups.benchHome,
                      benchAway: dtls.lineups.benchAway,
                    } : {}),
                    injuries: dtls.lineups.injuries,
                    coaches: dtls.lineups.coaches,
                  },
                  isPlayed: dtls.summary.length > 0 || prev.isPlayed
                } : null
                // Trigger animations when score/events change
                if (updated) detectGoalAndCard(updated)
                return updated
              })
            }

            if (!isPoll) {
              const h2h = await fetchMatchH2H(found.id, found.home, found.away, found.categorySlug, found.leagueSlug).catch(() => null)
              if (h2h) {
                setLiveRecord(prev => prev ? { ...prev, h2hGroups: h2h } : null)
              }
            }
            return
          }
        }
        if (!isPoll) setLoading(false)
      }

      searchNext(false)

      // Auto-poll live match status & events every 8 seconds in real time
      const pollInterval = setInterval(() => {
        searchNext(true)
      }, 8000)

      return () => clearInterval(pollInterval)
    } else {
      setLoading(false)
    }
  }, [id])

  const handleSidebarTeamClick = (teamName: string) => {
    navigate(`/fixtures?search=${encodeURIComponent(teamName)}`)
  }

  const handleSidebarCompClick = (compName: string) => {
    navigate(`/fixtures?league=${encodeURIComponent(compName)}`)
  }

  const handleSidebarRegionClick = (regionName: string) => {
    navigate(`/fixtures?region=${encodeURIComponent(regionName)}`)
  }

  if (loading) {
    return (
      <div className="w-full min-h-screen bg-[#0d0d16] text-white flex flex-col items-center justify-center p-8 font-sans">
        <div className="w-10 h-10 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mb-4" />
        <p className="text-xs font-mono text-gray-400 uppercase tracking-widest">Loading match telemetry...</p>
      </div>
    )
  }

  if (!match) {
    return (
      <div className="w-full min-h-screen bg-[#0d0d16] text-white flex flex-col items-center justify-center p-8 font-sans">
        <div className="text-4xl mb-4">⚽</div>
        <h2 className="text-lg font-bold text-white mb-2">Fixture Telemetry Unavailable</h2>
        <p className="text-xs text-gray-400 mb-6">We could not load details for this match.</p>
        <button onClick={() => navigate('/fixtures')} className="px-4 py-2 bg-emerald-500 text-black font-bold text-xs uppercase rounded hover:bg-emerald-400">
          Back to Fixtures
        </button>
      </div>
    )
  }

  // Available tabs: 3 tabs for unplayed matches, 5 tabs for live/finished matches
  const availableTabs = match.isPlayed ? [
    { id: 'info', label: 'Info' },
    { id: 'summary', label: 'Summary' },
    { id: 'stats', label: 'Stats' },
    { id: 'lineups', label: 'Line-ups' },
    { id: 'h2h', label: 'H2H' },
  ] : [
    { id: 'info', label: 'Info' },
    { id: 'lineups', label: 'Line-ups' },
    { id: 'h2h', label: 'H2H' },
  ]

  return (
    <div className="w-full min-h-screen bg-[#0d0d16] text-white flex flex-col font-sans">
      
      {/* TOP STICKY NAVIGATION BAR WITH BACK BUTTON */}
      <div className="sticky top-14 z-50 bg-[#12121e] border-b border-[#1e1e32] px-4 py-2.5 flex items-center justify-between">
        <button
          onClick={() => navigate('/fixtures')}
          className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-emerald-500 text-black font-black text-xs hover:bg-emerald-400 transition-colors shadow-lg uppercase"
        >
          <span>←</span>
          <span>Back to All Fixtures</span>
        </button>

        <div className="flex items-center gap-4 text-xs font-semibold text-gray-400">
          <button onClick={() => navigate('/scores')} className="hover:text-white transition-colors">Live Scores</button>
          <span>•</span>
          <button onClick={() => navigate('/fixtures')} className="hover:text-white transition-colors">Fixtures</button>
          <span>•</span>
          <button onClick={() => navigate('/standings')} className="hover:text-white transition-colors">Standings</button>
        </div>
      </div>

      <div className="flex flex-1">
        
        {/* ── LEFT SIDEBAR MATCHING LIVESCORE URL SIDEBAR ── */}
        <aside className="w-72 shrink-0 bg-[#131320] border-r border-[#1e1e32] p-4 hidden lg:block space-y-5 text-xs">
          
          {/* Search Box */}
          <div className="flex items-center gap-2 bg-[#1a1a28] border border-[#2a2a40] rounded-lg px-3 py-2">
            <span className="text-gray-500">🔍</span>
            <input
              type="text"
              placeholder="Search..."
              className="bg-transparent text-xs text-white outline-none w-full placeholder:text-gray-500"
            />
          </div>

          {/* TEAMS Section (Exact matches from LiveScore sidebar) */}
          <div className="space-y-2">
            <div className="flex justify-between items-center text-gray-400 font-bold uppercase tracking-wider text-[11px]">
              <span>TEAMS</span>
              <span className="text-[10px]">›</span>
            </div>
            <div className="space-y-1">
              {[
                { name: 'Manchester United', country: 'England', logo: 'https://a.espncdn.com/i/teamlogos/soccer/500/360.png' },
                { name: 'Liverpool', country: 'England', logo: 'https://a.espncdn.com/i/teamlogos/soccer/500/364.png' },
                { name: 'Arsenal', country: 'England', logo: 'https://a.espncdn.com/i/teamlogos/soccer/500/359.png' },
                { name: 'Manchester City', country: 'England', logo: 'https://a.espncdn.com/i/teamlogos/soccer/500/382.png' },
                { name: 'Real Madrid', country: 'Spain', logo: 'https://a.espncdn.com/i/teamlogos/soccer/500/86.png' },
              ].map(tItem => (
                <div
                  key={tItem.name}
                  onClick={() => handleSidebarTeamClick(tItem.name)}
                  className="flex items-center gap-3 p-2 rounded-lg bg-[#1a1a28] hover:bg-emerald-500/20 hover:text-emerald-400 cursor-pointer transition-colors border border-transparent hover:border-emerald-500/30"
                >
                  <img src={tItem.logo} alt={tItem.name} className="w-5 h-5 object-contain" />
                  <div>
                    <div className="font-bold text-xs text-gray-200">{tItem.name}</div>
                    <div className="text-[10px] text-gray-400">{tItem.country}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* COMPETITIONS Section */}
          <div className="space-y-2">
            <div className="flex justify-between items-center text-gray-400 font-bold uppercase tracking-wider text-[11px]">
              <span>COMPETITIONS</span>
              <span className="text-[10px]">›</span>
            </div>
            <div className="space-y-1">
              {[
                { name: 'Premier League', country: 'England', flag: '🏴󠁧󠁢󠁥󠁮󠁧󠁿' },
                { name: 'Serie A', country: 'Italy', flag: '🇮🇹' },
                { name: 'Bundesliga', country: 'Germany', flag: '🇩🇪' },
                { name: 'Ligue 1', country: 'France', flag: '🇫🇷' },
                { name: 'Süper Lig 2025/2026', country: 'Turkiye', flag: '🇹🇷' },
              ].map(c => (
                <div
                  key={c.name}
                  onClick={() => handleSidebarCompClick(c.name)}
                  className="flex items-center gap-3 p-2 rounded-lg bg-[#1a1a28] hover:bg-emerald-500/20 hover:text-emerald-400 cursor-pointer transition-colors border border-transparent hover:border-emerald-500/30"
                >
                  <span className="text-sm">{c.flag}</span>
                  <div>
                    <div className="font-bold text-xs text-gray-200">{c.name}</div>
                    <div className="text-[10px] text-gray-400">{c.country}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* REGION Section */}
          <div className="space-y-2">
            <div className="flex justify-between items-center text-gray-400 font-bold uppercase tracking-wider text-[11px]">
              <span>REGION</span>
              <span className="text-[10px]">›</span>
            </div>
            <div className="space-y-1">
              {[
                { name: 'England', flag: '🏴󠁧󠁢󠁥󠁮󠁧󠁿' },
                { name: 'Champions League', flag: '🏆' },
                { name: 'Spain', flag: '🇪🇸' },
                { name: 'Italy', flag: '🇮🇹' },
                { name: 'Germany', flag: '🇩🇪' },
              ].map(r => (
                <div
                  key={r.name}
                  onClick={() => handleSidebarRegionClick(r.name)}
                  className="flex items-center gap-3 p-2 rounded-lg bg-[#1a1a28] hover:bg-emerald-500/20 hover:text-emerald-400 cursor-pointer transition-colors border border-transparent hover:border-emerald-500/30"
                >
                  <span className="text-sm">{r.flag}</span>
                  <span className="font-bold text-xs text-gray-200">{r.name}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Sidebar Banner Ad */}
          <div className="pt-2 flex justify-center">
            <AdBanner size="skyscraper" label="Match Sponsor" />
          </div>

        </aside>

        {/* ── MAIN CONTENT AREA MATCHING LIVESCORE URL CARD & TABS ── */}
        <main className="flex-1 p-4 lg:p-6 space-y-4 max-w-4xl">
          
          {/* Top Leaderboard Ad */}
          <div className="flex justify-center mb-2">
            <AdBanner size="leaderboard" label="Live Match Sponsor Banner" />
          </div>

          {/* ── GOAL CELEBRATION OVERLAY ── */}
          {goalFlash && (
            <div
              className="fixed inset-0 z-[200] flex items-center justify-center pointer-events-none"
              style={{ animation: 'goalCelebration 5s ease-in-out forwards' }}
            >
              <style>{`
                @keyframes goalCelebration {
                  0%   { opacity: 0; transform: scale(0.5); }
                  10%  { opacity: 1; transform: scale(1.15); }
                  20%  { transform: scale(1); }
                  80%  { opacity: 1; }
                  100% { opacity: 0; transform: scale(0.9); }
                }
                @keyframes scoreFlip {
                  0%   { transform: rotateX(0deg) scale(1); color: white; }
                  30%  { transform: rotateX(-90deg) scale(1.4); color: #00e676; }
                  60%  { transform: rotateX(0deg) scale(1.3); color: #00e676; }
                  100% { transform: rotateX(0deg) scale(1); color: white; }
                }
                @keyframes cardSlideIn {
                  0%   { transform: translateY(-100%) scale(0.8); opacity: 0; }
                  20%  { transform: translateY(0) scale(1.05); opacity: 1; }
                  80%  { transform: translateY(0) scale(1); opacity: 1; }
                  100% { transform: translateY(-100%) scale(0.8); opacity: 0; }
                }
                @keyframes livePulse {
                  0%, 100% { opacity: 1; transform: scale(1); }
                  50%      { opacity: 0.4; transform: scale(0.8); }
                }
              `}</style>
              <div className="bg-[#0a1a0a]/90 backdrop-blur-xl border-2 border-emerald-500 rounded-3xl p-10 text-center shadow-2xl max-w-sm mx-4">
                <div className="text-6xl mb-3">⚽</div>
                <div className="text-3xl font-black text-emerald-400 mb-1">G O A L !</div>
                <div className="text-5xl font-black text-white my-3">{goalFlash.score}</div>
                {goalFlash.scorer && (
                  <div className="text-sm text-emerald-300 font-mono mt-2 line-clamp-2">{goalFlash.scorer.replace(/⚽ Goal: /, '').replace(/\s*\[.*\]/, '')}</div>
                )}
                <div className="text-xs text-gray-400 mt-3 uppercase tracking-widest">
                  {goalFlash.side === 'home' ? match.home : match.away}
                </div>
              </div>
            </div>
          )}

          {/* ── CARD FLASH BANNER ── */}
          {cardFlash && (
            <div
              className="fixed top-20 left-1/2 -translate-x-1/2 z-[199] pointer-events-none"
              style={{ animation: 'cardSlideIn 4s ease-in-out forwards' }}
            >
              <div className={`flex items-center gap-3 px-6 py-3 rounded-xl shadow-2xl border font-bold text-sm ${
                cardFlash.type === 'red'
                  ? 'bg-red-900/95 border-red-500 text-red-200'
                  : 'bg-yellow-900/95 border-yellow-500 text-yellow-200'
              }`}>
                <span className="text-2xl">{cardFlash.type === 'red' ? '🟥' : '🟨'}</span>
                <div>
                  <div className="font-black text-white">{cardFlash.type === 'red' ? 'RED CARD' : 'YELLOW CARD'}</div>
                  <div className="text-xs opacity-80">{cardFlash.player.replace(/🟥|🟨|Red Card:|Yellow Card:/g, '').trim()}</div>
                </div>
              </div>
            </div>
          )}

          {/* 1. MATCH HEADER CARD */}
          <div className="rounded-xl overflow-hidden bg-[#131320] border border-[#1e1e32] shadow-2xl relative">
            
            {/* Left Accent Bar — red pulse when live */}
            <div className={`absolute left-0 top-0 bottom-0 w-1.5 ${
              match.isPlayed && (match.status.includes("'") || match.status === 'HT' || match.status === '1H' || match.status === '2H')
                ? 'bg-red-500' : 'bg-orange-500'
            }`} />

            {/* Competition Sub-Header */}
            <div className="px-6 pt-4 pb-2 flex items-center justify-between border-b border-[#1e1e32]">
              <div className="flex items-center gap-2">
                <span className="text-sm">🏆</span>
                <div>
                  <h3 className="font-black text-white text-xs uppercase font-mono tracking-wider">{match.league}</h3>
                  <p className="text-[10px] text-gray-400">{match.region}</p>
                </div>
              </div>
              <button className="text-gray-400 hover:text-amber-400 text-sm">☆</button>
            </div>

            {/* Scoreboard Grid */}
            <div className="p-6 flex items-center justify-between gap-6">
              
              {/* Home Team */}
              <div className="text-center flex-1">
                <img
                  src={match.homeLogo || getClubLogo(match.home)}
                  alt={match.home}
                  className="w-16 h-16 object-contain mx-auto mb-2"
                  onError={e => { (e.target as HTMLImageElement).src = getInitialsAvatarUrl(match.home) }}
                />
                <h2 className="font-black text-white text-base lg:text-lg tracking-tight">{match.home}</h2>
              </div>

              {/* Score / Kickoff Time Display — ANIMATED */}
              <div className="text-center shrink-0">
                {match.isPlayed ? (
                  <>
                    {/* Score with per-digit flip animation on goals */}
                    <div className="flex items-center gap-1 justify-center mb-0.5" style={{ fontFamily: 'Big Shoulders Display' }}>
                      <span
                        key={`hs-${homeScoreKey}`}
                        className="text-4xl lg:text-5xl font-black"
                        style={{ display: 'inline-block', animation: homeScoreKey > 0 ? 'scoreFlip 0.7s ease-in-out' : 'none' }}
                      >
                        {match.homeScore}
                      </span>
                      <span className="text-4xl lg:text-5xl font-black text-gray-500 mx-1">–</span>
                      <span
                        key={`as-${awayScoreKey}`}
                        className="text-4xl lg:text-5xl font-black"
                        style={{ display: 'inline-block', animation: awayScoreKey > 0 ? 'scoreFlip 0.7s ease-in-out' : 'none' }}
                      >
                        {match.awayScore}
                      </span>
                    </div>
                    {/* Live minute — pulses every second */}
                    {(match.status.includes("'") || match.status === 'HT' || match.status === '1H' || match.status === '2H') ? (
                      <div className="flex items-center justify-center gap-1.5">
                        <span
                          className="w-2 h-2 rounded-full bg-red-500 inline-block"
                          style={{ animation: `livePulse 1s ease-in-out infinite`, animationDelay: `${minuteTick % 2 === 0 ? '0s' : '0.5s'}` }}
                        />
                        <span className="text-xs font-black text-red-400 font-mono">{match.status}</span>
                      </div>
                    ) : (
                      <div className="text-xs font-bold text-amber-400 font-mono">{match.status}</div>
                    )}
                  </>
                ) : (
                  <>
                    {match.aggregate && <div className="text-[10px] text-gray-400 font-mono mb-1">{match.aggregate}</div>}
                    <div className="text-3xl lg:text-4xl font-black text-white mb-0.5 tracking-wider" style={{ fontFamily: 'Big Shoulders Display' }}>
                      {match.status.includes(':') ? match.status : '20:00'}
                    </div>
                    <div className="text-[11px] font-bold text-gray-400 font-mono">Today</div>
                  </>
                )}
              </div>

              {/* Away Team */}
              <div className="text-center flex-1">
                <img
                  src={match.awayLogo || getClubLogo(match.away)}
                  alt={match.away}
                  className="w-16 h-16 object-contain mx-auto mb-2"
                  onError={e => { (e.target as HTMLImageElement).src = getInitialsAvatarUrl(match.away) }}
                />
                <h2 className="font-black text-white text-base lg:text-lg tracking-tight">{match.away}</h2>
              </div>

            </div>
          </div>


          {/* 2. SUB-NAVIGATION TABS (Dynamic: Info | Summary | Stats | Line-ups | H2H) */}
          <div className="border-b border-[#1e1e32] bg-[#131320] rounded-xl px-4">
            <div className="flex gap-8 sm:gap-12 text-xs sm:text-sm font-bold justify-center">
              {availableTabs.map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`py-3.5 transition-colors relative font-mono uppercase tracking-wider ${activeTab === tab.id ? 'text-white font-black' : 'text-gray-400 hover:text-white'}`}
                >
                  {tab.label}
                  {activeTab === tab.id && (
                    <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-emerald-500 rounded-full" />
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* ── TAB 1: INFO (MATCHING LIVESCORE URL IMAGE 2) ── */}
          {activeTab === 'info' && (
            <div className="rounded-xl p-5 bg-[#131320] border border-[#1e1e32] space-y-4 font-sans text-xs">
              <h3 className="text-xs font-black uppercase text-gray-400 tracking-wider">MATCH INFO</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                
                {/* Date */}
                <div className="p-4 rounded-lg bg-[#1a1a28] border border-[#2a2a40] flex items-center gap-3">
                  <span className="text-lg">📅</span>
                  <div>
                    <div className="text-[10px] text-gray-400 uppercase font-mono">Date</div>
                    <div className="font-bold text-white">{match.dateStr}</div>
                  </div>
                </div>

                {/* Referee */}
                <div className="p-4 rounded-lg bg-[#1a1a28] border border-[#2a2a40] flex items-center gap-3">
                  <span className="text-lg">👨‍⚖️</span>
                  <div>
                    <div className="text-[10px] text-gray-400 uppercase font-mono">Referee</div>
                    <div className="font-bold text-white">{match.referee || 'U. Schnyder'}</div>
                  </div>
                </div>

                {/* Venue */}
                <div className="p-4 rounded-lg bg-[#1a1a28] border border-[#2a2a40] flex items-center gap-3">
                  <span className="text-lg">🏟️</span>
                  <div>
                    <div className="text-[10px] text-gray-400 uppercase font-mono">Venue</div>
                    <div className="font-bold text-white">{match.venue || '—'}</div>
                  </div>
                </div>

              </div>
            </div>
          )}

          {/* ── TAB 2: SUMMARY (ONLY FOR PLAYED MATCHES) ── */}
          {activeTab === 'summary' && match.isPlayed && (
            <div className="space-y-4">
              
              {/* Sub-pills: Events | Commentary */}
              <div className="flex gap-2">
                <button
                  onClick={() => setSummarySubFilter('events')}
                  className={`px-4 py-1.5 rounded-full text-xs font-bold font-mono transition-colors ${summarySubFilter === 'events' ? 'bg-white text-black font-black' : 'bg-[#1a1a28] text-gray-400 hover:text-white border border-[#2a2a40]'}`}
                >
                  Events
                </button>
                <button
                  onClick={() => setSummarySubFilter('commentary')}
                  className={`px-4 py-1.5 rounded-full text-xs font-bold font-mono transition-colors ${summarySubFilter === 'commentary' ? 'bg-white text-black font-black' : 'bg-[#1a1a28] text-gray-400 hover:text-white border border-[#2a2a40]'}`}
                >
                  Commentary
                </button>
              </div>

              {/* TIMELINE EVENTS LIST OR COMMENTARY — animated per-event */}
              <style>{`
                @keyframes eventSlideIn {
                  from { opacity: 0; transform: translateX(-16px); }
                  to   { opacity: 1; transform: translateX(0); }
                }
                @keyframes goalGlow {
                  0%, 100% { box-shadow: 0 0 0px #00e676; }
                  50%      { box-shadow: 0 0 18px #00e676, 0 0 32px #00e67640; }
                }
                @keyframes cardGlowYellow {
                  0%, 100% { box-shadow: 0 0 0px #facc15; }
                  50%      { box-shadow: 0 0 14px #facc15, 0 0 28px #facc1540; }
                }
                @keyframes cardGlowRed {
                  0%, 100% { box-shadow: 0 0 0px #ef4444; }
                  50%      { box-shadow: 0 0 14px #ef4444, 0 0 28px #ef444440; }
                }
              `}</style>
              <div className="rounded-xl p-4 bg-[#131320] border border-[#1e1e32] space-y-2.5 font-sans">
                {summarySubFilter === 'events' ? (
                  match.summary.length > 0 ? (
                    match.summary.map((item, idx) => {
                      const isGoal = item.type === 'goal'
                      const isYellow = item.type === 'card' && (item.text.includes('🟨') && !item.text.includes('🟥'))
                      const isRed = item.type === 'card' && item.text.includes('🟥')
                      const isStatus = item.type === 'status'
                      const isHome = item.team === 'home'

                      let rowClass = 'bg-[#1a1a28] border-[#2a2a40]'
                      let animStyle: React.CSSProperties = {
                        animation: `eventSlideIn 0.4s ease-out ${idx * 0.05}s both`
                      }

                      if (isGoal) {
                        rowClass = isHome
                          ? 'bg-emerald-900/30 border-emerald-500/60'
                          : 'bg-emerald-900/30 border-emerald-500/60'
                        animStyle = { ...animStyle, animation: `eventSlideIn 0.4s ease-out ${idx * 0.05}s both, goalGlow 2s ease-in-out 0.4s 3` }
                      } else if (isYellow) {
                        rowClass = 'bg-yellow-900/20 border-yellow-500/50'
                        animStyle = { ...animStyle, animation: `eventSlideIn 0.4s ease-out ${idx * 0.05}s both, cardGlowYellow 1.5s ease-in-out 0.4s 2` }
                      } else if (isRed) {
                        rowClass = 'bg-red-900/20 border-red-500/50'
                        animStyle = { ...animStyle, animation: `eventSlideIn 0.4s ease-out ${idx * 0.05}s both, cardGlowRed 1.5s ease-in-out 0.4s 2` }
                      } else if (isStatus) {
                        rowClass = 'bg-[#11111c] border-gray-600/40'
                      }

                      return (
                        <div
                          key={`${idx}-${item.min}-${item.text.slice(0,10)}`}
                          className={`flex items-center gap-3 p-3 rounded-lg border transition-all ${rowClass}`}
                          style={animStyle}
                        >
                          {/* Minute badge */}
                          <span className={`text-xs font-mono font-black w-10 shrink-0 ${
                            isGoal ? 'text-emerald-400' : isRed ? 'text-red-400' : isYellow ? 'text-yellow-400' : 'text-gray-500'
                          }`}>{item.min}</span>

                          {/* Event icon */}
                          <span className="text-base shrink-0">
                            {isGoal ? '⚽' : isRed ? '🟥' : isYellow ? '🟨' : item.text.includes('🔄') ? '🔄' : item.text.includes('👟') ? '👟' : '•'}
                          </span>

                          {/* Event text */}
                          <div className={`flex-1 text-xs font-bold ${
                            isGoal ? 'text-emerald-300' : isRed ? 'text-red-300' : isYellow ? 'text-yellow-300' : 'text-gray-200'
                          }`}>
                            {item.text.replace(/⚽|🟥|🟨|🔄|👟/g, '').trim()}
                          </div>

                          {/* Score badge for goals */}
                          {item.score && (
                            <span className="ml-auto shrink-0 text-xs font-black bg-emerald-900/60 border border-emerald-500/50 text-emerald-300 px-2 py-0.5 rounded font-mono">
                              {item.score}
                            </span>
                          )}

                          {/* Team side dot */}
                          <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                            item.team === 'home' ? 'bg-emerald-500' : item.team === 'away' ? 'bg-amber-500' : 'bg-gray-600'
                          }`} />
                        </div>
                      )
                    })
                  ) : (
                    <div className="text-center p-8 text-xs text-gray-400 font-mono">
                      {(match.status.includes("'") || match.status === 'HT' || match.status === '1H' || match.status === '2H')
                        ? <><span className="block text-2xl mb-2">⚡</span>Live match in progress — key events will appear here as they happen.</>
                        : 'No timeline events available for this match.'}
                    </div>
                  )
                ) : (
                  /* Commentary sub-tab */
                  commentaryList.length > 0 ? (
                    commentaryList.map((c, idx) => (
                      <div
                        key={idx}
                        className={`flex items-start gap-3 p-3 rounded-lg border ${c.isKeyEvent ? 'bg-amber-500/10 border-amber-500/30' : 'bg-[#1a1a28] border-[#2a2a40]'}`}
                        style={{ animation: `eventSlideIn 0.35s ease-out ${Math.min(idx * 0.03, 0.5)}s both` }}
                      >
                        <span className="text-xs font-mono font-bold text-amber-400 w-12 shrink-0">{c.minute}</span>
                        <p className={`text-xs leading-relaxed ${c.isKeyEvent ? 'font-black text-amber-200' : 'text-gray-300'}`}>{c.text}</p>
                      </div>
                    ))
                  ) : (
                    <div className="text-center p-8 text-xs text-gray-400 font-mono">
                      🎙️ Loading live commentary...
                    </div>
                  )
                )}
              </div>
            </div>
          )}

          {/* ── TAB 3: STATS (OPTA MATCH STATISTICS BARS TABLE) ── */}
          {activeTab === 'stats' && (
            <div className="rounded-xl p-5 bg-[#131320] border border-[#1e1e32] space-y-4 font-sans text-xs">
              <div className="flex justify-between items-center pb-3 border-b border-[#1e1e32]">
                <span className="font-black text-white uppercase font-mono text-xs flex items-center gap-2">
                  <span className="text-emerald-400">📊</span> OPTA MATCH STATISTICS
                </span>
                <div className="flex items-center gap-4 text-xs font-bold">
                  <span className="text-emerald-400">{match.home}</span>
                  <span className="text-gray-500">vs</span>
                  <span className="text-amber-400">{match.away}</span>
                </div>
              </div>

              {match.stats ? (
                <div className="space-y-4">
                  {[
                    { label: 'Goals', homeVal: match.homeScore, awayVal: match.awayScore, isPct: false },
                    { label: 'Possession', homeVal: `${match.stats.possessionHome}%`, awayVal: `${match.stats.possessionAway}%`, homeRaw: match.stats.possessionHome, awayRaw: match.stats.possessionAway, isPct: true },
                    { label: 'Total Shots', homeVal: match.stats.shotsHome, awayVal: match.stats.shotsAway, homeRaw: match.stats.shotsHome, awayRaw: match.stats.shotsAway, isPct: false },
                    { label: 'Shots on target', homeVal: match.stats.shotsOnTargetHome, awayVal: match.stats.shotsOnTargetAway, homeRaw: match.stats.shotsOnTargetHome, awayRaw: match.stats.shotsOnTargetAway, isPct: false },
                    { label: 'Corners won', homeVal: match.stats.cornersHome, awayVal: match.stats.cornersAway, homeRaw: match.stats.cornersHome, awayRaw: match.stats.cornersAway, isPct: false },
                    { label: 'Fouls committed', homeVal: match.stats.foulsHome, awayVal: match.stats.foulsAway, homeRaw: match.stats.foulsHome, awayRaw: match.stats.foulsAway, isPct: false },
                    { label: 'Yellow cards', homeVal: match.stats.yellowCardsHome, awayVal: match.stats.yellowCardsAway, homeRaw: match.stats.yellowCardsHome, awayRaw: match.stats.yellowCardsAway, isPct: false },
                    { label: 'Red cards', homeVal: match.stats.redCardsHome, awayVal: match.stats.redCardsAway, homeRaw: match.stats.redCardsHome, awayRaw: match.stats.redCardsAway, isPct: false },
                    { label: 'Offsides', homeVal: match.stats.offsidesHome, awayVal: match.stats.offsidesAway, homeRaw: match.stats.offsidesHome, awayRaw: match.stats.offsidesAway, isPct: false },
                  ].map((st, idx) => {
                    const hNum = typeof st.homeRaw === 'number' ? st.homeRaw : (typeof st.homeVal === 'number' ? st.homeVal : parseFloat(String(st.homeVal))) || 0
                    const aNum = typeof st.awayRaw === 'number' ? st.awayRaw : (typeof st.awayVal === 'number' ? st.awayVal : parseFloat(String(st.awayVal))) || 0
                    const total = hNum + aNum
                    const hPct = total > 0 ? Math.round((hNum / total) * 100) : 50
                    const aPct = total > 0 ? 100 - hPct : 50

                    return (
                      <div key={idx} className="space-y-1.5 p-3 rounded-lg bg-[#1a1a28] border border-[#2a2a40]">
                        <div className="flex justify-between items-center font-bold text-xs font-mono">
                          <span className="text-emerald-400 font-extrabold w-16">{st.homeVal}</span>
                          <span className="text-gray-300 font-semibold uppercase tracking-wider text-[11px]">{st.label}</span>
                          <span className="text-amber-400 font-extrabold w-16 text-right">{st.awayVal}</span>
                        </div>
                        <div className="h-2 w-full bg-[#11111c] rounded-full overflow-hidden flex p-0.5 border border-[#2a2a40]">
                          <div className="h-full bg-emerald-500 rounded-l-full transition-all duration-500" style={{ width: `${hPct}%` }} />
                          <div className="h-full bg-amber-500 rounded-r-full transition-all duration-500" style={{ width: `${aPct}%` }} />
                        </div>
                      </div>
                    )
                  })}
                </div>
              ) : (
                <div className="text-center p-8 text-xs text-gray-400 font-mono">
                  📊 Match statistics will update as the game progresses
                </div>
              )}
            </div>
          )}

          {/* ── TAB 3: LINE-UPS ── */}
          {activeTab === 'lineups' && (
            <div className="space-y-4 text-xs font-sans">
              
              {/* Referee Section — only shown if data available */}
              {match.referee && (
                <div className="rounded-xl p-5 bg-[#131320] border border-[#1e1e32] space-y-2">
                  <h4 className="font-bold text-gray-400 uppercase tracking-wider text-[11px]">Referee</h4>
                  <div className="flex items-center gap-3 p-3 rounded-lg bg-[#1a1a28] border border-[#2a2a40]">
                    <div className="w-7 h-7 rounded-full bg-gray-700 text-white font-black text-xs flex items-center justify-center">R</div>
                    <span className="font-bold text-white">{match.referee}</span>
                  </div>
                </div>
              )}

              {/* Injuries & Suspensions — only shown if data available */}
              {(match.lineups.injuries?.length ?? 0) > 0 && (
                <div className="rounded-xl p-5 bg-[#131320] border border-[#1e1e32] space-y-3">
                  <h4 className="font-bold text-gray-400 uppercase tracking-wider text-[11px]">Injuries &amp; Suspensions</h4>
                  <div className="space-y-2">
                    {match.lineups.injuries!.map((inj, i) => (
                      <div key={i} className="flex items-center gap-3 p-3 rounded-lg bg-[#1a1a28] border border-[#2a2a40]">
                        <div className="w-6 h-6 rounded-full bg-[#2a2a40] text-gray-300 font-bold text-xs flex items-center justify-center font-mono">
                          {inj.num || '#'}
                        </div>
                        <div>
                          <div className="font-bold text-white">{inj.name}</div>
                          <div className="text-[10px] text-red-400 font-mono">{inj.reason}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Coaches Section — only shown if data available */}
              {(match.lineups.coaches?.homeCoach || match.lineups.coaches?.awayCoach) && (
                <div className="rounded-xl p-5 bg-[#131320] border border-[#1e1e32] space-y-3">
                  <h4 className="font-bold text-gray-400 uppercase tracking-wider text-[11px]">Coaches</h4>
                  <div className="grid grid-cols-2 gap-3">
                    {match.lineups.coaches?.homeCoach && (
                      <div className="flex items-center gap-3 p-3 rounded-lg bg-[#1a1a28] border border-[#2a2a40]">
                        <div className="w-7 h-7 rounded-full bg-gray-700 text-white font-black text-xs flex items-center justify-center">M</div>
                        <div>
                          <div className="font-bold text-white">{match.lineups.coaches.homeCoach}</div>
                          {match.lineups.coaches.homeCountry && <div className="text-[10px] text-gray-400">{match.lineups.coaches.homeCountry}</div>}
                        </div>
                      </div>
                    )}
                    {match.lineups.coaches?.awayCoach && (
                      <div className="flex items-center gap-3 p-3 rounded-lg bg-[#1a1a28] border border-[#2a2a40]">
                        <div className="w-7 h-7 rounded-full bg-gray-700 text-white font-black text-xs flex items-center justify-center">M</div>
                        <div>
                          <div className="font-bold text-white">{match.lineups.coaches.awayCoach}</div>
                          {match.lineups.coaches.awayCountry && <div className="text-[10px] text-gray-400">{match.lineups.coaches.awayCountry}</div>}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Starters (confirmed lineups) */}
              {match.lineups.homeStarters.length > 0 && (
                <div className="rounded-xl p-5 bg-[#131320] border border-[#1e1e32] space-y-3">
                  <h4 className="font-bold text-gray-400 uppercase tracking-wider text-[11px]">Starting XI</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <div className="text-[10px] font-black text-emerald-400 font-mono mb-2">{match.home}</div>
                      {match.lineups.homeStarters.map((p, i) => (
                        <div key={i} className="flex items-center gap-2 p-2 rounded bg-[#1a1a28] border border-[#2a2a40]">
                          <span className="w-5 text-[10px] font-bold text-gray-400 font-mono">{p.num}</span>
                          <span className="text-xs font-bold text-white">{p.name}</span>
                          <span className="ml-auto text-[9px] text-gray-500 font-mono">{p.pos}</span>
                        </div>
                      ))}
                    </div>
                    <div className="space-y-1">
                      <div className="text-[10px] font-black text-amber-400 font-mono mb-2">{match.away}</div>
                      {match.lineups.awayStarters.map((p, i) => (
                        <div key={i} className="flex items-center gap-2 p-2 rounded bg-[#1a1a28] border border-[#2a2a40]">
                          <span className="w-5 text-[10px] font-bold text-gray-400 font-mono">{p.num}</span>
                          <span className="text-xs font-bold text-white">{p.name}</span>
                          <span className="ml-auto text-[9px] text-gray-500 font-mono">{p.pos}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Substitutes / Bench */}
              {(match.lineups.benchHome.length > 0 || match.lineups.benchAway.length > 0) && (
                <div className="rounded-xl p-5 bg-[#131320] border border-[#1e1e32] space-y-3">
                  <h4 className="font-bold text-gray-400 uppercase tracking-wider text-[11px]">Substitutes</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <div className="text-[10px] font-black text-emerald-400 font-mono mb-2">{match.home}</div>
                      {match.lineups.benchHome.map((p, i) => (
                        <div key={i} className="flex items-center gap-2 p-2 rounded bg-[#1a1a28] border border-[#2a2a40]">
                          <span className="w-5 text-[10px] font-bold text-gray-400 font-mono">{p.num || '#'}</span>
                          <span className="text-xs font-bold text-gray-300">{p.name}</span>
                          <span className="ml-auto text-[9px] text-gray-500 font-mono">{p.pos}</span>
                        </div>
                      ))}
                    </div>
                    <div className="space-y-1">
                      <div className="text-[10px] font-black text-amber-400 font-mono mb-2">{match.away}</div>
                      {match.lineups.benchAway.map((p, i) => (
                        <div key={i} className="flex items-center gap-2 p-2 rounded bg-[#1a1a28] border border-[#2a2a40]">
                          <span className="w-5 text-[10px] font-bold text-gray-400 font-mono">{p.num || '#'}</span>
                          <span className="text-xs font-bold text-gray-300">{p.name}</span>
                          <span className="ml-auto text-[9px] text-gray-500 font-mono">{p.pos}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Empty state if no data at all */}
              {!match.referee && (match.lineups.injuries?.length ?? 0) === 0 && !match.lineups.coaches?.homeCoach && match.lineups.homeStarters.length === 0 && match.lineups.benchHome.length === 0 && (
                <div className="rounded-xl p-8 bg-[#131320] border border-[#1e1e32] text-center">
                  <div className="text-2xl mb-2">📋</div>
                  <div className="text-xs text-gray-400">Line-up data will appear closer to kick-off</div>
                </div>
              )}

            </div>
          )}

          {/* ── TAB 4: H2H (MATCHING LIVESCORE URL IMAGE 4) ── */}
          {activeTab === 'h2h' && (
            <div className="space-y-4 text-xs font-sans">
              
              {/* Sub-pills: H2H | [Home Team] | [Away Team] */}
              <div className="flex gap-2">
                <button
                  onClick={() => setH2hFilter('h2h')}
                  className={`px-4 py-1.5 rounded-full text-xs font-bold font-mono transition-colors ${h2hFilter === 'h2h' ? 'bg-white text-black font-black' : 'bg-[#1a1a28] text-gray-400 hover:text-white border border-[#2a2a40]'}`}
                >
                  H2H
                </button>
                <button
                  onClick={() => setH2hFilter('home')}
                  className={`px-4 py-1.5 rounded-full text-xs font-bold font-mono transition-colors ${h2hFilter === 'home' ? 'bg-white text-black font-black' : 'bg-[#1a1a28] text-gray-400 hover:text-white border border-[#2a2a40]'}`}
                >
                  {match.home}
                </button>
                <button
                  onClick={() => setH2hFilter('away')}
                  className={`px-4 py-1.5 rounded-full text-xs font-bold font-mono transition-colors ${h2hFilter === 'away' ? 'bg-white text-black font-black' : 'bg-[#1a1a28] text-gray-400 hover:text-white border border-[#2a2a40]'}`}
                >
                  {match.away}
                </button>
              </div>

              {/* H2H Match List */}
              <div className="rounded-xl p-5 bg-[#131320] border border-[#1e1e32] space-y-3 font-mono">
                {match.h2hGroups && match.h2hGroups.length > 0 ? (
                  match.h2hGroups
                    .filter(grp => {
                      if (grp.categoryType) {
                        return grp.categoryType === h2hFilter
                      }
                      if (h2hFilter === 'home') {
                        return grp.matches.some(m => m.home.toLowerCase().includes(match.home.toLowerCase()) || m.away.toLowerCase().includes(match.home.toLowerCase()))
                      }
                      if (h2hFilter === 'away') {
                        return grp.matches.some(m => m.home.toLowerCase().includes(match.away.toLowerCase()) || m.away.toLowerCase().includes(match.away.toLowerCase()))
                      }
                      return true
                    })
                    .map((grp, i) => (
                      <div key={i} className="p-4 rounded-lg bg-[#1a1a28] border border-[#2a2a40] space-y-2">
                        <div className="flex justify-between items-center font-bold text-emerald-400 text-xs">
                          <span>🏆 {grp.groupTitle}</span>
                          <span className="text-gray-400 text-[10px]">{grp.subtitle}</span>
                        </div>
                        {grp.matches.map(m => (
                          <div key={m.id} className="flex justify-between items-center text-xs text-white p-2 rounded bg-[#131320]">
                            <span className="text-[10px] text-gray-500 w-12">{m.date || 'FT'}</span>
                            <div className="flex-1 flex items-center gap-2">
                              <img src={m.homeLogo || getClubLogo(m.home)} alt={m.home} className="w-4 h-4 object-contain" onError={e => { (e.target as HTMLImageElement).src = getInitialsAvatarUrl(m.home) }} />
                              <span className="font-bold">{m.home}</span>
                            </div>
                            <span className="font-black bg-[#0d0d1e] px-2 py-0.5 rounded border border-[#2a2a40] text-emerald-400">{m.homeScore} - {m.awayScore}</span>
                            <div className="flex-1 flex items-center justify-end gap-2">
                              <span className="font-bold">{m.away}</span>
                              <img src={m.awayLogo || getClubLogo(m.away)} alt={m.away} className="w-4 h-4 object-contain" onError={e => { (e.target as HTMLImageElement).src = getInitialsAvatarUrl(m.away) }} />
                            </div>
                            <span className="text-[10px] text-gray-500 ml-3 font-bold">{m.status || 'FT'}</span>
                          </div>
                        ))}
                      </div>
                    ))
                ) : (
                  <div className="text-center p-8 text-xs text-gray-400 font-sans">
                    <div>📊</div>
                    <div className="mt-2">Head-to-Head data for this fixture will load shortly</div>
                  </div>
                )}
              </div>

            </div>
          )}

          {/* ── TAB 5: STATS (ONLY FOR PLAYED MATCHES) ── */}
          {activeTab === 'stats' && match.isPlayed && (
            <div className="rounded-xl p-5 bg-[#131320] border border-[#1e1e32] space-y-4 text-xs font-mono">
              <h3 className="text-xs font-black uppercase text-gray-400 tracking-wider">MATCH STATISTICS</h3>
              {[
                { name: 'Possession %', home: '58%', away: '42%', valHome: 58, valAway: 42 },
                { name: 'Shots on Target', home: '6', away: '3', valHome: 66, valAway: 34 },
                { name: 'Total Shots', home: '14', away: '8', valHome: 63, valAway: 37 },
              ].map(stat => (
                <div key={stat.name} className="space-y-1 bg-[#1a1a28] p-3 rounded-lg border border-[#2a2a40]">
                  <div className="flex justify-between items-center text-xs font-bold">
                    <span className="text-emerald-400">{stat.home}</span>
                    <span className="text-gray-300 uppercase">{stat.name}</span>
                    <span className="text-amber-400">{stat.away}</span>
                  </div>
                  <div className="flex h-2 rounded-full overflow-hidden bg-[#0d0d1e]">
                    <div className="bg-emerald-500 h-full" style={{ width: `${stat.valHome}%` }} />
                    <div className="bg-amber-500 h-full ml-auto" style={{ width: `${stat.valAway}%` }} />
                  </div>
                </div>
              ))}
            </div>
          )}

        </main>

        {/* ── RIGHT SIDEBAR: BIG ADVERTISEMENT & MATCHDAY WIDGETS ── */}
        <aside className="w-80 shrink-0 hidden xl:block p-4 space-y-5 text-xs bg-[#131320] border-l border-[#1e1e32]">
          
          {/* Big Half Page Ad (300x600) */}
          <div className="space-y-2">
            <div className="text-[10px] font-black text-gray-500 uppercase tracking-widest text-center">ADVERTISEMENT</div>
            <AdBanner size="halfpage" label="Premium Matchday Partner — Reach 1.2M Fans" />
          </div>

          {/* Medium Rectangle Ad (300x250) */}
          <div className="space-y-2">
            <div className="text-[10px] font-black text-gray-500 uppercase tracking-widest text-center">ADVERTISEMENT</div>
            <AdBanner size="rectangle" label="Official Match Sponsor" />
          </div>

          {/* Trending Matchday News Widget */}
          <div className="rounded-xl p-4 bg-[#1a1a28] border border-[#2a2a40] space-y-3">
            <h4 className="font-black text-xs text-white uppercase font-mono tracking-wider">TRENDING NEWS</h4>
            <div className="space-y-3">
              {[
                { title: 'Arsenal qualify for UCL final — Havertz scores winner in 89th min', time: '1h ago', tag: 'CHAMPIONS LEAGUE' },
                { title: 'Real Madrid Close In On €120m Premier League Star Move', time: '3h ago', tag: 'TRANSFERS' },
                { title: 'Harambee Stars Name Squad for AFCON Group Stage Drama', time: '5h ago', tag: 'AFCON 2026' },
              ].map((news, i) => (
                <a key={i} href="#/news" className="block p-2.5 rounded-lg bg-[#131320] border border-[#2a2a40] hover:border-emerald-500/40 transition-colors">
                  <span className="text-[9px] font-bold text-emerald-400 font-mono uppercase">{news.tag}</span>
                  <p className="text-xs font-bold text-gray-200 mt-0.5 leading-snug line-clamp-2">{news.title}</p>
                  <span className="text-[9px] text-gray-500 mt-1 block">{news.time}</span>
                </a>
              ))}
            </div>
          </div>

        </aside>
      </div>
    </div>
  )
}
