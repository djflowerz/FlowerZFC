import { useState, useEffect } from 'react'

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

// Rotate through ad labels for visual variety
const AD_SPONSORS = [
  'Your Ad Here',
  'Advertise with FlowerZFC',
  'Reach 1.2M Football Fans',
  'Book This Space — ads@flowerz.fc',
  'Promote Your Brand Here',
]

export default function AdBanner({ size, label, className = '' }: Props) {
  const cfg = SIZES[size]
  const [sponsor] = useState(() => AD_SPONSORS[Math.floor(Math.random() * AD_SPONSORS.length)])
  const [customAd, setCustomAd] = useState<{ imageUrl?: string; linkUrl?: string } | null>(null)

  useEffect(() => {
    try {
      const raw = localStorage.getItem('flowerzfc_custom_ads')
      if (raw) {
        const parsed = JSON.parse(raw)
        if (parsed[size] && parsed[size].imageUrl) {
          setCustomAd(parsed[size])
        }
      }
    } catch {}
  }, [size])

  if (customAd?.imageUrl) {
    return (
      <a
        href={customAd.linkUrl || '/advertise'}
        target={customAd.linkUrl?.startsWith('http') ? '_blank' : '_self'}
        rel="noopener noreferrer"
        className={`block rounded-xl overflow-hidden relative mx-auto transition-transform hover:scale-[1.01] ${className}`}
        style={{ width: cfg.w, maxWidth: cfg.maxW, height: cfg.h, border: '1px solid #1e1e32' }}
      >
        <img src={customAd.imageUrl} alt="Advertisement" className="w-full h-full object-cover" />
        <span className="absolute top-1 right-1 text-[8px] font-black uppercase text-white bg-black/60 px-1.5 py-0.5 rounded">AD</span>
      </a>
    )
  }

  return (
    <div
      className={`flex flex-col items-center justify-center rounded-xl text-center mx-auto overflow-hidden relative ${className}`}
      style={{
        width: cfg.w,
        maxWidth: cfg.maxW,
        height: cfg.h,
        background: 'linear-gradient(135deg, #0f0f1e 0%, #1a1a2e 50%, #0f1a0f 100%)',
        border: '1px dashed #2a2a40',
      }}
    >
      {/* Subtle pattern overlay */}
      <div className="absolute inset-0 opacity-5"
        style={{
          backgroundImage: 'repeating-linear-gradient(45deg, #00b341 0, #00b341 1px, transparent 0, transparent 50%)',
          backgroundSize: '10px 10px',
        }}
      />

      <div className="relative z-10 px-3">
        <p className="text-[9px] font-black text-gray-600 uppercase tracking-[0.2em] mb-1">Advertisement</p>
        <p className="text-[10px] text-gray-500 font-semibold">{label || sponsor}</p>
        {size !== 'mobile' && (
          <p className="text-[9px] text-gray-700 mt-1 font-mono">{cfg.label}</p>
        )}
        {size === 'rectangle' || size === 'halfpage' || size === 'skyscraper' ? (
          <a
            href="/advertise"
            className="inline-block mt-3 px-3 py-1 text-[9px] font-bold text-[#00b341] border border-[#00b341]/40 rounded-full hover:bg-[#00b341]/10 transition-colors"
          >
            Book This Space →
          </a>
        ) : null}
      </div>
    </div>
  )
}
