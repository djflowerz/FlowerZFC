import React from 'react'

export function SkeletonBox({ className = '', style = {} }: { className?: string; style?: React.CSSProperties }) {
  return (
    <div
      className={`animate-pulse rounded-lg bg-white/5 border border-white/5 relative overflow-hidden ${className}`}
      style={{
        background: 'linear-gradient(90deg, rgba(255,255,255,0.03) 0%, rgba(255,255,255,0.08) 50%, rgba(255,255,255,0.03) 100%)',
        backgroundSize: '200% 100%',
        animation: 'shimmer 1.8s infinite linear',
        ...style,
      }}
    />
  )
}

export function ProductCardSkeleton() {
  return (
    <div className="rounded-2xl overflow-hidden border border-[#1e1e32] bg-[#131320] p-3 space-y-3">
      <SkeletonBox className="w-full h-48 sm:h-56 rounded-xl" />
      <div className="space-y-2 px-1">
        <SkeletonBox className="w-16 h-3 rounded" />
        <SkeletonBox className="w-full h-4 rounded" />
        <SkeletonBox className="w-3/4 h-4 rounded" />
        <div className="flex items-center justify-between pt-2">
          <SkeletonBox className="w-20 h-6 rounded" />
          <SkeletonBox className="w-12 h-4 rounded" />
        </div>
      </div>
    </div>
  )
}

export function ProductGridSkeleton({ count = 8 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-5">
      {Array.from({ length: count }).map((_, i) => (
        <ProductCardSkeleton key={i} />
      ))}
    </div>
  )
}

export function NewsCardSkeleton() {
  return (
    <div className="rounded-2xl overflow-hidden border border-[#1e1e32] bg-[#131320] p-3 space-y-3">
      <SkeletonBox className="w-full h-40 sm:h-48 rounded-xl" />
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <SkeletonBox className="w-14 h-4 rounded-full" />
          <SkeletonBox className="w-20 h-3 rounded" />
        </div>
        <SkeletonBox className="w-full h-5 rounded" />
        <SkeletonBox className="w-4/5 h-4 rounded" />
      </div>
    </div>
  )
}

export function Tooltip({ text, children, position = 'top' }: { text: string; children: React.ReactNode; position?: 'top' | 'bottom' | 'left' | 'right' }) {
  const posClasses = {
    top: 'bottom-full left-1/2 -translate-x-1/2 mb-2',
    bottom: 'top-full left-1/2 -translate-x-1/2 mt-2',
    left: 'right-full top-1/2 -translate-y-1/2 mr-2',
    right: 'left-full top-1/2 -translate-y-1/2 ml-2',
  }[position]

  return (
    <div className="relative group/tooltip inline-flex items-center">
      {children}
      <div
        role="tooltip"
        className={`absolute ${posClasses} pointer-events-none z-50 opacity-0 group-hover/tooltip:opacity-100 transition-all duration-200 scale-95 group-hover/tooltip:scale-100 px-2.5 py-1 text-[10px] font-bold text-white rounded-lg whitespace-nowrap shadow-xl border border-white/10 backdrop-blur-md`}
        style={{ background: 'rgba(17, 17, 34, 0.95)' }}
      >
        {text}
      </div>
    </div>
  )
}
