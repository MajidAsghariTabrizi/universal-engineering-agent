# Universal Engineering Agent (UEA) — Reference Kit

> Profile-agnostic, runnable, MIT-licensed reference implementation of the
> **Universal Engineering Agent operating-kernel contract**.
>
> Independent of any one vendor. Designed to be used standalone, or alongside
> the [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness)
> `dsh-universal-harness-core` plugin, or alongside
> [`free-best-router`](https://github.com/MajidAsghariTabrizi/free-best-router).
>
> Featured on the DSH ["Show Your Plugins!"](https://github.com/deepseek-ai/deepseek-harness/discussions/5513) board.

---

## What is UEA?

The **Universal Engineering Agent (UEA)** is a *pattern*, not a product. It
is the small set of behaviors any coding agent needs to ship reliable work
without becoming a maintenance liability:

1. **Inspect** the workspace and compose a budgeted context bundle.
2. **Plan** a mission into staged tasks.
3. **Implement** the tasks, tracking tool hygiene.
4. **Verify** with a staged runner (STATIC → UNIT → INTEGRATION).
5. **Classify** every failure into a stable 10-class error code.
6. **Recover** with bounded retry and non-retryable fall-through.
7. **Test** the agent's own code, not just the user's.
8. **Generalize** the lessons into a profile-agnostic checkpoint.

The 9-stage form is the full contract: the `test` stage above tests the
*agent's* code, the `verify` stage tests the *user's* code. The kit ships
31 self-tests for stage 7 and a staged runner for stage 4.

The UEA is **not a model**, **not an agent framework**, and **not a vendor
product**. It is the smallest possible reusable shell that an LLM-driven
engineering agent can sit inside and still be production-safe.

This repository is the **reference implementation** of that pattern. It is
written in plain Node.js, has zero runtime dependencies, runs on Node 18.17
and later, and ships with a self-contained CLI plus 31 self-tests.

---

## Why does this exist?

Most engineering-agent prompts in the wild grow until they are unmaintainable.
The author keeps adding "and also do X" and "and also remember Y" until the
system prompt is 4,000 tokens of tribal knowledge that nobody outside the
author can re-use.

UEA is the opposite direction. It is intentionally small and intentionally
*profile-agnostic*. The product-specific knowledge (which languages, which
deployment policy, which safety tier) lives in a **profile**, not in the
kernel. The kernel owns only what every agent needs.

This repo is the canonical reference for the kernel contract. It is what
every profile — including the production profile, the language profiles, and
your own custom profile — can rely on.

---

## Relationship to other projects

| Project | Relationship to UEA |
|---|---|
| [`deepseek-ai/deepseek-harness`](https://github.com/deepseek-ai/deepseek-harness) | The DSH framework. UEA runs *inside* DSH as the `dsh-universal-harness-core` plugin. This repo is the standalone reference for that plugin's contract. |
| `dsh-universal-harness-core` (the DSH plugin) | The production implementation. This repo is its open, public-spec counterpart that anyone can `npm install` and exercise without DSH. |
| [`MajidAsghariTabrizi/free-best-router`](https://github.com/MajidAsghariTabrizi/free-best-router) | A sibling OSS project. `free-best-router` solves *which free model* to call; UEA solves *how to coordinate an agent around any model*. They are complementary, not competing. |
| Your own project | You can write a `profile.yml` (see `examples/profiles/generic.yml`) that wires UEA to your stack, and run `npx universal-engineering-agent-kit verify .` in CI. |

---

## Install

```bash
npm install universal-engineering-agent-kit
# or, run from this repo without installing:
npx --prefix . uea inspect examples/sample-workspace
```

The kit ships a `uea` binary that gives you the four most useful commands
without writing any glue code:

```bash
uea inspect <workspace>     # print a context bundle for the workspace
uea plan <mission.json>     # stage a mission into executable tasks
uea verify <workspace>      # run staged verification
uea classify <message>      # classify a failure string
uea test                    # run this kit's own self-tests
uea scan                    # run the pre-publish secret/PII scanner
```

---

## Quick start

```bash
git clone https://github.com/MajidAsghariTabrizi/universal-engineering-agent
cd universal-engineering-agent
npm install
npm test

# See a context bundle
node bin/uea.mjs inspect examples/sample-workspace

# Stage a mission
node bin/uea.mjs plan examples/missions/mission-add-readme.json

# Classify a failure
node bin/uea.mjs classify "permission denied while deploying"

# Run staged verification (the sample workspace has a deliberate bug;
# this is the "find the bug" demo — see examples/missions/)
node bin/uea.mjs verify examples/sample-workspace
```

---

## The 9-stage kernel

A kernel instance is created with `createKernel({ workspaceRoot, stateDir, profile, maxAttempts })`.
It exposes the 9 stages above plus a `hygiene` tracker. See
[`docs/OPERATING-KERNEL.md`](docs/OPERATING-KERNEL.md) for the full contract
and the rationale for each stage.

```js
import { createKernel } from 'universal-engineering-agent-kit'

const kernel = createKernel({
  workspaceRoot: '/path/to/your/repo',
  stateDir:      '/path/to/your/repo/.uea',
  profile:       'generic',
  maxAttempts:   3,
})

const { bundle } = await kernel.inspect()        // 1. inspect
const plan       = await kernel.plan(mission)    // 2. plan
const { trace }  = await kernel.implement(plan)  // 3. implement (queued trace; you run it)
const report     = await kernel.verify()         // 4. verify
const code       = kernel.classify(err.message)  // 5. classify (sync)
const result     = await kernel.withRetry(fn)    // 6. recover
const ckpts      = await kernel.checkpoint('list') // 7. test + generalize (read history)
```

---

## Documentation

| Doc | What |
|---|---|
| [`docs/OPERATING-KERNEL.md`](docs/OPERATING-KERNEL.md) | The 9-stage contract, one section per stage, with the *why*. |
| [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) | How UEA fits into the DSH ecosystem and how it relates to other OSS projects. |
| [`docs/MISSIONS.md`](docs/MISSIONS.md) | The three example missions and what each exercises. |
| [`docs/INTEGRATION.md`](docs/INTEGRATION.md) | How to install, run, and extend the kit; how to write your own profile. |
| [`docs/ROADMAP.md`](docs/ROADMAP.md) | Honest next steps. What's done, what's planned, what's deliberately not planned. |
| [`SECURITY.md`](SECURITY.md) | Threat model, what is *not* in this repo, how to report issues. |
| [`CHANGELOG.md`](CHANGELOG.md) | Release history. |

---

## Limitations and what is deliberately *not* in this repo

UEA is a kernel, not a worker. This reference kit does **not**:

- Call any LLM. It is a tool, not an agent. You bring the model.
- Persist state to a database. Checkpoints are JSON-lines on disk.
- Depend on Graphify, on a vendor SDK, or on any specific cloud. The DSH
  production plugin provides all of those; the kernel contract does not
  require them.
- Include any product-specific, project-specific, or vendor-specific
  terminology. (This is verified by `npm run scan` on every commit.)

See [`docs/ROADMAP.md`](docs/ROADMAP.md) for the full honest list.

---

## Contributing

PRs welcome. The bar is small:

1. Add a self-test for any new behavior (`test/*.test.mjs`, plain `node --test`).
2. Keep the kernel profile-agnostic. Project-specific knowledge goes in a profile.
3. Do not introduce runtime dependencies without a written justification in
   the PR description.
4. Run `npm run scan` before pushing; it must remain green.

---

## License

MIT. See [`LICENSE`](LICENSE).

---

## Acknowledgements

- The DeepSeek Harness team for the `dsh-universal-harness-core` plugin that
  this kit is patterned after.
- Every agent author who has ever fought prompt-engineering debt — the UEA
  is the answer to that debt, not a new way to take it on.
