import { prisma, type BulkImportJobStatus, type Prisma } from "@ticketing/db";
import { z } from "zod";
import { parseCsvBuffer } from "./import.parsers";
import { buildPaginationMeta, toSkipTake } from "../../utils/pagination";
import { parsePaginationQuery } from "../../utils/queryParsers";
import { invalidateEventCaches } from "../events/event.service";
import {
  type ImportPreviewRow,
  type ImportRowValidationError,
  type ImportTemplatePreset,
  type ImportVenuePreset,
  type ValidatedEventImportRow,
  validateImportRows
} from "./import.validators";

const commitImportSchema = z.object({
  importJobId: z.string().min(1)
});

const listImportJobsQuerySchema = z.object({});

export class ImportServiceError extends Error {
  public readonly statusCode: number;

  constructor(statusCode: number, message: string) {
    super(message);
    this.statusCode = statusCode;
  }
}

export async function validateEventsImportFile(input: {
  fileName: string;
  fileBuffer: Buffer;
  createdByUserId: string;
}): Promise<{
  importJob: {
    id: string;
    fileName: string;
    status: BulkImportJobStatus;
    totalRows: number;
    successRows: number;
    failedRows: number;
    createdAt: Date;
    completedAt: Date | null;
  };
  previewRows: ImportPreviewRow[];
  validationErrors: Array<{
    rowNumber: number;
    fieldName: string | null;
    message: string;
    rawRowJson: Prisma.JsonValue | null;
  }>;
  summary: {
    totalRows: number;
    validRows: number;
    invalidRows: number;
  };
}> {
  const importJob = await prisma.bulkImportJob.create({
    data: {
      fileName: input.fileName,
      createdByUserId: input.createdByUserId,
      status: "PENDING"
    }
  });

  try {
    const { rows } = parseCsvBuffer(input.fileBuffer);

    if (rows.length === 0) {
      await prisma.bulkImportJob.update({
        where: {
          id: importJob.id
        },
        data: {
          status: "FAILED",
          totalRows: 0,
          successRows: 0,
          failedRows: 0,
          summaryJson: {
            validationSummary: {
              totalRows: 0,
              validRows: 0,
              invalidRows: 0
            },
            previewRows: [],
            validRows: []
          },
          completedAt: new Date()
        }
      });

      throw new ImportServiceError(400, "CSV file contains no import rows.");
    }

    const [venues, templates] = await Promise.all([
      prisma.venue.findMany({
        select: {
          id: true,
          name: true,
          location: true
        }
      }),
      prisma.eventTemplate.findMany({
        include: {
          ticketTiers: {
            orderBy: {
              sortOrder: "asc"
            }
          }
        }
      })
    ]);

    const venuesById = new Map<string, ImportVenuePreset>();
    const venuesByName = new Map<string, ImportVenuePreset>();

    for (const venue of venues) {
      venuesById.set(venue.id, venue);
      venuesByName.set(venue.name.trim().toLowerCase(), venue);
    }

    const templatesById = new Map<string, ImportTemplatePreset>();

    for (const template of templates) {
      templatesById.set(template.id, {
        id: template.id,
        venueId: template.venueId,
        ticketingMode: template.ticketingMode,
        defaultCurrency: template.defaultCurrency,
        ticketTiers: template.ticketTiers.map((tier) => ({
          name: tier.name,
          price: Number(tier.price),
          quantity: tier.quantity,
          sortOrder: tier.sortOrder
        }))
      });
    }

    const validation = validateImportRows(rows, {
      venuesById,
      venuesByName,
      templatesById
    });

    const validationErrors = validation.errors.map((error) => ({
      importJobId: importJob.id,
      rowNumber: error.rowNumber,
      fieldName: error.fieldName,
      message: error.message,
      rawRowJson: error.rawRowJson as Prisma.InputJsonValue | undefined
    }));

    if (validationErrors.length > 0) {
      await prisma.bulkImportRowError.createMany({
        data: validationErrors
      });
    }

    const nextStatus = resolveValidationStatus(
      validation.summary.validRows,
      validation.summary.invalidRows
    );

    const updatedJob = await prisma.bulkImportJob.update({
      where: {
        id: importJob.id
      },
      data: {
        status: nextStatus,
        totalRows: validation.summary.totalRows,
        successRows: validation.summary.validRows,
        failedRows: validation.summary.invalidRows,
        summaryJson: {
          validationSummary: validation.summary,
          previewRows: validation.previewRows,
          validRows: validation.validRows,
          notes: [
            "Venue names must match existing venues exactly (case-insensitive).",
            "Reserved events can be imported without seat maps and should be configured afterward."
          ]
        },
        completedAt: nextStatus === "FAILED" ? new Date() : null
      },
      select: {
        id: true,
        fileName: true,
        status: true,
        totalRows: true,
        successRows: true,
        failedRows: true,
        createdAt: true,
        completedAt: true
      }
    });

    const persistedErrors = await prisma.bulkImportRowError.findMany({
      where: {
        importJobId: importJob.id
      },
      orderBy: [
        {
          rowNumber: "asc"
        },
        {
          createdAt: "asc"
        }
      ],
      select: {
        rowNumber: true,
        fieldName: true,
        message: true,
        rawRowJson: true
      }
    });

    return {
      importJob: updatedJob,
      previewRows: validation.previewRows,
      validationErrors: persistedErrors,
      summary: validation.summary
    };
  } catch (error) {
    if (error instanceof ImportServiceError) {
      throw error;
    }

    await prisma.bulkImportJob.update({
      where: {
        id: importJob.id
      },
      data: {
        status: "FAILED",
        summaryJson: {
          error: error instanceof Error ? error.message : "Unable to parse CSV file."
        },
        completedAt: new Date()
      }
    });

    throw new ImportServiceError(400, "Unable to parse CSV file.");
  }
}

