// Site Settings Service
// Central management of dynamic platform settings, customer support contacts, and policy defaults

export interface SiteSettings {
  siteName: string
  tagline: string
  adminEmail: string
  supportEmail: string
  supportPhone1: string
  supportPhone2: string
  assistanceText: string
  shippingText: string
  sizingText: string
  returnsText: string
  timezone: string
  currency: string
  minTipAmount: string
  maxTipAmount: string
  [key: string]: any
}

export const DEFAULT_SITE_SETTINGS: SiteSettings = {
  siteName: 'FlowerZFC',
  tagline: 'Your Global Football Home',
  adminEmail: 'ianmuriithiflowerz@gmail.com',
  supportEmail: 'support@djflowerz.co.ke',
  supportPhone1: '(+254) 712 293 303',
  supportPhone2: '(+254) 789 783 258',
  assistanceText: 'Contact us on (+254) 712293303 or Whatsapp (+254) 789783258, or email support@djflowerz.co.ke for help with your order.',
  shippingText: 'We offer countrywide (Kenya) shipping through G4S courier services at an additional cost of KSh. 400/-. International shipping available via DHL tracked — 14–21 business days.',
  sizingText: 'Fits true to size. Refer to the size chart for chest and length measurements. For jerseys, we recommend sizing up if between sizes.',
  returnsText: 'Unopened / unworn items can be returned within 7 days of delivery. Customised or personalised items are final sale.',
  timezone: 'Africa/Nairobi',
  currency: 'KES',
  minTipAmount: '2',
  maxTipAmount: '5000',
}

export function getSiteSettings(): SiteSettings {
  try {
    const raw = localStorage.getItem('flowerzfc_settings')
    if (raw) {
      return { ...DEFAULT_SITE_SETTINGS, ...JSON.parse(raw) }
    }
  } catch {}
  return { ...DEFAULT_SITE_SETTINGS }
}

export function saveSiteSettings(settings: Partial<SiteSettings>): SiteSettings {
  const current = getSiteSettings()
  const updated = { ...current, ...settings }
  try {
    localStorage.setItem('flowerzfc_settings', JSON.stringify(updated))
  } catch {}
  return updated
}
