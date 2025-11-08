import type { Deps } from "@src/deps";
import Elysia, { t } from "elysia";
import AuthService from "../middlewares/auth";

export default function trackedRouter(deps: Deps) {
  const { trackedTrainRepo } = deps;

  return new Elysia({ prefix: "/tracked" }).use(AuthService(deps)).get(
    "/",
    () => {
      return trackedTrainRepo.list();
    },
    {
      permission: "tracked:read",
      response: t.Array(t.Object({})),
    }
  );
}
