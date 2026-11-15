import type { Cell, MapData } from '../types'

export const key = (c: Cell) => `${c[0]},${c[1]}`

// Default demo map: two walls with gaps force a detour, so the algorithms explore differently.
export function defaultMap(): MapData {
  const o: Cell[] = []
  for (let r = 3; r <= 11; r++) o.push([r, 6])
  for (let r = 0; r <= 9; r++) o.push([r, 10])
  return { rows: 15, cols: 15, start: [7, 1], goal: [7, 13], obstacles: o }
}

export function randomMap(m: MapData, density = 0.25): MapData {
  const o: Cell[] = []
  for (let r = 0; r < m.rows; r++) for (let c = 0; c < m.cols; c++) {
    const k = key([r, c])
    if (k !== key(m.start) && k !== key(m.goal) && Math.random() < density) o.push([r, c])
  }
  return { ...m, obstacles: o }
}

export function resize(m: MapData, rows: number, cols: number): MapData {
  const mid = Math.floor(rows / 2), wide = cols >= 5
  const start: Cell = [mid, wide ? 1 : 0]
  const goal: Cell = [mid, wide ? cols - 2 : cols - 1]
  const bad = new Set([key(start), key(goal)])
  return { rows, cols, start, goal, obstacles: m.obstacles.filter(c => c[0] < rows && c[1] < cols && !bad.has(key(c))) }
}

export type Tool = 'wall' | 'start' | 'goal'

/**
 * Pure editing rule. `wall` (drag only) is the DESIRED state of the cell: true = obstacle, false = empty.
 * Without `wall` (a click) the obstacle is toggled. Returns the same map object when nothing changes.
 */
export function paintCell(m: MapData, tool: Tool, c: Cell, wall?: boolean): MapData {
  if (c[0] < 0 || c[1] < 0 || c[0] >= m.rows || c[1] >= m.cols) return m
  const k = key(c)
  const without = m.obstacles.filter(o => key(o) !== k)
  if (tool === 'start') return wall !== undefined || k === key(m.goal) ? m : { ...m, start: c, obstacles: without }
  if (tool === 'goal') return wall !== undefined || k === key(m.start) ? m : { ...m, goal: c, obstacles: without }
  if (k === key(m.start) || k === key(m.goal)) return m
  const has = without.length !== m.obstacles.length
  if (wall !== undefined && wall === has) return m
  return { ...m, obstacles: has ? without : [...m.obstacles, c] }
}
