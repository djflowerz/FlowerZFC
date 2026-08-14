import { useState, useMemo } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import AdBanner from '../components/AdBanner'
import { useApp } from '../context/AppContext'

interface PlayerData {
  id: string
  name: string
  shortName: string
  number: number
  position: string
  posGroup: string
  club: string
  clubSlug: string
  clubBadge: string
  nationality: string
  flag: string
  age: number
  height: string
  weight: string
  preferredFoot: 'Right' | 'Left' | 'Both'
  marketValue: string
  photo: string
  status: 'fit' | 'injured' | 'suspended'
  statusDetail: string
  bio: string
  seasonStats: {
    apps: number
    starts: number
    goals: number
    assists: number
    minutes: number
    yellowCards: number
    redCards: number
    passAccuracy: string
    shotsOnTarget: number
    xG: number
  }
  matchLog: {
    date: string
    opponent: string
    score: string
    mins: number
    goals: number
    assists: number
    rating: number
    matchId: string
  }[]
  careerHistory: {
    season: string
    club: string
    apps: number
    goals: number
  }[]
  relatedArticles: {
    id: string
    title: string
    tag: string
    date: string
  }[]
}

const PLAYERS_DATABASE: Record<string, PlayerData> = {
  saka: {
    id: 'saka',
    name: 'Bukayo Saka',
    shortName: 'B. Saka',
    number: 7,
    position: 'Right Winger (RW)',
    posGroup: 'Forwards',
    club: 'Arsenal FC',
    clubSlug: 'arsenal',
    clubBadge: 'ARS',
    nationality: 'England',
    flag: '🏴󠁧󠁢󠁥󠁮󠁧󠁿',
    age: 22,
    height: '178 cm',
    weight: '72 kg',
    preferredFoot: 'Left',
    marketValue: '€140.00m',
    photo: 'https://images.unsplash.com/photo-1522778119026-d647f0596c20?w=600&h=600&fit=crop&auto=format',
    status: 'fit',
    statusDetail: '100% Fit — Available for Selection',
    bio: 'Bukayo Saka is an English professional footballer who plays as a right winger for Premier League club Arsenal and the England national team. Renowned for his tactical intelligence, dribbling mastery, and composure under pressure.',
    seasonStats: {
      apps: 33,
      starts: 31,
      goals: 18,
      assists: 14,
      minutes: 2780,
      yellowCards: 3,
      redCards: 0,
      passAccuracy: '88%',
      shotsOnTarget: 42,
      xG: 16.4,
    },
    matchLog: [
      { date: '10 Aug 2026', opponent: 'vs Chelsea (H)', score: 'W 2-1', mins: 90, goals: 1, assists: 0, rating: 8.8, matchId: 'm1' },
      { date: '03 Aug 2026', opponent: 'vs Fulham (A)', score: 'W 2-0', mins: 84, goals: 1, assists: 1, rating: 8.5, matchId: 'f1' },
      { date: '30 Jul 2026', opponent: 'vs Brentford (H)', score: 'W 4-1', mins: 78, goals: 2, assists: 1, rating: 9.2, matchId: 'f2' },
      { date: '27 Jul 2026', opponent: 'vs Everton (A)', score: 'D 1-1', mins: 90, goals: 0, assists: 1, rating: 7.4, matchId: 'f3' },
    ],
    careerHistory: [
      { season: '2025/26', club: 'Arsenal', apps: 33, goals: 18 },
      { season: '2024/25', club: 'Arsenal', apps: 38, goals: 20 },
      { season: '2023/24', club: 'Arsenal', apps: 35, goals: 15 },
      { season: '2022/23', club: 'Arsenal', apps: 38, goals: 14 },
    ],
    relatedArticles: [
      { id: 'a1', title: 'Arsenal Dominate Derby to Go 3 Points Clear at the Top', tag: 'MATCH REPORT', date: '2h ago' },
      { id: 'a2', title: 'Here We Go: Chelsea Complete £80m Signing from Bundesliga', tag: 'TRANSFERS', date: '4h ago' },
    ]
  },
  haaland: {
    id: 'haaland',
    name: 'Erling Haaland',
    shortName: 'E. Haaland',
    number: 9,
    position: 'Striker (ST)',
    posGroup: 'Forwards',
    club: 'Manchester City',
    clubSlug: 'man-city',
    clubBadge: 'MCI',
    nationality: 'Norway',
    flag: '🇳🇴',
    age: 24,
    height: '194 cm',
    weight: '88 kg',
    preferredFoot: 'Left',
    marketValue: '€180.00m',
    photo: 'https://images.unsplash.com/photo-1570498839593-e565b39455fc?w=600&h=600&fit=crop&auto=format',
    status: 'fit',
    statusDetail: '100% Fit — Match Ready',
    bio: 'Erling Braut Haaland is a Norwegian professional footballer who plays as a striker for Premier League club Manchester City and the Norway national team. Considered one of the best strikers in world football.',
    seasonStats: {
      apps: 31,
      starts: 30,
      goals: 27,
      assists: 5,
      minutes: 2650,
      yellowCards: 2,
      redCards: 0,
      passAccuracy: '76%',
      shotsOnTarget: 68,
      xG: 25.8,
    },
    matchLog: [
      { date: '10 Aug 2026', opponent: 'vs Liverpool (H)', score: 'D 0-0', mins: 90, goals: 0, assists: 0, rating: 6.9, matchId: 'm2' },
      { date: '04 Aug 2026', opponent: 'vs Wolves (A)', score: 'W 3-1', mins: 90, goals: 2, assists: 0, rating: 9.0, matchId: 'm1' },
    ],
    careerHistory: [
      { season: '2025/26', club: 'Man City', apps: 31, goals: 27 },
      { season: '2024/25', club: 'Man City', apps: 35, goals: 31 },
      { season: '2023/24', club: 'Man City', apps: 38, goals: 36 },
      { season: '2022/23', club: 'Dortmund', apps: 30, goals: 29 },
    ],
    relatedArticles: [
      { id: 'a3', title: "Why Pep's High Press Is Struggling Against Low Blocks", tag: 'ANALYSIS', date: '6h ago' },
    ]
  }
}

