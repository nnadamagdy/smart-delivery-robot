from typing import List, Optional, Tuple

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from algorithms.astar import astar
from algorithms.bfs import bfs
from algorithms.dfs import dfs
from algorithms.greedy import greedy

Cell = Tuple[int, int]
app = FastAPI(title="Smart Delivery Robot API", version="1.0.0")
app.add_middleware(CORSMiddleware, allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
                   allow_methods=["*"], allow_headers=["*"])


class MapRequest(BaseModel):
    rows: int = Field(ge=1, le=50)
    cols: int = Field(ge=1, le=50)
    start: Cell
    goal: Cell
    obstacles: List[Cell] = []


class SearchResponse(BaseModel):
    algorithm: str
    status: str
    path: List[Cell]
    explored_cells: List[Cell]
    exploration_order: List[Cell]
    path_cost: Optional[int]
    explored_count: int
    execution_time_ms: float
    g_values: List[int] = []            # cost so far of each expanded node, same order as exploration_order
    h_values: Optional[List[int]] = None  # heuristic of each expanded node (A* and Greedy only)


class CompareResponse(BaseModel):
    bfs: SearchResponse
    astar: SearchResponse
    dfs: SearchResponse
    greedy: SearchResponse


def validate(m: MapRequest):
    inside = lambda c: 0 <= c[0] < m.rows and 0 <= c[1] < m.cols
    obs = set(m.obstacles)
    if not inside(m.start):
        raise HTTPException(422, "Start is outside the grid.")
    if not inside(m.goal):
        raise HTTPException(422, "Destination is outside the grid.")
    if any(not inside(c) for c in obs):
        raise HTTPException(422, "An obstacle is outside the grid.")
    if m.start in obs:
        raise HTTPException(422, "Start cannot be on an obstacle.")
    if m.goal in obs:
        raise HTTPException(422, "Destination cannot be on an obstacle.")


@app.get("/api/health")
def health():
    return {"status": "ok"}


@app.post("/api/bfs", response_model=SearchResponse)
def run_bfs(m: MapRequest):
    validate(m)
    return bfs(m.rows, m.cols, m.start, m.goal, m.obstacles)


@app.post("/api/astar", response_model=SearchResponse)
def run_astar(m: MapRequest):
    validate(m)
    return astar(m.rows, m.cols, m.start, m.goal, m.obstacles)


@app.post("/api/dfs", response_model=SearchResponse)
def run_dfs(m: MapRequest):
    validate(m)
    return dfs(m.rows, m.cols, m.start, m.goal, m.obstacles)


@app.post("/api/greedy", response_model=SearchResponse)
def run_greedy(m: MapRequest):
    validate(m)
    return greedy(m.rows, m.cols, m.start, m.goal, m.obstacles)


@app.post("/api/compare", response_model=CompareResponse)
def compare(m: MapRequest):
    validate(m)  # one validated map, passed unchanged to both algorithms
    args = (m.rows, m.cols, m.start, m.goal, m.obstacles)
    return {"bfs": bfs(*args), "astar": astar(*args), "dfs": dfs(*args), "greedy": greedy(*args)}
