"""Tests for the FluxStudio MCP server tools.

Tests cover:
- _safe_resolve() — path traversal attack prevention
- flux_list_routes() — correct endpoint structure extraction
- flux_get_route_schema() — Zod schema extraction from route files
- flux_get_store_slice() — input validation and store file discovery
- flux_get_test_coverage() — subprocess error handling, stderr suppression
- flux_list_components() — component listing
"""

import json
import os
import subprocess
from pathlib import Path
from unittest.mock import patch, MagicMock

import pytest


# Set PROJECT_ROOT before import so the module uses our test root
@pytest.fixture(autouse=True)
def set_project_root(tmp_path, monkeypatch):
    """Set PROJECT_ROOT to a temporary directory for all tests."""
    monkeypatch.setenv("FLUXSTUDIO_ROOT", str(tmp_path))
    # Reload the module to pick up the new root
    import importlib
    import fluxstudio_agents.mcp_server as mod
    monkeypatch.setattr(mod, "PROJECT_ROOT", tmp_path)
    return tmp_path


@pytest.fixture
def mcp_server():
    """Import the MCP server module."""
    import fluxstudio_agents.mcp_server as mod
    return mod


# ─── _safe_resolve tests ───


class TestSafeResolve:
    def test_valid_relative_path(self, mcp_server, tmp_path):
        (tmp_path / "routes").mkdir()
        (tmp_path / "routes" / "auth.js").touch()
        result = mcp_server._safe_resolve("routes/auth.js")
        assert result == (tmp_path / "routes" / "auth.js").resolve()

    def test_path_traversal_with_dotdot(self, mcp_server):
        with pytest.raises(ValueError, match="Path escapes project root"):
            mcp_server._safe_resolve("../../etc/passwd")

    def test_path_traversal_with_absolute_path(self, mcp_server, tmp_path):
        # Absolute paths that resolve outside PROJECT_ROOT should fail
        with pytest.raises(ValueError, match="Path escapes project root"):
            mcp_server._safe_resolve("/etc/passwd")

    def test_path_traversal_with_symlink(self, mcp_server, tmp_path):
        """Symlink pointing outside project root should be rejected."""
        link = tmp_path / "evil_link"
        link.symlink_to("/tmp")
        with pytest.raises(ValueError, match="Path escapes project root"):
            mcp_server._safe_resolve("evil_link/something")

    def test_nested_traversal(self, mcp_server):
        with pytest.raises(ValueError, match="Path escapes project root"):
            mcp_server._safe_resolve("routes/../../../etc/shadow")

    def test_valid_nested_path(self, mcp_server, tmp_path):
        (tmp_path / "src" / "components").mkdir(parents=True)
        (tmp_path / "src" / "components" / "App.tsx").touch()
        result = mcp_server._safe_resolve("src/components/App.tsx")
        assert result.name == "App.tsx"


# ─── flux_list_routes tests ───


class TestFluxListRoutes:
    def test_returns_routes_with_endpoints(self, mcp_server, tmp_path):
        routes_dir = tmp_path / "routes"
        routes_dir.mkdir()
        (routes_dir / "auth.js").write_text(
            "const router = require('express').Router();\n"
            "router.get('/login', handler);\n"
            "router.post('/signup', handler);\n"
            "module.exports = router;\n"
        )

        result = json.loads(mcp_server.flux_list_routes())
        assert len(result) == 1
        assert result[0]["file"] == "routes/auth.js"
        assert len(result[0]["endpoints"]) == 2
        assert {"method": "GET", "path": "/login"} in result[0]["endpoints"]
        assert {"method": "POST", "path": "/signup"} in result[0]["endpoints"]

    def test_returns_error_when_no_routes_dir(self, mcp_server, tmp_path):
        result = json.loads(mcp_server.flux_list_routes())
        assert "error" in result

    def test_handles_multiple_route_files(self, mcp_server, tmp_path):
        routes_dir = tmp_path / "routes"
        routes_dir.mkdir()
        (routes_dir / "auth.js").write_text("router.get('/me', h);")
        (routes_dir / "projects.js").write_text(
            "router.get('/', h);\nrouter.post('/', h);\nrouter.delete('/:id', h);"
        )

        result = json.loads(mcp_server.flux_list_routes())
        assert len(result) == 2

        # Find projects file
        projects = next(r for r in result if "projects" in r["file"])
        assert len(projects["endpoints"]) == 3

    def test_handles_empty_route_file(self, mcp_server, tmp_path):
        routes_dir = tmp_path / "routes"
        routes_dir.mkdir()
        (routes_dir / "empty.js").write_text("// no routes here")

        result = json.loads(mcp_server.flux_list_routes())
        assert len(result) == 1
        assert result[0]["endpoints"] == []


# ─── flux_get_route_schema tests ───


