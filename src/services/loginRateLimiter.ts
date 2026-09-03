/**
 * loginRateLimiter.ts
 * Progressive rate limiting and lockout service to protect admin login
 * against brute-force and credential-stuffing attacks.
 */

interface RateLimitRecord {
  attempts: number
  firstAttemptTime: number
  lockedUntil: number | null
  lastAttemptTime: number
}

const STORAGE_KEY = 'flz_admin_rate_limit_v1'
const MAX_ATTEMPTS = 5
const LOCKOUT_DURATION_MS = 15 * 60 * 1000 // 15 minutes
const WINDOW_DURATION_MS = 15 * 60 * 1000 // 15 minutes window

function getRecords(): Record<string, RateLimitRecord> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : {}
  } catch {
    return {}
  }
}

function saveRecords(records: Record<string, RateLimitRecord>): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(records))
  } catch {}
}

export interface RateLimitStatus {
  isLocked: boolean
  remainingLockTimeMs: number
  remainingAttempts: number
  lockedUntilFormatted: string | null
}

export function checkLoginRateLimit(identifier: string): RateLimitStatus {
  const cleanId = (identifier || 'global_admin').trim().toLowerCase()
  const records = getRecords()
  const record = records[cleanId]
  const now = Date.now()

  if (!record) {
    return {
      isLocked: false,
      remainingLockTimeMs: 0,
      remainingAttempts: MAX_ATTEMPTS,
      lockedUntilFormatted: null,
    }
  }

  // Check if actively locked
  if (record.lockedUntil && record.lockedUntil > now) {
    const remainingMs = record.lockedUntil - now
    const minutes = Math.ceil(remainingMs / 60000)
    return {
      isLocked: true,
      remainingLockTimeMs: remainingMs,
      remainingAttempts: 0,
      lockedUntilFormatted: `${minutes} minute${minutes === 1 ? '' : 's'}`,
    }
  }

  // Check if window has expired to reset attempts
  if (now - record.firstAttemptTime > WINDOW_DURATION_MS) {
    delete records[cleanId]
    saveRecords(records)
    return {
      isLocked: false,
      remainingLockTimeMs: 0,
      remainingAttempts: MAX_ATTEMPTS,
      lockedUntilFormatted: null,
    }
  }

  return {
    isLocked: false,
    remainingLockTimeMs: 0,
    remainingAttempts: Math.max(0, MAX_ATTEMPTS - record.attempts),
    lockedUntilFormatted: null,
  }
}

export function recordFailedLoginAttempt(identifier: string): RateLimitStatus {
  const cleanId = (identifier || 'global_admin').trim().toLowerCase()
  const records = getRecords()
  const now = Date.now()
  const record = records[cleanId] || {
    attempts: 0,
    firstAttemptTime: now,
    lockedUntil: null,
    lastAttemptTime: now,
  }

  // Reset if window passed
  if (now - record.firstAttemptTime > WINDOW_DURATION_MS) {
    record.attempts = 0
    record.firstAttemptTime = now
    record.lockedUntil = null
  }

  record.attempts += 1
  record.lastAttemptTime = now

  if (record.attempts >= MAX_ATTEMPTS) {
    record.lockedUntil = now + LOCKOUT_DURATION_MS
  }

  records[cleanId] = record
  saveRecords(records)

  return checkLoginRateLimit(cleanId)
}

export function resetLoginRateLimit(identifier: string): void {
  const cleanId = (identifier || 'global_admin').trim().toLowerCase()
  const records = getRecords()
  if (records[cleanId]) {
    delete records[cleanId]
    saveRecords(records)
  }
}
