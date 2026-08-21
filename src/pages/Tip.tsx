import { useState, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { useApp } from '../context/AppContext'
import { initiatePayment } from '../services/paymentService'
import { sendTipConfirmation, notifyAdminTipReceived } from '../services/emailService'

const RECIPIENTS = [
  { id: 'site',    label: 'The FlowerZFC Platform',   emoji: '🌐', desc: 'Keep the servers running & site ad-free' },
  { id: 'dj',     label: 'DJ Flowerz',                emoji: '🎧', desc: 'Support East Africa\'s Premier DJ directly' },
  { id: 'writers', label: 'Our Writers & Journalists', emoji: '✍️',  desc: 'Support match reports & transfer news' },
  { id: 'dev',    label: 'The Dev Team',               emoji: '💻', desc: 'Help us keep building new features' },
]

export function recordTipTransaction(tip: {
  from: string
  amount: number
  currency: string
  recipient: string
  method: string
  ref: string
  date?: string
}) {
  try {
    const existing = JSON.parse(localStorage.getItem('flowerzfc_tips') || '[]')
    const newTip = {
      id: `tip_${Date.now()}`,
      from: tip.from || 'Anonymous Fan',
      amount: tip.amount,
      currency: tip.currency || 'KES',
      recipient: tip.recipient || 'The FlowerZFC Platform',
      method: tip.method || 'M-Pesa / Paystack',
      date: tip.date || new Date().toLocaleString('en-KE', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }),
      ref: tip.ref,
      status: 'Paid',
    }
    const updated = [newTip, ...existing.filter((t: any) => t.ref !== tip.ref)]
    localStorage.setItem('flowerzfc_tips', JSON.stringify(updated))
    window.dispatchEvent(new Event('flowerzfc_tips_updated'))
  } catch {}
}

const inputCls = 'w-full px-4 py-3 text-sm text-white placeholder-gray-500 rounded-xl outline-none focus:ring-1 focus:ring-[#00b341] transition-all'
const inputStyle = { background: '#0c0c14', border: '1px solid #1e1e32' }

