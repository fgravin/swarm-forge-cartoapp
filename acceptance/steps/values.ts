/** Reads the example values of a step, failing the step on a malformed one. */

export function parseNumber(text: string, what: string): number {
  const value = Number(text)
  if (text.trim() === '' || !Number.isFinite(value)) throw new Error(`${what} must be a number, not "${text}"`)
  return value
}

export function parseCount(text: string, what: string): number {
  const value = Number(text)
  if (text.trim() === '' || !Number.isInteger(value) || value < 0) {
    throw new Error(`${what} must be a whole number, not "${text}"`)
  }
  return value
}

/** A position in a list, counted from 1. */
export function parsePosition(text: string, what: string): number {
  const value = Number(text)
  if (!Number.isInteger(value) || value < 1) throw new Error(`${what} must be a whole number from 1, not "${text}"`)
  return value
}
