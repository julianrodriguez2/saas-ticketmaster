import rateLimit from "express-rate-limit";

function parseNumberEnv(variableName: string, fallback: number): number {
  const rawValue = process.env[variableName];
  if (!rawValue) {
    return fallback;
  }

  const parsedValue = Number(rawValue);
  return Number.isFinite(parsedValue) && parsedValue > 0 ? parsedValue : fallback;
}

function createLimiter(input: {
  windowMs: number;
  max: number;
  message: string;
}) {
  return rateLimit({
    windowMs: input.windowMs,
    max: input.max,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
      message: input.message,
      code: "RATE_LIMITED"
    }
  });
}

const globalWindowMs = parseNumberEnv("RATE_LIMIT_WINDOW_MS", 60_000);
const globalMaxRequests = parseNumberEnv("RATE_LIMIT_MAX_REQUESTS", 200);

export function createGlobalRateLimiter() {
  return createLimiter({
    windowMs: globalWindowMs,
    max: globalMaxRequests,
    message: "Too many requests. Please try again shortly."
  });
}

export function createAuthRateLimiter() {
  return createLimiter({
    windowMs: parseNumberEnv("AUTH_RATE_LIMIT_WINDOW_MS", 60_000),
    max: parseNumberEnv("AUTH_RATE_LIMIT_MAX_REQUESTS", 20),
    message: "Too many authentication attempts. Please wait and try again."
  });
}

export function createCheckoutRateLimiter() {
  return createLimiter({
    windowMs: parseNumberEnv("CHECKOUT_RATE_LIMIT_WINDOW_MS", 60_000),
    max: parseNumberEnv("CHECKOUT_RATE_LIMIT_MAX_REQUESTS", 30),
    message: "Checkout requests are temporarily rate limited. Please retry shortly."
  });
}

export function createPresaleValidationRateLimiter() {
  return createLimiter({
    windowMs: parseNumberEnv("PRESALE_RATE_LIMIT_WINDOW_MS", 60_000),
    max: parseNumberEnv("PRESALE_RATE_LIMIT_MAX_REQUESTS", 60),
    message: "Too many presale validation attempts. Please retry shortly."
  });
}

export function createTicketOpsRateLimiter() {
  return createLimiter({
    windowMs: parseNumberEnv("TICKET_OPS_RATE_LIMIT_WINDOW_MS", 60_000),
    max: parseNumberEnv("TICKET_OPS_RATE_LIMIT_MAX_REQUESTS", 120),
    message: "Ticket operations are temporarily rate limited."
  });
}

export function createWebhookRateLimiter() {
  return createLimiter({
    windowMs: parseNumberEnv("WEBHOOK_RATE_LIMIT_WINDOW_MS", 60_000),
    max: parseNumberEnv("WEBHOOK_RATE_LIMIT_MAX_REQUESTS", 240),
    message: "Webhook rate limit exceeded."
  });
}

