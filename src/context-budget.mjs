// src/context-budget.mjs — budgeted context bundle builder.
//
// This is a self-contained, in-memory implementation of the UEA
// "compose a budgeted Context Bundle from the declared context providers"
// contract. It does NOT depend on Graphify or any other external tool;
// it just walks the workspace and ranks files by relevance to the active
// profile.
//
// The output is the same shape that DSH's uh_context_build returns:
//   { files: [{ path, bytes, score }], bytes, profile }

import { promises as fs } from 'node:fs'
import path from 'node:path'

const DEFAULT_BUDGETS = {
  maxFiles: 64,
  maxBytes: 1_048_576, // 1 MiB
  maxFileBytes: 65_536, // 64 KiB per file
}

const SKIP_DIRS = new Set(['node_modules', '.git', '.uea', 'dist', 'build', 'coverage', '__pycache__', '.venv', 'venv'])
const TEXT_EXTS = new Set(['.md', '.txt', '.json', '.yml', '.yaml', '.mjs', '.js', '.ts', '.tsx', '.jsx', '.py', '.go', '.rs', '.sol', '.toml', '.ini', '.cfg', '.sh'])

/**
 * Score a file by relevance to the active profile.
 * Generic, profile-agnostic scoring: README/docs/sources > configs > junk.
 */
function scoreFile(p, profile) {
  const base = path.basename(p).toLowerCase()
  if (base === 'readme.md' || base === 'readme') return 100
  if (base === 'license' || base === 'license.md') return 5
  if (base === 'package.json' || base === 'pyproject.toml' || base === 'cargo.toml' || base === 'go.mod') return 80
  if (base.startsWith('.')) return 2
  if (base === 'dockerfile' || base.endsWith('.dockerfile')) return 60
  if (base === 'makefile') return 60
  const ext = path.extname(base)
  if (['.test.mjs', '.test.js', '.test.ts', '_test.py', '_test.go'].some((s) => base.endsWith(s))) return 50
  if (['.mjs', '.js', '.ts', '.tsx', '.jsx', '.py', '.go', '.rs', '.sol'].includes(ext)) return 40
  if (['.md', '.txt'].includes(ext)) return 30
  if (['.json', '.yml', '.yaml', '.toml'].includes(ext)) return 25
  if (['.sh'].includes(ext)) return 20
  // Profile mention boost
  if (profile && base.includes(profile.toLowerCase())) return 70
  return 10
}

async function walk(root, out, depth = 0) {
  if (depth > 6) return
  let entries
  try { entries = await fs.readdir(root, { withFileTypes: true }) } catch { return }
  for (const e of entries) {
    if (SKIP_DIRS.has(e.name)) continue
    const full = path.join(root, e.name)
    if (e.isDirectory()) await walk(full, out, depth + 1)
    else if (e.isFile()) out.push(full)
  }
}

/**
 * Build a budgeted Context Bundle.
 * @param {{ root: string, profile?: string, budgets?: object }} args
 */
export async function createContextBundle({ root, profile = 'generic', budgets = {} }) {
  if (typeof root !== 'string' || root.length === 0) throw new TypeError('createContextBundle: root is required')
  const b = { ...DEFAULT_BUDGETS, ...budgets }
  const absRoot = path.resolve(root)
  let stat
  try { stat = await fs.stat(absRoot) } catch (e) { throw new Error(`createContextBundle: root does not exist: ${absRoot}`) }
  if (!stat.isDirectory()) throw new Error(`createContextBundle: root is not a directory: ${absRoot}`)
  const candidates = []
  await walk(absRoot, candidates)

  const scored = []
  let totalBytes = 0
  for (const p of candidates) {
    let st
    try { st = await fs.stat(p) } catch { continue }
    if (st.size > b.maxFileBytes) continue
    if (totalBytes + st.size > b.maxBytes) continue
    scored.push({ path: path.relative(absRoot, p).replaceAll('\\', '/'), bytes: st.size, score: scoreFile(p, profile) })
    totalBytes += st.size
    if (scored.length >= b.maxFiles) break
  }
  scored.sort((a, b2) => b2.score - a.score)
  return { files: scored, bytes: totalBytes, profile, root: absRoot }
}