export async function commitEventsImport(
  input: unknown
): Promise<{
  importJobId: string;
  successCount: number;
  failedCount: number;
  createdEventIds: string[];
  errorSummary: Array<{
    rowNumber: number;
    message: string;
    fieldName?: string;
  }>;
}> {
  const parsedPayload = commitImportSchema.safeParse(input);

  if (!parsedPayload.success) {
    throw new ImportServiceError(
      400,
      parsedPayload.error.issues[0]?.message ?? "Invalid import commit payload."
    );
  }

  const importJob = await prisma.bulkImportJob.findUnique({
    where: {
      id: parsedPayload.data.importJobId
    },
    include: {
      rowErrors: {
        orderBy: {
          rowNumber: "asc"
        }
      }
    }
  });

  if (!importJob) {
    throw new ImportServiceError(404, "Import job not found.");
  }

  if (!["VALIDATED", "PARTIAL"].includes(importJob.status)) {
    throw new ImportServiceError(
      400,
      "Import job must be validated before commit."
    );
  }

  if (importJob.completedAt) {
    throw new ImportServiceError(409, "Import job has already been processed.");
  }

  const validRows = parseValidRowsFromSummary(importJob.summaryJson);

  if (validRows.length === 0) {
    throw new ImportServiceError(400, "This import job has no valid rows to commit.");
  }

  const templateIds = Array.from(
    new Set(validRows.map((row) => row.templateId).filter((value): value is string => Boolean(value)))
  );

  const templates = await prisma.eventTemplate.findMany({
    where: {
      id: {
        in: templateIds
      }
    },
    include: {
      templatePresales: true
    }
  });

  const templateById = new Map(templates.map((template) => [template.id, template]));

  const createdEventIds: string[] = [];
  const commitErrors: ImportRowValidationError[] = [];

  for (const row of validRows) {
    try {
      const template = row.templateId ? templateById.get(row.templateId) : undefined;

      await prisma.$transaction(async (transaction) => {
        const event = await transaction.event.create({
          data: {
            title: row.title,
            description: row.description,
            date: new Date(row.dateIso),
            venueId: row.venueId,
            ticketingMode: row.ticketingMode,
            currency: row.currency,
            salesStartAt: row.salesStartAtIso ? new Date(row.salesStartAtIso) : null,
            salesEndAt: row.salesEndAtIso ? new Date(row.salesEndAtIso) : null,
            publishStatus: row.publishStatus,
            ticketTiers:
              row.ticketingMode === "GA"
                ? {
                    create: row.ticketTiers.map((tier) => ({
                      name: tier.name,
                      price: tier.price,
                      quantity: tier.quantity
                    }))
                  }
                : undefined,
            presaleRules: {
              create:
                row.presale
                  ? [
                      {
                        name: row.presale.name,
                        startsAt: new Date(row.presale.startsAtIso),
                        endsAt: new Date(row.presale.endsAtIso),
                        accessType: row.presale.accessType,
                        accessCode: row.presale.accessCode,
                        isActive: row.presale.isActive
                      }
                    ]
                  : buildTemplatePresales(template, new Date(row.dateIso))
            }
          },
          select: {
            id: true
          }
        });

        createdEventIds.push(event.id);
      });
    } catch (error) {
      commitErrors.push({
        rowNumber: row.rowNumber,
        message:
          error instanceof Error
            ? error.message
            : "Unexpected failure while creating event.",
        rawRowJson: row.rawRow
      });
    }
  }

  if (commitErrors.length > 0) {
    await prisma.bulkImportRowError.createMany({
      data: commitErrors.map((error) => ({
        importJobId: importJob.id,
        rowNumber: error.rowNumber,
        fieldName: error.fieldName,
        message: error.message,
        rawRowJson: error.rawRowJson as Prisma.InputJsonValue | undefined
      }))
    });
  }

  const totalFailed = importJob.totalRows - createdEventIds.length;
  const nextStatus =
    createdEventIds.length === 0
      ? "FAILED"
      : totalFailed > 0
        ? "PARTIAL"
        : "COMPLETED";

  await prisma.bulkImportJob.update({
    where: {
      id: importJob.id
    },
    data: {
      status: nextStatus,
      successRows: createdEventIds.length,
      failedRows: totalFailed,
      completedAt: new Date()
    }
  });

  if (createdEventIds.length > 0) {
    invalidateEventCaches();
  }

  return {
    importJobId: importJob.id,
    successCount: createdEventIds.length,
    failedCount: totalFailed,
    createdEventIds,
    errorSummary: commitErrors.map((error) => ({
      rowNumber: error.rowNumber,
      fieldName: error.fieldName,
      message: error.message
    }))
  };
}

