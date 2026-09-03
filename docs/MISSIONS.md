# Example Missions

This directory ships three generic missions that exercise different
parts of the UEA operating-kernel contract. None of them reference
private projects, vendors, or domain-specific knowledge.

All three operate on the **sample workspace** at
[`examples/sample-workspace/`](../examples/sample-workspace). The
sample workspace is intentionally small and intentionally has one
known bug (in `src/index.mjs`'s `multiply` function) so that
`mission-fix-failing-test.json` has something real to fix.

## Mission 1: `mission-add-readme.json`

**Objective:** add a README.md to the sample workspace that explains
what it is and how to run it.

**What it exercises:**

- Stage 1 (`inspect`): the agent inspects the workspace and discovers
  it has no README.
- Stage 2 (`plan`): the mission stages into one implement task +
  three verify tasks (file exists, file size, phrase appears) + one
  recover task.
- Stage 3 (`implement`): the agent writes the README.
- Stage 4 (`tool-hygiene`): the agent does not loop on the same
  `write_file` call.
- Stage 5 (`verify`): the agent checks each acceptance criterion.

**Try it:**

```bash
node bin/uea.mjs plan examples/missions/mission-add-readme.json
```

## Mission 2: `mission-fix-failing-test.json`

**Objective:** identify and fix the intentional bug in the sample
workspace so that `node --test test/` passes.

**What it exercises:**

- Stage 1 (`inspect`): the agent inspects the failing test output.
- Stage 5 (`verify`): the agent runs the tests and observes 2 failures.
- Stage 6 (`classify`): the agent classifies the failures as
  `TEST_ERROR` (assertion mismatches).
- Stage 7 (`recover`): the agent decides NOT to retry the test (it is
  the test that is correct; the source is wrong). The fix is to edit
  `src/index.mjs`, not retry the test command.
- Stage 5 again: the agent re-runs the tests and they pass.

**Try it:**

```bash
node bin/uea.mjs verify examples/sample-workspace
# expected: overall "fail" with 2 test failures
# then: edit src/index.mjs to fix the multiply bug, re-run, expect "ok"
```

## Mission 3: `mission-verify-existing.json`

**Objective:** run the full staged verification pipeline against the
sample workspace and report the results.

**What it exercises:**

- Stage 4 (`verify`): the staged runner executes static + unit +
  integration stages.
- Stage 9 (`generalize`): the agent writes a checkpoint summarizing
  the verification outcome.

**Try it:**

```bash
node bin/uea.mjs verify examples/sample-workspace
```

## What none of these missions do

- They do not call any LLM. They are JSON inputs to the kit, not
  agent runs.
- They do not require any external service. The sample workspace is
  self-contained.
- They do not require any authentication. There are no tokens, no
  network calls, no rate limits.
- They do not write to any state outside the workspace. Checkpoints
  are written to `examples/sample-workspace/.uea/` if you let the
  kernel run end-to-end.

If you want to see the kernel in action, use one of the missions
as the input to your own LLM agent and observe the trace.
