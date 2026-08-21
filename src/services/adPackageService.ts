// Persistent Ad Packages & Rate Card Service
// Allows Admin to customize package names, pricing/quotes, target reach, and checklist features

export interface AdPackage {
  id: string
  name: string
  price: string
  period: string
  slots: string
  reach: string
  features: string[]
  popular: boolean
}

export const DEFAULT_AD_PACKAGES: AdPackage[] = [
  {
    id: 'starter',
    name: 'Starter',
    price: 'Custom Quote',
    period: '',
    slots: '300×250 In-Feed',
    reach: 'Targeted Local Reach',
    features: [
      '1 ad placement',
      'In-feed rectangle banner',
      'Monthly performance report',
      'Standard email support',
    ],
    popular: false,
  },
  {
    id: 'growth',
    name: 'Growth',
    price: 'Custom Quote',
    period: '',
    slots: '728×90 + 300×250',
    reach: 'High Volume Reach',
    features: [
      '3 ad placements',
      'Leaderboard + Rectangle',
      'Weekly analytics dashboard',
      'Priority support',
      'Social media mention',
      'A/B creative testing',
    ],
    popular: true,
  },
  {
    id: 'premium',
    name: 'Premium',
    price: 'Custom Quote',
    period: '',
    slots: 'All placements + Homepage',
    reach: 'Maximum Site Impact',
    features: [
      'All ad placements',
      'Homepage takeover option',
      'Sponsored article feature',
      'Newsletter sponsorship slot',
      'Real-time analytics dashboard',
      'Dedicated account manager',
      'Custom creative production',
    ],
    popular: false,
  },
]

const STORAGE_KEY = 'flowerzfc_ad_packages'

export function getAdPackages(): AdPackage[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw)
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed
      }
    }
  } catch {}
  return DEFAULT_AD_PACKAGES
}

export function saveAdPackages(packages: AdPackage[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(packages))
    window.dispatchEvent(new Event('flowerzfc_ad_packages_updated'))
  } catch {}
}
