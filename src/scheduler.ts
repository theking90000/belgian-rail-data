import * as config from "./config";
import * as irail from "./irail";
import * as data from "./data";

interface SchedulerState {}

export async function startScheduler() {
  const schedulerState: SchedulerState = {};

  console.log(" * starting scheduler");

  await wake(schedulerState);
}

async function wake(state: SchedulerState) {
  // Check if new tracked vehicle
  const tVehicles = await config.getTrackedVehicles();

  for (const vehicle of tVehicles) {
    if (await data.getVehicleInfo(vehicle)) continue;

    let now = new Date();
    let date = `${now.getDate().toString().padStart(2, "0")}${(
      now.getMonth() + 1
    )
      .toString()
      .padStart(2, "0")}${now.getFullYear().toString().slice(-2)}`;

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
        at: irail.toTime(firstStop.scheduledDepartureTime),
      },
      end: {
        station: lastStop.station,
        at: irail.toTime(lastStop.scheduledDepartureTime),
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

        scheduledArrivalTime: irail.toTime(stop.scheduledArrivalTime),
        scheduledDepartureTime: irail.toTime(stop.scheduledDepartureTime),
        stationName: stop.station,
      });
    }
  }
}
