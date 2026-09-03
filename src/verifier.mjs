// src/verifier.mjs — staged STATIC -> UNIT -> INTEGRATION runner.
//
// The reference kit ships three stages. Each stage returns a result
// with the same shape: { name, status, durationMs, detail }. The runner
// short-circuits on the first non-ok status (configurable).
//
// Stages are read from the workspace's package.json under
// `uea.verification` if present; otherwise built-in defaults are used.

import { promises as fs } from 'node:fs'
import path from 'node:path'
import { spawn } from 'node:child_process'

const DEFAULT_STAGES = [
  { name: 'static', command: ['node', '--check', 'src/index.mjs'], optional: true },
  { name: 'unit', command: ['node', '--test', 'test/'], optional: true },
  { name: 'integration', command: ['node', 'examples/sample-workspace/smoke.mjs'], optional: true },
]

function run(cmd, cwd, timeoutMs = 60_000) {
  return new Promise((resolve) => {
    const start = Date.now()
    let stdout = '', stderr = '', settled = false
    const finish = (status, detail) => {
      if (settled) return
      settled = true
      resolve({ status, durationMs: Date.now() - start, detail, stdout, stderr })
    }
    let child
    try {
      child = spawn(cmd[0], cmd.slice(1), { cwd, shell: false })
    } catch (err) {
      finish('error', `spawn failed: ${err && err.message || err}`)
      return
    }
    const timer = setTimeout(() => {
      try { child.kill() } catch { /* noop */ }
      finish('timeout', `timed out after ${timeoutMs}ms`)
    }, timeoutMs)
    child.stdout.on('data', (b) => { stdout += b.toString() })
    child.stderr.on('data', (b) => { stderr += b.toString() })
    child.on('error', (err) => { clearTimeout(timer); finish('error', err.message) })
    child.on('close', (code) => {
      clearTimeout(timer)
      if (code === 0) finish('ok', 'exit 0')
      else finish('fail', `exit ${code}`)
    })
  })
}

async function loadStages(root) {
  try {
    const txt = await fs.readFile(path.join(root, 'package.json'), 'utf8')
    const pkg = JSON.parse(txt)
    if (pkg && pkg.uea && Array.isArray(pkg.uea.verification) && pkg.uea.verification.length > 0) {
      return pkg.uea.verification
    }
  } catch { /* no package.json or no uea block */ }
  return DEFAULT_STAGES
}

/**
 * Run staged verification. Skips `optional` stages whose command would
 * fail because of a missing file (ENOENT on argv[1]).
 *
 * @param {{ root: string, stopOnFirstFail?: boolean, timeoutMs?: number }} args
 */
export async function runVerifyStages({ root, stopOnFirstFail = true, timeoutMs = 60_000 }) {
  if (typeof root !== 'string' || root.length === 0) throw new TypeError('runVerifyStages: root is required')
  const stages = await loadStages(root)
  const results = []
  for (const s of stages) {
    // Skip optional stages whose target file is missing.
    if (s.optional) {
      const target = s.command[2]
      if (target) {
        try { await fs.access(path.join(root, target)) } catch { results.push({ name: s.name, status: 'skip', durationMs: 0, detail: `optional target missing: ${target}` }); continue }
      }
    }
    const r = await run(s.command, root, timeoutMs)
    results.push({ name: s.name, status: r.status, durationMs: r.durationMs, detail: r.detail, stdoutTail: r.stdout.slice(-2000), stderrTail: r.stderr.slice(-2000) })
    if (stopOnFirstFail && (r.status === 'fail' || r.status === 'error' || r.status === 'timeout')) break
  }
  const overall = results.every((r) => r.status === 'ok' || r.status === 'skip') ? 'ok' : 'fail'
  return { overall, stages: results }
}