export async function listImportJobs(query: unknown): Promise<{
  jobs: Array<{
    id: string;
    fileName: string;
    status: BulkImportJobStatus;
    totalRows: number;
    successRows: number;
    failedRows: number;
    createdAt: Date;
    completedAt: Date | null;
    createdBy: {
      id: string;
      email: string;
    };
  }>;
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}> {
  const parsedQuery = listImportJobsQuerySchema.safeParse(query);

  if (!parsedQuery.success) {
    throw new ImportServiceError(
      400,
      parsedQuery.error.issues[0]?.message ?? "Invalid imports query."
    );
  }

  const pagination = parsePaginationQuery(query, {
    defaultLimit: 20,
    maxLimit: 100,
    defaultSortBy: "createdAt",
    defaultSortOrder: "desc",
    allowedSortBy: ["createdAt", "completedAt", "status"]
  });
  const { page, limit, sortBy, sortOrder } = pagination;
  const { skip, take } = toSkipTake({ page, limit });

  const [total, jobs] = await prisma.$transaction([
    prisma.bulkImportJob.count(),
    prisma.bulkImportJob.findMany({
      orderBy: buildImportSort(sortBy, sortOrder),
      skip,
      take,
      select: {
        id: true,
        fileName: true,
        status: true,
        totalRows: true,
        successRows: true,
        failedRows: true,
        createdAt: true,
        completedAt: true,
        createdBy: {
          select: {
            id: true,
            email: true
          }
        }
      }
    })
  ]);

  return {
    jobs,
    pagination: buildPaginationMeta({
      page,
      limit,
      total
    })
  };
}

