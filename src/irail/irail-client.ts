/**
 * IRailAPIClient: Pure, object-oriented IRail API client with injection-friendly design.
 *
 * All API and utility methods are instance methods. See jsdoc for interfaces and contracts.
 *
 * To create a variant (e.g., with extra logging or custom fetch), extend and override methods.
 */

import { RateLimiter } from "./rate-limiter";
import type {
  CompositionResponse,
  Connection,
  ConnectionsResponse,
  DateTime,
  ListConnections,
  StationPoint,
  VehicleResponse,
} from "./types";

/** Query params for IRail API requests */
export type Query = { [k: string]: any };

/**
 * Options for constructing the IRailAPIClient.
 * @property {number} requestsPerSec  Requests allowed per second (default: 1)
 * @property {string} apiBase         Base API URL (default: https://api.irail.be/v1)
 */
export interface IRailAPIClientOptions {
  requestsPerSec?: number;
  apiBase?: string;
}

export class IRailAPIClient {
  /** Rate limiter for request throttling (default: 1 req/sec) */
  protected limiter: RateLimiter;
  /** API hostname base */
  protected apiBase: string;

  constructor(opts: IRailAPIClientOptions = {}) {
    this.limiter = new RateLimiter(opts.requestsPerSec || 1, 1);
    this.apiBase = opts.apiBase || "https://api.irail.be/v1";
  }

  /**
   * Core HTTP request to IRail API. Can be overridden to provide custom logging or http client.
   *
   * @template T       Expected json output type
   * @param endpoint   API path (e.g. '/vehicle')
   * @param init       Fetch init (optionally with .query for search params)
   * @throws Error for HTTP/network/parse errors
   * @returns          Parsed response type
   */
  async requestApi<T>(
    endpoint: string,
    init?: RequestInit & { query?: Query }
  ): Promise<T> {
    const release = await this.limiter.acquire();
    init = init || {};
    init.query = init.query || {};
    init.query.format = "json";

    // Add query params
    for (const k in init.query) {
      if (!init.query[k]) continue;
      endpoint += endpoint.includes("?") ? "&" : "?";
      endpoint += k.toString();
      endpoint += "=" + encodeURIComponent(init.query[k]);
    }

    let resp: Response;
    try {
      resp = await fetch(this.apiBase + endpoint, {
        ...init,
        headers: {
          ...init.headers,
        },
      });
    } finally {
      release();
    }

    if (resp.ok) {
      return (await resp.json()) as T;
    } else {
      throw new Error(await resp.text());
    }
  }

  /** Fetch vehicle info by ID (API: /vehicle) */
  vehicleApi(params: { id: string; date?: string }): Promise<VehicleResponse> {
    return this.requestApi<VehicleResponse>("/vehicle", { query: params });
  }
  /** Fetch composition info (API: /composition) */
  compositionApi(params: {
    id: string;
    date: string;
  }): Promise<CompositionResponse> {
    return this.requestApi<CompositionResponse>("/composition", {
      query: params,
    });
  }
  /** Fetch train connections (API: /connections) */
  connectionsApi(params: {
    from: string;
    to: string;
    time?: string;
    date?: string;
  }): Promise<ConnectionsResponse> {
    return this.requestApi<ConnectionsResponse>("/connections", {
      query: params,
    });
  }

  /** Utility: parse unix/irail date as JS Date */
  static parseDate(date: string | number | Date): Date {
    if (date instanceof Date) return date;
    if (typeof date === "string") date = parseInt(date, 10) * 1000;
    return new Date(date);
  }

