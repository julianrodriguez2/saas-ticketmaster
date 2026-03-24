import { prisma } from "@ticketing/db";
import { z } from "zod";
import { invalidateEventCaches } from "../events/event.service";

const ticketingModeSchema = z.enum(["GA", "RESERVED"]);
const publishStatusSchema = z.enum(["DRAFT", "PUBLISHED"]);
const presaleAccessTypeSchema = z.enum(["PUBLIC", "CODE", "LINK_ONLY"]);

const templateTierSchema = z.object({
  name: z.string().trim().min(2).max(80),
  price: z.coerce.number().positive(),
  quantity: z.coerce.number().int().positive(),
  sortOrder: z.coerce.number().int().positive().optional()
});

const templatePresaleRuleSchema = z
  .object({
    name: z.string().trim().min(2).max(120),
    startsAtOffsetHours: z.coerce.number().int().optional(),
    endsAtOffsetHours: z.coerce.number().int().optional(),
    accessType: presaleAccessTypeSchema,
    accessCode: z.string().trim().min(1).max(120).optional(),
    isActive: z.coerce.boolean().default(true)
  })
  .superRefine((payload, context) => {
    if (payload.accessType === "CODE" && !payload.accessCode) {
      context.addIssue({
        code: "custom",
        message: "Access code is required for CODE template presales.",
        path: ["accessCode"]
      });
    }

    if (
      typeof payload.startsAtOffsetHours === "number" &&
      typeof payload.endsAtOffsetHours === "number" &&
      payload.startsAtOffsetHours >= payload.endsAtOffsetHours
    ) {
      context.addIssue({
        code: "custom",
        message: "Presale start offset must be before end offset."
      });
    }
  });

const createEventTemplateSchema = z.object({
  name: z.string().trim().min(2).max(140),
  description: z.string().trim().max(1000).optional(),
  venueId: z.string().min(1).optional(),
  ticketingMode: ticketingModeSchema,
  defaultCurrency: z.string().trim().length(3).default("USD"),
  ticketTiers: z.array(templateTierSchema).default([]),
  templatePresales: z.array(templatePresaleRuleSchema).default([])
});

const updateEventTemplateSchema = createEventTemplateSchema;

const applyTemplateSchema = z
  .object({
    title: z.string().trim().min(2).max(160),
    description: z.string().trim().min(1).max(5000),
    date: z.coerce.date(),
    venueId: z.string().min(1).optional(),
    currency: z.string().trim().length(3).optional(),
    salesStartAt: z.coerce.date().optional(),
    salesEndAt: z.coerce.date().optional(),
    publishStatus: publishStatusSchema.default("PUBLISHED"),
    pricingOverrides: z.array(templateTierSchema).optional()
  })
  .superRefine((payload, context) => {
    if (payload.salesStartAt && payload.salesEndAt && payload.salesStartAt >= payload.salesEndAt) {
      context.addIssue({
        code: "custom",
        message: "Sales start must be before sales end."
      });
    }
  });

const eventTemplateDetailInclude = {
  venue: {
    select: {
      id: true,
      name: true,
      location: true
    }
  },
  ticketTiers: {
    orderBy: {
      sortOrder: "asc"
    }
  },
  templatePresales: {
    orderBy: {
      name: "asc"
    }
  }
} as const;

export class EventTemplateServiceError extends Error {
  public readonly statusCode: number;

  constructor(statusCode: number, message: string) {
    super(message);
    this.statusCode = statusCode;
  }
}

export async function listEventTemplates() {
  const templates = await prisma.eventTemplate.findMany({
    include: eventTemplateDetailInclude,
    orderBy: {
      updatedAt: "desc"
    }
  });

  return templates.map((template) => ({
    id: template.id,
    name: template.name,
    description: template.description,
    ticketingMode: template.ticketingMode,
    defaultCurrency: template.defaultCurrency,
    createdAt: template.createdAt,
    updatedAt: template.updatedAt,
    venue: template.venue,
    tierCount: template.ticketTiers.length,
    ticketTiers: template.ticketTiers.map((tier) => ({
      id: tier.id,
      name: tier.name,
      price: Number(tier.price),
      quantity: tier.quantity,
      sortOrder: tier.sortOrder
    })),
    presaleCount: template.templatePresales.length
  }));
}

