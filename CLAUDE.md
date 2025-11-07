# CLAUDE.md

This file guides Claude Code and future contributors working in the `ai-remake` branch of this repository.

## Project Modernization Roadmap

### 1. Data Model & Storage Layer
- Use the normalized schema defined in `migrations/001.sql`.
- Build a type-safe TypeScript ORM/data-access layer for all major entities (TrainRun, TrainStop, Station, etc).
- Database initialization and migrations are managed programmatically for predictable evolution.

### 2. Application Modes
- **Daemon/Scheduler mode (`--scheduler`)**: Runs as a persistent process, polling and processing tasks on tracked trains.
- **Wake mode (`--wake`)**: Used for cron-based, evented, or one-shot execution to process pending jobs and exit promptly.

### 3. API-Driven Architecture
- All application functionality is exposed via REST/HTTP API, running with `--server` flag on a configurable port.
- API endpoints require authentication (e.g., JWT or API key, centrally pluggable).
- No core logic is accessible outside the API: all internal control and data access is done through endpoints.
- Full API includes:
  - Data/query endpoints for all main entities
  - Job triggers and configuration management
  - Health/status and observability endpoints

### 4. Architecture Patterns
- **Service Layer**: Scheduling, Fetching, Data Processing, API, Persistence all kept separate.
- **Dependency Injection**: For testability and pluggable logic.
- **Fetcher and Scheduler**: Decoupled, with jobs/tasks managed independently from HTTP layer.
- **Persistence**: Strictly implemented with strong typing and foreign keys matching the latest normalized schema.

### 5. Configuration, Observability, and Operations
- Centralized config via file/env (DB, API, keys, etc).
- Structured logging, metrics, and error collection suitable for production daemonization.
- Scripts for DB migration/initialization and development cycles.

### 6. Quality and Documentation
- Extensive automated testing for all business logic and HTTP endpoints.
- Migration docs (`database.md`) must always reflect current schema.
- This CLAUDE.md is the top-level architectural orientation for new contributors.

## Getting Started
- Checkout the `ai-remake` branch.
- Apply the migration in `migrations/001.sql` to set up your database.
- Use API endpoints for all configuration and job control.
- Run with the desired flag:
  - `--scheduler` (persistent)
  - `--wake` (batch/cron)
  - `--server` (HTTP API)

For details on the schema, see `database.md` and migration files.

---

## Contribution Practice
- All core services must be decoupled/testable and conform to latest schema and API contract.
- Discuss and document any major changes to architecture or endpoint contract in PRs or this file.
