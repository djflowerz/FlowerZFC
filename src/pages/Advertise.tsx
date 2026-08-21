import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useApp } from '../context/AppContext'
import AdBanner from '../components/AdBanner'
import { sendAdvertiseConfirmation, notifyAdminAdInquiry } from '../services/emailService'
import { getAdPackages, type AdPackage } from '../services/adPackageService'

const AD_PACKAGES = [
  {
    name: 'Starter',
    price: 'Custom Quote',
    period: '',
    slots: '300×250 In-Feed',
    reach: 'Targeted Local Reach',
    features: [
      '1 ad placement',
      'In-feed rectangle banner',
      'Monthly performance report',
      'Standard email support',
    ],
    popular: false,
  },
  {
    name: 'Growth',
    price: 'Custom Quote',
    period: '',
    slots: '728×90 + 300×250',
    reach: 'High Volume Reach',
    features: [
      '3 ad placements',
      'Leaderboard + Rectangle',
      'Weekly analytics dashboard',
      'Priority support',
      'Social media mention',
      'A/B creative testing',
    ],
    popular: true,
  },
  {
    name: 'Premium',
    price: 'Custom Quote',
    period: '',
    slots: 'All placements + Homepage',
    reach: 'Maximum Site Impact',
    features: [
      'All ad placements',
      'Homepage takeover option',
      'Sponsored article feature',
      'Newsletter sponsorship slot',
      'Real-time analytics dashboard',
      'Dedicated account manager',
      'Custom creative production',
    ],
    popular: false,
  },
]

const AD_SLOTS = [
  { size: '728×90', name: 'Leaderboard (Desktop)', position: 'Top of every page', rate: 'Contact for Rate Card', icon: '📐' },
  { size: '300×250', name: 'Medium Rectangle', position: 'In-feed, sidebar, in-article', rate: 'Contact for Rate Card', icon: '🟩' },
  { size: '320×50', name: 'Mobile Banner', position: 'Sticky mobile footer', rate: 'Contact for Rate Card', icon: '📱' },
  { size: '160×600', name: 'Wide Skyscraper', position: 'Sticky desktop sidebar', rate: 'Contact for Rate Card', icon: '🗼' },
  { size: '300×600', name: 'Half Page', position: 'Sidebar, major sections', rate: 'Contact for Rate Card', icon: '📄' },
  { size: 'Native', name: 'Sponsored Content Card', position: 'In-feed native ad', rate: 'Contact for Rate Card', icon: '✍️' },
]

const AUDIENCE_STATS = [
  { stat: '1.2M+', label: 'Monthly Visitors', icon: '👥' },
  { stat: '4.8M+', label: 'Monthly Page Views', icon: '📊' },
  { stat: '68%', label: 'Mobile Traffic', icon: '📱' },
  { stat: '45%', label: 'East Africa Audience', icon: '🌍' },
  { stat: '8.3 min', label: 'Avg. Session Duration', icon: '⏱️' },
  { stat: '18–34', label: 'Core Age Demographic', icon: '🎯' },
]

const FAQS = [
  { q: 'What are your payment terms?', a: '30-day invoicing available for Growth & Premium. Starter plans are billed upfront monthly. We accept M-Pesa, bank transfer, and card.' },
  { q: 'What is the minimum spend?', a: '$99/month for starter placements. There\'s no minimum contract length — cancel anytime with 30 days notice.' },
  { q: 'How quickly do ads go live?', a: 'Within 24–48 hours after creative approval. We\'ll review and confirm your ad within one business day.' },
  { q: 'Can I target specific pages or sections?', a: 'Yes. Growth and Premium packages include section-level targeting (e.g. Scores page, News, East Africa only).' },
  { q: 'Do you offer sponsored content?', a: 'Yes. Premium includes a full sponsored article written by our editorial team. Standalone sponsored posts start at $150.' },
  { q: 'Is there a media kit available?', a: 'Yes — email ads@flowerz.fc to request our full media kit with audience breakdown, rate card, and creative specs.' },
]

