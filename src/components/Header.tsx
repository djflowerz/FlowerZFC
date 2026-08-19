import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useApp, type Lang } from '../context/AppContext'
import CartDrawer from './CartDrawer'
import NotificationManager from './NotificationManager'
import { ShieldCheck, PenLine, Headset } from 'lucide-react'

const LANGS: { code: Lang; flag: string; label: string }[] = [
  { code: 'en', flag: '🇬🇧', label: 'EN' },
  { code: 'sw', flag: '🇰🇪', label: 'SW' },
  { code: 'fr', flag: '🇫🇷', label: 'FR' },
  { code: 'es', flag: '🇪🇸', label: 'ES' },
  { code: 'pt', flag: '🇧🇷', label: 'PT' },
  { code: 'ar', flag: '🇸🇦', label: 'AR' },
]

export default function Header() {
  const { t, lang, setLang, darkMode, toggleDark, cartCount, user, authLoading, logout, currency, setCurrency } = useApp()
  const [langOpen, setLangOpen] = useState(false)
  const [currencyOpen, setCurrencyOpen] = useState(false)
  const CURRENCIES = [
    { code: 'USD', label: 'USD $' },
    { code: 'KES', label: 'KES' },
    { code: 'GBP', label: 'GBP £' },
    { code: 'EUR', label: 'EUR €' },
  ]
  const [menuOpen, setMenuOpen] = useState(false)
  const [cartOpen, setCartOpen] = useState(false)
  const [accountOpen, setAccountOpen] = useState(false)
  const [searchOpen, setSearchOpen] = useState(false)
  const [searchQ, setSearchQ] = useState('')
  const navigate = useNavigate()

  const navLinks = [
    { to: '/scores', label: t('scores') },
    { to: '/fixtures', label: t('fixtures') },
    { to: '/standings', label: t('standings') },
    { to: '/news', label: t('news') },
    { to: '/quiz', label: 'Quiz' },
    { to: '/videos', label: t('videos') },
    { to: '/mixes', label: t('mixes') },
    { to: '/shop', label: t('shop') },
  ]

  return (
    <>
      <header className="fixed top-0 left-0 right-0 z-50 border-b" style={{ background: '#0a0a12', borderColor: '#1e1e32' }}>
        {/* Top bar */}
        <div className="flex items-center justify-between px-4 lg:px-8 h-14 max-w-[1700px] mx-auto">
          {/* Logo with Brand Green Badge */}
          <Link to="/" className="flex items-center gap-2 shrink-0">
            <div className="w-8 h-8 rounded flex items-center justify-center text-white font-black text-sm" style={{ background: '#00b341', fontFamily: 'Big Shoulders Display' }}>
              FZ
            </div>
            <span className="text-white font-black text-xl tracking-tight hidden sm:block" style={{ fontFamily: 'Big Shoulders Display' }}>
              FlowerZ<span style={{ color: '#00b341' }}>FC</span>
            </span>
          </Link>

          {/* Desktop nav */}
          <nav className="hidden lg:flex items-center gap-1">
            {navLinks.map(l => (
              <Link
                key={l.to}
                to={l.to}
                className="px-3 py-1.5 text-sm font-medium rounded transition-colors hover:text-white"
                style={{ color: '#9a9ab0', fontFamily: 'Hanken Grotesk' }}
              >
                {l.label}
              </Link>
            ))}
          </nav>

          {/* Right controls */}
          <div className="flex items-center gap-2">
            {/* Advertise — desktop */}
            <Link
              to="/advertise"
              className="hidden md:flex items-center px-3 py-1 text-xs font-semibold border rounded transition-colors hover:bg-[#00b341] hover:text-white"
              style={{ borderColor: '#00b341', color: '#00b341', borderRadius: '3px' }}
            >
              {t('advertise')}
            </Link>

            {/* Search */}
            <button
              onClick={() => setSearchOpen(true)}
              className="p-2 rounded hover:bg-white/10 transition-colors text-gray-400 hover:text-white"
              aria-label="Search"
            >
              <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
              </svg>
            </button>

            {/* Notifications Bell */}
            <NotificationManager />

            {/* Language Dropdown */}
            <div className="relative hidden md:block">
              <button
                onClick={() => setLangOpen(o => !o)}
                className="flex items-center gap-1 px-2 py-1.5 text-xs font-semibold text-gray-400 hover:text-white transition-colors"
              >
                {LANGS.find(l => l.code === lang)?.flag} {lang.toUpperCase()}
                <svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path d="m6 9 6 6 6-6"/></svg>
              </button>
              {langOpen && (
                <div className="absolute right-0 top-full mt-1 rounded shadow-xl z-50 py-1 min-w-[120px]" style={{ background: '#131320', border: '1px solid #1e1e32' }}>
                  {LANGS.map(l => (
                    <button
                      key={l.code}
                      onClick={() => { setLang(l.code); setLangOpen(false) }}
                      className={`w-full flex items-center gap-2 px-3 py-2 text-sm transition-colors hover:bg-white/10 ${lang === l.code ? 'text-[#00b341] font-semibold' : 'text-gray-400'}`}
                    >
                      {l.flag} {l.label}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Currency Dropdown */}
            <div className="relative hidden md:block">
              <button
                onClick={() => setCurrencyOpen(o => !o)}
                className="flex items-center gap-1 px-2 py-1.5 text-xs font-semibold text-gray-400 hover:text-white transition-colors"
              >
                {currency}
                <svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path d="m6 9 6 6 6-6"/></svg>
              </button>
              {currencyOpen && (
                <div className="absolute right-0 top-full mt-1 rounded shadow-xl z-50 py-1 min-w-[120px]" style={{ background: '#131320', border: '1px solid #1e1e32' }}>
                  {CURRENCIES.map(c => (
                    <button
                      key={c.code}
                      onClick={() => { setCurrency(c.code); setCurrencyOpen(false) }}
                      className={`w-full flex items-center gap-2 px-3 py-2 text-sm transition-colors hover:bg-white/10 ${currency === c.code ? 'text-[#00b341] font-semibold' : 'text-gray-400'}`}
                    >
                      {c.label}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Dark mode */}
            <button onClick={toggleDark} className="p-2 text-gray-400 hover:text-white transition-colors">
              {darkMode ? '☀️' : '🌙'}
            </button>

            {/* Cart */}
            <button
              onClick={() => setCartOpen(true)}
              className="relative p-2 text-gray-400 hover:text-white transition-colors"
              aria-label="Cart"
            >
              <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 0 1-8 0"/>
              </svg>
              {cartCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full text-white text-[10px] flex items-center justify-center font-bold" style={{ background: '#00b341' }}>
                  {cartCount}
                </span>
              )}
            </button>

            {/* Account / Sign In condition: If user is signed in, show profile avatar. If NOT signed in, show Sign In button! */}
            {user ? (
              <div className="relative">
                <button
                  onClick={() => setAccountOpen(o => !o)}
                  className="flex items-center gap-2 p-1 rounded-full transition-colors border border-[#00b341]/40 hover:border-[#00b341]"
                >
                  <div className="w-7 h-7 rounded-full bg-[#00b341] text-black font-black text-xs flex items-center justify-center">
                    {user.name.charAt(0).toUpperCase()}
                  </div>
                </button>
                {accountOpen && (
                  <div className="absolute right-0 top-full mt-1 rounded shadow-xl z-50 py-1 min-w-[180px]" style={{ background: '#131320', border: '1px solid #1e1e32' }}>
                    <div className="px-3 py-2 text-xs text-gray-400 border-b border-white/10 font-bold">{user.name}</div>
                    <Link to="/account/teams" className="block px-3 py-2 text-sm text-gray-300 hover:bg-white/10 transition-colors" onClick={() => setAccountOpen(false)}>{t('myTeams')}</Link>
                    <Link to="/account/saved" className="block px-3 py-2 text-sm text-gray-300 hover:bg-white/10 transition-colors" onClick={() => setAccountOpen(false)}>{t('savedArticles')}</Link>
                    <Link to="/account/predictions" className="block px-3 py-2 text-sm text-gray-300 hover:bg-white/10 transition-colors" onClick={() => setAccountOpen(false)}>{t('myPredictions')}</Link>
                    <Link to="/account/settings" className="block px-3 py-2 text-sm text-gray-300 hover:bg-white/10 transition-colors" onClick={() => setAccountOpen(false)}>{t('settings')}</Link>
                    <div className="border-t border-white/10 my-1" />
                    {user.role === 'super_admin' && (
                      <Link to="/admin" className="flex items-center gap-2 px-3 py-2 text-sm font-bold hover:bg-[#00b341]/10 transition-colors" style={{ color: '#00b341' }} onClick={() => setAccountOpen(false)}>
                        <ShieldCheck size={15} strokeWidth={2.5} /> Admin Dashboard
                      </Link>
                    )}
                    {user.role === 'editor' && (
                      <Link to="/editor-dashboard" className="flex items-center gap-2 px-3 py-2 text-sm font-bold hover:bg-blue-500/10 transition-colors" style={{ color: '#3b82f6' }} onClick={() => setAccountOpen(false)}>
                        <PenLine size={15} strokeWidth={2.5} /> Editor Dashboard
                      </Link>
                    )}
                    {user.role === 'support' && (
                      <Link to="/support-dashboard" className="flex items-center gap-2 px-3 py-2 text-sm font-bold hover:bg-purple-500/10 transition-colors" style={{ color: '#a855f7' }} onClick={() => setAccountOpen(false)}>
                        <Headset size={15} strokeWidth={2.5} /> Support Dashboard
                      </Link>
                    )}
                    <div className="border-t border-white/10 my-1" />
                    <button onClick={async () => { await logout(); setAccountOpen(false) }} className="w-full text-left px-3 py-2 text-sm text-red-400 hover:bg-white/10 transition-colors">{t('logout')}</button>
                  </div>
                )}
              </div>
            ) : (
              <Link
                to="/login"
                className="px-3.5 py-1.5 text-xs font-bold text-black rounded transition-colors hover:opacity-80"
                style={{ background: '#00b341' }}
              >
                {t('login')}
              </Link>
            )}

            {/* Mobile hamburger */}
            <button
              className="lg:hidden p-2 text-gray-400 hover:text-white transition-colors"
              onClick={() => setMenuOpen(o => !o)}
            >
              <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                {menuOpen ? <path d="M18 6 6 18M6 6l12 12"/> : <path d="M4 6h16M4 12h16M4 18h16"/>}
              </svg>
            </button>
          </div>
        </div>

        {/* Mobile drawer */}
        {menuOpen && (
          <div className="lg:hidden border-t" style={{ background: '#0a0a12', borderColor: '#1e1e32' }}>
            <div className="px-4 py-3 flex gap-2 border-b border-white/10">
              <div className="flex-1">
                <p className="text-[10px] font-bold text-gray-500 uppercase mb-1.5">Language</p>
                <div className="flex flex-wrap gap-1.5">
                  {LANGS.map(l => (
                    <button
                      key={l.code}
                      onClick={() => setLang(l.code)}
                      className={`px-2 py-1 text-xs rounded transition-colors ${lang === l.code ? 'text-[#00b341] font-semibold bg-[#00b341]/10' : 'text-gray-400 bg-white/5'}`}
                    >
                      {l.flag} {l.label}
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex-1">
                <p className="text-[10px] font-bold text-gray-500 uppercase mb-1.5">Currency</p>
                <div className="flex flex-wrap gap-1.5">
                  {CURRENCIES.map(c => (
                    <button
                      key={c.code}
                      onClick={() => setCurrency(c.code)}
                      className={`px-2 py-1 text-xs rounded transition-colors ${currency === c.code ? 'text-[#00b341] font-semibold bg-[#00b341]/10' : 'text-gray-400 bg-white/5'}`}
                    >
                      {c.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <nav className="px-4 py-3 flex flex-col gap-1">
              {navLinks.map(l => (
                <Link
                  key={l.to}
                  to={l.to}
                  className="py-2.5 px-3 text-sm font-medium text-gray-300 hover:text-white hover:bg-white/10 rounded transition-colors"
                  onClick={() => setMenuOpen(false)}
                >
                  {l.label}
                </Link>
              ))}
              <Link to="/advertise" className="py-2.5 px-3 text-sm font-medium text-[#00b341] hover:bg-white/10 rounded transition-colors" onClick={() => setMenuOpen(false)}>{t('advertise')}</Link>
              <Link to="/about" className="py-2.5 px-3 text-sm font-medium text-gray-400 hover:text-white hover:bg-white/10 rounded transition-colors" onClick={() => setMenuOpen(false)}>{t('about')}</Link>
              <Link to="/contact" className="py-2.5 px-3 text-sm font-medium text-gray-400 hover:text-white hover:bg-white/10 rounded transition-colors" onClick={() => setMenuOpen(false)}>{t('contact')}</Link>
              <div className="border-t border-white/10 my-1" />
              {user?.role === 'super_admin' && (
                <Link to="/admin" className="py-2.5 px-3 text-sm font-bold flex items-center gap-2 rounded transition-colors hover:bg-[#00b341]/10" style={{ color: '#00b341' }} onClick={() => setMenuOpen(false)}>
                  <ShieldCheck size={15} strokeWidth={2.5} /> Admin Dashboard
                </Link>
              )}
              {user?.role === 'editor' && (
                <Link to="/editor-dashboard" className="py-2.5 px-3 text-sm font-bold flex items-center gap-2 rounded transition-colors hover:bg-blue-500/10" style={{ color: '#3b82f6' }} onClick={() => setMenuOpen(false)}>
                  <PenLine size={15} strokeWidth={2.5} /> Editor Dashboard
                </Link>
              )}
              {user?.role === 'support' && (
                <Link to="/support-dashboard" className="py-2.5 px-3 text-sm font-bold flex items-center gap-2 rounded transition-colors hover:bg-purple-500/10" style={{ color: '#a855f7' }} onClick={() => setMenuOpen(false)}>
                  <Headset size={15} strokeWidth={2.5} /> Support Dashboard
                </Link>
              )}
            </nav>
          </div>
        )}
      </header>

      {/* Search overlay */}
      {searchOpen && (
        <div className="fixed inset-0 z-[100] flex items-start justify-center pt-24 px-4" style={{ background: 'rgba(0,0,0,0.85)' }} onClick={() => setSearchOpen(false)}>
          <div className="w-full max-w-2xl" onClick={e => e.stopPropagation()}>
            <div className="flex items-center gap-3 rounded-lg px-4 py-3" style={{ background: '#131320', border: '1px solid #1e1e32' }}>
              <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="#666" strokeWidth={2}><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
              <input
                autoFocus
                value={searchQ}
                onChange={e => setSearchQ(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' && searchQ) { navigate(`/search?q=${encodeURIComponent(searchQ)}`); setSearchOpen(false) } if (e.key === 'Escape') setSearchOpen(false) }}
                placeholder={t('search') + '...'}
                className="flex-1 bg-transparent text-white text-lg outline-none placeholder:text-gray-600"
              />
              <button onClick={() => setSearchOpen(false)} className="text-gray-500 hover:text-white transition-colors text-sm">{t('close')}</button>
            </div>
          </div>
        </div>
      )}

      <CartDrawer open={cartOpen} onClose={() => setCartOpen(false)} />

      {/* Click-away for dropdowns */}
      {(langOpen || accountOpen) && (
        <div className="fixed inset-0 z-40" onClick={() => { setLangOpen(false); setAccountOpen(false) }} />
      )}
    </>
  )
}
