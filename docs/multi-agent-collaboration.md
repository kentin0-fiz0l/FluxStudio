# Multi-Agent Collaboration Guidelines  
This document explains how to coordinate multiple AI assistants (e.g. Claude Code and ChatGPT/Codex) contributing simultaneously to the FluxStudio repository. It builds on the existing agent system guide and future enhancements around parallel execution.  

## Why Multi-Agent Collaboration  
Some tasks benefit from contributions from different agent roles. For example, the Architecture and Design agents can work together on a UI‑heavy feature, while the Development and Testing agents coordinate on feature implementation and automated tests. This doc outlines how to organize that work to avoid conflicts and ensure smooth merges.  

## Branching Strategy  
- **One task per branch** – Each agent should work on its own branch named using the pattern `feat/{agent-name}/{task}` or `fix/{agent-name}/{bug}`. This separation avoids merge conflicts and makes it clear who is responsible for each change.  
- **Avoid overlapping files** – Assign non‑overlapping areas of the codebase. If two agents must modify the same file, coordinate ahead of time in an issue or pull request discussion.  
- **Regular merges** – Agents should create pull requests early and merge frequently once reviews pass. This reduces divergence between branches.  

## Communication Workflow  
- **Create an issue for coordination** – Before beginning work, open an issue describing the problem or feature. List which agents will be involved and their individual tasks.  
- **Use pull request descriptions** – When opening a pull request, include a summary of what was done and mention any overlapping components. Tag other agents who need to review or contribute.  
- **Discuss in comments** – Use PR comments to clarify decisions and resolve conflicts. Keep all agent discussion in GitHub for transparency.  

## Testing and CI  
- **Local tests per branch** – Each agent should run unit tests and linting locally before pushing.  
- **Shared CI pipeline** – Our GitHub Actions workflow will run type checks, tests and builds on each pull request. Agents should fix any failures before requesting review.  
- **Review from a Testing agent** – If a dedicated Testing agent exists, they should review and expand test coverage for changes proposed by other agents.  

## Merging and Conflict Resolution  
- **Resolve conflicts early** – If two branches conflict, agents should communicate to resolve them.  
- **Use squash commits when appropriate** – Squashing keeps the history clean, but preserve commit history when multiple agents contributed significant work.  
- **Delete feature branches after merge** – Cleaning up old branches prevents confusion.  

## Future Considerations  
Our agent system guide mentions plans for better multi‑agent coordination and parallel execution. As these features are developed, this document will be updated to reflect new workflows and tools.  
