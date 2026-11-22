/** Narrowing for JSON that enters the pipeline from files and pipes. */

export type JsonObject = Readonly<Record<string, unknown>>

export function isObject(value: unknown): value is JsonObject {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}
