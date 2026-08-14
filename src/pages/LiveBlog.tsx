import { useState, useEffect } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { useApp } from '../context/AppContext'
import AdBanner from '../components/AdBanner'

interface TimelineEvent {
  id: string
  minute: number
  type: 'goal' | 'card' | 'var' | 'sub' | 'key' | 'kickoff'
  title: string
  text: string
  team: 'home' | 'away' | 'neutral'
  author: string
  timestamp: string
  isHot?: boolean
}

interface MatchLiveBlogData {
  matchId: string
  homeTeam: string
  homeBadge: string
  awayTeam: string
  awayBadge: string
  competition: string
  venue: string
  status: string
  minute: number
  homeScore: number
  awayScore: number
  events: TimelineEvent[]
}

const LIVE_BLOGS: Record<string, MatchLiveBlogData> = {
  m1: {
    matchId: 'm1',
    homeTeam: 'Arsenal',
    homeBadge: 'ARS',
    awayTeam: 'Chelsea',
    awayBadge: 'CHE',
    competition: 'Premier League · Matchweek 33',
    venue: 'Emirates Stadium, London',
    status: 'LIVE',
    minute: 67,
    homeScore: 2,
    awayScore: 1,
    events: [
      {
        id: 'e6',
        minute: 67,
        type: 'key',
        title: 'CHANCE! Arsenal almost make it three',
        text: 'Martin Ødegaard slips Saka through on the right. Saka cuts inside and unleashes a curling strike towards the far post, but Sánchez tips it over the bar for a corner!',
        team: 'home',
        author: 'James Mwangi',
        timestamp: '23:40',
        isHot: true,
      },
      {
        id: 'e5',
        minute: 54,
        type: 'goal',
        title: '⚽ GOAL! Arsenal 2-1 Chelsea (Kai Havertz)',
        text: 'HAVERTZ POWERS ARSENAL BACK IN FRONT! Martinelli whips in a delightful cross from the left wing, and Havertz ghosted between two defenders to head into the top corner!',
        team: 'home',
        author: 'James Mwangi',
        timestamp: '23:27',
        isHot: true,
      },
      {
        id: 'e4',
        minute: 46,
        type: 'kickoff',
        title: '⏱ SECOND HALF UNDERWAY',
        text: 'The players return to the pitch at the Emirates. No substitutions at half-time for either manager.',
        team: 'neutral',
        author: 'James Mwangi',
        timestamp: '23:18',
      },
      {
        id: 'e3',
        minute: 38,
        type: 'goal',
        title: '⚽ GOAL! Arsenal 1-1 Chelsea (Cole Palmer)',
        text: 'STUNNING EQUALISER BY COLE PALMER! Palmer picks up the ball 25 yards out, shifts onto his left foot, and drives a low rocket into the bottom left corner past David Raya!',
        team: 'away',
        author: 'James Mwangi',
        timestamp: '22:56',
        isHot: true,
      },
      {
        id: 'e2',
        minute: 12,
        type: 'goal',
        title: '⚽ GOAL! Arsenal 1-0 Chelsea (Bukayo Saka)',
        text: 'SAKA OPENS THE SCORING! Ødegaard Threading a sublime eye-of-the-needle pass, and Saka finishes cleanly under the goalkeeper!',
        team: 'home',
        author: 'James Mwangi',
        timestamp: '22:30',
        isHot: true,
      },
      {
        id: 'e1',
        minute: 1,
        type: 'kickoff',
        title: '🚀 KICK-OFF AT THE EMIRATES',
        text: 'Referee Michael Oliver blows the whistle and London derby action is live!',
        team: 'neutral',
        author: 'James Mwangi',
        timestamp: '22:18',
      },
    ],
  },
}

function getFallbackBlog(matchId: string): MatchLiveBlogData {
  return {
    matchId,
    homeTeam: 'Home Club',
    homeBadge: 'HOM',
    awayTeam: 'Away Club',
    awayBadge: 'AWY',
    competition: 'Football Championship',
    venue: 'National Stadium',
    status: 'LIVE',
    minute: 45,
    homeScore: 1,
    awayScore: 0,
    events: [
      {
        id: 'fe1',
        minute: 45,
        type: 'kickoff',
        title: 'Half-time whistle',
        text: 'The referee brings the first half to a close.',
        team: 'neutral',
        author: 'Staff Writer',
        timestamp: '23:00',
      },
    ],
  }
}

