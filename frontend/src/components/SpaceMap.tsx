import { useEffect, useRef } from 'react'
import type { PointerEvent } from 'react'
import type { Cell, MapData } from '../types'
import { key } from '../utils/map'

interface Props {
  map: MapData; explored: Set<string>; current?: Cell; path: Cell[]; showPath: boolean; robot: Cell
  tickMs: number; color: string; delivered: boolean; onPaint: (c: Cell, wall?: boolean) => void
  showOrder?: boolean; order?: Map<string, number>; onHover?: (c: Cell | null) => void
}
interface Part { x: number; y: number; life: number }

const hash = (r: number, c: number, i: number) => { const x = Math.sin(r * 127.1 + c * 311.7 + i * 74.7) * 43758.5453; return x - Math.floor(x) }

/** Canvas star map: 60 fps, smooth rocket that faces its direction of travel, glowing route, scan ripples. */
export default function SpaceMap(props: Props) {
  const cvRef = useRef<HTMLCanvasElement>(null)
  const wrapRef = useRef<HTMLDivElement>(null)
  const P = useRef(props); P.current = props
  const S = useRef({ x: 0, y: 0, px: 0, py: 0, tx: 0, ty: 0, q: [] as [number, number][], ang: -Math.PI / 2, init: false, last: 0, w: 0, rows: 0, cols: 0, born: new Map<string, number>(), parts: [] as Part[] })
  const drag = useRef<{ wall: boolean } | null>(null)
  const lastCell = useRef('')

  useEffect(() => {
    const cv = cvRef.current!, ctx = cv.getContext('2d')!
    let raf = 0
    const rock = (cx: number, cy: number, rad: number, r: number, c: number) => {
      ctx.beginPath()
      for (let i = 0; i < 9; i++) {
        const a = (i / 9) * Math.PI * 2, rr = rad * (0.78 + 0.3 * hash(r, c, i))
        i ? ctx.lineTo(cx + Math.cos(a) * rr, cy + Math.sin(a) * rr) : ctx.moveTo(cx + Math.cos(a) * rr, cy + Math.sin(a) * rr)
      }
      ctx.closePath()
      const g = ctx.createRadialGradient(cx - rad * 0.3, cy - rad * 0.3, rad * 0.1, cx, cy, rad * 1.1)
      g.addColorStop(0, '#fdba74'); g.addColorStop(0.55, '#c2410c'); g.addColorStop(1, '#431407')
      ctx.fillStyle = g; ctx.fill()
      ctx.fillStyle = 'rgba(30,10,0,.38)'
      for (let i = 0; i < 2; i++) { ctx.beginPath(); ctx.arc(cx + (hash(r, c, 20 + i) - 0.5) * rad, cy + (hash(r, c, 30 + i) - 0.5) * rad, rad * (0.14 + 0.1 * hash(r, c, 40 + i)), 0, 7); ctx.fill() }
    }
    const frame = (now: number) => {
      raf = requestAnimationFrame(frame)
      const p = P.current, s = S.current
      const w = wrapRef.current!.clientWidth, { rows, cols } = p.map
      if (!w) return
      if (w !== s.w || rows !== s.rows || cols !== s.cols) {
        s.w = w; s.rows = rows; s.cols = cols
        const dpr = Math.min(window.devicePixelRatio || 1, 2), h = Math.round((w * rows) / cols)
        cv.width = w * dpr; cv.height = h * dpr; cv.style.height = h + 'px'
      }
      const dpr = cv.width / w, h = cv.height / dpr, cs = w / cols
      const dt = Math.min(now - (s.last || now), 50); s.last = now
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.clearRect(0, 0, w, h)
      const ctr = (c: Cell): [number, number] => [(c[1] + 0.5) * cs, (c[0] + 0.5) * cs]

      ctx.strokeStyle = 'rgba(129,140,248,.11)'; ctx.lineWidth = 1; ctx.beginPath()
      for (let c = 0; c <= cols; c++) { ctx.moveTo(c * cs, 0); ctx.lineTo(c * cs, h) }
      for (let r = 0; r <= rows; r++) { ctx.moveTo(0, r * cs); ctx.lineTo(w, r * cs) }
      ctx.stroke()

      if (p.explored.size === 0) s.born.clear()
      p.explored.forEach(k => {
        if (!s.born.has(k)) s.born.set(k, now)
        const [r, c] = k.split(',').map(Number), age = now - s.born.get(k)!
        ctx.fillStyle = p.color; ctx.strokeStyle = p.color
        ctx.globalAlpha = 0.2 * Math.min(age / 300, 1); ctx.fillRect(c * cs + 1.5, r * cs + 1.5, cs - 3, cs - 3)
        if (age < 450) { const t = age / 450, e = t * cs * 0.4; ctx.globalAlpha = 0.6 * (1 - t); ctx.strokeRect(c * cs + 1.5 - e, r * cs + 1.5 - e, cs - 3 + 2 * e, cs - 3 + 2 * e) }
        if (p.showOrder && p.order && cs >= 20) {   // exploration order number, 1 = start
          const i = p.order.get(k)
          if (i !== undefined) { ctx.globalAlpha = 0.95; ctx.fillStyle = '#F8FAFC'; ctx.font = `700 ${Math.floor(cs * (i > 98 ? 0.28 : 0.34))}px Manrope, system-ui, sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(String(i + 1), (c + 0.5) * cs, (r + 0.52) * cs) }
        }
      })
      ctx.globalAlpha = 1
      if (p.current) { const [x, y] = ctr(p.current); ctx.shadowColor = p.color; ctx.shadowBlur = 18; ctx.fillStyle = p.color; ctx.beginPath(); ctx.arc(x, y, cs * 0.2, 0, 7); ctx.fill(); ctx.shadowBlur = 0 }

      if (p.showPath && p.path.length > 1) {
        ctx.save(); ctx.lineWidth = Math.max(2, cs * 0.16); ctx.lineJoin = 'round'; ctx.lineCap = 'round'
        ctx.strokeStyle = '#22C55E'; ctx.shadowColor = '#22C55E'; ctx.shadowBlur = 14
        ctx.setLineDash([cs * 0.35, cs * 0.28]); ctx.lineDashOffset = -now / 35
        ctx.beginPath(); p.path.forEach((c, i) => { const [x, y] = ctr(c); i ? ctx.lineTo(x, y) : ctx.moveTo(x, y) }); ctx.stroke(); ctx.restore()
      }

      p.map.obstacles.forEach(([r, c]) => { const [x, y] = ctr([r, c]); rock(x, y, cs * 0.44, r, c) })

      const [sx, sy] = ctr(p.map.start)                               // launch base
      ctx.save(); ctx.translate(sx, sy)
      const bg = ctx.createRadialGradient(-cs * 0.1, -cs * 0.1, 1, 0, 0, cs * 0.4); bg.addColorStop(0, '#99f6e4'); bg.addColorStop(1, '#0f766e')
      ctx.shadowColor = '#14B8A6'; ctx.shadowBlur = 14; ctx.fillStyle = bg; ctx.beginPath(); ctx.arc(0, 0, cs * 0.3, 0, 7); ctx.fill(); ctx.shadowBlur = 0
      ctx.strokeStyle = '#5eead4'; ctx.lineWidth = 1.5; ctx.setLineDash([4, 4]); ctx.rotate(now / 1800); ctx.beginPath(); ctx.arc(0, 0, cs * 0.43, 0, 7); ctx.stroke(); ctx.restore()

      const [gx, gy] = ctr(p.map.goal)                                // destination planet
      const pr = cs * 0.34 * (p.delivered ? 1 + 0.07 * Math.sin(now / 180) : 1)
      ctx.save(); ctx.translate(gx, gy)
      const pg = ctx.createRadialGradient(-pr * 0.35, -pr * 0.35, pr * 0.1, 0, 0, pr); pg.addColorStop(0, '#fef3c7'); pg.addColorStop(0.5, '#fbbf24'); pg.addColorStop(1, '#b45309')
      ctx.shadowColor = '#FBBF24'; ctx.shadowBlur = 20; ctx.fillStyle = pg; ctx.beginPath(); ctx.arc(0, 0, pr, 0, 7); ctx.fill(); ctx.shadowBlur = 0
      ctx.rotate(-0.4); ctx.strokeStyle = 'rgba(248,250,252,.85)'; ctx.lineWidth = Math.max(1.5, cs * 0.05); ctx.beginPath(); ctx.ellipse(0, 0, pr * 1.55, pr * 0.45, 0, 0, 7); ctx.stroke(); ctx.restore()

      const [tx, ty] = ctr(p.robot)                                   // rocket: constant-speed glide along the route
      if (!s.init || Math.hypot(tx - s.tx, ty - s.ty) > cs * 1.5) { s.x = s.px = s.tx = tx; s.y = s.py = s.ty = ty; s.q = []; s.init = true }
      else if (tx !== s.tx || ty !== s.ty) { s.q.push([tx, ty]); s.tx = tx; s.ty = ty }
      let budget = (cs * (1000 / p.tickMs) * (1 + 0.4 * s.q.length) * dt) / 1000   // speeds up only if it falls behind
      while (budget > 0 && s.q.length) {
        const [qx, qy] = s.q[0], d = Math.hypot(qx - s.px, qy - s.py)
        if (d <= budget) { s.px = qx; s.py = qy; budget -= d; s.q.shift() }
        else { s.px += ((qx - s.px) / d) * budget; s.py += ((qy - s.py) / d) * budget; budget = 0 }
      }
      const ox = s.x, oy = s.y, k = 1 - Math.exp(-dt / Math.min(90, Math.max(18, p.tickMs * 0.6)))   // light easing rounds the corners
      s.x += (s.px - s.x) * k; s.y += (s.py - s.y) * k
      const vx = s.x - ox, vy = s.y - oy, moving = dt > 0 && Math.hypot(vx, vy) / dt * 1000 > cs * 0.3
      if (moving) { let d = Math.atan2(vy, vx) - s.ang; d = Math.atan2(Math.sin(d), Math.cos(d)); s.ang += d * (1 - Math.exp(-dt / 90)) }
      if (moving && s.parts.length < 90) s.parts.push({ x: s.x - Math.cos(s.ang) * cs * 0.3, y: s.y - Math.sin(s.ang) * cs * 0.3, life: 1 })
      s.parts = s.parts.filter(q => (q.life -= dt / 450) > 0)
      s.parts.forEach(q => { ctx.globalAlpha = q.life * 0.7; ctx.fillStyle = '#FB923C'; ctx.beginPath(); ctx.arc(q.x, q.y, cs * 0.09 * q.life, 0, 7); ctx.fill() })
      ctx.globalAlpha = 1
      const u = cs * 0.4
      ctx.save(); ctx.translate(s.x, s.y); ctx.rotate(s.ang + Math.PI / 2)
      const fl = u * (moving ? 1.2 : 0.5) * (0.8 + 0.4 * Math.random()), fg = ctx.createLinearGradient(0, u * 0.7, 0, u * 0.7 + fl)
      fg.addColorStop(0, '#FDE68A'); fg.addColorStop(1, 'rgba(249,115,22,0)'); ctx.fillStyle = fg
      ctx.beginPath(); ctx.moveTo(-u * 0.26, u * 0.7); ctx.lineTo(u * 0.26, u * 0.7); ctx.lineTo(0, u * 0.7 + fl); ctx.fill()
      ctx.shadowColor = p.color; ctx.shadowBlur = 12; ctx.fillStyle = '#22D3EE'
      ctx.beginPath(); ctx.moveTo(-u * 0.4, u * 0.1); ctx.lineTo(-u * 0.85, u * 0.85); ctx.lineTo(-u * 0.4, u * 0.7); ctx.fill()
      ctx.beginPath(); ctx.moveTo(u * 0.4, u * 0.1); ctx.lineTo(u * 0.85, u * 0.85); ctx.lineTo(u * 0.4, u * 0.7); ctx.fill()
      const bd = ctx.createLinearGradient(-u * 0.5, 0, u * 0.5, 0); bd.addColorStop(0, '#E2E8F0'); bd.addColorStop(1, '#94A3B8'); ctx.fillStyle = bd
      ctx.beginPath(); ctx.moveTo(0, -u * 1.1); ctx.quadraticCurveTo(u * 0.58, -u * 0.2, u * 0.4, u * 0.7); ctx.lineTo(-u * 0.4, u * 0.7); ctx.quadraticCurveTo(-u * 0.58, -u * 0.2, 0, -u * 1.1); ctx.fill()
      ctx.shadowBlur = 0; ctx.fillStyle = '#0B1120'; ctx.strokeStyle = '#22D3EE'; ctx.lineWidth = 1.5
      ctx.beginPath(); ctx.arc(0, -u * 0.25, u * 0.2, 0, 7); ctx.fill(); ctx.stroke(); ctx.restore()
    }
    raf = requestAnimationFrame(frame)
    return () => cancelAnimationFrame(raf)
  }, [])

  const cellAt = (e: PointerEvent): Cell | null => {
    const b = cvRef.current!.getBoundingClientRect(), { rows, cols } = P.current.map
    const c = Math.floor(((e.clientX - b.left) / b.width) * cols), r = Math.floor(((e.clientY - b.top) / b.height) * rows)
    return r >= 0 && r < rows && c >= 0 && c < cols ? [r, c] : null
  }
  const down = (e: PointerEvent) => {
    const c = cellAt(e); if (!c) return
    lastCell.current = key(c); drag.current = { wall: !P.current.map.obstacles.some(o => key(o) === key(c)) }; P.current.onPaint(c)
  }
  const move = (e: PointerEvent) => {
    const c = cellAt(e)
    if (!drag.current) { P.current.onHover?.(c); return }
    if (c && key(c) !== lastCell.current) { lastCell.current = key(c); P.current.onPaint(c, drag.current.wall); P.current.onHover?.(c) }
  }
  const up = () => { drag.current = null; lastCell.current = '' }
  const leave = () => { up(); P.current.onHover?.(null) }

  const { map } = props
  return (
    <div ref={wrapRef} className="mx-auto rounded-xl border border-line bg-bg/55 overflow-hidden"
      style={{ maxWidth: `min(100%, ${(map.cols / map.rows) * 74}vh)` }}>
      <canvas ref={cvRef} className="block w-full cursor-crosshair" style={{ touchAction: 'none' }} role="img"
        aria-label={`${map.rows} by ${map.cols} space map with ${map.obstacles.length} asteroids`}
        onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={up} onPointerLeave={leave} />
    </div>)
}
