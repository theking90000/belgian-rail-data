import type { Deps } from "@src/deps";
import Elysia, { status, t } from "elysia";
import AuthService from "../middlewares/auth";

export default function stopsRouter(deps: Deps) {
  const { trainStopRepo, stationRepo } = deps;

  return new Elysia({ prefix: "/stops" }).use(AuthService(deps)).get(
    "/:id/delays",
    async ({ params, query }) => {
      let stringOutput = new Map<number, string>();
      const filterAtStop = await Promise.all(
        (query.filterAtStop || "")
          .split(",")
          .map((x) => x.trim())
          .filter((x) => !!x)
          .map(async (id) => {
            if (isNaN(Number(id))) {
              const station = await stationRepo.findByName(id);
              if (!station)
                throw new Error(`Station with name ${id} not found`);
              stringOutput.set(station.id, station.name);
              return station.id;
            }
            return Number(id);
          })
      );

      const tracked = await trainStopRepo?.getStopsForTrainNumber(
        params.id,
        query.after ? new Date(query.after) : undefined,
        query.before ? new Date(query.before) : undefined,
        filterAtStop
      );
      const stopMap = new Map<
        number | string,
        { date: string; delay: number }[]
      >();
      for (const stop of tracked || []) {
        const id = stringOutput.get(stop.stationId) ?? stop.stationId;

        if (!stopMap.has(id)) {
          stopMap.set(id, []);
        }
        let scheduled =
          query.type === "arrival"
            ? stop.scheduledArrival
            : stop.scheduledDeparture;
        let actual =
          query.type === "arrival" ? stop.actualArrival : stop.actualDeparture;
        stopMap.get(id)?.push({
          date: stop.scheduledArrival,
          delay: !actual
            ? 0
            : (new Date(actual).getTime() - new Date(scheduled).getTime()) /
              1000,
        });
      }

      return Object.fromEntries(stopMap);
    },
    {
      permission: "stops:delays",
      params: t.Object({
        id: t.String(),
      }),
      query: t.Object({
        after: t.Optional(t.String()),
        before: t.Optional(t.String()),
        filterAtStop: t.Optional(t.String()),
        type: t.Enum(
          { arrival: "arrival", departure: "departure" },
          { default: "departure" }
        ),
      }),
    }
  );
}
