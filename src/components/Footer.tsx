import { Link } from 'react-router-dom'
import { useApp, type Lang } from '../context/AppContext'
import { useState } from 'react'
import { subscribeEmail } from '../services/newsletterService'
import { toast } from 'react-toastify'

const LANGS: { code: Lang; flag: string; label: string }[] = [
  { code: 'en', flag: '🇬🇧', label: 'EN' },
  { code: 'sw', flag: '🇰🇪', label: 'SW' },
  { code: 'fr', flag: '🇫🇷', label: 'FR' },
  { code: 'es', flag: '🇪🇸', label: 'ES' },
  { code: 'pt', flag: '🇧🇷', label: 'PT' },
  { code: 'ar', flag: '🇸🇦', label: 'AR' },
]

export default function Footer() {
  const { t, lang, setLang } = useApp()
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubscribe = async (e?: React.FormEvent) => {
    if (e) e.preventDefault()
    const clean = email.trim()
    if (!clean || !clean.includes('@')) {
      toast.warning('Please enter a valid email address.')
      return
    }
    setLoading(true)
    try {
      const res = subscribeEmail(clean, '', 'Footer')
      if (res.success) {
        setSubscribed(true)
        toast.success(res.message)
        setEmail('')
      } else {
        toast.error(res.message)
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <footer className="border-t mt-16" style={{ background: '#0a0a12', borderColor: '#1e1e32' }}>
      <div className="max-w-screen-xl mx-auto px-4 py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-8 mb-10">
          {/* Brand */}
          <div className="lg:col-span-2">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-xl">⚽</span>
              <span className="font-black text-xl text-white tracking-wider" style={{ fontFamily: 'Big Shoulders Display' }}>FLOWERZFC</span>
            </div>
            <p className="text-xs text-gray-500 mb-4 max-w-sm leading-relaxed">
              Global football media platform delivering real-time telemetry, exclusive breaking news, dynamic match commentary, and football mixes.
            </p>
            <div className="flex gap-4 text-gray-400 mb-6">
              <a href="https://twitter.com" target="_blank" rel="noreferrer" className="hover:text-emerald-400 transition-colors p-1" aria-label="Twitter">
                <svg width="18" height="18" fill="currentColor" viewBox="0 0 24 24"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
              </a>
              <a href="https://instagram.com" target="_blank" rel="noreferrer" className="hover:text-emerald-400 transition-colors p-1" aria-label="Instagram">
                <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><rect width="20" height="20" x="2" y="2" rx="5" ry="5"/><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/><line x1="17.5" x2="17.51" y1="6.5" y2="6.5"/></svg>
              </a>
              <a href="https://youtube.com" target="_blank" rel="noreferrer" className="hover:text-emerald-400 transition-colors p-1" aria-label="YouTube">
                <svg width="18" height="18" fill="currentColor" viewBox="0 0 24 24"><path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/></svg>
              </a>
              <a href="https://wa.me/254789783258" target="_blank" rel="noreferrer" className="hover:text-emerald-400 transition-colors p-1" aria-label="WhatsApp">
                <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/></svg>
              </a>
            </div>

            {/* Newsletter */}
            <form onSubmit={handleSubscribe} className="flex gap-2">
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder={t('newsletterPlaceholder')}
                className="flex-1 px-3 py-2 text-sm rounded text-white placeholder:text-gray-600 outline-none focus:ring-1 focus:ring-emerald-500"
                style={{ background: '#131320', border: '1px solid #1e1e32' }}
              />
              <button
                type="submit"
                className="px-4 py-2 text-sm font-bold text-white rounded transition-colors hover:opacity-80 shrink-0 cursor-pointer"
                style={{ background: '#00b341' }}
              >
                {subscribed ? '✓ Subscribed' : t('subscribe')}
              </button>
            </form>
          </div>

          {/* Sections */}
          <div>
            <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-4">Sections</h4>
            <div className="space-y-2">
              {[
                { to: '/scores', label: t('scores') },
                { to: '/fixtures', label: t('fixtures') },
                { to: '/standings', label: t('standings') },
                { to: '/transfers', label: t('transfers') },
                { to: '/videos', label: t('videos') },
                { to: '/shop', label: t('shop') },
                { to: '/mixes', label: t('mixes') },
              ].map(l => (
                <Link key={l.to} to={l.to} className="block text-sm text-gray-500 hover:text-emerald-400 transition-colors">{l.label}</Link>
              ))}
            </div>
          </div>

          {/* Company */}
          <div>
            <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-4">Company</h4>
            <div className="space-y-2">
              <Link to="/about" className="block text-sm text-gray-500 hover:text-white transition-colors">{t('about')}</Link>
              <Link to="/contact" className="block text-sm text-gray-500 hover:text-white transition-colors">{t('contact')}</Link>
              <Link to="/advertise" className="block text-sm font-bold hover:text-[#00b341] transition-colors text-[#00b341]">{t('advertiseWithUs')}</Link>
              <Link to="/tip" className="flex items-center gap-1.5 text-sm font-bold text-yellow-400 hover:text-yellow-300 transition-colors">
                ☕ Support Us / Tip the Team
              </Link>
              <a href="https://wa.me/254700000000" target="_blank" rel="noreferrer" className="flex items-center gap-1 text-sm text-gray-400 hover:text-[#00b341] transition-colors">
                <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/></svg>
                {t('chatOnWhatsApp')}
              </a>
            </div>
          </div>

          {/* Legal */}
          <div>
            <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-4">Legal</h4>
            <div className="space-y-2">
              <Link to="/privacy" className="block text-sm text-gray-500 hover:text-white transition-colors">Privacy Policy</Link>
              <Link to="/terms" className="block text-sm text-gray-500 hover:text-white transition-colors">Terms of Service</Link>
              <Link to="/cookies" className="block text-sm text-gray-500 hover:text-white transition-colors">Cookie Policy</Link>
              <Link to="/dmca" className="block text-sm text-gray-500 hover:text-white transition-colors">DMCA</Link>
            </div>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-6 border-t" style={{ borderColor: '#1e1e32' }}>
          <p className="text-xs text-gray-500">{t('copyright')}</p>
          {/* Language switcher */}
          <div className="flex gap-2 flex-wrap justify-center">
            {LANGS.map(l => (
              <button
                key={l.code}
                onClick={() => setLang(l.code)}
                className={`text-xs px-2 py-1 rounded transition-colors ${lang === l.code ? 'text-emerald-400 font-bold' : 'text-gray-500 hover:text-gray-300'}`}
                style={lang === l.code ? { background: '#1e1e32' } : {}}
              >
                {l.flag} {l.label}
              </button>
            ))}
          </div>
        </div>
      </div>
    </footer>
  )
}
