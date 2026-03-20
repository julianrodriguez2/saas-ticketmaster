import { z } from "zod";
import type { CsvImportRawRow } from "./import.parsers";
import { extractTicketTierColumns } from "./import.parsers";

const presaleAccessTypeSchema = z.enum(["PUBLIC", "CODE", "LINK_ONLY"]);
const ticketingModeSchema = z.enum(["GA", "RESERVED"]);
const publishStatusSchema = z.enum(["DRAFT", "PUBLISHED"]);

export type ImportTemplatePreset = {
  id: string;
  venueId: string | null;
  ticketingMode: "GA" | "RESERVED";
  defaultCurrency: string;
  ticketTiers: Array<{
    name: string;
    price: number;
    quantity: number;
    sortOrder: number;
  }>;
};

export type ImportVenuePreset = {
  id: string;
  name: string;
  location: string;
};

export type ValidatedEventImportRow = {
  rowNumber: number;
  templateId: string | null;
  title: string;
  description: string;
  dateIso: string;
  venueId: string;
  ticketingMode: "GA" | "RESERVED";
  currency: string;
  salesStartAtIso: string | null;
  salesEndAtIso: string | null;
  publishStatus: "DRAFT" | "PUBLISHED";
  ticketTiers: Array<{
    name: string;
    price: number;
    quantity: number;
  }>;
  presale:
    | {
        name: string;
        startsAtIso: string;
        endsAtIso: string;
        accessType: "PUBLIC" | "CODE" | "LINK_ONLY";
        accessCode: string | null;
        isActive: boolean;
      }
    | null;
  warnings: string[];
  rawRow: CsvImportRawRow;
};

export type ImportRowValidationError = {
  rowNumber: number;
  fieldName?: string;
  message: string;
  rawRowJson?: CsvImportRawRow;
};

export type ImportPreviewRow = {
  rowNumber: number;
  title: string;
  date: string;
  venue: string | null;
  ticketingMode: "GA" | "RESERVED" | null;
  currency: string;
  publishStatus: "DRAFT" | "PUBLISHED";
  templateId: string | null;
  warnings: string[];
  isValid: boolean;
};

export function validateImportRows(
  rows: CsvImportRawRow[],
  dependencies: {
    venuesById: Map<string, ImportVenuePreset>;
    venuesByName: Map<string, ImportVenuePreset>;
    templatesById: Map<string, ImportTemplatePreset>;
  }
): {
  validRows: ValidatedEventImportRow[];
  errors: ImportRowValidationError[];
  previewRows: ImportPreviewRow[];
  summary: {
    totalRows: number;
    validRows: number;
    invalidRows: number;
  };
} {
  const validRows: ValidatedEventImportRow[] = [];
  const errors: ImportRowValidationError[] = [];
  const previewRows: ImportPreviewRow[] = [];

  rows.forEach((row, index) => {
    const rowNumber = index + 2;
    const rowErrors: ImportRowValidationError[] = [];
    const warnings: string[] = [];

    const title = row.title?.trim();

    if (!title) {
      rowErrors.push(
        buildImportError(rowNumber, "title", "Title is required.", row)
      );
    }

    const eventDate = parseDateValue(row.date);

    if (!eventDate) {
      rowErrors.push(
        buildImportError(rowNumber, "date", "A valid event date is required.", row)
      );
    }

    const templateId = row.templateId?.trim() || null;
    const template = templateId ? dependencies.templatesById.get(templateId) : undefined;

    if (templateId && !template) {
      rowErrors.push(
        buildImportError(rowNumber, "templateId", "Template not found.", row)
      );
    }

    const ticketingMode = resolveTicketingMode(row.ticketingMode, template?.ticketingMode);

    if (!ticketingMode) {
      rowErrors.push(
        buildImportError(
          rowNumber,
          "ticketingMode",
          "Ticketing mode is required unless provided by template.",
          row
        )
      );
    }

    const venueResolution = resolveVenue({
      venueId: row.venueId,
      venueName: row.venueName,
      templateVenueId: template?.venueId,
      venuesById: dependencies.venuesById,
      venuesByName: dependencies.venuesByName
    });

    if (venueResolution.error) {
      rowErrors.push(buildImportError(rowNumber, venueResolution.fieldName, venueResolution.error, row));
    }

    const currency = (row.currency?.trim() || template?.defaultCurrency || "USD").toUpperCase();

    if (!/^[A-Z]{3}$/.test(currency)) {
      rowErrors.push(
        buildImportError(rowNumber, "currency", "Currency must be a 3-letter code.", row)
      );
    }

    const salesStartAt = parseOptionalDateValue(row.salesStartAt);
    const salesEndAt = parseOptionalDateValue(row.salesEndAt);

    if (row.salesStartAt && !salesStartAt) {
      rowErrors.push(
        buildImportError(rowNumber, "salesStartAt", "salesStartAt must be a valid date.", row)
      );
    }

    if (row.salesEndAt && !salesEndAt) {
      rowErrors.push(
        buildImportError(rowNumber, "salesEndAt", "salesEndAt must be a valid date.", row)
      );
    }

    if (salesStartAt && salesEndAt && salesStartAt >= salesEndAt) {
      rowErrors.push(
        buildImportError(
          rowNumber,
          "salesStartAt",
          "salesStartAt must be before salesEndAt.",
          row
        )
      );
    }

    const publishStatus = parsePublishStatus(row.publishStatus);

    if (!publishStatus) {
      rowErrors.push(
        buildImportError(
          rowNumber,
          "publishStatus",
          "publishStatus must be DRAFT or PUBLISHED.",
          row
        )
      );
    }

    const rowTicketTiers = parseTicketTiers(row, rowNumber, rowErrors);
    const templateTicketTiers =
      template?.ticketTiers.map((tier) => ({
        name: tier.name,
        price: tier.price,
        quantity: tier.quantity
      })) ?? [];

    const ticketTiers = rowTicketTiers.length > 0 ? rowTicketTiers : templateTicketTiers;

    if (ticketingMode === "GA" && ticketTiers.length === 0) {
      rowErrors.push(
        buildImportError(
          rowNumber,
          "ticketTier1Name",
          "GA events require at least one ticket tier in CSV or template.",
          row
        )
      );
    }

    if (ticketingMode === "RESERVED") {
      warnings.push("Reserved event created without seat map configuration.");
    }

    const presaleResult = parsePresale(row, rowNumber, rowErrors);

    previewRows.push({
      rowNumber,
      title: title ?? "",
      date: row.date ?? "",
      venue: venueResolution.venue
        ? `${venueResolution.venue.name} (${venueResolution.venue.location})`
        : null,
      ticketingMode,
      currency,
      publishStatus: publishStatus ?? "DRAFT",
      templateId,
      warnings,
      isValid: rowErrors.length === 0
    });

    if (rowErrors.length > 0 || !title || !eventDate || !ticketingMode || !venueResolution.venue || !publishStatus) {
      errors.push(...rowErrors);
      return;
    }

    validRows.push({
      rowNumber,
      templateId,
      title,
      description: row.description?.trim() || `${title} event`,
      dateIso: eventDate.toISOString(),
      venueId: venueResolution.venue.id,
      ticketingMode,
      currency,
      salesStartAtIso: salesStartAt ? salesStartAt.toISOString() : null,
      salesEndAtIso: salesEndAt ? salesEndAt.toISOString() : null,
      publishStatus,
      ticketTiers,
      presale: presaleResult,
      warnings,
      rawRow: row
    });
  });

  return {
    validRows,
    errors,
    previewRows,
    summary: {
      totalRows: rows.length,
      validRows: validRows.length,
      invalidRows: rows.length - validRows.length
    }
  };
}

