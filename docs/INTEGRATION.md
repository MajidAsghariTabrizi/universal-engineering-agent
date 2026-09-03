# Integration

How to install, run, and extend the UEA reference kit. If you are
integrating it into a DeepSeek Harness session, also read
[`docs/ARCHITECTURE.md`](ARCHITECTURE.md).

## Install

```bash
# from npm (after publish)
npm install universal-engineering-agent-kit

# from this repo
git clone https://github.com/MajidAsghariTabrizi/universal-engineering-agent
cd universal-engineering-agent
npm install
```

There are zero runtime dependencies. The dev-only requirement is
Node 18.17 or later (for the built-in `node --test` runner).

## Use from a script

```js
import { createKernel } from 'universal-engineering-agent-kit'

const kernel = createKernel({
  workspaceRoot: '/path/to/repo',
  stateDir:      '/path/to/repo/.uea',
  profile:       'generic',
  maxAttempts:   3,
})

// 1. Inspect
const { bundle, checkpoint: cp1 } = await kernel.inspect()
console.log(`context: ${bundle.files.length} files, ${bundle.bytes} bytes`)

// 2. Plan
const plan = await kernel.plan({
  id: 'fix-bug-42',
  objective: 'Make the failing test in test/x.test.mjs pass',
  acceptance: ['test passes', 'no source file outside src/ was modified'],
})

// 3. Implement (returns a trace; the actual work is up to you)
const { trace, checkpoint: cp2 } = await kernel.implement(plan)
// ... do the work, mark each task as complete or failed

// 4. Verify
const report = await kernel.verify()
if (report.overall !== 'ok') {
  for (const s of report.stages) {
    if (s.status !== 'ok' && s.status !== 'skip') {
      const c = kernel.classify(s.stderrTail + ' ' + s.stdoutTail)
      console.log(`stage ${s.name} ${s.status}: ${c.code} — ${c.hint}`)
    }
  }
}

// 5. Classify any failure
const c = kernel.classify('rate limit hit')
// → { code: 'PROVIDER_ERROR', message: 'rate limit hit', hint: '...' }

// 6. Bounded retry
const result = await kernel.withRetry(async () => {
  // your work
  return await flakyCall()
})

// 7. Inspect checkpoint history
const history = await kernel.checkpoint('list')
```

## Use from the CLI

```bash
uea inspect examples/sample-workspace
uea plan examples/missions/mission-add-readme.json
uea verify examples/sample-workspace
uea classify "permission denied while deploying"
uea test
uea scan
```

## Use with DeepSeek Harness

The DSH `dsh-universal-harness-core` plugin is the production
implementation of the same contract. The reference kit and the DSH
plugin are interchangeable at the contract level. To switch:

1. **Stay on the reference kit** if you are prototyping, running CI
   outside DSH, or want zero runtime dependencies.
2. **Move to the DSH plugin** if you need profile-driven policy,
   Graphify context, telemetry sinks, or full integration with DSH
   workers.

The contract is the same; only the runtime changes.

## Write your own profile

Profiles are data, not code. The reference kit's profile loader is
deliberately simple (`examples/profiles/generic.yml`). The DSH plugin's
profile loader is the production version with full schema validation.

A minimal custom profile looks like:

```yaml
id: my-team
name: My Team Profile
description: Conservative defaults for our backend repo
safety_policy:
  riskTier: local_only
  failClosed: true
verification_policy:
  stages: [static, unit, integration]
  timeoutMinutes: 10
deployment_policy:
  enabled: false
context_providers: [git, filesystem, documentation]
mission_defaults:
  maxGoalRounds: 30
  tokenBudget: 500000
```

The reference kit only reads the `id` and uses it in receipts. The
DSH plugin reads the full profile and enforces it.

## Extend the kit

The kit is intentionally small. To add a stage:

1. Add the stage name to the `STAGES` array in `src/kernel.mjs`.
2. Add a `stageName(args)` method to the kernel that writes a
   checkpoint and returns a typed result.
3. Add a self-test in `test/*.test.mjs` that exercises the new
   method.
4. Update `docs/OPERATING-KERNEL.md` to document the new stage.

To add a failure class:

1. Add the class name to `CLASSES` in `src/classifier.mjs`.
2. Add a `RULES` entry if you have a stable regex; otherwise the
   default `UNKNOWN` rule still applies.
3. Add a `hintFor` case for the new class.
4. Add a self-test that asserts the new class is reachable from a
   representative message.

To add a verification stage:

1. Add a `verification` entry to the workspace's `package.json` under
   the `uea` key.
2. Run `uea verify .` to confirm the new stage executes.

## CI integration

A minimal CI step:

```yaml
# .github/workflows/uea.yml
name: UEA
on: [push, pull_request]
jobs:
  uea:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
      - run: npm ci
      - run: npm test
      - run: npm run scan
```

`npm test` runs the kit's self-tests. `npm run scan` runs the
pre-publish scanner. Both are zero-dependency and run in under a
second on a typical repo.
