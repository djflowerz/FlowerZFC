import { useState, useRef, useEffect } from 'react'
import { Link, useParams, Navigate, useNavigate } from 'react-router-dom'
import { useApp } from '../context/AppContext'
import { Shield, FileText, Target, Settings as SettingsIcon, LogOut, Volume2, Heart, ShoppingBag, Trash2 } from 'lucide-react'
import {
  uploadAvatar, upsertProfile, changePassword, supabase, fetchAllProducts
} from '../services/supabaseClient'
import { getProductPath } from '../services/productUtils'
import { subscribeEmail, unsubscribeEmail, isEmailSubscribed } from '../services/newsletterService'
import { isSoundEnabled, setSoundEnabled, playTestSound } from '../services/audioAlertService'

const SECTIONS = [
  { to: '/account/teams', label: 'My Teams', Icon: Shield },
  { to: '/account/saved', label: 'Saved Articles', Icon: FileText },
  { to: '/account/wishlist', label: 'My Wishlist', Icon: Heart },
  { to: '/account/predictions', label: 'My Predictions', Icon: Target },
  { to: '/account/settings', label: 'Settings', Icon: SettingsIcon },
]

const NOTIFICATION_KEYS = ['goalAlerts', 'commentReplies', 'breakingTransferNews', 'newsletter'] as const
type NotificationKey = typeof NOTIFICATION_KEYS[number]
const NOTIFICATION_LABELS: Record<NotificationKey, string> = {
  goalAlerts: 'Goal alerts',
  commentReplies: 'Comment replies',
  breakingTransferNews: 'Breaking transfer news',
  newsletter: 'Email Newsletter',
}
const NOTIF_STORAGE_KEY = 'flowerzfc_notification_prefs'

function loadNotificationPrefs(userEmail?: string): Record<NotificationKey, boolean> {
  const defaultPrefs = { goalAlerts: true, commentReplies: true, breakingTransferNews: true, newsletter: false }
  try {
    const raw = localStorage.getItem(NOTIF_STORAGE_KEY)
    const parsed = raw ? JSON.parse(raw) : defaultPrefs
    if (userEmail && isEmailSubscribed(userEmail)) {
      parsed.newsletter = true
    }
    return { ...defaultPrefs, ...parsed }
  } catch { /* ignore */ }
  return defaultPrefs
}

const POPULAR_TEAMS = [
  'Arsenal', 'Manchester United', 'Manchester City', 'Liverpool', 'Chelsea',
  'Real Madrid', 'Barcelona', 'Bayern Munich', 'Harambee Stars', 'AFC Leopards', 'Gor Mahia',
]

