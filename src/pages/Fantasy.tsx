import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useApp } from '../context/AppContext'
import AdBanner from '../components/AdBanner'

interface FantasyPlayer {
  id: string
  name: string
  club: string
  pos: 'GK' | 'DEF' | 'MID' | 'FWD'
  price: number // in millions
  points: number
  selected?: boolean
  isCaptain?: boolean
}

const FANTASY_PLAYERS_POOL: FantasyPlayer[] = [
  // GKs
  { id: 'f_raya', name: 'David Raya', club: 'Arsenal', pos: 'GK', price: 5.5, points: 142 },
  { id: 'f_alisson', name: 'Alisson', club: 'Liverpool', pos: 'GK', price: 5.8, points: 135 },
  // Defenders
  { id: 'f_saliba', name: 'William Saliba', club: 'Arsenal', pos: 'DEF', price: 6.0, points: 156 },
  { id: 'f_trent', name: 'Trent Alexander-Arnold', club: 'Liverpool', pos: 'DEF', price: 7.5, points: 168 },
  { id: 'f_dias', name: 'Rúben Dias', club: 'Man City', pos: 'DEF', price: 6.2, points: 140 },
  { id: 'f_white', name: 'Ben White', club: 'Arsenal', pos: 'DEF', price: 5.8, points: 138 },
  // Midfielders
  { id: 'f_saka', name: 'Bukayo Saka', club: 'Arsenal', pos: 'MID', price: 10.0, points: 215 },
  { id: 'f_palmer', name: 'Cole Palmer', club: 'Chelsea', pos: 'MID', price: 10.5, points: 228 },
  { id: 'f_kdb', name: 'Kevin De Bruyne', club: 'Man City', pos: 'MID', price: 10.2, points: 180 },
  { id: 'f_odegaard', name: 'Martin Ødegaard', club: 'Arsenal', pos: 'MID', price: 8.5, points: 175 },
  { id: 'f_rice', name: 'Declan Rice', club: 'Arsenal', pos: 'MID', price: 6.5, points: 150 },
  // Forwards
  { id: 'f_haaland', name: 'Erling Haaland', club: 'Man City', pos: 'FWD', price: 15.0, points: 245 },
  { id: 'f_salah', name: 'Mohamed Salah', club: 'Liverpool', pos: 'FWD', price: 12.5, points: 230 },
  { id: 'f_havertz', name: 'Kai Havertz', club: 'Arsenal', pos: 'FWD', price: 8.0, points: 162 },
]

