import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { runVerifyStages } from '../src/verifier.mjs'
import { classifyFailure, CLASSES } from '../src/classifier.mjs'
import { withRetry, NON_RETRYABLE } from '../src/retry.mjs'
import { planMission } from '../src/mission.mjs'
import { createContextBundle } from '../src/context-budget.mjs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const SAMPLE = path.join(__dirname, '..', 'examples', 'sample-workspace')

describe('verifier', () => {
  it('runVerifyStages throws without root', async () => {
    await assert.rejects(() => runVerifyStages({}), TypeError)
  })

  it('runs all three stages on sample-workspace', async () => {
    const report = await runVerifyStages({ root: SAMPLE })
    assert.ok(report.stages.length === 3, 'should run static, unit, integration')
    assert.ok(['ok', 'fail'].includes(report.overall))
    report.stages.forEach((s) => {
      assert.ok(typeof s.durationMs === 'number')
    })
  })
})

describe('classifier', () => {
  it('classifies permission denied', () => {
    const r = classifyFailure('permission denied')
    assert.strictEqual(r.code, 'PERMISSION_ERROR')
    assert.ok(typeof r.hint === 'string')
  })

  it('classifies rate limit', () => {
    const r = classifyFailure('429 Too Many Requests')
    assert.strictEqual(r.code, 'PROVIDER_ERROR')
  })

  it('classifies ENOENT as ENVIRONMENT_ERROR', () => {
    const r = classifyFailure('ENOENT: no such file or directory')
    assert.strictEqual(r.code, 'ENVIRONMENT_ERROR')
  })

  it('classifies assertion failure as TEST_ERROR', () => {
    const r = classifyFailure('AssertionError: expected 5 to equal 6')
    assert.strictEqual(r.code, 'TEST_ERROR')
  })

  it('returns UNKNOWN for unrecognizable messages', () => {
    const r = classifyFailure('something weird happened')
    assert.strictEqual(r.code, 'UNKNOWN')
  })

  it('accepts explicit code override for valid code', () => {
    const r = classifyFailure('??', 'PROVIDER_ERROR')
    assert.strictEqual(r.code, 'PROVIDER_ERROR')
  })

  it('accepts explicit code override for invalid code', () => {
    const r = classifyFailure('??', 'BOGUS')
    assert.strictEqual(r.code, 'UNKNOWN')
  })

  it('handles null message', () => {
    const r = classifyFailure(null)
    assert.strictEqual(r.code, 'UNKNOWN')
  })

  it('all 10 classes are represented', () => {
    assert.deepStrictEqual(CLASSES, [
      'CONTEXT_ERROR', 'TOOL_ERROR', 'CODE_ERROR', 'TEST_ERROR', 'CONFIG_ERROR',
      'ENVIRONMENT_ERROR', 'PROVIDER_ERROR', 'PERMISSION_ERROR', 'DEPLOYMENT_ERROR', 'UNKNOWN',
    ])
  })
})

describe('retry', () => {
  it('succeeds on first attempt', async () => {
    let calls = 0
    const result = await withRetry(async () => { calls++; return 42 }, { maxAttempts: 3 })
    assert.strictEqual(result, 42)
    assert.strictEqual(calls, 1)
  })

  it('retries on retryable failure', async () => {
    let calls = 0
    const result = await withRetry(async () => {
      calls++
      if (calls < 3) throw new Error('transient')
      return 'ok'
    }, { maxAttempts: 3, backoffMs: () => 1 })
    assert.strictEqual(result, 'ok')
    assert.strictEqual(calls, 3)
  })

  it('does not retry non-retryable failures', async () => {
    let calls = 0
    await assert.rejects(
      () => withRetry(async () => {
        calls++
        throw new Error('permission denied')
      }, { maxAttempts: 3, backoffMs: () => 1 }),
      (e) => { assert.ok(e.message.includes('permission')); return true },
    )
    assert.strictEqual(calls, 1)
  })

  it('respects maxAttempts', async () => {
    let calls = 0
    await assert.rejects(
      () => withRetry(async () => {
        calls++
        throw new Error('model_not_found')
      }, { maxAttempts: 2, backoffMs: () => 1 }),
    )
    assert.strictEqual(calls, 2)
  })
})

describe('mission', () => {
  it('planMission stages tasks', () => {
    const result = planMission({ id: 'x', objective: 'Do the thing', acceptance: ['a', 'b'] })
    assert.ok(result.tasks.length === 4)
    assert.ok(result.tasks[0].kind === 'implement')
    assert.ok(result.tasks[1].kind === 'verify')
    assert.ok(result.tasks[2].kind === 'verify')
    assert.ok(result.tasks[3].kind === 'recover')
  })

  it('planMission throws without objective', () => {
    assert.throws(() => planMission({}), TypeError)
  })

  it('planMission works with minimal mission', () => {
    const result = planMission({ objective: 'hello' })
    assert.ok(result.tasks.length === 2) // impl + recover
  })
})

describe('context-budget', () => {
  it('returns a bundle with files', async () => {
    const bundle = await createContextBundle({ root: SAMPLE })
    assert.ok(bundle.files.length > 0)
    assert.ok(bundle.bytes > 0)
    assert.strictEqual(bundle.profile, 'generic')
  })

  it('throws without root', async () => {
    await assert.rejects(() => createContextBundle({}), TypeError)
  })
})
