## Checks

`npm run check` at the repo root runs every format, lint, build and test check for backend/ and frontend/; the pre-commit hook and CI run the same, so a commit lands only once the check is green: keep work in progress uncommitted until then, and merge other branches in after that first green commit. In a fresh clone, `npm run setup` installs all three packages first.

## Tools

Read files with Read, search with Grep and Glob, change files with Edit and Write; these need no approval and keep a run flowing. Keep Bash and PowerShell for git, npm and running scripts. This holds in every mode, auto mode included, and for subagents. Settings deny `cat`, `head`, `tail`, `sed`, `grep`, `rg`, `find` and `ls` in Bash; on a denial, use the matching tool. Filter git output with git's own flags (`-n`, `--oneline`, `--grep`, `-S`, `-- <path>`, `--stat`, `--name-only`).

## Agent skills

### Issue tracker

Issues live as local markdown files under `.scratch/<feature>/`. See `docs/agents/issue-tracker.md`.

### Triage labels

Default five-role vocabulary (`needs-triage`, `needs-info`, `ready-for-agent`, `ready-for-human`, `wontfix`), recorded as a `Status:` line in each issue file. See `docs/agents/triage-labels.md`.

### Domain docs

Single-context: one `GLOSSARY.md` and `docs/adr/` at the repo root. See `docs/agents/domain.md`.
