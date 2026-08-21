import { useState, useEffect, useMemo } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useApp } from '../context/AppContext'
import { initiatePayment } from '../services/paymentService'
import ReceiptPrinter from '../components/ReceiptPrinter'
import { createOrder, fetchAllProducts, verifyPaidReceipt } from '../services/supabaseClient'
import { getSiteSettings } from '../services/siteSettings'
import { sendOrderConfirmation, notifyAdminNewOrder } from '../services/emailService'

type Step = 'contact' | 'shipping' | 'payment' | 'verifying' | 'confirmation' | 'failed'
type DeliveryMethod = 'home' | 'pickup'

const COUNTRIES = [
  { code: 'KE', name: 'Kenya', dial: '+254', flag: '🇰🇪' },
  { code: 'US', name: 'United States', dial: '+1', flag: '🇺🇸' },
  { code: 'GB', name: 'United Kingdom', dial: '+44', flag: '🇬🇧' },
  { code: 'CA', name: 'Canada', dial: '+1', flag: '🇨🇦' },
  { code: 'NG', name: 'Nigeria', dial: '+234', flag: '🇳🇬' },
  { code: 'ZA', name: 'South Africa', dial: '+27', flag: '🇿🇦' },
  { code: 'GH', name: 'Ghana', dial: '+233', flag: '🇬🇭' },
  { code: 'TZ', name: 'Tanzania', dial: '+255', flag: '🇹🇿' },
  { code: 'UG', name: 'Uganda', dial: '+256', flag: '🇺🇬' },
  { code: 'RW', name: 'Rwanda', dial: '+250', flag: '🇷🇼' },
  { code: 'AE', name: 'United Arab Emirates', dial: '+971', flag: '🇦🇪' },
  { code: 'DE', name: 'Germany', dial: '+49', flag: '🇩🇪' },
  { code: 'FR', name: 'France', dial: '+33', flag: '🇫🇷' },
  { code: 'AU', name: 'Australia', dial: '+61', flag: '🇦🇺' },
]

const KENYA_COUNTIES = [
  'Nairobi', 'Mombasa', 'Kiambu', 'Nakuru', 'Machakos', 'Uasin Gishu', 'Kisumu', 'Kilifi',
  'Kajiado', 'Nyeri', 'Meru', 'Murang\'a', 'Kakamega', 'Bungoma', 'Kisii', 'Kericho',
  'Garissa', 'Embu', 'Kitui', 'Laikipia', 'Makueni', 'Trans Nzoia', 'Baringo', 'Bomet',
  'Busia', 'Elgeyo Marakwet', 'Homa Bay', 'Isiolo', 'Kirinyaga', 'Kwale', 'Lamu', 'Mandera',
  'Marsabit', 'Migori', 'Nandi', 'Narok', 'Nyamira', 'Nyandarua', 'Samburu', 'Siaya',
  'Taita Taveta', 'Tana River', 'Tharaka Nithi', 'Turkana', 'Vihiga', 'Wajir', 'West Pokot'
]

const KENYA_CITY_SUGGESTIONS = [
  'Nairobi', 'Mombasa', 'Kisumu', 'Nakuru', 'Eldoret', 'Thika', 'Malindi', 'Naivasha', 'Kitale', 'Machakos'
]

const US_STATES = [
  'Alabama', 'Alaska', 'Arizona', 'Arkansas', 'California', 'Colorado', 'Connecticut', 'Delaware',
  'Florida', 'Georgia', 'Hawaii', 'Idaho', 'Illinois', 'Indiana', 'Iowa', 'Kansas', 'Kentucky',
  'Louisiana', 'Maine', 'Maryland', 'Massachusetts', 'Michigan', 'Minnesota', 'Mississippi',
  'Missouri', 'Montana', 'Nebraska', 'Nevada', 'New Hampshire', 'New Jersey', 'New Mexico',
  'New York', 'North Carolina', 'North Dakota', 'Ohio', 'Oklahoma', 'Oregon', 'Pennsylvania',
  'Rhode Island', 'South Carolina', 'South Dakota', 'Tennessee', 'Texas', 'Utah', 'Vermont',
  'Virginia', 'Washington', 'West Virginia', 'Wisconsin', 'Wyoming'
]

const PICKUP_HUBS = [
  { id: 'hub_nairobi_cbd', name: 'CBD Nairobi Hub (Moi Avenue Office)', hours: 'Mon–Sat: 8:30 AM – 6:30 PM', phone: '+254 712 293 303' },
  { id: 'hub_mombasa', name: 'Mombasa Pickup Center (Nyali Mall)', hours: 'Mon–Sat: 9:00 AM – 6:00 PM', phone: '+254 789 783 258' },
  { id: 'hub_kisumu', name: 'Kisumu Hub (Mega Plaza Ground Floor)', hours: 'Mon–Sat: 9:00 AM – 5:30 PM', phone: '+254 712 293 303' },
]

const KES_TO_USD_RATE = 130 // 1 USD = 130 KES

const inputCls = 'w-full px-4 py-3 text-sm text-white placeholder-gray-500 rounded-xl outline-none focus:ring-1 focus:ring-[#00b341] transition-all'
const inputStyle = { background: '#0c0c14', border: '1px solid #1e1e32' }

