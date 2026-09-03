# The UEA Operating-Kernel Contract

The Universal Engineering Agent is built around a single contract: the
**operating-kernel contract**. A *profile* (e.g. `generic`, `production`,
`python`, your own custom profile) supplies policy, defaults, and
project-specific knowledge. The *kernel* owns the nine generic stages
every agent must perform.

This document is the contract. The reference implementation in `src/`
is one valid implementation; the DSH `dsh-universal-harness-core` plugin
is another. They MUST remain aligned.

## The 9 stages

### 1. `inspect` — Compose a budgeted Context Bundle

**Input:** workspace root, active profile id.
**Output:** `{ files: [{ path, bytes, score }], bytes, profile, root }`.
**Invariants:**

- The bundle is **ranked by relevance**, not enumerated.
- Hard budgets: `maxFiles`, `maxBytes`, `maxFileBytes`. None may be
  silently exceeded.
- Excluded directories: `node_modules`, `.git`, `.uea`, `dist`, `build`,
  `coverage`, `__pycache__`, `.venv`, `venv`.
- The bundle never includes files larger than `maxFileBytes`.

**Why:** the model only needs a *relevant slice* of the repo, not the
whole repo. Dumping thousands of files into context is the single most
common cause of agent degradation.

### 2. `plan` — Stage a Mission into tasks

**Input:** a Mission (`{ id, objective, acceptance, known, unknown, budgets }`).
**Output:** `{ id, tasks: [{ id, kind, summary, dependsOn }] }`.
**Invariants:**

- A Mission without `objective` is rejected with `TypeError`.
- The first task is always `kind: 'implement'`.
- Each `acceptance` criterion becomes a `kind: 'verify'` task depending on
  the implement task.
- A trailing `kind: 'recover'` task depends on every other task.

**Why:** a stable, predictable task shape lets profiles and tools reason
about the work without parsing free-text objectives.

### 3. `implement` — Emit an executable trace

**Input:** a Plan.
**Output:** `{ trace: [{ id, kind, status }] }`.
**Invariants:**

- The trace preserves the order and kind of the input plan.
- Every task starts as `status: 'queued'`. The reference kit does NOT
  execute tasks itself — that is the worker's job. DSH workers,
  free-best-router orchestration, or your own runner is responsible for
  marking them complete.

**Why:** the kernel is a *contract*, not a worker. Splitting these
concerns is what makes the contract testable and reusable.

### 4. `tool-hygiene` — Track fingerprints and storms

**State:** a per-session fingerprint map (tool + args → count) and a
rolling 60-second failure window.
**Invariants:**

- A fingerprint is `sha1(toolName | stableStringify(args))[:12]`.
- A "storm" is ≥5 failures of any kind within a 60-second window.
- Fingerprints and storms are *observability*, not enforcement. The
  contract says: expose them. Profiles decide what to do with them.

**Why:** the most common LLM-agent failure mode is silent loops and
re-asking the same question. Counting and exposing them is the cheapest
mitigation that still works.

### 5. `verify` — Staged STATIC → UNIT → INTEGRATION runner

**Input:** workspace root, optional stage list.
**Output:** `{ overall, stages: [{ name, status, durationMs, detail }] }`.
**Invariants:**

- Stages are declared in the workspace's `package.json` under
  `uea.verification` (an array of `{ name, command, optional }`).
- If `uea.verification` is absent, the kernel uses a built-in default
  that runs `node --check src/index.mjs`, `node --test test/`, and a
  `smoke.mjs` if present.
- Each stage runs with a per-stage timeout (default 60 s). The runner
  short-circuits on the first non-ok status unless `stopOnFirstFail: false`.
- A missing optional target produces `status: 'skip'`, not `status: 'fail'`.

**Why:** agents that *only* run unit tests miss lint errors and broken
entry points. A staged runner gives early cheap signal plus late
expensive signal.

### 6. `classify` — Turn a failure string into a 10-class code

**Input:** a failure message, optional explicit code override.
**Output:** `{ code, message, hint }` where `code` is one of
`CONTEXT_ERROR | TOOL_ERROR | CODE_ERROR | TEST_ERROR | CONFIG_ERROR |
ENVIRONMENT_ERROR | PROVIDER_ERROR | PERMISSION_ERROR | DEPLOYMENT_ERROR |
UNKNOWN`.

**Invariants:**

- The classifier is **deterministic** and rule-based. It is not a
  network call. Production profiles MAY replace it with a model-based
  classifier, but the 10-class enum is the contract surface.
- The classifier accepts an explicit `code` override; if the override is
  not in the enum, it falls back to `UNKNOWN`.
- A `null` or empty message returns `code: 'UNKNOWN'`.

**Why:** retries are only safe if the failure class is known. The 10
classes are the minimum vocabulary for "what should the agent do next".

### 7. `recover` — Bounded retry with non-retryable fall-through

**Input:** a function, optional policy overrides.
**Output:** the function's return value, or a thrown error.
**Invariants:**

- `PERMISSION_ERROR`, `CONFIG_ERROR`, and `DEPLOYMENT_ERROR` are
  non-retryable. The first failure short-circuits.
- Default `maxAttempts` is 3. The first attempt is `1`; the last is
  `maxAttempts`.
- Backoff defaults to `min(1000 * 2^(n-1), 8000)` ms. Profiles can override.

**Why:** blindly retrying on every error burns quota and time. The
kernel owns the *policy*; the profile owns the *tunables*.

### 8. `test` — Self-tests for the kit

The kernel ships a self-test suite (`test/*.test.mjs`) that exercises
every public surface: kernel lifecycle, context bundle, plan staging,
trace emission, verifier (with skips for missing optional stages),
classifier (all 10 classes), retry policy, and checkpoint persistence.
`npm test` runs all of them with plain `node --test` — no extra runner.

**Why:** a reference kit that does not test itself teaches the wrong
lesson. The self-tests are also the spec.

### 9. `generalize` — Emit profile-agnostic receipts and checkpoints

Every state-changing stage writes a checkpoint to
`<stateDir>/checkpoints.jsonl`. Each checkpoint is a single JSON line
with `id`, `ts`, `phase`, and the sparse update fields
(`known`, `unknown`, `hypotheses`, `decisions`, `filesChanged`,
`testsRun`, `blockers`, `nextAction`).

**Invariants:**

- The checkpoint file is **append-only**. No rewriting, no compaction.
- The shape matches what DSH's `uh_checkpoint` writes, so the same
  downstream tooling can consume both.

**Why:** when the agent wakes up tomorrow, the only durable memory is
the checkpoint log. The kernel's job is to keep that log consistent
across all stages and all profiles.

---

## Profile contract (one section, by reference)

A profile (`profile.yml`) declares:

- `id`, `name`, `description`
- `capabilities` — the set of stage aliases the profile enables
- `constraints` — human-readable guardrails
- `safety_policy` — `riskTier`, `failClosed`, `retry`, `ownerApproval`, `ownerAckToken`
- `verification_policy` — stages, timeout, classifier override, defaults
- `deployment_policy` — enabled, semantic, auto-deploy, provenance
- `context_providers` — which providers to include
- `mission_defaults` — what every mission inherits
- `budgets` — per-budget ceilings

See `examples/profiles/generic.yml` for a working example.

The kernel never reads the profile directly. The reference kit reads
the profile *id*; the DSH plugin reads the full profile. The contract
is the same: a profile is data, not code.
