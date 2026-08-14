import { useState } from 'react'
import { Link } from 'react-router-dom'

export default function TipButton() {
  const [hovered, setHovered] = useState(false)

  return (
    <div className="fixed bottom-6 right-6 z-[90] flex flex-col items-end gap-2">
      {/* Tooltip label */}
      {hovered && (
        <div
          className="mb-1 px-3 py-1.5 rounded-lg text-xs font-bold text-white shadow-xl pointer-events-none"
          style={{ background: '#131320', border: '1px solid #00b341', whiteSpace: 'nowrap' }}
        >
          ☕ Support FlowerZFC
        </div>
      )}

      <Link
        to="/tip"
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        className="flex items-center justify-center w-14 h-14 rounded-full shadow-2xl transition-all hover:scale-110 active:scale-95"
        style={{ background: '#00b341' }}
        aria-label="Send a tip to support FlowerZFC"
      >
        <span className="text-2xl">☕</span>
      </Link>
    </div>
  )
}
