import type { Deps } from "@src/deps";
import { Elysia, status, t } from "elysia";

export default function AuthService(deps: Deps) {
  const { apiKeyRepository } = deps;

  return (app: Elysia) =>
    app
      .guard({
        headers: t.Object(
          {
            "x-api-key": t.String({
              pattern: "^brd_.+$",
            }),
          },
          { additionalProperties: true }
        ),
      })
      .resolve(({ headers }) => {
        return {
          token: headers["x-api-key"].slice(4),
        };
      })
      .resolve(async ({ token }) => {
        const apiKey = await apiKeyRepository.getPermissionsForKey(token);

        if (!apiKey) {
          return status(401, { message: "Invalid API Key" });
        }

        return {
          apiKey: apiKey[0],
          permissions: apiKey[1],
          hasPermission: (pName: string) =>
            apiKey[1].some((p) => p.name === pName),
        };
      })
      .macro({
        permission: (pName: string) => ({
          beforeHandle({ hasPermission, permissions }) {
            if (!hasPermission || !hasPermission(pName)) {
              throw status(403, { message: "Forbidden" });
            }
          },
        }),
      });
}
