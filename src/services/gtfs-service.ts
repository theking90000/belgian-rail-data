/**
 * gtfs-service.ts
 * ----------------
 * Provides GTFSService contract and IRailGTFSService implementation.
 *
 * The GTFSService resolves scheduled runs and stops for public train numbers and dates
 * using the IRail GTFS journey API (https://gtfs.irail.be/nmbs/gtfs/journeys/<date>/<number>.json).
 *
 * If train does not run that day the endpoint returns 404. If found, returns array of stops.
 */

export interface GTFSRunSchedule {
  trainNumber: string;
  date: string; // YYYY-MM-DD
  stops: GTFSStop[];
}

export interface GTFSStop {
  stationId: string; // IRail numeric station code as string
  scheduledDeparture: string; // ISO date-time string, UTC
  scheduledArrival: string; // ISO date-time string, UTC
  boarding: boolean;
  alighting: boolean;
}

/**
 * Service contract for GTFS journey lookup
 */
export interface GTFSService {
  /**
   * Fetch scheduled run + stops for train on a date.
   * @param trainNumber Public train number, string or number
   * @param date YYYY-MM-DD or Date
   * @returns Schedule, or null/train not running
   */
  getSchedule(
    trainNumber: string | number,
    date: string | Date
  ): Promise<GTFSRunSchedule | null>;
}

/**
 * IRailGTFSService: Loads GTFS schedule from IRail journey API
 */
export class IRailGTFSService implements GTFSService {
  apiBase = "https://gtfs.irail.be/nmbs/gtfs/journeys";

  /**
   * Formats a date as YYYY-MM-DD string.
   * @param date Date or string
   * @returns YYYY-MM-DD
   */
  private formatDate(date: string | Date): string {
    return typeof date === "string"
      ? date.slice(0, 10)
      : date.toISOString().slice(0, 10);
  }

  /**
   * @inheritdoc
   */
  async getSchedule(
    trainNumber: string | number,
    date: string | Date
  ): Promise<GTFSRunSchedule | null> {
    // Format date
    const dt = this.formatDate(date);
    const tn = String(trainNumber);

    const url = `${this.apiBase}/${dt}/${tn}.json`;

    let resp: Response;
    try {
      resp = await fetch(url);
    } catch (e: any) {
      throw new Error(`Network error fetching GTFS for ${tn} on ${dt}: ${e}`);
    }

    if (resp.status === 404) return null;

    if (!resp.ok)
      throw new Error(`GTFS error ${resp.status}: ${resp.statusText}`);

    const body: any = await resp.json();

    // Validate/normalize stops
    const stops: GTFSStop[] = (body.stops || []).map((stop: any) => ({
      stationId: stop.id,
      scheduledDeparture: new Date(stop.departureTime),
      scheduledArrival: new Date(stop.arrivalTime),
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
