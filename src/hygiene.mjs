// src/hygiene.mjs — tool-hygiene trackers (fingerprint + storm).
//
// The kernel exposes these to verify that the agent is not in a loop
// and is not hammering the same tool with the same arguments. They are
// deliberately tiny and have no dependencies.

import crypto from 'node:crypto'

export function createHygieneTrackers() {
  const fingerprint = new Map() // session -> { map: fp -> { count, lastPreview, lastTs } }
  const storm = new Map()        // session -> { window: [ts,...] }
  const SESSION = 'default'

  return {
    noteToolResult(toolName, args, chars) {
      const fpSource = stableStringify(args)
      const fp = crypto.createHash('sha1').update(toolName + '|' + fpSource).digest('hex').slice(0, 12)
      const preview = JSON.stringify(args).slice(0, 80)
      const session = fingerprint.get(SESSION) || { map: new Map() }
      const hit = session.map.get(fp) || { count: 0, lastPreview: preview, lastTs: 0 }
      hit.count += 1
      hit.lastPreview = preview
      hit.lastTs = Date.now()
      session.map.set(fp, hit)
      fingerprint.set(SESSION, session)
      return { tool: toolName, fp, count: hit.count, preview, chars }
    },
    noteFailure(turn, step, code) {
      const now = Date.now()
      const session = storm.get(SESSION) || { window: [] }
      session.window = session.window.filter((t) => now - t < 60_000)
      session.window.push(now)
      storm.set(SESSION, session)
      const event = session.window.length >= 5 ? 'storm.detected' : null
      return { event, failures: session.window.length, turn, step, code }
    },
    fingerprintState() { return fingerprint.get(SESSION) || { map: new Map() } },
    stormState() { return storm.get(SESSION) || { window: [] } },
  }
}

function stableStringify(v) {
  if (v === null || typeof v !== 'object') return JSON.stringify(v)
  if (Array.isArray(v)) return '[' + v.map(stableStringify).join(',') + ']'
  const keys = Object.keys(v).sort()
  return '{' + keys.map((k) => JSON.stringify(k) + ':' + stableStringify(v[k])).join(',') + '}'
}
