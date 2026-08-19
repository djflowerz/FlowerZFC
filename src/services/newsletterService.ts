// Real-Time Persistent Newsletter & Subscriber Management Service
export interface NewsletterSubscriber {
  id: string
  email: string
  name: string
  joined: string
  status: 'Active' | 'Unsubscribed'
  source: string
  opens: number
  clicks: number
  preferences?: {
    goalAlerts?: boolean
    breakingNews?: boolean
    dailyDigest?: boolean
  }
}

const STORAGE_KEY = 'flowerzfc_newsletter_subscribers'

export function getSubscribers(): NewsletterSubscriber[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw)
      if (Array.isArray(parsed)) return parsed
    }
  } catch { /* ignore */ }
  return []
}

export function isEmailSubscribed(email?: string): boolean {
  if (!email) return false
  const clean = email.trim().toLowerCase()
  const list = getSubscribers()
  const found = list.find(s => s.email.toLowerCase() === clean)
  return found ? found.status === 'Active' : false
}

export function subscribeEmail(
  email: string,
  name?: string,
  source: string = 'Website Widget',
  preferences?: { goalAlerts?: boolean; breakingNews?: boolean; dailyDigest?: boolean }
): { success: boolean; message: string; subscriber: NewsletterSubscriber } {
  const cleanEmail = (email || '').trim().toLowerCase()
  if (!cleanEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
    return {
      success: false,
      message: 'Please provide a valid email address.',
      subscriber: null as any,
    }
  }

  const list = getSubscribers()
  const existingIdx = list.findIndex(s => s.email.toLowerCase() === cleanEmail)
  const nowStr = new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })

  let sub: NewsletterSubscriber

  if (existingIdx >= 0) {
    // Update existing subscription to active
    sub = {
      ...list[existingIdx],
      name: name || list[existingIdx].name || cleanEmail.split('@')[0],
      status: 'Active',
      source: source || list[existingIdx].source,
      preferences: preferences || list[existingIdx].preferences,
    }
    list[existingIdx] = sub
  } else {
    // Create new subscriber
    sub = {
      id: `sub_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      email: cleanEmail,
      name: name || cleanEmail.split('@')[0],
      joined: nowStr,
      status: 'Active',
      source,
      opens: 0,
      clicks: 0,
      preferences: preferences || { goalAlerts: true, breakingNews: true, dailyDigest: true },
    }
    list.unshift(sub)
  }

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list))
    window.dispatchEvent(new CustomEvent('flowerzfc_subscribers_updated', { detail: { subscriber: sub } }))
  } catch { /* ignore */ }

  return {
    success: true,
    message: '🎉 Successfully subscribed to FlowerZFC Newsletter!',
    subscriber: sub,
  }
}

export function unsubscribeEmail(email: string): void {
  const cleanEmail = (email || '').trim().toLowerCase()
  if (!cleanEmail) return
  const list = getSubscribers()
  const updated = list.map(s => s.email.toLowerCase() === cleanEmail ? { ...s, status: 'Unsubscribed' as const } : s)
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated))
    window.dispatchEvent(new CustomEvent('flowerzfc_subscribers_updated'))
  } catch { /* ignore */ }
}

export function deleteSubscriber(id: string): void {
  const list = getSubscribers().filter(s => s.id !== id)
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list))
    window.dispatchEvent(new CustomEvent('flowerzfc_subscribers_updated'))
  } catch { /* ignore */ }
}
