// Real-Time Audio Alert Engine (Real Audio Clips + Web Audio Fallback)
// Enabled by default; plays real stadium horns, whistles, and crowd celebrations.

const SOUND_KEY = 'flowerzfc_sound_enabled'
const GOAL_AUDIO_URL = 'https://assets.mixkit.co/active_storage/sfx/2874/2874-preview.mp3'
const NOTIF_AUDIO_URL = 'https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3'

let preloadedGoalAudio: HTMLAudioElement | null = null
let preloadedNotifAudio: HTMLAudioElement | null = null

if (typeof window !== 'undefined') {
  try {
    preloadedGoalAudio = new Audio(GOAL_AUDIO_URL)
    preloadedGoalAudio.preload = 'auto'
    preloadedGoalAudio.volume = 0.75
    preloadedNotifAudio = new Audio(NOTIF_AUDIO_URL)
    preloadedNotifAudio.preload = 'auto'
    preloadedNotifAudio.volume = 0.65
  } catch {}
}

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
    // Default to true (enabled by default)
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
 * Plays real stadium goal sound (with Web Audio stadium fanfare fallback)
 */
export function playGoalSound(): void {
  if (!isSoundEnabled()) return

  // 1. Try real audio clip first
  try {
    const audio = preloadedGoalAudio || new Audio(GOAL_AUDIO_URL)
    audio.currentTime = 0
    audio.volume = 0.8
    const playPromise = audio.play()
    if (playPromise !== undefined) {
      playPromise.catch(() => {
        // Fallback to Web Audio synthesis if autoplay blocked
        playSynthesizedGoalSound()
      })
      return
    }
  } catch {
    playSynthesizedGoalSound()
  }
}

function playSynthesizedGoalSound(): void {
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
    gainWhistle.gain.setValueAtTime(0.2, now)
    gainWhistle.gain.exponentialRampToValueAtTime(0.01, now + 0.3)

    oscWhistle.connect(gainWhistle)
    gainWhistle.connect(ctx.destination)
    oscWhistle.start(now)
    oscWhistle.stop(now + 0.3)

    // 2. Stadium Air Horn chords: F4 (349Hz), A4 (440Hz), C5 (523Hz)
    const hornNotes = [349.23, 440.0, 523.25, 698.46]
    hornNotes.forEach(freq => {
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.type = 'sawtooth'
      osc.frequency.setValueAtTime(freq, now + 0.1)
      gain.gain.setValueAtTime(0.12, now + 0.1)
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.9)
      osc.connect(gain)
      gain.connect(ctx.destination)
      osc.start(now + 0.1)
      osc.stop(now + 0.9)
    })
  } catch (err) {
    console.warn('[AudioAlertService] Synthesized goal audio error:', err)
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