class TestFluxGetRouteSchema:
    def test_extracts_zod_schemas(self, mcp_server, tmp_path):
        routes_dir = tmp_path / "routes"
        routes_dir.mkdir()
        (routes_dir / "payments.js").write_text(
            "const { z } = require('zod');\n"
            "const createCheckoutSchema = z.object({ priceId: z.string() });\n"
            "router.post('/checkout', validate(createCheckoutSchema), handler);\n"
        )

        result = json.loads(mcp_server.flux_get_route_schema("routes/payments.js"))
        assert result["file"] == "routes/payments.js"
        assert len(result["schemas"]) == 1
        assert result["schemas"][0]["name"] == "createCheckoutSchema"

    def test_returns_error_for_nonexistent_file(self, mcp_server, tmp_path):
        result = json.loads(mcp_server.flux_get_route_schema("routes/missing.js"))
        assert "error" in result
        assert "not found" in result["error"].lower()

    def test_rejects_path_traversal(self, mcp_server):
        result = json.loads(mcp_server.flux_get_route_schema("../../etc/passwd"))
        assert "error" in result
        assert "escapes" in result["error"].lower()

    def test_no_schemas_in_file(self, mcp_server, tmp_path):
        routes_dir = tmp_path / "routes"
        routes_dir.mkdir()
        (routes_dir / "simple.js").write_text("router.get('/', handler);")

        result = json.loads(mcp_server.flux_get_route_schema("routes/simple.js"))
        assert result["schemas"] == []


# ─── flux_get_store_slice tests ───


class TestFluxGetStoreSlice:
    def test_finds_store_by_name(self, mcp_server, tmp_path):
        store_dir = tmp_path / "src" / "store" / "slices"
        store_dir.mkdir(parents=True)
        (store_dir / "projectStore.ts").write_text(
            "import { create } from 'zustand';\n"
            "export const useProjectStore = create(() => ({ projects: [] }));\n"
        )

        result = json.loads(mcp_server.flux_get_store_slice("project"))
        assert len(result) >= 1
        assert "projectStore" in result[0]["file"]
        assert "zustand" in result[0]["content"]

    def test_rejects_path_traversal_in_name(self, mcp_server):
        result = json.loads(mcp_server.flux_get_store_slice("../../../etc"))
        assert "error" in result
        assert "Invalid store name" in result["error"]

    def test_rejects_slash_in_name(self, mcp_server):
        result = json.loads(mcp_server.flux_get_store_slice("some/path"))
        assert "error" in result

    def test_returns_error_for_unknown_store(self, mcp_server, tmp_path):
        (tmp_path / "src").mkdir(parents=True)
        result = json.loads(mcp_server.flux_get_store_slice("nonexistent"))
        assert "error" in result
        assert "No store file" in result["error"]


# ─── flux_get_test_coverage tests ───


class TestFluxGetTestCoverage:
    @patch("subprocess.run")
    def test_returns_coverage_on_success(self, mock_run, mcp_server):
        mock_run.return_value = MagicMock(
            returncode=0,
            stdout='{"coverage": {"lines": 75.2}}',
            stderr="",
        )

        result = json.loads(mcp_server.flux_get_test_coverage())
        assert "coverage_output" in result
        assert "75.2" in result["coverage_output"]

    @patch("subprocess.run")
    def test_returns_error_on_test_failure(self, mock_run, mcp_server):
        mock_run.return_value = MagicMock(
            returncode=1,
            stdout="",
            stderr="FAIL src/tests/broken.test.ts",
        )

        result = json.loads(mcp_server.flux_get_test_coverage())
        assert "error" in result

    @patch("subprocess.run")
    def test_handles_timeout(self, mock_run, mcp_server):
        mock_run.side_effect = subprocess.TimeoutExpired(cmd="npx", timeout=120)

        result = json.loads(mcp_server.flux_get_test_coverage())
        assert "error" in result
        assert "timed out" in result["error"].lower()

    @patch("subprocess.run")
    def test_handles_missing_npx(self, mock_run, mcp_server):
        mock_run.side_effect = FileNotFoundError()

        result = json.loads(mcp_server.flux_get_test_coverage())
        assert "error" in result
        assert "npx not found" in result["error"]


# ─── flux_list_components tests ───


class TestFluxListComponents:
    def test_lists_components_excluding_tests(self, mcp_server, tmp_path):
        comp_dir = tmp_path / "src" / "components" / "ui"
        comp_dir.mkdir(parents=True)
        (comp_dir / "Button.tsx").touch()
        (comp_dir / "Button.test.tsx").touch()
        (comp_dir / "Input.tsx").touch()

        result = json.loads(mcp_server.flux_list_components())
        assert len(result) == 2
        assert any("Button.tsx" in p for p in result)
        assert any("Input.tsx" in p for p in result)
        assert not any("test" in p for p in result)

    def test_returns_error_when_no_components_dir(self, mcp_server, tmp_path):
        result = json.loads(mcp_server.flux_list_components())
        assert "error" in result
