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

async function run(state: SchedulerState) {
  console.log(" * running");

  // Check if new tracked vehicle
  const tVehicles = await config.getTrackedVehicles();

  let now = new Date();
  let date = `${now.getDate().toString().padStart(2, "0")}${(now.getMonth() + 1)
    .toString()
    .padStart(2, "0")}${now.getFullYear().toString().slice(-2)}`;

  let yesterdayDate = new Date(now);
  yesterdayDate.setDate(now.getDate() - 1);
  let yesterday = `${yesterdayDate.getDate().toString().padStart(2, "0")}${(
    yesterdayDate.getMonth() + 1
  )
    .toString()
    .padStart(2, "0")}${yesterdayDate.getFullYear().toString().slice(-2)}`;

  for (const vehicle of tVehicles) {
    try {
      // if (!(await data.getVehicleInfo(vehicle))) {
      //   await fetchVehicle(vehicle, date);
      // }

      if (!(await data.hasVehicleStop(vehicle, parseInt(yesterday, 10)))) {
        await fetchVehicle(vehicle, yesterday);
      }

      // Check if we have fetch data for yesterday
    } catch (e) {
      console.error(e);
    }
  }
}

async function fetchVehicle(vehicle: string, date: string) {
  console.log(" * fetching vehicle", vehicle, "at", date);

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
