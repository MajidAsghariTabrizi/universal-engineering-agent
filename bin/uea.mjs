#!/usr/bin/env node
// bin/uea.mjs — CLI for the Universal Engineering Agent operating kernel.
//
// Usage:
//   node bin/uea.mjs inspect <workspace>        walk the workspace, print the context bundle
//   node bin/uea.mjs plan <mission.json>        stage a mission into tasks
//   node bin/uea.mjs verify <workspace>         run staged STATIC -> UNIT -> INTEGRATION
//   node bin/uea.mjs classify <message>         classify a failure string into a 10-class code
//   node bin/uea.mjs test                        run the kit's own self-tests (node --test)
//   node bin/uea.mjs scan                        run the pre-publish secret/path/PII scanner
//
// Run from the repo root or install globally:  npx universal-engineering-agent-kit inspect .

import { createKernel } from '../src/kernel.mjs'
import { planMission } from '../src/mission.mjs'
import { runVerifyStages } from '../src/verifier.mjs'
import { classifyFailure } from '../src/classifier.mjs'
import { promises as fs } from 'node:fs'
import { spawn } from 'node:child_process'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

const [,, cmd, ...args] = process.argv

if (!cmd) {
  console.log(`Universal Engineering Agent (UEA) v0.1.0

Usage:
  uea inspect <workspace>   Walk the workspace and print a context bundle.
  uea plan <mission.json>   Stage a mission into executable tasks.
  uea verify <workspace>    Run staged verification (STATIC → UNIT → INTEGRATION).
  uea classify <message>    Classify a failure string into a 10-class error code.
  uea test                  Run the kit's own self-tests.
  uea scan                  Run the pre-publish secret/path/PII scanner.`)
  process.exit(0)
}

async function main() {
  switch (cmd) {
    case 'inspect': {
      const root = path.resolve(args[0] || '.')
      const kernel = createKernel({ workspaceRoot: root, stateDir: `${root}/.uea` })
      const { bundle } = await kernel.inspect()
      console.log(JSON.stringify({ files: bundle.files.length, bytes: bundle.bytes, profile: bundle.profile, topFiles: bundle.files.slice(0, 10) }, null, 2))
      if (bundle.files.length === 0) { console.error('(no files in context bundle — check the workspace path)') }
      break
    }
    case 'plan': {
      if (!args[0]) { console.error('Usage: uea plan <mission.json>'); process.exit(1) }
      const txt = await fs.readFile(path.resolve(args[0]), 'utf8')
      const mission = JSON.parse(txt)
      const result = planMission(mission)
      console.log(JSON.stringify(result, null, 2))
      break
    }
    case 'verify': {
      const root = path.resolve(args[0] || '.')
      const report = await runVerifyStages({ root })
      console.log(JSON.stringify(report, null, 2))
      process.exit(report.overall === 'ok' ? 0 : 1)
      break
    }
    case 'classify': {
      const message = args.join(' ')
      const result = classifyFailure(message)
      console.log(JSON.stringify(result, null, 2))
      break
    }
    case 'test': {
      const child = spawn('node', ['--test', path.join(__dirname, '..', 'test', '*.test.mjs')], { cwd: path.join(__dirname, '..'), stdio: 'inherit', shell: false })
      child.on('close', (code) => process.exit(code ?? 1))
      break
    }
    case 'scan': {
      const child = spawn('node', [path.join(__dirname, '..', 'scripts', 'pre-publish-scan.mjs')], { cwd: path.join(__dirname, '..'), stdio: 'inherit', shell: false })
      child.on('close', (code) => process.exit(code ?? 1))
      break
    }
    default:
      console.error(`Unknown command: ${cmd}`)
      process.exit(1)
  }
}

main().catch((err) => { console.error(err); process.exit(1) })
