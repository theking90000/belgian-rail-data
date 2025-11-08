import type { Deps } from "@src/deps";
import Elysia from "elysia";

export default function healthRouter(deps: Deps) {
  return new Elysia().get("/health", () => {
    return {
      status: "ok",
    };
  });
}
