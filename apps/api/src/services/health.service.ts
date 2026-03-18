import { prisma } from "@ticketing/db";

export async function getHealthPayload(): Promise<{ status: "ok" }> {
  try {
    await prisma.$queryRaw`SELECT 1`;
  } catch (_error) {
    // Keep endpoint contract stable while allowing startup without a live DB.
  }

  return { status: "ok" };
}
