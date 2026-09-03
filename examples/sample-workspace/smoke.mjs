// smoke.mjs — quick integration check for the sample-workspace.
import { add } from './src/index.mjs'
import assert from 'node:assert/strict'
assert.strictEqual(add(1, 2), 3)
console.log('smoke: ok')