export async function createEventTemplate(input: unknown) {
  const parsedPayload = createEventTemplateSchema.safeParse(input);

  if (!parsedPayload.success) {
    throw new EventTemplateServiceError(
      400,
      parsedPayload.error.issues[0]?.message ?? "Invalid template payload."
    );
  }

  const payload = parsedPayload.data;
  await assertTemplateVenueExists(payload.venueId);
  assertTemplateTierRules(payload.ticketingMode, payload.ticketTiers);

  const template = await prisma.eventTemplate.create({
    data: {
      name: payload.name,
      description: payload.description,
      venueId: payload.venueId,
      ticketingMode: payload.ticketingMode,
      defaultCurrency: payload.defaultCurrency.toUpperCase(),
      ticketTiers: {
        create: payload.ticketTiers.map((tier, index) => ({
          name: tier.name,
          price: tier.price,
          quantity: tier.quantity,
          sortOrder: tier.sortOrder ?? index + 1
        }))
      },
      templatePresales: {
        create: payload.templatePresales.map((presale) => ({
          name: presale.name,
          startsAtOffsetHours: presale.startsAtOffsetHours,
          endsAtOffsetHours: presale.endsAtOffsetHours,
          accessType: presale.accessType,
          accessCode:
            presale.accessType === "CODE"
              ? normalizeAccessCode(presale.accessCode)
              : null,
          isActive: presale.isActive
        }))
      }
    },
    include: eventTemplateDetailInclude
  });

  return mapTemplateDetail(template);
}

export async function getEventTemplateById(templateId: string) {
  const template = await prisma.eventTemplate.findUnique({
    where: {
      id: templateId
    },
    include: eventTemplateDetailInclude
  });

  if (!template) {
    throw new EventTemplateServiceError(404, "Event template not found.");
  }

  return mapTemplateDetail(template);
}

export async function updateEventTemplate(templateId: string, input: unknown) {
  const parsedPayload = updateEventTemplateSchema.safeParse(input);

  if (!parsedPayload.success) {
    throw new EventTemplateServiceError(
      400,
      parsedPayload.error.issues[0]?.message ?? "Invalid template payload."
    );
  }

  const existingTemplate = await prisma.eventTemplate.findUnique({
    where: {
      id: templateId
    },
    select: {
      id: true
    }
  });

  if (!existingTemplate) {
    throw new EventTemplateServiceError(404, "Event template not found.");
  }

  const payload = parsedPayload.data;
  await assertTemplateVenueExists(payload.venueId);
  assertTemplateTierRules(payload.ticketingMode, payload.ticketTiers);

  const updatedTemplate = await prisma.$transaction(async (transaction) => {
    await transaction.templateTicketTier.deleteMany({
      where: {
        templateId
      }
    });

    await transaction.templatePresaleRule.deleteMany({
      where: {
        templateId
      }
    });

    return transaction.eventTemplate.update({
      where: {
        id: templateId
      },
      data: {
        name: payload.name,
        description: payload.description,
        venueId: payload.venueId,
        ticketingMode: payload.ticketingMode,
        defaultCurrency: payload.defaultCurrency.toUpperCase(),
        ticketTiers: {
          create: payload.ticketTiers.map((tier, index) => ({
            name: tier.name,
            price: tier.price,
            quantity: tier.quantity,
            sortOrder: tier.sortOrder ?? index + 1
          }))
        },
        templatePresales: {
          create: payload.templatePresales.map((presale) => ({
            name: presale.name,
            startsAtOffsetHours: presale.startsAtOffsetHours,
            endsAtOffsetHours: presale.endsAtOffsetHours,
            accessType: presale.accessType,
            accessCode:
              presale.accessType === "CODE"
                ? normalizeAccessCode(presale.accessCode)
                : null,
            isActive: presale.isActive
          }))
        }
      },
      include: eventTemplateDetailInclude
    });
  });

  return mapTemplateDetail(updatedTemplate);
}