function parseTicketTiers(
  row: CsvImportRawRow,
  rowNumber: number,
  errors: ImportRowValidationError[]
): Array<{
  name: string;
  price: number;
  quantity: number;
}> {
  const extractedTiers = extractTicketTierColumns(row);
  const parsedTiers: Array<{
    name: string;
    price: number;
    quantity: number;
  }> = [];

  for (const tier of extractedTiers) {
    const tierName = tier.name?.trim();
    const hasAnyValue = Boolean(tierName || tier.price || tier.quantity);

    if (!hasAnyValue) {
      continue;
    }

    const parsedPrice = tier.price ? Number(tier.price) : Number.NaN;
    const parsedQuantity = tier.quantity ? Number(tier.quantity) : Number.NaN;

    if (!tierName) {
      errors.push(
        buildImportError(
          rowNumber,
          `ticketTier${tier.index}Name`,
          "Ticket tier name is required when tier values are provided.",
          row
        )
      );
      continue;
    }

    if (!Number.isFinite(parsedPrice) || parsedPrice <= 0) {
      errors.push(
        buildImportError(
          rowNumber,
          `ticketTier${tier.index}Price`,
          "Ticket tier price must be a positive number.",
          row
        )
      );
      continue;
    }

    if (!Number.isInteger(parsedQuantity) || parsedQuantity <= 0) {
      errors.push(
        buildImportError(
          rowNumber,
          `ticketTier${tier.index}Quantity`,
          "Ticket tier quantity must be a positive integer.",
          row
        )
      );
      continue;
    }

    parsedTiers.push({
      name: tierName,
      price: parsedPrice,
      quantity: parsedQuantity
    });
  }

  return parsedTiers;
}

