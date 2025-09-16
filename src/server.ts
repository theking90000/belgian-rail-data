import * as config from "./config";
import * as logs from "./logs";
import * as data from "./data";
import * as irail from "./irail";

const port = Bun.env.PORT ? Number(Bun.env.PORT) : 3000;
const hostname = Bun.env.HOST ?? "0.0.0.0";

console.log(" * starting server on ", `${hostname}:${port}`);

Bun.serve({
  port,
  hostname,

  routes: m({
    "/tracked": async (req) => {
      const tracked = await config.getTrackedVehicles();
      const infos = await Promise.all(
        tracked.map((t) => data.getVehicleInfo(t))
      );
      return Response.json(infos);
    },
    "/stops": async (req) => {
      const search = new URL(req.url).searchParams;
      const id = search.get("id");
      let date = search.get("date");
      if (!id) return new Response("Missing id params", { status: 400 });

      if (!date) date = irail.toDate(new Date());

      const stops = await data.getVehicleStops(id, parseInt(date, 10));

      return Response.json(stops);
    },
    "/station": async (req) => {
      const search = new URL(req.url).searchParams;
      let station = search.get("station");
      let date = search.get("date");

      if (!station)
        return new Response("Missing station params", { status: 400 });

      if (!date) date = irail.toDate(new Date());

      const stops = await data.getStationStops(station, date).get();

      return Response.json(stops);
    },
    "/:id": async (req) => {
      const search = new URL(req.url).searchParams;
      const before = search.get("before") || irail.toDate(new Date());
      let beforeDate = data.toJSDate(before);
      beforeDate.setDate(beforeDate.getDate() - 10);
      const after = search.get("after") || irail.toDate(beforeDate);

      let id = req.params.id as string;
      if (id.endsWith(".csv")) {
        id = id.slice(0, -4);
        // Check if id is vehicle
        let isComp = id.endsWith("-comp");
        id = id.slice(0, isComp ? -5 : undefined);
        const info = await data.getVehicleInfo(id);
        if (info) {
          return (
            isComp
              ? data.getVehicleComposition(id, after, before)
              : data.getVehicleStopsDated(id, after, before)
          )
            .csv(false)
            .toResponse();
        }
        // Check station
        return data.getStationStops(id, after, before).csv().toResponse();
      }
      return new Response("", { headers: {} });
    },
    "/routes.csv": async (req) => {
      const search = new URL(req.url).searchParams;
      const before = search.get("before") || irail.toDate(new Date());
      let beforeDate = data.toJSDate(before);
      beforeDate.setDate(beforeDate.getDate() - 10);
      const after = search.get("after") || irail.toDate(beforeDate);

      let from = search.get("from");
      let to = search.get("to");
      if (!from || !to)
        return new Response("Missing from or to query parameters", {
          status: 400,
        });

      return data
        .getConnectionDated(from, to, after, before)
        .csv(false)
        .toResponse();
    },
  }),
});

console.log(" * server up and running");

type RRequest = Request & { params: any };

type HTTPMethodHandler = (
  request: RRequest,
  env?: any,
  ctx?: any
) => Promise<Response> | Response;
type HTTPMethod =
  | {
      GET?: HTTPMethodHandler;
      POST?: HTTPMethodHandler;
      OPTIONS?: HTTPMethodHandler;
      HEAD?: HTTPMethodHandler;
      DELETE?: HTTPMethodHandler;
      PATCH?: HTTPMethodHandler;
      PUT?: HTTPMethodHandler;
    }
  | HTTPMethodHandler;
type BunRoutes = {
  [x: string]: HTTPMethod;
};

export function m(...args: BunRoutes[]): BunRoutes {
  const excu =
    (func: HTTPMethodHandler) =>
    async (request: RRequest, env: any, ctx: any) => {
      let start = Bun.nanoseconds();
      let id = crypto.randomUUID();

      let url = new URL(request.url);
      let key = url.searchParams.get("key");
      if (!key) return new Response("Unauthorized", { status: 401 });
      let apikey = await config.getApiKey(key || "");
      if (!apikey) return new Response("Unauthorized", { status: 401 });

      let response: Response;
      try {
        response = await func(request, env, ctx);
      } catch (e) {
        console.error(e);
        await logs.addApiErrorLog({
          endpoint: url.pathname,
          errorMessage: String(e),
          requestId: id,
        });
        response = new Response("Server Error", { status: 500 });
      }

      let ms = (Bun.nanoseconds() - start) / 1_000_000;
      await logs.addApiLog({
        endpoint: url.pathname,
        duration: ms,
        key: apikey,
        statusCode: response.status,
        id,
      });

      response.headers.append("X-Request-Id", id);

      return response;
    };
  const handleMethods = (methods: HTTPMethod): HTTPMethod =>
    typeof methods == "function"
      ? excu(methods)
      : Object.fromEntries(
          Object.entries(methods)
            .filter(([_method, handler]) => !!handler)
            .concat([["OPTIONS", () => new Response()]])
            .map(([method, handler]) => [method, excu(handler!)])
        );

  const BunRoutesr: BunRoutes = Object.assign({}, ...args);
  return Object.fromEntries(
    Object.entries(BunRoutesr).map(([route, methods]) => [
      route,
      handleMethods(methods),
    ])
  );
}
