/** Reads the example values of a step, failing the step on a malformed one. */

export function parseNumber(text: string, what: string): number {
  const value = Number(text)
  if (text.trim() === '' || !Number.isFinite(value)) throw new Error(`${what} must be a number, not "${text}"`)
  return value
}

function parseWholeNumber(text: string, what: string, minimum: number, expected: string): number {
  const value = Number(text)
  if (text.trim() === '' || !Number.isInteger(value) || value < minimum) {
    throw new Error(`${what} must be ${expected}, not "${text}"`)
  }
  return value
}

export function parseCount(text: string, what: string): number {
  return parseWholeNumber(text, what, 0, 'a whole number')
}

/** A position in a list, counted from 1. */
export function parsePosition(text: string, what: string): number {
  return parseWholeNumber(text, what, 1, 'a whole number from 1')
}
