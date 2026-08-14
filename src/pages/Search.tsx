import { useState, useMemo } from 'react'
import { useSearchParams, Link } from 'react-router-dom'
import { useApp } from '../context/AppContext'
import AdBanner from '../components/AdBanner'

interface SearchResult {
  id: string
  type: 'match' | 'news' | 'club' | 'player' | 'product'
  title: string
  subtitle: string
  link: string
  image?: string
  tag?: string
}

const SEARCH_DATABASE: SearchResult[] = [
  // Clubs
  { id: 'c1', type: 'club', title: 'Arsenal FC', subtitle: 'Premier League · 1st Place', link: '/club/arsenal', tag: 'CLUB' },
  { id: 'c2', type: 'club', title: 'Liverpool FC', subtitle: 'Premier League · 2nd Place', link: '/club/liverpool', tag: 'CLUB' },
  { id: 'c3', type: 'club', title: 'Manchester City FC', subtitle: 'Premier League · 3rd Place', link: '/club/man-city', tag: 'CLUB' },
  { id: 'c4', type: 'club', title: 'Chelsea FC', subtitle: 'Premier League · 4th Place', link: '/club/chelsea', tag: 'CLUB' },
  { id: 'c5', type: 'club', title: 'Wolverhampton Wanderers', subtitle: 'Premier League · 15th Place', link: '/club/wolves', tag: 'CLUB' },

  // Players
  { id: 'p1', type: 'player', title: 'Bukayo Saka', subtitle: 'Arsenal FC · Right Winger', link: '/player/saka', tag: 'PLAYER' },
  { id: 'p2', type: 'player', title: 'Erling Haaland', subtitle: 'Manchester City · Striker', link: '/player/haaland', tag: 'PLAYER' },
  { id: 'p3', type: 'player', title: 'Martin Ødegaard', subtitle: 'Arsenal FC · Midfielder', link: '/player/odegaard', tag: 'PLAYER' },
  { id: 'p4', type: 'player', title: 'Cole Palmer', subtitle: 'Chelsea FC · Attacking Midfielder', link: '/player/palmer', tag: 'PLAYER' },

  // News
  { id: 'n1', type: 'news', title: 'Arsenal Dominate Derby to Go 3 Points Clear at the Top', subtitle: 'Match Report · James Mwangi', link: '/news/a1', tag: 'NEWS' },
  { id: 'n2', type: 'news', title: 'Here We Go: Chelsea Complete £80m Signing of Bundesliga Prodigy', subtitle: 'Transfers · Sarah Okonkwo', link: '/news/a2', tag: 'NEWS' },
  { id: 'n3', type: 'news', title: "Why Pep's High Press Is Struggling Against Low Blocks", subtitle: 'Analysis · David Kamau', link: '/news/a3', tag: 'NEWS' },
  { id: 'n4', type: 'news', title: 'Harambee Stars Name Strong 26-Man Squad for AFCON Battles', subtitle: 'AFCON · Peter Otieno', link: '/news/a4', tag: 'NEWS' },

  // Matches
  { id: 'm1', type: 'match', title: 'Arsenal 2 - 1 Chelsea', subtitle: 'Premier League · Live 67\'', link: '/scores/m1', tag: 'LIVE MATCH' },
  { id: 'm2', type: 'match', title: 'Man City 0 - 0 Liverpool', subtitle: 'Premier League · Live 34\'', link: '/scores/m2', tag: 'LIVE MATCH' },

  // Products
  { id: 'pr1', type: 'product', title: 'FlowerZFC Official Home Jersey 2025/26', subtitle: 'Authentic Kit · $79.99', link: '/shop', tag: 'SHOP' },
  { id: 'pr2', type: 'product', title: 'FlowerZFC Vintage Hoodie - Black Edition', subtitle: 'Apparel · $59.99', link: '/shop', tag: 'SHOP' },
]

const CATEGORIES = ['All', 'Clubs', 'Players', 'News', 'Matches', 'Shop']

