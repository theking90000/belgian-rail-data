console.log(" ** starting sncb-insights");

import * as config from "./config";
import * as scheduler from "./scheduler";
import * as tools from "./tools";

await config.importConfigFiles();

if (Bun.argv.includes("--scheduler")) {
  await scheduler.startScheduler();
}

if (Bun.argv.includes("--wake")) {
  await scheduler.wake();
}

if (Bun.argv.includes("--server")) {
  await import("./server");
}

function getArg<R extends boolean | undefined>(
  arg: string,
  { def, required }: { def?: string; required?: R } = {}
): R extends true ? string : string | undefined {
  let index = Bun.argv.indexOf(arg);
  if (index !== -1 && index + 1 < Bun.argv.length) {
    return Bun.argv[index + 1] as any;
  }
  if (def) return def as any;
  if (!required) return undefined as any;

  console.log(" **", arg, "requires values");
  process.exit(1);
}

if (Bun.argv.includes("--from") && Bun.argv.includes("--to")) {
  const from = getArg("--from", { required: true });
  const to = getArg("--to", { required: true });
  const date = getArg("--date");
  const time = getArg("--time");

  await tools.listConnectionsPrint({ from, to, date, time });
}
