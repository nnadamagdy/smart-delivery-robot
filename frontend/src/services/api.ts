import type { Algo, MapData, Result } from '../types'

async function post<T>(url: string, body: MapData): Promise<T> {
  let r: Response
  try {
    r = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
  } catch {
    throw new Error('We could not reach the server. Please try again in a moment.')
  }
  if (!r.ok) {
    const e = await r.json().catch(() => null)
    const d = e?.detail
    throw new Error(typeof d === 'string' ? d : Array.isArray(d) ? d[0]?.msg : `Request failed (${r.status})`)
  }
  return r.json()
}
export const runAlgo = (a: Algo, m: MapData) => post<Result>(`/api/${a}`, m)
export const compareBoth = (m: MapData) => post<Record<Algo, Result>>('/api/compare', m)
export const checkHealth = () => fetch('/api/health').then(r => r.ok).catch(() => false)
