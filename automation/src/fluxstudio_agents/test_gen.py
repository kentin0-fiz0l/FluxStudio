"""Interactive test generation agent using Claude Code SDK.

Reads a target file, analyzes its patterns, generates tests, runs them, and
iterates until they pass.

Usage:
    python -m fluxstudio_agents.test_gen src/components/SomeComponent.tsx
"""

from __future__ import annotations

import argparse
import asyncio
import os
import sys

from claude_code_sdk import query, ClaudeCodeOptions, Message

SYSTEM_PROMPT = """\
You are a FluxStudio test-writing specialist.  Your workflow:

1. Read the target file and understand its public API / rendered output.
2. Identify untested branches and edge cases.
3. Generate a test file following the project conventions:
   - Frontend (src/**): Vitest + @testing-library/react in `*.test.tsx`
   - Backend (routes/**, lib/**): Jest in `tests/**/*.test.js`
4. Run the tests.  If any fail, read the error output, fix the test, and
   re-run.  Repeat until green or you have exhausted 5 iterations.
5. Print a coverage summary at the end.

Conventions:
- Use `vi.mock()` for module mocks in Vitest.
- Use `jest.mock()` for module mocks in Jest.
- Prefer `screen.getByRole` over `getByTestId`.
- Never import from `node:test`.
"""

ALLOWED_TOOLS = ["Read", "Write", "Edit", "Glob", "Grep", "Bash"]


async def generate_tests(filepath: str) -> list[Message]:
    """Run the test generation loop for *filepath*."""

    project_root = os.environ.get(
        "FLUXSTUDIO_ROOT",
        os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(__file__)))),
    )

    options = ClaudeCodeOptions(
        system_prompt=SYSTEM_PROMPT,
        allowed_tools=ALLOWED_TOOLS,
        cwd=project_root,
        max_turns=30,
    )

    prompt = (
        f"Generate comprehensive tests for the file at `{filepath}`.\n\n"
        f"Follow the workflow in the system prompt: read, analyze, write tests, "
        f"run them, and iterate until they pass."
    )

    messages: list[Message] = []
    async for msg in query(prompt=prompt, options=options):
        messages.append(msg)
        if msg.type == "text":
            print(msg.content, flush=True)

    return messages


def main() -> None:
    parser = argparse.ArgumentParser(description="Generate tests for a FluxStudio file")
    parser.add_argument("filepath", help="Path to the file to test (relative to project root)")
    args = parser.parse_args()

    asyncio.run(generate_tests(args.filepath))


if __name__ == "__main__":
    main()
