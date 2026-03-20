import { prisma, type PresaleAccessType } from "@ticketing/db";
import { z } from "zod";

const presaleAccessTypeSchema = z.enum(["PUBLIC", "CODE", "LINK_ONLY"]);

const createPresaleSchema = z
  .object({
    name: z.string().trim().min(2).max(120),
    startsAt: z.coerce.date(),
    endsAt: z.coerce.date(),
    accessType: presaleAccessTypeSchema,
    accessCode: z.string().trim().min(1).max(120).optional(),
    isActive: z.coerce.boolean().default(true)
  })
  .superRefine((payload, context) => {
    if (payload.startsAt >= payload.endsAt) {
      context.addIssue({
        code: "custom",
        message: "Presale start must be before end."
      });
    }

    if (payload.accessType === "CODE" && !payload.accessCode) {
      context.addIssue({
        code: "custom",
        message: "Access code is required for CODE presales.",
        path: ["accessCode"]
      });
    }
  });

const updatePresaleSchema = createPresaleSchema;

const validatePresaleSchema = z.object({
  code: z.string().trim().min(1).max(120).optional(),
  linkAccess: z.coerce.boolean().optional()
});

export class PresaleServiceError extends Error {
  public readonly statusCode: number;

  constructor(statusCode: number, message: string) {
    super(message);
    this.statusCode = statusCode;
  }
}

export async function createPresaleRule(eventId: string, input: unknown) {
  await assertEventExists(eventId);

  const parsedPayload = createPresaleSchema.safeParse(input);

  if (!parsedPayload.success) {
    throw new PresaleServiceError(
      400,
      parsedPayload.error.issues[0]?.message ?? "Invalid presale payload."
    );
  }

  const payload = parsedPayload.data;

  return prisma.presaleRule.create({
    data: {
      eventId,
      name: payload.name,
      startsAt: payload.startsAt,
      endsAt: payload.endsAt,
      accessType: payload.accessType,
      accessCode: normalizeAccessCode(payload.accessCode),
      isActive: payload.isActive
    }
  });
}

export async function listPresaleRules(eventId: string) {
  await assertEventExists(eventId);

  return prisma.presaleRule.findMany({
    where: {
      eventId
    },
    orderBy: [
      {
        startsAt: "asc"
      },
      {
        createdAt: "asc"
      }
    ]
  });
}

export async function updatePresaleRule(presaleId: string, input: unknown) {
  const parsedPayload = updatePresaleSchema.safeParse(input);

  if (!parsedPayload.success) {
    throw new PresaleServiceError(
      400,
      parsedPayload.error.issues[0]?.message ?? "Invalid presale payload."
    );
  }

  const existingRule = await prisma.presaleRule.findUnique({
    where: {
      id: presaleId
    },
    select: {
      id: true
    }
  });

  if (!existingRule) {
    throw new PresaleServiceError(404, "Presale rule not found.");
  }

  const payload = parsedPayload.data;

  return prisma.presaleRule.update({
    where: {
      id: presaleId
    },
    data: {
      name: payload.name,
      startsAt: payload.startsAt,
      endsAt: payload.endsAt,
      accessType: payload.accessType,
      accessCode: normalizeAccessCode(payload.accessCode),
      isActive: payload.isActive
    }
  });
}

export async function deletePresaleRule(presaleId: string): Promise<void> {
  const existingRule = await prisma.presaleRule.findUnique({
    where: {
      id: presaleId
    },
    select: {
      id: true
    }
  });

  if (!existingRule) {
    throw new PresaleServiceError(404, "Presale rule not found.");
  }

  await prisma.presaleRule.delete({
    where: {
      id: presaleId
    }
  });
}

