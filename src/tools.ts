import * as irail from "./irail";

export async function listConnections({
  from,
  to,
  date = irail.toDate(new Date()),
  time = irail.toTime(new Date()),
}: {
  from: string;
  to: string;
  date?: string;
  time?: string;
}) {
  console.log(` * Looking from: ${from}, to: ${to} (${date} ${time})`);

  const resp = await irail.connectionsApi({ from, to, date, time });

  for (const conn of resp.connection) {
    const vehicles: string[] = [];
    let out = "";
    function printJourney(
      conn: {
        vehicle: string;
        station: string;
        time: number;
        delay: number;
        isVias?: boolean;
        platform: number;
      },
      first = false
    ) {
      let vehicle = conn.vehicle.replace("BE.NMBS.", "");
      if (!vehicles.includes(vehicle)) vehicles.push(vehicle);
      if (!first) {
        out += conn.isVias ? " - " : " -> ";
      }
      const dep = conn.station;
      const depTime = irail.toTime(conn.time, true);
      const depDelay = irail.formatDelay(conn.delay);

      out += `${dep} (${conn.platform} ${depTime} ${depDelay})`;
    }
    printJourney(conn.departure, true);
    if (conn?.vias?.via) {
      for (const stop of conn.vias.via) {
        printJourney({
          vehicle: stop.arrival.vehicle,
          station: stop.station,
          delay: stop.arrival.delay,
          time: stop.arrival.time,
          platform: stop.arrival.platform,
        });
        printJourney({
          vehicle: stop.departure.vehicle,
          station: stop.station,
          delay: stop.departure.delay,
          time: stop.departure.time,
          isVias: true,
          platform: stop.arrival.platform,
        });
      }
    }
    printJourney(conn.arrival);

    console.log(` * ${vehicles.join(", ")} ${out}`);
    // }
  }
}
