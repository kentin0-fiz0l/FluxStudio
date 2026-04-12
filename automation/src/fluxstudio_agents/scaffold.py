"""Feature scaffolding agent using Claude Code SDK.

Generates a complete feature skeleton (Express route, Zod schema, React
component, service layer, and Vitest test) from a plain-English description.

Usage:
    python -m fluxstudio_agents.scaffold "user profile settings page"
"""

from __future__ import annotations

import argparse
import asyncio
import os
import re

from claude_code_sdk import query, ClaudeCodeOptions, Message

# ---------------------------------------------------------------------------
# FluxStudio conventions injected as the system prompt
# ---------------------------------------------------------------------------

SYSTEM_PROMPT = """\
You are a senior FluxStudio developer.  When asked to scaffold a feature you
MUST produce ALL of the following files in a single pass:

1. **Express route** in `routes/<feature>.js`
   - CommonJS (`require`), Express Router
   - Use `authenticateToken` from `../lib/auth/middleware`
   - Use `zodValidate` from `../middleware/zodValidate`
   - Use `asyncHandler` from `../middleware/errorHandler`
   - Use `createLogger` from `../lib/logger`

2. **Zod validation schema** co-located at the top of the route file.

3. **React component** in `src/components/<Feature>.tsx`
   - TypeScript, React 18 functional component
   - Tailwind CSS + Radix UI primitives for styling
   - Framer Motion for animations where appropriate

4. **Service layer** in `src/services/<feature>Service.ts`
   - Axios-based API calls against `/api/<feature>`

5. **Vitest test** in `src/components/<Feature>.test.tsx`
   - Use `vitest`, `@testing-library/react`

Follow the model routing conventions in lib/ai/config.js:
- Lightweight/search tasks -> Haiku
- Interactive/chat tasks -> Sonnet
- Complex reasoning tasks -> Opus with extended thinking

Never commit secrets or API keys.  Use environment variables.
"""

ALLOWED_TOOLS = ["Read", "Write", "Edit", "Glob", "Grep", "Bash"]


async def scaffold(description: str) -> list[Message]:
    """Run the scaffolding agent and return its messages."""

    project_root = os.environ.get(
        "FLUXSTUDIO_ROOT",
        os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(__file__)))),
    )

    options = ClaudeCodeOptions(
        system_prompt=SYSTEM_PROMPT,
        allowed_tools=ALLOWED_TOOLS,
        cwd=project_root,
        max_turns=20,
    )

    # Sanitize user input
    description = description[:500].strip()
    description = re.sub(r'[^\x20-\x7E\n]', '', description)

    prompt = (
        f"Scaffold a new feature for FluxStudio based on the user request below.\n\n"
        f"<user-request>\n{description}\n</user-request>\n\n"
        f"Create all five files (route, schema, component, service, test). "
        f"Follow every convention in the system prompt exactly."
    )

    messages: list[Message] = []
    async for msg in query(prompt=prompt, options=options):
        messages.append(msg)
        if msg.type == "text":
            print(msg.content, flush=True)

    return messages


def main() -> None:
    parser = argparse.ArgumentParser(description="Scaffold a FluxStudio feature")
    parser.add_argument("description", help="Plain-English feature description")
    args = parser.parse_args()

    asyncio.run(scaffold(args.description))


if __name__ == "__main__":
    main()
