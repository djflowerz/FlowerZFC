import { useState } from 'react'
import { useApp } from '../context/AppContext'
import { Link } from 'react-router-dom'
import AdBanner from '../components/AdBanner'

const MATCHES = [
  { id: 'p1', home: 'Arsenal', away: 'Chelsea', time: '20:00 UTC', league: 'Premier League' },
  { id: 'p2', home: 'Real Madrid', away: 'Barcelona', time: '21:00 UTC', league: 'La Liga' },
  { id: 'p3', home: 'Bayern', away: 'Dortmund', time: '19:30 UTC', league: 'Bundesliga' },
]

const LEADERBOARD = [
  { rank: 1, name: 'GunnerFan254', avatar: '⚽', pts: 342, acc: '78%', badge: '🏆' },
  { rank: 2, name: 'BallonDOrVoter', avatar: '🌟', pts: 318, acc: '74%', badge: '🥈' },
  { rank: 3, name: 'NairobiGooner', avatar: '🦁', pts: 295, acc: '71%', badge: '🥉' },
  { rank: 4, name: 'EPLWatcher', avatar: '👀', pts: 278, acc: '68%', badge: '' },
  { rank: 5, name: 'TanzaFC', avatar: '🇹🇿', pts: 251, acc: '65%', badge: '' },
]

export default function Predictions() {
  const { t, user } = useApp()
  const [tab, setTab] = useState<'predict' | 'leaderboard'>('predict')
  const [preds, setPreds] = useState<Record<string, string>>({})
  const [locked, setLocked] = useState<Record<string, boolean>>({})

  const submit = (id: string) => {
    if (preds[id]) setLocked(l => ({ ...l, [id]: true }))
  }

  return (
    <div className="max-w-screen-lg mx-auto px-4 py-8">
      {/* Top Banner Ad */}
      <div className="flex justify-center mb-6">
        <AdBanner size="leaderboard" label="Predict & Win — Official Partner Space" />
      </div>

      <h1 className="text-4xl font-black text-white mb-6" style={{ fontFamily: 'Big Shoulders Display' }}>{t('predictions')}</h1>

      <div className="flex gap-2 mb-6">
        {(['predict', 'leaderboard'] as const).map(tb => (
          <button key={tb} onClick={() => setTab(tb)}
            className={`px-5 py-2 text-sm font-bold rounded-sm transition-colors capitalize ${tab === tb ? 'text-white' : 'text-gray-500 hover:text-white'}`}
            style={tab === tb ? { background: '#00b341' } : { background: '#131320', border: '1px solid #1e1e32' }}
          >
            {tb === 'predict' ? 'Predict' : 'Leaderboard'}
          </button>
        ))}
      </div>

      {tab === 'predict' && (
        <div className="space-y-4">
          {!user && (
            <div className="p-4 rounded-lg text-center" style={{ background: '#131320', border: '1px solid #1e1e32' }}>
              <p className="text-sm text-gray-400 mb-2">Sign in to submit predictions and earn points</p>
              <Link to="/login" className="text-sm font-bold text-[#00b341] hover:opacity-80 transition-colors">{t('login')} →</Link>
            </div>
          )}
          {MATCHES.map(m => (
            <div key={m.id} className="p-5 rounded-lg" style={{ background: '#131320', border: '1px solid #1e1e32' }}>
              <div className="flex items-center justify-between mb-4">
                <span className="text-xs text-gray-500">{m.league} • {m.time}</span>
              </div>
              <div className="flex items-center justify-center gap-6 mb-4">
                <span className="font-black text-white text-lg" style={{ fontFamily: 'Big Shoulders Display' }}>{m.home}</span>
                <span className="text-gray-600 font-bold">vs</span>
                <span className="font-black text-white text-lg" style={{ fontFamily: 'Big Shoulders Display' }}>{m.away}</span>
              </div>
              {locked[m.id] ? (
                <div className="text-center py-3">
                  <p className="text-green-400 font-bold text-sm">✓ Prediction locked: {preds[m.id]}</p>
                </div>
              ) : (
                <div>
                  <div className="flex gap-2 mb-3">
                    {[`${m.home} Win`, 'Draw', `${m.away} Win`].map(opt => (
                      <button key={opt} onClick={() => setPreds(p => ({ ...p, [m.id]: opt }))}
                        className={`flex-1 py-2 text-xs font-bold rounded transition-colors ${preds[m.id] === opt ? 'text-white' : 'text-gray-500 hover:text-gray-300'}`}
                        style={preds[m.id] === opt ? { background: '#00b341' } : { background: '#1a1a28', border: '1px solid #1e1e32' }}
                      >
                        {opt}
                      </button>
                    ))}
                  </div>
                  <button onClick={() => submit(m.id)} disabled={!preds[m.id] || !user}
                    className="w-full py-2.5 text-sm font-bold text-white rounded disabled:opacity-40 transition-colors hover:opacity-90"
                    style={{ background: '#00b341' }}
                  >
                    Submit Prediction
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {tab === 'leaderboard' && (
        <div className="rounded-lg overflow-hidden" style={{ border: '1px solid #1e1e32' }}>
          {LEADERBOARD.map(row => (
            <div key={row.rank} className="flex items-center gap-4 px-5 py-4 border-b transition-colors hover:bg-white/5" style={{ borderColor: '#1e1e32' }}>
              <span className="text-2xl w-8">{row.badge || `#${row.rank}`}</span>
              <span className="text-xl">{row.avatar}</span>
              <span className="font-bold text-white flex-1">{row.name}</span>
              <span className="text-xs text-gray-500">{row.acc} accuracy</span>
              <span className="font-black text-white" style={{ fontFamily: 'Big Shoulders Display', fontSize: '18px', color: '#f4a261' }}>{row.pts} pts</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
