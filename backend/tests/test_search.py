import random
import pytest
from fastapi.testclient import TestClient
from algorithms.astar import astar
from algorithms.bfs import bfs
from main import app

ALGOS = [bfs, astar]

CASES = {  # name: (rows, cols, start, goal, obstacles, expected cost or None)
    "empty": (5, 5, (0, 0), (4, 4), [], 8),
    "obstacles": (5, 5, (0, 0), (0, 4), [(r, 2) for r in range(4)], 12),
    "corridor": (3, 7, (1, 0), (1, 6), [(0, c) for c in range(7)] + [(2, c) for c in range(7)], 6),
    "multiple_paths": (4, 4, (0, 0), (3, 3), [], 6),
    "unreachable": (5, 5, (0, 0), (4, 4), [(r, 2) for r in range(5)], None),
    "start_equals_goal": (5, 5, (2, 2), (2, 2), [], 0),
    "single_row": (1, 10, (0, 0), (0, 9), [], 9),
    "large_grid": (20, 30, (0, 0), (19, 29), [], 48),
}


def check_path(res, rows, cols, start, goal, obs):
    p = [tuple(c) for c in res["path"]]
    assert p[0] == start and p[-1] == goal
    for a, b in zip(p, p[1:]):
        assert abs(a[0] - b[0]) + abs(a[1] - b[1]) == 1   # 4-direction moves only
    assert all(0 <= r < rows and 0 <= c < cols and (r, c) not in set(obs) for r, c in p)
    assert res["path_cost"] == len(p) - 1


@pytest.mark.parametrize("algo", ALGOS)
@pytest.mark.parametrize("name", CASES)
def test_cases(algo, name):
    rows, cols, s, g, obs, cost = CASES[name]
    res = algo(rows, cols, s, g, obs)
    if cost is None:
        assert res["status"] == "no_path" and res["path"] == [] and res["path_cost"] is None
    else:
        assert res["status"] == "found" and res["path_cost"] == cost
        check_path(res, rows, cols, s, g, obs)
    assert res["explored_count"] == len(res["exploration_order"])


def test_both_algorithms_agree_on_random_maps():
    rng = random.Random(42)
    for _ in range(60):
        rows, cols = rng.randint(3, 15), rng.randint(3, 15)
        s, g = (0, 0), (rows - 1, cols - 1)
        obs = [(r, c) for r in range(rows) for c in range(cols)
               if (r, c) not in (s, g) and rng.random() < 0.3]
        b, a = bfs(rows, cols, s, g, obs), astar(rows, cols, s, g, obs)
        assert b["path_cost"] == a["path_cost"] and b["status"] == a["status"]
        if b["status"] == "found":
            check_path(b, rows, cols, s, g, obs)
            check_path(a, rows, cols, s, g, obs)


client = TestClient(app)
BASE = {"rows": 5, "cols": 5, "start": [0, 0], "goal": [4, 4], "obstacles": [[2, 2]]}


def test_health():
    assert client.get("/api/health").json() == {"status": "ok"}


@pytest.mark.parametrize("patch", [{"start": [9, 9]}, {"goal": [-1, 0]}, {"start": [2, 2]},
                                   {"goal": [2, 2]}, {"obstacles": [[7, 7]]}, {"rows": 0}])
def test_invalid_input_rejected(patch):
    assert client.post("/api/bfs", json={**BASE, **patch}).status_code == 422


def test_compare_uses_same_map():
    r = client.post("/api/compare", json=BASE).json()
    sb, sa = client.post("/api/bfs", json=BASE).json(), client.post("/api/astar", json=BASE).json()
    assert r["bfs"]["path_cost"] == r["astar"]["path_cost"] == 8
    assert r["bfs"]["exploration_order"] == sb["exploration_order"]
    assert r["astar"]["exploration_order"] == sa["exploration_order"]
