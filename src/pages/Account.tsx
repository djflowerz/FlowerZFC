import { useState, useRef } from 'react'
import { Link, useParams, Navigate } from 'react-router-dom'
import { useApp } from '../context/AppContext'
import { uploadAvatar, upsertProfile } from '../services/supabaseClient'

const SECTIONS = [
  { to: '/account/teams', label: 'My Teams', icon: '⚽' },
  { to: '/account/saved', label: 'Saved Articles', icon: '📄' },
  { to: '/account/predictions', label: 'My Predictions', icon: '🎯' },
  { to: '/account/settings', label: 'Settings', icon: '⚙️' },
]

const NOTIFICATION_KEYS = ['goalAlerts', 'commentReplies', 'breakingTransferNews', 'newsletter'] as const
type NotificationKey = typeof NOTIFICATION_KEYS[number]
const NOTIFICATION_LABELS: Record<NotificationKey, string> = {
  goalAlerts: 'Goal alerts',
  commentReplies: 'Comment replies',
  breakingTransferNews: 'Breaking transfer news',
  newsletter: 'Newsletter',
}
const NOTIF_STORAGE_KEY = 'flowerzfc_notification_prefs'

function loadNotificationPrefs(): Record<NotificationKey, boolean> {
  try {
    const raw = localStorage.getItem(NOTIF_STORAGE_KEY)
    if (raw) return JSON.parse(raw)
  } catch { /* ignore */ }
  return { goalAlerts: true, commentReplies: true, breakingTransferNews: true, newsletter: false }
}

