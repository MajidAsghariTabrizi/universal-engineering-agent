import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { add, multiply, greet } from '../src/index.mjs'

describe('add', () => {
  it('returns 5 for add(2, 3)', () => assert.strictEqual(add(2, 3), 5))
  it('returns 0 for add(0, 0)', () => assert.strictEqual(add(0, 0), 0))
  it('handles negatives', () => assert.strictEqual(add(-1, 1), 0))
})

describe('multiply', () => {
  it('returns 6 for multiply(2, 3)', () => assert.strictEqual(multiply(2, 3), 6))
  it('returns 12 for multiply(3, 4)', () => assert.strictEqual(multiply(3, 4), 12))
  it('returns 0 for multiply(0, 5)', () => assert.strictEqual(multiply(0, 5), 0))
})

describe('greet', () => {
  it('greets a person', () => assert.strictEqual(greet('Alice'), 'Hello, Alice!'))
  it('greets an empty name', () => assert.strictEqual(greet(''), 'Hello, !'))
})
