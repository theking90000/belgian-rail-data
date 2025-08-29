import * as config from "./config";
import * as irail from "./irail";
import * as data from "./data";

interface SchedulerState {}

export async function startScheduler(schedule = 3600 /** 1hour */) {
  const schedulerState: SchedulerState = {};

  console.log(" * starting scheduler");

  setInterval(async () => {
    await run(schedulerState);
  }, schedule * 1000);
}

export async function wake() {
  const schedulerState: SchedulerState = {};

  console.log(" * waking up scheduler");

  await run(schedulerState);
}

function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

function compareDate(date1: Date, date2: Date): number {
  // Compare only the date part (year, month, day)
  const d1 = new Date(date1.getFullYear(), date1.getMonth(), date1.getDate());
  const d2 = new Date(date2.getFullYear(), date2.getMonth(), date2.getDate());
  if (d1 < d2) return -1;
  if (d1 > d2) return 1;
  return 0;
}

async function run(state: SchedulerState) {
  console.log(" * running");

  // Check if new tracked vehicle
  const tVehicles = await config.getTrackedVehicles();

  let now = new Date();
  let nowTime = parseInt(irail.toTime(now), 10);

  for (const vehicle of tVehicles) {
    const info = await data.getVehicleInfo(vehicle);

    /** Allow fetching data today, but only after 2hours after the scheduled end ride of train (this allows for delays up to 2h) */
    let canFetchTodayAfter = info
      ? parseInt(irail.addMinutesToTime(info?.end.at, 2 * 60), 10)
      : null;

    let currentDay = addDays(now, -2);

    while (
      compareDate(currentDay, now) === -1 ||
      (compareDate(currentDay, now) === 0 &&
        canFetchTodayAfter &&
        nowTime > canFetchTodayAfter)
    ) {
      // console.log(
      //   ` * Check ${vehicle} at ${irail.formatDisplayDate(
      //     irail.toDate(currentDay)
      //   )}`
      // );
      try {
        if (
          !(await data.hasVehicleStop(
            vehicle,
            parseInt(irail.toDate(currentDay), 10)
          ))
        ) {
          await fetchVehicle(vehicle, irail.toDate(currentDay));
        }
      } catch (e) {
        console.error(e);
      }

      currentDay = addDays(currentDay, 1);
    }
  }
}

async function fetchVehicle(vehicle: string, date: string) {
  console.log(
    " * fetching vehicle",
    vehicle,
    "at",
    irail.formatDisplayDate(date)
  );

  const info = await irail.vehicleApi({ id: vehicle, date });

  if (!info.stops.stop[0]) {
    console.log(" *** Cannot find start station for vehicle", vehicle);
    return;
  }
  const firstStop = info.stops.stop[0];
  const lastStop = info.stops.stop[info.stops.stop.length - 1]!;

  await data.setVehicleInfo(vehicle, {
    stopCount: parseInt(info.stops.number, 10),
    start: {
      station: firstStop.station,
      at: parseInt(irail.toTime(firstStop.scheduledDepartureTime), 10),
    },
    end: {
      station: lastStop.station,
      at: parseInt(irail.toTime(lastStop.scheduledDepartureTime), 10),
    },
  });

  for (let i = 0; i < info.stops.stop.length; i++) {
    const stop = info.stops.stop[i]!;

    await data.setVehicleStop({
      stopIndex: i,
      date: parseInt(date, 10),
      vehicleId: vehicle,

      arrivalDelay: parseInt(stop.arrivalDelay, 10),
      arrivalCanceled: stop.arrivalCanceled === "1",
      delay: parseInt(stop.delay, 10),
      platform: stop.platform,

      departureCanceled: stop.arrivalCanceled === "1",
      departureDelay: parseInt(stop.departureDelay),
      occupancy: stop.occupancy?.name || "unknown",

      scheduledArrivalTime: parseInt(
        irail.toTime(stop.scheduledArrivalTime),
        10
      ),
      scheduledDepartureTime: parseInt(
        irail.toTime(stop.scheduledDepartureTime),
        10
      ),
      stationName: stop.station,
    });
  }

  // Fetch composition
  console.log(" * fetching vehicle compositon", vehicle, "at", date);

  const composition = await irail.compositionApi({ id: vehicle, date });

  const comp = composition.composition.segments.segment[0]!.composition;

  const units = comp.units.unit.filter((x) => x.tractionType !== "HLE");
  const material = units.map((m) => m.materialType.parent_type);
  const modeMaterial = material
    .sort(
      (a, b) =>
        material.filter((v) => v === a).length -
        material.filter((v) => v === b).length
    )
    .pop();

  await data.setVehicleComposition({
    date: parseInt(date, 10),
    vehicleId: vehicle,
    units: units.length,
    material: modeMaterial || "unknown",
    detailed: JSON.stringify(composition.composition.segments),
  });
}
