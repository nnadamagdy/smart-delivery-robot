import time


def build_result(name, order, path, t0, g=None, h=None):
    """Package a search outcome. t0 = perf_counter() taken before the search began.
    g[i] = cost-so-far of the i-th expanded node; h[i] = its heuristic value (None for uninformed searches)."""
    elapsed_ms = (time.perf_counter() - t0) * 1000
    return {
        "algorithm": name,
        "status": "found" if path else "no_path",
        "path": [list(c) for c in path],
        "explored_cells": [list(c) for c in sorted(set(order))],
        "exploration_order": [list(c) for c in order],
        "path_cost": len(path) - 1 if path else None,  # every move costs 1
        "explored_count": len(order),
        "execution_time_ms": round(elapsed_ms, 4),
        "g_values": list(g) if g is not None else [],
        "h_values": list(h) if h is not None else None,
    }
