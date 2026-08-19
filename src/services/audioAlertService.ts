// Real-Time Synthesized Audio Alert Engine (Web Audio API)
// Provides clean, energetic goal chimes and alert sounds without external MP3 dependencies.

const SOUND_KEY = 'flowerzfc_sound_enabled'

let audioCtx: AudioContext | null = null

function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null
  if (!audioCtx) {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext
    if (AudioContextClass) {
      audioCtx = new AudioContextClass()
    }
  }
  if (audioCtx && audioCtx.state === 'suspended') {
    audioCtx.resume().catch(() => {})
  }
  return audioCtx
}

export function isSoundEnabled(): boolean {
  try {
    const val = localStorage.getItem(SOUND_KEY)
    // Default to true (or saved preference)
    return val === null ? true : val === 'true'
  } catch {
    return true
  }
}

export function setSoundEnabled(enabled: boolean): void {
  try {
    localStorage.setItem(SOUND_KEY, String(enabled))
    window.dispatchEvent(new CustomEvent('flowerzfc_sound_toggle', { detail: { enabled } }))
  } catch { /* ignore */ }
}

/**
 * Plays an energetic goal sound (referee whistle + celebratory 3-chord fanfare)
 */
export function playGoalSound(): void {
  if (!isSoundEnabled()) return
  try {
    const ctx = getAudioContext()
    if (!ctx) return

    const now = ctx.currentTime

    // 1. Whistle burst
    const oscWhistle = ctx.createOscillator()
    const gainWhistle = ctx.createGain()
    oscWhistle.type = 'sine'
    oscWhistle.frequency.setValueAtTime(2600, now)
    oscWhistle.frequency.exponentialRampToValueAtTime(3200, now + 0.1)
    oscWhistle.frequency.exponentialRampToValueAtTime(2800, now + 0.25)
    gainWhistle.gain.setValueAtTime(0.15, now)
    gainWhistle.gain.exponentialRampToValueAtTime(0.01, now + 0.3)

    oscWhistle.connect(gainWhistle)
    gainWhistle.connect(ctx.destination)
    oscWhistle.start(now)
    oscWhistle.stop(now + 0.3)

    // 2. Triumphant Fanfare Arpeggio: C5 (523Hz) -> E5 (659Hz) -> G5 (784Hz) -> C6 (1046Hz)
    const notes = [523.25, 659.25, 783.99, 1046.50]
    notes.forEach((freq, idx) => {
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      const start = now + 0.25 + (idx * 0.12)
      const dur = idx === notes.length - 1 ? 0.6 : 0.2

      osc.type = 'triangle'
      osc.frequency.setValueAtTime(freq, start)

      gain.gain.setValueAtTime(0.2, start)
      gain.gain.exponentialRampToValueAtTime(0.001, start + dur)

      osc.connect(gain)
      gain.connect(ctx.destination)
      osc.start(start)
      osc.stop(start + dur)
    })
  } catch (err) {
    console.warn('[AudioAlertService] Audio playback error:', err)
  }
}

/**
 * Plays a clean crisp double chime notification sound
 */
export function playNotificationSound(): void {
  if (!isSoundEnabled()) return
  try {
    const ctx = getAudioContext()
    if (!ctx) return

    const now = ctx.currentTime
    const notes = [587.33, 880] // D5 -> A5
    notes.forEach((freq, idx) => {
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      const start = now + (idx * 0.1)

      osc.type = 'sine'
      osc.frequency.setValueAtTime(freq, start)

      gain.gain.setValueAtTime(0.18, start)
      gain.gain.exponentialRampToValueAtTime(0.001, start + 0.3)

      osc.connect(gain)
      gain.connect(ctx.destination)
      osc.start(start)
      osc.stop(start + 0.3)
    })
  } catch (err) {
    console.warn('[AudioAlertService] Notification sound error:', err)
  }
}

/**
 * Plays a smooth ping sound (for testing sound toggle)
 */
export function playTestSound(): void {
  try {
    const ctx = getAudioContext()
    if (!ctx) return
    const now = ctx.currentTime
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()

    osc.type = 'sine'
    osc.frequency.setValueAtTime(880, now) // A5
    gain.gain.setValueAtTime(0.2, now)
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35)

    osc.connect(gain)
    gain.connect(ctx.destination)
    osc.start(now)
    osc.stop(now + 0.35)
  } catch {}
}
