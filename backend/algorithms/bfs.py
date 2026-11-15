import time
from collections import deque
from utils.grid import neighbors, reconstruct
from utils.metrics import build_result


def bfs(rows, cols, start, goal, obstacles):
    t0 = time.perf_counter()
    obs = set(map(tuple, obstacles))
    start, goal = tuple(start), tuple(goal)
    queue = deque([start])            # FIFO queue -> level-by-level exploration
    parent = {start: None}            # doubles as the visited set
    dist = {start: 0}                 # g(n): moves from the start
    order, gs, path = [], [], []
    while queue:
        cur = queue.popleft()
        order.append(cur)             # a node is "explored" when it is expanded
        gs.append(dist[cur])
        if cur == goal:
            path = reconstruct(parent, goal)
            break
        for n in neighbors(cur, rows, cols, obs):
            if n not in parent:
                parent[n] = cur
                dist[n] = dist[cur] + 1
                queue.append(n)
    return build_result("BFS", order, path, t0, gs)
