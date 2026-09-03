// src/mission.mjs — turn a Mission into a staged Plan.
//
// The Mission shape is the same one DSH's uh_mission accepts: a free-text
// objective plus an array of acceptance criteria. The plan output is a
// stable list of tasks with kinds the kernel can later execute.

/**
 * @typedef {Object} Mission
 * @property {string}   id
 * @property {string}   objective
 * @property {string[]} [acceptance]
 * @property {string[]} [known]
 * @property {string[]} [unknown]
 * @property {object}   [budgets]
 */

/**
 * Stage a mission into a plan. This is intentionally minimal: it groups
 * acceptance criteria into verification tasks and emits a single
 * implement task for the objective. Production profiles can override
 * the planner; this is the contract default.
 *
 * @param {Mission} mission
 */
export function planMission(mission) {
  if (!mission || typeof mission !== 'object') throw new TypeError('planMission: mission is required')
  if (typeof mission.objective !== 'string' || mission.objective.length === 0) {
    throw new TypeError('planMission: mission.objective is required')
  }
  const acceptance = Array.isArray(mission.acceptance) ? mission.acceptance : []
  const tasks = []
  tasks.push({ id: `${mission.id || 'm'}.impl.1`, kind: 'implement', summary: mission.objective, dependsOn: [] })
  for (let i = 0; i < acceptance.length; i++) {
    tasks.push({ id: `${mission.id || 'm'}.verify.${i + 1}`, kind: 'verify', summary: acceptance[i], dependsOn: [`${mission.id || 'm'}.impl.1`] })
  }
  tasks.push({ id: `${mission.id || 'm'}.recover.1`, kind: 'recover', summary: 'Apply non-retryable fall-through and bounded retry', dependsOn: tasks.map((t) => t.id) })
  return { id: mission.id, tasks }
}
