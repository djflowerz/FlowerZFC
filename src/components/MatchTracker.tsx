import { useState, useEffect } from 'react'
import { getClubLogo, getInitialsAvatarUrl } from '../services/liveScoreApi'

interface Incident {
  min: string
  team: 'home' | 'away' | 'system'
  text: string
  type: 'goal' | 'card' | 'status' | 'assist'
  score?: string
}

interface PlayerPin {
  num: number
  role: string
  x: number // percentage
  y: number // percentage
}

interface Substitution {
  min: string
  inNum?: number
  inName: string
  outNum?: number
  outName: string
  side: 'home' | 'away'
}

interface MatchTrackerProps {
  home: string
  away: string
  homeScore: number
  awayScore: number
  status: string
  isLive: boolean
  homeLogo?: string
  awayLogo?: string
  homeColor?: string
  awayColor?: string
  incidents: Incident[]
  venue?: string
  homeStarters?: { num: number; name: string; pos: string }[]
  awayStarters?: { num: number; name: string; pos: string }[]
  homeFormation?: string
  awayFormation?: string
  substitutions?: Substitution[]
}

// Dynamic formation position calculator (supports 4-3-3, 4-2-3-1, 4-4-2, 3-5-2, 5-3-2, 5-4-1, etc.)
function getTacticalPositions(formationStr: string = '4-3-3', isAway: boolean): PlayerPin[] {
  const parts = formationStr.split('-').map(n => parseInt(n, 10)).filter(n => !isNaN(n) && n > 0)
  const lines = parts.length > 0 ? parts : [4, 3, 3]

  const pins: PlayerPin[] = []
  
  // Goalkeeper
  pins.push({
    num: 1,
    role: 'GK',
    x: isAway ? 94 : 6,
    y: 50
  })

  // Distribute line depths across X coordinates
  const totalLines = lines.length
  const startX = 18
  const endX = 45

  lines.forEach((count, lineIdx) => {
    const depthRatio = totalLines === 1 ? 0.5 : lineIdx / (totalLines - 1)
    const rawX = startX + depthRatio * (endX - startX)
    const lineX = isAway ? (100 - rawX) : rawX

    for (let i = 0; i < count; i++) {
      const yRatio = (i + 1) / (count + 1)
      const lineY = Math.round(15 + yRatio * 70)
      pins.push({
        num: pins.length + 1,
        role: lineIdx === 0 ? 'DF' : lineIdx === totalLines - 1 ? 'FW' : 'MF',
        x: Math.round(lineX),
        y: lineY
      })
    }
  })

  while (pins.length < 11) {
    const idx = pins.length
    pins.push({
      num: idx + 1,
      role: 'SUB',
      x: isAway ? 60 : 40,
      y: 20 + (idx * 8)
    })
  }

  return pins.slice(0, 11)
}

const ACTION_DESCRIPTIONS = [
  { title: 'Midfield Pass & Build-up ⚽', type: 'pass', icon: '👟' },
  { title: 'Dangerous Wing Cross ⚡', type: 'cross', icon: '⚡' },
  { title: 'Ref Whistle: Tactical Foul 🪈', type: 'whistle', icon: '🪈' },
  { title: 'Clearance by Defensive Block 🛡️', type: 'clearance', icon: '🛡️' },
  { title: 'Key Through-Ball Pass 👟', type: 'pass', icon: '👟' },
  { title: 'Shot Saved by Goalkeeper! 🧤', type: 'shot', icon: '🧤' },
  { title: 'Ref Whistle: Offside Flag 🚩', type: 'whistle', icon: '🚩' },
  { title: 'Fast Counter-Attack Sprint 🏃‍♂️', type: 'counter', icon: '⚡' },
]

