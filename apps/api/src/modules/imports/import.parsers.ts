import { parse } from "csv-parse/sync";

export type CsvImportRawRow = Record<string, string>;

export function parseCsvBuffer(buffer: Buffer): {
  rows: CsvImportRawRow[];
} {
  const rawText = buffer.toString("utf8");

  if (!rawText.trim()) {
    return {
      rows: []
    };
  }

  const records = parse(rawText, {
    columns: true,
    skip_empty_lines: true,
    trim: true,
    bom: true,
    relax_column_count: true
  }) as Record<string, unknown>[];

  const rows = records.map((record) => normalizeCsvRecord(record));

  return {
    rows
  };
}

export function extractTicketTierColumns(row: CsvImportRawRow):
  Array<{
    index: number;
    name?: string;
    price?: string;
    quantity?: string;
  }> {
  const tierPattern = /^ticketTier(\d+)(Name|Price|Quantity)$/i;
  const tierMap = new Map<
    number,
    {
      index: number;
      name?: string;
      price?: string;
      quantity?: string;
    }
  >();

  for (const [fieldName, fieldValue] of Object.entries(row)) {
    const matchedField = fieldName.match(tierPattern);

    if (!matchedField) {
      continue;
    }

    const tierIndex = Number(matchedField[1]);
    const tierField = matchedField[2].toLowerCase();
    const tierEntry =
      tierMap.get(tierIndex) ?? {
        index: tierIndex
      };

    if (tierField === "name") {
      tierEntry.name = fieldValue;
    }

    if (tierField === "price") {
      tierEntry.price = fieldValue;
    }

    if (tierField === "quantity") {
      tierEntry.quantity = fieldValue;
    }

    tierMap.set(tierIndex, tierEntry);
  }

  return [...tierMap.values()].sort((leftTier, rightTier) => leftTier.index - rightTier.index);
}

function normalizeCsvRecord(record: Record<string, unknown>): CsvImportRawRow {
  const nextRecord: CsvImportRawRow = {};

  for (const [rawKey, rawValue] of Object.entries(record)) {
    const key = rawKey.trim();

    if (!key) {
      continue;
    }

    if (rawValue === null || rawValue === undefined) {
      nextRecord[key] = "";
      continue;
    }

    nextRecord[key] = String(rawValue).trim();
  }

  return nextRecord;
}
