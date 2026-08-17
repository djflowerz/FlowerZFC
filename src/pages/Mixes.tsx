import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useApp } from '../context/AppContext'
import AdBanner from '../components/AdBanner'
import { fetchAllTickets, fetchAllMixes } from '../services/supabaseClient'

export interface MixItem {
  id: string
  title: string
  genre: string
  plays: number
  duration: string
  cover: string
  hearthisId?: string
  streamUrl?: string
  downloadUrl?: string
  description: string
  tracklist: string[]
}

interface EventItem {
  id: string
  date: string
  name: string
  venue: string
  city: string
  poster: string
  regularPrice: number
  vipPrice: number
}

const MIXES: MixItem[] = []
const EVENTS: EventItem[] = []



export default function Mixes() {
  const { t, user } = useApp()
  const [activeEmbedMix, setActiveEmbedMix] = useState<string | null>(null)
  const [singleMixModal, setSingleMixModal] = useState<MixItem | null>(null)
  const [ticketModalEvent, setTicketModalEvent] = useState<EventItem | null>(null)
  const [ticketPayMethod, setTicketPayMethod] = useState<'mpesa' | 'card'>('mpesa')
  const [ticketMpesaPhone, setTicketMpesaPhone] = useState('')
  const [ticketCardNum, setTicketCardNum] = useState('')
  const [ticketType, setTicketType] = useState<'regular' | 'vip'>('regular')
  const [ticketQty, setTicketQty] = useState(1)
  const [ticketPurchased, setTicketPurchased] = useState(false)
  const [mixList, setMixList] = useState<MixItem[]>(MIXES)
  const [eventsList, setEventsList] = useState<EventItem[]>(EVENTS)

  useEffect(() => {
    // 0. Fetch real mixes from Supabase mixes table
    fetchAllMixes().then(({ mixes: dbMixes, error: mixError }) => {
      if (!mixError && dbMixes && dbMixes.length > 0) {
        const mappedMixes: MixItem[] = dbMixes.map(m => {
          // Extract hearthis.at numeric ID from either a clean URL or raw embed HTML
          const raw = m.mixcloud_url || ''
          const hearthisMatch = raw.match(/hearthis\.at\/embed\/(\d+)/) || raw.match(/track_(\d+)/)
          const hearthisId = hearthisMatch ? hearthisMatch[1] : undefined

          return {
            id: m.id,
            title: m.title,
            genre: m.genre || 'Afrobeats & Amapiano',
            plays: m.plays || 0,
            duration: '60 min',
            cover: m.cover_url || 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=600&h=600&fit=crop',
            hearthisId,
            streamUrl: hearthisId ? undefined : raw,
            downloadUrl: m.download_url || undefined,
            description: `Released ${m.release_date || 'recently'}`,
            tracklist: [],
          }
        })
        setMixList(mappedMixes)
      }
    })

    // 1. Fetch real events from Supabase tickets table
    fetchAllTickets().then(({ tickets: dbTickets, error }) => {
      if (!error && dbTickets && dbTickets.length > 0) {
        const mapped: EventItem[] = dbTickets.map(t => ({
          id: t.id,
          name: t.title,
          venue: t.venue,
          city: 'Nairobi, Kenya',
          date: t.event_date ? new Date(t.event_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }).toUpperCase() : 'TBD',
          poster: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=600&h=400&fit=crop&auto=format',
          regularPrice: Number(t.price) || 20,
          vipPrice: Number(t.price) * 2.5 || 50,
        }))
        setEventsList(mapped)
      }
    })
  }, [])

  const [playCounts, setPlayCounts] = useState<Record<string, number>>({})
  const [posterLight, setPosterLight] = useState<string | null>(null)
  const [bookForm, setBookForm] = useState({ name: '', event: '', venue: '', message: '' })
  const [bookSent, setBookSent] = useState(false)

  const handlePlayMix = (mix: MixItem) => {
    setSingleMixModal(mix)
    setActiveEmbedMix(mix.id)
    setPlayCounts(prev => ({
      ...prev,
      [mix.id]: (prev[mix.id] || 0) + 1,
    }))
  }

  const [ticketVerifying, setTicketVerifying] = useState(false)
  const [ticketFailed, setTicketFailed] = useState(false)
  const [ticketCountdown, setTicketCountdown] = useState(5)

  const handleBuyTickets = (event: EventItem) => {
    setTicketModalEvent(event)
    setTicketType('regular')
    setTicketQty(1)
    setTicketPayMethod('mpesa')
    setTicketMpesaPhone('')
    setTicketCardNum('')
    setTicketVerifying(false)
    setTicketFailed(false)
    setTicketPurchased(false)
  }

  const completeTicketCheckout = (e: React.FormEvent) => {
    e.preventDefault()
    setTicketVerifying(true)
    setTicketCountdown(5)

    const timer = setInterval(() => {
      setTicketCountdown(prev => {
        if (prev <= 1) {
          clearInterval(timer)
          setTicketVerifying(false)
          setTicketPurchased(true)
          return 0
        }
        return prev - 1
      })
    }, 1000)
  }

  const sendBooking = () => {
    if (bookForm.name && bookForm.event) {
      setBookSent(true)
    }
  }

  return (
    <div style={{ background: '#0a0a14', minHeight: '100vh', width: '100%' }}>
      {/* Hero Banner */}
      <div className="relative overflow-hidden mb-8 border-b border-[#1e1e32]" style={{ background: 'linear-gradient(135deg, #0a0a12 0%, #1a0a1a 100%)' }}>
        <img
          src="https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?w=1600&h=500&fit=crop&auto=format"
          alt="DJ Flowerz"
          className="absolute inset-0 w-full h-full object-cover opacity-20"
        />
        <div className="relative z-10 max-w-screen-xl mx-auto px-4 py-12 text-center">
          <span className="text-xs font-black tracking-widest text-[#00b341] uppercase block mb-2">
            BIGSTONE ENTERTAINMENT PRESENTATION
          </span>
          <h1 className="text-5xl sm:text-7xl font-black text-white mb-3" style={{ fontFamily: 'Big Shoulders Display' }}>
            DJ Flowerz
          </h1>
          <p className="text-sm text-gray-300 max-w-xl mx-auto mb-6">
            Afrobeats • Genge • Bongo • House — East Africa's Premier DJ & Football Media Entertainer.
          </p>

          <div className="flex justify-center gap-3 flex-wrap">
            <a
              href="https://mixcloud.com"
              target="_blank"
              rel="noreferrer"
              className="px-6 py-3 text-xs font-bold text-white rounded-xl shadow-lg transition-transform hover:scale-105"
              style={{ background: '#00b341' }}
            >
              🎵 Official Mixcloud Profile
            </a>
            <a
              href="https://wa.me/254700000000"
              target="_blank"
              rel="noreferrer"
              className="px-6 py-3 text-xs font-bold text-emerald-400 rounded-xl border border-emerald-500/40 bg-emerald-500/10 hover:bg-emerald-500/20 transition-all"
            >
              💬 {t('whatsappBooking')}
            </a>
          </div>
        </div>
      </div>

      <div className="max-w-screen-xl mx-auto px-4 py-8">
        {/* Leaderboard Ad */}
        <div className="mb-8 flex justify-center">
          <AdBanner size="leaderboard" />
        </div>

        {/* Rights Guard Notice */}
        <div className="mb-8 p-4 rounded-xl border border-[#00b341]/30 flex items-center justify-between gap-4 text-xs" style={{ background: 'rgba(0,179,65,0.05)' }}>
          <div className="flex items-center gap-3">
            <span className="text-xl">🛡️</span>
            <div>
              <span className="font-bold text-white block">Official Streaming Partner</span>
              <span className="text-gray-400">All mixes are streamed via Mixcloud embed under official music licensing. Direct file downloads are disabled to respect artist copyright.</span>
            </div>
          </div>
        </div>

        {/* DJ Mixes Grid */}
        <section className="mb-12">
          <div className="flex items-center justify-between border-b pb-3 mb-6" style={{ borderColor: '#1e1e32' }}>
            <h2 className="text-2xl font-black text-white uppercase tracking-wider" style={{ fontFamily: 'Big Shoulders Display' }}>
              🎧 Official Mixtapes & Playlists
            </h2>
            <span className="text-xs text-gray-500">{mixList.length} exclusive sets</span>
          </div>

          {mixList.length === 0 ? (
            <div className="text-center py-16 rounded-2xl border border-[#1e1e32]" style={{ background: '#131320' }}>
              <p className="text-4xl mb-2">🎧</p>
              <h3 className="text-xl font-black text-white mb-1" style={{ fontFamily: 'Big Shoulders Display' }}>No Mixtapes Available</h3>
              <p className="text-xs text-gray-400">Official DJ Flowerz mixtapes and playlists will be listed here.</p>
            </div>
          ) : (
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {mixList.map(mix => {
                const currentPlays = mix.plays + (playCounts[mix.id] || 0)

                return (
                  <div
                    key={mix.id}
                    className="rounded-xl overflow-hidden border border-[#1e1e32] transition-all duration-300 hover:border-[#00b341] cursor-pointer group"
                    style={{ background: '#131320' }}
                    onClick={() => handlePlayMix(mix)}
                  >
                    <div className="relative overflow-hidden" style={{ height: '200px' }}>
                      <img src={mix.cover} alt={mix.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                      <div className="absolute inset-0 flex items-center justify-center bg-black/40">
                        <div
                          className="w-14 h-14 rounded-full flex items-center justify-center shadow-2xl transition-transform group-hover:scale-110"
                          style={{ background: '#00b341' }}
                        >
                          <svg width="20" height="20" fill="white" viewBox="0 0 24 24">
                            <path d="M8 5v14l11-7z"/>
                          </svg>
                        </div>
                      </div>

                      <span className="absolute top-2 right-2 text-[10px] font-black px-2 py-0.5 rounded bg-black/80 text-white">
                        ⏱ {mix.duration}
                      </span>
                    </div>

                    <div className="p-4">
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#1e1e32] text-[#00b341] inline-block mb-2">
                        {mix.genre}
                      </span>
                      <h3 className="text-sm font-bold text-white group-hover:text-[#00b341] transition-colors line-clamp-1 mb-1">{mix.title}</h3>
                      <p className="text-xs text-gray-400 line-clamp-2 leading-relaxed mb-3">{mix.description}</p>

                      <div className="flex items-center justify-between text-xs text-gray-500 border-t border-[#1e1e32] pt-3">
                        <span>▶ {(currentPlays / 1000).toFixed(1)}K plays</span>
                        <div className="flex items-center gap-2">
                          {mix.downloadUrl && (
                            <a
                              href={mix.downloadUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              onClick={e => e.stopPropagation()}
                              className="px-2 py-1 rounded text-[10px] font-bold text-white bg-[#00b341] hover:opacity-90 transition-opacity flex items-center gap-1"
                              title="Download MP3"
                            >
                              ⬇ MP3
                            </a>
                          )}
                          <span className="text-xs font-bold text-[#00b341]">Stream →</span>
                        </div>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </section>

        {/* Upcoming Live Events */}
        <section className="mb-12">
          <div className="flex items-center justify-between border-b pb-3 mb-6" style={{ borderColor: '#1e1e32' }}>
            <h2 className="text-2xl font-black text-white uppercase tracking-wider" style={{ fontFamily: 'Big Shoulders Display' }}>
              🗓 Upcoming Bigstone Events & Shows
            </h2>
          </div>

          {eventsList.length === 0 ? (
            <div className="text-center py-12 rounded-2xl border border-[#1e1e32]" style={{ background: '#131320' }}>
              <p className="text-4xl mb-2">🗓</p>
              <h3 className="text-lg font-black text-white mb-1" style={{ fontFamily: 'Big Shoulders Display' }}>No Upcoming Events Scheduled</h3>
              <p className="text-xs text-gray-400">Check back soon for new tour dates and venue listings.</p>
            </div>
          ) : (

          <div className="grid sm:grid-cols-3 gap-6">
            {eventsList.map(ev => (
              <div
                key={ev.id}
                className="rounded-xl overflow-hidden border border-[#1e1e32] transition-all hover:border-[#00b341]"
                style={{ background: '#131320' }}
              >
                <button onClick={() => setPosterLight(ev.poster)} className="block w-full overflow-hidden" aria-label="View poster">
                  <img src={ev.poster} alt={ev.name} className="w-full h-48 object-cover hover:scale-105 transition-transform duration-500" />
                </button>
                <div className="p-5">
                  <span className="text-xs font-black text-yellow-400 uppercase tracking-widest block mb-1">{ev.date}</span>
                  <h3 className="font-black text-white text-lg leading-tight mb-1" style={{ fontFamily: 'Big Shoulders Display' }}>
                    {ev.name}
                  </h3>
                  <p className="text-xs text-gray-400 mb-4">📍 {ev.venue} • {ev.city}</p>

                  <div className="flex gap-2">
                    <button
                      onClick={() => handleBuyTickets(ev)}
                      className="flex-1 text-center py-2.5 text-xs font-bold text-white rounded-lg transition-opacity hover:opacity-80 shadow-lg"
                      style={{ background: '#00b341' }}
                    >
                      Get Tickets (${ev.regularPrice})
                    </button>
                    <button
                      onClick={() => alert(`Added ${ev.name} to your calendar reminder!`)}
                      className="px-3 py-2 text-xs font-bold rounded-lg border border-[#1e1e32] text-gray-300 hover:text-white transition-colors"
                    >
                      + Calendar
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
          )}
        </section>

        {/* Booking Inquiry Section */}
        <section className="mb-12">
          <div className="grid md:grid-cols-2 gap-8 p-8 rounded-2xl border border-[#1e1e32]" style={{ background: '#131320' }}>
            <div>
              <span className="text-xs font-black uppercase tracking-widest text-[#00b341]">DIRECT BOOKINGS</span>
              <h2 className="text-4xl font-black text-white mb-3" style={{ fontFamily: 'Big Shoulders Display' }}>
                Book DJ Flowerz Live
              </h2>
              <p className="text-xs text-gray-300 leading-relaxed mb-6">
                Available for private corporate events, sports galas, club residencies, and festivals across East Africa & abroad.
              </p>

              <div className="space-y-3 text-xs">
                <a
                  href="https://wa.me/254700000000"
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-3 p-3 rounded-lg border border-emerald-500/30 bg-emerald-500/10 text-emerald-400 font-bold hover:bg-emerald-500/20 transition-colors"
                >
                  💬 WhatsApp Direct: +254 700 000 000
                </a>
                <a
                  href="mailto:bookings@flowerz.fc"
                  className="flex items-center gap-3 p-3 rounded-lg border border-[#1e1e32] bg-[#0c0c14] text-gray-300 hover:text-white transition-colors"
                >
                  ✉️ Email Inquiry: bookings@flowerz.fc
                </a>
              </div>
            </div>

            {bookSent ? (
              <div className="flex items-center justify-center text-center p-6 rounded-xl border border-[#00b341]" style={{ background: '#0d0d1e' }}>
                <div>
                  <div className="text-5xl mb-3">✅</div>
                  <h3 className="text-2xl font-black text-white mb-1" style={{ fontFamily: 'Big Shoulders Display' }}>
                    Inquiry Received!
                  </h3>
                  <p className="text-xs text-gray-400">Our management team will get back to you within 24 hours.</p>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <input
                  value={bookForm.name}
                  onChange={e => setBookForm(f => ({ ...f, name: e.target.value }))}
                  placeholder="Your Full Name *"
                  className="w-full px-4 py-3 text-xs text-white placeholder-gray-500 rounded-xl outline-none focus:ring-1 focus:ring-[#00b341]"
                  style={{ background: '#0c0c14', border: '1px solid #1e1e32' }}
                />
                <input
                  value={bookForm.event}
                  onChange={e => setBookForm(f => ({ ...f, event: e.target.value }))}
                  placeholder="Event Date & Type *"
                  className="w-full px-4 py-3 text-xs text-white placeholder-gray-500 rounded-xl outline-none focus:ring-1 focus:ring-[#00b341]"
                  style={{ background: '#0c0c14', border: '1px solid #1e1e32' }}
                />
                <input
                  value={bookForm.venue}
                  onChange={e => setBookForm(f => ({ ...f, venue: e.target.value }))}
                  placeholder="Venue Location & City"
                  className="w-full px-4 py-3 text-xs text-white placeholder-gray-500 rounded-xl outline-none focus:ring-1 focus:ring-[#00b341]"
                  style={{ background: '#0c0c14', border: '1px solid #1e1e32' }}
                />
                <textarea
                  value={bookForm.message}
                  onChange={e => setBookForm(f => ({ ...f, message: e.target.value }))}
                  placeholder="Additional event details..."
                  rows={3}
                  className="w-full px-4 py-3 text-xs text-white placeholder-gray-500 rounded-xl outline-none focus:ring-1 focus:ring-[#00b341] resize-none"
                  style={{ background: '#0c0c14', border: '1px solid #1e1e32' }}
                />
                <button
                  onClick={sendBooking}
                  className="w-full py-3.5 text-xs font-bold text-white rounded-xl shadow-lg transition-opacity hover:opacity-90"
                  style={{ background: '#00b341' }}
                >
                  {t('sendInquiry')} →
                </button>
              </div>
            )}
          </div>
        </section>

        {/* Skyscraper & Mobile Ads Section */}
        <div className="mt-12 flex justify-center">
          <AdBanner size="skyscraper" label="Entertainment Sponsor Skyscraper" />
        </div>
      </div>

      {/* SINGLE MIX MODAL */}
      {singleMixModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.92)' }}>
          <div className="relative w-full max-w-2xl p-6 rounded-2xl border border-[#00b341] shadow-2xl overflow-hidden" style={{ background: '#131320' }}>
            <button
              onClick={() => setSingleMixModal(null)}
              className="absolute top-4 right-4 text-gray-400 hover:text-white text-2xl z-10"
            >
              ✕
            </button>

            <div className="flex flex-col sm:flex-row gap-6 mb-6">
              <img src={singleMixModal.cover} alt={singleMixModal.title} className="w-36 h-36 rounded-xl object-cover shrink-0 mx-auto sm:mx-0 shadow-xl" />
              <div>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#1e1e32] text-[#00b341] inline-block mb-2">
                  {singleMixModal.genre}
                </span>
                <h3 className="text-2xl font-black text-white mb-2 leading-tight" style={{ fontFamily: 'Big Shoulders Display' }}>
                  {singleMixModal.title}
                </h3>
                <p className="text-xs text-gray-300 leading-relaxed mb-3">{singleMixModal.description}</p>
                <div className="text-xs text-gray-400 mb-3 flex items-center justify-between">
                  <span>⏱ {singleMixModal.duration} • ▶ {(singleMixModal.plays / 1000).toFixed(1)}K plays</span>
                  {singleMixModal.downloadUrl && (
                    <a
                      href={singleMixModal.downloadUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-3 py-1.5 rounded-lg text-xs font-bold text-black bg-[#00b341] hover:opacity-90 transition-opacity flex items-center gap-1 shadow-lg"
                    >
                      ⬇ Download Direct MP3
                    </a>
                  )}
                </div>
              </div>
            </div>

            {/* Embedded Hearthis.at Player */}
            <div className="mb-6 rounded-xl overflow-hidden border border-[#1e1e32] bg-[#0c0c14]">
              <iframe
                title={singleMixModal.title}
                style={{ width: '100%', height: '130px', border: 0 }}
                src={singleMixModal.hearthisId ? `https://hearthis.at/embed/${singleMixModal.hearthisId}/transparent_black/?hcolor=00b341` : `https://hearthis.at/embed/10852924/transparent_black/?hcolor=00b341`}
                allow="autoplay"
              />
            </div>

            {/* Tracklist Breakdown */}
            <div className="border-t border-[#1e1e32] pt-4">
              <h4 className="text-xs font-black uppercase text-[#00b341] tracking-wider mb-2">
                📜 Full Tracklist Breakdown
              </h4>
              <div className="space-y-1.5 text-xs text-gray-300 max-h-36 overflow-y-auto">
                {singleMixModal.tracklist.map((track, i) => (
                  <p key={i} className="p-1.5 rounded bg-[#0d0d1e] border border-[#1e1e32]">{track}</p>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* EVENT TICKET CHECKOUT MODAL */}
      {ticketModalEvent && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.9)' }}>
          <div className="relative w-full max-w-md p-6 rounded-2xl border border-[#00b341] shadow-2xl" style={{ background: '#131320' }}>
            <button
              onClick={() => setTicketModalEvent(null)}
              className="absolute top-4 right-4 text-gray-400 hover:text-white text-xl"
            >
              ✕
            </button>

            {!user ? (
              <div className="text-center py-8 space-y-4">
                <div className="w-16 h-16 mx-auto rounded-full bg-[#00b341]/10 border-2 border-[#00b341] flex items-center justify-center text-3xl">
                  🔒
                </div>
                <div>
                  <h4 className="text-xl font-black text-white mb-1" style={{ fontFamily: 'Big Shoulders Display' }}>
                    Log In Required for Tickets
                  </h4>
                  <p className="text-xs text-gray-400">
                    Purchasing event passes requires a free FlowerZFC account so we can send digital ticket QR codes. Anyone can tip without an account.
                  </p>
                </div>
                <Link
                  to="/login?redirect=mixes"
                  className="block w-full py-3 text-xs font-bold text-white rounded-xl shadow-lg transition-all hover:opacity-90"
                  style={{ background: '#00b341' }}
                >
                  Log In / Sign Up to Buy Tickets →
                </Link>
              </div>
            ) : ticketFailed ? (
              <div className="text-center py-8 space-y-4">
                <div className="w-16 h-16 mx-auto rounded-full bg-red-500/20 border-2 border-red-500 flex items-center justify-center text-3xl">
                  ❌
                </div>
                <div>
                  <h4 className="text-xl font-black text-white mb-1" style={{ fontFamily: 'Big Shoulders Display' }}>
                    Ticket Payment Failed
                  </h4>
                  <p className="text-xs text-red-300 bg-red-500/10 p-3 rounded-xl border border-red-500/30">
                    The payment was declined or cancelled. No funds were charged to your account.
                  </p>
                </div>
                <button
                  onClick={() => { setTicketFailed(false); setTicketVerifying(false) }}
                  className="w-full py-3 text-xs font-bold text-white rounded-xl shadow-lg"
                  style={{ background: '#00b341' }}
                >
                  🔄 Try Payment Again →
                </button>
              </div>
            ) : ticketVerifying ? (
              <div className="text-center py-8 space-y-4">
                <div className="relative w-16 h-16 mx-auto flex items-center justify-center">
                  <div className="absolute inset-0 rounded-full border-4 border-[#00b341] border-t-transparent animate-spin" />
                  <span className="text-xl">{ticketPayMethod === 'mpesa' ? '📱' : '💳'}</span>
                </div>
                <div>
                  <h4 className="text-xl font-black text-white mb-1" style={{ fontFamily: 'Big Shoulders Display' }}>
                    {ticketPayMethod === 'mpesa' ? 'Waiting for M-Pesa PIN...' : 'Authorizing Card Payment...'}
                  </h4>
                  <p className="text-xs text-gray-400">
                    {ticketPayMethod === 'mpesa'
                      ? `STK Push sent to ${ticketMpesaPhone}. Please confirm on your mobile phone.`
                      : 'Connecting to bank network for ticket reservation.'}
                  </p>
                </div>
                <div className="flex items-center justify-center gap-2 text-xs text-gray-400">
                  <span className="w-2 h-2 rounded-full bg-[#00b341] animate-ping" />
                  <span>Verifying in <strong className="text-white font-mono">{ticketCountdown}s</strong>...</span>
                </div>
              </div>
            ) : !ticketPurchased ? (
              <form onSubmit={completeTicketCheckout} className="space-y-4">
                <span className="text-xs font-black uppercase text-[#00b341]">EVENT TICKETING</span>
                <h3 className="text-2xl font-black text-white leading-tight" style={{ fontFamily: 'Big Shoulders Display' }}>
                  {ticketModalEvent.name}
                </h3>
                <p className="text-xs text-gray-400">📍 {ticketModalEvent.venue} · {ticketModalEvent.date}</p>

                {/* Ticket Tier Selector */}
                <div>
                  <label className="text-xs font-bold text-gray-300 block mb-2">Select Ticket Tier</label>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setTicketType('regular')}
                      className={`p-3 rounded-xl border text-left transition-all ${
                        ticketType === 'regular' ? 'border-[#00b341] bg-[#00b341]/10 text-white' : 'border-[#1e1e32] bg-[#0d0d1e] text-gray-400'
                      }`}
                    >
                      <span className="text-xs font-bold block">Regular Pass</span>
                      <span className="text-base font-black text-[#00b341]">${ticketModalEvent.regularPrice}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setTicketType('vip')}
                      className={`p-3 rounded-xl border text-left transition-all ${
                        ticketType === 'vip' ? 'border-[#00b341] bg-[#00b341]/10 text-white' : 'border-[#1e1e32] bg-[#0d0d1e] text-gray-400'
                      }`}
                    >
                      <span className="text-xs font-bold block">VIP Lounge</span>
                      <span className="text-base font-black text-yellow-400">${ticketModalEvent.vipPrice}</span>
                    </button>
                  </div>
                </div>

                {/* Quantity */}
                <div className="flex items-center justify-between p-3 rounded-xl border border-[#1e1e32]" style={{ background: '#0d0d1e' }}>
                  <span className="text-xs font-bold text-gray-300">Ticket Quantity</span>
                  <div className="flex items-center gap-3">
                    <button type="button" onClick={() => setTicketQty(q => Math.max(1, q - 1))} className="w-7 h-7 rounded bg-[#1e1e32] text-white font-bold">-</button>
                    <span className="text-sm font-bold text-white">{ticketQty}</span>
                    <button type="button" onClick={() => setTicketQty(q => Math.min(10, q + 1))} className="w-7 h-7 rounded bg-[#1e1e32] text-white font-bold">+</button>
                  </div>
                </div>

                {/* Payment Method */}
                <div>
                  <label className="text-xs font-bold text-gray-300 block mb-2">Payment Method</label>
                  <div className="grid grid-cols-2 gap-2 mb-3">
                    <button
                      type="button"
                      onClick={() => setTicketPayMethod('mpesa')}
                      className="p-3 rounded-xl border text-left transition-all"
                      style={{
                        background: ticketPayMethod === 'mpesa' ? 'rgba(0,179,65,0.12)' : '#0d0d1e',
                        border: `1px solid ${ticketPayMethod === 'mpesa' ? '#00b341' : '#1e1e32'}`,
                      }}
                    >
                      <span className="text-xs font-black text-white block">📱 M-Pesa</span>
                      <span className="text-[10px] text-gray-400">STK Push</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setTicketPayMethod('card')}
                      className="p-3 rounded-xl border text-left transition-all"
                      style={{
                        background: ticketPayMethod === 'card' ? 'rgba(0,179,65,0.12)' : '#0d0d1e',
                        border: `1px solid ${ticketPayMethod === 'card' ? '#00b341' : '#1e1e32'}`,
                      }}
                    >
                      <span className="text-xs font-black text-white block">💳 Card</span>
                      <span className="text-[10px] text-gray-400">Visa / Mastercard</span>
                    </button>
                  </div>

                  {ticketPayMethod === 'mpesa' && (
                    <div>
                      <div className="p-3 rounded-xl border border-[#00b341]/30 mb-2" style={{ background: 'rgba(0,179,65,0.06)' }}>
                        <p className="text-[10px] text-gray-400">Enter your number below. An STK push will be sent — enter your M-Pesa PIN on your phone to confirm.</p>
                      </div>
                      <input
                        value={ticketMpesaPhone}
                        onChange={e => setTicketMpesaPhone(e.target.value)}
                        placeholder="+254 7XX XXX XXX"
                        className="w-full px-4 py-3 text-xs text-white placeholder-gray-500 rounded-xl outline-none focus:ring-1 focus:ring-[#00b341]"
                        style={{ background: '#0c0c14', border: '1px solid #1e1e32' }}
                      />
                    </div>
                  )}
                  {ticketPayMethod === 'card' && (
                    <input
                      value={ticketCardNum}
                      onChange={e => setTicketCardNum(e.target.value)}
                      placeholder="Card Number (1234 5678 9012 3456)"
                      maxLength={19}
                      className="w-full px-4 py-3 text-xs text-white placeholder-gray-500 rounded-xl outline-none focus:ring-1 focus:ring-[#00b341]"
                      style={{ background: '#0c0c14', border: '1px solid #1e1e32' }}
                    />
                  )}
                </div>

                {/* Total */}
                <div className="flex justify-between items-center pt-2 border-t border-[#1e1e32]">
                  <span className="text-xs font-bold text-gray-400">Total</span>
                  <span className="text-2xl font-black" style={{ fontFamily: 'Big Shoulders Display', color: '#00b341' }}>
                    ${(ticketType === 'regular' ? ticketModalEvent.regularPrice : ticketModalEvent.vipPrice) * ticketQty}
                  </span>
                </div>

                <button
                  type="submit"
                  disabled={ticketPayMethod === 'mpesa' ? ticketMpesaPhone.length < 9 : ticketCardNum.length < 16}
                  className="w-full py-3.5 text-xs font-bold text-white rounded-xl shadow-lg transition-opacity hover:opacity-90 disabled:opacity-40"
                  style={{ background: '#00b341' }}
                >
                  {ticketPayMethod === 'mpesa' ? '📱 Send M-Pesa STK Push →' : '💳 Pay with Card →'}
                </button>
              </form>
            ) : (
              <div className="text-center py-6">
                <span className="text-5xl mb-3 block">🎟️</span>
                <h3 className="text-2xl font-black text-white mb-1" style={{ fontFamily: 'Big Shoulders Display' }}>
                  Tickets Confirmed!
                </h3>
                <p className="text-xs text-gray-300 mb-4">
                  Reserved {ticketQty}x {ticketType.toUpperCase()} ticket(s) for {ticketModalEvent.name}.
                </p>
                <p className="text-[10px] text-gray-500 font-mono bg-[#0d0d1e] p-2 rounded mb-6 border border-[#1e1e32]">
                  ORDER REF: FZ-TCK-{Date.now().toString().slice(-6)}
                </p>
                <button
                  onClick={() => setTicketModalEvent(null)}
                  className="px-6 py-2.5 text-xs font-bold text-white rounded-xl"
                  style={{ background: '#00b341' }}
                >
                  Close Window
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Poster Lightbox */}
      {posterLight && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.95)' }}
          onClick={() => setPosterLight(null)}
        >
          <img src={posterLight} alt="Event poster" className="max-w-full max-h-full rounded-xl object-contain shadow-2xl" />
          <button className="absolute top-4 right-4 text-white text-3xl" onClick={() => setPosterLight(null)}>
            ✕
          </button>
        </div>
      )}
    </div>
  )
}
