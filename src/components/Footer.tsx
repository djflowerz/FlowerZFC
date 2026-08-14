import { Link } from 'react-router-dom'
import { useApp, type Lang } from '../context/AppContext'
import { useState } from 'react'

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
  const [subscribed, setSubscribed] = useState(false)

  return (
    <footer className="border-t mt-16" style={{ background: '#0a0a12', borderColor: '#1e1e32' }}>
      <div className="max-w-screen-xl mx-auto px-4 py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-8 mb-10">
          {/* Brand */}
          <div className="lg:col-span-2">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-8 h-8 rounded flex items-center justify-center text-white font-black text-sm" style={{ background: '#00b341', fontFamily: 'Big Shoulders Display' }}>FZ</div>
              <span className="text-white font-black text-xl tracking-tight" style={{ fontFamily: 'Big Shoulders Display' }}>FlowerZ<span style={{ color: '#00b341' }}>FC</span></span>
            </div>
            <p className="text-sm text-gray-400 mb-4">{t('tagline')}</p>
            
            {/* Social Icons */}
            <div className="flex items-center gap-3 mb-4 text-gray-400">
              <a href="https://youtube.com" target="_blank" rel="noreferrer" className="hover:text-emerald-400 transition-colors p-1" aria-label="YouTube">
                <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path d="M22.54 6.42a2.78 2.78 0 0 0-1.94-2C18.88 4 12 4 12 4s-6.88 0-8.6.46a2.78 2.78 0 0 0-1.94 2A29 29 0 0 0 1 11.75a29 29 0 0 0 .46 5.33A2.78 2.78 0 0 0 3.4 19c1.72.46 8.6.46 8.6.46s6.88 0 8.6-.46a2.78 2.78 0 0 0 1.94-2 29 29 0 0 0 .46-5.25 29 29 0 0 0-.46-5.33z"/><polygon points="9.75 15.02 15.5 11.75 9.75 8.48 9.75 15.02"/></svg>
              </a>
              <a href="https://x.com" target="_blank" rel="noreferrer" className="hover:text-white transition-colors p-1" aria-label="X">
                <svg width="16" height="16" fill="currentColor" viewBox="0 0 24 24"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
              </a>
              <a href="https://instagram.com" target="_blank" rel="noreferrer" className="hover:text-emerald-400 transition-colors p-1" aria-label="Instagram">
                <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><rect x="2" y="2" width="20" height="20" rx="5" ry="5"/><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"/></svg>
              </a>
              <a href="https://facebook.com" target="_blank" rel="noreferrer" className="hover:text-emerald-400 transition-colors p-1" aria-label="Facebook">
                <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"/></svg>
              </a>
              <a href="https://wa.me/254700000000" target="_blank" rel="noreferrer" className="hover:text-emerald-400 transition-colors p-1" aria-label="WhatsApp">
                <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/></svg>
              </a>
            </div>

            {/* Newsletter */}
            <div className="flex gap-2">
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder={t('newsletterPlaceholder')}
                className="flex-1 px-3 py-2 text-sm rounded text-white placeholder:text-gray-600 outline-none focus:ring-1 focus:ring-emerald-500"
                style={{ background: '#131320', border: '1px solid #1e1e32' }}
              />
              <button
                onClick={() => { if (email) setSubscribed(true) }}
                className="px-4 py-2 text-sm font-bold text-white rounded transition-colors hover:opacity-80"
                style={{ background: '#00b341' }}
              >
                {subscribed ? '✓' : t('subscribe')}
              </button>
            </div>
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
