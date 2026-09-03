# Architecture

This document explains how the Universal Engineering Agent kit fits into
the broader agent ecosystem and how its pieces fit together.

## Layered model

```
                        ┌──────────────────────────────────────────┐
                        │  LLM (any model — bring your own)        │
                        └────────────────────┬─────────────────────┘
                                             │ tool calls
                                             ▼
┌────────────────────────────────────────────────────────────────────┐
│  Kernel contract (this repo)                                       │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐  │
│  │ inspect  │ │ plan     │ │ implement│ │ verify   │ │ classify │  │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘ └──────────┘  │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐                            │
│  │ recover  │ │ test     │ │generalize│                            │
│  └──────────┘ └──────────┘ └──────────┘                            │
└────────────────────────────────────────────────────────────────────┘
                                             ▲
                                             │ profile = data
                                             │
┌────────────────────────────────────────────────────────────────────┐
│  Profile                                                            │
│  ┌────────────┐  ┌────────────┐  ┌────────────┐                    │
│  │ generic    │  │ production │  │ your-own   │  ...               │
│  └────────────┘  └────────────┘  └────────────┘                    │
└────────────────────────────────────────────────────────────────────┘
                                             ▲
                                             │ mount
                                             │
┌────────────────────────────────────────────────────────────────────┐
│  Runtime (one of)                                                   │
│   • DeepSeek Harness  (dsh-universal-harness-core plugin)            │
│   • free-best-router  (any model router; uses UEA contract)         │
│   • Your own script  (npm install universal-engineering-agent-kit)  │
└────────────────────────────────────────────────────────────────────┘
```

The contract is the same at every level. Profiles are data, the kernel
is the contract, and the runtime is the glue.

## Components of this repo

```
universal-engineering-agent/
├── src/
│   ├── kernel.mjs          # 9-stage orchestrator
│   ├── context-budget.mjs  # Stage 1: inspect
│   ├── mission.mjs         # Stage 2: plan
│   ├── verifier.mjs        # Stage 4: verify
│   ├── classifier.mjs      # Stage 5: classify (10 classes)
│   ├── retry.mjs           # Stage 6: recover (bounded retry)
│   ├── checkpoint.mjs      # Stage 9: generalize
│   ├── hygiene.mjs         # Stage 3: tool-hygiene
│   └── index.mjs           # package entry point
├── bin/
│   └── uea.mjs             # CLI: inspect / plan / verify / classify / test / scan
├── test/
│   ├── kernel.test.mjs     # 11 tests: kernel surface
│   └── verifier.test.mjs   # 20 tests: verifier + classifier + retry + mission + context
├── examples/
│   ├── sample-workspace/   # tiny workspace the example missions operate on
│   ├── missions/           # 3 example mission JSONs
│   └── profiles/
│       └── generic.yml     # reference profile
├── scripts/
│   └── pre-publish-scan.mjs  # forbids private strings + tokens + paths
├── docs/
│   ├── OPERATING-KERNEL.md
│   ├── ARCHITECTURE.md     # this file
│   ├── MISSIONS.md
│   ├── INTEGRATION.md
│   └── ROADMAP.md
├── package.json
├── LICENSE
├── README.md
├── SECURITY.md
└── CHANGELOG.md
```

## Why a reference kit separate from DSH?

The DSH `dsh-universal-harness-core` plugin is a **production** piece of
infrastructure. It loads profiles, wires 19 native tools, tracks storm
and fingerprint events, and dispatches events to the governor and
telemetry sink. None of that is wrong — but it is tied to the DSH
runtime.

The reference kit is the **opposite** end of the spectrum:

- Zero runtime dependencies.
- No event bus; no DSH coupling.
- Self-contained CLI.
- ~700 LOC of original code.

Both implementations honour the same 9-stage contract. If you read the
DSH plugin, you can read the reference kit. If you read the reference
kit, you can read the DSH plugin.

## How `free-best-router` fits

`free-best-router` is an OpenAI-compat routing layer that the DSH
`llm` block points at. The UEA reference kit, by contrast, is what
sits *above* the `llm` block — the kernel that the `llm` block lives
inside. They are stacked, not overlapping.

A typical production stack:

```
DSH session
  └── UEA kernel
        └── dsh-universal-harness-core plugin (loads your profile)
              └── llm block → free-best-router → upstream free providers
```

You can swap `free-best-router` for any other OpenAI-compat endpoint
without touching UEA. You can swap UEA for any other kernel that honours
the same contract without touching the providers.
