import { useState, useEffect } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { useApp } from '../context/AppContext'
import { fetchAllProducts } from '../services/supabaseClient'
import type { ProductType } from './Shop'

const SIZES = ['XS', 'S', 'M', 'L', 'XL', 'XXL']

function StarRating({ rating, reviews }: { rating: number; reviews: number }) {
  return (
    <div className="flex items-center gap-2">
      <div className="flex items-center gap-0.5">
        {[1, 2, 3, 4, 5].map(s => (
          <svg key={s} width="14" height="14" viewBox="0 0 24 24" fill={s <= Math.round(rating) ? '#f59e0b' : 'none'} stroke="#f59e0b" strokeWidth={2}>
            <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
          </svg>
        ))}
      </div>
      <span className="text-xs text-gray-400">{rating.toFixed(1)} ({reviews} reviews)</span>
    </div>
  )
}

export default function Product() {
  const { id } = useParams()
  const { t, addToCart } = useApp()
  const navigate = useNavigate()

  const [product, setProduct] = useState<ProductType | null>(null)
  const [allProducts, setAllProducts] = useState<ProductType[]>([])
  const [loading, setLoading] = useState(true)

  const [activeImage, setActiveImage] = useState(0)
  const [size, setSize] = useState('')
  const [qty, setQty] = useState(1)
  const [added, setAdded] = useState(false)
  const [wishlisted, setWishlisted] = useState(false)
  const [activeTab, setActiveTab] = useState<'description' | 'sizing' | 'shipping'>('description')

  useEffect(() => {
    setLoading(true)
    fetchAllProducts().then(({ products, error }) => {
      let formatted: ProductType[] = []
      if (!error && products && products.length > 0) {
        formatted = products.map((p: any) => ({
          id: String(p.id),
          name: p.name || 'Unnamed Product',
          price: typeof p.price === 'number' ? p.price : parseFloat(p.price) || 0,
          originalPrice: p.originalPrice || p.original_price || p.compare_at_price || null,
          category: p.category || 'General',
          badge: p.badge || (p.is_hot ? 'HOT' : p.is_featured ? 'FEATURED' : null),
          rating: p.rating || 4.8,
          reviews: p.reviews || p.comments_count || 18,
          images: Array.isArray(p.images) ? p.images : (typeof p.images === 'string' && p.images.startsWith('[') ? JSON.parse(p.images) : [p.image || p.images || 'https://images.unsplash.com/photo-1551958219-acbc5dbf7f1e?w=600&h=600&fit=crop']),
          description: p.description || p.name,
        }))
      }
      setAllProducts(formatted)
      const found = formatted.find(p => String(p.id) === String(id) || p.id.toLowerCase() === (id || '').toLowerCase() || p.name.toLowerCase().replace(/[^a-z0-9]+/g, '-') === (id || '').toLowerCase())
      setProduct(found || null)
    }).finally(() => setLoading(false))
  }, [id])

  if (loading) {
    return (
      <div style={{ background: '#0a0a14', minHeight: '100vh' }} className="flex items-center justify-center p-12 text-white">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-[#00b341] border-t-transparent rounded-full animate-spin"></div>
          <span className="text-sm font-bold text-gray-400">Loading product...</span>
        </div>
      </div>
    )
  }

  if (!product) {
    return (
      <div style={{ background: '#0a0a14', minHeight: '100vh' }} className="flex items-center justify-center p-12 text-white">
        <div className="text-center">
          <h2 className="text-2xl font-black text-white mb-2">Product Not Found</h2>
          <p className="text-sm text-gray-400 mb-6">The requested product item does not exist or has been removed.</p>
          <Link to="/shop" className="px-6 py-3 bg-[#00b341] text-white font-bold rounded-xl text-xs">Back to Shop →</Link>
        </div>
      </div>
    )
  }

  const isApparel = ['jerseys', 'shorts', 'tracksuits', 'apparel', 'clothing', 'boots', 'shoes'].includes((product.category || '').toLowerCase())

  const handleAdd = () => {
    const chosenSize = isApparel ? size : (size || 'Standard')
    if (isApparel && !size) return
    addToCart({ id: product.id, name: product.name, price: product.price, size: chosenSize, quantity: qty, image: product.images[0] })
    setAdded(true)
    setTimeout(() => setAdded(false), 2500)
  }

  const handleBuyNow = () => {
    const chosenSize = isApparel ? size : (size || 'Standard')
    if (isApparel && !size) return
    addToCart({ id: product.id, name: product.name, price: product.price, size: chosenSize, quantity: qty, image: product.images[0] })
    navigate('/checkout')
  }

  const related = allProducts.filter(p => p.id !== product.id && p.category === product.category).slice(0, 4)
  const allRelated = related.length > 0 ? related : allProducts.filter(p => p.id !== product.id).slice(0, 4)

  const savings = product.originalPrice ? product.originalPrice - product.price : 0
  const formatPrice = (amt: number) => amt >= 500 ? `KES ${amt.toLocaleString()}` : `$${amt.toFixed(2)}`

  return (
    <div style={{ background: '#0a0a14', minHeight: '100vh' }}>
      <div className="max-w-screen-xl mx-auto px-4 py-8">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-xs text-gray-500 mb-6">
          <Link to="/shop" className="hover:text-[#00b341] transition-colors">Shop</Link>
          <span>›</span>
          <span className="text-gray-400">{product.category}</span>
          <span>›</span>
          <span className="text-white line-clamp-1">{product.name}</span>
        </div>

        <div className="grid md:grid-cols-2 gap-10 mb-16">
          {/* Image Gallery */}
          <div>
            {/* Main Image */}
            <div
              className="rounded-2xl overflow-hidden mb-3 border border-[#1e1e32] relative"
              style={{ height: '460px', background: '#131320' }}
            >
              <img
                src={product.images[activeImage] || product.images[0]}
                alt={product.name}
                className="w-full h-full object-cover"
              />
              {product.badge && (
                <span
                  className="absolute top-4 left-4 text-xs font-black px-3 py-1 rounded-full text-white"
                  style={{ background: product.badge === 'BESTSELLER' ? '#00b341' : product.badge === 'NEW' ? '#3b82f6' : '#f59e0b' }}
                >
                  {product.badge}
                </span>
              )}
              {/* Wishlist */}
              <button
                onClick={() => setWishlisted(w => !w)}
                className="absolute top-4 right-4 w-9 h-9 rounded-full flex items-center justify-center transition-all"
                style={{ background: '#131320', border: '1px solid #1e1e32' }}
              >
                <span className="text-base">{wishlisted ? '❤️' : '🤍'}</span>
              </button>
            </div>

            {/* Thumbnails */}
            {product.images.length > 1 && (
              <div className="flex gap-2">
                {product.images.map((img, i) => (
                  <button
                    key={i}
                    onClick={() => setActiveImage(i)}
                    className="rounded-xl overflow-hidden transition-all"
                    style={{
                      width: '76px', height: '76px',
                      border: `2px solid ${activeImage === i ? '#00b341' : '#1e1e32'}`,
                    }}
                  >
                    <img src={img} alt="" className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Product Info */}
          <div>
            <span className="text-xs font-bold text-gray-500 uppercase tracking-widest">{product.category}</span>
            <h1 className="text-4xl font-black text-white mt-1 mb-3 leading-tight" style={{ fontFamily: 'Big Shoulders Display' }}>
              {product.name}
            </h1>

            {/* Rating */}
            <div className="mb-4">
              <StarRating rating={product.rating} reviews={product.reviews} />
            </div>

            {/* Price */}
            <div className="flex items-baseline gap-3 mb-6">
              <span className="text-4xl font-black text-[#00b341]" style={{ fontFamily: 'Big Shoulders Display' }}>
                {formatPrice(product.price)}
              </span>
              {product.originalPrice && product.originalPrice > product.price && (
                <>
                  <span className="text-lg text-gray-500 line-through">{formatPrice(product.originalPrice)}</span>
                  <span className="text-xs font-black px-2 py-0.5 rounded-full text-white bg-red-500">
                    Save {formatPrice(savings)}
                  </span>
                </>
              )}
            </div>

            {/* Size selector (Only for Apparel) */}
            {isApparel && (
              <div className="mb-5">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-bold text-gray-300">Select Size</span>
                  {!size && <span className="text-xs text-red-400 animate-pulse">← Please select a size</span>}
                </div>
                <div className="flex gap-2 flex-wrap">
                  {SIZES.map(s => (
                    <button
                      key={s}
                      onClick={() => setSize(s)}
                      className="w-11 h-11 text-sm font-bold rounded-xl transition-all"
                      style={
                        size === s
                          ? { background: '#00b341', border: '2px solid #00b341', color: '#fff' }
                          : { background: '#131320', border: '2px solid #1e1e32', color: '#9ca3af' }
                      }
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Quantity */}
            <div className="mb-6">
              <span className="text-sm font-bold text-gray-300 mb-2 block">Quantity</span>
              <div className="flex items-center gap-3 w-fit">
                <button
                  onClick={() => setQty(q => Math.max(1, q - 1))}
                  className="w-10 h-10 rounded-xl border text-white font-bold text-lg flex items-center justify-center hover:bg-white/10 transition-colors"
                  style={{ borderColor: '#1e1e32', background: '#131320' }}
                >
                  −
                </button>
                <span className="text-lg font-black text-white w-8 text-center">{qty}</span>
                <button
                  onClick={() => setQty(q => q + 1)}
                  className="w-10 h-10 rounded-xl border text-white font-bold text-lg flex items-center justify-center hover:bg-white/10 transition-colors"
                  style={{ borderColor: '#1e1e32', background: '#131320' }}
                >
                  +
                </button>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3 mb-6">
              <button
                onClick={handleAdd}
                disabled={!size}
                className="flex-1 py-4 text-sm font-black rounded-xl transition-all disabled:opacity-40 disabled:cursor-not-allowed hover:opacity-90"
                style={{
                  background: added ? '#22c55e' : '#131320',
                  color: added ? '#fff' : '#00b341',
                  border: `2px solid ${added ? '#22c55e' : '#00b341'}`,
                  fontFamily: 'Big Shoulders Display',
                  fontSize: '15px',
                }}
              >
                {added ? '✓ Added to Cart!' : t('addToCart')}
              </button>
              <button
                onClick={handleBuyNow}
                disabled={!size}
                className="flex-1 py-4 text-sm font-black rounded-xl transition-all disabled:opacity-40 disabled:cursor-not-allowed hover:opacity-90"
                style={{ background: '#00b341', color: '#fff', fontFamily: 'Big Shoulders Display', fontSize: '15px' }}
              >
                Buy Now →
              </button>
            </div>

            {/* Trust Badges */}
            <div className="grid grid-cols-3 gap-2 mb-6 pb-6 border-b border-[#1e1e32]">
              {[
                { icon: '🚚', label: 'Free over $80' },
                { icon: '🔄', label: '30-day returns' },
                { icon: '🔒', label: 'Secure pay' },
              ].map(b => (
                <div key={b.label} className="flex flex-col items-center gap-1 p-2 rounded-xl border border-[#1e1e32] text-center" style={{ background: '#131320' }}>
                  <span className="text-base">{b.icon}</span>
                  <span className="text-[9px] text-gray-400 font-semibold">{b.label}</span>
                </div>
              ))}
            </div>

            {/* Product Detail Tabs */}
            <div className="flex gap-0 border-b border-[#1e1e32] mb-4">
              {(['description', 'sizing', 'shipping'] as const).map(tab => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className="px-4 py-2.5 text-xs font-bold capitalize transition-colors border-b-2"
                  style={{
                    borderBottomColor: activeTab === tab ? '#00b341' : 'transparent',
                    color: activeTab === tab ? '#00b341' : '#6b7280',
                  }}
                >
                  {tab}
                </button>
              ))}
            </div>
            <div className="text-xs text-gray-400 leading-relaxed">
              {activeTab === 'description' && (
                <p>{product.description} Made with sustainable materials. Official FlowerZFC merchandise. Machine washable at 30°C. Eco-certified packaging.</p>
              )}
              {activeTab === 'sizing' && (
                <table className="w-full">
                  <thead>
                    <tr className="text-gray-500 border-b border-[#1e1e32]">
                      <th className="text-left py-2">Size</th>
                      <th className="py-2 text-center">Chest (cm)</th>
                      <th className="py-2 text-center">Length (cm)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[['XS','80-85','66'],['S','86-91','68'],['M','92-97','70'],['L','98-103','72'],['XL','104-109','74'],['XXL','110-115','76']].map(r => (
                      <tr key={r[0]} className="border-t border-[#1e1e32]">
                        <td className="py-2 font-bold text-white">{r[0]}</td>
                        <td className="py-2 text-center">{r[1]}</td>
                        <td className="py-2 text-center">{r[2]}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
              {activeTab === 'shipping' && (
                <div className="space-y-2">
                  <p>🇰🇪 <strong className="text-white">Kenya & East Africa:</strong> Standard 7–14 days ($5), Express 3–5 days ($15)</p>
                  <p>🌍 <strong className="text-white">International:</strong> 14–21 business days (DHL tracked)</p>
                  <p>🎁 <strong className="text-white">Free shipping</strong> on all orders over $80</p>
                  <p>📦 All orders include full tracking + eco-friendly packaging.</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Related Products */}
        <div>
          <h2 className="text-2xl font-black text-white mb-6" style={{ fontFamily: 'Big Shoulders Display' }}>
            You Might Also Like
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {allRelated.map(p => (
              <Link
                key={p.id}
                to={`/shop/${p.id}`}
                className="group block rounded-2xl overflow-hidden transition-all hover:-translate-y-1 hover:border-[#00b341]"
                style={{ background: '#131320', border: '1px solid #1e1e32' }}
              >
                <div style={{ height: '180px', overflow: 'hidden' }}>
                  <img src={p.images[0]} alt={p.name} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
                </div>
                <div className="p-3">
                  <p className="text-xs font-bold text-white line-clamp-1 group-hover:text-[#00b341] transition-colors">{p.name}</p>
                  <p className="text-sm font-black mt-1 text-[#00b341]" style={{ fontFamily: 'Big Shoulders Display' }}>${p.price.toFixed(2)}</p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
