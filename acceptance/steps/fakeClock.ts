import type { Timer } from '../../src/application/searchPorts'

/** A clock whose time passes only when a step says so. */
export interface FakeClock {
  readonly timer: Timer
  /** Lets `milliseconds` pass, running each action as it falls due, and what follows from it. */
  pass(milliseconds: number): Promise<void>
}

interface Scheduled {
  readonly due: number
  readonly action: () => void
  done: boolean
}

/** Lets every promise that can settle now settle, and what follows from them. */
export function settle(): Promise<void> {
  return new Promise((resolve) => setImmediate(resolve))
}

export function createFakeClock(): FakeClock {
  let now = 0
  const scheduled: Scheduled[] = []

  function nextDue(until: number): Scheduled | undefined {
    return scheduled.filter((entry) => !entry.done && entry.due <= until).sort((a, b) => a.due - b.due)[0]
  }

  return {
    timer: {
      after(milliseconds, action) {
        const entry: Scheduled = { due: now + milliseconds, action, done: false }
        scheduled.push(entry)
        return () => {
          entry.done = true
        }
      },
    },
    async pass(milliseconds) {
      const until = now + milliseconds
      for (let entry = nextDue(until); entry; entry = nextDue(until)) {
        now = entry.due
        entry.done = true
        entry.action()
        await settle()
      }
      now = until
    },
  }
}
