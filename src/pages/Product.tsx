import { useState, useEffect } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { useApp } from '../context/AppContext'
import { fetchAllProducts, verifyPaidReceipt } from '../services/supabaseClient'
import { initiatePayment } from '../services/paymentService'
import type { ProductType } from './Shop'

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
  const { t, addToCart, formatPrice, user } = useApp()
  const navigate = useNavigate()

  const [product, setProduct] = useState<ProductType | null>(null)
  const [allProducts, setAllProducts] = useState<ProductType[]>([])
  const [loading, setLoading] = useState(true)

  const [activeImage, setActiveImage] = useState(0)
  const [size, setSize] = useState('M')
  const [qty, setQty] = useState(1)
  const [added, setAdded] = useState(false)
  const [selectedAddons, setSelectedAddons] = useState<string[]>([])
  const [buyNowLoading, setBuyNowLoading] = useState(false)
  const [buyNowError, setBuyNowError] = useState('')

  // Digital email prompt state
  const [digitalEmailModal, setDigitalEmailModal] = useState(false)
  const [digitalEmailInput, setDigitalEmailInput] = useState('')
  const [digitalEmailError, setDigitalEmailError] = useState('')

  // Player Name & Number Customization state
  const [customPrintEnabled, setCustomPrintEnabled] = useState(false)
  const [customPlayerChoice, setCustomPlayerChoice] = useState<'squad' | 'custom'>('custom')
  const [customPlayerName, setCustomPlayerName] = useState('')
  const [customPlayerNumber, setCustomPlayerNumber] = useState('')
  const [selectedSquadPlayer, setSelectedSquadPlayer] = useState('')

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
        }))
      }
      setAllProducts(formatted)
      const found = formatted.find(p => String(p.id) === String(id))
      setProduct(found || null)
      if (found?.sizes && found.sizes.length > 0) {
        setSize(found.sizes[0])
      }
      if (found?.playerList) {
        const firstPlayer = found.playerList.split(',')[0]?.trim()
        if (firstPlayer) setSelectedSquadPlayer(firstPlayer)
      }
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
  const isApparel = !isDigital
  const availableSizes = (product.sizes && product.sizes.length > 0) ? product.sizes : ['S', 'M', 'L', 'XL', 'XXL']
  const squadList = (product.playerList || '').split(',').map(s => s.trim()).filter(Boolean)
  const isPrintingAvailable = product.printing_enabled || Boolean(product.playerList) || (product.printing_price ? product.printing_price > 0 : false)
  const printingPrice = customPrintEnabled ? (product.printing_price || 300) : 0

  const addonTotal = (product.addons || []).filter((a: any) => selectedAddons.includes(a.id)).reduce((s: number, a: any) => s + a.price, 0)
  const unitPrice = product.price + printingPrice
  const totalPriceWithAddons = unitPrice * qty + addonTotal

  const buildCartPayload = () => {
    let customDetails = ''
    if (customPrintEnabled) {
      const pName = customPlayerChoice === 'squad'
        ? selectedSquadPlayer
        : (customPlayerName ? `${customPlayerName.toUpperCase().trim()}${customPlayerNumber ? ` #${customPlayerNumber.trim()}` : ''}` : '')
      if (pName) customDetails += ` [Print: ${pName}]`
    }
    if (selectedAddons.length > 0 && product.addons) {
      const addonNames = selectedAddons.map(sid => product.addons!.find((a: any) => a.id === sid)?.label || '').filter(Boolean).join(', ')
      if (addonNames) customDetails += ` (+${addonNames})`
    }
    const chosenSize = isDigital ? 'Digital' : (size || 'M')
    return {
      id: product.id,
      name: `${product.name}${customDetails}`,
      price: unitPrice + (addonTotal / qty),
      size: chosenSize,
      quantity: qty,
      image: product.images[0] || '',
    }
  }

  const handleAdd = () => {
    if (isApparel && !size) return
    addToCart(buildCartPayload())
    setAdded(true)
    setTimeout(() => setAdded(false), 2500)
  }

  const executeDigitalPayment = async (targetEmail: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(targetEmail.trim())) {
      setDigitalEmailError('Please enter a valid email address.')
      return
    }
    setDigitalEmailModal(false)
    setBuyNowLoading(true)
    setBuyNowError('')
    const orderRef = `FZ${Date.now().toString().slice(-6)}`
    try {
      const res = await initiatePayment({
        amount: product.price * qty,
        currency: 'KES',
        email: targetEmail.trim(),
        method: 'card',
        reference: orderRef,
        metadata: {
          productId: product.id,
          productName: product.name,
          customerEmail: targetEmail.trim(),
        },
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
  }

  const handleBuyNow = async () => {
    if (isApparel && !size) return
    const cartItem = buildCartPayload()
    addToCart(cartItem)

    if (isDigital) {
      if (user?.email) {
        executeDigitalPayment(user.email)
      } else {
        setDigitalEmailModal(true)
      }
    } else {
      navigate('/checkout')
    }
  }

  const related = allProducts.filter(p => p.id !== product.id && p.category === product.category).slice(0, 4)
  const allRelated = related.length > 0 ? related : allProducts.filter(p => p.id !== product.id).slice(0, 4)
  const savings = product.originalPrice ? product.originalPrice - product.price : 0

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

        {/* ══ TOP HERO PRODUCT PURCHASE SECTION ══════════════════════════════ */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 mb-12">
          {/* Left Column: Product Images (6 Cols) */}
          <div className="lg:col-span-6 space-y-4">
            <div className="rounded-2xl overflow-hidden border border-[#1e1e32] relative flex items-center justify-center p-6" style={{ minHeight: '440px', maxHeight: '540px', background: '#0b0b14' }}>
              <img
                src={product.images[activeImage] || product.images[0]}
                alt={product.name}
                className="w-full h-full max-h-[480px] object-contain transition-all duration-300"
              />
              {isDigital && (
                <div className="absolute top-4 left-4 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-black text-white" style={{ background: '#6366f1' }}>
                  💾 Digital Download
                </div>
              )}
              {savings > 0 && (
                <div className="absolute top-4 right-4 bg-red-500 text-white text-xs font-black px-2.5 py-1 rounded-full shadow-lg">
                  Save {formatPrice(savings)}
                </div>
              )}
            </div>

            {/* Thumbnails */}
            {product.images.length > 1 && (
              <div className="flex gap-3 overflow-x-auto pb-1">
                {product.images.map((img, i) => (
                  <button
                    key={i}
                    onClick={() => setActiveImage(i)}
                    className="shrink-0 w-20 h-20 rounded-xl overflow-hidden transition-all p-1.5 flex items-center justify-center cursor-pointer"
                    style={{
                      background: '#0b0b14',
                      border: `2px solid ${activeImage === i ? '#00b341' : '#1e1e32'}`,
                      transform: activeImage === i ? 'scale(1.04)' : 'scale(1)'
                    }}
                  >
                    <img src={img} alt="" className="w-full h-full object-contain" />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Right Column: Title, Pricing, Customisation, Cart (6 Cols) */}
          <div className="lg:col-span-6 space-y-6">
            <div>
              <div className="flex items-center gap-2 mb-2 flex-wrap">
                <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">{product.category}</span>
                {product.team && <span className="text-[11px] font-bold text-white bg-[#1a1a2e] px-2 py-0.5 rounded-md border border-[#1e1e32]">{product.team}</span>}
                {isDigital && <span className="text-[10px] font-black px-2 py-0.5 rounded-full text-white" style={{ background: '#6366f1' }}>💾 DIGITAL</span>}
                {product.badge && <span className="text-[10px] font-black px-2 py-0.5 rounded-full text-white" style={{ background: '#00b341' }}>{product.badge}</span>}
              </div>
              <h1 className="text-3xl sm:text-4xl font-black text-white mb-3" style={{ fontFamily: 'Big Shoulders Display' }}>{product.name}</h1>
              <StarRating rating={product.rating} reviews={product.reviews} />
            </div>

            {/* Price */}
            <div className="flex items-baseline gap-3 pb-4 border-b border-[#1e1e32]">
              <span className="text-4xl sm:text-5xl font-black" style={{ color: isDigital ? '#a5b4fc' : '#00b341', fontFamily: 'Big Shoulders Display' }}>
                {formatPrice(Number(product.price) || 0)}
              </span>
              {product.originalPrice != null && (
                <span className="text-xl text-gray-500 line-through">{formatPrice(Number(product.originalPrice) || 0)}</span>
              )}
            </div>

            {isDigital ? (
              <div className="space-y-4">
                {/* Platform Compatibility Badges */}
                <div className="p-3.5 rounded-xl border border-[#6366f1]/30 flex items-center justify-between flex-wrap gap-2" style={{ background: 'rgba(99,102,241,0.06)' }}>
                  <span className="text-[10px] font-black text-white uppercase tracking-wider">Compatible With:</span>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {[
                      { id: 'mac', label: '🍏 macOS' },
                      { id: 'windows', label: '🪟 Windows' },
                      { id: 'android', label: '🤖 Android' },
                      { id: 'ios', label: '📱 iOS' },
                      { id: 'universal', label: '🌐 Universal' },
                    ].filter(p => !product.platforms || product.platforms.length === 0 || product.platforms.includes(p.id) || product.platforms.includes('universal')).map(p => (
                      <span key={p.id} className="text-[10px] font-bold px-2.5 py-1 rounded-md bg-[#131320] text-gray-300 border border-[#1e1e32]">
                        {p.label}
                      </span>
                    ))}
                  </div>
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

                {/* Retrieve Download Recovery */}
                <div className="p-4 rounded-xl border border-[#1e1e32]" style={{ background: '#131320' }}>
                  <button
                    type="button"
                    className="w-full flex items-center justify-between text-left"
                    onClick={() => setShowRecovery(p => !p)}
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-sm">🔑</span>
                      <span className="text-xs font-bold text-white">Already paid? Retrieve download with receipt code</span>
                    </div>
                    <span className="text-xs text-gray-400 font-bold">{showRecovery ? '▲ Hide' : '▼ Enter Code'}</span>
                  </button>

                  {showRecovery && (
                    <div className="mt-3 pt-3 border-t border-[#1e1e32] space-y-2">
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
                            className="w-full py-2.5 text-xs font-bold text-white rounded-lg transition-all hover:opacity-90 disabled:opacity-40"
                            style={{ background: '#6366f1' }}
                          >
                            {isVerifyingReceipt ? '🔍 Verifying Payment...' : '🔍 Verify Payment & Access Files →'}
                          </button>
                        </div>
                      ) : (
                        <div className="space-y-3 pt-1">
                          <div className="p-3 rounded-lg border border-emerald-500/40 flex items-center gap-2" style={{ background: 'rgba(34,197,94,0.1)' }}>
                            <span className="text-xl">✅</span>
                            <div>
                              <p className="text-xs font-bold text-emerald-400">Payment Confirmed!</p>
                              <p className="text-[10px] text-gray-300">Receipt: <strong className="font-mono text-white">{receiptInput.toUpperCase()}</strong></p>
                            </div>
                          </div>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            {(product.mac_url || product.digital_file_url) && (
                              <a href={product.mac_url || product.digital_file_url!} target="_blank" rel="noopener noreferrer" download className="flex items-center justify-center gap-2 py-2.5 px-3 text-xs font-black text-white rounded-xl border border-white/20" style={{ background: '#1e1e38' }}>
                                <span>🍏</span><span>Download for macOS</span>
                              </a>
                            )}
                            {(product.windows_url || product.digital_file_url) && (
                              <a href={product.windows_url || product.digital_file_url!} target="_blank" rel="noopener noreferrer" download className="flex items-center justify-center gap-2 py-2.5 px-3 text-xs font-black text-white rounded-xl border border-[#00a4ef]/30" style={{ background: 'rgba(0,164,239,0.12)', color: '#38bdf8' }}>
                                <span>🪟</span><span>Download for Windows</span>
                              </a>
                            )}
                            {(product.android_url || product.digital_file_url) && (
                              <a href={product.android_url || product.digital_file_url!} target="_blank" rel="noopener noreferrer" download className="flex items-center justify-center gap-2 py-2.5 px-3 text-xs font-black text-white rounded-xl border border-[#3ddc84]/30" style={{ background: 'rgba(61,220,132,0.12)', color: '#4ade80' }}>
                                <span>🤖</span><span>Download Android APK</span>
                              </a>
                            )}
                            {product.digital_file_url && (
                              <a href={product.digital_file_url} target="_blank" rel="noopener noreferrer" download className="flex items-center justify-center gap-2 py-2.5 px-3 text-xs font-black text-white rounded-xl" style={{ background: '#22c55e' }}>
                                <span>📦</span><span>Universal Download (.ZIP)</span>
                              </a>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="space-y-5">
                {/* 1. Size Selector */}
                {isApparel && (
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-bold text-gray-200">Select Clothing Size</span>
                      <span className="text-xs text-[#00b341] font-bold">Selected: <strong className="text-white">{size || 'M'}</strong></span>
                    </div>
                    <div className="flex gap-2 flex-wrap">
                      {availableSizes.map(s => (
                        <button
                          key={s}
                          type="button"
                          onClick={() => setSize(s)}
                          className={`w-12 h-12 text-sm font-black rounded-xl transition-all cursor-pointer ${
                            size === s
                              ? 'bg-[#00b341] border-2 border-[#00b341] text-white shadow-lg shadow-emerald-500/20'
                              : 'bg-[#131320] border-2 border-[#1e1e32] text-gray-300 hover:border-[#00b341]/60 hover:text-white'
                          }`}
                        >
                          {s}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* 2. Player Name & Number Printing */}
                {isPrintingAvailable && (
                  <div className="p-4 rounded-xl border border-[#1e1e32]" style={{ background: '#0d0d1e' }}>
                    <label className="flex items-center gap-3 cursor-pointer">
                      <input
                        type="checkbox"
                        className="w-4 h-4 accent-[#00b341]"
                        checked={customPrintEnabled}
                        onChange={e => setCustomPrintEnabled(e.target.checked)}
                      />
                      <div className="flex-1">
                        <span className="text-xs font-black text-white flex items-center gap-1.5">
                          <span>🔤</span>
                          <span>Player Name & Number Customisation</span>
                        </span>
                        <p className="text-[10px] text-gray-400">Have your official name & squad number printed on the back</p>
                      </div>
                      <span className="text-xs font-black text-[#00b341]">+{formatPrice(product.printing_price || 300)}</span>
                    </label>

                    {customPrintEnabled && (
                      <div className="mt-3 pt-3 border-t border-[#1e1e32] space-y-3 animate-fade-in">
                        {squadList.length > 0 && (
                          <div className="flex gap-2">
                            <button
                              type="button"
                              onClick={() => setCustomPlayerChoice('squad')}
                              className={`flex-1 py-1.5 text-xs font-bold rounded-lg border transition-all ${
                                customPlayerChoice === 'squad'
                                  ? 'bg-[#00b341] border-[#00b341] text-white'
                                  : 'bg-[#131320] border-[#1e1e32] text-gray-400 hover:text-white'
                              }`}
                            >
                              ⭐ Official Squad Player
                            </button>
                            <button
                              type="button"
                              onClick={() => setCustomPlayerChoice('custom')}
                              className={`flex-1 py-1.5 text-xs font-bold rounded-lg border transition-all ${
                                customPlayerChoice === 'custom'
                                  ? 'bg-[#00b341] border-[#00b341] text-white'
                                  : 'bg-[#131320] border-[#1e1e32] text-gray-400 hover:text-white'
                              }`}
                            >
                              ✍️ Custom Name & Number
                            </button>
                          </div>
                        )}

                        {customPlayerChoice === 'squad' && squadList.length > 0 ? (
                          <div>
                            <label className="block text-[10px] font-bold text-gray-400 mb-1">Select Squad Player</label>
                            <select
                              value={selectedSquadPlayer}
                              onChange={e => setSelectedSquadPlayer(e.target.value)}
                              className="w-full px-3 py-2 text-xs text-white rounded-lg outline-none"
                              style={{ background: '#131320', border: '1px solid #1e1e32' }}
                            >
                              {squadList.map(p => (
                                <option key={p} value={p}>{p}</option>
                              ))}
                            </select>
                          </div>
                        ) : (
                          <div className="grid grid-cols-3 gap-2">
                            <div className="col-span-2">
                              <label className="block text-[10px] font-bold text-gray-400 mb-1">Name on Jersey (Max 12 chars)</label>
                              <input
                                type="text"
                                maxLength={12}
                                value={customPlayerName}
                                onChange={e => setCustomPlayerName(e.target.value.toUpperCase())}
                                placeholder="e.g. FLOWERZ"
                                className="w-full px-3 py-2 text-xs text-white font-mono uppercase rounded-lg outline-none focus:ring-1 focus:ring-[#00b341]"
                                style={{ background: '#131320', border: '1px solid #1e1e32' }}
                              />
                            </div>
                            <div>
                              <label className="block text-[10px] font-bold text-gray-400 mb-1">Number (0–99)</label>
                              <input
                                type="number"
                                min={0}
                                max={99}
                                value={customPlayerNumber}
                                onChange={e => setCustomPlayerNumber(e.target.value)}
                                placeholder="10"
                                className="w-full px-3 py-2 text-xs text-white font-mono text-center rounded-lg outline-none focus:ring-1 focus:ring-[#00b341]"
                                style={{ background: '#131320', border: '1px solid #1e1e32' }}
                              />
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {/* 3. Product Add-ons / Patches */}
                {product.addons && product.addons.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-xs font-bold text-gray-300">🏅 Badges & Extra Add-ons</p>
                    {product.addons.map(addon => (
                      <label
                        key={addon.id}
                        className="flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all"
                        style={{
                          background: selectedAddons.includes(addon.id) ? 'rgba(0,179,65,0.08)' : '#0c0c14',
                          borderColor: selectedAddons.includes(addon.id) ? '#00b341' : '#1e1e32',
                        }}
                      >
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
                )}

                {/* Total with options */}
                {(addonTotal > 0 || customPrintEnabled) && (
                  <div className="flex items-center justify-between p-3.5 rounded-xl border border-[#00b341]/30" style={{ background: 'rgba(0,179,65,0.06)' }}>
                    <span className="text-xs font-bold text-gray-300">Total with selected options:</span>
                    <span className="text-xl font-black text-[#00b341]">{formatPrice(totalPriceWithAddons)}</span>
                  </div>
                )}

                {/* Quantity */}
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-gray-300">Quantity</span>
                  <div className="flex items-center gap-2">
                    <button onClick={() => setQty(q => Math.max(1, q - 1))} className="w-9 h-9 rounded-lg border text-white font-bold text-base flex items-center justify-center hover:bg-white/10 transition-colors" style={{ borderColor: '#1e1e32', background: '#131320' }}>−</button>
                    <span className="text-base font-black text-white w-8 text-center">{qty}</span>
                    <button onClick={() => setQty(q => q + 1)} className="w-9 h-9 rounded-lg border text-white font-bold text-base flex items-center justify-center hover:bg-white/10 transition-colors" style={{ borderColor: '#1e1e32', background: '#131320' }}>+</button>
                  </div>
                </div>

                {/* Add to Cart & Buy Now */}
                <div className="flex gap-3">
                  <button onClick={handleAdd} className="flex-1 py-4 text-sm font-black rounded-xl transition-all hover:opacity-90" style={{ background: added ? '#22c55e' : '#131320', color: added ? '#fff' : '#00b341', border: `2px solid ${added ? '#22c55e' : '#00b341'}`, fontFamily: 'Big Shoulders Display', fontSize: '16px' }}>
                    {added ? '✓ Added to Cart!' : t('addToCart')}
                  </button>
                  <button onClick={handleBuyNow} className="flex-1 py-4 text-sm font-black rounded-xl transition-all hover:opacity-90" style={{ background: '#00b341', color: '#fff', fontFamily: 'Big Shoulders Display', fontSize: '16px' }}>
                    Buy Now →
                  </button>
                </div>

                {/* Trust Badges */}
                <div className="grid grid-cols-3 gap-2 pt-2">
                  {[{ icon: '🚚', label: 'G4S Kenya Tracked' }, { icon: '🔄', label: '7-Day Return Guarantee' }, { icon: '🔒', label: '100% Secure M-Pesa / Card' }].map(b => (
                    <div key={b.label} className="flex flex-col items-center gap-1 p-2 rounded-xl border border-[#1e1e32] text-center" style={{ background: '#131320' }}>
                      <span className="text-base">{b.icon}</span>
                      <span className="text-[9px] text-gray-400 font-semibold">{b.label}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ══ FULL-WIDTH 3-COLUMN INFORMATION & SPECIFICATION SECTION ═════════ */}
        <div className="pt-10 border-t border-[#1e1e32] mb-16">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 lg:gap-12">

            {/* COLUMN 1: DESCRIPTION */}
            <div className="space-y-4">
              <h3 className="text-3xl font-black text-white" style={{ fontFamily: 'Big Shoulders Display' }}>Description</h3>
              <p className="text-xs text-gray-300 leading-relaxed whitespace-pre-line">{product.description}</p>

              <div className="pt-2">
                <p className="text-xs font-black text-white uppercase tracking-widest mb-3">Product Details</p>
                <ul className="space-y-2">
                  {[
                    product.sku && `Product ID: ${product.sku}`,
                    product.team && `Team: ${product.team}`,
                    product.kitType && `Kit Type: ${product.kitType}`,
                    product.version && `Version: ${product.version}`,
                    product.category && `Category: ${product.category}`,
                    product.type === 'physical' && 'Machine wash (30°C inside out)',
                    product.type === 'physical' && 'Officially licensed merchandise',
                    product.type === 'digital' && 'Instant digital download',
                    product.type === 'digital' && 'No physical shipment required',
                    product.type === 'physical' && 'Ships from Kenya 🇰🇪',
                    product.type === 'physical' && 'Customised items are final sale and cannot be returned after order is placed',
                  ].filter(Boolean).map((detail, i) => (
                    <li key={i} className="flex items-start gap-2 text-xs text-gray-400">
                      <span className="text-[#00b341] mt-0.5 shrink-0 font-bold">•</span>
                      <span>{detail as string}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* COLUMN 2: INFORMATIONS */}
            <div className="space-y-5">
              <h3 className="text-3xl font-black text-white" style={{ fontFamily: 'Big Shoulders Display' }}>Informations</h3>
              
              <div>
                <p className="text-sm font-black text-white mb-1.5">🚚 Shipping</p>
                <p className="text-xs text-gray-400 leading-relaxed">
                  {product.info_shipping || 'We offer countrywide (Kenya) shipping through G4S courier services at an additional cost of KSh. 350/-. International shipping available via DHL tracked — 14–21 business days.'}
                </p>
              </div>

              <div>
                <p className="text-sm font-black text-white mb-1.5">📐 Sizing</p>
                <p className="text-xs text-gray-400 leading-relaxed">
                  {product.info_sizing || 'Fits true to size. Refer to the size chart for chest and length measurements. For jerseys, we recommend sizing up if between sizes.'}
                </p>
              </div>

              <div>
                <p className="text-sm font-black text-white mb-1.5">🔄 Returns</p>
                <p className="text-xs text-gray-400 leading-relaxed">
                  {product.info_returns || 'Unopened / unworn items can be returned within 7 days of delivery. Customised or personalised items are final sale.'}
                </p>
              </div>

              <div>
                <p className="text-sm font-black text-white mb-1.5">📞 Assistance</p>
                <p className="text-xs text-gray-400 leading-relaxed">
                  {product.info_assistance || 'Contact us on (+254) 755 699 898 or (+254) 737 308 510, or email support@djflowerz.co.ke for help with your order.'}
                </p>
              </div>
            </div>

            {/* COLUMN 3: SPECIFICATIONS */}
            <div className="space-y-5">
              <h3 className="text-3xl font-black text-white" style={{ fontFamily: 'Big Shoulders Display' }}>Specifications</h3>

              {isApparel && (
                <div>
                  <p className="text-xs font-black text-gray-400 uppercase tracking-widest mb-2.5">Clothing Size</p>
                  <div className="flex gap-2 flex-wrap">
                    {availableSizes.map(s => (
                      <button
                        key={s}
                        type="button"
                        onClick={() => setSize(s)}
                        className={`w-11 h-11 flex items-center justify-center text-xs font-black rounded-xl border transition-all cursor-pointer ${
                          size === s
                            ? 'bg-[#00b341] text-white border-[#00b341]'
                            : 'bg-[#0c0c14] text-gray-300 border-[#1e1e32] hover:border-[#00b341]/50'
                        }`}
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Material & Fit specs */}
              <div className="space-y-2 pt-1">
                {product.spec_material && (
                  <div className="flex items-start justify-between py-1.5 border-b border-[#1e1e32] text-xs">
                    <span className="text-gray-400">Material:</span>
                    <span className="font-semibold text-white text-right">{product.spec_material}</span>
                  </div>
                )}
                {product.spec_fit && (
                  <div className="flex items-start justify-between py-1.5 border-b border-[#1e1e32] text-xs">
                    <span className="text-gray-400">Fit:</span>
                    <span className="font-semibold text-white text-right">{product.spec_fit}</span>
                  </div>
                )}
                {product.spec_origin && (
                  <div className="flex items-start justify-between py-1.5 border-b border-[#1e1e32] text-xs">
                    <span className="text-gray-400">Origin:</span>
                    <span className="font-semibold text-white text-right">{product.spec_origin}</span>
                  </div>
                )}
                {product.spec_care && (
                  <div className="flex items-start justify-between py-1.5 border-b border-[#1e1e32] text-xs">
                    <span className="text-gray-400">Care:</span>
                    <span className="font-semibold text-white text-right">{product.spec_care}</span>
                  </div>
                )}
              </div>

              {/* Dimensions Table */}
              <div>
                <p className="text-xs font-black text-gray-400 uppercase tracking-widest mb-2">Dimensions</p>
                <div className="overflow-x-auto rounded-xl border border-[#1e1e32]" style={{ background: '#0d0d1e' }}>
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="text-gray-400 border-b border-[#1e1e32] bg-[#131320]">
                        <th className="text-left py-2 px-3 font-bold">Size</th>
                        <th className="py-2 px-3 text-center font-bold">Chest (cm)</th>
                        <th className="py-2 px-3 text-center font-bold">Length (cm)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {[['S','86–91','68'],['M','92–97','70'],['L','98–103','72'],['XL','104–109','74'],['XXL','110–115','76']].map(r => (
                        <tr key={r[0]} className={`border-t border-[#1e1e32] text-gray-300 ${size === r[0] ? 'bg-[#00b341]/10 font-bold' : ''}`}>
                          <td className="py-2 px-3 font-bold text-white">{r[0]}</td>
                          <td className="py-2 px-3 text-center">{r[1]}</td>
                          <td className="py-2 px-3 text-center">{r[2]}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

          </div>
        </div>

        {/* ══ RELATED PRODUCTS ═══════════════════════════════════════════════ */}
        <div>
          <h2 className="text-2xl font-black text-white mb-6" style={{ fontFamily: 'Big Shoulders Display' }}>You Might Also Like</h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {allRelated.map(p => (
              <Link key={p.id} to={`/shop/${p.id}`} className="group block rounded-2xl overflow-hidden transition-all hover:-translate-y-1 hover:border-[#00b341]" style={{ background: '#131320', border: '1px solid #1e1e32' }}>
                <div className="p-3 flex items-center justify-center" style={{ height: '180px', background: '#0b0b14' }}>
                  <img src={p.images[0]} alt={p.name} className="w-full h-full object-contain transition-transform duration-500 group-hover:scale-105" />
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

      {/* 💾 DIGITAL EMAIL PROMPT MODAL */}
      {digitalEmailModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="max-w-md w-full p-6 rounded-2xl border border-[#6366f1]/40 shadow-2xl space-y-4" style={{ background: '#131320' }}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-2xl">💾</span>
                <h3 className="text-xl font-black text-white" style={{ fontFamily: 'Big Shoulders Display' }}>Instant Digital Download</h3>
              </div>
              <button onClick={() => setDigitalEmailModal(false)} className="text-gray-400 hover:text-white text-lg">✕</button>
            </div>
            <p className="text-xs text-gray-300 leading-relaxed">
              Where should we send your download file access and receipt after payment?
            </p>
            <div>
              <label className="block text-[10px] font-bold text-gray-400 mb-1">Email Address *</label>
              <input
                type="email"
                value={digitalEmailInput}
                onChange={e => { setDigitalEmailInput(e.target.value); setDigitalEmailError('') }}
                onKeyDown={e => { if (e.key === 'Enter') executeDigitalPayment(digitalEmailInput) }}
                placeholder="your.email@example.com"
                className="w-full px-4 py-3 text-sm text-white placeholder-gray-500 rounded-xl outline-none focus:ring-1 focus:ring-[#6366f1]"
                style={{ background: '#0c0c14', border: '1px solid #1e1e32' }}
                autoFocus
              />
              {digitalEmailError && <p className="text-xs text-red-400 font-bold mt-1.5">{digitalEmailError}</p>}
            </div>
            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => setDigitalEmailModal(false)}
                className="px-4 py-3 text-xs font-bold text-gray-400 hover:text-white rounded-xl border border-[#1e1e32]"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => executeDigitalPayment(digitalEmailInput)}
                className="flex-1 py-3 text-sm font-black text-white rounded-xl shadow-lg transition-all hover:opacity-90 flex items-center justify-center gap-2"
                style={{ background: '#6366f1', fontFamily: 'Big Shoulders Display' }}
              >
                <span>Continue to Paystack →</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

