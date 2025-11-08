/**
 * gtfs-service.ts
 * ----------------
 * Service contract and implementation for accessing IRail GTFS journey schedules.
 *
 * - Provides canonical stop/order/times for a public train number on a specific date
 * - Uses https://gtfs.irail.be/nmbs/gtfs/journeys/<date>/<train-number>.json
 * - Returns `null` if the train does not run (404 from IRail)
 * - All methods and types fully documented for future maintainability
 */

/** Detailed info per stop for the day's schedule (IRail GTFS schema) */
export interface GTFSStop {
  /** NMBS/IRail numeric station code as string */
  stationId: string;
  /** ISO-format UTC timestamp for scheduled departure */
  scheduledDeparture: string;
  /** ISO-format UTC timestamp for scheduled arrival */
  scheduledArrival: string;
  boarding: boolean;
  alighting: boolean;
}

/** Canonical schedule/manifest for a single train run on a day */
export interface GTFSRunSchedule {
  trainNumber: string;
  date: string; // YYYY-MM-DD
  stops: GTFSStop[];
}

/**
 * Contract: service to retrieve GTFS schedule info for trains
 */
export interface GTFSService {
  /**
   * Retrieve canonical GTFS run schedule, or null if not operating.
   * @param trainNumber Public-facing (string or number)
   * @param date YYYY-MM-DD or Date
   * @returns GTFSRunSchedule or null (no run on given date)
   */
  getSchedule(
    trainNumber: string | number,
    date: string | Date
  ): Promise<GTFSRunSchedule | null>;
}

/**
 * Concrete implementation for NMBS using IRail GTFS journey endpoint
 */
export class IRailGTFSService implements GTFSService {
  apiBase = "https://gtfs.irail.be/nmbs/gtfs/journeys";
  /**
   * @inheritdoc
   */
  async getSchedule(
    trainNumber: string | number,
    date: string | Date
  ): Promise<GTFSRunSchedule | null> {
    const dt =
      typeof date === "string"
        ? date.slice(0, 10)
        : date.toISOString().slice(0, 10);

    let tn =
      typeof trainNumber === "number" ? trainNumber.toString() : trainNumber;

    tn = tn.replace(/\D+/g, "");

    const url = `${this.apiBase}/${dt}/${tn}.json`;
    let resp: Response;
    try {
      resp = await fetch(url);
    } catch (e) {
      throw new Error(`Network error fetching GTFS for ${tn} on ${dt}: ${e}`);
    }
    if (resp.status === 404) return null;
    if (!resp.ok)
      throw new Error(`GTFS error ${resp.status}: ${resp.statusText}`);
    const body = (await resp.json()) as any;
    if (!body || !Array.isArray(body.stops) || body.stops.length === 0) {
      return null;
    }
    const stops: GTFSStop[] = body.stops.map((stop: any) => ({
      stationId: stop.id,
      scheduledArrival: stop.arrivalTime,
      scheduledDeparture: stop.departureTime,
      boarding: !!stop.boarding,
      alighting: !!stop.alighting,
    }));
    return {
      trainNumber: tn,
      date: dt,
      stops,
    };
  }
}
