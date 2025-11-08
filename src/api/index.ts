import type { Deps } from "@src/deps";
import { Elysia } from "elysia";
import { loggerMiddleware } from "./middlewares/logger";
import healthRouter from "./routers/health";

export async function createApiServer(deps: Deps) {
  const app = new Elysia();

  app.onRequest(loggerMiddleware);

  app.get("/", () => "Belgian Rail Data API is running.");

  app.use(healthRouter(deps));

  return app;
}
