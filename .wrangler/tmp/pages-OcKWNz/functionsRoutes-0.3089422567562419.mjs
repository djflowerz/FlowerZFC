import { onRequest as __api_livescore_ts_onRequest } from "/Users/DJFLOWERZ/Desktop/GlobalFootballMediaPlatform/functions/api/livescore.ts"
import { onRequest as __api__path__ts_onRequest } from "/Users/DJFLOWERZ/Desktop/GlobalFootballMediaPlatform/functions/api/[path].ts"

export const routes = [
    {
      routePath: "/api/livescore",
      mountPath: "/api",
      method: "",
      middlewares: [],
      modules: [__api_livescore_ts_onRequest],
    },
  {
      routePath: "/api/:path",
      mountPath: "/api",
      method: "",
      middlewares: [],
      modules: [__api__path__ts_onRequest],
    },
  ]