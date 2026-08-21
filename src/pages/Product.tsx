import { useState, useEffect } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { useApp } from '../context/AppContext'
import { fetchAllProducts, verifyPaidReceipt } from '../services/supabaseClient'
import { initiatePayment } from '../services/paymentService'
import { getSiteSettings } from '../services/siteSettings'
import { matchProduct, getProductPath, getProductSlug } from '../services/productUtils'
import { Share2, Copy, Check, Heart, MessageCircle } from 'lucide-react'
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

const LEAGUE_BADGES = [
  { id: 'none', label: 'none', price: 0 },
  { id: 'epl_lion', label: 'Premier League Lion Badge', price: 150 },
  { id: 'ucl_starball', label: 'UEFA Champions League Starball', price: 200 },
  { id: 'ucl_winners', label: 'UCL Champions Patch', price: 200 },
  { id: 'fa_cup', label: 'Emirates FA Cup Badge', price: 150 },
  { id: 'la_liga', label: 'La Liga EA Sports Badge', price: 150 },
]

const TOURNAMENT_BADGES = [
  { id: 'none', label: 'none', price: 0 },
  { id: 'world_cup_2026', label: 'FIFA World Cup 2026 Badge', price: 200 },
  { id: 'club_world_cup', label: 'FIFA Club World Cup Champions Badge', price: 200 },
  { id: 'afcon_badge', label: 'AFCON Champions Badge', price: 200 },
]

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
  const [selectedLeagueBadge, setSelectedLeagueBadge] = useState('none')
  const [selectedTournamentBadge, setSelectedTournamentBadge] = useState('none')
  const [isWishlisted, setIsWishlisted] = useState(false)
  const [copied, setCopied] = useState(false)
  const [shareModalOpen, setShareModalOpen] = useState(false)
  const [buyNowLoading, setBuyNowLoading] = useState(false)
  const [buyNowError, setBuyNowError] = useState('')

  // Digital email prompt state
  const [digitalEmailModal, setDigitalEmailModal] = useState(false)
  const [digitalEmailInput, setDigitalEmailInput] = useState('')
  const [digitalEmailError, setDigitalEmailError] = useState('')

  // Player Name & Number Customization state
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
      const found = matchProduct(formatted, id)
      setProduct(found || null)
      if (found) {
        try {
          const list = JSON.parse(localStorage.getItem('flowerzfc_wishlist') || '[]')
          setIsWishlisted(list.includes(String(found.id)))
        } catch {
          setIsWishlisted(false)
        }
      }
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
  const siteSettings = getSiteSettings()
  const availableSizes = (product.sizes && product.sizes.length > 0) ? product.sizes : ['S', 'M', 'L', 'XL', 'XXL']

  const isCustomPrintActive = Boolean(customPlayerName.trim() || customPlayerNumber.trim())
  const printingFeePerItem = isCustomPrintActive ? (product.printing_price || 200) : 0

  const leagueBadgeItem = LEAGUE_BADGES.find(b => b.id === selectedLeagueBadge)
  const leagueBadgePrice = leagueBadgeItem && leagueBadgeItem.id !== 'none' ? leagueBadgeItem.price : 0

  const tournamentBadgeItem = TOURNAMENT_BADGES.find(b => b.id === selectedTournamentBadge)
  const tournamentBadgePrice = tournamentBadgeItem && tournamentBadgeItem.id !== 'none' ? tournamentBadgeItem.price : 0

  const customAddonTotal = (product.addons || []).filter((a: any) => selectedAddons.includes(a.id)).reduce((s: number, a: any) => s + a.price, 0)
  const totalAddonsPerItem = printingFeePerItem + leagueBadgePrice + tournamentBadgePrice + customAddonTotal

  const unitPrice = product.price + totalAddonsPerItem
  const totalPriceWithAddons = unitPrice * qty

  const buildCartPayload = () => {
    let customDetails = ''
    if (customPlayerName.trim() || customPlayerNumber.trim()) {
      const namePart = customPlayerName.toUpperCase().trim()
      const numPart = customPlayerNumber ? ` #${customPlayerNumber.trim()}` : ''
      customDetails += ` [Print: ${namePart}${numPart}]`
    }

    const badgesUsed: string[] = []
    if (leagueBadgeItem && leagueBadgeItem.id !== 'none') badgesUsed.push(leagueBadgeItem.label)
    if (tournamentBadgeItem && tournamentBadgeItem.id !== 'none') badgesUsed.push(tournamentBadgeItem.label)
    if (selectedAddons.length > 0 && product.addons) {
      product.addons.forEach(a => {
        if (selectedAddons.includes(a.id)) badgesUsed.push(a.label)
      })
    }
    if (badgesUsed.length > 0) {
      customDetails += ` (+${badgesUsed.join(', ')})`
    }

    const chosenSize = isDigital ? 'Digital' : (size || availableSizes[0] || 'M')
    return {
      id: product.id,
      name: `${product.name}${customDetails}`,
      price: unitPrice,
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

  const handleOrderWhatsApp = () => {
    const chosenSize = isDigital ? 'Digital' : (size || availableSizes[0] || 'M')
    const pName = customPlayerChoice === 'squad' && selectedSquadPlayer
      ? selectedSquadPlayer
      : (customPlayerName.trim() ? `${customPlayerName.toUpperCase().trim()}${customPlayerNumber ? ` #${customPlayerNumber.trim()}` : ''}` : 'None')

    const badgesUsed: string[] = []
    if (leagueBadgeItem && leagueBadgeItem.id !== 'none') badgesUsed.push(leagueBadgeItem.label)
    if (tournamentBadgeItem && tournamentBadgeItem.id !== 'none') badgesUsed.push(tournamentBadgeItem.label)
    if (selectedAddons.length > 0 && product.addons) {
      product.addons.forEach(a => {
        if (selectedAddons.includes(a.id)) badgesUsed.push(a.label)
      })
    }

    const msg = `Hello FlowerZFC! 👋 I would like to order:
👕 *Product:* ${product.name}
📏 *Size:* ${chosenSize}
✍️ *Custom Print:* ${pName}
🏅 *Badges:* ${badgesUsed.length > 0 ? badgesUsed.join(', ') : 'None'}
🔢 *Quantity:* ${qty}
💰 *Total Amount:* ${formatPrice(totalPriceWithAddons)}

Please confirm order availability and payment details.`

    const rawPhone = (siteSettings.supportPhone2 || siteSettings.supportPhone1 || '254789783258').replace(/[^0-9]/g, '')
    window.open(`https://wa.me/${rawPhone}?text=${encodeURIComponent(msg)}`, '_blank')
  }

  const toggleWishlist = () => {
    if (!product) return
    const prodId = String(product.id)
    try {
      const list = JSON.parse(localStorage.getItem('flowerzfc_wishlist') || '[]')
      let updated: string[] = []
      if (list.includes(prodId)) {
        updated = list.filter((x: string) => x !== prodId)
        setIsWishlisted(false)
      } else {
        updated = [...list, prodId]
        setIsWishlisted(true)
      }
      localStorage.setItem('flowerzfc_wishlist', JSON.stringify(updated))
      window.dispatchEvent(new Event('flowerzfc_wishlist_updated'))
    } catch {}
  }

  const handleShare = async (platform?: 'whatsapp' | 'twitter' | 'native' | 'copy') => {
    if (!product) return
    const currentUrl = window.location.origin + getProductPath(product)
    const shareTitle = `${product.name} | FlowerZFC Official Store`
    const shareText = `Check out ${product.name} on FlowerZFC Store for ${formatPrice(product.price)}!`

    if (platform === 'whatsapp') {
      window.open(`https://wa.me/?text=${encodeURIComponent(shareText + '\n' + currentUrl)}`, '_blank')
      return
    }
    if (platform === 'twitter') {
      window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(currentUrl)}`, '_blank')
      return
    }
    if (platform === 'copy') {
      try {
        await navigator.clipboard.writeText(currentUrl)
        setCopied(true)
        setTimeout(() => setCopied(false), 2500)
      } catch {}
      return
    }

    if (navigator.share) {
      try {
        await navigator.share({
          title: shareTitle,
          text: shareText,
          url: currentUrl,
        })
        return
      } catch {}
    }
    setShareModalOpen(true)
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

                  {/* Wishlist & Share Action Bar (Digital) */}
                  <div className="pt-3 border-t border-[#1e1e32] flex items-center justify-between gap-3">
                    <button
                      type="button"
                      onClick={toggleWishlist}
                      className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold transition-all border cursor-pointer hover:border-gray-500"
                      style={{
                        background: isWishlisted ? 'rgba(239, 68, 68, 0.12)' : '#131322',
                        borderColor: isWishlisted ? '#ef4444' : '#1e1e32',
                        color: isWishlisted ? '#ef4444' : '#d1d5db',
                      }}
                    >
                      <Heart size={14} fill={isWishlisted ? '#ef4444' : 'none'} className={isWishlisted ? 'text-red-500' : 'text-gray-400'} />
                      <span>{isWishlisted ? 'Saved in Wishlist' : 'Add to Wishlist'}</span>
                    </button>

                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => handleShare('whatsapp')}
                        className="px-2.5 py-2 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/20 transition-all text-xs font-bold flex items-center gap-1.5"
                        title="Share on WhatsApp"
                      >
                        <MessageCircle size={14} />
                        <span className="hidden sm:inline">WhatsApp</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleShare('copy')}
                        className="px-2.5 py-2 rounded-xl bg-white/5 border border-white/10 text-gray-300 hover:text-white hover:bg-white/10 transition-all text-xs font-bold flex items-center gap-1.5"
                        title="Copy Product Link"
                      >
                        {copied ? <Check size={14} className="text-[#00b341]" /> : <Copy size={14} />}
                        <span>{copied ? 'Copied!' : 'Copy Link'}</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                {/* 1. Size Selector */}
                {isApparel && (
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-black text-white uppercase tracking-wider">SIZE</span>
                      <span className="text-xs text-[#00b341] font-bold">Selected: <strong className="text-white">{size || availableSizes[0] || 'M'}</strong></span>
                    </div>
                    <div className="flex gap-2 flex-wrap">
                      {availableSizes.map(s => (
                        <button
                          key={s}
                          type="button"
                          onClick={() => setSize(s)}
                          className={`min-w-[44px] h-10 px-3 text-xs font-black rounded-lg border transition-all cursor-pointer ${
                            size === s
                              ? 'bg-white text-black border-white shadow-lg font-black'
                              : 'bg-[#131320] border-[#1e1e32] text-gray-300 hover:border-white/40 hover:text-white'
                          }`}
                        >
                          {s}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* 2. Player Name & Number Customization Inputs */}
                {isApparel && (
                  <div className="pt-1">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[11px] font-bold text-gray-300 mb-1">
                          Print Name <span className="text-gray-500 font-normal">({formatPrice(product.printing_price || 200)})</span>
                        </label>
                        <input
                          type="text"
                          maxLength={12}
                          value={customPlayerName}
                          onChange={e => setCustomPlayerName(e.target.value.toUpperCase())}
                          placeholder="Enter your name here"
                          className="w-full px-3.5 py-2.5 text-xs text-white placeholder-gray-500 rounded-lg outline-none focus:ring-1 focus:ring-[#00b341] uppercase font-mono"
                          style={{ background: '#0c0c14', border: '1px solid #1e1e32' }}
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-bold text-gray-300 mb-1">
                          Print Number <span className="text-gray-500 font-normal">({formatPrice(product.printing_price || 200)})</span>
                        </label>
                        <input
                          type="number"
                          min={0}
                          max={99}
                          value={customPlayerNumber}
                          onChange={e => setCustomPlayerNumber(e.target.value)}
                          placeholder="Enter your number here"
                          className="w-full px-3.5 py-2.5 text-xs text-white placeholder-gray-500 rounded-lg outline-none focus:ring-1 focus:ring-[#00b341] font-mono text-center"
                          style={{ background: '#0c0c14', border: '1px solid #1e1e32' }}
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* 3. Badges Dropdowns */}
                {isApparel && (
                  <div className="space-y-3 pt-1">
                    <div>
                      <label className="block text-[11px] font-bold text-gray-300 mb-1">EPL Badges</label>
                      <select
                        value={selectedLeagueBadge}
                        onChange={e => setSelectedLeagueBadge(e.target.value)}
                        className="w-full px-3.5 py-2.5 text-xs text-white rounded-lg outline-none focus:ring-1 focus:ring-[#00b341] cursor-pointer"
                        style={{ background: '#0c0c14', border: '1px solid #1e1e32' }}
                      >
                        {LEAGUE_BADGES.map(b => (
                          <option key={b.id} value={b.id}>
                            {b.label}{b.price > 0 ? ` (+${formatPrice(b.price)})` : ''}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-gray-300 mb-1">World Cup Badges</label>
                      <select
                        value={selectedTournamentBadge}
                        onChange={e => setSelectedTournamentBadge(e.target.value)}
                        className="w-full px-3.5 py-2.5 text-xs text-white rounded-lg outline-none focus:ring-1 focus:ring-[#00b341] cursor-pointer"
                        style={{ background: '#0c0c14', border: '1px solid #1e1e32' }}
                      >
                        {TOURNAMENT_BADGES.map(b => (
                          <option key={b.id} value={b.id}>
                            {b.label}{b.price > 0 ? ` (+${formatPrice(b.price)})` : ''}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                )}

                {/* 4. Product Add-ons (if any from backend) */}
                {product.addons && product.addons.length > 0 && (
                  <div className="space-y-2 pt-1">
                    <p className="text-xs font-bold text-gray-300">🏅 Extra Add-ons</p>
                    {product.addons.map(addon => (
                      <label
                        key={addon.id}
                        className="flex items-center gap-3 p-2.5 rounded-lg border cursor-pointer transition-all"
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
                        {addon.icon && <span className="text-sm">{addon.icon}</span>}
                        <span className="flex-1 text-xs font-semibold text-white">{addon.label}</span>
                        <span className="text-xs font-black text-[#00b341]">+{formatPrice(addon.price)}</span>
                      </label>
                    ))}
                  </div>
                )}

                {/* Total with options */}
                {totalAddonsPerItem > 0 && (
                  <div className="flex items-center justify-between p-3 rounded-xl border border-[#00b341]/30" style={{ background: 'rgba(0,179,65,0.06)' }}>
                    <span className="text-xs font-bold text-gray-300">Total with options & customization:</span>
                    <span className="text-lg font-black text-[#00b341]">{formatPrice(totalPriceWithAddons)}</span>
                  </div>
                )}

                {/* 5. Quantity + Action Buttons Row */}
                <div className="pt-2 space-y-3">
                  <div className="flex flex-col sm:flex-row gap-2.5 items-stretch">
                    {/* Quantity Pill */}
                    <div className="flex items-center justify-between border rounded-lg px-2 h-12 shrink-0 min-w-[110px]" style={{ borderColor: '#1e1e32', background: '#0c0c14' }}>
                      <button
                        type="button"
                        onClick={() => setQty(q => Math.max(1, q - 1))}
                        className="w-7 h-7 text-gray-300 hover:text-white font-bold text-base flex items-center justify-center transition-colors cursor-pointer"
                      >
                        −
                      </button>
                      <span className="text-sm font-black text-white px-2">{qty}</span>
                      <button
                        type="button"
                        onClick={() => setQty(q => q + 1)}
                        className="w-7 h-7 text-gray-300 hover:text-white font-bold text-base flex items-center justify-center transition-colors cursor-pointer"
                      >
                        +
                      </button>
                    </div>

                    {/* Add to Cart */}
                    <button
                      type="button"
                      onClick={handleAdd}
                      className="flex-1 h-12 px-4 rounded-lg font-bold text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2 shadow-md cursor-pointer hover:opacity-95"
                      style={{
                        background: added ? '#22c55e' : '#1e1e32',
                        color: added ? '#ffffff' : '#e5e7eb',
                        border: '1px solid #2e2e48',
                      }}
                    >
                      {added ? '✓ Added to Cart' : '🛒 Add to cart'}
                    </button>

                    {/* Buy Now */}
                    <button
                      type="button"
                      onClick={handleBuyNow}
                      className="flex-1 h-12 px-4 rounded-lg font-black text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2 shadow-lg cursor-pointer hover:opacity-95 text-white"
                      style={{ background: '#00b341' }}
                    >
                      ⚡ Buy Now
                    </button>
                  </div>

                  {/* Wishlist & Share Action Bar */}
                  <div className="pt-3 border-t border-[#1e1e32] flex items-center justify-between gap-3">
                    <button
                      type="button"
                      onClick={toggleWishlist}
                      className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold transition-all border cursor-pointer hover:border-gray-500"
                      style={{
                        background: isWishlisted ? 'rgba(239, 68, 68, 0.12)' : '#131322',
                        borderColor: isWishlisted ? '#ef4444' : '#1e1e32',
                        color: isWishlisted ? '#ef4444' : '#d1d5db',
                      }}
                    >
                      <Heart size={14} fill={isWishlisted ? '#ef4444' : 'none'} className={isWishlisted ? 'text-red-500' : 'text-gray-400'} />
                      <span>{isWishlisted ? 'Saved in Wishlist' : 'Add to Wishlist'}</span>
                    </button>

                    {/* Share Buttons */}
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => handleShare('whatsapp')}
                        className="px-2.5 py-2 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/20 transition-all text-xs font-bold flex items-center gap-1.5"
                        title="Share on WhatsApp"
                      >
                        <MessageCircle size={14} />
                        <span className="hidden sm:inline">WhatsApp</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleShare('copy')}
                        className="px-2.5 py-2 rounded-xl bg-white/5 border border-white/10 text-gray-300 hover:text-white hover:bg-white/10 transition-all text-xs font-bold flex items-center gap-1.5"
                        title="Copy Product Link"
                      >
                        {copied ? <Check size={14} className="text-[#00b341]" /> : <Copy size={14} />}
                        <span>{copied ? 'Copied!' : 'Copy Link'}</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleShare('native')}
                        className="p-2 rounded-xl bg-white/5 border border-white/10 text-gray-300 hover:text-white hover:bg-white/10 transition-all text-xs font-bold flex items-center gap-1"
                        title="More Sharing Options"
                      >
                        <Share2 size={14} />
                      </button>
                    </div>
                  </div>
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
                  {product.info_shipping || siteSettings.shippingText}
                </p>
              </div>

              <div>
                <p className="text-sm font-black text-white mb-1.5">📐 Sizing</p>
                <p className="text-xs text-gray-400 leading-relaxed">
                  {product.info_sizing || siteSettings.sizingText}
                </p>
              </div>

              <div>
                <p className="text-sm font-black text-white mb-1.5">🔄 Returns</p>
                <p className="text-xs text-gray-400 leading-relaxed">
                  {product.info_returns || siteSettings.returnsText}
                </p>
              </div>

              <div>
                <p className="text-sm font-black text-white mb-1.5">📞 Assistance</p>
                <p className="text-xs text-gray-400 leading-relaxed">
                  {product.info_assistance || siteSettings.assistanceText}
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

      {/* Share Modal Dialog */}
      {shareModalOpen && product && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-md" style={{ background: 'rgba(0,0,0,0.85)' }} onClick={() => setShareModalOpen(false)}>
          <div className="w-full max-w-sm rounded-2xl border border-white/10 p-5 shadow-2xl space-y-4 animate-scaleIn" style={{ background: '#111122' }} onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <div className="flex items-center gap-2">
                <Share2 size={18} className="text-[#00b341]" />
                <h3 className="text-base font-black text-white" style={{ fontFamily: 'Big Shoulders Display' }}>Share this Product</h3>
              </div>
              <button type="button" onClick={() => setShareModalOpen(false)} className="text-gray-400 hover:text-white text-xs font-bold">✕</button>
            </div>

            <div className="flex items-center gap-3 p-2.5 rounded-xl bg-white/5 border border-white/5">
              <img src={product.images[0]} alt={product.name} className="w-12 h-12 object-contain rounded-lg bg-black/40 p-1" />
              <div className="min-w-0 flex-1">
                <p className="text-xs font-bold text-white truncate">{product.name}</p>
                <p className="text-xs font-mono font-bold text-[#00b341]">{formatPrice(product.price)}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => { handleShare('whatsapp'); setShareModalOpen(false) }}
                className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/20 transition-all text-xs font-bold flex items-center justify-center gap-2"
              >
                <MessageCircle size={16} />
                <span>WhatsApp</span>
              </button>
              <button
                type="button"
                onClick={() => { handleShare('twitter'); setShareModalOpen(false) }}
                className="p-3 rounded-xl bg-sky-500/10 border border-sky-500/30 text-sky-400 hover:bg-sky-500/20 transition-all text-xs font-bold flex items-center justify-center gap-2"
              >
                <span>𝕏 Twitter</span>
              </button>
            </div>

            <div className="pt-2">
              <button
                type="button"
                onClick={() => handleShare('copy')}
                className="w-full py-2.5 px-3 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 text-gray-200 text-xs font-bold flex items-center justify-center gap-2 transition-all"
              >
                {copied ? <Check size={15} className="text-[#00b341]" /> : <Copy size={15} />}
                <span>{copied ? 'Link Copied to Clipboard!' : 'Copy Direct Link'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

