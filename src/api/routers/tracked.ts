import type { Deps } from "@src/deps";
import Elysia, { status, t } from "elysia";
import AuthService from "../middlewares/auth";

export default function trackedRouter(deps: Deps) {
  const { trackedTrainRepo } = deps;

  return new Elysia({ prefix: "/tracked" })
    .use(AuthService(deps))
    .get(
      "/",
      async () => {
        const tracked = await trackedTrainRepo.getTrackedTrains();
        return tracked.map((t) => ({
          since: t.trackedSince,
          trainNumber: t.trainNumber,
        }));
      },
      {
        permission: "tracked:read",
        response: t.Array(
          t.Object({
            since: t.String(),
            trainNumber: t.String(),
          })
        ),
      }
    )
    .post(
      "/",
      async ({ body }) => {
        await trackedTrainRepo.addTrackedTrain(body.trainNumber);
        return status(201);
      },
      {
        permission: "tracked:write",
        body: t.Object({
          trainNumber: t.String(),
        }),
      }
    )
    .delete(
      "/:trainNumber",
      async ({ params }) => {
        const trainId = params.trainNumber.replace(/\D+/g, "");
        await trackedTrainRepo.removeTrackedTrain(trainId);
        return status(204);
      },
      {
        permission: "tracked:write",
      }
    );
}
