// src/checkpoint.mjs — append-only checkpoint log.
//
// Checkpoints are a stable, append-only JSON-lines log under
// <stateDir>/checkpoints.jsonl. The shape matches what DSH's
// uh_checkpoint writes so the same downstream tools can consume both.

import { promises as fs } from 'node:fs'
import path from 'node:path'
import crypto from 'node:crypto'

export function createCheckpoints(stateDir) {
  if (typeof stateDir !== 'string' || stateDir.length === 0) throw new TypeError('createCheckpoints: stateDir is required')
  const file = path.join(stateDir, 'checkpoints.jsonl')
  return {
    file,
    stateDir,
    async list() {
      try {
        const txt = await fs.readFile(file, 'utf8')
        return txt.split('\n').filter(Boolean).map((l) => { try { return JSON.parse(l) } catch { return null } }).filter(Boolean)
      } catch (e) {
        if (e && e.code === 'ENOENT') return []
        throw e
      }
    },
  }
}

/**
 * @param {ReturnType<typeof createCheckpoints>} cp
 * @param {{ phase: string, objective?: string, known?: string[], unknown?: string[], decisions?: string[], filesChanged?: string[], testsRun?: string[], blockers?: string[], nextAction?: string }} update
 */
export async function writeCheckpoint(cp, update) {
  if (!update || typeof update.phase !== 'string') throw new TypeError('writeCheckpoint: update.phase is required')
  await fs.mkdir(cp.stateDir, { recursive: true })
  const rec = {
    id: crypto.randomUUID(),
    ts: new Date().toISOString(),
    ...update,
  }
  await fs.appendFile(cp.file, JSON.stringify(rec) + '\n', 'utf8')
  return rec
}

export async function readCheckpoint(cp, id) {
  const all = await cp.list()
  return all.find((r) => r.id === id) || null
}
