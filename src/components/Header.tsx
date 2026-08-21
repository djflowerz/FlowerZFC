import { useState } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { useApp, type Lang } from '../context/AppContext'
import CartDrawer from './CartDrawer'
import NotificationManager from './NotificationManager'
import {
  ShieldCheck,
  PenLine,
  Headset,
  Radio,
  CalendarDays,
  Trophy,
  Newspaper,
  Tv,
  Headphones,
  ShoppingBag,
  Coffee,
  Megaphone,
  Repeat,
  Globe,
  Shield,
  Bookmark,
  Target,
  Settings as SettingsIcon,
  LogOut,
  LogIn,
  UserPlus,
  Search as SearchIcon,
  Menu as MenuIcon,
  X as CloseIcon,
  Sun,
  Moon,
  ChevronRight,
  Info,
  Mail,
  HelpCircle,
  Sparkles,
  Coins,
  Check,
  Heart,
} from 'lucide-react'

const LANGS: { code: Lang; flag: string; label: string; name: string }[] = [
  { code: 'en', flag: '🇬🇧', label: 'EN', name: 'English' },
  { code: 'sw', flag: '🇰🇪', label: 'SW', name: 'Kiswahili' },
  { code: 'fr', flag: '🇫🇷', label: 'FR', name: 'Français' },
  { code: 'es', flag: '🇪🇸', label: 'ES', name: 'Español' },
  { code: 'pt', flag: '🇧🇷', label: 'PT', name: 'Português' },
  { code: 'ar', flag: '🇸🇦', label: 'AR', name: 'العربية' },
]

const CURRENCIES = [
  { code: 'KES', label: 'KES', name: 'Kenyan Shilling', symbol: 'KSh' },
  { code: 'USD', label: 'USD', name: 'US Dollar', symbol: '$' },
  { code: 'GBP', label: 'GBP', name: 'British Pound', symbol: '£' },
  { code: 'EUR', label: 'EUR', name: 'Euro', symbol: '€' },
]