export default function Tip() {
  const { user, selectedCurrency, formatPrice } = useApp()

  const isKes = selectedCurrency === 'KES'
  const presetAmounts = useMemo(() => {
    if (selectedCurrency === 'KES') return [10, 20, 50, 100, 250, 500]
    if (selectedCurrency === 'UGX' || selectedCurrency === 'TZS') return [500, 1000, 2000, 5000, 10000, 20000]
    return [1, 2, 5, 10, 25, 50]
  }, [selectedCurrency])

  const [recipient, setRecipient] = useState('site')
  const [presetAmt, setPresetAmt] = useState<number>(() => isKes ? 50 : 5)
  const [customAmt, setCustomAmt] = useState('')
  const [message, setMessage] = useState('')
  const [anonymous, setAnonymous] = useState(false)
  const [donorEmail, setDonorEmail] = useState(user?.email || '')

  const [step, setStep] = useState<'form' | 'processing' | 'done'>('form')
  const [orderRef] = useState(`FZ-TIP-${Date.now().toString().slice(-6)}`)

  const finalAmount = customAmt !== '' ? parseFloat(customAmt) || 0 : presetAmt
  const canPay = finalAmount > 0

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!canPay) return
    setStep('processing')

    const selectedRecipientObj = RECIPIENTS.find(r => r.id === recipient)

    const res = await initiatePayment({
      amount: finalAmount,
      currency: selectedCurrency || 'KES',
      email: donorEmail || user?.email || 'supporter@flowerz.fc',
      method: 'mpesa', // Paystack popup opens and presents M-Pesa, Card, Bank channels
      reference: orderRef,
      metadata: { recipient, message, anonymous },
    })

    if (res.success) {
      const donorName = anonymous ? 'Anonymous Supporter' : (user?.name || donorEmail.split('@')[0] || 'Fan Supporter')
      const donorEmailAddr = donorEmail || user?.email || ''

      // Record tip locally and trigger system events
      recordTipTransaction({
        from: donorName,
        amount: finalAmount,
        currency: selectedCurrency,
        recipient: selectedRecipientObj?.label || 'FlowerZFC Platform',
        method: 'Paystack Verified',
        ref: orderRef,
      })

      // Send tip receipt email to donor (if email provided)
      if (donorEmailAddr) {
        sendTipConfirmation({
          to: donorEmailAddr,
          name: anonymous ? undefined : (user?.name || donorEmailAddr.split('@')[0]),
          amount: finalAmount,
          currency: selectedCurrency,
          recipient: selectedRecipientObj?.label || 'The FlowerZFC Platform',
          ref: orderRef,
          message: message || undefined,
        }).catch(() => {})
      }

      // Notify admin of new tip received
      notifyAdminTipReceived({
        from: donorName,
        fromEmail: donorEmailAddr || 'anonymous@supporter.fc',
        amount: finalAmount,
        currency: selectedCurrency,
        recipient: selectedRecipientObj?.label || 'The FlowerZFC Platform',
        ref: orderRef,
        message: message || undefined,
      }).catch(() => {})

      setStep('done')
    } else {
      setStep('form')
    }
  }

  const selectedRecipient = RECIPIENTS.find(r => r.id === recipient)!

  return (
    <div style={{ background: '#0a0a14', minHeight: '100vh' }}>
      {/* Hero */}
      <div style={{ background: 'linear-gradient(135deg, #0a1a14 0%, #0a0a14 60%)', borderBottom: '1px solid #1e1e32' }}>
        <div className="max-w-screen-xl mx-auto px-4 py-12 text-center">
          <span className="text-5xl mb-3 block">☕</span>
          <span className="text-xs font-black uppercase tracking-widest text-[#00b341] block mb-2">SUPPORT FLOWERZFC</span>
          <h1 className="text-5xl font-black text-white mb-3" style={{ fontFamily: 'Big Shoulders Display' }}>
            Send a Tip to the Team
          </h1>
          <p className="text-sm text-gray-300 max-w-lg mx-auto">
            Love what we do? Buy us a coffee ☕, support your favourite DJ, or help keep FlowerZFC running 100% free for all fans. No login required.
          </p>
        </div>
      </div>

      <div className="max-w-screen-xl mx-auto px-4 py-10">
        <div className="max-w-2xl mx-auto">

          {step === 'done' ? (
            /* Confirmation */
            <div className="text-center py-16 px-8 rounded-2xl border border-[#00b341] shadow-2xl" style={{ background: '#131320' }}>
              <div className="text-7xl mb-4 animate-bounce">🎉</div>
              <h2 className="text-4xl font-black text-white mb-2" style={{ fontFamily: 'Big Shoulders Display' }}>
                Thank You{!anonymous && user ? `, ${user.name}` : ''}!
              </h2>
              <p className="text-sm text-gray-300 mb-1">
                Your <strong className="text-[#00b341]">{formatPrice(finalAmount)}</strong> tip has been sent to <strong className="text-[#00b341]">{selectedRecipient.label}</strong> via Paystack.
              </p>
              {message && (
                <blockquote className="my-4 px-4 py-3 rounded-xl border border-[#1e1e32] text-xs text-gray-400 italic text-left" style={{ background: '#0d0d1e' }}>
                  "{message}"
                </blockquote>
              )}
              <p className="text-[10px] font-mono text-gray-500 mb-6 p-2 rounded bg-[#0d0d1e] border border-[#1e1e32] inline-block">
                REF: {orderRef}
              </p>
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <button
                  onClick={() => { setStep('form'); setCustomAmt(''); setMessage('') }}
                  className="px-6 py-3 text-xs font-bold text-white rounded-xl"
                  style={{ background: '#00b341' }}
                >
                  ☕ Send Another Tip
                </button>
                <Link to="/" className="px-6 py-3 text-xs font-bold text-gray-300 rounded-xl border border-[#1e1e32] hover:text-white transition-colors">
                  Back to Home
                </Link>
              </div>
            </div>
          ) : step === 'processing' ? (
            /* Processing Loader */
            <div className="text-center py-20">
              <div className="w-16 h-16 rounded-full border-4 border-[#00b341] border-t-transparent animate-spin mx-auto mb-6" />
              <p className="text-white font-bold text-lg">Opening Paystack Checkout...</p>
              <p className="text-gray-400 text-xs mt-1">Please complete your payment in the Paystack popup window.</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6">

              {/* Step 1: Choose Recipient */}
              <div className="p-6 rounded-2xl border border-[#1e1e32]" style={{ background: '#131320' }}>
                <h2 className="text-lg font-black text-white mb-4" style={{ fontFamily: 'Big Shoulders Display' }}>
                  1 · Who are you tipping?
                </h2>
                <div className="grid grid-cols-2 gap-3">
                  {RECIPIENTS.map(r => (
                    <button
                      key={r.id}
                      type="button"
                      onClick={() => setRecipient(r.id)}
                      className="p-4 rounded-xl border text-left transition-all"
                      style={{
                        background: recipient === r.id ? 'rgba(0,179,65,0.1)' : '#0d0d1e',
                        border: `1px solid ${recipient === r.id ? '#00b341' : '#1e1e32'}`,
                      }}
                    >
                      <span className="text-2xl block mb-1">{r.emoji}</span>
                      <span className="text-xs font-black text-white block leading-tight">{r.label}</span>
                      <span className="text-[10px] text-gray-400 leading-tight">{r.desc}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Step 2: Choose Amount */}
              <div className="p-6 rounded-2xl border border-[#1e1e32]" style={{ background: '#131320' }}>
                <h2 className="text-lg font-black text-white mb-4" style={{ fontFamily: 'Big Shoulders Display' }}>
                  2 · Choose Amount ({selectedCurrency})
                </h2>
                <div className="flex flex-wrap gap-3 mb-4">
                  {presetAmounts.map(amt => (
                    <button
                      key={amt}
                      type="button"
                      onClick={() => { setPresetAmt(amt); setCustomAmt('') }}
                      className="px-6 py-3 rounded-xl font-black text-base transition-all"
                      style={{
                        background: presetAmt === amt && customAmt === '' ? '#00b341' : '#0d0d1e',
                        color: presetAmt === amt && customAmt === '' ? '#fff' : '#9ca3af',
                        border: `1px solid ${presetAmt === amt && customAmt === '' ? '#00b341' : '#1e1e32'}`,
                        fontFamily: 'Big Shoulders Display',
                      }}
                    >
                      {formatPrice(amt)}
                    </button>
                  ))}
                  <div className="relative flex-1 min-w-[120px]">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 font-bold text-xs">{selectedCurrency}</span>
                    <input
                      value={customAmt}
                      onChange={e => { setCustomAmt(e.target.value); setPresetAmt(0) }}
                      placeholder={`Custom (${selectedCurrency})`}
                      type="number"
                      min="1"
                      className="w-full pl-14 pr-4 py-3 text-sm text-white placeholder-gray-500 rounded-xl outline-none focus:ring-1 focus:ring-[#00b341]"
                      style={inputStyle}
                    />
                  </div>
                </div>

                {finalAmount > 0 && (
                  <div className="p-3 rounded-xl text-center border border-[#00b341]/30" style={{ background: 'rgba(0,179,65,0.06)' }}>
                    <span className="text-3xl font-black text-[#00b341]" style={{ fontFamily: 'Big Shoulders Display' }}>
                      {formatPrice(finalAmount)}
                    </span>
                    <span className="text-xs text-gray-400 block mt-0.5">→ {selectedRecipient.emoji} {selectedRecipient.label}</span>
                  </div>
                )}
              </div>

              {/* Step 3: Message & Email */}
              <div className="p-6 rounded-2xl border border-[#1e1e32]" style={{ background: '#131320' }}>
                <h2 className="text-lg font-black text-white mb-1" style={{ fontFamily: 'Big Shoulders Display' }}>
                  3 · Details <span className="text-gray-500 font-normal text-sm">(optional)</span>
                </h2>
                <p className="text-xs text-gray-400 mb-4">Anyone can tip. Email is used to send your receipt.</p>
                <div className="space-y-3">
                  {!user && (
                    <input
                      type="email"
                      value={donorEmail}
                      onChange={e => setDonorEmail(e.target.value)}
                      placeholder="Your Email (for Paystack receipt)"
                      className={inputCls}
                      style={inputStyle}
                    />
                  )}
                  <textarea
                    value={message}
                    onChange={e => setMessage(e.target.value)}
                    placeholder="Love the site, keep up the great work! 🙌"
                    rows={3}
                    maxLength={200}
                    className={`${inputCls} resize-none`}
                    style={inputStyle}
                  />
                </div>
                <div className="flex justify-between text-[10px] text-gray-500 mt-2">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={anonymous}
                      onChange={e => setAnonymous(e.target.checked)}
                      className="accent-[#00b341]"
                    />
                    Tip anonymously
                  </label>
                  <span>{message.length}/200</span>
                </div>
              </div>

              {/* Submit Button launches Paystack Directly */}
              <button
                type="submit"
                disabled={!canPay}
                className="w-full py-4 text-base font-black text-white rounded-2xl shadow-2xl transition-all disabled:opacity-40 hover:opacity-90 hover:scale-[1.01]"
                style={{ background: '#00b341', fontFamily: 'Big Shoulders Display', fontSize: '18px' }}
              >
                ☕ Send {formatPrice(finalAmount)} Tip via Paystack →
              </button>

              <p className="text-center text-[10px] text-gray-600">
                Secured by Paystack • M-Pesa, Card & Bank accepted • No login required
              </p>
            </form>
          )}

          {/* Recent Tippers Wall */}
          <div className="mt-10 p-6 rounded-2xl border border-[#1e1e32]" style={{ background: '#131320' }}>
            <h3 className="text-base font-black text-white mb-4" style={{ fontFamily: 'Big Shoulders Display' }}>
              ❤️ Recent Supporters
            </h3>
            <div className="space-y-2">
              {[
                { name: 'Kamau W.',   amt: '$10', msg: 'Best football site in East Africa!', time: '2 hours ago',   emoji: '🌐' },
                { name: 'TanzaniaFan', amt: '$5', msg: 'Keep the mixes coming DJ Flowerz! 🎧', time: '5 hours ago', emoji: '🎧' },
                { name: 'Anonymous',  amt: '$25', msg: '',                                   time: '1 day ago',    emoji: '💻' },
                { name: 'GorMahia12', amt: '$2',  msg: 'Love the match reports & quiz 🏆',   time: '2 days ago',   emoji: '✍️' },
              ].map((tipper, i) => (
                <div key={i} className="flex items-start gap-3 p-3 rounded-xl border border-[#1e1e32]" style={{ background: '#0d0d1e' }}>
                  <div className="w-9 h-9 rounded-full flex items-center justify-center text-base shrink-0" style={{ background: '#1e1e32' }}>
                    {tipper.emoji}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-white">{tipper.name}</span>
                      <span className="text-xs font-black text-[#00b341]">{tipper.amt}</span>
                      <span className="text-[10px] text-gray-500 ml-auto">{tipper.time}</span>
                    </div>
                    {tipper.msg && <p className="text-[11px] text-gray-400 mt-0.5">{tipper.msg}</p>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
