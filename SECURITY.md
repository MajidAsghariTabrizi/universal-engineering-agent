# Security

## Threat model

The UEA reference kit is a **library + CLI**. It does not call any
network service, does not read any environment variable, and does not
require any authentication. Its only inputs are:

- A workspace root (a local path you control).
- A mission JSON (a file you wrote).
- CLI flags.

Its only outputs are:

- A context bundle (file paths and sizes, in memory).
- A plan (in memory).
- A verification report (printed to stdout).
- A classification (in memory).
- Checkpoints (written to `<stateDir>/checkpoints.jsonl`).
- Test artifacts (in `<stateDir>/`).

The kit does not, by design:

- Read or write outside the workspace you provide (except the
  stateDir you specify, which defaults to `<workspace>/.uea`).
- Make outbound network calls.
- Load plugins dynamically.
- Eval arbitrary code from a mission JSON.
- Store or transmit credentials.

## What is *not* in this repo (intentionally)

The following are deliberately excluded from the public reference kit
and live in the DeepSeek Harness production plugin instead:

- The full profile loader with schema validation.
- The Context Engine with the Graphify provider.
- The Budget Governor and Telemetry Sink.
- The 19 native tools (`uh_context`, `uh_profile`, `uh_mission`, etc.).
- The session event bus.
- The DSH worker integration.

If your threat model requires any of the above, use the production
plugin. The reference kit is for the parts of the contract that
should not require DSH.

## Reporting a vulnerability

Open a GitHub issue with the `security` label, or email the address
on the maintainer's GitHub profile. The maintainer responds within
7 days. The maintainer will not request your credentials, your
session, or your machine.

## Known limitations

- The pre-publish scanner (`scripts/pre-publish-scan.mjs`) is a
  string-matching tool, not a taint analyzer. It catches obvious
  patterns (absolute paths, common token shapes, vendor names); it
  cannot catch everything. Use it as a tripwire, not a guarantee.
- The classifier is rule-based. It is correct on the 10 failure
  classes it knows; it cannot invent new classes. If a class is
  missing, open an issue.
- The verifier spawns subprocesses using the workspace's own
  `uea.verification` config. A malicious `package.json` could
  instruct the verifier to run arbitrary commands. Do not run
  `uea verify` on a workspace you do not trust.
