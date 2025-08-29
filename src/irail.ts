/** IRAIL api Client */
import * as logs from "./logs";

type Query = { [k: string]: any };

type QRelease = () => void;
type QPromise = Promise<QRelease>;
type QPromiseR = (resolved: QRelease) => void;
type QRequestTime = { at: number | null };
export class RateLimiter {
  #queue: QPromiseR[] = [];
  #requestPer: number;
  #window: number;
  #requestTimes: QRequestTime[] = [];
  #active: number = 0;
  #timer: NodeJS.Timeout | undefined;

  constructor(requestPer: number, window: number) {
    this.#requestPer = requestPer;
    this.#window = window;
  }

  acquire(): QPromise {
    return new Promise((resolve) => {
      this.#queue.push(resolve);
      this.#processQueue();
    });
  }

  #processQueue() {
    const now = Date.now();
    const windowStart = now - this.#window * 1000;

    // Remove old request times outside the window
    this.#requestTimes = this.#requestTimes.filter(
      (time) => !time.at || time.at > windowStart
    );

    if (this.#requestTimes.length >= this.#requestPer) {
      if (this.#queue.length === 0) return;

      if (!this.#timer) {
        const minTime = Math.min(
          ...this.#requestTimes.map((r) =>
            r.at ? r.at - windowStart : this.#window * 1000
          )
        );
        this.#timer = setTimeout(() => {
          this.#timer = undefined;
          this.#processQueue();
        }, minTime);
      }

      return;
    }

    const next = this.#queue.shift();
    if (next) {
      const rqTime: QRequestTime = { at: null };
      this.#active++;
      this.#requestTimes.push(rqTime);
      const release = () => {
        this.#active--;
        rqTime.at = Date.now();
        this.#processQueue();
      };
      next(release);
    }
  }
}

const rateLimiter = new RateLimiter(1, 1); /** Allow 1 req/s */
const API_BASE = "https://api.irail.be/v1";

export let loggerEnabled = true; /** Exported variable to enable logging */

export async function requestApi<T>(
  endpoint: string,
  init?: RequestInit & { query?: Query }
) {
  const release = await rateLimiter.acquire();

  init = init || {};
  init.query = init.query || {};

  init.query.format = "json";

  for (const k in init.query) {
    if (!init.query[k]) continue;

    if (endpoint.includes("?")) {
      endpoint += "&";
    } else {
      endpoint += "?";
    }
    endpoint += k.toString();
    endpoint += "=" + encodeURIComponent(init.query[k]);
  }

  let data: Response;
  let start = Bun.nanoseconds();

  try {
    data = await fetch(API_BASE + endpoint, {
      ...init,
      headers: {
        ...init.headers,
      },
    });
  } catch (e) {
    release();
    throw e;
  }

  release();

  if (loggerEnabled) {
    let ms = (Bun.nanoseconds() - start) / 1_000_000;
    await logs.addIrailLog({ endpoint, duration: ms, statusCode: data.status });
  }

  if (data.ok) {
    return (await data.json()) as T;
  }

  throw new Error(await data.text());
}

export function vehicleApi(params: {
  id: string;
  date?: string;
}): Promise<VehicleResponse> {
  return requestApi("/vehicle", { query: params });
}

export function parseDate(date: string | number | Date): Date {
  if (date instanceof Date) return date;
  if (typeof date === "string") date = parseInt(date, 10) * 1000;

  return new Date(date);
}

/** Convert to hours+minutes as hours*100+minutes */
export function toTime(date: string | number | Date, display = false): string {
  date = parseDate(date);

  return (
    date.getHours().toString().padStart(2, "0") +
    (display ? "h" : "") +
    date.getMinutes().toString().padStart(2, "0")
  );
}

/** Format ddmmyy time to dd/mm/yyyy */
export function formatDisplayDate(date: string) {
  return date.slice(0, 2) + "/" + date.slice(2, 4) + "/20" + date.slice(4);
}

