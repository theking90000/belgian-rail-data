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

    const info = await irail.vehicleApi({ id: vehicle });

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
  }
}