function getFallbackPlayer(slug: string): PlayerData {
  const name = slug.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')
  return {
    id: slug,
    name: name || 'Football Star',
    shortName: name || 'Player',
    number: 10,
    position: 'Attacking Midfielder (CAM)',
    posGroup: 'Midfielders',
    club: 'Arsenal FC',
    clubSlug: 'arsenal',
    clubBadge: 'ARS',
    nationality: 'Kenya',
    flag: '🇰🇪',
    age: 24,
    height: '182 cm',
    weight: '76 kg',
    preferredFoot: 'Right',
    marketValue: '€45.00m',
    photo: 'https://images.unsplash.com/photo-1517927033932-b3d18e61fb3a?w=600&h=600&fit=crop&auto=format',
    status: 'fit',
    statusDetail: '100% Fit — Available',
    bio: `${name} is a professional footballer playing at the top European level.`,
    seasonStats: {
      apps: 28,
      starts: 25,
      goals: 11,
      assists: 9,
      minutes: 2210,
      yellowCards: 4,
      redCards: 0,
      passAccuracy: '84%',
      shotsOnTarget: 29,
      xG: 9.8,
    },
    matchLog: [
      { date: '10 Aug 2026', opponent: 'vs Chelsea (H)', score: 'W 2-1', mins: 90, goals: 1, assists: 0, rating: 8.2, matchId: 'm1' },
    ],
    careerHistory: [
      { season: '2025/26', club: 'Arsenal FC', apps: 28, goals: 11 },
    ],
    relatedArticles: [
      { id: 'a1', title: 'Arsenal Dominate Derby to Go 3 Points Clear', tag: 'MATCH REPORT', date: '2h ago' }
    ]
  }
}

type Tab = 'overview' | 'matches' | 'career' | 'news'