/** Format hhmm time to hh'h'mm */
export function formatDisplayTime(time: string) {
  return time.slice(0, 2) + "h" + time.slice(2);
}

export function toDate(date: string | number | Date): string {
  date = parseDate(date);

  return (
    date.getDate().toString().padStart(2, "0") +
    (date.getMonth() + 1).toString().padStart(2, "0") +
    date.getFullYear().toString().slice(-2)
  );
}

export function parseDelay(delay: string | number): number {
  if (typeof delay === "number") return delay;
  return parseInt(delay, 10) / 60;
}

export function formatDelay(delay: string | number): string {
  delay = parseDelay(delay);
  if (delay < 0) return delay.toString(10);
  return "+" + delay.toString(10);
}

export function duration(
  time1: string /** hhmm */,
  time2: string,
  display = false
): string {
  let minutes =
    parseInt(time2.slice(0, 2), 10) * 60 +
    parseInt(time2.slice(2), 10) -
    (parseInt(time1.slice(2), 10) + parseInt(time1.slice(0, 2), 10) * 60);

  let hours = Math.floor(Math.abs(minutes) / 60);
  minutes = Math.abs(minutes) % 60;

  return (
    hours.toString().padStart(2, "0") +
    (display ? "h" : "") +
    minutes.toString().padStart(2, "0")
  );
}

/** Add minutes to a time string (hhmm), returns hhmm */
export function addMinutesToTime(
  time: string | number,
  minutesToAdd: number
): string {
  let hours =
    typeof time === "string"
      ? parseInt(time.slice(0, 2), 10)
      : Math.floor(time / 100);
  let minutes =
    typeof time === "string" ? parseInt(time.slice(2), 10) : time % 100;

  let totalMinutes = hours * 60 + minutes + minutesToAdd;
  if (totalMinutes < 0) totalMinutes += 24 * 60; // handle negative wrap

  hours = Math.floor((totalMinutes % (24 * 60)) / 60);
  minutes = totalMinutes % 60;

  return (
    hours.toString().padStart(2, "0") + minutes.toString().padStart(2, "0")
  );
}

export async function compositionApi(params: {
  id: string;
  date: string;
}): Promise<CompositionResponse> {
  return requestApi("/composition", { query: params });
}

export type VehicleResponse = {
  version: string;
  timestamp: string;
  vehicle: string;
  vehicleinfo: {
    name: string;
    shortname: string;
    number: string;
    type: string;
    locationX: string;
    locationY: string;
    "@id": string;
  };
  stops: {
    number: string;
    stop: Array<{
      id: string;
      station: string;
      stationinfo: {
        "@id": string;
        id: string;
        name: string;
        locationX: string;
        locationY: string;
        standardname: string;
      };
      time: string;
      platform: string;
      platforminfo: {
        name: string;
        normal: string;
      };
      scheduledDepartureTime: string;
      scheduledArrivalTime: string;
      delay: string;
      canceled: string;
      departureDelay: string;
      departureCanceled: string;
      arrivalDelay: string;
      arrivalCanceled: string;
      left: string;
      arrived: string;
      isExtraStop: string;
      occupancy?: {
        "@id": string;
        name: string;
      };
      departureConnection?: string;
    }>;
  };
};

