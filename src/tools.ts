import * as irail from "./irail";

export async function listConnectionsPrint(args: irail.ListConnections) {
  for (const conn of await irail.listConnections(args)) {
    const vehicles = conn.map((c) => c.vehicle);
    const duration = irail.duration(
      conn[0]!.from.time,
      conn[conn.length - 1]!.to.time,
      true
    );

    console.write(` * ${vehicles.join(", ")} ${duration}`);
    console.write("\n   * ");
    for (let i = 0; i < conn.length; i++) {
      let journey = conn[i]!;
      const w = (s: irail.StationPoint) =>
        console.write(
          `${s.station} (${s.platform} ${irail.formatDisplayTime(
            s.time
          )} ${irail.formatDelay(s.delay)})`
        );
      w(journey.from);
      console.write(" -> ");
      w(journey.to);
      if (i + 1 < conn.length) console.write("\n   * ");
    }

    console.write("\n");
  }
}
