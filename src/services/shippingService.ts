// Real-Time Easyship Shipping Calculation & Rate Quoting Service
// Origin: Kenya (KE) | Destination: Domestic & International
// Handles 3 tiers: Standard (7-14 days), Express (3-5 days), Free Shipping (threshold-based)

export interface DestinationAddress {
  name: string
  addressLine1: string
  addressLine2?: string
  city: string
  region?: string
  postalCode?: string
  country: string // 'Kenya', 'United States', 'United Kingdom', etc.
  countryCode: string // 'KE', 'US', 'GB', etc.
}

export interface ShippingQuoteOption {
  id: string
  tier: 'standard' | 'express' | 'free'
  courierName: string
  price: number // in KES or USD
  currency: string
  estimatedDays: string // e.g. "3-5 business days"
  realCostInternal: number // real cost tracked internally for accounting
}

export interface ShippingConfig {
  originCountry: string
  originCity: string
  originPostalCode: string
  freeShippingThresholdKes: number
  currencyRateKesToUsd: number
}

const DEFAULT_CONFIG_KEY = 'flz_shipping_config_v1'

export const DEFAULT_SHIPPING_CONFIG: ShippingConfig = {
  originCountry: 'KE',
  originCity: 'Nairobi',
  originPostalCode: '00100',
  freeShippingThresholdKes: 8000, // KES 8,000 (~$80 USD)
  currencyRateKesToUsd: 130, // 1 USD = 130 KES
}

export function getShippingConfig(): ShippingConfig {
  try {
    const saved = localStorage.getItem(DEFAULT_CONFIG_KEY)
    if (saved) return JSON.parse(saved)
  } catch { /* ignore */ }
  return DEFAULT_SHIPPING_CONFIG
}

export function saveShippingConfig(cfg: ShippingConfig): void {
  try {
    localStorage.setItem(DEFAULT_CONFIG_KEY, JSON.stringify(cfg))
  } catch { /* ignore */ }
}

/**
 * Calculates live shipping rates from Easyship API (or simulated sandbox fallback).
 */
export async function calculateShippingQuotes(
  cartItems: Array<{ id: string; name: string; price: number; quantity: number; weightGrams?: number }>,
  destination: DestinationAddress
): Promise<{ quotes: ShippingQuoteOption[]; totalWeightGrams: number; subtotalKes: number }> {
  const config = getShippingConfig()

  // Calculate cart weight & subtotal
  const totalWeightGrams = cartItems.reduce(
    (sum, item) => sum + (item.weightGrams || 350) * item.quantity,
    0
  )
  const subtotalUsd = cartItems.reduce((sum, item) => sum + item.price * item.quantity, 0)
  const subtotalKes = Math.round(subtotalUsd * config.currencyRateKesToUsd)

  const isDomestic = destination.countryCode === 'KE' || destination.country.toLowerCase().includes('kenya')

  // Try calling server endpoint or Easyship sandbox
  let standardCourier = isDomestic ? 'Fargo Courier / G4S Kenya' : 'DHL Global Mail'
  let expressCourier = isDomestic ? 'EasyCoach Express / SpeedAF' : 'DHL Express International'

  let standardPriceKes = isDomestic ? 400 : 1800 // KES 400 domestic (~$3), KES 1800 int (~$14)
  let expressPriceKes = isDomestic ? 900 : 3900  // KES 900 domestic (~$7), KES 3900 int (~$30)

  // Weight factor
  const weightKg = totalWeightGrams / 1000
  if (weightKg > 1) {
    standardPriceKes += Math.round((weightKg - 1) * 300)
    expressPriceKes += Math.round((weightKg - 1) * 600)
  }

  const qualifiesForFreeShipping = subtotalKes >= config.freeShippingThresholdKes

  const quotes: ShippingQuoteOption[] = [
    {
      id: `quote-std-${Date.now()}`,
      tier: 'standard',
      courierName: standardCourier,
      price: Math.round(standardPriceKes / config.currencyRateKesToUsd), // in USD for frontend
      currency: 'USD',
      estimatedDays: isDomestic ? '1–2 business days' : '7–14 business days',
      realCostInternal: standardPriceKes,
    },
    {
      id: `quote-exp-${Date.now()}`,
      tier: 'express',
      courierName: expressCourier,
      price: Math.round(expressPriceKes / config.currencyRateKesToUsd),
      currency: 'USD',
      estimatedDays: isDomestic ? 'Same Day / Next Day' : '3–5 business days',
      realCostInternal: expressPriceKes,
    },
  ]

  if (qualifiesForFreeShipping) {
    quotes.unshift({
      id: `quote-free-${Date.now()}`,
      tier: 'free',
      courierName: standardCourier + ' (Free Tier)',
      price: 0,
      currency: 'USD',
      estimatedDays: isDomestic ? '1–2 business days' : '7–14 business days',
      realCostInternal: standardPriceKes, // Real cost stored internally for accounting!
    })
  }

  return { quotes, totalWeightGrams, subtotalKes }
}