export async function deleteEventTemplate(templateId: string): Promise<void> {
  const existingTemplate = await prisma.eventTemplate.findUnique({
    where: {
      id: templateId
    },
    select: {
      id: true
    }
  });

  if (!existingTemplate) {
    throw new EventTemplateServiceError(404, "Event template not found.");
  }

  await prisma.eventTemplate.delete({
    where: {
      id: templateId
    }
  });
}

export async function applyTemplateToEvent(templateId: string, input: unknown) {
  const parsedPayload = applyTemplateSchema.safeParse(input);

  if (!parsedPayload.success) {
    throw new EventTemplateServiceError(
      400,
      parsedPayload.error.issues[0]?.message ?? "Invalid template apply payload."
    );
  }

  const payload = parsedPayload.data;

  const template = await prisma.eventTemplate.findUnique({
    where: {
      id: templateId
    },
    include: {
      ticketTiers: {
        orderBy: {
          sortOrder: "asc"
        }
      },
      templatePresales: true
    }
  });

  if (!template) {
    throw new EventTemplateServiceError(404, "Event template not found.");
  }

  const venueId = payload.venueId ?? template.venueId;

  if (!venueId) {
    throw new EventTemplateServiceError(
      400,
      "Template does not define a venue. Provide a venue override."
    );
  }

  await assertTemplateVenueExists(venueId);

  const sourceTiers = payload.pricingOverrides?.length
    ? payload.pricingOverrides
    : template.ticketTiers.map((tier) => ({
        name: tier.name,
        price: Number(tier.price),
        quantity: tier.quantity,
        sortOrder: tier.sortOrder
      }));

  assertTemplateTierRules(template.ticketingMode, sourceTiers);

  const createdEvent = await prisma.$transaction(async (transaction) => {
    const event = await transaction.event.create({
      data: {
        title: payload.title,
        description: payload.description,
        date: payload.date,
        venueId,
        ticketingMode: template.ticketingMode,
        currency: (payload.currency ?? template.defaultCurrency).toUpperCase(),
        salesStartAt: payload.salesStartAt,
        salesEndAt: payload.salesEndAt,
        publishStatus: payload.publishStatus,
        ticketTiers:
          template.ticketingMode === "GA"
            ? {
                create: sourceTiers.map((tier) => ({
                  name: tier.name,
                  price: tier.price,
                  quantity: tier.quantity
                }))
              }
            : undefined,
        presaleRules: {
          create: buildPresalesFromTemplate(template.templatePresales, payload.date)
        }
      },
      include: {
        venue: {
          select: {
            id: true,
            name: true,
            location: true
          }
        },
        ticketTiers: {
          orderBy: {
            price: "asc"
          }
        },
        presaleRules: {
          orderBy: {
            startsAt: "asc"
          }
        }
      }
    });

    return event;
  });

  const now = new Date();
  const activePresale = createdEvent.presaleRules.find(
    (presale) => presale.isActive && presale.startsAt <= now && presale.endsAt >= now
  );

  invalidateEventCaches();

  return {
    id: createdEvent.id,
    title: createdEvent.title,
    description: createdEvent.description,
    date: createdEvent.date,
    ticketingMode: createdEvent.ticketingMode,
    currency: createdEvent.currency,
    salesStartAt: createdEvent.salesStartAt,
    salesEndAt: createdEvent.salesEndAt,
    publishStatus: createdEvent.publishStatus,
    seatMapExists: false,
    activePresale: activePresale
      ? {
          id: activePresale.id,
          name: activePresale.name,
          startsAt: activePresale.startsAt,
          endsAt: activePresale.endsAt,
          accessType: activePresale.accessType
        }
      : null,
    venue: createdEvent.venue,
    ticketTiers: createdEvent.ticketTiers.map((tier) => ({
      id: tier.id,
      name: tier.name,
      price: Number(tier.price),
      quantityRemaining: tier.quantity
    }))
  };
}

