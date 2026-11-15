import type { Algo } from '../types'

export const ORDER: Algo[] = ['bfs', 'dfs', 'greedy', 'astar']
export const ALGOS: Record<Algo, { name: string; full: string; sub: string; color: string; tip: string }> = {
  bfs: { name: 'BFS', full: 'Breadth-First Search', sub: 'FIFO queue', color: '#22D3EE', tip: 'Explores level by level with a FIFO queue. Optimal when every move costs 1.' },
  dfs: { name: 'DFS', full: 'Depth-First Search', sub: 'LIFO stack', color: '#F472B6', tip: 'Dives down one branch with a stack. Finds a path fast, but not necessarily the shortest.' },
  greedy: { name: 'Greedy', full: 'Greedy Best-First Search', sub: 'Priority by h', color: '#FACC15', tip: 'Always expands the cell that looks closest to the goal (h only). Fast, but not optimal.' },
  astar: { name: 'A*', full: 'A* Search', sub: 'Priority by f', color: '#818CF8', tip: 'Uses f = g + h with Manhattan distance. Optimal here.' },
}
