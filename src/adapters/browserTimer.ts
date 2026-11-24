import type { Timer } from '../application/timerPort'

/** The browser's timers. */
export const browserTimer: Timer = {
  after(milliseconds, action) {
    const id = window.setTimeout(action, milliseconds)
    return () => window.clearTimeout(id)
  },
}