function buildPresalesFromTemplate(
  templatePresales: Array<{
    name: string;
    startsAtOffsetHours: number | null;
    endsAtOffsetHours: number | null;
    accessType: "PUBLIC" | "CODE" | "LINK_ONLY";
    accessCode: string | null;
    isActive: boolean;
  }>,
  eventDate: Date
): Array<{
  name: string;
  startsAt: Date;
  endsAt: Date;
  accessType: "PUBLIC" | "CODE" | "LINK_ONLY";
  accessCode: string | null;
  isActive: boolean;
}> {
  return templatePresales
    .map((presale) => {
      if (
        typeof presale.startsAtOffsetHours !== "number" ||
        typeof presale.endsAtOffsetHours !== "number"
      ) {
        return null;
      }

      const startsAt = new Date(eventDate.getTime() + presale.startsAtOffsetHours * 60 * 60 * 1000);
      const endsAt = new Date(eventDate.getTime() + presale.endsAtOffsetHours * 60 * 60 * 1000);

      if (startsAt >= endsAt) {
        return null;
      }

      return {
        name: presale.name,
        startsAt,
        endsAt,
        accessType: presale.accessType,
        accessCode:
          presale.accessType === "CODE" ? normalizeAccessCode(presale.accessCode) : null,
        isActive: presale.isActive
      };
    })
    .filter((presale): presale is {
      name: string;
      startsAt: Date;
      endsAt: Date;
      accessType: "PUBLIC" | "CODE" | "LINK_ONLY";
      accessCode: string | null;
      isActive: boolean;
    } => Boolean(presale));
}

function mapTemplateDetail(template: {
  id: string;
  name: string;
  description: string | null;
  ticketingMode: "GA" | "RESERVED";
  defaultCurrency: string;
  createdAt: Date;
  updatedAt: Date;
  venue: {
    id: string;
    name: string;
    location: string;
  } | null;
  ticketTiers: Array<{
    id: string;
    name: string;
    price: { toString(): string };
    quantity: number;
    sortOrder: number;
  }>;
  templatePresales: Array<{
    id: string;
    name: string;
    startsAtOffsetHours: number | null;
    endsAtOffsetHours: number | null;
    accessType: "PUBLIC" | "CODE" | "LINK_ONLY";
    accessCode: string | null;
    isActive: boolean;
  }>;
}) {
  return {
    id: template.id,
    name: template.name,
    description: template.description,
    ticketingMode: template.ticketingMode,
    defaultCurrency: template.defaultCurrency,
    createdAt: template.createdAt,
    updatedAt: template.updatedAt,
    venue: template.venue,
    ticketTiers: template.ticketTiers.map((tier) => ({
      id: tier.id,
      name: tier.name,
      price: Number(tier.price),
      quantity: tier.quantity,
      sortOrder: tier.sortOrder
    })),
    templatePresales: template.templatePresales.map((presale) => ({
      id: presale.id,
      name: presale.name,
      startsAtOffsetHours: presale.startsAtOffsetHours,
      endsAtOffsetHours: presale.endsAtOffsetHours,
      accessType: presale.accessType,
      accessCode: presale.accessCode,
      isActive: presale.isActive
    }))
  };
}

function assertTemplateTierRules(
  ticketingMode: "GA" | "RESERVED",
  tiers: Array<{
    name: string;
    price: number;
    quantity: number;
  }>
): void {
  if (ticketingMode === "GA" && tiers.length === 0) {
    throw new EventTemplateServiceError(
      400,
      "GA templates require at least one default ticket tier."
    );
  }
}

async function assertTemplateVenueExists(venueId: string | undefined): Promise<void> {
  if (!venueId) {
    return;
  }

  const venue = await prisma.venue.findUnique({
    where: {
      id: venueId
    },
    select: {
      id: true
    }
  });

  if (!venue) {
    throw new EventTemplateServiceError(404, "Template venue not found.");
  }
}

function normalizeAccessCode(accessCode: string | null | undefined): string | null {
  if (!accessCode) {
    return null;
  }

  const trimmedCode = accessCode.trim();
  return trimmedCode ? trimmedCode : null;
}
