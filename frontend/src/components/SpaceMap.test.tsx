// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest'
import { createRoot } from 'react-dom/client'
import { act } from 'react'
import SpaceMap from './SpaceMap'
import { defaultMap } from '../utils/map'

(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true

describe('SpaceMap canvas', () => {
  afterEach(() => vi.restoreAllMocks())

  it('draws idle, scanning, route and delivered states without throwing, and maps pointer to cells', async () => {
    const calls: string[] = []
    const ctx: any = new Proxy({}, { get: (_, k: string) => (k === 'createRadialGradient' || k === 'createLinearGradient') ? () => ({ addColorStop() {} }) : (...a: unknown[]) => { calls.push(k); return a[0] }, set: () => true })
    HTMLCanvasElement.prototype.getContext = (() => ctx) as any
    Object.defineProperty(HTMLElement.prototype, 'clientWidth', { configurable: true, get: () => 600 })
    HTMLCanvasElement.prototype.getBoundingClientRect = () => ({ left: 0, top: 0, width: 600, height: 600 } as DOMRect)
    let cb: FrameRequestCallback = () => {}
    vi.stubGlobal('requestAnimationFrame', (f: FrameRequestCallback) => { cb = f; return 1 })
    vi.stubGlobal('cancelAnimationFrame', () => {})
    const map = defaultMap(), painted: any[] = []
    const base = { map, explored: new Set<string>(), path: [], showPath: false, robot: map.start, tickMs: 40, color: '#22D3EE', delivered: false, onPaint: (...a: any[]) => painted.push(a) }
    const el = document.createElement('div'); document.body.appendChild(el)
    const root = createRoot(el)
    const render = (p: object) => act(async () => root.render(<SpaceMap {...base} {...p} />))
    let now = 0
    const frames = (n: number) => { for (let i = 0; i < n; i++) { now += 16; cb(now) } }

    await render({}); frames(3)
    await render({ explored: new Set(['7,2', '7,3']), current: [7, 3] }); frames(5)
    const route = [[7, 1], [7, 2], [7, 3]] as [number, number][]
    await render({ explored: new Set(['7,2']), showPath: true, path: route, robot: [7, 3] }); frames(10)
    await render({ showPath: true, path: route, robot: map.goal, delivered: true }); frames(5)

    expect(calls).not.toContain('fillText')                                   // numbers are off by default
    await render({ explored: new Set(['7,2', '7,3']), showOrder: true, order: new Map([['7,2', 0], ['7,3', 1]]) }); frames(3)
    expect(calls.filter(c => c === 'fillText').length).toBeGreaterThanOrEqual(2)  // one number per explored cell
    let hovered: any = 'unset'
    await render({ onHover: (c: any) => { hovered = c } })
    expect(calls).toContain('stroke'); expect(calls).toContain('fill')
    const cv = el.querySelector('canvas')!
    cv.dispatchEvent(new MouseEvent('pointerdown', { bubbles: true, clientX: 150, clientY: 90 }))
    expect(painted.length).toBe(1); expect(painted[0][0]).toEqual([2, 3])   // 600px / 15 cells = 40px cells
    cv.dispatchEvent(new MouseEvent('pointerup', { bubbles: true }))
    cv.dispatchEvent(new MouseEvent('pointermove', { bubbles: true, clientX: 250, clientY: 130 }))
    expect(hovered).toEqual([3, 6])                                          // hover reports the cell under the pointer
    await act(async () => root.unmount())
  })
})
