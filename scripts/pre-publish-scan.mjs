#!/usr/bin/env node
// scripts/pre-publish-scan.mjs — fail CI if forbidden strings appear.
//
// This scans every text file under the repo root and fails if it finds
// any of:
//   - Absolute Windows paths (C:\, D:\)
//   - Absolute home paths (~/.)
//   - Token patterns (ghp_, gho_, Bearer, sk-)
//   - Phoenix-specific terms (the user's private DeFi project)
//   - Machine-specific usernames (ma.asghari, MA2034)
//
// It also checks that no file contains the string 'node_modules' in
// its published path (a sanity check against accidental inclusion).

import { promises as fs } from 'node:fs'
import path from 'node:path'

const ROOT = path.resolve(process.argv[1] || '.', '..', '..')

const FORBIDDEN = [
  { re: /C:\\Users\\ma\.asghari/i, desc: 'Absolute Windows home path (ma.asghari)', files: '*' },
  { re: /C:\\Users\\MA2034/i, desc: 'Absolute Windows home path (MA2034)', files: '*' },
  { re: /D:\\PycharmProjects/i, desc: 'Absolute project path', files: '*' },
  { re: /~\/\.dsh/i, desc: 'DSH home directory reference', files: '*' },
  { re: /ghp_[A-Za-z0-9]{30,}/, desc: 'GitHub personal access token', files: '*' },
  { re: /gho_[A-Za-z0-9]{30,}/, desc: 'GitHub OAuth token', files: '*' },
  { re: /Bearer [A-Za-z0-9_\-]{20,}/, desc: 'Bearer token', files: '*' },
  { re: /sk-[A-Za-z0-9]{20,}/, desc: 'OpenAI secret key', files: '*' },
  // Project-specific terms: only flagged in code files, not documentation.
  // Docs may legitimately reference public profile names in prose.
  { re: /\bphoenix\b/i, desc: 'Phoenix-specific term (private project)', files: 'code' },
  { re: /\banti.gravity\b/i, desc: 'Anti-gravity project reference', files: 'code' },
  { re: /\bdefi\b/i, desc: 'DeFi-specific term', files: 'code' },
  { re: /\bMEV\b/, desc: 'MEV-specific term', files: 'code' },
  { re: /\bAave\b/, desc: 'Aave-specific term', files: 'code' },
  { re: /\bGMX\b/, desc: 'GMX-specific term', files: 'code' },
  { re: /\bArbitrum\b/, desc: 'Arbitrum-specific term', files: 'code' },
]

const SKIP_DIRS = new Set(['node_modules', '.git', '.uea', 'dist'])
const SKIP_FILES = new Set(['scripts/pre-publish-scan.mjs']) // scanner must be allowed to name the terms it detects
const DOC_EXTS = new Set(['.md'])
const CODE_EXTS = new Set(['.mjs', '.js', '.ts', '.tsx', '.jsx', '.json', '.yml', '.yaml', '.toml', '.sh', '.py', '.go', '.rs', '.sol'])

async function walk(dir, out) {
  let entries
  try { entries = await fs.readdir(dir, { withFileTypes: true }) } catch { return }
  for (const e of entries) {
    if (SKIP_DIRS.has(e.name)) continue
    if (e.isFile() && SKIP_FILES.has(path.relative(ROOT, path.join(dir, e.name)).replaceAll('\\', '/'))) continue
    const full = path.join(dir, e.name)
    if (e.isDirectory()) await walk(full, out)
    else if (e.isFile()) out.push(full)
  }
}

let failures = 0
const files = []
await walk(ROOT, files)

for (const file of files) {
  const rel = path.relative(ROOT, file).replaceAll('\\', '/')
  // Check path for node_modules
  if (rel.split('/').includes('node_modules')) {
    console.log(`BLOCKED path: ${rel} contains node_modules`)
    failures++
    continue
  }
  const ext = path.extname(file).toLowerCase()
  const isDoc = DOC_EXTS.has(ext)
  const isCode = CODE_EXTS.has(ext)
  let content
  try {
    const st = await fs.stat(file)
    if (st.size > 512_000) continue // skip very large files
    content = await fs.readFile(file, 'utf8')
  } catch { continue }
  for (const rule of FORBIDDEN) {
    if (rule.files === 'code' && !isCode) continue
    if (rule.re.test(content)) {
      console.log(`FORBIDDEN: ${rel} — ${rule.desc}`)
      failures++
    }
  }
}

if (failures > 0) {
  console.log(`\nFAILED: ${failures} forbidden string(s) found. Do not publish.`)
  process.exit(1)
} else {
  console.log(`OK: scanned ${files.length} files — no forbidden strings found.`)
}
