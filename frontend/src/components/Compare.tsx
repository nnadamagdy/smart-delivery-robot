import { Bar, BarChart, CartesianGrid, Cell as BarCell, LabelList, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { GitCompare, Loader2, Play } from 'lucide-react'
import type { Algo, Result } from '../types'
import { ALGOS, ORDER } from '../utils/algos'

const chart = (title: string, vals: number[]) => (
  <div className="card p-4" key={title}>
    <h3 className="font-bold text-sm mb-3">{title}</h3>
    <div className="h-52">
      <ResponsiveContainer>
        <BarChart data={ORDER.map((a, i) => ({ n: ALGOS[a].name, v: vals[i] }))} margin={{ top: 18, right: 8, left: -12, bottom: 0 }}>
          <CartesianGrid stroke="#2A3160" strokeDasharray="3 3" vertical={false} />
          <XAxis dataKey="n" stroke="#94A3B8" tickLine={false} axisLine={false} />
          <YAxis stroke="#94A3B8" tickLine={false} axisLine={false} width={48} />
          <Tooltip cursor={{ fill: 'rgba(148,163,184,.08)' }} contentStyle={{ background: '#04050F', border: '1px solid #2A3160', borderRadius: 10, fontSize: 12 }} />
          <Bar dataKey="v" name={title} radius={[8, 8, 0, 0]} maxBarSize={56} animationDuration={600}>
            {ORDER.map(a => <BarCell key={a} fill={ALGOS[a].color} />)}
            <LabelList dataKey="v" position="top" fill="#F8FAFC" fontSize={12} fontWeight={700} />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  </div>)

interface Props { results: Partial<Record<Algo, Result>>; loading: boolean; onRun: () => void; onWatch: (a: Algo) => void }

export default function Compare({ results, loading, onRun, onWatch }: Props) {
  if (!ORDER.every(a => results[a])) return (
    <div className="card p-10 text-center max-w-xl mx-auto">
      {loading ? <Loader2 className="mx-auto text-cyan mb-3 animate-spin" size={28} /> : <GitCompare className="mx-auto text-cyan mb-3" size={28} />}
      <h2 className="font-bold text-lg mb-1">{loading ? 'Comparing routes' : 'No comparison yet'}</h2>
      <p className="text-mute text-sm mb-4">All four algorithms plan a route on the same map.</p>
      <button className="btn primary" disabled={loading} onClick={onRun}><GitCompare size={16} />Compare routes</button>
    </div>)
  const res = results as Record<Algo, Result>
  const found = ORDER.filter(a => res[a].status === 'found')
  const names = (l: Algo[]) => l.map(a => ALGOS[a].name).join(' and ')
  let verdict = 'No route exists on this map, so none of the algorithms can deliver.'
  let minCost = Infinity
  if (found.length) {
    minCost = Math.min(...found.map(a => res[a].path_cost as number))
    const best = found.filter(a => res[a].path_cost === minCost), longer = found.filter(a => (res[a].path_cost as number) > minCost)
    const lo = Math.min(...ORDER.map(a => res[a].explored_count)), fewest = ORDER.filter(a => res[a].explored_count === lo)
    verdict = `${names(best)} found the shortest path (${minCost} moves). ${names(fewest)} explored the fewest nodes (${lo}).` + (longer.length ? ` ${names(longer)} took a longer path.` : '')
  }
  const loScan = Math.min(...ORDER.map(a => res[a].explored_count))
  return (
    <div className="space-y-4">
      <div className="card p-5"><h2 className="font-extrabold text-lg mb-1">Algorithm comparison</h2><p className="text-mute text-sm">{verdict}</p></div>
      <div className="grid sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {ORDER.map(a => {
          const r = res[a], A = ALGOS[a], ok = r.status === 'found'
          const badge = !ok ? ['No route', '#EF4444'] : r.path_cost === minCost ? ['Shortest path', '#22C55E'] : [`+${(r.path_cost as number) - minCost} moves longer`, '#FACC15']
          return (
            <div key={a} className="card p-4" style={{ borderTop: `3px solid ${A.color}` }}>
              <div className="flex items-center justify-between gap-2 mb-1"><h3 className="font-extrabold" style={{ color: A.color }}>{A.name}</h3>
                <span className="text-[11px] font-bold px-2 py-0.5 rounded-full" style={{ color: badge[1], background: `${badge[1]}22` }}>{badge[0]}</span></div>
              <p className="text-xs text-mute mb-3">{A.full}</p>
              <dl className="grid grid-cols-3 gap-2 text-center">
                {[['Path cost', ok ? r.path_cost : '–'], ['Explored', r.explored_count], ['Time (ms)', r.execution_time_ms.toFixed(2)]].map(([l, v]) =>
                  <div key={l as string}><dd className="text-xl font-extrabold tabular-nums">{v}</dd><dt className="text-[11px] text-mute">{l}</dt></div>)}
              </dl>
              {r.explored_count === loScan && <p className="text-[11px] text-cyan mt-2 text-center">Fewest nodes explored</p>}
              <button className="btn w-full mt-3" onClick={() => onWatch(a)} data-tip="Replay this route in the simulator"><Play size={14} />Watch</button>
            </div>)
        })}
      </div>
      <div className="grid md:grid-cols-2 gap-4">
        {chart('Nodes explored', ORDER.map(a => res[a].explored_count))}
        {chart('Path cost (moves)', ORDER.map(a => res[a].path_cost ?? 0))}
      </div>
    </div>)
}
