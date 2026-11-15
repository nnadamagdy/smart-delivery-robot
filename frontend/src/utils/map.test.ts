import { describe, expect, it } from 'vitest'
import { defaultMap, key, paintCell, randomMap, resize } from './map'
import type { MapData } from '../types'

const base = (): MapData => ({ rows: 5, cols: 5, start: [0, 0], goal: [4, 4], obstacles: [] })
const has = (m: MapData, c: [number, number]) => m.obstacles.some(o => key(o) === key(c))

describe('paintCell', () => {
  it('click toggles an obstacle on and off', () => {
    const a = paintCell(base(), 'wall', [2, 2]); expect(has(a, [2, 2])).toBe(true)
    expect(has(paintCell(a, 'wall', [2, 2]), [2, 2])).toBe(false)
  })
  it('drag-draw (desired=true) adds, and never removes, obstacles', () => {
    let m = paintCell(base(), 'wall', [1, 1])
    m = paintCell(m, 'wall', [1, 2], true); m = paintCell(m, 'wall', [1, 1], true)
    expect(has(m, [1, 1]) && has(m, [1, 2])).toBe(true); expect(m.obstacles.length).toBe(2)
  })
  it('drag-erase (desired=false) removes, and never adds, obstacles', () => {
    const m0 = { ...base(), obstacles: [[1, 1], [1, 2]] as MapData['obstacles'] }
    const m = paintCell(paintCell(m0, 'wall', [1, 1], false), 'wall', [3, 3], false)
    expect(m.obstacles).toEqual([[1, 2]])
  })
  it('never puts an obstacle on start or goal', () => {
    const m = base()
    expect(paintCell(m, 'wall', [0, 0])).toBe(m); expect(paintCell(m, 'wall', [4, 4], true)).toBe(m)
  })
  it('start and goal cannot overlap; moving them clears obstacles under them', () => {
    const m = base()
    expect(paintCell(m, 'start', [4, 4])).toBe(m); expect(paintCell(m, 'goal', [0, 0])).toBe(m)
    const w = { ...m, obstacles: [[2, 2]] as MapData['obstacles'] }
    const s = paintCell(w, 'start', [2, 2]); expect(s.start).toEqual([2, 2]); expect(s.obstacles).toEqual([])
  })
  it('ignores drag for start/goal tools and out-of-grid cells', () => {
    const m = base()
    expect(paintCell(m, 'start', [1, 1], true)).toBe(m); expect(paintCell(m, 'wall', [9, 9])).toBe(m)
  })
})

describe('map helpers', () => {
  it('default map keeps start/goal free and in bounds', () => {
    const m = defaultMap()
    expect(has(m, m.start) || has(m, m.goal)).toBe(false)
    for (const c of [m.start, m.goal, ...m.obstacles]) { expect(c[0]).toBeLessThan(m.rows); expect(c[1]).toBeLessThan(m.cols) }
  })
  it('random map never covers start or goal', () => {
    for (let i = 0; i < 50; i++) { const m = randomMap(defaultMap(), 0.9); expect(has(m, m.start) || has(m, m.goal)).toBe(false) }
  })
  it('resize keeps everything inside the grid and start != goal', () => {
    for (const [r, c] of [[5, 5], [30, 30], [5, 30], [9, 6], [3, 3], [3, 4], [4, 3], [4, 4]]) {
      const m = resize(defaultMap(), r, c)
      expect(key(m.start)).not.toBe(key(m.goal))
      for (const o of [m.start, m.goal, ...m.obstacles]) { expect(o[0]).toBeLessThan(r); expect(o[1]).toBeLessThan(c) }
      expect(has(m, m.start) || has(m, m.goal)).toBe(false)
    }
  })
})
