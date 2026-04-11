# FluxStudio Dev Plugin

A Claude Code plugin for FluxStudio development. Provides skills for scaffolding, test generation, and debugging, plus specialized agents for drill design and API review.

## Skills

| Skill | Command | Description |
|-------|---------|-------------|
| Scaffold Route | `/scaffold-route` | Generate Express routes with auth, validation, error handling |
| Scaffold Component | `/scaffold-component` | Generate React/TypeScript components with Radix UI and Tailwind |
| Generate Tests | `/generate-tests` | Auto-generate Vitest, Jest, or Playwright tests |
| Formation Review | `/formation-review` | Review drill formation data and tool calls |
| Debug Collab | `/debug-collab` | Diagnose Yjs/WebSocket collaboration issues |

## Agents

| Agent | Description |
|-------|-------------|
| `drill-designer` | Marching arts formation specialist for drill design tasks |
| `api-reviewer` | Express API route review for security and convention compliance |

## Hooks

- **Post-write ESLint** - Runs ESLint in read-only mode (no auto-fix) after writing `.ts`, `.tsx`, `.js`, or `.jsx` files. Reports warnings but does not block.

## Installation

This plugin is located at `plugins/fluxstudio-dev/` within the FluxStudio project. Claude Code discovers it automatically when working in the FluxStudio directory.
