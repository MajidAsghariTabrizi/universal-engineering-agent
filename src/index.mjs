// src/index.mjs — package entry point (re-exports kernel contract).
export { createKernel, KERNEL_VERSION, STAGES } from './kernel.mjs'
export { createContextBundle } from './context-budget.mjs'
export { planMission } from './mission.mjs'
export { runVerifyStages } from './verifier.mjs'
export { classifyFailure, CLASSES } from './classifier.mjs'
export { withRetry, NON_RETRYABLE } from './retry.mjs'
export { createCheckpoints, writeCheckpoint, readCheckpoint } from './checkpoint.mjs'
export { createHygieneTrackers } from './hygiene.mjs'
