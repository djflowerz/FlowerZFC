import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useApp } from '../context/AppContext'
import AdBanner from '../components/AdBanner'

interface LocalMatch {
  id: string
  home: string
  away: string
  homeScore?: number
  awayScore?: number
  league: string
  time: string
  live: boolean
}

const LOCAL_MATCHES: LocalMatch[] = [
  { id: 'ea1', home: 'Gor Mahia', away: 'Bandari FC', homeScore: 1, awayScore: 0, league: 'FKF Premier League (Kenya)', time: '15\' LIVE', live: true },
  { id: 'ea2', home: 'Simba SC', away: 'Young Africans (Yanga)', homeScore: 2, awayScore: 2, league: 'Tanzania Ligi Kuu', time: '88\' LIVE', live: true },
  { id: 'ea3', home: 'Vipers SC', away: 'KCCA FC', league: 'Uganda Premier League', time: 'Tomorrow 16:00', live: false },
]

const LOCAL_NEWS = [
  { id: 'a4', tag: 'AFCON', title: 'Harambee Stars Name Strong 26-Man Squad for AFCON Group Stage Battles', date: '8h ago', author: 'Peter Otieno', image: 'https://images.unsplash.com/photo-1560272564-c83b66b1ad12?w=500&h=300&fit=crop&auto=format' },
  { id: 'a8', tag: 'EAST AFRICA', title: 'Tanzania Champions Sign Star Egyptian Playmaker in Record Deal', date: '1d ago', author: 'Moses Achieng', image: 'https://images.unsplash.com/photo-1624880357913-a8539238245b?w=500&h=300&fit=crop&auto=format' },
]

export default function EastAfrica() {
  const { t } = useApp()

  return (
    <div style={{ background: '#0a0a14', minHeight: '100vh', width: '100%' }}>
      {/* Hero Header */}
      <div style={{ background: 'linear-gradient(135deg,#12122a 0%,#0a1a14 100%)', borderBottom: '1px solid #1e1e32' }}>
        <div className="max-w-screen-xl mx-auto px-4 py-8">
          <span className="text-xs font-black uppercase tracking-widest text-[#00b341]">REGIONAL FOOTBALL HUB</span>
          <h1 className="text-4xl font-black text-white" style={{ fontFamily: 'Big Shoulders Display' }}>
            East Africa Football Hub
          </h1>
          <p className="text-xs text-gray-400 mt-1">
            Dedicated coverage for KPL, Tanzania Ligi Kuu, Uganda Premier League & CECAFA competitions.
          </p>
        </div>
      </div>

      <div className="max-w-screen-xl mx-auto px-4 py-8">
        {/* Leaderboard Ad */}
        <div className="mb-8 flex justify-center">
          <AdBanner size="leaderboard" />
        </div>

        {/* Live Regional Scores Strip */}
        <div className="mb-8">
          <div className="flex items-center justify-between border-b pb-2 mb-4" style={{ borderColor: '#1e1e32' }}>
            <h2 className="text-lg font-black text-white uppercase tracking-wider" style={{ fontFamily: 'Big Shoulders Display' }}>
              🌍 Regional Live Scores & Fixtures
            </h2>
            <Link to="/scores" className="text-xs text-[#00b341] font-bold">All Match Scores →</Link>
          </div>

          <div className="grid sm:grid-cols-3 gap-4">
            {LOCAL_MATCHES.map(m => (
              <div key={m.id} className="p-4 rounded-xl border border-[#1e1e32]" style={{ background: '#131320' }}>
                <div className="flex items-center justify-between text-[10px] text-gray-400 mb-2">
                  <span>{m.league}</span>
                  <span className={m.live ? 'text-[#00b341] font-bold' : ''}>{m.time}</span>
                </div>
                <div className="flex items-center justify-between font-bold text-white text-sm">
                  <span>{m.home}</span>
                  <span className="text-base font-black" style={{ fontFamily: 'Big Shoulders Display' }}>
                    {m.homeScore ?? '-'} : {m.awayScore ?? '-'}
                  </span>
                  <span>{m.away}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Local News Grid */}
        <div className="grid lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-6">
            <div className="flex items-center justify-between border-b pb-2" style={{ borderColor: '#1e1e32' }}>
              <h2 className="text-lg font-black text-white uppercase tracking-wider" style={{ fontFamily: 'Big Shoulders Display' }}>
                Regional Headlines
              </h2>
            </div>

            <div className="grid sm:grid-cols-2 gap-5">
              {LOCAL_NEWS.map(a => (
                <Link
                  key={a.id}
                  to={`/news/${a.id}`}
                  className="group rounded-xl overflow-hidden border border-[#1e1e32] hover:border-[#00b341] transition-all"
                  style={{ background: '#131320' }}
                >
                  <img src={a.image} alt={a.title} className="w-full h-44 object-cover" />
                  <div className="p-4">
                    <span className="text-[10px] font-black text-[#00b341] block mb-1">{a.tag}</span>
                    <h3 className="text-base font-bold text-white group-hover:text-[#00b341] transition-colors line-clamp-2" style={{ fontFamily: 'Big Shoulders Display' }}>
                      {a.title}
                    </h3>
                    <p className="text-[11px] text-gray-500 mt-2">{a.author} · {a.date}</p>
                  </div>
                </Link>
              ))}
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            <div className="p-5 rounded-xl border border-[#1e1e32]" style={{ background: '#131320' }}>
              <h3 className="font-black text-white text-base mb-3 uppercase tracking-wider" style={{ fontFamily: 'Big Shoulders Display' }}>
                🏆 KPL Standings Snippet
              </h3>
              <div className="space-y-2 text-xs">
                {[
                  { pos: 1, team: 'Gor Mahia', pts: 62 },
                  { pos: 2, team: 'Tusker FC', pts: 58 },
                  { pos: 3, team: 'Police FC', pts: 54 },
                  { pos: 4, team: 'Bandari FC', pts: 50 },
                ].map(r => (
                  <div key={r.pos} className="flex justify-between p-2 rounded border border-[#1e1e32]" style={{ background: '#0d0d1e' }}>
                    <span className="font-bold text-white">#{r.pos} {r.team}</span>
                    <span className="font-black text-[#00b341]">{r.pts} pts</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Sidebar 300x600 Half Page Ad */}
            <AdBanner size="halfpage" label="East Africa Regional Sponsor — 300×600 Space" />
          </div>
        </div>
      </div>
    </div>
  )
}
