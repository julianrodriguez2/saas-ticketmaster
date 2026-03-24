import cookieParser from "cookie-parser";
import cors from "cors";
import express from "express";
import helmet from "helmet";
import { createApiV1Router } from "./api/v1";
import { errorHandler } from "./middlewares/error-handler.middleware";
import {
  createGlobalRateLimiter,
  createWebhookRateLimiter
} from "./middlewares/rate-limit.middleware";
import { requestContextMiddleware } from "./middlewares/request-context.middleware";
import paymentRoutes from "./modules/payments/payment.routes";

const app = express();

const trustProxy =
  process.env.TRUST_PROXY === "1" || process.env.TRUST_PROXY === "true";

if (trustProxy) {
  app.set("trust proxy", 1);
}

const allowlistedOrigins = resolveAllowedOrigins();

app.use(requestContextMiddleware);
app.use(createGlobalRateLimiter());
app.use(helmet());

app.use(
  cors({
    origin(origin, callback) {
      if (!origin) {
        callback(null, true);
        return;
      }

      if (allowlistedOrigins.includes(origin)) {
        callback(null, true);
        return;
      }

      callback(new Error("Origin is not allowed by CORS policy."));
    },
    credentials: true
  })
);

app.use(cookieParser());

// Stripe webhook requires raw body verification.
app.use("/api/v1/webhooks", createWebhookRateLimiter(), paymentRoutes);
app.use("/webhooks", createWebhookRateLimiter(), paymentRoutes);

app.use(
  express.json({
    limit: process.env.JSON_BODY_LIMIT ?? "1mb"
  })
);
app.use(
  express.urlencoded({
    extended: true,
    limit: process.env.FORM_BODY_LIMIT ?? "1mb"
  })
);

const v1Router = createApiV1Router();
app.use("/api/v1", v1Router);

// Keep legacy routes mounted during transition.
if (process.env.ENABLE_LEGACY_ROUTES !== "false") {
  app.use("/", v1Router);
}

app.use(errorHandler);

export default app;

function resolveAllowedOrigins(): string[] {
  const rawOrigins = process.env.CORS_ALLOWED_ORIGINS ?? process.env.WEB_ORIGIN;
  const defaults = ["http://localhost:3000"];

  if (!rawOrigins) {
    return defaults;
  }

  const parsedOrigins = rawOrigins
    .split(",")
    .map((origin) => origin.trim())
    .filter((origin) => origin.length > 0);

  return parsedOrigins.length > 0 ? parsedOrigins : defaults;
}

