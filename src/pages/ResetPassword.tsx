import { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { changePassword, getSession } from '../services/supabaseClient'

export default function ResetPassword() {
  const navigate = useNavigate()
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [checkingSession, setCheckingSession] = useState(true)
  const [validSession, setValidSession] = useState(false)

  useEffect(() => {
    getSession().then((session: any) => {
      setValidSession(!!session)
      setCheckingSession(false)
    })
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (password.length < 8) {
      setError('Password must be at least 8 characters.')
      return
    }
    if (password !== confirm) {
      setError("Passwords don't match.")
      return
    }

    setLoading(true)
    const { error: changeError } = await changePassword(password)
    setLoading(false)

    if (changeError) {
      setError(changeError.message || 'Could not reset password. The link may have expired.')
      return
    }

    setSuccess(true)
    setTimeout(() => navigate('/login'), 2500)
  }

  if (checkingSession) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#0a0a12' }}>
        <div className="w-5 h-5 border-2 border-[#00b341] border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-16">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Link to="/" className="inline-flex items-center gap-2">
            <div className="w-10 h-10 rounded-sm flex items-center justify-center text-white font-black" style={{ background: '#00b341', fontFamily: 'Big Shoulders Display' }}>FZ</div>
            <span className="text-white font-black text-2xl tracking-tight" style={{ fontFamily: 'Big Shoulders Display' }}>FlowerZFC</span>
          </Link>
        </div>

        <div className="rounded-xl p-8" style={{ background: '#131320', border: '1px solid #1e1e32' }}>
          <h1 className="text-2xl font-black text-white mb-6 text-center" style={{ fontFamily: 'Big Shoulders Display' }}>
            Set New Password
          </h1>

          {!validSession ? (
            <div className="text-center py-4">
              <p className="text-sm text-gray-400 mb-4">This reset link is invalid or has expired.</p>
              <Link to="/login?mode=forgot" className="text-sm text-[#00b341] hover:opacity-80 transition-colors">Request a new reset link</Link>
            </div>
          ) : success ? (
            <div className="text-center py-4">
              <p className="text-5xl mb-3">✅</p>
              <h2 className="text-lg font-bold text-white mb-2">Password updated</h2>
              <p className="text-sm text-gray-400">Redirecting you to sign in...</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="New password"
                className="w-full px-4 py-3 text-sm text-white rounded outline-none focus:ring-1 focus:ring-[#00b341]"
                style={{ background: '#0c0c14', border: '1px solid #1e1e32' }}
              />
              <input
                type="password"
                value={confirm}
                onChange={e => setConfirm(e.target.value)}
                placeholder="Confirm new password"
                className="w-full px-4 py-3 text-sm text-white rounded outline-none focus:ring-1 focus:ring-[#00b341]"
                style={{ background: '#0c0c14', border: '1px solid #1e1e32' }}
              />
              {error && <p className="text-sm text-red-400">{error}</p>}
              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 text-sm font-bold text-white rounded disabled:opacity-50"
                style={{ background: '#00b341' }}
              >
                {loading ? 'Updating...' : 'Update Password'}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}