const inputCls = 'w-full px-4 py-3 text-sm text-white placeholder-gray-500 rounded-xl outline-none focus:ring-1 focus:ring-[#00b341] transition-all'
const inputStyle = { background: '#0c0c14', border: '1px solid #1e1e32' }

export default function Advertise() {
  const { t } = useApp()
  const [form, setForm] = useState({ name: '', company: '', email: '', phone: '', budget: '', package: '', message: '' })
  const [sent, setSent] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [openFaq, setOpenFaq] = useState<number | null>(null)

  // Load custom admin-configured packages and slots with real-time reactivity
  const [packages, setPackages] = useState<AdPackage[]>(getAdPackages)

  useEffect(() => {
    const handleUpdate = () => setPackages(getAdPackages())
    window.addEventListener('flowerzfc_ad_packages_updated', handleUpdate)
    return () => window.removeEventListener('flowerzfc_ad_packages_updated', handleUpdate)
  }, [])

  const [slots] = useState(() => {
    try {
      const raw = localStorage.getItem('flowerzfc_advertise_config')
      if (raw) {
        const parsed = JSON.parse(raw)
        if (parsed.slots?.length) return parsed.slots
      }
    } catch {}
    return AD_SLOTS
  })

  const selectPackage = (pkgName: string) => {
    setForm(f => ({ ...f, package: pkgName }))
    document.getElementById('contact-form')?.scrollIntoView({ behavior: 'smooth' })
  }

  const send = async () => {
    if (!form.name || !form.email) return
    setIsSubmitting(true)
    try {
      // 1. Send confirmation to advertiser
      sendAdvertiseConfirmation({
        to: form.email,
        name: form.name,
        company: form.company,
        packageSelected: form.package,
        budget: form.budget,
      }).catch(console.error)

      // 2. Notify Admin
      notifyAdminAdInquiry({
        name: form.name,
        email: form.email,
        phone: form.phone,
        company: form.company,
        packageSelected: form.package,
        budget: form.budget,
        message: form.message,
      }).catch(console.error)

      setSent(true)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div style={{ background: '#0a0a14', minHeight: '100vh' }}>
      {/* Hero Banner */}
      <div className="relative overflow-hidden border-b border-[#1e1e32]" style={{ background: 'linear-gradient(135deg,#0a1a14 0%,#12122a 100%)' }}>
        <img
          src="https://images.unsplash.com/photo-1474322583792-4b8df1dcc33c?w=1600&h=400&fit=crop&auto=format"
          alt="stadium crowd"
          className="absolute inset-0 w-full h-full object-cover opacity-10"
        />
        <div className="relative z-10 max-w-screen-xl mx-auto px-4 py-16 text-center">
          <span className="text-xs font-black uppercase tracking-widest text-[#00b341] block mb-3">ADVERTISE WITH US</span>
          <h1 className="text-5xl md:text-7xl font-black text-white mb-4" style={{ fontFamily: 'Big Shoulders Display' }}>
            Reach Millions of <br />
            <span style={{ color: '#00b341' }}>Football Fans</span>
          </h1>
          <p className="text-base text-gray-300 max-w-2xl mx-auto mb-10">
            Connect your brand with passionate football fans, music lovers, and culture enthusiasts across East Africa and the globe.
          </p>

          {/* Stat Chips */}
          <div className="flex flex-wrap justify-center gap-4">
            {AUDIENCE_STATS.map(s => (
              <div key={s.label} className="px-5 py-3 rounded-2xl border border-[#1e1e32] text-center" style={{ background: 'rgba(0,179,65,0.06)' }}>
                <p className="text-2xl font-black text-[#00b341]" style={{ fontFamily: 'Big Shoulders Display' }}>{s.stat}</p>
                <p className="text-[10px] text-gray-400 mt-0.5">{s.icon} {s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-screen-xl mx-auto px-4 py-10">

        {/* Advertiser Portal CTA */}
        <div className="mb-10 p-5 rounded-2xl border border-[#1e1e32] flex flex-col sm:flex-row items-center justify-between gap-4" style={{ background: '#131320' }}>
          <div>
            <p className="text-base font-black text-white">Advertiser Portal</p>
            <p className="text-xs text-gray-400">Sign in or create an account to manage your campaigns, upload creatives & view analytics.</p>
          </div>
          <div className="flex gap-2 shrink-0">
            <Link to="/login" className="px-4 py-2 text-xs font-bold text-gray-300 rounded-xl border border-[#1e1e32] hover:text-white transition-colors">{t('login')}</Link>
            <Link to="/login" className="px-4 py-2 text-xs font-bold text-white rounded-xl hover:opacity-90 transition-opacity" style={{ background: '#00b341' }}>{t('signup')}</Link>
          </div>
        </div>

        {/* Ad Placements Catalog */}
        <section className="mb-14">
          <div className="flex items-center justify-between border-b border-[#1e1e32] pb-3 mb-6">
            <h2 className="text-3xl font-black text-white uppercase tracking-wide" style={{ fontFamily: 'Big Shoulders Display' }}>
              📐 Ad Placements
            </h2>
            <span className="text-xs text-gray-500">All formats • IAB standard</span>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {slots.map((slot: any) => (
              <div
                key={slot.name}
                className="p-5 rounded-2xl border border-[#1e1e32] hover:border-[#00b341] transition-all"
                style={{ background: '#131320' }}
              >
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-black tracking-wider text-[#00b341] font-mono">{slot.size}</span>
                  <span className="text-lg">{slot.icon || '📐'}</span>
                </div>
                <h3 className="font-black text-white text-base mb-1" style={{ fontFamily: 'Big Shoulders Display' }}>{slot.name}</h3>
                <p className="text-xs text-gray-500 mb-3">{slot.position}</p>
                <div className="rounded-lg overflow-hidden border border-[#1e1e32] mb-3">
                  <AdBanner size={slot.size?.includes('728') ? 'leaderboard' : slot.size?.includes('320') ? 'mobile' : slot.size?.includes('160') ? 'skyscraper' : 'rectangle'} />
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-black text-[#00b341]" style={{ fontFamily: 'Big Shoulders Display' }}>{slot.rate}</span>
                  <button
                    onClick={() => selectPackage(slot.name)}
                    className="text-xs font-bold text-[#00b341] hover:underline"
                  >
                    Book this slot →
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Sponsorship Packages */}
        <section className="mb-14">
          <div className="flex items-center justify-between border-b border-[#1e1e32] pb-3 mb-6">
            <h2 className="text-3xl font-black text-white uppercase tracking-wide" style={{ fontFamily: 'Big Shoulders Display' }}>
              🏆 Sponsorship Packages
            </h2>
          </div>
          <div className="grid md:grid-cols-3 gap-5">
            {packages.map((pkg: any) => (
              <div
                key={pkg.name}
                className="p-6 rounded-2xl relative flex flex-col"
                style={{
                  background: pkg.popular ? 'linear-gradient(135deg,#0d1f14 0%,#131320 100%)' : '#131320',
                  border: `1px solid ${pkg.popular ? '#00b341' : '#1e1e32'}`,
                }}
              >
                {pkg.popular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <span className="text-[10px] font-black px-3 py-1 rounded-full text-white" style={{ background: '#00b341' }}>
                      MOST POPULAR
                    </span>
                  </div>
                )}

                <div className="mb-4">
                  <h3 className="text-2xl font-black text-white mb-2" style={{ fontFamily: 'Big Shoulders Display' }}>{pkg.name}</h3>
                  <div className="flex items-baseline gap-1 mb-1">
                    <span className="text-4xl font-black text-[#00b341]" style={{ fontFamily: 'Big Shoulders Display' }}>{pkg.price}</span>
                    <span className="text-sm text-gray-500">{pkg.period}</span>
                  </div>
                  <p className="text-[10px] text-gray-400 uppercase tracking-wider">{pkg.reach}</p>
                </div>

                <ul className="space-y-2 mb-6 flex-1">
                  {pkg.features.map(f => (
                    <li key={f} className="text-xs text-gray-300 flex items-start gap-2">
                      <span className="text-[#00b341] mt-0.5 shrink-0">✓</span>
                      {f}
                    </li>
                  ))}
                </ul>

                <button
                  onClick={() => selectPackage(pkg.name)}
                  className="w-full py-3 text-xs font-black rounded-xl transition-all hover:opacity-90"
                  style={
                    pkg.popular
                      ? { background: '#00b341', color: '#fff', fontFamily: 'Big Shoulders Display' }
                      : { background: '#1e1e32', color: '#fff', fontFamily: 'Big Shoulders Display' }
                  }
                >
                  Get Started with {pkg.name} →
                </button>
              </div>
            ))}
          </div>
        </section>

        {/* Audience Demographics */}
        <section className="mb-14">
          <div className="border-b border-[#1e1e32] pb-3 mb-6">
            <h2 className="text-3xl font-black text-white uppercase tracking-wide" style={{ fontFamily: 'Big Shoulders Display' }}>
              🎯 Who Sees Your Ads
            </h2>
          </div>
          <div className="grid md:grid-cols-2 gap-6">
            <div className="p-6 rounded-2xl border border-[#1e1e32]" style={{ background: '#131320' }}>
              <h3 className="text-sm font-black text-white mb-4 uppercase tracking-wider">Audience Breakdown</h3>
              {[
                { label: 'Kenya', pct: 38, color: '#00b341' },
                { label: 'Tanzania', pct: 12, color: '#3b82f6' },
                { label: 'Uganda & Rwanda', pct: 8, color: '#f59e0b' },
                { label: 'UK & Europe', pct: 22, color: '#8b5cf6' },
                { label: 'Rest of World', pct: 20, color: '#6b7280' },
              ].map(row => (
                <div key={row.label} className="mb-3">
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-gray-300">{row.label}</span>
                    <span className="font-bold text-white">{row.pct}%</span>
                  </div>
                  <div className="h-1.5 rounded-full bg-[#1e1e32] overflow-hidden">
                    <div className="h-full rounded-full" style={{ width: `${row.pct}%`, background: row.color }} />
                  </div>
                </div>
              ))}
            </div>

            <div className="p-6 rounded-2xl border border-[#1e1e32]" style={{ background: '#131320' }}>
              <h3 className="text-sm font-black text-white mb-4 uppercase tracking-wider">Visitor Interests</h3>
              <div className="flex flex-wrap gap-2">
                {['Football ⚽', 'Afrobeats 🎵', 'Premier League', 'AFCON 🏆', 'DJ Mixes 🎧', 'Fantasy Football', 'Sports Betting Analysis', 'East Africa FC', 'Transfers 💰', 'Live Scores', 'Sportswear 👕', 'Vybez'].map(tag => (
                  <span key={tag} className="text-[10px] font-bold px-2.5 py-1 rounded-full border border-[#1e1e32] text-gray-300" style={{ background: '#0d0d1e' }}>
                    {tag}
                  </span>
                ))}
              </div>

              <div className="mt-5 pt-4 border-t border-[#1e1e32] space-y-2">
                {[
                  { label: 'Male audience', val: '73%' },
                  { label: 'Age 18–34', val: '61%' },
                  { label: 'Smartphone users', val: '68%' },
                  { label: 'Return visitors', val: '54%' },
                ].map(r => (
                  <div key={r.label} className="flex justify-between text-xs">
                    <span className="text-gray-400">{r.label}</span>
                    <span className="font-black text-[#00b341]">{r.val}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* WhatsApp CTA */}
        <div className="mb-14 p-7 rounded-2xl flex flex-col md:flex-row items-center justify-between gap-5 border border-[#00b341]/40" style={{ background: 'rgba(0,179,65,0.06)' }}>
          <div>
            <h3 className="text-2xl font-black text-white mb-1" style={{ fontFamily: 'Big Shoulders Display' }}>
              💬 Prefer to Chat Directly?
            </h3>
            <p className="text-sm text-gray-400">Message us on WhatsApp — we respond quickly during business hours (EAT).</p>
          </div>
          <a
            href="https://wa.me/254789783258?text=Hi%2C%20I%27m%20interested%20in%20advertising%20on%20FlowerZFC"
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-2 px-6 py-3 text-sm font-bold text-white rounded-xl transition-all hover:opacity-90 hover:scale-105 shrink-0 shadow-lg"
            style={{ background: '#00b341' }}
          >
            💬 {t('chatOnWhatsApp')}
          </a>
        </div>

        {/* Contact / Inquiry Form */}
        <section id="contact-form" className="mb-14">
          <div className="border-b border-[#1e1e32] pb-3 mb-6">
            <h2 className="text-3xl font-black text-white uppercase tracking-wide" style={{ fontFamily: 'Big Shoulders Display' }}>
              ✉️ Send an Inquiry
            </h2>
          </div>

          {sent ? (
            <div className="text-center py-16 rounded-2xl border border-[#00b341]" style={{ background: '#131320' }}>
              <span className="text-6xl mb-4 block">✅</span>
              <h3 className="text-3xl font-black text-white mb-2" style={{ fontFamily: 'Big Shoulders Display' }}>Inquiry Received!</h3>
              <p className="text-sm text-gray-400">We'll get back to you within 24 hours at {form.email}.</p>
            </div>
          ) : (
            <div className="grid md:grid-cols-2 gap-8 p-8 rounded-2xl border border-[#1e1e32]" style={{ background: '#131320' }}>
              {/* Form */}
              <div className="space-y-4">
                {form.package && (
                  <div className="p-3 rounded-xl border border-[#00b341]/40 text-xs text-[#00b341] font-bold" style={{ background: 'rgba(0,179,65,0.08)' }}>
                    ✓ Package selected: <span className="text-white">{form.package}</span>
                    <button onClick={() => setForm(f => ({ ...f, package: '' }))} className="ml-2 text-gray-400 hover:text-white">✕</button>
                  </div>
                )}
                <div className="grid grid-cols-2 gap-3">
                  <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Your Name *" className={inputCls} style={inputStyle} />
                  <input value={form.company} onChange={e => setForm(f => ({ ...f, company: e.target.value }))} placeholder="Company / Brand" className={inputCls} style={inputStyle} />
                </div>
                <input value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} placeholder="Email Address *" type="email" className={inputCls} style={inputStyle} />
                <input value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} placeholder="Phone / WhatsApp" className={inputCls} style={inputStyle} />
                <select value={form.budget} onChange={e => setForm(f => ({ ...f, budget: e.target.value }))} className={inputCls} style={inputStyle}>
                  <option value="">Monthly Budget Range</option>
                  <option>Under KES 10,000/month</option>
                  <option>KES 10,000 – KES 50,000/month</option>
                  <option>KES 50,000 – KES 100,000/month</option>
                  <option>KES 100,000+/month</option>
                </select>
                <textarea
                  value={form.message}
                  onChange={e => setForm(f => ({ ...f, message: e.target.value }))}
                  placeholder="Tell us about your campaign goals, target audience, and any creative requirements..."
                  rows={4}
                  className={`${inputCls} resize-none`}
                  style={inputStyle}
                />
                <button
                  onClick={send}
                  disabled={!form.name || !form.email || isSubmitting}
                  className="w-full py-3.5 text-sm font-black text-white rounded-xl transition-all hover:opacity-90 disabled:opacity-40 flex items-center justify-center gap-2"
                  style={{ background: '#00b341', fontFamily: 'Big Shoulders Display', fontSize: '16px' }}
                >
                  {isSubmitting ? (
                    <>
                      <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                      <span>Sending Inquiry...</span>
                    </>
                  ) : (
                    <>{t('sendInquiry')} →</>
                  )}
                </button>
              </div>

              {/* Right side: Contact + Media Kit */}
              <div className="space-y-5">
                <div>
                  <h3 className="text-lg font-black text-white mb-3" style={{ fontFamily: 'Big Shoulders Display' }}>Direct Contact</h3>
                  <div className="space-y-2">
                    <a href="https://wa.me/254789783258" target="_blank" rel="noreferrer" className="flex items-center gap-3 p-3 rounded-xl border border-[#1e1e32] hover:border-[#00b341] transition-colors" style={{ background: '#0c0c14' }}>
                      <span className="text-xl">💬</span>
                      <div><p className="text-xs font-bold text-white">WhatsApp</p><p className="text-[10px] text-gray-500">(+254) 789 783 258</p></div>
                    </a>
                    <a href="tel:+254712293303" className="flex items-center gap-3 p-3 rounded-xl border border-[#1e1e32] hover:border-[#00b341] transition-colors" style={{ background: '#0c0c14' }}>
                      <span className="text-xl">📞</span>
                      <div><p className="text-xs font-bold text-white">Phone Support</p><p className="text-[10px] text-gray-500">(+254) 712 293 303</p></div>
                    </a>
                    <a href="mailto:support@djflowerz.co.ke" className="flex items-center gap-3 p-3 rounded-xl border border-[#1e1e32] hover:border-[#00b341] transition-colors" style={{ background: '#0c0c14' }}>
                      <span className="text-xl">✉️</span>
                      <div><p className="text-xs font-bold text-white">Email</p><p className="text-[10px] text-gray-500">support@djflowerz.co.ke</p></div>
                    </a>
                  </div>
                </div>

                {/* Media Kit */}
                <div className="p-4 rounded-xl border border-[#00b341]/30" style={{ background: 'rgba(0,179,65,0.05)' }}>
                  <h4 className="text-sm font-black text-white mb-1">📦 Download Media Kit</h4>
                  <p className="text-xs text-gray-400 mb-3">Full audience breakdown, rate card, ad specs, and case studies.</p>
                  <a
                    href="mailto:support@djflowerz.co.ke?subject=Media Kit Request"
                    className="inline-block px-4 py-2 text-xs font-bold text-white rounded-lg border border-[#00b341] hover:bg-[#00b341] transition-colors"
                  >
                    Request Media Kit →
                  </a>
                </div>

                {/* Ad Leaderboard Preview */}
                <div className="flex justify-center overflow-hidden rounded-xl">
                  <AdBanner size="leaderboard" />
                </div>
              </div>
            </div>
          )}
        </section>

        {/* FAQ Accordion */}
        <section className="mb-12">
          <div className="border-b border-[#1e1e32] pb-3 mb-6">
            <h2 className="text-3xl font-black text-white uppercase tracking-wide" style={{ fontFamily: 'Big Shoulders Display' }}>
              ❓ Frequently Asked Questions
            </h2>
          </div>
          <div className="space-y-2">
            {FAQS.map((faq, i) => (
              <div key={i} className="rounded-xl border border-[#1e1e32] overflow-hidden" style={{ background: '#131320' }}>
                <button
                  className="w-full flex items-center justify-between px-5 py-4 text-left"
                  onClick={() => setOpenFaq(openFaq === i ? null : i)}
                >
                  <span className="text-sm font-bold text-white">{faq.q}</span>
                  <span className="text-[#00b341] text-lg font-black ml-3 shrink-0 transition-transform duration-200" style={{ transform: openFaq === i ? 'rotate(45deg)' : 'none' }}>
                    +
                  </span>
                </button>
                {openFaq === i && (
                  <div className="px-5 pb-4 border-t border-[#1e1e32]">
                    <p className="text-xs text-gray-300 leading-relaxed pt-3">{faq.a}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  )
}
