# AC-008: Organize recordings into `<name>_<date>` folders

## AC-008-17 — Recording folder is named `<name>_<date>`
Given a recording whose reservation has meeting date "2026-10-28" and name "Maria Garcia"
When the recording is organized into folders
Then the session directory is renamed to `Maria_Garcia_2026-10-28`

## AC-008-18 — Name is sanitised for the filesystem
Given a recording whose reservation name is `Ana/López\ <script>`
And whose meeting date is "2026-10-28"
When the recording is organized into folders
Then the session directory is renamed to `Ana_López_script_2026-10-28`
And the folder name contains no `/`, `\`, `<`, `>` or space characters

## AC-008-19 — Recording with no name falls back to `unattributed_<date>`
Given a recording whose attribution has no customer name but has meeting date "2026-10-28"
When the recording is organized into folders
Then the session directory is renamed to `unattributed_2026-10-28`
And no fabricated name is used

## AC-008-22 — Colliding date + name appends a numeric suffix
Given a recording whose reservation has meeting date "2026-10-28" and name "Maria Garcia"
And a sibling directory `Maria_Garcia_2026-10-28` already exists
When the recording is organized into folders
Then the session directory is renamed to `Maria_Garcia_2026-10-28-2`

## AC-008-23 — A re-scan does not rename an organized directory again
Given a directory already renamed to `Maria_Garcia_2026-10-28-2` with a `.rexi-organized` marker inside
When the recording pipeline scans the recordings root again
Then the directory keeps the name `Maria_Garcia_2026-10-28-2`
And no new `-N` suffix is appended

## AC-008-24 — Fully unattributed recording falls back to the session date
Given a recording with no Stripe reservation at all
And a recording session date of "2026-10-28" (parsed from the MP4 filename)
When the recording is organized into folders
Then the session directory is renamed to `unattributed_2026-10-28`
