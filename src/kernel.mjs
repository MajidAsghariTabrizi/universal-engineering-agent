// src/kernel.mjs — Universal Engineering Agent operating-kernel reference.
//
// This is a STANDALONE, profile-agnostic implementation of the UEA
// operating-kernel contract. It is independent of the DeepSeek Harness
// dsh-universal-harness-core plugin and can be exercised without DSH.
//
// The 9 stages, in order:
//   1. inspect        — load a workspace and produce a Context Bundle
//   2. plan           — turn a Mission into staged tasks (implements, verify)
//   3. implement      — execute staged tasks against the workspace
//   4. tool-hygiene   — track per-tool repeat fingerprints and result sizes
//   5. verify         — staged STATIC -> UNIT -> INTEGRATION runner
//   6. classify       — turn a failure string into a 10-class error code
//   7. recover        — bounded retry with non-retryable fall-through
//   8. test           — self-tests the kit provides
//   9. generalize     — emit a profile-agnostic receipt and checkpoint
//
// The contract is documented in docs/OPERATING-KERNEL.md.

import { createContextBundle } from './context-budget.mjs'
import { planMission } from './mission.mjs'
import { runVerifyStages } from './verifier.mjs'
import { classifyFailure } from './classifier.mjs'
import { createCheckpoints, writeCheckpoint, readCheckpoint } from './checkpoint.mjs'
import { createHygieneTrackers } from './hygiene.mjs'
import { withRetry, NON_RETRYABLE } from './retry.mjs'

export const KERNEL_VERSION = '0.1.0'
export const STAGES = ['inspect', 'plan', 'implement', 'tool-hygiene', 'verify', 'classify', 'recover', 'test', 'generalize']

/**
 * @typedef {Object} KernelOptions
 * @property {string}   workspaceRoot   absolute path to the workspace under work
 * @property {string}   [stateDir]      where checkpoints + receipts are written
 * @property {string}   [profile]       profile id, used only in receipts
 * @property {number}   [maxAttempts]   total retry budget per stage (default 3)
 */

/**
 * Build a kernel. The kernel is intentionally state-light; persistence
 * happens through checkpoints.
 *
 * @param {KernelOptions} opts
 */
export function createKernel(opts) {
  if (!opts || typeof opts.workspaceRoot !== 'string' || opts.workspaceRoot.length === 0) {
    throw new TypeError('createKernel: workspaceRoot is required')
  }
  const stateDir = opts.stateDir || `${opts.workspaceRoot}/.uea`
  const profile = opts.profile || 'generic'
  const maxAttempts = Number.isInteger(opts.maxAttempts) && opts.maxAttempts > 0 ? opts.maxAttempts : 3
  const checkpoints = createCheckpoints(stateDir)

  return {
    version: KERNEL_VERSION,
    stages: STAGES.slice(),

    async inspect() {
      const bundle = await createContextBundle({ root: opts.workspaceRoot, profile })
      const cp = await writeCheckpoint(checkpoints, { phase: 'inspected', known: [`files=${bundle.files.length}`, `bytes=${bundle.bytes}`] })
      return { bundle, checkpoint: cp.id }
    },

    async plan(mission) {
      const staged = planMission(mission)
      const cp = await writeCheckpoint(checkpoints, { phase: 'planned', known: [`tasks=${staged.tasks.length}`], decisions: [`profile=${profile}`] })
      return { ...staged, checkpoint: cp.id }
    },

    async implement(plan) {
      // The reference kit is a *kernel contract*, not a worker. It produces
      // an executable trace; production callers (DSH, free-best-router, or
      // your own runner) execute the tasks and feed results back.
      const cp = await writeCheckpoint(checkpoints, { phase: 'implemented', known: [`tasks=${plan.tasks.length}`] })
      return { trace: plan.tasks.map((t) => ({ id: t.id, kind: t.kind, status: 'queued' })), checkpoint: cp.id }
    },

    async verify() {
      const report = await runVerifyStages({ root: opts.workspaceRoot })
      const cp = await writeCheckpoint(checkpoints, {
        phase: 'verified',
        known: report.stages.map((s) => `${s.name}=${s.status}`),
        testsRun: [`verify:${report.stages.map((s) => s.name).join('+')}`],
      })
      return { ...report, checkpoint: cp.id }
    },

    classify(message, code) {
      return classifyFailure(message, code)
    },

    async withRetry(fn, { isNonRetryable } = {}) {
      return withRetry(fn, { maxAttempts, isNonRetryable: isNonRetryable || ((e) => NON_RETRYABLE.has(classifyFailure(String(e && e.message || e)).code)) })
    },

    async checkpoint(action) {
      if (action === 'list') return checkpoints.list()
      if (action && action.id) return readCheckpoint(checkpoints, action.id)
      return null
    },

    hygiene: createHygieneTrackers(),
  }
}
