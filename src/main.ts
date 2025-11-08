/**
 * Main application entrypoint for CLI modes: --wake, --scheduler, --server.
 * - Sets up config, logging, DB, DI for all services/repositories.
 * - Parses flags and dispatches the selected mode.
 * - All logic is invoked through orchestration or API layer—never direct DB/repo/service calls!
 */

import { createApiServer } from "./api";
import { bootstrapDependencies } from "./deps";

// Optionally: use a CLI library; below is minimal
function parseArgs() {
  const args = process.argv.slice(2);

  const getFlag = <T = string>(
    flag: string,
    parseValue: (val: string | undefined) => T | undefined = (v) =>
      v as T | undefined
  ) => {
    const idx = args.findIndex((arg) => arg === flag);
    if (idx !== -1 && args[idx + 1]) {
      return parseValue(args[idx + 1]);
    }
    return undefined;
  };

  return {
    scheduler: args.includes("--scheduler"),
    wake: args.includes("--wake"),
    server: args.includes("--server"),
    createKey: args.includes("--create-key"),
    permissions: getFlag<string>("--permissions", (v) => v),
    port: getFlag<number>("--port", (v) => {
      if (!v) return undefined;
      const n = Number(v);
      return Number.isFinite(n) ? n : undefined;
    }),

    dbPath: (() => {
      const idx = args.findIndex((arg) => arg === "--db");
      if (idx !== -1 && args[idx + 1]) {
        return args[idx + 1];
      }
      return undefined;
    })(),
    // Add more flags as needed (db path, config, logging, etc)
  };
}

async function bootstrap() {
  const flags = parseArgs();

  // 1. Load config, set up DB connection, logging as appropriate
  // (Config loading omitted for brevity, add as needed)
  const deps = await bootstrapDependencies({
    cache: { dir: "./cache", ttlMs: 24 * 60 * 60 * 1000 },
    database: { type: "sqlite", filePath: flags.dbPath || "brd.db" },
  });

  const { migrationManager, wakeService, schedulerService } = deps;

  await migrationManager.migrate();

  // 4. Parse CLI args and dispatch mode

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
    console.log("[Server] Starting API server… (Ctrl+C to stop)");
    const app = await createApiServer(deps);

    app.listen(flags.port || 3000, () => {
      console.log(`[Server] Listening on port ${flags.port || 3000}`);
    });
    return;
  }

  if (flags.createKey) {
    const permissions = flags.permissions?.split(",") || [
      "tracked:read",
      "tracked:write",
    ];

    const random = crypto.getRandomValues(new Uint8Array(32));
    const apiKey = Buffer.from(random).toString("hex");

    const [createdKey] = await deps.apiKeyRepository.create([
      {
        descriptor: "CLI generated key",
        key: apiKey,
      },
    ]);

    await deps.keyPermissionRepo.addPermissionsToKey(
      createdKey!.id,
      permissions.map((p) => ({ name: p }))
    );

    console.log("Created API key:", "brd_" + apiKey);
    process.exit(0);
  }

  console.log(
    "No valid mode flag specified. Use --wake, --scheduler, --create-key, or --server."
  );
  process.exit(1);
}

bootstrap().catch((err) => {
  // Central error handler and logging
  console.error("Fatal error in bootstrap:", err);
  process.exit(1);
});