export default function Header() {
  const { t, lang, setLang, darkMode, toggleDark, cartCount, user, logout, currency, setCurrency } = useApp()
  const [langOpen, setLangOpen] = useState(false)
  const [currencyOpen, setCurrencyOpen] = useState(false)
  const [prefModalOpen, setPrefModalOpen] = useState(false)
  const [drawerPrefTab, setDrawerPrefTab] = useState<'currency' | 'language'>('currency')
  const [menuOpen, setMenuOpen] = useState(false)
  const [cartOpen, setCartOpen] = useState(false)
  const [accountOpen, setAccountOpen] = useState(false)
  const [searchOpen, setSearchOpen] = useState(false)
  const [searchQ, setSearchQ] = useState('')
  const [drawerSearchQ, setDrawerSearchQ] = useState('')
  const navigate = useNavigate()
  const location = useLocation()

  const desktopNavLinks = [
    { to: '/scores', label: t('scores') },
    { to: '/fixtures', label: t('fixtures') },
    { to: '/standings', label: t('standings') },
    { to: '/news', label: t('news') },
    { to: '/quiz', label: 'Quiz' },
    { to: '/videos', label: t('videos') },
    { to: '/mixes', label: t('mixes') },
    { to: '/shop', label: t('shop') },
  ]

  const handleSearchSubmit = (query: string) => {
    if (!query.trim()) return
    navigate(`/search?q=${encodeURIComponent(query.trim())}`)
    setSearchOpen(false)
    setMenuOpen(false)
    setSearchQ('')
    setDrawerSearchQ('')
  }

  const isActive = (path: string) => {
    if (path === '/') return location.pathname === '/'
    return location.pathname.startsWith(path)
  }

  return (
    <>
      <header className="fixed top-0 left-0 right-0 z-50 border-b backdrop-blur-md" style={{ background: 'rgba(10, 10, 18, 0.95)', borderColor: '#1e1e32' }}>
        {/* Top bar */}
        <div className="flex items-center justify-between px-3 sm:px-4 lg:px-8 h-14 max-w-[1700px] mx-auto">
          {/* Logo with Brand Badge */}
          <Link to="/" className="flex items-center gap-2 shrink-0 group">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center text-white font-black text-sm shadow-md transition-transform group-hover:scale-105" style={{ background: '#00b341', fontFamily: 'Big Shoulders Display' }}>
              FZ
            </div>
            <div className="flex flex-col leading-none">
              <span className="text-white font-black text-lg sm:text-xl tracking-tight" style={{ fontFamily: 'Big Shoulders Display' }}>
                FlowerZ<span style={{ color: '#00b341' }}>FC</span>
              </span>
              <span className="text-[8px] font-bold text-gray-400 tracking-wider uppercase hidden sm:block">Live Scores &amp; Media</span>
            </div>
          </Link>

          {/* Desktop Navigation Links */}
          <nav className="hidden lg:flex items-center gap-1">
            {desktopNavLinks.map(l => {
              const active = isActive(l.to)
              return (
                <Link
                  key={l.to}
                  to={l.to}
                  className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-all ${
                    active ? 'text-white bg-white/10 font-bold' : 'text-[#9a9ab0] hover:text-white hover:bg-white/5'
                  }`}
                  style={{ fontFamily: 'Hanken Grotesk' }}
                >
                  {l.label}
                </Link>
              )
            })}
          </nav>

          {/* Controls Right */}
          <div className="flex items-center gap-1.5 sm:gap-2">
            {/* Advertise — Desktop Pill */}
            <Link
              to="/advertise"
              className="hidden md:flex items-center gap-1 px-3 py-1 text-xs font-bold border rounded-lg transition-all hover:bg-[#00b341] hover:text-black shadow-sm"
              style={{ borderColor: '#00b341', color: '#00b341' }}
            >
              <Megaphone size={13} />
              <span>{t('advertise')}</span>
            </Link>

            {/* Quick Tip / Support Button — Desktop */}
            <Link
              to="/tip"
              className="hidden xl:flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-300 hover:bg-amber-500/20 transition-all"
            >
              <Coffee size={13} />
              <span>Tip</span>
            </Link>

            {/* Search Toggle */}
            <button
              onClick={() => setSearchOpen(true)}
              className="p-2 rounded-lg hover:bg-white/10 transition-colors text-gray-300 hover:text-white"
              aria-label="Search"
              title="Search"
            >
              <SearchIcon size={18} />
            </button>

            {/* Notifications Bell */}
            <NotificationManager />

            {/* Language Selector (Desktop) */}
            <div className="relative hidden md:block">
              <button
                onClick={() => setLangOpen(o => !o)}
                className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold text-gray-300 hover:text-white hover:bg-white/5 rounded-lg transition-colors"
              >
                <span>{LANGS.find(l => l.code === lang)?.flag}</span>
                <span>{lang.toUpperCase()}</span>
                <ChevronRight size={12} className={`transition-transform ${langOpen ? 'rotate-90' : ''}`} />
              </button>
              {langOpen && (
                <div className="absolute right-0 top-full mt-1.5 rounded-xl shadow-2xl z-50 py-1.5 min-w-[140px] border border-[#1e1e32]" style={{ background: '#131320' }}>
                  {LANGS.map(l => (
                    <button
                      key={l.code}
                      onClick={() => { setLang(l.code); setLangOpen(false) }}
                      className={`w-full flex items-center justify-between px-3 py-2 text-xs transition-colors hover:bg-white/10 ${lang === l.code ? 'text-[#00b341] font-bold bg-[#00b341]/10' : 'text-gray-300'}`}
                    >
                      <span className="flex items-center gap-2">{l.flag} {l.label}</span>
                      {lang === l.code && <span className="text-xs">✓</span>}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Currency Selector (Desktop) */}
            <div className="relative hidden md:block">
              <button
                onClick={() => setCurrencyOpen(o => !o)}
                className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold text-gray-300 hover:text-white hover:bg-white/5 rounded-lg transition-colors"
              >
                <span>{currency}</span>
                <ChevronRight size={12} className={`transition-transform ${currencyOpen ? 'rotate-90' : ''}`} />
              </button>
              {currencyOpen && (
                <div className="absolute right-0 top-full mt-1.5 rounded-xl shadow-2xl z-50 py-1.5 min-w-[130px] border border-[#1e1e32]" style={{ background: '#131320' }}>
                  {CURRENCIES.map(c => (
                    <button
                      key={c.code}
                      onClick={() => { setCurrency(c.code); setCurrencyOpen(false) }}
                      className={`w-full flex items-center justify-between px-3 py-2 text-xs transition-colors hover:bg-white/10 ${currency === c.code ? 'text-[#00b341] font-bold bg-[#00b341]/10' : 'text-gray-300'}`}
                    >
                      <span>{c.label}</span>
                      {currency === c.code && <span className="text-xs">✓</span>}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Dark Mode Toggle */}
            <button
              onClick={toggleDark}
              className="p-2 text-gray-300 hover:text-white hover:bg-white/5 rounded-lg transition-colors"
              title={darkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
              aria-label="Toggle Theme"
            >
              {darkMode ? <Sun size={17} className="text-amber-400" /> : <Moon size={17} className="text-blue-300" />}
            </button>

            {/* Quick Currency & Language Pill (Mobile Header) */}
            <button
              onClick={() => {
                setDrawerPrefTab('currency')
                setPrefModalOpen(true)
              }}
              className="lg:hidden flex items-center gap-1.5 px-2 py-1.5 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 text-xs font-bold text-gray-200 transition-colors"
              title="Change Currency & Language"
              aria-label="Change Currency and Language"
            >
              <span className="text-xs">{LANGS.find(l => l.code === lang)?.flag}</span>
              <span className="text-[11px] font-mono text-[#00b341] font-black">{currency}</span>
            </button>

            {/* Cart Button */}
            <button
              onClick={() => setCartOpen(true)}
              className="relative p-2 text-gray-300 hover:text-white hover:bg-white/5 rounded-lg transition-colors"
              aria-label="Shopping Cart"
              title="View Cart"
            >
              <ShoppingBag size={18} />
              {cartCount > 0 && (
                <span className="absolute 0 top-0.5 right-0.5 min-w-[18px] h-[18px] px-1 rounded-full text-black text-[10px] flex items-center justify-center font-black animate-pulse" style={{ background: '#00b341' }}>
                  {cartCount}
                </span>
              )}
            </button>

            {/* Account / User Menu (Desktop) */}
            {user ? (
              <div className="relative hidden md:block">
                <button
                  onClick={() => setAccountOpen(o => !o)}
                  className="flex items-center gap-1.5 p-1 rounded-full transition-all border border-[#00b341]/40 hover:border-[#00b341] hover:shadow-lg hover:shadow-[#00b341]/20"
                  aria-label="User Account"
                >
                  {user.avatar_url ? (
                    <img src={user.avatar_url} alt={user.name} className="w-7 h-7 rounded-full object-cover" />
                  ) : (
                    <div className="w-7 h-7 rounded-full bg-[#00b341] text-black font-black text-xs flex items-center justify-center">
                      {(user.name || 'U').charAt(0).toUpperCase()}
                    </div>
                  )}
                </button>
                {accountOpen && (
                  <div className="absolute right-0 top-full mt-2 rounded-2xl shadow-2xl z-50 py-2 min-w-[220px] border border-[#1e1e32]" style={{ background: '#131320' }}>
                    <div className="px-4 py-2.5 border-b border-white/10">
                      <div className="text-xs font-bold text-white truncate">{user.name}</div>
                      <div className="text-[10px] text-gray-400 truncate">{user.email}</div>
                      <span className="inline-block mt-1 px-1.5 py-0.5 text-[9px] font-mono font-bold uppercase rounded bg-[#00b341]/20 text-[#00b341]">
                        {user.role}
                      </span>
                    </div>
                    <div className="py-1">
                      <Link to="/account/teams" className="flex items-center gap-2 px-4 py-2 text-xs text-gray-300 hover:bg-white/10 hover:text-white transition-colors" onClick={() => setAccountOpen(false)}>
                        <Shield size={14} className="text-[#00b341]" /> {t('myTeams')}
                      </Link>
                      <Link to="/account/saved" className="flex items-center gap-2 px-4 py-2 text-xs text-gray-300 hover:bg-white/10 hover:text-white transition-colors" onClick={() => setAccountOpen(false)}>
                        <Bookmark size={14} className="text-blue-400" /> {t('savedArticles')}
                      </Link>
                      <Link to="/account/wishlist" className="flex items-center gap-2 px-4 py-2 text-xs text-gray-300 hover:bg-white/10 hover:text-white transition-colors" onClick={() => setAccountOpen(false)}>
                        <Heart size={14} className="text-red-400" /> My Wishlist
                      </Link>
                      <Link to="/account/predictions" className="flex items-center gap-2 px-4 py-2 text-xs text-gray-300 hover:bg-white/10 hover:text-white transition-colors" onClick={() => setAccountOpen(false)}>
                        <Target size={14} className="text-amber-400" /> {t('myPredictions')}
                      </Link>
                      <Link to="/account/settings" className="flex items-center gap-2 px-4 py-2 text-xs text-gray-300 hover:bg-white/10 hover:text-white transition-colors" onClick={() => setAccountOpen(false)}>
                        <SettingsIcon size={14} className="text-gray-400" /> {t('settings')}
                      </Link>
                    </div>
                    <div className="border-t border-white/10 my-1" />
                    {user.role === 'super_admin' && (
                      <Link to="/admin" className="flex items-center gap-2 px-4 py-2 text-xs font-bold hover:bg-[#00b341]/10 transition-colors" style={{ color: '#00b341' }} onClick={() => setAccountOpen(false)}>
                        <ShieldCheck size={15} strokeWidth={2.5} /> Admin Dashboard
                      </Link>
                    )}
                    {user.role === 'editor' && (
                      <Link to="/editor-dashboard" className="flex items-center gap-2 px-4 py-2 text-xs font-bold hover:bg-blue-500/10 transition-colors" style={{ color: '#3b82f6' }} onClick={() => setAccountOpen(false)}>
                        <PenLine size={15} strokeWidth={2.5} /> Editor Dashboard
                      </Link>
                    )}
                    {user.role === 'support' && (
                      <Link to="/support-dashboard" className="flex items-center gap-2 px-4 py-2 text-xs font-bold hover:bg-purple-500/10 transition-colors" style={{ color: '#a855f7' }} onClick={() => setAccountOpen(false)}>
                        <Headset size={15} strokeWidth={2.5} /> Support Dashboard
                      </Link>
                    )}
                    <div className="border-t border-white/10 my-1" />
                    <button
                      onClick={async () => { await logout(); setAccountOpen(false) }}
                      className="w-full text-left flex items-center gap-2 px-4 py-2 text-xs text-red-400 hover:bg-red-500/10 transition-colors"
                    >
                      <LogOut size={14} />
                      <span>{t('logout')}</span>
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <Link
                to="/login"
                className="hidden md:flex items-center gap-1 px-3.5 py-1.5 text-xs font-black text-black rounded-lg transition-all hover:opacity-90 shadow-sm"
                style={{ background: '#00b341' }}
              >
                <LogIn size={13} />
                <span>{t('login')}</span>
              </Link>
            )}

            {/* Mobile Hamburger Menu Toggle Button */}
            <button
              className={`lg:hidden p-2 rounded-lg transition-all flex items-center justify-center ${
                menuOpen ? 'bg-[#00b341] text-black shadow-md' : 'text-gray-300 hover:text-white hover:bg-white/10'
              }`}
              onClick={() => setMenuOpen(o => !o)}
              aria-label="Toggle Mobile Navigation Menu"
              aria-expanded={menuOpen}
            >
              {menuOpen ? <CloseIcon size={20} strokeWidth={2.5} /> : <MenuIcon size={22} strokeWidth={2.2} />}
            </button>
          </div>
        </div>

        {/* ─── Premium Mobile Menu Drawer ─────────────────────────────────── */}
        {menuOpen && (
          <div
            className="lg:hidden border-t max-h-[calc(100vh-56px)] overflow-y-auto overscroll-contain animate-fadeIn pb-10"
            style={{ background: '#0a0a14', borderColor: '#1e1e32' }}
          >
            {/* 1. Quick Mobile Search Bar */}
            <div className="p-3 border-b border-white/5 bg-[#0e0e1a]">
              <form
                onSubmit={e => {
                  e.preventDefault()
                  handleSearchSubmit(drawerSearchQ)
                }}
                className="relative flex items-center"
              >
                <SearchIcon size={16} className="absolute left-3 text-gray-400" />
                <input
                  type="text"
                  value={drawerSearchQ}
                  onChange={e => setDrawerSearchQ(e.target.value)}
                  placeholder="Search matches, news, jerseys, mixes..."
                  className="w-full pl-9 pr-14 py-2.5 text-xs text-white placeholder-gray-500 rounded-xl outline-none border focus:border-[#00b341] transition-all"
                  style={{ background: '#131322', borderColor: '#1e1e32' }}
                />
                <button
                  type="submit"
                  className="absolute right-1.5 px-2.5 py-1 text-[10px] font-bold text-black rounded-lg transition-all"
                  style={{ background: '#00b341' }}
                >
                  Go
                </button>
              </form>
            </div>

            {/* 2. User Profile / Welcome Card */}
            <div className="p-3 border-b border-white/5">
              {user ? (
                <div className="p-3.5 rounded-2xl border border-[#00b341]/30 bg-[#121222] shadow-lg space-y-3">
                  <div className="flex items-center justify-between gap-3">
                    <Link to="/account" onClick={() => setMenuOpen(false)} className="flex items-center gap-3 min-w-0 flex-1">
                      {user.avatar_url ? (
                        <img src={user.avatar_url} alt={user.name} className="w-10 h-10 rounded-full object-cover border-2 border-[#00b341] shrink-0" />
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-[#00b341] text-black font-black text-sm flex items-center justify-center shrink-0">
                          {(user.name || 'U').charAt(0).toUpperCase()}
                        </div>
                      )}
                      <div className="min-w-0 flex-1">
                        <div className="font-bold text-xs sm:text-sm text-white truncate flex items-center gap-1.5">
                          <span>{user.name}</span>
                          <span className="text-[8px] px-1.5 py-0.5 rounded font-mono font-bold bg-[#00b341]/20 text-[#00b341] uppercase shrink-0">
                            {user.role}
                          </span>
                        </div>
                        <div className="text-[11px] text-gray-400 truncate">{user.email}</div>
                      </div>
                    </Link>
                    <button
                      onClick={async () => { await logout(); setMenuOpen(false) }}
                      className="px-2.5 py-1.5 rounded-lg text-xs font-bold text-red-400 bg-red-500/10 hover:bg-red-500/20 transition-colors shrink-0 flex items-center gap-1"
                    >
                      <LogOut size={12} />
                      <span>{t('logout')}</span>
                    </button>
                  </div>

                  {/* Quick Profile Shortcuts */}
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5 pt-2 border-t border-white/10 text-xs font-semibold text-gray-300">
                    <Link to="/account/teams" onClick={() => setMenuOpen(false)} className="px-2.5 py-2 rounded-xl bg-white/5 hover:bg-white/10 hover:text-white flex items-center gap-2 transition-colors">
                      <Shield size={14} className="text-[#00b341]" />
                      <span>My Teams</span>
                    </Link>
                    <Link to="/account/saved" onClick={() => setMenuOpen(false)} className="px-2.5 py-2 rounded-xl bg-white/5 hover:bg-white/10 hover:text-white flex items-center gap-2 transition-colors">
                      <Bookmark size={14} className="text-blue-400" />
                      <span>Saved News</span>
                    </Link>
                    <Link to="/account/wishlist" onClick={() => setMenuOpen(false)} className="px-2.5 py-2 rounded-xl bg-white/5 hover:bg-white/10 hover:text-white flex items-center gap-2 transition-colors">
                      <Heart size={14} className="text-red-400" />
                      <span>Wishlist</span>
                    </Link>
                    <Link to="/account/predictions" onClick={() => setMenuOpen(false)} className="px-2.5 py-2 rounded-xl bg-white/5 hover:bg-white/10 hover:text-white flex items-center gap-2 transition-colors">
                      <Target size={14} className="text-amber-400" />
                      <span>Predictions</span>
                    </Link>
                    <Link to="/account/settings" onClick={() => setMenuOpen(false)} className="px-2.5 py-2 rounded-xl bg-white/5 hover:bg-white/10 hover:text-white flex items-center gap-2 transition-colors col-span-2 sm:col-span-1">
                      <SettingsIcon size={14} className="text-gray-400" />
                      <span>Settings</span>
                    </Link>
                  </div>

                  {/* Staff / Admin Dashboard Access */}
                  {user.role === 'super_admin' && (
                    <Link
                      to="/admin"
                      onClick={() => setMenuOpen(false)}
                      className="w-full py-2 px-3 rounded-xl flex items-center justify-between text-xs font-bold text-white transition-all shadow-md"
                      style={{ background: 'linear-gradient(135deg, #008731 0%, #00b341 100%)' }}
                    >
                      <span className="flex items-center gap-2">
                        <ShieldCheck size={16} /> Super Admin Dashboard
                      </span>
                      <ChevronRight size={14} />
                    </Link>
                  )}
                  {user.role === 'editor' && (
                    <Link
                      to="/editor-dashboard"
                      onClick={() => setMenuOpen(false)}
                      className="w-full py-2 px-3 rounded-xl flex items-center justify-between text-xs font-bold text-white bg-blue-600 hover:bg-blue-500 transition-colors shadow-md"
                    >
                      <span className="flex items-center gap-2">
                        <PenLine size={16} /> Editor Dashboard
                      </span>
                      <ChevronRight size={14} />
                    </Link>
                  )}
                  {user.role === 'support' && (
                    <Link
                      to="/support-dashboard"
                      onClick={() => setMenuOpen(false)}
                      className="w-full py-2 px-3 rounded-xl flex items-center justify-between text-xs font-bold text-white bg-purple-600 hover:bg-purple-500 transition-colors shadow-md"
                    >
                      <span className="flex items-center gap-2">
                        <Headset size={16} /> Support Dashboard
                      </span>
                      <ChevronRight size={14} />
                    </Link>
                  )}
                </div>
              ) : (
                <div className="p-4 rounded-2xl border border-white/10 bg-[#121222] space-y-2.5 text-center shadow-lg">
                  <div className="flex items-center justify-center gap-2">
                    <span className="text-xl">⚽</span>
                    <h3 className="text-sm font-black text-white" style={{ fontFamily: 'Big Shoulders Display', letterSpacing: '0.5px' }}>
                      Welcome to FlowerZFC
                    </h3>
                  </div>
                  <p className="text-[11px] text-gray-400 leading-snug">
                    Sign in to save teams, enter match predictions &amp; customize goal notifications.
                  </p>
                  <div className="flex gap-2 pt-1">
                    <Link
                      to="/login"
                      onClick={() => setMenuOpen(false)}
                      className="flex-1 py-2 text-xs font-black text-black rounded-xl transition-all hover:opacity-90 shadow-md flex items-center justify-center gap-1.5"
                      style={{ background: '#00b341' }}
                    >
                      <LogIn size={13} />
                      <span>{t('login')}</span>
                    </Link>
                    <Link
                      to="/login?mode=signup"
                      onClick={() => setMenuOpen(false)}
                      className="flex-1 py-2 text-xs font-bold text-white rounded-xl border border-white/15 bg-white/5 hover:bg-white/10 transition-colors flex items-center justify-center gap-1.5"
                    >
                      <UserPlus size={13} />
                      <span>{t('signup')}</span>
                    </Link>
                  </div>
                </div>
              )}
            </div>

            {/* 3. Categorized Mobile Navigation Grid */}
            <div className="px-3 py-3 space-y-4">
              {/* SECTION: MATCH CENTER */}
              <div>
                <div className="flex items-center gap-1.5 px-1 mb-2">
                  <span className="text-[10px] font-black uppercase tracking-widest text-[#00b341]">⚽ Match Center</span>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <Link
                    to="/scores"
                    onClick={() => setMenuOpen(false)}
                    className={`p-3 rounded-xl border transition-all flex items-center gap-2.5 ${
                      isActive('/scores')
                        ? 'bg-[#00b341]/15 border-[#00b341] text-white shadow-sm'
                        : 'bg-[#121220] border-[#1e1e32] text-gray-300 hover:text-white hover:border-gray-600'
                    }`}
                  >
                    <div className="w-8 h-8 rounded-lg bg-red-500/10 text-red-400 flex items-center justify-center shrink-0">
                      <Radio size={16} className="animate-pulse" />
                    </div>
                    <div className="min-w-0">
                      <div className="text-xs font-bold truncate flex items-center gap-1">
                        <span>Live Scores</span>
                      </div>
                      <div className="text-[9px] text-[#00b341] font-semibold">Real-time alerts</div>
                    </div>
                  </Link>

                  <Link
                    to="/fixtures"
                    onClick={() => setMenuOpen(false)}
                    className={`p-3 rounded-xl border transition-all flex items-center gap-2.5 ${
                      isActive('/fixtures')
                        ? 'bg-[#00b341]/15 border-[#00b341] text-white shadow-sm'
                        : 'bg-[#121220] border-[#1e1e32] text-gray-300 hover:text-white hover:border-gray-600'
                    }`}
                  >
                    <div className="w-8 h-8 rounded-lg bg-blue-500/10 text-blue-400 flex items-center justify-center shrink-0">
                      <CalendarDays size={16} />
                    </div>
                    <div className="min-w-0">
                      <div className="text-xs font-bold truncate">Fixtures</div>
                      <div className="text-[9px] text-gray-400">Match calendar</div>
                    </div>
                  </Link>

                  <Link
                    to="/standings"
                    onClick={() => setMenuOpen(false)}
                    className={`p-3 rounded-xl border transition-all flex items-center gap-2.5 ${
                      isActive('/standings')
                        ? 'bg-[#00b341]/15 border-[#00b341] text-white shadow-sm'
                        : 'bg-[#121220] border-[#1e1e32] text-gray-300 hover:text-white hover:border-gray-600'
                    }`}
                  >
                    <div className="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-400 flex items-center justify-center shrink-0">
                      <Trophy size={16} />
                    </div>
                    <div className="min-w-0">
                      <div className="text-xs font-bold truncate">Standings</div>
                      <div className="text-[9px] text-gray-400">League tables</div>
                    </div>
                  </Link>

                  <Link
                    to="/transfers"
                    onClick={() => setMenuOpen(false)}
                    className={`p-3 rounded-xl border transition-all flex items-center gap-2.5 ${
                      isActive('/transfers')
                        ? 'bg-[#00b341]/15 border-[#00b341] text-white shadow-sm'
                        : 'bg-[#121220] border-[#1e1e32] text-gray-300 hover:text-white hover:border-gray-600'
                    }`}
                  >
                    <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center shrink-0">
                      <Repeat size={16} />
                    </div>
                    <div className="min-w-0">
                      <div className="text-xs font-bold truncate flex items-center gap-1">
                        <span>Transfers</span>
                        <span className="text-[8px] px-1 rounded bg-red-500/20 text-red-400 font-bold">HOT</span>
                      </div>
                      <div className="text-[9px] text-gray-400">Done deals</div>
                    </div>
                  </Link>

                  <Link
                    to="/predictions"
                    onClick={() => setMenuOpen(false)}
                    className={`p-3 rounded-xl border transition-all flex items-center gap-2.5 ${
                      isActive('/predictions')
                        ? 'bg-[#00b341]/15 border-[#00b341] text-white shadow-sm'
                        : 'bg-[#121220] border-[#1e1e32] text-gray-300 hover:text-white hover:border-gray-600'
                    }`}
                  >
                    <div className="w-8 h-8 rounded-lg bg-purple-500/10 text-purple-400 flex items-center justify-center shrink-0">
                      <Target size={16} />
                    </div>
                    <div className="min-w-0">
                      <div className="text-xs font-bold truncate">Predictions</div>
                      <div className="text-[9px] text-purple-400 font-semibold">Play &amp; Win</div>
                    </div>
                  </Link>

                  <Link
                    to="/quiz"
                    onClick={() => setMenuOpen(false)}
                    className={`p-3 rounded-xl border transition-all flex items-center gap-2.5 ${
                      isActive('/quiz')
                        ? 'bg-[#00b341]/15 border-[#00b341] text-white shadow-sm'
                        : 'bg-[#121220] border-[#1e1e32] text-gray-300 hover:text-white hover:border-gray-600'
                    }`}
                  >
                    <div className="w-8 h-8 rounded-lg bg-cyan-500/10 text-cyan-400 flex items-center justify-center shrink-0">
                      <HelpCircle size={16} />
                    </div>
                    <div className="min-w-0">
                      <div className="text-xs font-bold truncate">Football Quiz</div>
                      <div className="text-[9px] text-gray-400">Test IQ</div>
                    </div>
                  </Link>
                </div>
              </div>

              {/* SECTION: MEDIA & ENTERTAINMENT */}
              <div>
                <div className="flex items-center gap-1.5 px-1 mb-2">
                  <span className="text-[10px] font-black uppercase tracking-widest text-[#00b341]">🎧 Media &amp; News</span>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <Link
                    to="/news"
                    onClick={() => setMenuOpen(false)}
                    className={`p-2.5 rounded-xl border text-center transition-all flex flex-col items-center justify-center gap-1.5 ${
                      isActive('/news')
                        ? 'bg-[#00b341]/15 border-[#00b341] text-white'
                        : 'bg-[#121220] border-[#1e1e32] text-gray-300 hover:text-white'
                    }`}
                  >
                    <div className="w-8 h-8 rounded-lg bg-indigo-500/10 text-indigo-400 flex items-center justify-center">
                      <Newspaper size={16} />
                    </div>
                    <span className="text-xs font-bold">News</span>
                  </Link>

                  <Link
                    to="/videos"
                    onClick={() => setMenuOpen(false)}
                    className={`p-2.5 rounded-xl border text-center transition-all flex flex-col items-center justify-center gap-1.5 ${
                      isActive('/videos')
                        ? 'bg-[#00b341]/15 border-[#00b341] text-white'
                        : 'bg-[#121220] border-[#1e1e32] text-gray-300 hover:text-white'
                    }`}
                  >
                    <div className="w-8 h-8 rounded-lg bg-rose-500/10 text-rose-400 flex items-center justify-center">
                      <Tv size={16} />
                    </div>
                    <span className="text-xs font-bold">Videos</span>
                  </Link>

                  <Link
                    to="/mixes"
                    onClick={() => setMenuOpen(false)}
                    className={`p-2.5 rounded-xl border text-center transition-all flex flex-col items-center justify-center gap-1.5 ${
                      isActive('/mixes')
                        ? 'bg-[#00b341]/15 border-[#00b341] text-white'
                        : 'bg-[#121220] border-[#1e1e32] text-gray-300 hover:text-white'
                    }`}
                  >
                    <div className="w-8 h-8 rounded-lg bg-orange-500/10 text-orange-400 flex items-center justify-center">
                      <Headphones size={16} />
                    </div>
                    <span className="text-xs font-bold">DJ Mixes</span>
                  </Link>
                </div>
              </div>

              {/* SECTION: STORE & COMMUNITY */}
              <div>
                <div className="flex items-center gap-1.5 px-1 mb-2">
                  <span className="text-[10px] font-black uppercase tracking-widest text-[#00b341]">🛍️ Store &amp; Platform</span>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <Link
                    to="/shop"
                    onClick={() => setMenuOpen(false)}
                    className={`p-3 rounded-xl border transition-all flex items-center gap-2.5 ${
                      isActive('/shop')
                        ? 'bg-[#00b341]/15 border-[#00b341] text-white shadow-sm'
                        : 'bg-[#121220] border-[#1e1e32] text-gray-300 hover:text-white hover:border-gray-600'
                    }`}
                  >
                    <div className="w-8 h-8 rounded-lg bg-lime-500/10 text-lime-400 flex items-center justify-center shrink-0">
                      <ShoppingBag size={16} />
                    </div>
                    <div className="min-w-0">
                      <div className="text-xs font-bold truncate">Official Store</div>
                      <div className="text-[9px] text-gray-400">Jerseys &amp; Hardware</div>
                    </div>
                  </Link>

                  <Link
                    to="/tip"
                    onClick={() => setMenuOpen(false)}
                    className={`p-3 rounded-xl border transition-all flex items-center gap-2.5 ${
                      isActive('/tip')
                        ? 'bg-amber-500/15 border-amber-500 text-white shadow-sm'
                        : 'bg-[#121220] border-[#1e1e32] text-gray-300 hover:text-white hover:border-gray-600'
                    }`}
                  >
                    <div className="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-400 flex items-center justify-center shrink-0">
                      <Coffee size={16} />
                    </div>
                    <div className="min-w-0">
                      <div className="text-xs font-bold truncate flex items-center gap-1">
                        <span>Send Tip</span>
                        <span className="text-[8px] px-1 rounded bg-amber-500/20 text-amber-400 font-bold">☕</span>
                      </div>
                      <div className="text-[9px] text-amber-400 font-semibold">Support DJ &amp; Site</div>
                    </div>
                  </Link>

                  <Link
                    to="/advertise"
                    onClick={() => setMenuOpen(false)}
                    className={`p-3 rounded-xl border transition-all flex items-center gap-2.5 ${
                      isActive('/advertise')
                        ? 'bg-[#00b341]/15 border-[#00b341] text-white shadow-sm'
                        : 'bg-[#121220] border-[#1e1e32] text-gray-300 hover:text-white hover:border-gray-600'
                    }`}
                  >
                    <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-[#00b341] flex items-center justify-center shrink-0">
                      <Megaphone size={16} />
                    </div>
                    <div className="min-w-0">
                      <div className="text-xs font-bold truncate">Advertise</div>
                      <div className="text-[9px] text-gray-400">Promote your brand</div>
                    </div>
                  </Link>

                  <Link
                    to="/east-africa"
                    onClick={() => setMenuOpen(false)}
                    className={`p-3 rounded-xl border transition-all flex items-center gap-2.5 ${
                      isActive('/east-africa')
                        ? 'bg-[#00b341]/15 border-[#00b341] text-white shadow-sm'
                        : 'bg-[#121220] border-[#1e1e32] text-gray-300 hover:text-white hover:border-gray-600'
                    }`}
                  >
                    <div className="w-8 h-8 rounded-lg bg-teal-500/10 text-teal-400 flex items-center justify-center shrink-0">
                      <Globe size={16} />
                    </div>
                    <div className="min-w-0">
                      <div className="text-xs font-bold truncate">East Africa</div>
                      <div className="text-[9px] text-gray-400">FKF &amp; CECAFA</div>
                    </div>
                  </Link>
                </div>
              </div>

              {/* SECTION: ABOUT & CONTACT */}
              <div className="flex items-center gap-2 pt-1 text-xs">
                <Link
                  to="/about"
                  onClick={() => setMenuOpen(false)}
                  className="flex-1 py-2.5 px-3 rounded-xl bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white flex items-center justify-center gap-1.5 transition-colors"
                >
                  <Info size={13} />
                  <span>About Us</span>
                </Link>
                <Link
                  to="/contact"
                  onClick={() => setMenuOpen(false)}
                  className="flex-1 py-2.5 px-3 rounded-xl bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white flex items-center justify-center gap-1.5 transition-colors"
                >
                  <Mail size={13} />
                  <span>Contact &amp; Booking</span>
                </Link>
              </div>
            </div>

            {/* 4. Language, Currency & Theme Controls Drawer Footer */}
            <div className="mt-3 mx-3 p-4 rounded-2xl border border-white/10 bg-[#0e0e1a] shadow-xl space-y-3.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black uppercase tracking-wider text-gray-300 flex items-center gap-1.5" style={{ fontFamily: 'Big Shoulders Display', letterSpacing: '0.5px' }}>
                  <Coins size={14} className="text-[#00b341]" /> Regional Preferences
                </span>
                {/* Segment Switcher */}
                <div className="flex rounded-lg p-0.5 bg-black/40 border border-white/5 text-[11px] font-bold">
                  <button
                    type="button"
                    onClick={() => setDrawerPrefTab('currency')}
                    className={`px-2.5 py-1 rounded-md transition-all ${
                      drawerPrefTab === 'currency'
                        ? 'bg-[#00b341] text-black shadow-sm'
                        : 'text-gray-400 hover:text-white'
                    }`}
                  >
                    Currency ({currency})
                  </button>
                  <button
                    type="button"
                    onClick={() => setDrawerPrefTab('language')}
                    className={`px-2.5 py-1 rounded-md transition-all ${
                      drawerPrefTab === 'language'
                        ? 'bg-[#00b341] text-black shadow-sm'
                        : 'text-gray-400 hover:text-white'
                    }`}
                  >
                    Language ({lang.toUpperCase()})
                  </button>
                </div>
              </div>

              {/* Tab 1: Currency Cards */}
              {drawerPrefTab === 'currency' ? (
                <div className="grid grid-cols-2 gap-2">
                  {CURRENCIES.map(c => {
                    const selected = currency === c.code
                    return (
                      <button
                        key={c.code}
                        type="button"
                        onClick={() => setCurrency(c.code)}
                        className={`p-3 rounded-xl border text-left transition-all relative flex flex-col justify-between ${
                          selected
                            ? 'bg-[#00b341]/15 border-[#00b341] text-white shadow-lg shadow-[#00b341]/10 ring-1 ring-[#00b341]'
                            : 'bg-[#131322] border-[#1e1e32] text-gray-400 hover:text-white hover:border-gray-600'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs font-black text-white font-mono">{c.code}</span>
                          <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold ${selected ? 'bg-[#00b341] text-black' : 'bg-white/5 text-gray-400'}`}>
                            {c.symbol}
                          </span>
                        </div>
                        <span className="text-[10px] text-gray-400 truncate">{c.name}</span>
                        {selected && (
                          <div className="absolute top-2 right-2 w-2 h-2 rounded-full bg-[#00b341] animate-ping" />
                        )}
                      </button>
                    )
                  })}
                </div>
              ) : (
                /* Tab 2: Language Cards */
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {LANGS.map(l => {
                    const selected = lang === l.code
                    return (
                      <button
                        key={l.code}
                        type="button"
                        onClick={() => setLang(l.code)}
                        className={`p-2.5 rounded-xl border text-left transition-all flex items-center justify-between ${
                          selected
                            ? 'bg-[#00b341]/15 border-[#00b341] text-white shadow-lg shadow-[#00b341]/10 ring-1 ring-[#00b341]'
                            : 'bg-[#131322] border-[#1e1e32] text-gray-400 hover:text-white hover:border-gray-600'
                        }`}
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="text-base">{l.flag}</span>
                          <div className="min-w-0">
                            <div className="text-xs font-bold text-white truncate">{l.name}</div>
                            <div className="text-[9px] text-gray-400 font-mono">{l.label}</div>
                          </div>
                        </div>
                        {selected && <Check size={14} className="text-[#00b341] shrink-0" />}
                      </button>
                    )
                  })}
                </div>
              )}

              {/* Appearance Mode */}
              <div className="pt-2.5 border-t border-white/5 flex items-center justify-between">
                <span className="text-xs text-gray-400">Appearance Theme</span>
                <button
                  type="button"
                  onClick={toggleDark}
                  className="px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-xs font-bold text-white flex items-center gap-2 transition-colors border border-white/10"
                >
                  {darkMode ? (
                    <>
                      <Sun size={13} className="text-amber-400" />
                      <span>Dark Theme</span>
                    </>
                  ) : (
                    <>
                      <Moon size={13} className="text-blue-400" />
                      <span>Light Theme</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
      </header>

      {/* Fullscreen Search Overlay */}
      {searchOpen && (
        <div className="fixed inset-0 z-[100] flex items-start justify-center pt-20 px-4 backdrop-blur-md" style={{ background: 'rgba(0,0,0,0.85)' }} onClick={() => setSearchOpen(false)}>
          <div className="w-full max-w-2xl" onClick={e => e.stopPropagation()}>
            <form
              onSubmit={e => {
                e.preventDefault()
                handleSearchSubmit(searchQ)
              }}
              className="flex items-center gap-3 rounded-2xl px-4 py-3.5 shadow-2xl border border-[#00b341]/50"
              style={{ background: '#131320' }}
            >
              <SearchIcon size={20} className="text-[#00b341]" />
              <input
                autoFocus
                value={searchQ}
                onChange={e => setSearchQ(e.target.value)}
                placeholder={t('search') + ' matches, clubs, news, jerseys, mixes...'}
                className="flex-1 bg-transparent text-white text-base sm:text-lg outline-none placeholder:text-gray-500"
              />
              <button
                type="submit"
                className="px-3 py-1.5 text-xs font-black text-black rounded-lg transition-all"
                style={{ background: '#00b341' }}
              >
                Search
              </button>
              <button
                type="button"
                onClick={() => setSearchOpen(false)}
                className="text-gray-400 hover:text-white transition-colors text-xs font-semibold px-2 py-1"
              >
                {t('close')}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Dedicated Mobile Language & Currency Modal / Bottom Sheet */}
      {prefModalOpen && (
        <div
          className="fixed inset-0 z-[110] flex items-end sm:items-center justify-center p-0 sm:p-4 backdrop-blur-md"
          style={{ background: 'rgba(0,0,0,0.8)' }}
          onClick={() => setPrefModalOpen(false)}
        >
          <div
            className="w-full max-w-md rounded-t-3xl sm:rounded-3xl border border-white/10 p-5 shadow-2xl animate-slideUp sm:animate-scaleIn"
            style={{ background: '#111122' }}
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-white/10 mb-4">
              <div className="flex items-center gap-2">
                <Coins size={18} className="text-[#00b341]" />
                <h3 className="text-base font-black text-white" style={{ fontFamily: 'Big Shoulders Display' }}>
                  Language &amp; Currency Settings
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setPrefModalOpen(false)}
                className="p-1 text-gray-400 hover:text-white rounded-lg hover:bg-white/10 transition-colors"
              >
                <CloseIcon size={18} />
              </button>
            </div>

            {/* Currency Section */}
            <div className="mb-5">
              <div className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-2 flex items-center justify-between">
                <span>Select Currency</span>
                <span className="text-[#00b341] font-mono font-black">{currency} Active</span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {CURRENCIES.map(c => {
                  const selected = currency === c.code
                  return (
                    <button
                      key={c.code}
                      type="button"
                      onClick={() => {
                        setCurrency(c.code)
                      }}
                      className={`p-3 rounded-xl border text-left transition-all ${
                        selected
                          ? 'bg-[#00b341]/20 border-[#00b341] text-white ring-1 ring-[#00b341]'
                          : 'bg-[#18182c] border-[#222238] text-gray-400 hover:text-white'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-0.5">
                        <span className="text-xs font-black text-white font-mono">{c.code}</span>
                        <span className="text-xs font-bold text-[#00b341]">{c.symbol}</span>
                      </div>
                      <div className="text-[10px] text-gray-400">{c.name}</div>
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Language Section */}
            <div className="mb-4">
              <div className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-2 flex items-center justify-between">
                <span>Select Language</span>
                <span className="text-[#00b341] font-bold">{LANGS.find(l => l.code === lang)?.name}</span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {LANGS.map(l => {
                  const selected = lang === l.code
                  return (
                    <button
                      key={l.code}
                      type="button"
                      onClick={() => {
                        setLang(l.code)
                      }}
                      className={`p-2.5 rounded-xl border text-left transition-all flex items-center justify-between ${
                        selected
                          ? 'bg-[#00b341]/20 border-[#00b341] text-white ring-1 ring-[#00b341]'
                          : 'bg-[#18182c] border-[#222238] text-gray-400 hover:text-white'
                      }`}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="text-lg">{l.flag}</span>
                        <div className="min-w-0">
                          <div className="text-xs font-bold text-white truncate">{l.name}</div>
                          <div className="text-[9px] text-gray-400 uppercase">{l.label}</div>
                        </div>
                      </div>
                      {selected && <Check size={14} className="text-[#00b341] shrink-0" />}
                    </button>
                  )
                })}
              </div>
            </div>

            <button
              type="button"
              onClick={() => setPrefModalOpen(false)}
              className="w-full py-3 rounded-xl text-xs font-black text-black transition-all hover:opacity-90 shadow-lg mt-2"
              style={{ background: '#00b341' }}
            >
              Done / Save Preferences
            </button>
          </div>
        </div>
      )}

      <CartDrawer open={cartOpen} onClose={() => setCartOpen(false)} />

      {/* Backdrop for click-away */}
      {(langOpen || currencyOpen || accountOpen) && (
        <div className="fixed inset-0 z-40" onClick={() => { setLangOpen(false); setCurrencyOpen(false); setAccountOpen(false) }} />
      )}
    </>
  )
}

