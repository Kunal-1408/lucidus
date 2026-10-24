// PreToolUse hook: refuses a git command that skips the hooks (--no-verify, or
// commit's -n), so every commit runs the pre-commit check. Exit 2 blocks the
// tool call and shows the message to the agent.
let input = '';
for await (const chunk of process.stdin) input += chunk;
const command = JSON.parse(input).tool_input?.command ?? '';

// Quoted text (a commit message) is dropped first, so "-n" inside it is fine.
const skipsHooks = command
  .replace(/"[^"]*"|'[^']*'/g, '')
  .split(/&&|\|\||[;|\n]/)
  .some(
    (part) =>
      /\bgit\b/.test(part) &&
      (/--no-verify\b/.test(part) ||
        /\bcommit\b.*\s-[a-zA-Z]*n[a-zA-Z]*\b/.test(part)),
  );

if (skipsHooks) {
  console.error(
    'Commit with the hooks on: the pre-commit hook runs `npm run check`. Fix what it reports, then commit again.',
  );
  process.exit(2);
}
