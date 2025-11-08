import type { Deps } from "@src/deps";
import { Elysia } from "elysia";
import { loggerMiddleware } from "./middlewares/logger";
import healthRouter from "./routers/health";
import trackedRouter from "./routers/tracked";
import stopsRouter from "./routers/stops";

export async function createApiServer(deps: Deps) {
  let app = new Elysia();

  app.onRequest(loggerMiddleware);

  app.get("/", () => "Belgian Rail Data API is running.");

  app.use(healthRouter(deps));

  app.use(trackedRouter(deps));
  app.use(stopsRouter(deps));

  return app;
}