export default function Fantasy() {
  const { t, user } = useApp()
  const [squad, setSquad] = useState<FantasyPlayer[]>([
    FANTASY_PLAYERS_POOL[0], // Raya
    FANTASY_PLAYERS_POOL[2], // Saliba
    FANTASY_PLAYERS_POOL[3], // Trent
    FANTASY_PLAYERS_POOL[6], // Saka (c)
    FANTASY_PLAYERS_POOL[7], // Palmer
    FANTASY_PLAYERS_POOL[11], // Haaland
  ])
  const [captainId, setCaptainId] = useState('f_saka')
  const [activeTab, setActiveTab] = useState<'squad' | 'transfers' | 'leagues'>('squad')
  const [filterPos, setFilterPos] = useState<'ALL' | 'GK' | 'DEF' | 'MID' | 'FWD'>('ALL')

  const totalCost = squad.reduce((sum, p) => sum + p.price, 0)
  const remainingBudget = 100.0 - totalCost
  const totalPoints = squad.reduce((sum, p) => sum + (p.id === captainId ? p.points * 2 : p.points), 0)

  const togglePlayerInSquad = (player: FantasyPlayer) => {
    const exists = squad.some(p => p.id === player.id)
    if (exists) {
      setSquad(prev => prev.filter(p => p.id !== player.id))
    } else {
      if (squad.length >= 11) return alert('Squad is full! Maximum 11 players.')
      if (remainingBudget < player.price) return alert('Not enough budget remaining!')
      setSquad(prev => [...prev, player])
    }
  }

  const availablePool = FANTASY_PLAYERS_POOL.filter(p => filterPos === 'ALL' || p.pos === filterPos)

  return (
    <div style={{ background: '#0a0a14', minHeight: '100vh', width: '100%' }}>
      {/* Header Banner */}
      <div style={{ background: 'linear-gradient(135deg,#12122a 0%,#0a1a14 100%)', borderBottom: '1px solid #1e1e32' }}>
        <div className="max-w-screen-xl mx-auto px-4 py-8">
          <div className="flex flex-col sm:flex-row items-start sm:items-end justify-between gap-4">
            <div>
              <span className="text-xs font-black uppercase tracking-widest text-[#00b341]">FLOWERZFC FANTASY LEAGUE</span>
              <h1 className="text-4xl font-black text-white" style={{ fontFamily: 'Big Shoulders Display' }}>
                Gameweek 33 Manager
              </h1>
            </div>

            {/* Quick Stats Bar */}
            <div className="flex items-center gap-3 flex-wrap">
              <div className="px-4 py-2 rounded-xl text-center border border-[#1e1e32]" style={{ background: '#131320' }}>
                <span className="text-[10px] text-gray-500 font-black uppercase block">Total Points</span>
                <span className="text-2xl font-black text-[#00b341]" style={{ fontFamily: 'Big Shoulders Display' }}>{totalPoints} pts</span>
              </div>
              <div className="px-4 py-2 rounded-xl text-center border border-[#1e1e32]" style={{ background: '#131320' }}>
                <span className="text-[10px] text-gray-500 font-black uppercase block">Remaining Budget</span>
                <span className="text-2xl font-black text-white" style={{ fontFamily: 'Big Shoulders Display' }}>€{remainingBudget.toFixed(1)}m</span>
              </div>
              <div className="px-4 py-2 rounded-xl text-center border border-[#1e1e32]" style={{ background: '#131320' }}>
                <span className="text-[10px] text-gray-500 font-black uppercase block">Deadline</span>
                <span className="text-2xl font-black text-yellow-400" style={{ fontFamily: 'Big Shoulders Display' }}>SAT 11:30</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-screen-xl mx-auto px-4 py-8">
        {/* Navigation Tabs */}
        <div className="flex gap-2 mb-8 border-b pb-3" style={{ borderColor: '#1e1e32' }}>
          {[
            { id: 'squad', label: 'My XI Squad' },
            { id: 'transfers', label: 'Player Market' },
            { id: 'leagues', label: 'Mini-Leagues & Ranks' },
          ].map(t => (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id as any)}
              className={`px-4 py-2 text-xs font-bold rounded-lg transition-all ${
                activeTab === t.id ? 'bg-[#00b341] text-white' : 'bg-[#131320] text-gray-400 hover:text-white border border-[#1e1e32]'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Leaderboard Ad */}
        <div className="mb-8 flex justify-center">
          <AdBanner size="leaderboard" />
        </div>

        {activeTab === 'squad' && (
          <div className="grid lg:grid-cols-3 gap-8">
            {/* Pitch Visualizer Column */}
            <div className="lg:col-span-2">
              <div
                className="relative rounded-2xl p-6 overflow-hidden flex flex-col justify-between shadow-2xl min-h-[500px]"
                style={{
                  background: 'linear-gradient(180deg, #134e2a 0%, #0c331b 100%)',
                  border: '3px solid #00b341',
                }}
              >
                {/* Center Pitch Lines */}
                <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 border-t-2 border-white/20 pointer-events-none" />
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <div className="w-40 h-40 rounded-full border-2 border-white/20" />
                </div>

                <div className="relative z-10 space-y-8">
                  {/* Forwards */}
                  <div className="flex justify-center gap-6">
                    {squad.filter(p => p.pos === 'FWD').map(p => (
                      <div key={p.id} className="flex flex-col items-center">
                        <div
                          onClick={() => setCaptainId(p.id)}
                          className="w-12 h-12 rounded-full bg-[#131320] border-2 border-white text-white flex items-center justify-center font-bold text-sm shadow-xl cursor-pointer hover:border-[#00b341]"
                        >
                          ⚽
                        </div>
                        <span className="text-[10px] font-black text-white bg-black/80 px-2 py-0.5 rounded mt-1">
                          {p.name} {p.id === captainId ? '(C)' : ''}
                        </span>
                        <span className="text-[9px] text-[#00b341] font-bold">{p.points * (p.id === captainId ? 2 : 1)} pts</span>
                      </div>
                    ))}
                  </div>

                  {/* Midfielders */}
                  <div className="flex justify-center gap-6">
                    {squad.filter(p => p.pos === 'MID').map(p => (
                      <div key={p.id} className="flex flex-col items-center">
                        <div
                          onClick={() => setCaptainId(p.id)}
                          className="w-12 h-12 rounded-full bg-[#131320] border-2 border-white text-white flex items-center justify-center font-bold text-sm shadow-xl cursor-pointer hover:border-[#00b341]"
                        >
                          🏃
                        </div>
                        <span className="text-[10px] font-black text-white bg-black/80 px-2 py-0.5 rounded mt-1">
                          {p.name} {p.id === captainId ? '(C)' : ''}
                        </span>
                        <span className="text-[9px] text-[#00b341] font-bold">{p.points * (p.id === captainId ? 2 : 1)} pts</span>
                      </div>
                    ))}
                  </div>

                  {/* Defenders */}
                  <div className="flex justify-center gap-6">
                    {squad.filter(p => p.pos === 'DEF').map(p => (
                      <div key={p.id} className="flex flex-col items-center">
                        <div
                          onClick={() => setCaptainId(p.id)}
                          className="w-12 h-12 rounded-full bg-[#131320] border-2 border-white text-white flex items-center justify-center font-bold text-sm shadow-xl cursor-pointer hover:border-[#00b341]"
                        >
                          🛡️
                        </div>
                        <span className="text-[10px] font-black text-white bg-black/80 px-2 py-0.5 rounded mt-1">
                          {p.name} {p.id === captainId ? '(C)' : ''}
                        </span>
                        <span className="text-[9px] text-[#00b341] font-bold">{p.points * (p.id === captainId ? 2 : 1)} pts</span>
                      </div>
                    ))}
                  </div>

                  {/* Goalkeeper */}
                  <div className="flex justify-center">
                    {squad.filter(p => p.pos === 'GK').map(p => (
                      <div key={p.id} className="flex flex-col items-center">
                        <div
                          onClick={() => setCaptainId(p.id)}
                          className="w-12 h-12 rounded-full bg-yellow-500 text-black border-2 border-white flex items-center justify-center font-bold text-sm shadow-xl cursor-pointer"
                        >
                          🧤
                        </div>
                        <span className="text-[10px] font-black text-white bg-black/80 px-2 py-0.5 rounded mt-1">
                          {p.name} {p.id === captainId ? '(C)' : ''}
                        </span>
                        <span className="text-[9px] text-[#00b341] font-bold">{p.points * (p.id === captainId ? 2 : 1)} pts</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Selected Roster Summary */}
            <div className="space-y-4">
              <div className="rounded-xl p-5" style={{ background: '#131320', border: '1px solid #1e1e32' }}>
                <h3 className="font-black text-white text-base mb-3 uppercase tracking-wider" style={{ fontFamily: 'Big Shoulders Display' }}>
                  Selected Squad ({squad.length}/11)
                </h3>
                <p className="text-xs text-gray-400 mb-4">Click a player to designate Captain (2x Points).</p>

                <div className="space-y-2">
                  {squad.map(p => (
                    <div key={p.id} className="flex items-center justify-between p-2.5 rounded-lg border border-[#1e1e32]" style={{ background: '#0d0d1e' }}>
                      <div>
                        <span className="text-xs font-bold text-white block">
                          {p.name} {p.id === captainId ? '👑 (C)' : ''}
                        </span>
                        <span className="text-[10px] text-gray-500">{p.club} · {p.pos}</span>
                      </div>
                      <div className="text-right">
                        <span className="text-xs font-bold text-[#00b341] block">€{p.price}m</span>
                        <button onClick={() => togglePlayerInSquad(p)} className="text-[10px] text-red-400 hover:text-red-300">
                          Remove
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Sidebar 300x600 Half Page Ad */}
              <div className="flex justify-center">
                <AdBanner size="halfpage" label="Fantasy League Title Sponsor" />
              </div>
            </div>
          </div>
        )}

        {activeTab === 'transfers' && (
          <div className="space-y-6">
            {/* Position filter */}
            <div className="flex gap-2">
              {(['ALL', 'GK', 'DEF', 'MID', 'FWD'] as const).map(pos => (
                <button
                  key={pos}
                  onClick={() => setFilterPos(pos)}
                  className={`px-3 py-1.5 text-xs font-bold rounded-lg ${
                    filterPos === pos ? 'bg-[#00b341] text-white' : 'bg-[#131320] text-gray-400 border border-[#1e1e32]'
                  }`}
                >
                  {pos}
                </button>
              ))}
            </div>

            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {availablePool.map(p => {
                const isSelected = squad.some(sq => sq.id === p.id)
                return (
                  <div key={p.id} className="p-4 rounded-xl border border-[#1e1e32] flex items-center justify-between" style={{ background: '#131320' }}>
                    <div>
                      <span className="text-[9px] font-black text-[#00b341] block">{p.pos} · {p.club}</span>
                      <h4 className="text-sm font-bold text-white">{p.name}</h4>
                      <span className="text-xs text-gray-400">{p.points} total pts</span>
                    </div>

                    <div className="text-right">
                      <span className="text-sm font-black text-white block" style={{ fontFamily: 'Big Shoulders Display' }}>€{p.price}m</span>
                      <button
                        onClick={() => togglePlayerInSquad(p)}
                        className={`mt-1 px-3 py-1 text-xs font-bold rounded transition-colors ${
                          isSelected ? 'bg-red-500 text-white' : 'bg-[#00b341] text-white'
                        }`}
                      >
                        {isSelected ? 'Remove' : '+ Pick'}
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {activeTab === 'leagues' && (
          <div className="rounded-xl overflow-hidden" style={{ background: '#131320', border: '1px solid #1e1e32' }}>
            <div className="p-5 border-b" style={{ borderColor: '#1e1e32' }}>
              <h3 className="text-base font-black text-white uppercase tracking-wider" style={{ fontFamily: 'Big Shoulders Display' }}>
                Global Leaderboard — Gameweek 33
              </h3>
            </div>
            <div className="p-4 space-y-2">
              {[
                { rank: 1, manager: 'FlowerZ Fanatic', pts: 2140 },
                { rank: 2, manager: 'Arteta Baller', pts: 2095 },
                { rank: 3, manager: 'KPL Legend', pts: 2010 },
                { rank: 4, manager: 'You (Current Squad)', pts: totalPoints },
              ].map(row => (
                <div key={row.rank} className="flex items-center justify-between p-3 rounded-lg border border-[#1e1e32]" style={{ background: '#0d0d1e' }}>
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-black text-[#00b341] w-6">#{row.rank}</span>
                    <span className="text-xs font-bold text-white">{row.manager}</span>
                  </div>
                  <span className="text-sm font-black text-white" style={{ fontFamily: 'Big Shoulders Display' }}>{row.pts} pts</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
