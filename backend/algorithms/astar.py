import heapq
import time
from utils.grid import neighbors, reconstruct
from utils.metrics import build_result


def manhattan(a, b):
    return abs(a[0] - b[0]) + abs(a[1] - b[1])


def astar(rows, cols, start, goal, obstacles):
    t0 = time.perf_counter()
    obs = set(map(tuple, obstacles))
    start, goal = tuple(start), tuple(goal)
    g = {start: 0}
    parent = {start: None}
    counter = 0  # insertion order = deterministic last tie-break
    # heap entry: (f, h, counter, node) -> lowest f, then lowest h, then oldest
    heap = [(manhattan(start, goal), manhattan(start, goal), counter, start)]
    closed, order, gs, hs, path = set(), [], [], [], []
    while heap:
        _, h, _, cur = heapq.heappop(heap)
        if cur in closed:
            continue                  # stale duplicate entry
        closed.add(cur)
        order.append(cur); gs.append(g[cur]); hs.append(h)
        if cur == goal:
            path = reconstruct(parent, goal)
            break
        for n in neighbors(cur, rows, cols, obs):
            ng = g[cur] + 1
            if n not in closed and ng < g.get(n, float("inf")):
                g[n] = ng
                parent[n] = cur
                h = manhattan(n, goal)
                counter += 1
                heapq.heappush(heap, (ng + h, h, counter, n))
    return build_result("A*", order, path, t0, gs, hs)
