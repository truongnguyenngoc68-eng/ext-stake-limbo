# Repository rules

## Limbo build and local installation

- After any change to `limbo-tool/`, run the Limbo tests and `node scripts/release-limbo.mjs --no-bump` (equivalent to `npm run build:limbo`). Do not leave a successful Limbo build only in the repository.
- The default Chrome installation to update is `C:\Users\truon\Downloads\limbo-tool-v1.3.0\limbo-tool`. The folder name is historical; it must contain the latest built version.
- Every successful Limbo build/release must first back up the existing installation to a unique sibling folder, then copy the build into that installation and verify every copied file. The release script performs these steps automatically. Never skip the backup or update a directory whose manifest name differs from `Limbo Restart`.
- The user has authorized this recurring local backup/update workflow. Do not ask again for approval. Preserve Chrome profile data, storage, Telegram settings and logs; only copy extension code files. Do not automatically reload Chrome or running game tabs, which can interrupt active sessions. Tell the user when an extension reload is needed.
- `npm run release:limbo` additionally increments the patch version. `npm run build:limbo` keeps the version. An explicit positional target or `LIMBO_INSTALL_DIR` can override the installation directory for another machine or tests.
- If tests, backup, copying or verification fail, report the build as failed. Do not claim that Chrome received the update. If the default path is unavailable on another machine, request a correct installation path instead of silently skipping deployment.

## Limbo Auto statistics preflight

- Before every native Auto start (including restarted cycles and reload resume), confirm that the live statistics profit/volume fields are visible and readable. If closed, open the exact `button-liveStats` toggle once and wait for data. Never press reset or toggle an already active statistics panel off.
- Missing, ambiguous or unreadable statistics must block the start and produce a diagnostic timeout. Keep this preflight covered by regression tests when modifying Auto preparation.
- While native Auto is running, the tool must only observe it and must never click the native Stop button. After the native button remains in the exact idle `Start Autobet` state for two seconds, treat the command as completed, reset only the stake amount, and click Start. Do not rewrite TP/SL, target, limit, or win/loss modes between cycles.
- Every programmatic native Auto click must pass through one start-only guard which re-reads the unique visible button immediately before the click and requires both the `Start Autobet` label and `data-autobet-status="start"`. Never add a direct native button click outside that guard.