function generateOrderReference(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  let result = ''
  for (let i = 0; i < 6; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return `FZ-${result}`
}

export default function Checkout() {
  const [searchParams] = useSearchParams()
  const confirmedRef = searchParams.get('ref')
  const isConfirmedDirectPay = searchParams.get('confirmed') === '1'

  const { cart, cartTotal, clearCart, user, t, formatPrice } = useApp()
  const siteSettings = getSiteSettings()
  const [orderNum] = useState(generateOrderReference())
  const [errorMessage, setErrorMessage] = useState('')
  const [isProcessingPayment, setIsProcessingPayment] = useState(false)

  // Digital products detection
  const [cartProductTypes, setCartProductTypes] = useState<Record<string, 'physical' | 'digital'>>({})
  const [cartDigitalFiles, setCartDigitalFiles] = useState<Record<string, string | null>>({})
  const [cartDigitalPasswords, setCartDigitalPasswords] = useState<Record<string, string | null>>({})
  const [cartMacFiles, setCartMacFiles] = useState<Record<string, string | null>>({})
  const [cartWindowsFiles, setCartWindowsFiles] = useState<Record<string, string | null>>({})
  const [cartAndroidFiles, setCartAndroidFiles] = useState<Record<string, string | null>>({})

  // Masked passwords visible state per item
  const [revealedPasswords, setRevealedPasswords] = useState<Record<string, boolean>>({})
  const [copiedKey, setCopiedKey] = useState<string | null>(null)

  // Recovery utility state
  const [recoveryQuery, setRecoveryQuery] = useState('')
  const [recoveryError, setRecoveryError] = useState('')
  const [recoveryOrder, setRecoveryOrder] = useState<any | null>(null)
  const [isSearchingRecovery, setIsSearchingRecovery] = useState(false)

  useEffect(() => {
    fetchAllProducts().then(({ products }) => {
      if (!products) return
      const types: Record<string, 'physical' | 'digital'> = {}
      const files: Record<string, string | null> = {}
      const passwords: Record<string, string | null> = {}
      const macs: Record<string, string | null> = {}
      const windows: Record<string, string | null> = {}
      const androids: Record<string, string | null> = {}
      products.forEach((p: any) => {
        types[String(p.id)] = p.type || 'physical'
        files[String(p.id)] = p.digital_file_url || null
        passwords[String(p.id)] = p.access_password || null
        macs[String(p.id)] = p.mac_url || null
        windows[String(p.id)] = p.windows_url || null
        androids[String(p.id)] = p.android_url || null
      })
      setCartProductTypes(types)
      setCartDigitalFiles(files)
      setCartDigitalPasswords(passwords)
      setCartMacFiles(macs)
      setCartWindowsFiles(windows)
      setCartAndroidFiles(androids)
    })
  }, [])

  const isAllDigital = cart.length > 0 && cart.every(item => cartProductTypes[item.id] === 'digital')
  const hasDigitalItems = cart.some(item => cartProductTypes[item.id] === 'digital')
  const hasPhysicalItems = cart.some(item => cartProductTypes[item.id] !== 'digital')

  const [step, setStep] = useState<Step>(isAllDigital ? 'payment' : 'contact')
  const [savedCartItems, setSavedCartItems] = useState(cart)

  useEffect(() => {
    if (cart.length > 0) setSavedCartItems(cart)
  }, [cart])

  useEffect(() => {
    if (isAllDigital && (step === 'contact' || step === 'shipping')) {
      setStep('payment')
    }
  }, [isAllDigital, step])

  useEffect(() => {
    if (isConfirmedDirectPay) {
      setStep('confirmation')
    }
  }, [isConfirmedDirectPay])

  // Form states
  const [deliveryMethod, setDeliveryMethod] = useState<DeliveryMethod>('home')
  const [selectedPickupHub, setSelectedPickupHub] = useState(PICKUP_HUBS[0].id)

  const [shipping, setShipping] = useState({
    name: user?.name || '',
    email: user?.email || '',
    phone: '',
    address1: '',
    address2: '',
    city: '',
    region: 'Nairobi',
    postal: '',
    country: 'Kenya',
  })

  const isKenya = shipping.country === 'Kenya'
  const activeCurrency = isKenya ? 'KES' : 'USD'
  const currencySymbol = isKenya ? 'KSh' : '$'

  const [tip, setTip] = useState(0)

  // City suggestions filter
  const citySuggestions = useMemo(() => {
    if (!shipping.city || !isKenya) return []
    return KENYA_CITY_SUGGESTIONS.filter(c => c.toLowerCase().startsWith(shipping.city.toLowerCase()) && c.toLowerCase() !== shipping.city.toLowerCase())
  }, [shipping.city, isKenya])

  // Free shipping threshold calculations
  const FREE_SHIPPING_THRESHOLD_KES = 8000
  const isFreeShippingUnlocked = cartTotal >= FREE_SHIPPING_THRESHOLD_KES

  // Logistics fee
  const shippingFee = useMemo(() => {
    if (isAllDigital) return 0
    if (isKenya) {
      if (deliveryMethod === 'pickup') return 0
      return isFreeShippingUnlocked ? 0 : 350
    }
    // Global DHL flat export
    return 3500 // ~27.00 USD
  }, [isAllDigital, isKenya, deliveryMethod, isFreeShippingUnlocked])

  const grandTotalKes = cartTotal + shippingFee + tip
  const grandTotalUsd = Number((grandTotalKes / KES_TO_USD_RATE).toFixed(2))
  const displayTotal = isKenya ? grandTotalKes : grandTotalUsd

  const tipOptions = isKenya ? [0, 200, 500, 1000] : [0, 2, 5, 10]

  // Validations
  const isNameValid = shipping.name.trim().split(/\s+/).length >= 2
  const isEmailValid = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(shipping.email.trim())
  const isPhoneValid = shipping.phone.trim().length >= 9

  const canProceedContact = isAllDigital ? (shipping.name.trim() !== '' && isEmailValid) : (isNameValid && isEmailValid && isPhoneValid)
  const canProceedShipping = deliveryMethod === 'pickup' || (shipping.address1.trim() !== '' && shipping.city.trim() !== '')

  const handleStartPayment = async () => {
    if (isProcessingPayment) return
    if (!isEmailValid) {
      setErrorMessage('Please enter a valid email address.')
      return
    }
    if (!isAllDigital && !canProceedShipping) {
      setErrorMessage('Please complete all required shipping fields.')
      return
    }

    setIsProcessingPayment(true)
    setErrorMessage('')

    // Prepare amount in lowest currency unit
    // KES amount for Paystack is in KES standard integer/kobo; for USD in cents
    const finalAmount = isKenya ? Math.round(grandTotalKes) : Math.round(grandTotalUsd * 100)

    try {
      const res = await initiatePayment({
        amount: finalAmount,
        currency: activeCurrency,
        email: shipping.email.trim(),
        phone: shipping.phone.trim(),
        method: 'card',
        reference: orderNum,
        metadata: {
          customer_name: shipping.name,
          customer_phone: shipping.phone,
          shipping_address: isAllDigital
            ? 'Digital Delivery (Email)'
            : deliveryMethod === 'pickup'
            ? `Pickup: ${PICKUP_HUBS.find(h => h.id === selectedPickupHub)?.name}`
            : `${shipping.address1} ${shipping.address2 ? `(${shipping.address2})` : ''}, ${shipping.city}, ${shipping.region}, ${shipping.country}`,
          cart_items: (cart.length > 0 ? cart : savedCartItems).map(c => ({ name: c.name, size: c.size, qty: c.quantity })),
        },
      })

      if (res.success) {
        setStep('verifying')
        await saveOrderToSupabase()
        clearCart()
        setStep('confirmation')
      } else {
        setErrorMessage(res.message || 'Payment popup was closed or cancelled. Please try again.')
        setStep('failed')
      }
    } catch (err: any) {
      setErrorMessage(err?.message || 'Payment could not be processed. Please try again.')
      setStep('failed')
    } finally {
      setIsProcessingPayment(false)
    }
  }

  const saveOrderToSupabase = async () => {
    try {
      const chosenHub = PICKUP_HUBS.find(h => h.id === selectedPickupHub)
      const addressString = isAllDigital
        ? 'Digital Delivery (Instant Web / Email)'
        : deliveryMethod === 'pickup'
        ? `🏪 Store Pickup Hub: ${chosenHub?.name}`
        : `${shipping.address1}, ${shipping.address2 ? `${shipping.address2}, ` : ''}${shipping.city}, ${shipping.region}, ${shipping.country}`

      const orderItems = (cart.length > 0 ? cart : savedCartItems).map(c => ({
        name: c.name,
        price: c.price,
        qty: c.quantity,
        size: c.size,
      }))

      await createOrder({
        id: orderNum,
        customer_name: shipping.name || 'Customer',
        email: shipping.email || 'customer@flowerz.fc',
        phone: shipping.phone || '',
        shipping_address: addressString,
        items: JSON.stringify(orderItems),
        total: grandTotalKes,
        method: isKenya ? 'paystack_kes' : 'paystack_usd',
        status: 'paid',
        tracking: `TRK-${Math.floor(100000 + Math.random() * 900000)}`,
        shippingCourier: isAllDigital ? 'Digital' : deliveryMethod === 'pickup' ? 'Store Pickup' : isKenya ? 'G4S Kenya Tracked' : 'DHL Express Worldwide',
        shippingCostKes: shippingFee,
      } as any)

      // 1. Send Order Confirmation Email to Customer
      if (shipping.email && shipping.email.includes('@')) {
        sendOrderConfirmation({
          to: shipping.email,
          customerName: shipping.name || 'Customer',
          orderId: orderNum,
          items: orderItems,
          total: grandTotalKes,
          shippingAddress: addressString,
          isDigital: isAllDigital,
        }).catch(console.error)
      }

      // 2. Notify Admin of New Order
      notifyAdminNewOrder({
        orderId: orderNum,
        customerName: shipping.name || 'Customer',
        customerEmail: shipping.email || 'customer@flowerz.fc',
        customerPhone: shipping.phone,
        items: orderItems,
        total: grandTotalKes,
        shippingAddress: addressString,
        paymentMethod: isKenya ? 'Paystack (KES M-Pesa / Card)' : 'Paystack (USD Card)',
      }).catch(console.error)
    } catch (e) {
      console.error('Failed to write order to Supabase:', e)
    }
  }

  const handleExecuteRecovery = async () => {
    if (!recoveryQuery.trim()) return
    setIsSearchingRecovery(true)
    setRecoveryError('')
    try {
      const res = await verifyPaidReceipt(recoveryQuery)
      if (res.valid) {
        setRecoveryOrder(res.order)
      } else {
        setRecoveryError(res.message)
      }
    } catch {
      setRecoveryError('Could not verify reference code. Please check and try again.')
    } finally {
      setIsSearchingRecovery(false)
    }
  }

  if (cart.length === 0 && step !== 'confirmation' && step !== 'verifying' && step !== 'failed') {
    return (
      <div className="max-w-screen-md mx-auto px-4 py-24 text-center">
        <p className="text-5xl mb-4">🛒</p>
        <p className="text-lg text-gray-400 mb-6">{t('cartEmpty')}</p>
        <Link to="/shop" className="inline-block px-6 py-3 text-sm font-bold text-white rounded-xl" style={{ background: '#00b341' }}>
          {t('browseShop')}
        </Link>
      </div>
    )
  }

  return (
    <div style={{ background: '#0a0a14', minHeight: '100vh' }}>
      <div className="max-w-screen-xl mx-auto px-4 py-8">
        <Link to="/shop" className="text-xs text-gray-500 hover:text-white transition-colors mb-6 inline-flex items-center gap-1">
          ← {t('shop')}
        </Link>
        <h1 className="text-4xl font-black text-white mb-8" style={{ fontFamily: 'Big Shoulders Display' }}>
          {t('checkout')}
        </h1>

        {/* Step Indicator */}
        {step !== 'confirmation' && step !== 'failed' && (
          <div className="flex items-center gap-3 mb-8">
            {[
              { s: isAllDigital ? 'contact' : 'shipping', label: isAllDigital ? '1. Contact Info' : '1. Delivery & Address' },
              { s: 'payment', label: '2. Review & Pay' },
            ].map((st, i) => (
              <div key={st.s} className="flex items-center gap-2">
                <div
                  className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-black transition-all"
                  style={{
                    background: step === st.s || (i === 0 && step === 'payment')
                      ? (isAllDigital ? '#6366f1' : '#00b341')
                      : '#1e1e32',
                    color: '#fff',
                  }}
                >
                  {i + 1}
                </div>
                <span className={`text-sm font-semibold capitalize ${step === st.s ? 'text-white' : 'text-gray-500'}`}>{st.label}</span>
                {i < 1 && <div className="w-8 h-px mx-1" style={{ background: '#1e1e32' }} />}
              </div>
            ))}
          </div>
        )}

        {/* ══ PAYMENT FAILED STATE ══════════════════════════════════════════ */}
        {step === 'failed' && (
          <div className="max-w-md mx-auto py-12 px-6 rounded-2xl border border-red-500/50 text-center shadow-2xl space-y-6" style={{ background: '#131320' }}>
            <div className="w-20 h-20 mx-auto rounded-full bg-red-500/20 border-2 border-red-500 flex items-center justify-center text-4xl">
              ❌
            </div>
            <div>
              <span className="text-xs font-black uppercase text-red-400 tracking-widest block mb-1">TRANSACTION DECLINED</span>
              <h2 className="text-3xl font-black text-white" style={{ fontFamily: 'Big Shoulders Display' }}>Payment Failed</h2>
            </div>
            <div className="p-4 rounded-xl border border-red-500/30 text-xs text-red-200 text-left space-y-1" style={{ background: 'rgba(239, 68, 68, 0.08)' }}>
              <p className="font-bold text-white mb-1">Reason:</p>
              <p>{errorMessage || 'The transaction was cancelled or the payment gateway timed out.'}</p>
            </div>
            <button
              onClick={() => setStep('payment')}
              className="w-full py-3.5 text-xs font-bold text-white rounded-xl shadow-xl transition-all hover:opacity-90"
              style={{ background: '#00b341', fontFamily: 'Big Shoulders Display', fontSize: '16px' }}
            >
              🔄 Try Payment Again →
            </button>
          </div>
        )}

        {/* ══ ORDER CONFIRMED STATE (STEP 4) ════════════════════════════════ */}
        {step === 'confirmation' && (
          <div className="max-w-2xl mx-auto space-y-6">
            <div className="text-center py-10 px-6 rounded-2xl border border-[#00b341]" style={{ background: '#131320' }}>
              <div className="text-7xl mb-4 animate-bounce">{isAllDigital ? '💾' : '🎉'}</div>
              <h2 className="text-4xl font-black text-white mb-2" style={{ fontFamily: 'Big Shoulders Display' }}>
                {isAllDigital ? 'Purchase Complete! Download Ready.' : 'Payment Received & Order Confirmed!'}
              </h2>
              <p className="text-gray-400 mb-1">
                Order Tracking Code: <strong className="text-[#00b341] font-mono text-lg">{orderNum}</strong>
              </p>
              {confirmedRef && (
                <p className="text-xs text-gray-400">Payment Reference: <strong className="font-mono text-white">{confirmedRef}</strong></p>
              )}
              <p className="text-xs text-gray-400 mt-2">A full receipt has been emailed to <strong className="text-white">{shipping.email || 'your email'}</strong>.</p>

              <ReceiptPrinter
                orderNum={orderNum}
                items={(cart.length > 0 ? cart : savedCartItems).map(item => ({ name: item.name, qty: item.quantity, price: item.price }))}
                subtotal={cartTotal}
                shipping={shippingFee}
                tip={tip}
                total={grandTotalKes}
              />

              {/* Order Status Roadmap for Physical */}
              {!isAllDigital && (
                <div className="mt-6 p-4 rounded-xl border border-[#1e1e32] text-left" style={{ background: '#0c0c14' }}>
                  <p className="text-[10px] font-black uppercase text-gray-400 tracking-wider mb-3">Order Status Roadmap</p>
                  <div className="flex items-center justify-between text-xs font-bold gap-2">
                    <div className="flex items-center gap-1.5 text-emerald-400">
                      <span>✅</span>
                      <span>Payment Received</span>
                    </div>
                    <span className="text-gray-600">➔</span>
                    <div className="flex items-center gap-1.5 text-[#00b341]">
                      <span className="w-2 h-2 rounded-full bg-[#00b341] animate-ping" />
                      <span>Order Processing</span>
                    </div>
                    <span className="text-gray-600">➔</span>
                    <div className="flex items-center gap-1.5 text-gray-500">
                      <span>📦</span>
                      <span>{deliveryMethod === 'pickup' ? 'Ready for Pickup' : 'Dispatched'}</span>
                    </div>
                  </div>
                  {deliveryMethod === 'pickup' ? (
                    <div className="mt-4 pt-3 border-t border-[#1e1e32] text-xs text-gray-300">
                      <p className="font-bold text-white mb-1">📍 Designated Collection Hub:</p>
                      <p className="text-emerald-400 font-semibold">{PICKUP_HUBS.find(h => h.id === selectedPickupHub)?.name}</p>
                      <p className="text-gray-400 text-[11px] mt-0.5">{PICKUP_HUBS.find(h => h.id === selectedPickupHub)?.hours}</p>
                    </div>
                  ) : (
                    <p className="mt-3 text-xs text-gray-400">
                      Courier: <strong>{isKenya ? 'G4S Kenya Tracked (1–3 business days)' : 'DHL Express Worldwide (14–21 business days)'}</strong>
                    </p>
                  )}
                </div>
              )}

              {/* Customer Care Contacts */}
              <div className="mt-6 p-4 rounded-xl border border-[#1e1e32] text-left text-xs text-gray-400 space-y-1" style={{ background: '#0c0c14' }}>
                <p className="font-bold text-white mb-1">📞 Customer Care & Delivery Inquiries:</p>
                <p>Hotlines: <strong className="text-white">{siteSettings.supportPhone1} / {siteSettings.supportPhone2}</strong></p>
                <p>Support Mail: <strong className="text-white">{siteSettings.supportEmail}</strong></p>
              </div>

              <div className="mt-6">
                <Link to="/" className="inline-block px-8 py-3 text-sm font-bold text-white rounded-xl shadow-xl transition-all hover:opacity-90" style={{ background: '#00b341' }}>
                  Back to Store Home
                </Link>
              </div>
            </div>

            {/* 💾 DIGITAL INSTANT DOWNLOAD CENTER */}
            {hasDigitalItems && (
              <div className="p-6 rounded-2xl border border-[#6366f1]/40 space-y-4" style={{ background: 'rgba(99,102,241,0.06)' }}>
                <div className="flex items-center gap-3">
                  <span className="text-3xl">💾</span>
                  <div>
                    <h3 className="font-black text-white text-xl" style={{ fontFamily: 'Big Shoulders Display' }}>Instant Download Center</h3>
                    <p className="text-xs text-[#a5b4fc]">Click the button matching your operating system to download your files immediately.</p>
                  </div>
                </div>

                <div className="space-y-4">
                  {savedCartItems.filter(item => cartProductTypes[item.id] === 'digital').map(item => (
                    <div key={item.id} className="p-4 rounded-xl border border-[#6366f1]/30 space-y-3" style={{ background: '#131320' }}>
                      <div className="flex items-center gap-3">
                        <img src={item.image} alt={item.name} className="w-12 h-12 rounded-lg object-contain bg-[#0c0c14] p-1 shrink-0" />
                        <div>
                          <p className="text-sm font-bold text-white">{item.name}</p>
                          <p className="text-[10px] text-[#a5b4fc]">Official Digital File & Assets</p>
                        </div>
                      </div>

                      {/* Multi-OS Platform Direct Download Targets */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {(cartMacFiles[item.id] || cartDigitalFiles[item.id]) && (
                          <a
                            href={cartMacFiles[item.id] || cartDigitalFiles[item.id]!}
                            target="_blank"
                            rel="noopener noreferrer"
                            download
                            className="flex items-center justify-center gap-2 py-2.5 px-3 text-xs font-black text-white rounded-xl border border-white/20 hover:opacity-90 transition-all"
                            style={{ background: '#1e1e38' }}
                          >
                            <span>🍏</span>
                            <span>Download for macOS (.dmg / .zip)</span>
                          </a>
                        )}

                        {(cartWindowsFiles[item.id] || cartDigitalFiles[item.id]) && (
                          <a
                            href={cartWindowsFiles[item.id] || cartDigitalFiles[item.id]!}
                            target="_blank"
                            rel="noopener noreferrer"
                            download
                            className="flex items-center justify-center gap-2 py-2.5 px-3 text-xs font-black text-white rounded-xl border border-[#00a4ef]/30 hover:opacity-90 transition-all"
                            style={{ background: 'rgba(0,164,239,0.12)', color: '#38bdf8' }}
                          >
                            <span>🪟</span>
                            <span>Download for Windows (.exe / .zip)</span>
                          </a>
                        )}

                        {(cartAndroidFiles[item.id] || cartDigitalFiles[item.id]) && (
                          <a
                            href={cartAndroidFiles[item.id] || cartDigitalFiles[item.id]!}
                            target="_blank"
                            rel="noopener noreferrer"
                            download
                            className="flex items-center justify-center gap-2 py-2.5 px-3 text-xs font-black text-white rounded-xl border border-[#3ddc84]/30 hover:opacity-90 transition-all"
                            style={{ background: 'rgba(61,220,132,0.12)', color: '#4ade80' }}
                          >
                            <span>🤖</span>
                            <span>Download Android APK (.apk)</span>
                          </a>
                        )}

                        {cartDigitalFiles[item.id] && (
                          <a
                            href={cartDigitalFiles[item.id]!}
                            target="_blank"
                            rel="noopener noreferrer"
                            download
                            className="flex items-center justify-center gap-2 py-2.5 px-3 text-xs font-black text-white rounded-xl hover:opacity-90 transition-all"
                            style={{ background: '#22c55e' }}
                          >
                            <span>📦</span>
                            <span>Universal Download (.ZIP)</span>
                          </a>
                        )}
                      </div>

                      {/* Decryption / Access Password with Eye Icon Toggle & 1-Click Copy */}
                      {cartDigitalPasswords[item.id] && (
                        <div className="p-3 rounded-lg bg-black/40 border border-[#1e1e32] flex items-center justify-between gap-3 text-xs">
                          <div className="flex items-center gap-2">
                            <span>🔑</span>
                            <span className="text-gray-400">Unlock Password:</span>
                            <span className="font-mono text-white font-bold tracking-wider">
                              {revealedPasswords[item.id] ? cartDigitalPasswords[item.id] : '••••••••'}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => setRevealedPasswords(prev => ({ ...prev, [item.id]: !prev[item.id] }))}
                              className="text-gray-400 hover:text-white text-sm p-1"
                              title="Toggle Visibility"
                            >
                              {revealedPasswords[item.id] ? '🙈' : '👁️'}
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                navigator.clipboard.writeText(cartDigitalPasswords[item.id] || '')
                                setCopiedKey(item.id)
                                setTimeout(() => setCopiedKey(null), 2000)
                              }}
                              className="px-2.5 py-1 text-[10px] font-bold text-white rounded-md bg-[#1e1e32] hover:bg-[#6366f1] transition-all"
                            >
                              {copiedKey === item.id ? '✓ Copied!' : 'Copy'}
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 🔄 SELF-SERVICE DIGITAL ITEM RECOVERY UTILITY */}
            <div className="p-5 rounded-2xl border border-[#1e1e32] space-y-3" style={{ background: '#131320' }}>
              <div className="flex items-center gap-2">
                <span>🔄</span>
                <h4 className="text-xs font-bold text-white">Self-Service Digital File Recovery Tool</h4>
              </div>
              <p className="text-[11px] text-gray-400">
                Already paid previously? Enter your <strong>Order Ref (e.g. FZ-XXXXXX)</strong> or <strong>M-Pesa / Paystack code</strong> to re-access your download links instantly:
              </p>
              <div className="flex gap-2">
                <input
                  value={recoveryQuery}
                  onChange={e => { setRecoveryQuery(e.target.value); setRecoveryError('') }}
                  placeholder="e.g. FZ-ABC123 or M-Pesa Code"
                  className={`flex-1 ${inputCls} text-xs py-2`}
                  style={inputStyle}
                />
                <button
                  type="button"
                  onClick={handleExecuteRecovery}
                  disabled={isSearchingRecovery || !recoveryQuery.trim()}
                  className="px-4 py-2 text-xs font-bold text-white rounded-xl hover:opacity-90 disabled:opacity-40"
                  style={{ background: '#6366f1' }}
                >
                  {isSearchingRecovery ? 'Searching...' : 'Retrieve →'}
                </button>
              </div>
              {recoveryError && <p className="text-[10px] text-red-400 font-bold">{recoveryError}</p>}
              {recoveryOrder && (
                <div className="p-3 rounded-lg border border-emerald-500/40 text-xs text-emerald-300 space-y-1" style={{ background: 'rgba(34,197,94,0.1)' }}>
                  <p className="font-bold">✅ Order Verified: {recoveryOrder.id}</p>
                  <p className="text-gray-300">Items: {recoveryOrder.items}</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ══ ACTIVE CHECKOUT FORM ══════════════════════════════════════════ */}
        {(step === 'contact' || step === 'shipping' || step === 'payment') && (
          <div className="grid lg:grid-cols-3 gap-8">
            {/* Left 2 Cols: Step Form Fields */}
            <div className="lg:col-span-2 space-y-6">

              {/* ── STEP 1: CONTACT & DELIVERY MATRIX (Physical / Mixed) ── */}
              {!isAllDigital && step !== 'payment' && (
                <div className="p-6 rounded-2xl border border-[#1e1e32] space-y-5" style={{ background: '#131320' }}>
                  <div className="flex items-center justify-between">
                    <h2 className="text-2xl font-black text-white" style={{ fontFamily: 'Big Shoulders Display' }}>
                      📦 1. Delivery & Customer Details
                    </h2>
                    <span className="text-xs text-emerald-400 font-bold">{isKenya ? '🇰🇪 Kenya Store' : '🌐 International Store'}</span>
                  </div>

                  {/* Customer Authentication / Contact */}
                  <div className="space-y-3">
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Contact Information</p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[10px] font-bold text-gray-400 mb-1">Full Name (First & Last Name) *</label>
                        <input
                          value={shipping.name}
                          onChange={e => setShipping(s => ({ ...s, name: e.target.value }))}
                          placeholder="e.g. John Kamau"
                          className={inputCls}
                          style={inputStyle}
                        />
                        {shipping.name && !isNameValid && (
                          <p className="text-[10px] text-amber-400 mt-1">Please enter both first and last name.</p>
                        )}
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-gray-400 mb-1">Email Address (Order Receipt & Updates) *</label>
                        <input
                          type="email"
                          value={shipping.email}
                          onChange={e => setShipping(s => ({ ...s, email: e.target.value }))}
                          placeholder="john@example.com"
                          className={inputCls}
                          style={inputStyle}
                        />
                      </div>
                      <div className="md:col-span-2">
                        <label className="block text-[10px] font-bold text-gray-400 mb-1">Phone Number (For Courier SMS & Dispatch) *</label>
                        <div className="flex gap-2">
                          <span className="px-3 py-3 rounded-xl border border-[#1e1e32] text-sm text-gray-300 font-mono flex items-center shrink-0" style={{ background: '#0c0c14' }}>
                            {COUNTRIES.find(c => c.name === shipping.country)?.dial || '+254'}
                          </span>
                          <input
                            type="tel"
                            value={shipping.phone}
                            onChange={e => setShipping(s => ({ ...s, phone: e.target.value }))}
                            placeholder={isKenya ? '712 345 678' : 'Phone Number'}
                            className={inputCls}
                            style={inputStyle}
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Fulfillment Method Toggle */}
                  <div className="pt-3 border-t border-[#1e1e32]">
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Fulfillment Method</p>
                    <div className="grid grid-cols-2 gap-3">
                      <button
                        type="button"
                        onClick={() => setDeliveryMethod('home')}
                        className="p-3.5 rounded-xl border text-left transition-all"
                        style={{
                          background: deliveryMethod === 'home' ? 'rgba(0,179,65,0.12)' : '#0c0c14',
                          borderColor: deliveryMethod === 'home' ? '#00b341' : '#1e1e32',
                        }}
                      >
                        <p className="text-sm font-black text-white flex items-center gap-1.5">
                          <span>🚚</span>
                          <span>Home / Office Delivery</span>
                        </p>
                        <p className="text-[10px] text-gray-400 mt-0.5">Doorstep delivery via tracked courier</p>
                      </button>

                      <button
                        type="button"
                        onClick={() => setDeliveryMethod('pickup')}
                        className="p-3.5 rounded-xl border text-left transition-all"
                        style={{
                          background: deliveryMethod === 'pickup' ? 'rgba(0,179,65,0.12)' : '#0c0c14',
                          borderColor: deliveryMethod === 'pickup' ? '#00b341' : '#1e1e32',
                        }}
                      >
                        <p className="text-sm font-black text-white flex items-center gap-1.5">
                          <span>🏪</span>
                          <span>In-Store Hub Pickup</span>
                        </p>
                        <p className="text-[10px] text-emerald-400 mt-0.5">Free next-day collection</p>
                      </button>
                    </div>
                  </div>

                  {/* Pickup Hub Selection */}
                  {deliveryMethod === 'pickup' && (
                    <div className="space-y-3 p-4 rounded-xl border border-[#00b341]/30" style={{ background: 'rgba(0,179,65,0.06)' }}>
                      <label className="block text-xs font-bold text-white mb-1">Select Pickup Location:</label>
                      <select
                        value={selectedPickupHub}
                        onChange={e => setSelectedPickupHub(e.target.value)}
                        className={inputCls}
                        style={inputStyle}
                      >
                        {PICKUP_HUBS.map(hub => (
                          <option key={hub.id} value={hub.id}>{hub.name} ({hub.hours})</option>
                        ))}
                      </select>
                    </div>
                  )}

                  {/* Granular Home Delivery Address Fields */}
                  {deliveryMethod === 'home' && (
                    <div className="space-y-3 pt-2">
                      <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Shipping Destination</p>
                      
                      {/* Country Selector */}
                      <div>
                        <label className="block text-[10px] font-bold text-gray-400 mb-1">Country / Territory *</label>
                        <select
                          value={shipping.country}
                          onChange={e => setShipping(s => ({ ...s, country: e.target.value }))}
                          className={inputCls}
                          style={inputStyle}
                        >
                          {COUNTRIES.map(c => (
                            <option key={c.code} value={c.name}>{c.flag} {c.name}</option>
                          ))}
                        </select>
                      </div>

                      {/* Street Address Line 1 */}
                      <div>
                        <label className="block text-[10px] font-bold text-gray-400 mb-1">Street Address / Road Name *</label>
                        <input
                          value={shipping.address1}
                          onChange={e => setShipping(s => ({ ...s, address1: e.target.value }))}
                          placeholder="e.g. Kimathi Street / Estate Road"
                          className={inputCls}
                          style={inputStyle}
                        />
                      </div>

                      {/* Apartment / Building */}
                      <div>
                        <label className="block text-[10px] font-bold text-gray-400 mb-1">Apartment, Suite, Unit, Building (Optional)</label>
                        <input
                          value={shipping.address2}
                          onChange={e => setShipping(s => ({ ...s, address2: e.target.value }))}
                          placeholder="e.g. Crimson Suites, 3rd Floor, Apt 4B"
                          className={inputCls}
                          style={inputStyle}
                        />
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        {/* City / Town with predictive chips */}
                        <div className="relative">
                          <label className="block text-[10px] font-bold text-gray-400 mb-1">City / Town *</label>
                          <input
                            value={shipping.city}
                            onChange={e => setShipping(s => ({ ...s, city: e.target.value }))}
                            placeholder="e.g. Nairobi"
                            className={inputCls}
                            style={inputStyle}
                          />
                          {citySuggestions.length > 0 && (
                            <div className="absolute z-10 top-full left-0 right-0 mt-1 p-1 rounded-lg border border-[#1e1e32] shadow-xl space-y-1" style={{ background: '#131320' }}>
                              {citySuggestions.slice(0, 3).map(sug => (
                                <button
                                  key={sug}
                                  type="button"
                                  onClick={() => setShipping(s => ({ ...s, city: sug }))}
                                  className="w-full text-left px-2.5 py-1 text-xs text-gray-300 hover:text-white hover:bg-white/10 rounded"
                                >
                                  {sug}
                                </button>
                              ))}
                            </div>
                          )}
                        </div>

                        {/* County / State / Region */}
                        <div>
                          <label className="block text-[10px] font-bold text-gray-400 mb-1">
                            {isKenya ? 'County *' : shipping.country === 'United States' ? 'State *' : 'State / Province / Region *'}
                          </label>
                          {isKenya ? (
                            <select
                              value={shipping.region}
                              onChange={e => setShipping(s => ({ ...s, region: e.target.value }))}
                              className={inputCls}
                              style={inputStyle}
                            >
                              {KENYA_COUNTIES.map(c => <option key={c} value={c}>{c}</option>)}
                            </select>
                          ) : shipping.country === 'United States' ? (
                            <select
                              value={shipping.region}
                              onChange={e => setShipping(s => ({ ...s, region: e.target.value }))}
                              className={inputCls}
                              style={inputStyle}
                            >
                              {US_STATES.map(st => <option key={st} value={st}>{st}</option>)}
                            </select>
                          ) : (
                            <input
                              value={shipping.region}
                              onChange={e => setShipping(s => ({ ...s, region: e.target.value }))}
                              placeholder="Region"
                              className={inputCls}
                              style={inputStyle}
                            />
                          )}
                        </div>

                        {/* Postal Code */}
                        <div>
                          <label className="block text-[10px] font-bold text-gray-400 mb-1">Postal / ZIP Code</label>
                          <input
                            value={shipping.postal}
                            onChange={e => setShipping(s => ({ ...s, postal: e.target.value }))}
                            placeholder={isKenya ? '00100' : 'ZIP Code'}
                            className={inputCls}
                            style={inputStyle}
                          />
                        </div>
                      </div>

                      {/* Carrier selection info */}
                      <div className="p-3.5 rounded-xl border border-[#1e1e32] flex items-center justify-between" style={{ background: '#0c0c14' }}>
                        <div>
                          <p className="text-xs font-black text-white flex items-center gap-1.5">
                            <span>{isKenya ? '🚚 G4S Kenya Tracked Courier' : '🚀 DHL Express Worldwide'}</span>
                          </p>
                          <p className="text-[10px] text-gray-400">
                            {isKenya ? '1–3 business days transit across Kenya' : '14–21 business days tracked air freight'}
                          </p>
                        </div>
                        <span className="text-sm font-black text-[#00b341]">
                          {shippingFee === 0 ? 'FREE' : `${currencySymbol} ${isKenya ? shippingFee : (shippingFee / KES_TO_USD_RATE).toFixed(2)}`}
                        </span>
                      </div>
                    </div>
                  )}

                  <button
                    type="button"
                    onClick={() => {
                      if (!canProceedContact) {
                        setErrorMessage('Please enter your full name, valid email, and phone number.')
                        return
                      }
                      if (deliveryMethod === 'home' && (!shipping.address1 || !shipping.city)) {
                        setErrorMessage('Please enter your street address and city.')
                        return
                      }
                      setErrorMessage('')
                      setStep('payment')
                    }}
                    className="w-full py-4 text-base font-black text-white rounded-xl transition-all hover:opacity-90 shadow-lg shadow-emerald-500/20"
                    style={{ background: '#00b341', fontFamily: 'Big Shoulders Display' }}
                  >
                    Proceed to Review & Payment →
                  </button>
                </div>
              )}

              {/* ── STEP 2: REVIEW & MAKE PAYMENT (All Cart Types) ── */}
              {(step === 'payment' || isAllDigital) && (
                <div className="p-6 rounded-2xl border border-[#1e1e32] space-y-6" style={{ background: '#131320' }}>
                  <div className="flex items-center justify-between">
                    <h2 className="text-2xl font-black text-white" style={{ fontFamily: 'Big Shoulders Display' }}>
                      💳 {isAllDigital ? 'Digital Checkout & Payment' : 'Review & Payment'}
                    </h2>
                    <span className="text-xs font-bold text-gray-400 font-mono">Ref: {orderNum}</span>
                  </div>

                  {/* Digital contact inputs if digital-only */}
                  {isAllDigital && (
                    <div className="space-y-3 p-4 rounded-xl border border-[#6366f1]/30" style={{ background: 'rgba(99,102,241,0.06)' }}>
                      <p className="text-xs font-bold text-[#a5b4fc]">Destination for Digital Files</p>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <input
                          value={shipping.name}
                          onChange={e => setShipping(s => ({ ...s, name: e.target.value }))}
                          placeholder="Your Name *"
                          className={inputCls}
                          style={inputStyle}
                        />
                        <input
                          type="email"
                          value={shipping.email}
                          onChange={e => setShipping(s => ({ ...s, email: e.target.value }))}
                          placeholder="Your Email (download links sent here) *"
                          className={inputCls}
                          style={inputStyle}
                        />
                      </div>
                    </div>
                  )}

                  {/* Tip / Support Creator */}
                  <div className="p-4 rounded-xl border border-[#1e1e32]" style={{ background: '#0c0c14' }}>
                    <h3 className="text-xs font-black text-white uppercase tracking-wider mb-1">🙏 Add a Tip to Support the Creator</h3>
                    <p className="text-[10px] text-gray-400 mb-3">Optional support for our media production and kit curation.</p>
                    <div className="flex gap-2 flex-wrap">
                      {tipOptions.map(tVal => (
                        <button
                          key={tVal}
                          type="button"
                          onClick={() => setTip(isKenya ? tVal : tVal * KES_TO_USD_RATE)}
                          className="px-4 py-2 text-xs font-bold rounded-xl border transition-all"
                          style={{
                            background: (isKenya ? tip === tVal : Math.round(tip / KES_TO_USD_RATE) === tVal) ? '#00b341' : '#131320',
                            color: (isKenya ? tip === tVal : Math.round(tip / KES_TO_USD_RATE) === tVal) ? '#fff' : '#9ca3af',
                            borderColor: (isKenya ? tip === tVal : Math.round(tip / KES_TO_USD_RATE) === tVal) ? '#00b341' : '#1e1e32',
                          }}
                        >
                          {tVal === 0 ? 'No tip' : `+${currencySymbol} ${tVal}`}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Payment Gateway Trust notice */}
                  <div className="p-4 rounded-xl border border-emerald-500/30 flex items-center gap-3" style={{ background: 'rgba(0,179,65,0.06)' }}>
                    <span className="text-2xl">🔒</span>
                    <div>
                      <p className="text-xs font-bold text-white">Instant Payment via Paystack</p>
                      <p className="text-[11px] text-gray-400">
                        {isKenya
                          ? 'Clicking below opens the secure Paystack popup. Pay via M-Pesa STK Push or Debit/Credit Card (Visa/Mastercard).'
                          : 'Clicking below opens the secure Paystack global popup for instant Card processing in USD.'}
                      </p>
                    </div>
                  </div>

                  {errorMessage && (
                    <div className="p-3 rounded-xl border border-red-500/40 text-xs text-red-300 bg-red-500/10">
                      {errorMessage}
                    </div>
                  )}

                  {/* The Primary Make Payment Action Button */}
                  <div className="flex gap-3">
                    {!isAllDigital && (
                      <button
                        type="button"
                        onClick={() => setStep('shipping')}
                        className="px-5 py-4 text-xs font-bold text-gray-400 hover:text-white rounded-xl border border-[#1e1e32]"
                      >
                        ← Edit Address
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={handleStartPayment}
                      disabled={isProcessingPayment}
                      className="flex-1 py-4 text-base font-black text-white rounded-xl transition-all disabled:opacity-40 hover:opacity-90 shadow-xl shadow-emerald-500/20 flex items-center justify-center gap-2 cursor-pointer"
                      style={{ background: '#00b341', fontFamily: 'Big Shoulders Display' }}
                    >
                      {isProcessingPayment ? (
                        <>
                          <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          <span>Opening Secure Payment...</span>
                        </>
                      ) : (
                        `Make Payment · ${currencySymbol} ${isKenya ? displayTotal.toLocaleString() : displayTotal.toFixed(2)}`
                      )}
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Right 1 Col: Persistent Sticky Order Summary */}
            <div>
              <div className="p-5 rounded-2xl border border-[#1e1e32] sticky top-8 space-y-4" style={{ background: '#131320' }}>
                <h3 className="font-black text-white text-xl" style={{ fontFamily: 'Big Shoulders Display' }}>
                  Order Summary
                </h3>

                {/* Mixed Cart Notice */}
                {hasDigitalItems && hasPhysicalItems && (
                  <div className="p-3 rounded-xl border border-[#6366f1]/40 text-xs space-y-1" style={{ background: 'rgba(99,102,241,0.08)' }}>
                    <p className="font-bold text-[#a5b4fc] flex items-center gap-1.5">
                      <span>🛍️</span>
                      <span>Mixed Order (Digital + Physical)</span>
                    </p>
                    <p className="text-[11px] text-gray-300 leading-relaxed">
                      Your digital downloads will be instantly accessible on your screen and via email confirmation immediately after payment clearance. Physical jerseys and merchandise items are processed separately for courier routing delivery dispatch.
                    </p>
                  </div>
                )}

                {/* Items List */}
                <div className="space-y-3 pb-3 border-b border-[#1e1e32] max-h-72 overflow-y-auto">
                  {(cart.length > 0 ? cart : savedCartItems).map(item => (
                    <div key={`${item.id}-${item.size}`} className="flex items-center gap-3">
                      <img src={item.image} alt={item.name} className="w-12 h-12 object-contain bg-[#0c0c14] rounded-lg p-1 shrink-0 border border-[#1e1e32]" />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-bold text-white truncate">{item.name}</p>
                        <p className="text-[10px] text-gray-400">Size: <strong className="text-white">{item.size}</strong> × {item.quantity}</p>
                      </div>
                      <p className="text-xs font-bold text-white">
                        {currencySymbol} {isKenya ? (item.price * item.quantity).toLocaleString() : ((item.price * item.quantity) / KES_TO_USD_RATE).toFixed(2)}
                      </p>
                    </div>
                  ))}
                </div>

                {/* Financial Accumulator Table */}
                <div className="space-y-2 text-xs">
                  <div className="flex justify-between text-gray-400">
                    <span>Subtotal</span>
                    <span className="text-white font-bold">
                      {currencySymbol} {isKenya ? cartTotal.toLocaleString() : (cartTotal / KES_TO_USD_RATE).toFixed(2)}
                    </span>
                  </div>
                  {!isAllDigital && (
                    <div className="flex justify-between text-gray-400">
                      <span>Shipping ({isKenya ? (deliveryMethod === 'pickup' ? 'Hub Pickup' : 'G4S Courier') : 'DHL Express'})</span>
                      <span className="text-white font-bold">
                        {shippingFee === 0 ? <span className="text-[#00b341]">FREE</span> : `${currencySymbol} ${isKenya ? shippingFee : (shippingFee / KES_TO_USD_RATE).toFixed(2)}`}
                      </span>
                    </div>
                  )}
                  {tip > 0 && (
                    <div className="flex justify-between text-gray-400">
                      <span>Creator Tip 🙏</span>
                      <span className="text-[#00b341] font-bold">
                        +{currencySymbol} {isKenya ? tip : (tip / KES_TO_USD_RATE).toFixed(2)}
                      </span>
                    </div>
                  )}
                </div>

                {/* Total */}
                <div className="flex justify-between items-center font-black text-white text-xl pt-3 border-t border-[#1e1e32]">
                  <span>Total</span>
                  <span style={{ color: '#00b341', fontFamily: 'Big Shoulders Display', fontSize: '24px' }}>
                    {currencySymbol} {isKenya ? displayTotal.toLocaleString() : displayTotal.toFixed(2)}
                  </span>
                </div>

                <p className="text-[10px] text-gray-500 text-center">
                  🔒 256-bit SSL Encrypted · Paystack Verified Gateway
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}


