/** IRAIL api Client */

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
