import { useState, useEffect, useRef } from 'react'
import { useLocation } from 'react-router-dom'
import { fetchActiveAdForSlot, type AdSlotRow } from '../services/supabaseClient'

interface Props {
  size: 'leaderboard' | 'rectangle' | 'skyscraper' | 'mobile' | 'halfpage' | 'native'
  label?: string
  page?: string
  className?: string
  adSlotId?: string // Optional specific Google AdSense Slot ID
}

const SIZES = {
  leaderboard: { w: '100%', maxW: '728px', h: '90px',  label: '728×90 — Leaderboard' },
  rectangle:   { w: '300px', maxW: '100%', h: '250px', label: '300×250 — Medium Rectangle' },
  skyscraper:  { w: '160px', maxW: '160px', h: '600px', label: '160×600 — Wide Skyscraper' },
  halfpage:    { w: '300px', maxW: '100%', h: '600px', label: '300×600 — Half Page' },
  mobile:      { w: '100%', maxW: '320px', h: '50px',  label: '320×50 — Mobile Banner' },
  native:      { w: '100%', maxW: '100%',  h: '120px', label: 'Sponsored Content' },
}

const AD_SPONSORS = [
  'Your Ad Here',
  'Advertise with FlowerZFC',
  'Reach 1.2M Football Fans',
  'Book This Space — ads@flowerz.fc',
  'Promote Your Brand Here',
]

const SIZE_TO_LABEL: Record<string, string> = {
  leaderboard: '728x90',
  rectangle: '300x250',
  skyscraper: '160x600',
  halfpage: '300x600',
  mobile: '320x50',
  native: 'native',
}

function getPageNameFromPath(pathname: string): string {
  const p = pathname.toLowerCase()
  if (p === '/' || p === '/home') return 'Homepage'
  if (p.startsWith('/scores')) return 'Scores'
  if (p.startsWith('/fixtures')) return 'Fixtures'
  if (p.startsWith('/standings')) return 'Standings'
  if (p.startsWith('/news')) return 'News'
  if (p.startsWith('/match/')) return 'Match'
  if (p.startsWith('/article/')) return 'Article'
  if (p.startsWith('/transfers')) return 'Transfers'
  if (p.startsWith('/videos')) return 'Videos'
  if (p.startsWith('/mixes')) return 'Mixes'
  if (p.startsWith('/shop')) return 'Shop'
  if (p.startsWith('/tips')) return 'Tips'
  if (p.startsWith('/fantasy')) return 'Fantasy'
  if (p.startsWith('/quiz')) return 'Quiz'
  return 'All Pages'
}

