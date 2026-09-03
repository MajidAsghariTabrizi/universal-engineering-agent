// src/classifier.mjs — turn a failure string into a 10-class code.
//
// The 10 classes are the same ones DSH's uh_classify returns:
//   CONTEXT_ERROR      missing or stale context the agent should re-query
//   TOOL_ERROR         a tool call returned an error
//   CODE_ERROR         a code error surfaced as an exception
//   TEST_ERROR         a test assertion failed
//   CONFIG_ERROR       a config file is malformed or missing
//   ENVIRONMENT_ERROR  a dependency is missing (no-tests, no-network, etc.)
//   PROVIDER_ERROR     a remote provider returned 4xx/5xx
//   PERMISSION_ERROR   an action is blocked by a policy
//   DEPLOYMENT_ERROR   a deploy step failed
//   UNKNOWN            anything we cannot classify
//
// The classifier is rule-based, deterministic, and intentionally simple.
// It is meant to be the stable contract; production profiles can replace
// it with a smarter model.

export const CLASSES = [
  'CONTEXT_ERROR',
  'TOOL_ERROR',
  'CODE_ERROR',
  'TEST_ERROR',
  'CONFIG_ERROR',
  'ENVIRONMENT_ERROR',
  'PROVIDER_ERROR',
  'PERMISSION_ERROR',
  'DEPLOYMENT_ERROR',
  'UNKNOWN',
]

const RULES = [
  { code: 'CONTEXT_ERROR', re: /(context bundle|stale context|graphify).*?(missing|stale|empty)/i },
  { code: 'TEST_ERROR', re: /(assertion|expect\(|test failed|test timed out|expected .* to (equal|be))|✗/i },
  { code: 'ENVIRONMENT_ERROR', re: /(enoent|module not found|cannot find module|no such file or directory|no tests? collected|no network|timeout connecting)/i },
  { code: 'CONFIG_ERROR', re: /(invalid yaml|invalid json|syntax error.*?(yaml|json|toml)|missing (field|key).*?(profile|config))/i },
  { code: 'PERMISSION_ERROR', re: /(permission denied|forbidden|unauthorized|owner approval|owner_ack)/i },
  { code: 'PROVIDER_ERROR', re: /(429|rate ?limit|5\d\d|upstream (error|fail)|provider returned|service unavailable|bad gateway)/i },
  { code: 'DEPLOYMENT_ERROR', re: /(deploy|publish|push|release).*?(fail|reject|denied)/i },
  { code: 'TOOL_ERROR', re: /(tool failed|tool .*? errored|tool .*? not registered|tool .*? returned)/i },
  { code: 'CODE_ERROR', re: /(typeerror|referenceerror|syntaxerror|\bthrow new [a-z]+error\b|cannot read propert)/i },
]

/**
 * Classify a failure.
 * @param {string} message
 * @param {string} [code]
 * @returns {{ code: string, message: string, hint: string }}
 */
export function classifyFailure(message, code) {
  const msg = typeof message === 'string' ? message : (message == null ? '' : String(message))
  for (const r of RULES) {
    if (r.re.test(msg)) return { code: r.code, message: msg.slice(0, 500), hint: hintFor(r.code) }
  }
  return { code: code && CLASSES.includes(code) ? code : 'UNKNOWN', message: msg.slice(0, 500), hint: hintFor('UNKNOWN') }
}

function hintFor(code) {
  switch (code) {
    case 'CONTEXT_ERROR': return 'Re-query the context bundle; do not retry blindly.'
    case 'TEST_ERROR': return 'Read the assertion diff, fix the source or the expectation, re-run tests.'
    case 'ENVIRONMENT_ERROR': return 'Install missing dependency, create the file, or restore the network. Do not retry until the environment is healthy.'
    case 'CONFIG_ERROR': return 'Validate the config file. Re-read its schema before retrying.'
    case 'PERMISSION_ERROR': return 'Stop and ask the operator. Do not retry without an owner ack.'
    case 'PROVIDER_ERROR': return 'Apply the typed cooldown, then route around the provider on the next attempt.'
    case 'DEPLOYMENT_ERROR': return 'Stop. Read the release-script error; do not retry without a code change.'
    case 'TOOL_ERROR': return 'Inspect the tool call args; the tool may need a different shape.'
    case 'CODE_ERROR': return 'Read the stack trace; fix the source before retrying.'
    default: return 'No hint available. Gather evidence and inspect manually.'
  }
}
