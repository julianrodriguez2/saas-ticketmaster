import "dotenv/config";
import { prisma } from "@ticketing/db";
import app from "./app";

const port = Number(process.env.PORT ?? 4000);

async function startServer(): Promise<void> {
  if (!process.env.JWT_SECRET) {
    console.warn("JWT_SECRET is not set. Auth routes will fail until it is configured.");
  }
  if (!process.env.CORS_ALLOWED_ORIGINS && !process.env.WEB_ORIGIN) {
    console.warn(
      "CORS_ALLOWED_ORIGINS/WEB_ORIGIN is not set. Default localhost CORS policy will be used."
    );
  }
  if (!process.env.STRIPE_SECRET_KEY) {
    console.warn("STRIPE_SECRET_KEY is not set. Checkout creation will fail.");
  }
  if (!process.env.STRIPE_WEBHOOK_SECRET) {
    console.warn("STRIPE_WEBHOOK_SECRET is not set. Webhook verification will fail.");
  }
  if (!process.env.EMAIL_FROM) {
    console.warn("EMAIL_FROM is not set. Email sender will default to tickets@localhost.");
  }
  if (!process.env.APP_BASE_URL && !process.env.WEB_ORIGIN) {
    console.warn("APP_BASE_URL/WEB_ORIGIN is not set. Email links will use localhost defaults.");
  }

  try {
    await prisma.$connect();
    console.info("Connected to PostgreSQL via Prisma.");
  } catch (error) {
    console.warn("Prisma connection could not be established at startup.");
    console.warn(error);
  }

  app.listen(port, () => {
    console.info(`API listening on http://localhost:${port}`);
  });
}

void startServer();
