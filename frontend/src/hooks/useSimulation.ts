import { useEffect, useRef, useState } from 'react'
import { compareBoth, runAlgo } from '../services/api'
import type { Algo, Cell, MapData, Result } from '../types'
import { defaultMap, key, paintCell, randomMap, resize } from '../utils/map'
import type { Tool } from '../utils/map'

export type Phase = 'idle' | 'loading' | 'searching' | 'delivering' | 'delivered' | 'no_path'

export function useSimulation() {
  const [map, setMap] = useState<MapData>(defaultMap)
  const [algo, setAlgo] = useState<Algo>('bfs')
  const [tool, setTool] = useState<Tool>('wall')
  const [results, setResults] = useState<Partial<Record<Algo, Result>>>({})
  const [active, setActive] = useState<Algo | null>(null)
  const [tick, setTick] = useState(-1)
  const [playing, setPlaying] = useState(false)
  const [speed, setSpeed] = useState(6)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const reqId = useRef(0)   // bumped on every reset/switch/edit so late server replies are ignored

  const res = active ? results[active] : undefined
  const E = res?.exploration_order.length ?? 0
  const P = res?.path.length ?? 0
  const total = res ? E + (res.status === 'found' ? P - 1 : 0) : 0
  const t = res ? Math.min(Math.max(tick, 0), total) : 0

  const tickMs = Math.round(600 / speed ** 1.5)

  // One tick = one explored cell, then one robot step along the path. All data comes from the backend.
  useEffect(() => {
    if (!playing || !res) return
    if (t >= total) { setPlaying(false); return }
    const id = setTimeout(() => setTick(t + 1), tickMs)
    return () => clearTimeout(id)
  }, [playing, t, total, tickMs, res])

  const phase: Phase = loading ? 'loading' : !res ? 'idle' : t < E ? 'searching'
    : t < total ? 'delivering' : res.status === 'found' ? 'delivered' : 'no_path'
  const explored = new Set((res?.exploration_order ?? []).slice(0, t).map(key))
  const current: Cell | undefined = t > 0 && t <= E ? res!.exploration_order[t - 1] : undefined
  const showPath = !!res && res.status === 'found' && t >= E
  const robot: Cell = res && res.status === 'found' && t >= E ? res.path[Math.min(t - E, P - 1)] : map.start

  const clear = () => { reqId.current++; setLoading(false); setActive(null); setTick(-1); setPlaying(false); setError('') }
  const edit = (m: MapData) => { setMap(m); setResults({}); clear() }

  const run = async (a: Algo = algo, autoplay = true) => {
    clear(); const id = reqId.current; setAlgo(a); setLoading(true)
    try {
      const r = await runAlgo(a, map)
      if (id !== reqId.current) return
      setResults(p => ({ ...p, [a]: r })); setActive(a); setTick(0); setPlaying(autoplay)
    } catch (e: any) { if (id === reqId.current) setError(e.message || 'We could not reach the server. Please try again in a moment.') }
    finally { if (id === reqId.current) setLoading(false) }
  }
  const compare = async () => {
    clear(); const id = reqId.current; setLoading(true)
    try {
      const r = await compareBoth(map)
      if (id !== reqId.current) return false
      setResults(r); setActive(algo); setTick(1e9)
      return true
    } catch (e: any) { if (id === reqId.current) setError(e.message || 'We could not reach the server. Please try again in a moment.'); return false }
    finally { if (id === reqId.current) setLoading(false) }
  }
  const chooseAlgo = (a: Algo) => { if (a !== algo) { clear(); setAlgo(a) } }   // switching stops the current run
  const replay = (a: Algo) => { if (!results[a]) return; reqId.current++; setLoading(false); setError(''); setAlgo(a); setActive(a); setTick(0); setPlaying(true) }
  const step = () => { if (!res) run(algo, false); else { setPlaying(false); setTick(t + 1) } }
  const paint = (c: Cell, wall?: boolean) => {
    if (playing) return
    const next = paintCell(map, tool, c, wall)
    if (next !== map) edit(next)
  }
  return {
    map, algo, setAlgo: chooseAlgo, tool, setTool, results, res, active, speed, setSpeed, playing, setPlaying, error, loading,
    phase, t, total, tickMs, replay, explored, current, showPath, robot, run, compare, step, reset: clear, paint,
    setSize: (r: number, c: number) => edit(resize(map, r, c)),
    random: () => edit(randomMap(map)), clearWalls: () => edit({ ...map, obstacles: [] }),
    restore: () => edit(defaultMap()),
  }
}
