// src/retry.mjs — bounded retry with non-retryable fall-through.
//
// The contract: there is ONE retry policy per stage. The policy is
// profile-tunable (defaults: routine 2, normal 3, critical 4) and
// classifies failures via the supplied `isNonRetryable` predicate.
// Non-retryable failures never loop; they fall through with the
// original error so the operator can decide.

import { classifyFailure } from './classifier.mjs'

export const NON_RETRYABLE = new Set([
  'PERMISSION_ERROR',
  'CONFIG_ERROR',
  'DEPLOYMENT_ERROR',
])

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

/**
 * Run `fn` with bounded retry.
 * @template T
 * @param {() => Promise<T>} fn
 * @param {{ maxAttempts?: number, isNonRetryable?: (e: any) => boolean, backoffMs?: (n: number) => number, onAttempt?: (n: number, err?: any) => void }} [opts]
 * @returns {Promise<T>}
 */
export async function withRetry(fn, opts = {}) {
  const maxAttempts = Number.isInteger(opts.maxAttempts) && opts.maxAttempts > 0 ? opts.maxAttempts : 3
  const isNonRetryable = opts.isNonRetryable || ((e) => NON_RETRYABLE.has(classifyFailure(String(e && e.message || e)).code))
  const backoffMs = opts.backoffMs || ((n) => Math.min(1000 * 2 ** (n - 1), 8000))
  let lastErr
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      if (opts.onAttempt) opts.onAttempt(attempt, lastErr)
      return await fn()
    } catch (err) {
      lastErr = err
      if (isNonRetryable(err) || attempt === maxAttempts) throw err
      await sleep(backoffMs(attempt))
    }
  }
  // Unreachable, but TypeScript-friendly.
  throw lastErr
}
