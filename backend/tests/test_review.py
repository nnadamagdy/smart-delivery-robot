"""Strict review tests: independent oracle, queue discipline, heuristic, edge cases, API contract."""
import random
from collections import deque
import pytest
from fastapi.testclient import TestClient
from algorithms.astar import astar, manhattan
from algorithms.bfs import bfs
from main import app

client = TestClient(app)


def oracle(rows, cols, s, g, obs):
    """Independent shortest-path length (plain level-by-level BFS, no shared code). None if unreachable."""
    obs, dist, q = set(obs), {s: 0}, deque([s])
    while q:
        r, c = q.popleft()
        for n in ((r + 1, c), (r - 1, c), (r, c + 1), (r, c - 1)):
            if 0 <= n[0] < rows and 0 <= n[1] < cols and n not in obs and n not in dist:
                dist[n] = dist[(r, c)] + 1
                q.append(n)
    return dist.get(g), dist


def random_map(rng, density):
    rows, cols = rng.randint(1, 14), rng.randint(1, 14)
    cells = [(r, c) for r in range(rows) for c in range(cols)]
    s, g = rng.choice(cells), rng.choice(cells)
    obs = [c for c in cells if c not in (s, g) and rng.random() < density]
    return rows, cols, s, g, obs


def test_manhattan_values():
    assert manhattan((0, 0), (0, 0)) == 0
    assert manhattan((2, 1), (5, 4)) == 6 and manhattan((5, 4), (2, 1)) == 6
    assert manhattan((0, 7), (3, 0)) == 10


def test_both_optimal_vs_independent_oracle():
    rng = random.Random(7)
    for i in range(400):
        rows, cols, s, g, obs = random_map(rng, rng.choice([0, 0.1, 0.3, 0.5]))
        want, _ = oracle(rows, cols, s, g, obs)
        for algo in (bfs, astar):
            res = algo(rows, cols, s, g, obs)
            assert res["path_cost"] == want, (algo.__name__, rows, cols, s, g, obs)
            assert (res["status"] == "found") == (want is not None)
            if want is not None:
                p = [tuple(c) for c in res["path"]]
                assert p[0] == s and p[-1] == g and len(p) == want + 1
                assert all(abs(a[0] - b[0]) + abs(a[1] - b[1]) == 1 for a, b in zip(p, p[1:]))
                assert not set(p) & set(obs) and len(set(p)) == len(p)


def test_bfs_is_fifo_explores_by_nondecreasing_distance():
    rng = random.Random(3)
    for _ in range(100):
        rows, cols, s, g, obs = random_map(rng, 0.2)
        _, dist = oracle(rows, cols, s, g, obs)
        d = [dist[tuple(c)] for c in bfs(rows, cols, s, g, obs)["exploration_order"]]
        assert d == sorted(d)


def test_astar_expands_in_nondecreasing_f_and_never_repeats():
    rng = random.Random(5)
    for _ in range(100):
        rows, cols, s, g, obs = random_map(rng, 0.2)
        _, dist = oracle(rows, cols, s, g, obs)
        order = [tuple(c) for c in astar(rows, cols, s, g, obs)["exploration_order"]]
        assert len(order) == len(set(order))
        f = [dist[c] + manhattan(c, g) for c in order]  # g = true distance for optimal expansions
        assert f == sorted(f)


def test_exploration_never_touches_obstacles_or_leaves_grid():
    rng = random.Random(11)
    for _ in range(100):
        rows, cols, s, g, obs = random_map(rng, 0.3)
        for algo in (bfs, astar):
            res = algo(rows, cols, s, g, obs)
            for r, c in res["exploration_order"]:
                assert 0 <= r < rows and 0 <= c < cols and (r, c) not in obs
            assert res["exploration_order"][0] == list(s)
            assert sorted(map(tuple, res["explored_cells"])) == sorted(set(map(tuple, res["exploration_order"])))


def test_deterministic():
    m = (15, 15, (7, 1), (7, 13), [(r, 6) for r in range(3, 12)] + [(r, 10) for r in range(10)])
    for algo in (bfs, astar):
        a, b = algo(*m), algo(*m)
        a.pop("execution_time_ms"); b.pop("execution_time_ms")
        assert a == b


@pytest.mark.parametrize("algo", [bfs, astar])
def test_start_equals_goal(algo):
    res = algo(1, 1, (0, 0), (0, 0), [])
    assert res["status"] == "found" and res["path"] == [[0, 0]] and res["path_cost"] == 0 and res["explored_count"] == 1


