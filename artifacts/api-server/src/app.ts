import express, { type Express } from "express";
import cors from "cors";
import pinoHttp from "pino-http";
import { clerkMiddleware } from "@clerk/express";
import { publishableKeyFromHost } from "@clerk/shared/keys";
import router from "./routes";
import { logger } from "./lib/logger";
import { CLERK_PROXY_PATH, clerkProxyMiddleware, getClerkProxyHost } from "./middlewares/clerkProxyMiddleware";

const app: Express = express();

app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return {
          id: req.id,
          method: req.method,
          url: req.url?.split("?")[0],
        };
      },
      res(res) {
        return {
          statusCode: res.statusCode,
        };
      },
    },
  }),
);
app.use(CLERK_PROXY_PATH, clerkProxyMiddleware());
const ALLOWED_ORIGIN = /^https:\/\/(([a-z0-9-]+\.)*clubsa-fc\.com|[a-z0-9-]+(\.[a-z0-9-]+)*\.(workers\.dev|pages\.dev|replit\.app|replit\.dev))$/i;
app.use(
  cors({
    credentials: true,
    origin(origin, callback) {
      // طلبات بلا Origin (خادم لخادم، فحص الصحة) وبيئة التطوير المحلية مسموحة.
      if (!origin || /^http:\/\/localhost(:\d+)?$/.test(origin) || ALLOWED_ORIGIN.test(origin)) return callback(null, true);
      callback(null, false);
    },
  }),
);
app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true }));
app.use(clerkMiddleware((req) => ({
  publishableKey: publishableKeyFromHost(getClerkProxyHost(req) ?? "", process.env.CLERK_PUBLISHABLE_KEY),
})));

app.use("/api", router);

export default app;
