import * as irail from "./irail";

type ListConnections = {
  from: string;
  to: string;
  date?: string;
  time?: string;
};

type StationPoint = {
  station: string;
  /** hhmm */ time: string;
  /* ddmmyy */ date: string;
  platform: string;
  delay: number;
};

type Connection = {
  from: StationPoint;
  to: StationPoint;
  vehicle: string;
};

export async function listConnections({
  from,
  to,
  date = irail.toDate(new Date()),
  time = irail.toTime(new Date()),
}: ListConnections): Promise<Connection[][]> {
  console.log(
    ` * Looking from: ${from}, to: ${to} (${irail.formatDisplayDate(
      date
    )} ${irail.formatDisplayTime(time)})`
  );

  const resp = await irail.connectionsApi({ from, to, date, time });

  const connections: Connection[][] = [];

  for (const conn of resp.connection) {
    let journeys: Connection[] = [];

    let total = 2 + (conn?.vias?.via?.length || 0) * 2;
    for (let i = 0; i < total; i++) {
      let journey: {
        time: number;
        delay: number;
        station: string;
        platform: number;
        vehicle: string;
      };
      if (i === 0) {
        journey = conn.departure;
      } else if (i === total - 1) {
        journey = conn.arrival;
      } else {
        let via = conn.vias.via[Math.floor((i - 1) / 2)]!;
        let j = i % 2 === 0 ? via.departure : via.arrival;
        journey = { ...j, station: via.station };
      }

      let point: StationPoint = {
        time: irail.toTime(journey.time),
        date: irail.toDate(journey.time),
        delay: irail.parseDelay(journey.delay),
        platform: String(journey.platform),
        station: journey.station,
      };

      if (i % 2 === 0) {
        journeys.push({
          from: point,
          vehicle: journey.vehicle.replace("BE.NMBS.", ""),
        } as Connection);
      } else {
        journeys[journeys.length - 1]!.to = point;
      }
    }

    connections.push(journeys);
  }

  return connections;
}

export async function listConnectionsPrint(args: ListConnections) {
  for (const conn of await listConnections(args)) {
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
      const w = (s: StationPoint) =>
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
