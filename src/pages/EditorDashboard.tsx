import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { getAuthUser, setAuthSession, SUPER_ADMIN_EMAIL, type AuthProfile } from '../services/authService'
import { logAdminAction } from '../services/adminDataService'
import { supabase } from '../services/supabaseClient'
import { INIT_ARTICLES, INIT_COMMENTS, type Article, type Comment } from './Admin'

export default function EditorDashboard() {
  const navigate = useNavigate()
  const [authProfile, setAuthProfile] = useState<AuthProfile | null>(getAuthUser)
  const [activeTab, setActiveTab] = useState<'articles' | 'comments' | 'analytics'>('articles')
  const [articles, setArticles] = useState<Article[]>(INIT_ARTICLES)
  const [comments, setComments] = useState<Comment[]>(INIT_COMMENTS)
  const [searchQ, setSearchQ] = useState('')
  const [filterCat, setFilterCat] = useState('All')

  const userRole = authProfile?.role || 'user'
  const isAuthorized = authProfile && (userRole === 'editor' || userRole === 'super_admin')

  // Security Gate check
  if (!isAuthorized) {
    return (
      <div style={{ background: '#0a0a14', minHeight: '100vh' }} className="flex items-center justify-center px-4">
        <div className="w-full max-w-md text-center p-8 rounded-2xl border border-red-500/30" style={{ background: '#131320' }}>
          <div className="w-16 h-16 mx-auto mb-4 rounded-2xl flex items-center justify-center text-4xl bg-red-500/10 text-red-400 border border-red-500/30">
            🚫
          </div>
          <span className="text-[10px] font-black uppercase tracking-widest text-red-400 block mb-1">403 Access Denied</span>
          <h1 className="text-3xl font-black text-white mb-2" style={{ fontFamily: 'Big Shoulders Display' }}>Editor Dashboard Locked</h1>
          <p className="text-xs text-gray-400 mb-6">
            This route is strictly restricted to assigned Editor accounts. Your current profile does not hold Editor permissions.
          </p>
          <div className="flex gap-3">
            <Link to="/" className="flex-1 py-3 text-xs font-bold text-gray-300 rounded-xl border border-[#1e1e32] hover:border-white">
              ← Return Home
            </Link>
            <Link to="/admin" className="flex-1 py-3 text-xs font-black text-black rounded-xl hover:opacity-90" style={{ background: '#00b341' }}>
              Sign In →
            </Link>
          </div>
        </div>
      </div>
    )
  }

  const filteredArticles = articles.filter(a => {
    const matchSearch = !searchQ || a.title.toLowerCase().includes(searchQ.toLowerCase()) || a.category.toLowerCase().includes(searchQ.toLowerCase())
    const matchCat = filterCat === 'All' || a.category === filterCat
    return matchSearch && matchCat
  })

  const flaggedComments = comments.filter(c => c.status === 'Flagged' || c.status === 'Spam')

  return (
    <div style={{ background: '#080810', minHeight: '100vh' }}>
      {/* Header Bar */}
      <div style={{ background: 'linear-gradient(135deg,#0d0d22 0%,#091410 100%)', borderBottom: '1px solid #1e1e32' }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-5">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div>
              <div className="flex items-center gap-3 mb-1">
                <span className="text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded text-white bg-[#8b5cf6]">
                  ✍️ EDITOR DASHBOARD
                </span>
                <span className="text-[10px] font-semibold text-purple-400">
                  Content Scope: Articles · Comments · Analytics
                </span>
              </div>
              <h1 className="text-3xl font-black text-white" style={{ fontFamily: 'Big Shoulders Display' }}>
                FlowerZFC Editorial Desk <span className="text-xs text-gray-500 font-normal">({authProfile.email})</span>
              </h1>
            </div>
            <div className="flex gap-2">
              <Link to="/" className="px-3 py-2 text-[11px] font-bold text-gray-400 hover:text-white rounded-xl border border-[#1e1e32]">
                ← Site
              </Link>
              <button
                onClick={async () => { await supabase.auth.signOut(); setAuthProfile(null); navigate('/') }}
                className="px-3 py-2 text-[11px] font-bold text-gray-400 hover:text-red-400 rounded-xl border border-[#1e1e32]"
              >
                🔒 Sign Out
              </button>
            </div>
          </div>

          {/* Navigation Tabs */}
          <div className="flex gap-2 mt-5">
            {[
              { id: 'articles', label: '📰 Articles CRUD', badge: articles.length },
              { id: 'comments', label: '💬 Moderate Comments', badge: flaggedComments.length },
              { id: 'analytics', label: '📈 Content Analytics' },
            ].map(t => (
              <button
                key={t.id}
                onClick={() => setActiveTab(t.id as any)}
                className={`flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-xl transition-all ${
                  activeTab === t.id ? 'bg-[#8b5cf6] text-white' : 'bg-[#131320] text-gray-400 border border-[#1e1e32]'
                }`}
              >
                <span>{t.label}</span>
                {t.badge !== undefined && (
                  <span className="text-[10px] font-black px-1.5 py-0.5 rounded-full bg-white/20 text-white">
                    {t.badge}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">
        {/* ARTICLES TAB */}
        {activeTab === 'articles' && (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3 p-4 rounded-xl border border-[#1e1e32]" style={{ background: '#131320' }}>
              <div className="flex gap-2 flex-1 max-w-md">
                <input
                  type="text"
                  value={searchQ}
                  onChange={e => setSearchQ(e.target.value)}
                  placeholder="Search articles by title or category..."
                  className="w-full px-3 py-2 text-xs text-white bg-[#0c0c14] border border-[#1e1e32] rounded-xl outline-none focus:border-[#8b5cf6]"
                />
              </div>
              <button
                onClick={() => {
                  const title = prompt('Enter new article title:')
                  if (title) {
                    const newArt: Article = {
                      id: `art-${Date.now()}`,
                      title,
                      slug: title.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
                      category: 'Premier League',
                      author: authProfile.name,
                      excerpt: '',
                      body: '',
                      imageUrl: '',
                      imageAlt: '',
                      imageCaption: '',
                      status: 'Draft',
                      date: new Date().toISOString().split('T')[0],
                      scheduled: '',
                      views: '0',
                      likes: 0,
                      tags: '',
                      matchId: '',
                      teamTags: '',
                      playerTags: '',
                      mediaEmbeds: '',
                      isLiveBlog: false,
                      metaTitle: title,
                      metaDescription: '',
                      focusKeywords: '',
                    }
                    setArticles(prev => [newArt, ...prev])
                    logAdminAction(authProfile.email, 'CREATE_ARTICLE', 'Article', newArt.id, `Created article "${title}" via Editor Dashboard`)
                  }
                }}
                className="px-4 py-2 text-xs font-black text-white bg-[#8b5cf6] rounded-xl hover:opacity-90"
              >
                + New Article
              </button>
            </div>

            <div className="rounded-2xl border border-[#1e1e32] overflow-hidden" style={{ background: '#131320' }}>
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-[#1e1e32] bg-[#0d0d1e] text-gray-400">
                    <th className="p-4">Title</th>
                    <th className="p-4">Category</th>
                    <th className="p-4">Author</th>
                    <th className="p-4">Views</th>
                    <th className="p-4">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#1e1e32] text-gray-300">
                  {filteredArticles.map(art => (
                    <tr key={art.id} className="hover:bg-white/[.02]">
                      <td className="p-4 font-bold text-white">{art.title}</td>
                      <td className="p-4"><span className="px-2 py-1 rounded bg-[#1e1e32] text-purple-300 text-[10px] font-bold">{art.category}</span></td>
                      <td className="p-4 text-gray-400">{art.author}</td>
                      <td className="p-4 font-mono font-bold text-purple-400">{art.views || 0}</td>
                      <td className="p-4 space-x-2">
                        <button
                          onClick={() => {
                            setArticles(prev => prev.filter(a => a.id !== art.id))
                            logAdminAction(authProfile.email, 'DELETE_ARTICLE', 'Article', art.id, `Deleted article "${art.title}"`)
                          }}
                          className="text-red-400 hover:underline font-bold text-[10px]"
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* COMMENTS TAB */}
        {activeTab === 'comments' && (
          <div className="space-y-4">
            <div className="rounded-2xl border border-[#1e1e32] p-5 space-y-4" style={{ background: '#131320' }}>
              <h3 className="text-sm font-black text-white uppercase">💬 Article Comment Moderation Queue</h3>
              <div className="space-y-3">
                {comments.map(c => (
                  <div key={c.id} className="p-4 rounded-xl border border-[#1e1e32] bg-[#0c0c14] flex items-start justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-bold text-white text-xs">{c.user}</span>
                        <span className="text-[10px] text-gray-500 font-mono">on {c.article}</span>
                      </div>
                      <p className="text-xs text-gray-300">{c.body}</p>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => {
                          setComments(prev => prev.map(x => x.id === c.id ? { ...x, status: 'Approved' } : x))
                          logAdminAction(authProfile.email, 'APPROVE_COMMENT', 'Comment', c.id, `Approved comment by ${c.user}`)
                        }}
                        className="px-2.5 py-1 text-[10px] font-bold text-emerald-400 border border-emerald-400/40 rounded-lg hover:bg-emerald-400/10"
                      >
                        Approve
                      </button>
                      <button
                        onClick={() => {
                          setComments(prev => prev.filter(x => x.id !== c.id))
                          logAdminAction(authProfile.email, 'DELETE_COMMENT', 'Comment', c.id, `Deleted comment by ${c.user}`)
                        }}
                        className="px-2.5 py-1 text-[10px] font-bold text-red-400 border border-red-400/40 rounded-lg hover:bg-red-400/10"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ANALYTICS TAB */}
        {activeTab === 'analytics' && (
          <div className="grid md:grid-cols-3 gap-4">
            {[
              { label: 'Total Articles Published', val: articles.length.toString(), color: '#8b5cf6' },
              { label: 'Total Article Views', val: '248,500', color: '#00b341' },
              { label: 'Avg Reader Time', val: '4m 12s', color: '#3b82f6' },
            ].map(k => (
              <div key={k.label} className="p-5 rounded-2xl border border-[#1e1e32]" style={{ background: '#131320' }}>
                <p className="text-[10px] font-black uppercase text-gray-500 mb-1">{k.label}</p>
                <p className="text-4xl font-black text-white" style={{ fontFamily: 'Big Shoulders Display', color: k.color }}>{k.val}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
