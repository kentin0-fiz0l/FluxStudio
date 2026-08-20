# FluxStudio Automation

MCP server and agent tools that give Claude structured access to the FluxStudio codebase.

## Installation

```bash
cd automation
pip install -e ".[dev]"
```

Requires Python 3.12+.

## Running the MCP Server

```bash
python -m fluxstudio_agents.mcp_server
```

The server exposes tools via the [Model Context Protocol](https://modelcontextprotocol.io/). It auto-detects the FluxStudio project root, or you can set `FLUXSTUDIO_ROOT`:

```bash
FLUXSTUDIO_ROOT=/path/to/FluxStudio python -m fluxstudio_agents.mcp_server
```

## Available Tools

| Tool | Description |
|------|-------------|
| `flux_list_routes()` | List Express route files with HTTP endpoints |
| `flux_get_route_schema(route_file)` | Extract Zod validation schemas from a route file |
| `flux_list_components()` | List React component files under `src/components/` |
| `flux_get_store_slice(store_name)` | Read a Zustand store slice by name |
| `flux_list_ai_tasks()` | List AI task types and model routing from config |
| `flux_get_formation_tools()` | List formation route endpoints |
| `flux_get_test_coverage()` | Run Vitest with coverage and return summary |
| `flux_get_database_schema()` | Parse Prisma schema into table/column structure |
| `flux_get_component_props(name)` | Extract TypeScript prop interfaces for a component |
| `flux_search_code(pattern)` | Regex search across the codebase (bounded, paginated) |
| `flux_get_test_failures()` | Parse last Vitest run and return failing test details |

## Running Tests

```bash
cd automation
pytest -v
```

Tests mock the filesystem and subprocess calls for deterministic results.

## Developing New Tools

1. Add your tool function to `src/fluxstudio_agents/mcp_server.py`
2. Decorate with `@mcp.tool()`
3. Return JSON strings (use `json.dumps()`)
4. Use `_safe_resolve()` for any user-provided file paths (prevents path traversal)
5. Add tests in `tests/test_mcp_server.py`

Example:

```python
@mcp.tool()
def flux_my_tool(param: str) -> str:
    """Description shown to the LLM."""
    try:
        path = _safe_resolve(param)
    except ValueError as e:
        return json.dumps({"error": str(e)})
    # ... process and return JSON
    return json.dumps({"result": "..."})
```

## Project Structure

```
automation/
  pyproject.toml              # Package config (Python 3.12+)
  src/fluxstudio_agents/
    __init__.py
    mcp_server.py             # MCP server with all tools
    test_gen.py               # Test generation utilities
    scaffold.py               # Code scaffolding utilities
  tests/
    __init__.py
    test_mcp_server.py        # MCP server tool tests
```
