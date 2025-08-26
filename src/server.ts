const port = Bun.env.PORT ? Number(Bun.env.PORT) : 3000;
const hostname = Bun.env.HOST ?? "0.0.0.0";

console.log(" * starting server on ", `${hostname}:${port}`);

Bun.serve({
  port,
  hostname,

  routes: {
    "/": async (req) => {
      return new Response("aa");
    },
  },
});

console.log(" * server up and running");