function parsePresale(
  row: CsvImportRawRow,
  rowNumber: number,
  errors: ImportRowValidationError[]
): {
  name: string;
  startsAtIso: string;
  endsAtIso: string;
  accessType: "PUBLIC" | "CODE" | "LINK_ONLY";
  accessCode: string | null;
  isActive: boolean;
} | null {
  const hasPresaleValue =
    Boolean(row.presaleName?.trim()) ||
    Boolean(row.presaleStartsAt?.trim()) ||
    Boolean(row.presaleEndsAt?.trim()) ||
    Boolean(row.presaleAccessType?.trim()) ||
    Boolean(row.presaleAccessCode?.trim());

  if (!hasPresaleValue) {
    return null;
  }

  const presaleName = row.presaleName?.trim();

  if (!presaleName) {
    errors.push(
      buildImportError(rowNumber, "presaleName", "presaleName is required.", row)
    );
    return null;
  }

  const startsAt = parseDateValue(row.presaleStartsAt);
  const endsAt = parseDateValue(row.presaleEndsAt);

  if (!startsAt) {
    errors.push(
      buildImportError(
        rowNumber,
        "presaleStartsAt",
        "presaleStartsAt must be a valid date.",
        row
      )
    );
  }

  if (!endsAt) {
    errors.push(
      buildImportError(
        rowNumber,
        "presaleEndsAt",
        "presaleEndsAt must be a valid date.",
        row
      )
    );
  }

  const accessType = row.presaleAccessType?.trim().toUpperCase();
  const parsedAccessType = presaleAccessTypeSchema.safeParse(accessType);

  if (!parsedAccessType.success) {
    errors.push(
      buildImportError(
        rowNumber,
        "presaleAccessType",
        "presaleAccessType must be PUBLIC, CODE, or LINK_ONLY.",
        row
      )
    );
  }

  if (startsAt && endsAt && startsAt >= endsAt) {
    errors.push(
      buildImportError(
        rowNumber,
        "presaleStartsAt",
        "presaleStartsAt must be before presaleEndsAt.",
        row
      )
    );
  }

  const accessCode = row.presaleAccessCode?.trim() || null;

  if (parsedAccessType.success && parsedAccessType.data === "CODE" && !accessCode) {
    errors.push(
      buildImportError(
        rowNumber,
        "presaleAccessCode",
        "presaleAccessCode is required for CODE access type.",
        row
      )
    );
  }

  if (!startsAt || !endsAt || !parsedAccessType.success) {
    return null;
  }

  return {
    name: presaleName,
    startsAtIso: startsAt.toISOString(),
    endsAtIso: endsAt.toISOString(),
    accessType: parsedAccessType.data,
    accessCode: parsedAccessType.data === "CODE" ? accessCode : null,
    isActive: true
  };
}

function resolveVenue(input: {
  venueId?: string;
  venueName?: string;
  templateVenueId?: string | null;
  venuesById: Map<string, ImportVenuePreset>;
  venuesByName: Map<string, ImportVenuePreset>;
}): {
  venue: ImportVenuePreset | null;
  error?: string;
  fieldName?: string;
} {
  const csvVenueId = input.venueId?.trim();

  if (csvVenueId) {
    const venue = input.venuesById.get(csvVenueId);

    if (!venue) {
      return {
        venue: null,
        error: "venueId does not match an existing venue.",
        fieldName: "venueId"
      };
    }

    return {
      venue
    };
  }

  const csvVenueName = input.venueName?.trim();

  if (csvVenueName) {
    const venue = input.venuesByName.get(csvVenueName.toLowerCase());

    if (!venue) {
      return {
        venue: null,
        error: "venueName could not be resolved. Create venue first or provide venueId.",
        fieldName: "venueName"
      };
    }

    return {
      venue
    };
  }

  if (input.templateVenueId) {
    const venue = input.venuesById.get(input.templateVenueId);

    if (!venue) {
      return {
        venue: null,
        error: "Template venue no longer exists.",
        fieldName: "templateId"
      };
    }

    return {
      venue
    };
  }

  return {
    venue: null,
    error: "Either venueId, venueName, or template venue is required.",
    fieldName: "venueId"
  };
}

function resolveTicketingMode(
  rawTicketingMode: string | undefined,
  templateTicketingMode?: "GA" | "RESERVED"
): "GA" | "RESERVED" | null {
  if (rawTicketingMode?.trim()) {
    const parsedMode = ticketingModeSchema.safeParse(rawTicketingMode.trim().toUpperCase());
    return parsedMode.success ? parsedMode.data : null;
  }

  return templateTicketingMode ?? null;
}

function parsePublishStatus(rawPublishStatus: string | undefined): "DRAFT" | "PUBLISHED" | null {
  if (!rawPublishStatus?.trim()) {
    return "PUBLISHED";
  }

  const parsedStatus = publishStatusSchema.safeParse(rawPublishStatus.trim().toUpperCase());
  return parsedStatus.success ? parsedStatus.data : null;
}

function parseDateValue(rawDate: string | undefined): Date | null {
  if (!rawDate?.trim()) {
    return null;
  }

  const parsedDate = new Date(rawDate);
  return Number.isNaN(parsedDate.getTime()) ? null : parsedDate;
}

function parseOptionalDateValue(rawDate: string | undefined): Date | null {
  if (!rawDate?.trim()) {
    return null;
  }

  return parseDateValue(rawDate);
}

function buildImportError(
  rowNumber: number,
  fieldName: string,
  message: string,
  rawRow: CsvImportRawRow
): ImportRowValidationError {
  return {
    rowNumber,
    fieldName,
    message,
    rawRowJson: rawRow
  };
}