export async function getImportJobById(importJobId: string): Promise<{
  id: string;
  fileName: string;
  status: BulkImportJobStatus;
  totalRows: number;
  successRows: number;
  failedRows: number;
  summaryJson: Prisma.JsonValue | null;
  createdAt: Date;
  completedAt: Date | null;
  createdBy: {
    id: string;
    email: string;
  };
  rowErrors: Array<{
    id: string;
    rowNumber: number;
    fieldName: string | null;
    message: string;
    rawRowJson: Prisma.JsonValue | null;
    createdAt: Date;
  }>;
}> {
  const importJob = await prisma.bulkImportJob.findUnique({
    where: {
      id: importJobId
    },
    select: {
      id: true,
      fileName: true,
      status: true,
      totalRows: true,
      successRows: true,
      failedRows: true,
      summaryJson: true,
      createdAt: true,
      completedAt: true,
      createdBy: {
        select: {
          id: true,
          email: true
        }
      },
      rowErrors: {
        orderBy: [
          {
            rowNumber: "asc"
          },
          {
            createdAt: "asc"
          }
        ],
        select: {
          id: true,
          rowNumber: true,
          fieldName: true,
          message: true,
          rawRowJson: true,
          createdAt: true
        }
      }
    }
  });

  if (!importJob) {
    throw new ImportServiceError(404, "Import job not found.");
  }

  return importJob;
}

function parseValidRowsFromSummary(summaryJson: Prisma.JsonValue | null): ValidatedEventImportRow[] {
  if (!summaryJson || typeof summaryJson !== "object" || Array.isArray(summaryJson)) {
    return [];
  }

  const validRows = (summaryJson as Record<string, unknown>).validRows;

  if (!Array.isArray(validRows)) {
    return [];
  }

  return validRows
    .map((rowValue) => parseValidatedRow(rowValue))
    .filter((row): row is ValidatedEventImportRow => row !== null);
}

function parseValidatedRow(rowValue: unknown): ValidatedEventImportRow | null {
  if (!rowValue || typeof rowValue !== "object" || Array.isArray(rowValue)) {
    return null;
  }

  const row = rowValue as Record<string, unknown>;

  if (
    typeof row.rowNumber !== "number" ||
    typeof row.title !== "string" ||
    typeof row.description !== "string" ||
    typeof row.dateIso !== "string" ||
    typeof row.venueId !== "string" ||
    (row.ticketingMode !== "GA" && row.ticketingMode !== "RESERVED") ||
    typeof row.currency !== "string" ||
    (row.publishStatus !== "DRAFT" && row.publishStatus !== "PUBLISHED") ||
    !Array.isArray(row.ticketTiers) ||
    !row.rawRow ||
    typeof row.rawRow !== "object" ||
    Array.isArray(row.rawRow)
  ) {
    return null;
  }

  const parsedTicketTiers = row.ticketTiers
    .map((tierValue) => {
      if (!tierValue || typeof tierValue !== "object" || Array.isArray(tierValue)) {
        return null;
      }

      const tier = tierValue as Record<string, unknown>;

      if (
        typeof tier.name !== "string" ||
        typeof tier.price !== "number" ||
        typeof tier.quantity !== "number"
      ) {
        return null;
      }

      return {
        name: tier.name,
        price: tier.price,
        quantity: tier.quantity
      };
    })
    .filter((tier): tier is { name: string; price: number; quantity: number } => Boolean(tier));

  const parsedPresale = parseValidatedPresale(row.presale);

  const rawRow = Object.fromEntries(
    Object.entries(row.rawRow as Record<string, unknown>).map(([fieldName, fieldValue]) => [
      fieldName,
      typeof fieldValue === "string" ? fieldValue : String(fieldValue ?? "")
    ])
  );

  const warnings = Array.isArray(row.warnings)
    ? row.warnings.filter((warning): warning is string => typeof warning === "string")
    : [];

  return {
    rowNumber: row.rowNumber,
    templateId: typeof row.templateId === "string" ? row.templateId : null,
    title: row.title,
    description: row.description,
    dateIso: row.dateIso,
    venueId: row.venueId,
    ticketingMode: row.ticketingMode as "GA" | "RESERVED",
    currency: row.currency,
    salesStartAtIso:
      typeof row.salesStartAtIso === "string" ? row.salesStartAtIso : null,
    salesEndAtIso:
      typeof row.salesEndAtIso === "string" ? row.salesEndAtIso : null,
    publishStatus: row.publishStatus as "DRAFT" | "PUBLISHED",
    ticketTiers: parsedTicketTiers,
    presale: parsedPresale,
    warnings,
    rawRow
  };
}

