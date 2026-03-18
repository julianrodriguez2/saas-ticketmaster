import { prisma } from "@ticketing/db";
import { z } from "zod";

const createVenueSchema = z.object({
  name: z.string().trim().min(2).max(120),
  location: z.string().trim().min(2).max(200)
});

export class VenueServiceError extends Error {
  public readonly statusCode: number;

  constructor(statusCode: number, message: string) {
    super(message);
    this.statusCode = statusCode;
  }
}

export async function createVenue(input: unknown) {
  const parsedPayload = createVenueSchema.safeParse(input);

  if (!parsedPayload.success) {
    throw new VenueServiceError(
      400,
      parsedPayload.error.issues[0]?.message ?? "Invalid venue payload."
    );
  }

  return prisma.venue.create({
    data: parsedPayload.data
  });
}

export async function listVenues() {
  return prisma.venue.findMany({
    orderBy: {
      createdAt: "desc"
    }
  });
}

