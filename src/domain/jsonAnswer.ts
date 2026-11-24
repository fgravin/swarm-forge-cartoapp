/** What a web service answered: a JSON body, or nothing usable (no connection, an HTTP error, no JSON). */
export type JsonAnswer = { readonly kind: 'answered'; readonly body: unknown } | { readonly kind: 'failed' }