function parseValidatedPresale(
  value: unknown
): {
  name: string;
  startsAtIso: string;
  endsAtIso: string;
  accessType: "PUBLIC" | "CODE" | "LINK_ONLY";
  accessCode: string | null;
  isActive: boolean;
} | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }

  const presale = value as Record<string, unknown>;

  if (
    typeof presale.name !== "string" ||
    typeof presale.startsAtIso !== "string" ||
    typeof presale.endsAtIso !== "string" ||
    (presale.accessType !== "PUBLIC" &&
      presale.accessType !== "CODE" &&
      presale.accessType !== "LINK_ONLY") ||
    typeof presale.isActive !== "boolean"
  ) {
    return null;
  }

  return {
    name: presale.name,
    startsAtIso: presale.startsAtIso,
    endsAtIso: presale.endsAtIso,
    accessType: presale.accessType as "PUBLIC" | "CODE" | "LINK_ONLY",
    accessCode: typeof presale.accessCode === "string" ? presale.accessCode : null,
    isActive: presale.isActive
  };
}

function resolveValidationStatus(
  validRows: number,
  invalidRows: number
): BulkImportJobStatus {
  if (validRows === 0) {
    return "FAILED";
  }

  if (invalidRows === 0) {
    return "VALIDATED";
  }

  return "PARTIAL";
}

function buildTemplatePresales(
  template:
    | {
        templatePresales: Array<{
          name: string;
          startsAtOffsetHours: number | null;
          endsAtOffsetHours: number | null;
          accessType: "PUBLIC" | "CODE" | "LINK_ONLY";
          accessCode: string | null;
          isActive: boolean;
        }>;
      }
    | undefined,
  eventDate: Date
): Array<{
  name: string;
  startsAt: Date;
  endsAt: Date;
  accessType: "PUBLIC" | "CODE" | "LINK_ONLY";
  accessCode: string | null;
  isActive: boolean;
}> {
  if (!template) {
    return [];
  }

  return template.templatePresales
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
        accessCode: presale.accessType === "CODE" ? presale.accessCode : null,
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

function buildImportSort(
  sortBy: string | undefined,
  sortOrder: "asc" | "desc"
): Prisma.BulkImportJobOrderByWithRelationInput[] {
  const allowedSortColumns = ["createdAt", "completedAt", "status"] as const;
  if (!sortBy || !allowedSortColumns.includes(sortBy as (typeof allowedSortColumns)[number])) {
    return [{ createdAt: "desc" }];
  }

  return [{ [sortBy]: sortOrder } as Prisma.BulkImportJobOrderByWithRelationInput];
}
