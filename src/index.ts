console.log(" ** starting sncb-insights");

import * as config from "./config";
import * as scheduler from "./scheduler";

await config.importConfigFiles();

await scheduler.startScheduler();
