import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { createKernel, KERNEL_VERSION, STAGES } from '../src/kernel.mjs'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const SAMPLE_WORKSPACE = path.join(__dirname, '..', 'examples', 'sample-workspace')
const STATE_DIR = path.join(__dirname, '..', '.uea-test')

describe('kernel', () => {
  it('exports the correct version', () => {
    assert.strictEqual(KERNEL_VERSION, '0.1.0')
  })

  it('exports all 9 stages', () => {
    assert.deepStrictEqual(STAGES, ['inspect', 'plan', 'implement', 'tool-hygiene', 'verify', 'classify', 'recover', 'test', 'generalize'])
  })

  it('createKernel throws without workspaceRoot', () => {
    assert.throws(() => createKernel(), TypeError)
    assert.throws(() => createKernel({}), TypeError)
    assert.throws(() => createKernel({ workspaceRoot: '' }), TypeError)
  })

  it('createKernel creates a valid kernel', () => {
    const k = createKernel({ workspaceRoot: SAMPLE_WORKSPACE, stateDir: STATE_DIR })
    assert.strictEqual(k.version, '0.1.0')
    assert.strictEqual(k.stages.length, 9)
  })

  it('kernel.inspect returns a bundle with files', async () => {
    const k = createKernel({ workspaceRoot: SAMPLE_WORKSPACE, stateDir: STATE_DIR })
    const { bundle } = await k.inspect()
    assert.ok(bundle.files.length > 0, 'bundle should contain files')
    assert.ok(bundle.bytes > 0, 'bundle should have bytes')
    assert.strictEqual(bundle.profile, 'generic')
  })

  it('kernel.plan stages tasks from a mission', async () => {
    const k = createKernel({ workspaceRoot: SAMPLE_WORKSPACE, stateDir: STATE_DIR })
    const plan = await k.plan({
      id: 'test-mission',
      objective: 'Add a hello world function',
      acceptance: ['It returns "hello"', 'It handles empty input'],
    })
    assert.ok(plan.tasks.length >= 3, 'should have implement + verify + recover tasks')
    assert.strictEqual(plan.tasks[0].kind, 'implement')
    assert.strictEqual(plan.tasks[0].summary, 'Add a hello world function')
    assert.ok(plan.tasks.every((t) => typeof t.id === 'string'))
  })

  it('kernel.plan with no acceptance still emits implement + recover', async () => {
    const k = createKernel({ workspaceRoot: SAMPLE_WORKSPACE, stateDir: STATE_DIR })
    const plan = await k.plan({ id: 'noacc', objective: 'just do it' })
    assert.ok(plan.tasks.length === 2, 'should have implement + recover only')
  })

  it('kernel.implement produces a trace of queued tasks', async () => {
    const k = createKernel({ workspaceRoot: SAMPLE_WORKSPACE, stateDir: STATE_DIR })
    const plan = await k.plan({ id: 'test', objective: 'x', acceptance: ['a', 'b'] })
    const { trace } = await k.implement(plan)
    assert.ok(Array.isArray(trace))
    // plan has 1 implement + 2 verify + 1 recover; kernel.implement traces them all as queued
    assert.ok(trace.length === 4, `expected 4 tasks, got ${trace.length}`)
    assert.ok(trace.every((t) => t.status === 'queued'))
    assert.ok(trace.every((t) => ['implement', 'verify', 'recover'].includes(t.kind)))
  })

  it('kernel.verify runs staged verification', async () => {
    const k = createKernel({ workspaceRoot: SAMPLE_WORKSPACE, stateDir: STATE_DIR })
    const report = await k.verify()
    assert.ok(Array.isArray(report.stages))
    assert.ok(report.stages.length >= 2)
    assert.ok(report.stages.every((s) => typeof s.name === 'string' && typeof s.status === 'string'))
  })

  it('kernel.classify returns a valid code', () => {
    const k = createKernel({ workspaceRoot: SAMPLE_WORKSPACE, stateDir: STATE_DIR })
    const result = k.classify('permission denied')
    assert.ok(result && typeof result === 'object', 'classify must return an object synchronously')
    assert.strictEqual(result.code, 'PERMISSION_ERROR')
    assert.ok(typeof result.hint === 'string')
  })

  it('kernel.checkpoint list returns an array', async () => {
    const k = createKernel({ workspaceRoot: SAMPLE_WORKSPACE, stateDir: STATE_DIR })
    await k.inspect() // write at least one checkpoint
    const list = await k.checkpoint('list')
    assert.ok(Array.isArray(list))
    assert.ok(list.length >= 1)
  })
})
