const rawApiOrigin = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";
const normalizedOrigin = rawApiOrigin.replace(/\/+$/, "");

export const API_BASE_URL = normalizedOrigin.endsWith("/api/v1")
  ? normalizedOrigin
  : `${normalizedOrigin}/api/v1`;

export class ApiError extends Error {
  public readonly statusCode: number;
  public readonly code?: string;
  public readonly requestId?: string;

  constructor(input: {
    statusCode: number;
    message: string;
    code?: string;
    requestId?: string;
  }) {
    super(input.message);
    this.statusCode = input.statusCode;
    this.code = input.code;
    this.requestId = input.requestId;
  }
}

export type ApiPaginationMeta = {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
};

export type PaginatedApiResponse<TData> = {
  data: TData[];
  meta: ApiPaginationMeta;
};

type ApiRequestOptions = Omit<RequestInit, "body"> & {
  body?: unknown;
};

export async function apiRequest<TResponse>(
  path: string,
  options: ApiRequestOptions = {}
): Promise<TResponse> {
  const headers = new Headers(options.headers ?? {});
  const requestInit: RequestInit = {
    ...options,
    headers,
    credentials: "include"
  };

  if (options.body !== undefined) {
    headers.set("Content-Type", "application/json");
    requestInit.body = JSON.stringify(options.body);
  }

  const response = await fetch(`${API_BASE_URL}${normalizePath(path)}`, requestInit);
  const responseIsJson = response.headers.get("content-type")?.includes("application/json");
  const responseBody = responseIsJson ? (await response.json()) : null;

  if (!response.ok) {
    const fallbackMessage = "Request failed.";
    const message =
      responseBody &&
      typeof responseBody === "object" &&
      "message" in responseBody &&
      typeof responseBody.message === "string"
        ? responseBody.message
        : fallbackMessage;

    throw new ApiError({
      statusCode: response.status,
      message,
      code:
        responseBody &&
        typeof responseBody === "object" &&
        "code" in responseBody &&
        typeof responseBody.code === "string"
          ? responseBody.code
          : undefined,
      requestId:
        responseBody &&
        typeof responseBody === "object" &&
        "requestId" in responseBody &&
        typeof responseBody.requestId === "string"
          ? responseBody.requestId
          : undefined
    });
  }

  return responseBody as TResponse;
}

function normalizePath(path: string): string {
  if (!path.startsWith("/")) {
    return `/${path}`;
  }

  return path;
}

