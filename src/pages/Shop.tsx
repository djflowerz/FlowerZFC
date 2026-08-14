import { useState, useMemo, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useApp } from '../context/AppContext'
import AdBanner from '../components/AdBanner'
import { fetchAllProducts } from '../services/supabaseClient'

export const PRODUCTS = [
  {
    id: 'jersey-home',
    name: 'FlowerZFC Home Jersey 2026',
    price: 49.99,
    originalPrice: 64.99,
    category: 'Apparel',
    badge: 'BESTSELLER',
    rating: 4.8,
    reviews: 214,
    images: [
      'https://images.unsplash.com/photo-1522778119026-d647f0596c20?w=600&h=700&fit=crop&auto=format',
      'https://images.unsplash.com/photo-1560272564-c83b66b1ad12?w=600&h=700&fit=crop&auto=format',
    ],
    description: 'Official FlowerZFC Home Jersey 2026 season. Premium breathable performance fabric with moisture-wicking technology. Ideal for match days and training sessions.',
  },
  {
    id: 'jersey-away',
    name: 'FlowerZFC Away Jersey 2026',
    price: 49.99,
    originalPrice: null,
    category: 'Apparel',
    badge: null,
    rating: 4.6,
    reviews: 87,
    images: [
      'https://images.unsplash.com/photo-1431324155629-1a6deb1dec8d?w=600&h=700&fit=crop&auto=format',
    ],
    description: 'Official FlowerZFC Away Jersey 2026 season. Lightweight performance fabric with heat-transfer badge.',
  },
  {
    id: 'hoodie-bigstone',
    name: 'Bigstone Entertainment Hoodie',
    price: 65.00,
    originalPrice: null,
    category: 'Apparel',
    badge: 'NEW',
    rating: 4.9,
    reviews: 42,
    images: [
      'https://images.unsplash.com/photo-1489987707025-afc232f7ea0f?w=600&h=700&fit=crop&auto=format',
    ],
    description: 'Bigstone Entertainment branded hoodie. Premium 320gsm cotton-polyester blend. Double-lined hood.',
  },
  {
    id: 'cap-flowerz',
    name: 'DJ Flowerz Snapback Cap',
    price: 28.00,
    originalPrice: null,
    category: 'Accessories',
    badge: null,
    rating: 4.7,
    reviews: 138,
    images: [
      'https://images.unsplash.com/photo-1588850561407-ed78c282e89b?w=600&h=700&fit=crop&auto=format',
    ],
    description: 'Adjustable snapback cap with embroidered DJ Flowerz logo. One size fits all.',
  },
  {
    id: 'poster-afcon',
    name: 'AFCON 2026 Limited Art Print',
    price: 18.00,
    originalPrice: 24.99,
    category: 'Posters',
    badge: 'LIMITED',
    rating: 5.0,
    reviews: 29,
    images: [
      'https://images.unsplash.com/photo-1574629810360-7efbbe195018?w=600&h=700&fit=crop&auto=format',
    ],
    description: 'Limited edition AFCON 2026 collectible art print. A3 size, 300gsm premium matte paper.',
  },
  {
    id: 'scarf-flowerz',
    name: 'FlowerZFC Supporters Scarf',
    price: 22.00,
    originalPrice: null,
    category: 'Accessories',
    badge: null,
    rating: 4.5,
    reviews: 61,
    images: [
      'https://images.unsplash.com/photo-1508098682722-e99c43a406b2?w=600&h=700&fit=crop&auto=format',
    ],
    description: 'FlowerZFC supporters scarf. 100% acrylic, double-knit. Perfect for matchdays.',
  },
]

type SortOption = 'newest' | 'price-asc' | 'price-desc' | 'popular'
const CATEGORIES = ['All', 'Apparel', 'Accessories', 'Posters']

const BADGE_COLORS: Record<string, string> = {
  BESTSELLER: '#00b341',
  NEW: '#3b82f6',
  LIMITED: '#f59e0b',
  SALE: '#ef4444',
}

function StarRating({ rating }: { rating: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map(s => (
        <svg key={s} width="10" height="10" viewBox="0 0 24 24" fill={s <= Math.round(rating) ? '#f59e0b' : 'none'} stroke="#f59e0b" strokeWidth={2}>
          <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
        </svg>
      ))}
    </div>
  )
}

