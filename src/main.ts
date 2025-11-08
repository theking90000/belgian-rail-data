/**
 * Main application entrypoint for CLI modes: --wake, --scheduler, --server.
 * - Sets up config, logging, DB, DI for all services/repositories.
 * - Parses flags and dispatches the selected mode.
 * - All logic is invoked through orchestration or API layer—never direct DB/repo/service calls!
 */

import { bootstrapDependencies } from "./deps";

// Optionally: use a CLI library; below is minimal
function parseArgs() {
  const args = process.argv.slice(2);
  return {
    scheduler: args.includes("--scheduler"),
    wake: args.includes("--wake"),
    server: args.includes("--server"),
    // Add more flags as needed (db path, config, logging, etc)
  };
}

async function bootstrap() {
  // 1. Load config, set up DB connection, logging as appropriate
  // (Config loading omitted for brevity, add as needed)
  const deps = await bootstrapDependencies({
    cache: { dir: "./cache", ttlMs: 24 * 60 * 60 * 1000 },
    database: { type: "sqlite", filePath: "brd.db" },
  });

  const { migrationManager, wakeService, schedulerService } = deps;

  await migrationManager.migrate();

  // 4. Parse CLI args and dispatch mode
  const flags = parseArgs();
  if (flags.wake) {
    console.log("[Wake] Starting batch job for tracked trains…");
    await wakeService.wake();
    process.exit(0);
  }
  if (flags.scheduler) {
    console.log("[Scheduler] Starting persistent scheduler… (Ctrl+C to stop)");
    await schedulerService.runScheduler();
    process.exit(0);
  }
  if (flags.server) {
    // TODO: In next phase, spin up REST API (see API task)
    console.log("[API] Server mode not yet implemented");
    process.exit(1);
  }
  console.log(
    "No valid mode flag specified. Use --wake, --scheduler, or --server."
  );
  process.exit(1);
}

bootstrap().catch((err) => {
  // Central error handler and logging
  console.error("Fatal error in bootstrap:", err);
  process.exit(1);
});
