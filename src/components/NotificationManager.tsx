import { useState, useEffect, useRef } from 'react'

export interface SiteNotification {
  id: string
  title: string
  body: string
  time: string
  read: boolean
  icon?: string
}

const STORAGE_KEY = 'flowerzfc_notifications'

function loadNotifications(): SiteNotification[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) return JSON.parse(raw)
  } catch { /* ignore */ }
  // Default seed notifications
  return [
    { id: 'n1', title: '⚽ GOAL! Arsenal 1-0 Chelsea', body: "Bukayo Saka fires in from 20 yards — 23'", time: '2m ago', read: false, icon: '⚽' },
    { id: 'n2', title: '🔴 RED CARD: Liverpool vs Man City', body: "Phil Foden dismissed after a second yellow — 67'", time: '18m ago', read: false, icon: '🔴' },
    { id: 'n3', title: '📰 OFFICIAL: Vinicius Jr signs for Man City', body: 'Record €200m deal confirmed by both clubs', time: '1h ago', read: true, icon: '📰' },
    { id: 'n4', title: '⏱️ FT: Real Madrid 3-1 Barcelona', body: 'El Clásico result — Bellingham hat-trick', time: '3h ago', read: true, icon: '⏱️' },
  ]
}

export function sendGoalNotification(homeTeam: string, awayTeam: string, scorer: string, minute: number) {
  const title = `⚽ GOAL! ${homeTeam} vs ${awayTeam}`
  const body = `${scorer} scores — ${minute}'`

  // Browser Push Notification
  if (Notification.permission === 'granted') {
    new Notification(title, { body, icon: '/favicon.ico' })
  }

  // Add to in-app feed
  const n: SiteNotification = {
    id: `n-${Date.now()}`,
    title,
    body,
    time: 'Just now',
    read: false,
    icon: '⚽',
  }
  const existing = loadNotifications()
  const updated = [n, ...existing].slice(0, 50) // keep max 50
  localStorage.setItem(STORAGE_KEY, JSON.stringify(updated))
  window.dispatchEvent(new Event('flowerzfc_notifications_updated'))
}

export default function NotificationManager() {
  const [open, setOpen] = useState(false)
  const [notifications, setNotifications] = useState<SiteNotification[]>(loadNotifications)
  const [permGranted, setPermGranted] = useState(Notification.permission === 'granted')
  const panelRef = useRef<HTMLDivElement>(null)

  const unread = notifications.filter(n => !n.read).length

  // Persist & reload on external updates
  useEffect(() => {
    const handler = () => setNotifications(loadNotifications())
    window.addEventListener('flowerzfc_notifications_updated', handler)
    return () => window.removeEventListener('flowerzfc_notifications_updated', handler)
  }, [])

  // Persist when changed
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(notifications))
  }, [notifications])

  // Close on outside click
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    if (open) document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [open])

  const requestPermission = async () => {
    const result = await Notification.requestPermission()
    setPermGranted(result === 'granted')
  }

  const markAllRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })))
  }

  const clearAll = () => {
    setNotifications([])
  }

  const markRead = (id: string) => {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n))
  }

  return (
    <div ref={panelRef} className="relative" style={{ zIndex: 1000 }}>
      {/* Bell Button */}
      <button
        onClick={() => { setOpen(o => !o); if (!open) markAllRead() }}
        className="relative flex items-center justify-center w-9 h-9 rounded-full transition-all hover:bg-white/10"
        title="Notifications"
        aria-label="Notifications"
      >
        <span className="text-lg">🔔</span>
        {unread > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 px-0.5 rounded-full text-[10px] font-black flex items-center justify-center text-black"
            style={{ background: '#00b341' }}>
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      {/* Dropdown Panel */}
      {open && (
        <div
          className="absolute right-0 mt-2 w-80 rounded-2xl border border-white/10 shadow-2xl overflow-hidden"
          style={{ background: '#131320', top: '100%' }}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-white/5">
            <span className="font-black text-sm text-white" style={{ fontFamily: 'Big Shoulders Display' }}>
              🔔 Notifications
            </span>
            <div className="flex items-center gap-2">
              {!permGranted && (
                <button
                  onClick={requestPermission}
                  className="text-[10px] font-bold px-2 py-0.5 rounded-full border border-emerald-500/40 text-emerald-400 hover:bg-emerald-500/10"
                >
                  Allow Push
                </button>
              )}
              <button onClick={clearAll} className="text-[10px] text-gray-500 hover:text-gray-300">Clear All</button>
            </div>
          </div>

          {/* List */}
          <div className="max-h-80 overflow-y-auto divide-y divide-white/5">
            {notifications.length === 0 ? (
              <div className="p-6 text-center text-gray-500 text-xs">No notifications yet</div>
            ) : (
              notifications.map(n => (
                <button
                  key={n.id}
                  onClick={() => markRead(n.id)}
                  className={`w-full text-left px-4 py-3 flex items-start gap-3 transition-colors hover:bg-white/[0.03] ${!n.read ? 'bg-emerald-500/5' : ''}`}
                >
                  <span className="text-xl shrink-0 mt-0.5">{n.icon || '🔔'}</span>
                  <div className="min-w-0 flex-1">
                    <p className={`text-xs font-bold leading-snug ${!n.read ? 'text-white' : 'text-gray-300'}`}>{n.title}</p>
                    <p className="text-[11px] text-gray-400 mt-0.5 leading-snug truncate">{n.body}</p>
                    <p className="text-[10px] text-gray-600 mt-1">{n.time}</p>
                  </div>
                  {!n.read && <span className="w-2 h-2 rounded-full shrink-0 mt-1.5" style={{ background: '#00b341' }} />}
                </button>
              ))
            )}
          </div>

          {/* Footer */}
          {!permGranted && (
            <div className="px-4 py-3 border-t border-white/5 bg-emerald-500/5">
              <p className="text-[11px] text-emerald-400 text-center">
                Enable push notifications to get instant goal alerts 🔔
              </p>
              <button
                onClick={requestPermission}
                className="w-full mt-2 py-2 rounded-lg text-xs font-bold text-black"
                style={{ background: '#00b341' }}
              >
                Enable Notifications
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
