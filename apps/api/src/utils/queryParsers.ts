import { z } from "zod";

const rawPaginationSchema = z.object({
  page: z.coerce.number().int().positive().optional(),
  limit: z.coerce.number().int().positive().optional(),
  sortBy: z.string().trim().min(1).max(80).optional(),
  sortOrder: z.enum(["asc", "desc"]).optional()
});

export type ParsedPaginationQuery = {
  page: number;
  limit: number;
  sortBy?: string;
  sortOrder: "asc" | "desc";
};

export function parsePaginationQuery(
  query: unknown,
  options: {
    defaultPage?: number;
    defaultLimit?: number;
    maxLimit?: number;
    allowedSortBy?: string[];
    defaultSortBy?: string;
    defaultSortOrder?: "asc" | "desc";
  } = {}
): ParsedPaginationQuery {
  const parsedQuery = rawPaginationSchema.safeParse(query);
  const parsedData = parsedQuery.success ? parsedQuery.data : {};

  const {
    defaultPage = 1,
    defaultLimit = 20,
    maxLimit = 100,
    allowedSortBy,
    defaultSortBy,
    defaultSortOrder = "desc"
  } = options;

  const page = parsedData.page ?? defaultPage;
  const requestedLimit = parsedData.limit ?? defaultLimit;
  const limit = Math.min(Math.max(requestedLimit, 1), maxLimit);

  let sortBy = parsedData.sortBy ?? defaultSortBy;
  if (sortBy && allowedSortBy && !allowedSortBy.includes(sortBy)) {
    sortBy = defaultSortBy;
  }

  const sortOrder = parsedData.sortOrder ?? defaultSortOrder;

  return {
    page,
    limit,
    sortBy,
    sortOrder
  };
}

export function parseOptionalBoolean(input: unknown): boolean | undefined {
  if (typeof input === "undefined") {
    return undefined;
  }

  if (input === "true" || input === "1" || input === true) {
    return true;
  }

  if (input === "false" || input === "0" || input === false) {
    return false;
  }

  return undefined;
}
