export type PaginationMeta = {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
};

export function toSkipTake(input: { page: number; limit: number }): {
  skip: number;
  take: number;
} {
  return {
    skip: (input.page - 1) * input.limit,
    take: input.limit
  };
}

export function buildPaginationMeta(input: {
  page: number;
  limit: number;
  total: number;
}): PaginationMeta {
  return {
    page: input.page,
    limit: input.limit,
    total: input.total,
    totalPages: input.total === 0 ? 0 : Math.ceil(input.total / input.limit)
  };
}

export function paginatedResponse<TData>(
  data: TData,
  meta: PaginationMeta
): {
  data: TData;
  meta: PaginationMeta;
} {
  return {
    data,
    meta
  };
}