export default function Account() {
  const { section } = useParams()
  const { user, logout, t, refreshProfile } = useApp()
  const navigate = useNavigate()

  const [name, setName] = useState(user?.name || '')
  const [email, setEmail] = useState(user?.email || '')
  const [saving, setSaving] = useState(false)
  const [saveMsg, setSaveMsg] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [notifPrefs, setNotifPrefs] = useState(() => loadNotificationPrefs(user?.email))
  const [soundOn, setSoundOn] = useState(isSoundEnabled)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [pwSaving, setPwSaving] = useState(false)
  const [pwMsg, setPwMsg] = useState<string | null>(null)
  const [pwError, setPwError] = useState<string | null>(null)

  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [deleteConfirmText, setDeleteConfirmText] = useState('')
  const [deleting, setDeleting] = useState(false)

  const [myTeams, setMyTeams] = useState<{ id: string; team_name: string }[]>([])
  const [teamsLoading, setTeamsLoading] = useState(true)
  const [showAddTeam, setShowAddTeam] = useState(false)
  const [teamSearch, setTeamSearch] = useState('')

  const [savedArticles, setSavedArticles] = useState<any[]>([])
  const [savedLoading, setSavedLoading] = useState(true)

  const [predictions, setPredictions] = useState<any[]>([])
  const [predictionsLoading, setPredictionsLoading] = useState(true)

  const [wishlistItems, setWishlistItems] = useState<any[]>([])
  const [wishlistLoading, setWishlistLoading] = useState(true)

  const loadWishlistData = () => {
    setWishlistLoading(true)
    try {
      const ids: string[] = JSON.parse(localStorage.getItem('flowerzfc_wishlist') || '[]')
      if (ids.length === 0) {
        setWishlistItems([])
        setWishlistLoading(false)
        return
      }
      fetchAllProducts().then(({ products }) => {
        if (products && products.length > 0) {
          const matched = products.filter((p: any) => ids.includes(String(p.id)))
          setWishlistItems(matched)
        } else {
          setWishlistItems([])
        }
      }).finally(() => setWishlistLoading(false))
    } catch {
      setWishlistItems([])
      setWishlistLoading(false)
    }
  }

  const removeWishlistItem = (prodId: string) => {
    try {
      const ids: string[] = JSON.parse(localStorage.getItem('flowerzfc_wishlist') || '[]')
      const updated = ids.filter(id => id !== prodId)
      localStorage.setItem('flowerzfc_wishlist', JSON.stringify(updated))
      setWishlistItems(prev => prev.filter(p => String(p.id) !== prodId))
      window.dispatchEvent(new Event('flowerzfc_wishlist_updated'))
    } catch {}
  }

  useEffect(() => {
    loadWishlistData()
    window.addEventListener('flowerzfc_wishlist_updated', loadWishlistData)
    return () => window.removeEventListener('flowerzfc_wishlist_updated', loadWishlistData)
  }, [])

  useEffect(() => {
    if (!user) return

    supabase.from('user_teams').select('id, team_name').eq('user_id', user.id)
      .then(({ data }: any) => {
        setMyTeams(data || [])
        setTeamsLoading(false)
      })

    supabase.from('saved_articles').select('*').eq('user_id', user.id).order('saved_at', { ascending: false })
      .then(({ data }: any) => {
        setSavedArticles(data || [])
        setSavedLoading(false)
      })

    supabase.from('predictions').select('*').eq('user_id', user.id).order('created_at', { ascending: false })
      .then(({ data }: any) => {
        setPredictions(data || [])
        setPredictionsLoading(false)
      })
  }, [user?.id])

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

  const handleChangePassword = async () => {
    setPwError(null)
    setPwMsg(null)

    if (newPassword.length < 8) {
      setPwError('Password must be at least 8 characters.')
      return
    }
    if (newPassword !== confirmPassword) {
      setPwError("Passwords don't match.")
      return
    }

    setPwSaving(true)
    const { error } = await changePassword(newPassword)
    setPwSaving(false)

    if (error) {
      setPwError(error.message || 'Could not update password.')
    } else {
      setPwMsg('Password updated successfully.')
      setNewPassword('')
      setConfirmPassword('')
      setTimeout(() => setPwMsg(null), 3000)
    }
  }

  const handleDeleteAccount = async () => {
    if (deleteConfirmText !== 'DELETE') return
    setDeleting(true)
    await supabase.from('profiles').delete().eq('id', user.id)
    await logout()
    navigate('/')
  }

  const toggleNotif = (key: NotificationKey) => {
    const nextVal = !notifPrefs[key]
    const next = { ...notifPrefs, [key]: nextVal }
    setNotifPrefs(next)
    localStorage.setItem(NOTIF_STORAGE_KEY, JSON.stringify(next))

    if (key === 'newsletter') {
      if (nextVal) {
        if (user?.email) {
          subscribeEmail(user.email, user.name, 'Account Settings')
        }
      } else {
        if (user?.email) {
          unsubscribeEmail(user.email)
        }
      }
    }
  }

  const toggleSound = () => {
    const next = !soundOn
    setSoundOn(next)
    setSoundEnabled(next)
    if (next) {
      playTestSound()
    }
  }

  const addTeam = async (teamName: string) => {
    const { data, error } = await supabase.from('user_teams').insert({ user_id: user.id, team_name: teamName }).select().single()
    if (!error && data) {
      setMyTeams(prev => [...prev, data])
    }
    setShowAddTeam(false)
    setTeamSearch('')
  }

  const removeTeam = async (id: string) => {
    await supabase.from('user_teams').delete().eq('id', id)
    setMyTeams(prev => prev.filter(t => t.id !== id))
  }

  const removeSavedArticle = async (id: string) => {
    await supabase.from('saved_articles').delete().eq('id', id)
    setSavedArticles(prev => prev.filter(a => a.id !== id))
  }

  const filteredTeamOptions = POPULAR_TEAMS.filter(
    t => !myTeams.some(mt => mt.team_name === t) && t.toLowerCase().includes(teamSearch.toLowerCase())
  )

  const totalPredictions = predictions.length
  const scoredPredictions = predictions.filter(p => p.actual_home_score !== null)
  const correctPredictions = scoredPredictions.filter(
    p => p.predicted_home_score === p.actual_home_score && p.predicted_away_score === p.actual_away_score
  )
  const accuracy = scoredPredictions.length > 0 ? Math.round((correctPredictions.length / scoredPredictions.length) * 100) : 0
  const totalPoints = predictions.reduce((sum, p) => sum + (p.points_earned || 0), 0)

  return (
    <div className="max-w-screen-lg mx-auto px-4 py-8">
      <h1 className="text-4xl font-black text-white mb-6" style={{ fontFamily: 'Big Shoulders Display' }}>My Account</h1>
      <div className="grid md:grid-cols-4 gap-6">
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
                  <s.Icon size={15} strokeWidth={2.5} /> {s.label}
                </Link>
              ))}
              <button onClick={logout} className="w-full flex items-center gap-2 px-3 py-2 rounded text-sm text-red-400 hover:bg-white/5 transition-colors mt-2">
                <LogOut size={15} strokeWidth={2.5} /> {t('logout')}
              </button>
            </nav>
          </div>
        </div>

        <div className="md:col-span-3 rounded-lg p-6" style={{ background: '#131320', border: '1px solid #1e1e32' }}>
          {(!section || section === 'teams') && (
            <div>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-black text-white" style={{ fontFamily: 'Big Shoulders Display' }}>{t('myTeams')}</h2>
                <button onClick={() => setShowAddTeam(v => !v)} className="text-xs font-bold px-3 py-1.5 rounded" style={{ background: '#00b341', color: '#fff' }}>
                  + Add Team
                </button>
              </div>

              {showAddTeam && (
                <div className="mb-4 p-3 rounded" style={{ background: '#0c0c14', border: '1px solid #1e1e32' }}>
                  <input
                    value={teamSearch}
                    onChange={e => setTeamSearch(e.target.value)}
                    placeholder="Search teams..."
                    className="w-full px-3 py-2 text-sm text-white rounded outline-none mb-2"
                    style={{ background: '#131320', border: '1px solid #1e1e32' }}
                  />
                  <div className="max-h-40 overflow-y-auto space-y-1">
                    {filteredTeamOptions.length === 0 ? (
                      <p className="text-xs text-gray-500 py-2">No matching teams.</p>
                    ) : filteredTeamOptions.map(team => (
                      <button key={team} onClick={() => addTeam(team)} className="w-full text-left px-2 py-1.5 text-sm text-gray-300 hover:bg-white/5 rounded transition-colors">
                        {team}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {teamsLoading ? (
                <p className="text-sm text-gray-500">Loading...</p>
              ) : myTeams.length === 0 ? (
                <p className="text-sm text-gray-500">You haven't followed any teams yet. Tap "Add Team" to get started.</p>
              ) : (
                <div className="space-y-3">
                  {myTeams.map(team => (
                    <div key={team.id} className="flex items-center gap-3 p-3 rounded" style={{ background: '#1a1a28' }}>
                      <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-black" style={{ background: '#0c0c14' }}>{team.team_name.slice(0, 2).toUpperCase()}</div>
                      <span className="text-sm font-semibold text-white flex-1">{team.team_name}</span>
                      <button onClick={() => removeTeam(team.id)} className="text-xs text-gray-600 hover:text-red-400 transition-colors">Remove</button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {section === 'saved' && (
            <div>
              <h2 className="text-xl font-black text-white mb-4" style={{ fontFamily: 'Big Shoulders Display' }}>{t('savedArticles')}</h2>
              {savedLoading ? (
                <p className="text-sm text-gray-500">Loading...</p>
              ) : savedArticles.length === 0 ? (
                <p className="text-sm text-gray-500">No saved articles yet. Start bookmarking articles to see them here.</p>
              ) : (
                <div className="space-y-3">
                  {savedArticles.map(a => (
                    <div key={a.id} className="flex items-center justify-between p-3 rounded" style={{ background: '#1a1a28' }}>
                      <Link to={`/news/${a.article_id}`} className="text-sm text-white hover:text-[#00b341] transition-colors">{a.article_id}</Link>
                      <button onClick={() => removeSavedArticle(a.id)} className="text-xs text-gray-600 hover:text-red-400 transition-colors">Remove</button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {section === 'wishlist' && (
            <div>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-black text-white" style={{ fontFamily: 'Big Shoulders Display' }}>
                  My Wishlist ({wishlistItems.length})
                </h2>
                <Link to="/shop" className="text-xs font-bold text-[#00b341] hover:underline flex items-center gap-1">
                  <span>Browse Shop</span> →
                </Link>
              </div>

              {wishlistLoading ? (
                <p className="text-sm text-gray-500">Loading your saved items...</p>
              ) : wishlistItems.length === 0 ? (
                <div className="p-8 text-center rounded-2xl border border-white/5 bg-[#121222]">
                  <p className="text-4xl mb-3">🤍</p>
                  <p className="text-sm font-bold text-white mb-1">Your wishlist is empty</p>
                  <p className="text-xs text-gray-400 mb-4">You haven't saved any jerseys or gear yet. Items you heart on the store will appear here.</p>
                  <Link to="/shop" className="px-4 py-2 text-xs font-black text-black rounded-lg inline-block" style={{ background: '#00b341' }}>
                    Explore Merch Store
                  </Link>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {wishlistItems.map(p => {
                    const firstImage = Array.isArray(p.images) ? p.images[0] : (p.image || 'https://images.unsplash.com/photo-1551958219-acbc5dbf7f1e?w=600&h=600&fit=crop')
                    return (
                      <div key={p.id} className="p-3 rounded-2xl border border-white/10 bg-[#131322] flex items-center gap-3">
                        <Link to={getProductPath(p)} className="w-16 h-16 rounded-xl bg-black/40 p-1 flex items-center justify-center shrink-0">
                          <img src={firstImage} alt={p.name} className="w-full h-full object-contain" />
                        </Link>
                        <div className="min-w-0 flex-1">
                          <Link to={getProductPath(p)} className="text-xs font-bold text-white hover:text-[#00b341] transition-colors truncate block">
                            {p.name}
                          </Link>
                          <div className="text-xs font-mono font-bold text-[#00b341] mt-0.5">
                            KES {Number(p.price || 0).toLocaleString()}
                          </div>
                          <div className="flex items-center gap-2 mt-2">
                            <Link
                              to={getProductPath(p)}
                              className="px-2.5 py-1 text-[10px] font-bold text-black rounded-md"
                              style={{ background: '#00b341' }}
                            >
                              View Item
                            </Link>
                            <button
                              type="button"
                              onClick={() => removeWishlistItem(String(p.id))}
                              className="p-1 text-gray-500 hover:text-red-400 transition-colors text-[10px] flex items-center gap-1"
                              title="Remove from Wishlist"
                            >
                              <Trash2 size={12} />
                              <span>Remove</span>
                            </button>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )}

          {section === 'predictions' && (
            <div>
              <h2 className="text-xl font-black text-white mb-4" style={{ fontFamily: 'Big Shoulders Display' }}>{t('myPredictions')}</h2>
              {predictionsLoading ? (
                <p className="text-sm text-gray-500">Loading...</p>
              ) : totalPredictions === 0 ? (
                <p className="text-sm text-gray-500">You haven't made any predictions yet. Head to the Predictions section to get started.</p>
              ) : (
                <>
                  <div className="flex items-center gap-4 mb-4">
                    <div className="text-center"><p className="text-3xl font-black text-white" style={{ fontFamily: 'Big Shoulders Display', color: '#f4a261' }}>{totalPredictions}</p><p className="text-xs text-gray-500">Predictions</p></div>
                    <div className="text-center"><p className="text-3xl font-black" style={{ fontFamily: 'Big Shoulders Display', color: '#22c55e' }}>{accuracy}%</p><p className="text-xs text-gray-500">Accuracy</p></div>
                    <div className="text-center"><p className="text-3xl font-black text-white" style={{ fontFamily: 'Big Shoulders Display' }}>{totalPoints}</p><p className="text-xs text-gray-500">Points</p></div>
                  </div>
                  <div className="space-y-2">
                    {predictions.map(p => (
                      <div key={p.id} className="flex items-center justify-between p-2 rounded text-xs text-gray-400" style={{ background: '#1a1a28' }}>
                        <span>Match {p.match_id}: {p.predicted_home_score}-{p.predicted_away_score}</span>
                        {p.actual_home_score !== null && <span>Result: {p.actual_home_score}-{p.actual_away_score}</span>}
                      </div>
                    ))}
                  </div>
                </>
              )}
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
                  <h3 className="text-sm font-semibold text-gray-400 mb-3">Change Password</h3>
                  <div className="space-y-3">
                    <input type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} className="w-full px-4 py-3 text-sm text-white rounded outline-none focus:ring-1 focus:ring-red-500" style={{ background: '#0c0c14', border: '1px solid #1e1e32' }} placeholder="New password" />
                    <input type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} className="w-full px-4 py-3 text-sm text-white rounded outline-none focus:ring-1 focus:ring-red-500" style={{ background: '#0c0c14', border: '1px solid #1e1e32' }} placeholder="Confirm new password" />
                    {pwError && <p className="text-xs text-red-400">{pwError}</p>}
                    <div className="flex items-center gap-3">
                      <button onClick={handleChangePassword} disabled={pwSaving} className="px-4 py-2 text-sm font-bold text-white rounded disabled:opacity-50" style={{ background: '#00b341' }}>
                        {pwSaving ? 'Updating...' : 'Update Password'}
                      </button>
                      {pwMsg && <span className="text-xs text-gray-400">{pwMsg}</span>}
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="text-sm font-semibold text-gray-400 mb-3">Notifications & Alerts</h3>
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

                  {/* Sound Effects & Goal Chimes Toggle */}
                  <div className="flex items-center justify-between py-2 mt-2 border-t border-white/5 pt-3">
                    <div className="flex items-center gap-2">
                      <Volume2 size={16} className={soundOn ? 'text-emerald-400' : 'text-gray-500'} />
                      <div>
                        <span className="text-sm text-gray-300 block">Match Goal & Alert Sounds</span>
                        <span className="text-[11px] text-gray-500 block">Play audio chimes on live goals and score alerts</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      {soundOn && (
                        <button
                          type="button"
                          onClick={() => playTestSound()}
                          className="px-2 py-0.5 text-[10px] font-bold rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/20 transition-all"
                          title="Test audio sound"
                        >
                          🔊 Test Sound
                        </button>
                      )}
                      <div
                        onClick={toggleSound}
                        className="w-10 h-5 rounded-full relative cursor-pointer transition-colors"
                        style={{ background: soundOn ? '#00b341' : '#2a2a3e' }}
                      >
                        <div className="absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all" style={{ left: soundOn ? '22px' : '2px' }} />
                      </div>
                    </div>
                  </div>
                </div>

                <div className="pt-4 border-t" style={{ borderColor: '#1e1e32' }}>
                  {!showDeleteConfirm ? (
                    <button onClick={() => setShowDeleteConfirm(true)} className="px-4 py-2 text-sm font-bold text-red-400 rounded border border-red-900 hover:bg-red-900/20 transition-colors">Delete Account</button>
                  ) : (
                    <div className="p-4 rounded" style={{ background: '#1a0c0c', border: '1px solid #7f1d1d' }}>
                      <p className="text-sm text-red-300 mb-3">This will permanently delete your account. Type <strong>DELETE</strong> to confirm.</p>
                      <input
                        value={deleteConfirmText}
                        onChange={e => setDeleteConfirmText(e.target.value)}
                        className="w-full px-3 py-2 text-sm text-white rounded outline-none mb-3"
                        style={{ background: '#0c0c14', border: '1px solid #7f1d1d' }}
                      />
                      <div className="flex items-center gap-3">
                        <button
                          onClick={handleDeleteAccount}
                          disabled={deleteConfirmText !== 'DELETE' || deleting}
                          className="px-4 py-2 text-sm font-bold text-white rounded disabled:opacity-50"
                          style={{ background: '#dc2626' }}
                        >
                          {deleting ? 'Deleting...' : 'Permanently Delete'}
                        </button>
                        <button onClick={() => { setShowDeleteConfirm(false); setDeleteConfirmText('') }} className="text-sm text-gray-400 hover:text-white transition-colors">Cancel</button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
