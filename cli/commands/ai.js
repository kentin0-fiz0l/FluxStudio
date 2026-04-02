import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { spawn } from 'child_process';
import { setJsonMode, success, info } from '../lib/output.js';
import { handleError } from '../lib/errors.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const AUTOMATION_DIR = resolve(__dirname, '../../automation');

/**
 * Spawn a Python agent script and stream its output.
 */
function runPythonAgent(scriptModule, args, cwd) {
  return new Promise((resolve, reject) => {
    const proc = spawn('python', ['-m', scriptModule, ...args], {
      cwd,
      stdio: 'inherit',
      env: { ...process.env, FLUXSTUDIO_ROOT: resolve(__dirname, '../..') },
    });

    proc.on('close', (code) => {
      if (code === 0) resolve();
      else reject(new Error(`Agent exited with code ${code}`));
    });

    proc.on('error', (err) => reject(err));
  });
}

export function registerAiCommands(program) {
  const ai = program
    .command('ai')
    .description('AI-powered development tools');

  ai
    .command('scaffold <description>')
    .description('Scaffold a new feature from a plain-English description')
    .action(async (description) => {
      const globalOpts = program.opts();
      setJsonMode(globalOpts.json);

      try {
        info('Scaffolding feature...');
        await runPythonAgent(
          'fluxstudio_agents.scaffold',
          [description],
          AUTOMATION_DIR,
        );
        success('Feature scaffolded successfully');
      } catch (err) {
        handleError(err);
      }
    });

  ai
    .command('test <filepath>')
    .description('Generate tests for a file interactively')
    .action(async (filepath) => {
      const globalOpts = program.opts();
      setJsonMode(globalOpts.json);

      try {
        info(`Generating tests for ${filepath}...`);
        await runPythonAgent(
          'fluxstudio_agents.test_gen',
          [filepath],
          AUTOMATION_DIR,
        );
        success('Test generation complete');
      } catch (err) {
        handleError(err);
      }
    });

  ai
    .command('review <filepath>')
    .description('Run an AI code review on a file')
    .action(async (filepath) => {
      const globalOpts = program.opts();
      setJsonMode(globalOpts.json);

      try {
        info(`Reviewing ${filepath}...`);
        // Use claude-code-sdk directly via a one-shot scaffold call
        // with a review-oriented prompt
        const proc = spawn(
          'python',
          [
            '-c',
            `
import asyncio, os, sys
from claude_code_sdk import query, ClaudeCodeOptions

async def main():
    root = os.environ["FLUXSTUDIO_ROOT"]
    opts = ClaudeCodeOptions(
        system_prompt="You are a senior code reviewer for FluxStudio. Review the file for bugs, security issues, performance problems, and style violations. Be concise.",
        allowed_tools=["Read", "Glob", "Grep"],
        cwd=root,
        max_turns=10,
    )
    async for msg in query(prompt=f"Review the file at {sys.argv[1]} and provide actionable feedback.", options=opts):
        if msg.type == "text":
            print(msg.content, flush=True)

asyncio.run(main())
`,
            filepath,
          ],
          {
            cwd: AUTOMATION_DIR,
            stdio: 'inherit',
            env: { ...process.env, FLUXSTUDIO_ROOT: resolve(__dirname, '../..') },
          },
        );

        await new Promise((res, rej) => {
          proc.on('close', (code) => (code === 0 ? res() : rej(new Error(`Review exited with code ${code}`))));
          proc.on('error', rej);
        });

        success('Review complete');
      } catch (err) {
        handleError(err);
      }
    });
}
