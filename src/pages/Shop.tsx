import { useState, useMemo, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useApp } from '../context/AppContext'
import { Truck, RotateCcw, Lock, Globe } from 'lucide-react'
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
  type?: 'physical' | 'digital'
  digital_file_url?: string | null
  access_password?: string | null
  platforms?: string[]
  mac_url?: string | null
  windows_url?: string | null
  android_url?: string | null
  ios_url?: string | null
  addons?: Array<{ id: string; label: string; price: number; icon?: string }>
  sku?: string | null
  team?: string | null
  kitType?: string | null
  version?: string | null
  sizes?: string[] | null
  gender?: string | null
  playerList?: string | null
  info_shipping?: string | null
  info_sizing?: string | null
  info_returns?: string | null
  info_assistance?: string | null
  spec_material?: string | null
  spec_fit?: string | null
  spec_origin?: string | null
  spec_care?: string | null
  printing_enabled?: boolean
  printing_price?: number
}

type SortOption = 'newest' | 'popular' | 'price-asc' | 'price-desc'


const DEFAULT_SHOP_PRODUCTS: ProductType[] = [
  {
    id: 'p1771285147628',
    name: 'Dell Latitude 5420',
    price: 43000,
    originalPrice: 55000,
    category: 'Laptops',
    badge: 'HOT',
    rating: 4.8,
    reviews: 18,
    images: ['https://pub-8ce7dd1a0bfc42fb9e3a130e1f5f5aae.r2.dev/images/products/p1771285147628_0.png'],
    description: '11th Gen Intel Core i7-1185G7 Quad-Core Processor, 16GB DDR4 RAM, 512GB NVMe SSD, 14-inch Full HD Display, Windows 11 Pro.',
  },
  {
    id: 'p1771285147629',
    name: 'Pioneer DDJ-REV1',
    price: 50000,
    originalPrice: 62000,
    category: 'DJ Controllers',
    badge: 'BESTSELLER',
    rating: 4.9,
    reviews: 24,
    images: ['https://images.unsplash.com/photo-1598488035139-bdbb2231ce04?w=600&h=600&fit=crop'],
    description: '2-channel DJ controller for Serato DJ Lite. Battle-style layout with 60mm tempo sliders and Tracking Scratch feature.',
  },
  {
    id: 'p1771285147630',
    name: 'FlowerZFC Official Home Jersey 2026',
    price: 6500,
    originalPrice: 8500,
    category: 'Jerseys',
    badge: 'OFFICIAL',
    rating: 4.9,
    reviews: 214,
    images: ['https://images.unsplash.com/photo-1522778119026-d647f0596c20?w=600&h=600&fit=crop'],
    description: 'Official FlowerZFC Home Jersey 2026 season. Premium breathable performance fabric with moisture-wicking technology.',
  },
  {
    id: 'p1771285147631',
    name: 'HP ZBook Power 15U G8',
    price: 70000,
    originalPrice: 85000,
    category: 'Laptops',
    badge: 'PRO',
    rating: 4.8,
    reviews: 12,
    images: ['https://images.unsplash.com/photo-1588872657578-7efd1f1555ed?w=600&h=600&fit=crop'],
    description: 'Intel Core i7-11800H, 32GB RAM, 1TB NVMe SSD, NVIDIA T1200 4GB GPU, 15.6-inch FHD IPS Display.',
  }
]
const BADGE_COLORS: Record<string, string> = {
  HOT: '#ef4444',
  BESTSELLER: '#00b341',
  FEATURED: '#3b82f6',
  NEW: '#f59e0b',
}

function StarRating({ rating }: { rating: number }) {
  const full = Math.round(rating)
  return (
    <div className="flex items-center gap-0.5" style={{ color: '#f59e0b' }}>
      {Array.from({ length: 5 }).map((_, i) => (
        <span key={i} style={{ opacity: i < full ? 1 : 0.25 }}>★</span>
      ))}
    </div>
  )
}