  /** Utility: format to hhmm (add h if display) */
  static toTime(date: string | number | Date, display = false): string {
    date = IRailAPIClient.parseDate(date);
    return (
      date.getHours().toString().padStart(2, "0") +
      (display ? "h" : "") +
      date.getMinutes().toString().padStart(2, "0")
    );
  }
  /** Utility: format ddmmyy as dd/mm/yyyy */
  static formatDisplayDate(date: string) {
    return date.slice(0, 2) + "/" + date.slice(2, 4) + "/20" + date.slice(4);
  }
  /** Utility: format hhmm as hh'h'mm */
  static formatDisplayTime(time: string) {
    return time.slice(0, 2) + "h" + time.slice(2);
  }
  /** Utility: Date to ddmmyy */
  static toDate(date: string | number | Date): string {
    date = IRailAPIClient.parseDate(date);
    return (
      date.getDate().toString().padStart(2, "0") +
      (date.getMonth() + 1).toString().padStart(2, "0") +
      date.getFullYear().toString().slice(-2)
    );
  }
  /** Utility: parse delay as minutes */
  static parseDelay(delay: string | number): number {
    if (typeof delay === "number") return delay;
    return parseInt(delay, 10) / 60;
  }
  /** Utility: format delay for UI */
  static formatDelay(delay: string | number): string {
    delay = IRailAPIClient.parseDelay(delay);
    if (delay < 0) return delay.toString(10);
    return "+" + delay.toString(10);
  }
  /** Utility: duration between two hhmm times */
  static duration(time1: string, time2: string, display = false): string {
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
  /** Utility: add minutes to hhmm */
  static addMinutesToTime(time: string | number, minutesToAdd: number): string {
    let hours =
      typeof time === "string"
        ? parseInt(time.slice(0, 2), 10)
        : Math.floor(time / 100);
    let minutes =
      typeof time === "string" ? parseInt(time.slice(2), 10) : time % 100;
    let totalMinutes = hours * 60 + minutes + minutesToAdd;
    if (totalMinutes < 0) totalMinutes += 24 * 60;
    hours = Math.floor((totalMinutes % (24 * 60)) / 60);
    minutes = totalMinutes % 60;
    return (
      hours.toString().padStart(2, "0") + minutes.toString().padStart(2, "0")
    );
  }
  /** Compose a DateTime {date, time} from date input */
  static toDateTime(date: string | number | Date): DateTime {
    date = IRailAPIClient.parseDate(date);
    return {
      date: IRailAPIClient.toDate(date),
      time: IRailAPIClient.toTime(date),
    };
  }
  /** Compare DateTimes for ordering (-1, 0, 1) */
  static compareDateTime(a: DateTime, b: DateTime): number {
    const parseDate = (d: string) =>
      parseInt("20" + d.slice(4, 6) + d.slice(2, 4) + d.slice(0, 2), 10);
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
  /** Compare two hhmm time strings for ordering */
  static compareTime(a: string, b: string): number {
    const toMinutes = (t: string) =>
      parseInt(t.slice(0, 2), 10) * 60 + parseInt(t.slice(2, 4), 10);
    const minA = toMinutes(a);
    const minB = toMinutes(b);
    if (minA < minB) return -1;
    if (minA > minB) return 1;
    return 0;
  }

  /**
   * Unpacks connections via connectionsApi, converts to arrays of Connection objects.
   * Returns: batches of connections for UI or business logic use.
   */
  async listConnections(params: ListConnections): Promise<Connection[][]> {
    // Optionally log or add debug hooks here (in subclass)
    const resp = await this.connectionsApi({
      from: params.from,
      to: params.to,
      date: params.date ?? IRailAPIClient.toDate(new Date()),
      time: params.time ?? IRailAPIClient.toTime(new Date()),
    });
    const connections: Connection[][] = [];
    for (const conn of resp.connection) {
      let journeys: Connection[] = [];
      let total = 2 + (conn?.vias?.via?.length || 0) * 2;
      for (let i = 0; i < total; i++) {
        let journey: any;
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
          time: IRailAPIClient.toTime(journey.time),
          date: IRailAPIClient.toDate(journey.time),
          delay: IRailAPIClient.parseDelay(journey.delay),
          platform: String(journey.platform),
          station: journey.station,
        };
        if (i % 2 === 0) {
          journeys.push({
            from: point,
            vehicle: journey.vehicle?.replace("BE.NMBS.", ""),
          } as Connection);
        } else {
          journeys[journeys.length - 1]!.to = point;
        }
      }
      connections.push(journeys);
    }
    return connections;
  }

  /** Async generator: all connections between two DateTime bounds */
  async *findAllConnectionsIterApi(params: {
    from: string;
    to: string;
    after: DateTime;
    before: DateTime;
  }): AsyncGenerator<Connection[], void, unknown> {
    let seen = new Set<string>();
    let current: DateTime = { ...params.after };
    while (IRailAPIClient.compareDateTime(current, params.before) === -1) {
      const connections = await this.listConnections({
        from: params.from,
        to: params.to,
        date: current.date,
        time: current.time,
      });
      if (connections.length === 0) return;
      for (const conn of connections) {
        let first = conn[0]!.from;
        let dt: DateTime = { date: first.date, time: first.time };
        if (IRailAPIClient.compareDateTime(params.before, dt) === -1) return;
        const key = conn.map((x) => x.vehicle).join("|");
        if (!seen.has(key)) {
          seen.add(key);
          yield conn;
        }
        current = dt;
      }
    }
  }

  /** Convenience: all connections as array between two DateTime bounds */
  async findAllConnectionsApi(params: {
    from: string;
    to: string;
    after: DateTime;
    before: DateTime;
  }): Promise<Connection[][]> {
    const result: Connection[][] = [];
    for await (const conn of this.findAllConnectionsIterApi(params)) {
      result.push(conn);
    }
    return result;
  }
}
