console.log(" ** starting sncb-insights");

import * as config from "./config";
import * as scheduler from "./scheduler";

await config.importConfigFiles();

if (Bun.argv.includes("--scheduler")) {
  await scheduler.startScheduler();
}

if (Bun.argv.includes("--wake")) {
  await scheduler.wake();
}