export default function Shop() {
  const { t, addToCart, formatPrice } = useApp()
  const [activeCategory, setActiveCategory] = useState('All')
  const [sortBy, setSortBy] = useState<SortOption>('newest')
  const [search, setSearch] = useState('')
  const [quickAdded, setQuickAdded] = useState<string | null>(null)
  const [productList, setProductList] = useState<ProductType[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchAllProducts().then(({ products, error }) => {
      if (!error && products && products.length > 0) {
        const formatted = products.map((p: any) => {
          let parsedImages = ['https://images.unsplash.com/photo-1551958219-acbc5dbf7f1e?w=600&h=600&fit=crop']
          if (Array.isArray(p.images) && p.images.length > 0) {
            parsedImages = p.images
          } else if (typeof p.images === 'string') {
            if (p.images.startsWith('[')) {
              try { parsedImages = JSON.parse(p.images) } catch { parsedImages = [p.images] }
            } else {
              parsedImages = [p.images]
            }
          } else if (p.image) {
            parsedImages = [p.image]
          }

          return {
            id: String(p.id),
            name: p.name || 'Unnamed Product',
            price: typeof p.price === 'number' ? p.price : parseFloat(p.price) || 0,
            originalPrice: p.originalPrice || p.original_price || p.compare_at_price || null,
            category: p.category || 'General',
            badge: p.badge || (p.is_hot ? 'HOT' : p.is_featured ? 'FEATURED' : null),
            rating: p.rating || 4.8,
            reviews: p.reviews || p.comments_count || 18,
            images: parsedImages,
            description: p.description || p.name,
            type: p.type || 'physical',
            digital_file_url: p.digital_file_url || null,
            access_password: p.access_password || null,
            platforms: Array.isArray(p.platforms) ? p.platforms : (typeof p.platforms === 'string' ? p.platforms.split(',').map((s: string) => s.trim()) : ['mac', 'windows', 'android']),
            mac_url: p.mac_url || null,
            windows_url: p.windows_url || null,
            android_url: p.android_url || null,
            ios_url: p.ios_url || null,
            addons: p.addons || null,
            sku: p.sku || null,
            team: p.team || null,
            kitType: p.kitType || null,
            version: p.version || null,
            sizes: p.sizes || null,
            gender: p.gender || null,
            playerList: p.playerList || null,
            info_shipping: p.info_shipping || null,
            info_sizing: p.info_sizing || null,
            info_returns: p.info_returns || null,
            info_assistance: p.info_assistance || null,
            spec_material: p.spec_material || null,
            spec_fit: p.spec_fit || null,
            spec_origin: p.spec_origin || null,
            spec_care: p.spec_care || null,
            printing_enabled: p.printing_enabled ?? false,
            printing_price: p.printing_price || 0,
          }
        })

        setProductList(formatted)
      } else if (error) {
        setProductList(DEFAULT_SHOP_PRODUCTS)
      } else {
        setProductList([])
      }
    }).catch(() => {
      setProductList(DEFAULT_SHOP_PRODUCTS)
    }).finally(() => setLoading(false))
  }, [])

  const categories = useMemo(() => {
    const cats = new Set(productList.map(p => p.category).filter(Boolean))
    return ['All', ...Array.from(cats)]
  }, [productList])

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

  const handleQuickAdd = (e: React.MouseEvent, p: ProductType) => {
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
            {categories.map(c => (
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
                <div className="relative overflow-hidden flex items-center justify-center p-3" style={{ height: '240px', background: '#0b0b14' }}>
                  <img
                    src={p.images[0]}
                    alt={p.name}
                    className="w-full h-full object-contain transition-transform duration-500 group-hover:scale-105"
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
                  {/* Digital Product Badge */}
                  {p.type === 'digital' && (
                    <span className="absolute top-3 left-3 text-[9px] font-black px-2 py-0.5 rounded-full text-white flex items-center gap-1" style={{ background: '#6366f1', marginTop: p.badge ? '22px' : '0' }}>
                      💾 DIGITAL
                    </span>
                  )}
                  {/* Sale tag */}
                  {p.originalPrice && (
                    <span className="absolute top-3 right-3 text-[9px] font-black px-2 py-0.5 rounded-full text-white bg-red-500">
                      SALE
                    </span>
                  )}

                  {/* Quick Add / Quick Download overlay */}
                  <button
                    onClick={e => handleQuickAdd(e, p)}
                    className="absolute bottom-0 left-0 right-0 py-2.5 text-xs font-black text-white opacity-0 group-hover:opacity-100 transition-all duration-300 translate-y-full group-hover:translate-y-0"
                    style={{ background: quickAdded === p.id ? '#22c55e' : p.type === 'digital' ? '#6366f1' : '#00b341' }}
                  >
                    {quickAdded === p.id ? '✓ Added!' : p.type === 'digital' ? '💾 Buy & Download' : '+ Quick Add (Size M)'}
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
                      {formatPrice(Number(p.price) || 0)}
                    </span>
                    {p.originalPrice != null && (
                      <span className="text-xs text-gray-500 line-through">
                        {formatPrice(Number(p.originalPrice) || 0)}
                      </span>
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
            { Icon: Truck, title: 'Free Shipping', sub: 'On orders over $80' },
            { Icon: RotateCcw, title: '30-Day Returns', sub: 'No questions asked' },
            { Icon: Lock, title: 'Secure Checkout', sub: 'SSL encrypted & safe' },
            { Icon: Globe, title: 'Ships Worldwide', sub: 'Kenya to the globe' },
          ].map(b => (
            <div key={b.title} className="flex items-center gap-3 p-4 rounded-xl border border-[#1e1e32]" style={{ background: '#131320' }}>
              <b.Icon size={22} strokeWidth={2} className="text-[#00b341] shrink-0" />
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