export type CompositionResponse = {
  version: string;
  timestamp: string;
  composition: {
    segments: {
      number: string;
      segment: Array<{
        id: string;
        origin: {
          locationX: string;
          locationY: string;
          id: string;
          name: string;
          "@id": string;
          standardname: string;
        };
        destination: {
          locationX: string;
          locationY: string;
          id: string;
          name: string;
          "@id": string;
          standardname: string;
        };
        composition: {
          source: string;
          units: {
            number: string;
            unit: Array<{
              id: string;
              materialType: {
                parent_type: string;
                sub_type: string;
                orientation: string;
              };
              hasToilets: string;
              hasTables: string;
              hasSecondClassOutlets: string;
              hasFirstClassOutlets: string;
              hasHeating: string;
              hasAirco: string;
              materialNumber: string;
              tractionType: string;
              canPassToNextUnit: string;
              standingPlacesSecondClass: string;
              standingPlacesFirstClass: string;
              seatsCoupeSecondClass: string;
              seatsCoupeFirstClass: string;
              seatsSecondClass: string;
              seatsFirstClass: string;
              lengthInMeter: string;
              hasSemiAutomaticInteriorDoors: string;
              hasLuggageSection: string;
              materialSubTypeName: string;
              tractionPosition: string;
              hasPrmSection: string;
              hasPriorityPlaces: string;
              hasBikeSection: string;
            }>;
          };
        };
      }>;
    };
  };
};
export type ConnectionsResponse = {
  version: string;
  timestamp: number;
  connection: Array<{
    id: number;
    departure: {
      delay: number;
      station: string;
      stationinfo: {
        id: string;
        "@id": string;
        locationX: number;
        locationY: number;
        standardname: string;
        name: string;
      };
      time: number;
      vehicle: string;
      vehicleinfo: {
        name: string;
        shortname: string;
        "@id": string;
      };
      platform: number;
      platforminfo: {
        name: string;
        normal: string;
      };
      left: number;
      canceled: number;
      direction: {
        name: string;
      };
      stops: {
        number: number;
        stop: Array<{
          id: number | string;
          station: string;
          stationinfo: {
            id: string;
            "@id": string;
            locationX: number;
            locationY: number;
            standardname: string;
            name: string;
          };
          time: number;
          delay: number;
          canceled: number;
          departureDelay: number;
          departureCanceled: number;
          scheduledDepartureTime: number;
          arrivalDelay: number;
          arrivalCanceled: number;
          isExtraStop: number;
          scheduledArrivalTime: number;
          departureConnection: string;
        }>;
      };
      alerts: {
        number: number;
        alert: Array<{
          id: number;
          header: string;
          lead: string;
          link: string;
          startTime: number;
          endTime: number;
        }>;
      };
      walking: number;
      departureConnection: string;
    };
    arrival: {
      delay: number;
      station: string;
      stationinfo: {
        id: string;
        "@id": string;
        locationX: number;
        locationY: number;
        standardname: string;
        name: string;
      };
      time: number;
      vehicle: string;
      vehicleinfo: {
        name: string;
        shortname: string;
        "@id": string;
      };
      platform: number;
      platforminfo: {
        name: string;
        normal: string;
      };
      arrived: number;
      canceled: number;
      walking: number;
      direction: {
        name: string;
      };
    };
    duration: number;
    alerts: {
      number: number;
      alert: Array<{
        id: number;
        header: string;
        lead: string;
        link: string;
        startTime: number;
        endTime: number;
      }>;
    };
    vias: {
      number: number;
      via: Array<{
        id: string | number;
        arrival: {
          time: number;
          platform: number;
          platforminfo: {
            name: string;
            normal: string;
          };
          arrived: number;
          delay: number;
          canceled: number;
          vehicle: string;
          walking: number;
          direction: {
            name: string;
          };
        };
        departure: {
          time: number;
          platform: number;
          platforminfo: {
            name: string;
            normal: string;
          };
          left: number;
          delay: number;
          canceled: number;
          departureConnection: string;
          vehicle: string;
          walking: number;
          alerts: {
            number: number;
            alert: Array<{
              id: number;
              header: string;
              lead: string;
              link: string;
              startTime: number;
              endTime: number;
            }>;
          };
          direction: {
            name: string;
          };
          stops: {
            number: number;
            stop: Array<{
              id: number | string;
              station: string;
              stationinfo: {
                id: string;
                "@id": string;
                locationX: number;
                locationY: number;
                standardname: string;
                name: string;
              };
              time: number;
              delay: number;
              canceled: number;
              departureDelay: number;
              departureCanceled: number;
              scheduledDepartureTime: number;
              arrivalDelay: number;
              arrivalCanceled: number;
              isExtraStop: number;
              scheduledArrivalTime: number;
              departureConnection: string;
            }>;
          };
        };
        timeBetween: number;
        station: string;
        stationinfo: {
          id: string;
          "@id": string;
          locationX: number;
          locationY: number;
          standardname: string;
          name: string;
        };
        vehicle: string;
        direction: {
          name: string;
        };
      }>;
    };
  }>;
};

