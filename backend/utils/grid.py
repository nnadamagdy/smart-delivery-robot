"""Grid helpers shared by BFS and A* so both use IDENTICAL movement rules."""
from typing import Iterator, Set, Tuple

Cell = Tuple[int, int]  # (row, col)
MOVES = [(-1, 0), (1, 0), (0, -1), (0, 1)]  # up, down, left, right (no diagonals, cost 1 each)


def neighbors(cell: Cell, rows: int, cols: int, obstacles: Set[Cell]) -> Iterator[Cell]:
    for dr, dc in MOVES:
        n = (cell[0] + dr, cell[1] + dc)
        if 0 <= n[0] < rows and 0 <= n[1] < cols and n not in obstacles:
            yield n


def reconstruct(parent, goal):
    path, cur = [], goal
    while cur is not None:
        path.append(cur)
        cur = parent[cur]
    return path[::-1]
