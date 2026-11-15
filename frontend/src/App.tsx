import { useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import {
  CheckCircle2, Eraser, Flag, GitCompare, Layers, ListOrdered, MapPin, Pause, Pencil, Play, RotateCcw, Rocket, Route, Ruler, Shuffle, StepForward, Timer, Undo2,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import SpaceMap from './components/SpaceMap'
import SpaceBackground from './components/SpaceBackground'
import Compare from './components/Compare'
import { useSimulation } from './hooks/useSimulation'
import { checkHealth } from './services/api'
import { ALGOS, ORDER } from './utils/algos'
import { key } from './utils/map'

type Page = 'sim' | 'compare'

const PHASE: Record<string, { t: string; c: string; tip: string }> = {
  idle: { t: 'Standby', c: '#94A3B8', tip: 'Ready for a mission. Press Run.' },
  loading: { t: 'Planning route', c: '#22D3EE', tip: 'Calculating the route.' },
  searching: { t: 'Scanning', c: '#22D3EE', tip: 'The navigator is scanning sectors for a route.' },
  delivering: { t: 'En route', c: '#14B8A6', tip: 'The rocket is following the final path.' },
  delivered: { t: 'Delivered', c: '#22C55E', tip: 'The rocket reached the destination planet.' },
  no_path: { t: 'No route', c: '#EF4444', tip: 'The destination cannot be reached on this map.' },
}

const Chip = ({ color, tip, children, pulse }: { color: string; tip: string; children: ReactNode; pulse?: boolean }) => (
  <span data-tip={tip} className="inline-flex items-center gap-2 h-8 px-3 rounded-full bg-bg/70 border border-line text-xs font-semibold">
    <i className={`w-2 h-2 rounded-full ${pulse ? 'animate-pulse' : ''}`} style={{ background: color }} />{children}
  </span>)

const Metric = ({ icon: I, label, value, sub, tip, accent, color }: { icon: LucideIcon; label: string; value: ReactNode; sub: string; tip: string; accent: string; color?: string }) => (
  <div className="card p-4" data-tip={tip}>
    <div className="flex items-center gap-2 text-mute text-xs font-semibold"><I size={15} style={{ color: accent }} />{label}</div>
    <div className="mt-2 text-2xl font-extrabold tabular-nums tracking-tight" style={{ color }}>{value}</div>
    <div className="text-xs text-mute mt-0.5">{sub}</div>
  </div>)

export default function App() {
  const [page, setPage] = useState<Page>('sim')
  const [online, setOnline] = useState<boolean | null>(null)
  const s = useSimulation()
  const [showOrder, setShowOrder] = useState(false)
  const [hover, setHover] = useState<[number, number] | null>(null)
  const orderIdx = useMemo(() => new Map((s.res?.exploration_order ?? []).map((c, i) => [key(c), i] as [string, number])), [s.res])
  const inspect = () => {
    if (!hover) return 'Hover over a cell to inspect it.'
    const k = key(hover), at = `(${hover[0]}, ${hover[1]})`
    if (k === key(s.map.start)) return `${at} · Start`
    if (k === key(s.map.goal)) return `${at} · Destination`
    if (s.map.obstacles.some(o => key(o) === k)) return `${at} · Obstacle`
    const i = orderIdx.get(k), res = s.res
    if (i === undefined || !res || !s.explored.has(k)) return `${at} · Not explored`
    const g = res.g_values[i], h = res.h_values?.[i]
    return `${at} · Explored #${i + 1} · g = ${g}` + (h != null ? ` · h = ${h}` : '') + (h != null && s.active === 'astar' ? ` · f = ${g + h}` : '')
  }
  useEffect(() => {
    const ping = () => checkHealth().then(setOnline)
    ping(); const id = setInterval(ping, 5000)
    return () => clearInterval(id)
  }, [])
  const r = s.res
  const ph = PHASE[s.phase]
  const A = ALGOS[s.algo]
  const progress = r ? Math.round((s.t / Math.max(s.total, 1)) * 100) : 0
  const openCompare = () => { setPage('compare'); if (!ORDER.every(a => s.results[a]) && !s.loading) s.compare() }

  const controls = (
    <aside className="card p-4 space-y-5 h-fit">
      <div>
        <div className="h4">Algorithm</div>
        <div className="seg grid-cols-2">
          {ORDER.map(a => (
            <button key={a} aria-pressed={s.algo === a} onClick={() => s.setAlgo(a)} className="!flex-col !gap-0 !py-2" data-tip={ALGOS[a].tip}>
              <span className="font-bold" style={s.algo === a ? { color: ALGOS[a].color } : undefined}>{ALGOS[a].name}</span>
              <span className="text-[11px] font-medium opacity-70">{ALGOS[a].sub}</span>
            </button>))}
        </div>
      </div>
      <div className="space-y-2">
        <div className="h4">Mission</div>
        <button className="btn primary w-full" disabled={s.loading} onClick={() => s.run()} data-tip="Plan a route with the selected algorithm and fly it."><Play size={16} />Run {A.name}</button>
        <button className="btn w-full" disabled={s.loading} onClick={async () => (await s.compare()) && setPage('compare')} data-tip="Run all four algorithms on this exact map and open the comparison."><GitCompare size={16} />Compare All</button>
        <div className="grid grid-cols-4 gap-2">
          <button className="btn !px-0" aria-label="Pause" data-tip="Pause" disabled={!s.playing} onClick={() => s.setPlaying(false)}><Pause size={16} /></button>
          <button className="btn !px-0" aria-label="Resume" data-tip="Resume" disabled={s.playing || !r || s.t >= s.total} onClick={() => s.setPlaying(true)}><Play size={16} /></button>
          <button className="btn !px-0" aria-label="Step" data-tip="Advance one step" disabled={s.loading || s.playing || (!!r && s.t >= s.total)} onClick={s.step}><StepForward size={16} /></button>
          <button className="btn !px-0" aria-label="Reset" data-tip="Reset the animation" onClick={s.reset}><RotateCcw size={16} /></button>
        </div>
        <button className="btn w-full" aria-pressed={showOrder} onClick={() => setShowOrder(!showOrder)} data-tip="Write the order in which nodes were explored on each cell (1 = start)."><ListOrdered size={16} />{showOrder ? 'Hide' : 'Show'} exploration order</button>
        <label className="block text-xs text-mute pt-1">
          <span className="flex justify-between mb-1"><span>Animation speed</span><b className="text-ink">{s.speed} / 10</b></span>
          <input type="range" min={1} max={10} value={s.speed} onChange={e => s.setSpeed(+e.target.value)} />
        </label>
      </div>
      <div>
        <div className="h4">Map editor</div>
        <div className="seg grid-cols-3">
          {([['wall', 'Asteroids', Pencil, 'Click or drag to place asteroids. Drag from an asteroid to erase.'], ['start', 'Start', MapPin, 'Click a cell to move the launch base.'], ['goal', 'Planet', Flag, 'Click a cell to move the destination planet.']] as const).map(([t, n, I, tip]) =>
            <button key={t} aria-pressed={s.tool === t} onClick={() => s.setTool(t)} data-tip={tip}><I size={14} />{n}</button>)}
        </div>
        <div className="grid grid-cols-2 gap-3 mt-3">
          <label className="text-xs text-mute"><span className="flex justify-between"><span>Rows</span><b className="text-ink">{s.map.rows}</b></span><input type="range" min={3} max={30} value={s.map.rows} onChange={e => s.setSize(+e.target.value, s.map.cols)} /></label>
          <label className="text-xs text-mute"><span className="flex justify-between"><span>Columns</span><b className="text-ink">{s.map.cols}</b></span><input type="range" min={3} max={30} value={s.map.cols} onChange={e => s.setSize(s.map.rows, +e.target.value)} /></label>
        </div>
        <div className="grid gap-2 mt-3">
          <button className="btn" onClick={s.random} data-tip="Scatter random asteroids (about 25%)."><Shuffle size={16} />Random asteroids</button>
          <div className="grid grid-cols-2 gap-2">
            <button className="btn" onClick={s.clearWalls}><Eraser size={16} />Clear</button>
            <button className="btn" onClick={s.restore} data-tip="Restore the default demo map."><Undo2 size={16} />Default</button>
          </div>
        </div>
      </div>
      {s.error && <p role="alert" className="text-sm text-bad bg-bad/10 border border-bad/40 rounded-lg p-3">{s.error}</p>}
    </aside>)

  const sim = (
    <div className="grid xl:grid-cols-[minmax(0,1fr)_330px] gap-4">
      <div className="space-y-4 min-w-0">
        <div className="card p-4 relative">
          <div className="flex flex-wrap items-center gap-3 mb-3">
            <div className="mr-auto">
              <h2 className="font-bold">Mission map</h2>
              <p className="text-xs text-mute">{s.map.rows} × {s.map.cols} sector · {s.map.obstacles.length} asteroids · 4-direction moves, cost 1</p>
            </div>
            <button className="btn primary xl:hidden" disabled={s.loading} onClick={() => s.run()}><Play size={16} />Run {A.name}</button>
          </div>
          <div className="h-1.5 rounded-full bg-bg/70 overflow-hidden mb-3" role="progressbar" aria-valuenow={progress} aria-valuemin={0} aria-valuemax={100} aria-label="Simulation progress">
            <div className="h-full rounded-full transition-[width] duration-100" style={{ width: `${progress}%`, background: A.color }} />
          </div>
          <p className="text-xs text-mute h-5 mb-2 tabular-nums" aria-live="polite">{inspect()}</p>
          <SpaceMap map={s.map} explored={s.explored} current={s.current} path={r?.path ?? []} showPath={s.showPath} robot={s.robot} tickMs={s.tickMs} color={A.color} delivered={s.phase === 'delivered'} onPaint={s.paint} showOrder={showOrder} order={orderIdx} onHover={c => setHover(h => ((h && c && h[0] === c[0] && h[1] === c[1]) || (!h && !c)) ? h : c)} />
          <AnimatePresence>
            {(s.phase === 'delivered' || s.phase === 'no_path') && (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                className={`absolute left-1/2 -translate-x-1/2 bottom-16 flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold shadow-xl ${s.phase === 'delivered' ? 'bg-ok text-bg' : 'bg-bad text-ink'}`}>
                <CheckCircle2 size={16} />{s.phase === 'delivered' ? `Delivery completed in ${r!.path_cost} moves` : 'No route: the destination is unreachable'}
              </motion.div>)}
          </AnimatePresence>
          <div className="flex flex-wrap gap-x-5 gap-y-1 mt-4 text-xs text-mute justify-center">
            {[['#14B8A6', 'Launch base'], ['#FBBF24', 'Destination planet'], ['#F97316', 'Asteroid'], [A.color, 'Explored node'], ['#22C55E', 'Final path']].map(([c, n]) =>
              <span key={n} className="flex items-center gap-1.5"><i className="w-3 h-3 rounded-full inline-block" style={{ background: c }} />{n}</span>)}
          </div>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 2xl:grid-cols-5 gap-3">
          <Metric icon={Route} label="Path cost" value={r?.path_cost ?? '–'} sub="moves, 1 each" tip="Total cost of the final path." accent="#22C55E" />
          <Metric icon={Layers} label="Nodes explored" value={r ? s.explored.size : '–'} sub={r ? `of ${r.explored_count} total` : 'nodes expanded'} tip="Nodes explored so far, out of the total this algorithm explored." accent="#22D3EE" />
          <Metric icon={Timer} label="Execution time" value={r ? r.execution_time_ms.toFixed(3) : '–'} sub="milliseconds" tip="How long the algorithm took to find this path." accent="#818CF8" />
          <Metric icon={Ruler} label="Path length" value={r ? (r.status === 'found' ? r.path.length : '–') : '–'} sub="cells incl. start" tip="Number of cells on the final path." accent="#14B8A6" />
          <Metric icon={CheckCircle2} label="Search status" value={r ? (r.status === 'found' ? 'Found' : 'No path') : '–'} sub={r ? r.algorithm : 'waiting'} tip="Whether the algorithm reached the destination." accent="#F97316" color={r ? (r.status === 'found' ? '#22C55E' : '#EF4444') : undefined} />
        </div>
        <details className="card p-4 text-sm text-mute">
          <summary className="cursor-pointer font-bold text-ink">Problem formulation</summary>
          <table className="w-full mt-3"><tbody>{[
            ['Initial state', 'The robot is on the start cell.'], ['Goal state', 'The robot is on the destination cell.'],
            ['State space', 'Every free cell of the rows × cols grid.'], ['Actions', 'Up, down, left, right.'],
            ['Transition model', 'Move to the neighbouring cell if it is inside the grid and not an obstacle.'],
            ['Path cost', 'Number of moves. Every move costs 1.'], ['Constraints', 'No diagonal moves, no obstacles, no leaving the grid.'],
            ['Move order', 'Up, down, left, right. This decides ties.'], ['Node explored', 'A node removed from the frontier and expanded. The goal counts.'],
            ['g, h, f', 'g = cost so far, h = Manhattan distance to the goal (A* and Greedy), f = g + h (A*).'],
          ].map(r => <tr key={r[0]} className="border-t border-line"><td className="py-2 pr-4 text-ink font-semibold w-36 align-top">{r[0]}</td><td className="py-2">{r[1]}</td></tr>)}</tbody></table>
        </details>
      </div>
      {controls}
    </div>)

  const tab = (id: Page, label: string, I: LucideIcon, onClick: () => void) => (
    <button onClick={onClick} aria-current={page === id ? 'page' : undefined}
      className={`relative flex items-center gap-2 px-4 h-10 rounded-xl text-sm font-semibold transition-colors ${page === id ? 'text-cyan' : 'text-mute hover:text-ink'}`}>
      {page === id && <motion.span layoutId="tab" className="absolute inset-0 rounded-xl bg-card border border-line" transition={{ duration: 0.2 }} />}
      <I size={17} className="relative" /><span className="relative">{label}</span>
    </button>)

  return (
    <div className="min-h-screen">
      <SpaceBackground />
      <header className="sticky top-0 z-30 flex flex-wrap items-center gap-x-4 gap-y-2 px-4 md:px-6 py-3 bg-bg/80 backdrop-blur border-b border-line">
        <div className="flex items-center gap-3 mr-2">
          <span className="bg-gradient-to-br from-cyan to-indigo text-bg p-2 rounded-xl"><Rocket size={20} /></span>
          <span className="font-extrabold text-lg tracking-tight">Nova Courier</span>
        </div>
        <nav className="flex gap-1" aria-label="Pages">
          {tab('sim', 'Simulator', Route, () => setPage('sim'))}
          {tab('compare', 'Comparison', GitCompare, openCompare)}
        </nav>
        <div className="ml-auto flex flex-wrap items-center gap-2">
          <Chip color={ph.c} tip={ph.tip} pulse={s.phase === 'searching' || s.phase === 'delivering' || s.phase === 'loading'}>{ph.t}</Chip>
          <span className="hidden sm:inline-flex"><Chip color={A.color} tip="Algorithm used by Run and Step.">{A.name}</Chip></span>
          <button className="btn" onClick={s.reset} data-tip="Reset the animation"><RotateCcw size={14} />Reset</button>
        </div>
      </header>
      {online === false && <div role="status" className="bg-bad/15 border-b border-bad/40 text-sm text-center py-2">Connection lost. Reconnecting…</div>}
      <main className="p-4 md:p-6 max-w-[1700px] mx-auto space-y-8">
        {page === 'sim' && sim}
        {page === 'compare' && <Compare results={s.results} loading={s.loading} onRun={s.compare} onWatch={a => { s.replay(a); setPage('sim') }} />}
      </main>
    </div>)
}