export default function LiveBlog() {
  const { matchId = 'm1' } = useParams<{ matchId: string }>()
  const { t } = useApp()
  const navigate = useNavigate()

  const blog = LIVE_BLOGS[matchId] || getFallbackBlog(matchId)
  const [filterType, setFilterType] = useState<string>('all')
  const [isAutoRefreshing, setIsAutoRefreshing] = useState(true)

  // Filter events
  const filteredEvents = blog.events.filter(e => {
    if (filterType === 'all') return true
    if (filterType === 'goals') return e.type === 'goal'
    if (filterType === 'key') return e.type === 'key' || e.type === 'goal' || e.type === 'var'
    return true
  })

  return (
    <div style={{ background: '#0a0a14', minHeight: '100vh', width: '100%' }}>
      {/* Live Match Header Card */}
      <div style={{ background: 'linear-gradient(135deg,#12122a 0%,#0a1a14 100%)', borderBottom: '1px solid #1e1e32' }}>
        <div className="max-w-screen-xl mx-auto px-4 py-8">
          <div className="flex items-center gap-2 mb-4 text-xs text-gray-400">
            <button onClick={() => navigate(-1)} className="hover:text-white transition-colors">← Back</button>
            <span>/</span>
            <Link to="/scores" className="hover:text-white transition-colors">Live Scores</Link>
            <span>/</span>
            <span className="text-white font-bold">Live Text Commentary</span>
          </div>

          <div className="flex items-center justify-between gap-4 mb-4">
            <div>
              <span className="text-xs font-black uppercase tracking-widest text-[#00b341]">
                {blog.competition} · {blog.venue}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-[#00b341] animate-pulse" />
              <span className="text-xs font-black text-[#00b341] uppercase tracking-wider">
                AUTO-UPDATES ON
              </span>
            </div>
          </div>

          {/* Scoreboard Banner */}
          <div className="p-6 rounded-2xl border border-[#1e1e32] flex items-center justify-between gap-4 max-w-3xl mx-auto" style={{ background: '#131320' }}>
            {/* Home */}
            <div className="flex items-center gap-4 flex-1 justify-end text-right">
              <span className="text-xl sm:text-2xl font-black text-white" style={{ fontFamily: 'Big Shoulders Display' }}>
                {blog.homeTeam}
              </span>
              <div className="w-12 h-12 rounded-xl bg-[#00b341]/20 border border-[#00b341] text-white font-black text-sm flex items-center justify-center">
                {blog.homeBadge}
              </div>
            </div>

            {/* Score */}
            <div className="text-center px-4 shrink-0">
              <div className="text-4xl sm:text-5xl font-black text-white tracking-wider" style={{ fontFamily: 'Big Shoulders Display' }}>
                {blog.homeScore} - {blog.awayScore}
              </div>
              <span className="text-xs font-black text-[#00b341] px-2.5 py-0.5 rounded bg-[#00b341]/20 inline-block mt-1">
                • {blog.minute}' LIVE
              </span>
            </div>

            {/* Away */}
            <div className="flex items-center gap-4 flex-1 justify-start">
              <div className="w-12 h-12 rounded-xl bg-blue-500/20 border border-blue-500 text-white font-black text-sm flex items-center justify-center">
                {blog.awayBadge}
              </div>
              <span className="text-xl sm:text-2xl font-black text-white" style={{ fontFamily: 'Big Shoulders Display' }}>
                {blog.awayTeam}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-screen-xl mx-auto px-4 py-8">
        {/* Leaderboard Ad */}
        <div className="mb-8 flex justify-center">
          <AdBanner size="leaderboard" />
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Main Live Feed */}
          <div className="lg:col-span-2 space-y-6">
            {/* Filter Tabs */}
            <div className="flex items-center justify-between border-b pb-3" style={{ borderColor: '#1e1e32' }}>
              <div className="flex gap-2">
                {[
                  { id: 'all', label: 'All Updates' },
                  { id: 'key', label: 'Key Events' },
                  { id: 'goals', label: '⚽ Goals Only' },
                ].map(f => (
                  <button
                    key={f.id}
                    onClick={() => setFilterType(f.id)}
                    className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
                      filterType === f.id ? 'bg-[#00b341] text-white' : 'bg-[#131320] text-gray-400 hover:text-white border border-[#1e1e32]'
                    }`}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
              <span className="text-xs text-gray-500">{filteredEvents.length} posts</span>
            </div>

            {/* Timeline List */}
            <div className="space-y-4">
              {filteredEvents.map(e => (
                <div
                  key={e.id}
                  className={`p-5 rounded-xl border transition-all ${
                    e.isHot ? 'border-[#00b341]/60' : 'border-[#1e1e32]'
                  }`}
                  style={{ background: '#131320' }}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded text-xs font-black bg-[#00b341] text-white" style={{ fontFamily: 'Big Shoulders Display' }}>
                        {e.minute}'
                      </span>
                      <span className="text-xs font-bold text-gray-400">{e.timestamp}</span>
                      {e.isHot && (
                        <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded bg-red-500/20 text-red-400">
                          🔥 KEY MOMENT
                        </span>
                      )}
                    </div>
                    <span className="text-[10px] text-gray-500">Reporter: {e.author}</span>
                  </div>

                  <h3 className="text-base font-bold text-white mb-2" style={{ fontFamily: 'Big Shoulders Display' }}>
                    {e.title}
                  </h3>
                  <p className="text-xs text-gray-300 leading-relaxed">{e.text}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            <div className="sticky top-20 space-y-6">
              {/* Match Details Quick Link */}
              <Link
                to={`/scores/${blog.matchId}`}
                className="block p-5 rounded-xl border border-[#00b341] text-center transition-all hover:bg-white/5"
                style={{ background: '#131320' }}
              >
                <span className="text-2xl mb-1 block">📊</span>
                <h4 className="font-black text-white text-base mb-1" style={{ fontFamily: 'Big Shoulders Display' }}>
                  Full Match Center & Stats
                </h4>
                <p className="text-xs text-gray-400 mb-3">View lineups, pitch diagrams, xG & Head-to-Head.</p>
                <span className="text-xs font-bold text-[#00b341]">Open Match Center →</span>
              </Link>

              {/* Sidebar 300x600 Half Page Ad */}
              <AdBanner size="halfpage" label="Live Match Sponsor — 300×600 Space" />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
