// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createRoot } from 'react-dom/client'
import { act } from 'react'
import { useSimulation } from './useSimulation'
import type { Result } from '../types'

vi.mock('../services/api', () => ({ runAlgo: vi.fn(), compareBoth: vi.fn(), checkHealth: vi.fn() }))
import * as api from '../services/api'
;(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true

const mk = (name: string): Result => ({ algorithm: name, status: 'found', path: [[0, 0], [0, 1]], explored_cells: [[0, 0], [0, 1]],
  exploration_order: [[0, 0], [0, 1]], path_cost: 1, explored_count: 2, execution_time_ms: 0.1, g_values: [0, 1], h_values: null })
const run = vi.mocked(api.runAlgo)
const ref: { cur: ReturnType<typeof useSimulation> } = { cur: null as any }
const H = () => { ref.cur = useSimulation(); return null }
beforeEach(async () => { run.mockReset(); await act(async () => createRoot(document.createElement('div')).render(<H />)) })

describe('switching algorithms', () => {
  it('stops the running animation and clears the old result', async () => {
    run.mockResolvedValue(mk('BFS'))
    await act(async () => { await ref.cur.run('bfs') })
    expect(ref.cur.playing).toBe(true); expect(ref.cur.res?.algorithm).toBe('BFS')
    await act(async () => { ref.cur.setAlgo('astar') })
    expect(ref.cur.playing).toBe(false); expect(ref.cur.res).toBeUndefined()
    expect(ref.cur.algo).toBe('astar'); expect(ref.cur.phase).toBe('idle'); expect(ref.cur.explored.size).toBe(0)
  })
  it('ignores a reply that arrives after the user switched', async () => {
    let resolve!: (r: Result) => void
    run.mockImplementationOnce(() => new Promise<Result>(r => { resolve = r }))
    let p!: Promise<void>
    await act(async () => { p = ref.cur.run('bfs') })
    expect(ref.cur.loading).toBe(true)
    await act(async () => { ref.cur.setAlgo('dfs') })
    expect(ref.cur.loading).toBe(false)
    await act(async () => { resolve(mk('BFS')); await p })
    expect(ref.cur.res).toBeUndefined(); expect(ref.cur.playing).toBe(false); expect(ref.cur.algo).toBe('dfs'); expect(ref.cur.results.bfs).toBeUndefined()
  })
  it('the most recent run wins when an older reply arrives late', async () => {
    let slow!: (r: Result) => void
    run.mockImplementationOnce(() => new Promise<Result>(r => { slow = r })).mockResolvedValueOnce(mk('A*'))
    let p1!: Promise<void>
    await act(async () => { p1 = ref.cur.run('bfs') })
    await act(async () => { await ref.cur.run('astar') })
    await act(async () => { slow(mk('BFS')); await p1 })
    expect(ref.cur.res?.algorithm).toBe('A*'); expect(ref.cur.algo).toBe('astar')
  })
  it('editing the map also discards an in-flight reply', async () => {
    let resolve!: (r: Result) => void
    run.mockImplementationOnce(() => new Promise<Result>(r => { resolve = r }))
    let p!: Promise<void>
    await act(async () => { p = ref.cur.run('bfs') })
    await act(async () => { ref.cur.clearWalls() })
    await act(async () => { resolve(mk('BFS')); await p })
    expect(ref.cur.res).toBeUndefined(); expect(ref.cur.playing).toBe(false)
  })
})
