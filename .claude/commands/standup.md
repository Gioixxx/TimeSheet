# /standup — Daily standup

## Input
`git log --since="yesterday" --author="$(git config user.name)"`, `git log --since="today"`, `@.claude/memory/sprint.md`, `git status`.

## Regole
- Traduci commit in linguaggio naturale
- Max 3 task realistici per oggi
- Includi modifiche non committate
- Solo lettura — non modificare

## Output
Ieri (commit/task), Oggi (task prioritari), Blocchi
