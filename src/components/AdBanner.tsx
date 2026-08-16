import { useState, useEffect } from 'react'
import { fetchActiveAdForSlot, type AdSlotRow } from '../services/supabaseClient'

interface Props {
  size: 'leaderboard' | 'rectangle' | 'skyscraper' | 'mobile' | 'halfpage' | 'native'
  label?: string
  className?: string
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

export default function AdBanner({ size, label, className = '' }: Props) {
  const cfg = SIZES[size]
  const [sponsor] = useState(() => AD_SPONSORS[Math.floor(Math.random() * AD_SPONSORS.length)])
  const [adsenseCode, setAdsenseCode] = useState<string>('')
  const [liveAd, setLiveAd] = useState<AdSlotRow | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    setLoading(true)

    // Check every page value since ads are matched by size only for now
    fetchActiveAdForSlot('Homepage', SIZE_TO_LABEL[size] || size).then(({ adSlot }) => {
      if (!cancelled) {
        setLiveAd(adSlot)
        setLoading(false)
      }
    })

    try {
      const code = localStorage.getItem('flowerzfc_adsense_code')
      if (code) setAdsenseCode(code)
    } catch {}

    return () => { cancelled = true }
  }, [size])

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

  if (loading) {
    return (
      <div
        className={`rounded-xl overflow-hidden relative mx-auto ${className}`}
        style={{ width: cfg.w, maxWidth: cfg.maxW, height: cfg.h, background: '#0a0a14', border: '1px solid #1e1e32' }}
      />
    )
  }

  if (adsenseCode) {
    return (
      <div
        className={`flex items-center justify-center rounded-xl overflow-hidden relative mx-auto ${className}`}
        style={{ width: cfg.w, maxWidth: cfg.maxW, height: cfg.h, background: '#0a0a14', border: '1px solid #1e1e32' }}
        dangerouslySetInnerHTML={{ __html: adsenseCode }}
      />
    )
  }

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
