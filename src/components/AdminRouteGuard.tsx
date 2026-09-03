/**
 * AdminRouteGuard.tsx
 * Route-level Authentication & Role-Based Authorization Guard (Step 1).
 * Completely blocks unauthenticated visitors (401) and unauthorized regular users (403)
 * from mounting admin components or viewing any sensitive data.
 */

import React, { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useApp } from '../context/AppContext'
import { getAuthUser, SUPER_ADMIN_EMAIL, type UserRole } from '../services/authService'
import { checkLoginRateLimit, recordFailedLoginAttempt, resetLoginRateLimit, type RateLimitStatus } from '../services/loginRateLimiter'
import { logAdminEvent } from '../services/adminAuditService'
import { ShieldAlert, Lock, AlertCircle, RefreshCw, KeyRound, UserX, ArrowLeft } from 'lucide-react'

interface AdminRouteGuardProps {
  children: React.ReactNode
  requiredRole?: UserRole
}

export default function AdminRouteGuard({ children }: AdminRouteGuardProps) {
  const { user, login: appLogin, logout, authLoading } = useApp()
  const [loginEmail, setLoginEmail] = useState('')
  const [loginPass, setLoginPass] = useState('')
  const [loginError, setLoginError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [rateLimit, setRateLimit] = useState<RateLimitStatus>(() => checkLoginRateLimit('admin_auth'))

  // Refresh rate limit countdown
  useEffect(() => {
    if (!loginEmail) return
    const status = checkLoginRateLimit(loginEmail)
    setRateLimit(status)

    if (status.isLocked) {
      const interval = setInterval(() => {
        const updated = checkLoginRateLimit(loginEmail)
        setRateLimit(updated)
        if (!updated.isLocked) clearInterval(interval)
      }, 1000)
      return () => clearInterval(interval)
    }
  }, [loginEmail])

  // Resolve user identity
  const cached = getAuthUser()
  const activeUser = user || cached

  const hasAdminRole =
    activeUser?.role === 'super_admin' ||
    activeUser?.role === 'admin' ||
    activeUser?.role === 'editor' ||
    activeUser?.role === 'support'

  const isAuthorized = Boolean(activeUser && hasAdminRole)

  // 1. Loading state — do not render anything sensitive while resolving auth
  if (authLoading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-4" style={{ background: '#0a0a14' }}>
        <div className="flex flex-col items-center gap-4 text-center">
          <div className="w-14 h-14 rounded-2xl flex items-center justify-center bg-[#131320] border border-emerald-500/30">
            <RefreshCw size={24} className="text-emerald-400 animate-spin" />
          </div>
          <div>
            <h3 className="text-sm font-black uppercase text-white tracking-widest mb-1">Verifying Credentials</h3>
            <p className="text-xs text-gray-500">Checking active administrative session & authorization policies…</p>
          </div>
        </div>
      </div>
    )
  }

  // 2. Logged in, but regular user account without admin privileges (403 Forbidden)
  if (activeUser && !isAuthorized) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4 py-12" style={{ background: '#0a0a14' }}>
        <div className="w-full max-w-lg p-8 rounded-2xl border border-red-500/40 text-center space-y-6" style={{ background: '#131320' }}>
          <div className="w-16 h-16 mx-auto rounded-2xl bg-red-500/10 border border-red-500/30 flex items-center justify-center text-red-400">
            <UserX size={32} />
          </div>

          <div>
            <span className="px-3 py-1 text-[10px] font-black uppercase tracking-widest text-red-400 bg-red-500/10 border border-red-500/20 rounded-full inline-block mb-3">
              HTTP 403 Forbidden
            </span>
            <h1 className="text-3xl font-black text-white" style={{ fontFamily: 'Big Shoulders Display' }}>
              Access Denied: Administrator Privileges Required
            </h1>
            <p className="text-xs text-gray-400 mt-2 leading-relaxed">
              You are currently signed in as <span className="text-white font-mono font-bold">{activeUser.email}</span> (Role: <span className="text-amber-400 font-bold">{activeUser.role || 'user'}</span>).
              This dashboard is restricted to verified administrators and content editors.
            </p>
          </div>

          <div className="p-4 rounded-xl bg-red-950/20 border border-red-900/30 text-left text-xs text-gray-300 space-y-1">
            <p className="font-bold text-red-400 flex items-center gap-1.5">
              <ShieldAlert size={14} /> Security Policy Enforced:
            </p>
            <p className="text-[11px] text-gray-400">
              Administrative data and controls are segregated from standard customer sessions. Unauthorized access attempts are recorded in the security audit ledger.
            </p>
          </div>

          <div className="flex items-center justify-center gap-3 flex-wrap pt-2">
            <button
              onClick={() => {
                logout()
                window.location.reload()
              }}
              className="px-5 py-2.5 text-xs font-black text-white bg-red-600/80 hover:bg-red-600 rounded-xl transition-all cursor-pointer"
            >
              Sign Out & Switch Account →
            </button>
            <Link
              to="/"
              className="px-5 py-2.5 text-xs font-bold text-gray-400 hover:text-white border border-[#1e1e32] hover:border-gray-600 rounded-xl transition-all inline-flex items-center gap-1.5"
            >
              <ArrowLeft size={14} /> Return to Home
            </Link>
          </div>
        </div>
      </div>
    )
  }

  // 3. Not logged in at all — strict 401 Unauthorized barrier with Login & Lockout Protection
  if (!isAuthorized) {
    const handleAdminLogin = async (e: React.FormEvent) => {
      e.preventDefault()
      const cleanEmail = loginEmail.trim()

      // Check Rate Limit / Lockout
      const status = checkLoginRateLimit(cleanEmail)
      if (status.isLocked) {
        setRateLimit(status)
        setLoginError(`Account temporarily locked out due to multiple failed attempts. Please retry in ${status.lockedUntilFormatted}.`)
        logAdminEvent({
          adminEmail: cleanEmail,
          action: 'AUTH_LOCKOUT_TRIGGERED',
          targetType: 'Auth',
          details: `Blocked attempt while lockout active. Remaining time: ${status.lockedUntilFormatted}`,
        })
        return
      }

      setIsSubmitting(true)
      setLoginError('')

      try {
        const ok = await appLogin(cleanEmail, loginPass)
        if (ok) {
          resetLoginRateLimit(cleanEmail)
          await logAdminEvent({
            adminEmail: cleanEmail,
            action: 'AUTH_LOGIN_SUCCESS',
            targetType: 'Auth',
            details: 'Successful administrator login to dashboard',
          })
          window.location.reload()
        } else {
          const updatedLimit = recordFailedLoginAttempt(cleanEmail)
          setRateLimit(updatedLimit)
          await logAdminEvent({
            adminEmail: cleanEmail,
            action: 'AUTH_LOGIN_FAILED',
            targetType: 'Auth',
            details: `Failed admin login attempt. Remaining attempts before lockout: ${updatedLimit.remainingAttempts}`,
          })
          if (updatedLimit.isLocked) {
            setLoginError(`Too many failed attempts. Security lockout active for ${updatedLimit.lockedUntilFormatted}.`)
          } else {
            setLoginError(`Invalid admin credentials. (${updatedLimit.remainingAttempts} attempt${updatedLimit.remainingAttempts === 1 ? '' : 's'} remaining before 15-min lockout).`)
          }
        }
      } catch (err: any) {
        const updatedLimit = recordFailedLoginAttempt(cleanEmail)
        setRateLimit(updatedLimit)
        setLoginError(err.message || 'Authentication failed. Please verify admin credentials.')
      } finally {
        setIsSubmitting(false)
      }
    }

    return (
      <div className="min-h-screen flex items-center justify-center px-4 py-12" style={{ background: '#0a0a14' }}>
        <div className="w-full max-w-md p-8 rounded-2xl border border-emerald-500/30" style={{ background: '#131320' }}>
          <div className="w-16 h-16 mx-auto mb-4 rounded-2xl flex items-center justify-center bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
            <Lock size={32} />
          </div>

          <div className="text-center mb-6">
            <span className="px-3 py-1 text-[10px] font-black uppercase tracking-widest text-[#00b341] bg-[#00b341]/10 border border-[#00b341]/20 rounded-full inline-block mb-2">
              HTTP 401 Protected Route
            </span>
            <h1 className="text-3xl font-black text-white" style={{ fontFamily: 'Big Shoulders Display' }}>
              Control Center Authentication
            </h1>
            <p className="text-xs text-gray-400 mt-1">
              Active verified administrator session required.
            </p>
          </div>

          {loginError && (
            <div className="p-3.5 mb-4 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs font-bold flex items-start gap-2.5">
              <AlertCircle size={16} className="shrink-0 mt-0.5" />
              <div>{loginError}</div>
            </div>
          )}

          {rateLimit.isLocked && (
            <div className="p-3.5 mb-4 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs font-bold flex items-start gap-2.5">
              <ShieldAlert size={16} className="shrink-0 mt-0.5 text-amber-400" />
              <div>
                Security Lockout Active. New attempts paused for <span className="underline">{rateLimit.lockedUntilFormatted}</span> to protect against brute-force attacks.
              </div>
            </div>
          )}

          <form onSubmit={handleAdminLogin} className="space-y-4">
            <div>
              <label className="block text-[10px] font-black uppercase text-gray-400 mb-1.5">
                Admin Email
              </label>
              <input
                type="email"
                value={loginEmail}
                onChange={e => setLoginEmail(e.target.value)}
                required
                disabled={rateLimit.isLocked || isSubmitting}
                className="w-full px-4 py-2.5 bg-[#0d0d1e] border border-[#1e1e32] rounded-xl text-white text-xs outline-none focus:border-[#00b341] disabled:opacity-50"
                placeholder="admin@domain.com"
              />
            </div>

            <div>
              <label className="block text-[10px] font-black uppercase text-gray-400 mb-1.5">
                Password
              </label>
              <input
                type="password"
                value={loginPass}
                onChange={e => setLoginPass(e.target.value)}
                required
                disabled={rateLimit.isLocked || isSubmitting}
                className="w-full px-4 py-2.5 bg-[#0d0d1e] border border-[#1e1e32] rounded-xl text-white text-xs outline-none focus:border-[#00b341] disabled:opacity-50"
                placeholder="••••••••"
              />
            </div>

            <button
              type="submit"
              disabled={rateLimit.isLocked || isSubmitting}
              className="w-full py-3 text-xs font-black text-black rounded-xl hover:opacity-90 transition-all disabled:opacity-50 cursor-pointer flex items-center justify-center gap-2"
              style={{ background: '#00b341' }}
            >
              {isSubmitting ? (
                <><RefreshCw size={14} className="animate-spin" /> Verifying Session…</>
              ) : (
                <><KeyRound size={14} /> Verify & Access Dashboard →</>
              )}
            </button>
          </form>

          <div className="mt-6 pt-4 border-t border-[#1e1e32] text-center">
            <Link to="/" className="text-xs text-gray-500 hover:text-white transition-colors inline-flex items-center gap-1">
              <ArrowLeft size={12} /> Return to Public Site
            </Link>
          </div>
        </div>
      </div>
    )
  }

  // 4. Fully Authorized Administrator Session Verified — Mount Child Components
  return <>{children}</>
}