export default function Player() {
  const { id = 'saka' } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [tab, setTab] = useState<Tab>('overview')

  const player = useMemo(() => PLAYERS_DATABASE[id.toLowerCase()] || getFallbackPlayer(id), [id])

  return (
    <div style={{ background: '#0a0a14', minHeight: '100vh', width: '100%' }}>
      {/* Hero Header */}
      <div style={{ background: 'linear-gradient(135deg,#12122a 0%,#0a1a14 100%)', borderBottom: '1px solid #1e1e32' }}>
        <div className="max-w-screen-xl mx-auto px-4 pt-6 pb-8">
          {/* Breadcrumbs */}
          <div className="flex items-center gap-2 mb-6 text-xs text-gray-400">
            <button onClick={() => navigate(-1)} className="hover:text-white transition-colors">← Back</button>
            <span>/</span>
            <Link to="/standings" className="hover:text-white transition-colors">Standings</Link>
            <span>/</span>
            <Link to={`/club/${player.clubSlug}`} className="hover:text-white transition-colors">{player.club}</Link>
            <span>/</span>
            <span className="text-white font-bold">{player.name}</span>
          </div>

          <div className="flex flex-col md:flex-row items-start md:items-center gap-6">
            {/* Player Photo Card */}
            <div className="relative shrink-0">
              <img
                src={player.photo}
                alt={player.name}
                className="w-28 h-28 sm:w-36 sm:h-36 rounded-2xl object-cover shadow-2xl"
                style={{ border: '2px solid #00b341' }}
              />
              <span
                className="absolute -top-3 -right-3 w-10 h-10 rounded-xl bg-[#00b341] text-white font-black text-lg flex items-center justify-center shadow-lg"
                style={{ fontFamily: 'Big Shoulders Display' }}
              >
                #{player.number}
              </span>
            </div>

            {/* Main Info */}
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1 flex-wrap">
                <span className="text-xs font-black uppercase tracking-widest text-[#00b341]">
                  {player.flag} {player.nationality}
                </span>
                <span className="text-xs text-gray-400">•</span>
                <Link to={`/club/${player.clubSlug}`} className="text-xs font-bold text-gray-300 hover:text-white transition-colors">
                  {player.club} ({player.clubBadge})
                </Link>
              </div>

              <h1 className="text-4xl sm:text-5xl font-black text-white leading-none mb-3" style={{ fontFamily: 'Big Shoulders Display' }}>
                {player.name}
              </h1>

              <div className="flex items-center gap-4 text-xs text-gray-400 flex-wrap">
                <span>📍 {player.position}</span>
                <span>🎂 {player.age} yrs</span>
                <span>📏 {player.height}</span>
                <span>🦶 {player.preferredFoot} Foot</span>
                <span className="text-white font-bold">💎 {player.marketValue}</span>
              </div>
            </div>

            {/* Fitness Status Badge */}
            <div className="px-5 py-4 rounded-xl text-center border w-full md:w-auto shrink-0" style={{ background: '#131320', borderColor: '#1e1e32' }}>
              <span className="text-[10px] font-black uppercase tracking-widest text-gray-400 block mb-1">FITNESS STATUS</span>
              <span className="text-xs font-bold text-[#00b341] flex items-center justify-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-[#00b341] animate-pulse" />
                {player.statusDetail}
              </span>
            </div>
          </div>

          {/* Quick Metrics Bar */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6">
            <div className="rounded-xl px-4 py-3 text-center" style={{ background: '#131320', border: '1px solid #1e1e32' }}>
              <p className="text-3xl font-black text-[#00b341]" style={{ fontFamily: 'Big Shoulders Display' }}>{player.seasonStats.goals}</p>
              <p className="text-[10px] text-gray-400 font-bold uppercase">Goals Scored</p>
            </div>
            <div className="rounded-xl px-4 py-3 text-center" style={{ background: '#131320', border: '1px solid #1e1e32' }}>
              <p className="text-3xl font-black text-blue-400" style={{ fontFamily: 'Big Shoulders Display' }}>{player.seasonStats.assists}</p>
              <p className="text-[10px] text-gray-400 font-bold uppercase">Assists</p>
            </div>
            <div className="rounded-xl px-4 py-3 text-center" style={{ background: '#131320', border: '1px solid #1e1e32' }}>
              <p className="text-3xl font-black text-white" style={{ fontFamily: 'Big Shoulders Display' }}>{player.seasonStats.apps}</p>
              <p className="text-[10px] text-gray-400 font-bold uppercase">Appearances</p>
            </div>
            <div className="rounded-xl px-4 py-3 text-center" style={{ background: '#131320', border: '1px solid #1e1e32' }}>
              <p className="text-3xl font-black text-yellow-400" style={{ fontFamily: 'Big Shoulders Display' }}>{player.seasonStats.xG}</p>
              <p className="text-[10px] text-gray-400 font-bold uppercase">Expected Goals (xG)</p>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div style={{ background: '#0d0d1e', borderBottom: '1px solid #1e1e32' }} className="sticky top-14 z-30">
        <div className="max-w-screen-xl mx-auto px-4 flex gap-1 overflow-x-auto">
          {(['overview', 'matches', 'career', 'news'] as Tab[]).map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-5 py-4 text-xs font-bold capitalize transition-colors relative ${tab === t ? 'text-white' : 'text-gray-400 hover:text-white'}`}
            >
              {t === 'matches' ? 'Match Log' : t === 'career' ? 'Career History' : t.charAt(0).toUpperCase() + t.slice(1)}
              {tab === t && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#00b341]" />}
            </button>
          ))}
        </div>
      </div>

      {/* Main Tab Content */}
      <div className="max-w-screen-xl mx-auto px-4 py-8">
        {tab === 'overview' && (
          <div className="grid lg:grid-cols-3 gap-8">
            {/* Bio & Detailed Stats */}
            <div className="lg:col-span-2 space-y-6">
              {/* Bio Card */}
              <div className="rounded-xl p-6" style={{ background: '#131320', border: '1px solid #1e1e32' }}>
                <h3 className="text-lg font-black text-white mb-3 uppercase tracking-wider" style={{ fontFamily: 'Big Shoulders Display' }}>
                  Player Biography
                </h3>
                <p className="text-xs text-gray-300 leading-relaxed">{player.bio}</p>
              </div>

              {/* Advanced Season Metrics */}
              <div className="rounded-xl p-6" style={{ background: '#131320', border: '1px solid #1e1e32' }}>
                <h3 className="text-lg font-black text-white mb-5 uppercase tracking-wider" style={{ fontFamily: 'Big Shoulders Display' }}>
                  2025/26 Season Breakdown
                </h3>
                <div className="grid sm:grid-cols-2 gap-4">
                  <div className="p-3 rounded-lg border border-[#1e1e32]" style={{ background: '#0d0d1e' }}>
                    <p className="text-[11px] text-gray-500 font-bold uppercase">Pass Accuracy</p>
                    <p className="text-2xl font-black text-white" style={{ fontFamily: 'Big Shoulders Display' }}>{player.seasonStats.passAccuracy}</p>
                  </div>
                  <div className="p-3 rounded-lg border border-[#1e1e32]" style={{ background: '#0d0d1e' }}>
                    <p className="text-[11px] text-gray-500 font-bold uppercase">Shots On Target</p>
                    <p className="text-2xl font-black text-white" style={{ fontFamily: 'Big Shoulders Display' }}>{player.seasonStats.shotsOnTarget}</p>
                  </div>
                  <div className="p-3 rounded-lg border border-[#1e1e32]" style={{ background: '#0d0d1e' }}>
                    <p className="text-[11px] text-gray-500 font-bold uppercase">Total Minutes Played</p>
                    <p className="text-2xl font-black text-white" style={{ fontFamily: 'Big Shoulders Display' }}>{player.seasonStats.minutes} mins</p>
                  </div>
                  <div className="p-3 rounded-lg border border-[#1e1e32]" style={{ background: '#0d0d1e' }}>
                    <p className="text-[11px] text-gray-500 font-bold uppercase">Discipline</p>
                    <p className="text-2xl font-black text-white" style={{ fontFamily: 'Big Shoulders Display' }}>
                      🟨 {player.seasonStats.yellowCards} · 🟥 {player.seasonStats.redCards}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Sidebar Club Card */}
            <div className="space-y-6">
              <div className="rounded-xl p-6" style={{ background: '#131320', border: '1px solid #1e1e32' }}>
                <h3 className="text-base font-black text-white mb-4 uppercase tracking-wider" style={{ fontFamily: 'Big Shoulders Display' }}>
                  Current Club
                </h3>
                <Link to={`/club/${player.clubSlug}`} className="flex items-center gap-4 p-3 rounded-lg border border-[#1e1e32] hover:bg-white/5 transition-colors">
                  <div className="w-12 h-12 rounded-xl bg-[#00b341]/20 border border-[#00b341] text-white font-black text-sm flex items-center justify-center">
                    {player.clubBadge}
                  </div>
                  <div>
                    <p className="text-sm font-bold text-white">{player.club}</p>
                    <span className="text-xs text-[#00b341]">View Club Profile →</span>
                  </div>
                </Link>
              </div>

              {/* Sidebar 300x600 Half Page Ad */}
              <div className="flex justify-center">
                <AdBanner size="halfpage" label="Player Gear & Boots Sponsor" />
              </div>
            </div>
          </div>
        )}

        {tab === 'matches' && (
          <div className="rounded-xl overflow-hidden" style={{ background: '#131320', border: '1px solid #1e1e32' }}>
            <div className="p-5 border-b" style={{ borderColor: '#1e1e32' }}>
              <h3 className="text-base font-black text-white uppercase tracking-wider" style={{ fontFamily: 'Big Shoulders Display' }}>
                Recent Match Logs
              </h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse" style={{ minWidth: '600px' }}>
                <thead>
                  <tr className="border-b text-[10px] text-gray-500 uppercase font-black" style={{ borderColor: '#1e1e32', background: '#0d0d1e' }}>
                    <th className="p-4">Date</th>
                    <th className="p-4">Opponent</th>
                    <th className="p-4">Result</th>
                    <th className="p-4 text-center">Mins</th>
                    <th className="p-4 text-center">Goals</th>
                    <th className="p-4 text-center">Assists</th>
                    <th className="p-4 text-center">Rating</th>
                  </tr>
                </thead>
                <tbody>
                  {player.matchLog.map((m, i) => (
                    <tr key={i} className="border-b text-xs transition-colors hover:bg-white/5" style={{ borderColor: '#1e1e32' }}>
                      <td className="p-4 text-gray-400">{m.date}</td>
                      <td className="p-4 font-bold text-white">{m.opponent}</td>
                      <td className="p-4 text-[#00b341] font-bold">{m.score}</td>
                      <td className="p-4 text-center text-gray-300">{m.mins}'</td>
                      <td className="p-4 text-center font-bold text-[#00b341]">{m.goals}</td>
                      <td className="p-4 text-center font-bold text-blue-400">{m.assists}</td>
                      <td className="p-4 text-center">
                        <span className="px-2 py-1 rounded bg-[#00b341]/20 text-[#00b341] font-black">{m.rating}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {tab === 'career' && (
          <div className="rounded-xl overflow-hidden" style={{ background: '#131320', border: '1px solid #1e1e32' }}>
            <div className="p-5 border-b" style={{ borderColor: '#1e1e32' }}>
              <h3 className="text-base font-black text-white uppercase tracking-wider" style={{ fontFamily: 'Big Shoulders Display' }}>
                Senior Career Breakdown
              </h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b text-[10px] text-gray-500 uppercase font-black" style={{ borderColor: '#1e1e32', background: '#0d0d1e' }}>
                    <th className="p-4">Season</th>
                    <th className="p-4">Club</th>
                    <th className="p-4 text-center">Apps</th>
                    <th className="p-4 text-center">Goals</th>
                  </tr>
                </thead>
                <tbody>
                  {player.careerHistory.map((c, i) => (
                    <tr key={i} className="border-b text-xs transition-colors hover:bg-white/5" style={{ borderColor: '#1e1e32' }}>
                      <td className="p-4 font-bold text-white">{c.season}</td>
                      <td className="p-4 text-gray-300">{c.club}</td>
                      <td className="p-4 text-center text-gray-300">{c.apps}</td>
                      <td className="p-4 text-center font-bold text-[#00b341]">{c.goals}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {tab === 'news' && (
          <div className="grid sm:grid-cols-2 gap-4">
            {player.relatedArticles.map(a => (
              <Link key={a.id} to={`/news/${a.id}`} className="p-5 rounded-xl border border-[#1e1e32] hover:border-[#00b341] transition-all" style={{ background: '#131320' }}>
                <span className="text-[9px] font-black text-[#00b341] uppercase tracking-wider block mb-1">{a.tag}</span>
                <h4 className="text-sm font-bold text-white mb-2">{a.title}</h4>
                <span className="text-[10px] text-gray-500">{a.date}</span>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
