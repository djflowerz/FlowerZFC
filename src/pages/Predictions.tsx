import { useState, useEffect } from 'react'
import { useApp } from '../context/AppContext'
import { Link } from 'react-router-dom'
import AdBanner from '../components/AdBanner'
import { supabase } from '../services/supabaseClient'

const MATCHES = [
  { id: 'p1', home: 'Arsenal', away: 'Chelsea', time: '20:00 UTC', league: 'Premier League' },
  { id: 'p2', home: 'Real Madrid', away: 'Barcelona', time: '21:00 UTC', league: 'La Liga' },
  { id: 'p3', home: 'Bayern', away: 'Dortmund', time: '19:30 UTC', league: 'Bundesliga' },
]

const OUTCOME_SCORES: Record<string, { home: number; away: number }> = {
  home: { home: 1, away: 0 },
  draw: { home: 0, away: 0 },
  away: { home: 0, away: 1 },
}

interface LeaderboardRow {
  userId: string
  name: string
  pts: number
  total: number
  correct: number
  acc: string
}

export default function Predictions() {
  const { t, user } = useApp()
  const [tab, setTab] = useState<'predict' | 'leaderboard'>('predict')
  const [preds, setPreds] = useState<Record<string, string>>({})
  const [locked, setLocked] = useState<Record<string, boolean>>({})
  const [submitting, setSubmitting] = useState<Record<string, boolean>>({})
  const [leaderboard, setLeaderboard] = useState<LeaderboardRow[]>([])
  const [leaderboardLoading, setLeaderboardLoading] = useState(true)

  useEffect(() => {
    if (!user) return
    supabase.from('predictions').select('match_id, predicted_home_score, predicted_away_score').eq('user_id', user.id)
      .then(({ data }: any) => {
        if (!data) return
        const lockedMap: Record<string, boolean> = {}
        const predsMap: Record<string, string> = {}
        data.forEach((row: any) => {
          lockedMap[row.match_id] = true
          if (row.predicted_home_score > row.predicted_away_score) predsMap[row.match_id] = 'home'
          else if (row.predicted_home_score < row.predicted_away_score) predsMap[row.match_id] = 'away'
          else predsMap[row.match_id] = 'draw'
        })
        setLocked(lockedMap)
        setPreds(predsMap)
      })
  }, [user?.id])

  useEffect(() => {
    if (tab !== 'leaderboard') return
    setLeaderboardLoading(true)

    Promise.all([
      supabase.from('predictions').select('user_id, points_earned, actual_home_score, predicted_home_score, predicted_away_score, actual_away_score'),
      supabase.from('profiles').select('id, name'),
    ]).then(([predsRes, profilesRes]: any) => {
      const allPreds = predsRes.data || []
      const profiles = profilesRes.data || []
      const nameMap: Record<string, string> = {}
      profiles.forEach((p: any) => { nameMap[p.id] = p.name || 'Anonymous Fan' })

      const grouped: Record<string, { pts: number; total: number; correct: number }> = {}
      allPreds.forEach((p: any) => {
        if (!grouped[p.user_id]) grouped[p.user_id] = { pts: 0, total: 0, correct: 0 }
        grouped[p.user_id].pts += p.points_earned || 0
        if (p.actual_home_score !== null) {
          grouped[p.user_id].total += 1
          if (p.predicted_home_score === p.actual_home_score && p.predicted_away_score === p.actual_away_score) {
            grouped[p.user_id].correct += 1
          }
        }
      })

      const rows: LeaderboardRow[] = Object.entries(grouped).map(([userId, g]) => ({
        userId,
        name: nameMap[userId] || 'Anonymous Fan',
        pts: g.pts,
        total: g.total,
        correct: g.correct,
        acc: g.total > 0 ? `${Math.round((g.correct / g.total) * 100)}%` : '—',
      })).sort((a, b) => b.pts - a.pts)

      setLeaderboard(rows)
      setLeaderboardLoading(false)
    })
  }, [tab])

  const submit = async (matchId: string) => {
    if (!preds[matchId] || !user) return
    const outcome = OUTCOME_SCORES[preds[matchId]]
    setSubmitting(s => ({ ...s, [matchId]: true }))

    const { error } = await supabase.from('predictions').insert({
      user_id: user.id,
      match_id: matchId,
      predicted_home_score: outcome.home,
      predicted_away_score: outcome.away,
    })

    setSubmitting(s => ({ ...s, [matchId]: false }))

    if (error) {
      alert('Could not save your prediction. Please try again.')
      return
    }
    setLocked(l => ({ ...l, [matchId]: true }))
  }

  const badgeFor = (rank: number) => rank === 1 ? '🏆' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : ''

  return (
    <div className="max-w-screen-lg mx-auto px-4 py-8">
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
                  <p className="text-green-400 font-bold text-sm">
                    ✓ Prediction locked: {preds[m.id] === 'home' ? `${m.home} Win` : preds[m.id] === 'away' ? `${m.away} Win` : 'Draw'}
                  </p>
                </div>
              ) : (
                <div>
                  <div className="flex gap-2 mb-3">
                    {[{ key: 'home', label: `${m.home} Win` }, { key: 'draw', label: 'Draw' }, { key: 'away', label: `${m.away} Win` }].map(opt => (
                      <button key={opt.key} onClick={() => setPreds(p => ({ ...p, [m.id]: opt.key }))}
                        className={`flex-1 py-2 text-xs font-bold rounded transition-colors ${preds[m.id] === opt.key ? 'text-white' : 'text-gray-500 hover:text-gray-300'}`}
                        style={preds[m.id] === opt.key ? { background: '#00b341' } : { background: '#1a1a28', border: '1px solid #1e1e32' }}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                  <button onClick={() => submit(m.id)} disabled={!preds[m.id] || !user || submitting[m.id]}
                    className="w-full py-2.5 text-sm font-bold text-white rounded disabled:opacity-40 transition-colors hover:opacity-90"
                    style={{ background: '#00b341' }}
                  >
                    {submitting[m.id] ? 'Submitting...' : 'Submit Prediction'}
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {tab === 'leaderboard' && (
        <div className="rounded-lg overflow-hidden" style={{ border: '1px solid #1e1e32' }}>
          {leaderboardLoading ? (
            <div className="p-8 text-center text-sm text-gray-500">Loading leaderboard...</div>
          ) : leaderboard.length === 0 ? (
            <div className="p-8 text-center text-sm text-gray-500">No predictions submitted yet. Be the first!</div>
          ) : (
            leaderboard.map((row, i) => (
              <div key={row.userId} className="flex items-center gap-4 px-5 py-4 border-b transition-colors hover:bg-white/5" style={{ borderColor: '#1e1e32' }}>
                <span className="text-2xl w-8">{badgeFor(i + 1) || `#${i + 1}`}</span>
                <span className="font-bold text-white flex-1">{row.name}</span>
                <span className="text-xs text-gray-500">{row.acc} accuracy</span>
                <span className="font-black text-white" style={{ fontFamily: 'Big Shoulders Display', fontSize: '18px', color: '#f4a261' }}>{row.pts} pts</span>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  )
}
