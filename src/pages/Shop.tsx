import { useState, useMemo, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useApp } from '../context/AppContext'
import AdBanner from '../components/AdBanner'
import { fetchAllProducts } from '../services/supabaseClient'

export interface ProductType {
  id: string
  name: string
  price: number
  originalPrice: number | null
  category: string
  badge: string | null
  rating: number
  reviews: number
  images: string[]
  description: string
}

export const DEFAULT_FLOWERZ_PRODUCTS: ProductType[] = [
  {
    id: 'fz-prod-1',
    name: 'FlowerZFC Official Home Jersey 2026',
    price: 4500,
    originalPrice: 5500,
    category: 'Jerseys',
    badge: 'BESTSELLER',
    rating: 4.9,
    reviews: 24,
    images: ['https://images.unsplash.com/photo-1522778119026-d647f0596c20?w=600&h=600&fit=crop'],
    description: 'Official 2026 FlowerZFC Home kit engineered with breathable moisture-wicking fabric, dynamic green gradient trim, and high-definition crest.',
  },
  {
    id: 'fz-prod-2',
    name: 'FlowerZFC Away Kit 2026 (Pro Edition)',
    price: 4500,
    originalPrice: 5200,
    category: 'Jerseys',
    badge: 'NEW',
    rating: 4.8,
    reviews: 19,
    images: ['https://images.unsplash.com/photo-1508098682722-e99c43a406b2?w=600&h=600&fit=crop'],
    description: 'Sleek dark edition away jersey featuring gold accents and custom ventilation panels for peak athletic performance.',
  },
  {
    id: 'fz-prod-3',
    name: 'Bigstone Entertainment Heavyweight Hoodie',
    price: 5500,
    originalPrice: 6500,
    category: 'Tracksuits',
    badge: 'HOT',
    rating: 5.0,
    reviews: 31,
    images: ['https://images.unsplash.com/photo-1556905055-8f358a7a47b2?w=600&h=600&fit=crop'],
    description: 'Premium 400GSM fleece hoodie with high-density embroidered DJ Flowerz & Bigstone Entertainment logos.',
  },
  {
    id: 'fz-prod-4',
    name: 'DJ Flowerz Signature Snapback + Scarf Pack',
    price: 2500,
    originalPrice: 3200,
    category: 'Accessories',
    badge: 'LIMITED',
    rating: 4.7,
    reviews: 14,
    images: ['https://images.unsplash.com/photo-1588850561407-ed78c282e89b?w=600&h=600&fit=crop'],
    description: 'Limited edition matchday accessory pack including high-density embroidered snapback and double-knit woven fan scarf.',
  },
  {
    id: 'fz-prod-5',
    name: 'FlowerZFC Official Matchball (FIFA Quality Pro)',
    price: 3800,
    originalPrice: 4500,
    category: 'Footballs',
    badge: 'BESTSELLER',
    rating: 4.9,
    reviews: 18,
    images: ['https://images.unsplash.com/photo-1614632537190-23e4146777db?w=600&h=600&fit=crop'],
    description: 'Thermally bonded 12-panel match football with micro-textured aerow-trac grooves for true flight precision.',
  },
  {
    id: 'fz-prod-6',
    name: 'AFCON 2026 Commemorative Art Print',
    price: 1800,
    originalPrice: 2400,
    category: 'Memorabilia',
    badge: 'LIMITED',
    rating: 4.9,
    reviews: 12,
    images: ['https://images.unsplash.com/photo-1579952363873-27f3bade9f55?w=600&h=600&fit=crop'],
    description: 'Hand-numbered giclée art print celebrating East African football culture and matchday energy.',
  },
]

export const PRODUCTS: ProductType[] = DEFAULT_FLOWERZ_PRODUCTS

export default function Shop() {
  const { t, addToCart } = useApp()
  const [activeCategory, setActiveCategory] = useState('All')
  const [sortBy, setSortBy] = useState<SortOption>('newest')
  const [search, setSearch] = useState('')
  const [quickAdded, setQuickAdded] = useState<string | null>(null)
  const [productList, setProductList] = useState<ProductType[]>(DEFAULT_FLOWERZ_PRODUCTS)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchAllProducts().then(({ products, error }) => {
      if (!error && products && products.length > 0) {
        const formatted = products.map((p: any) => ({
          id: String(p.id),
          name: p.name || 'Unnamed Product',
          price: typeof p.price === 'number' ? p.price : parseFloat(p.price) || 0,
          originalPrice: p.originalPrice || p.original_price || p.compare_at_price || null,
          category: p.category || 'Jerseys',
          badge: p.badge || (p.is_hot ? 'HOT' : p.is_featured ? 'FEATURED' : null),
          rating: p.rating || 4.8,
          reviews: p.reviews || p.comments_count || 18,
          images: Array.isArray(p.images) ? p.images : (typeof p.images === 'string' && p.images.startsWith('[') ? JSON.parse(p.images) : [p.image || p.images || 'https://images.unsplash.com/photo-1551958219-acbc5dbf7f1e?w=600&h=600&fit=crop']),
          description: p.description || p.name,
        }))
        setProductList(formatted)
      } else {
        setProductList(DEFAULT_FLOWERZ_PRODUCTS)
      }
    }).finally(() => setLoading(false))
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
