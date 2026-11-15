import heapq
import time
from algorithms.astar import manhattan
from utils.grid import neighbors, reconstruct
from utils.metrics import build_result


def greedy(rows, cols, start, goal, obstacles):
    """Greedy Best-First Search: priority queue ordered by h(n) only. NOT optimal."""
    t0 = time.perf_counter()
    obs = set(map(tuple, obstacles))
    start, goal = tuple(start), tuple(goal)
    parent = {start: None}                # first discovery fixes the parent
    g = {start: 0}                        # cost so far (reported, but NOT used for ordering)
    counter = 0                           # deterministic tie-break: oldest first
    heap = [(manhattan(start, goal), counter, start)]
    closed, order, gs, hs, path = set(), [], [], [], []
    while heap:
        h, _, cur = heapq.heappop(heap)
        if cur in closed:
            continue
        closed.add(cur)
        order.append(cur); gs.append(g[cur]); hs.append(h)
        if cur == goal:
            path = reconstruct(parent, goal)
            break
        for n in neighbors(cur, rows, cols, obs):
            if n not in parent:
                parent[n] = cur
                g[n] = g[cur] + 1
                counter += 1
                heapq.heappush(heap, (manhattan(n, goal), counter, n))
    return build_result("Greedy Best-First", order, path, t0, gs, hs)
