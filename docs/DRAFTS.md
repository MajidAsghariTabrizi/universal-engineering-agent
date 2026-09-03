# Social Media Drafts — UEA Launch

Prepared for manual posting. Each draft is adapted to its platform.

---

## Draft 1: X / Twitter (10-tweet thread)

**Tweet 1:**
Most coding agents optimize the model. Almost none optimize the engineering loop.

I built an open-source operating kernel for the loop itself.

**Tweet 2:**
Universal Engineering Agent (UEA) — 9 stages that any coding agent should perform:

inspect → plan → implement → tool-hygiene → verify → classify → recover → test → generalize

github.com/MajidAsghariTabrizi/universal-engineering-agent

**Tweet 3:**
The problem: agent prompts grow until they're 4,000 tokens of tribal knowledge nobody can reuse.

UEA takes the opposite direction. Profile-agnostic. The kernel owns the loop; the profile owns the project-specific knowledge.

**Tweet 4:**
Stage 5 is where most agents fail. UEA runs staged verification: STATIC → UNIT → INTEGRATION — reading commands from your own package.json.

Not a model. Not a framework. A contract.

**Tweet 5:**
Every failure gets classified into 10 deterministic error types:

CONTEXT_ERROR | TOOL_ERROR | CODE_ERROR | TEST_ERROR | CONFIG_ERROR | ENVIRONMENT_ERROR | PROVIDER_ERROR | PERMISSION_ERROR | DEPLOYMENT_ERROR | UNKNOWN

No network call. No model inference. Just a function.

**Tweet 6:**
Three error types are non-retryable: PERMISSION, CONFIG, DEPLOYMENT.

Everything else gets bounded exponential backoff — max 3 attempts, capped at 8s.

This is how you stop agents from burning quota on unfixable errors.

**Tweet 7:**
What's in the box:
• 8 source modules, ~700 LOC, zero runtime deps
• 31 self-tests under plain node --test
• 6-command CLI: inspect / plan / verify / classify / test / scan
• 3 example missions + 1 sample workspace

Node 18.17+. MIT.

**Tweet 8:**
Sibling to free-best-router (github.com/MajidAsghariTabrizi/free-best-router):

free-best-router → which model should the agent use?
UEA → how should the agent perform engineering work around that model?

Stack, not overlap.

**Tweet 9:**
Also: UEA is the public reference implementation of the DSH dsh-universal-harness-core plugin contract. Same 9 stages, independent code, npm-installable.

DSH discussion: github.com/deepseek-ai/deepseek-harness/discussions/5513

**Tweet 10:**
Built this while shipping free-best-router and learning what a coding agent actually needs to be reliable.

If you're building a coding agent and want an explicit operating kernel — stress-test it. Open an issue. Break it.

MIT. Public. Ready.

---

## Draft 2: LinkedIn

**What I learned building an engineering-agent operating kernel**

LLMs can generate code. That's not the hard part.

The hard part is making the engineering loop reliable — so the agent doesn't:
• one-shot a task and claim it's done
• retry an unfixable error until quota runs out
• lose context when a session crashes
• produce code that passes its own eyes but fails the test suite

I built Universal Engineering Agent (UEA) to make the loop explicit. It's a 9-stage operating kernel:

1. Inspect — rank workspace files by relevance (not dump the whole repo)
2. Plan — stage a mission into a dependency-aware task graph
3. Implement — emit an executable trace
4. Tool-hygiene — detect loops and failure storms
5. Verify — staged STATIC → UNIT → INTEGRATION runner
6. Classify — turn any failure into a 10-class error code
7. Recover — bounded retry with non-retryable fall-through
8. Test — self-tests for the agent's own code
9. Generalize — append-only checkpoint log

The key insight: the kernel is a contract, not a product. It doesn't call any LLM. It doesn't depend on any vendor. It doesn't persist to a database. It's the smallest reusable shell that makes an engineering agent reliable.

Three things I'd want another builder to know:
• PERMISSION_ERROR, CONFIG_ERROR, and DEPLOYMENT_ERROR are explicitly non-retryable. Everything else gets bounded backoff.
• Every claim in the repo is verified against source code. The README links to file:line.
• The 31 self-tests are the spec. If the test passes, the contract holds.

If you're building a coding agent and want an explicit, testable operating kernel — try it, break it, open an issue.

github.com/MajidAsghariTabrizi/universal-engineering-agent
MIT · 31 self-tests · zero runtime deps · Node 18.17+

---

## Draft 3: Reddit (r/LocalLLaMA)

**Title:** I built an open-source engineering-agent kernel for repository work — feedback welcome

**Body:**

I've been building coding agents for a while and kept running into the same problem: the agent generates code fine, but the engineering loop around it — verification, failure recovery, context management — was always duct-taped into the system prompt.

So I extracted the loop into a standalone kernel. It's called Universal Engineering Agent (UEA).

**What it does:**
9-stage operating kernel that any coding agent can sit inside:
- Inspect → Plan → Implement → Verify → Classify → Recover → Test → Generalize
- Every failure classified into 10 deterministic error types (no model inference, just a function)
- Three error types explicitly non-retryable; everything else bounded backoff
- Staged verification reading commands from your own package.json
- Append-only checkpoint log for session resume

**What it is NOT:**
- Not a model. Not an agent framework. Not a product.
- It's the contract the agent performs engineering work inside.
- Zero runtime deps. Plain Node.js. MIT.

**What I learned:**
1. Agent prompts that encode reliability are fragile. Profiles (YAML data) are more maintainable than system-prompt instructions.
2. The 10-class failure taxonomy is the minimum vocabulary for "what should the agent do next." Without it, retry is just guessing.
3. Context budgeting (ranked, scored files) beats whole-repo dumps every time.

**Honest caveats:**
- No LLM client — you bring the model
- Checkpoints are JSON-lines on disk, not a database
- The sample workspace has one deliberate bug so you can watch the agent find and fix it

**Repo:** github.com/MajidAsghariTabrizi/universal-engineering-agent

Feedback, criticism, and PRs welcome. What would you add or remove?

---

## Draft 4: Hacker News (Show HN)

**Title:** Show HN: Universal Engineering Agent – an open engineering-agent operating kernel

**URL:** https://github.com/MajidAsghariTabrizi/universal-engineering-agent

**Body:**

Most coding agents optimize the model. UEA optimizes the engineering loop around the model.

It's a 9-stage operating kernel that any LLM-driven coding agent can sit inside:

inspect → plan → implement → tool-hygiene → verify → classify → recover → test → generalize

The key mechanisms:
- Context budgeting: ranked workspace inspection, not whole-repo dumps
- Mission staging: free-text objective → dependency-aware task graph
- Staged verification: STATIC → UNIT → INTEGRATION, reading commands from your package.json
- 10-class failure classifier: deterministic, zero-network, rule-based
- Bounded recovery: non-retryable fall-through for PERMISSION/CONFIG/DEPLOYMENT errors
- Append-only checkpoint log: format-compatible with DSH uh_checkpoint

The kernel is a contract, not a product. It doesn't call any LLM, persist to a database, or depend on any vendor. Profile-agnostic by design — the profile supplies project-specific knowledge; the kernel owns only the generic loop.

31 self-tests, zero runtime deps, MIT. Node 18.17+.

Built as the public reference implementation of the DeepSeek Harness dsh-universal-harness-core plugin contract. Sibling to free-best-router (a model-routing layer).
