import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useApp } from '../context/AppContext'
import AdBanner from '../components/AdBanner'
import { initiatePayment } from '../services/paymentService'

interface MatchTip {
  id: string
  match: string
  league: string
  date: string
  homeForm: string[]
  awayForm: string[]
  probHome: number
  probDraw: number
  probAway: number
  keyInsight: string
  editorPick: string
  analyst: string
}

const TIPS_LIST: MatchTip[] = []

type PayMethod = 'mpesa' | 'card' | 'paypal'

export default function Tips() {
  const { t, user } = useApp()

  // Tip Analyst Modal state
  const [activeAnalystTip, setActiveAnalystTip] = useState<{ match: string; analyst: string } | null>(null)
  const [tipAmount, setTipAmount] = useState(5)
  const [customTip, setCustomTip] = useState('')
  const [payMethod, setPayMethod] = useState<PayMethod>('mpesa')
  const [phone, setPhone] = useState('')
  const [cardNum, setCardNum] = useState('')
  const [verifying, setVerifying] = useState(false)
  const [countdown, setCountdown] = useState(5)
  const [success, setSuccess] = useState(false)

  const finalTipAmount = customTip !== '' ? parseFloat(customTip) || 0 : tipAmount

  const handleSendAnalystTip = async (e: React.FormEvent) => {
    e.preventDefault()
    if (finalTipAmount <= 0) return
    setVerifying(true)
    setCountdown(5)

    const ref = `FZ-ANALYST-${Date.now().toString().slice(-6)}`

    await initiatePayment({
      amount: finalTipAmount,
      email: user?.email || 'supporter@flowerz.fc',
      phone: phone,
      method: payMethod,
      reference: ref,
      metadata: { analyst: activeAnalystTip?.analyst, match: activeAnalystTip?.match },
    })

    const timer = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          clearInterval(timer)
          setVerifying(false)
          setSuccess(true)
          return 0
        }
        return prev - 1
      })
    }, 1000)
  }

  const closeTipModal = () => {
    setActiveAnalystTip(null)
    setVerifying(false)
    setSuccess(false)
    setPhone('')
    setCardNum('')
  }

  return (
    <div style={{ background: '#0a0a14', minHeight: '100vh', width: '100%' }}>
      {/* Header */}
      <div style={{ background: 'linear-gradient(135deg,#12122a 0%,#0a1a14 100%)', borderBottom: '1px solid #1e1e32' }}>
        <div className="max-w-screen-xl mx-auto px-4 py-8">
          <span className="text-xs font-black uppercase tracking-widest text-[#00b341]">STATISTICAL PREVIEWS</span>
          <h1 className="text-4xl font-black text-white" style={{ fontFamily: 'Big Shoulders Display' }}>
            Match Analytics & Tactical Previews
          </h1>
          <p className="text-xs text-gray-400 mt-1">
            Data-driven match insights & form probabilities based on historical H2H and tactical analysis.
          </p>
        </div>
      </div>

      <div className="max-w-screen-xl mx-auto px-4 py-8">
        {/* Leaderboard Ad */}
        <div className="mb-8 flex justify-center">
          <AdBanner size="leaderboard" />
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Main Previews List */}
          <div className="lg:col-span-2 space-y-6">
            <div className="flex items-center justify-between border-b pb-2" style={{ borderColor: '#1e1e32' }}>
              <h2 className="text-lg font-black text-white uppercase tracking-wider" style={{ fontFamily: 'Big Shoulders Display' }}>
                Featured Previews
              </h2>
              <span className="text-xs text-gray-500">{TIPS_LIST.length} matches</span>
            </div>

            <div className="space-y-4">
              {TIPS_LIST.map(tip => (
                <div key={tip.id} className="p-6 rounded-2xl border border-[#1e1e32]" style={{ background: '#131320' }}>
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-black text-[#00b341] uppercase tracking-wider">{tip.league}</span>
                    <span className="text-xs text-gray-500">{tip.date}</span>
                  </div>

                  <h3 className="text-2xl font-black text-white mb-2" style={{ fontFamily: 'Big Shoulders Display' }}>
                    {tip.match}
                  </h3>
                  <p className="text-xs text-gray-400 mb-4">Analysis by <strong className="text-white">{tip.analyst}</strong></p>

                  {/* Form Probability Meter */}
                  <div className="mb-4">
                    <div className="flex justify-between text-xs text-gray-400 mb-1">
                      <span>Home ({tip.probHome}%)</span>
                      <span>Draw ({tip.probDraw}%)</span>
                      <span>Away ({tip.probAway}%)</span>
                    </div>
                    <div className="h-2 w-full rounded-full overflow-hidden flex" style={{ background: '#1a1a28' }}>
                      <div style={{ width: `${tip.probHome}%` }} className="bg-[#00b341]" />
                      <div style={{ width: `${tip.probDraw}%` }} className="bg-yellow-500" />
                      <div style={{ width: `${tip.probAway}%` }} className="bg-blue-500" />
                    </div>
                  </div>

                  <p className="text-xs text-gray-300 leading-relaxed mb-4">{tip.keyInsight}</p>

                  <div className="p-3 rounded-xl border border-[#00b341]/40 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-4" style={{ background: 'rgba(0,179,65,0.08)' }}>
                    <div>
                      <span className="text-[10px] text-gray-400 font-bold uppercase block">EDITOR'S TACTICAL VERDICT</span>
                      <span className="text-xs font-black text-[#00b341]">{tip.editorPick}</span>
                    </div>
                    <button
                      onClick={() => setActiveAnalystTip({ match: tip.match, analyst: tip.analyst })}
                      className="px-3.5 py-1.5 text-xs font-bold text-white rounded-lg transition-all hover:opacity-90 shrink-0"
                      style={{ background: '#00b341' }}
                    >
                      ☕ Tip {tip.analyst}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            <div className="sticky top-20 space-y-6">
              {/* Disclaimer Card */}
              <div className="p-5 rounded-2xl border border-[#1e1e32]" style={{ background: '#131320' }}>
                <span className="text-xl mb-2 block">ℹ️</span>
                <h4 className="font-black text-white text-base mb-1" style={{ fontFamily: 'Big Shoulders Display' }}>
                  Educational Analytics
                </h4>
                <p className="text-xs text-gray-400 leading-relaxed mb-4">
                  All match statistics and probabilities are provided strictly for sports commentary and data analysis. Zero gambling content permitted.
                </p>
                <Link
                  to="/tip"
                  className="block text-center py-2.5 text-xs font-bold text-white rounded-xl transition-all hover:opacity-90"
                  style={{ background: '#00b341' }}
                >
                  ☕ Tip the Platform / Team →
                </Link>
              </div>

              {/* Sidebar Ad */}
              <AdBanner size="rectangle" label="Analytics Sponsor" />
            </div>
          </div>
        </div>
      </div>

      {/* TIP ANALYST MODAL */}
      {activeAnalystTip && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="relative w-full max-w-md p-6 rounded-2xl border border-[#00b341] shadow-2xl space-y-4" style={{ background: '#131320' }}>
            <button onClick={closeTipModal} className="absolute top-4 right-4 text-gray-400 hover:text-white text-xl">✕</button>

            {success ? (
              <div className="text-center py-6">
                <span className="text-5xl mb-3 block">☕</span>
                <h3 className="text-2xl font-black text-white mb-1" style={{ fontFamily: 'Big Shoulders Display' }}>
                  Tip Sent to {activeAnalystTip.analyst}!
                </h3>
                <p className="text-xs text-gray-300 mb-4">
                  Thank you for supporting quality sports journalism on FlowerZFC.
                </p>
                <button onClick={closeTipModal} className="px-6 py-2 text-xs font-bold text-white rounded-xl" style={{ background: '#00b341' }}>
                  Close
                </button>
              </div>
            ) : verifying ? (
              <div className="text-center py-8 space-y-4">
                <div className="relative w-16 h-16 mx-auto flex items-center justify-center">
                  <div className="absolute inset-0 rounded-full border-4 border-[#00b341] border-t-transparent animate-spin" />
                  <span className="text-xl">☕</span>
                </div>
                <div>
                  <h4 className="text-xl font-black text-white mb-1" style={{ fontFamily: 'Big Shoulders Display' }}>
                    {payMethod === 'mpesa' ? 'Waiting for M-Pesa PIN...' : 'Processing Card Payment...'}
                  </h4>
                  <p className="text-xs text-gray-400">
                    {payMethod === 'mpesa' ? `STK Push sent to ${phone}. Enter PIN on your mobile device.` : 'Securing payment with bank.'}
                  </p>
                </div>
                <div className="flex items-center justify-center gap-2 text-xs text-gray-400">
                  <span className="w-2 h-2 rounded-full bg-[#00b341] animate-ping" />
                  <span>Verifying in <strong className="text-white font-mono">{countdown}s</strong>...</span>
                </div>
              </div>
            ) : (
              <form onSubmit={handleSendAnalystTip} className="space-y-4">
                <span className="text-xs font-black uppercase text-[#00b341]">SUPPORT OUR ANALYSTS</span>
                <h3 className="text-2xl font-black text-white" style={{ fontFamily: 'Big Shoulders Display' }}>
                  Tip {activeAnalystTip.analyst}
                </h3>
                <p className="text-xs text-gray-400">For analysis on {activeAnalystTip.match}</p>

                {/* Amount Selector */}
                <div className="flex gap-2">
                  {[2, 5, 10].map(amt => (
                    <button
                      key={amt}
                      type="button"
                      onClick={() => { setTipAmount(amt); setCustomTip('') }}
                      className="flex-1 py-2 text-xs font-bold rounded-xl border transition-all"
                      style={{
                        background: tipAmount === amt && customTip === '' ? '#00b341' : '#0d0d1e',
                        color: tipAmount === amt && customTip === '' ? '#fff' : '#9ca3af',
                        border: `1px solid ${tipAmount === amt && customTip === '' ? '#00b341' : '#1e1e32'}`,
                      }}
                    >
                      ${amt}
                    </button>
                  ))}
                  <input
                    value={customTip}
                    onChange={e => { setCustomTip(e.target.value); setTipAmount(0) }}
                    placeholder="Custom $"
                    className="w-24 px-3 py-2 text-xs text-white placeholder-gray-500 rounded-xl outline-none focus:ring-1 focus:ring-[#00b341]"
                    style={{ background: '#0c0c14', border: '1px solid #1e1e32' }}
                  />
                </div>

                {/* Payment Method */}
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setPayMethod('mpesa')}
                    className="p-3 rounded-xl border text-left"
                    style={{
                      background: payMethod === 'mpesa' ? 'rgba(0,179,65,0.12)' : '#0d0d1e',
                      border: `1px solid ${payMethod === 'mpesa' ? '#00b341' : '#1e1e32'}`,
                    }}
                  >
                    <span className="text-xs font-black text-white block">📱 M-Pesa</span>
                    <span className="text-[10px] text-gray-400">STK Push</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setPayMethod('card')}
                    className="p-3 rounded-xl border text-left"
                    style={{
                      background: payMethod === 'card' ? 'rgba(0,179,65,0.12)' : '#0d0d1e',
                      border: `1px solid ${payMethod === 'card' ? '#00b341' : '#1e1e32'}`,
                    }}
                  >
                    <span className="text-xs font-black text-white block">💳 Card</span>
                    <span className="text-[10px] text-gray-400">Visa / Mastercard</span>
                  </button>
                </div>

                {payMethod === 'mpesa' ? (
                  <input
                    value={phone}
                    onChange={e => setPhone(e.target.value)}
                    placeholder="M-Pesa Phone Number (+254 7XX XXX XXX)"
                    className="w-full px-4 py-3 text-xs text-white placeholder-gray-500 rounded-xl outline-none focus:ring-1 focus:ring-[#00b341]"
                    style={{ background: '#0c0c14', border: '1px solid #1e1e32' }}
                  />
                ) : (
                  <input
                    value={cardNum}
                    onChange={e => setCardNum(e.target.value)}
                    placeholder="Card Number (1234 5678 9012 3456)"
                    className="w-full px-4 py-3 text-xs text-white placeholder-gray-500 rounded-xl outline-none focus:ring-1 focus:ring-[#00b341]"
                    style={{ background: '#0c0c14', border: '1px solid #1e1e32' }}
                  />
                )}

                <button
                  type="submit"
                  disabled={finalTipAmount <= 0}
                  className="w-full py-3.5 text-xs font-bold text-white rounded-xl shadow-lg transition-all hover:opacity-90 disabled:opacity-40"
                  style={{ background: '#00b341' }}
                >
                  ☕ Send ${finalTipAmount.toFixed(2)} Tip via {payMethod.toUpperCase()} →
                </button>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
