# AC-005 Task 8 — Sanctioned chore: `.gitignore`

## AC-005-48 — runs.jsonl is ignored
Given the repo-root `.gitignore`
When its content is inspected
Then it contains an entry matching `runs.jsonl` (pipeline gate telemetry stays local — live-verified: the file exists untracked at the repo root and no `.gitignore` entry covers it today)
And `git check-ignore runs.jsonl` exits 0 (live confirmation, e2e stage)
And the change is committed as its own `chore:` commit, separate from feature commits (Ask G)
