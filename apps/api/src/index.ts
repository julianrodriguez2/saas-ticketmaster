import "dotenv/config";
import { prisma } from "@ticketing/db";
import app from "./app";

const port = Number(process.env.PORT ?? 4000);

async function startServer(): Promise<void> {
  if (!process.env.JWT_SECRET) {
    console.warn("JWT_SECRET is not set. Auth routes will fail until it is configured.");
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
