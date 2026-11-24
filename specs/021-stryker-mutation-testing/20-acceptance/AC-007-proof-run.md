# AC-007: Proof run with recorded score

## AC-007-01 — Scoped run executed and recorded
Given Tasks 1–5 are done
When `npm run mutation -- --only src/domain/pricing.ts` runs
Then `30-report.md` records the exit code, the covered-code score, the score including NoCoverage, and the mutated file list, labelled *scoped*

## AC-007-02 — No score chasing
Given the proof run reports surviving mutants
When the spec diff is inspected
Then no file under `src/` or `api/` is changed
And survivors are listed as follow-ups in `30-report.md`
