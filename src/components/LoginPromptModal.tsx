import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useApp } from '../context/AppContext'

export default function LoginPromptModal() {
  const [show, setShow] = useState(false)
  const { user, authLoading } = useApp()
  const navigate = useNavigate()

  useEffect(() => {
    // If logged in or auth is still initializing, do not show
    if (authLoading || user) {
      setShow(false)
      return
    }

    const isLoggedIn = !!localStorage.getItem('flowerzfc_user') || !!localStorage.getItem('flz_auth_user_v1') || !!localStorage.getItem('flowerzfc_sb_session')
    const alreadyPrompted = sessionStorage.getItem('flowerzfc_login_prompted')
    if (isLoggedIn || alreadyPrompted) return

    const timer = setTimeout(() => {
      // Re-check before popping up
      const currentUser = localStorage.getItem('flowerzfc_user')
      if (!currentUser && !user) {
        setShow(true)
        sessionStorage.setItem('flowerzfc_login_prompted', '1')
      }
    }, 45000)

    return () => clearTimeout(timer)
  }, [user, authLoading])

  const dismiss = () => {
    setShow(false)
    sessionStorage.setItem('flowerzfc_login_prompted', '1')
  }

  if (!show || user || authLoading) return null

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(6px)' }}
      onClick={dismiss}
    >
      <div
        className="w-full max-w-sm rounded-2xl border border-[#00b341]/30 shadow-2xl overflow-hidden"
        style={{ background: 'linear-gradient(135deg, #131320 0%, #0d0d1e 100%)', animation: 'scaleIn 0.3s ease' }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="relative px-6 pt-6 pb-4 text-center border-b border-white/5">
          <button
            onClick={dismiss}
            className="absolute top-4 right-4 text-gray-500 hover:text-white transition-colors w-7 h-7 flex items-center justify-center rounded-full bg-white/5 hover:bg-white/10"
          >
            ✕
          </button>
          <div className="text-4xl mb-3">⚽</div>
          <h2 className="text-xl font-black text-white mb-1" style={{ fontFamily: 'Big Shoulders Display' }}>
            Join FlowerZFC
          </h2>
          <p className="text-xs text-gray-400">Get the full football experience — free forever</p>
        </div>

        {/* Benefits */}
        <div className="px-6 py-4 space-y-2.5">
          {[
            { icon: '🔔', text: 'Instant goal & match notifications' },
            { icon: '⭐', text: 'Star & track your favourite matches' },
            { icon: '🏆', text: 'Compete in predictions & fantasy' },
            { icon: '📰', text: 'Personalised news & transfer alerts' },
          ].map(({ icon, text }) => (
            <div key={text} className="flex items-center gap-3 bg-white/[0.03] rounded-lg px-3 py-2 border border-white/5">
              <span className="text-lg shrink-0">{icon}</span>
              <span className="text-xs font-semibold text-gray-200">{text}</span>
            </div>
          ))}
        </div>

        {/* CTAs */}
        <div className="px-6 pb-6 space-y-2">
          <button
            onClick={() => { dismiss(); navigate('/login?tab=register') }}
            className="w-full py-3 rounded-xl text-sm font-black text-black transition-all hover:opacity-90 active:scale-95"
            style={{ background: 'linear-gradient(90deg, #00b341, #00e05a)' }}
          >
            Create Free Account
          </button>
          <button
            onClick={() => { dismiss(); navigate('/login') }}
            className="w-full py-2.5 rounded-xl text-sm font-bold text-white border border-white/10 hover:bg-white/5 transition-colors"
          >
            Sign In
          </button>
          <button
            onClick={dismiss}
            className="w-full text-center text-xs text-gray-500 hover:text-gray-300 transition-colors pt-1"
          >
            Maybe later
          </button>
        </div>
      </div>

      <style>{`
        @keyframes scaleIn {
          from { opacity: 0; transform: scale(0.92) translateY(12px); }
          to   { opacity: 1; transform: scale(1) translateY(0); }
        }
      `}</style>
    </div>
  )
}
