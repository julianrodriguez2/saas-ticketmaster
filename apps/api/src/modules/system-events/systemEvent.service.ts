import { prisma, type Prisma } from "@ticketing/db";

export type SystemEventInput = {
  type: string;
  entityType: string;
  entityId: string;
  message: string;
  metadata?: Prisma.InputJsonValue;
};

export async function recordSystemEvent(
  input: SystemEventInput,
  transaction?: Prisma.TransactionClient
): Promise<void> {
  const eventData = {
    type: input.type,
    entityType: input.entityType,
    entityId: input.entityId,
    message: input.message,
    metadata: input.metadata
  };

  if (transaction) {
    await transaction.systemEvent.create({
      data: eventData
    });
    return;
  }

  await prisma.systemEvent.create({
    data: eventData
  });
}

export async function recordSystemEventSafe(input: SystemEventInput): Promise<void> {
  try {
    await recordSystemEvent(input);
  } catch (error) {
    console.error("System event logging failed.", error);
  }
}
