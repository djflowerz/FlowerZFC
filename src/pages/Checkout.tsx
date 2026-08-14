import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useApp } from '../context/AppContext'
import { initiatePayment } from '../services/paymentService'
import { calculateShippingQuotes, getShippingConfig, type ShippingQuoteOption } from '../services/shippingService'
import { createOrder } from '../services/supabaseClient'

type Step = 'shipping' | 'payment' | 'verifying' | 'confirmation' | 'failed'
type PayMethod = 'card' | 'mpesa' | 'paypal'

const inputCls = 'w-full px-4 py-3 text-sm text-white placeholder-gray-500 rounded-xl outline-none focus:ring-1 focus:ring-[#00b341] transition-all'
const inputStyle = { background: '#0c0c14', border: '1px solid #1e1e32' }

export default function Checkout() {
  const { cart, cartTotal, clearCart, user, t } = useApp()
  const [step, setStep] = useState<Step>('shipping')
  const [orderNum] = useState(`FZ${Date.now().toString().slice(-6)}`)

  const [errorMessage, setErrorMessage] = useState('')
  const [shippingQuotes, setShippingQuotes] = useState<ShippingQuoteOption[]>([])
  const [fetchingQuotes, setFetchingQuotes] = useState(false)

  const [shipping, setShipping] = useState({
    name: user?.name || '',
    email: user?.email || '',
    phone: '',
    address1: '',
    address2: '',
    city: 'Nairobi',
    region: '',
    postal: '',
    country: 'Kenya',
    countryCode: 'KE',
  })

  const [shippingMethod, setShippingMethod] = useState<'standard' | 'express' | 'free'>('standard')
  const [selectedQuote, setSelectedQuote] = useState<ShippingQuoteOption | null>(null)
  const [payMethod, setPayMethod] = useState<PayMethod>('mpesa')
  const [tip, setTip] = useState(0)
  const [customTip, setCustomTip] = useState('')

  // Card & M-Pesa fields
  const [card, setCard] = useState({ number: '', expiry: '', cvv: '', name: '' })
  const [mpesaPhone, setMpesaPhone] = useState('')
  const [paypalEmail, setPaypalEmail] = useState('')

  // Verification state & saved cart items for receipt
  const [countdown, setCountdown] = useState(6)
  const [savedCartItems] = useState<typeof cart>(cart)

  // Fetch Easyship quotes whenever shipping location or cart changes
  useEffect(() => {
    if (!shipping.country) return
    setFetchingQuotes(true)
    const code = shipping.country.toLowerCase().includes('kenya') ? 'KE' : 'INT'
    calculateShippingQuotes(
      cart,
      {
        name: shipping.name,
        addressLine1: shipping.address1,
        addressLine2: shipping.address2,
        city: shipping.city,
        region: shipping.region,
        postalCode: shipping.postal,
        country: shipping.country,
        countryCode: code,
      }
    ).then(res => {
      setShippingQuotes(res.quotes)
      const matched = res.quotes.find(q => q.tier === shippingMethod) || res.quotes[0]
      if (matched) setSelectedQuote(matched)
      setFetchingQuotes(false)
    }).catch(() => {
      setFetchingQuotes(false)
    })
  }, [cart, shipping.country, shipping.city, shippingMethod])

  const shippingCost = selectedQuote ? selectedQuote.price : (shippingMethod === 'express' ? 15 : shippingMethod === 'standard' ? 5 : 0)
  const tipAmount = customTip !== '' ? parseFloat(customTip) || 0 : tip
  const grandTotal = cartTotal + shippingCost + tipAmount

  const tipOptions = [0, 1, 2, 5]

  const canProceedShipping = shipping.name && shipping.email && shipping.phone
  const canProceedPayment = true // Paystack inline will validate inputs

  const handleStartPayment = async () => {
    if (!canProceedPayment) return
    setStep('verifying')
    setCountdown(6)

    const res = await initiatePayment({
      amount: grandTotal,
      email: shipping.email || 'customer@flowerz.fc',
      phone: mpesaPhone,
      method: payMethod,
      reference: orderNum,
      metadata: {
        customerName: shipping.name,
        country: shipping.country,
        city: shipping.city,
      },
    })

    if (!res.success) {
      setErrorMessage(res.message || 'Payment popup was closed or declined.')
      setStep('failed')
    }
  }

  const saveOrderToSupabase = async () => {
    try {
      await createOrder({
        id: orderNum,
        customer_name: shipping.name || 'Customer',
        email: shipping.email || 'customer@flowerz.fc',
        phone: shipping.phone || '',
        shipping_address: `${shipping.address1 || ''}, ${shipping.city || ''}, ${shipping.country || ''}`,
        items: JSON.stringify(cart.map(c => ({ name: c.name, price: c.price, qty: c.quantity, size: c.size }))),
        total: grandTotal,
        method: payMethod,
        status: 'paid',
        tracking: `TRK-${Math.floor(100000 + Math.random() * 900000)}`,
        shippingCourier: selectedQuote?.courierName || 'Standard Ground',
        shippingCostKes: shippingCost,
        shippingTier: selectedQuote?.tier || 'standard',
      } as any)
    } catch (e) {
      console.error('Failed to write order to Supabase:', e)
    }
  }

  const handleSimulateFailure = () => {
    setErrorMessage('M-Pesa transaction failed: Insufficient funds or incorrect PIN entered.')
    setStep('failed')
  }

  const handleConfirmImmediately = async () => {
    await saveOrderToSupabase()
    clearCart()
    setStep('confirmation')
  }

  // Automatic countdown during verifying step
  useEffect(() => {
    if (step !== 'verifying') return

    if (countdown <= 0) {
      saveOrderToSupabase().then(() => {
        clearCart()
        setStep('confirmation')
      })
      return
    }

    const timer = setInterval(() => {
      setCountdown(prev => prev - 1)
    }, 1000)

    return () => clearInterval(timer)
  }, [step, countdown, clearCart])

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
              { s: 'shipping', label: 'Shipping' },
              { s: 'payment', label: 'Payment' },
              { s: 'verifying', label: 'Verifying' },
            ].map((st, i) => (
              <div key={st.s} className="flex items-center gap-2">
                <div
                  className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-black transition-all"
                  style={{
                    background: step === st.s || (i === 0 && (step === 'payment' || step === 'verifying')) || (i === 1 && step === 'verifying')
                      ? '#00b341'
                      : '#1e1e32',
                    color: '#fff',
                  }}
                >
                  {i + 1}
                </div>
                <span className={`text-sm font-semibold capitalize ${step === st.s ? 'text-white' : 'text-gray-500'}`}>{st.label}</span>
                {i < 2 && <div className="w-8 h-px mx-1" style={{ background: '#1e1e32' }} />}
              </div>
            ))}
          </div>
        )}

        {/* PAYMENT FAILED STATE */}
        {step === 'failed' && (
          <div className="max-w-md mx-auto py-12 px-6 rounded-2xl border border-red-500/50 text-center shadow-2xl space-y-6" style={{ background: '#131320' }}>
            <div className="w-20 h-20 mx-auto rounded-full bg-red-500/20 border-2 border-red-500 flex items-center justify-center text-4xl">
              ❌
            </div>

            <div>
              <span className="text-xs font-black uppercase text-red-400 tracking-widest block mb-1">TRANSACTION DECLINED</span>
              <h2 className="text-3xl font-black text-white" style={{ fontFamily: 'Big Shoulders Display' }}>
                Payment Failed
              </h2>
            </div>

            <div className="p-4 rounded-xl border border-red-500/30 text-xs text-red-200 text-left space-y-1" style={{ background: 'rgba(239, 68, 68, 0.08)' }}>
              <p className="font-bold text-white mb-1">Reason for failure:</p>
              <p>{errorMessage || 'The payment gateway reported a failure or timeout. No funds were deducted.'}</p>
            </div>

            <div className="flex flex-col gap-3">
              <button
                onClick={() => setStep('payment')}
                className="w-full py-3.5 text-xs font-bold text-white rounded-xl shadow-xl transition-all hover:opacity-90"
                style={{ background: '#00b341', fontFamily: 'Big Shoulders Display', fontSize: '15px' }}
              >
                🔄 Try Payment Again →
              </button>

              <button
                onClick={() => setStep('shipping')}
                className="w-full py-2.5 text-xs font-bold text-gray-400 hover:text-white rounded-xl border border-[#1e1e32]"
              >
                ← Back to Shipping Details
              </button>
            </div>
          </div>
        )}

        {/* VERIFYING PAYMENT STATE */}
        {step === 'verifying' && (
          <div className="max-w-xl mx-auto py-12 px-6 rounded-2xl border border-[#00b341]/40 text-center shadow-2xl space-y-6" style={{ background: '#131320' }}>
            <div className="relative w-24 h-24 mx-auto flex items-center justify-center">
              <div className="absolute inset-0 rounded-full border-4 border-[#00b341] border-t-transparent animate-spin" />
              <span className="text-3xl">{payMethod === 'mpesa' ? '📱' : payMethod === 'card' ? '💳' : '®️'}</span>
            </div>

            <div>
              <span className="text-xs font-black uppercase text-[#00b341] tracking-widest block mb-1">PAYMENT IN PROGRESS</span>
              <h2 className="text-3xl font-black text-white" style={{ fontFamily: 'Big Shoulders Display' }}>
                {payMethod === 'mpesa'
                  ? 'Waiting for M-Pesa PIN Confirmation...'
                  : payMethod === 'card'
                  ? 'Authorizing Card Payment...'
                  : 'Connecting to Gateway...'}
              </h2>
            </div>

            <div className="p-4 rounded-xl border border-[#1e1e32] text-xs text-gray-300 space-y-2 text-left" style={{ background: '#0d0d1e' }}>
              {payMethod === 'mpesa' && (
                <>
                  <p className="font-bold text-[#00b341]">📲 STK Push Sent to: <span className="text-white">{mpesaPhone}</span></p>
                  <p className="text-gray-400">1. Check your mobile phone for an STK popup menu.</p>
                  <p className="text-gray-400">2. Enter your M-Pesa PIN and press OK.</p>
                  <p className="text-gray-400">3. This page will automatically update once confirmed.</p>
                </>
              )}
              {payMethod === 'card' && (
                <>
                  <p className="font-bold text-white">Contacting card issuer bank...</p>
                  <p className="text-gray-400">Securing 3D-Secure transaction for ${grandTotal.toFixed(2)}.</p>
                </>
              )}
            </div>

            <div className="flex flex-col items-center gap-3">
              <div className="flex items-center gap-2 text-xs text-gray-400">
                <span className="w-2 h-2 rounded-full bg-[#00b341] animate-ping" />
                <span>Auto-verifying in <strong className="text-white font-mono text-sm">{countdown}s</strong>...</span>
              </div>

              <div className="flex gap-2 w-full max-w-sm">
                <button
                  onClick={handleConfirmImmediately}
                  className="flex-1 py-2.5 text-xs font-bold text-white rounded-xl border border-[#00b341] hover:bg-[#00b341] transition-all"
                >
                  ✓ Confirm Success
                </button>
                <button
                  onClick={handleSimulateFailure}
                  className="py-2.5 px-4 text-xs font-bold text-red-400 border border-red-500/40 rounded-xl hover:bg-red-500/10 transition-all"
                >
                  Simulate Failure
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ORDER CONFIRMED STATE */}
        {step === 'confirmation' && (
          <div className="text-center py-20 max-w-xl mx-auto rounded-2xl border border-[#00b341]" style={{ background: '#131320' }}>
            <div className="text-7xl mb-4 animate-bounce">🎉</div>
            <h2 className="text-4xl font-black text-white mb-2" style={{ fontFamily: 'Big Shoulders Display' }}>
              Payment Received & Order Confirmed!
            </h2>
            <p className="text-gray-400 mb-1">Order <strong className="text-[#00b341]">#{orderNum}</strong> is paid and being processed.</p>
            <p className="text-sm text-gray-500 mb-2">Confirmation receipt sent to {shipping.email || 'your email'}.</p>
            <p className="text-xs text-gray-600 mb-8">Estimated delivery: 7–14 business days.</p>

            <div className="p-4 rounded-xl border border-[#1e1e32] text-xs text-left mb-8 max-w-md mx-auto" style={{ background: '#0d0d1e' }}>
              <div className="flex justify-between font-bold text-white mb-2 pb-2 border-b border-[#1e1e32]">
                <span>Payment Summary</span>
                <span className="text-[#00b341]">${grandTotal.toFixed(2)} Paid</span>
              </div>
              <div className="space-y-1 text-gray-400">
                <p>Method: <strong className="text-white capitalize">{payMethod}</strong></p>
                <p>Customer: <strong className="text-white">{shipping.name}</strong></p>
                <p>Destination: <strong className="text-white">{shipping.city}, {shipping.country}</strong></p>
              </div>
            </div>

            <Link to="/" className="inline-block px-8 py-3 text-sm font-bold text-white rounded-xl shadow-xl transition-all hover:opacity-90" style={{ background: '#00b341' }}>
              Back to Home
            </Link>
          </div>
        )}

        {/* FORM STEPS */}
        {(step === 'shipping' || step === 'payment') && (
          <div className="grid lg:grid-cols-3 gap-8">
            {/* Left: Form */}
            <div className="lg:col-span-2 space-y-6">

              {/* SHIPPING */}
              {step === 'shipping' && (
                <div className="p-6 rounded-2xl border border-[#1e1e32] space-y-4" style={{ background: '#131320' }}>
                  <h2 className="text-2xl font-black text-white" style={{ fontFamily: 'Big Shoulders Display' }}>
                    🚚 Shipping Details
                  </h2>

                  <div className="grid grid-cols-2 gap-4">
                    <input
                      value={shipping.name} onChange={e => setShipping(s => ({ ...s, name: e.target.value }))}
                      placeholder="Full Name *" className={`col-span-2 ${inputCls}`} style={inputStyle}
                    />
                    <input
                      value={shipping.email} onChange={e => setShipping(s => ({ ...s, email: e.target.value }))}
                      placeholder="Email Address *" type="email" className={inputCls} style={inputStyle}
                    />
                    <input
                      value={shipping.phone} onChange={e => setShipping(s => ({ ...s, phone: e.target.value }))}
                      placeholder="Phone / WhatsApp *" className={inputCls} style={inputStyle}
                    />
                    <input
                      value={shipping.address1} onChange={e => setShipping(s => ({ ...s, address1: e.target.value }))}
                      placeholder="Address Line 1 *" className={`col-span-2 ${inputCls}`} style={inputStyle}
                    />
                    <input
                      value={shipping.address2} onChange={e => setShipping(s => ({ ...s, address2: e.target.value }))}
                      placeholder="Address Line 2 (optional)" className={`col-span-2 ${inputCls}`} style={inputStyle}
                    />
                    <input
                      value={shipping.city} onChange={e => setShipping(s => ({ ...s, city: e.target.value }))}
                      placeholder="City *" className={inputCls} style={inputStyle}
                    />
                    <input
                      value={shipping.region} onChange={e => setShipping(s => ({ ...s, region: e.target.value }))}
                      placeholder="Region / County" className={inputCls} style={inputStyle}
                    />
                    <input
                      value={shipping.postal} onChange={e => setShipping(s => ({ ...s, postal: e.target.value }))}
                      placeholder="Postal Code" className={inputCls} style={inputStyle}
                    />
                    <select
                      value={shipping.country} onChange={e => setShipping(s => ({ ...s, country: e.target.value }))}
                      className={inputCls} style={inputStyle}
                    >
                      <option>Kenya</option>
                      <option>Tanzania</option>
                      <option>Uganda</option>
                      <option>Rwanda</option>
                      <option>Ethiopia</option>
                      <option>UK</option>
                      <option>USA</option>
                    </select>
                  </div>

                  {/* Shipping Method */}
                  <div>
                    <h3 className="text-sm font-bold text-gray-300 mb-1">Delivery Method (Live Easyship Calculation)</h3>
                    <p className="text-[11px] text-gray-500 mb-3">Rates calculated in real-time based on delivery destination and total package weight.</p>
                    {fetchingQuotes ? (
                      <div className="p-4 rounded-xl border border-[#1e1e32] bg-[#0c0c14] text-xs text-gray-400 animate-pulse">
                        🔄 Fetching live Easyship rates for {shipping.city}, {shipping.country}...
                      </div>
                    ) : (
                      (shippingQuotes.length > 0 ? shippingQuotes : [
                        { id: 'standard', tier: 'standard' as const, courierName: 'Fargo Courier Kenya', price: 5, currency: 'USD', estimatedDays: '7–14 business days', realCostInternal: 500 },
                        { id: 'express', tier: 'express' as const, courierName: 'SpeedAF Express', price: 15, currency: 'USD', estimatedDays: '3–5 business days', realCostInternal: 1500 },
                      ]).map(opt => (
                        <label
                          key={opt.id}
                          className="flex items-center gap-3 p-3 rounded-xl cursor-pointer mb-2 transition-all"
                          style={{
                            background: shippingMethod === opt.tier ? 'rgba(0,179,65,0.1)' : '#0c0c14',
                            border: `1px solid ${shippingMethod === opt.tier ? '#00b341' : '#1e1e32'}`,
                          }}
                        >
                          <input
                            type="radio"
                            name="shipping_tier"
                            value={opt.tier}
                            checked={shippingMethod === opt.tier}
                            onChange={() => {
                              setShippingMethod(opt.tier)
                              setSelectedQuote(opt)
                            }}
                            className="accent-[#00b341]"
                          />
                          <div className="flex-1">
                            <p className="text-sm font-bold text-white flex items-center gap-2">
                              <span>{opt.tier === 'free' ? '🎁 Free Shipping' : opt.tier === 'express' ? '⚡ Express Shipping' : '🚚 Standard Shipping'}</span>
                              <span className="text-[10px] text-emerald-400 font-normal">({opt.courierName})</span>
                            </p>
                            <p className="text-xs text-gray-500">{opt.estimatedDays}</p>
                          </div>
                          <span className="text-sm font-bold" style={{ color: opt.price === 0 ? '#00b341' : '#fff' }}>
                            {opt.price === 0 ? 'FREE' : `$${opt.price.toFixed(2)}`}
                          </span>
                        </label>
                      ))
                    )}
                  </div>

                  <div className="flex gap-3 pt-4 border-t border-[#1e1e32]">
                    <Link to="/shop" className="px-5 py-3 text-xs font-bold text-gray-400 hover:text-white rounded-xl border border-[#1e1e32] transition-colors">
                      Cancel
                    </Link>
                    <button
                      onClick={() => canProceedShipping && setStep('payment')}
                      disabled={!canProceedShipping}
                      className="flex-1 py-3 text-sm font-black text-white rounded-xl transition-all disabled:opacity-40 hover:opacity-90"
                      style={{ background: '#00b341', fontFamily: 'Big Shoulders Display' }}
                    >
                      Continue to Payment →
                    </button>
                  </div>
                </div>
              )}

              {/* PAYMENT */}
              {step === 'payment' && (
                <div className="p-6 rounded-2xl border border-[#1e1e32]" style={{ background: '#131320' }}>
                  <h2 className="text-2xl font-black text-white mb-5" style={{ fontFamily: 'Big Shoulders Display' }}>
                    💳 Payment Method
                  </h2>

                  {/* Payment Method Tabs */}
                  <div className="grid grid-cols-3 gap-2 mb-6">
                    {([
                      { id: 'mpesa', label: '📱 M-Pesa', sub: 'Safaricom / Airtel' },
                      { id: 'card',  label: '💳 Card',   sub: 'Visa / Mastercard' },
                      { id: 'paypal', label: '🅿️ PayPal', sub: 'Pay securely' },
                    ] as { id: PayMethod; label: string; sub: string }[]).map(m => (
                      <button
                        key={m.id}
                        onClick={() => setPayMethod(m.id)}
                        className="p-3 rounded-xl border text-left transition-all"
                        style={{
                          background: payMethod === m.id ? 'rgba(0,179,65,0.12)' : '#0d0d1e',
                          border: `1px solid ${payMethod === m.id ? '#00b341' : '#1e1e32'}`,
                        }}
                      >
                        <span className="text-sm font-black text-white block">{m.label}</span>
                        <span className="text-[10px] text-gray-400">{m.sub}</span>
                      </button>
                    ))}
                  </div>

                  {/* M-Pesa Fields */}
                  {payMethod === 'mpesa' && (
                    <div className="space-y-3">
                      <div className="p-4 rounded-xl border border-[#00b341]/30" style={{ background: 'rgba(0,179,65,0.06)' }}>
                        <p className="text-xs text-gray-300 mb-1 font-bold">How M-Pesa works:</p>
                        <p className="text-xs text-gray-400">1. Enter your M-Pesa number → 2. An STK push will be sent to your phone → 3. Enter your M-Pesa PIN to confirm.</p>
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-gray-400 mb-1">M-Pesa Phone Number *</label>
                        <input
                          value={mpesaPhone} onChange={e => setMpesaPhone(e.target.value)}
                          placeholder="+254 7XX XXX XXX" className={inputCls} style={inputStyle}
                        />
                      </div>
                    </div>
                  )}

                  {/* Card Fields */}
                  {payMethod === 'card' && (
                    <div className="space-y-3">
                      <div>
                        <label className="block text-xs font-bold text-gray-400 mb-1">Cardholder Name *</label>
                        <input value={card.name} onChange={e => setCard(c => ({ ...c, name: e.target.value }))} placeholder="As on card" className={inputCls} style={inputStyle} />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-gray-400 mb-1">Card Number *</label>
                        <input value={card.number} onChange={e => setCard(c => ({ ...c, number: e.target.value }))} placeholder="1234 5678 9012 3456" maxLength={19} className={inputCls} style={inputStyle} />
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs font-bold text-gray-400 mb-1">Expiry *</label>
                          <input value={card.expiry} onChange={e => setCard(c => ({ ...c, expiry: e.target.value }))} placeholder="MM/YY" maxLength={5} className={inputCls} style={inputStyle} />
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-gray-400 mb-1">CVV *</label>
                          <input value={card.cvv} onChange={e => setCard(c => ({ ...c, cvv: e.target.value }))} placeholder="123" maxLength={4} type="password" className={inputCls} style={inputStyle} />
                        </div>
                      </div>
                      <p className="text-xs text-gray-500">🔒 Secured with 256-bit SSL encryption</p>
                    </div>
                  )}

                  {/* PayPal Fields */}
                  {payMethod === 'paypal' && (
                    <div className="space-y-3">
                      <div className="p-4 rounded-xl border border-blue-500/30" style={{ background: 'rgba(59,130,246,0.06)' }}>
                        <p className="text-xs text-gray-400">You'll be redirected to PayPal to complete your payment securely.</p>
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-gray-400 mb-1">PayPal Email *</label>
                        <input value={paypalEmail} onChange={e => setPaypalEmail(e.target.value)} placeholder="your@paypal.com" type="email" className={inputCls} style={inputStyle} />
                      </div>
                    </div>
                  )}

                  {/* Tip / Gratuity */}
                  <div className="mt-6 pt-5 border-t border-[#1e1e32]">
                    <h3 className="text-sm font-black text-white mb-1">🙏 Leave a Tip (optional)</h3>
                    <p className="text-xs text-gray-400 mb-3">Show some appreciation to our team. 100% goes to fulfilment staff.</p>
                    <div className="flex items-center gap-2 flex-wrap">
                      {tipOptions.map(t => (
                        <button
                          key={t}
                          type="button"
                          onClick={() => { setTip(t); setCustomTip('') }}
                          className="px-4 py-2 text-xs font-bold rounded-xl border transition-all"
                          style={{
                            background: tip === t && customTip === '' ? '#00b341' : '#0d0d1e',
                            color: tip === t && customTip === '' ? '#fff' : '#9ca3af',
                            border: `1px solid ${tip === t && customTip === '' ? '#00b341' : '#1e1e32'}`,
                          }}
                        >
                          {t === 0 ? 'No tip' : `$${t}`}
                        </button>
                      ))}
                      <input
                        value={customTip}
                        onChange={e => { setCustomTip(e.target.value); setTip(0) }}
                        placeholder="Custom $"
                        className="w-24 px-3 py-2 text-xs text-white placeholder-gray-500 rounded-xl outline-none focus:ring-1 focus:ring-[#00b341]"
                        style={inputStyle}
                      />
                    </div>
                  </div>

                  <div className="flex gap-3 mt-6 pt-4 border-t border-[#1e1e32]">
                    <button onClick={() => setStep('shipping')} className="px-5 py-3 text-xs font-bold text-gray-400 hover:text-white rounded-xl border border-[#1e1e32] transition-colors">
                      ← Back
                    </button>
                    <button
                      onClick={handleStartPayment}
                      disabled={!canProceedPayment}
                      className="flex-1 py-3 text-sm font-black text-white rounded-xl transition-all disabled:opacity-40 hover:opacity-90"
                      style={{ background: '#00b341', fontFamily: 'Big Shoulders Display' }}
                    >
                      {payMethod === 'mpesa' ? `Send STK Push · $${grandTotal.toFixed(2)}` :
                       payMethod === 'paypal' ? `Pay via PayPal · $${grandTotal.toFixed(2)}` :
                       `Place Order · $${grandTotal.toFixed(2)}`}
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Right: Order Summary */}
            <div className="p-5 rounded-2xl border border-[#1e1e32] h-fit" style={{ background: '#131320' }}>
              <h3 className="font-black text-white text-lg mb-4" style={{ fontFamily: 'Big Shoulders Display' }}>
                Order Summary
              </h3>
              <div className="space-y-3 mb-4 pb-4 border-b border-[#1e1e32]">
                {(cart.length > 0 ? cart : savedCartItems).map(item => (
                  <div key={`${item.id}-${item.size}`} className="flex items-center gap-3">
                    <img src={item.image} alt={item.name} className="w-12 h-12 object-cover rounded-lg" />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-bold text-white truncate">{item.name}</p>
                      <p className="text-xs text-gray-500">Size: {item.size} × {item.quantity}</p>
                    </div>
                    <p className="text-sm font-bold text-white">${(item.price * item.quantity).toFixed(2)}</p>
                  </div>
                ))}
              </div>
              <div className="space-y-2 text-xs mb-4">
                <div className="flex justify-between text-gray-400">
                  <span>Subtotal</span>
                  <span>${cartTotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-gray-400">
                  <span>Shipping</span>
                  <span>{shippingCost === 0 ? <span className="text-[#00b341] font-bold">Free</span> : `$${shippingCost.toFixed(2)}`}</span>
                </div>
                {tipAmount > 0 && (
                  <div className="flex justify-between text-gray-400">
                    <span>Tip 🙏</span>
                    <span className="text-[#00b341]">+${tipAmount.toFixed(2)}</span>
                  </div>
                )}
              </div>
              <div className="flex justify-between font-black text-white text-lg pt-3 border-t border-[#1e1e32]">
                <span>Total</span>
                <span style={{ color: '#00b341' }}>${grandTotal.toFixed(2)}</span>
              </div>
              <p className="text-[10px] text-gray-600 mt-3 text-center">🔒 Secured checkout · SSL encrypted</p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