export function connectionsApi(params: {
  from: string;
  to: string;
  time?: string;
  date?: string;
}): Promise<ConnectionsResponse> {
  return requestApi("/connections", { query: params });
}

export type ListConnections = {
  from: string;
  to: string;
  date?: string;
  time?: string;
};

export type StationPoint = {
  station: string;
  /** hhmm */ time: string;
  /* ddmmyy */ date: string;
  platform: string;
  delay: number;
};

export type Connection = {
  from: StationPoint;
  to: StationPoint;
  vehicle: string;
};

export async function listConnections({
  from,
  to,
  date = toDate(new Date()),
  time = toTime(new Date()),
}: ListConnections): Promise<Connection[][]> {
  console.log(
    ` * Looking from: ${from}, to: ${to} (${formatDisplayDate(
      date
    )} ${formatDisplayTime(time)})`
  );

  const resp = await connectionsApi({ from, to, date, time });

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
        time: toTime(journey.time),
        date: toDate(journey.time),
        delay: parseDelay(journey.delay),
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

type DateTime = {
  time: string;
  date: string;
};

export function toDateTime(date: string | number | Date): DateTime {
  date = parseDate(date);
  return {
    date: toDate(date),
    time: toTime(date),
  };
}

/**
 * Compare two DateTime objects.
 * Returns:
 *   -1 if a < b
 *    0 if a == b
 *    1 if a > b
 */
export function compareDateTime(a: DateTime, b: DateTime): number {
  // Convert ddmmyy to yyyymmdd for comparison
  const parseDate = (d: string) =>
    parseInt("20" + d.slice(4, 6) + d.slice(2, 4) + d.slice(0, 2), 10);
  // Convert hhmm to minutes since midnight
  const parseTime = (t: string) =>
    parseInt(t.slice(0, 2), 10) * 60 + parseInt(t.slice(2, 4), 10);

  const dateA = parseDate(a.date);
  const dateB = parseDate(b.date);

  if (dateA < dateB) return -1;
  if (dateA > dateB) return 1;

  const timeA = parseTime(a.time);
  const timeB = parseTime(b.time);

  if (timeA < timeB) return -1;
  if (timeA > timeB) return 1;
  return 0;
}

export async function findAllConnectionsApi({
  from,
  to,
  after,
  before,
}: {
  from: string;
  to: string;
  after: DateTime;
  before: DateTime;
}): Promise<Connection[][]> {
  let conns: Connection[][] = [];
  let current: DateTime = { ...after };

  while (compareDateTime(current, before) === -1) {
    // console.log(
    //   ` * connectionsApi ${from}->${to} ${formatDisplayDate(
    //     current.date
    //   )} ${formatDisplayTime(current.time)}`
    // );
    const connections = await listConnections({
      from,
      to,
      date: current.date,
      time: current.time,
    });

    if (connections.length === 0) return conns;

    for (const conn of connections) {
      let first = conn[0]!.from;
      let dt: DateTime = {
        date: first.date,
        time: first.time,
      };
      console.log("dt", dt);

      if (compareDateTime(before, dt) === -1) {
        return conns;
      }

      if (!conns.find((t) => t[0]?.vehicle === conn[0]?.vehicle))
        conns.push(conn);
      current = dt;
    }
  }

  return conns;
}
