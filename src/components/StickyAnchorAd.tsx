import { useState } from 'react'
import AdBanner from './AdBanner'

export default function StickyAnchorAd() {
  const [dismissed, setDismissed] = useState(false)

  if (dismissed) return null

  return (
    <div className="fixed bottom-0 left-0 right-0 z-[9990] flex items-center justify-center p-1.5 shadow-2xl pointer-events-auto transition-all"
      style={{
        background: 'rgba(12, 12, 20, 0.95)',
        backdropFilter: 'blur(12px)',
        borderTop: '1px solid #1e1e32',
      }}
    >
      <div className="relative flex items-center justify-center w-full max-w-screen-lg mx-auto px-4">
        {/* AdSlot */}
        <div className="hidden sm:block">
          <AdBanner size="leaderboard" label="Sponsored — Anchor Ad" />
        </div>
        <div className="block sm:hidden">
          <AdBanner size="mobile" label="Sponsored — Mobile Anchor" />
        </div>

        {/* Close Button */}
        <button
          onClick={() => setDismissed(true)}
          className="absolute right-2 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-[#1e1e32] hover:bg-red-600 text-gray-400 hover:text-white text-xs font-bold flex items-center justify-center transition-colors"
          title="Close Ad"
        >
          ✕
        </button>
      </div>
    </div>
  )
}
