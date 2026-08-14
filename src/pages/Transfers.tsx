import { useState, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { useApp } from '../context/AppContext'
import AdBanner from '../components/AdBanner'

interface TransferItem {
  id: string
  player: string
  pos: string
  age: number
  from: string
  to: string
  league: string
  status: 'confirmed' | 'rumour' | 'doneDeal'
  fee: string
  probability: number // 0-100%
  image: string
  date: string
  excerpt: string
  source: string
}

const TRANSFERS: TransferItem[] = [
  {
    id: 't1',
    player: 'Vinicius Jr.',
    pos: 'LW',
    age: 24,
    from: 'Real Madrid',
    to: 'Man City',
    league: 'Premier League',
    status: 'rumour',
    fee: '€200m',
    probability: 65,
    image: 'https://images.unsplash.com/photo-1517927033932-b3d18e61fb3a?w=300&h=300&fit=crop&auto=format',
    date: '2h ago',
    excerpt: 'Reports from Spain suggest Man City are preparing a record €200m bid with Pep Guardiola personally driving the approach.',
    source: 'Marca / El Chiringuito',
  },
  {
    id: 't2',
    player: 'Bukayo Saka',
    pos: 'RW',
    age: 22,
    from: 'Arsenal',
    to: 'Barcelona',
    league: 'La Liga',
    status: 'rumour',
    fee: '€150m',
    probability: 40,
    image: 'https://images.unsplash.com/photo-1608245449230-4ac19066d2d0?w=300&h=300&fit=crop&auto=format',
    date: '4h ago',
    excerpt: "Barcelona's sporting director confirmed admiration, but Arsenal remain adamant Saka is not for sale at any price.",
    source: 'Sky Sports',
  },
  {
    id: 't3',
    player: 'Erling Haaland',
    pos: 'ST',
    age: 23,
    from: 'Man City',
    to: 'Real Madrid',
    league: 'La Liga',
    status: 'confirmed',
    fee: '€180m',
    probability: 100,
    image: 'https://images.unsplash.com/photo-1570498839593-e565b39455fc?w=300&h=300&fit=crop&auto=format',
    date: '6h ago',
    excerpt: 'CONFIRMED: Haaland completes his dream move to the Santiago Bernabéu signing a 5-year contract.',
    source: 'Official Club Announcement',
  },
  {
    id: 't4',
    player: 'Cole Palmer',
    pos: 'CAM',
    age: 22,
    from: 'Chelsea',
    to: 'Liverpool',
    league: 'Premier League',
    status: 'rumour',
    fee: '€120m',
    probability: 55,
    image: 'https://images.unsplash.com/photo-1574629810360-7efbbe195018?w=300&h=300&fit=crop&auto=format',
    date: '8h ago',
    excerpt: 'Liverpool monitor Palmer situation at Stamford Bridge following interest from Arne Slot.',
    source: 'The Athletic',
  },
  {
    id: 't5',
    player: 'Rúben Dias',
    pos: 'CB',
    age: 27,
    from: 'Man City',
    to: 'Bayern Munich',
    league: 'Bundesliga',
    status: 'doneDeal',
    fee: '€80m',
    probability: 100,
    image: 'https://images.unsplash.com/photo-1624880357913-a8539238245b?w=300&h=300&fit=crop&auto=format',
    date: '1d ago',
    excerpt: 'Done deal: Dias lands in Munich, completes medical checks, and signs paperwork at Sabener Strasse.',
    source: 'Fabrizio Romano',
  },
  {
    id: 't6',
    player: 'Jude Bellingham',
    pos: 'CM',
    age: 21,
    from: 'Real Madrid',
    to: 'PSG',
    league: 'Ligue 1',
    status: 'rumour',
    fee: '€250m',
    probability: 30,
    image: 'https://images.unsplash.com/photo-1522778119026-d647f0596c20?w=300&h=300&fit=crop&auto=format',
    date: '1d ago',
    excerpt: "PSG's owners are willing to test Real Madrid's resolve with a world-record figure next summer.",
    source: 'L’Équipe',
  },
  {
    id: 't7',
    player: 'Kiprotich Benson',
    pos: 'ST',
    age: 24,
    from: 'Gor Mahia',
    to: 'Simba SC',
    league: 'East Africa',
    status: 'doneDeal',
    fee: '$450k',
    probability: 100,
    image: 'https://images.unsplash.com/photo-1560272564-c83b66b1ad12?w=300&h=300&fit=crop&auto=format',
    date: '2d ago',
    excerpt: 'KPL top scorer completes high-profile move across border to Tanzanian giants Simba SC.',
    source: 'Local Football Kenya',
  },
]

const STATUS_MAP: Record<string, string> = {
  confirmed: 'CONFIRMED',
  rumour: 'RUMOUR',
  doneDeal: 'DONE DEAL',
}

const STATUS_COLOR: Record<string, string> = {
  confirmed: '#22c55e',
  rumour: '#f59e0b',
  doneDeal: '#3b82f6',
}

const FILTERS = ['All', 'Confirmed', 'Rumours', 'Done Deals']

export default function Transfers() {
  const { t } = useApp()
  const [filter, setFilter] = useState('All')
  const [search, setSearch] = useState('')
  const [expanded, setExpanded] = useState<string | null>(null)
  const [userVotes, setUserVotes] = useState<Record<string, 'real' | 'fake'>>({})

  const filteredTransfers = useMemo(() => {
    return TRANSFERS.filter(tr => {
      const matchFilter =
        filter === 'All' ||
        (filter === 'Confirmed' && tr.status === 'confirmed') ||
        (filter === 'Rumours' && tr.status === 'rumour') ||
        (filter === 'Done Deals' && tr.status === 'doneDeal')

      const matchSearch =
        search.trim() === '' ||
        tr.player.toLowerCase().includes(search.toLowerCase()) ||
        tr.from.toLowerCase().includes(search.toLowerCase()) ||
        tr.to.toLowerCase().includes(search.toLowerCase())

      return matchFilter && matchSearch
    })
  }, [filter, search])

  const handleVote = (id: string, vote: 'real' | 'fake') => {
    setUserVotes(prev => ({ ...prev, [id]: vote }))
  }

  return (
    <div style={{ background: '#0a0a14', minHeight: '100vh', width: '100%' }}>
      {/* Header Banner */}
      <div style={{ background: 'linear-gradient(135deg,#12122a 0%,#0a1a14 100%)', borderBottom: '1px solid #1e1e32' }}>
        <div className="max-w-screen-xl mx-auto px-4 py-8">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
            <div>
              <span className="text-xs font-black uppercase tracking-widest text-[#00b341]">LIVE MARKET TRACKER</span>
              <h1 className="text-4xl font-black text-white" style={{ fontFamily: 'Big Shoulders Display' }}>{t('transfers')}</h1>
            </div>

            {/* Quick stats strip */}
            <div className="flex items-center gap-3 flex-wrap">
              <div className="px-4 py-2 rounded-lg text-center" style={{ background: '#131320', border: '1px solid #1e1e32' }}>
                <p className="text-xs text-gray-500 uppercase font-black">Top Fee</p>
                <p className="text-lg font-black text-[#00b341]" style={{ fontFamily: 'Big Shoulders Display' }}>€250m</p>
              </div>
              <div className="px-4 py-2 rounded-lg text-center" style={{ background: '#131320', border: '1px solid #1e1e32' }}>
                <p className="text-xs text-gray-500 uppercase font-black">Deals Tracked</p>
                <p className="text-lg font-black text-white" style={{ fontFamily: 'Big Shoulders Display' }}>{TRANSFERS.length}</p>
              </div>
              <div className="px-4 py-2 rounded-lg text-center" style={{ background: '#131320', border: '1px solid #1e1e32' }}>
                <p className="text-xs text-gray-500 uppercase font-black">Window Status</p>
                <p className="text-lg font-black text-yellow-400" style={{ fontFamily: 'Big Shoulders Display' }}>OPEN 🟢</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-screen-xl mx-auto px-4 py-8">
        {/* Controls Bar: Filters + Search */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mb-8">
          {/* Status chips */}
          <div className="flex gap-2 overflow-x-auto ticker-scroll w-full sm:w-auto pb-2 sm:pb-0">
            {FILTERS.map(f => {
              const active = filter === f
              return (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className="px-4 py-2 text-xs font-bold rounded-full transition-all flex-none"
                  style={{
                    background: active ? '#00b341' : '#131320',
                    color: active ? '#ffffff' : '#9ca3af',
                    border: active ? '1px solid #00b341' : '1px solid #1e1e32',
                  }}
                >
                  {f}
                </button>
              )
            })}
          </div>

          {/* Search box */}
          <div className="relative w-full sm:w-72">
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search player or club..."
              className="w-full px-4 py-2.5 text-xs text-white placeholder-gray-500 rounded-lg outline-none"
              style={{ background: '#131320', border: '1px solid #1e1e32' }}
            />
            {search && (
              <button
                onClick={() => setSearch('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white text-xs"
              >
                ✕
              </button>
            )}
          </div>
        </div>

        {/* Leaderboard Ad */}
        <div className="mb-8 flex justify-center">
          <AdBanner size="leaderboard" />
        </div>

        {/* Main Grid */}
        <div className="grid lg:grid-cols-3 gap-8">
          {/* Left 2 Cols: Transfer List */}
          <div className="lg:col-span-2 space-y-4">
            <div className="flex items-center justify-between border-b pb-2" style={{ borderColor: '#1e1e32' }}>
              <h2 className="text-lg font-black text-white uppercase tracking-wider" style={{ fontFamily: 'Big Shoulders Display' }}>
                Transfer Feed
              </h2>
              <span className="text-xs text-gray-500">{filteredTransfers.length} entries</span>
            </div>

            {filteredTransfers.length === 0 ? (
              <div className="text-center py-16 rounded-xl" style={{ background: '#131320', border: '1px solid #1e1e32' }}>
                <p className="text-4xl mb-2">⚽</p>
                <p className="text-base font-bold text-white mb-1">No transfers found</p>
                <p className="text-xs text-gray-400">Try searching for a different player or clearing filters.</p>
              </div>
            ) : (
              filteredTransfers.map(tr => {
                const isExpanded = expanded === tr.id
                return (
                  <div
                    key={tr.id}
                    className="rounded-xl overflow-hidden transition-all duration-300"
                    style={{ background: '#131320', border: '1px solid #1e1e32' }}
                  >
                    <button
                      className="w-full flex items-center gap-4 p-4 text-left transition-colors hover:bg-white/5"
                      onClick={() => setExpanded(isExpanded ? null : tr.id)}
                    >
                      {/* Avatar */}
                      <div className="relative shrink-0">
                        <img src={tr.image} alt={tr.player} className="w-14 h-14 rounded-xl object-cover" />
                        <span className="absolute -bottom-1 -right-1 text-[9px] font-black px-1.5 py-0.5 rounded text-white" style={{ background: '#1a1a28', border: '1px solid #2a2a40' }}>
                          {tr.pos}
                        </span>
                      </div>

                      {/* Main Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <h3 className="font-black text-white text-lg leading-none" style={{ fontFamily: 'Big Shoulders Display' }}>
                            {tr.player}
                          </h3>
                          <span
                            className="text-[10px] font-black px-2 py-0.5 rounded text-white"
                            style={{ background: STATUS_COLOR[tr.status] }}
                          >
                            {STATUS_MAP[tr.status]}
                          </span>
                        </div>
                        <p className="text-xs text-gray-400">
                          <span className="font-semibold text-white">{tr.from}</span> → <span className="font-semibold text-[#00b341]">{tr.to}</span>
                        </p>
                      </div>

                      {/* Fee & Expand Arrow */}
                      <div className="text-right shrink-0">
                        <p className="text-base font-black text-white" style={{ fontFamily: 'Big Shoulders Display' }}>
                          {tr.fee}
                        </p>
                        <p className="text-[11px] text-gray-500">{tr.date}</p>
                      </div>
                    </button>

                    {/* Expanded Drawer Details */}
                    {isExpanded && (
                      <div className="px-5 pb-5 pt-3 border-t" style={{ borderColor: '#1e1e32', background: '#0d0d18' }}>
                        <p className="text-xs text-gray-300 leading-relaxed mb-4">{tr.excerpt}</p>

                        {/* Probability meter */}
                        <div className="mb-4">
                          <div className="flex justify-between items-center text-xs mb-1">
                            <span className="text-gray-400">Deal Likelihood</span>
                            <span className="font-bold text-[#00b341]">{tr.probability}%</span>
                          </div>
                          <div className="h-1.5 w-full rounded-full overflow-hidden" style={{ background: '#1e1e32' }}>
                            <div
                              className="h-full rounded-full transition-all duration-500"
                              style={{ width: `${tr.probability}%`, background: tr.probability > 70 ? '#22c55e' : tr.probability > 40 ? '#f59e0b' : '#3b82f6' }}
                            />
                          </div>
                        </div>

                        {/* Meta info & Community Poll */}
                        <div className="flex items-center justify-between pt-2 text-xs border-t border-[#1e1e32] flex-wrap gap-2">
                          <span className="text-gray-500">Source: <strong className="text-gray-300">{tr.source}</strong></span>

                          <div className="flex items-center gap-2">
                            <span className="text-gray-400 text-[11px]">Fan Verdict:</span>
                            <button
                              onClick={() => handleVote(tr.id, 'real')}
                              className={`px-2.5 py-1 text-[10px] font-bold rounded transition-colors ${
                                userVotes[tr.id] === 'real' ? 'bg-[#00b341] text-white' : 'bg-[#1e1e32] text-gray-400 hover:text-white'
                              }`}
                            >
                              👍 Real Deal
                            </button>
                            <button
                              onClick={() => handleVote(tr.id, 'fake')}
                              className={`px-2.5 py-1 text-[10px] font-bold rounded transition-colors ${
                                userVotes[tr.id] === 'fake' ? 'bg-red-500 text-white' : 'bg-[#1e1e32] text-gray-400 hover:text-white'
                              }`}
                            >
                              👎 Fake News
                            </button>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )
              })
            )}
          </div>

          {/* Right Sidebar */}
          <div className="space-y-6">
            {/* Highest Value Deals Widget */}
            <div className="rounded-xl p-5" style={{ background: '#131320', border: '1px solid #1e1e32' }}>
              <h3
                className="font-black text-white text-base mb-4 uppercase tracking-wider flex items-center justify-between"
                style={{ fontFamily: 'Big Shoulders Display' }}
              >
                <span>💰 Biggest Rumours</span>
                <span className="text-xs text-[#00b341]">Top Values</span>
              </h3>
              <div className="space-y-3">
                {TRANSFERS.slice(0, 4).map(tr => (
                  <div key={tr.id} className="flex items-center gap-3 p-2 rounded-lg border border-[#1e1e32]" style={{ background: '#0d0d1e' }}>
                    <img src={tr.image} alt={tr.player} className="w-10 h-10 rounded-lg object-cover" />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-bold text-white truncate">{tr.player}</p>
                      <p className="text-[10px] text-gray-400">{tr.from} → {tr.to}</p>
                    </div>
                    <span className="text-xs font-black text-[#00b341]">{tr.fee}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Sidebar 160x600 Wide Skyscraper Ad */}
            <div className="flex justify-center my-4">
              <AdBanner size="skyscraper" label="Transfer Market Skyscraper" />
            </div>

            {/* Newsletter Card */}
            <div className="rounded-xl p-5 text-center" style={{ background: 'linear-gradient(135deg, #131320 0%, #0a1a14 100%)', border: '1px solid #00b341' }}>
              <span className="text-3xl mb-2 block">🔔</span>
              <h4 className="font-black text-white text-lg mb-1" style={{ fontFamily: 'Big Shoulders Display' }}>
                Never Miss a Here We Go!
              </h4>
              <p className="text-xs text-gray-400 mb-4">
                Get instant breaking transfer alerts directly in your inbox.
              </p>
              <div className="flex gap-2">
                <input
                  type="email"
                  placeholder="Your email address"
                  className="flex-1 px-3 py-2 text-xs text-white bg-[#0a0a14] rounded border border-[#1e1e32] outline-none focus:border-[#00b341]"
                />
                <button className="px-3 py-2 text-xs font-bold text-white rounded" style={{ background: '#00b341' }}>
                  Subscribe
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
