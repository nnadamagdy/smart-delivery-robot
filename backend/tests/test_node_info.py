"""g(n) and h(n) reported per expanded node: used by the node inspector in the UI."""
import random
import pytest
from fastapi.testclient import TestClient
from algorithms.astar import astar, manhattan
from algorithms.bfs import bfs
from algorithms.dfs import dfs
from algorithms.greedy import greedy
from main import app
from tests.test_review import oracle, random_map

ALL = [bfs, dfs, greedy, astar]


@pytest.mark.parametrize("algo", ALL)
def test_g_values_are_consistent(algo):
    rng = random.Random(31)
    for _ in range(300):
        rows, cols, s, g, obs = random_map(rng, rng.choice([0, 0.2, 0.4]))
        res = algo(rows, cols, s, g, obs)
        _, dist = oracle(rows, cols, s, g, obs)
        order, gv = [tuple(c) for c in res["exploration_order"]], res["g_values"]
        assert len(gv) == len(order) == res["explored_count"] and gv[0] == 0
        assert all(v >= dist[c] for c, v in zip(order, gv))            # never below the true shortest distance
        if res["status"] == "found":
            assert gv[-1] == res["path_cost"]                          # goal's g equals the path cost


@pytest.mark.parametrize("algo", [bfs, astar])
def test_optimal_algorithms_report_true_shortest_distance(algo):
    rng = random.Random(32)
    for _ in range(200):
        rows, cols, s, g, obs = random_map(rng, 0.25)
        _, dist = oracle(rows, cols, s, g, obs)
        res = algo(rows, cols, s, g, obs)
        assert all(v == dist[tuple(c)] for c, v in zip(res["exploration_order"], res["g_values"]))


def test_h_values_only_for_informed_searches_and_match_manhattan():
    rows, cols, s, g, obs = 9, 9, (0, 0), (8, 7), [(4, c) for c in range(8)]
    for algo in (bfs, dfs):
        assert algo(rows, cols, s, g, obs)["h_values"] is None
    for algo in (greedy, astar):
        res = algo(rows, cols, s, g, obs)
        assert res["h_values"] == [manhattan(tuple(c), g) for c in res["exploration_order"]]


def test_astar_f_never_decreases():
    rng = random.Random(33)
    for _ in range(100):
        rows, cols, s, g, obs = random_map(rng, 0.2)
        a = astar(rows, cols, s, g, obs)
        f = [x + y for x, y in zip(a["g_values"], a["h_values"])]
        assert f == sorted(f)


def test_api_exposes_node_info():
    body = {"rows": 6, "cols": 6, "start": [0, 0], "goal": [5, 5], "obstacles": [[2, 2], [3, 3]]}
    c = TestClient(app).post("/api/compare", json=body).json()
    for k in ("bfs", "dfs", "greedy", "astar"):
        assert len(c[k]["g_values"]) == c[k]["explored_count"]
    assert c["bfs"]["h_values"] is None and c["dfs"]["h_values"] is None
    for k in ("astar", "greedy"):
        assert len(c[k]["h_values"]) == c[k]["explored_count"]