export async function validatePresaleAccess(
  eventId: string,
  input: unknown,
  now: Date = new Date()
): Promise<{
  valid: boolean;
  accessGranted: boolean;
  reason?: string;
  presale: {
    id: string;
    name: string;
    startsAt: Date;
    endsAt: Date;
    accessType: PresaleAccessType;
    isActive: boolean;
  } | null;
}> {
  const parsedPayload = validatePresaleSchema.safeParse(input ?? {});

  if (!parsedPayload.success) {
    throw new PresaleServiceError(
      400,
      parsedPayload.error.issues[0]?.message ?? "Invalid presale validation payload."
    );
  }

  const event = await prisma.event.findUnique({
    where: {
      id: eventId
    },
    select: {
      id: true,
      salesStartAt: true,
      salesEndAt: true
    }
  });

  if (!event) {
    throw new PresaleServiceError(404, "Event not found.");
  }

  if (event.salesStartAt && now < event.salesStartAt) {
    return {
      valid: false,
      accessGranted: false,
      reason: "Ticket sales have not started for this event.",
      presale: null
    };
  }

  if (event.salesEndAt && now > event.salesEndAt) {
    return {
      valid: false,
      accessGranted: false,
      reason: "Ticket sales are closed for this event.",
      presale: null
    };
  }

  const activePresale = await getActivePresaleForEvent(eventId, now);

  if (!activePresale) {
    return {
      valid: true,
      accessGranted: true,
      presale: null
    };
  }

  const normalizedCode = normalizeAccessCode(parsedPayload.data.code);

  if (activePresale.accessType === "PUBLIC") {
    return {
      valid: true,
      accessGranted: true,
      presale: mapPresale(activePresale)
    };
  }

  if (activePresale.accessType === "CODE") {
    if (!activePresale.accessCode) {
      return {
        valid: false,
        accessGranted: false,
        reason: "Presale code configuration is invalid.",
        presale: mapPresale(activePresale)
      };
    }

    if (!normalizedCode) {
      return {
        valid: false,
        accessGranted: false,
        reason: "A valid presale code is required.",
        presale: mapPresale(activePresale)
      };
    }

    if (normalizedCode.toLowerCase() !== activePresale.accessCode.toLowerCase()) {
      return {
        valid: false,
        accessGranted: false,
        reason: "Presale code is invalid.",
        presale: mapPresale(activePresale)
      };
    }

    return {
      valid: true,
      accessGranted: true,
      presale: mapPresale(activePresale)
    };
  }

  if (parsedPayload.data.linkAccess) {
    return {
      valid: true,
      accessGranted: true,
      presale: mapPresale(activePresale)
    };
  }

  return {
    valid: false,
    accessGranted: false,
    reason: "This event is currently limited to invite link access.",
    presale: mapPresale(activePresale)
  };
}

export async function getActivePresaleForEvent(
  eventId: string,
  now: Date = new Date()
): Promise<{
  id: string;
  name: string;
  startsAt: Date;
  endsAt: Date;
  accessType: PresaleAccessType;
  accessCode: string | null;
  isActive: boolean;
} | null> {
  return prisma.presaleRule.findFirst({
    where: {
      eventId,
      isActive: true,
      startsAt: {
        lte: now
      },
      endsAt: {
        gte: now
      }
    },
    orderBy: [
      {
        startsAt: "asc"
      },
      {
        createdAt: "asc"
      }
    ],
    select: {
      id: true,
      name: true,
      startsAt: true,
      endsAt: true,
      accessType: true,
      accessCode: true,
      isActive: true
    }
  });
}

function mapPresale(presale: {
  id: string;
  name: string;
  startsAt: Date;
  endsAt: Date;
  accessType: PresaleAccessType;
  isActive: boolean;
}) {
  return {
    id: presale.id,
    name: presale.name,
    startsAt: presale.startsAt,
    endsAt: presale.endsAt,
    accessType: presale.accessType,
    isActive: presale.isActive
  };
}

async function assertEventExists(eventId: string): Promise<void> {
  const event = await prisma.event.findUnique({
    where: {
      id: eventId
    },
    select: {
      id: true
    }
  });

  if (!event) {
    throw new PresaleServiceError(404, "Event not found.");
  }
}

function normalizeAccessCode(accessCode: string | undefined): string | null {
  if (!accessCode) {
    return null;
  }

  const trimmedCode = accessCode.trim();
  return trimmedCode ? trimmedCode : null;
}