export default function AdBanner({ size, label, page, className = '', adSlotId }: Props) {
  const cfg = SIZES[size]
  const location = useLocation()
  const [sponsor] = useState(() => AD_SPONSORS[Math.floor(Math.random() * AD_SPONSORS.length)])
  const [adsenseEnabled, setAdsenseEnabled] = useState<boolean>(true)
  const [adsenseCode, setAdsenseCode] = useState<string>('')
  const [liveAd, setLiveAd] = useState<AdSlotRow | null>(null)
  const [loading, setLoading] = useState(true)
  const adRef = useRef<HTMLDivElement>(null)

  const currentPage = page || getPageNameFromPath(location.pathname)

  useEffect(() => {
    let cancelled = false
    setLoading(true)

    // Check if custom AdSense code or toggle is saved in localStorage
    try {
      const savedCode = localStorage.getItem('flowerzfc_adsense_code')
      if (savedCode) setAdsenseCode(savedCode)
      const disabled = localStorage.getItem('flowerzfc_adsense_disabled')
      if (disabled === 'true') setAdsenseEnabled(false)
    } catch {}

    // Fetch active direct sponsorship ad slot for this page & size
    fetchActiveAdForSlot(currentPage, SIZE_TO_LABEL[size] || size).then(({ adSlot }) => {
      if (!cancelled) {
        setLiveAd(adSlot)
        setLoading(false)
      }
    })

    return () => { cancelled = true }
  }, [size, currentPage])

  // Trigger Google AdSense ad initialization when rendered
  useEffect(() => {
    if (!liveAd && adsenseEnabled && adRef.current) {
      try {
        const win = window as any
        if (win.adsbygoogle && Array.isArray(win.adsbygoogle)) {
          win.adsbygoogle.push({})
        }
      } catch (e) {
        // Ads will load when approved by Google
      }
    }
  }, [liveAd, adsenseEnabled])

  // 1. Direct Advertiser Creative (Uploaded Image + Destination Link)
  if (liveAd?.image_url) {
    return (
      <a
        href={liveAd.destination_url || '/advertise'}
        target={liveAd.destination_url?.startsWith('http') ? '_blank' : '_self'}
        rel="noopener noreferrer"
        className={`block rounded-xl overflow-hidden relative mx-auto transition-transform hover:scale-[1.01] ${className}`}
        style={{ width: cfg.w, maxWidth: cfg.maxW, height: cfg.h, border: '1px solid #1e1e32' }}
      >
        <img src={liveAd.image_url} alt="Advertisement" className="w-full h-full object-cover" />
        <span className="absolute top-1 right-1 text-[8px] font-black uppercase text-white bg-black/60 px-1.5 py-0.5 rounded">AD</span>
      </a>
    )
  }

  // 2. Loading Placeholder
  if (loading) {
    return (
      <div
        className={`rounded-xl overflow-hidden relative mx-auto ${className}`}
        style={{ width: cfg.w, maxWidth: cfg.maxW, height: cfg.h, background: '#0a0a14', border: '1px solid #1e1e32' }}
      />
    )
  }

  // 3. Custom HTML / Third-Party Ad Script Code (e.g. from Admin Settings)
  if (adsenseCode) {
    return (
      <div
        className={`flex items-center justify-center rounded-xl overflow-hidden relative mx-auto ${className}`}
        style={{ width: cfg.w, maxWidth: cfg.maxW, height: cfg.h, background: '#0a0a14', border: '1px solid #1e1e32' }}
        dangerouslySetInnerHTML={{ __html: adsenseCode }}
      />
    )
  }

  // 4. Default Google AdSense Responsive Ad Unit (Uses ca-pub-8978122989908133)
  if (adsenseEnabled) {
    return (
      <div
        ref={adRef}
        className={`flex flex-col items-center justify-center rounded-xl overflow-hidden relative mx-auto transition-colors ${className}`}
        style={{ width: cfg.w, maxWidth: cfg.maxW, minHeight: cfg.h, background: '#0a0a14', border: '1px dashed #1e1e32' }}
      >
        <ins
          className="adsbygoogle"
          style={{ display: 'block', width: '100%', height: '100%' }}
          data-ad-client="ca-pub-8978122989908133"
          data-ad-slot={adSlotId || undefined}
          data-ad-format="auto"
          data-full-width-responsive="true"
        />
        <a
          href="/advertise"
          className="absolute inset-0 flex flex-col items-center justify-center hover:bg-white/[.02] transition-colors pointer-events-auto"
          style={{ zIndex: 0 }}
        >
          <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">{label || cfg.label}</span>
          <span className="text-xs text-gray-600 mt-1">{sponsor}</span>
        </a>
      </div>
    )
  }

  // 5. Fallback Placeholder
  return (
    <a
      href="/advertise"
      className={`flex flex-col items-center justify-center rounded-xl overflow-hidden relative mx-auto transition-colors hover:border-[#00b341] ${className}`}
      style={{ width: cfg.w, maxWidth: cfg.maxW, height: cfg.h, background: '#0a0a14', border: '1px dashed #1e1e32' }}
    >
      <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">{label || cfg.label}</span>
      <span className="text-xs text-gray-600 mt-1">{sponsor}</span>
    </a>
  )
}