export default function Account() {
  const { section } = useParams()
  const { user, logout, t, refreshProfile } = useApp()

  const [name, setName] = useState(user?.name || '')
  const [email, setEmail] = useState(user?.email || '')
  const [saving, setSaving] = useState(false)
  const [saveMsg, setSaveMsg] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [notifPrefs, setNotifPrefs] = useState(loadNotificationPrefs)
  const fileInputRef = useRef<HTMLInputElement>(null)

  if (!user) return <Navigate to="/login?from=/account" replace />

  const handleAvatarClick = () => fileInputRef.current?.click()

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploadError(null)

    if (!file.type.startsWith('image/')) {
      setUploadError('Please select an image file.')
      return
    }
    if (file.size > 5 * 1024 * 1024) {
      setUploadError('Image must be under 5MB.')
      return
    }

    setUploading(true)
    const { url, error } = await uploadAvatar(user.id, file)
    setUploading(false)

    if (error || !url) {
      setUploadError('Upload failed. Please try again.')
      return
    }

    await refreshProfile()
  }

  const handleSaveChanges = async () => {
    setSaving(true)
    setSaveMsg(null)
    const { error } = await upsertProfile(user.id, email, name)
    setSaving(false)
    if (error) {
      setSaveMsg('Could not save changes. Please try again.')
    } else {
      setSaveMsg('Saved!')
      await refreshProfile()
      setTimeout(() => setSaveMsg(null), 3000)
    }
  }

  const toggleNotif = (key: NotificationKey) => {
    const next = { ...notifPrefs, [key]: !notifPrefs[key] }
    setNotifPrefs(next)
    localStorage.setItem(NOTIF_STORAGE_KEY, JSON.stringify(next))
  }

  return (
    <div className="max-w-screen-lg mx-auto px-4 py-8">
      <h1 className="text-4xl font-black text-white mb-6" style={{ fontFamily: 'Big Shoulders Display' }}>My Account</h1>
      <div className="grid md:grid-cols-4 gap-6">
        {/* Sidebar */}
        <div className="md:col-span-1">
          <div className="rounded-lg p-4" style={{ background: '#131320', border: '1px solid #1e1e32' }}>
            <div className="text-center mb-4 pb-4 border-b" style={{ borderColor: '#1e1e32' }}>
              <button
                onClick={handleAvatarClick}
                disabled={uploading}
                className="w-16 h-16 rounded-full mx-auto mb-2 flex items-center justify-center text-3xl relative overflow-hidden group cursor-pointer"
                style={{ background: '#1a1a28' }}
                title="Click to change avatar"
              >
                {user.avatar_url ? (
                  <img src={user.avatar_url} alt={user.name} className="w-full h-full object-cover" />
                ) : (
                  <span>👤</span>
                )}
                <div className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity text-xs">
                  {uploading ? '...' : '✏️'}
                </div>
              </button>
              <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} />
              {uploadError && <p className="text-xs text-red-400 mb-2">{uploadError}</p>}
              <p className="font-bold text-white">{user.name}</p>
              <p className="text-xs text-gray-500">{user.email}</p>
            </div>
            <nav className="space-y-1">
              {SECTIONS.map(s => (
                <Link key={s.to} to={s.to} className={`flex items-center gap-2 px-3 py-2 rounded text-sm transition-colors ${section === s.to.split('/').pop() ? 'text-white font-semibold' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}
                  style={section === s.to.split('/').pop() ? { background: '#1e1e32' } : {}}>
                  <span>{s.icon}</span> {s.label}
                </Link>
              ))}
              <button onClick={logout} className="w-full flex items-center gap-2 px-3 py-2 rounded text-sm text-red-400 hover:bg-white/5 transition-colors mt-2">
                🚪 {t('logout')}
              </button>
            </nav>
          </div>
        </div>

        {/* Content */}
        <div className="md:col-span-3 rounded-lg p-6" style={{ background: '#131320', border: '1px solid #1e1e32' }}>
          {(!section || section === 'teams') && (
            <div>
              <h2 className="text-xl font-black text-white mb-4" style={{ fontFamily: 'Big Shoulders Display' }}>{t('myTeams')}</h2>
              <p className="text-sm text-gray-500">You haven't followed any teams yet. Visit a team's page and tap "Follow" to see them here.</p>
            </div>
          )}
          {section === 'saved' && (
            <div>
              <h2 className="text-xl font-black text-white mb-4" style={{ fontFamily: 'Big Shoulders Display' }}>{t('savedArticles')}</h2>
              <p className="text-sm text-gray-500">No saved articles yet. Start bookmarking articles to see them here.</p>
            </div>
          )}
          {section === 'predictions' && (
            <div>
              <h2 className="text-xl font-black text-white mb-4" style={{ fontFamily: 'Big Shoulders Display' }}>{t('myPredictions')}</h2>
              <p className="text-sm text-gray-500">You haven't made any predictions yet. Head to the Predictions section to get started.</p>
            </div>
          )}
          {section === 'settings' && (
            <div>
              <h2 className="text-xl font-black text-white mb-6" style={{ fontFamily: 'Big Shoulders Display' }}>{t('settings')}</h2>
              <div className="space-y-6">
                <div>
                  <h3 className="text-sm font-semibold text-gray-400 mb-3">Account</h3>
                  <div className="space-y-3">
                    <input value={name} onChange={e => setName(e.target.value)} className="w-full px-4 py-3 text-sm text-white rounded outline-none focus:ring-1 focus:ring-red-500" style={{ background: '#0c0c14', border: '1px solid #1e1e32' }} placeholder="Full Name" />
                    <input value={email} onChange={e => setEmail(e.target.value)} className="w-full px-4 py-3 text-sm text-white rounded outline-none focus:ring-1 focus:ring-red-500" style={{ background: '#0c0c14', border: '1px solid #1e1e32' }} placeholder="Email" />
                    <div className="flex items-center gap-3">
                      <button onClick={handleSaveChanges} disabled={saving} className="px-4 py-2 text-sm font-bold text-white rounded disabled:opacity-50" style={{ background: '#00b341' }}>
                        {saving ? 'Saving...' : 'Save Changes'}
                      </button>
                      {saveMsg && <span className="text-xs text-gray-400">{saveMsg}</span>}
                    </div>
                  </div>
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-gray-400 mb-3">Notifications</h3>
                  {NOTIFICATION_KEYS.map(key => (
                    <label key={key} className="flex items-center justify-between py-2 cursor-pointer">
                      <span className="text-sm text-gray-300">{NOTIFICATION_LABELS[key]}</span>
                      <div
                        onClick={() => toggleNotif(key)}
                        className="w-10 h-5 rounded-full relative cursor-pointer transition-colors"
                        style={{ background: notifPrefs[key] ? '#00b341' : '#2a2a3e' }}
                      >
                        <div className="absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all" style={{ left: notifPrefs[key] ? '22px' : '2px' }} />
                      </div>
                    </label>
                  ))}
                </div>
                <div className="pt-4 border-t" style={{ borderColor: '#1e1e32' }}>
                  <button className="px-4 py-2 text-sm font-bold text-red-400 rounded border border-red-900 hover:bg-red-900/20 transition-colors">Delete Account</button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