export default function MatchTracker({
  home,
  away,
  homeScore,
  awayScore,
  status,
  isLive,
  homeLogo,
  awayLogo,
  incidents,
  homeStarters = [],
  awayStarters = [],
  homeFormation = '4-3-3',
  awayFormation = '4-3-3',
  substitutions = [],
}: MatchTrackerProps) {
  const [viewMode, setViewMode] = useState<'pitch' | 'momentum'>('pitch')

  // Live pitch ball position
  const [ballX, setBallX] = useState<number>(50)
  const [ballY, setBallY] = useState<number>(50)
  const [prevBallX, setPrevBallX] = useState<number>(36)
  const [prevBallY, setPrevBallY] = useState<number>(50)
  const [actionIndex, setActionIndex] = useState<number>(0)
  const [showWhistle, setShowWhistle] = useState<boolean>(false)

  // Track key live events for ball positioning
  const latestEvent = incidents.length > 0 ? incidents[incidents.length - 1] : null

  // Continuously animate ball across pitch anchored to live incidents
  useEffect(() => {
    if (!isLive) {
      setBallX(50)
      setBallY(50)
      return
    }

    const interval = setInterval(() => {
      setPrevBallX(ballX)
      setPrevBallY(ballY)

      // If there's a recent goal or penalty, anchor ball position to goal / penalty spot
      if (latestEvent && latestEvent.type === 'goal') {
        if (latestEvent.team === 'home') {
          setBallX(92)
          setBallY(50)
        } else {
          setBallX(8)
          setBallY(50)
        }
      } else {
        const nextX = Math.floor(Math.random() * 66) + 17 // 17% to 83%
        const nextY = Math.floor(Math.random() * 60) + 20 // 20% to 80%
        setBallX(nextX)
        setBallY(nextY)
      }

      const nextIdx = Math.floor(Math.random() * ACTION_DESCRIPTIONS.length)
      setActionIndex(nextIdx)

      if (ACTION_DESCRIPTIONS[nextIdx].type === 'whistle' || status === 'HT' || status === 'FT') {
        setShowWhistle(true)
        setTimeout(() => setShowWhistle(false), 2200)
      }
    }, 3000)

    return () => clearInterval(interval)
  }, [isLive, ballX, ballY, latestEvent, status])

  // Trigger whistle notification on status change (e.g. HT or FT)
  useEffect(() => {
    if (status === 'HT' || status === 'FT' || status === '1H' || status === '2H') {
      setShowWhistle(true)
      const t = setTimeout(() => setShowWhistle(false), 3000)
      return () => clearTimeout(t)
    }
  }, [status])

  // Calculate live stats summary from incidents
  const homeGoals = incidents.filter(i => i.team === 'home' && i.type === 'goal').length || homeScore
  const awayGoals = incidents.filter(i => i.team === 'away' && i.type === 'goal').length || awayScore
  const homeYellows = incidents.filter(i => i.team === 'home' && (i.text.includes('Yellow') || i.text.includes('🟨'))).length
  const awayYellows = incidents.filter(i => i.team === 'away' && (i.text.includes('Yellow') || i.text.includes('🟨'))).length
  const homeReds = incidents.filter(i => i.team === 'home' && (i.text.includes('Red') || i.text.includes('🟥'))).length
  const awayReds = incidents.filter(i => i.team === 'away' && (i.text.includes('Red') || i.text.includes('🟥'))).length

  // Build red card player name sets
  const homeRedPlayers = new Set(
    incidents
      .filter(i => i.team === 'home' && (i.text.includes('Red') || i.text.includes('🟥')))
      .map(i => i.text.toLowerCase())
  )

  const awayRedPlayers = new Set(
    incidents
      .filter(i => i.team === 'away' && (i.text.includes('Red') || i.text.includes('🟥')))
      .map(i => i.text.toLowerCase())
  )

  // Build substitution maps
  const homeSubMap = new Map<string, string>()
  const awaySubMap = new Map<string, string>()

  substitutions.forEach(s => {
    const isHome = s.side === 'home'
    if (s.outName) {
      if (isHome) homeSubMap.set(s.outName.toLowerCase(), s.inName)
      else awaySubMap.set(s.outName.toLowerCase(), s.inName)
    }
  })

  // Dynamic tactical formation pitch positions
  const homePositions = getTacticalPositions(homeFormation, false)
  const awayPositions = getTacticalPositions(awayFormation, true)

  // Map squad shirt numbers, substitutions & red cards
  const homeSquad = homePositions.map((pin, i) => {
    const starter = homeStarters[i]
    const origName = starter?.name || pin.role
    const origNameLower = origName.toLowerCase()
    
    const isSubbed = homeSubMap.has(origNameLower)
    const displayName = isSubbed ? homeSubMap.get(origNameLower)! : origName
    const isRed = homeRedPlayers.has(origNameLower) || (isSubbed && homeRedPlayers.has(displayName.toLowerCase()))

    return {
      ...pin,
      num: starter?.num || pin.num,
      name: displayName,
      isRed,
      isSubbed,
    }
  })

  const awaySquad = awayPositions.map((pin, i) => {
    const starter = awayStarters[i]
    const origName = starter?.name || pin.role
    const origNameLower = origName.toLowerCase()

    const isSubbed = awaySubMap.has(origNameLower)
    const displayName = isSubbed ? awaySubMap.get(origNameLower)! : origName
    const isRed = awayRedPlayers.has(origNameLower) || (isSubbed && awayRedPlayers.has(displayName.toLowerCase()))

    return {
      ...pin,
      num: starter?.num || pin.num,
      name: displayName,
      isRed,
      isSubbed,
    }
  })

  // Find active player nearest to ball
  const nearestHomePlayer = homeSquad.reduce((prev, curr) =>
    Math.hypot(curr.x - ballX, curr.y - ballY) < Math.hypot(prev.x - ballX, prev.y - ballY) ? curr : prev
  )

  const nearestAwayPlayer = awaySquad.reduce((prev, curr) =>
    Math.hypot(curr.x - ballX, curr.y - ballY) < Math.hypot(prev.x - ballX, prev.y - ballY) ? curr : prev
  )

  // Zone text based on ball position
  const currentAction = latestEvent
    ? latestEvent.text
    : ballX > 65
    ? `${home} Attacking Danger Zone ⚡`
    : ballX < 35
    ? `${away} Attacking Danger Zone ⚡`
    : ACTION_DESCRIPTIONS[actionIndex].title

  return (
    <div className="rounded-xl overflow-hidden bg-[#11111c] border border-[#1e1e32] shadow-2xl space-y-0 font-sans">
      
      {/* Tracker Top Bar Controls */}
      <div className="px-4 py-2.5 bg-[#161626] border-b border-[#222238] flex items-center justify-between text-xs">
        <div className="flex items-center gap-2 font-mono font-bold">
          <span className="text-emerald-400">⚽</span>
          <span className="text-white uppercase tracking-wider text-[11px]">2D TACTICAL MATCH TRACKER</span>
          {isLive ? (
            <span className="flex items-center gap-1.5 bg-emerald-500/20 text-emerald-400 px-2.5 py-0.5 rounded-full text-[10px] border border-emerald-500/40 animate-pulse">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
              LIVE TELEMETRY {status}
            </span>
          ) : (
            <span className="text-[10px] text-gray-400 font-mono">MATCH STATUS: {status || 'FULL TIME'}</span>
          )}
        </div>

        <div className="flex bg-[#0b0b14] p-0.5 rounded-lg border border-[#222238]">
          <button
            onClick={() => setViewMode('pitch')}
            className={`px-3 py-1 rounded-md text-[11px] font-bold font-mono transition-colors ${viewMode === 'pitch' ? 'bg-emerald-500 text-black shadow' : 'text-gray-400 hover:text-white'}`}
          >
            2D Pitch ({homeFormation} v {awayFormation})
          </button>
          <button
            onClick={() => setViewMode('momentum')}
            className={`px-3 py-1 rounded-md text-[11px] font-bold font-mono transition-colors ${viewMode === 'momentum' ? 'bg-emerald-500 text-black shadow' : 'text-gray-400 hover:text-white'}`}
          >
            Pressure Gauge
          </button>
        </div>
      </div>

      {viewMode === 'pitch' ? (
        /* ── 2D TACTICAL FOOTBALL PITCH WITH PLAYER NUMBERS & PASS LINES ── */
        <div className="relative w-full h-72 lg:h-80 bg-[#0e2716] overflow-hidden flex flex-col justify-between p-3 border-b border-[#1e1e32] select-none">
          
          {/* Grass Texture Lines */}
          <div className="absolute inset-0 opacity-25 pointer-events-none bg-[repeating-linear-gradient(90deg,transparent,transparent_45px,rgba(255,255,255,0.08)_45px,rgba(255,255,255,0.08)_90px)]" />

          {/* Pitch Markings */}
          <div className="absolute inset-2.5 border-2 border-white/30 rounded pointer-events-none">
            <div className="absolute top-0 bottom-0 left-1/2 w-0.5 bg-white/30 -translate-x-1/2" />
            <div className="absolute top-1/2 left-1/2 w-28 h-28 border-2 border-white/30 rounded-full -translate-x-1/2 -translate-y-1/2" />
            <div className="absolute top-1/2 left-1/2 w-2 h-2 bg-white/50 rounded-full -translate-x-1/2 -translate-y-1/2" />
            <div className="absolute top-1/2 left-0 w-24 h-36 border-2 border-l-0 border-white/30 -translate-y-1/2" />
            <div className="absolute top-1/2 left-0 w-8 h-16 border-2 border-l-0 border-white/30 -translate-y-1/2" />
            <div className="absolute top-1/2 right-0 w-24 h-36 border-2 border-r-0 border-white/30 -translate-y-1/2" />
            <div className="absolute top-1/2 right-0 w-8 h-16 border-2 border-r-0 border-white/30 -translate-y-1/2" />
          </div>

          {/* SVG ANIMATED PASS VECTOR LINE */}
          <svg className="absolute inset-0 w-full h-full pointer-events-none z-20">
            <line
              x1={`${prevBallX}%`}
              y1={`${prevBallY}%`}
              x2={`${ballX}%`}
              y2={`${ballY}%`}
              stroke="#f59e0b"
              strokeWidth="2"
              strokeDasharray="4 4"
              className="animate-pulse"
            />
          </svg>

          {/* REFEREE WHISTLE BLOWING POPUP ANIMATION */}
          {showWhistle && (
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 bg-amber-500/95 text-black px-4 py-2 rounded-xl shadow-2xl flex items-center gap-2 border-2 border-white animate-bounce">
              <span className="text-2xl animate-spin">🪈</span>
              <span className="font-black text-xs uppercase tracking-wider font-mono">
                {status === 'HT' ? 'HALF TIME WHISTLE' : status === 'FT' ? 'FULL TIME WHISTLE' : 'REFEREE WHISTLE BLOWN!'}
              </span>
            </div>
          )}

          {/* HOME TEAM PLAYER PINS WITH SHIRT NUMBERS & CARDS */}
          {homeSquad.map((p, i) => {
            const isNear = nearestHomePlayer.num === p.num
            return (
              <div
                key={`h-${i}`}
                className={`absolute z-20 -translate-x-1/2 -translate-y-1/2 flex flex-col items-center group transition-all duration-300`}
                style={{ left: `${p.x}%`, top: `${p.y}%` }}
              >
                <div
                  className={`relative w-6 h-6 rounded-full flex items-center justify-center font-black text-[10px] font-mono shadow-lg border transition-transform ${
                    p.isRed
                      ? 'bg-red-600 text-white border-red-300 ring-2 ring-red-500'
                      : isNear
                      ? 'bg-emerald-500 text-black border-white scale-125 ring-4 ring-emerald-500/50'
                      : 'bg-[#1e3a8a] text-white border-blue-300'
                  }`}
                >
                  {p.num}
                  {p.isRed && (
                    <span className="absolute -top-1 -right-1 text-[9px]" title="Red Carded">🟥</span>
                  )}
                  {p.isSubbed && !p.isRed && (
                    <span className="absolute -bottom-1 -right-1 text-[8px]" title="Substituted">🔄</span>
                  )}
                </div>
                <span className="opacity-0 group-hover:opacity-100 transition-opacity text-[8px] font-bold text-white bg-black/90 px-1 rounded whitespace-nowrap mt-0.5 shadow-md">
                  {p.name} {p.isSubbed ? '(Sub in)' : ''}
                </span>
              </div>
            )
          })}

          {/* AWAY TEAM PLAYER PINS WITH SHIRT NUMBERS & CARDS */}
          {awaySquad.map((p, i) => {
            const isNear = nearestAwayPlayer.num === p.num
            return (
              <div
                key={`a-${i}`}
                className={`absolute z-20 -translate-x-1/2 -translate-y-1/2 flex flex-col items-center group transition-all duration-300`}
                style={{ left: `${p.x}%`, top: `${p.y}%` }}
              >
                <div
                  className={`relative w-6 h-6 rounded-full flex items-center justify-center font-black text-[10px] font-mono shadow-lg border transition-transform ${
                    p.isRed
                      ? 'bg-red-600 text-white border-red-300 ring-2 ring-red-500'
                      : isNear
                      ? 'bg-amber-400 text-black border-white scale-125 ring-4 ring-amber-400/50'
                      : 'bg-[#854d0e] text-amber-100 border-amber-300'
                  }`}
                >
                  {p.num}
                  {p.isRed && (
                    <span className="absolute -top-1 -right-1 text-[9px]" title="Red Carded">🟥</span>
                  )}
                  {p.isSubbed && !p.isRed && (
                    <span className="absolute -bottom-1 -right-1 text-[8px]" title="Substituted">🔄</span>
                  )}
                </div>
                <span className="opacity-0 group-hover:opacity-100 transition-opacity text-[8px] font-bold text-white bg-black/90 px-1 rounded whitespace-nowrap mt-0.5 shadow-md">
                  {p.name} {p.isSubbed ? '(Sub in)' : ''}
                </span>
              </div>
            )
          })}

          {/* DYNAMIC LIVE MOVING BALL PIN MARKER */}
          <div
            className="absolute z-40 transition-all duration-1000 ease-in-out flex flex-col items-center pointer-events-none"
            style={{
              left: `${ballX}%`,
              top: `${ballY}%`,
              transform: 'translate(-50%, -50%)',
            }}
          >
            <div className="relative flex items-center justify-center">
              <div className="absolute w-12 h-12 rounded-full bg-amber-400/40 animate-ping" />
              <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-amber-500 via-yellow-400 to-white shadow-[0_0_20px_rgba(245,158,11,0.9)] flex items-center justify-center text-base font-black text-black border-2 border-white animate-bounce">
                ⚽
              </div>
            </div>
            <div className="mt-1.5 px-3 py-1 rounded-md bg-black/95 border border-amber-400/70 text-[10px] font-bold text-amber-300 whitespace-nowrap shadow-2xl backdrop-blur-md flex items-center gap-1.5">
              <span>{ACTION_DESCRIPTIONS[actionIndex]?.icon || '⚽'}</span>
              <span>{currentAction}</span>
            </div>
          </div>

          {/* Home Team Header Overlay */}
          <div className="relative z-10 flex items-center gap-2">
            <img
              src={homeLogo || getClubLogo(home)}
              alt={home}
              className="w-7 h-7 object-contain bg-black/60 p-1 rounded-full border border-white/20 shadow-lg"
              onError={e => { (e.target as HTMLImageElement).src = getInitialsAvatarUrl(home) }}
            />
            <span className="font-black text-white text-xs uppercase tracking-tight drop-shadow-md">
              {home} <span className="text-gray-400 text-[10px]">({homeFormation})</span>
            </span>
          </div>

          {/* Away Team Header Overlay */}
          <div className="relative z-10 flex items-center justify-end gap-2 text-right">
            <span className="font-black text-white text-xs uppercase tracking-tight drop-shadow-md">
              <span className="text-gray-400 text-[10px]">({awayFormation})</span> {away}
            </span>
            <img
              src={awayLogo || getClubLogo(away)}
              alt={away}
              className="w-7 h-7 object-contain bg-black/60 p-1 rounded-full border border-white/20 shadow-lg"
              onError={e => { (e.target as HTMLImageElement).src = getInitialsAvatarUrl(away) }}
            />
          </div>

          {/* Bottom Telemetry Overlay Strip */}
          <div className="relative z-10 flex justify-between items-center bg-black/80 backdrop-blur-md rounded-lg px-3 py-1.5 border border-white/15">
            <div className="flex items-center gap-3 text-[10px] text-gray-300 font-mono font-bold">
              <span className="flex items-center gap-1">🟨 {homeYellows}</span>
              <span className="flex items-center gap-1">🟥 {homeReds}</span>
            </div>
            <div className="text-[10px] font-bold text-amber-300 font-mono tracking-wider uppercase flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
              {currentAction}
            </div>
            <div className="flex items-center gap-3 text-[10px] text-gray-300 font-mono font-bold">
              <span className="flex items-center gap-1">🟨 {awayYellows}</span>
              <span className="flex items-center gap-1">🟥 {awayReds}</span>
            </div>
          </div>

        </div>
      ) : (
        /* ── PRESSURE & MOMENTUM GAUGE ── */
        <div className="p-5 space-y-4 bg-[#131322]">
          <div className="space-y-1.5">
            <div className="flex justify-between text-xs font-bold text-gray-300 font-mono">
              <span>{home} Attack Pressure ({ballX}%)</span>
              <span>{away} Attack Pressure ({100 - ballX}%)</span>
            </div>
            <div className="h-3 w-full bg-[#1e1e34] rounded-full overflow-hidden flex p-0.5 border border-[#2a2a44]">
              <div
                className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 rounded-l-full transition-all duration-700"
                style={{ width: `${ballX}%` }}
              />
              <div
                className="h-full bg-gradient-to-r from-amber-500 to-orange-500 rounded-r-full transition-all duration-700"
                style={{ width: `${100 - ballX}%` }}
              />
            </div>
          </div>

          {/* Match Telemetry Indicators Grid */}
          <div className="grid grid-cols-4 gap-2 text-center text-xs font-mono">
            <div className="p-2 rounded bg-[#1a1a2e] border border-[#2a2a40]">
              <div className="text-[10px] text-gray-400 uppercase font-bold">Goals</div>
              <div className="text-base font-black text-emerald-400 mt-0.5">{homeGoals} - {awayGoals}</div>
            </div>
            <div className="p-2 rounded bg-[#1a1a2e] border border-[#2a2a40]">
              <div className="text-[10px] text-gray-400 uppercase font-bold">Yellow Cards</div>
              <div className="text-base font-black text-amber-400 mt-0.5">{homeYellows} - {awayYellows}</div>
            </div>
            <div className="p-2 rounded bg-[#1a1a2e] border border-[#2a2a40]">
              <div className="text-[10px] text-gray-400 uppercase font-bold">Red Cards</div>
              <div className="text-base font-black text-red-400 mt-0.5">{homeReds} - {awayReds}</div>
            </div>
            <div className="p-2 rounded bg-[#1a1a2e] border border-[#2a2a40]">
              <div className="text-[10px] text-gray-400 uppercase font-bold">Ref Whistle</div>
              <div className="text-base font-black text-teal-400 mt-0.5">🪈 Live</div>
            </div>
          </div>
        </div>
      )}

      {/* Latest Live Event Ticker Strip */}
      {latestEvent && (
        <div className="px-4 py-2 bg-[#0c0c16] border-t border-[#1e1e32] flex items-center justify-between text-[11px] font-mono">
          <span className="text-amber-400 font-bold">LATEST MATCH TELEMETRY:</span>
          <span className="text-white font-bold">{latestEvent.min} — {latestEvent.text}</span>
        </div>
      )}
    </div>
  )
}
