# Roadmap

This document is honest. It lists what is done, what is planned, and
what is **deliberately not planned** and why.

## v0.1.0 — current

- 9-stage kernel contract implemented and self-tested.
- 31 self-tests passing under plain `node --test`.
- 4-command CLI (`inspect`, `plan`, `verify`, `classify`).
- 3 example missions + 1 sample workspace + 1 reference profile.
- Pre-publish scanner that blocks private strings, paths, and tokens.
- Zero runtime dependencies. MIT licensed. Public + open issues welcome.

## v0.2.0 — planned

- **Model-based classifier** as an opt-in profile override (the rule-based
  classifier stays as the contract default).
- **Graphify provider** as an opt-in context provider, matching the DSH
  plugin's `lib/context-providers/graphify.js`. Absent Graphify degrades
  gracefully (the existing filesystem provider is the fallback).
- **Tool-hygiene event bus** so profiles can subscribe to fingerprint
  repeats and storm events (currently the kit exposes a tracker, not an
  event bus).
- **Mission scheduler** so the trace from `implement` can be executed
  in-process for small missions. Large missions still need a worker.

## v0.3.0 — planned

- **Persistent checkpoint index** so checkpoint history is queryable
  without reading the entire JSONL file.
- **Multi-language verification defaults** (Python, Go, Rust, Solidity)
  matching the language profiles in the DSH ecosystem.
- **Profile inheritance** so a project profile can extend a language
  profile.

## v1.0.0 — planned

- **API stability** — the public surface (`createKernel`, the 9 stage
  methods, the 10 failure classes, the profile YAML schema) becomes a
  committed spec.
- **DSH plugin parity** — the DSH `dsh-universal-harness-core` plugin
  and this kit share a regression test suite.
- **Long-term agent memory** — the `uh_memory` surface from the DSH
  plugin becomes part of the contract.

## Deliberately not planned

| Not planned | Why |
|---|---|
| An LLM client of any kind | The kernel is a contract, not a worker. Models are swappable. |
| A database backend | JSONL on disk is the contract. Profiles can wrap a database if they want, but the kernel does not require one. |
| A web UI | Out of scope. The CLI is the surface. |
| A cloud service | The whole point of UEA is profile-agnostic, local-first, vendor-neutral. A cloud offering would break the contract. |
| Per-vendor integrations (GitHub, GitLab, Jira, etc.) | The kernel has no opinion on the SCM or ticket system. Profiles can layer integrations on top. |
| A model-eval harness | Out of scope. Use an eval harness you trust; UEA is the engine, not the benchmark. |
| A new prompt-engineering DSL | The Mission shape is JSON. We do not need a DSL. |
| A chat-style user interface | The reference kit is a library + CLI. Chat UIs belong to runtimes, not kernels. |

## How to influence the roadmap

File an issue. PRs are welcome. The bar is small (see the README), and
the maintainer is one person who reads everything that comes in.
