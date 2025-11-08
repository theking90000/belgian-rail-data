import type { PreHandler } from "elysia";

export const loggerMiddleware: PreHandler = ({ request, store }) => {
  console.log(`[${new Date().toISOString()}] ${request.method} ${request.url}`);
};
