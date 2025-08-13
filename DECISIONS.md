# Decisions

## 2025-02-14 Parameterize backend configuration
- Introduced `FRONTEND_ORIGIN`, `REPO_LIST_FILE`, and `PORT` environment variables to avoid hard‑coding paths and ports.
- Added lightweight query validators to enforce contract integrity without external dependencies.
- Removed unused `child_process` and `fs` dependencies to reduce supply chain risk.
