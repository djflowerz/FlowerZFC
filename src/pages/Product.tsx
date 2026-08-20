import { useState, useEffect } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { useApp } from '../context/AppContext'
import { fetchAllProducts, verifyPaidReceipt } from '../services/supabaseClient'
import { initiatePayment } from '../services/paymentService'
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
  const { t, addToCart, formatPrice } = useApp()
  const navigate = useNavigate()

  const [product, setProduct] = useState<ProductType | null>(null)
  const [allProducts, setAllProducts] = useState<ProductType[]>([])
  const [loading, setLoading] = useState(true)

  const [activeImage, setActiveImage] = useState(0)
  const [size, setSize] = useState('')
  const [qty, setQty] = useState(1)
  const [added, setAdded] = useState(false)
  const [activeTab, setActiveTab] = useState<'description' | 'sizing' | 'shipping'>('description')
  const [selectedAddons, setSelectedAddons] = useState<string[]>([])
  const [buyNowLoading, setBuyNowLoading] = useState(false)
  const [buyNowError, setBuyNowError] = useState('')

  // Payment code receipt recovery state
  const [showRecovery, setShowRecovery] = useState(false)
  const [receiptInput, setReceiptInput] = useState('')
  const [receiptError, setReceiptError] = useState('')
  const [isVerifyingReceipt, setIsVerifyingReceipt] = useState(false)
  const [verifiedPaidOrder, setVerifiedPaidOrder] = useState<any | null>(null)

  const handleVerifyReceipt = async () => {
    if (!receiptInput.trim()) return
    setIsVerifyingReceipt(true)
    setReceiptError('')
    try {
      const res = await verifyPaidReceipt(receiptInput)
      if (res.valid) {
        setVerifiedPaidOrder(res.order)
      } else {
        setReceiptError(res.message)
      }
    } catch {
      setReceiptError('Could not verify payment code. Please try again.')
    } finally {
      setIsVerifyingReceipt(false)
    }
  }


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
          type: p.type || 'physical',
          digital_file_url: p.digital_file_url || null,
          access_password: p.access_password || null,
          platforms: Array.isArray(p.platforms) ? p.platforms : (typeof p.platforms === 'string' ? p.platforms.split(',').map((s: string) => s.trim()) : ['mac', 'windows', 'android']),
          mac_url: p.mac_url || null,
          windows_url: p.windows_url || null,
          android_url: p.android_url || null,
          ios_url: p.ios_url || null,
        }))
      }
      setAllProducts(formatted)
      const found = formatted.find(p => String(p.id) === String(id))

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
          <p className="text-sm text-gray-400 mb-6">The requested product does not exist or has been removed.</p>
          <Link to="/shop" className="px-6 py-3 bg-[#00b341] text-white font-bold rounded-xl text-xs">Back to Shop</Link>
        </div>
      </div>
    )
  }

  const isDigital = product.type === 'digital'
  const isApparel = !isDigital && ['jerseys', 'shorts', 'tracksuits', 'apparel', 'clothing', 'boots', 'shoes'].includes((product.category || '').toLowerCase())

  const addonTotal = (product.addons || []).filter((a: any) => selectedAddons.includes(a.id)).reduce((s: number, a: any) => s + a.price, 0)
  const totalPriceWithAddons = product.price * qty + addonTotal

  const handleAdd = () => {
    const chosenSize = isDigital ? 'Digital' : (isApparel ? size : (size || 'Standard'))
    if (isApparel && !size) return
    addToCart({ 
      id: product.id, 
      name: product.name + (selectedAddons.length > 0 ? ` (+${selectedAddons.map(sid => product.addons!.find((a: any) => a.id === sid)?.label || '').join(', ')})` : ''), 
      price: product.price + addonTotal / qty, 
      size: chosenSize, 
      quantity: qty, 
      image: product.images[0] 
    })
    setAdded(true)
    setTimeout(() => setAdded(false), 2500)
  }

  const handleBuyNow = async () => {
    const chosenSize = isDigital ? 'Digital' : (isApparel ? size : (size || 'Standard'))
    if (isApparel && !size) return
    addToCart({ 
      id: product.id, 
      name: product.name + (selectedAddons.length > 0 ? ` (+${selectedAddons.map(sid => product.addons!.find((a: any) => a.id === sid)?.label || '').join(', ')})` : ''), 
      price: product.price + addonTotal / qty, 
      size: chosenSize, 
      quantity: qty, 
      image: product.images[0] 
    })
    
    if (isDigital) {
      setBuyNowLoading(true)
      setBuyNowError('')
      const orderRef = `FZ${Date.now().toString().slice(-6)}`
      try {
        const res = await initiatePayment({
          amount: product.price * qty,
          currency: 'KES',
          email: 'customer@flowerz.fc',
          method: 'card',
          reference: orderRef,
          metadata: { productId: product.id, productName: product.name },
        })
        if (res.success) {
          navigate(`/checkout?confirmed=1&ref=${orderRef}&product=${encodeURIComponent(product.name)}`)
        } else {
          setBuyNowError('Payment was cancelled. Please try again.')
        }
      } catch {
        setBuyNowError('Payment failed. Please try again.')
      } finally {
        setBuyNowLoading(false)
      }
    } else {
      navigate('/checkout')
    }
  }

  const handleUnlockDownload = () => {
    if (!product.access_password) {
      setShowDownloadPanel(true)
      return
    }
    if (passwordInput === product.access_password) {
      setShowDownloadPanel(true)
      setPasswordError('')
    } else {
      setPasswordError('Incorrect password. Please check your order confirmation email.')
    }
  }

  const related = allProducts.filter(p => p.id !== product.id && p.category === product.category).slice(0, 4)
  const allRelated = related.length > 0 ? related : allProducts.filter(p => p.id !== product.id).slice(0, 4)
  const savings = product.originalPrice ? product.originalPrice - product.price : 0

  return (
    <div style={{ background: '#0a0a14', minHeight: '100vh' }}>
      <div className="max-w-screen-xl mx-auto px-4 py-8">
        <div className="flex items-center gap-2 text-xs text-gray-500 mb-6">
          <Link to="/shop" className="hover:text-[#00b341] transition-colors">Shop</Link>
          <span>›</span>
          <span className="text-gray-400">{product.category}</span>
          <span>›</span>
          <span className="text-white line-clamp-1">{product.name}</span>
        </div>

        <div className="grid md:grid-cols-2 gap-10 mb-16">
          <div>
            <div className="rounded-2xl overflow-hidden mb-3 border border-[#1e1e32] relative" style={{ height: '420px' }}>
              <img src={product.images[activeImage] || product.images[0]} alt={product.name} className="w-full h-full object-cover" />
              {isDigital && (
                <div className="absolute top-4 left-4 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-black text-white" style={{ background: '#6366f1' }}>
                  💾 Digital Download
                </div>
              )}
              {savings > 0 && (
                <div className="absolute top-4 right-4 bg-red-500 text-white text-xs font-black px-2 py-1 rounded-full">
                  Save {formatPrice(savings)}
                </div>
              )}
            </div>
            {product.images.length > 1 && (
              <div className="flex gap-2 overflow-x-auto pb-1">
                {product.images.map((img, i) => (
                  <button key={i} onClick={() => setActiveImage(i)} className="shrink-0 w-16 h-16 rounded-lg overflow-hidden transition-all" style={{ border: `2px solid ${activeImage === i ? '#00b341' : '#1e1e32'}` }}>
                    <img src={img} alt="" className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>

          <div>
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">{product.category}</span>
              {isDigital && <span className="text-[10px] font-black px-2 py-0.5 rounded-full text-white" style={{ background: '#6366f1' }}>💾 DIGITAL</span>}
              {product.badge && <span className="text-[10px] font-black px-2 py-0.5 rounded-full text-white" style={{ background: '#00b341' }}>{product.badge}</span>}
            </div>
            <h1 className="text-3xl font-black text-white mb-3" style={{ fontFamily: 'Big Shoulders Display' }}>{product.name}</h1>
            <StarRating rating={product.rating} reviews={product.reviews} />

            <div className="flex items-baseline gap-3 mt-4 mb-6">
              <span className="text-4xl font-black" style={{ color: isDigital ? '#a5b4fc' : '#00b341', fontFamily: 'Big Shoulders Display' }}>
                {formatPrice(Number(product.price) || 0)}
              </span>
              {product.originalPrice != null && (
                <span className="text-lg text-gray-500 line-through">{formatPrice(Number(product.originalPrice) || 0)}</span>
              )}
            </div>

            {isDigital ? (
              <div className="space-y-4">
                {/* Platform Compatibility Badges */}
                <div className="p-3 rounded-xl border border-[#6366f1]/30 flex items-center justify-between flex-wrap gap-2" style={{ background: 'rgba(99,102,241,0.06)' }}>
                  <span className="text-[10px] font-black text-white uppercase tracking-wider">Compatible With:</span>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {[
                      { id: 'mac', label: '🍏 macOS' },
                      { id: 'windows', label: '🪟 Windows' },
                      { id: 'android', label: '🤖 Android' },
                      { id: 'ios', label: '📱 iOS' },
                      { id: 'universal', label: '🌐 Universal' },
                    ].filter(p => !product.platforms || product.platforms.length === 0 || product.platforms.includes(p.id) || product.platforms.includes('universal')).map(p => (
                      <span key={p.id} className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-[#131320] text-gray-300 border border-[#1e1e32]">
                        {p.label}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  {[{ icon: '⚡', label: 'Instant Access' }, { icon: '🔒', label: 'Secure File' }, { icon: '♾️', label: 'Lifetime Download' }].map(b => (
                    <div key={b.label} className="flex flex-col items-center gap-1 p-2 rounded-xl border border-[#6366f1]/20 text-center" style={{ background: 'rgba(99,102,241,0.06)' }}>
                      <span className="text-base">{b.icon}</span>
                      <span className="text-[9px] text-[#a5b4fc] font-semibold">{b.label}</span>
                    </div>
                  ))}
                </div>

                <div className="p-4 rounded-xl border border-[#6366f1]/30" style={{ background: 'rgba(99,102,241,0.06)' }}>
                  <p className="text-xs font-bold text-[#a5b4fc] mb-1">📦 What's included</p>
                  <p className="text-xs text-gray-300 leading-relaxed">{product.description}</p>
                </div>

                <div className="flex flex-col gap-2">
                  <div className="flex gap-3">
                    <button 
                      onClick={handleBuyNow} 
                      disabled={buyNowLoading}
                      className="flex-1 py-4 text-sm font-black rounded-xl transition-all hover:opacity-90 shadow-lg shadow-indigo-500/20 flex items-center justify-center gap-2 disabled:opacity-60" 
                      style={{ background: '#6366f1', color: '#fff', fontFamily: 'Big Shoulders Display', fontSize: '16px' }}
                    >
                      {buyNowLoading ? <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /><span>Opening Payment...</span></> : <>💾 Buy & Download Now</>}
                    </button>
                    <button onClick={handleAdd} className="py-4 px-5 text-sm font-black rounded-xl transition-all border hover:bg-[#6366f1]/10" style={{ color: added ? '#22c55e' : '#a5b4fc', borderColor: added ? '#22c55e' : '#6366f1', background: '#131320' }} title="Add to cart">
                      {added ? '✓ Added' : '🛒'}
                    </button>
                  </div>
                  {buyNowError && <p className="text-xs text-red-400 font-bold text-center">{buyNowError}</p>}
                </div>

                <div className="p-3.5 rounded-xl border border-[#1e1e32] flex items-center gap-3" style={{ background: '#131320' }}>
                  <span className="text-xl">⚡</span>
                  <div>
                    <p className="text-xs font-bold text-white">Instant Automatic Delivery</p>
                    <p className="text-[10px] text-gray-400">Download links and activation details are unlocked instantly on the confirmation screen & sent to your email.</p>
                  </div>
                </div>

                {/* 🔑 Already Paid & Need Download Recovery */}
                <div className="p-4 rounded-xl border border-[#1e1e32]" style={{ background: '#131320' }}>
                  <button
                    type="button"
                    className="w-full flex items-center justify-between text-left"
                    onClick={() => setShowRecovery(p => !p)}
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-sm">🔑</span>
                      <span className="text-xs font-bold text-white">Already made payment? Retrieve download with receipt code</span>
                    </div>
                    <span className="text-xs text-gray-400 font-bold">{showRecovery ? '▲ Hide' : '▼ Enter Code'}</span>
                  </button>

                  {showRecovery && (
                    <div className="mt-3 pt-3 border-t border-[#1e1e32] space-y-2 animate-fade-in">
                      <p className="text-[10px] text-gray-400">
                        If you paid and the download page did not open, enter your <strong>Order Ref (e.g. FZ123456) or M-Pesa / Paystack code</strong> below. The system will confirm payment and grant immediate access.
                      </p>
                      {!verifiedPaidOrder ? (
                        <div className="space-y-2">
                          <input
                            type="text"
                            value={receiptInput}
                            onChange={e => { setReceiptInput(e.target.value); setReceiptError('') }}
                            placeholder="e.g. FZ123456 or Paystack / M-Pesa Ref"
                            className="w-full px-3 py-2 text-xs text-white placeholder-gray-500 rounded-lg outline-none focus:ring-1 focus:ring-[#6366f1]"
                            style={{ background: '#0c0c14', border: '1px solid #1e1e32' }}
                          />
                          {receiptError && <p className="text-[10px] text-red-400 font-bold">{receiptError}</p>}
                          <button
                            onClick={handleVerifyReceipt}
                            disabled={isVerifyingReceipt || !receiptInput.trim()}
                            className="w-full py-2.5 text-xs font-bold text-white rounded-lg transition-all hover:opacity-90 disabled:opacity-40 flex items-center justify-center gap-2"
                            style={{ background: '#6366f1' }}
                          >
                            {isVerifyingReceipt ? '🔍 Verifying Payment Authenticity...' : '🔍 Verify Payment & Access Files →'}
                          </button>
                        </div>
                      ) : (
                        <div className="space-y-3 pt-1">
                          <div className="p-3 rounded-lg border border-emerald-500/40 flex items-center gap-2" style={{ background: 'rgba(34,197,94,0.1)' }}>
                            <span className="text-xl">✅</span>
                            <div>
                              <p className="text-xs font-bold text-emerald-400">Payment Authenticated & Confirmed!</p>
                              <p className="text-[10px] text-gray-300">Receipt Code: <strong className="font-mono text-white">{receiptInput.toUpperCase()}</strong></p>
                            </div>
                          </div>

                          {/* Multi-OS Download Buttons for Verified Payer */}
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            {(product.mac_url || product.digital_file_url) && (
                              <a
                                href={product.mac_url || product.digital_file_url!}
                                target="_blank"
                                rel="noopener noreferrer"
                                download
                                className="flex items-center justify-center gap-2 py-2.5 px-3 text-xs font-black text-white rounded-xl transition-all hover:opacity-90 border border-white/20"
                                style={{ background: '#1e1e38' }}
                              >
                                <span>🍏</span>
                                <span>Download for macOS</span>
                              </a>
                            )}
                            {(product.windows_url || product.digital_file_url) && (
                              <a
                                href={product.windows_url || product.digital_file_url!}
                                target="_blank"
                                rel="noopener noreferrer"
                                download
                                className="flex items-center justify-center gap-2 py-2.5 px-3 text-xs font-black text-white rounded-xl transition-all hover:opacity-90 border border-[#00a4ef]/30"
                                style={{ background: 'rgba(0,164,239,0.12)', color: '#38bdf8' }}
                              >
                                <span>🪟</span>
                                <span>Download for Windows</span>
                              </a>
                            )}
                            {(product.android_url || product.digital_file_url) && (
                              <a
                                href={product.android_url || product.digital_file_url!}
                                target="_blank"
                                rel="noopener noreferrer"
                                download
                                className="flex items-center justify-center gap-2 py-2.5 px-3 text-xs font-black text-white rounded-xl transition-all hover:opacity-90 border border-[#3ddc84]/30"
                                style={{ background: 'rgba(61,220,132,0.12)', color: '#4ade80' }}
                              >
                                <span>🤖</span>
                                <span>Download Android APK</span>
                              </a>
                            )}
                            {product.digital_file_url && (
                              <a
                                href={product.digital_file_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                download
                                className="flex items-center justify-center gap-2 py-2.5 px-3 text-xs font-black text-white rounded-xl transition-all hover:opacity-90"
                                style={{ background: '#22c55e' }}
                              >
                                <span>📦</span>
                                <span>Universal Download (.ZIP)</span>
                              </a>
                            )}
                          </div>

                          {product.access_password && (
                            <div className="p-2 rounded-lg bg-black/40 border border-[#1e1e32] text-xs text-gray-400 flex items-center justify-between">
                              <span>🔑 Access Password:</span>
                              <strong className="font-mono text-[#a5b4fc] text-sm">{product.access_password}</strong>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ) : (



              <>
                {isApparel && (
                  <div className="mb-5">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-bold text-gray-300">Select Size</span>
                      {!size && <span className="text-xs text-red-400 animate-pulse">← Please select a size</span>}
                    </div>
                    <div className="flex gap-2 flex-wrap">
                      {SIZES.map(s => (
                        <button key={s} onClick={() => setSize(s)} className="w-11 h-11 text-sm font-bold rounded-xl transition-all" style={size === s ? { background: '#00b341', border: '2px solid #00b341', color: '#fff' } : { background: '#131320', border: '2px solid #1e1e32', color: '#9ca3af' }}>{s}</button>
                      ))}
                    </div>
                  </div>
                )}

                {product.addons && product.addons.length > 0 && (
                  <div className="mb-5">
                    <p className="text-sm font-bold text-gray-300 mb-2">Customisation Options</p>
                    <div className="space-y-2">
                      {product.addons.map(addon => (
                        <label key={addon.id} className="flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all" style={{
                          background: selectedAddons.includes(addon.id) ? 'rgba(0,179,65,0.08)' : '#0c0c14',
                          borderColor: selectedAddons.includes(addon.id) ? '#00b341' : '#1e1e32',
                        }}>
                          <input
                            type="checkbox"
                            className="w-4 h-4 accent-[#00b341]"
                            checked={selectedAddons.includes(addon.id)}
                            onChange={e => {
                              setSelectedAddons(prev => e.target.checked ? [...prev, addon.id] : prev.filter(id => id !== addon.id))
                            }}
                          />
                          {addon.icon && <span className="text-base">{addon.icon}</span>}
                          <span className="flex-1 text-xs font-semibold text-white">{addon.label}</span>
                          <span className="text-xs font-black text-[#00b341]">+{formatPrice(addon.price)}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                )}

                {addonTotal > 0 && (
                  <div className="flex items-center justify-between p-3 rounded-xl border border-[#00b341]/30 mb-4" style={{ background: 'rgba(0,179,65,0.06)' }}>
                    <span className="text-xs font-bold text-gray-300">Total (with options)</span>
                    <span className="text-lg font-black text-[#00b341]">{formatPrice(totalPriceWithAddons)}</span>
                  </div>
                )}

                <div className="mb-6">
                  <span className="text-sm font-bold text-gray-300 mb-2 block">Quantity</span>
                  <div className="flex items-center gap-3 w-fit">
                    <button onClick={() => setQty(q => Math.max(1, q - 1))} className="w-10 h-10 rounded-xl border text-white font-bold text-lg flex items-center justify-center hover:bg-white/10 transition-colors" style={{ borderColor: '#1e1e32', background: '#131320' }}>−</button>
                    <span className="text-lg font-black text-white w-8 text-center">{qty}</span>
                    <button onClick={() => setQty(q => q + 1)} className="w-10 h-10 rounded-xl border text-white font-bold text-lg flex items-center justify-center hover:bg-white/10 transition-colors" style={{ borderColor: '#1e1e32', background: '#131320' }}>+</button>
                  </div>
                </div>

                <div className="flex gap-3 mb-6">
                  <button onClick={handleAdd} disabled={isApparel && !size} className="flex-1 py-4 text-sm font-black rounded-xl transition-all disabled:opacity-40 disabled:cursor-not-allowed hover:opacity-90" style={{ background: added ? '#22c55e' : '#131320', color: added ? '#fff' : '#00b341', border: `2px solid ${added ? '#22c55e' : '#00b341'}`, fontFamily: 'Big Shoulders Display', fontSize: '15px' }}>
                    {added ? '✓ Added to Cart!' : t('addToCart')}
                  </button>
                  <button onClick={handleBuyNow} disabled={isApparel && !size} className="flex-1 py-4 text-sm font-black rounded-xl transition-all disabled:opacity-40 disabled:cursor-not-allowed hover:opacity-90" style={{ background: '#00b341', color: '#fff', fontFamily: 'Big Shoulders Display', fontSize: '15px' }}>
                    Buy Now →
                  </button>
                </div>

                <div className="grid grid-cols-3 gap-2 mb-6 pb-6 border-b border-[#1e1e32]">
                  {[{ icon: '🚚', label: 'Free over \$80' }, { icon: '🔄', label: '30-day returns' }, { icon: '🔒', label: 'Secure pay' }].map(b => (
                    <div key={b.label} className="flex flex-col items-center gap-1 p-2 rounded-xl border border-[#1e1e32] text-center" style={{ background: '#131320' }}>
                      <span className="text-base">{b.icon}</span>
                      <span className="text-[9px] text-gray-400 font-semibold">{b.label}</span>
                    </div>
                  ))}
                </div>

                {/* ── 3-Column Info Row: Description | Informations | Specifications ── */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8 pt-4 border-t border-[#1e1e32]">

                  {/* DESCRIPTION */}
                  <div>
                    <h3 className="text-2xl font-black text-white mb-4" style={{ fontFamily: 'Big Shoulders Display' }}>Description</h3>
                    <p className="text-xs text-gray-300 leading-relaxed mb-5">{product.description}</p>

                    <p className="text-xs font-black text-white uppercase tracking-widest mb-3">Details</p>
                    <ul className="space-y-1.5">
                      {[
                        product.sku && `Product ID: ${product.sku}`,
                        product.team && `Team: ${product.team}`,
                        product.kitType && `Kit Type: ${product.kitType}`,
                        product.version && `Version: ${product.version}`,
                        product.category && `Category: ${product.category}`,
                        product.type === 'physical' && 'Machine wash (30°C)',
                        product.type === 'physical' && 'Officially licensed merchandise',
                        product.type === 'digital' && 'Instant digital download',
                        product.type === 'digital' && 'No physical shipment required',
                        product.type === 'physical' && 'Ships from Kenya 🇰🇪',
                        product.type === 'physical' && 'Customised items are final sale and cannot be returned after order is placed',
                      ].filter(Boolean).map((detail, i) => (
                        <li key={i} className="flex items-start gap-2 text-[11px] text-gray-400">
                          <span className="text-[#00b341] mt-0.5 shrink-0">•</span>
                          <span>{detail as string}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* INFORMATIONS */}
                  <div>
                    <h3 className="text-2xl font-black text-white mb-4" style={{ fontFamily: 'Big Shoulders Display' }}>Informations</h3>
                    <div className="space-y-5">
                      <div>
                        <p className="text-sm font-black text-white mb-1.5">🚚 Shipping</p>
                        <p className="text-[11px] text-gray-400 leading-relaxed">We offer countrywide (Kenya) shipping through G4S courier services at an additional cost of KSh. 350/-. International shipping available via DHL tracked — 14–21 business days.</p>
                      </div>
                      <div>
                        <p className="text-sm font-black text-white mb-1.5">📐 Sizing</p>
                        <p className="text-[11px] text-gray-400 leading-relaxed">Fits true to size. Refer to the size chart above for chest and length measurements. For jerseys, we recommend sizing up if between sizes.</p>
                      </div>
                      <div>
                        <p className="text-sm font-black text-white mb-1.5">🔄 Returns</p>
                        <p className="text-[11px] text-gray-400 leading-relaxed">Unopened / unworn items can be returned within 7 days of delivery. Customised or personalised items are final sale.</p>
                      </div>
                      <div>
                        <p className="text-sm font-black text-white mb-1.5">📞 Assistance</p>
                        <p className="text-[11px] text-gray-400 leading-relaxed">Contact us on <strong className="text-white">+254 7XX XXX XXX</strong> (WhatsApp/Call) or email <strong className="text-white">support@djflowerz.co.ke</strong> for help with your order.</p>
                      </div>
                    </div>
                  </div>

                  {/* SPECIFICATIONS */}
                  <div>
                    <h3 className="text-2xl font-black text-white mb-4" style={{ fontFamily: 'Big Shoulders Display' }}>Specifications</h3>
                    <div className="space-y-5">
                      <div>
                        <p className="text-xs font-black text-gray-400 uppercase tracking-widest mb-2">Clothing Size</p>
                        <div className="flex gap-1.5 flex-wrap">
                          {['S', 'M', 'L', 'XL', 'XXL'].map(s => (
                            <span key={s} className="w-10 h-10 flex items-center justify-center text-xs font-bold rounded-lg border text-gray-300 border-[#1e1e32]" style={{ background: '#0c0c14' }}>{s}</span>
                          ))}
                        </div>
                      </div>
                      {(product.platforms && product.platforms.length > 0 && product.type === 'digital') && (
                        <div>
                          <p className="text-xs font-black text-gray-400 uppercase tracking-widest mb-2">Compatible Platforms</p>
                          <div className="flex gap-1.5 flex-wrap">
                            {product.platforms.map(pl => (
                              <span key={pl} className="px-2.5 py-1 text-[10px] font-bold rounded-lg border border-[#1e1e32] text-gray-300 capitalize" style={{ background: '#0c0c14' }}>{pl}</span>
                            ))}
                          </div>
                        </div>
                      )}
                      <div>
                        <p className="text-xs font-black text-gray-400 uppercase tracking-widest mb-2">Dimensions</p>
                        <div className="overflow-x-auto">
                          <table className="w-full text-[11px]">
                            <thead>
                              <tr className="text-gray-500 border-b border-[#1e1e32]">
                                <th className="text-left py-1.5 font-bold">Size</th>
                                <th className="py-1.5 text-center font-bold">Chest (cm)</th>
                                <th className="py-1.5 text-center font-bold">Length (cm)</th>
                              </tr>
                            </thead>
                            <tbody>
                              {[['S','86–91','68'],['M','92–97','70'],['L','98–103','72'],['XL','104–109','74'],['XXL','110–115','76']].map(r => (
                                <tr key={r[0]} className="border-t border-[#1e1e32] text-gray-400">
                                  <td className="py-1.5 font-bold text-white">{r[0]}</td>
                                  <td className="py-1.5 text-center">{r[1]}</td>
                                  <td className="py-1.5 text-center">{r[2]}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    </div>
                  </div>

                </div>
              </>
            )}

          </div>
        </div>

        <div>
          <h2 className="text-2xl font-black text-white mb-6" style={{ fontFamily: 'Big Shoulders Display' }}>You Might Also Like</h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {allRelated.map(p => (
              <Link key={p.id} to={`/shop/${p.id}`} className="group block rounded-2xl overflow-hidden transition-all hover:-translate-y-1 hover:border-[#00b341]" style={{ background: '#131320', border: '1px solid #1e1e32' }}>
                <div style={{ height: '180px', overflow: 'hidden' }}>
                  <img src={p.images[0]} alt={p.name} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
                </div>
                <div className="p-3">
                  <div className="flex items-center gap-1 mb-0.5">
                    {p.type === 'digital' && <span className="text-[8px] font-black px-1.5 py-0.5 rounded-full text-white" style={{ background: '#6366f1' }}>💾</span>}
                    <p className="text-xs font-bold text-white line-clamp-1 group-hover:text-[#00b341] transition-colors">{p.name}</p>
                  </div>
                  <p className="text-sm font-black mt-1" style={{ color: p.type === 'digital' ? '#a5b4fc' : '#00b341', fontFamily: 'Big Shoulders Display' }}>{formatPrice(Number(p.price) || 0)}</p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
