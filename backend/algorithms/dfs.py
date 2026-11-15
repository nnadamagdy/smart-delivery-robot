import time
from utils.grid import neighbors, reconstruct
from utils.metrics import build_result


def dfs(rows, cols, start, goal, obstacles):
    """Depth-First Search with an explicit LIFO stack. NOT optimal: returns the first path it finds."""
    t0 = time.perf_counter()
    obs = set(map(tuple, obstacles))
    start, goal = tuple(start), tuple(goal)
    stack = [start]
    parent = {start: None}
    depth = {start: 0}                # g(n): moves along the DFS tree path
    visited, order, gs, path = set(), [], [], []
    while stack:
        cur = stack.pop()                 # newest discovered cell first
        if cur in visited:
            continue
        visited.add(cur)
        order.append(cur)
        gs.append(depth[cur])
        if cur == goal:
            path = reconstruct(parent, goal)
            break
        # push in reverse so the first move in the order up, down, left, right is explored first
        for n in reversed(list(neighbors(cur, rows, cols, obs))):
            if n not in visited:
                parent[n] = cur           # the latest push is the one that gets popped, so it wins
                depth[n] = depth[cur] + 1
                stack.append(n)
    return build_result("DFS", order, path, t0, gs)
