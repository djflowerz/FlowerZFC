import { useState, useEffect } from 'react'

interface ConsentState {
  essential: boolean
  analytics: boolean
  advertising: boolean
  date: string
}

export default function CookieBanner() {
  const [showBanner, setShowBanner] = useState(false)
  const [showModal, setShowModal] = useState(false)
  const [preferences, setPreferences] = useState({
    essential: true,
    analytics: true,
    advertising: true,
  })

  useEffect(() => {
    const saved = localStorage.getItem('flowerzfc_cookie_consent')
    if (!saved) {
      setShowBanner(true)
    }
  }, [])

  const saveConsent = (state: ConsentState) => {
    localStorage.setItem('flowerzfc_cookie_consent', JSON.stringify(state))
    setShowBanner(false)
    setShowModal(false)
  }

  const handleAcceptAll = () => {
    saveConsent({
      essential: true,
      analytics: true,
      advertising: true,
      date: new Date().toISOString(),
    })
  }

  const handleDeclineOptional = () => {
    saveConsent({
      essential: true,
      analytics: false,
      advertising: false,
      date: new Date().toISOString(),
    })
  }

  const handleSaveCustom = () => {
    saveConsent({
      essential: true,
      analytics: preferences.analytics,
      advertising: preferences.advertising,
      date: new Date().toISOString(),
    })
  }

  if (!showBanner && !showModal) return null

  return (
    <>
      {/* Bottom Sticky Cookie Banner */}
      {showBanner && !showModal && (
        <div className="fixed bottom-0 left-0 right-0 z-50 p-4" style={{ background: '#131320', borderTop: '1px solid #00b341' }}>
          <div className="max-w-screen-xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="text-xs text-gray-300 leading-relaxed max-w-3xl">
              <span className="font-bold text-white block mb-1">🍪 Cookie & Privacy Preferences</span>
              We use cookies to enhance site navigation, analyze football statistics traffic, and personalize AdSense content. By clicking "Accept All", you consent to our use of cookies.
            </div>

            <div className="flex items-center gap-2 flex-wrap shrink-0">
              <button
                onClick={() => setShowModal(true)}
                className="px-3 py-2 text-xs font-semibold text-gray-400 hover:text-white transition-colors"
              >
                Preferences
              </button>
              <button
                onClick={handleDeclineOptional}
                className="px-4 py-2 text-xs font-bold text-gray-300 rounded border border-[#1e1e32] hover:bg-white/5 transition-colors"
              >
                Decline Optional
              </button>
              <button
                onClick={handleAcceptAll}
                className="px-5 py-2 text-xs font-bold text-white rounded shadow-lg"
                style={{ background: '#00b341' }}
              >
                Accept All
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Cookie Preferences Modal */}
      {showModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.85)' }}>
          <div className="w-full max-w-md p-6 rounded-2xl border border-[#1e1e32] shadow-2xl" style={{ background: '#131320' }}>
            <div className="flex items-center justify-between mb-4 border-b border-[#1e1e32] pb-3">
              <h3 className="font-black text-white text-lg" style={{ fontFamily: 'Big Shoulders Display' }}>
                Cookie Settings
              </h3>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-white text-sm">✕</button>
            </div>

            <div className="space-y-4 mb-6">
              {/* Essential */}
              <div className="flex items-start justify-between gap-4 p-3 rounded-lg border border-[#1e1e32]" style={{ background: '#0d0d1e' }}>
                <div>
                  <p className="text-xs font-bold text-white mb-1">Essential Cookies</p>
                  <p className="text-[11px] text-gray-400">Required for security, user login, and cart storage. Cannot be disabled.</p>
                </div>
                <input type="checkbox" checked disabled className="accent-[#00b341] mt-1" />
              </div>

              {/* Analytics */}
              <div className="flex items-start justify-between gap-4 p-3 rounded-lg border border-[#1e1e32]" style={{ background: '#0d0d1e' }}>
                <div>
                  <p className="text-xs font-bold text-white mb-1">Analytics (GA4)</p>
                  <p className="text-[11px] text-gray-400">Helps us measure site visits, match traffic, and popular news stories.</p>
                </div>
                <input
                  type="checkbox"
                  checked={preferences.analytics}
                  onChange={e => setPreferences(p => ({ ...p, analytics: e.target.checked }))}
                  className="accent-[#00b341] mt-1 cursor-pointer"
                />
              </div>

              {/* Advertising */}
              <div className="flex items-start justify-between gap-4 p-3 rounded-lg border border-[#1e1e32]" style={{ background: '#0d0d1e' }}>
                <div>
                  <p className="text-xs font-bold text-white mb-1">AdSense Personalization</p>
                  <p className="text-[11px] text-gray-400">Allows Google AdSense to display relevant sports ads.</p>
                </div>
                <input
                  type="checkbox"
                  checked={preferences.advertising}
                  onChange={e => setPreferences(p => ({ ...p, advertising: e.target.checked }))}
                  className="accent-[#00b341] mt-1 cursor-pointer"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#1e1e32]">
              <button
                onClick={() => setShowModal(false)}
                className="px-4 py-2 text-xs font-bold text-gray-400 hover:text-white"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveCustom}
                className="px-5 py-2 text-xs font-bold text-white rounded"
                style={{ background: '#00b341' }}
              >
                Save Preferences
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
