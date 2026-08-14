import { Link, useParams, Navigate } from 'react-router-dom'
import { useApp } from '../context/AppContext'

const SECTIONS = [
  { to: '/account/teams', label: 'My Teams', icon: '⚽' },
  { to: '/account/saved', label: 'Saved Articles', icon: '📄' },
  { to: '/account/predictions', label: 'My Predictions', icon: '🎯' },
  { to: '/account/settings', label: 'Settings', icon: '⚙️' },
]

export default function Account() {
  const { section } = useParams()
  const { user, logout, t } = useApp()

  if (!user) return <Navigate to="/login?from=/account" replace />

  return (
    <div className="max-w-screen-lg mx-auto px-4 py-8">
      <h1 className="text-4xl font-black text-white mb-6" style={{ fontFamily: 'Big Shoulders Display' }}>My Account</h1>
      <div className="grid md:grid-cols-4 gap-6">
        {/* Sidebar */}
        <div className="md:col-span-1">
          <div className="rounded-lg p-4" style={{ background: '#131320', border: '1px solid #1e1e32' }}>
            <div className="text-center mb-4 pb-4 border-b" style={{ borderColor: '#1e1e32' }}>
              <div className="w-16 h-16 rounded-full mx-auto mb-2 flex items-center justify-center text-3xl" style={{ background: '#1a1a28' }}>👤</div>
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
              <div className="space-y-3">
                {['Arsenal', 'Harambee Stars', 'AFC Leopards'].map(team => (
                  <div key={team} className="flex items-center gap-3 p-3 rounded" style={{ background: '#1a1a28' }}>
                    <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-black" style={{ background: '#0c0c14' }}>{team.slice(0,2).toUpperCase()}</div>
                    <span className="text-sm font-semibold text-white flex-1">{team}</span>
                    <button className="text-xs text-gray-600 hover:text-red-400 transition-colors">Remove</button>
                  </div>
                ))}
              </div>
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
              <div className="flex items-center gap-4 mb-4">
                <div className="text-center"><p className="text-3xl font-black text-white" style={{ fontFamily: 'Big Shoulders Display', color: '#f4a261' }}>24</p><p className="text-xs text-gray-500">Predictions</p></div>
                <div className="text-center"><p className="text-3xl font-black" style={{ fontFamily: 'Big Shoulders Display', color: '#22c55e' }}>67%</p><p className="text-xs text-gray-500">Accuracy</p></div>
                <div className="text-center"><p className="text-3xl font-black text-white" style={{ fontFamily: 'Big Shoulders Display' }}>156</p><p className="text-xs text-gray-500">Points</p></div>
              </div>
            </div>
          )}
          {section === 'settings' && (
            <div>
              <h2 className="text-xl font-black text-white mb-6" style={{ fontFamily: 'Big Shoulders Display' }}>{t('settings')}</h2>
              <div className="space-y-6">
                <div>
                  <h3 className="text-sm font-semibold text-gray-400 mb-3">Account</h3>
                  <div className="space-y-3">
                    <input defaultValue={user.name} className="w-full px-4 py-3 text-sm text-white rounded outline-none focus:ring-1 focus:ring-red-500" style={{ background: '#0c0c14', border: '1px solid #1e1e32' }} placeholder="Full Name" />
                    <input defaultValue={user.email} className="w-full px-4 py-3 text-sm text-white rounded outline-none focus:ring-1 focus:ring-red-500" style={{ background: '#0c0c14', border: '1px solid #1e1e32' }} placeholder="Email" />
                    <button className="px-4 py-2 text-sm font-bold text-white rounded" style={{ background: '#00b341' }}>Save Changes</button>
                  </div>
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-gray-400 mb-3">Notifications</h3>
                  {['Goal alerts', 'Comment replies', 'Breaking transfer news', 'Newsletter'].map(n => (
                    <label key={n} className="flex items-center justify-between py-2">
                      <span className="text-sm text-gray-300">{n}</span>
                      <div className="w-10 h-5 rounded-full relative cursor-pointer" style={{ background: '#00b341' }}>
                        <div className="absolute right-0.5 top-0.5 w-4 h-4 rounded-full bg-white" />
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
