/** What the application needs to act once some time has passed. */
export interface Timer {
  /** Calls `action` once, `milliseconds` from now. Returns the function that cancels it. */
  after(milliseconds: number, action: () => void): () => void
}
