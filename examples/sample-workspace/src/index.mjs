// src/index.mjs — intentionally simple module with one known bug.
// The `add` function is correct. The `multiply` function has a
// deliberate off-by-one to give example missions something to fix.

export function add(a, b) {
  return a + b
}

export function multiply(a, b) {
  // BUG: returns a * (b - 1) instead of a * b
  return a * (b - 1)
}

export function greet(name) {
  return `Hello, ${name}!`
}
