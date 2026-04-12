"""Custom MCP server exposing FluxStudio domain knowledge.

Provides tools that give Claude structured access to the FluxStudio codebase:
routes, components, AI task config, formation tools, and test coverage.

Usage:
    python -m fluxstudio_agents.mcp_server
"""

from __future__ import annotations

import json
import os
import re
import subprocess
from pathlib import Path

from mcp.server.fastmcp import FastMCP

mcp = FastMCP("fluxstudio", description="FluxStudio domain model and tooling")

PROJECT_ROOT = Path(os.environ.get("FLUXSTUDIO_ROOT", Path(__file__).resolve().parents[3]))


def _project_path(*parts: str) -> Path:
    return PROJECT_ROOT.joinpath(*parts)


def _safe_resolve(relative_path: str) -> Path:
    """Resolve a relative path and verify it stays within PROJECT_ROOT."""
    resolved = (PROJECT_ROOT / relative_path).resolve()
    if not resolved.is_relative_to(PROJECT_ROOT.resolve()):
        raise ValueError(f"Path escapes project root: {relative_path}")
    return resolved


# ---------------------------------------------------------------------------
# Tools
# ---------------------------------------------------------------------------


@mcp.tool()
def flux_list_routes() -> str:
    """List all Express route files with their HTTP endpoints."""
    routes_dir = _project_path("routes")
    if not routes_dir.is_dir():
        return json.dumps({"error": "routes/ directory not found"})

    results = []
    for path in sorted(routes_dir.rglob("*.js")):
        rel = path.relative_to(PROJECT_ROOT)
        # Extract router method calls (get/post/put/patch/delete)
        methods = []
        try:
            content = path.read_text(encoding="utf-8")
            for match in re.finditer(
                r"router\.(get|post|put|patch|delete)\(\s*['\"]([^'\"]+)['\"]",
                content,
            ):
                methods.append({"method": match.group(1).upper(), "path": match.group(2)})
        except OSError:
            pass
        results.append({"file": str(rel), "endpoints": methods})

    return json.dumps(results, indent=2)


@mcp.tool()
def flux_get_route_schema(route_file: str) -> str:
    """Get the Zod validation schemas defined in a route file.

    Args:
        route_file: Relative path to the route file (e.g. routes/ai.js)
    """
    try:
        path = _safe_resolve(route_file)
    except ValueError as e:
        return json.dumps({"error": str(e)})
    if not path.is_file():
        return json.dumps({"error": f"File not found: {route_file}"})

    content = path.read_text(encoding="utf-8")
    # Extract z.object blocks
    schemas: list[str] = []
    for match in re.finditer(
        r"(?:const|let)\s+(\w+)\s*=\s*z\.object\((\{[^}]+\})\)",
        content,
        re.DOTALL,
    ):
        schemas.append({"name": match.group(1), "definition": match.group(2).strip()})

    return json.dumps({"file": route_file, "schemas": schemas}, indent=2)


@mcp.tool()
def flux_list_components() -> str:
    """List all React component files under src/components/."""
    comps_dir = _project_path("src", "components")
    if not comps_dir.is_dir():
        return json.dumps({"error": "src/components/ directory not found"})

    results = []
    for path in sorted(comps_dir.rglob("*.tsx")):
        if path.name.endswith(".test.tsx"):
            continue
        rel = path.relative_to(PROJECT_ROOT)
        results.append(str(rel))

    return json.dumps(results, indent=2)


@mcp.tool()
def flux_get_store_slice(store_name: str) -> str:
    """Read a Zustand store slice by name (searches src/ for the store file).

    Args:
        store_name: Name of the store (e.g. 'project', 'auth', 'ui')
    """
    # Validate store_name doesn't contain path traversal
    if "/" in store_name or "\\" in store_name or ".." in store_name:
        return json.dumps({"error": "Invalid store name"})
    src_dir = _project_path("src")
    pattern = f"*{store_name}*"
    matches = list(src_dir.rglob(pattern))
    store_files = [
        m for m in matches
        if m.suffix in (".ts", ".tsx", ".js") and "store" in m.name.lower()
    ]

    if not store_files:
        return json.dumps({"error": f"No store file matching '{store_name}' found"})

    results = []
    for sf in store_files[:3]:
        results.append({
            "file": str(sf.relative_to(PROJECT_ROOT)),
            "content": sf.read_text(encoding="utf-8")[:5000],
        })

    return json.dumps(results, indent=2)


@mcp.tool()
def flux_list_ai_tasks() -> str:
    """List all AI task types and their model routing from lib/ai/config.js."""
    config_path = _project_path("lib", "ai", "config.js")
    if not config_path.is_file():
        return json.dumps({"error": "lib/ai/config.js not found"})

    content = config_path.read_text(encoding="utf-8")

    tasks = []
    for match in re.finditer(
        r"'([^']+)'\s*:\s*\{\s*model:\s*'(\w+)'\s*,\s*maxTokens:\s*(\d+)(?:\s*,\s*thinkingBudget:\s*(\d+))?\s*\}",
        content,
    ):
        task = {
            "taskType": match.group(1),
            "model": match.group(2),
            "maxTokens": int(match.group(3)),
        }
        if match.group(4):
            task["thinkingBudget"] = int(match.group(4))
        tasks.append(task)

    return json.dumps(tasks, indent=2)


@mcp.tool()
def flux_get_formation_tools() -> str:
    """List available formation tools (move_performers, create_formation, etc.)."""
    formations_dir = _project_path("routes", "formations")
    if not formations_dir.is_dir():
        return json.dumps({"error": "routes/formations/ directory not found"})

    tools = []
    for path in sorted(formations_dir.rglob("*.js")):
        content = path.read_text(encoding="utf-8")
        rel = str(path.relative_to(PROJECT_ROOT))
        endpoints = []
        for match in re.finditer(
            r"router\.(get|post|put|patch|delete)\(\s*['\"]([^'\"]+)['\"]",
            content,
        ):
            endpoints.append({"method": match.group(1).upper(), "path": match.group(2)})
        tools.append({"file": rel, "endpoints": endpoints})

    return json.dumps(tools, indent=2)


@mcp.tool()
def flux_get_test_coverage() -> str:
    """Run Vitest with coverage and return a summary."""
    try:
        result = subprocess.run(
            ["npx", "vitest", "run", "--coverage", "--reporter=json"],
            capture_output=True,
            text=True,
            timeout=120,
            cwd=str(PROJECT_ROOT),
        )
        # Try to parse JSON output from the coverage report
        output = result.stdout
        if result.returncode != 0:
            return json.dumps({
                "error": "Test run failed. Check project configuration.",
            })
        return json.dumps({"coverage_output": output[:5000]})
    except subprocess.TimeoutExpired:
        return json.dumps({"error": "Test coverage timed out after 120s"})
    except FileNotFoundError:
        return json.dumps({"error": "npx not found - ensure Node.js is installed"})


# ---------------------------------------------------------------------------
# Entry point
# ---------------------------------------------------------------------------

if __name__ == "__main__":
    mcp.run()
