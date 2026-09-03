# Changelog

All notable changes to this project are documented here. The format
is based on [Keep a Changelog](https://keepachangelog.com/), and this
project adheres to [Semantic Versioning](https://semver.org/).

## [0.1.0] — 2026-XX-XX

### Added

- Initial public release.
- 9-stage kernel contract (`createKernel`).
- 6 source modules: `kernel`, `context-budget`, `mission`, `verifier`,
  `classifier`, `retry`, `checkpoint`, `hygiene`.
- CLI with 6 commands: `inspect`, `plan`, `verify`, `classify`, `test`,
  `scan`.
- 31 self-tests under plain `node --test`.
- 3 example missions + 1 sample workspace + 1 reference profile.
- Pre-publish scanner for private strings, paths, and tokens.
- MIT license.
- Documentation: README, OPERATING-KERNEL, ARCHITECTURE, MISSIONS,
  INTEGRATION, ROADMAP, SECURITY.