export default function Search() {
  const { t } = useApp()
  const [searchParams, setSearchParams] = useSearchParams()
  const initialQ = searchParams.get('q') || ''
  const [query, setQuery] = useState(initialQ)
  const [category, setCategory] = useState('All')

  const results = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return []
    return SEARCH_DATABASE.filter(item => {
      const matchCat =
        category === 'All' ||
        (category === 'Clubs' && item.type === 'club') ||
        (category === 'Players' && item.type === 'player') ||
        (category === 'News' && item.type === 'news') ||
        (category === 'Matches' && item.type === 'match') ||
        (category === 'Shop' && item.type === 'product')

      const matchQ = item.title.toLowerCase().includes(q) || item.subtitle.toLowerCase().includes(q)
      return matchCat && matchQ
    })
  }, [query, category])

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setSearchParams({ q: query })
  }

  return (
    <div style={{ background: '#0a0a14', minHeight: '100vh', width: '100%' }}>
      {/* Header Banner */}
      <div style={{ background: 'linear-gradient(135deg,#12122a 0%,#0a1a14 100%)', borderBottom: '1px solid #1e1e32' }}>
        <div className="max-w-screen-xl mx-auto px-4 py-8">
          <span className="text-xs font-black uppercase tracking-widest text-[#00b341]">GLOBAL SEARCH</span>
          <h1 className="text-4xl font-black text-white mb-4" style={{ fontFamily: 'Big Shoulders Display' }}>
            Search Results
          </h1>
          <div className="flex justify-center mb-6">
            <AdBanner size="leaderboard" label="Search Sponsor Ad" />
          </div>

          {/* Search Bar Input */}
          <form onSubmit={handleSearchSubmit} className="relative max-w-2xl">
            <input
              type="text"
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Search teams, players, news, or matches..."
              className="w-full px-5 py-3.5 text-sm text-white placeholder-gray-500 rounded-xl outline-none"
              style={{ background: '#131320', border: '1px solid #1e1e32' }}
            />
            {query && (
              <button
                type="button"
                onClick={() => setQuery('')}
                className="absolute right-12 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white text-xs"
              >
                ✕
              </button>
            )}
            <button
              type="submit"
              className="absolute right-3 top-1/2 -translate-y-1/2 px-3 py-1.5 rounded-lg text-xs font-bold text-white"
              style={{ background: '#00b341' }}
            >
              Search
            </button>
          </form>
        </div>
      </div>

      <div className="max-w-screen-xl mx-auto px-4 py-8">
        {/* Category Chips */}
        <div className="flex gap-2 overflow-x-auto ticker-scroll pb-4 mb-6">
          {CATEGORIES.map(c => {
            const active = category === c
            return (
              <button
                key={c}
                onClick={() => setCategory(c)}
                className="px-4 py-2 text-xs font-bold rounded-full transition-all flex-none"
                style={{
                  background: active ? '#00b341' : '#131320',
                  color: active ? '#ffffff' : '#9ca3af',
                  border: active ? '1px solid #00b341' : '1px solid #1e1e32',
                }}
              >
                {c}
              </button>
            )
          })}
        </div>

        {/* Results Info */}
        <div className="flex items-center justify-between border-b pb-3 mb-6" style={{ borderColor: '#1e1e32' }}>
          <h2 className="text-base font-black text-white uppercase tracking-wider" style={{ fontFamily: 'Big Shoulders Display' }}>
            {query ? `Results for "${query}"` : 'Enter a search term'}
          </h2>
          <span className="text-xs text-gray-500">{results.length} matches found</span>
        </div>

        {/* Results List */}
        {!query.trim() ? (
          <div className="text-center py-16 rounded-xl" style={{ background: '#131320', border: '1px solid #1e1e32' }}>
            <p className="text-4xl mb-2">🔍</p>
            <p className="text-base font-bold text-white mb-2">Search FlowerZFC Platform</p>
            <p className="text-xs text-gray-400 mb-6">Type a club name, player, news title, or fixture above.</p>
            <div className="flex items-center justify-center gap-2 flex-wrap text-xs text-gray-400">
              <span className="font-bold text-gray-500">Popular:</span>
              {['Arsenal', 'Saka', 'Chelsea', 'Transfers', 'Harambee Stars'].map(p => (
                <button
                  key={p}
                  onClick={() => { setQuery(p); setSearchParams({ q: p }) }}
                  className="px-3 py-1 rounded-full bg-[#1a1a28] hover:bg-[#00b341] text-white transition-colors"
                >
                  {p}
                </button>
              ))}
            </div>
          </div>
        ) : results.length === 0 ? (
          <div className="text-center py-16 rounded-xl" style={{ background: '#131320', border: '1px solid #1e1e32' }}>
            <p className="text-4xl mb-2">⚽</p>
            <p className="text-base font-bold text-white mb-1">No matching results</p>
            <p className="text-xs text-gray-400">Try searching for keywords like "Arsenal", "Saka", "Transfers", or "Liverpool".</p>
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {results.map(r => (
              <Link
                key={r.id}
                to={r.link}
                className="p-5 rounded-xl border border-[#1e1e32] hover:border-[#00b341] transition-all flex flex-col justify-between group"
                style={{ background: '#131320' }}
              >
                <div>
                  <span className="text-[9px] font-black text-[#00b341] uppercase tracking-wider block mb-2">
                    {r.tag}
                  </span>
                  <h3 className="text-base font-bold text-white group-hover:text-[#00b341] transition-colors mb-1">
                    {r.title}
                  </h3>
                  <p className="text-xs text-gray-400">{r.subtitle}</p>
                </div>
                <div className="mt-4 pt-3 border-t border-[#1e1e32] text-right">
                  <span className="text-xs font-bold text-[#00b341]">View →</span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
