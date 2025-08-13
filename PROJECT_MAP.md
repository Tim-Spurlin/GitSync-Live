# Project Map

## Overview
- **frontend/**: React 19 + Vite application located in `src/`.
- **backend/**: Express service exposing Git synchronization endpoints.

## Data Flow
1. Frontend calls backend REST endpoints under `/api`.
2. Backend reads repository list from `REPO_LIST_FILE` and systemd logs to provide status.
3. WebSocket (`socket.io`) streams service status updates from backend to frontend.

## Contracts
- Repository, activity, and service status shapes are defined in backend responses.