export default function Shop() {
  const { t, addToCart } = useApp()
  const [activeCategory, setActiveCategory] = useState('All')
  const [sortBy, setSortBy] = useState<SortOption>('newest')
  const [search, setSearch] = useState('')
  const [quickAdded, setQuickAdded] = useState<string | null>(null)
  const [productList, setProductList] = useState<typeof PRODUCTS>(PRODUCTS)

  useEffect(() => {
    fetchAllProducts().then(({ products, error }) => {
      if (!error && products && products.length > 0) {
        const formatted = products.map((p: any) => ({
          id: String(p.id),
          name: p.name || 'Unnamed Product',
          price: typeof p.price === 'number' ? p.price : parseFloat(p.price) || 0,
          originalPrice: p.originalPrice || p.original_price || null,
          category: p.category || 'Gear',
          badge: p.badge || null,
          rating: p.rating || 4.5,
          reviews: p.reviews || 12,
          images: Array.isArray(p.images) ? p.images : (typeof p.images === 'string' && p.images.startsWith('[') ? JSON.parse(p.images) : [p.images || 'https://images.unsplash.com/photo-1522778119026-d647f0596c20?w=600&h=700&fit=crop&auto=format']),
          description: p.description || p.name,
        }))
        setProductList(formatted as any)
      } else {
        // Fallback to products.json
        fetch('/products.json')
          .then(r => r.json())
          .then(data => {
            if (Array.isArray(data) && data.length > 0) {
              setProductList(data)
            }
          })
          .catch(() => {})
      }
    })
  }, [])

  const filtered = useMemo(() => {
    let list = productList.filter(p => {
      const matchCat = activeCategory === 'All' || p.category === activeCategory
      const matchSearch = search.trim() === '' || p.name.toLowerCase().includes(search.toLowerCase())
      return matchCat && matchSearch
    })
    if (sortBy === 'price-asc') list = [...list].sort((a, b) => a.price - b.price)
    if (sortBy === 'price-desc') list = [...list].sort((a, b) => b.price - a.price)
    if (sortBy === 'popular') list = [...list].sort((a, b) => b.reviews - a.reviews)
    return list
  }, [productList, activeCategory, sortBy, search])

  const handleQuickAdd = (e: React.MouseEvent, p: typeof PRODUCTS[0]) => {
    e.preventDefault()
    e.stopPropagation()
    addToCart({ id: p.id, name: p.name, price: p.price, size: 'M', quantity: 1, image: p.images[0] })
    setQuickAdded(p.id)
    setTimeout(() => setQuickAdded(null), 2000)
  }

  return (
    <div style={{ background: '#0a0a14', minHeight: '100vh' }}>
      {/* Header Banner */}
      <div style={{ background: 'linear-gradient(135deg,#12122a 0%,#0a1a14 100%)', borderBottom: '1px solid #1e1e32' }}>
        <div className="max-w-screen-xl mx-auto px-4 py-8">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <span className="text-xs font-black uppercase tracking-widest text-[#00b341]">OFFICIAL STORE</span>
              <h1 className="text-4xl font-black text-white" style={{ fontFamily: 'Big Shoulders Display' }}>
                FlowerZFC Merch Shop
              </h1>
              <p className="text-xs text-gray-400 mt-1">Official jerseys, apparel & accessories. Ships across East Africa & worldwide.</p>
            </div>

            {/* Search */}
            <div className="relative w-full sm:w-64">
              <input
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search products..."
                className="w-full px-4 py-2.5 text-xs text-white placeholder-gray-500 rounded-xl outline-none focus:ring-1 focus:ring-[#00b341]"
                style={{ background: '#131320', border: '1px solid #1e1e32' }}
              />
              {search && (
                <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white text-xs">✕</button>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-screen-xl mx-auto px-4 py-8">
        {/* Ad Banner */}
        <div className="mb-8 flex justify-center">
          <AdBanner size="leaderboard" />
        </div>

        {/* Filters Row */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
          {/* Category Chips */}
          <div className="flex gap-2 flex-wrap">
            {CATEGORIES.map(c => (
              <button
                key={c}
                onClick={() => setActiveCategory(c)}
                className="px-4 py-2 text-xs font-bold rounded-full transition-all"
                style={{
                  background: activeCategory === c ? '#00b341' : '#131320',
                  color: activeCategory === c ? '#fff' : '#9ca3af',
                  border: `1px solid ${activeCategory === c ? '#00b341' : '#1e1e32'}`,
                }}
              >
                {c}
              </button>
            ))}
          </div>

          {/* Right: Count + Sort */}
          <div className="flex items-center gap-3">
            <span className="text-xs text-gray-500">{filtered.length} product{filtered.length !== 1 ? 's' : ''}</span>
            <select
              value={sortBy}
              onChange={e => setSortBy(e.target.value as SortOption)}
              className="text-xs text-white rounded-lg px-3 py-2 outline-none focus:ring-1 focus:ring-[#00b341]"
              style={{ background: '#131320', border: '1px solid #1e1e32' }}
            >
              <option value="newest">Newest First</option>
              <option value="popular">Most Popular</option>
              <option value="price-asc">Price: Low → High</option>
              <option value="price-desc">Price: High → Low</option>
            </select>
          </div>
        </div>

        {/* Product Grid */}
        {filtered.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-4xl mb-3">🛍️</p>
            <p className="text-gray-400">No products found. Try a different search or category.</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-5">
            {filtered.map(p => (
              <Link
                key={p.id}
                to={`/shop/${p.id}`}
                className="group block rounded-2xl overflow-hidden transition-all duration-300 hover:border-[#00b341] hover:-translate-y-1 hover:shadow-2xl"
                style={{ background: '#131320', border: '1px solid #1e1e32' }}
              >
                {/* Image */}
                <div className="relative overflow-hidden" style={{ height: '240px' }}>
                  <img
                    src={p.images[0]}
                    alt={p.name}
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                  {/* Badge */}
                  {p.badge && (
                    <span
                      className="absolute top-3 left-3 text-[9px] font-black px-2 py-0.5 rounded-full text-white"
                      style={{ background: BADGE_COLORS[p.badge] || '#00b341' }}
                    >
                      {p.badge}
                    </span>
                  )}
                  {/* Sale tag */}
                  {p.originalPrice && (
                    <span className="absolute top-3 right-3 text-[9px] font-black px-2 py-0.5 rounded-full text-white bg-red-500">
                      SALE
                    </span>
                  )}

                  {/* Quick Add overlay */}
                  <button
                    onClick={e => handleQuickAdd(e, p)}
                    className="absolute bottom-0 left-0 right-0 py-2.5 text-xs font-black text-white opacity-0 group-hover:opacity-100 transition-all duration-300 translate-y-full group-hover:translate-y-0"
                    style={{ background: quickAdded === p.id ? '#22c55e' : '#00b341' }}
                  >
                    {quickAdded === p.id ? '✓ Added to Cart!' : '+ Quick Add (Size M)'}
                  </button>
                </div>

                {/* Info */}
                <div className="p-4">
                  <span className="text-[9px] font-bold text-gray-500 uppercase tracking-wider">{p.category}</span>
                  <h3 className="text-sm font-bold text-white line-clamp-1 mt-0.5 mb-1 group-hover:text-[#00b341] transition-colors">
                    {p.name}
                  </h3>

                  {/* Stars */}
                  <div className="flex items-center gap-1.5 mb-2">
                    <StarRating rating={p.rating} />
                    <span className="text-[10px] text-gray-500">({p.reviews})</span>
                  </div>

                  {/* Price */}
                  <div className="flex items-baseline gap-2">
                    <span className="text-lg font-black text-[#00b341]" style={{ fontFamily: 'Big Shoulders Display' }}>
                      ${p.price.toFixed(2)}
                    </span>
                    {p.originalPrice && (
                      <span className="text-xs text-gray-500 line-through">${p.originalPrice.toFixed(2)}</span>
                    )}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}

        {/* Trust Badges */}
        <div className="mt-12 grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { icon: '🚚', title: 'Free Shipping', sub: 'On orders over $80' },
            { icon: '🔄', title: '30-Day Returns', sub: 'No questions asked' },
            { icon: '🔒', title: 'Secure Checkout', sub: 'SSL encrypted & safe' },
            { icon: '🌍', title: 'Ships Worldwide', sub: 'Kenya to the globe' },
          ].map(b => (
            <div key={b.title} className="flex items-center gap-3 p-4 rounded-xl border border-[#1e1e32]" style={{ background: '#131320' }}>
              <span className="text-2xl">{b.icon}</span>
              <div>
                <p className="text-xs font-bold text-white">{b.title}</p>
                <p className="text-[10px] text-gray-500">{b.sub}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
