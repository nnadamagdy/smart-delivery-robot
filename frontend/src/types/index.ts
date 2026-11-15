export type Cell = [number, number]
export type Algo = 'bfs' | 'dfs' | 'greedy' | 'astar'
export interface MapData { rows: number; cols: number; start: Cell; goal: Cell; obstacles: Cell[] }
export interface Result {
  algorithm: string; status: 'found' | 'no_path'; path: Cell[]; explored_cells: Cell[]
  exploration_order: Cell[]; path_cost: number | null; explored_count: number; execution_time_ms: number
  g_values: number[]; h_values: number[] | null
}