@pytest.mark.parametrize("algo", [bfs, astar])
def test_goal_walled_in_and_start_walled_in(algo):
    goal_boxed = [(3, 4), (4, 3)]
    start_boxed = [(0, 1), (1, 0)]
    for obs, s, g in ((goal_boxed, (0, 0), (4, 4)), (start_boxed, (0, 0), (4, 4))):
        res = algo(5, 5, s, g, obs)
        assert res["status"] == "no_path" and res["path_cost"] is None and res["path"] == []
        assert res["explored_count"] >= 1


def test_default_demo_map_is_solvable_and_equal_cost():
    m = (15, 15, (7, 1), (7, 13), [(r, 6) for r in range(3, 12)] + [(r, 10) for r in range(10)])
    b, a = bfs(*m), astar(*m)
    assert b["status"] == a["status"] == "found" and b["path_cost"] == a["path_cost"] == oracle(*m)[0]
    assert a["explored_count"] > 0 and b["execution_time_ms"] >= 0 and a["execution_time_ms"] >= 0


# ---------------- API contract ----------------
def body(**kw):
    return {**{"rows": 5, "cols": 5, "start": [0, 0], "goal": [4, 4], "obstacles": []}, **kw}


@pytest.mark.parametrize("ep", ["bfs", "astar"])
def test_api_no_obstacles_and_obstacles_field_optional(ep):
    b = body(); del b["obstacles"]
    r = client.post(f"/api/{ep}", json=b)
    assert r.status_code == 200 and r.json()["path_cost"] == 8 and r.json()["status"] == "found"


@pytest.mark.parametrize("ep", ["bfs", "astar", "compare"])
def test_api_start_equals_goal_and_unreachable(ep):
    r = client.post(f"/api/{ep}", json=body(start=[2, 2], goal=[2, 2]))
    assert r.status_code == 200
    r = client.post(f"/api/{ep}", json=body(obstacles=[[r_, 2] for r_ in range(5)]))
    assert r.status_code == 200
    data = r.json()
    for x in ([data] if ep != "compare" else [data["bfs"], data["astar"]]):
        assert x["status"] == "no_path" and x["path"] == [] and x["path_cost"] is None


@pytest.mark.parametrize("ep", ["bfs", "astar", "compare"])
@pytest.mark.parametrize("bad", [
    {"start": [5, 0]}, {"start": [0, 5]}, {"start": [-1, 0]}, {"goal": [0, -1]}, {"goal": [5, 5]},
    {"start": [0, 0, 0]}, {"start": [0]}, {"start": "a"}, {"start": [0.5, 1]}, {"goal": None},
    {"rows": 0}, {"cols": -3}, {"rows": 51}, {"rows": "x"}, {"obstacles": [[0, 9]]}, {"obstacles": [[-1, 0]]},
    {"obstacles": [[0, 0]]}, {"obstacles": [[4, 4]]}, {"obstacles": [[1]]}, {"obstacles": "x"},
])
def test_api_rejects_invalid(ep, bad):
    r = client.post(f"/api/{ep}", json=body(**bad))
    assert r.status_code == 422, bad
    assert r.json().get("detail")


def test_api_missing_fields_and_empty_body():
    assert client.post("/api/bfs", json={}).status_code == 422
    assert client.post("/api/astar", json={"rows": 3, "cols": 3}).status_code == 422


def test_api_response_shape_and_compare_identity():
    keys = {"algorithm", "status", "path", "explored_cells", "exploration_order", "path_cost", "explored_count", "execution_time_ms", "g_values", "h_values"}
    b = body(goal=[0, 4], obstacles=[[r, 2] for r in range(4)])
    c = client.post("/api/compare", json=b).json()
    assert set(c) == {"bfs", "astar", "dfs", "greedy"} and set(c["bfs"]) == keys == set(c["astar"])
    assert c["bfs"]["algorithm"] == "BFS" and c["astar"]["algorithm"] == "A*"
    for ep, k in (("bfs", "bfs"), ("astar", "astar")):
        s = client.post(f"/api/{ep}", json=b).json()
        for f in keys - {"execution_time_ms"}:
            assert s[f] == c[k][f]
    assert c["bfs"]["path_cost"] == c["astar"]["path_cost"] == 12
    assert c["bfs"]["explored_count"] == len(c["bfs"]["exploration_order"])


def test_api_max_size_grid_runs():
    r = client.post("/api/compare", json=body(rows=50, cols=50, goal=[49, 49]))
    assert r.status_code == 200 and r.json()["bfs"]["path_cost"] == 98 == r.json()["astar"]["path_cost"]
