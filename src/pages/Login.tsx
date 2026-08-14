import { useState, useEffect } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { useApp } from '../context/AppContext'
import { signUpWithEmail, sendPasswordReset } from '../services/supabaseClient'
import { getRoleDashboardRoute } from '../services/authService'

export default function Login() {
  const [params] = useSearchParams()
  const [mode, setMode] = useState<'login' | 'signup' | 'forgot'>(
    params.get('mode') === 'signup' ? 'signup' : 'login'
  )
  const { login, logout, user, authLoading, t } = useApp()
  const navigate = useNavigate()

  const [form, setForm] = useState({ name: '', email: '', password: '', confirm: '' })
  const [show, setShow] = useState(false)
  const [strength, setStrength] = useState(0)
  const [agreed, setAgreed] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [forgotSent, setForgotSent] = useState(false)
  const [remember, setRemember] = useState(false)

  const from = params.get('from') || '/'

  // If already signed in, redirect to role dashboard
  useEffect(() => {
    if (!authLoading && user) {
      const dest = getRoleDashboardRoute(user.role as any)
      navigate(dest === '/account' ? from : dest, { replace: true })
    }
  }, [user, authLoading])

  useEffect(() => {
    const pass = form.password
    if (!pass) { setStrength(0); return }
    let s = 0
    if (pass.length >= 8) s++
    if (/[A-Z]/.test(pass)) s++
    if (/[0-9]/.test(pass)) s++
    if (/[^A-Za-z0-9]/.test(pass)) s++
    setStrength(s)
  }, [form.password])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    if (mode === 'login') {
      if (!form.email || !form.password) {
        setError('Please enter your email and password.')
        setLoading(false)
        return
      }
      const result = await login(form.email, form.password)
      if (result.error) {
        setError(result.error)
        setLoading(false)
        return
      }
      // Navigation handled by useEffect when user state updates

    } else if (mode === 'signup') {
      if (!agreed) { setError('Please agree to the Terms of Service.'); setLoading(false); return }
      if (form.password !== form.confirm) { setError("Passwords don't match."); setLoading(false); return }
      if (form.password.length < 8) { setError('Password must be at least 8 characters.'); setLoading(false); return }

      const { error: signUpError } = await signUpWithEmail(form.email, form.password, form.name || form.email.split('@')[0])
      if (signUpError) {
        setError(signUpError.message)
        setLoading(false)
        return
      }
      // Show confirmation message — Supabase sends a verification email
      setError('')
      setMode('login')
      // Brief success notice via state (reuse error state with green style)
      setForm(f => ({ ...f, password: '', confirm: '' }))
      setLoading(false)
      return

    } else {
      // Forgot password
      const { error: resetErr } = await sendPasswordReset(form.email)
      if (resetErr) {
        setError(resetErr.message)
      } else {
        setForgotSent(true)
      }
    }

    setLoading(false)
  }

  const strengthLabel = ['', 'Weak', 'Fair', 'Good', 'Strong']
  const strengthColor = ['', '#ef4444', '#f4a261', '#eab308', '#22c55e']

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#0a0a12' }}>
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 rounded-sm flex items-center justify-center text-white font-black" style={{ background: '#00b341', fontFamily: 'Big Shoulders Display' }}>FZ</div>
          <div className="w-5 h-5 border-2 border-[#00b341] border-t-transparent rounded-full animate-spin" />
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-16">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <Link to="/" className="inline-flex items-center gap-2">
            <div className="w-10 h-10 rounded-sm flex items-center justify-center text-white font-black" style={{ background: '#00b341', fontFamily: 'Big Shoulders Display' }}>FZ</div>
            <span className="text-white font-black text-2xl tracking-tight" style={{ fontFamily: 'Big Shoulders Display' }}>FlowerZFC</span>
          </Link>
        </div>

        <div className="rounded-xl p-8" style={{ background: '#131320', border: '1px solid #1e1e32' }}>
          <h1 className="text-2xl font-black text-white mb-6 text-center" style={{ fontFamily: 'Big Shoulders Display' }}>
            {mode === 'login' ? t('login') : mode === 'signup' ? t('signup') : 'Reset Password'}
          </h1>

          {mode === 'forgot' && forgotSent ? (
            <div className="text-center py-4">
              <p className="text-5xl mb-3">📧</p>
              <h2 className="text-lg font-bold text-white mb-2">Check your email</h2>
              <p className="text-sm text-gray-400 mb-4">We sent a reset link to {form.email}</p>
              <button onClick={() => setForgotSent(false)} className="text-sm text-[#00b341] hover:opacity-80 transition-colors">Resend email</button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {mode === 'signup' && (
                <div>
                  <input
                    value={form.name}
                    onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                    placeholder="Full Name"
                    className="w-full px-4 py-3 text-sm text-white placeholder:text-gray-600 rounded outline-none focus:ring-1 focus:ring-[#00b341]"
                    style={{ background: '#0c0c14', border: '1px solid #1e1e32' }}
                  />
                </div>
              )}
              <div>
                <input
                  value={form.email}
                  onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                  placeholder="Email"
                  type="email"
                  required
                  className="w-full px-4 py-3 text-sm text-white placeholder:text-gray-600 rounded outline-none focus:ring-1 focus:ring-[#00b341]"
                  style={{ background: '#0c0c14', border: '1px solid #1e1e32' }}
                />
              </div>
              {mode !== 'forgot' && (
                <div className="relative">
                  <input
                    value={form.password}
                    onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                    placeholder="Password"
                    type={show ? 'text' : 'password'}
                    required
                    minLength={8}
                    className="w-full px-4 py-3 text-sm text-white placeholder:text-gray-600 rounded outline-none focus:ring-1 focus:ring-[#00b341] pr-10"
                    style={{ background: '#0c0c14', border: '1px solid #1e1e32' }}
                  />
                  <button type="button" onClick={() => setShow(s => !s)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-600 hover:text-white transition-colors text-sm">
                    {show ? '🙈' : '👁'}
                  </button>
                </div>
              )}
              {mode === 'signup' && form.password && (
                <div>
                  <div className="flex gap-1 mb-1">
                    {[1,2,3,4].map(i => (
                      <div key={i} className="h-1 flex-1 rounded-full transition-colors" style={{ background: i <= strength ? strengthColor[strength] : '#1e1e32' }} />
                    ))}
                  </div>
                  <p className="text-xs" style={{ color: strengthColor[strength] }}>{strengthLabel[strength]}</p>
                </div>
              )}
              {mode === 'signup' && (
                <div className="relative">
                  <input
                    value={form.confirm}
                    onChange={e => setForm(f => ({ ...f, confirm: e.target.value }))}
                    placeholder="Confirm Password"
                    type={show ? 'text' : 'password'}
                    required
                    className="w-full px-4 py-3 text-sm text-white placeholder:text-gray-600 rounded outline-none focus:ring-1 focus:ring-[#00b341]"
                    style={{ background: '#0c0c14', border: '1px solid #1e1e32' }}
                  />
                  {form.confirm && form.password !== form.confirm && (
                    <p className="text-xs text-red-400 mt-1">Passwords don't match</p>
                  )}
                </div>
              )}

              {mode === 'login' && (
                <div className="flex items-center justify-between">
                  <label className="flex items-center gap-2 text-sm text-gray-400 cursor-pointer">
                    <input type="checkbox" checked={remember} onChange={e => setRemember(e.target.checked)} className="accent-[#00b341]" />
                    Remember me
                  </label>
                  <button type="button" onClick={() => setMode('forgot')} className="text-sm text-[#00b341] hover:opacity-80 transition-colors">
                    Forgot password?
                  </button>
                </div>
              )}

              {mode === 'signup' && (
                <label className="flex items-start gap-2 cursor-pointer">
                  <input type="checkbox" checked={agreed} onChange={e => setAgreed(e.target.checked)} className="accent-[#00b341] mt-0.5" />
                  <span className="text-xs text-gray-400">
                    I agree to the{' '}
                    <Link to="/terms" target="_blank" className="text-[#00b341] hover:opacity-80 transition-colors">Terms of Service</Link>
                    {' '}and{' '}
                    <Link to="/privacy" target="_blank" className="text-[#00b341] hover:opacity-80 transition-colors">Privacy Policy</Link>
                  </span>
                </label>
              )}

              {error && <p className="text-sm text-red-400 bg-red-400/10 px-3 py-2 rounded">{error}</p>}

              <button
                type="submit"
                disabled={loading || (mode === 'signup' && !agreed)}
                className="w-full py-3.5 text-sm font-black text-white rounded transition-all disabled:opacity-40 flex items-center justify-center gap-2"
                style={{ background: '#00b341', fontFamily: 'Big Shoulders Display', fontSize: '16px' }}
              >
                {loading ? (
                  <svg className="animate-spin" width="16" height="16" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="white" strokeWidth="4"/><path className="opacity-75" fill="white" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>
                ) : null}
                {mode === 'login' ? t('login') : mode === 'signup' ? 'Create Account' : 'Send Reset Link'}
              </button>
            </form>
          )}

          <div className="mt-6 text-center text-sm text-gray-600">
            {mode === 'login' ? (
              <>Don't have an account? <button onClick={() => setMode('signup')} className="text-[#00b341] hover:opacity-80 transition-colors font-semibold">{t('signup')}</button></>
            ) : mode === 'signup' ? (
              <>Already have an account? <button onClick={() => setMode('login')} className="text-[#00b341] hover:opacity-80 transition-colors font-semibold">{t('login')}</button></>
            ) : (
              <button onClick={() => setMode('login')} className="text-[#00b341] hover:opacity-80 transition-colors font-semibold">← Back to Login</button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
