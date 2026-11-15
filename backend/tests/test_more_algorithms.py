"""DFS and Greedy Best-First: valid and complete, but NOT guaranteed optimal."""
import random
import pytest
from fastapi.testclient import TestClient
from algorithms.astar import astar
from algorithms.bfs import bfs
from algorithms.dfs import dfs
from algorithms.greedy import greedy
from main import app
from tests.test_review import oracle, random_map

client = TestClient(app)
EXTRA = [dfs, greedy]


def valid(res, rows, cols, s, g, obs):
    p = [tuple(c) for c in res["path"]]
    assert p[0] == s and p[-1] == g and len(set(p)) == len(p)
    assert all(abs(a[0] - b[0]) + abs(a[1] - b[1]) == 1 for a, b in zip(p, p[1:]))
    assert all(0 <= r < rows and 0 <= c < cols and (r, c) not in set(obs) for r, c in p)
    assert res["path_cost"] == len(p) - 1


@pytest.mark.parametrize("algo", EXTRA)
def test_complete_valid_and_never_better_than_optimal(algo):
    rng = random.Random(21)
    for _ in range(400):
        rows, cols, s, g, obs = random_map(rng, rng.choice([0, 0.1, 0.3, 0.5]))
        want, _ = oracle(rows, cols, s, g, obs)
        res = algo(rows, cols, s, g, obs)
        assert (res["status"] == "found") == (want is not None)      # complete on a finite grid
        if want is not None:
            valid(res, rows, cols, s, g, obs)
            assert res["path_cost"] >= want                          # never shorter than the optimum
        assert all(tuple(c) not in set(obs) for c in res["exploration_order"])
        assert res["explored_count"] == len(res["exploration_order"]) == len(set(map(tuple, res["exploration_order"])))


@pytest.mark.parametrize("algo", EXTRA)
def test_edge_cases(algo):
    r = algo(1, 1, (0, 0), (0, 0), [])
    assert r["status"] == "found" and r["path"] == [[0, 0]] and r["path_cost"] == 0 and r["explored_count"] == 1
    r = algo(5, 5, (0, 0), (4, 4), [(i, 2) for i in range(5)])
    assert r["status"] == "no_path" and r["path"] == [] and r["path_cost"] is None
    a, b = algo(6, 6, (0, 0), (5, 5), [(2, 2)]), algo(6, 6, (0, 0), (5, 5), [(2, 2)])
    a.pop("execution_time_ms"); b.pop("execution_time_ms")
    assert a == b


def test_dfs_goes_deep_and_is_not_optimal():
    r = dfs(1, 4, (0, 0), (0, 3), [])
    assert r["exploration_order"] == [[0, 0], [0, 1], [0, 2], [0, 3]]
    big = dfs(5, 5, (0, 0), (4, 4), [])
    assert big["status"] == "found" and big["path_cost"] > 8 == bfs(5, 5, (0, 0), (4, 4), [])["path_cost"]


def test_greedy_dives_to_goal_on_open_grid():
    r = greedy(8, 8, (0, 0), (7, 7), [])
    assert r["path_cost"] == 14 and r["explored_count"] == 15


def test_greedy_can_be_suboptimal():
    rng, found = random.Random(2), False
    for _ in range(600):
        rows, cols, s, g, obs = random_map(rng, 0.35)
        want, _ = oracle(rows, cols, s, g, obs)
        res = greedy(rows, cols, s, g, obs)
        if want is not None and res["path_cost"] > want:
            assert astar(rows, cols, s, g, obs)["path_cost"] == want
            found = True
            break
    assert found


BASE = {"rows": 5, "cols": 5, "start": [0, 0], "goal": [4, 4], "obstacles": [[2, 2]]}


@pytest.mark.parametrize("ep,name", [("dfs", "DFS"), ("greedy", "Greedy Best-First")])
def test_api_endpoints(ep, name):
    r = client.post(f"/api/{ep}", json=BASE).json()
    assert r["algorithm"] == name and r["status"] == "found" and r["path_cost"] >= 8
    for bad in ({"start": [9, 9]}, {"goal": [2, 2]}, {"rows": 0}, {"obstacles": [[0, 0]]}):
        assert client.post(f"/api/{ep}", json={**BASE, **bad}).status_code == 422


def test_compare_has_all_four_on_same_map():
    c = client.post("/api/compare", json=BASE).json()
    assert [c[k]["algorithm"] for k in ("bfs", "dfs", "greedy", "astar")] == ["BFS", "DFS", "Greedy Best-First", "A*"]
    assert c["bfs"]["path_cost"] == c["astar"]["path_cost"] == 8
    for k, ep in (("dfs", "dfs"), ("greedy", "greedy")):
        assert client.post(f"/api/{ep}", json=BASE).json()["exploration_order"] == c[k]["exploration_order"]
