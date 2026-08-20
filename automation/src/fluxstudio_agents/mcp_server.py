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


@mcp.tool()
def flux_get_database_schema() -> str:
    """Parse the Prisma schema and return table/column structure."""
    schema_path = _project_path("packages", "database", "prisma", "schema.prisma")
    if not schema_path.is_file():
        return json.dumps({"error": "Prisma schema not found at packages/database/prisma/schema.prisma"})

    content = schema_path.read_text(encoding="utf-8")

    models: list[dict] = []
    current_model: dict | None = None

    for line in content.splitlines():
        stripped = line.strip()

        # Match model definition: model User {
        model_match = re.match(r"^model\s+(\w+)\s*\{", stripped)
        if model_match:
            current_model = {"name": model_match.group(1), "fields": []}
            continue

        # End of model block
        if stripped == "}" and current_model is not None:
            models.append(current_model)
            current_model = None
            continue

        # Parse field: fieldName  Type  @decorators
        if current_model is not None and stripped and not stripped.startswith("//") and not stripped.startswith("@@"):
            field_match = re.match(
                r"^(\w+)\s+(\w+[\[\]?]*)\s*(.*)?$",
                stripped,
            )
            if field_match:
                field = {
                    "name": field_match.group(1),
                    "type": field_match.group(2),
                }
                decorators = field_match.group(3) or ""
                if "@id" in decorators:
                    field["primaryKey"] = True
                if "@unique" in decorators:
                    field["unique"] = True
                if "?" in field["type"]:
                    field["optional"] = True
                map_match = re.search(r'@map\("([^"]+)"\)', decorators)
                if map_match:
                    field["column"] = map_match.group(1)
                current_model["fields"].append(field)

    return json.dumps({"models": models, "count": len(models)}, indent=2)


@mcp.tool()
def flux_get_component_props(component_name: str) -> str:
    """Extract TypeScript prop interfaces for a React component.

    Args:
        component_name: Name of the component (e.g. 'ProjectCard', 'Button')
    """
    if "/" in component_name or "\\" in component_name or ".." in component_name:
        return json.dumps({"error": "Invalid component name"})

    comps_dir = _project_path("src")
    if not comps_dir.is_dir():
        return json.dumps({"error": "src/ directory not found"})

    # Search for component files
    matches = []
    for path in comps_dir.rglob("*.tsx"):
        if path.name.endswith(".test.tsx"):
            continue
        if component_name.lower() in path.stem.lower():
            matches.append(path)

    if not matches:
        return json.dumps({"error": f"No component matching '{component_name}' found"})

    results = []
    for path in matches[:3]:
        content = path.read_text(encoding="utf-8")
        props: list[dict] = []

        # Match interface/type definitions that look like props
        for match in re.finditer(
            r"(?:interface|type)\s+(\w*Props\w*)\s*(?:=\s*)?{([^}]+)}",
            content,
            re.DOTALL,
        ):
            name = match.group(1)
            body = match.group(2).strip()
            fields = []
            for field_match in re.finditer(
                r"(\w+)(\??):\s*([^;\n]+)",
                body,
            ):
                fields.append({
                    "name": field_match.group(1),
                    "optional": field_match.group(2) == "?",
                    "type": field_match.group(3).strip().rstrip(";"),
                })
            props.append({"interface": name, "fields": fields})

        results.append({
            "file": str(path.relative_to(PROJECT_ROOT)),
            "props": props,
        })

    return json.dumps(results, indent=2)


@mcp.tool()
def flux_search_code(pattern: str, file_glob: str = "*.{ts,tsx,js,jsx}", max_results: int = 50) -> str:
    """Search across the codebase using a regex pattern.

    Args:
        pattern: Regex pattern to search for
        file_glob: File glob to filter (default: *.{ts,tsx,js,jsx})
        max_results: Maximum number of results to return (default: 50, max: 200)
    """
    max_results = min(max_results, 200)

    try:
        re.compile(pattern)
    except re.error as e:
        return json.dumps({"error": f"Invalid regex pattern: {e}"})

    src_dir = _project_path("src")
    if not src_dir.is_dir():
        return json.dumps({"error": "src/ directory not found"})

    # Expand glob patterns
    extensions = set()
    for ext in re.findall(r"\w+", file_glob):
        extensions.add(f".{ext}")

    results: list[dict] = []
    compiled = re.compile(pattern)

    for path in sorted(src_dir.rglob("*")):
        if not path.is_file():
            continue
        if path.suffix not in extensions:
            continue
        if "node_modules" in path.parts or ".git" in path.parts:
            continue

        try:
            content = path.read_text(encoding="utf-8")
        except (OSError, UnicodeDecodeError):
            continue

        for i, line in enumerate(content.splitlines(), 1):
            if compiled.search(line):
                results.append({
                    "file": str(path.relative_to(PROJECT_ROOT)),
                    "line": i,
                    "content": line.strip()[:200],
                })
                if len(results) >= max_results:
                    return json.dumps({
                        "results": results,
                        "truncated": True,
                        "total_shown": len(results),
                    }, indent=2)

    return json.dumps({
        "results": results,
        "truncated": False,
        "total_shown": len(results),
    }, indent=2)


@mcp.tool()
def flux_get_test_failures() -> str:
    """Parse the last Vitest run and return failing test details."""
    try:
        result = subprocess.run(
            ["npx", "vitest", "run", "--reporter=json"],
            capture_output=True,
            text=True,
            timeout=180,
            cwd=str(PROJECT_ROOT),
        )

        # Parse JSON output from Vitest
        try:
            data = json.loads(result.stdout)
        except json.JSONDecodeError:
            # If JSON parsing fails, extract info from stderr
            if result.returncode == 0:
                return json.dumps({"status": "all_passing", "failures": []})
            return json.dumps({
                "status": "parse_error",
                "returncode": result.returncode,
                "stderr_excerpt": result.stderr[:2000] if result.stderr else "",
            })

        failures = []
        for suite in data.get("testResults", []):
            for test in suite.get("assertionResults", []):
                if test.get("status") == "failed":
                    failures.append({
                        "file": suite.get("name", "unknown"),
                        "test": " > ".join(test.get("ancestorTitles", []) + [test.get("title", "")]),
                        "message": "\n".join(test.get("failureMessages", []))[:500],
                    })

        return json.dumps({
            "status": "failing" if failures else "all_passing",
            "failures": failures,
            "total_suites": data.get("numTotalTestSuites", 0),
            "total_tests": data.get("numTotalTests", 0),
            "passed": data.get("numPassedTests", 0),
            "failed": data.get("numFailedTests", 0),
        }, indent=2)

    except subprocess.TimeoutExpired:
        return json.dumps({"error": "Test run timed out after 180s"})
    except FileNotFoundError:
        return json.dumps({"error": "npx not found - ensure Node.js is installed"})


# ---------------------------------------------------------------------------
# Entry point
# ---------------------------------------------------------------------------

if __name__ == "__main__":
    mcp.run()
